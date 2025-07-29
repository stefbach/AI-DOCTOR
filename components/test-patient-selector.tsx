// components/test-patient-selector.tsx

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { testPatients, TestPatient } from '@/lib/test-patients-data'
import { 
  TestTube, 
  Heart, 
  Brain, 
  Stethoscope,
  Activity,
  Pill,
  AlertCircle,
  User,
  Calendar,
  Ruler,
  Weight,
  Thermometer
} from 'lucide-react'

interface TestPatientSelectorProps {
  onSelectPatient: (patient: TestPatient) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function TestPatientSelector({ 
  onSelectPatient, 
  isOpen = false,
  onOpenChange 
}: TestPatientSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = [
    { id: 'all', label: 'Tous', icon: <User className="h-4 w-4" /> },
    { id: 'cardiology', label: 'Cardiologie', icon: <Heart className="h-4 w-4" /> },
    { id: 'respiratory', label: 'Respiratoire', icon: <Stethoscope className="h-4 w-4" /> },
    { id: 'gastro', label: 'Gastro', icon: <Activity className="h-4 w-4" /> },
    { id: 'neurology', label: 'Neurologie', icon: <Brain className="h-4 w-4" /> },
    { id: 'endocrine', label: 'Endocrine', icon: <Pill className="h-4 w-4" /> },
    { id: 'infection', label: 'Infection', icon: <AlertCircle className="h-4 w-4" /> },
    { id: 'trauma', label: 'Trauma', icon: <AlertCircle className="h-4 w-4" /> },
    { id: 'psychiatry', label: 'Psychiatrie', icon: <Brain className="h-4 w-4" /> },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'severe': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat?.icon || <User className="h-4 w-4" />
  }

  const filteredPatients = selectedCategory === 'all' 
    ? testPatients 
    : testPatients.filter(p => p.category === selectedCategory)

  const handleSelectPatient = (patient: TestPatient) => {
    onSelectPatient(patient)
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TestTube className="h-4 w-4" />
          Charger un patient test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sélectionner un patient test</DialogTitle>
          <DialogDescription>
            Choisissez un patient fictif pour tester les modules IA
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid grid-cols-5 lg:grid-cols-9 mb-4">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1">
                {cat.icon}
                <span className="hidden lg:inline text-xs">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-0">
            <ScrollArea className="h-[500px] w-full pr-4">
              <div className="grid gap-4">
                {filteredPatients.map((patient) => (
                  <Card 
                    key={patient.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-gray-100">
                            {getCategoryIcon(patient.category)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {patient.patientData.firstName} {patient.patientData.lastName}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              {patient.patientData.age} ans • {patient.patientData.gender === 'male' ? 'Homme' : 'Femme'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getSeverityColor(patient.severity)}>
                          {patient.severity === 'mild' ? 'Léger' : 
                           patient.severity === 'moderate' ? 'Modéré' : 'Sévère'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-sm">{patient.description}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Plainte principale: {patient.clinicalData.chiefComplaint}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-gray-400" />
                            <span>{patient.clinicalData.temperature}°C</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-gray-400" />
                            <span>{patient.clinicalData.heartRate} bpm</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-gray-400" />
                            <span>{patient.clinicalData.bloodPressure}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-gray-400" />
                            <span>SpO2: {patient.clinicalData.oxygenSaturation}%</span>
                          </div>
                        </div>

                        {patient.expectedConditions && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500 mb-1">Conditions attendues:</p>
                            <div className="flex flex-wrap gap-1">
                              {patient.expectedConditions.map((condition, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
