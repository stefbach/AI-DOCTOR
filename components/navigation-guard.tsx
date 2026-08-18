"use client"

// components/navigation-guard.tsx
//
// The gesture that ends a consultation by accident.
//
// This app runs in an iframe on tibok.mu, under a video pane, on a phone. A
// fast swipe up overscrolls, the overscroll chains to the parent document, and
// TIBOK's pull-to-refresh fires: the parent reloads, the video call drops, and
// the consultation is over. A sideways swipe does the same through the back
// gesture. The doctor did not decide to do any of this; they scrolled.
//
// The CSS in globals.css stops the chaining, which is the real fix. This is
// the second line: when a navigation gets through anyway, the doctor is told,
// once, briefly, what nearly happened — so the next reflex is a slower scroll
// rather than a shrug.
//
// Deliberately not a blocker. A doctor who genuinely wants to leave must be
// able to; a modal in the way of someone with a patient on the line would be
// worse than the problem. `beforeunload` is registered because the browser's
// own confirmation is the one thing that can actually stop a reload, and it
// costs nothing when nothing is at stake.

import * as React from "react"
import { AlertTriangle } from "lucide-react"

import ViewportLayer from "@/components/viewport-layer"

const NOTICE_MS = 5000

export default function NavigationGuard({
  active,
  language = "fr",
  topClass = "top-14",
}: {
  /** True while a consultation is in progress and worth protecting. */
  active: boolean
  language?: "fr" | "en"
  /**
   * Where to sit. Below the clock by default; lower again when a simulation
   * banner is holding the top of the screen.
   */
  topClass?: string
}) {
  const [showNotice, setShowNotice] = React.useState(false)

  // The browser's own reload confirmation. Chrome only honours it once the
  // frame has had a real interaction, which a doctor filling in a form always
  // has — and when it is not honoured, nothing is lost by having asked.
  React.useEffect(() => {
    if (!active) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Legacy form, still required by some engines to trigger the prompt.
      event.returnValue = ""
      return ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [active])

  // The back gesture. A sentinel entry is pushed so the first swipe lands on
  // it instead of leaving the app; the entry is pushed again afterwards so the
  // protection survives repeated gestures.
  React.useEffect(() => {
    if (!active) return

    try {
      window.history.pushState({ consultationGuard: true }, "")
    } catch {
      return
    }

    const onPopState = () => {
      setShowNotice(true)
      try {
        window.history.pushState({ consultationGuard: true }, "")
      } catch {
        // Nothing to do: the notice has already been shown.
      }
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [active])

  React.useEffect(() => {
    if (!showNotice) return
    const id = setTimeout(() => setShowNotice(false), NOTICE_MS)
    return () => clearTimeout(id)
  }, [showNotice])

  if (!showNotice) return null

  const t =
    language === "fr"
      ? {
          title: "Attention",
          body:
            "Ce geste aurait pu fermer la consultation et couper l'appel vidéo. Scrollez plus lentement, ou utilisez les boutons de l'application pour naviguer.",
        }
      : {
          title: "Careful",
          body:
            "That gesture could have closed the consultation and dropped the video call. Scroll more slowly, or use the app's own buttons to move around.",
        }

  // Below the clock, wherever the clock happens to be — see `topClass`.
  // Top-anchored rather than bottom, because on a phone the bottom of the
  // screen is where the send button lives and a notice sitting on it would be
  // worse than no notice at all.
  return (
    <ViewportLayer className={`left-1/2 -translate-x-1/2 max-w-[96vw] ${topClass}`}>
      <div className="flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 shadow-lg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-900">{t.title}</p>
            <p className="text-xs leading-snug text-amber-900">{t.body}</p>
          </div>
        </div>
      </div>
    </ViewportLayer>
  )
}
