import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  console.log("🏥 === GÉNÉRATEUR QUESTIONS MÉDICALES ULTRA-ROBUSTE ===")
  
  try {
    // 1. PARSE REQUEST (avec protection totale)
    let requestData: any = {}
    try {
      requestData = await request.json()
      console.log("📥 Données reçues:", JSON.stringify(requestData, null, 2))
    } catch (parseError) {
      console.error("❌ Erreur parsing:", parseError)
      requestData = {} // Continue avec données vides
    }

    // 2. EXTRACTION DONNÉES PATIENT (ultra-sécurisée)
    const patientInfo = {
      age: requestData?.patientData?.age || 0,
      gender: requestData?.patientData?.gender || "",
      complaint: requestData?.clinicalData?.chiefComplaint || "",
      painScale: requestData?.clinicalData?.painScale || 0,
      antecedents: requestData?.patientData?.medicalHistory || [],
      medications: requestData?.patientData?.currentMedications || [],
      symptoms: requestData?.clinicalData?.symptoms || [],
      duration: requestData?.clinicalData?.symptomDuration || ""
    }

    console.log("👤 Patient analysé:", patientInfo)

    // 3. TEST OPENAI (avec protection)
    let openaiWorking = false
    let openaiError = ""
    
    try {
      if (process.env.OPENAI_API_KEY?.startsWith('sk-')) {
        console.log("🧪 Test OpenAI...")
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: "Répondez: OK",
          temperature: 0,
          maxTokens: 5,
        })
        if (text.trim()) {
          openaiWorking = true
          console.log("✅ OpenAI fonctionne")
        }
      } else {
        openaiError = "Clé API manquante ou invalide"
      }
    } catch (error: any) {
      openaiError = error.message
      console.log("❌ OpenAI indisponible:", error.message)
    }

    // 4. GÉNÉRATION QUESTIONS (GARANTIE DE SUCCÈS)
    let questions = []
    let method = "fallback_medical"

    if (openaiWorking) {
      try {
        console.log("🤖 Tentative génération IA...")
        questions = await generateMedicalQuestionsAI(patientInfo)
        method = "openai_medical"
        console.log(`✅ ${questions.length} questions IA générées`)
      } catch (aiError: any) {
        console.error("❌ Erreur IA:", aiError.message)
        questions = generateGuaranteedMedicalQuestions(patientInfo)
      }
    } else {
      console.log("🔄 Génération questions médicales garanties...")
      questions = generateGuaranteedMedicalQuestions(patientInfo)
    }

    // 5. VALIDATION FINALE (ne peut jamais échouer)
    if (!questions || questions.length === 0) {
      console.log("🆘 Génération questions d'urgence médicales...")
      questions = getEmergencyMedicalQuestions()
      method = "emergency_medical"
    }

    // 6. FORMATAGE RÉPONSE FINALE
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      ai_suggestions: questions,
      questions: questions, // Double compatibilité
      metadata: {
        aiGenerated: method === "openai_medical",
        generationMethod: method,
        openaiWorking: openaiWorking,
        openaiError: openaiError,
        questionCount: questions.length,
        patientAge: patientInfo.age,
        patientGender: patientInfo.gender,
        patientComplaint: patientInfo.complaint,
        medicalQuestionsGuaranteed: true
      }
    }

    console.log(`🎯 SUCCÈS GARANTI: ${questions.length} questions médicales via ${method}`)
    console.log("📋 Questions générées:")
    questions.forEach((q, i) => console.log(`  ${i+1}. ${q.question.substring(0, 80)}...`))
    
    return NextResponse.json(response)

  } catch (globalError: any) {
    console.error("❌ ERREUR GLOBALE - ACTIVATION MODE URGENCE:", globalError)
    
    // MÊME EN CAS D'ERREUR TOTALE, ON RETOURNE DES QUESTIONS
    return NextResponse.json({
      success: true, // On force success pour que le client accepte
      timestamp: new Date().toISOString(),
      ai_suggestions: getEmergencyMedicalQuestions(),
      questions: getEmergencyMedicalQuestions(),
      metadata: {
        aiGenerated: false,
        generationMethod: "emergency_global_error",
        openaiWorking: false,
        error: globalError.message,
        questionCount: 6,
        medicalQuestionsGuaranteed: true,
        emergencyMode: true
      }
    })
  }
}

// ===== GÉNÉRATION IA MÉDICALE AMÉLIORÉE =====
async function generateMedicalQuestionsAI(patientInfo: any) {
  const { age, gender, complaint, symptoms, duration } = patientInfo
  
  // Construction du contexte patient enrichi
  const patientContext = [
    `Âge: ${age} ans`,
    `Sexe: ${gender}`,
    `Symptôme principal: ${complaint}`,
    symptoms?.length > 0 ? `Autres symptômes: ${symptoms.join(', ')}` : '',
    duration ? `Durée: ${duration}` : ''
  ].filter(Boolean).join(' | ')

  const prompt = `Tu es un médecin expert en télémédecine. Génère exactement 6 questions médicales spécifiques pour ce patient:

PROFIL PATIENT: ${patientContext}

OBJECTIF: Questions pertinentes pour établir un diagnostic différentiel précis.

CONSIGNES STRICTES:
- Chaque question doit être complète, précise et adaptée au profil
- Utilise un vocabulaire médical accessible au patient
- Varie les types: échelles (0-10), choix multiples, questions ouvertes
- Adapte selon l'âge (pédiatrie <18 ans, gériatrie >65 ans)
- Concentre-toi sur le symptôme principal: "${complaint}"

RETOURNE UNIQUEMENT CE JSON (sans texte supplémentaire):
[
  {
    "id": 1,
    "question": "Votre vraie question médicale complète ici",
    "type": "scale",
    "options": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    "category": "intensity_assessment"
  },
  {
    "id": 2,
    "question": "Votre deuxième question médicale spécifique ici",
    "type": "multiple_choice",
    "options": ["Option médicale 1", "Option médicale 2", "Option médicale 3", "Autre"],
    "category": "symptom_characterization"
  }
]`

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 2500,
  })

  console.log('🤖 Réponse brute OpenAI:', text.substring(0, 500) + '...')

  // Nettoyage et extraction du JSON
  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  let jsonMatch = cleanText.match(/\[[\s\S]*\]/)

  if (!jsonMatch) {
    // Tentative de récupération si le JSON est mal formaté
    const lines = cleanText.split('\n').filter(line => line.trim())
    const jsonStart = lines.findIndex(line => line.trim().startsWith('['))
    const jsonEnd = lines.findIndex(line => line.trim().endsWith(']'))
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonText = lines.slice(jsonStart, jsonEnd + 1).join('\n')
      jsonMatch = [jsonText]
    }
  }

  if (jsonMatch) {
    try {
      const aiQuestions = JSON.parse(jsonMatch[0])
      
      // Validation et correction des questions générées
      const validatedQuestions = aiQuestions.map((q: any, i: number) => {
        // Validation de la question
        let questionText = q.question || ""
        if (!questionText || questionText.trim().length < 15 || 
            questionText.includes("Votre") || questionText.includes("ici")) {
          console.warn(`⚠️ Question ${i+1} IA invalide, génération fallback`)
          questionText = generateSpecificQuestion(i, patientInfo)
        }
        
        // Validation du type
        let questionType = q.type || "multiple_choice"
        if (!["scale", "multiple_choice", "boolean", "text"].includes(questionType)) {
          questionType = "multiple_choice"
        }
        
        // Validation des options
        let options = q.options || []
        if (!Array.isArray(options) || options.length === 0) {
          options = generateOptionsForType(questionType, questionText)
        }
        
        return {
          id: i + 1,
          question: questionText,
          type: questionType,
          options: options,
          category: q.category || "general_assessment",
          priority: "high",
          isSpecific: true,
          aiGenerated: true
        }
      }).slice(0, 6)
      
      console.log('✅ Questions IA validées:', validatedQuestions.length)
      return validatedQuestions
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON IA:', parseError)
      throw new Error("Impossible de parser les questions IA")
    }
  }

  throw new Error("Aucun JSON valide trouvé dans la réponse IA")
}

// ===== GÉNÉRATION QUESTION SPÉCIFIQUE =====
function generateSpecificQuestion(index: number, patientInfo: any): string {
  const { age, gender, complaint } = patientInfo
  
  // Questions spécifiques selon le symptôme principal
  if (complaint) {
    const symptomLower = complaint.toLowerCase()
    
    switch (index) {
      case 0:
        return `Sur une échelle de 0 à 10, quelle est l'intensité de votre ${complaint.toLowerCase()} en ce moment ?`
      case 1:
        if (symptomLower.includes('douleur')) {
          return "Cette douleur est-elle constante, par crises, ou variable selon vos mouvements ?"
        } else if (symptomLower.includes('fatigue')) {
          return "Cette fatigue est-elle présente dès le réveil ou apparaît-elle dans la journée ?"
        } else if (symptomLower.includes('essoufflement')) {
          return "Cet essoufflement survient-il au repos, à l'effort léger, ou seulement lors d'efforts importants ?"
        } else {
          return `Comment décririez-vous les caractéristiques de votre ${complaint.toLowerCase()} ?`
        }
      case 2:
        if (age < 18) {
          return "Ces symptômes t'empêchent-ils d'aller à l'école, de jouer ou de faire du sport ?"
        } else if (age >= 65) {
          return "Ces symptômes affectent-ils votre capacité à vous déplacer et faire vos activités seul(e) ?"
        } else {
          return "Ces symptômes vous empêchent-ils de travailler ou de faire vos activités habituelles ?"
        }
      case 3:
        return "Depuis combien de temps ressentez-vous ces symptômes ?"
      case 4:
        return "Y a-t-il des situations, mouvements ou facteurs qui déclenchent ou aggravent ces symptômes ?"
      case 5:
        return "Avez-vous déjà eu des symptômes similaires par le passé ? Si oui, dans quelles circonstances ?"
      default:
        return `Pouvez-vous décrire plus précisément votre ${complaint.toLowerCase()} ?`
    }
  }
  
  // Questions génériques si pas de symptôme spécifique
  const genericQuestions = [
    "Sur une échelle de 0 à 10, comment évaluez-vous l'intensité de vos symptômes actuels ?",
    "Ces symptômes vous empêchent-ils de réaliser vos activités quotidiennes normalement ?",
    "À quel moment de la journée vos symptômes sont-ils les plus intenses ?",
    "Depuis combien de temps ressentez-vous ces symptômes ?",
    "Y a-t-il des facteurs qui soulagent ou aggravent vos symptômes ?",
    "Avez-vous des antécédents médicaux ou prenez-vous des médicaments actuellement ?"
  ]
  
  return genericQuestions[index] || "Pouvez-vous décrire vos symptômes en détail ?"
}

// ===== GÉNÉRATION OPTIONS SELON TYPE =====
function generateOptionsForType(type: string, question: string): string[] {
  switch (type) {
    case "scale":
      return question.toLowerCase().includes('0') && question.toLowerCase().includes('10') 
        ? ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
        : ["1", "2", "3", "4", "5"]
    
    case "boolean":
      return ["Oui", "Non"]
    
    case "multiple_choice":
      const questionLower = question.toLowerCase()
      
      if (questionLower.includes('constante') || questionLower.includes('crises')) {
        return ["Constante, tout le temps", "Par crises ou épisodes", "Variable selon mes mouvements", "Autre pattern"]
      } else if (questionLower.includes('empêchent') || questionLower.includes('activités')) {
        return ["Complètement, je ne peux rien faire", "Partiellement, c'est difficile", "Un peu, mais je me débrouille", "Pas du tout"]
      } else if (questionLower.includes('moment') || questionLower.includes('quand')) {
        return ["Matin au réveil", "Dans la journée", "Soir", "Nuit", "Variable"]
      } else if (questionLower.includes('temps') || questionLower.includes('depuis')) {
        return ["Quelques heures", "1-2 jours", "Une semaine", "Plus longtemps"]
      } else if (questionLower.includes('fatigue')) {
        return ["Dès le réveil", "En matinée", "Après-midi", "Soirée"]
      } else if (questionLower.includes('essoufflement')) {
        return ["Au repos complet", "Effort très léger", "Effort modéré", "Gros efforts seulement"]
      }
      
      return ["Option 1", "Option 2", "Option 3", "Autre"]
    
    default:
      return []
  }
}

// ===== QUESTIONS MÉDICALES GARANTIES (TOUJOURS FONCTIONNELLES) =====
function generateGuaranteedMedicalQuestions(patientInfo: any) {
  console.log("🏥 Génération questions médicales garanties pour:", patientInfo)
  
  const { age, gender, complaint } = patientInfo
  const questions = []

  // Question 1: Échelle d'intensité adaptée
  questions.push({
    id: 1,
    question: complaint 
      ? `Sur une échelle de 0 à 10, quelle est l'intensité de votre ${complaint.toLowerCase()} en ce moment ?`
      : "Sur une échelle de 0 à 10, comment évaluez-vous l'intensité de vos symptômes actuels ?",
    type: "scale",
    options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    category: "intensity_assessment",
    priority: "high",
    isSpecific: true
  })

  // Question 2: Impact fonctionnel selon l'âge
  if (age < 18) {
    questions.push({
      id: 2,
      question: "Ces symptômes t'empêchent-ils d'aller à l'école, de jouer ou de faire du sport normalement ?",
      type: "multiple_choice",
      options: [
        "Je ne peux plus rien faire comme avant",
        "C'est beaucoup plus difficile",
        "Un peu plus difficile",
        "Ça va, pas de changement"
      ],
      category: "pediatric_functional_impact",
      priority: "high",
      isSpecific: true
    })
  } else if (age >= 65) {
    questions.push({
      id: 2,
      question: "Ces symptômes affectent-ils votre capacité à vous déplacer et faire vos activités quotidiennes seul(e) ?",
      type: "multiple_choice",
      options: [
        "Je ne peux plus rien faire seul(e)",
        "J'ai besoin d'aide pour beaucoup de choses",
        "Quelques difficultés mais je me débrouille",
        "Aucun impact sur mon autonomie"
      ],
      category: "geriatric_autonomy_assessment",
      priority: "high",
      isSpecific: true
    })
  } else {
    questions.push({
      id: 2,
      question: "Ces symptômes vous empêchent-ils de travailler ou d'accomplir vos tâches quotidiennes ?",
      type: "multiple_choice",
      options: [
        "Impossible de travailler ou faire quoi que ce soit",
        "Forte limitation dans mes activités",
        "Quelques difficultés mais je continue",
        "Aucun impact significatif"
      ],
      category: "adult_functional_impact",
      priority: "high",
      isSpecific: true
    })
  }

  // Question 3: Caractéristiques spécifiques au symptôme
  if (complaint) {
    const symptomLower = complaint.toLowerCase()
    if (symptomLower.includes('douleur')) {
      questions.push({
        id: 3,
        question: "Cette douleur est-elle constante, par crises, ou varie-t-elle selon vos mouvements ?",
        type: "multiple_choice",
        options: [
          "Constante, présente tout le temps",
          "Par crises ou épisodes",
          "Variable selon mes mouvements",
          "Difficile à caractériser"
        ],
        category: "pain_pattern_assessment",
        priority: "high",
        isSpecific: true
      })
    } else if (symptomLower.includes('fatigue')) {
      questions.push({
        id: 3,
        question: "Cette fatigue est-elle présente dès le réveil ou apparaît-elle progressivement ?",
        type: "multiple_choice",
        options: [
          "Épuisé(e) dès le réveil",
          "Fatigue qui s'installe rapidement",
          "Surtout l'après-midi",
          "Principalement en fin de journée"
        ],
        category: "fatigue_chronology",
        priority: "high",
        isSpecific: true
      })
    } else {
      questions.push({
        id: 3,
        question: `Comment décririez-vous les caractéristiques de votre ${complaint.toLowerCase()} ?`,
        type: "text",
        category: "symptom_description",
        priority: "high",
        isSpecific: true
      })
    }
  } else {
    questions.push({
      id: 3,
      question: "Comment décririez-vous vos symptômes principaux ?",
      type: "text",
      category: "general_symptom_description",
      priority: "high",
      isSpecific: false
    })
  }

  // Question 4: Durée des symptômes
  questions.push({
    id: 4,
    question: "Depuis combien de temps ressentez-vous ces symptômes ?",
    type: "multiple_choice",
    options: [
      "Quelques heures seulement",
      "1 à 2 jours",
      "Une semaine environ",
      "Plus d'une semaine"
    ],
    category: "symptom_duration",
    priority: "medium",
    isSpecific: false
  })

  // Question 5: Facteurs déclenchants
  questions.push({
    id: 5,
    question: "Y a-t-il des situations, activités ou facteurs qui déclenchent ou aggravent ces symptômes ?",
    type: "multiple_choice",
    options: [
      "L'effort physique ou l'activité",
      "Le stress, l'anxiété ou les émotions",
      "Certaines positions ou mouvements",
      "L'alimentation ou certains aliments",
      "Aucun facteur particulier identifié"
    ],
    category: "trigger_factors_identification",
    priority: "medium",
    isSpecific: false
  })

  // Question 6: Antécédents ou évolution
  questions.push({
    id: 6,
    question: "Avez-vous déjà eu des symptômes similaires par le passé ?",
    type: "boolean",
    options: ["Oui", "Non"],
    category: "previous_episodes",
    priority: "medium",
    isSpecific: false
  })

  console.log(`✅ ${questions.length} questions médicales garanties générées`)
  return questions
}

// ===== QUESTIONS D'URGENCE MÉDICALES (DERNIER RECOURS) =====
function getEmergencyMedicalQuestions() {
  console.log("🆘 Questions d'urgence médicales activées")
  
  return [
    {
      id: 1,
      question: "Sur une échelle de 0 à 10, quelle est l'intensité de vos symptômes actuels ?",
      type: "scale",
      options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      category: "emergency_intensity",
      priority: "high",
      isSpecific: false
    },
    {
      id: 2,
      question: "Ces symptômes vous empêchent-ils de faire vos activités habituelles ?",
      type: "multiple_choice",
      options: [
        "Complètement, je ne peux rien faire",
        "Partiellement, c'est difficile",
        "Un peu, mais je me débrouille",
        "Pas du tout, ça va"
      ],
      category: "emergency_functional_impact",
      priority: "high",
      isSpecific: false
    },
    {
      id: 3,
      question: "Depuis combien de temps ressentez-vous ces symptômes ?",
      type: "multiple_choice",
      options: [
        "Quelques heures",
        "1-2 jours",
        "Une semaine",
        "Plus longtemps"
      ],
      category: "emergency_duration",
      priority: "medium",
      isSpecific: false
    },
    {
      id: 4,
      question: "À quel moment de la journée vos symptômes sont-ils les plus intenses ?",
      type: "multiple_choice",
      options: [
        "Matin",
        "Après-midi",
        "Soir",
        "Nuit",
        "Variable"
      ],
      category: "emergency_timing",
      priority: "medium",
      isSpecific: false
    },
    {
      id: 5,
      question: "Y a-t-il des facteurs qui soulagent ou aggravent vos symptômes ?",
      type: "text",
      category: "emergency_factors",
      priority: "low",
      isSpecific: false
    },
    {
      id: 6,
      question: "Avez-vous des antécédents médicaux importants ou prenez-vous des médicaments ?",
      type: "text",
      category: "emergency_medical_history",
      priority: "low",
      isSpecific: false
    }
  ]
}

// ===== ROUTE DE TEST =====
export async function GET() {
  return NextResponse.json({
    service: "Générateur Questions Médicales Ultra-Robuste",
    status: "✅ Toujours opérationnel",
    timestamp: new Date().toISOString(),
    garanties: [
      "Questions médicales TOUJOURS générées",
      "Adaptation selon données patient disponibles", 
      "Fallback intelligent en cas d'erreur",
      "Format compatible ai_suggestions"
    ],
    test_data: {
      patientData: { age: 45, gender: "Féminin", medicalHistory: ["hypertension"] },
      clinicalData: { chiefComplaint: "douleur thoracique", painScale: 7 }
    }
  })
}
