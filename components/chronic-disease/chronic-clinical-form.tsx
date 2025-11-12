"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Activity, Heart } from "lucide-react"

interface ChronicClinicalFormProps {
  patientData: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function ChronicClinicalForm({ 
  patientData, 
  onNext, 
  onBack 
}: ChronicClinicalFormProps) {
  const [formData, setFormData] = useState({
    chiefComplaint: "",
    symptomDuration: "",
    
    // Vital Signs - Chronic Disease Specific
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    bloodGlucose: "",
    heartRate: "",
    temperature: "",
    weight: patientData.weight || "",
    height: patientData.height || "",
    
    // Chronic Disease Specific Fields
    lastHbA1c: "",
    lastHbA1cDate: "",
    lastLipidPanel: "",
    lastLipidPanelDate: "",
    lastFollowUpDate: "",
    
    // Medication Adherence
    medicationAdherence: "",
    missedDosesReason: "",
    sideEffects: "",
    
    // Lifestyle Assessment
    dietCompliance: "",
    exerciseFrequency: "",
    smokingStatus: patientData.smokingStatus || "",
    alcoholConsumption: patientData.alcoholConsumption || "",
    
    // Complications Screening
    visionChanges: "",
    footProblems: "",
    chestPain: "",
    shortnessOfBreath: "",
    
    // Additional Notes
    additionalSymptoms: ""
  })

  const [errors, setErrors] = useState<any>({})

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}
    
    if (!formData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = "Chief complaint is required"
    }
    
    if (!formData.bloodPressureSystolic) {
      newErrors.bloodPressureSystolic = "Blood pressure is required for chronic disease follow-up"
    }
    
    if (!formData.bloodPressureDiastolic) {
      newErrors.bloodPressureDiastolic = "Blood pressure is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      const chronicClinicalData = {
        chiefComplaint: formData.chiefComplaint,
        symptomDuration: formData.symptomDuration,
        vitalSigns: {
          bloodPressureSystolic: formData.bloodPressureSystolic,
          bloodPressureDiastolic: formData.bloodPressureDiastolic,
          bloodGlucose: formData.bloodGlucose,
          heartRate: formData.heartRate,
          temperature: formData.temperature,
          weight: formData.weight,
          height: formData.height
        },
        chronicDiseaseSpecific: {
          lastHbA1c: formData.lastHbA1c,
          lastHbA1cDate: formData.lastHbA1cDate,
          lastLipidPanel: formData.lastLipidPanel,
          lastLipidPanelDate: formData.lastLipidPanelDate,
          lastFollowUp: formData.lastFollowUpDate,
          medicationAdherence: formData.medicationAdherence,
          missedDosesReason: formData.missedDosesReason,
          sideEffects: formData.sideEffects,
          complications: {
            visionChanges: formData.visionChanges,
            footProblems: formData.footProblems,
            chestPain: formData.chestPain,
            shortnessOfBreath: formData.shortnessOfBreath
          }
        },
        lifestyle: {
          dietCompliance: formData.dietCompliance,
          exerciseFrequency: formData.exerciseFrequency,
          smoking: formData.smokingStatus,
          alcohol: formData.alcoholConsumption
        },
        additionalNotes: formData.additionalSymptoms
      }
      
      onNext(chronicClinicalData)
    }
  }

  // Calculate BMI
  const calculateBMI = () => {
    const weight = parseFloat(formData.weight)
    const height = parseFloat(formData.height) / 100
    
    if (weight && height && height > 0) {
      return (weight / (height * height)).toFixed(1)
    }
    return null
  }

  const bmi = calculateBMI()

  return (
    <div className="space-y-6">
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-purple-600" />
            Chronic Disease Clinical Examination
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Chief Complaint */}
          <div>
            <Label htmlFor="chiefComplaint" className="text-base font-semibold">
              Chief Complaint / Reason for Visit *
            </Label>
            <Textarea
              id="chiefComplaint"
              value={formData.chiefComplaint}
              onChange={(e) => handleChange("chiefComplaint", e.target.value)}
              placeholder="e.g., Routine chronic disease follow-up, medication refill, blood sugar control issues..."
              rows={3}
              className={errors.chiefComplaint ? "border-red-500" : ""}
            />
            {errors.chiefComplaint && (
              <p className="text-red-500 text-sm mt-1">{errors.chiefComplaint}</p>
            )}
          </div>

          <div>
            <Label htmlFor="symptomDuration">Duration of Current Symptoms (if any)</Label>
            <Input
              id="symptomDuration"
              value={formData.symptomDuration}
              onChange={(e) => handleChange("symptomDuration", e.target.value)}
              placeholder="e.g., 3 days, 2 weeks, chronic"
            />
          </div>

        </CardContent>
      </Card>

      {/* Vital Signs */}
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-purple-100">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Vital Signs & Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bloodPressureSystolic">Blood Pressure (Systolic) *</Label>
              <Input
                id="bloodPressureSystolic"
                type="number"
                value={formData.bloodPressureSystolic}
                onChange={(e) => handleChange("bloodPressureSystolic", e.target.value)}
                placeholder="120"
                className={errors.bloodPressureSystolic ? "border-red-500" : ""}
              />
              {errors.bloodPressureSystolic && (
                <p className="text-red-500 text-sm mt-1">{errors.bloodPressureSystolic}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="bloodPressureDiastolic">Blood Pressure (Diastolic) *</Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                value={formData.bloodPressureDiastolic}
                onChange={(e) => handleChange("bloodPressureDiastolic", e.target.value)}
                placeholder="80"
                className={errors.bloodPressureDiastolic ? "border-red-500" : ""}
              />
            </div>
            
            <div>
              <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.heartRate}
                onChange={(e) => handleChange("heartRate", e.target.value)}
                placeholder="72"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bloodGlucose">Blood Glucose (g/L)</Label>
              <Input
                id="bloodGlucose"
                type="number"
                step="0.1"
                value={formData.bloodGlucose}
                onChange={(e) => handleChange("bloodGlucose", e.target.value)}
                placeholder="1.0"
              />
            </div>
            
            <div>
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleChange("temperature", e.target.value)}
                placeholder="37.0"
              />
            </div>
            
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                placeholder="70"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleChange("height", e.target.value)}
                placeholder="170"
              />
            </div>
            
            {bmi && (
              <div className="flex items-center gap-2">
                <Label>BMI:</Label>
                <Badge variant="secondary" className="text-lg">
                  {bmi}
                </Badge>
                <span className="text-sm text-gray-600">
                  {parseFloat(bmi) < 18.5 ? "Underweight" :
                   parseFloat(bmi) < 25 ? "Normal" :
                   parseFloat(bmi) < 30 ? "Overweight" :
                   "Obese"}
                </span>
              </div>
            )}
          </div>
          
        </CardContent>
      </Card>

      {/* Chronic Disease Specific */}
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-purple-600" />
            Chronic Disease Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastHbA1c">Last HbA1c (%) - if diabetic</Label>
              <Input
                id="lastHbA1c"
                type="number"
                step="0.1"
                value={formData.lastHbA1c}
                onChange={(e) => handleChange("lastHbA1c", e.target.value)}
                placeholder="7.0"
              />
            </div>
            
            <div>
              <Label htmlFor="lastHbA1cDate">Date of Last HbA1c</Label>
              <Input
                id="lastHbA1cDate"
                type="date"
                value={formData.lastHbA1cDate}
                onChange={(e) => handleChange("lastHbA1cDate", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lastFollowUpDate">Date of Last Follow-Up Visit</Label>
            <Input
              id="lastFollowUpDate"
              type="date"
              value={formData.lastFollowUpDate}
              onChange={(e) => handleChange("lastFollowUpDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="medicationAdherence">Medication Adherence</Label>
            <Textarea
              id="medicationAdherence"
              value={formData.medicationAdherence}
              onChange={(e) => handleChange("medicationAdherence", e.target.value)}
              placeholder="Are you taking all medications as prescribed? Any missed doses?"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="sideEffects">Medication Side Effects (if any)</Label>
            <Textarea
              id="sideEffects"
              value={formData.sideEffects}
              onChange={(e) => handleChange("sideEffects", e.target.value)}
              placeholder="Report any side effects from medications..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="additionalSymptoms">Additional Symptoms or Concerns</Label>
            <Textarea
              id="additionalSymptoms"
              value={formData.additionalSymptoms}
              onChange={(e) => handleChange("additionalSymptoms", e.target.value)}
              placeholder="Any other symptoms, concerns, or questions..."
              rows={3}
            />
          </div>
          
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg">
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
        >
          Continue to AI Questions
        </Button>
      </div>
    </div>
  )
}
