'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Stethoscope,
  Eye,
  Heart,
  ArrowRight,
  Sparkles,
  FileText,
  TrendingUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ConsultationType } from '@/lib/consultation-hub/route-decision'
import { determineOptimalRoute } from '@/lib/consultation-hub/route-decision'
import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'

export interface HubWorkflowSelectorProps {
  patientData: {
    consultations: ConsultationHistoryItem[]
  } | null
  onProceed: (path: string) => void
}

export function HubWorkflowSelector({ patientData, onProceed }: HubWorkflowSelectorProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<ConsultationType>('normal')
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')

  const consultationHistory = patientData?.consultations || []
  const routeDecision = determineOptimalRoute(consultationHistory, selectedType)

  const handleProceed = () => {
    const selectedPath = selectedWorkflow || routeDecision.recommendedPath
    onProceed(selectedPath)
    router.push(selectedPath)
  }

  return (
    <div className="space-y-6">
      {/* Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            1. Type de Consultation
          </CardTitle>
          <CardDescription>
            Choisissez le type de consultation à effectuer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value as ConsultationType)
              setSelectedWorkflow('') // Reset workflow selection
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Normal */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'normal' ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4" onClick={() => setSelectedType('normal')}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="normal" id="type-normal" />
                    <div className="flex-1">
                      <Label htmlFor="type-normal" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold">Consultation Normale</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Consultation médicale générale
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dermatology */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'dermatology' ? 'ring-2 ring-indigo-500' : ''}`}>
                <CardContent className="p-4" onClick={() => setSelectedType('dermatology')}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="dermatology" id="type-dermato" />
                    <div className="flex-1">
                      <Label htmlFor="type-dermato" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-5 w-5 text-indigo-600" />
                          <span className="font-semibold">Dermatologie</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Problèmes de peau
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chronic */}
              <Card className={`cursor-pointer transition-all ${selectedType === 'chronic' ? 'ring-2 ring-red-500' : ''}`}>
                <CardContent className="p-4" onClick={() => setSelectedType('chronic')}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="chronic" id="type-chronic" />
                    <div className="flex-1">
                      <Label htmlFor="type-chronic" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-5 w-5 text-red-600" />
                          <span className="font-semibold">Maladie Chronique</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Diabète, hypertension, etc.
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Workflow Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            2. Workflow Recommandé
          </CardTitle>
          <CardDescription>
            {routeDecision.isNewPatient
              ? 'Nouveau patient - Consultation initiale'
              : `Patient existant - ${routeDecision.patientSummary?.totalConsultations} consultation(s) précédente(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {routeDecision.availablePaths.map((option, index) => (
            <Card
              key={option.path}
              className={`cursor-pointer transition-all ${
                selectedWorkflow === option.path
                  ? 'ring-2 ring-green-500 bg-green-50'
                  : option.isRecommended
                  ? 'border-green-300 bg-green-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedWorkflow(option.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">{option.label}</span>
                      {option.isRecommended && (
                        <Badge className="bg-green-600 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Recommandé
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                    <p className="text-xs text-gray-500 mt-2 font-mono">
                      → {option.path}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Patient Summary if exists */}
          {routeDecision.patientSummary && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">
                📊 Résumé Historique
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  • Total consultations: {routeDecision.patientSummary.totalConsultations}
                </p>
                <p>
                  • Dernière consultation: {new Date(routeDecision.patientSummary.lastConsultationDate).toLocaleDateString()}
                </p>
                <p>
                  • Type précédent: {routeDecision.patientSummary.lastConsultationType}
                </p>
              </div>
            </div>
          )}

          {/* Proceed Button */}
          <Button
            onClick={handleProceed}
            size="lg"
            className="w-full"
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Commencer la Consultation
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
