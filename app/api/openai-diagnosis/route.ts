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

    console.log('🩺 Génération diagnostic expert OpenAI...')

    // Calcul de l'âge et facteurs de risque
    const age = patientData.age || 0
    const imc = patientData.weight && patientData.height ? 
      (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : 'Non calculé'

    // PROMPT MÉDICAL EXPERT DE HAUT NIVEAU
    const expertPrompt = `Tu es le Dr. Claude EXPERT, médecin interniste senior avec 25 ans d'expérience clinique, spécialisé en médecine tropicale et médecine interne. Tu exerces à Maurice et tu maîtrises parfaitement l'épidémiologie locale, les pathologies tropicales endémiques et les spécificités du système de santé mauricien.

═══════════════════════════════════════════════════════════════
📋 DOSSIER MÉDICAL COMPLET - ANALYSE EXPERTE DEMANDÉE
═══════════════════════════════════════════════════════════════

🔍 DONNÉES DÉMOGRAPHIQUES ET ANTHROPOMÉTRIQUES:
• Patient: ${patientData.firstName} ${patientData.lastName}, ${age} ans
• IMC: ${imc} kg/m² (Poids: ${patientData.weight}kg, Taille: ${patientData.height}cm)
• Antécédents: ${(patientData.medicalHistory || []).join(', ') || 'Aucun renseigné'}
• Allergies: ${(patientData.allergies || []).join(', ') || 'Aucune connue'}
• Traitements actuels: ${(patientData.currentMedications || []).join(', ') || 'Aucun'}

🩺 PRÉSENTATION CLINIQUE:
• Motif de consultation: ${clinicalData.chiefComplaint || 'Non précisé'}
• Durée des symptômes: ${clinicalData.symptomDuration || 'Non précisée'}
• Symptômes associés: ${(clinicalData.symptoms || []).join(', ') || 'Aucun'}
• Échelle douleur: ${clinicalData.painScale || 0}/10
• Localisation: ${clinicalData.painLocation || 'Non précisée'}

📊 CONSTANTES VITALES:
• TA: ${clinicalData.vitalSigns?.bloodPressureSystolic || '?'}/${clinicalData.vitalSigns?.bloodPressureDiastolic || '?'} mmHg
• FC: ${clinicalData.vitalSigns?.heartRate || '?'} bpm
• Température: ${clinicalData.vitalSigns?.temperature || '?'}°C
• SaO2: ${clinicalData.vitalSigns?.oxygenSaturation || '?'}%
• FR: ${clinicalData.vitalSigns?.respiratoryRate || '?'} /min

🤖 ANALYSE IA PRÉLIMINAIRE:
${JSON.stringify(questionsData, null, 2)}

═══════════════════════════════════════════════════════════════
🎯 MISSION DIAGNOSTIQUE EXPERTE
═══════════════════════════════════════════════════════════════

En tant que médecin expert, procède à une analyse diagnostique de haut niveau en appliquant:

1️⃣ RAISONNEMENT CLINIQUE STRUCTURÉ:
• Syndrome clinique principal et syndromes associés
• Physiopathologie probable
• Facteurs de risque et comorbidités
• Contexte épidémiologique mauricien (climat tropical, pathologies endémiques)

2️⃣ DIAGNOSTIC DIFFÉRENTIEL EXPERT:
• Hypothèses par ordre de probabilité décroissante
• Critères diagnostiques positifs et négatifs
• Examens complémentaires orientés et hiérarchisés
• Red flags et urgences à éliminer

3️⃣ SPÉCIFICITÉS MAURICIENNES:
• Pathologies tropicales (dengue, chikungunya, paludisme si voyage)
• Maladies infectieuses locales
• Facteurs environnementaux (humidité, chaleur)
• Disponibilité des examens et traitements locaux

4️⃣ PRESCRIPTIONS ADAPTÉES AU CONTEXTE LOCAL:
• Examens biologiques disponibles à Maurice
• Imagerie accessible (public/privé)
• Médicaments du formulaire mauricien
• Posologies adaptées au climat tropical

EXIGENCE ABSOLUE: Ta réponse doit être UNIQUEMENT un objet JSON valide, sans markdown ni texte additionnel.

{
  "diagnosis": {
    "primary": {
      "condition": "Diagnostic principal précis avec terminologie médicale",
      "icd10": "Code CIM-10 exact",
      "confidence": 85,
      "severity": "mild|moderate|severe|critical",
      "detailedAnalysis": "Analyse physiopathologique détaillée: mécanismes impliqués, évolution naturelle, pronostic fonctionnel et vital. Intégration des données cliniques, paracliniques et contextuelles.",
      "clinicalRationale": "Raisonnement clinique expert: critères diagnostiques remplis, éléments d'orientation positifs, éléments contre le diagnostic, cohérence syndromique, probabilité pré-test et post-test.",
      "prognosis": "Pronostic à court/moyen/long terme, facteurs pronostiques, complications potentielles, morbi-mortalité, qualité de vie attendue",
      "urgency": "immediate|urgent|semi-urgent|programmable",
      "redFlags": ["Signes d'alarme identifiés ou écartés"],
      "tropicalConsiderations": "Spécificités liées au contexte tropical mauricien, pathologies endémiques à considérer"
    },
    "differential": [
      {
        "condition": "Diagnostic différentiel 1",
        "probability": 75,
        "rationale": "Arguments pour ce diagnostic: symptômes évocateurs, épidémiologie, facteurs de risque",
        "distinguishingFeatures": "Critères discriminants pour confirmer/infirmer",
        "requiredTests": "Examens spécifiques pour ce diagnostic",
        "mauritianPrevalence": "Prévalence/incidence locale si pertinent"
      },
      {
        "condition": "Diagnostic différentiel 2", 
        "probability": 60,
        "rationale": "Arguments cliniques et paracliniques",
        "distinguishingFeatures": "Éléments distinctifs",
        "requiredTests": "Explorations nécessaires",
        "mauritianPrevalence": "Données épidémiologiques locales"
      },
      {
        "condition": "Diagnostic différentiel 3",
        "probability": 40,
        "rationale": "Éléments en faveur malgré probabilité moindre",
        "distinguishingFeatures": "Signes pathognomoniques à rechercher",
        "requiredTests": "Investigations diagnostiques",
        "mauritianPrevalence": "Contexte épidémiologique mauricien"
      }
    ],
    "excludedDiagnoses": [
      {
        "condition": "Diagnostic écarté",
        "reason": "Arguments contre: absence de critères, éléments incompatibles"
      }
    ]
  },
  "mauritianDocuments": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        "subtitle": "République de Maurice - Médecine Générale et Interne",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "time": "${new Date().toLocaleTimeString('fr-FR')}",
        "physician": "Dr. ${patientData.physicianName || 'Claude MÉDECIN'}",
        "registration": "COUNCIL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}",
        "hospital": "Système de Santé Mauricien",
        "department": "Médecine Interne/Médecine Générale"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${age} ans",
        "sex": "${patientData.sex || 'À préciser'}",
        "address": "Adresse complète à préciser - Maurice",
        "idNumber": "Numéro carte d'identité mauricienne",
        "phoneNumber": "Téléphone à préciser",
        "weight": "${patientData.weight}kg",
        "height": "${patientData.height}cm",
        "bmi": "${imc}",
        "bloodType": "Groupe sanguin à déterminer"
      },
      "content": {
        "chiefComplaint": "Motif précis de consultation avec temporalité et retentissement fonctionnel",
        "history": "Anamnèse complète: histoire de la maladie actuelle (SOCRATES), antécédents médicaux/chirurgicaux/familiaux pertinents, traitements, allergies, habitudes de vie, voyage récent",
        "examination": "Examen physique systématique: constantes vitales, examen général (conscience, coloration, hydratation, nutrition), examen orienté par appareil selon la symptomatologie",
        "clinicalSynthesis": "Synthèse clinique: syndrome(s) identifié(s), orientation diagnostique, degré d'urgence",
        "diagnosis": "Diagnostic retenu avec code CIM-10 et degré de certitude",
        "plan": "Plan diagnostique et thérapeutique: examens complémentaires programmés, traitement initial, surveillance, réévaluation, conseils au patient",
        "followUp": "Modalités de suivi et critères de réévaluation urgente"
      }
    },
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS DE LABORATOIRE",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "number": "BIO-MU-${Date.now()}",
        "physician": "Dr. ${patientData.physicianName || 'Claude MÉDECIN'}",
        "registration": "COUNCIL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}",
        "hospital": "Réseau de Laboratoires Maurice",
        "urgency": "Normal/Semi-urgent/Urgent"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${age} ans",
        "sex": "${patientData.sex || 'À préciser'}",
        "address": "Adresse complète - Maurice",
        "idNumber": "Carte d'identité mauricienne",
        "phoneNumber": "Contact téléphonique"
      },
      "prescriptions": [
        {
          "id": 1,
          "category": "Hématologie",
          "exam": "Hémogramme complet avec formule et plaquettes",
          "indication": "Recherche syndrome anémique, infectieux, hémorragique",
          "urgency": "Semi-urgent",
          "fasting": "Non",
          "expectedResults": "Numération globulaire, anomalies morphologiques",
          "sampleType": "Sang veineux sur EDTA",
          "contraindications": "Aucune",
          "mauritianAvailability": "Disponible tous laboratoires publics/privés",
          "cost": "Pris en charge sécurité sociale"
        },
        {
          "id": 2,
          "category": "Biochimie",
          "exam": "Bilan métabolique de base (glycémie, urée, créatinine, ionogramme)",
          "indication": "Évaluation fonction rénale et équilibre hydroélectrolytique",
          "urgency": "Normal",
          "fasting": "Oui (12h)",
          "expectedResults": "Fonction rénale, troubles métaboliques",
          "sampleType": "Sang veineux sur tube sec",
          "contraindications": "Aucune",
          "mauritianAvailability": "Standard laboratoires Maurice",
          "cost": "Couvert assurance maladie"
        }
      ]
    },
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE", 
        "subtitle": "PRESCRIPTION D'EXAMENS D'IMAGERIE ET EXPLORATIONS",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "number": "PARA-MU-${Date.now()}",
        "physician": "Dr. ${patientData.physicianName || 'Claude MÉDECIN'}",
        "registration": "COUNCIL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}",
        "hospital": "Réseau Imagerie Maurice",
        "department": "Radiologie/Explorations Fonctionnelles"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${age} ans",
        "sex": "${patientData.sex || 'À préciser'}",
        "address": "Adresse complète - Maurice",
        "idNumber": "Carte d'identité mauricienne",
        "phoneNumber": "Contact patient"
      },
      "prescriptions": [
        {
          "id": 1,
          "category": "Imagerie",
          "exam": "Radiographie thoracique de face et profil",
          "indication": "Exploration parenchyme pulmonaire, médiastin, cœur",
          "urgency": "Programmé",
          "preparation": "Retrait bijoux/objets métalliques, grossesse à signaler",
          "contraindications": "Grossesse (radioprotection)",
          "duration": "10 minutes",
          "mauritianAvailability": "Hôpitaux publics et centres privés",
          "cost": "Gratuit secteur public, tarif conventionné privé",
          "technicalDetails": "Technique standard, inspiration bloquée"
        }
      ]
    },
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION THÉRAPEUTIQUE SÉCURISÉE",
        "date": "${new Date().toLocaleDateString('fr-FR')}",
        "number": "MED-MU-${Date.now()}",
        "physician": "Dr. ${patientData.physicianName || 'Claude MÉDECIN'}",
        "registration": "COUNCIL-MU-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}",
        "hospital": "Système de Santé Maurice",
        "validity": "Valable 3 mois"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${age} ans",
        "sex": "${patientData.sex || 'À préciser'}",
        "weight": "${patientData.weight}kg",
        "address": "Adresse complète - Maurice",
        "idNumber": "Carte d'identité mauricienne",
        "allergies": "${(patientData.allergies || []).join(', ') || 'Aucune allergie connue'}",
        "pregnancy": "Statut grossesse à vérifier si applicable"
      },
      "prescriptions": [
        {
          "id": 1,
          "category": "Antalgique",
          "dci": "Paracétamol",
          "brand": "Efferalgan/Doliprane (Maurice)",
          "dosage": "${age >= 65 ? '500mg' : '1000mg'}",
          "frequency": "3 fois par jour si douleur",
          "duration": "5 jours maximum",
          "totalQuantity": "15 comprimés",
          "indication": "Traitement symptomatique douleur/fièvre",
          "contraindications": "${(patientData.allergies || []).includes('Paracétamol') ? 'ALLERGIE DOCUMENTÉE PATIENT' : 'Insuffisance hépatocellulaire sévère'}",
          "precautions": "Surveillance hépatique si >3g/jour, attention alcool",
          "monitoring": "Signes hépatotoxicité, efficacité antalgique",
          "mauritianAvailability": "Disponible toutes pharmacies Maurice, générique local",
          "cost": "Médicament essentiel, prix réglementé",
          "administration": "Per os, au cours ou en dehors des repas",
          "overdoseRisk": "Hépatotoxicité si >4g/24h chez l'adulte"
        }
      ],
      "clinicalAdvice": {
        "generalRecommendations": "Conseils hygiéno-diététiques adaptés au climat tropical mauricien",
        "dietaryAdvice": "Hydratation renforcée (climat tropical), alimentation équilibrée",
        "activityLevel": "Activité physique adaptée, repos selon symptômes",
        "followUpCriteria": "Critères de reconsultation urgente ou programmée",
        "emergencyContact": "Numéro urgences: 999 (SAMU Maurice)"
      }
    }
  }
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Tu es un médecin interniste expert avec 25 ans d'expérience, spécialisé en médecine tropicale et exerçant à Maurice. Tu maîtrises parfaitement:
- Diagnostic différentiel structuré et raisonnement clinique
- Pathologies tropicales et subtropicales endémiques
- Spécificités du système de santé mauricien
- Guidelines internationales et pratiques locales
- Prescriptions adaptées au formulaire mauricien

IMPÉRATIF: Réponds UNIQUEMENT en JSON valide, sans formatage markdown ni texte additionnel.`
        },
        {
          role: "user",
          content: expertPrompt
        }
      ],
      temperature: 0.2, // Très faible pour consistance maximale
      max_tokens: 4000,
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      throw new Error('Aucune réponse reçue d\'OpenAI')
    }

    console.log('📝 Réponse Médecin Expert (premiers 200 chars):', responseText.substring(0, 200))

    // Nettoyer et parser le JSON
    const parsedResponse = cleanAndParseJSON(responseText)

    // Vérification structure experte
    if (!parsedResponse.diagnosis || !parsedResponse.mauritianDocuments) {
      throw new Error('Structure de réponse invalide - manque diagnosis ou mauritianDocuments')
    }

    if (!parsedResponse.diagnosis.primary || !parsedResponse.diagnosis.differential) {
      throw new Error('Structure diagnostic incomplète - manque primary ou differential')
    }

    console.log('✅ Diagnostic Expert IA généré avec succès')
    console.log('🎯 Diagnostic principal:', parsedResponse.diagnosis.primary.condition)
    console.log('🔍 Nb diagnostics différentiels:', parsedResponse.diagnosis.differential.length)

    return NextResponse.json({
      success: true,
      diagnosis: parsedResponse.diagnosis,
      mauritianDocuments: parsedResponse.mauritianDocuments,
      expertLevel: true,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur Diagnostic Expert IA:', error)

    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du diagnostic expert',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      },
      { status: 500 }
    )
  }
}
