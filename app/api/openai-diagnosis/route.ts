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
        originalText: text.substring(0, 200),
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

    console.log('🩺 Génération diagnostic expert OpenAI...')

    // Validation des données d'entrée
    if (!patientData || !clinicalData) {
      throw new Error('Données patient ou cliniques manquantes')
    }

    // Variables pour les documents
    const age = patientData.age || 0
    const imc = patientData.weight && patientData.height ? 
      (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : 'Non calculé'
    const currentDate = new Date().toLocaleDateString('fr-FR')
    const currentTime = new Date().toLocaleTimeString('fr-FR')
    const physicianName = patientData.physicianName || 'MÉDECIN GÉNÉRALISTE'
    const registrationNumber = `COUNCIL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const patientAllergies = (patientData.allergies || []).join(', ') || 'Aucune'

    // PROMPT SIMPLIFIÉ MAIS EXPERT
    const prompt = `Tu es un médecin interniste expert avec 25 ans d'expérience, exerçant à Maurice.

DONNÉES PATIENT:
- Identité: ${patientData.firstName} ${patientData.lastName}, ${age} ans
- Anthropométrie: ${patientData.weight}kg, ${patientData.height}cm, IMC: ${imc}
- Antécédents: ${(patientData.medicalHistory || []).join(', ') || 'Aucun'}
- Allergies: ${patientAllergies}
- Traitements actuels: ${(patientData.currentMedications || []).join(', ') || 'Aucun'}

PRÉSENTATION CLINIQUE:
- Motif consultation: ${clinicalData.chiefComplaint || 'Consultation médicale'}
- Durée symptômes: ${clinicalData.symptomDuration || 'Non précisée'}
- Symptômes: ${(clinicalData.symptoms || []).join(', ') || 'Non précisés'}
- Douleur: ${clinicalData.painScale || 0}/10
- Constantes vitales:
  * TA: ${clinicalData.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
  * FC: ${clinicalData.vitalSigns?.heartRate || '?'} bpm
  * T°: ${clinicalData.vitalSigns?.temperature || '?'}°C

ANALYSE IA PRÉLIMINAIRE:
${JSON.stringify(questionsData, null, 2)}

MISSION: Génère un diagnostic expert avec raisonnement clinique et documents mauriciens professionnels.

Contexte mauricien: Climat tropical, pathologies endémiques (dengue, chikungunya), système de santé local.

IMPÉRATIF: Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte additionnel.

Structure JSON attendue:
{
  "diagnosis": {
    "primary": {
      "condition": "Nom précis de la pathologie diagnostiquée",
      "icd10": "Code CIM-10 correspondant", 
      "confidence": 85,
      "severity": "mild|moderate|severe|critical",
      "detailedAnalysis": "Analyse physiopathologique détaillée avec mécanismes, évolution et pronostic basés sur les données cliniques présentées",
      "clinicalRationale": "Raisonnement clinique expert justifiant ce diagnostic: critères remplis, éléments d'orientation, cohérence syndromique",
      "prognosis": "Pronostic à court et long terme avec complications potentielles",
      "urgency": "immediate|urgent|semi-urgent|programmable",
      "tropicalConsiderations": "Spécificités liées au contexte tropical mauricien"
    },
    "differential": [
      {
        "condition": "Premier diagnostic différentiel",
        "probability": 60,
        "rationale": "Arguments cliniques en faveur de ce diagnostic",
        "distinguishingFeatures": "Critères permettant de différencier",
        "requiredTests": "Examens nécessaires pour confirmer/infirmer"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Générale",
        "date": "${currentDate}",
        "time": "${currentTime}",
        "physician": "Dr. ${physicianName}",
        "registration": "${registrationNumber}"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${age} ans",
        "weight": "${patientData.weight}kg",
        "height": "${patientData.height}cm",
        "bmi": "${imc}"
      },
      "content": {
        "chiefComplaint": "Motif de consultation détaillé avec temporalité",
        "history": "Anamnèse complète: histoire de la maladie, antécédents pertinents",
        "examination": "Examen physique systématique avec constantes vitales",
        "diagnosis": "Diagnostic retenu avec justification",
        "plan": "Plan thérapeutique et de surveillance"
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
        "date": "${currentDate}",
        "physician": "Dr. ${physicianName}"
      },
      "prescriptions": [
        {
          "exam": "Nom de l'examen biologique",
          "indication": "Indication clinique précise",
          "urgency": "Normal|Semi-urgent|Urgent",
          "fasting": "Oui|Non"
        }
      ]
    },
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS PARACLINIQUES", 
        "date": "${currentDate}",
        "physician": "Dr. ${physicianName}"
      },
      "prescriptions": [
        {
          "exam": "Type d'examen d'imagerie ou exploration",
          "indication": "Indication médicale",
          "urgency": "Normal|Semi-urgent|Urgent"
        }
      ]
    },
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION MÉDICAMENTEUSE",
        "date": "${currentDate}",
        "physician": "Dr. ${physicianName}"
      },
      "patient": {
        "allergies": "${patientAllergies}"
      },
      "prescriptions": [
        {
          "dci": "Dénomination Commune Internationale",
          "dosage": "Dosage adapté à l'âge et au poids",
          "frequency": "Fréquence de prise",
          "duration": "Durée du traitement",
          "indication": "Indication thérapeutique"
        }
      ]
    }
  }
}`

    console.log('📤 Envoi du prompt à OpenAI...')

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un médecin interniste expert. Tu réponds UNIQUEMENT en JSON valide, sans markdown."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      throw new Error('Réponse vide d\'OpenAI')
    }

    console.log('📝 Parsing de la réponse JSON...')
    console.log('Premiers caractères:', responseText.substring(0, 100))

    // Parser le JSON
    const parsedResponse = cleanAndParseJSON(responseText)

    // Vérification structure minimale
    if (!parsedResponse.diagnosis || !parsedResponse.mauritianDocuments) {
      console.error('❌ Structure invalide. Réponse reçue:', responseText.substring(0, 500))
      throw new Error('Structure de réponse invalide - manque diagnosis ou mauritianDocuments')
    }

    // Interpolation des variables dans les documents (car OpenAI ne peut pas le faire)
    const docs = parsedResponse.mauritianDocuments
    
    // Consultation
    if (docs.consultation) {
      docs.consultation.header.date = currentDate
      docs.consultation.header.time = currentTime
      docs.consultation.header.physician = `Dr. ${physicianName}`
      docs.consultation.header.registration = registrationNumber
      
      docs.consultation.patient.firstName = patientData.firstName
      docs.consultation.patient.lastName = patientData.lastName
      docs.consultation.patient.age = `${age} ans`
      docs.consultation.patient.weight = `${patientData.weight}kg`
      docs.consultation.patient.height = `${patientData.height}cm`
      docs.consultation.patient.bmi = imc
    }

    // Biology
    if (docs.biology) {
      docs.biology.header.date = currentDate
      docs.biology.header.physician = `Dr. ${physicianName}`
    }

    // Paraclinical  
    if (docs.paraclinical) {
      docs.paraclinical.header.date = currentDate
      docs.paraclinical.header.physician = `Dr. ${physicianName}`
    }

    // Medication
    if (docs.medication) {
      docs.medication.header.date = currentDate
      docs.medication.header.physician = `Dr. ${physicianName}`
      docs.medication.patient.allergies = patientAllergies
    }

    console.log('✅ Diagnostic expert généré avec succès!')
    console.log('🎯 Diagnostic principal:', parsedResponse.diagnosis.primary?.condition)

    return NextResponse.json({
      success: true,
      diagnosis: parsedResponse.diagnosis,
      mauritianDocuments: docs,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur complète API:', error)
    
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du diagnostic expert',
        details: error instanceof Error ? error.message : String(error),
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
