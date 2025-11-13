"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
 Brain, 
 Loader2, 
 Activity, 
 Heart, 
 TrendingUp, 
 Utensils,
 Target,
 Calendar,
 AlertCircle,
 CheckCircle2,
 Scale,
 Droplets,
 Pill,
 Stethoscope,
 Eye,
 ArrowRight
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ChronicDiagnosisFormProps {
 patientData: any
 clinicalData: any
 questionsData: any
 onNext: (data: any) => void
 onBack: () => void
}

export default function ChronicDiagnosisForm({ 
 patientData, 
 clinicalData, 
 questionsData, 
 onNext, 
 onBack 
}: ChronicDiagnosisFormProps) {
 const [assessment, setAssessment] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState("")

 useEffect(() => {
 generateAssessment()
 }, [])

 const generateAssessment = async () => {
 setLoading(true)
 setError("")
 
 try {
 const response = await fetch("/api/chronic-diagnosis", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ patientData, clinicalData, questionsData })
 })

 if (!response.ok) {
 throw new Error(`Failed to generate assessment: ${response.statusText}`)
 }

 const data = await response.json()
 
 if (data.success && data.assessment) {
 setAssessment(data.assessment)
 toast({
 title: "✅ Specialist Assessment Complete",
 description: "Comprehensive chronic disease evaluation generated successfully"
 })
 } else {
 throw new Error(data.error || "Failed to generate assessment")
 }
 } catch (err: any) {
 console.error("Error generating assessment:", err)
 setError(err.message)
 toast({
 title: "Error",
 description: "Failed to generate specialist assessment. Please try again.",
 variant: "destructive"
 })
 } finally {
 setLoading(false)
 }
 }

 const handleContinue = () => {
 onNext(assessment)
 }

 if (loading) {
 return (
 <Card className="border-blue-200">
 <CardContent className="p-12 text-center">
 <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
 <p className="text-lg font-semibold text-gray-700"> Generating Specialist-Level Assessment...</p>
 <p className="text-sm text-gray-500 mt-2">Analyzing chronic disease status with endocrinologist precision</p>
 <p className="text-xs text-gray-400 mt-1">This may take 30-60 seconds</p>
 </CardContent>
 </Card>
 )
 }

 if (error) {
 return (
 <Card className="border-blue-200">
 <CardContent className="p-6">
 <div className="flex items-start gap-3 mb-4">
 <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
 <div>
 <p className="font-semibold text-blue-600">Error generating assessment</p>
 <p className="text-sm text-gray-600 mt-1">{error}</p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button onClick={onBack} variant="outline">Back</Button>
 <Button onClick={generateAssessment} className="bg-blue-600 hover:bg-blue-700">
 Retry Assessment
 </Button>
 </div>
 </CardContent>
 </Card>
 )
 }

 if (!assessment) return null

 const { diseaseAssessment, detailedMealPlan, therapeuticObjectives, followUpPlan, medicationManagement, overallAssessment } = assessment

 return (
 <div className="space-y-6">
 {/* Overall Assessment Card */}
 <Card className="border-2 border-blue-300 shadow-lg">
 <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
 <CardTitle className="flex items-center gap-2 text-xl">
 <Brain className="h-6 w-6" />
 Overall Chronic Disease Assessment
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <Label className="text-gray-600">Global Control Status:</Label>
 <Badge className={
 overallAssessment?.globalControl === "Excellent" ? "bg-teal-600" :
 overallAssessment?.globalControl === "Good" ? "bg-blue-600" :
 overallAssessment?.globalControl === "Fair" ? "bg-cyan-600" : "bg-blue-600"
 }>
 {overallAssessment?.globalControl || "Under Review"}
 </Badge>
 </div>

 {overallAssessment?.mainConcerns?.length > 0 && (
 <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
 <Label className="font-semibold text-cyan-900 flex items-center gap-2 mb-2">
 <AlertCircle className="h-4 w-4" />
 Priority Concerns:
 </Label>
 <ul className="space-y-1">
 {overallAssessment.mainConcerns.map((concern: string, idx: number) => (
 <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
 <ArrowRight className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
 <span>{concern}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {overallAssessment?.strengths?.length > 0 && (
 <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
 <Label className="font-semibold text-teal-900 flex items-center gap-2 mb-2">
 <CheckCircle2 className="h-4 w-4" />
 Positive Aspects:
 </Label>
 <ul className="space-y-1">
 {overallAssessment.strengths.map((strength: string, idx: number) => (
 <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
 <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
 <span>{strength}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {overallAssessment?.priorityActions?.length > 0 && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <Label className="font-semibold text-blue-900 mb-2">Priority Actions:</Label>
 <ol className="space-y-1 list-decimal list-inside">
 {overallAssessment.priorityActions.map((action: string, idx: number) => (
 <li key={idx} className="text-sm text-gray-700">{action}</li>
 ))}
 </ol>
 </div>
 )}

 {overallAssessment?.prognosis && (
 <div className="border-t pt-4">
 <Label className="font-semibold text-gray-700">Clinical Prognosis:</Label>
 <p className="text-sm text-gray-600 mt-1 italic">{overallAssessment.prognosis}</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Disease-Specific Assessments */}
 <div className="grid md:grid-cols-2 gap-4">
 {/* Diabetes Assessment */}
 {diseaseAssessment?.diabetes?.present && (
 <Card className="border-2 border-blue-300">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
 <CardTitle className="flex items-center gap-2">
 <Activity className="h-5 w-5" />
 Diabetes Assessment
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5 space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label className="text-xs text-gray-500">Type:</Label>
 <p className="text-sm font-semibold">{diseaseAssessment.diabetes.type}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Control:</Label>
 <Badge variant={
 diseaseAssessment.diabetes.currentControl === "Excellent" ? "default" :
 diseaseAssessment.diabetes.currentControl === "Good" ? "secondary" : "destructive"
 }>
 {diseaseAssessment.diabetes.currentControl}
 </Badge>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Current HbA1c:</Label>
 <p className="text-sm font-semibold text-blue-600">{diseaseAssessment.diabetes.currentHbA1c}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Target HbA1c:</Label>
 <p className="text-sm font-semibold text-teal-600">{diseaseAssessment.diabetes.targetHbA1c}</p>
 </div>
 {diseaseAssessment.diabetes.currentFastingGlucose && (
 <>
 <div>
 <Label className="text-xs text-gray-500">Current Fasting Glucose:</Label>
 <p className="text-sm font-semibold">{diseaseAssessment.diabetes.currentFastingGlucose}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Target Fasting Glucose:</Label>
 <p className="text-sm font-semibold text-teal-600">{diseaseAssessment.diabetes.targetFastingGlucose}</p>
 </div>
 </>
 )}
 </div>

 {diseaseAssessment.diabetes.complications && (
 <div className="border-t pt-3">
 <Label className="text-sm font-semibold mb-2">Complications Screening:</Label>
 <div className="grid grid-cols-2 gap-2 text-xs">
 {Object.entries(diseaseAssessment.diabetes.complications).map(([key, value]) => (
 <div key={key} className="bg-gray-50 p-2 rounded">
 <span className="font-medium capitalize">{key}:</span>
 <span className="ml-1 text-gray-600">{value as string}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {diseaseAssessment.diabetes.riskFactors?.length > 0 && (
 <div className="border-t pt-3">
 <Label className="text-sm font-semibold mb-1">Risk Factors:</Label>
 <ul className="text-xs space-y-1">
 {diseaseAssessment.diabetes.riskFactors.map((risk: string, idx: number) => (
 <li key={idx} className="text-gray-700">• {risk}</li>
 ))}
 </ul>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Hypertension Assessment */}
 {diseaseAssessment?.hypertension?.present && (
 <Card className="border-2 border-blue-300">
 <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
 <CardTitle className="flex items-center gap-2">
 <Heart className="h-5 w-5" />
 Hypertension Assessment
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5 space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label className="text-xs text-gray-500">Stage:</Label>
 <p className="text-sm font-semibold">{diseaseAssessment.hypertension.stage}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">CV Risk:</Label>
 <Badge variant="destructive">{diseaseAssessment.hypertension.cardiovascularRisk}</Badge>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Current BP:</Label>
 <p className="text-sm font-semibold text-blue-600">{diseaseAssessment.hypertension.currentBP}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Target BP:</Label>
 <p className="text-sm font-semibold text-teal-600">{diseaseAssessment.hypertension.targetBP}</p>
 </div>
 </div>

 {diseaseAssessment.hypertension.organDamage && (
 <div className="border-t pt-3">
 <Label className="text-sm font-semibold mb-2">Organ Damage Screening:</Label>
 <div className="grid grid-cols-2 gap-2 text-xs">
 {Object.entries(diseaseAssessment.hypertension.organDamage).map(([key, value]) => (
 <div key={key} className="bg-gray-50 p-2 rounded">
 <span className="font-medium capitalize">{key}:</span>
 <span className="ml-1 text-gray-600">{value as string}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {diseaseAssessment.hypertension.riskFactors?.length > 0 && (
 <div className="border-t pt-3">
 <Label className="text-sm font-semibold mb-1">Risk Factors:</Label>
 <ul className="text-xs space-y-1">
 {diseaseAssessment.hypertension.riskFactors.map((risk: string, idx: number) => (
 <li key={idx} className="text-gray-700">• {risk}</li>
 ))}
 </ul>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Obesity Assessment */}
 {diseaseAssessment?.obesity?.present && (
 <Card className="border-2 border-cyan-300 md:col-span-2">
 <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
 <CardTitle className="flex items-center gap-2">
 <Scale className="h-5 w-5" />
 Weight Management Assessment
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5">
 <div className="grid md:grid-cols-4 gap-3">
 <div>
 <Label className="text-xs text-gray-500">BMI Category:</Label>
 <p className="text-sm font-semibold">{diseaseAssessment.obesity.category}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Current BMI:</Label>
 <p className="text-sm font-semibold text-blue-600">{diseaseAssessment.obesity.currentBMI}</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Current Weight:</Label>
 <p className="text-sm font-semibold">{diseaseAssessment.obesity.currentWeight} kg</p>
 </div>
 <div>
 <Label className="text-xs text-gray-500">Target Weight:</Label>
 <p className="text-sm font-semibold text-teal-600">{diseaseAssessment.obesity.targetWeight} kg</p>
 </div>
 </div>

 {diseaseAssessment.obesity.weightLossGoal && (
 <div className="mt-3 bg-teal-50 border border-teal-200 rounded p-3">
 <Label className="text-sm font-semibold text-teal-900">Weight Loss Goal:</Label>
 <p className="text-sm text-gray-700 mt-1">{diseaseAssessment.obesity.weightLossGoal}</p>
 </div>
 )}

 {diseaseAssessment.obesity.comorbidities?.length > 0 && (
 <div className="mt-3">
 <Label className="text-sm font-semibold mb-1">Associated Comorbidities:</Label>
 <div className="flex flex-wrap gap-2">
 {diseaseAssessment.obesity.comorbidities.map((comorbidity: string, idx: number) => (
 <Badge key={idx} variant="outline" className="text-xs">{comorbidity}</Badge>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>

 {/* Detailed Meal Plan Section */}
 {detailedMealPlan && (
 <Card className="border-2 border-teal-300 shadow-lg">
 <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-600 text-white">
 <CardTitle className="flex items-center gap-2 text-xl">
 <Utensils className="h-6 w-6" />
 Detailed Dietary Plan (Endocrinologist-Prescribed)
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 {/* Breakfast */}
 {detailedMealPlan.breakfast && (
 <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
 <h3 className="font-bold text-lg text-cyan-900 mb-3 flex items-center gap-2">
 🌅 Breakfast <span className="text-sm font-normal text-cyan-700">({detailedMealPlan.breakfast.timing})</span>
 </h3>
 <div className="space-y-2">
 <div>
 <Label className="text-sm font-semibold">Composition:</Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.breakfast.composition}</p>
 </div>
 <div>
 <Label className="text-sm font-semibold">Portions:</Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.breakfast.portions}</p>
 </div>
 {detailedMealPlan.breakfast.examples?.length > 0 && (
 <div>
 <Label className="text-sm font-semibold">Meal Examples:</Label>
 <ul className="text-sm text-gray-700 space-y-1 mt-1">
 {detailedMealPlan.breakfast.examples.map((example: string, idx: number) => (
 <li key={idx} className="flex items-start gap-2">
 <span className="text-teal-600 font-bold">•</span>
 <span>{example}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 {detailedMealPlan.breakfast.glycemicConsiderations && (
 <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
 <Label className="text-xs font-semibold text-blue-900">Glycemic Considerations:</Label>
 <p className="text-xs text-gray-700 mt-1">{detailedMealPlan.breakfast.glycemicConsiderations}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Lunch */}
 {detailedMealPlan.lunch && (
 <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
 <h3 className="font-bold text-lg text-teal-900 mb-3 flex items-center gap-2">
 🌞 Lunch <span className="text-sm font-normal text-teal-700">({detailedMealPlan.lunch.timing})</span>
 </h3>
 <div className="space-y-2">
 <div>
 <Label className="text-sm font-semibold">Composition:</Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.lunch.composition}</p>
 </div>
 <div>
 <Label className="text-sm font-semibold">Portions:</Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.lunch.portions}</p>
 </div>
 {detailedMealPlan.lunch.examples?.length > 0 && (
 <div>
 <Label className="text-sm font-semibold">Meal Examples:</Label>
 <ul className="text-sm text-gray-700 space-y-1 mt-1">
 {detailedMealPlan.lunch.examples.map((example: string, idx: number) => (
 <li key={idx} className="flex items-start gap-2">
 <span className="text-teal-600 font-bold">•</span>
 <span>{example}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 {detailedMealPlan.lunch.macronutrientBalance && (
 <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
 <Label className="text-xs font-semibold text-blue-900">Macronutrient Balance:</Label>
 <p className="text-xs text-gray-700 mt-1">{detailedMealPlan.lunch.macronutrientBalance}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Dinner */}
 {detailedMealPlan.dinner && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h3 className="font-bold text-lg text-blue-900 mb-3 flex items-center gap-2">
 Dinner <span className="text-sm font-normal text-blue-700">({detailedMealPlan.dinner.timing})</span>
 </h3>
 <div className="space-y-2">
 <div>
 <Label className="text-sm font-semibold">Composition:</Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.dinner.composition}</p>
 </div>
 <div>
 <Label className="text-sm font-semibold">Portions:</Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.dinner.portions}</p>
 </div>
 {detailedMealPlan.dinner.examples?.length > 0 && (
 <div>
 <Label className="text-sm font-semibold">Meal Examples:</Label>
 <ul className="text-sm text-gray-700 space-y-1 mt-1">
 {detailedMealPlan.dinner.examples.map((example: string, idx: number) => (
 <li key={idx} className="flex items-start gap-2">
 <span className="text-teal-600 font-bold">•</span>
 <span>{example}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 {detailedMealPlan.dinner.eveningRecommendations && (
 <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
 <Label className="text-xs font-semibold text-blue-900">Evening Recommendations:</Label>
 <p className="text-xs text-gray-700 mt-1">{detailedMealPlan.dinner.eveningRecommendations}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Snacks */}
 {detailedMealPlan.snacks && (
 <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
 <h3 className="font-bold text-lg text-cyan-900 mb-3 flex items-center gap-2">
 🍎 Snacks
 </h3>
 <div className="grid md:grid-cols-2 gap-4">
 {detailedMealPlan.snacks.midMorning && (
 <div>
 <Label className="text-sm font-semibold text-cyan-800">
 Mid-Morning ({detailedMealPlan.snacks.midMorning.timing}):
 </Label>
 <ul className="text-sm text-gray-700 mt-1 space-y-1">
 {detailedMealPlan.snacks.midMorning.options?.map((option: string, idx: number) => (
 <li key={idx}>• {option}</li>
 ))}
 </ul>
 </div>
 )}
 {detailedMealPlan.snacks.afternoon && (
 <div>
 <Label className="text-sm font-semibold text-cyan-800">
 Afternoon ({detailedMealPlan.snacks.afternoon.timing}):
 </Label>
 <ul className="text-sm text-gray-700 mt-1 space-y-1">
 {detailedMealPlan.snacks.afternoon.options?.map((option: string, idx: number) => (
 <li key={idx}>• {option}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Additional Dietary Guidance */}
 <div className="grid md:grid-cols-2 gap-4">
 {/* Hydration */}
 {detailedMealPlan.hydration && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
 <Droplets className="h-4 w-4" />
 Hydration Plan:
 </Label>
 <p className="text-sm text-gray-700">{detailedMealPlan.hydration}</p>
 </div>
 )}

 {/* Supplements */}
 {detailedMealPlan.supplements?.length > 0 && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
 <Pill className="h-4 w-4" />
 Supplements:
 </Label>
 <ul className="text-sm text-gray-700 space-y-1">
 {detailedMealPlan.supplements.map((supplement: string, idx: number) => (
 <li key={idx}>• {supplement}</li>
 ))}
 </ul>
 </div>
 )}
 </div>

 {/* Foods to Favor/Avoid */}
 <div className="grid md:grid-cols-2 gap-4">
 {detailedMealPlan.foodsToFavor?.length > 0 && (
 <div className="bg-teal-50 border border-teal-300 rounded-lg p-3">
 <Label className="text-sm font-semibold text-teal-900 mb-2 flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4" />
 Foods to FAVOR:
 </Label>
 <ul className="text-xs text-gray-700 space-y-1">
 {detailedMealPlan.foodsToFavor.map((food: string, idx: number) => (
 <li key={idx}>✓ {food}</li>
 ))}
 </ul>
 </div>
 )}

 {detailedMealPlan.foodsToAvoid?.length > 0 && (
 <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
 <Label className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
 <AlertCircle className="h-4 w-4" />
 Foods to AVOID:
 </Label>
 <ul className="text-xs text-gray-700 space-y-1">
 {detailedMealPlan.foodsToAvoid.map((food: string, idx: number) => (
 <li key={idx}>✗ {food}</li>
 ))}
 </ul>
 </div>
 )}
 </div>

 {/* Cooking Methods & Portion Control */}
 <div className="grid md:grid-cols-2 gap-4">
 {detailedMealPlan.cookingMethods?.length > 0 && (
 <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
 <Label className="text-sm font-semibold text-cyan-900 mb-2">Preferred Cooking Methods:</Label>
 <div className="flex flex-wrap gap-2">
 {detailedMealPlan.cookingMethods.map((method: string, idx: number) => (
 <Badge key={idx} variant="outline" className="text-xs">{method}</Badge>
 ))}
 </div>
 </div>
 )}

 {detailedMealPlan.portionControlTips?.length > 0 && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <Label className="text-sm font-semibold text-blue-900 mb-2">Portion Control Tips:</Label>
 <ul className="text-xs text-gray-700 space-y-1">
 {detailedMealPlan.portionControlTips.map((tip: string, idx: number) => (
 <li key={idx}>• {tip}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Therapeutic Objectives Section */}
 {therapeuticObjectives && (
 <Card className="border-2 border-cyan-300 shadow-lg">
 <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-600 text-white">
 <CardTitle className="flex items-center gap-2 text-xl">
 <Target className="h-6 w-6" />
 Therapeutic Objectives & Targets
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <div className="grid md:grid-cols-3 gap-4">
 {/* Short-term */}
 {therapeuticObjectives.shortTerm && (
 <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
 <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
 <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">1-3 months</span>
 Short-Term
 </h3>
 <ul className="space-y-2">
 {therapeuticObjectives.shortTerm.targets?.map((target: string, idx: number) => (
 <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
 <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
 <span>{target}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Medium-term */}
 {therapeuticObjectives.mediumTerm && (
 <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
 <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
 <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">3-6 months</span>
 Medium-Term
 </h3>
 <ul className="space-y-2">
 {therapeuticObjectives.mediumTerm.targets?.map((target: string, idx: number) => (
 <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
 <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
 <span>{target}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Long-term */}
 {therapeuticObjectives.longTerm && (
 <div className="bg-teal-50 border-2 border-teal-300 rounded-lg p-4">
 <h3 className="font-bold text-teal-900 mb-2 flex items-center gap-2">
 <span className="bg-teal-600 text-white text-xs px-2 py-1 rounded">6-12 months</span>
 Long-Term
 </h3>
 <ul className="space-y-2">
 {therapeuticObjectives.longTerm.targets?.map((target: string, idx: number) => (
 <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
 <ArrowRight className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
 <span>{target}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Follow-Up Plan Section */}
 {followUpPlan && (
 <Card className="border-2 border-blue-300 shadow-lg">
 <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white">
 <CardTitle className="flex items-center gap-2 text-xl">
 <Calendar className="h-6 w-6" />
 Complete Follow-Up Plan
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 {/* Specialist Consultations */}
 {followUpPlan.specialistConsultations?.length > 0 && (
 <div>
 <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
 <Stethoscope className="h-5 w-5 text-blue-600" />
 Specialist Consultations Schedule
 </h3>
 <div className="grid md:grid-cols-2 gap-3">
 {followUpPlan.specialistConsultations.map((consultation: any, idx: number) => (
 <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <div className="flex justify-between items-start mb-1">
 <Label className="font-semibold text-blue-900">{consultation.specialty}</Label>
 <Badge className="bg-blue-600 text-white text-xs">{consultation.frequency}</Badge>
 </div>
 <p className="text-xs text-gray-600 mt-1">{consultation.rationale}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Laboratory Tests */}
 {followUpPlan.laboratoryTests?.length > 0 && (
 <div>
 <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
 <Activity className="h-5 w-5 text-blue-600" />
 Laboratory Tests Schedule
 </h3>
 <div className="grid md:grid-cols-2 gap-3">
 {followUpPlan.laboratoryTests.map((test: any, idx: number) => (
 <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <div className="flex justify-between items-start mb-1">
 <Label className="font-semibold text-blue-900">{test.test}</Label>
 <Badge className="bg-blue-600 text-white text-xs">{test.frequency}</Badge>
 </div>
 {test.target && (
 <p className="text-xs text-gray-600 mt-1">
 <span className="font-semibold">Target:</span> {test.target}
 </p>
 )}
 <p className="text-xs text-gray-600 mt-1">{test.rationale}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Self-Monitoring */}
 {followUpPlan.selfMonitoring && (
 <div>
 <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
 <Eye className="h-5 w-5 text-teal-600" />
 Self-Monitoring Instructions
 </h3>
 <div className="grid md:grid-cols-2 gap-3">
 {followUpPlan.selfMonitoring.bloodGlucose && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <Label className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
 <Activity className="h-4 w-4" />
 Blood Glucose Monitoring
 </Label>
 <div className="text-xs text-gray-700 space-y-1">
 <p><span className="font-semibold">Frequency:</span> {followUpPlan.selfMonitoring.bloodGlucose.frequency}</p>
 <p><span className="font-semibold">Timing:</span> {followUpPlan.selfMonitoring.bloodGlucose.timing}</p>
 <p><span className="font-semibold">Target:</span> {followUpPlan.selfMonitoring.bloodGlucose.target}</p>
 <p className="text-xs text-gray-600 mt-2 italic">{followUpPlan.selfMonitoring.bloodGlucose.instructions}</p>
 </div>
 </div>
 )}

 {followUpPlan.selfMonitoring.bloodPressure && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <Label className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
 <Heart className="h-4 w-4" />
 Blood Pressure Monitoring
 </Label>
 <div className="text-xs text-gray-700 space-y-1">
 <p><span className="font-semibold">Frequency:</span> {followUpPlan.selfMonitoring.bloodPressure.frequency}</p>
 <p><span className="font-semibold">Timing:</span> {followUpPlan.selfMonitoring.bloodPressure.timing}</p>
 <p><span className="font-semibold">Target:</span> {followUpPlan.selfMonitoring.bloodPressure.target}</p>
 <p className="text-xs text-gray-600 mt-2 italic">{followUpPlan.selfMonitoring.bloodPressure.instructions}</p>
 </div>
 </div>
 )}

 {followUpPlan.selfMonitoring.weight && (
 <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
 <Label className="font-semibold text-cyan-900 flex items-center gap-2 mb-2">
 <Scale className="h-4 w-4" />
 Weight Monitoring
 </Label>
 <div className="text-xs text-gray-700 space-y-1">
 <p><span className="font-semibold">Frequency:</span> {followUpPlan.selfMonitoring.weight.frequency}</p>
 <p><span className="font-semibold">Timing:</span> {followUpPlan.selfMonitoring.weight.timing}</p>
 <p><span className="font-semibold">Target:</span> {followUpPlan.selfMonitoring.weight.target}</p>
 <p className="text-xs text-gray-600 mt-2 italic">{followUpPlan.selfMonitoring.weight.instructions}</p>
 </div>
 </div>
 )}

 {followUpPlan.selfMonitoring.other && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <Label className="font-semibold text-blue-900 mb-2">
 {followUpPlan.selfMonitoring.other.task}
 </Label>
 <div className="text-xs text-gray-700 space-y-1">
 <p><span className="font-semibold">Frequency:</span> {followUpPlan.selfMonitoring.other.frequency}</p>
 <p className="text-xs text-gray-600 mt-2 italic">{followUpPlan.selfMonitoring.other.instructions}</p>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Medication Management (if present) */}
 {medicationManagement && (
 <Card className="border-2 border-blue-300">
 <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-600 text-white">
 <CardTitle className="flex items-center gap-2">
 <Pill className="h-5 w-5" />
 Medication Management Recommendations
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5 space-y-4">
 {medicationManagement.continue?.length > 0 && (
 <div>
 <Label className="font-semibold text-teal-700 mb-2 block">✓ Continue (No changes):</Label>
 <div className="space-y-2">
 {medicationManagement.continue.map((med: any, idx: number) => (
 <div key={idx} className="bg-teal-50 border border-teal-200 rounded p-2 text-sm">
 <span className="font-semibold">{med.medication}</span> - {med.dosage} ({med.frequency})
 <p className="text-xs text-gray-600 mt-1">{med.rationale}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {medicationManagement.adjust?.length > 0 && (
 <div>
 <Label className="font-semibold text-cyan-700 mb-2 block">⚠ Adjust Dosage:</Label>
 <div className="space-y-2">
 {medicationManagement.adjust.map((med: any, idx: number) => (
 <div key={idx} className="bg-cyan-50 border border-cyan-200 rounded p-2 text-sm">
 <span className="font-semibold">{med.medication}</span>: {med.currentDosage} → {med.newDosage}
 <p className="text-xs text-gray-600 mt-1">{med.rationale}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {medicationManagement.add?.length > 0 && (
 <div>
 <Label className="font-semibold text-blue-700 mb-2 block">+ Add New Medication:</Label>
 <div className="space-y-2">
 {medicationManagement.add.map((med: any, idx: number) => (
 <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
 <span className="font-semibold">{med.medication}</span> - {med.dosage} ({med.frequency})
 <p className="text-xs text-gray-700 mt-1"><span className="font-semibold">Indication:</span> {med.indication}</p>
 <p className="text-xs text-gray-600 mt-1"><span className="font-semibold">Monitoring:</span> {med.monitoring}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {medicationManagement.stop?.length > 0 && (
 <div>
 <Label className="font-semibold text-blue-700 mb-2 block">✗ Discontinue:</Label>
 <div className="space-y-2">
 {medicationManagement.stop.map((med: any, idx: number) => (
 <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
 <span className="font-semibold">{med.medication}</span>
 <p className="text-xs text-gray-600 mt-1">{med.rationale}</p>
 </div>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Action Buttons */}
 <div className="flex justify-between pt-6 border-t-2">
 <Button onClick={onBack} variant="outline" size="lg" className="text-base">
 ← Back to Questions
 </Button>
 <Button 
 onClick={handleContinue} 
 size="lg"
 className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-base px-8"
 >
 Generate Complete Medical Report →
 </Button>
 </div>
 </div>
 )
}

function Label({ children, className = "" }: { children: React.ReactNode, className?: string }) {
 return <label className={`block text-sm font-medium ${className}`}>{children}</label>
}
