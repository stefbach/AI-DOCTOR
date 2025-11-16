'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Calendar,
  FileText,
  Heart,
  Eye,
  Activity,
  ChevronRight
} from 'lucide-react'
import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface HubPatientSummaryProps {
  patientData: {
    searchCriteria: any
    consultations: ConsultationHistoryItem[]
    totalConsultations: number
  }
  onViewHistory: () => void
}

export function HubPatientSummary({ patientData, onViewHistory }: HubPatientSummaryProps) {
  const { searchCriteria, consultations, totalConsultations } = patientData
  const mostRecent = consultations[0]
  
  // Extraire info patient depuis la consultation la plus récente
  const patientInfo = extractPatientInfo(mostRecent)
  
  // Détecter type majoritaire
  const consultationTypes = consultations.map(c => detectType(c.consultationType))
  const typeCount: Record<string, number> = {}
  consultationTypes.forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1
  })
  const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0]

  return (
    <Card className="w-full border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-green-900">
                ✅ Patient Trouvé
              </CardTitle>
              <CardDescription className="text-green-700">
                Historique médical disponible
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-green-600 text-white">
            {totalConsultations} consultation{totalConsultations > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Identité Patient
            </h4>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              {patientInfo.name && (
                <p className="font-medium text-gray-900">{patientInfo.name}</p>
              )}
              {patientInfo.age && patientInfo.gender && (
                <p className="text-sm text-gray-600">
                  {patientInfo.age} ans • {patientInfo.gender}
                </p>
              )}
              {searchCriteria.email && (
                <p className="text-sm text-gray-600">📧 {searchCriteria.email}</p>
              )}
              {searchCriteria.phone && (
                <p className="text-sm text-gray-600">📞 {searchCriteria.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dernière Consultation
            </h4>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <p className="font-medium text-gray-900">
                {format(new Date(mostRecent.date), 'dd MMMM yyyy', { locale: fr })}
              </p>
              <p className="text-sm text-gray-600">
                Il y a {getDaysSince(mostRecent.date)} jours
              </p>
              <Badge variant="outline" className="mt-2">
                {getTypeIcon(dominantType)} {getTypeLabel(dominantType)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Medical Summary */}
        {mostRecent.diagnosis && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dernier Diagnostic
            </h4>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 line-clamp-2">
                {mostRecent.diagnosis}
              </p>
            </div>
          </div>
        )}

        {/* Recent Vitals */}
        {mostRecent.vitalSigns && Object.keys(mostRecent.vitalSigns).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dernières Constantes
            </h4>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <div className="flex flex-wrap gap-3">
                {mostRecent.vitalSigns.bloodPressure && (
                  <Badge variant="outline">
                    <Heart className="h-3 w-3 mr-1" />
                    TA: {mostRecent.vitalSigns.bloodPressure}
                  </Badge>
                )}
                {mostRecent.vitalSigns.weight && (
                  <Badge variant="outline">
                    Poids: {mostRecent.vitalSigns.weight} kg
                  </Badge>
                )}
                {mostRecent.vitalSigns.temperature && (
                  <Badge variant="outline">
                    T°: {mostRecent.vitalSigns.temperature}°C
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button
            onClick={() => window.open(`/view-report/${mostRecent.consultationId}`, '_blank')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            Voir Dernier Rapport
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button
            onClick={onViewHistory}
            variant="outline"
            className="w-full border-green-300 hover:bg-green-100"
          >
            <Eye className="mr-2 h-4 w-4" />
            Historique Complet
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function extractPatientInfo(consultation: ConsultationHistoryItem) {
  // Try to extract from fullReport if available
  if (consultation.fullReport) {
    const report = typeof consultation.fullReport === 'string' 
      ? consultation.fullReport 
      : JSON.stringify(consultation.fullReport)
    
    // Basic parsing (can be improved)
    return {
      name: consultation.fullReport?.compteRendu?.patient?.nom || '',
      age: consultation.fullReport?.compteRendu?.patient?.age || null,
      gender: consultation.fullReport?.compteRendu?.patient?.sexe || ''
    }
  }
  
  return { name: '', age: null, gender: '' }
}

function detectType(consultationType?: string): string {
  if (!consultationType) return 'normal'
  const type = consultationType.toLowerCase()
  if (type.includes('derma')) return 'dermatology'
  if (type.includes('chronic') || type.includes('chronique')) return 'chronic'
  return 'normal'
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'dermatology': return 'Dermatologie'
    case 'chronic': return 'Chronique'
    default: return 'Normale'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'dermatology': return '👁️'
    case 'chronic': return '❤️'
    default: return '🩺'
  }
}

function getDaysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
