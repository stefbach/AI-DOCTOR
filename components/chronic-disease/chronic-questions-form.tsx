"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
 ClipboardList, 
 Loader2, 
 CheckCircle,
 AlertCircle,
 Brain,
 Activity,
 Heart
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// ==================== INTERFACES ====================
interface Question {
 id: number
 question: string
 options: string[]
 priority: 'critical' | 'high' | 'medium' | 'low'
 category: 'diabetes_control' | 'hypertension_control' | 'obesity_management' | 'complications' | 'medications' | 'lifestyle'
 rationale?: string
 clinicalRelevance?: string
}

interface QuestionResponse {
 questionId: number
 question: string
 answer: string
 category: string
 priority: string
}

interface ChronicQuestionsFormProps {
 patientData: any
 clinicalData: any
 onNext: (data: any) => void
 onBack: () => void
}

// ==================== HELPER FUNCTIONS ====================
const getCategoryColor = (category: string) => {
 const colors: Record<string, string> = {
 diabetes_control: 'bg-blue-100 text-blue-800',
 hypertension_control: 'bg-blue-100 text-blue-800',
 obesity_management: 'bg-cyan-100 text-cyan-800',
 complications: 'bg-blue-100 text-blue-800',
 medications: 'bg-teal-100 text-teal-800',
 lifestyle: 'bg-cyan-100 text-cyan-800'
 }
 return colors[category] || 'bg-gray-100 text-gray-800'
}

const getCategoryIcon = (category: string) => {
 const icons: Record<string, any> = {
 diabetes_control: Activity,
 hypertension_control: Heart,
 obesity_management: Activity,
 complications: AlertCircle,
 medications: Brain,
 lifestyle: Activity
 }
 return icons[category] || Activity
}

// ==================== MAIN COMPONENT ====================
export default function ChronicQuestionsForm({ 
 patientData, 
 clinicalData, 
 onNext, 
 onBack 
}: ChronicQuestionsFormProps) {
 // ========== States ==========
 const [questions, setQuestions] = useState<Question[]>([])
 const [responses, setResponses] = useState<QuestionResponse[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState("")
 const [metadata, setMetadata] = useState<any>(null)

 // ========== Generate Questions on Mount ==========
 useEffect(() => {
 generateQuestions()
 }, [])

 const generateQuestions = async () => {
 setLoading(true)
 setError("")
 
 try {
 console.log(' Generating chronic disease questions...')
 
 const response = await fetch("/api/chronic-questions", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ patientData, clinicalData })
 })

 if (!response.ok) {
 throw new Error(`Failed to generate questions: ${response.statusText}`)
 }

 const data = await response.json()
 
 if (data.success && data.questions) {
 console.log(`✅ Generated ${data.questions.length} questions`)
 setQuestions(data.questions)
 setMetadata(data.metadata)
 
 // Initialize empty responses
 const initialResponses: QuestionResponse[] = data.questions.map((q: Question) => ({
 questionId: q.id,
 question: q.question,
 answer: '',
 category: q.category,
 priority: q.priority
 }))
 setResponses(initialResponses)
 
 toast({
 title: "✅ Questions Generated",
 description: `${data.questions.length} specialized chronic disease questions ready`
 })
 } else {
 throw new Error(data.error || "Failed to generate questions")
 }
 } catch (err: any) {
 console.error("❌ Error generating chronic questions:", err)
 setError(err.message)
 toast({
 title: "Error",
 description: "Failed to generate AI questions. Please try again.",
 variant: "destructive"
 })
 } finally {
 setLoading(false)
 }
 }

 // ========== Handle Answer Selection ==========
 const handleAnswerChange = (questionId: number, selectedOption: string) => {
 setResponses(prev => 
 prev.map(r => 
 r.questionId === questionId 
 ? { ...r, answer: selectedOption }
 : r
 )
 )
 }

 // ========== Handle Submit ==========
 const handleSubmit = () => {
 const answeredQuestions = responses.filter(r => r.answer !== '')
 
 if (answeredQuestions.length === 0) {
 toast({
 title: "⚠️ No Answers",
 description: "Please answer at least some questions before continuing.",
 variant: "destructive"
 })
 return
 }
 
 console.log(`✅ Submitting ${answeredQuestions.length} answered questions`)
 
 onNext({ 
 responses: answeredQuestions,
 allResponses: responses,
 metadata
 })
 }

 // ========== Calculate Progress ==========
 const answeredCount = responses.filter(r => r.answer !== '').length
 const totalQuestions = questions.length
 const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

 // ========== Render: Loading State ==========
 if (loading) {
 return (
 <Card className="border-blue-200">
 <CardContent className="p-12 text-center">
 <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
 <p className="text-lg font-medium text-gray-700 mb-2">Generating Specialized Questions...</p>
 <p className="text-sm text-gray-500">AI is analyzing chronic disease data</p>
 </CardContent>
 </Card>
 )
 }

 // ========== Render: Error State ==========
 if (error) {
 return (
 <Card className="border-blue-200">
 <CardContent className="p-6">
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>
 <strong>Error:</strong> {error}
 </AlertDescription>
 </Alert>
 <div className="flex gap-4 mt-6">
 <Button onClick={onBack} variant="outline">Back</Button>
 <Button onClick={generateQuestions}>Retry Generation</Button>
 </div>
 </CardContent>
 </Card>
 )
 }

 // ========== Render: Questions Form ==========
 return (
 <div className="space-y-6">
 {/* Progress Card */}
 <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
 <CardContent className="p-6">
 <div className="flex justify-between items-center mb-3">
 <div className="flex items-center gap-2">
 <ClipboardList className="h-5 w-5 text-blue-600" />
 <span className="font-medium text-gray-700">Progress</span>
 </div>
 <Badge variant="secondary" className="bg-blue-600 text-white">
 {answeredCount} / {totalQuestions} answered
 </Badge>
 </div>
 <Progress value={progressPercentage} className="h-2" />
 </CardContent>
 </Card>

 {/* Questions List */}
 <div className="space-y-4">
 {questions.map((question, index) => {
 const response = responses.find(r => r.questionId === question.id)
 const isAnswered = response?.answer !== ''
 const CategoryIcon = getCategoryIcon(question.category)
 
 return (
 <Card 
 key={question.id} 
 className={`border-2 transition-all ${
 isAnswered 
 ? 'border-teal-300 bg-teal-50/30' 
 : 'border-blue-200 hover:border-blue-300'
 }`}
 >
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <Badge variant="outline" className="text-sm">
 Q{index + 1}
 </Badge>
 <Badge className={getCategoryColor(question.category)}>
 <CategoryIcon className="h-3 w-3 mr-1" />
 {question.category.replace(/_/g, ' ')}
 </Badge>
 {question.priority === 'critical' || question.priority === 'high' ? (
 <Badge variant="destructive" className="text-xs">
 {question.priority}
 </Badge>
 ) : null}
 </div>
 <Label className="text-base font-medium text-gray-800 leading-relaxed">
 {question.question}
 </Label>
 </div>
 {isAnswered && (
 <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-1" />
 )}
 </div>
 </CardHeader>
 
 <CardContent>
 <RadioGroup
 value={response?.answer || ''}
 onValueChange={(value) => handleAnswerChange(question.id, value)}
 className="space-y-3"
 >
 {question.options.map((option, optionIndex) => (
 <label
 key={optionIndex}
 className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
 response?.answer === option
 ? 'border-blue-500 bg-blue-50 shadow-md'
 : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
 }`}
 >
 <RadioGroupItem 
 value={option} 
 id={`q${question.id}-opt${optionIndex}`}
 className="flex-shrink-0"
 />
 <span className="text-sm text-gray-700 leading-relaxed flex-1">
 {option}
 </span>
 </label>
 ))}
 </RadioGroup>
 
 {/* Clinical Relevance (optional display) */}
 {question.clinicalRelevance && isAnswered && (
 <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
 <div className="flex items-start gap-2">
 <Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
 <p className="text-xs text-blue-800">
 <strong>Clinical relevance:</strong> {question.clinicalRelevance}
 </p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )
 })}
 </div>

 {/* Summary Card */}
 {answeredCount > 0 && (
 <Card className="border-teal-200 bg-teal-50/30">
 <CardContent className="p-4">
 <div className="flex items-center gap-2 text-teal-700">
 <CheckCircle className="h-5 w-5" />
 <p className="font-medium">
 Great! You've answered {answeredCount} out of {totalQuestions} questions
 {answeredCount < totalQuestions && ' (you can continue with partial answers)'}
 </p>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Action Buttons */}
 <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
 <Button onClick={onBack} variant="outline" size="sm" className="text-xs sm:text-sm sm:size-lg order-2 sm:order-1">
 ← Back
 </Button>
 <Button
 onClick={handleSubmit}
 size="sm"
 className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm sm:size-lg order-1 sm:order-2"
 disabled={answeredCount === 0}
 >
 Continue to Analysis
 <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 bg-white/20 rounded text-xs">
 {answeredCount}
 </span>
 </Button>
 </div>
 </div>
 )
}
