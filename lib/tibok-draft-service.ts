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

const FETCH_TIMEOUT_MS = 5000
const RETRY_DELAY_MS = 1000

type DraftStep = 'patient' | 'clinical' | 'questions'

type SaveResult = { success: true } | { success: false; error: string }

/**
 * Resolve the TIBOK base URL the same way the report components do
 * (professional-report.tsx:3818-3840 etc.):
 *   1. ?tibokUrl=... param (highest priority, set explicitly by caller)
 *   2. document.referrer if its hostname is on the TIBOK whitelist
 *   3. hardcoded https://tibok.mu fallback
 *
 * Inlined here to keep this module self-contained — the report components
 * each have their own copy and we don't want to refactor a shared helper
 * out of MVP scope.
 */
function resolveTibokUrl(): string {
  if (typeof window === 'undefined') return 'https://tibok.mu'

  try {
    const params = new URLSearchParams(window.location.search)
    const param = params.get('tibokUrl')
    if (param) return decodeURIComponent(param)
  } catch {
    // ignore — fall through to referrer
  }

  if (typeof document !== 'undefined' && document.referrer) {
    try {
      const referrer = new URL(document.referrer)
      const allowed = ['tibok.mu', 'v0-tibokmain2.vercel.app', 'localhost']
      if (allowed.some(domain => referrer.hostname.includes(domain))) {
        return referrer.origin
      }
    } catch {
      // ignore — fall through to default
    }
  }

  return 'https://tibok.mu'
}

function getConsultationId(): string | null {
  if (typeof window === 'undefined') return null
  // Prefer URL (always authoritative for the current consultation), then
  // sessionStorage caches.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('consultationId')
    if (fromUrl) return fromUrl
  } catch {
    // ignore
  }
  // Common cache locations seen in the codebase
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
    console.warn('💾 [TIBOK draft] skipping save — no consultationId available for step:', step)
    return { success: false, error: 'no_consultation_id' }
  }

  const tibokUrl = resolveTibokUrl()
  const url = `${tibokUrl}/api/consultation/draft/save`
  const body = JSON.stringify({ consultationId, step, payload })

  console.log(`💾 Saving draft step=${step} to TIBOK`)

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
