'use client'

import { useEffect, useState } from 'react'

/**
 * TIBOK ↔ AI-DOCTOR postMessage bridge (Phase 2.D.A).
 *
 * TIBOK iframes AI-DOCTOR and emits two event types:
 *
 *   1. 'tibok-context-init' — sent on iframe load (and possibly re-emitted on
 *      re-renders). Carries the authoritative current view: who is looking
 *      (`role`), which actor is collecting (`presentialActor`), and the
 *      handoff state on the consultation row.
 *
 *   2. 'tibok-handoff-state' — sent when handoff_state transitions on the
 *      consultations table (typically nurse submits step 2, parent moves
 *      from 'nurse_collecting' to 'awaiting_doctor').
 *
 * Precedence: postMessage values WIN over URL-derived values whenever they
 * arrive. Reasoning: postMessage carries fresh state (the row updated
 * server-side after the iframe loaded), while URL params are a snapshot of
 * the moment TIBOK rendered the page.
 *
 * Idempotence: the init can fire multiple times (TIBOK may re-emit on its
 * own re-renders). We log only on the first init for clarity, then update
 * silently. Subsequent inits with identical values short-circuit.
 *
 * Security: origin whitelist enforced before any payload trust.
 */

export type TibokRole = 'doctor' | 'nurse'
export type TibokPresentialActor = 'doctor' | 'nurse'
export type TibokHandoffState = 'awaiting_doctor' | 'accepted'

export interface TibokBridgeState {
  role: TibokRole | null
  presentialActor: TibokPresentialActor | null
  handoffState: TibokHandoffState | null
}

interface TibokContextInit {
  type: 'tibok-context-init'
  version: 1
  consultationId: string
  presentialActor: TibokPresentialActor | null
  handoffState: TibokHandoffState | null
  role: TibokRole
}

interface TibokHandoffEvent {
  type: 'tibok-handoff-state'
  version: 1
  consultationId: string
  handoffState: TibokHandoffState
}

type TibokMessage = TibokContextInit | TibokHandoffEvent

/**
 * Origin whitelist for postMessage events. Anything outside is dropped
 * silently. Vercel preview deployments are matched by suffix (`.vercel.app`)
 * rather than wildcard string includes, so a path like
 * `https://attacker.com/x.vercel.app` doesn't sneak through.
 */
export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false
  // Never ourselves. The `.vercel.app` rule below is what lets a TIBOK preview
  // talk to us — and it also matches our OWN deployment, which is not a parent
  // and must never be treated as one. This app navigates inside its own iframe
  // (hub → workflow), and on that second document `document.referrer` is our
  // own origin: without this line it passed the whitelist, the heartbeat
  // started beating at itself, TIBOK stopped hearing us and reloaded the
  // iframe mid-consultation.
  try {
    if (typeof window !== 'undefined' && origin === window.location.origin) return false
    // And no deployment of ours, not just the exact one we are served from:
    // production, branch previews and one-off deploys all answer to this name,
    // and none of them is ever the page containing us.
    if (new URL(origin).hostname.startsWith('v0-medical-ai-expert')) return false
  } catch {
    // Unparseable, or no window (SSR): fall through to the rules below.
  }
  if (origin === 'https://tibok.mu') return true
  if (origin === 'https://staging.tibok.mu') return true
  if (origin === 'http://localhost:3001') return true
  try {
    const u = new URL(origin)
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true
  } catch {
    return false
  }
  return false
}

/** Read a stored value, normalised to the union type or null. */
function readSessionRole(): TibokRole | null {
  const v = typeof window !== 'undefined' ? sessionStorage.getItem('tibokRole') : null
  return v === 'doctor' || v === 'nurse' ? v : null
}
function readSessionPresentialActor(): TibokPresentialActor | null {
  const v = typeof window !== 'undefined' ? sessionStorage.getItem('tibokPresentialActor') : null
  return v === 'doctor' || v === 'nurse' ? v : null
}
function readSessionHandoffState(): TibokHandoffState | null {
  const v = typeof window !== 'undefined' ? sessionStorage.getItem('tibokHandoffState') : null
  return v === 'awaiting_doctor' || v === 'accepted' ? v : null
}

/**
 * React hook: subscribes to TIBOK postMessage events, mirrors them into
 * sessionStorage (so non-React readers stay in sync), and returns reactive
 * state that re-renders consumers when the bridge updates.
 *
 * Initial state: read from sessionStorage (already populated by
 * use-tibok-patient-data.ts from URL params at mount).
 */
export function useTibokBridge(): TibokBridgeState {
  const [state, setState] = useState<TibokBridgeState>(() => ({
    role: readSessionRole(),
    presentialActor: readSessionPresentialActor(),
    handoffState: readSessionHandoffState(),
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    let initLogged = false
    const currentConsultationId =
      new URLSearchParams(window.location.search).get('consultationId')

    const onMessage = (event: MessageEvent) => {
      // 1) Origin gate.
      if (!isAllowedOrigin(event.origin)) return

      // 2) Shape gate. Reject anything that isn't an object with a known type.
      const data = event.data as Partial<TibokMessage> | null
      if (!data || typeof data !== 'object') return
      if (data.type !== 'tibok-context-init' && data.type !== 'tibok-handoff-state') return

      // 3) Version gate (future-proofing).
      if (data.version !== 1) {
        console.warn('🌉 [tibok-bridge] dropping message — unsupported version:', data.version)
        return
      }

      // 4) Consultation gate. If we know the current consultationId, the
      //    incoming message must reference the same one. If we don't know
      //    it (standalone test, missing URL), accept the message.
      if (currentConsultationId && data.consultationId && data.consultationId !== currentConsultationId) {
        console.warn(
          '🌉 [tibok-bridge] dropping message — consultationId mismatch:',
          { expected: currentConsultationId, got: data.consultationId }
        )
        return
      }

      if (data.type === 'tibok-context-init') {
        const next: TibokBridgeState = {
          role: data.role ?? null,
          presentialActor: data.presentialActor ?? null,
          handoffState: data.handoffState ?? null,
        }
        // Mirror to sessionStorage so non-React readers (payload sites,
        // utilities) see the latest value too.
        if (next.role) sessionStorage.setItem('tibokRole', next.role)
        if (next.presentialActor) sessionStorage.setItem('tibokPresentialActor', next.presentialActor)
        else sessionStorage.removeItem('tibokPresentialActor')
        if (next.handoffState) sessionStorage.setItem('tibokHandoffState', next.handoffState)
        else sessionStorage.removeItem('tibokHandoffState')

        setState(prev => {
          // Idempotence: skip a re-render if nothing changed.
          if (
            prev.role === next.role &&
            prev.presentialActor === next.presentialActor &&
            prev.handoffState === next.handoffState
          ) {
            return prev
          }
          return next
        })

        if (!initLogged) {
          initLogged = true
          console.log('🌉 [tibok-bridge] context-init received:', next)
        }
        return
      }

      // 'tibok-handoff-state' — narrower update.
      sessionStorage.setItem('tibokHandoffState', data.handoffState)
      setState(prev => {
        if (prev.handoffState === data.handoffState) return prev
        console.log('🌉 [tibok-bridge] handoff-state →', data.handoffState)
        return { ...prev, handoffState: data.handoffState }
      })
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return state
}
