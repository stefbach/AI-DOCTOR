// /app/api/openai-diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Fonction pour nettoyer et parser le JSON depuis la réponse OpenAI
function cleanAndParseJSON(text: string) {
  try {
    // Supprimer les backticks markdown et autres formatages
    let cleanText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[\s\n]*/, '')
      .replace(/[\s\n]*$/, '')
      .trim()

    // Essayer de parser directement
    return JSON.parse(cleanText)
  } catch (firstError) {
    // Essayer de trouver le JSON dans le texte
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('Aucun JSON trouvé dans la réponse')
    } catch (secondError) {
      console.error('❌ Erreur parsing JSON:', {
        originalText: text.substring(0, 500) + '...',
        firstError: firstError.message,
        secondError: secondError.message
      })
      throw new Error(`Impossible de parser le JSON: ${secondError.message}`)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { patientData, clinicalData, questionsData } = await request.json()

    console.log('🩺 Génération diagnostic complet OpenAI...')

    // Prompt optimisé pour OpenAI avec instructions strictes JSON
    const prompt = `Tu es un médecin expert. Génère un diagnostic complet et des documents mauriciens.

DONNÉES PATIENT:
${JSON.stringify(patientData, null, 2)}

DONNÉES CLINIQUES:
${JSON.stringify(clinicalData, null, 2)}

RÉPONSES QUESTIONNAIRE IA:
${JSON.stringify(questionsData, null, 2)}

INSTRUCTIONS CRITIQUES:
1. Ta réponse DOIT être UNIQUEMENT un objet JSON valide
2. AUCUN texte avant ou après le JSON
3. PAS de backticks, PAS de markdown
4. Respecte EXACTEMENT la structure demandée

STRUCTURE JSON OBLIGATOIRE:
{
  "diagnosis": {
    "primary": {
      "condition": "Nom de la pathologie",
      "icd10": "Code CIM-10",
      "confidence": 85,
      "severity": "mild|moderate|severe",
      "detailedAnalysis": "Analyse détaillée du diagnostic",
      "clinicalRationale": "Justification clinique basée sur les symptômes",
      "prognosis": "Pronostic et évolution attendue"
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel",
        "probability": 40,
        "rationale": "Pourquoi ce diagnostic est possible",
        "distinguishingFeatures": "Éléments qui permettent de distinguer"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Générale",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "time": "${new Date().toLocaleTimeString('fr-FR')}",
        "physician": "Dr. ${patientData.physicianName || 'MÉDECIN GÉNÉRALISTE'}",
        "registration": "COUNCIL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser",
        "weight": "${patientData.weight}kg",
        "height": "${patientData.height}cm"
      },
      "content": {
        "chiefComplaint": "Motif de consultation basé sur les symptômes",
        "history": "Histoire de la maladie détaillée",
        "examination": "Examen clinique avec constantes vitales",
        "diagnosis": "Diagnostic retenu",
        "plan": "Plan thérapeutique et suivi"
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "number": "BIO-${Date.now()}-MU",
        "physician": "Dr. ${patientData.physicianName || 'MÉDECIN GÉNÉRALISTE'}",
        "registration": "COUNCIL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser"
      },
      "prescriptions": [
        {
          "id": 1,
          "exam": "Nom de l'examen",
          "indication": "Indication clinique",
          "urgency": "Normal|Semi-urgent|Urgent",
          "fasting": "Oui|Non",
          "expectedResults": "Résultats attendus",
          "sampleType": "Type d'échantillon",
          "contraindications": "Contre-indications"
        }
      ]
    },
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS PARACLINIQUES",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "number": "PARA-${Date.now()}-MU",
        "physician": "Dr. ${patientData.physicianName || 'MÉDECIN GÉNÉRALISTE'}",
        "registration": "COUNCIL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser"
      },
      "prescriptions": [
        {
          "id": 1,
          "exam": "Type d'examen",
          "indication": "Indication",
          "urgency": "Normal|Semi-urgent|Urgent",
          "preparation": "Préparation nécessaire",
          "contraindications": "Contre-indications",
          "duration": "Durée estimée"
        }
      ]
    },
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION MÉDICAMENTEUSE",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "number": "MED-${Date.now()}-MU",
        "physician": "Dr. ${patientData.physicianName || 'MÉDECIN GÉNÉRALISTE'}",
        "registration": "COUNCIL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientData.age} ans",
        "address": "Adresse à compléter - Maurice",
        "idNumber": "Carte d'identité mauricienne à préciser",
        "allergies": "${(patientData.allergies || []).join(', ') || 'Aucune'}"
      },
      "prescriptions": [
        {
          "id": 1,
          "dci": "Dénomination Commune Internationale",
          "brand": "Nom commercial",
          "dosage": "Dosage",
          "frequency": "Fréquence",
          "duration": "Durée",
          "indication": "Indication",
          "contraindications": "Contre-indications",
          "monitoring": "Surveillance nécessaire",
          "mauritianAvailability": "Disponibilité à Maurice"
        }
      ]
    }
  }
}

RÉPONDS UNIQUEMENT AVEC LE JSON - AUCUN AUTRE TEXTE`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un médecin expert. Tu réponds UNIQUEMENT en JSON valide, sans aucun formatage markdown ou texte supplémentaire."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      throw new Error('Aucune réponse reçue d\'OpenAI')
    }

    console.log('📝 Réponse OpenAI (premiers 200 chars):', responseText.substring(0, 200))

    // Nettoyer et parser le JSON
    const parsedResponse = cleanAndParseJSON(responseText)

    // Vérifier la structure
    if (!parsedResponse.diagnosis || !parsedResponse.mauritianDocuments) {
      throw new Error('Structure de réponse invalide - manque diagnosis ou mauritianDocuments')
    }

    console.log('✅ Diagnostic IA généré avec succès')

    return NextResponse.json({
      success: true,
      diagnosis: parsedResponse.diagnosis,
      mauritianDocuments: parsedResponse.mauritianDocuments,
      rawResponse: responseText.substring(0, 200) + '...' // Pour debug
    })

  } catch (error) {
    console.error('❌ Erreur Diagnostic IA Complet:', error)

    // Log détaillé pour debug
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du diagnostic complet',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      },
      { status: 500 }
    )
  }
}
