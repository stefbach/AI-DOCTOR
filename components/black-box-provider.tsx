"use client"

// components/black-box-provider.tsx
//
// Installs the flight recorder once, as early as the client can run. Mounted
// in the root layout so it covers every route — including the consultation hub,
// where the 13/08 crash happened.
//
// Renders nothing and holds no state: it must not be able to affect what the
// doctor sees.

import * as React from "react"
import { installBlackBox } from "@/lib/blackbox"

export default function BlackBoxProvider() {
  React.useEffect(() => {
    installBlackBox()
  }, [])

  return null
}
