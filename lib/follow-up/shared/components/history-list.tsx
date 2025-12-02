'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Clock, 
  FileText, 
  Heart, 
  Pill, 
  Activity,
  Eye,
  ChevronRight,
  Stethoscope,
  Thermometer,
  TrendingUp
} from 'lucide-react'
import { ConsultationHistoryItem } from '@/lib/follow-up/shared/utils/history-fetcher'
import { format, formatDistanceToNow } from 'date-fns'

export interface HistoryListProps {
  history: ConsultationHistoryItem[]
  onSelectConsultation?: (consultation: ConsultationHistoryItem) => void
  selectedId?: string
  maxItems?: number
  showTimeline?: boolean
}

/**
 * HistoryList Component
 * 
 * Displays patient consultation history in a professional card-based timeline.
 * Supports multiple consultation types (normal, dermatology, chronic).
 * 
 * @component
 * @example
 * ```tsx
 * <HistoryList 
 *   history={consultationHistory}
 *   onSelectConsultation={handleSelect}
 *   selectedId={selectedConsultation?.id}
 *   showTimeline={true}
 * />
 * ```
 */
export function HistoryList({ 
  history, 
  onSelectConsultation,
  selectedId,
  maxItems,
  showTimeline = true
}: HistoryListProps) {
  const displayHistory = maxItems ? history.slice(0, maxItems) : history

  if (history.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">No Consultation History</p>
          <p className="text-sm mt-1">This patient has no previous consultations</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Consultation History
          <Badge variant="secondary">{history.length} records</Badge>
        </h3>
      </div>

      <div className={`space-y-4 ${showTimeline ? 'relative pl-8' : ''}`}>
        {/* Timeline Line */}
        {showTimeline && displayHistory.length > 1 && (
          <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200" />
        )}

        {displayHistory.map((consultation, index) => (
          <ConsultationCard
            key={consultation.id}
            consultation={consultation}
            isSelected={consultation.id === selectedId}
            onSelect={onSelectConsultation}
            showTimelineDot={showTimeline}
            isFirst={index === 0}
          />
        ))}
      </div>

      {maxItems && history.length > maxItems && (
        <p className="text-sm text-gray-500 text-center pt-2">
          Showing {maxItems} of {history.length} consultations
        </p>
      )}
    </div>
  )
}

interface ConsultationCardProps {
  consultation: ConsultationHistoryItem
  isSelected: boolean
  onSelect?: (consultation: ConsultationHistoryItem) => void
  showTimelineDot: boolean
  isFirst: boolean
}

function ConsultationCard({ 
  consultation, 
  isSelected, 
  onSelect,
  showTimelineDot,
  isFirst
}: ConsultationCardProps) {
  const consultationType = consultation.consultationType || 'normal'
  const typeConfig = getConsultationTypeConfig(consultationType)

  return (
    <Card
      className={`relative transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-md'
          : 'hover:shadow-md cursor-pointer'
      }`}
      onClick={() => {
        console.log('📋 Consultation clicked:', consultation)
        onSelect?.(consultation)
      }}
    >
      {/* Timeline Dot */}
      {showTimelineDot && (
        <div className={`absolute left-[-2.4rem] top-6 w-4 h-4 rounded-full ${
          isFirst ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-300'
        }`} />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
              {typeConfig.icon}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {typeConfig.label}
                {isFirst && (
                  <Badge className="bg-green-500">Most Recent</Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(consultation.date), 'MMM dd, yyyy')}
                </span>
                <span className="text-xs text-gray-400">
                  ({formatDistanceToNow(new Date(consultation.date), { addSuffix: true })})
                </span>
              </CardDescription>
            </div>
          </div>
          
          {onSelect && (
            <ChevronRight className={`h-5 w-5 transition-transform ${
              isSelected ? 'rotate-90 text-blue-600' : 'text-gray-400'
            }`} />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Chief Complaint */}
        {consultation.chiefComplaint && (
          <div className="flex items-start gap-2">
            <Stethoscope className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase">Chief Complaint</p>
              <p className="text-sm text-gray-700 line-clamp-2">{consultation.chiefComplaint}</p>
            </div>
          </div>
        )}

        {/* Diagnosis */}
        {consultation.diagnosis && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase">Diagnosis</p>
              <p className="text-sm text-gray-700 line-clamp-2">{consultation.diagnosis}</p>
            </div>
          </div>
        )}

        {/* Vital Signs */}
        {consultation.vitalSigns && Object.keys(consultation.vitalSigns).length > 0 && (
          <div className="flex items-start gap-2">
            <Activity className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase">Vital Signs</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {consultation.vitalSigns.bloodPressure && (
                  <Badge variant="outline" className="text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    BP: {consultation.vitalSigns.bloodPressure}
                  </Badge>
                )}
                {consultation.vitalSigns.weight && (
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {consultation.vitalSigns.weight} kg
                  </Badge>
                )}
                {consultation.vitalSigns.temperature && (
                  <Badge variant="outline" className="text-xs">
                    <Thermometer className="h-3 w-3 mr-1" />
                    {consultation.vitalSigns.temperature}°C
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Medications */}
        {consultation.medications && consultation.medications.length > 0 && (
          <div className="flex items-start gap-2">
            <Pill className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase">Medications</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {consultation.medications.slice(0, 3).map((med, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {med.name || med}
                  </Badge>
                ))}
                {consultation.medications.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{consultation.medications.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Images (for dermatology) */}
        {consultation.images && consultation.images.length > 0 && (
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-500" />
            <Badge variant="outline" className="text-xs">
              {consultation.images.length} image{consultation.images.length !== 1 ? 's' : ''} attached
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getConsultationTypeConfig(type: string) {
  switch (type.toLowerCase()) {
    case 'dermatology':
      return {
        label: 'Dermatology Consultation',
        icon: <Eye className="h-5 w-5 text-indigo-600" />,
        bgColor: 'bg-indigo-100'
      }
    case 'chronic':
    case 'chronic_disease':
      return {
        label: 'Chronic Disease Follow-up',
        icon: <Heart className="h-5 w-5 text-red-600" />,
        bgColor: 'bg-red-100'
      }
    default:
      return {
        label: 'General Consultation',
        icon: <Stethoscope className="h-5 w-5 text-blue-600" />,
        bgColor: 'bg-blue-100'
      }
  }
}
