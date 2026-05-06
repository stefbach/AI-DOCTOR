/**
 * Phase 2.D.B — TIBOK draft persistence (nurse-led only).
 *
 * Sends step 0/1/2 payloads to TIBOK so the doctor browser can pick up
 * where the nurse left off. Self-gates on `sessionStorage.tibokRole ===
 * 'nurse'`: any other role (doctor, telemedicine, doctor-only presential)
 * short-circuits as a no-op success — the existing localStorage-only flow
 * keeps working untouched.
 *
 * Failure mode: silent. A 503 from TIBOK or a 5-second timeout must NOT
 * block the nurse; she keeps typing. Errors are logged to console and the
 * function returns { success: false } so the caller can ignore.
 *
 * Idempotence: TIBOK's /api/consultation/draft/save UPSERTs into
 * consultation_records, so repeat calls on the same step are safe.
 */

import { consultationDataService } from '@/lib/consultation-data-service'

const FETCH_TIMEOUT_MS = 5000
const RETRY_DELAY_MS = 1000

type DraftStep = 'patient' | 'clinical' | 'questions'

type SaveResult = { success: true } | { success: false; error: string }

/**
 * Resolve the TIBOK base URL with a 4-source cascade so AI-DOCTOR POSTs
 * drafts back to the same origin TIBOK was served from (prod, Vercel
 * preview, or localhost dev).
 *
 *   1. URL ?tibokUrl=… — wins on the hub itself, where TIBOK 2.D.B.3
 *      injects this param when launching the iframe.
 *   2. sessionStorage.tibokUrl — written by app/consultation-hub/page.tsx
 *      at 2.D.B.4. Survives the hub → / navigation that strips query params.
 *   3. document.referrer origin — last-resort heuristic, only trusted
 *      when the hostname mentions "tibok" (case-insensitive). Defends
 *      against an arbitrary embedder hijacking the draft target.
 *   4. https://tibok.mu — production fallback when nothing else applies.
 *
 * Returns the resolved origin (no trailing slash) so callers can append
 * "/api/…" directly.
 */
function resolveTibokUrl(): string {
  if (typeof window === 'undefined') return 'https://tibok.mu'

  // 1) URL param — explicit wins.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('tibokUrl')
    if (fromUrl) return decodeURIComponent(fromUrl)
  } catch {
    // ignore — fall through
  }

  // 2) sessionStorage cache (set by the hub).
  try {
    const fromSession = sessionStorage.getItem('tibokUrl')
    if (fromSession) return fromSession
  } catch {
    // ignore — fall through
  }

  // 3) Referrer origin, but only if it looks like TIBOK.
  try {
    if (typeof document !== 'undefined' && document.referrer) {
      const referrerOrigin = new URL(document.referrer).origin
      if (/tibok/i.test(referrerOrigin)) return referrerOrigin
    }
  } catch {
    // ignore — fall through
  }

  // 4) Production fallback.
  return 'https://tibok.mu'
}

/**
 * Phase 2.D.B.2 — 4-source cascade. Order matters: more authoritative /
 * fresher sources first.
 *
 *   1. URL ?consultationId=… — only present when AI-DOCTOR is still on a
 *      page that received it directly from TIBOK (the hub). After
 *      router.push('/'), the URL is bare so this misses on workflow pages.
 *   2. sessionStorage.tibokConsultationId — written by app/consultation-hub/
 *      page.tsx in Phase 2.D.B.2. Survives the hub → / navigation.
 *   3. consultationDataService.getCurrentConsultationId() — set by
 *      app/page.tsx:292 from the loaded patient data. Note: this method
 *      auto-generates a fake `consultation_<ts>_<rand>` if none cached, so
 *      it should never return null in practice, but if the page hasn't
 *      mounted yet it can return a generated id that doesn't match the
 *      TIBOK UUID. (1) and (2) above protect against that.
 *   4. sessionStorage.consultationPatientData.consultationId — legacy cache
 *      written by HubWorkflowSelector for the normal-consultation path.
 *      Kept as a defensive last resort.
 */
function getConsultationId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const fromUrl = new URLSearchParams(window.location.search).get('consultationId')
    if (fromUrl) return fromUrl
  } catch {
    // ignore — fall through
  }

  const fromTibokSession = sessionStorage.getItem('tibokConsultationId')
  if (fromTibokSession) return fromTibokSession

  try {
    const fromService = consultationDataService.getCurrentConsultationId()
    if (fromService) return fromService
  } catch {
    // ignore — fall through
  }

  const stored = sessionStorage.getItem('consultationPatientData')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.consultationId) return parsed.consultationId
    } catch {
      // ignore
    }
  }

  return null
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function postOnce(url: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body,
      },
      FETCH_TIMEOUT_MS,
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status} ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.name === 'AbortError' ? 'timeout' : (err?.message || String(err)) }
  }
}

/**
 * Save a step draft to TIBOK. No-op for non-nurse roles.
 *
 * Caller pattern (in step submit handlers):
 *   await consultationDataService.saveStepData(N, data)   // local
 *   await saveTibokDraft('patient', data)                 // server, nurse-only
 *
 * Never throws. Returns success=false on failure but the caller should
 * ignore — the nurse keeps moving through the flow.
 */
export async function saveTibokDraft(step: DraftStep, payload: unknown): Promise<SaveResult> {
  if (typeof window === 'undefined') return { success: true }

  const role = sessionStorage.getItem('tibokRole')
  if (role !== 'nurse') {
    // Doctor / telemedicine / doctor-only presential / unknown → no-op.
    return { success: true }
  }

  const consultationId = getConsultationId()
  if (!consultationId) {
    console.warn(
      `💾 [TIBOK draft] skipping save — no consultationId available for step: ${step}. ` +
        'Sources checked: URL, tibokConsultationId, consultationDataService, consultationPatientData. All null.'
    )
    return { success: false, error: 'no_consultation_id' }
  }

  const tibokUrl = resolveTibokUrl()
  const url = `${tibokUrl}/api/consultation/draft/save`
  const body = JSON.stringify({ consultationId, step, payload })

  console.log(`💾 Saving draft step=${step} to TIBOK`)
  console.log('🌐 [TIBOK draft] base URL resolved:', tibokUrl)

  // First attempt
  let result = await postOnce(url, body)
  if (!result.ok) {
    console.warn(`⚠️ TIBOK draft save failed (attempt 1): ${result.error} — retrying in ${RETRY_DELAY_MS}ms`)
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
    result = await postOnce(url, body)
  }

  if (!result.ok) {
    console.warn(`⚠️ TIBOK draft save failed: ${result.error} (step=${step})`)
    return { success: false, error: result.error }
  }

  console.log(`✅ TIBOK draft saved (step=${step})`)
  return { success: true }
}

// ============================================================================
// Phase 2.D.C — load drafts on doctor handoff
// ============================================================================

/**
 * Drafts the doctor needs at the handoff boundary. All four fields are
 * optional from the wire; the hub is responsible for deciding whether the
 * payload is "complete enough" to hydrate (it requires patient + clinical
 * + questions all present).
 */
export interface TibokDraftPayload {
  patientData: any | null
  clinicalData: any | null
  questionsData: any | null
  workflowStep: number | null
}

/**
 * Fetch the nurse drafts that TIBOK persisted at consultation_records for
 * a given consultation. Returns null on any failure (network, non-OK
 * status, unknown response shape) — callers must treat this as best-effort
 * enrichment and fall back to the standard step-0 entry.
 *
 * Tolerant of three plausible response shapes (TIBOK's exact contract is
 * not auditable from this sandbox at the moment):
 *   - { ok: true, data: { patient_data, clinical_data, questions_data, workflow_step } }
 *   - { patientData, clinicalData, questionsData, workflowStep }
 *   - { success: true, draft: { … } }
 * Anything else maps to null and the doctor starts at step 0 — documented
 * graceful-degrade behaviour per the Phase 2.D.C garde-fous.
 */
export async function loadTibokDraft(
  consultationId: string
): Promise<TibokDraftPayload | null> {
  if (typeof window === 'undefined') return null
  if (!consultationId) return null

  const baseUrl = resolveTibokUrl()
  const url = `${baseUrl}/api/consultation/draft/load?consultationId=${encodeURIComponent(consultationId)}`
  console.log('📥 [TIBOK draft] loading from:', url)

  let json: any
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`⚠️ [TIBOK draft] load returned HTTP ${res.status}`)
      return null
    }
    json = await res.json()
  } catch (err: any) {
    console.warn('⚠️ [TIBOK draft] load failed:', err?.name === 'AbortError' ? 'timeout' : (err?.message || err))
    return null
  }

  // Find the inner record across the three accepted shapes.
  const record =
    (json && typeof json === 'object' && (json.data ?? json.draft ?? json)) || null
  if (!record || typeof record !== 'object') {
    console.warn('⚠️ [TIBOK draft] load: response did not match any known shape:', Object.keys(json || {}))
    return null
  }

  // Accept either snake_case (from DB columns) or camelCase (from a route
  // that already mapped them). Falsy → null so downstream completeness
  // checks are unambiguous.
  const patientData = record.patientData ?? record.patient_data ?? null
  const clinicalData = record.clinicalData ?? record.clinical_data ?? null
  const questionsData = record.questionsData ?? record.questions_data ?? null
  const workflowStepRaw = record.workflowStep ?? record.workflow_step ?? null
  const workflowStep =
    typeof workflowStepRaw === 'number'
      ? workflowStepRaw
      : (typeof workflowStepRaw === 'string' && /^\d+$/.test(workflowStepRaw))
        ? parseInt(workflowStepRaw, 10)
        : null

  console.log('✅ [TIBOK draft] loaded', {
    hasPatient: !!patientData,
    hasClinical: !!clinicalData,
    hasQuestions: !!questionsData,
    workflowStep,
  })

  return { patientData, clinicalData, questionsData, workflowStep }
}
