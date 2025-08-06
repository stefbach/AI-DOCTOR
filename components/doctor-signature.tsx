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
  height = 100,
  readonly = false,
  existingSignature,
  documentType = ''
}: DoctorSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signature, setSignature] = useState<string>('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  const generateSignature = () => {
    if (!canvasRef.current || !doctorName) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    const seedString = doctorName + documentType
    const seed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const random = (min: number, max: number) => {
      const x = Math.sin(seed + min) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }

    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    
    const initial = doctorName.charAt(0).toUpperCase()
    ctx.font = `${random(35, 45)}px "Brush Script MT", cursive`
    ctx.fillStyle = '#1e3a5f'
    ctx.fillText(initial, 20, height * 0.7)

    ctx.beginPath()
    ctx.moveTo(40, height * 0.6)
    
    for (let i = 0; i < 3; i++) {
      const cp1x = 60 + i * 50 + random(-10, 10)
      const cp1y = height * 0.4 + random(-10, 10)
      const cp2x = 80 + i * 50 + random(-10, 10)
      const cp2y = height * 0.7 + random(-10, 10)
      const endX = 100 + i * 50
      const endY = height * 0.6 + random(-5, 5)
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY)
    }
    
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(20, height * 0.85)
    ctx.lineTo(width - 20, height * 0.85)
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.font = '10px Arial'
    ctx.fillStyle = '#666'
    ctx.fillText(`Dr. ${doctorName}`, 20, height * 0.95)

    const date = new Date().toLocaleDateString()
    ctx.fillText(date, width - 80, height * 0.95)

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
