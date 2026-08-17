"use client"

// components/viewport-layer.tsx
//
// Pins something to the browser viewport, from anywhere in the tree.
//
// `position: fixed` alone does not do this here. Every step of the
// consultation renders inside a card carrying `glass-card`, and that class
// sets `backdrop-filter: blur(10px)` — which makes the card a containing block
// for fixed descendants. The same card also sets `overflow-hidden`, and
// `hover-lift` adds a `transform` on hover. Any one of those is enough: a
// fixed element inside anchors to the card and gets clipped by it, which is
// why the save indicator only appeared after scrolling to the very bottom of
// the page. It was never an iframe problem.
//
// A portal to <body> escapes all three, because the element is no longer a
// descendant of the card at all.

import * as React from "react"
import { createPortal } from "react-dom"

export default function ViewportLayer({
  children,
  className,
}: {
  children: React.ReactNode
  /** Positioning — e.g. "top-2 left-1/2 -translate-x-1/2". */
  className?: string
}) {
  // document does not exist while rendering on the server.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div
      // z-40, deliberately BELOW the dialogs at z-50: the review and KYC
      // modals must cover these, not the other way round. A save button
      // floating over a modal overlay would be clickable through it.
      className={`fixed z-40 print:hidden ${className || ""}`}
      // The layer itself must never swallow a click meant for the page under
      // it. Interactive children opt back in with `pointer-events-auto`.
      style={{ pointerEvents: "none" }}
    >
      {children}
    </div>,
    document.body,
  )
}
