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
    
    console.log('🔥 Vérification API Key...')
    const apiKey = process.env.OPENAI_API_KEY
    console.log('🔥 API Key présente:', !!apiKey)
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY manquante dans .env.local')
    }
    
    // Préparation données patient
    const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`
    const age = patientData?.age || 30
    const complaint = clinicalData?.chiefComplaint || 'Consultation médicale'
    const symptoms = (clinicalData?.symptoms || []).join(', ') || 'Non précisés'
    
    console.log('🔥 Appel OpenAI API REST directement...')
    
    const prompt = `Tu es un médecin expert mauricien. Analyse ce cas clinique:

PATIENT: ${patientName}, ${age} ans
MOTIF: ${complaint}
SYMPTÔMES: ${symptoms}

Génère un diagnostic expert avec documents mauriciens.

RÉPONDS UNIQUEMENT EN JSON VALIDE SANS MARKDOWN:

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic médical précis",
      "icd10": "Code CIM-10",
      "confidence": 85,
      "severity": "moderate",
      "detailedAnalysis": "Analyse médicale détaillée du cas clinique",
      "clinicalRationale": "Raisonnement clinique justifiant ce diagnostic",
      "prognosis": "Évolution pronostique avec traitement"
    },
    "differential": [
      {
        "condition": "Premier diagnostic différentiel",
        "probability": 60,
        "rationale": "Arguments cliniques pour ce diagnostic"
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
        "chiefComplaint": "Motif détaillé de la consultation",
        "history": "Anamnèse complète avec histoire de la maladie",
        "examination": "Examen physique avec constantes vitales",
        "diagnosis": "Diagnostic médical retenu",
        "plan": "Plan thérapeutique et de surveillance"
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
          "indication": "Bilan inflammatoire et hématologique",
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
          "indication": "Exploration thoraco-pulmonaire",
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
    
    // APPEL DIRECT À L'API REST OPENAI (sans SDK)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Tu es un médecin expert mauricien. Réponds UNIQUEMENT en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    })
    
    console.log('🔥 Réponse OpenAI reçue, status:', openaiResponse.status)
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ Erreur OpenAI API:', errorText)
      throw new Error(`OpenAI API Error ${openaiResponse.status}: ${errorText}`)
    }
    
    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0]?.message?.content
    
    if (!responseText) {
      throw new Error('Réponse OpenAI vide')
    }
    
    console.log('🔥 OpenAI a répondu, parsing JSON...')
    console.log('🔥 Longueur réponse:', responseText.length)
    console.log('🔥 Début réponse:', responseText.substring(0, 100))
    
    // Parse JSON robuste
    let parsedResponse
    try {
      // Nettoyer le JSON de tout markdown ou formatage
      const cleanText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[\s\n]*/, '')
        .replace(/[\s\n]*$/, '')
        .trim()
      
      parsedResponse = JSON.parse(cleanText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('❌ Texte à parser:', responseText.substring(0, 500))
      
      // Tentative de récupération du JSON dans le texte
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
          console.log('🔥 JSON récupéré avec regex')
        } else {
          throw new Error('Aucun JSON trouvé dans la réponse')
        }
      } catch (regexError) {
        throw new Error(`JSON invalide: ${parseError.message}`)
      }
    }
    
    // Vérification structure
    if (!parsedResponse.diagnosis || !parsedResponse.mauritianDocuments) {
      console.error('❌ Structure invalide:', Object.keys(parsedResponse))
      throw new Error('Structure JSON incomplète')
    }
    
    // Post-traitement des placeholders (interpolation côté serveur)
    const docs = parsedResponse.mauritianDocuments
    const currentDate = new Date().toLocaleDateString('fr-FR')
    
    // Mise à jour des données réelles
    if (docs.consultation?.header) {
      docs.consultation.header.date = currentDate
    }
    if (docs.consultation?.patient) {
      docs.consultation.patient.firstName = patientData?.firstName || 'Patient'
      docs.consultation.patient.lastName = patientData?.lastName || 'X'
      docs.consultation.patient.age = `${age} ans`
    }
    
    console.log('✅ Diagnostic expert généré avec succès!')
    console.log('🎯 Diagnostic principal:', parsedResponse.diagnosis.primary?.condition)
    console.log('📄 Documents générés:', Object.keys(docs))
    
    return NextResponse.json({
      success: true,
      diagnosis: parsedResponse.diagnosis,
      mauritianDocuments: docs,
      debug: {
        method: 'OpenAI REST API direct',
        responseLength: responseText.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ ERREUR COMPLÈTE:', error)
    
    if (error instanceof Error) {
      console.error('❌ Message:', error.message)
      console.error('❌ Stack:', error.stack?.substring(0, 300))
    }
    
    // Gestion erreurs spécifiques
    if (error.message?.includes('API Error 401')) {
      return NextResponse.json({
        error: 'API Key OpenAI invalide',
        details: 'Vérifiez votre clé API dans .env.local',
        success: false
      }, { status: 500 })
    }
    
    if (error.message?.includes('API Error 429')) {
      return NextResponse.json({
        error: 'Quota OpenAI dépassé',
        details: 'Limite de taux ou crédits insuffisants',
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
