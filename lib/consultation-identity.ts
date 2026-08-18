// lib/consultation-identity.ts
//
// Who this consultation is for, and who is conducting it.
//
// Three identifiers — consultation, patient, doctor — decide whether anything
// can be saved or sent. Until now each caller resolved them for itself, from a
// different subset of the same fragile chain: TIBOK puts them in the URL, the
// hub copies some of them into sessionStorage, then `router.push('/')` strips
// the query string, and everything downstream lives on whatever survived.
//
// On 17/08/2026 that chain broke on an Android phone. `tibokConsultationId`
// survived; `consultationPatientData` did not. The send path found a
// consultation id and no patient or doctor, refused to send, and the report
// was lost — while the `consultations` row had carried both ids since five
// minutes before the doctor pressed the button.
//
// So this module does two things the old code did not:
//
//   1. ONE resolution order, used by every caller. The autosave read the URL
//      only, which on the workflow page is always bare — so it never ran at
//      all in the real TIBOK flow, and the draft table stayed empty for every
//      consultation that mattered.
//   2. A SERVER FALLBACK. Anything the browser lost is read back from the
//      database using the consultation id, which is the one identifier that
//      reliably survives. The doctor is never asked, never told, and does
//      nothing: the app knows where to look.

import { consultationDataService } from "@/lib/consultation-data-service"

export interface ConsultationIdentity {
  consultationId: string | null
  patientId: string | null
  doctorId: string | null
  /**
   * The patient's own details, when the server had to be asked.
   *
   * Not part of "identity" strictly speaking, but they travel the same broken
   * chain and are lost the same way — and one of them, the phone, is enough on
   * its own to have a whole consultation refused at the save route.
   */
  patientName?: string | null
  patientPhone?: string | null
  patientEmail?: string | null
}

export interface IdentityOverrides {
  consultationId?: string | null
  patientId?: string | null
  doctorId?: string | null
}

/** Where a resolved identity is cached so the next caller reads it locally. */
const CACHE_KEY = "consultationPatientData"

const clean = (v: any): string | null => {
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s : null
}

function readSessionJson(key: string): any {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // sessionStorage is unavailable inside the TIBOK iframe under third-party
    // storage partitioning — the exact condition this module exists for.
    return null
  }
}

function readSessionString(key: string): string | null {
  try {
    return clean(sessionStorage.getItem(key))
  } catch {
    return null
  }
}

/**
 * What the browser still knows. Never throws, never blocks; any of the three
 * may come back null, which is the caller's cue to ask the server.
 */
export function readLocalIdentity(overrides: IdentityOverrides = {}): ConsultationIdentity {
  if (typeof window === "undefined") {
    return { consultationId: null, patientId: null, doctorId: null }
  }

  let params: URLSearchParams | null = null
  try {
    params = new URLSearchParams(window.location.search)
  } catch {
    params = null
  }

  const stored = readSessionJson(CACHE_KEY)

  // The TIBOK id wins over a locally invented one.
  //
  // `getCurrentConsultationId()` never returns null: asked before it has been
  // told, it MAKES UP an id ("consultation_1786…") so the app can work
  // standalone. Read blindly it therefore outranks the real identifier — and a
  // report saved under an invented id is a report TIBOK will never find, which
  // is indistinguishable from a report that was never saved.
  //
  // So a generated id is used only when nothing authoritative is available.
  // The hub writes `tibokConsultationId` separately and nothing deletes it,
  // unlike `consultationPatientData`, which app/page.tsx removes as soon as it
  // has read it.
  const serviceId = clean(consultationDataService.getCurrentConsultationId())
  const serviceIdIsGenerated = !!serviceId && serviceId.startsWith("consultation_")

  const consultationId =
    clean(overrides.consultationId) ||
    (serviceIdIsGenerated ? null : serviceId) ||
    clean(stored?.consultationId) ||
    readSessionString("tibokConsultationId") ||
    clean(params?.get("consultationId")) ||
    serviceId

  const patientId =
    clean(overrides.patientId) ||
    clean(stored?.patientId) ||
    clean(params?.get("patientId"))

  const doctorId =
    clean(overrides.doctorId) ||
    clean(stored?.doctorId) ||
    clean(params?.get("doctorId"))

  return { consultationId, patientId, doctorId }
}

/** True when all three are present — the only state in which sending can work. */
export function isComplete(identity: ConsultationIdentity): boolean {
  return !!(identity.consultationId && identity.patientId && identity.doctorId)
}

/**
 * Write a resolved identity back where `readLocalIdentity` will find it, so
 * one server round-trip serves every later caller — including one that runs
 * after a re-render, or on the next page in the flow.
 */
function cacheIdentity(identity: ConsultationIdentity): void {
  try {
    const existing = readSessionJson(CACHE_KEY) || {}
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...existing,
        consultationId: identity.consultationId || existing.consultationId || "",
        patientId: identity.patientId || existing.patientId || "",
        doctorId: identity.doctorId || existing.doctorId || "",
      }),
    )
  } catch {
    // Unavailable storage is why we are here; failing to cache costs one
    // extra round-trip, not the consultation.
  }
}

/**
 * When a lookup last failed, per consultation.
 *
 * The autosave calls this on every pause in typing. Without a hold, a
 * consultation the server cannot resolve would be re-asked every couple of
 * seconds for the length of the consultation — a request storm caused by
 * telemetry about a request failure.
 */
const failedAt = new Map<string, number>()
const RETRY_AFTER_MS = 30_000

/**
 * The full identity, asking the server for whatever the browser lost.
 *
 * Silent by design. A doctor mid-consultation has no idea what a patient id is
 * and should never be asked to supply one — and asking would not help, because
 * they do not have it either. The database does.
 *
 * Degrades rather than throws: if the lookup fails, the caller gets back
 * exactly what the browser knew, and decides what to do about it.
 */
export async function resolveIdentity(
  overrides: IdentityOverrides = {},
  /**
   * Ask even when the three identifiers are already known.
   *
   * The phone can be missing while the ids are complete — which is exactly the
   * case that had a report refused with "Phone number required" — so the send
   * path asks unconditionally, while the autosave, which needs only the ids,
   * does not pay for a round-trip it has no use for.
   */
  options: { force?: boolean } = {},
): Promise<ConsultationIdentity> {
  const local = readLocalIdentity(overrides)

  if (isComplete(local) && !options.force) return local
  if (!local.consultationId) {
    // Without this one there is nothing to look up by. This is the only
    // genuinely unrecoverable case, and it is the rarest.
    console.warn("🆔 No consultation id — identity cannot be resolved")
    return local
  }

  const lastFailure = failedAt.get(local.consultationId)
  if (lastFailure && Date.now() - lastFailure < RETRY_AFTER_MS) {
    return local
  }

  try {
    console.log("🆔 Identity incomplete, asking the server:", local)
    const response = await fetch(
      `/api/consultation-context?consultationId=${encodeURIComponent(local.consultationId)}`,
      { cache: "no-store" },
    )
    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.success) {
      console.warn("🆔 Server could not resolve the identity:", result?.error || response.status)
      failedAt.set(local.consultationId, Date.now())
      return local
    }

    const resolved: ConsultationIdentity = {
      consultationId: local.consultationId,
      patientId: local.patientId || clean(result.patientId),
      doctorId: local.doctorId || clean(result.doctorId),
      patientName: clean(result.patientName),
      patientPhone: clean(result.patientPhone),
      patientEmail: clean(result.patientEmail),
    }

    console.log("🆔 Identity recovered from the database:", {
      patientId: !!resolved.patientId,
      doctorId: !!resolved.doctorId,
    })
    cacheIdentity(resolved)
    failedAt.delete(local.consultationId)
    return resolved
  } catch (error) {
    console.warn("🆔 Identity lookup failed:", error)
    failedAt.set(local.consultationId, Date.now())
    return local
  }
}
