// /app/api/openai-diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function cleanAndParseJSON(text: string) {
  try {
    let cleanText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    return JSON.parse(cleanText)
  } catch (error) {
    console.error('❌ Erreur parsing JSON:', error)
    throw new Error('JSON invalide')
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🟡 Début API OpenAI Diagnosis')

    // Validation API Key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY manquante')
    }

    const body = await request.json()
    const { patientData, clinicalData, questionsData } = body

    console.log('🟡 Données reçues:', {
      patient: patientData?.firstName || 'undefined',
      clinical: clinicalData?.chiefComplaint || 'undefined'
    })

    // Validation données
    if (!patientData || !clinicalData) {
      throw new Error('Données manquantes')
    }

    // Variables simples
    const patientName = `${patientData.firstName || 'Patient'} ${patientData.lastName || 'X'}`
    const age = patientData.age || 30
    const complaint = clinicalData.chiefComplaint || 'Consultation médicale'
    
    // PROMPT MINIMAL MAIS EXPERT
    const prompt = `Tu es un médecin expert. Analyse ce cas clinique mauricien.

PATIENT: ${patientName}, ${age} ans
MOTIF: ${complaint}
SYMPTÔMES: ${(clinicalData.symptoms || []).join(', ') || 'Non précisés'}

Génère un diagnostic expert avec documents mauriciens.

RÉPONDS UNIQUEMENT EN JSON SANS MARKDOWN:

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic médical précis",
      "icd10": "R50.9", 
      "confidence": 80,
      "severity": "moderate",
      "detailedAnalysis": "Analyse médicale détaillée basée sur les symptômes présentés",
      "clinicalRationale": "Raisonnement clinique justifiant le diagnostic",
      "prognosis": "Évolution attendue avec traitement approprié"
    },
    "differential": [
      {
        "condition": "Syndrome viral", 
        "probability": 60,
        "rationale": "Symptômes compatibles avec infection virale"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Générale", 
        "date": "DATE_PLACEHOLDER",
        "physician": "Dr. MÉDECIN GÉNÉRALISTE"
      },
      "patient": {
        "firstName": "PRENOM_PLACEHOLDER",
        "lastName": "NOM_PLACEHOLDER", 
        "age": "AGE_PLACEHOLDER"
      },
      "content": {
        "chiefComplaint": "Motif de consultation détaillé",
        "history": "Histoire de la maladie actuelle",
        "examination": "Examen physique complet", 
        "diagnosis": "Diagnostic retenu",
        "plan": "Plan de traitement et suivi"
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS BIOLOGIQUES"
      },
      "prescriptions": [
        {
          "exam": "NFS + CRP",
          "indication": "Bilan inflammatoire",
          "urgency": "Semi-urgent"
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
          "exam": "Radiographie thoracique",
          "indication": "Exploration pulmonaire"
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
          "dosage": "1g",
          "frequency": "3 fois par jour",
          "duration": "5 jours"
        }
      ]
    }
  }
}`

    console.log('🟡 Appel OpenAI...')

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es médecin expert. Réponds UNIQUEMENT en JSON valide."
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

    console.log('🟡 Réponse OpenAI reçue, longueur:', responseText.length)
    console.log('🟡 Premiers 150 chars:', responseText.substring(0, 150))

    const parsedResponse = cleanAndParseJSON(responseText)

    if (!parsedResponse.diagnosis || !parsedResponse.mauritianDocuments) {
      throw new Error('Structure JSON invalide')
    }

    // REMPLACEMENT DES PLACEHOLDERS APRÈS PARSING RÉUSSI
    const docs = parsedResponse.mauritianDocuments
    const currentDate = new Date().toLocaleDateString('fr-FR')
    
    // Remplacement sécurisé des placeholders
    if (docs.consultation?.header) {
      docs.consultation.header.date = currentDate
    }
    if (docs.consultation?.patient) {
      docs.consultation.patient.firstName = patientData.firstName || 'Patient'
      docs.consultation.patient.lastName = patientData.lastName || 'X'
      docs.consultation.patient.age = `${age} ans`
    }

    console.log('✅ Diagnostic généré avec succès!')

    return NextResponse.json({
      success: true,
      diagnosis: parsedResponse.diagnosis,
      mauritianDocuments: docs,
      debug: {
        responseLength: responseText.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ ERREUR API COMPLÈTE:', error)
    
    // Log détaillé pour debug
    if (error instanceof Error) {
      console.error('❌ Message:', error.message)
      console.error('❌ Stack:', error.stack?.substring(0, 500))
    }

    // Si c'est une erreur OpenAI
    if (error.code === 'insufficient_quota') {
      console.error('❌ QUOTA OPENAI DÉPASSÉ')
      return NextResponse.json({
        error: 'Quota OpenAI dépassé',
        details: 'Vérifiez votre crédit OpenAI',
        success: false
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Erreur serveur diagnostic',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
