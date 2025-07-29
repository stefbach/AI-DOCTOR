// components/test-mode-toolbar.tsx

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TestPatient } from '@/lib/test-patients-data'
import TestPatientSelector from '@/components/test-patient-selector'
import { 
  X, 
  TestTube, 
  AlertTriangle,
  Info,
  ChevronRight
} from 'lucide-react'

interface TestModeToolbarProps {
  testPatient: TestPatient | null
  onSelectPatient: (patient: TestPatient) => void
  onClearTestMode: () => void
  currentStep: number
}

export default function TestModeToolbar({
  testPatient,
  onSelectPatient,
  onClearTestMode,
  currentStep
}: TestModeToolbarProps) {
  if (!testPatient) return null

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 border-green-200'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'severe': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="bg-blue-50 border-blue-200 mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Mode Test Activé</span>
            <Badge variant="secondary" className="ml-2">
              Étape {currentStep + 1}/5
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <TestPatientSelector 
              onSelectPatient={onSelectPatient}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearTestMode}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Quitter le mode test
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-lg">
                {testPatient.patientData.firstName} {testPatient.patientData.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                {testPatient.patientData.age} ans • {testPatient.patientData.gender === 'male' ? 'Homme' : 'Femme'} • 
                ID: {testPatient.id}
              </p>
            </div>
            <Badge className={getSeverityColor(testPatient.severity)}>
              {testPatient.severity === 'mild' ? 'Cas Léger' : 
               testPatient.severity === 'moderate' ? 'Cas Modéré' : 'Cas Sévère'}
            </Badge>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{testPatient.description}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Catégorie: {testPatient.category}
                </p>
              </div>
            </div>
          </div>

          {testPatient.expectedConditions && testPatient.expectedConditions.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Diagnostics attendus pour validation:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {testPatient.expectedConditions.map((condition, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3 text-xs text-gray-500">
            <p className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              Les données seront automatiquement pré-remplies à chaque étape
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
