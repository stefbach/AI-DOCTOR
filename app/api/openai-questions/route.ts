// /app/api/openai-questions/route.ts - COPIE EXACTE STRUCTURE DIAGNOSIS

import { NextRequest, NextResponse } from 'next/server'

// ==================== STRUCTURE SIMILAIRE À DIAGNOSIS ====================

interface SimpleQuestion {
  medecin: string
  patient_simple: string
  patient_standard: string
  rationale?: string
}

export async function POST(request: NextRequest) {
  console.log('🔥 API QUESTIONS - DÉMARRAGE (COPIE STRUCTURE DIAGNOSIS)')
  
  try {
    const body = await request.json()
    const patientText = body.patient_discourse_real_time || body.patientData?.symptoms || ""
    
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY manquante')
    
    console.log('📝 Texte patient:', patientText.substring(0, 100))
    
    // PROMPT SIMPLE MAIS STRUCTURÉ
    const simplePrompt = `Tu es un médecin mauricien expert. Le patient dit: "${patientText}"

Génère 2 questions médicales pertinentes pour téléconsultation.

Réponds UNIQUEMENT ce JSON valide:

{
  "questions": [
    {
      "medecin": "Conseil pour médecin",
      "patient_simple": "Question créole simple", 
      "patient_standard": "Question français standard",
      "rationale": "Pourquoi cette question"
    },
    {
      "medecin": "Deuxième conseil médecin",
      "patient_simple": "Deuxième question créole",
      "patient_standard": "Deuxième question français", 
      "rationale": "Justification médicale"
    }
  ]
}`

    console.log('📡 APPEL OPENAI - MÊME MÉTHODE QUE DIAGNOSIS')
    
    // ========== COPIE EXACTE DE LA MÉTHODE DIAGNOSIS ==========
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Tu es un médecin expert mauricien. Génère UNIQUEMENT du JSON médical valide.'
          },
          {
            role: 'user',
            content: simplePrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    })
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI Error ${openaiResponse.status}: ${errorText}`)
    }
    
    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0]?.message?.content
    
    console.log('🧠 PARSING RÉPONSE - MÊME LOGIQUE QUE DIAGNOSIS')
    console.log('📝 Réponse brute:', responseText?.substring(0, 200) + '...')
    
    let questionsAnalysis
    try {
      // ========== PARSING IDENTIQUE À DIAGNOSIS ==========
      let cleanResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const startIndex = cleanResponse.indexOf('{')
      const lastIndex = cleanResponse.lastIndexOf('}')
      
      if (startIndex !== -1 && lastIndex !== -1) {
        cleanResponse = cleanResponse.substring(startIndex, lastIndex + 1)
      }
      
      console.log('🧹 JSON nettoyé:', cleanResponse.substring(0, 200) + '...')
      
      questionsAnalysis = JSON.parse(cleanResponse)
      console.log('✅ Parsing réussi!')
      
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.log('📄 Réponse brute complète:', responseText)
      
      // FALLBACK ROBUSTE
      questionsAnalysis = {
        questions: [
          {
            medecin: "Question de base - chronologie symptômes",
            patient_simple: "Depi kan to gagné sa problème la ?",
            patient_standard: "Depuis quand avez-vous ce problème ?",
            rationale: "Établir chronologie pour diagnostic"
          },
          {
            medecin: "Précision symptômes principaux", 
            patient_simple: "Ki to senti exactement ?",
            patient_standard: "Que ressentez-vous exactement ?",
            rationale: "Caractériser symptômes"
          }
        ]
      }
      
      console.log('🔄 Fallback appliqué')
    }
    
    console.log('✅ QUESTIONS GÉNÉRÉES:', questionsAnalysis.questions?.length || 0)
    
    // FORMAT COMPATIBLE
    const formattedQuestions = (questionsAnalysis.questions || []).map((q: SimpleQuestion, index: number) => ({
      id: `q_${Date.now()}_${index}`,
      timing: "immediate",
      priority: index === 0 ? "essential" : "important",
      physician_prompt: q.medecin,
      patient_formulations: {
        simple: q.patient_simple,
        standard: q.patient_standard,
        technical: q.patient_standard
      },
      clinical_rationale: q.rationale || q.medecin,
      maurice_adaptation: {
        cultural_sensitivity: "Adaptation mauricienne",
        language_options: ["créole", "français"]
      }
    }))
    
    return NextResponse.json({
      success: true,
      ai_suggestions: formattedQuestions,
      context: {
        ai_generation_success: true,
        ai_method: "gpt4o_exact_like_diagnosis",
        language_detected: /mo|to|ena/.test(patientText) ? "créole" : "français"
      },
      timestamp: new Date().toISOString(),
      debug: {
        same_structure_as_diagnosis: true,
        api_key_present: !!apiKey,
        response_length: responseText?.length || 0
      }
    })
    
  } catch (error) {
    console.error('❌ ERREUR COMPLÈTE:', error)
    
    // FALLBACK GARANTI (IDENTIQUE À DIAGNOSIS)
    const emergencyQuestions = [
      {
        id: "emergency_1",
        timing: "immediate",
        priority: "essential",
        physician_prompt: "Question de sécurité - système temporairement indisponible",
        patient_formulations: {
          simple: "Ki zot problème principal zordi ?",
          standard: "Quel est votre problème principal aujourd'hui ?",
          technical: "Décrivez votre motif de consultation"
        },
        clinical_rationale: "Anamnèse essentielle",
        maurice_adaptation: {
          cultural_sensitivity: "Standard mauricien",
          language_options: ["créole", "français"]
        }
      },
      {
        id: "emergency_2", 
        timing: "immediate",
        priority: "important",
        physician_prompt: "Chronologie symptômes",
        patient_formulations: {
          simple: "Depi kan sa problème la ?",
          standard: "Depuis quand ce problème ?",
          technical: "Évolution temporelle"
        },
        clinical_rationale: "Urgence diagnostique",
        maurice_adaptation: {
          cultural_sensitivity: "Urgences 999",
          language_options: ["créole", "français"]
        }
      }
    ]
    
    return NextResponse.json({
      success: true,
      ai_suggestions: emergencyQuestions,
      system_status: {
        error_handled: true,
        error_message: error.message,
        fallback_active: true
      },
      debug: {
        exact_same_structure_as_diagnosis: true,
        error_type: error.constructor.name,
        error_details: error.message
      },
      timestamp: new Date().toISOString()
    })
  }
}

// GET pour test
export async function GET() {
  console.log('🧪 TEST ENDPOINT QUESTIONS')
  
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      success: true,
      test: true,
      message: "Endpoint questions accessible",
      api_key_available: !!apiKey,
      structure: "exact_copy_of_diagnosis",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: true,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
