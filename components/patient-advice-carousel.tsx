"use client"

import React, { useState, useEffect } from 'react'
import { 
 Stethoscope,
 Thermometer,
 Heart,
 Eye,
 Brain,
 Activity,
 MessageCircle,
 Camera,
 AlertCircle,
 Pill,
 MapPin,
 Clock,
 ChevronLeft,
 ChevronRight,
 User,
 Home,
 HandHeart,
 Search,
 FileText,
 Volume2,
 Lightbulb,
 Shield,
 TestTube,
 Calendar,
 type LucideIcon
} from 'lucide-react'

interface PatientAdviceCarouselProps {
 patientData: any
 clinicalData: any
 analysisProgress: number
 progressMessage: string
}

interface DoctorAction {
 icon: LucideIcon
 title: string
 action: string
 tips: string[]
 color: 'blue' | 'cyan' | 'teal'
}

// Function to generate actions for the doctor during wait time
const generateDoctorActions = (patientData: any, clinicalData: any): DoctorAction[] => {
 const actions: DoctorAction[] = []
 
 // Actions based on chief complaint
 const chiefComplaint = clinicalData?.chiefComplaint?.toLowerCase() || ""
 const symptoms = clinicalData?.symptoms || []
 
 // Guided physical examination actions
 actions.push({
 icon: Stethoscope,
 title: "Guided Physical Examination",
 action: "Ask the patient to perform these gestures under your supervision",
 tips: [
 "Neck palpation for lymph nodes",
 "Throat inspection with phone flashlight",
 "Skin observation (rashes, discoloration)",
 "Mobility test if joint pain present"
 ],
 color: "blue"
 })
 
 // Vital signs measurement
 actions.push({
 icon: Thermometer,
 title: "Vital Signs Measurement",
 action: "Guide the patient to measure their vital signs",
 tips: [
 "Temperature (underarm for 3 minutes)",
 "Heart rate (radial pulse for 1 minute)",
 "Respiratory rate (count for 30 sec x2)",
 "Blood pressure if device available"
 ],
 color: "blue"
 })
 
 // Detailed history questions
 actions.push({
 icon: MessageCircle,
 title: "Detailed History Taking",
 action: "Explore these aspects during the wait",
 tips: [
 "Precise timeline of symptoms",
 "Triggering/relieving factors",
 "Similar family history",
 "Recent travel or sick contacts"
 ],
 color: "teal"
 })
 
 // Visual observation
 actions.push({
 icon: Eye,
 title: "Visual Inspection",
 action: "Carefully observe via camera",
 tips: [
 "Patient's facial expression",
 "Any protective posturing",
 "Skin and mucous membrane color",
 "Signs of respiratory distress"
 ],
 color: "blue"
 })
 
 // Environmental exploration
 actions.push({
 icon: Home,
 title: "Environmental Context",
 action: "Ask about the patient's environment",
 tips: [
 "Living conditions (dampness, mold)",
 "Pets in the home",
 "Occupational exposures",
 "Sleep quality and bedding"
 ],
 color: "cyan"
 })
 
 // Medication verification
 actions.push({
 icon: Pill,
 title: "Medication Inventory",
 action: "Have patient show their medications",
 tips: [
 "Current medications with packaging",
 "Check expiration dates",
 "Treatment compliance",
 "Recent self-medication"
 ],
 color: "cyan"
 })
 
 // Simple tests
 actions.push({
 icon: Activity,
 title: "Simple Clinical Tests",
 action: "Perform these tests via video",
 tips: [
 "Glass test (blanches if not purpura)",
 "Neck mobility (meningismus)",
 "Provoked cough (character)",
 "Walking if possible (limping)"
 ],
 color: "blue"
 })
 
 // Therapeutic education
 actions.push({
 icon: Lightbulb,
 title: "Education During Wait Time",
 action: "Take this time to educate the patient",
 tips: [
 "Explain teleconsultation process",
 "Importance of medical follow-up",
 "Warning signs to monitor",
 "Preventive hygiene measures"
 ],
 color: "blue"
 })
 
 // Photo documentation
 actions.push({
 icon: Camera,
 title: "Visual Documentation",
 action: "Request photos if relevant",
 tips: [
 "Close-up of skin lesions",
 "Limb swelling",
 "Urine color if abnormal",
 "Throat condition with flash"
 ],
 color: "teal"
 })
 
 // Psychosocial exploration
 actions.push({
 icon: HandHeart,
 title: "Psychosocial Dimension",
 action: "Explore impact on daily life",
 tips: [
 "Impact on work activities",
 "Quality of life and mood",
 "Available family support",
 "Symptom-related anxiety"
 ],
 color: "blue"
 })
 
 // Allergy screening
 actions.push({
 icon: Shield,
 title: "Allergy/Intolerance Screening",
 action: "Ask about reactions",
 tips: [
 "Known drug allergies",
 "Food intolerances",
 "Previous skin reactions",
 "Seasonal allergies"
 ],
 color: "blue"
 })
 
 // Lifestyle habits
 actions.push({
 icon: Heart,
 title: "Lifestyle and Habits",
 action: "Assess risk factors",
 tips: [
 "Diet (salt, sugar, fat)",
 "Weekly physical activity",
 "Tobacco/alcohol consumption",
 "Stress management"
 ],
 color: "cyan"
 })
 
 // Mauritius location
 actions.push({
 icon: MapPin,
 title: "Local Resources Mauritius",
 action: "Inform about available resources",
 tips: [
 "Laboratories near patient",
 "On-call pharmacies",
 "Nearest emergency services",
 "Specialists in the region"
 ],
 color: "blue"
 })
 
 // Exam preparation
 actions.push({
 icon: TestTube,
 title: "Anticipate Examinations",
 action: "Prepare patient for likely tests",
 tips: [
 "Explain fasting for blood tests",
 "X-ray preparation",
 "Required documents",
 "Approximate costs in Mauritius"
 ],
 color: "cyan"
 })
 
 // Associated symptoms
 actions.push({
 icon: Search,
 title: "Search for Associated Symptoms",
 action: "Ask about related signs",
 tips: [
 "Bowel movement changes",
 "Urinary modifications",
 "Sleep disturbances",
 "Appetite/weight changes"
 ],
 color: "blue"
 })
 
 // Non-verbal communication
 actions.push({
 icon: Volume2,
 title: "Non-Verbal Analysis",
 action: "Observe patient's communication",
 tips: [
 "Voice tone (hoarse, weak)",
 "Speech rate",
 "Speech coherence",
 "Signs of anxiety/depression"
 ],
 color: "teal"
 })
 
 // Follow-up planning
 actions.push({
 icon: Calendar,
 title: "Organize Follow-up",
 action: "Plan next steps",
 tips: [
 "Availability for examinations",
 "Patient's time preferences",
 "Work constraints",
 "Companion available if needed"
 ],
 color: "blue"
 })
 
 // Specific actions based on symptoms
 if (chiefComplaint.includes("fever") || symptoms.includes("fever")) {
 actions.push({
 icon: Thermometer,
 title: "Fever Protocol",
 action: "Specific actions for febrile state",
 tips: [
 "Temperature curve last few days",
 "Night sweats",
 "Associated chills",
 "Current hydration"
 ],
 color: "blue"
 })
 }
 
 if (chiefComplaint.includes("pain")) {
 actions.push({
 icon: Brain,
 title: "Pain Assessment",
 action: "Precisely characterize the pain",
 tips: [
 "VAS scale 0-10",
 "Type: burning, stabbing, crushing",
 "Possible radiation",
 "Pain-relieving positions"
 ],
 color: "cyan"
 })
 }
 
 if (chiefComplaint.includes("cough")) {
 actions.push({
 icon: Volume2,
 title: "Cough Analysis",
 action: "Have patient cough to evaluate",
 tips: [
 "Dry or productive cough",
 "Sputum appearance",
 "Preferred timing",
 "Triggering factors"
 ],
 color: "blue"
 })
 }
 
 // Age-specific advice
 const age = parseInt(patientData?.age) || 0
 
 if (age > 65) {
 actions.push({
 icon: User,
 title: "Geriatric Specificities",
 action: "Adapt your approach to elderly patient",
 tips: [
 "Check autonomy level",
 "Assess fall risk",
 "Possible polypharmacy",
 "Available social support"
 ],
 color: "blue"
 })
 }
 
 if (age < 18) {
 actions.push({
 icon: User,
 title: "Pediatric Approach",
 action: "Techniques adapted for young patients",
 tips: [
 "Involve the parents",
 "Use age-appropriate language",
 "Observe behavior",
 "Growth curve"
 ],
 color: "teal"
 })
 }
 
 // Mix for variety
 return actions.sort(() => Math.random() - 0.5)
}

export default function PatientAdviceCarousel({
 patientData,
 clinicalData,
 analysisProgress,
 progressMessage
}: PatientAdviceCarouselProps) {
 const [currentIndex, setCurrentIndex] = useState(0)
 const [autoPlay, setAutoPlay] = useState(true)
 const actions = generateDoctorActions(patientData, clinicalData)
 
 // Auto-scroll
 useEffect(() => {
 if (!autoPlay) return
 
 const timer = setInterval(() => {
 setCurrentIndex((prev) => (prev + 1) % actions.length)
 }, 10000) // Change every 10 seconds
 
 return () => clearInterval(timer)
 }, [autoPlay, actions.length])
 
 const goToPrevious = () => {
 setAutoPlay(false)
 setCurrentIndex((prev) => (prev - 1 + actions.length) % actions.length)
 }
 
 const goToNext = () => {
 setAutoPlay(false)
 setCurrentIndex((prev) => (prev + 1) % actions.length)
 }
 
 const currentAction = actions[currentIndex]
 const Icon = currentAction.icon
 
 const colorClasses = {
 blue: "from-blue-500 to-cyan-500 shadow-blue-200",
 cyan: "from-cyan-500 to-teal-500 shadow-cyan-200",
 teal: "from-teal-500 to-blue-500 shadow-teal-200"
 }
 
 const bgColorClasses = {
 blue: "bg-blue-50",
 cyan: "bg-cyan-50",
 teal: "bg-teal-50"
 }
 
 return (
 <div className="space-y-6">
 {/* Header with patient info and progress */}
 <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full flex items-center justify-center">
 <User className="h-6 w-6 text-white" />
 </div>
 <div>
 <h3 className="font-bold text-lg text-gray-800">
 {patientData?.firstName} {patientData?.lastName}
 </h3>
 <p className="text-sm text-gray-600">
 {patientData?.age} years • {patientData?.sex === 'M' ? 'Male' : 'Female'} • {clinicalData?.chiefComplaint}
 </p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-sm font-medium text-gray-700">AI Analysis GPT-5.2</p>
 <p className="text-lg font-bold text-blue-600">{analysisProgress}%</p>
 </div>
 </div>
 
 {/* Progress bar */}
 <div className="space-y-2">
 <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500 ease-out"
 style={{ width: `${analysisProgress}%` }}
 />
 </div>
 <p className="text-xs text-gray-500 text-center">{progressMessage}</p>
 </div>
 </div>
 
 {/* Title for doctor */}
 <div className="text-center">
 <h2 className="text-xl font-bold text-gray-800 mb-2">
 Suggested Actions During AI Analysis
 </h2>
 <p className="text-sm text-gray-600">
 Optimize waiting time with these clinical activities
 </p>
 </div>
 
 {/* Doctor actions carousel */}
 <div className="relative">
 <div className={`${bgColorClasses[currentAction.color]} rounded-xl p-8 shadow-xl transform transition-all duration-500 border-2 border-white`}>
 {/* Navigation */}
 <button
 onClick={goToPrevious}
 className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-all"
 >
 <ChevronLeft className="h-6 w-6 text-gray-700" />
 </button>
 <button
 onClick={goToNext}
 className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-all"
 >
 <ChevronRight className="h-6 w-6 text-gray-700" />
 </button>
 
 {/* Content */}
 <div className="max-w-3xl mx-auto">
 <div className="flex items-center justify-center gap-4 mb-6">
 <div className={`bg-gradient-to-r ${colorClasses[currentAction.color]} rounded-full p-4`}>
 <Icon className="h-8 w-8 text-white" />
 </div>
 <h3 className="text-2xl font-bold text-gray-800">{currentAction.title}</h3>
 </div>
 
 <p className="text-center text-lg text-gray-700 mb-6 font-medium">
 {currentAction.action}
 </p>
 
 <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
 {currentAction.tips.map((tip, index) => (
 <div key={index} className="flex items-start gap-2 bg-white/70 rounded-lg p-3">
 <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colorClasses[currentAction.color]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
 <span className="text-white text-xs font-bold">{index + 1}</span>
 </div>
 <p className="text-sm text-gray-700">{tip}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 
 {/* Indicators */}
 <div className="flex justify-center gap-2 mt-4">
 {actions.slice(0, 10).map((_, index) => (
 <button
 key={index}
 onClick={() => {
 setAutoPlay(false)
 setCurrentIndex(index)
 }}
 className={`h-2 transition-all duration-300 rounded-full ${
 index === currentIndex 
 ? 'w-8 bg-blue-600' 
 : 'w-2 bg-gray-300 hover:bg-gray-400'
 }`}
 />
 ))}
 {actions.length > 10 && (
 <span className="text-sm text-gray-500 ml-2">+{actions.length - 10}</span>
 )}
 </div>
 </div>
 
 {/* Additional info for doctor */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
 <div className="text-sm text-blue-800">
 <p className="font-medium mb-1">Maximize teleconsultation efficiency</p>
 <p>These suggestions help you gather valuable clinical information while GPT-5.2 AI analyzes the case. The complete analysis will be available in approximately {Math.ceil((100 - analysisProgress) * 0.6)} seconds.</p>
 </div>
 </div>
 </div>
 </div>
 )
}