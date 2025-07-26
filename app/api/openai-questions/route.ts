import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API Questions Ultra-Personnalisées v2.0 - Début analyse avancée")

    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour analyse:", Object.keys(requestData))
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON questions:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { patientData, clinicalData } = requestData

    // 1. ANALYSE EXHAUSTIVE DES DONNÉES DISPONIBLES
    console.log("🧠 Analyse exhaustive des données disponibles...")
    const knownInfo = analyzeAvailableDataEnhanced(patientData, clinicalData)
    
    // 2. VALIDATION DE LA QUALITÉ DES DONNÉES LUES
    const dataQuality = validateDataQuality(knownInfo, patientData, clinicalData)
    console.log("📊 Qualité des données:", dataQuality)

    // 3. GÉNÉRATION QUESTIONS AVEC SYSTÈME ANTI-GÉNÉRIQUE RENFORCÉ
    let questions
    try {
      if (process.env.OPENAI_API_KEY) {
        console.log("🤖 Génération questions IA ultra-spécifiques...")
        questions = await generateUltraSpecificQuestionsWithAI(patientData, clinicalData, knownInfo)
      } else {
        throw new Error("OpenAI API key not configured")
      }
    } catch (aiError) {
      console.log("⚠️ OpenAI indisponible, utilisation du générateur ultra-spécifique")
      questions = generateUltraSpecificFallbackQuestions(patientData, clinicalData, knownInfo)
    }

    // 4. POST-TRAITEMENT AVEC SYSTÈME ANTI-REDONDANCE AVANCÉ
    questions = postProcessQuestionsWithAdvancedFiltering(questions, knownInfo, patientData, clinicalData)

    // 5. VALIDATION FINALE DE LA SPÉCIFICITÉ
    const finalValidation = validateQuestionSpecificity(questions, patientData, clinicalData, knownInfo)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      questions,
      metadata: {
        aiGenerated: !!process.env.OPENAI_API_KEY,
        dataQuality,
        dataAnalysis: knownInfo,
        questionTypes: questions.map(q => q.category),
        specificityScore: calculateAdvancedSpecificityScore(questions),
        avgPriority: calculateAveragePriority(questions),
        personalizationLevel: "Ultra-Personnalisé v2.0",
        antiRedundancyApplied: true,
        antiGenericFiltersApplied: true,
        ageSpecificCount: questions.filter(q => q.ageSpecific).length,
        symptomSpecificCount: questions.filter(q => q.symptomSpecific).length,
        antecedentSpecificCount: questions.filter(q => q.antecedentSpecific).length,
        genderSpecificCount: questions.filter(q => q.genderSpecific).length,
        validationResults: finalValidation,
        generationTime: new Date().toISOString(),
      },
    }

    console.log(`✅ ${questions.length} questions ultra-spécifiques générées (spécificité: ${response.metadata.specificityScore}/10)`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur complète questions ultra-personnalisées:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions ultra-personnalisées",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// === ANALYSE EXHAUSTIVE DES DONNÉES DISPONIBLES ===
function analyzeAvailableDataEnhanced(patientData: any, clinicalData: any) {
  const knownInfo = {
    demographics: {
      hasAge: !!patientData?.age,
      hasGender: !!patientData?.gender,
      hasBMI: !!(patientData?.weight && patientData?.height),
      age: patientData?.age,
      gender: patientData?.gender,
      weight: patientData?.weight,
      height: patientData?.height,
      bmi: patientData?.weight && patientData?.height ? 
        (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : null
    },
    
    medicalHistory: {
      hasAntecedents: !!(patientData?.medicalHistory?.length > 0),
      specificConditions: patientData?.medicalHistory || [],
      hasFamilyHistory: !!(patientData?.familyHistory?.length > 0),
      familyConditions: patientData?.familyHistory || [],
      conditionTypes: categorizeConditions(patientData?.medicalHistory || [])
    },
    
    currentMedications: {
      hasMedications: !!(patientData?.currentMedications?.length > 0),
      medicationsList: patientData?.currentMedications || [],
      hasAllergies: !!(patientData?.allergies?.length > 0),
      allergiesList: patientData?.allergies || [],
      medicationCategories: categorizeMedications(patientData?.currentMedications || [])
    },
    
    currentSymptoms: {
      hasChiefComplaint: !!clinicalData?.chiefComplaint,
      chiefComplaint: clinicalData?.chiefComplaint || "",
      hasSymptomsList: !!(clinicalData?.symptoms?.length > 0),
      symptomsList: clinicalData?.symptoms || [],
      hasDuration: !!clinicalData?.symptomDuration,
      duration: clinicalData?.symptomDuration,
      hasPainScale: !!clinicalData?.painScale,
      painLevel: clinicalData?.painScale,
      symptomSeverity: categorizeSymptomSeverity(clinicalData),
      symptomPattern: analyzeSymptomPattern(clinicalData)
    },
    
    vitalSigns: {
      hasBloodPressure: !!clinicalData?.vitalSigns?.bloodPressure,
      hasHeartRate: !!clinicalData?.vitalSigns?.heartRate,
      hasTemperature: !!clinicalData?.vitalSigns?.temperature,
      hasRespiratoryRate: !!clinicalData?.vitalSigns?.respiratoryRate,
      hasOxygenSaturation: !!clinicalData?.vitalSigns?.oxygenSaturation,
      values: clinicalData?.vitalSigns || {},
      abnormalValues: identifyAbnormalVitals(clinicalData?.vitalSigns || {})
    },
    
    lifestyle: {
      hasSmokingStatus: !!patientData?.smokingStatus,
      hasAlcoholConsumption: !!patientData?.alcoholConsumption,
      hasExerciseLevel: !!patientData?.exerciseLevel,
      smokingStatus: patientData?.smokingStatus,
      alcoholConsumption: patientData?.alcoholConsumption,
      exerciseLevel: patientData?.exerciseLevel,
      riskFactors: identifyLifestyleRiskFactors(patientData)
    },
    
    physicalExam: {
      hasExamResults: !!clinicalData?.physicalExam,
      examFindings: clinicalData?.physicalExam || {},
      abnormalFindings: extractAbnormalFindings(clinicalData?.physicalExam || {})
    },

    // NOUVEAU : Contexte clinique enrichi
    clinicalContext: {
      ageGroup: categorizeAge(patientData?.age),
      riskProfile: assessRiskProfile(patientData, clinicalData),
      urgencyLevel: assessUrgencyLevel(clinicalData),
      specialties: identifyRelevantSpecialties(patientData, clinicalData)
    }
  }
  
  return knownInfo
}

// === FONCTIONS D'ANALYSE AUXILIAIRES ===
function categorizeConditions(conditions: string[]) {
  const categories = {
    cardiovascular: [],
    respiratory: [],
    endocrine: [],
    neurological: [],
    psychiatric: [],
    gastrointestinal: [],
    urogenital: [],
    musculoskeletal: [],
    dermatological: [],
    other: []
  }

  conditions.forEach(condition => {
    const lowerCondition = condition.toLowerCase()
    if (lowerCondition.includes('cardiaque') || lowerCondition.includes('hypertension') || 
        lowerCondition.includes('infarctus') || lowerCondition.includes('arythmie')) {
      categories.cardiovascular.push(condition)
    } else if (lowerCondition.includes('asthme') || lowerCondition.includes('bpco') || 
               lowerCondition.includes('bronchique')) {
      categories.respiratory.push(condition)
    } else if (lowerCondition.includes('diabète') || lowerCondition.includes('thyroïde')) {
      categories.endocrine.push(condition)
    } else if (lowerCondition.includes('épilepsie') || lowerCondition.includes('migraine')) {
      categories.neurological.push(condition)
    } else if (lowerCondition.includes('dépression') || lowerCondition.includes('anxiété')) {
      categories.psychiatric.push(condition)
    } else {
      categories.other.push(condition)
    }
  })

  return categories
}

function categorizeMedications(medications: string[]) {
  const categories = {
    antihypertenseurs: [],
    antidiabetiques: [],
    analgesiques: [],
    antibiotiques: [],
    psychotropes: [],
    autres: []
  }

  medications.forEach(med => {
    const lowerMed = med.toLowerCase()
    if (lowerMed.includes('pril') || lowerMed.includes('sartan') || lowerMed.includes('olol')) {
      categories.antihypertenseurs.push(med)
    } else if (lowerMed.includes('metformine') || lowerMed.includes('gliclazide')) {
      categories.antidiabetiques.push(med)
    } else if (lowerMed.includes('doliprane') || lowerMed.includes('ibuprofène')) {
      categories.analgesiques.push(med)
    } else {
      categories.autres.push(med)
    }
  })

  return categories
}

function categorizeAge(age: number): string {
  if (!age) return "unknown"
  if (age < 2) return "nourrisson"
  if (age < 12) return "enfant"
  if (age < 18) return "adolescent"
  if (age < 35) return "jeune_adulte"
  if (age < 65) return "adulte"
  if (age < 80) return "senior"
  return "grand_senior"
}

function assessRiskProfile(patientData: any, clinicalData: any): string {
  let riskScore = 0
  
  // Facteurs d'âge
  if (patientData?.age > 65) riskScore += 2
  if (patientData?.age > 80) riskScore += 1
  
  // Antécédents
  const conditions = patientData?.medicalHistory || []
  if (conditions.some(c => c.toLowerCase().includes('cardiaque'))) riskScore += 3
  if (conditions.some(c => c.toLowerCase().includes('diabète'))) riskScore += 2
  
  // Symptômes actuels
  if (clinicalData?.painScale > 7) riskScore += 2
  
  if (riskScore >= 6) return "élevé"
  if (riskScore >= 3) return "modéré"
  return "faible"
}

function assessUrgencyLevel(clinicalData: any): string {
  const complaint = (clinicalData?.chiefComplaint || "").toLowerCase()
  
  if (complaint.includes('douleur thoracique') || 
      complaint.includes('essoufflement sévère') || 
      complaint.includes('perte de conscience')) {
    return "urgent"
  }
  
  if (clinicalData?.painScale > 8) return "urgent"
  if (clinicalData?.painScale > 6) return "semi-urgent"
  
  return "standard"
}

function identifyRelevantSpecialties(patientData: any, clinicalData: any): string[] {
  const specialties = []
  const complaint = (clinicalData?.chiefComplaint || "").toLowerCase()
  const age = patientData?.age || 0
  
  if (complaint.includes('cardiaque') || complaint.includes('thoracique')) {
    specialties.push('cardiologie')
  }
  if (complaint.includes('neurologique') || complaint.includes('céphalée')) {
    specialties.push('neurologie')
  }
  if (age > 65) {
    specialties.push('gériatrie')
  }
  if (age < 18) {
    specialties.push('pédiatrie')
  }
  
  return specialties
}

// === VALIDATION DE LA QUALITÉ DES DONNÉES ===
function validateDataQuality(knownInfo: any, patientData: any, clinicalData: any) {
  const validation = {
    completeness: 0,
    specificityPotential: 0,
    dataGaps: [],
    strengths: []
  }

  // Évaluation de la complétude
  let totalFields = 0
  let filledFields = 0

  // Données démographiques (20% du score)
  totalFields += 3
  if (knownInfo.demographics.hasAge) { filledFields += 1; validation.strengths.push("Âge disponible") }
  if (knownInfo.demographics.hasGender) { filledFields += 1; validation.strengths.push("Sexe disponible") }
  if (knownInfo.demographics.hasBMI) { filledFields += 1; validation.strengths.push("IMC calculable") }

  // Antécédents (25% du score)
  totalFields += 2
  if (knownInfo.medicalHistory.hasAntecedents) { 
    filledFields += 1
    validation.strengths.push(`${knownInfo.medicalHistory.specificConditions.length} antécédent(s)`)
  } else {
    validation.dataGaps.push("Antécédents médicaux manquants")
  }
  if (knownInfo.medicalHistory.hasFamilyHistory) { filledFields += 1 }

  // Symptômes actuels (30% du score)
  totalFields += 3
  if (knownInfo.currentSymptoms.hasChiefComplaint) { 
    filledFields += 1
    validation.strengths.push("Motif de consultation précis")
  } else {
    validation.dataGaps.push("Motif de consultation manquant")
  }
  if (knownInfo.currentSymptoms.hasSymptomsList) { filledFields += 1 }
  if (knownInfo.currentSymptoms.hasDuration) { filledFields += 1 }

  // Médicaments (15% du score)
  totalFields += 1
  if (knownInfo.currentMedications.hasMedications) { 
    filledFields += 1
    validation.strengths.push(`${knownInfo.currentMedications.medicationsList.length} médicament(s)`)
  }

  // Signes vitaux (10% du score)
  totalFields += 1
  if (Object.keys(knownInfo.vitalSigns.values).length > 2) { filledFields += 1 }

  validation.completeness = Math.round((filledFields / totalFields) * 100)

  // Potentiel de spécificité
  let specificityScore = 0
  if (knownInfo.demographics.hasAge) specificityScore += 20
  if (knownInfo.demographics.hasGender) specificityScore += 15
  if (knownInfo.medicalHistory.hasAntecedents) specificityScore += 25
  if (knownInfo.currentSymptoms.hasChiefComplaint) specificityScore += 30
  if (knownInfo.currentMedications.hasMedications) specificityScore += 10

  validation.specificityPotential = specificityScore

  return validation
}

// === SYSTÈME ANTI-GÉNÉRIQUE RENFORCÉ ===
function eliminateGenericQuestionsEnhanced(questions: any[], patientData: any, clinicalData: any, knownInfo: any) {
  return questions.filter(question => {
    const questionText = question.question.toLowerCase()
    
    // ❌ PATTERNS GÉNÉRIQUES INTERDITS
    const prohibitedGenericPatterns = [
      // Questions trop vagues
      'comment vous sentez-vous',
      'décrivez vos symptômes',
      'avez-vous mal quelque part',
      'que ressentez-vous',
      'comment ça va',
      'parlez-moi de',
      'dites-moi',
      'pouvez-vous me dire',
      'comment décririez-vous',
      'avez-vous des problèmes',
      'tout va bien',
      
      // Questions sans contexte spécifique
      'avez-vous des antécédents',
      'prenez-vous des médicaments',
      'êtes-vous allergique',
      'fumez-vous',
      'buvez-vous',
      
      // Questions redondantes avec les données
      ...(knownInfo.demographics.hasAge ? ['quel âge avez-vous', 'votre âge'] : []),
      ...(knownInfo.demographics.hasGender ? ['êtes-vous un homme ou une femme'] : []),
      ...(knownInfo.currentSymptoms.hasChiefComplaint ? ['pourquoi consultez-vous', 'motif de consultation'] : []),
    ]
    
    // Vérifier si la question contient des patterns interdits
    const isGeneric = prohibitedGenericPatterns.some(pattern => 
      questionText.includes(pattern)
    )
    
    if (isGeneric) {
      console.log(`❌ Question générique éliminée: ${question.question}`)
      return false
    }
    
    // ✅ CRITÈRES DE SPÉCIFICITÉ OBLIGATOIRES
    const hasRequiredSpecificity = 
      // Doit avoir au moins un marqueur de spécificité
      question.ageSpecific || 
      question.antecedentSpecific || 
      question.symptomSpecific ||
      question.genderSpecific ||
      question.category.includes('specific') ||
      // Ou être de haute priorité avec contexte précis
      (question.priority === 'high' && questionText.length > 30)
    
    if (!hasRequiredSpecificity) {
      console.log(`❌ Question manque de spécificité: ${question.question}`)
      return false
    }
    
    // ✅ VALIDATION CONTEXTUELLE
    const hasContextualRelevance = validateContextualRelevance(question, patientData, clinicalData, knownInfo)
    
    return hasContextualRelevance
  })
}

function validateContextualRelevance(question: any, patientData: any, clinicalData: any, knownInfo: any): boolean {
  const questionText = question.question.toLowerCase()
  
  // Vérifier que la question est pertinente pour ce patient spécifique
  
  // Questions d'âge : doivent correspondre à l'âge réel
  if (question.ageSpecific) {
    const age = patientData?.age
    if (age <= 18 && !questionText.includes('enfant') && !questionText.includes('adolescent')) {
      return false
    }
    if (age > 65 && !questionText.includes('senior') && !questionText.includes('âgé')) {
      return false
    }
  }
  
  // Questions de symptômes : doivent correspondre aux symptômes déclarés
  if (question.symptomSpecific) {
    const complaint = knownInfo.currentSymptoms.chiefComplaint.toLowerCase()
    const relevantToComplaint = 
      questionText.includes('douleur') && complaint.includes('douleur') ||
      questionText.includes('thoracique') && complaint.includes('thoracique') ||
      questionText.includes('essoufflement') && complaint.includes('essoufflement') ||
      questionText.includes('céphalée') && complaint.includes('céphalée')
    
    if (!relevantToComplaint) {
      console.log(`❌ Question non pertinente pour le symptôme: ${question.question}`)
      return false
    }
  }
  
  // Questions d'antécédents : doivent correspondre aux antécédents
  if (question.antecedentSpecific) {
    const hasRelevantAntecedent = knownInfo.medicalHistory.specificConditions.some(condition =>
      questionText.includes(condition.toLowerCase()) ||
      (questionText.includes('cardiaque') && condition.toLowerCase().includes('cardiaque')) ||
      (questionText.includes('diabète') && condition.toLowerCase().includes('diabète'))
    )
    
    if (!hasRelevantAntecedent) {
      console.log(`❌ Question non pertinente pour les antécédents: ${question.question}`)
      return false
    }
  }
  
  return true
}

// === GÉNÉRATION ULTRA-SPÉCIFIQUE AVEC IA ===
async function generateUltraSpecificQuestionsWithAI(patientData: any, clinicalData: any, knownInfo: any) {
  const prompt = buildUltraSpecificPromptEnhanced(patientData, clinicalData, knownInfo)

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt,
    temperature: 0.1, // Très déterministe pour maximiser la spécificité
    maxTokens: 3500,
  })

  try {
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      let aiQuestions = JSON.parse(jsonMatch[0])
      
      // Filtrage ultra-strict
      aiQuestions = eliminateGenericQuestionsEnhanced(aiQuestions, patientData, clinicalData, knownInfo)
      
      // Validation de spécificité pour chaque question IA
      aiQuestions = aiQuestions.filter(q => validateQuestionUltraSpecificity(q, patientData, clinicalData, knownInfo))
      
      // Compléter avec des questions ultra-spécifiques si nécessaire
      if (aiQuestions.length < 6) {
        const enhancedQuestions = generateUltraSpecificFallbackQuestions(patientData, clinicalData, knownInfo)
        const additionalQuestions = enhancedQuestions.slice(0, 8 - aiQuestions.length)
        aiQuestions.push(...additionalQuestions)
      }
      
      return aiQuestions.slice(0, 8)
    }
  } catch (parseError) {
    console.log("⚠️ Erreur parsing questions IA, utilisation fallback ultra-spécifique")
  }

  return generateUltraSpecificFallbackQuestions(patientData, clinicalData, knownInfo)
}

// === VALIDATION ULTRA-SPÉCIFICITÉ ===
function validateQuestionUltraSpecificity(question: any, patientData: any, clinicalData: any, knownInfo: any): boolean {
  const specificityChecks = {
    hasAgeReference: question.ageSpecific || question.question.toLowerCase().includes(`${patientData?.age} ans`),
    hasSymptomReference: question.symptomSpecific || question.question.toLowerCase().includes(knownInfo.currentSymptoms.chiefComplaint.toLowerCase()),
    hasAntecedentReference: question.antecedentSpecific || knownInfo.medicalHistory.specificConditions.some(cond => 
      question.question.toLowerCase().includes(cond.toLowerCase())
    ),
    hasGenderReference: question.genderSpecific || question.question.toLowerCase().includes(patientData?.gender?.toLowerCase()),
    hasDetailedContext: question.question.length > 40,
    hasPreciseLanguage: !['général', 'habituellement', 'en général', 'normalement'].some(word => 
      question.question.toLowerCase().includes(word)
    )
  }
  
  // Au moins 2 critères de spécificité requis
  const specificityScore = Object.values(specificityChecks).filter(Boolean).length
  
  if (specificityScore < 2) {
    console.log(`❌ Question insuffisamment spécifique (score: ${specificityScore}/6): ${question.question}`)
    return false
  }
  
  return true
}

// === POST-TRAITEMENT AVEC FILTRAGE AVANCÉ ===
function postProcessQuestionsWithAdvancedFiltering(questions: any[], knownInfo: any, patientData: any, clinicalData: any) {
  console.log(`🔄 Post-traitement de ${questions.length} questions initiales`)
  
  // 1. Filtrage ultra-strict anti-générique
  let processedQuestions = eliminateGenericQuestionsEnhanced(questions, patientData, clinicalData, knownInfo)
  console.log(`✅ Après filtrage anti-générique: ${processedQuestions.length} questions`)
  
  // 2. Validation ultra-spécificité
  processedQuestions = processedQuestions.filter(q => 
    validateQuestionUltraSpecificity(q, patientData, clinicalData, knownInfo)
  )
  console.log(`✅ Après validation spécificité: ${processedQuestions.length} questions`)
  
  // 3. Anti-redondance sémantique avancée
  processedQuestions = eliminateSemanticRedundancy(processedQuestions)
  console.log(`✅ Après anti-redondance sémantique: ${processedQuestions.length} questions`)
  
  // 4. Scoring et priorisation avancée
  processedQuestions = processedQuestions.map(q => ({
    ...q,
    specificityScore: calculateQuestionSpecificityScore(q, patientData, clinicalData, knownInfo),
    relevanceScore: calculateRelevanceScore(q, patientData, clinicalData, knownInfo)
  }))
  
  // 5. Tri par score combiné
  processedQuestions = processedQuestions.sort((a, b) => {
    const aScore = (a.specificityScore * 0.6) + (a.relevanceScore * 0.4)
    const bScore = (b.specificityScore * 0.6) + (b.relevanceScore * 0.4)
    return bScore - aScore
  })
  
  // 6. Sélection finale avec diversité garantie
  const finalQuestions = selectDiverseQuestions(processedQuestions, 8)
  
  console.log(`✅ Sélection finale: ${finalQuestions.length} questions ultra-spécifiques`)
  return finalQuestions
}

// === ÉLIMINATION REDONDANCE SÉMANTIQUE ===
function eliminateSemanticRedundancy(questions: any[]): any[] {
  const uniqueQuestions = []
  
  for (const question of questions) {
    const isDuplicate = uniqueQuestions.some(existing => {
      return calculateSimilarity(question.question, existing.question) > 0.7
    })
    
    if (!isDuplicate) {
      uniqueQuestions.push(question)
    } else {
      console.log(`🔄 Question similaire éliminée: ${question.question}`)
    }
  }
  
  return uniqueQuestions
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(' ')
  const words2 = str2.toLowerCase().split(' ')
  
  const intersection = words1.filter(word => words2.includes(word))
  const union = [...new Set([...words1, ...words2])]
  
  return intersection.length / union.length
}

// === CALCUL SCORES DE SPÉCIFICITÉ ET PERTINENCE ===
function calculateQuestionSpecificityScore(question: any, patientData: any, clinicalData: any, knownInfo: any): number {
  let score = 0
  
  // Marqueurs de spécificité explicites
  if (question.ageSpecific) score += 20
  if (question.symptomSpecific) score += 25
  if (question.antecedentSpecific) score += 25
  if (question.genderSpecific) score += 15
  
  // Analyse du texte de la question
  const questionText = question.question.toLowerCase()
  
  // Mentions spécifiques à l'âge
  if (questionText.includes(`${patientData?.age} ans`)) score += 15
  if (questionText.includes(categorizeAge(patientData?.age))) score += 10
  
  // Mentions spécifiques aux symptômes
  if (questionText.includes(knownInfo.currentSymptoms.chiefComplaint.toLowerCase())) score += 20
  
  // Mentions spécifiques aux antécédents
  knownInfo.medicalHistory.specificConditions.forEach(condition => {
    if (questionText.includes(condition.toLowerCase())) score += 15
  })
  
  // Longueur et détail de la question
  if (question.question.length > 50) score += 10
  if (question.question.length > 80) score += 5
  
  // Présence d'options spécifiques
  if (question.options && question.options.length > 2) score += 5
  
  return Math.min(score, 100) // Max 100
}

function calculateRelevanceScore(question: any, patientData: any, clinicalData: any, knownInfo: any): number {
  let score = 0
  
  // Priorité déclarée
  if (question.priority === 'high') score += 30
  if (question.priority === 'medium') score += 20
  if (question.priority === 'low') score += 10
  
  // Pertinence par rapport au contexte clinique
  if (knownInfo.clinicalContext.urgencyLevel === 'urgent' && question.priority === 'high') score += 20
  if (knownInfo.clinicalContext.riskProfile === 'élevé' && question.category.includes('risk')) score += 15
  
  // Pertinence spécialisée
  knownInfo.clinicalContext.specialties.forEach(specialty => {
    if (question.category.includes(specialty)) score += 10
  })
  
  return Math.min(score, 100) // Max 100
}

// === SÉLECTION AVEC DIVERSITÉ ===
function selectDiverseQuestions(questions: any[], maxCount: number): any[] {
  const selected = []
  const categoriesUsed = new Set()
  const specificityTypesUsed = new Set()
  
  // Première passe : questions de haute priorité et spécificité
  for (const question of questions) {
    if (selected.length >= maxCount) break
    
    if (question.priority === 'high' && question.specificityScore > 60) {
      selected.push(question)
      categoriesUsed.add(question.category)
      
      const specificityType = getSpecificityType(question)
      specificityTypesUsed.add(specificityType)
    }
  }
  
  // Deuxième passe : diversité des catégories
  for (const question of questions) {
    if (selected.length >= maxCount) break
    if (selected.includes(question)) continue
    
    const categoryCount = selected.filter(q => q.category === question.category).length
    const specificityType = getSpecificityType(question)
    const typeCount = selected.filter(q => getSpecificityType(q) === specificityType).length
    
    // Maximum 2 questions par catégorie et par type de spécificité
    if (categoryCount < 2 && typeCount < 3) {
      selected.push(question)
      categoriesUsed.add(question.category)
      specificityTypesUsed.add(specificityType)
    }
  }
  
  // Troisième passe : compléter si nécessaire
  for (const question of questions) {
    if (selected.length >= maxCount) break
    if (!selected.includes(question)) {
      selected.push(question)
    }
  }
  
  return selected.slice(0, maxCount)
}

function getSpecificityType(question: any): string {
  if (question.ageSpecific) return 'age'
  if (question.symptomSpecific) return 'symptom'
  if (question.antecedentSpecific) return 'antecedent'
  if (question.genderSpecific) return 'gender'
  return 'other'
}

// === GÉNÉRATION FALLBACK ULTRA-SPÉCIFIQUE ===
function generateUltraSpecificFallbackQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  console.log("🎯 Génération fallback ultra-spécifique")
  
  const questions = []
  
  // Générer questions par catégorie de spécificité
  questions.push(...generateAgeSpecificQuestionsEnhanced(patientData, clinicalData, knownInfo))
  questions.push(...generateSymptomSpecificQuestionsEnhanced(patientData, clinicalData, knownInfo))
  questions.push(...generateAntecedentSpecificQuestionsEnhanced(patientData, clinicalData, knownInfo))
  questions.push(...generateContextSpecificQuestions(patientData, clinicalData, knownInfo))
  
  // Filtrage et sélection
  return postProcessQuestionsWithAdvancedFiltering(questions, knownInfo, patientData, clinicalData)
}

// === GÉNÉRATION QUESTIONS SPÉCIFIQUES AMÉLIORÉES ===
function generateAgeSpecificQuestionsEnhanced(patientData: any, clinicalData: any, knownInfo: any) {
  const questions = []
  const age = patientData?.age || 0
  const gender = patientData?.gender || ""
  const complaint = knownInfo.currentSymptoms.chiefComplaint
  
  if (age <= 18) {
    // Questions pédiatriques ultra-spécifiques
    questions.push({
      id: `age_${age}_1`,
      question: `À ${age} ans, cette ${complaint.toLowerCase()} t'empêche-t-elle de faire tes activités préférées comme jouer ou faire du sport ?`,
      type: "yes_no",
      category: "pediatric_functional_impact",
      priority: "high",
      ageSpecific: `${age} ans`,
      symptomSpecific: complaint,
      specificityScore: 85
    })
  } else if (age >= 18 && age <= 35) {
    // Questions jeune adulte
    if (gender === "Féminin") {
      questions.push({
        id: `age_gender_${age}_1`,
        question: `Chez une femme de ${age} ans, ces symptômes coïncident-ils avec vos cycles menstruels ou un changement de contraception récent ?`,
        type: "multiple_choice",
        options: ["Début de cycle", "Milieu de cycle", "Fin de cycle", "Changement contraceptif", "Aucun lien"],
        category: "reproductive_hormonal_correlation",
        priority: "high",
        ageSpecific: `${age} ans`,
        genderSpecific: "Féminin",
        specificityScore: 90
      })
    }
  } else if (age > 65) {
    // Questions gériatriques ultra-spécifiques
    questions.push({
      id: `geriatric_${age}_1`,
      question: `À ${age} ans, avez-vous remarqué une diminution de votre équilibre ou des difficultés nouvelles pour vous lever d'une chaise sans aide ?`,
      type: "multiple_choice",
      options: ["Équilibre instable", "Difficulté lever chaise", "Les deux", "Aucun problème"],
      category: "geriatric_mobility_specific",
      priority: "high",
      ageSpecific: `${age} ans`,
      specificityScore: 85
    })
  }
  
  return questions
}

function generateSymptomSpecificQuestionsEnhanced(patientData: any, clinicalData: any, knownInfo: any) {
  const questions = []
  const complaint = knownInfo.currentSymptoms.chiefComplaint.toLowerCase()
  const age = patientData?.age || 0
  
  if (complaint.includes('douleur thoracique')) {
    questions.push({
      id: "chest_pain_specific_1",
      question: "Cette douleur thoracique irradie-t-elle vers votre bras gauche, votre mâchoire ou entre vos omoplates ?",
      type: "multiple_choice",
      options: ["Bras gauche", "Mâchoire", "Entre omoplates", "Plusieurs zones", "Aucune irradiation"],
      category: "chest_pain_radiation_pattern",
      priority: "high",
      symptomSpecific: "douleur thoracique",
      specificityScore: 95
    })
  }
  
  if (complaint.includes('essoufflement')) {
    questions.push({
      id: "dyspnea_specific_1",
      question: "Votre essoufflement survient-il en position couchée (vous obligeant à dormir avec plusieurs oreillers) ?",
      type: "yes_no",
      category: "orthopnea_assessment",
      priority: "high",
      symptomSpecific: "essoufflement",
      specificityScore: 90
    })
  }
  
  return questions
}

function generateAntecedentSpecificQuestionsEnhanced(patientData: any, clinicalData: any, knownInfo: any) {
  const questions = []
  const antecedents = knownInfo.medicalHistory.specificConditions
  
  antecedents.forEach(antecedent => {
    if (antecedent.toLowerCase().includes('diabète')) {
      questions.push({
        id: `diabetes_specific_1`,
        question: `Concernant votre ${antecedent}, votre dernière hémoglobine glyquée (HbA1c) était-elle dans les objectifs fixés par votre médecin ?`,
        type: "multiple_choice",
        options: ["Oui, dans l'objectif", "Légèrement élevée", "Nettement élevée", "Je ne connais pas ma dernière valeur"],
        category: "diabetes_control_monitoring",
        priority: "high",
        antecedentSpecific: antecedent,
        specificityScore: 85
      })
    }
    
    if (antecedent.toLowerCase().includes('cardiaque') || antecedent.toLowerCase().includes('hypertension')) {
      questions.push({
        id: `cardiac_specific_1`,
        question: `Avec votre antécédent de ${antecedent}, prenez-vous régulièrement votre tension artérielle à domicile ?`,
        type: "multiple_choice",
        options: ["Quotidiennement", "Hebdomadairement", "Rarement", "Jamais", "Seulement si symptômes"],
        category: "cardiac_self_monitoring",
        priority: "medium",
        antecedentSpecific: antecedent,
        specificityScore: 80
      })
    }
  })
  
  return questions
}

function generateContextSpecificQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  const questions = []
  const context = knownInfo.clinicalContext
  
  if (context.urgencyLevel === 'urgent') {
    questions.push({
      id: "urgent_context_1",
      question: "Ces symptômes sont-ils apparus brutalement (en quelques minutes) ou progressivement ?",
      type: "multiple_choice",
      options: ["Brutalement (< 5 min)", "Rapidement (< 1h)", "Progressivement (> 1h)", "Sur plusieurs jours"],
      category: "symptom_onset_urgency",
      priority: "high",
      contextSpecific: "urgent",
      specificityScore: 90
    })
  }
  
  return questions
}

// === VALIDATION FINALE SPÉCIFICITÉ ===
function validateQuestionSpecificity(questions: any[], patientData: any, clinicalData: any, knownInfo: any) {
  const validation = {
    totalQuestions: questions.length,
    ultraSpecificCount: 0,
    specificCount: 0,
    genericCount: 0,
    avgSpecificityScore: 0,
    issues: []
  }
  
  questions.forEach(question => {
    const score = question.specificityScore || 0
    
    if (score >= 80) validation.ultraSpecificCount++
    else if (score >= 60) validation.specificCount++
    else {
      validation.genericCount++
      validation.issues.push(`Question peu spécifique: ${question.question}`)
    }
  })
  
  validation.avgSpecificityScore = questions.reduce((sum, q) => sum + (q.specificityScore || 0), 0) / questions.length
  
  return validation
}

// === UTILITAIRES AMÉLIORÉS ===
function calculateAdvancedSpecificityScore(questions: any[]): number {
  const scores = questions.map(q => q.specificityScore || 0)
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return Math.round(avgScore / 10) // Échelle sur 10
}

function calculateAveragePriority(questions: any[]) {
  const priorityValues = { high: 3, medium: 2, low: 1 }
  const total = questions.reduce((sum, q) => sum + (priorityValues[q.priority] || 2), 0)
  return (total / questions.length).toFixed(1)
}

// === NOUVELLES FONCTIONS D'ANALYSE ===
function categorizeSymptomSeverity(clinicalData: any) {
  const painScale = clinicalData?.painScale || 0
  if (painScale >= 8) return "sévère"
  if (painScale >= 5) return "modérée"
  if (painScale >= 2) return "légère"
  return "minimale"
}

function analyzeSymptomPattern(clinicalData: any) {
  const duration = clinicalData?.symptomDuration || ""
  if (duration.includes('soudain') || duration.includes('brutal')) return "aigu"
  if (duration.includes('jour') || duration.includes('semaine')) return "subaigu"
  if (duration.includes('mois') || duration.includes('année')) return "chronique"
  return "indéterminé"
}

function identifyAbnormalVitals(vitals: any) {
  const abnormal = []
  
  if (vitals.bloodPressure) {
    const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number)
    if (systolic > 140 || diastolic > 90) abnormal.push('hypertension')
    if (systolic < 90) abnormal.push('hypotension')
  }
  
  if (vitals.heartRate) {
    if (vitals.heartRate > 100) abnormal.push('tachycardie')
    if (vitals.heartRate < 60) abnormal.push('bradycardie')
  }
  
  if (vitals.temperature > 38) abnormal.push('fièvre')
  if (vitals.oxygenSaturation < 95) abnormal.push('hypoxémie')
  
  return abnormal
}

function identifyLifestyleRiskFactors(patientData: any) {
  const riskFactors = []
  
  if (patientData?.smokingStatus === 'fumeur') riskFactors.push('tabagisme')
  if (patientData?.alcoholConsumption === 'excessif') riskFactors.push('alcoolisme')
  if (patientData?.exerciseLevel === 'sédentaire') riskFactors.push('sédentarité')
  
  return riskFactors
}

function extractAbnormalFindings(examFindings: any) {
  // Cette fonction pourrait être développée selon le format des données d'examen
  return Object.entries(examFindings).filter(([key, value]) => 
    typeof value === 'string' && (
      value.includes('anormal') || 
      value.includes('pathologique') ||
      value.includes('suspect')
    )
  )
}

function buildUltraSpecificPromptEnhanced(patientData: any, clinicalData: any, knownInfo: any): string {
  const age = patientData?.age
  const gender = patientData?.gender
  const complaint = clinicalData?.chiefComplaint
  const antecedents = knownInfo.medicalHistory.specificConditions
  
  return `GÉNÉRATION QUESTIONS MÉDICALES ULTRA-SPÉCIFIQUES V2.0

PROFIL PATIENT UNIQUE:
- ${gender} de ${age} ans
- Motif: "${complaint}"
- Antécédents: ${antecedents.join(', ') || 'Aucun'}
- Niveau d'urgence: ${knownInfo.clinicalContext.urgencyLevel}
- Profil de risque: ${knownInfo.clinicalContext.riskProfile}

🚫 DONNÉES DÉJÀ CONNUES - NE JAMAIS REPOSER:
${knownInfo.demographics.hasAge ? `✓ Âge: ${age} ans` : ''}
${knownInfo.demographics.hasGender ? `✓ Sexe: ${gender}` : ''}
${knownInfo.currentSymptoms.hasChiefComplaint ? `✓ Motif: ${complaint}` : ''}
${knownInfo.medicalHistory.hasAntecedents ? `✓ Antécédents: ${antecedents.join(', ')}` : ''}

🎯 DIRECTIVE ABSOLUE - SPÉCIFICITÉ MAXIMALE:

1. INTÉGRER L'ÂGE EXACT (${age} ans) dans la formulation
2. EXPLOITER LE SEXE (${gender}) pour questions hormonales/anatomiques
3. CIBLER LE SYMPTÔME PRÉCIS ("${complaint}")
4. RÉFÉRENCER LES ANTÉCÉDENTS SPÉCIFIQUES

EXEMPLES DE TRANSFORMATION GÉNÉRIQUE → ULTRA-SPÉCIFIQUE:

❌ "Avez-vous des douleurs ?"
✅ "Cette douleur thoracique chez un ${gender.toLowerCase()} de ${age} ans irradie-t-elle vers le bras gauche ?"

❌ "Comment va votre diabète ?"
✅ "Avec votre diabète, votre glycémie à jeun est-elle régulièrement > 1,3g/L ces dernières semaines ?"

❌ "Êtes-vous essoufflé ?"
✅ "Combien de marches d'escalier pouvez-vous monter à ${age} ans avant d'être essoufflé ?"

ADAPTATIONS OBLIGATOIRES:

ÂGE ${age} ans:
${age <= 18 ? '- Langage adapté enfant/ado, questions sur jeu/école' : ''}
${age >= 18 && age <= 35 ? '- Facteurs contraceptifs (femmes), stress professionnel débutant' : ''}
${age > 35 && age <= 65 ? '- Stress professionnel, facteurs métaboliques' : ''}
${age > 65 ? '- Questions chutes, cognition, observance médicaments' : ''}

SYMPTÔME "${complaint}":
${complaint.includes('douleur thoracique') ? '- Irradiation précise, qualité, effort, ressemblance infarctus' : ''}
${complaint.includes('essoufflement') ? '- Capacité fonctionnelle chiffrée, orthopnée' : ''}
${complaint.includes('céphalée') ? '- Coup de tonnerre, signes neurologiques' : ''}

ANTÉCÉDENTS ${antecedents.join(', ')}:
${antecedents.some(a => a.includes('cardiaque')) ? '- Surveillance spécifique, observance, décompensation' : ''}
${antecedents.some(a => a.includes('diabète')) ? '- HbA1c, hypoglycémies, complications' : ''}

FORMAT JSON ULTRA-SPÉCIFIQUE:
[
  {
    "id": 1,
    "question": "Question ULTRA-précise mentionnant âge/sexe/symptôme/antécédent",
    "type": "multiple_choice|yes_no|scale|text",
    "options": ["Option cliniquement précise 1", "Option précise 2"],
    "category": "catégorie_ultra_spécifique",
    "priority": "high|medium|low",
    "rationale": "Pourquoi cruciale pour CE patient précis",
    "ageSpecific": "${age} ans",
    "symptomSpecific": "${complaint}",
    "antecedentSpecific": "antécédent spécifique si applicable",
    "genderSpecific": "${gender}" si applicable,
    "specificity_rationale": "Explication spécificité unique"
  }
]

INTERDICTIONS ABSOLUES:
- Questions applicables à tous patients
- Formulations vagues ("comment ça va", "décrivez")
- Questions sans contexte d'âge/sexe/symptôme
- Répétition d'informations connues

Chaque question DOIT être taillée uniquement pour ce patient de ${age} ans avec "${complaint}".

RÉPONDEZ UNIQUEMENT AVEC LE JSON.`
}
