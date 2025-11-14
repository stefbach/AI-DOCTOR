'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calendar,
  FileText,
  Stethoscope,
  Pill,
  Activity,
  TestTube,
  Image as ImageIcon,
  User,
  Heart,
  AlertCircle
} from 'lucide-react'
import { ConsultationHistoryItem } from '@/lib/follow-up/shared/utils/history-fetcher'
import { format } from 'date-fns'

export interface ConsultationDetailModalProps {
  consultation: ConsultationHistoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ConsultationDetailModal Component
 * 
 * Displays complete details of a previous consultation in a modal dialog.
 * Shows all clinical information including vitals, medications, lab tests, and images.
 * 
 * @component
 * @example
 * ```tsx
 * <ConsultationDetailModal 
 *   consultation={selectedConsultation}
 *   open={isModalOpen}
 *   onOpenChange={setIsModalOpen}
 * />
 * ```
 */
export function ConsultationDetailModal({
  consultation,
  open,
  onOpenChange
}: ConsultationDetailModalProps) {
  if (!consultation) return null

  const consultationType = consultation.consultationType || 'normal'
  const typeConfig = getConsultationTypeConfig(consultationType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {typeConfig.icon}
            {typeConfig.label}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(consultation.date), 'MMMM dd, yyyy - HH:mm')}
            <Badge variant="outline" className="ml-2">
              ID: {consultation.consultationId}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-6">
            {/* Chief Complaint */}
            {consultation.chiefComplaint && (
              <Section
                icon={<Stethoscope className="h-5 w-5 text-red-500" />}
                title="Chief Complaint"
              >
                <p className="text-gray-700 whitespace-pre-wrap">{consultation.chiefComplaint}</p>
              </Section>
            )}

            {/* Diagnosis */}
            {consultation.diagnosis && (
              <Section
                icon={<FileText className="h-5 w-5 text-blue-500" />}
                title="Diagnosis"
              >
                <p className="text-gray-700 whitespace-pre-wrap">{consultation.diagnosis}</p>
              </Section>
            )}

            {/* Vital Signs */}
            {consultation.vitalSigns && Object.keys(consultation.vitalSigns).length > 0 && (
              <Section
                icon={<Activity className="h-5 w-5 text-green-500" />}
                title="Vital Signs"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(consultation.vitalSigns).map(([key, value]) => (
                    <VitalSignItem key={key} label={formatLabel(key)} value={String(value)} />
                  ))}
                </div>
              </Section>
            )}

            {/* Medications */}
            {consultation.medications && consultation.medications.length > 0 && (
              <Section
                icon={<Pill className="h-5 w-5 text-purple-500" />}
                title="Medications Prescribed"
                badge={consultation.medications.length}
              >
                <div className="space-y-3">
                  {consultation.medications.map((med, idx) => (
                    <MedicationItem key={idx} medication={med} />
                  ))}
                </div>
              </Section>
            )}

            {/* Lab Tests */}
            {consultation.labTests && consultation.labTests.length > 0 && (
              <Section
                icon={<TestTube className="h-5 w-5 text-cyan-500" />}
                title="Laboratory Tests"
                badge={consultation.labTests.length}
              >
                <div className="space-y-2">
                  {consultation.labTests.map((test, idx) => (
                    <LabTestItem key={idx} test={test} />
                  ))}
                </div>
              </Section>
            )}

            {/* Images (Dermatology) */}
            {consultation.images && consultation.images.length > 0 && (
              <Section
                icon={<ImageIcon className="h-5 w-5 text-indigo-500" />}
                title="Clinical Images"
                badge={consultation.images.length}
              >
                <div className="grid grid-cols-2 gap-4">
                  {consultation.images.map((imageUrl, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={`Clinical image ${idx + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-600">Image {idx + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Full Report Preview */}
            {consultation.fullReport && (
              <Section
                icon={<FileText className="h-5 w-5 text-gray-500" />}
                title="Full Report"
              >
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                      {typeof consultation.fullReport === 'string' 
                        ? consultation.fullReport 
                        : JSON.stringify(consultation.fullReport, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </Section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  badge?: number
  children: React.ReactNode
}

function Section({ icon, title, badge, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
        {badge !== undefined && (
          <Badge variant="secondary">{badge}</Badge>
        )}
      </div>
      <Separator />
      {children}
    </div>
  )
}

interface VitalSignItemProps {
  label: string
  value: string
}

function VitalSignItem({ label, value }: VitalSignItemProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-gray-500 font-medium uppercase mb-1">{label}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
      </CardContent>
    </Card>
  )
}

interface MedicationItemProps {
  medication: any
}

function MedicationItem({ medication }: MedicationItemProps) {
  const name = typeof medication === 'string' ? medication : medication.name
  const dosage = typeof medication === 'object' ? medication.dosage : null
  const frequency = typeof medication === 'object' ? medication.frequency : null
  const duration = typeof medication === 'object' ? medication.duration : null

  return (
    <Card className="border-l-4 border-purple-400">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{name}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {dosage && (
                <Badge variant="outline" className="text-xs">
                  <Pill className="h-3 w-3 mr-1" />
                  {dosage}
                </Badge>
              )}
              {frequency && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {frequency}
                </Badge>
              )}
              {duration && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {duration}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface LabTestItemProps {
  test: any
}

function LabTestItem({ test }: LabTestItemProps) {
  const name = typeof test === 'string' ? test : test.name
  const value = typeof test === 'object' ? test.value : null
  const unit = typeof test === 'object' ? test.unit : null
  const normalRange = typeof test === 'object' ? test.normalRange : null
  const isAbnormal = typeof test === 'object' ? test.isAbnormal : false

  return (
    <Card className={`border-l-4 ${isAbnormal ? 'border-red-400 bg-red-50' : 'border-cyan-400'}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800">{name}</p>
              {isAbnormal && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            {value && (
              <p className="text-sm text-gray-600 mt-1">
                Result: <strong>{value}</strong> {unit}
                {normalRange && (
                  <span className="text-xs text-gray-500 ml-2">(Normal: {normalRange})</span>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getConsultationTypeConfig(type: string) {
  switch (type.toLowerCase()) {
    case 'dermatology':
      return {
        label: 'Dermatology Consultation Details',
        icon: <ImageIcon className="h-5 w-5 text-indigo-600" />
      }
    case 'chronic':
    case 'chronic_disease':
      return {
        label: 'Chronic Disease Consultation Details',
        icon: <Heart className="h-5 w-5 text-red-600" />
      }
    default:
      return {
        label: 'Consultation Details',
        icon: <Stethoscope className="h-5 w-5 text-blue-600" />
      }
  }
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}
