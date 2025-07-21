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
    
    // Données cliniques enrichies
    const vitalSigns = clinicalData?.vitalSigns || {}
    const bp = `${vitalSigns.bloodPressureSystolic || '?'}/${vitalSigns.bloodPressureDiastolic || '?'}`
    const painScale = clinicalData?.painScale || 0
    const duration = clinicalData?.symptomDuration || 'Non précisée'
    const allergies = (patientData?.allergies || []).join(', ') || 'Aucune allergie connue'
    const currentMeds = (patientData?.currentMedications || []).join(', ') || 'Aucun traitement en cours'
    const medHistory = (patientData?.medicalHistory || []).join(', ') || 'Aucun antécédent particulier'
    
    const prompt = `Tu es le Dr. Claude EXPERT, médecin interniste senior avec 25 ans d'expérience à Maurice, spécialisé en médecine tropicale et diagnostics complexes.

═══════════════════════════════════════════════════════════════
🏥 CAS CLINIQUE COMPLET - ANALYSE EXPERTE DEMANDÉE
═══════════════════════════════════════════════════════════════

IDENTIFICATION PATIENT:
• Nom: ${patientName}, ${age} ans
• Poids: ${patientData?.weight || '?'}kg, Taille: ${patientData?.height || '?'}cm
• Antécédents: ${medHistory}
• Allergies: ${allergies}
• Traitements actuels: ${currentMeds}

PRÉSENTATION CLINIQUE:
• Motif consultation: ${complaint}
• Durée évolution: ${duration}
• Symptômes associés: ${symptoms}
• Échelle douleur: ${painScale}/10
• Constantes vitales: TA ${bp} mmHg, FC ${vitalSigns.heartRate || '?'} bpm, T° ${vitalSigns.temperature || '?'}°C

CONTEXTE MAURICIEN:
• Climat tropical - Saison: ${new Date().getMonth() < 6 ? 'Hiver austral' : 'Été austral'}
• Pathologies endémiques: Dengue, Chikungunya, infections tropicales
• Système de santé: Public/privé, sécurité sociale mauricienne

MISSION EXPERTE:
1. Diagnostic principal avec raisonnement physiopathologique
2. Diagnostics différentiels hiérarchisés
3. Documents mauriciens PROFESSIONNELS et COMPLETS

RÉPONDS UNIQUEMENT EN JSON VALIDE:

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic médical précis avec terminologie exacte",
      "icd10": "Code CIM-10 exact",
      "confidence": 85,
      "severity": "mild|moderate|severe|critical",
      "detailedAnalysis": "Analyse physiopathologique complète: mécanismes moléculaires, évolution naturelle, facteurs pronostiques, complications potentielles, impact fonctionnel.",
      "clinicalRationale": "Raisonnement clinique expert: critères diagnostiques majeurs/mineurs remplis, éléments anamnestiques orientant, signes pathognomoniques identifiés, cohérence syndromique, probabilité pré-test et post-test.",
      "prognosis": "Pronostic détaillé à court terme (1 semaine), moyen terme (1 mois) et long terme (6 mois), avec facteurs pronostiques favorables/défavorables, risque de complications, qualité de vie attendue."
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel le plus probable",
        "probability": 70,
        "rationale": "Arguments cliniques, paracliniques et épidémiologiques en faveur",
        "distinguishingFeatures": "Critères pathognomoniques permettant la différenciation",
        "requiredTests": "Examens spécifiques pour confirmer/infirmer ce diagnostic"
      },
      {
        "condition": "Deuxième diagnostic différentiel",
        "probability": 50,
        "rationale": "Éléments cliniques compatibles malgré probabilité moindre",
        "distinguishingFeatures": "Signes distinctifs à rechercher spécifiquement",
        "requiredTests": "Explorations diagnostiques orientées"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Interne et Générale",
        "date": "DATE_PLACEHOLDER",
        "time": "TIME_PLACEHOLDER",
        "physician": "Dr. Claude EXPERT",
        "registration": "COUNCIL-MU-2024-EXPERT-001",
        "institution": "Centre Médical Maurice",
        "department": "Médecine Interne"
      },
      "patient": {
        "firstName": "PRENOM_PLACEHOLDER",
        "lastName": "NOM_PLACEHOLDER",
        "age": "AGE_PLACEHOLDER",
        "sex": "À préciser",
        "address": "Adresse complète à renseigner - Maurice",
        "phone": "Téléphone à renseigner",
        "idNumber": "Numéro carte d'identité mauricienne",
        "insurance": "Sécurité sociale mauricienne",
        "emergencyContact": "Contact d'urgence à préciser"
      },
      "content": {
        "chiefComplaint": "Motif principal de consultation avec chronologie précise: '${complaint}' évoluant depuis ${duration}. Retentissement fonctionnel: impact sur activités quotidiennes, travail, sommeil. Facteurs déclenchants identifiés ou non. Traitements déjà essayés et leur efficacité.",
        "history": "ANAMNÈSE COMPLÈTE - Histoire de la maladie actuelle: début des symptômes (brutal/progressif), évolution (stable/aggravation/amélioration), facteurs aggravants/soulageants, symptômes associés détaillés. ANTÉCÉDENTS: Médicaux (${medHistory}), chirurgicaux, obstétricaux si applicable, familiaux pertinents. HABITUDES DE VIE: Tabac, alcool, drogues, activité physique, alimentation. VOYAGES RÉCENTS: Zones tropicales, risque infectieux. ALLERGIES: ${allergies}. TRAITEMENTS: ${currentMeds} avec posologies et observance.",
        "examination": "EXAMEN PHYSIQUE SYSTÉMATIQUE - Constantes vitales: TA ${bp} mmHg, FC ${vitalSigns.heartRate || 'À mesurer'} bpm, FR ${vitalSigns.respiratoryRate || 'À mesurer'}/min, T° ${vitalSigns.temperature || 'À mesurer'}°C, SaO2 ${vitalSigns.oxygenSaturation || 'À mesurer'}%. Douleur: ${painScale}/10. EXAMEN GÉNÉRAL: État général, conscience (Glasgow si indiqué), coloration cutanéo-muqueuse, hydratation, nutrition, ganglions. EXAMEN ORIENTÉ: Cardiovasculaire (bruits du cœur, souffle, œdèmes), Pulmonaire (inspection, palpation, percussion, auscultation), Abdominal (inspection, palpation, percussion, auscultation), Neurologique (selon symptômes), ORL et autres appareils selon orientation clinique.",
        "clinicalSynthesis": "SYNTHÈSE CLINIQUE: Syndrome(s) identifié(s), orientation diagnostique principale avec arguments, degré d'urgence, nécessité d'hospitalisation ou de surveillance rapprochée.",
        "diagnosis": "DIAGNOSTIC RETENU: [Diagnostic généré par l'IA] avec degré de certitude élevé/moyen/faible. Code CIM-10 correspondant. Stade évolutif si applicable.",
        "plan": "PLAN DE PRISE EN CHARGE - DIAGNOSTIC: Examens complémentaires orientés par ordre de priorité avec délais. THÉRAPEUTIQUE: Traitement étiologique si possible, symptomatique adapté, mesures non médicamenteuses. SURVEILLANCE: Critères de réévaluation, signes d'alarme à surveiller, prochaine consultation programmée. ÉDUCATION: Conseils au patient, informations sur la pathologie, mesures préventives. CERTIFICATS: Arrêt de travail si nécessaire, certificat médical selon demande."
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS DE LABORATOIRE",
        "date": "DATE_PLACEHOLDER",
        "number": "BIO-MU-NUMERO_PLACEHOLDER",
        "physician": "Dr. Claude EXPERT",
        "registration": "COUNCIL-MU-2024-EXPERT-001",
        "institution": "Centre Médical Maurice"
      },
      "patient": {
        "identity": "PATIENT_PLACEHOLDER",
        "insurance": "Sécurité sociale mauricienne"
      },
      "prescriptions": [
        {
          "category": "Hématologie",
          "exam": "Hémogramme complet avec formule leucocytaire et numération plaquettaire",
          "indication": "Recherche d'anémie, syndrome infectieux, troubles hématologiques. Évaluation état général.",
          "urgency": "Semi-urgent (24-48h)",
          "fasting": "Non requis",
          "clinicalContext": "Contexte: ${complaint}. Recherche de syndrome anémique, infectieux ou inflammatoire.",
          "expectedResults": "VGM, CCMH, leucocytes avec formule, plaquettes, recherche d'anomalies morphologiques",
          "sampleType": "Sang veineux sur tube EDTA",
          "volume": "5 mL",
          "contraindications": "Aucune contre-indication",
          "preparation": "Aucune préparation spécifique",
          "mauritianAvailability": "Disponible tous laboratoires publics/privés Maurice",
          "cost": "Pris en charge sécurité sociale mauricienne",
          "referenceValues": "Normes laboratoire mauricien"
        },
        {
          "category": "Biochimie inflammatoire",
          "exam": "CRP ultrasensible + Vitesse de sédimentation",
          "indication": "Évaluation syndrome inflammatoire aigu et chronique. Suivi évolution.",
          "urgency": "Semi-urgent",
          "fasting": "Non requis",
          "clinicalContext": "Diagnostic différentiel processus inflammatoire vs infectieux",
          "expectedResults": "CRP <3 mg/L (normal), VS selon âge et sexe",
          "sampleType": "Sang veineux",
          "contraindications": "Aucune",
          "mauritianAvailability": "Standard laboratoires Maurice"
        },
        {
          "category": "Biochimie métabolique",
          "exam": "Bilan métabolique de base (Glycémie, Urée, Créatinine, Ionogramme complet)",
          "indication": "Évaluation fonction rénale, équilibre hydroélectrolytique, dépistage diabète",
          "urgency": "Programmé (48-72h)",
          "fasting": "Jeûne 12h recommandé pour glycémie",
          "clinicalContext": "Bilan systématique, recherche de comorbidités",
          "expectedResults": "Glycémie 4.1-5.9 mmol/L, Créatinine selon âge/sexe, DFG >90 mL/min",
          "sampleType": "Sang veineux sur tube sec",
          "mauritianAvailability": "Tous laboratoires Maurice"
        }
      ],
      "additionalNotes": "Résultats à remettre au patient avec recommandation de consultation rapide si anomalies. Laboratoires agréés sécurité sociale Maurice recommandés."
    },
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS D'IMAGERIE ET EXPLORATIONS FONCTIONNELLES",
        "date": "DATE_PLACEHOLDER",
        "number": "PARA-MU-NUMERO_PLACEHOLDER",
        "physician": "Dr. Claude EXPERT",
        "registration": "COUNCIL-MU-2024-EXPERT-001",
        "institution": "Centre Médical Maurice"
      },
      "prescriptions": [
        {
          "category": "Imagerie thoracique",
          "exam": "Radiographie thoracique de face et profil",
          "indication": "Exploration parenchyme pulmonaire, médiastin, silhouette cardiaque selon symptomatologie",
          "urgency": "Programmé (72h-1 semaine)",
          "clinicalContext": "Contexte clinique: ${complaint}. Recherche de pathologie thoracique",
          "technique": "Technique standard, inspiration bloquée, debout si possible",
          "preparation": "Retrait bijoux et objets métalliques thoraciques. Signaler grossesse.",
          "contraindications": "Grossesse (radioprotection obligatoire si indispensable)",
          "radiation": "Dose faible, risque négligeable",
          "duration": "10 minutes",
          "interpretation": "Analyse par radiologue agréé avec compte-rendu détaillé",
          "mauritianAvailability": "Hôpitaux publics (Dr Jeetoo, Candos, Flacq) et centres privés agréés",
          "cost": "Gratuit secteur public, tarif conventionné secteur privé",
          "appointment": "Rendez-vous non nécessaire secteur public, recommandé secteur privé"
        },
        {
          "category": "Échographie abdominale",
          "exam": "Échographie abdominopelvienne complète",
          "indication": "Exploration organes abdominaux selon orientation clinique",
          "urgency": "Programmé",
          "preparation": "Jeûne 6h, vessie pleine si exploration pelvienne",
          "duration": "20-30 minutes",
          "mauritianAvailability": "Centres d'imagerie publics et privés Maurice"
        }
      ]
    },
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE SÉCURISÉE",
        "subtitle": "PRESCRIPTION THÉRAPEUTIQUE",
        "date": "DATE_PLACEHOLDER",
        "number": "MED-MU-NUMERO_PLACEHOLDER",
        "physician": "Dr. Claude EXPERT",
        "registration": "COUNCIL-MU-2024-EXPERT-001",
        "institution": "Centre Médical Maurice",
        "validity": "Ordonnance valable 3 mois",
        "renewals": "Non renouvelable sans consultation"
      },
      "patient": {
        "identity": "PATIENT_PLACEHOLDER",
        "weight": "${patientData?.weight || 'À préciser'}kg",
        "allergies": "${allergies}",
        "contraceptions": "À préciser si applicable",
        "pregnancy": "Grossesse: À vérifier si femme en âge de procréer"
      },
      "prescriptions": [
        {
          "class": "Antalgique non opioïde",
          "dci": "Paracétamol",
          "brand": "Efferalgan® / Doliprane® (disponibles Maurice)",
          "presentation": "Comprimés 1000mg",
          "dosage": "${age >= 65 ? '500-750mg' : '1000mg'}",
          "frequency": "3 fois par jour si douleur",
          "timing": "Espacement minimum 6h entre prises",
          "duration": "5 jours maximum en automédication",
          "totalQuantity": "15 comprimés",
          "indication": "Traitement symptomatique douleur légère à modérée et/ou fièvre",
          "administration": "Per os, au cours ou en dehors des repas, avec un grand verre d'eau",
          "contraindications": "${allergies.includes('Paracétamol') ? 'ALLERGIE DOCUMENTÉE PATIENT' : 'Insuffisance hépatocellulaire sévère, hypersensibilité au paracétamol'}",
          "precautions": "Surveillance hépatique si >3g/jour ou traitement prolongé. Attention interactions alcool. Dose maximale 4g/24h adulte.",
          "monitoring": "Surveiller efficacité antalgique, signes d'hépatotoxicité (ictère, asthénie), respect posologie",
          "sideEffects": "Rares: réactions allergiques, hépatotoxicité si surdosage",
          "overdose": "Hépatotoxicité grave si >150mg/kg. Antidote: N-acétylcystéine",
          "mauritianAvailability": "Médicament essentiel disponible toutes pharmacies Maurice",
          "cost": "Prix réglementé, remboursement sécurité sociale",
          "genericSubstitution": "Substitution par générique autorisée"
        },
        {
          "class": "Anti-inflammatoire non stéroïdien (si indiqué)",
          "dci": "Ibuprofène",
          "brand": "Brufen® / Nurofen® (Maurice)",
          "presentation": "Comprimés 400mg",
          "dosage": "400mg",
          "frequency": "2-3 fois par jour pendant les repas",
          "duration": "3-5 jours maximum",
          "indication": "Anti-inflammatoire et antalgique si composante inflammatoire",
          "contraindications": "Allergie AINS, insuffisance rénale/cardiaque/hépatique, ulcère gastroduodénal, grossesse 3ème trimestre, anticoagulants",
          "precautions": "Fonction rénale, tension artérielle, protection gastrique si facteurs de risque",
          "mauritianAvailability": "Disponible pharmacies Maurice"
        }
      ],
      "clinicalAdvice": {
        "generalRecommendations": "Conseils hygiéno-diététiques adaptés au climat tropical mauricien",
        "hydration": "Hydratation renforcée (2-3L/jour) compte tenu du climat tropical et de la sudation",
        "diet": "Alimentation équilibrée, fruits tropicaux riches en vitamines, éviter alcool avec traitements",
        "activity": "Activité physique adaptée aux symptômes, éviter efforts intenses si fièvre",
        "rest": "Repos suffisant, sieste si asthénie, environnement frais et aéré",
        "mosquitoProtection": "Protection anti-moustiques (répulsifs, moustiquaires) prévention dengue/chikungunya",
        "followUp": "Consultation de réévaluation programmée selon évolution",
        "emergencyContact": "Numéro urgences Maurice: 999 (SAMU), 114 (Police), 115 (Pompiers)"
      },
      "followUpCriteria": {
        "improvement": "Amélioration attendue sous 48-72h avec traitement symptomatique",
        "noImprovement": "Reconsultation si pas d'amélioration sous 3-5 jours",
        "redFlags": "Consultation urgente si: fièvre >39°C persistante, troubles conscience, difficultés respiratoires, douleurs intenses non calmées, signes déshydratation"
      }
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
