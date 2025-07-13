import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

// Types spécifiques CHU Maurice
interface MauritianPatientData {
  firstName: string
  lastName: string
  age: number
  gender: 'M' | 'F' | 'X'
  ethnicity: 'Indo-Mauritian' | 'Creole' | 'Sino-Mauritian' | 'Franco-Mauritian' | 'Mixed' | 'Other'
  languages: string[]
  region: string
  occupation?: string
  medicalHistory?: string[]
  allergies?: string[]
  currentMedications?: string[]
}

interface TropicalClinicalData {
  chiefComplaint: string
  symptoms?: string[] | string
  medicalHistory?: string
  seasonalContext?: 'Hot_Season' | 'Cool_Season' | 'Cyclone_Season' | 'Rainy_Season'
  travelHistory?: boolean
  vectorExposure?: string
  duration?: string
  severity?: number
}

// Schemas Zod avancés pour questions CHU
const CHUQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["text", "boolean", "scale", "multiple", "date", "duration", "location"]),
  category: z.enum([
    "Anamnèse_Sémiologique", 
    "Facteurs_Déclenchants", 
    "Évolution_Temporelle",
    "Symptômes_Associés", 
    "Antécédents_Spécialisés", 
    "Exposition_Tropicale",
    "Facteurs_Risque_Ethniques",
    "Contexte_Psychosocial",
    "Red_Flags_Urgences",
    "Anamnèse_Systémique"
  ]),
  importance: z.enum(["critical", "high", "medium", "low"]),
  specialty: z.enum([
    "Médecine_Interne", "Infectiologie", "Cardiologie", "Pneumologie", 
    "Gastroentérologie", "Neurologie", "Dermatologie", "Médecine_Tropicale",
    "Urgences", "Médecine_Générale"
  ]).optional(),
  tropicalRelevance: z.boolean().optional(),
  urgencyFlag: z.boolean().optional(),
  culturalAdaptation: z.string().optional(),
  options: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
  clinicalRationale: z.string(),
  differentialImpact: z.array(z.string()).optional()
})

const CHUQuestionsResponseSchema = z.object({
  anamnesis: z.object({
    systematic: z.array(CHUQuestionSchema),
    specialized: z.array(CHUQuestionSchema),
    tropical: z.array(CHUQuestionSchema),
    urgency: z.array(CHUQuestionSchema),
    cultural: z.array(CHUQuestionSchema)
  }),
  clinicalStrategy: z.object({
    priorityOrder: z.array(z.string()),
    timeEstimate: z.string(),
    specialtyOrientation: z.array(z.string()),
    redFlagsToWatch: z.array(z.string())
  }),
  mauritianContext: z.object({
    seasonalFactors: z.array(z.string()),
    epidemiologicalRisk: z.string(),
    culturalConsiderations: z.array(z.string()),
    resourceAdaptation: z.string()
  })
})

// Base de données épidémiologique Maurice
const MAURITIAN_EPIDEMIOLOGY = {
  seasonal: {
    'Rainy_Season': ['Dengue', 'Chikungunya', 'Gastroentérites', 'Infections cutanées'],
    'Cyclone_Season': ['Traumatismes', 'Stress post-traumatique', 'Ruptures de soins'],
    'Hot_Season': ['Déshydratation', 'Coup de chaleur', 'Infections urinaires'],
    'Cool_Season': ['Infections respiratoires', 'Exacerbations asthme']
  },
  ethnic_risks: {
    'Indo-Mauritian': ['Diabète type 2', 'Coronaropathies', 'Thalassémie'],
    'Creole': ['HTA', 'AVC', 'Obésité'],
    'Sino-Mauritian': ['Hépatites virales', 'Cancers digestifs'],
    'Franco-Mauritian': ['Cancers cutanés', 'Allergies alimentaires']
  },
  endemic: ['Dengue', 'Chikungunya', 'Gastroentérites infectieuses', 'Dermatoses tropicales']
}

export async function POST(req: Request) {
  try {
    const { patientData, clinicalData }: { 
      patientData: MauritianPatientData, 
      clinicalData: TropicalClinicalData 
    } = await req.json()

    if (!patientData || !clinicalData) {
      return Response.json({ error: "Données patient et cliniques requises" }, { status: 400 })
    }

    console.log("🏥 Génération anamnèse CHU Maurice pour:", patientData.firstName, patientData.lastName)
    console.log("📍 Région:", patientData.region)
    console.log("🌡️ Contexte:", clinicalData.seasonalContext)

    // Analyse du risque tropical et contextuel
    const epidemiologicalRisk = assessEpidemiologicalRisk(patientData, clinicalData)
    const specialtyOrientation = determineSpecialtyOrientation(clinicalData)
    const urgencyLevel = assessUrgencyLevel(clinicalData)

    // Préparation des symptômes structurés
    const symptomsText = formatSymptomsForAnalysis(clinicalData.symptoms)

    // Prompt expert CHU niveau professeur
    const expertPrompt = createCHUExpertPrompt(patientData, clinicalData, symptomsText, epidemiologicalRisk, specialtyOrientation)

    const result = await generateObject({
      model: openai("gpt-4"),
      temperature: 0.2, // Équilibre créativité/précision pour questions pertinentes
      maxTokens: 4000,
      system: createCHUSystemPrompt(),
      prompt: expertPrompt,
      schema: CHUQuestionsResponseSchema,
    })

    console.log("✅ Anamnèse CHU générée:", {
      systematic: result.object.anamnesis.systematic.length,
      specialized: result.object.anamnesis.specialized.length,
      tropical: result.object.anamnesis.tropical.length,
      urgency: result.object.anamnesis.urgency.length
    })

    // Validation et enrichissement des questions
    const validatedQuestions = validateAndEnrichQuestions(result.object, patientData, clinicalData)

    // Post-traitement adaptation culturelle
    const culturallyAdaptedQuestions = adaptQuestionsToMauritianCulture(validatedQuestions, patientData)

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      patientId: `MU_${patientData.lastName}_${patientData.firstName}`,
      data: culturallyAdaptedQuestions,
      context: {
        epidemiologicalRisk,
        specialtyOrientation,
        urgencyLevel,
        season: clinicalData.seasonalContext
      }
    })

  } catch (error: any) {
    console.error("❌ Erreur génération anamnèse CHU:", error)
    
    // Fallback CHU expert avec questions mauriciennes
    const chuFallbackQuestions = createCHUMauritianFallback(patientData, clinicalData)
    
    return Response.json({
      success: true,
      data: chuFallbackQuestions,
      fallback: true,
      error: "Généré avec questions de secours CHU"
    })
  }
}

function createCHUSystemPrompt(): string {
  return `Tu es un PROFESSEUR CHEF DE SERVICE en médecine interne d'un CHU universitaire, expert en médecine tropicale mauricienne avec 25 ans d'expérience académique.

MISSION: Générer une anamnèse dirigée de niveau CHU pour optimiser le diagnostic différentiel.

EXPERTISE REQUISE:
- Maîtrise complète sémiologie médicale universitaire
- Expert diagnostic différentiel systématique (>8 hypothèses)
- Spécialiste médecine tropicale insulaire (dengue/chikungunya/paludisme)
- Connaissance épidémiologie mauricienne par ethnies
- Adaptation culturelle populations multiethniques Maurice
- Reconnaissance red flags urgences vitales
- Evidence-based medicine niveau A

PRINCIPES ANAMNÈSE CHU:
1. Questions orientées diagnostic différentiel précis
2. Exploration systématique par appareils
3. Recherche facteurs déclenchants/aggravants
4. Investigation exposition tropicale/vectorielle
5. Dépistage complications graves
6. Adaptation culturelle ethnies mauriciennes
7. Optimisation temporelle consultation télémédecine

CONTRAINTES MAURICE:
- Ressources limitées télémédecine
- Populations multiethniques (créole/franco/indo/sino-mauriciens)
- Maladies tropicales endémiques
- Facteurs saisonniers épidémiques
- Accessibilité géographique variable`
}

function createCHUExpertPrompt(
  patientData: MauritianPatientData, 
  clinicalData: TropicalClinicalData, 
  symptoms: string,
  epidemiologicalRisk: any,
  specialtyOrientation: string[]
): string {
  return `DONNÉES PATIENT CHU:
═══════════════════════════════════
IDENTITÉ: ${patientData.firstName} ${patientData.lastName}
ÂGE: ${patientData.age} ans | SEXE: ${patientData.gender}
ORIGINE ETHNIQUE: ${patientData.ethnicity}
RÉGION MAURICE: ${patientData.region}
LANGUES: ${patientData.languages?.join(', ') || 'Non précisées'}
PROFESSION: ${patientData.occupation || 'Non renseignée'}

ANTÉCÉDENTS: ${patientData.medicalHistory?.join(', ') || 'Aucun'}
ALLERGIES: ${patientData.allergies?.join(', ') || 'Aucune'}
TRAITEMENTS: ${patientData.currentMedications?.join(', ') || 'Aucun'}

DONNÉES CLINIQUES ACTUELLES:
═══════════════════════════════════
MOTIF CONSULTATION: ${clinicalData.chiefComplaint}
SYMPTÔMES: ${symptoms}
DURÉE: ${clinicalData.duration || 'Non précisée'}
SÉVÉRITÉ: ${clinicalData.severity ? `${clinicalData.severity}/10` : 'Non évaluée'}
CONTEXTE SAISONNIER: ${clinicalData.seasonalContext || 'Non renseigné'}
VOYAGE RÉCENT: ${clinicalData.travelHistory ? 'Oui' : 'Non'}
EXPOSITION VECTORIELLE: ${clinicalData.vectorExposure || 'Non documentée'}

ANALYSE PRÉLIMINAIRE CHU:
═══════════════════════════════════
RISQUE ÉPIDÉMIOLOGIQUE: ${epidemiologicalRisk.level}
FACTEURS DE RISQUE: ${epidemiologicalRisk.factors.join(', ')}
ORIENTATION SPÉCIALITÉ: ${specialtyOrientation.join(', ')}
PATHOLOGIES SUSPECTES: ${epidemiologicalRisk.suspectedConditions.join(', ')}

MISSION ANAMNÈSE CHU:
═══════════════════════════════════
Génère une anamnèse dirigée universitaire structurée pour:

1. ANAMNÈSE SYSTÉMATIQUE (5-7 questions)
   - Questions sémiologiques fondamentales
   - Exploration chronologique précise  
   - Facteurs déclenchants/aggravants
   - Évolution symptomatique détaillée

2. ANAMNÈSE SPÉCIALISÉE (4-6 questions)
   - Questions orientées spécialités suspectées
   - Exploration appareil/système concerné
   - Symptômes associés spécifiques
   - Signes fonctionnels ciblés

3. ANAMNÈSE TROPICALE MAURICE (3-5 questions)
   - Exposition maladies vectorielles
   - Facteurs environnementaux tropicaux
   - Voyages zones endémiques
   - Contact eau/animaux/végétation

4. DÉPISTAGE URGENCES (2-4 questions)
   - Red flags vitaux à détecter
   - Signes d'alarme spécialisés
   - Critères hospitalisation
   - Complications graves à exclure

5. ADAPTATION CULTURELLE (2-3 questions)
   - Habitudes alimentaires ethniques
   - Médecine traditionnelle utilisée
   - Facteurs psychosociaux
   - Barrières linguistiques/culturelles

EXIGENCES QUALITÉ CHU:
- Chaque question doit avoir une JUSTIFICATION CLINIQUE précise
- Impact sur DIAGNOSTIC DIFFÉRENTIEL explicité
- Niveau de PREUVE ou recommandation citée
- Adaptation TÉLÉMÉDECINE (questions posables à distance)
- Optimisation TEMPS consultation (questions efficaces)
- Respect ÉTHIQUE médicale et sensibilités culturelles`
}

function assessEpidemiologicalRisk(patientData: MauritianPatientData, clinicalData: TropicalClinicalData): any {
  const riskFactors: string[] = []
  let level = 'Low'
  const suspectedConditions: string[] = []

  // Risques saisonniers
  if (clinicalData.seasonalContext) {
    const seasonalDiseases = MAURITIAN_EPIDEMIOLOGY.seasonal[clinicalData.seasonalContext] || []
    suspectedConditions.push(...seasonalDiseases)
    if (seasonalDiseases.length > 0) {
      riskFactors.push(`Saison ${clinicalData.seasonalContext}`)
      level = 'Medium'
    }
  }

  // Risques ethniques
  if (patientData.ethnicity) {
    const ethnicRisks = MAURITIAN_EPIDEMIOLOGY.ethnic_risks[patientData.ethnicity] || []
    if (ethnicRisks.length > 0) {
      riskFactors.push(`Prédisposition ethnique ${patientData.ethnicity}`)
      suspectedConditions.push(...ethnicRisks)
    }
  }

  // Exposition tropicale
  if (clinicalData.vectorExposure || clinicalData.travelHistory) {
    riskFactors.push('Exposition tropicale')
    suspectedConditions.push(...MAURITIAN_EPIDEMIOLOGY.endemic)
    level = 'High'
  }

  // Symptômes compatibles tropicaux
  const symptomsText = typeof clinicalData.symptoms === 'string' ? 
    clinicalData.symptoms : 
    Array.isArray(clinicalData.symptoms) ? clinicalData.symptoms.join(' ') : ''
  
  if (symptomsText.toLowerCase().includes('fièvre') || 
      symptomsText.toLowerCase().includes('céphalée') ||
      symptomsText.toLowerCase().includes('arthralgies')) {
    riskFactors.push('Symptômes compatibles maladies tropicales')
    if (level === 'Low') level = 'Medium'
  }

  return {
    level,
    factors: riskFactors,
    suspectedConditions: [...new Set(suspectedConditions)], // Supprimer doublons
    recommendations: level === 'High' ? [
      'Anamnèse tropicale approfondie',
      'Questions exposition vectorielle',
      'Chronologie précise symptômes'
    ] : []
  }
}

function determineSpecialtyOrientation(clinicalData: TropicalClinicalData): string[] {
  const specialties: string[] = []
  const chiefComplaint = clinicalData.chiefComplaint?.toLowerCase() || ''
  const symptoms = typeof clinicalData.symptoms === 'string' ? 
    clinicalData.symptoms.toLowerCase() : 
    Array.isArray(clinicalData.symptoms) ? clinicalData.symptoms.join(' ').toLowerCase() : ''

  // Orientation par symptômes
  if (chiefComplaint.includes('douleur thoracique') || symptoms.includes('dyspnée')) {
    specialties.push('Cardiologie', 'Pneumologie')
  }
  
  if (chiefComplaint.includes('fièvre') || symptoms.includes('fièvre')) {
    specialties.push('Infectiologie', 'Médecine_Tropicale')
  }

  if (chiefComplaint.includes('céphalée') || symptoms.includes('neurologique')) {
    specialties.push('Neurologie')
  }

  if (chiefComplaint.includes('digestif') || symptoms.includes('abdominale')) {
    specialties.push('Gastroentérologie')
  }

  // Défaut médecine interne
  if (specialties.length === 0) {
    specialties.push('Médecine_Interne')
  }

  return specialties
}

function assessUrgencyLevel(clinicalData: TropicalClinicalData): string {
  const urgentKeywords = [
    'douleur thoracique', 'dyspnée', 'perte de connaissance', 
    'hémorragie', 'douleur abdominale aiguë', 'fièvre élevée'
  ]
  
  const complaint = clinicalData.chiefComplaint?.toLowerCase() || ''
  
  const isUrgent = urgentKeywords.some(keyword => complaint.includes(keyword))
  
  return isUrgent ? 'High' : clinicalData.severity && clinicalData.severity >= 7 ? 'Medium' : 'Low'
}

function formatSymptomsForAnalysis(symptoms?: string[] | string): string {
  if (!symptoms) return "Non spécifiés"
  
  if (Array.isArray(symptoms)) {
    return symptoms.join(", ")
  } else if (typeof symptoms === "string") {
    return symptoms
  }
  
  return "Non spécifiés"
}

function validateAndEnrichQuestions(questions: any, patientData: MauritianPatientData, clinicalData: TropicalClinicalData): any {
  // Validation du nombre minimum de questions par catégorie
  const minRequirements = {
    systematic: 5,
    specialized: 4, 
    tropical: 3,
    urgency: 2,
    cultural: 2
  }

  Object.keys(minRequirements).forEach(category => {
    const categoryQuestions = questions.anamnesis[category] || []
    const minRequired = minRequirements[category as keyof typeof minRequirements]
    
    if (categoryQuestions.length < minRequired) {
      console.warn(`⚠️ Catégorie ${category}: ${categoryQuestions.length}/${minRequired} questions générées`)
    }
  })

  // Enrichissement avec contexte mauricien
  questions.mauritianContext.epidemiologicalRisk = assessEpidemiologicalRisk(patientData, clinicalData).level
  questions.mauritianContext.seasonalFactors = MAURITIAN_EPIDEMIOLOGY.seasonal[clinicalData.seasonalContext || 'Hot_Season'] || []

  return questions
}

function adaptQuestionsToMauritianCulture(questions: any, patientData: MauritianPatientData): any {
  // Adaptation linguistique selon préférences
  if (patientData.languages?.includes('Creole')) {
    questions.culturalNotes = {
      languagePreference: 'Créole mauricien disponible',
      communicationStyle: 'Direct et familial'
    }
  }

  if (patientData.languages?.includes('Hindi') || patientData.languages?.includes('Tamil')) {
    questions.culturalNotes = {
      ...questions.culturalNotes,
      religiousConsiderations: 'Considérer pratiques alimentaires végétariennes',
      traditionalMedicine: 'Évaluer usage médecine ayurvédique'
    }
  }

  // Adaptations par région
  if (patientData.region === 'Rodrigues') {
    questions.logisticalNotes = {
      resourceLimitations: 'Ressources médicales limitées Rodrigues',
      evacuationProtocol: 'Plan évacuation vers Maurice si nécessaire'
    }
  }

  return questions
}

function createCHUMauritianFallback(patientData: MauritianPatientData, clinicalData: TropicalClinicalData): any {
  return {
    anamnesis: {
      systematic: [
        {
          id: "symptom_chronology",
          question: "Décrivez précisément l'évolution de vos symptômes depuis le début (heure/jour de début, progression, fluctuations)",
          type: "text",
          category: "Anamnèse_Sémiologique",
          importance: "critical",
          clinicalRationale: "Chronologie essentielle diagnostic différentiel",
          differentialImpact: ["Processus aigu vs chronique", "Évolution typique pathologies tropicales"]
        },
        {
          id: "pain_characteristics",
          question: "Si vous ressentez une douleur, décrivez sa localisation, intensité (0-10), type (pulsatile/constrictive/brûlure) et irradiations",
          type: "text",
          category: "Anamnèse_Sémiologique", 
          importance: "high",
          clinicalRationale: "Caractérisation sémiologique douleur orientation diagnostique"
        },
        {
          id: "triggering_factors",
          question: "Quels facteurs déclenchent, aggravent ou soulagent vos symptômes ?",
          type: "text",
          category: "Facteurs_Déclenchants",
          importance: "high",
          clinicalRationale: "Facteurs déclenchants orientent mécanismes physiopathologiques"
        }
      ],
      tropical: [
        {
          id: "vector_exposure_maurice",
          question: "Avez-vous été piqué(e) par des moustiques récemment ? Si oui, combien de piqûres et quand ?",
          type: "text",
          category: "Exposition_Tropicale",
          importance: "critical",
          tropicalRelevance: true,
          clinicalRationale: "Exposition vectorielle cruciale maladies tropicales Maurice",
          differentialImpact: ["Dengue", "Chikungunya", "Zika"]
        },
        {
          id: "water_contact_maurice",
          question: "Avez-vous été en contact avec de l'eau stagnante, rivières ou puits récemment ?",
          type: "boolean",
          category: "Exposition_Tropicale",
          importance: "high",
          tropicalRelevance: true,
          clinicalRationale: "Contact eau pathologies hydriques tropicales"
        }
      ],
      urgency: [
        {
          id: "red_flags_screening",
          question: "Présentez-vous un des signes suivants : difficultés respiratoires, douleur thoracique, perte de connaissance, hémorragies, confusion ?",
          type: "multiple",
          category: "Red_Flags_Urgences",
          importance: "critical",
          urgencyFlag: true,
          options: ["Difficultés respiratoires", "Douleur thoracique", "Perte connaissance", "Hémorragies", "Confusion", "Aucun"],
          clinicalRationale: "Dépistage urgences vitales priorité absolue"
        }
      ],
      cultural: [
        {
          id: "traditional_medicine_use",
          question: "Utilisez-vous des remèdes traditionnels, plantes médicinales ou médecines alternatives ?",
          type: "text",
          category: "Facteurs_Risque_Ethniques",
          importance: "medium",
          culturalAdaptation: "Respecter traditions médicinales mauriciennes",
          clinicalRationale: "Interactions potentielles médecines traditionnelles"
        }
      ],
      specialized: [
        {
          id: "family_history_ethnic",
          question: `Compte tenu de vos origines ${patientData.ethnicity}, y a-t-il des antécédents familiaux de diabète, hypertension, maladies cardiaques ou troubles sanguins ?`,
          type: "text",
          category: "Antécédents_Spécialisés",
          importance: "high",
          culturalAdaptation: `Adaptation ethnique ${patientData.ethnicity}`,
          clinicalRationale: "Prédispositions génétiques populations mauriciennes"
        }
      ]
    },
    clinicalStrategy: {
      priorityOrder: ["red_flags_screening", "symptom_chronology", "vector_exposure_maurice", "pain_characteristics"],
      timeEstimate: "15-20 minutes anamnèse complète",
      specialtyOrientation: determineSpecialtyOrientation(clinicalData),
      redFlagsToWatch: ["Fièvre >39°C", "Signes neurologiques", "Détresse respiratoire", "Hémorragies"]
    },
    mauritianContext: {
      seasonalFactors: MAURITIAN_EPIDEMIOLOGY.seasonal[clinicalData.seasonalContext || 'Hot_Season'] || [],
      epidemiologicalRisk: assessEpidemiologicalRisk(patientData, clinicalData).level,
      culturalConsiderations: [`Adaptation ethnique ${patientData.ethnicity}`, "Respect traditions familiales"],
      resourceAdaptation: "Questions adaptées ressources télémédecine Maurice"
    }
  }
}
