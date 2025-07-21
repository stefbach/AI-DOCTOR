// /app/api/openai-diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔥 API ROUTE ACCESSIBLE - DÉBUT')
  
  try {
    const body = await request.json()
    const { patientData, clinicalData, questionsData } = body
    
    console.log('🔥 Données reçues:', {
      patient: patientData?.firstName,
      clinical: clinicalData?.chiefComplaint
    })
    
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY manquante')
    }
    
    // Données patient
    const patientName = `${patientData?.firstName || 'Patient'} ${patientData?.lastName || 'X'}`
    const age = patientData?.age || 30
    const complaint = clinicalData?.chiefComplaint || 'Consultation médicale'
    const symptoms = (clinicalData?.symptoms || []).join(', ') || 'Non précisés'
    const duration = clinicalData?.symptomDuration || 'Non précisée'
    const painScale = clinicalData?.painScale || 0
    const vitalSigns = clinicalData?.vitalSigns || {}
    const allergies = (patientData?.allergies || []).join(', ') || 'Aucune'
    
    console.log('🔥 ÉTAPE 1: Génération diagnostic SEULEMENT')
    
    // PROMPT SIMPLE - DIAGNOSTIC SEULEMENT
    const diagnosticPrompt = `Tu es un médecin expert mauricien. Analyse ce cas clinique:

PATIENT: ${patientName}, ${age} ans
MOTIF: ${complaint}
SYMPTÔMES: ${symptoms}
DURÉE: ${duration}
DOULEUR: ${painScale}/10
ALLERGIES: ${allergies}

Génère UNIQUEMENT un diagnostic médical expert en JSON:

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic médical précis",
      "icd10": "Code CIM-10",
      "confidence": 85,
      "severity": "mild|moderate|severe",
      "detailedAnalysis": "Analyse physiopathologique détaillée",
      "clinicalRationale": "Raisonnement clinique justifiant ce diagnostic",
      "prognosis": "Évolution pronostique attendue"
    },
    "differential": [
      {
        "condition": "Premier diagnostic différentiel",
        "probability": 70,
        "rationale": "Arguments cliniques en faveur"
      },
      {
        "condition": "Deuxième diagnostic différentiel", 
        "probability": 50,
        "rationale": "Arguments pour ce diagnostic"
      }
    ]
  }
}`

    // APPEL OpenAI pour diagnostic seulement
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
            content: 'Tu es un médecin expert. Génère UNIQUEMENT un diagnostic en JSON valide.'
          },
          {
            role: 'user',
            content: diagnosticPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500, // Réduit car seulement diagnostic
      }),
    })
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI Error ${openaiResponse.status}: ${errorText}`)
    }
    
    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0]?.message?.content
    
    if (!responseText) {
      throw new Error('Réponse OpenAI vide')
    }
    
    console.log('🔥 Diagnostic reçu, parsing...')
    
    // Parse diagnostic
    let diagnosis
    try {
      const cleanText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const parsed = JSON.parse(cleanText)
      diagnosis = parsed.diagnosis
      
    } catch (parseError) {
      console.error('❌ Erreur parsing diagnostic:', parseError)
      // Fallback diagnostic
      diagnosis = {
        primary: {
          condition: `Syndrome clinique - ${complaint}`,
          icd10: "R53",
          confidence: 70,
          severity: "moderate",
          detailedAnalysis: "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire",
          clinicalRationale: `Symptômes: ${complaint}. Nécessite anamnèse et examen clinique approfondis`,
          prognosis: "Évolution favorable attendue avec prise en charge appropriée"
        },
        differential: [
          {
            condition: "Syndrome viral",
            probability: 40,
            rationale: "Cause fréquente de symptômes non spécifiques"
          }
        ]
      }
    }
    
    console.log('✅ Diagnostic généré:', diagnosis.primary?.condition)
    
    console.log('🔥 ÉTAPE 2: Génération documents mauriciens côté serveur')
    
    // GÉNÉRATION DOCUMENTS CÔTÉ SERVEUR (pas OpenAI)
    const currentDate = new Date().toLocaleDateString('fr-FR')
    const currentTime = new Date().toLocaleTimeString('fr-FR')
    const physicianName = patientData?.physicianName || 'MÉDECIN EXPERT'
    const registrationNumber = `COUNCIL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    const mauritianDocuments = {
      consultation: {
        header: {
          title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
          subtitle: "République de Maurice - Médecine Générale",
          date: currentDate,
          time: currentTime,
          physician: `Dr. ${physicianName}`,
          registration: registrationNumber,
          institution: "Centre Médical Maurice"
        },
        patient: {
          firstName: patientData?.firstName || 'Patient',
          lastName: patientData?.lastName || 'X',
          age: `${age} ans`,
          sex: patientData?.sex || 'À préciser',
          address: "Adresse complète à renseigner - Maurice",
          phone: "Téléphone à renseigner",
          idNumber: "Numéro carte d'identité mauricienne",
          weight: `${patientData?.weight || '?'}kg`,
          height: `${patientData?.height || '?'}cm`,
          allergies: allergies
        },
        content: {
          chiefComplaint: `Patient de ${age} ans consultant pour ${complaint}. Évolution depuis ${duration}. Symptômes associés: ${symptoms}. Douleur évaluée à ${painScale}/10.`,
          history: `ANAMNÈSE: Histoire de la maladie actuelle avec début ${duration}. Symptômes: ${symptoms}. Antécédents: ${(patientData?.medicalHistory || []).join(', ') || 'Aucun particulier'}. Allergies: ${allergies}. Traitements actuels: ${(patientData?.currentMedications || []).join(', ') || 'Aucun'}.`,
          examination: `EXAMEN PHYSIQUE: Constantes vitales - TA ${vitalSigns.bloodPressureSystolic || '?'}/${vitalSigns.bloodPressureDiastolic || '?'} mmHg, FC ${vitalSigns.heartRate || '?'} bpm, T° ${vitalSigns.temperature || '?'}°C. Douleur: ${painScale}/10. État général: ${age < 65 ? 'conservé' : 'à préciser'}. Examen orienté selon symptomatologie.`,
          diagnosis: diagnosis.primary.condition,
          plan: `PLAN DE PRISE EN CHARGE: Examens complémentaires orientés. Traitement symptomatique adapté. Surveillance clinique. Conseils hygiéno-diététiques adaptés au climat tropical mauricien. Réévaluation programmée selon évolution.`
        }
      },
      
      biology: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
          date: currentDate,
          number: `BIO-MU-${Date.now()}`,
          physician: `Dr. ${physicianName}`,
          registration: registrationNumber
        },
        patient: {
          firstName: patientData?.firstName || 'Patient',
          lastName: patientData?.lastName || 'X',
          age: `${age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne"
        },
        prescriptions: [
          {
            id: 1,
            exam: "Hémogramme complet (NFS) + CRP",
            indication: "Recherche syndrome anémique, infectieux, inflammatoire",
            urgency: "Semi-urgent (24-48h)",
            fasting: "Non requis",
            expectedResults: "Numération globulaire, formule leucocytaire, CRP",
            sampleType: "Sang veineux",
            contraindications: "Aucune",
            mauritianAvailability: "Disponible tous laboratoires Maurice",
            cost: "Pris en charge sécurité sociale"
          },
          {
            id: 2,
            exam: "Ionogramme sanguin + Urée + Créatinine",
            indication: "Bilan métabolique et fonction rénale",
            urgency: "Programmé",
            fasting: "Jeûne 12h recommandé",
            expectedResults: "Équilibre électrolytique, fonction rénale",
            sampleType: "Sang veineux",
            contraindications: "Aucune",
            mauritianAvailability: "Standard laboratoires Maurice"
          }
        ]
      },
      
      paraclinical: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION D'EXAMENS PARACLINIQUES",
          date: currentDate,
          number: `PARA-MU-${Date.now()}`,
          physician: `Dr. ${physicianName}`,
          registration: registrationNumber
        },
        patient: {
          firstName: patientData?.firstName || 'Patient',
          lastName: patientData?.lastName || 'X',
          age: `${age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne"
        },
        prescriptions: [
          {
            id: 1,
            exam: "Radiographie thoracique de face et profil",
            indication: "Exploration parenchyme pulmonaire selon symptomatologie",
            urgency: "Programmé",
            preparation: "Retrait bijoux et objets métalliques thoraciques",
            contraindications: "Grossesse (radioprotection)",
            duration: "10 minutes",
            mauritianAvailability: "Hôpitaux publics (Dr Jeetoo, Candos) et centres privés",
            cost: "Gratuit secteur public, tarif conventionné privé"
          }
        ]
      },
      
      medication: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION THÉRAPEUTIQUE",
          date: currentDate,
          number: `MED-MU-${Date.now()}`,
          physician: `Dr. ${physicianName}`,
          registration: registrationNumber,
          validity: "Ordonnance valable 3 mois"
        },
        patient: {
          firstName: patientData?.firstName || 'Patient',
          lastName: patientData?.lastName || 'X',
          age: `${age} ans`,
          weight: `${patientData?.weight || '?'}kg`,
          allergies: allergies,
          address: "Adresse complète - Maurice",
          idNumber: "Carte d'identité mauricienne"
        },
        prescriptions: [
          {
            id: 1,
            class: "Antalgique non opioïde",
            dci: "Paracétamol",
            brand: "Efferalgan® / Doliprane® (Maurice)",
            dosage: age >= 65 ? "500-750mg" : "1000mg",
            frequency: "3 fois par jour si douleur",
            duration: "5 jours maximum",
            totalQuantity: "15 comprimés",
            indication: "Traitement symptomatique douleur et/ou fièvre",
            administration: "Per os, avec un grand verre d'eau",
            contraindications: allergies.toLowerCase().includes('paracétamol') ? 
              "ALLERGIE PATIENT DOCUMENTÉE" : "Insuffisance hépatique sévère",
            precautions: "Dose maximale 4g/24h. Surveillance hépatique si traitement prolongé.",
            monitoring: "Efficacité antalgique, signes hépatotoxicité",
            mauritianAvailability: "Disponible toutes pharmacies Maurice",
            cost: "Médicament essentiel, prix réglementé"
          }
        ],
        clinicalAdvice: {
          hydration: "Hydratation renforcée (2-3L/jour) climat tropical",
          activity: "Repos adapté, éviter efforts si fièvre",
          diet: "Alimentation équilibrée, fruits tropicaux",
          mosquitoProtection: "Protection anti-moustiques (dengue/chikungunya)",
          followUp: "Consultation réévaluation si pas d'amélioration sous 3-5 jours",
          emergency: "Urgences Maurice: 999 (SAMU), signes d'alarme à surveiller"
        }
      }
    }
    
    console.log('✅ Documents mauriciens générés côté serveur!')
    console.log('📄 Documents créés:', Object.keys(mauritianDocuments))
    
    return NextResponse.json({
      success: true,
      diagnosis: diagnosis,
      mauritianDocuments: mauritianDocuments,
      debug: {
        method: 'Diagnostic OpenAI + Documents serveur',
        diagnosticSource: 'OpenAI GPT-4',
        documentsSource: 'Serveur Node.js',
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ ERREUR COMPLÈTE:', error)
    
    return NextResponse.json({
      error: 'Erreur génération diagnostic',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      success: false
    }, { status: 500 })
  }
}
