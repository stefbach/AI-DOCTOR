"use client"

// app/global-error.tsx
//
// Last line of defence: catches errors thrown by the root layout itself, which
// app/error.tsx cannot see. It replaces the root layout, so it must render its
// own <html> and <body>.
//
// `reset()` cannot help here — the layout that failed is the one it would
// re-render — so the screen is rendered in fatal mode and only offers a reload.

// global-error replaces the root layout, so it does not inherit the stylesheet
// that layout.tsx imports. Import it here or the fallback renders unstyled —
// exactly when legibility matters most.
import "./globals.css"
import ConsultationErrorScreen from "@/components/consultation-error-screen"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body>
        <ConsultationErrorScreen error={error} reset={reset} fatal />
      </body>
    </html>
  )
}
