"use client"

import { useEmbeddedMode } from '@/hooks/use-embedded-mode'

interface EmbeddedModeProviderProps {
  children: React.ReactNode
}

export function EmbeddedModeProvider({ children }: EmbeddedModeProviderProps) {
  const { isEmbedded } = useEmbeddedMode()
  
  return <>{children}</>
}
