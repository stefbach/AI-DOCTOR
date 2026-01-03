"use client"

import { useEffect, useState } from 'react'

export function useEmbeddedMode() {
  const [isEmbedded, setIsEmbedded] = useState(false)
  
  useEffect(() => {
    // Detect embedded mode from URL parameter (client-side only)
    if (typeof window === 'undefined') return
    
    const searchParams = new URLSearchParams(window.location.search)
    const embedded = searchParams.get('embedded') === 'true'
    setIsEmbedded(embedded)
    
    if (embedded) {
      console.log('🎯 AI Doctor running in embedded mode (iframe)')
      console.log('📋 URL:', window.location.href)
      console.log('🔧 Parameters:', Object.fromEntries(searchParams.entries()))
      
      // Apply CSS class to body
      document.body.classList.add('embedded-mode')
      
      // Log confirmation
      console.log('✅ Embedded mode activated')
      console.log('   - Header will be hidden')
      console.log('   - Footer will be hidden')
      console.log('   - Interface adapted for iframe')
    } else {
      // Remove class if not embedded
      document.body.classList.remove('embedded-mode')
    }
  }, [])
  
  return { isEmbedded }
}
