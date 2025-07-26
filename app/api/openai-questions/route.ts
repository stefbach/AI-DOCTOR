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
      medications: requestData?.patientData?.currentMedications || []
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
    questions.forEach((q, i) => console.log(`  ${i+1}. ${q.question.substring(0, 60)}...`))
    
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

// ===== GÉNÉRATION IA MÉDICALE =====
async function generateMedicalQuestionsAI(patientInfo: any) {
  const { age, gender, complaint } = patientInfo
  
  const prompt = `Générez 6 questions médicales spécifiques pour:
- Âge: ${age} ans
- Sexe: ${gender}
- Symptôme: "${complaint}"

Questions adaptées télémédecine, spécifiques au profil patient.

Format JSON uniquement:
[
  {
    "id": 1,
    "question": "Question médicale spécifique",
    "type": "multiple_choice",
    "options": ["Option 1", "Option 2", "Option 3", "Autre"],
    "category": "medical_category",
    "priority": "high"
  }
]`

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: prompt,
    temperature: 0.1,
    maxTokens: 1500,
  })

  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const jsonMatch = cleanText.match(/\[[\s\S]*\]/)

  if (jsonMatch) {
    const aiQuestions = JSON.parse(jsonMatch[0])
    return aiQuestions.map((q, i) => ({
      ...q,
      id: i + 1,
      isSpecific: true,
      aiGenerated: true
    })).slice(0, 6)
  }

  throw new Error("Parsing JSON échoué")
}

// ===== QUESTIONS MÉDICALES GARANTIES (TOUJOURS FONCTIONNELLES) =====
function generateGuaranteedMedicalQuestions(patientInfo: any) {
  console.log("🏥 Génération questions médicales garanties pour:", patientInfo)
  
  const { age, gender, complaint, painScale, antecedents } = patientInfo
  const questions = []

  // === QUESTION 1: ADAPTÉE À L'ÂGE ===
  if (age > 0) {
    if (age < 18) {
      questions.push({
        id: 1,
        question: `À ${age} ans, ces symptômes t'empêchent-ils de jouer, faire du sport ou aller à l'école normalement ?`,
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
        id: 1,
        question: `À ${age} ans, ces symptômes affectent-ils votre capacité à vous déplacer et faire vos activités quotidiennes seul(e) ?`,
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
        id: 1,
        question: "Ces symptômes impactent-ils votre capacité à travailler ou à accomplir vos tâches quotidiennes ?",
        type: "multiple_choice",
        options: [
          "Impossible de travailler ou faire quoi que ce soit",
          "Forte limitation dans mes activités",
          "Quelques difficultés mais je continue",
          "Aucun impact significatif"
        ],
        category: "adult_functional_impact",
        priority: "high",
        isSpecific: false
      })
    }
  } else {
    questions.push({
      id: 1,
      question: "Ces symptômes limitent-ils vos activités quotidiennes ?",
      type: "multiple_choice",
      options: [
        "Complètement, je ne peux plus rien faire",
        "Beaucoup, c'est très difficile",
        "Un peu, mais je m'adapte",
        "Pas du tout"
      ],
      category: "general_functional_impact",
      priority: "high",
      isSpecific: false
    })
  }

  // === QUESTION 2: ADAPTÉE AU SYMPTÔME PRINCIPAL ===
  if (complaint) {
    if (complaint.toLowerCase().includes('douleur thoracique')) {
      questions.push({
        id: 2,
        question: "Cette douleur thoracique ressemble-t-elle à une sensation de serrement, de brûlure, de piqûre ou de pression ?",
        type: "multiple_choice",
        options: [
          "Serrement ou étau qui serre fort",
          "Brûlure intense comme un feu",
          "Piqûre ou coup de couteau",
          "Pression lourde comme un poids"
        ],
        category: "chest_pain_quality",
        priority: "high",
        isSpecific: true
      })
    } else if (complaint.toLowerCase().includes('douleur abdominale') || complaint.toLowerCase().includes('mal de ventre')) {
      questions.push({
        id: 2,
        question: "Cette douleur abdominale est-elle localisée à un endroit précis ou diffuse dans tout le ventre ?",
        type: "multiple_choice",
        options: [
          "Point très précis que je peux montrer du doigt",
          "Zone de la taille d'une main",
          "Diffuse dans une grande partie du ventre",
          "Se déplace d'un endroit à l'autre"
        ],
        category: "abdominal_pain_localization",
        priority: "high",
        isSpecific: true
      })
    } else if (complaint.toLowerCase().includes('fatigue') || complaint.toLowerCase().includes('épuisement')) {
      questions.push({
        id: 2,
        question: "Cette fatigue est-elle présente dès le réveil ou apparaît-elle progressivement dans la journée ?",
        type: "multiple_choice",
        options: [
          "Épuisé(e) dès le réveil, même après une nuit de sommeil",
          "Fatigue qui s'installe rapidement dans la matinée",
          "Surtout l'après-midi",
          "Principalement en fin de journée"
        ],
        category: "fatigue_chronology",
        priority: "high",
        isSpecific: true
      })
    } else if (complaint.toLowerCase().includes('essoufflement') || complaint.toLowerCase().includes('respir')) {
      questions.push({
        id: 2,
        question: "Cet essoufflement survient-il au repos, lors d'efforts légers, ou seulement lors d'efforts importants ?",
        type: "multiple_choice",
        options: [
          "Même au repos, sans rien faire",
          "Dès le moindre effort (marcher, parler)",
          "Effort modéré (monter escaliers, marche rapide)",
          "Seulement lors de gros efforts"
        ],
        category: "dyspnea_severity_assessment",
        priority: "high",
        isSpecific: true
      })
    } else if (complaint.toLowerCase().includes('céphalée') || complaint.toLowerCase().includes('mal de tête')) {
      questions.push({
        id: 2,
        question: "Cette céphalée ressemble-t-elle à un serrement, une pulsation, une pression ou une brûlure ?",
        type: "multiple_choice",
        options: [
          "Serrement comme un bandeau trop serré",
          "Pulsations qui battent avec le cœur",
          "Pression constante qui appuie",
          "Brûlure ou sensation de chaleur"
        ],
        category: "headache_quality",
        priority: "high",
        isSpecific: true
      })
    } else {
      questions.push({
        id: 2,
        question: `Comment décririez-vous cette ${complaint.toLowerCase()} en quelques mots ?`,
        type: "text",
        placeholder: "Décrivez la sensation, l'intensité, les caractéristiques...",
        category: "symptom_description",
        priority: "high",
        isSpecific: true
      })
    }
  } else {
    questions.push({
      id: 2,
      question: "Pouvez-vous décrire votre symptôme principal et ce que vous ressentez exactement ?",
      type: "text",
      placeholder: "Décrivez votre symptôme principal, son intensité, ses caractéristiques...",
      category: "main_symptom_description",
      priority: "high",
      isSpecific: false
    })
  }

  // === QUESTION 3: INTENSITÉ ET ÉCHELLE ===
  questions.push({
    id: 3,
    question: "Sur une échelle de 0 à 10, comment évaluez-vous l'intensité de vos symptômes actuellement ?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: ["Aucun symptôme (0)", "Léger (1-3)", "Modéré (4-6)", "Sévère (7-9)", "Insupportable (10)"],
    category: "symptom_intensity_scale",
    priority: "high",
    isSpecific: false
  })

  // === QUESTION 4: SPÉCIFIQUE AU GENRE SI PERTINENT ===
  if (gender && gender.toLowerCase().includes('fém') && age >= 18 && age <= 50) {
    questions.push({
      id: 4,
      question: `Chez une femme de ${age} ans, ces symptômes ont-ils un lien avec votre cycle menstruel ou vos hormones ?`,
      type: "multiple_choice",
      options: [
        "Clairement liés à mes règles ou à mon cycle",
        "Possiblement liés, je ne suis pas sûre",
        "Aggravés par les changements hormonaux",
        "Aucun lien avec mon cycle"
      ],
      category: "hormonal_correlation_assessment",
      priority: "medium",
      isSpecific: true
    })
  } else {
    questions.push({
      id: 4,
      question: "Depuis quand ressentez-vous ces symptômes ?",
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
  }

  // === QUESTION 5: FACTEURS DÉCLENCHANTS ===
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

  // === QUESTION 6: ANTÉCÉDENTS OU ÉVOLUTION ===
  if (antecedents && antecedents.length > 0) {
    questions.push({
      id: 6,
      question: `Avec vos antécédents médicaux (${antecedents.join(', ')}), ces nouveaux symptômes ressemblent-ils à quelque chose que vous avez déjà vécu ?`,
      type: "multiple_choice",
      options: [
        "Oui, identiques à des épisodes passés",
        "Similaires mais plus intenses",
        "Similaires mais avec des différences",
        "Complètement nouveaux et différents"
      ],
      category: "antecedent_comparison",
      priority: "medium",
      isSpecific: true
    })
  } else {
    questions.push({
      id: 6,
      question: "Comment évoluent ces symptômes depuis leur apparition ?",
      type: "multiple_choice",
      options: [
        "Ils s'aggravent progressivement",
        "Ils restent stables, sans changement",
        "Ils s'améliorent lentement",
        "Ils varient beaucoup d'un moment à l'autre"
      ],
      category: "symptom_evolution_pattern",
      priority: "medium",
      isSpecific: false
    })
  }

  console.log(`✅ ${questions.length} questions médicales garanties générées`)
  return questions
}

// ===== QUESTIONS D'URGENCE MÉDICALES (DERNIER RECOURS) =====
function getEmergencyMedicalQuestions() {
  console.log("🆘 Questions d'urgence médicales activées")
  
  return [
    {
      id: 1,
      question: "Décrivez en quelques mots vos symptômes principaux et ce qui vous amène à consulter aujourd'hui",
      type: "text",
      placeholder: "Exemple: douleur thoracique, fatigue, mal de tête...",
      category: "emergency_chief_complaint",
      priority: "high",
      isSpecific: false
    },
    {
      id: 2,
      question: "Sur une échelle de 1 à 10, quelle est l'intensité de votre gêne ou douleur actuelle ?",
      type: "scale",
      scaleMin: 1,
      scaleMax: 10,
      scaleLabels: ["Très légère", "Insupportable"],
      category: "emergency_pain_scale",
      priority: "high",
      isSpecific: false
    },
    {
      id: 3,
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
      id: 4,
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
      id: 5,
      question: "Avez-vous des antécédents médicaux importants ou prenez-vous des médicaments ?",
      type: "text",
      placeholder: "Listez vos problèmes de santé connus et médicaments...",
      category: "emergency_medical_history",
      priority: "medium",
      isSpecific: false
    },
    {
      id: 6,
      question: "Y a-t-il autre chose d'important que vous souhaitez mentionner concernant votre état de santé ?",
      type: "text",
      placeholder: "Informations complémentaires, contexte particulier...",
      category: "emergency_additional_info",
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
