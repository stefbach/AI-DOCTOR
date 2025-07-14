import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 API Questions Intelligentes - Début analyse anti-redondance")

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

    // 1. Analyser les données disponibles pour éviter redondance
    console.log("🧠 Analyse des données disponibles...")
    const knownInfo = analyzeAvailableData(patientData, clinicalData)
    
    console.log("📊 Données analysées:", {
      demographics: Object.values(knownInfo.demographics).filter(Boolean).length,
      medicalHistory: Object.values(knownInfo.medicalHistory).filter(Boolean).length,
      medications: Object.values(knownInfo.currentMedications).filter(Boolean).length,
      symptoms: Object.values(knownInfo.currentSymptoms).filter(Boolean).length,
      vitalSigns: Object.values(knownInfo.vitalSigns).filter(Boolean).length
    })

    // 2. Génération des questions avec AI ou fallback
    let questions
    try {
      if (process.env.OPENAI_API_KEY) {
        console.log("🤖 Génération questions IA intelligentes...")
        questions = await generateIntelligentQuestionsWithAI(patientData, clinicalData, knownInfo)
      } else {
        throw new Error("OpenAI API key not configured")
      }
    } catch (aiError) {
      console.log("⚠️ OpenAI indisponible, utilisation du fallback intelligent")
      questions = generateIntelligentFallbackQuestions(patientData, clinicalData, knownInfo)
    }

    // 3. Post-traitement et validation
    questions = postProcessQuestions(questions, knownInfo)

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      questions,
      metadata: {
        aiGenerated: !!process.env.OPENAI_API_KEY,
        dataAnalysis: knownInfo,
        questionTypes: questions.map(q => q.category),
        avgPriority: calculateAveragePriority(questions),
        antiRedundancyApplied: true,
        generationTime: new Date().toISOString(),
      },
    }

    console.log(`✅ ${questions.length} questions intelligentes générées (anti-redondance activée)`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur complète questions intelligentes:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions intelligentes",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// === ANALYSE DES DONNÉES DISPONIBLES ===
function analyzeAvailableData(patientData: any, clinicalData: any) {
  const knownInfo = {
    demographics: {
      hasAge: !!patientData?.age,
      hasGender: !!patientData?.gender,
      hasBMI: !!(patientData?.weight && patientData?.height),
      age: patientData?.age,
      gender: patientData?.gender
    },
    
    medicalHistory: {
      hasAntecedents: !!(patientData?.medicalHistory?.length > 0),
      specificConditions: patientData?.medicalHistory || [],
      hasFamilyHistory: !!(patientData?.familyHistory?.length > 0),
      familyConditions: patientData?.familyHistory || []
    },
    
    currentMedications: {
      hasMedications: !!(patientData?.currentMedications?.length > 0),
      medicationsList: patientData?.currentMedications || [],
      hasAllergies: !!(patientData?.allergies?.length > 0),
      allergiesList: patientData?.allergies || []
    },
    
    currentSymptoms: {
      hasChiefComplaint: !!clinicalData?.chiefComplaint,
      chiefComplaint: clinicalData?.chiefComplaint || "",
      hasSymptomsList: !!(clinicalData?.symptoms?.length > 0),
      symptomsList: clinicalData?.symptoms || [],
      hasDuration: !!clinicalData?.symptomDuration,
      duration: clinicalData?.symptomDuration,
      hasPainScale: !!clinicalData?.painScale,
      painLevel: clinicalData?.painScale
    },
    
    vitalSigns: {
      hasBloodPressure: !!clinicalData?.vitalSigns?.bloodPressure,
      hasHeartRate: !!clinicalData?.vitalSigns?.heartRate,
      hasTemperature: !!clinicalData?.vitalSigns?.temperature,
      hasRespiratoryRate: !!clinicalData?.vitalSigns?.respiratoryRate,
      hasOxygenSaturation: !!clinicalData?.vitalSigns?.oxygenSaturation,
      values: clinicalData?.vitalSigns || {}
    },
    
    lifestyle: {
      hasSmokingStatus: !!patientData?.smokingStatus,
      hasAlcoholConsumption: !!patientData?.alcoholConsumption,
      hasExerciseLevel: !!patientData?.exerciseLevel,
      smokingStatus: patientData?.smokingStatus,
      alcoholConsumption: patientData?.alcoholConsumption
    },
    
    physicalExam: {
      hasExamResults: !!clinicalData?.physicalExam,
      examFindings: clinicalData?.physicalExam
    }
  }
  
  return knownInfo
}

// === GÉNÉRATION IA INTELLIGENTE ===
async function generateIntelligentQuestionsWithAI(patientData: any, clinicalData: any, knownInfo: any) {
  const prompt = buildIntelligentPrompt(patientData, clinicalData, knownInfo)

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt,
    temperature: 0.3, // Plus déterministe pour éviter répétitions
    maxTokens: 2500,
  })

  try {
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      let aiQuestions = JSON.parse(jsonMatch[0])
      
      // Filtrer les questions redondantes par sécurité
      aiQuestions = filterRedundantQuestions(aiQuestions, knownInfo)
      
      // Ajouter questions d'approfondissement si nécessaire
      if (aiQuestions.length < 6) {
        const deepDiveQuestions = generateDeepDiveQuestions(patientData, clinicalData, knownInfo)
        const additionalQuestions = deepDiveQuestions.slice(0, 8 - aiQuestions.length)
        aiQuestions.push(...additionalQuestions)
      }
      
      return aiQuestions.slice(0, 8)
    }
  } catch (parseError) {
    console.log("⚠️ Erreur parsing questions IA, utilisation fallback intelligent")
  }

  // Fallback vers questions d'approfondissement
  return generateIntelligentFallbackQuestions(patientData, clinicalData, knownInfo)
}

// === PROMPT OPTIMISÉ ANTI-REDONDANCE ===
function buildIntelligentPrompt(patientData: any, clinicalData: any, knownInfo: any): string {
  let prompt = `En tant que médecin expert, vous disposez des informations complètes suivantes sur ce patient.

🚫 INFORMATIONS DÉJÀ CONNUES (NE JAMAIS REPOSER CES QUESTIONS) :

=== DONNÉES DÉMOGRAPHIQUES DISPONIBLES ===`

  if (knownInfo.demographics.hasAge) prompt += `\n✓ Âge: ${patientData.age} ans`
  if (knownInfo.demographics.hasGender) prompt += `\n✓ Sexe: ${patientData.gender}`
  if (knownInfo.demographics.hasBMI) prompt += `\n✓ Poids/Taille: ${patientData.weight}kg / ${patientData.height}cm`

  prompt += `\n\n=== ANTÉCÉDENTS MÉDICAUX CONNUS ===`
  if (knownInfo.medicalHistory.hasAntecedents) {
    prompt += `\n✓ Antécédents: ${knownInfo.medicalHistory.specificConditions.join(', ')}`
  }
  if (knownInfo.medicalHistory.hasFamilyHistory) {
    prompt += `\n✓ Antécédents familiaux: ${knownInfo.medicalHistory.familyConditions.join(', ')}`
  }

  prompt += `\n\n=== TRAITEMENTS ACTUELS CONNUS ===`
  if (knownInfo.currentMedications.hasMedications) {
    prompt += `\n✓ Médicaments: ${knownInfo.currentMedications.medicationsList.join(', ')}`
  }
  if (knownInfo.currentMedications.hasAllergies) {
    prompt += `\n✓ Allergies: ${knownInfo.currentMedications.allergiesList.join(', ')}`
  }

  prompt += `\n\n=== SYMPTÔMES ACTUELS DÉJÀ DÉCRITS ===`
  if (knownInfo.currentSymptoms.hasChiefComplaint) {
    prompt += `\n✓ Motif principal: ${knownInfo.currentSymptoms.chiefComplaint}`
  }
  if (knownInfo.currentSymptoms.hasSymptomsList) {
    prompt += `\n✓ Symptômes: ${knownInfo.currentSymptoms.symptomsList.join(', ')}`
  }
  if (knownInfo.currentSymptoms.hasDuration) {
    prompt += `\n✓ Durée: ${knownInfo.currentSymptoms.duration}`
  }
  if (knownInfo.currentSymptoms.hasPainScale) {
    prompt += `\n✓ Échelle douleur: ${knownInfo.currentSymptoms.painLevel}/10`
  }

  prompt += `\n\n=== SIGNES VITAUX DISPONIBLES ===`
  if (knownInfo.vitalSigns.hasBloodPressure) {
    prompt += `\n✓ Tension: ${knownInfo.vitalSigns.values.bloodPressure}`
  }
  if (knownInfo.vitalSigns.hasHeartRate) {
    prompt += `\n✓ Fréquence cardiaque: ${knownInfo.vitalSigns.values.heartRate} bpm`
  }
  if (knownInfo.vitalSigns.hasTemperature) {
    prompt += `\n✓ Température: ${knownInfo.vitalSigns.values.temperature}°C`
  }

  prompt += `\n\n=== HABITUDES DE VIE CONNUES ===`
  if (knownInfo.lifestyle.hasSmokingStatus) {
    prompt += `\n✓ Tabac: ${knownInfo.lifestyle.smokingStatus}`
  }
  if (knownInfo.lifestyle.hasAlcoholConsumption) {
    prompt += `\n✓ Alcool: ${knownInfo.lifestyle.alcoholConsumption}`
  }

  prompt += `\n\n🎯 MISSION EXPERTE - GÉNÉRATION QUESTIONS D'APPROFONDISSEMENT :

Générez 6-8 questions d'APPROFONDISSEMENT INTELLIGENT qui :

🚫 NE REPOSENT JAMAIS les informations déjà connues ci-dessus
✅ CREUSENT plus profondément dans les détails
✅ EXPLORENT les caractéristiques fines des symptômes
✅ RECHERCHENT les facteurs déclenchants/aggravants
✅ ÉVALUENT l'impact fonctionnel précis
✅ COMPARENT avec épisodes antérieurs si applicable
✅ EXPLORENT le contexte environnemental
✅ AIDENT le médecin à affiner son diagnostic différentiel

TYPES DE QUESTIONS ATTENDUES :
- Chronologie précise et évolution heure par heure
- Irradiation et caractéristiques topographiques
- Facteurs déclenchants, aggravants, et soulageants
- Impact sur activités quotidiennes spécifiques
- Surveillance et auto-évaluation du patient
- Comparaison avec épisodes similaires antérieurs
- Contexte psychosocial et environnemental
- Signes associés non encore mentionnés

FORMAT JSON OBLIGATOIRE :
[
  {
    "id": 1,
    "question": "Question d'approfondissement précise et pointue",
    "type": "multiple_choice|yes_no|scale|text",
    "options": ["Option 1", "Option 2", "Option 3"] // si multiple_choice uniquement
    "category": "symptom_characterization|trigger_identification|functional_impact|timeline_precision|comparative_analysis|environmental_context",
    "rationale": "Explication médicale précise de pourquoi cette question aide au diagnostic",
    "priority": "high|medium|low",
    "specificity": "Spécifique au profil de ce patient"
  }
]

EXEMPLES CONTEXTUELS SELON LES DONNÉES :
`

  // Ajouter des exemples selon le contexte patient
  if (knownInfo.currentSymptoms.chiefComplaint.toLowerCase().includes('douleur')) {
    prompt += `\n- "Cette douleur irradie-t-elle vers une zone précise ?"`
    prompt += `\n- "Qu'est-ce qui déclenche ou soulage cette douleur ?"`
  }
  
  if (knownInfo.currentMedications.hasMedications) {
    prompt += `\n- "Avez-vous modifié récemment la posologie d'un traitement ?"`
    prompt += `\n- "Ressentez-vous des effets de vos médicaments ?"`
  }
  
  if (knownInfo.medicalHistory.hasAntecedents) {
    prompt += `\n- "Ces symptômes ressemblent-ils à des épisodes que vous avez déjà vécus ?"`
  }

  prompt += `\n\n❌ INTERDICTIONS ABSOLUES :
- Reposer des questions sur l'âge, le sexe, le poids
- Redemander les antécédents médicaux déjà listés
- Reposer la question des médicaments actuels
- Redemander le motif de consultation principal
- Reposer les questions sur les symptômes déjà décrits
- Redemander les habitudes de vie déjà connues
- Questions génériques sans lien avec le profil patient

✅ PRIORITÉ AUX QUESTIONS QUI CHANGENT LE DIAGNOSTIC !`

  return prompt
}

// === GÉNÉRATION QUESTIONS D'APPROFONDISSEMENT ===
function generateDeepDiveQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  const questions = []
  let questionId = 1

  // === APPROFONDISSEMENT SYMPTÔMES ===
  if (knownInfo.currentSymptoms.hasChiefComplaint) {
    const complaint = knownInfo.currentSymptoms.chiefComplaint.toLowerCase()
    
    // Douleur
    if (complaint.includes('douleur') || complaint.includes('mal')) {
      questions.push({
        id: questionId++,
        question: "Cette douleur irradie-t-elle vers d'autres parties du corps ? Si oui, précisez lesquelles.",
        type: "text",
        category: "symptom_characterization",
        rationale: "Cartographie de l'irradiation pour diagnostic différentiel",
        priority: "high",
        specificity: "Adapté aux symptômes douloureux du patient"
      })
      
      questions.push({
        id: questionId++,
        question: "Qu'est-ce qui déclenche, aggrave ou soulage cette douleur ?",
        type: "multiple_choice",
        options: ["Mouvement", "Effort physique", "Stress", "Alimentation", "Position allongée", "Repos", "Chaleur", "Froid"],
        category: "trigger_identification",
        rationale: "Identification des facteurs déclenchants pour orientation diagnostique",
        priority: "high",
        specificity: "Facteurs spécifiques à la douleur décrite"
      })
    }
    
    // Essoufflement
    if (complaint.includes('essoufflement') || complaint.includes('dyspnée') || complaint.includes('souffle')) {
      questions.push({
        id: questionId++,
        question: "À quel niveau d'effort apparaît cet essoufflement ?",
        type: "multiple_choice",
        options: ["Au repos complet", "En parlant", "En marchant lentement", "En montant les escaliers", "Uniquement effort intense"],
        category: "functional_impact",
        rationale: "Classification fonctionnelle NYHA pour évaluation cardiorespiratoire",
        priority: "high",
        specificity: "Évaluation précise de la dyspnée décrite"
      })
    }
    
    // Fièvre
    if (complaint.includes('fièvre') || complaint.includes('température')) {
      questions.push({
        id: questionId++,
        question: "Comment évoluent vos pics de fièvre dans la journée ? Y a-t-il un pattern particulier ?",
        type: "text",
        category: "timeline_precision",
        rationale: "Pattern fébrile pour orientation étiologique",
        priority: "medium",
        specificity: "Caractérisation de la fièvre mentionnée"
      })
    }
  }

  // === APPROFONDISSEMENT MÉDICAMENTS ===
  if (knownInfo.currentMedications.hasMedications) {
    questions.push({
      id: questionId++,
      question: "Avez-vous récemment modifié, arrêté ou oublié de prendre un de vos médicaments habituels ?",
      type: "yes_no",
      category: "medication_compliance",
      rationale: "Modifications thérapeutiques pouvant expliquer décompensation",
      priority: "high",
      specificity: "Spécifique aux médicaments listés du patient"
    })
    
    // Questions spécifiques selon types de médicaments
    const medications = knownInfo.currentMedications.medicationsList.join(' ').toLowerCase()
    
    if (medications.includes('tension') || medications.includes('hypertension') || medications.includes('amlodipine') || medications.includes('enalapril')) {
      questions.push({
        id: questionId++,
        question: "Contrôlez-vous votre tension artérielle à domicile ? Si oui, quels sont vos derniers chiffres ?",
        type: "text",
        category: "monitoring_assessment",
        rationale: "Auto-surveillance tensionnelle pour ajustement thérapeutique",
        priority: "medium",
        specificity: "Patient sous traitement antihypertenseur"
      })
    }
    
    if (medications.includes('diabète') || medications.includes('metformine') || medications.includes('insuline')) {
      questions.push({
        id: questionId++,
        question: "Avez-vous remarqué des variations inhabituelles de votre glycémie en lien avec vos symptômes actuels ?",
        type: "multiple_choice",
        options: ["Glycémies plus hautes que d'habitude", "Glycémies plus basses", "Très variables", "Normales", "Je ne contrôle pas régulièrement"],
        category: "disease_monitoring",
        rationale: "Contrôle glycémique en relation avec symptômes actuels",
        priority: "high",
        specificity: "Patient diabétique sous traitement"
      })
    }
  }

  // === APPROFONDISSEMENT ANTÉCÉDENTS ===
  if (knownInfo.medicalHistory.hasAntecedents) {
    questions.push({
      id: questionId++,
      question: "Vos symptômes actuels ressemblent-ils à des épisodes antérieurs que vous avez déjà vécus ? Qu'est-ce qui est différent cette fois ?",
      type: "text",
      category: "comparative_analysis",
      rationale: "Comparaison avec épisodes antérieurs pour diagnostic différentiel",
      priority: "medium",
      specificity: "Basé sur les antécédents médicaux connus"
    })
  }

  // === QUESTIONS CONTEXTUELLES AVANCÉES ===
  
  // Chronologie précise
  questions.push({
    id: questionId++,
    question: "Si vous deviez décrire l'évolution de vos symptômes depuis leur tout début, comment ont-ils progressé ?",
    type: "multiple_choice",
    options: ["Apparition brutale et stable", "Progression graduelle", "Par crises avec accalmies", "Aggravation constante", "Amélioration puis rechute"],
    category: "timeline_precision",
    rationale: "Cinétique d'évolution pour orientation diagnostique",
    priority: "high",
    specificity: "Évolution spécifique aux symptômes du patient"
  })
  
  // Impact fonctionnel précis
  questions.push({
    id: questionId++,
    question: "Quelle activité quotidienne spécifique ne pouvez-vous plus réaliser normalement à cause de ces symptômes ?",
    type: "text",
    category: "functional_impact",
    rationale: "Évaluation du retentissement fonctionnel pour gradation",
    priority: "medium",
    specificity: "Impact personnalisé selon le profil patient"
  })
  
  // Facteurs environnementaux
  questions.push({
    id: questionId++,
    question: "Y a-t-il eu des changements récents dans votre environnement ou votre mode de vie ?",
    type: "multiple_choice",
    options: ["Nouveau domicile/travail", "Stress familial/professionnel", "Changement alimentaire", "Voyage récent", "Contact avec personne malade", "Rien de particulier"],
    category: "environmental_context",
    rationale: "Facteurs environnementaux déclenchants ou aggravants",
    priority: "medium",
    specificity: "Contexte environnemental du patient"
  })

  return questions
}

// === FALLBACK INTELLIGENT ===
function generateIntelligentFallbackQuestions(patientData: any, clinicalData: any, knownInfo: any) {
  const questions = generateDeepDiveQuestions(patientData, clinicalData, knownInfo)
  
  // Ajouter quelques questions générales d'approfondissement si nécessaire
  const generalQuestions = [
    {
      id: questions.length + 1,
      question: "Vos symptômes suivent-ils un pattern particulier dans la journée (matin, soir, nuit) ?",
      type: "multiple_choice",
      options: ["Plus intenses le matin", "Plus intenses le soir", "Pires la nuit", "Variables dans la journée", "Pas de pattern particulier"],
      category: "timeline_precision",
      rationale: "Rythme circadien des symptômes pour orientation diagnostique",
      priority: "medium",
      specificity: "Pattern temporel général"
    },
    {
      id: questions.length + 2,
      question: "Comment évaluez-vous votre qualité de sommeil depuis le début de ces symptômes ?",
      type: "multiple_choice",
      options: ["Très perturbé", "Légèrement perturbé", "Inchangé", "Plutôt amélioré"],
      category: "functional_impact",
      rationale: "Impact sur sommeil pour évaluation globale",
      priority: "low",
      specificity: "Retentissement général sur sommeil"
    }
  ]
  
  // Limiter à 8 questions max
  return [...questions, ...generalQuestions].slice(0, 8)
}

// === FILTRAGE ANTI-REDONDANCE ===
function filterRedundantQuestions(questions: any[], knownInfo: any) {
  return questions.filter(question => {
    const questionText = question.question.toLowerCase()
    
    // Mots-clés à éviter selon les données connues
    const redundantPatterns = [
      // Démographie
      ...(knownInfo.demographics.hasAge ? ['âge', 'age', 'ans'] : []),
      ...(knownInfo.demographics.hasGender ? ['sexe', 'femme', 'homme', 'genre'] : []),
      
      // Médicaments
      ...(knownInfo.currentMedications.hasMedications ? ['quels médicaments', 'médicaments que vous prenez', 'que prenez-vous'] : []),
      
      // Symptômes principaux
      ...(knownInfo.currentSymptoms.hasChiefComplaint ? ['motif de consultation', 'pourquoi consultez', 'quel est votre problème'] : []),
      
      // Antécédents
      ...(knownInfo.medicalHistory.hasAntecedents ? ['quels antécédents', 'avez-vous des antécédents'] : []),
      
      // Habitudes de vie
      ...(knownInfo.lifestyle.hasSmokingStatus ? ['fumez-vous', 'tabac', 'cigarette'] : []),
      ...(knownInfo.lifestyle.hasAlcoholConsumption ? ['buvez-vous', 'alcool', 'consommation'] : [])
    ]
    
    // Vérifier redondance
    const isRedundant = redundantPatterns.some(pattern => 
      questionText.includes(pattern.toLowerCase())
    )
    
    return !isRedundant
  })
}

// === POST-TRAITEMENT ===
function postProcessQuestions(questions: any[], knownInfo: any) {
  // 1. Filtrer redondance finale
  let processedQuestions = filterRedundantQuestions(questions, knownInfo)
  
  // 2. Trier par priorité
  processedQuestions = processedQuestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2)
  })
  
  // 3. Assurer diversité des catégories
  const categories = new Set()
  processedQuestions = processedQuestions.filter(q => {
    if (categories.size < 6 && !categories.has(q.category)) {
      categories.add(q.category)
      return true
    }
    return categories.has(q.category) && categories.size >= 6
  })
  
  // 4. Limiter à 8 questions max
  return processedQuestions.slice(0, 8)
}

// === UTILITAIRES ===
function calculateAveragePriority(questions: any[]) {
  const priorityValues = { high: 3, medium: 2, low: 1 }
  const total = questions.reduce((sum, q) => sum + (priorityValues[q.priority] || 2), 0)
  return (total / questions.length).toFixed(1)
}

function safeJoin(value: any, separator = ", "): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.join(separator)
  if (typeof value === "string") return value
  return String(value)
}
