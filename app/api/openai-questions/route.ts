// /app/api/ai-medical-questions/route.ts - SYSTÈME IA QUESTIONS ADAPTATIVES UNIVERSELLES
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ==================== INTERFACES UNIVERSELLES ====================

interface MedicalContext {
  patient: PatientProfile
  clinical: ClinicalPresentation
  knownElements: string[]
  medicalHypotheses: DiagnosticHypothesis[]
  questioningStrategy: QuestioningStrategy
}

interface PatientProfile {
  demographics: {
    age: number
    gender: string
    bmi: number
    occupation?: string
  }
  medicalBackground: {
    allergies: string[]
    comorbidities: string[]
    medications: string[]
    familyHistory: string[]
    surgicalHistory: string[]
    socialHistory: {
      smoking: string
      alcohol: string
      drugs: string
    }
  }
  riskFactors: {
    cardiovascular: string[]
    metabolic: string[]
    infectious: string[]
    neoplastic: string[]
  }
}

interface ClinicalPresentation {
  chiefComplaint: string
  currentSymptoms: string[]
  timeline: string
  severity: string
  vitalSigns: {
    temperature?: number
    bloodPressure?: string
    heartRate?: number
    respiratoryRate?: number
    oxygenSaturation?: number
  }
  physicalFindings: string[]
}

interface DiagnosticHypothesis {
  diagnosis: string
  probability: 'high' | 'moderate' | 'low'
  urgency: 'immediate' | 'urgent' | 'semi-urgent' | 'routine'
  system: string
  keyFeatures: string[]
  differentials: string[]
  nextSteps: string[]
}

interface QuestioningStrategy {
  priority: 'rule_out_emergency' | 'narrow_differential' | 'confirm_diagnosis' | 'assess_severity'
  approach: 'symptom_focused' | 'system_review' | 'risk_stratification' | 'functional_assessment'
  cognitiveReasoning: string
}

interface AIGeneratedQuestion {
  id: number
  question: string
  type: 'multiple_choice' | 'yes_no' | 'scale' | 'open_text'
  options?: string[]
  medicalRationale: string
  diagnosticImpact: string
  clinicalScore?: string
  urgencyFlag?: boolean
  category: string
  complexity: 'accessible' | 'technical' | 'expert'
  cognitiveProcess: string
}

// ==================== ANALYSEUR DE CONTEXTE MÉDICAL IA ====================

function buildComprehensiveMedicalContext(patientData: any, clinicalData: any): MedicalContext {
  // Construction du profil patient complet
  const patient: PatientProfile = {
    demographics: {
      age: patientData.age || 0,
      gender: patientData.gender || 'unknown',
      bmi: calculateBMI(patientData.weight, patientData.height),
      occupation: patientData.occupation
    },
    medicalBackground: {
      allergies: patientData.allergies || [],
      comorbidities: patientData.medicalHistory || [],
      medications: parseMedications(patientData.currentMedicationsText),
      familyHistory: patientData.familyHistory || [],
      surgicalHistory: patientData.surgicalHistory || [],
      socialHistory: {
        smoking: patientData.lifeHabits?.smoking || 'unknown',
        alcohol: patientData.lifeHabits?.alcohol || 'unknown',
        drugs: patientData.lifeHabits?.drugs || 'unknown'
      }
    },
    riskFactors: identifyRiskFactors(patientData)
  }

  // Construction de la présentation clinique
  const clinical: ClinicalPresentation = {
    chiefComplaint: clinicalData.chiefComplaint || '',
    currentSymptoms: parseSymptoms(clinicalData.symptoms),
    timeline: extractTimeline(clinicalData.symptoms, clinicalData.chiefComplaint),
    severity: assessSeverity(clinicalData),
    vitalSigns: clinicalData.vitalSigns || {},
    physicalFindings: parsePhysicalFindings(clinicalData.physicalExam)
  }

  // Éléments déjà connus
  const knownElements = extractKnownElements(patientData, clinicalData)

  return {
    patient,
    clinical,
    knownElements,
    medicalHypotheses: [], // Sera rempli par l'IA
    questioningStrategy: { // Sera déterminé par l'IA
      priority: 'rule_out_emergency',
      approach: 'symptom_focused',
      cognitiveReasoning: ''
    }
  }
}

// ==================== PROMPT IA MÉDICAL UNIVERSEL ====================

function buildAIMedicalQuestioningPrompt(context: MedicalContext): string {
  return `Tu es un MÉDECIN EXPERT SENIOR avec 20+ ans d'expérience clinique. Tu dois utiliser ton RAISONNEMENT MÉDICAL COMPLET pour générer des questions diagnostiques optimales.

# CONTEXTE PATIENT COMPLET

## PROFIL PATIENT
**Démographie :** ${context.patient.demographics.age} ans, ${context.patient.demographics.gender}, IMC ${context.patient.demographics.bmi}
**Terrain médical :** ${context.patient.medicalBackground.comorbidities.join(', ') || 'Aucun antécédent'}
**Médicaments :** ${context.patient.medicalBackground.medications.join(', ') || 'Aucun traitement'}
**Allergies :** ${context.patient.medicalBackground.allergies.join(', ') || 'Aucune allergie connue'}
**Facteurs de risque :** CV: ${context.patient.riskFactors.cardiovascular.join(', ')}, Métabolique: ${context.patient.riskFactors.metabolic.join(', ')}
**Habitudes :** Tabac: ${context.patient.medicalBackground.socialHistory.smoking}, Alcool: ${context.patient.medicalBackground.socialHistory.alcohol}

## PRÉSENTATION CLINIQUE
**Motif principal :** ${context.clinical.chiefComplaint}
**Symptômes actuels :** ${context.clinical.currentSymptoms.join(', ')}
**Chronologie :** ${context.clinical.timeline}
**Signes vitaux :** T°${context.clinical.vitalSigns.temperature || '?'}°C, TA ${context.clinical.vitalSigns.bloodPressure || '?'}, FC ${context.clinical.vitalSigns.heartRate || '?'}/min
**Examen physique :** ${context.clinical.physicalFindings.join(', ') || 'Non renseigné'}

## ÉLÉMENTS DÉJÀ DOCUMENTÉS (ne pas redemander)
${context.knownElements.map(el => `• ${el}`).join('\n')}

# MISSION : RAISONNEMENT MÉDICAL EXPERT

## ÉTAPE 1 : ANALYSE DIAGNOSTIQUE COMPLÈTE
Utilise TOUTE ta connaissance médicale pour :
1. **Identifier les hypothèses diagnostiques** principales (H1, H2, H3...) avec probabilités
2. **Classifier l'urgence** (immédiate/urgente/semi-urgente/routine)
3. **Déterminer les systèmes impliqués** (cardio, pneumo, gastro, neuro, etc.)
4. **Identifier les red flags** potentiels à rechercher
5. **Évaluer les interactions médicamenteuses** possibles
6. **Considérer le contexte mauricien** (pathologies tropicales, résistances)

## ÉTAPE 2 : STRATÉGIE DE QUESTIONNEMENT LOGIQUE
Choisis la meilleure approche :
- **Si RED FLAGS possibles** → Questions d'urgence prioritaires
- **Si diagnostic évident** → Questions de confirmation + complications
- **Si différentiel large** → Questions discriminantes pour narrower
- **Si cause médicamenteuse** → Questions temporelles + observance
- **Si pathologie chronique** → Questions d'évolutivité + retentissement

## ÉTAPE 3 : GÉNÉRATION DE QUESTIONS EXPERTÉS
Génère 5-7 questions suivant cette LOGIQUE MÉDICALE :

### RÈGLES DE QUESTIONNEMENT EXPERT :
✓ **Hiérarchisation** : Red flags → Diagnostic principal → Différentiels → Sévérité
✓ **Efficacité diagnostique** : Questions à plus haute valeur discriminante
✓ **Scores cliniques appropriés** : Utilise les scores validés pertinents (HEART, SIRS, PHQ-9, etc.)
✓ **Contexte adapté** : Âge, sexe, comorbidités, médicaments
✓ **Médecine basée sur preuves** : Questions issues de guidelines internationales
✓ **Accessibilité graduée** : Mix de questions simples et techniques expliquées

### DOMAINES MÉDICAUX À CONSIDÉRER (selon contexte) :
- **Médecine d'urgence** : Scores de gravité, red flags, triage
- **Médecine interne** : Syndromes complexes, interactions
- **Cardiologie** : HEART, TIMI, facteurs de risque CV
- **Pneumologie** : CURB-65, critères pneumonie, embolie
- **Gastroentérologie** : Alvarado, critères IBD, hépatite
- **Neurologie** : NIHSS, red flags céphalées, épilepsie
- **Psychiatrie** : PHQ-9, GAD-7, risque suicidaire
- **Gynécologie** : Grossesse, contraception, infections
- **Gériatrie** : Fragilité, iatrogénie, syndrome confusionnel
- **Pédiatrie** : Fièvre enfant, développement, vaccinations
- **Infectiologie** : Critères sepsis, antibiothérapie, résistances
- **Endocrinologie** : Diabète, thyroïde, ostéoporose
- **Rhumatologie** : Critères inflammatoires, auto-immunité
- **Dermatologie** : ABCDE mélanome, infections cutanées
- **Hématologie/Oncologie** : Performance status, symptômes B
- **Médecine tropicale** : Dengue, chikungunya, paludisme, leptospirose

# FORMAT DE RÉPONSE EXIGÉ

{
  "medical_reasoning": {
    "primary_hypotheses": [
      {"diagnosis": "H1", "probability": "high|moderate|low", "evidence": "pourquoi", "urgency": "immediate|urgent|routine"}
    ],
    "red_flags_to_explore": ["liste des signes d'alarme à rechercher"],
    "systems_involved": ["liste des systèmes médicaux concernés"],
    "questioning_strategy": "logique choisie pour les questions",
    "clinical_pearls": ["éléments cliniques clés à retenir"]
  },
  "questions": [
    {
      "id": 1,
      "question": "Question médicale précise et contextuelle",
      "type": "multiple_choice",
      "options": ["Option diagnostique 1", "Option discriminante 2", "Option alternative 3", "Je ne sais pas"],
      "medical_rationale": "Justification médicale experte basée sur la littérature",
      "diagnostic_impact": "Comment cette question oriente le diagnostic",
      "clinical_score": "Score clinique utilisé si applicable",
      "urgency_flag": true/false,
      "category": "emergency|differential|severity|functional",
      "complexity": "accessible|technical|expert",
      "cognitive_process": "Quel raisonnement médical sous-tend cette question"
    }
  ],
  "clinical_recommendations": {
    "immediate_actions": ["actions à faire immédiatement"],
    "workup_suggested": ["examens complémentaires pertinents"],
    "follow_up_plan": ["plan de suivi adapté"],
    "red_flag_monitoring": ["éléments de surveillance urgente"]
  }
}

# INSTRUCTIONS CRITIQUES

1. **UTILISE TOUTE TA CONNAISSANCE MÉDICALE** - Ne te limite pas aux cas simples
2. **RAISONNE COMME UN CLINICIEN SENIOR** - Hypothèses multiples, priorisation, urgence
3. **ADAPTE AU CONTEXTE COMPLET** - Âge, sexe, terrain, médicaments, géographie
4. **QUESTIONS DISCRIMINANTES** - Chaque question doit apporter une vraie valeur diagnostique
5. **ÉQUILIBRE ACCESSIBLE/EXPERT** - Mix de questions compréhensibles et techniques
6. **MÉDECINE BASÉE SUR PREUVES** - Scores validés, guidelines internationales
7. **SÉCURITÉ PATIENT** - Red flags en priorité absolue

Génère maintenant tes questions avec ce raisonnement médical complet !`
}

// ==================== FONCTION PRINCIPALE API ====================

export async function POST(request: NextRequest) {
  try {
    console.log("🧠 API IA QUESTIONS MÉDICALES UNIVERSELLES - Démarrage")

    const requestData = await request.json()
    const { patientData, clinicalData } = requestData

    if (!patientData || !clinicalData) {
      return NextResponse.json(
        { error: "Données patient et cliniques requises", success: false },
        { status: 400 }
      )
    }

    console.log(`🔍 Analyse IA complète pour: ${patientData.firstName} ${patientData.lastName}`)

    // Construction du contexte médical complet
    const medicalContext = buildComprehensiveMedicalContext(patientData, clinicalData)
    
    // Génération du prompt IA médical universel
    const expertPrompt = buildAIMedicalQuestioningPrompt(medicalContext)
    
    console.log("🧠 Génération IA avec raisonnement médical complet...")

    // Appel IA avec prompt médical expert
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: expertPrompt,
      temperature: 0.1, // Faible pour cohérence médicale
      maxTokens: 4000,
      topP: 0.9
    })

    console.log("✅ Réponse IA générée - Parsing JSON médical")

    // Parsing sécurisé de la réponse IA
    let aiResponse
    try {
      let cleanedText = result.text.trim()
      
      // Extraction JSON robuste
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }
      
      aiResponse = JSON.parse(cleanedText)
      
      // Validation structure
      if (!aiResponse.questions || !Array.isArray(aiResponse.questions)) {
        throw new Error("Structure questions invalide")
      }
      
      console.log(`✅ ${aiResponse.questions.length} questions IA parsées avec raisonnement médical`)
      
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing IA - Génération fallback expert")
      aiResponse = generateExpertFallback(medicalContext)
    }

    // Évaluation de la qualité du raisonnement médical
    const medicalQuality = assessMedicalReasoning(aiResponse)
    
    // Construction de la réponse finale
    const response = {
      success: true,
      
      // Raisonnement médical IA
      medical_reasoning: aiResponse.medical_reasoning || {
        primary_hypotheses: [],
        red_flags_to_explore: [],
        systems_involved: [],
        questioning_strategy: "Stratégie générée automatiquement",
        clinical_pearls: []
      },
      
      // Questions générées
      questions: aiResponse.questions,
      
      // Recommandations cliniques
      clinical_recommendations: aiResponse.clinical_recommendations || {
        immediate_actions: ["Évaluation clinique standard"],
        workup_suggested: ["Selon orientation clinique"],
        follow_up_plan: ["Suivi selon évolution"],
        red_flag_monitoring: ["Surveillance symptômes"]
      },
      
      // Métadonnées qualité
      ai_metadata: {
        generation_timestamp: new Date().toISOString(),
        model_used: "gpt-4o",
        reasoning_quality: medicalQuality.score,
        reasoning_level: medicalQuality.level,
        context_completeness: calculateContextCompleteness(medicalContext),
        medical_domains_covered: extractMedicalDomains(aiResponse),
        question_types_distribution: analyzeQuestionTypes(aiResponse.questions),
        accessibility_balance: assessAccessibilityBalance(aiResponse.questions)
      },
      
      // Contexte patient utilisé
      patient_context: {
        demographics: medicalContext.patient.demographics,
        risk_stratification: medicalContext.patient.riskFactors,
        medication_analysis: analyzeMedicationInteractions(medicalContext.patient.medicalBackground.medications),
        clinical_complexity: assessClinicalComplexity(medicalContext)
      }
    }

    console.log(`🎯 Questions IA générées avec succès: ${aiResponse.questions.length} - Qualité: ${medicalQuality.level}`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error("❌ Erreur système IA questions:", error)
    
    return NextResponse.json(
      {
        error: "Erreur système IA questions médicales",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// ==================== FONCTIONS UTILITAIRES ====================

function calculateBMI(weight: number, height: number): number {
  if (!weight || !height) return 0
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

function parseMedications(medicationsText: string): string[] {
  if (!medicationsText) return []
  return medicationsText.split(/[,;]/).map(med => med.trim()).filter(Boolean)
}

function parseSymptoms(symptomsText: string): string[] {
  if (!symptomsText) return []
  return symptomsText.split(/[,;.]/).map(symptom => symptom.trim()).filter(Boolean)
}

function extractTimeline(symptoms: string, complaint: string): string {
  const text = `${symptoms} ${complaint}`.toLowerCase()
  
  if (text.includes('brutal') || text.includes('soudain')) return 'Début brutal'
  if (text.includes('heure')) return 'Évolution sur heures'
  if (text.includes('jour')) return 'Évolution sur jours'
  if (text.includes('semaine')) return 'Évolution sur semaines'
  if (text.includes('mois')) return 'Évolution sur mois'
  
  return 'Chronologie non précisée'
}

function identifyRiskFactors(patientData: any): any {
  const riskFactors = {
    cardiovascular: [] as string[],
    metabolic: [] as string[],
    infectious: [] as string[],
    neoplastic: [] as string[]
  }
  
  const age = patientData.age || 0
  const gender = patientData.gender || ''
  const medicalHistory = patientData.medicalHistory || []
  
  // Facteurs CV
  if (age > 45 && gender === 'Masculin') riskFactors.cardiovascular.push('Âge + sexe masculin')
  if (age > 55 && gender === 'Féminin') riskFactors.cardiovascular.push('Âge + sexe féminin')
  if (medicalHistory.includes('HTA')) riskFactors.cardiovascular.push('Hypertension')
  if (medicalHistory.includes('Diabète')) riskFactors.cardiovascular.push('Diabète')
  if (patientData.lifeHabits?.smoking === 'Oui') riskFactors.cardiovascular.push('Tabagisme')
  
  // Facteurs métaboliques
  if (medicalHistory.includes('Diabète')) riskFactors.metabolic.push('Diabète')
  if (medicalHistory.includes('Obésité')) riskFactors.metabolic.push('Obésité')
  
  // Facteurs infectieux
  if (age > 65) riskFactors.infectious.push('Âge > 65 ans')
  if (medicalHistory.includes('Diabète')) riskFactors.infectious.push('Diabète (immunodépression)')
  
  return riskFactors
}

function extractKnownElements(patientData: any, clinicalData: any): string[] {
  const known = []
  
  if (patientData.age) known.push('Âge patient')
  if (patientData.medicalHistory?.length) known.push('Antécédents médicaux')
  if (patientData.currentMedicationsText) known.push('Traitements actuels')
  if (clinicalData.chiefComplaint) known.push('Motif de consultation')
  if (clinicalData.symptoms) known.push('Symptômes principaux')
  if (clinicalData.vitalSigns?.temperature) known.push('Température')
  
  return known
}

function parsePhysicalFindings(physicalExam: string): string[] {
  if (!physicalExam) return []
  return physicalExam.split(/[,;.]/).map(finding => finding.trim()).filter(Boolean)
}

function assessSeverity(clinicalData: any): string {
  const temp = parseFloat(clinicalData.vitalSigns?.temperature || '0')
  const symptoms = (clinicalData.symptoms || '').toLowerCase()
  
  if (temp > 39 || symptoms.includes('sévère') || symptoms.includes('intense')) {
    return 'Sévère'
  } else if (temp > 38 || symptoms.includes('modéré')) {
    return 'Modéré'
  }
  return 'Léger'
}

function generateExpertFallback(context: MedicalContext): any {
  return {
    medical_reasoning: {
      primary_hypotheses: [
        {
          diagnosis: "Syndrome clinique à préciser",
          probability: "moderate",
          evidence: "Analyse contextuelle limitée",
          urgency: "routine"
        }
      ],
      red_flags_to_explore: ["Signes vitaux instables", "Douleur intense", "Troubles neurologiques"],
      systems_involved: ["Système à déterminer selon symptômes"],
      questioning_strategy: "Approche générale symptom-focused",
      clinical_pearls: ["Réévaluation nécessaire si aggravation"]
    },
    questions: [
      {
        id: 1,
        question: "Comment évalueriez-vous la sévérité actuelle de vos symptômes ?",
        type: "multiple_choice",
        options: [
          "Très préoccupant, je pense que c'est grave",
          "Modérément gênant, j'aimerais être rassuré(e)",
          "Léger mais persistant",
          "Minimal, juste pour information"
        ],
        medical_rationale: "L'auto-évaluation du patient guide la priorisation clinique",
        diagnostic_impact: "Oriente le niveau d'urgence de la prise en charge",
        urgency_flag: false,
        category: "severity",
        complexity: "accessible",
        cognitive_process: "Évaluation subjective de la gravité par le patient"
      }
    ],
    clinical_recommendations: {
      immediate_actions: ["Évaluation clinique complète"],
      workup_suggested: ["Selon orientation diagnostique"],
      follow_up_plan: ["Réévaluation si aggravation"],
      red_flag_monitoring: ["Surveillance évolution symptômes"]
    }
  }
}

function assessMedicalReasoning(aiResponse: any): { score: number; level: string } {
  let score = 0
  
  if (aiResponse.medical_reasoning?.primary_hypotheses?.length > 0) score += 2
  if (aiResponse.medical_reasoning?.red_flags_to_explore?.length > 0) score += 2
  if (aiResponse.questions?.some((q: any) => q.clinical_score)) score += 1
  if (aiResponse.questions?.some((q: any) => q.urgency_flag)) score += 1
  if (aiResponse.clinical_recommendations?.immediate_actions?.length > 0) score += 1
  
  const level = score >= 6 ? "Expert" : score >= 4 ? "Avancé" : "Standard"
  
  return { score, level }
}

function calculateContextCompleteness(context: MedicalContext): number {
  let completeness = 0
  
  if (context.patient.demographics.age > 0) completeness += 10
  if (context.patient.medicalBackground.comorbidities.length > 0) completeness += 15
  if (context.patient.medicalBackground.medications.length > 0) completeness += 15
  if (context.clinical.chiefComplaint) completeness += 20
  if (context.clinical.currentSymptoms.length > 0) completeness += 20
  if (context.clinical.vitalSigns.temperature) completeness += 10
  if (context.clinical.physicalFindings.length > 0) completeness += 10
  
  return Math.min(completeness, 100)
}

function extractMedicalDomains(aiResponse: any): string[] {
  const domains = new Set<string>()
  
  aiResponse.questions?.forEach((q: any) => {
    if (q.category) domains.add(q.category)
    if (q.clinical_score) domains.add('evidence_based')
  })
  
  return Array.from(domains)
}

function analyzeQuestionTypes(questions: any[]): any {
  const types = { multiple_choice: 0, yes_no: 0, scale: 0, open_text: 0 }
  
  questions.forEach(q => {
    if (types.hasOwnProperty(q.type)) {
      types[q.type as keyof typeof types]++
    }
  })
  
  return types
}

function assessAccessibilityBalance(questions: any[]): any {
  const complexity = { accessible: 0, technical: 0, expert: 0 }
  
  questions.forEach(q => {
    if (complexity.hasOwnProperty(q.complexity)) {
      complexity[q.complexity as keyof typeof complexity]++
    }
  })
  
  return complexity
}

function analyzeMedicationInteractions(medications: string[]): any {
  return {
    count: medications.length,
    potential_interactions: medications.length > 3 ? "À surveiller" : "Faible risque",
    high_risk_medications: medications.filter(med => 
      med.toLowerCase().includes('warfarine') || 
      med.toLowerCase().includes('digoxine') ||
      med.toLowerCase().includes('lithium')
    )
  }
}

function assessClinicalComplexity(context: MedicalContext): string {
  let complexity = 0
  
  if (context.patient.demographics.age > 65) complexity += 1
  if (context.patient.medicalBackground.comorbidities.length > 2) complexity += 1
  if (context.patient.medicalBackground.medications.length > 5) complexity += 1
  if (context.clinical.currentSymptoms.length > 3) complexity += 1
  
  if (complexity >= 3) return "Complexe"
  if (complexity >= 2) return "Modéré"
  return "Simple"
}
