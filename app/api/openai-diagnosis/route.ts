// /app/api/openai-diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔥 API ROUTE ACCESSIBLE - DÉBUT')
  
  try {
    console.log('🔥 Parsing body...')
    const body = await request.json()
    const { patientData, clinicalData, questionsData } = body
    
    console.log('🔥 Données reçues:', {
      patient: patientData?.firstName,
      clinical: clinicalData?.chiefComplaint
    })
    
    console.log('🔥 Vérification environnement serveur...')
    console.log('🔥 typeof window:', typeof window)
    console.log('🔥 Node env:', process.env.NODE_ENV)
    
    console.log('🔥 Vérification API Key...')
    const apiKey = process.env.OPENAI_API_KEY
    console.log('🔥 API Key présente:', !!apiKey, apiKey?.substring(0, 10) + '...')
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY manquante dans .env.local')
    }
    
    // Import et initialisation OpenAI CÔTÉ SERVEUR
    console.log('🔥 Import OpenAI...')
    const { OpenAI } = await import('openai')
    
    const openai = new OpenAI({
      apiKey: apiKey,
      // Force l'exécution côté serveur 
      dangerouslyAllowBrowser: false
    })
    
    console.log('🔥 Client OpenAI créé côté serveur')
    
    // Préparation données patient
    const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`
    const age = patientData?.age || 30
    const complaint = clinicalData?.chiefComplaint || 'Consultation médicale'
    
    console.log('🔥 Appel OpenAI pour diagnostic expert...')
    
    const prompt = `Tu es un médecin expert mauricien. Analyse ce cas clinique:

PATIENT: ${patientName}, ${age} ans
MOTIF: ${complaint}
SYMPTÔMES: ${(clinicalData?.symptoms || []).join(', ') || 'Non précisés'}

Génère un diagnostic expert avec documents mauriciens.

RÉPONDS UNIQUEMENT EN JSON VALIDE:

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic médical précis",
      "icd10": "Code CIM-10",
      "confidence": 85,
      "severity": "moderate",
      "detailedAnalysis": "Analyse médicale détaillée du cas clinique présenté",
      "clinicalRationale": "Raisonnement clinique justifiant ce diagnostic principal",
      "prognosis": "Évolution pronostique avec traitement approprié"
    },
    "differential": [
      {
        "condition": "Premier diagnostic différentiel plausible",
        "probability": 60,
        "rationale": "Arguments cliniques en faveur de ce diagnostic alternatif"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Générale",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "physician": "Dr. MÉDECIN GÉNÉRALISTE"
      },
      "patient": {
        "firstName": "${patientData?.firstName || 'Patient'}",
        "lastName": "${patientData?.lastName || 'X'}",
        "age": "${age} ans"
      },
      "content": {
        "chiefComplaint": "Motif détaillé de la consultation médicale",
        "history": "Anamnèse complète avec histoire de la maladie actuelle",
        "examination": "Examen physique systématique avec constantes vitales",
        "diagnosis": "Diagnostic médical retenu après analyse",
        "plan": "Plan thérapeutique et de surveillance adapté"
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS BIOLOGIQUES"
      },
      "prescriptions": [
        {
          "exam": "NFS + CRP + VS",
          "indication": "Bilan inflammatoire et hématologique initial",
          "urgency": "Semi-urgent",
          "fasting": "Non"
        }
      ]
    },
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS PARACLINIQUES"
      },
      "prescriptions": [
        {
          "exam": "Radiographie thoracique de face",
          "indication": "Exploration thoraco-pulmonaire selon symptomatologie",
          "urgency": "Programmé"
        }
      ]
    },
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION MÉDICAMENTEUSE"
      },
      "prescriptions": [
        {
          "dci": "Paracétamol",
          "dosage": "1000mg",
          "frequency": "3 fois par jour si douleur",
          "duration": "5 jours maximum",
          "indication": "Traitement symptomatique antalgique"
        }
      ]
    }
  }
}`
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un médecin expert mauricien. Réponds UNIQUEMENT en JSON valide."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    })
    
    const responseText = completion.choices[0]?.message?.content
    
    if (!responseText) {
      throw new Error('Réponse OpenAI vide')
    }
    
    console.log('🔥 OpenAI a répondu, parsing JSON...')
    console.log('🔥 Longueur réponse:', responseText.length)
    
    // Parse JSON simple
    let parsedResponse
    try {
      // Nettoyer markdown si présent
      const cleanText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      parsedResponse = JSON.parse(cleanText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('❌ Réponse OpenAI:', responseText.substring(0, 300))
      throw new Error('JSON invalide de OpenAI')
    }
    
    if (!parsedResponse.diagnosis || !parsedResponse.mauritianDocuments) {
      throw new Error('Structure JSON incomplète')
    }
    
    console.log('✅ Diagnostic expert généré avec succès!')
    console.log('🎯 Diagnostic:', parsedResponse.diagnosis.primary?.condition)
    
    return NextResponse.json({
      success: true,
      diagnosis: parsedResponse.diagnosis,
      mauritianDocuments: parsedResponse.mauritianDocuments,
      debug: {
        responseLength: responseText.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ ERREUR COMPLÈTE:', error)
    
    if (error instanceof Error) {
      console.error('❌ Message:', error.message)
      console.error('❌ Stack:', error.stack?.substring(0, 500))
    }
    
    // Erreurs spécifiques OpenAI
    if (error.message?.includes('browser-like environment')) {
      return NextResponse.json({
        error: 'Erreur environnement OpenAI',
        details: 'Configuration serveur Next.js requise',
        solution: 'Vérifiez que le code s\'exécute côté serveur',
        success: false
      }, { status: 500 })
    }
    
    if (error.message?.includes('API key')) {
      return NextResponse.json({
        error: 'Problème API Key OpenAI',
        details: 'Clé API manquante ou invalide',
        success: false
      }, { status: 500 })
    }
    
    return NextResponse.json({
      error: 'Erreur génération diagnostic',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
