'use client'

// components/tibok-heartbeat.tsx
//
// Saying "I am still alive" to the page that contains us.
//
// 18/08, 19:19. Dr Baboorally left the consultation to check WhatsApp. Android
// needed memory and killed a renderer process — ours, not TIBOK's, because
// Chrome isolates a cross-origin iframe into its own process and we are the
// heavier of the two. He came back to the video still running above a grey
// square with a sad face. Nothing had crashed in anyone's code, and the black
// box recorded nothing: a killed process does not get to write an epitaph.
//
// No code runs in a dead renderer, so we cannot restart ourselves. TIBOK can:
// their page survived. So we tell them we are alive, five seconds at a time,
// and their watchdog reloads the iframe — and only the iframe, never the page,
// so the video is never interrupted — when we go quiet.
//
// This is safe to lose. If the beat never reaches them their watchdog stays
// dormant by design, and nothing about the consultation depends on it.

import { useEffect } from 'react'
import { isAllowedOrigin } from '@/hooks/use-tibok-bridge'

/** Three of these missed is what TIBOK treats as death. */
const BEAT_INTERVAL_MS = 5_000

function readConsultationId(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('consultationId')
    if (fromUrl) return fromUrl
    return sessionStorage.getItem('tibokConsultationId')
  } catch {
    return null
  }
}

/** Informational only — it tells whoever reads TIBOK's logs how far the
 *  consultation had got when it died. */
function readStep(consultationId: string | null): number | null {
  if (!consultationId) return null
  try {
    const raw = localStorage.getItem(`consultation-step-${consultationId}`)
    const step = raw == null ? NaN : Number(raw)
    return Number.isFinite(step) ? step : null
  } catch {
    return null
  }
}

export default function TibokHeartbeat() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Standalone (a test bench, a direct visit) has no parent to reassure.
    if (window.parent === window) return

    // Where to send it. The referrer is the containing page, but a referrer
    // policy can strip it — so any valid TIBOK message we receive re-confirms
    // the origin. Both are checked against the same whitelist the bridge uses:
    // a heartbeat carries a consultation id, and that is not something to
    // broadcast with '*'.
    let targetOrigin: string | null = null
    try {
      const referrer = document.referrer ? new URL(document.referrer).origin : ''
      if (referrer && isAllowedOrigin(referrer)) targetOrigin = referrer
    } catch {
      // An unparseable referrer just means we wait for a message instead.
    }

    // Declared before anything that calls it. A const read above its own
    // declaration is a ReferenceError waiting for the one path that reaches it
    // early — that cost a production outage on 18/08 and will not be repeated.
    const beat = () => {
      if (!targetOrigin) return
      const consultationId = readConsultationId()
      try {
        window.parent.postMessage(
          {
            type: 'aidoctor-heartbeat',
            version: 1,
            consultationId,
            step: readStep(consultationId),
          },
          targetOrigin,
        )
      } catch {
        // A failed beat is not worth an error path: the next one is in five
        // seconds, and TIBOK tolerates three misses before acting.
      }
    }

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) return
      const data = event.data as { type?: string } | null
      if (!data || typeof data !== 'object') return
      if (data.type !== 'tibok-context-init' && data.type !== 'tibok-handoff-state') return
      if (targetOrigin !== event.origin) {
        targetOrigin = event.origin
        beat()
      }
    }

    // On coming back to the foreground, beat at once rather than waiting for
    // the next tick. Chrome throttles a hidden page's timers to about once a
    // minute, so the first beat after a return could otherwise arrive later
    // than TIBOK's grace period — and be read as the very death it is denying.
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat()
    }

    window.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', onVisible)

    beat()
    const timer = setInterval(beat, BEAT_INTERVAL_MS)

    if (targetOrigin) {
      console.log(`💓 [heartbeat] beating to ${targetOrigin} every ${BEAT_INTERVAL_MS / 1000}s`)
    } else {
      console.log('💓 [heartbeat] waiting for a TIBOK message to learn where to beat')
    }

    return () => {
      clearInterval(timer)
      window.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
