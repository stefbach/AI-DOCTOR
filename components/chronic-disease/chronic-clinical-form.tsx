"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Stethoscope, Activity, Heart, FileText, ClipboardList, AlertCircle, Calendar } from "lucide-react"

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
    // 1. Reason for Visit (checkboxes)
    visitReasons: [] as string[],
    visitReasonOther: "",
    
    // 2. Vital Signs (all required)
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    bloodGlucose: "",
    weight: patientData.weight || "",
    height: patientData.height || "",
    temperature: "",
    
    // 3. Chronic Diseases Monitored (checkboxes)
    chronicDiseases: [] as string[],
    chronicDiseaseOther: "",
    
    // 4. Diabetes Control (if diabetic)
    lastHbA1c: "",
    lastHbA1cDate: "",
    glucoseMonitoring: [] as string[],
    diabeticComplications: [] as string[],
    
    // 5. Hypertension Control (if hypertensive)
    hypertensionControl: [] as string[],
    hypertensionSymptoms: [] as string[],
    
    // 6. Treatment Adherence
    treatmentAdherence: [] as string[],
    sideEffects: [] as string[],
    sideEffectsOther: "",
    
    // 7. Current Symptoms (checkboxes)
    currentSymptoms: [] as string[],
    currentSymptomsOther: "",
    
    // 8. Recent Tests (checkboxes)
    recentTests: [] as string[],
    recentTestsOther: "",
    
    // 9. Medical Plan (checkboxes + comments)
    medicalPlan: [] as string[],
    medicalPlanComments: ""
  })

  const [errors, setErrors] = useState<any>({})

  // Checkbox handlers
  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }))
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: "" }))
    }
  }

  // Auto-calculate BMI
  const calculateBMI = () => {
    const weight = parseFloat(formData.weight)
    const height = parseFloat(formData.height) / 100
    
    if (weight && height && height > 0) {
      return (weight / (height * height)).toFixed(1)
    }
    return null
  }

  const bmi = calculateBMI()

  const validateForm = () => {
    const newErrors: any = {}
    
    // Required vital signs
    if (!formData.bloodPressureSystolic) {
      newErrors.bloodPressureSystolic = "Systolic blood pressure is required"
    }
    if (!formData.bloodPressureDiastolic) {
      newErrors.bloodPressureDiastolic = "Diastolic blood pressure is required"
    }
    if (!formData.heartRate) {
      newErrors.heartRate = "Heart rate is required"
    }
    if (!formData.bloodGlucose) {
      newErrors.bloodGlucose = "Blood glucose is required"
    }
    if (!formData.weight) {
      newErrors.weight = "Weight is required"
    }
    if (!formData.height) {
      newErrors.height = "Height is required"
    }
    
    // At least one visit reason
    if (formData.visitReasons.length === 0 && !formData.visitReasonOther.trim()) {
      newErrors.visitReasons = "Please select at least one reason for visit"
    }
    
    // At least one chronic disease
    if (formData.chronicDiseases.length === 0 && !formData.chronicDiseaseOther.trim()) {
      newErrors.chronicDiseases = "Please select at least one chronic disease being monitored"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      const chronicClinicalData = {
        // Visit information
        visitReasons: formData.visitReasons,
        visitReasonOther: formData.visitReasonOther,
        
        // Vital signs
        vitalSigns: {
          bloodPressureSystolic: formData.bloodPressureSystolic,
          bloodPressureDiastolic: formData.bloodPressureDiastolic,
          bloodPressure: `${formData.bloodPressureSystolic}/${formData.bloodPressureDiastolic}`,
          heartRate: formData.heartRate,
          bloodGlucose: formData.bloodGlucose,
          weight: formData.weight,
          height: formData.height,
          temperature: formData.temperature,
          bmi: bmi
        },
        
        // Chronic diseases
        chronicDiseases: formData.chronicDiseases,
        chronicDiseaseOther: formData.chronicDiseaseOther,
        
        // Diabetes control (if applicable)
        chronicDiseaseSpecific: {
          lastHbA1c: formData.lastHbA1c,
          lastHbA1cDate: formData.lastHbA1cDate,
          glucoseMonitoring: formData.glucoseMonitoring,
          diabeticComplications: formData.diabeticComplications,
          
          // Hypertension control (if applicable)
          hypertensionControl: formData.hypertensionControl,
          hypertensionSymptoms: formData.hypertensionSymptoms,
          
          // Treatment
          medicationAdherence: formData.treatmentAdherence.join(", ") || "Not specified",
          sideEffects: formData.sideEffects.length > 0 
            ? formData.sideEffects.join(", ") + (formData.sideEffectsOther ? `, ${formData.sideEffectsOther}` : '')
            : "None reported",
          
          // Complications placeholder for API compatibility
          complications: {
            visionChanges: formData.diabeticComplications.includes("Retinopathy") ? "Yes" : "No",
            footProblems: formData.diabeticComplications.includes("Diabetic foot") ? "Yes" : "No",
            chestPain: formData.currentSymptoms.includes("Chest pain") ? "Yes" : "No",
            shortnessOfBreath: formData.currentSymptoms.includes("Dyspnea") ? "Yes" : "No"
          }
        },
        
        // Current symptoms
        currentSymptoms: formData.currentSymptoms,
        currentSymptomsOther: formData.currentSymptomsOther,
        
        // Recent tests
        recentTests: formData.recentTests,
        recentTestsOther: formData.recentTestsOther,
        
        // Medical plan
        medicalPlan: formData.medicalPlan,
        medicalPlanComments: formData.medicalPlanComments,
        
        // Chief complaint (generated from visit reasons for API compatibility)
        chiefComplaint: formData.visitReasons.length > 0 
          ? formData.visitReasons.join(", ") + (formData.visitReasonOther ? `, ${formData.visitReasonOther}` : '')
          : formData.visitReasonOther || "Chronic disease follow-up"
      }
      
      onNext(chronicClinicalData)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. REASON FOR VISIT */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            1. Reason for Visit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            {[
              "Regular chronic disease follow-up",
              "Treatment renewal",
              "Recent imbalance",
              "New symptoms",
              "Test results discussion",
              "Side effects"
            ].map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <Checkbox 
                  id={`visit-${reason}`}
                  checked={formData.visitReasons.includes(reason)}
                  onCheckedChange={(checked) => handleCheckboxChange('visitReasons', reason, checked as boolean)}
                />
                <Label htmlFor={`visit-${reason}`} className="text-sm font-normal cursor-pointer">
                  {reason}
                </Label>
              </div>
            ))}
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="visit-other"
                checked={!!formData.visitReasonOther}
                onCheckedChange={(checked) => !checked && handleChange('visitReasonOther', '')}
              />
              <div className="flex-1">
                <Label htmlFor="visit-other-text" className="text-sm font-normal">Other:</Label>
                <Input
                  id="visit-other-text"
                  value={formData.visitReasonOther}
                  onChange={(e) => handleChange('visitReasonOther', e.target.value)}
                  placeholder="Specify other reason..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          {errors.visitReasons && (
            <p className="text-blue-500 text-sm flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.visitReasons}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. VITAL SIGNS */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            2. Vital Signs (All Required)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bloodPressureSystolic">Systolic BP (mmHg) *</Label>
              <Input
                id="bloodPressureSystolic"
                type="number"
                value={formData.bloodPressureSystolic}
                onChange={(e) => handleChange("bloodPressureSystolic", e.target.value)}
                placeholder="120"
                className={errors.bloodPressureSystolic ? "border-blue-500" : ""}
              />
              {errors.bloodPressureSystolic && (
                <p className="text-blue-500 text-xs mt-1">{errors.bloodPressureSystolic}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="bloodPressureDiastolic">Diastolic BP (mmHg) *</Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                value={formData.bloodPressureDiastolic}
                onChange={(e) => handleChange("bloodPressureDiastolic", e.target.value)}
                placeholder="80"
                className={errors.bloodPressureDiastolic ? "border-blue-500" : ""}
              />
            </div>
            
            <div>
              <Label htmlFor="heartRate">Heart Rate (bpm) *</Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.heartRate}
                onChange={(e) => handleChange("heartRate", e.target.value)}
                placeholder="72"
                className={errors.heartRate ? "border-blue-500" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bloodGlucose">Blood Glucose (g/L) *</Label>
              <Input
                id="bloodGlucose"
                type="number"
                step="0.01"
                value={formData.bloodGlucose}
                onChange={(e) => handleChange("bloodGlucose", e.target.value)}
                placeholder="1.0"
                className={errors.bloodGlucose ? "border-blue-500" : ""}
              />
            </div>
            
            <div>
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                placeholder="85"
                className={errors.weight ? "border-blue-500" : ""}
              />
            </div>
            
            <div>
              <Label htmlFor="height">Height (cm) *</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleChange("height", e.target.value)}
                placeholder="170"
                className={errors.height ? "border-blue-500" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            {bmi && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm text-gray-600">BMI:</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-lg font-bold">
                      {bmi}
                    </Badge>
                    <span className={`text-sm font-medium ${
                      parseFloat(bmi) < 18.5 ? "text-blue-600" :
                      parseFloat(bmi) < 25 ? "text-teal-600" :
                      parseFloat(bmi) < 30 ? "text-cyan-600" :
                      "text-blue-600"
                    }`}>
                      {parseFloat(bmi) < 18.5 ? "Underweight" :
                       parseFloat(bmi) < 25 ? "Normal" :
                       parseFloat(bmi) < 30 ? "Overweight" :
                       "Obese"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </CardContent>
      </Card>

      {/* 3. CHRONIC DISEASES MONITORED */}
      <Card className="border-teal-200">
        <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-teal-600" />
            3. Chronic Diseases Monitored
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Type 2 Diabetes",
              "Arterial Hypertension",
              "Dyslipidemia",
              "Obesity",
              "Coronary Heart Disease",
              "Heart Failure",
              "Asthma / COPD",
              "Chronic Kidney Disease"
            ].map((disease) => (
              <div key={disease} className="flex items-center space-x-2">
                <Checkbox 
                  id={`disease-${disease}`}
                  checked={formData.chronicDiseases.includes(disease)}
                  onCheckedChange={(checked) => handleCheckboxChange('chronicDiseases', disease, checked as boolean)}
                />
                <Label htmlFor={`disease-${disease}`} className="text-sm font-normal cursor-pointer">
                  {disease}
                </Label>
              </div>
            ))}
            
            <div className="flex items-start space-x-2 md:col-span-2">
              <Checkbox 
                id="disease-other"
                checked={!!formData.chronicDiseaseOther}
                onCheckedChange={(checked) => !checked && handleChange('chronicDiseaseOther', '')}
              />
              <div className="flex-1">
                <Label htmlFor="disease-other-text" className="text-sm font-normal">Other chronic disease:</Label>
                <Input
                  id="disease-other-text"
                  value={formData.chronicDiseaseOther}
                  onChange={(e) => handleChange('chronicDiseaseOther', e.target.value)}
                  placeholder="Specify other chronic disease..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          {errors.chronicDiseases && (
            <p className="text-blue-500 text-sm flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.chronicDiseases}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. DIABETES CONTROL (if diabetic) */}
      {(formData.chronicDiseases.includes("Type 2 Diabetes") || formData.chronicDiseases.includes("Type 1 Diabetes")) && (
        <Card className="border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              4. Diabetes Control
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            {/* Last HbA1c */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lastHbA1c">Last HbA1c (%)</Label>
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
                <Label htmlFor="lastHbA1cDate" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date of Last HbA1c
                </Label>
                <Input
                  id="lastHbA1cDate"
                  type="date"
                  value={formData.lastHbA1cDate}
                  onChange={(e) => handleChange("lastHbA1cDate", e.target.value)}
                />
              </div>
            </div>

            {/* Glucose Self-Monitoring */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Glucose Self-Monitoring</Label>
              <div className="space-y-2">
                {[
                  "Stable blood glucose",
                  "Frequent hypoglycemia",
                  "Frequent hyperglycemia",
                  "High variability",
                  "Not applicable"
                ].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`glucose-${status}`}
                      checked={formData.glucoseMonitoring.includes(status)}
                      onCheckedChange={(checked) => handleCheckboxChange('glucoseMonitoring', status, checked as boolean)}
                    />
                    <Label htmlFor={`glucose-${status}`} className="text-sm font-normal cursor-pointer">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Diabetic Complications */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Complications (check all that apply)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Neuropathy",
                  "Retinopathy",
                  "Nephropathy",
                  "Diabetic foot",
                  "None"
                ].map((complication) => (
                  <div key={complication} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`complication-${complication}`}
                      checked={formData.diabeticComplications.includes(complication)}
                      onCheckedChange={(checked) => handleCheckboxChange('diabeticComplications', complication, checked as boolean)}
                    />
                    <Label htmlFor={`complication-${complication}`} className="text-sm font-normal cursor-pointer">
                      {complication}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
          </CardContent>
        </Card>
      )}

      {/* 5. HYPERTENSION CONTROL (if hypertensive) */}
      {formData.chronicDiseases.includes("Arterial Hypertension") && (
        <Card className="border-cyan-200">
          <CardHeader className="bg-gradient-to-r from-orange-100 to-amber-100">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-cyan-600" />
              5. Hypertension Control
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            {/* Blood Pressure Control */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Blood Pressure Status</Label>
              <div className="space-y-2">
                {[
                  "Well controlled (< 140/90)",
                  "Recent hypertensive crisis",
                  "Uncontrolled despite treatment",
                  "Irregular measurements",
                  "Not applicable"
                ].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`bp-${status}`}
                      checked={formData.hypertensionControl.includes(status)}
                      onCheckedChange={(checked) => handleCheckboxChange('hypertensionControl', status, checked as boolean)}
                    />
                    <Label htmlFor={`bp-${status}`} className="text-sm font-normal cursor-pointer">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Signs */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Warning Signs</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Severe headaches",
                  "Chest pain",
                  "Dizziness",
                  "Dyspnea",
                  "None"
                ].map((symptom) => (
                  <div key={symptom} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`htn-symptom-${symptom}`}
                      checked={formData.hypertensionSymptoms.includes(symptom)}
                      onCheckedChange={(checked) => handleCheckboxChange('hypertensionSymptoms', symptom, checked as boolean)}
                    />
                    <Label htmlFor={`htn-symptom-${symptom}`} className="text-sm font-normal cursor-pointer">
                      {symptom}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
          </CardContent>
        </Card>
      )}

      {/* 6. TREATMENT ADHERENCE */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-red-100 to-pink-100">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            6. Treatment Adherence
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          {/* Adherence Status */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Medication Adherence</Label>
            <div className="space-y-2">
              {[
                "Treatment followed correctly",
                "Occasional missed doses",
                "Frequent missed doses",
                "Voluntary discontinuation",
                "Financial difficulties",
                "Side effects experienced"
              ].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`adherence-${status}`}
                    checked={formData.treatmentAdherence.includes(status)}
                    onCheckedChange={(checked) => handleCheckboxChange('treatmentAdherence', status, checked as boolean)}
                  />
                  <Label htmlFor={`adherence-${status}`} className="text-sm font-normal cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Side Effects */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Side Effects (check all that apply)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "None",
                "Digestive problems",
                "Fatigue",
                "Hypotension",
                "Hypoglycemia",
                "Cough (ACE inhibitors)"
              ].map((effect) => (
                <div key={effect} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`effect-${effect}`}
                    checked={formData.sideEffects.includes(effect)}
                    onCheckedChange={(checked) => handleCheckboxChange('sideEffects', effect, checked as boolean)}
                  />
                  <Label htmlFor={`effect-${effect}`} className="text-sm font-normal cursor-pointer">
                    {effect}
                  </Label>
                </div>
              ))}
              
              <div className="flex items-start space-x-2 md:col-span-2">
                <Checkbox 
                  id="effect-other"
                  checked={!!formData.sideEffectsOther}
                  onCheckedChange={(checked) => !checked && handleChange('sideEffectsOther', '')}
                />
                <div className="flex-1">
                  <Label htmlFor="effect-other-text" className="text-sm font-normal">Other:</Label>
                  <Input
                    id="effect-other-text"
                    value={formData.sideEffectsOther}
                    onChange={(e) => handleChange('sideEffectsOther', e.target.value)}
                    placeholder="Specify other side effects..."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* 7. CURRENT SYMPTOMS */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-violet-100">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            7. Current Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "None",
              "Dyspnea",
              "Chest pain",
              "Palpitations",
              "Edema",
              "Polyuria/polydipsia",
              "Headaches",
              "Weight gain",
              "Marked fatigue"
            ].map((symptom) => (
              <div key={symptom} className="flex items-center space-x-2">
                <Checkbox 
                  id={`symptom-${symptom}`}
                  checked={formData.currentSymptoms.includes(symptom)}
                  onCheckedChange={(checked) => handleCheckboxChange('currentSymptoms', symptom, checked as boolean)}
                />
                <Label htmlFor={`symptom-${symptom}`} className="text-sm font-normal cursor-pointer">
                  {symptom}
                </Label>
              </div>
            ))}
            
            <div className="flex items-start space-x-2 md:col-span-2">
              <Checkbox 
                id="symptom-other"
                checked={!!formData.currentSymptomsOther}
                onCheckedChange={(checked) => !checked && handleChange('currentSymptomsOther', '')}
              />
              <div className="flex-1">
                <Label htmlFor="symptom-other-text" className="text-sm font-normal">Other:</Label>
                <Input
                  id="symptom-other-text"
                  value={formData.currentSymptomsOther}
                  onChange={(e) => handleChange('currentSymptomsOther', e.target.value)}
                  placeholder="Specify other symptoms..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8. RECENT TESTS */}
      <Card className="border-cyan-200">
        <CardHeader className="bg-gradient-to-r from-yellow-100 to-amber-100">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-cyan-600" />
            8. Recent Tests (last 6 months)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            {[
              "Renal function (creatinine, eGFR)",
              "Lipid panel",
              "ECG",
              "Fundoscopy",
              "Microalbuminuria",
              "None"
            ].map((test) => (
              <div key={test} className="flex items-center space-x-2">
                <Checkbox 
                  id={`test-${test}`}
                  checked={formData.recentTests.includes(test)}
                  onCheckedChange={(checked) => handleCheckboxChange('recentTests', test, checked as boolean)}
                />
                <Label htmlFor={`test-${test}`} className="text-sm font-normal cursor-pointer">
                  {test}
                </Label>
              </div>
            ))}
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="test-other"
                checked={!!formData.recentTestsOther}
                onCheckedChange={(checked) => !checked && handleChange('recentTestsOther', '')}
              />
              <div className="flex-1">
                <Label htmlFor="test-other-text" className="text-sm font-normal">Other:</Label>
                <Input
                  id="test-other-text"
                  value={formData.recentTestsOther}
                  onChange={(e) => handleChange('recentTestsOther', e.target.value)}
                  placeholder="Specify other tests..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 9. MEDICAL PLAN */}
      <Card className="border-teal-200">
        <CardHeader className="bg-gradient-to-r from-green-100 to-teal-100">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            9. Medical Plan / Course of Action
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            {[
              "Treatment unchanged",
              "Therapeutic adjustment",
              "Add medication",
              "Additional tests required",
              "Close follow-up needed",
              "Patient education",
              "Referral to specialist",
              "Emergency - immediate consultation"
            ].map((plan) => (
              <div key={plan} className="flex items-center space-x-2">
                <Checkbox 
                  id={`plan-${plan}`}
                  checked={formData.medicalPlan.includes(plan)}
                  onCheckedChange={(checked) => handleCheckboxChange('medicalPlan', plan, checked as boolean)}
                />
                <Label htmlFor={`plan-${plan}`} className="text-sm font-normal cursor-pointer">
                  {plan}
                </Label>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="medicalPlanComments">Additional Comments / Clinical Notes</Label>
            <Textarea
              id="medicalPlanComments"
              value={formData.medicalPlanComments}
              onChange={(e) => handleChange('medicalPlanComments', e.target.value)}
              placeholder="Any additional notes, observations, or specific instructions..."
              rows={4}
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to AI Questions
        </Button>
      </div>
    </div>
  )
}
