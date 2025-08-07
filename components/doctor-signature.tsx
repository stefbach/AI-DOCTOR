'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RefreshCw, Check, X } from 'lucide-react'

interface DoctorSignatureProps {
  doctorName: string
  onSignatureGenerated?: (signature: string) => void
  width?: number
  height?: number
  readonly?: boolean
  existingSignature?: string
  documentType?: string
}

export function DoctorSignature({
  doctorName,
  onSignatureGenerated,
  width = 300,
  height = 80,
  readonly = false,
  existingSignature,
  documentType = ''
}: DoctorSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signature, setSignature] = useState<string>('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  const drawRealisticSignature = (ctx: CanvasRenderingContext2D, name: string) => {
    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    
    const nameParts = name.replace('Dr. ', '').split(' ')
    const fullName = nameParts.join(' ')
    
    // Create unique but consistent signature based on name
    const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const signatureStyle = nameHash % 3
    
    ctx.save()
    ctx.translate(50, 40)
    
    // Dark ink color (like a pen)
    ctx.strokeStyle = '#1a1a2e'
    ctx.fillStyle = '#1a1a2e'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Different signature styles
    if (signatureStyle === 0) {
      // Style 1: Clean cursive with underline
      ctx.font = 'italic 28px "Brush Script MT", "Lucida Handwriting", cursive'
      ctx.fillText(fullName, 0, 0)
      
      // Clean underline with slight curve
      ctx.beginPath()
      ctx.moveTo(-5, 12)
      ctx.quadraticCurveTo(100, 16, 205, 10)
      ctx.lineWidth = 1.8
      ctx.stroke()
      
    } else if (signatureStyle === 1) {
      // Style 2: Stylized initials + flowing signature
      ctx.font = 'italic bold 32px "Brush Script MT", cursive'
      
      const firstLetter = nameParts[0]?.[0] || 'D'
      ctx.fillText(firstLetter, 0, 0)
      
      ctx.font = 'italic 26px "Lucida Handwriting", cursive'
      const restOfName = nameParts[0]?.substring(1) + ' ' + (nameParts[1] || '')
      ctx.fillText(restOfName, 28, 2)
      
      // Elegant underline
      ctx.beginPath()
      ctx.moveTo(0, 14)
      ctx.bezierCurveTo(50, 16, 150, 14, 200, 12)
      ctx.lineWidth = 1.5
      ctx.stroke()
      
    } else {
      // Style 3: Artistic connected letters
      ctx.font = 'italic 30px "Segoe Script", "Brush Script MT", cursive'
      
      let xOffset = 0
      for (let i = 0; i < fullName.length; i++) {
        const char = fullName[i]
        const charWidth = ctx.measureText(char).width
        const yOffset = Math.sin(i * 0.5) * 2
        ctx.fillText(char, xOffset, yOffset)
        xOffset += charWidth * 0.85
      }
      
      // Simple curved underline
      ctx.beginPath()
      ctx.moveTo(0, 15)
      ctx.quadraticCurveTo(xOffset/2, 18, xOffset, 13)
      ctx.lineWidth = 1.6
      ctx.stroke()
    }
    
    // Add date at the bottom
    ctx.font = '9px Arial'
    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'left'
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    ctx.fillText(`Signed: ${date}`, 0, 35)
    
    ctx.restore()
  }

  const generateSignature = () => {
    if (!canvasRef.current || !doctorName) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawRealisticSignature(ctx, doctorName)

    const signatureData = canvas.toDataURL('image/png')
    setSignature(signatureData)
  }

  useEffect(() => {
    if (existingSignature) {
      setSignature(existingSignature)
      setIsConfirmed(true)
    } else if (!readonly) {
      generateSignature()
    }
  }, [doctorName, existingSignature, documentType])

  const confirmSignature = () => {
    setIsConfirmed(true)
    if (onSignatureGenerated && signature) {
      onSignatureGenerated(signature)
    }
  }

  const regenerateSignature = () => {
    setIsConfirmed(false)
    generateSignature()
  }

  if (readonly && signature) {
    return (
      <div className="signature-display">
        <img src={signature} alt="Doctor Signature" className="max-w-full h-auto" />
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Digital Signature</h3>
          {!readonly && !isConfirmed && (
            <Button
              size="sm"
              variant="outline"
              onClick={regenerateSignature}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Regenerate
            </Button>
          )}
        </div>

        <div className="border rounded-lg p-2 bg-white">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full"
            style={{ maxWidth: `${width}px` }}
          />
        </div>

        {!readonly && (
          <div className="flex gap-2">
            {!isConfirmed ? (
              <>
                <Button
                  size="sm"
                  onClick={confirmSignature}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm Signature
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSignature('')}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <div className="flex items-center text-green-600 text-sm">
                <Check className="h-4 w-4 mr-1" />
                Signature confirmed
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
