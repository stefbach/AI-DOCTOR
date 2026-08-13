"use client"

// app/error.tsx
//
// Route-segment error boundary. Catches anything thrown while rendering a page
// under the root layout — the consultation flow, the hub, chronic, dermatology.
// Without it, Next.js unmounts the entire tree and the doctor gets a blank
// white page mid-consultation.
//
// Root-layout failures are NOT caught here; app/global-error.tsx handles those.

import ConsultationErrorScreen from "@/components/consultation-error-screen"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ConsultationErrorScreen error={error} reset={reset} />
}
