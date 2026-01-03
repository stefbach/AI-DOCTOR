"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export function useEmbeddedMode() {
  const [isEmbedded, setIsEmbedded] = useState(false)
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Detect embedded mode from URL parameter
    const embedded = searchParams?.get('embedded') === 'true'
    setIsEmbedded(embedded)
    
    if (embedded) {
      console.log('🎯 AI Doctor running in embedded mode (iframe)')
      console.log('📋 URL:', window.location.href)
      console.log('🔧 Parameters:', Object.fromEntries(searchParams?.entries() || []))
      
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
  }, [searchParams])
  
  return { isEmbedded }
}
