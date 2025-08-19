// components/ai-questions-step.tsx - Composant pour l'étape des questions IA

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  BrainCircuit,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Activity,
  Clock,
  ThermometerSun,
  Heart,
  Stethoscope,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { debugLog } from '@/lib/logger'
import aiQuestionsService, { useAIQuestions, type AIMode } from "@/lib/ai-questions-service"

interface AIQuestionsStepProps {
  patientData: any
  clinicalData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function AIQuestionsStep({
  patientData,
  clinicalData,
  onDataChange,
  onNext,
  onPrevious
}: AIQuestionsStepProps) {
  // État local
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [mode, setMode] = useState<AIMode>('balanced')
  const [connectionTested, setConnectionTested] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  
  // Hook pour les questions IA
  const { 
    questions, 
    insights, 
    loading, 
    error, 
    fetchQuestions, 
    testConnection 
  } = useAIQuestions()

  // Tester la connexion au montage
  useEffect(() => {
    const checkConnection = async () => {
      debugLog('🔌 Test de connexion à l\'API IA...')
      const result = await testConnection()
      
      if (result.connected) {
        debugLog('✅ API IA connectée')
        setConnectionStatus('connected')
      } else {
        console.error('❌ API IA non disponible:', result.error)
        setConnectionStatus('error')
      }
      setConnectionTested(true)
    }
    
    checkConnection()
  }, [])

  // Charger les questions quand les données sont disponibles
  useEffect(() => {
    if (connectionTested && connectionStatus === 'connected' && patientData && clinicalData) {
      loadQuestions()
    }
  }, [connectionTested, connectionStatus, patientData, clinicalData])

  // Fonction pour charger les questions
  const loadQuestions = async () => {
    debugLog('🤖 Chargement des questions IA...')
    debugLog('📊 Données patient', {
      age: patientData.age,
      gender: patientData.gender,
      symptomsCount: clinicalData.symptoms?.length || 0,
      hasChiefComplaint: !!clinicalData.chiefComplaint
    }, ['age', 'gender', 'symptomsCount', 'hasChiefComplaint'])
    
    await fetchQuestions(patientData, clinicalData, mode)
  }

  // Recharger avec un mode différent
  const reloadWithMode = async (newMode: AIMode) => {
    setMode(newMode)
    setAnswers({})
    setCurrentQuestionIndex(0)
    
    debugLog(`🔄 Rechargement en mode ${newMode}`)
    await fetchQuestions(patientData, clinicalData, newMode)
  }

  // Gérer les réponses
  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
    
    // Auto-avancer à la question suivante après un délai
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      }
    }, 500)
  }

  // Navigation entre questions
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  // Soumission finale
  const handleSubmit = () => {
    const questionsData = {
      questions: questions.map(q => ({
        ...q,
        answer: answers[q.id] || null
      })),
      insights: insights,
      mode: mode,
      timestamp: new Date().toISOString()
    }
    
    debugLog('✅ Réponses aux questions IA', questionsData)
    onDataChange(questionsData)
    onNext()
  }

  // Calculer la progression
  const progress = questions.length > 0 
    ? (Object.keys(answers).length / questions.length) * 100 
    : 0

  const allQuestionsAnswered = questions.length > 0 && 
    questions.every(q => answers[q.id])

  // Obtenir l'icône d'urgence
  const getUrgencyIcon = () => {
    if (!insights?.urgency_assessment) return null
    
    const level = insights.urgency_assessment.level
    switch(level) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'high': return <AlertCircle className="h-5 w-5 text-orange-600" />
      case 'medium': return <Activity className="h-5 w-5 text-yellow-600" />
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />
      default: return null
    }
  }

  // Obtenir la couleur de l'urgence
  const getUrgencyColor = () => {
    if (!insights?.urgency_assessment) return 'bg-gray-100'
    
    const level = insights.urgency_assessment.level
    switch(level) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800'
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'low': return 'bg-green-100 border-green-300 text-green-800'
      default: return 'bg-gray-100'
    }
  }

  // Rendu conditionnel selon l'état
  if (!connectionTested) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Connexion au service IA...</p>
        </CardContent>
      </Card>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-8">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertTitle>Service IA temporairement indisponible</AlertTitle>
            <AlertDescription className="mt-2">
              Le service de questions personnalisées n'est pas disponible actuellement.
              Nous utilisons des questions standards pour continuer votre consultation.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 mt-6">
            <Button 
              variant="outline" 
              onClick={onPrevious}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button 
              onClick={() => {
                // Utiliser les questions par défaut et continuer
                fetchQuestions(patientData, clinicalData, 'balanced')
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Utiliser questions standards
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && questions.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            <BrainCircuit className="h-16 w-16 text-blue-600 mx-auto animate-pulse" />
            <div>
              <p className="text-lg font-semibold mb-2">
                L'IA analyse vos symptômes...
              </p>
              <p className="text-sm text-gray-600">
                Génération de questions personnalisées en cours
              </p>
            </div>
            <Progress value={33} className="w-64 mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="space-y-6">
      {/* En-tête avec mode et progression */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <BrainCircuit className="h-8 w-8 text-blue-600" />
              Questions Diagnostiques IA
            </CardTitle>
            
            {/* Sélecteur de mode */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'fast' ? 'default' : 'outline'}
                onClick={() => reloadWithMode('fast')}
                disabled={loading}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Rapide
              </Button>
              <Button
                size="sm"
                variant={mode === 'balanced' ? 'default' : 'outline'}
                onClick={() => reloadWithMode('balanced')}
                disabled={loading}
                className="text-xs"
              >
                <Activity className="h-3 w-3 mr-1" />
                Équilibré
              </Button>
              <Button
                size="sm"
                variant={mode === 'intelligent' ? 'default' : 'outline'}
                onClick={() => reloadWithMode('intelligent')}
                disabled={loading}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Approfondi
              </Button>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progression</span>
              <span className="font-semibold">
                {Object.keys(answers).length}/{questions.length} questions
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Insights IA si disponibles */}
      {insights && (
        <Card className={`border-2 ${getUrgencyColor()}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getUrgencyIcon()}
              <div className="flex-1">
                <p className="font-semibold mb-1">
                  Évaluation d'urgence: {insights.urgency_assessment?.level}
                </p>
                <p className="text-sm">
                  {insights.urgency_assessment?.reason}
                </p>
                
                {insights.recommended_specialties && insights.recommended_specialties.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Spécialités recommandées:</p>
                    <div className="flex flex-wrap gap-2">
                      {insights.recommended_specialties.map((specialty, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <Stethoscope className="h-3 w-3 mr-1" />
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question actuelle */}
      {currentQuestion && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Question {currentQuestionIndex + 1} sur {questions.length}
              </CardTitle>
              <Badge 
                className={
                  currentQuestion.priority === 'high' 
                    ? 'bg-red-100 text-red-800'
                    : currentQuestion.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }
              >
                Priorité: {currentQuestion.priority}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {currentQuestion.question}
              </h3>
              
              {currentQuestion.rationale && (
                <p className="text-sm text-gray-600 italic">
                  💡 {currentQuestion.rationale}
                </p>
              )}
            </div>

            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
            >
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      answers[currentQuestion.id] === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <RadioGroupItem value={option} />
                    <span className="flex-1 font-medium">{option}</span>
                    {answers[currentQuestion.id] === option && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </label>
                ))}
              </div>
            </RadioGroup>

            {/* Navigation entre questions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédente
              </Button>
              
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentQuestionIndex
                        ? 'w-8 bg-blue-600'
                        : answers[questions[idx].id]
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={goToNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Suivante
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erreur si présente */}
      {error && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              size="sm"
              variant="link"
              onClick={() => loadQuestions()}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Vue d'ensemble des réponses */}
      {questions.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Résumé des réponses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div 
                  key={q.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    currentQuestionIndex === idx
                      ? 'bg-blue-50 border border-blue-200'
                      : answers[q.id]
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                  onClick={() => setCurrentQuestionIndex(idx)}
                >
                  <div className="flex-shrink-0">
                    {answers[q.id] ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Question {idx + 1}: {q.question.substring(0, 50)}...
                    </p>
                    {answers[q.id] && (
                      <p className="text-xs text-gray-600 mt-1">
                        Réponse: {answers[q.id]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons de navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        
        <Button 
          onClick={handleSubmit}
          disabled={!allQuestionsAnswered}
          className={`px-6 py-3 ${
            allQuestionsAnswered
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {allQuestionsAnswered ? 'Continuer vers le diagnostic' : 'Répondez à toutes les questions'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
