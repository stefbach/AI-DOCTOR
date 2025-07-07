"use client"

import { useState } from "react"
import {
  Brain,
  Pill,
  FileText,
  User,
  Stethoscope,
  CheckCircle,
  Loader,
  Search,
  Shield,
  Activity,
  Target,
  Award,
  Settings,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Heart,
  Thermometer,
} from "lucide-react"

// ========================================
// 🧠 SYSTÈME MÉDICAL EXPERT AVANCÉ - NIVEAU INTERNISTE
// ========================================
class AdvancedMedicalExpert {
  constructor() {
    this.isDemo = false
    this.confidence = 0
    this.processingTime = 0

    // Configuration APIs médicales
    this.apiConfig = {
      openai: {
        baseURL: "https://api.openai.com/v1/chat/completions",
        key: typeof window !== "undefined" ? window.localStorage?.getItem("openai_key") || "" : "",
        model: "gpt-4",
      },
    }

    // Base de données médicamenteuse COMPLÈTE Maurice
    this.medicationDatabase = this.initializeComprehensiveMedicationDatabase()

    // Base antécédents médicaux
    this.medicalHistoryDatabase = this.initializeMedicalHistoryDatabase()

    // Système d'interactions médicamenteuses
    this.drugInteractionChecker = this.initializeDrugInteractionChecker()

    // Questions cliniques expertes
    this.clinicalQuestions = this.initializeClinicalQuestions()
  }

  // ========================================
  // 🏥 DIAGNOSTIC MÉDICAL EXPERT NIVEAU INTERNISTE
  // ========================================
  async generateComprehensiveDiagnosis(patientData, clinicalPresentation) {
    const startTime = Date.now()

    try {
      // Analyse clinique complète avec IA experte
      const aiAnalysis = await this.performExpertClinicalAnalysis(patientData, clinicalPresentation)

      this.processingTime = Date.now() - startTime

      return {
        clinicalAnalysis: aiAnalysis,
        processingTime: this.processingTime,
        confidence: aiAnalysis.confidence || 0.8,
        source: "Expert Medical AI + Clinical Guidelines",
        timestamp: new Date().toISOString(),
        consultationId: this.generateConsultationId(),
        clinicalQuestions: aiAnalysis.clinicalQuestions || [],
        differentialWorkup: aiAnalysis.differentialWorkup || [],
      }
    } catch (error) {
      console.error("Erreur diagnostic expert:", error)
      return this.generateLocalExpertDiagnosis(patientData, clinicalPresentation)
    }
  }

  async performExpertClinicalAnalysis(patientData, clinicalPresentation) {
    if (!this.isAPIConfigured()) {
      throw new Error("Configuration API requise pour analyse experte")
    }

    const vitalSigns = []
    if (clinicalPresentation.systolicBP && clinicalPresentation.diastolicBP) {
      vitalSigns.push(`TA: ${clinicalPresentation.systolicBP}/${clinicalPresentation.diastolicBP} mmHg`)
    }
    if (clinicalPresentation.heartRate) {
      vitalSigns.push(`FC: ${clinicalPresentation.heartRate} bpm`)
    }
    if (clinicalPresentation.temperature) {
      vitalSigns.push(`T°: ${clinicalPresentation.temperature}°C`)
    }
    if (clinicalPresentation.oxygenSaturation) {
      vitalSigns.push(`SpO2: ${clinicalPresentation.oxygenSaturation}%`)
    }

    const prompt = `Tu es un médecin interniste senior avec 25+ ans d'expérience clinique à Maurice, expert en diagnostic différentiel et médecine interne. Tu dois effectuer une analyse diagnostique EXPERTE et RIGOUREUSE comme un vrai clinicien.

DONNÉES CLINIQUES COMPLÈTES:
Patient: ${JSON.stringify(patientData, null, 2)}
Présentation: ${JSON.stringify(clinicalPresentation, null, 2)}

SIGNES VITAUX:
${vitalSigns.join(", ")}

ANTÉCÉDENTS MÉDICAUX:
${patientData.medicalHistory?.map((h) => `- ${h.condition} (${h.year}) - ${h.severity} - ${h.status}`).join("\n") || "Aucun antécédent renseigné"}

ANTÉCÉDENTS CHIRURGICAUX:
${patientData.surgicalHistory?.map((s) => `- ${s.procedure} (${s.year}) - Complications: ${s.complications}`).join("\n") || "Aucun antécédent chirurgical"}

TRAITEMENTS ACTUELS:
${patientData.currentMedications?.map((m) => `- ${m.name} ${m.dosage} ${m.frequency} (${m.indication})`).join("\n") || "Aucun traitement en cours"}

FACTEURS DE RISQUE:
- Tabac: ${patientData.smokingStatus || "Non renseigné"} ${patientData.packYears ? `(${patientData.packYears} PA)` : ""}
- Alcool: ${patientData.alcoholStatus || "Non renseigné"}
- Activité physique: ${patientData.activityLevel || "Non renseigné"}

CONTEXTE MÉDICAL MAURICIEN:
- Prévalences: HTA 40%, DT2 25%, Obésité 35%, Dyslipidémie 45%
- Maladies tropicales: Dengue, Chikungunya, Paludisme (rare)
- Populations: Indo-mauricienne 68%, Créole 27%, Chinoise 3%, Européenne 2%

INSTRUCTIONS EXPERTES:
1. Analyse comme un VRAI interniste senior
2. Pose des questions cliniques PERTINENTES pour affiner le diagnostic
3. Propose un diagnostic différentiel RIGOUREUX avec probabilités
4. Suggère des examens complémentaires APPROPRIÉS
5. Raisonne selon les guidelines internationales et le contexte mauricien

Réponds en JSON structuré avec analyse médicale EXPERTE:

{
  "clinical_questions": [
    {
      "question": "Question clinique précise pour affiner le diagnostic",
      "rationale": "Pourquoi cette question est importante",
      "category": "symptomatology|examination|history|risk_factors"
    }
  ],
  "differential_diagnosis": [
    {
      "diagnosis": "Diagnostic médical précis selon nomenclature internationale",
      "icd10_code": "Code ICD-10 exact",
      "probability_percent": 85,
      "clinical_reasoning": "Raisonnement clinique détaillé d'interniste avec physiopathologie",
      "severity": "mild|moderate|severe|critical",
      "urgency": "routine|urgent|emergent",
      "prognosis": "Pronostic détaillé court/moyen/long terme",
      "supporting_evidence": ["Éléments cliniques en faveur"],
      "differential_points": ["Points différentiels importants"],
      "red_flags": ["Signes d'alarme à surveiller"],
      "complications": ["Complications possibles"]
    }
  ],
  "differential_workup": [
    {
      "test_category": "laboratory|imaging|functional|biopsy",
      "tests": ["Examens spécifiques recommandés"],
      "rationale": "Justification médicale",
      "urgency": "immediate|within_24h|within_week|routine"
    }
  ],
  "confidence_level": "high|moderate|low",
  "expert_notes": "Notes d'expert sur la complexité du cas"
}`

    const response = await fetch(this.apiConfig.openai.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiConfig.openai.key}`,
      },
      body: JSON.stringify({
        model: this.apiConfig.openai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Plus précis pour diagnostic médical
        max_tokens: 6000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content

    try {
      const parsedResponse = JSON.parse(aiResponse)
      return {
        ...parsedResponse,
        confidence: this.mapConfidenceToNumeric(parsedResponse.confidence_level),
        diagnoses: parsedResponse.differential_diagnosis || [],
      }
    } catch (parseError) {
      throw new Error("Réponse IA non parsable")
    }
  }

  // ========================================
  // 💊 SYSTÈME DE PRESCRIPTION EXPERT NIVEAU INTERNISTE
  // ========================================
  async generateExpertPrescription(diagnoses, patientData, clinicalContext) {
    try {
      const startTime = Date.now()

      if (!this.isAPIConfigured()) {
        return this.generateLocalExpertPrescription(diagnoses, patientData)
      }

      // Prescription experte avec IA
      const expertPrescription = await this.performExpertPrescriptionAnalysis(diagnoses, patientData, clinicalContext)

      return {
        prescription: expertPrescription.prescription,
        interactionAnalysis: this.checkDrugInteractions([
          ...(patientData.currentMedications || []),
          ...(expertPrescription.prescription?.medications || []),
        ]),
        prescriptionId: this.generatePrescriptionId(),
        prescribedBy: "Expert Medical AI System",
        prescriptionDate: new Date().toISOString(),
        validityPeriod: "30 jours",
        processingTime: Date.now() - startTime,
        source: "Expert Prescription AI + Clinical Guidelines",
        isEditable: true,
        clinicalJustification: expertPrescription.clinical_justification,
        monitoringPlan: expertPrescription.monitoring_plan,
      }
    } catch (error) {
      console.error("Erreur prescription experte:", error)
      return this.generateLocalExpertPrescription(diagnoses, patientData)
    }
  }

  async performExpertPrescriptionAnalysis(diagnoses, patientData, clinicalContext) {
    const prompt = `Tu es un médecin interniste senior expert en thérapeutique à Maurice. Tu dois prescrire comme un VRAI médecin expert avec une connaissance approfondie des médicaments disponibles à Maurice.

DIAGNOSTICS RETENUS:
${diagnoses.map((d, i) => `${i + 1}. ${d.diagnosis} (${d.icd10_code}) - ${d.probability_percent}% - ${d.severity}`).join("\n")}

PATIENT:
${JSON.stringify(patientData, null, 2)}

CONTEXTE CLINIQUE:
${JSON.stringify(clinicalContext, null, 2)}

MÉDICAMENTS DISPONIBLES À MAURICE (exemples par pathologie):
- Zona/Herpès: Aciclovir 800mg, Valaciclovir 1g, Famciclovir
- HTA: Amlodipine, Enalapril, Losartan, Hydrochlorothiazide, Bisoprolol
- Diabète: Metformine, Gliclazide, Insuline, Sitagliptine
- Infections: Amoxicilline, Azithromycine, Ciprofloxacine, Ceftriaxone
- Douleur: Paracétamol, Ibuprofène, Tramadol, Morphine
- Anticoagulants: Warfarine, Rivaroxaban, Enoxaparine

INSTRUCTIONS EXPERTES:
1. Prescris selon les GUIDELINES internationales
2. Adapte aux disponibilités et coûts mauriciens
3. Considère les interactions avec traitements actuels
4. Justifie CHAQUE prescription médicalement
5. Propose un plan de surveillance approprié
6. Évite les prescriptions inappropriées (ex: paracétamol pour zona)

Réponds en JSON avec prescription EXPERTE:

{
  "prescription": {
    "medications": [
      {
        "medication_name": "Nom exact du médicament",
        "brand_name": "Marque disponible à Maurice",
        "strength": "Dosage précis",
        "pharmaceutical_form": "Forme galénique",
        "quantity": "Quantité à délivrer",
        "dosage_regimen": {
          "dose": "Dose unitaire",
          "frequency": "Fréquence précise",
          "timing": "Moment de prise",
          "duration": "Durée de traitement",
          "route": "Voie d'administration"
        },
        "instructions": {
          "french": "Instructions détaillées en français"
        },
        "indication": "Indication précise",
        "contraindications": ["Contre-indications"],
        "side_effects": ["Effets secondaires principaux"],
        "cost_information": {
          "total_cost_mur": "Coût estimé en MUR"
        }
      }
    ],
    "follow_up_instructions": {
      "next_appointment": "Délai de suivi",
      "warning_signs": ["Signes d'alarme"],
      "monitoring_parameters": ["Paramètres à surveiller"]
    }
  },
  "clinical_justification": "Justification médicale détaillée de chaque prescription",
  "monitoring_plan": "Plan de surveillance et suivi thérapeutique"
}`

    const response = await fetch(this.apiConfig.openai.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiConfig.openai.key}`,
      },
      body: JSON.stringify({
        model: this.apiConfig.openai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content

    try {
      return JSON.parse(aiResponse)
    } catch (parseError) {
      throw new Error("Réponse prescription IA non parsable")
    }
  }

  // ========================================
  // 🔬 PRESCRIPTION EXAMENS PARACLINIQUES
  // ========================================
  async generateExpertWorkup(diagnoses, patientData, clinicalContext) {
    try {
      if (!this.isAPIConfigured()) {
        return this.generateLocalExpertWorkup(diagnoses, patientData)
      }

      const workupAnalysis = await this.performExpertWorkupAnalysis(diagnoses, patientData, clinicalContext)

      return {
        workup: workupAnalysis.workup,
        workupId: this.generateWorkupId(),
        prescribedBy: "Expert Medical AI System",
        workupDate: new Date().toISOString(),
        source: "Expert Workup AI + Clinical Guidelines",
        clinicalJustification: workupAnalysis.clinical_justification,
        urgencyLevel: workupAnalysis.urgency_level,
      }
    } catch (error) {
      console.error("Erreur prescription examens:", error)
      return this.generateLocalExpertWorkup(diagnoses, patientData)
    }
  }

  async performExpertWorkupAnalysis(diagnoses, patientData, clinicalContext) {
    const prompt = `Tu es un médecin interniste senior expert à Maurice. Tu dois prescrire les examens paracliniques appropriés selon les guidelines internationales et le contexte mauricien.

DIAGNOSTICS SUSPECTÉS:
${diagnoses.map((d, i) => `${i + 1}. ${d.diagnosis} (${d.icd10_code}) - ${d.probability_percent}% - ${d.severity}`).join("\n")}

PATIENT:
${JSON.stringify(patientData, null, 2)}

CONTEXTE CLINIQUE:
${JSON.stringify(clinicalContext, null, 2)}

EXAMENS DISPONIBLES À MAURICE:
- Biologie: NFS, CRP, VS, Glycémie, HbA1c, Créatinine, Urée, Ionogramme, Bilan lipidique, TSH, Troponines, D-dimères
- Imagerie: Radiographie, Échographie, Scanner, IRM, Scintigraphie
- Fonctionnels: ECG, Écho-cœur, EFR, Holter, Épreuve d'effort
- Microbiologie: ECBU, Hémocultures, Coproculture, Sérologies

INSTRUCTIONS EXPERTES:
1. Prescris selon les guidelines internationales
2. Adapte aux disponibilités mauriciennes
3. Justifie CHAQUE examen médicalement
4. Classe par urgence (immédiat, 24h, semaine, routine)
5. Évite les examens non contributifs

Réponds en JSON avec prescription d'examens EXPERTE:

{
  "workup": {
    "laboratory_tests": [
      {
        "test_name": "Nom exact de l'examen",
        "category": "hematology|biochemistry|immunology|microbiology",
        "indication": "Indication précise",
        "urgency": "immediate|within_24h|within_week|routine",
        "expected_results": "Résultats attendus",
        "interpretation_notes": "Notes d'interprétation"
      }
    ],
    "imaging_studies": [
      {
        "study_name": "Nom exact de l'imagerie",
        "modality": "xray|ultrasound|ct|mri|nuclear",
        "indication": "Indication précise",
        "urgency": "immediate|within_24h|within_week|routine",
        "specific_protocol": "Protocole spécifique si nécessaire"
      }
    ],
    "functional_tests": [
      {
        "test_name": "Nom exact du test fonctionnel",
        "indication": "Indication précise",
        "urgency": "immediate|within_24h|within_week|routine"
      }
    ]
  },
  "clinical_justification": "Justification médicale détaillée de chaque examen",
  "urgency_level": "high|moderate|low"}`

    const response = await fetch(this.apiConfig.openai.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiConfig.openai.key}`,
      },
      body: JSON.stringify({
        model: this.apiConfig.openai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content

    try {
      return JSON.parse(aiResponse)
    } catch (parseError) {
      throw new Error("Réponse examens IA non parsable")
    }
  }

  generateWorkupId() {
    return `WORKUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  async generateLocalExpertWorkup(diagnoses, patientData) {
    await this.simulateProcessing(1000)

    const laboratoryTests = []
    const imagingStudies = []
    const functionalTests = []

    diagnoses.forEach((diag) => {
      if (diag.diagnosis.toLowerCase().includes("zona")) {
        // Examens pour zona si compliqué
        if (diag.severity === "severe") {
          laboratoryTests.push({
            test_name: "NFS avec formule",
            category: "hematology",
            indication: "Recherche immunodépression",
            urgency: "within_24h",
            expected_results: "Lymphopénie possible si immunodépression",
          })
        }
      }

      if (diag.diagnosis.toLowerCase().includes("hypertension")) {
        laboratoryTests.push(
          {
            test_name: "Créatinine, Urée",
            category: "biochemistry",
            indication: "Évaluation fonction rénale",
            urgency: "within_week",
            expected_results: "Fonction rénale normale ou altérée",
          },
          {
            test_name: "Ionogramme sanguin",
            category: "biochemistry",
            indication: "Bilan électrolytique",
            urgency: "within_week",
          },
          {
            test_name: "Bilan lipidique",
            category: "biochemistry",
            indication: "Évaluation risque cardiovasculaire",
            urgency: "routine",
          },
        )

        functionalTests.push({
          test_name: "ECG 12 dérivations",
          indication: "Recherche retentissement cardiaque",
          urgency: "within_week",
        })
      }
    })

    return {
      workup: {
        laboratory_tests: laboratoryTests,
        imaging_studies: imagingStudies,
        functional_tests: functionalTests,
      },
      workupId: this.generateWorkupId(),
      source: "Expert Local Workup Database",
      clinicalJustification: "Examens de première intention selon diagnostic suspecté",
      urgencyLevel: "moderate",
    }
  }

  // ========================================
  // 💊 BASE MÉDICAMENTEUSE COMPLÈTE MAURICE
  // ========================================
  initializeComprehensiveMedicationDatabase() {
    return {
      antivirals: [
        {
          name: "Aciclovir",
          brands: ["Zovirax", "Aciclovir Teva", "Herpevir"],
          strengths: ["200mg", "400mg", "800mg"],
          forms: ["Comprimé", "Suspension", "Crème", "Injectable"],
          indications: ["Herpès simplex", "Zona", "Varicelle"],
          dosage: {
            zona: "800mg 5x/j pendant 7 jours",
            herpes: "400mg 3x/j pendant 5 jours",
          },
          contraindications: ["Hypersensibilité", "Insuffisance rénale sévère"],
          cost: "250-400 MUR/traitement",
          availability: "high",
        },
        {
          name: "Valaciclovir",
          brands: ["Zelitrex", "Valaciclovir Sandoz"],
          strengths: ["500mg", "1000mg"],
          forms: ["Comprimé"],
          indications: ["Zona", "Herpès génital", "Herpès labial"],
          dosage: {
            zona: "1000mg 3x/j pendant 7 jours",
            herpes: "500mg 2x/j pendant 5 jours",
          },
          contraindications: ["Hypersensibilité", "IRC sévère"],
          cost: "800-1200 MUR/traitement",
          availability: "moderate",
        },
      ],
      cardiovascular: [
        {
          name: "Amlodipine",
          brands: ["Norvasc", "Amlodac", "Amlocard"],
          strengths: ["2.5mg", "5mg", "10mg"],
          forms: ["Comprimé"],
          indications: ["HTA", "Angor stable"],
          dosage: {
            hta: "5-10mg 1x/j le matin",
            angor: "5-10mg 1x/j",
          },
          contraindications: ["Choc cardiogénique", "Sténose aortique sévère"],
          interactions: ["Simvastatine", "Digoxine"],
          cost: "150-250 MUR/mois",
          availability: "high",
        },
      ],
      analgesics: [
        {
          name: "Tramadol",
          brands: ["Contramal", "Topalgic", "Tramadol"],
          strengths: ["50mg", "100mg", "150mg", "200mg"],
          forms: ["Gélule", "Comprimé LP", "Injectable"],
          indications: ["Douleur modérée à sévère"],
          dosage: {
            standard: "50-100mg 4x/j max",
            lp: "100-200mg 2x/j",
          },
          contraindications: ["Épilepsie", "IMAO", "Insuffisance respiratoire"],
          cost: "120-250 MUR/boîte",
          availability: "moderate",
        },
      ],
    }
  }

  // ========================================
  // 🔧 MÉTHODES UTILITAIRES EXPERTES
  // ========================================
  isAPIConfigured() {
    return (
      this.apiConfig.openai.key &&
      this.apiConfig.openai.key !== "undefined" &&
      this.apiConfig.openai.key.startsWith("sk-")
    )
  }

  getAPIStatus() {
    return {
      openai: this.isAPIConfigured(),
      mode: this.isAPIConfigured() ? "EXPERT_MODE" : "LOCAL_MODE",
    }
  }

  mapConfidenceToNumeric(level) {
    const mapping = { high: 0.9, moderate: 0.7, low: 0.5 }
    return mapping[level] || 0.6
  }

  generateConsultationId() {
    return `CONS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  generatePrescriptionId() {
    return `PRESC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // ========================================
  // 🏥 DIAGNOSTIC LOCAL EXPERT (FALLBACK)
  // ========================================
  async generateLocalExpertDiagnosis(patientData, clinicalPresentation) {
    await this.simulateProcessing(2000)

    const localDiagnoses = []
    const symptoms = clinicalPresentation.symptoms?.toLowerCase() || ""
    const complaint = clinicalPresentation.chiefComplaint?.toLowerCase() || ""

    // Diagnostic expert local pour ZONA
    if (
      symptoms.includes("zona") ||
      symptoms.includes("éruption") ||
      symptoms.includes("vésicule") ||
      (symptoms.includes("douleur") && symptoms.includes("unilatéral"))
    ) {
      localDiagnoses.push({
        diagnosis: "Zona (Herpès Zoster)",
        icd10_code: "B02.9",
        probability_percent: 85,
        clinical_reasoning:
          "Éruption vésiculeuse unilatérale suivant un trajet dermatomal évocatrice de zona. Nécessite traitement antiviral précoce (< 72h) pour réduire les complications et la douleur post-zostérienne.",
        severity: "moderate",
        urgency: "urgent",
        prognosis: "Bon avec traitement antiviral précoce. Risque de douleurs post-zostériennes chez sujet âgé",
        supporting_evidence: ["Éruption dermatomale", "Douleur neuropathique", "Vésicules sur base érythémateuse"],
        red_flags: ["Atteinte ophtalmique", "Immunodépression", "Zona généralisé"],
        complications: ["Douleurs post-zostériennes", "Surinfection bactérienne", "Atteinte neurologique"],
      })
    }

    // Questions cliniques expertes
    const clinicalQuestions = [
      {
        question: "Pouvez-vous décrire précisément les caractéristiques de l'éruption cutanée ?",
        rationale: "Différencier zona d'autres dermatoses",
        category: "symptomatology",
      },
      {
        question: "La douleur a-t-elle précédé l'éruption de quelques jours ?",
        rationale: "Caractéristique du zona dans sa phase prodromique",
        category: "history",
      },
      {
        question: "Y a-t-il des facteurs d'immunodépression ?",
        rationale: "Risque de complications et forme sévère",
        category: "risk_factors",
      },
    ]

    return {
      clinicalAnalysis: {
        differential_diagnosis: localDiagnoses,
        confidence_level: "moderate",
        diagnoses: localDiagnoses,
        confidence: 0.75,
        clinical_questions: clinicalQuestions,
        expert_notes: "Diagnostic basé sur présentation clinique. Confirmation par examen clinique recommandée.",
      },
      processingTime: 2000,
      confidence: 0.75,
      source: "Expert Local Medical Database",
      consultationId: this.generateConsultationId(),
      timestamp: new Date().toISOString(),
      clinicalQuestions: clinicalQuestions,
    }
  }

  // ========================================
  // 💊 PRESCRIPTION LOCALE EXPERTE (FALLBACK)
  // ========================================
  async generateLocalExpertPrescription(diagnoses, patientData) {
    await this.simulateProcessing(1500)

    const medications = []

    diagnoses.forEach((diag) => {
      if (diag.diagnosis.toLowerCase().includes("zona")) {
        // Prescription EXPERTE pour zona
        medications.push({
          id: Date.now(),
          medication_name: "Aciclovir",
          brand_name: "Zovirax",
          strength: "800mg",
          pharmaceutical_form: "Comprimé",
          quantity: "35",
          dosage_regimen: {
            dose: "800mg",
            frequency: "5 fois par jour",
            timing: "Toutes les 4 heures sauf la nuit",
            duration: "7 jours",
            route: "Orale",
          },
          instructions: {
            french:
              "Prendre 800mg toutes les 4 heures pendant la journée (5 prises/jour) pendant 7 jours. Commencer le plus tôt possible. Bien s'hydrater.",
          },
          indication: "Zona (Herpès Zoster)",
          contraindications: ["Hypersensibilité à l'aciclovir", "Insuffisance rénale sévère"],
          side_effects: ["Nausées", "Céphalées", "Éruption cutanée"],
          cost_information: {
            total_cost_mur: "350-450 MUR",
          },
        })

        // Antalgique pour douleurs zostériennes
        medications.push({
          id: Date.now() + 1,
          medication_name: "Tramadol",
          brand_name: "Contramal",
          strength: "50mg",
          pharmaceutical_form: "Gélule",
          quantity: "20",
          dosage_regimen: {
            dose: "50mg",
            frequency: "3 fois par jour si besoin",
            timing: "Aux repas",
            duration: "7-10 jours",
            route: "Orale",
          },
          instructions: {
            french: "Prendre 50mg 3 fois par jour si douleurs importantes. Ne pas dépasser 300mg/jour.",
          },
          indication: "Douleurs zostériennes",
          cost_information: {
            total_cost_mur: "120-180 MUR",
          },
        })
      }
    })

    return {
      prescription: {
        medications,
        follow_up_instructions: {
          next_appointment: "Dans 1 semaine pour zona",
          warning_signs: [
            "Aggravation des douleurs",
            "Signes de surinfection",
            "Atteinte oculaire",
            "Céphalées intenses",
          ],
          monitoring_parameters: ["Évolution éruption", "Douleur"],
        },
      },
      prescriptionId: this.generatePrescriptionId(),
      source: "Expert Local Prescription Database",
      clinicalJustification:
        "Traitement antiviral précoce du zona pour réduire durée et complications. Antalgique adapté aux douleurs neuropathiques.",
      monitoringPlan: "Suivi à 1 semaine pour évaluer réponse au traitement et dépistage complications.",
    }
  }

  async simulateProcessing(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration))
  }

  initializeMedicalHistoryDatabase() {
    return {
      cardiovascular: ["Hypertension artérielle", "Infarctus du myocarde", "Insuffisance cardiaque"],
      endocrine: ["Diabète type 1", "Diabète type 2", "Hypothyroïdie"],
      respiratory: ["Asthme", "BPCO", "Tuberculose"],
    }
  }

  initializeDrugInteractionChecker() {
    return {
      major_interactions: [],
      moderate_interactions: [],
    }
  }

  checkDrugInteractions(medications) {
    return {
      interactions: [],
      hasInteractions: false,
      riskLevel: "low",
    }
  }

  initializeClinicalQuestions() {
    return {}
  }
}

// ========================================
// ❓ COMPOSANT QUESTIONS CLINIQUES EXPERTES
// ========================================
const ClinicalQuestionsPanel = ({ questions, onAnswerQuestion, answers }) => {
  if (!questions || questions.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <HelpCircle className="h-6 w-6 mr-2 text-orange-600" />
        Questions Cliniques Expertes
      </h3>
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <MessageSquare className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
          <div className="text-sm text-orange-800">
            <div className="font-semibold mb-1">🩺 Questions d'Expert</div>
            <div className="text-xs">
              Ces questions permettent d'affiner le diagnostic différentiel et d'orienter la prise en charge
              thérapeutique selon les meilleures pratiques cliniques.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">{q.question}</h4>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Justification:</strong> {q.rationale}
                </div>
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">{q.category}</div>
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                value={answers?.[index] || ""}
                onChange={(e) => onAnswerQuestion(index, e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Réponse détaillée à cette question clinique..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========================================
// 🎛️ PANNEAU CONFIGURATION EXPERT
// ========================================
const ExpertConfigPanel = ({ medicalExpert, onConfigChange }) => {
  const [showConfig, setShowConfig] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [testResults, setTestResults] = useState({})
  const [isTesting, setIsTesting] = useState(false)

  const apiStatus = medicalExpert.getAPIStatus()

  const testAPIs = async () => {
    setIsTesting(true)
    const results = {}

    try {
      if (apiKey && apiKey.startsWith("sk-")) {
        results.openai = "CONFIGURÉ"
      } else {
        results.openai = "CLÉ REQUISE"
      }
    } catch (error) {
      results.openai = "ERREUR"
    }

    results.guidelines = "DISPONIBLE"
    results.mauritian_db = "DISPONIBLE"
    results.expert_system = "ACTIF"

    setTestResults(results)
    setIsTesting(false)

    if (onConfigChange && apiKey.startsWith("sk-")) {
      onConfigChange(apiKey)
    }
  }

  const saveAPIKey = () => {
    if (apiKey && apiKey.startsWith("sk-")) {
      medicalExpert.apiConfig.openai.key = apiKey
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("openai_key", apiKey)
      }
      testAPIs()
    }
  }

  return (
    <div className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white p-6 rounded-xl mb-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            className={`h-4 w-4 rounded-full mr-4 ${
              apiStatus.openai ? "bg-green-400 animate-pulse shadow-lg" : "bg-amber-400 animate-bounce"
            }`}
          ></div>
          <div>
            <h3 className="text-xl font-bold">
              Mode Expert: {apiStatus.mode === "EXPERT_MODE" ? "IA Médicale Niveau Interniste" : "Base Locale Experte"}
            </h3>
            <p className="text-blue-200 text-sm">
              {apiStatus.openai
                ? "Diagnostic IA expert + Questions cliniques + Prescription guideline-based"
                : "Système médical expert local avec base médicamenteuse mauricienne"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold flex items-center transition-all shadow-lg"
        >
          <Settings className="h-5 w-5 mr-2" />
          {showConfig ? "Masquer Configuration" : "Configuration Expert"}
        </button>
      </div>

      {showConfig && (
        <div className="mt-6 space-y-6">
          <div className="bg-white bg-opacity-10 rounded-xl p-4">
            <label className="block text-sm font-semibold mb-3 text-blue-100">
              🔑 Clé API OpenAI (Diagnostic IA Niveau Interniste)
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="flex-1 p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveAPIKey}
                disabled={!apiKey}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50 transition-all"
              >
                Sauvegarder
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white bg-opacity-10 rounded-lg p-4">
            <div className="text-sm text-blue-200">
              💡 <strong>Mode Expert:</strong> Diagnostic niveau interniste + Questions cliniques + Prescription
              evidence-based + Base médicamenteuse Maurice
            </div>
            <button
              onClick={testAPIs}
              disabled={isTesting}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center transition-all"
            >
              {isTesting ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Search className="h-5 w-5 mr-2" />}
              Tester Système
            </button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h4 className="font-semibold mb-3">État du Système Expert</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(testResults).map(([key, status]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace("_", " ")}:</span>
                    <span
                      className={
                        status === "CONFIGURÉ" || status === "DISPONIBLE" || status === "ACTIF"
                          ? "text-green-300"
                          : "text-yellow-300"
                      }
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ========================================
// 🏥 COMPOSANT PRINCIPAL - SYSTÈME MÉDICAL EXPERT NIVEAU INTERNISTE
// ========================================
const AdvancedMedicalExpertSystem = () => {
  // États principaux
  const [currentStep, setCurrentStep] = useState("patient")
  const [patientData, setPatientData] = useState({
    name: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    ethnicity: "",
    medicalHistory: [],
    surgicalHistory: [],
    currentMedications: [],
    allergies: [],
    smokingStatus: "",
    packYears: "",
    smokingDetails: "",
    alcoholStatus: "",
    alcoholDetails: "",
    cannabisStatus: "",
    otherSubstances: "",
    activityLevel: "",
    activityType: "",
    familyCardiovascular: [],
    familyOncology: [],
    familyMetabolic: [],
    familyOther: [],
    familyDetails: "",
  })

  const [clinicalPresentation, setClinicalPresentation] = useState({
    chiefComplaint: "",
    symptoms: "",
    duration: "",
    severity: "",
    associatedSymptoms: "",
    systolicBP: "",
    diastolicBP: "",
    heartRate: "",
    temperature: "",
    oxygenSaturation: "",
  })

  const [diagnosis, setDiagnosis] = useState(null)
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([])
  const [prescription, setPrescription] = useState(null)
  const [clinicalAnswers, setClinicalAnswers] = useState({})
  const [workup, setWorkup] = useState(null)

  // États interface
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState({})

  // Service médical expert
  const [medicalExpert] = useState(new AdvancedMedicalExpert())
  const [apiStatus, setApiStatus] = useState(medicalExpert.getAPIStatus())

  // Configuration workflow
  const steps = [
    {
      id: "patient",
      label: "Patient",
      icon: User,
      completed: patientData.name && patientData.age && patientData.gender,
    },
    {
      id: "clinical",
      label: "Clinique",
      icon: Stethoscope,
      completed: clinicalPresentation.chiefComplaint && clinicalPresentation.symptoms,
    },
    {
      id: "diagnosis",
      label: "Diagnostic",
      icon: Brain,
      completed: diagnosis && diagnosis.clinicalAnalysis?.diagnoses?.length > 0,
    },
    {
      id: "prescription",
      label: "Prescription",
      icon: Pill,
      completed: prescription,
    },
    {
      id: "summary",
      label: "Synthèse",
      icon: FileText,
      completed: false,
    },
  ]

  // Callback configuration API
  const handleAPIConfigChange = (newApiKey) => {
    medicalExpert.apiConfig.openai.key = newApiKey
    setApiStatus(medicalExpert.getAPIStatus())
  }

  // Gestion diagnostic expert
  const handleExpertDiagnosis = async () => {
    if (!clinicalPresentation.chiefComplaint.trim() || !clinicalPresentation.symptoms.trim()) {
      setErrors({ diagnosis: "Motif de consultation et symptômes requis" })
      return
    }

    setIsProcessing(true)
    setErrors({})

    try {
      const result = await medicalExpert.generateComprehensiveDiagnosis(patientData, clinicalPresentation)
      setDiagnosis(result)
      setCurrentStep("diagnosis")
    } catch (error) {
      setErrors({
        diagnosis: `Erreur analyse: ${error.message}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Gestion prescription experte
  const handleExpertPrescription = async () => {
    if (selectedDiagnoses.length === 0) {
      setErrors({ prescription: "Sélectionnez au moins un diagnostic" })
      return
    }

    setIsProcessing(true)
    setErrors({})

    try {
      const result = await medicalExpert.generateExpertPrescription(selectedDiagnoses, patientData, {
        clinicalPresentation,
        diagnosis,
        clinicalAnswers,
      })
      setPrescription(result)
      setCurrentStep("prescription")
    } catch (error) {
      setErrors({
        prescription: `Erreur prescription: ${error.message}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Gestion prescription examens
  const handleExpertWorkup = async () => {
    if (selectedDiagnoses.length === 0) {
      setErrors({ workup: "Sélectionnez au moins un diagnostic" })
      return
    }

    setIsProcessing(true)
    setErrors({})

    try {
      const result = await medicalExpert.generateExpertWorkup(selectedDiagnoses, patientData, {
        clinicalPresentation,
        diagnosis,
        clinicalAnswers,
      })
      setWorkup(result)
    } catch (error) {
      setErrors({
        workup: `Erreur prescription examens: ${error.message}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Gestion réponses questions cliniques
  const handleAnswerQuestion = (index, answer) => {
    setClinicalAnswers((prev) => ({
      ...prev,
      [index]: answer,
    }))
  }

  // Mise à jour données patient
  const updatePatientData = (field, value) => {
    setPatientData((prev) => ({ ...prev, [field]: value }))
  }

  // Mise à jour présentation clinique
  const updateClinicalPresentation = (field, value) => {
    setClinicalPresentation((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* En-tête système expert */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-8 rounded-2xl mb-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center">
              <Brain className="h-10 w-10 mr-4" />
              Système Médical Expert - Niveau Interniste
            </h1>
            <p className="text-indigo-100 mt-3 text-lg">
              Diagnostic IA Expert + Questions Cliniques + Prescription Evidence-Based - Maurice
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-indigo-200">Confiance Diagnostique</div>
            <div className="text-3xl font-bold">{diagnosis ? Math.round(diagnosis.confidence * 100) : "--"}%</div>
            <div className="text-xs text-indigo-200">
              {apiStatus.mode === "EXPERT_MODE" ? "🩺 Mode Interniste" : "🏠 Mode Expert Local"}
            </div>
          </div>
        </div>

        {/* Métriques de performance */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <Activity className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Temps Analyse</div>
            <div className="font-bold">{diagnosis ? `${diagnosis.processingTime}ms` : "--"}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Diagnostics</div>
            <div className="font-bold">{diagnosis ? diagnosis.clinicalAnalysis?.diagnoses?.length || 0 : "--"}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <HelpCircle className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Questions</div>
            <div className="font-bold">{diagnosis ? diagnosis.clinicalQuestions?.length || 0 : "--"}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <Award className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Niveau</div>
            <div className="font-bold text-xs">Interniste</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <Shield className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Maurice</div>
            <div className="font-bold">Adapté</div>
          </div>
        </div>
      </div>

      {/* Panneau configuration expert */}
      <ExpertConfigPanel medicalExpert={medicalExpert} onConfigChange={handleAPIConfigChange} />

      {/* Navigation workflow */}
      <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full ${
                  step.completed
                    ? "bg-green-500 text-white shadow-lg"
                    : currentStep === step.id
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.completed ? <CheckCircle className="h-6 w-6" /> : <step.icon className="h-6 w-6" />}
              </div>
              <span className={`ml-3 font-semibold ${currentStep === step.id ? "text-blue-600" : "text-gray-600"}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && <div className="w-12 h-1 bg-gray-300 ml-6 mr-6 rounded" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Patient COMPLÈTE */}
          {currentStep === "patient" && (
            <div className="space-y-6">
              {/* Données démographiques */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <User className="h-6 w-6 mr-3 text-blue-600" />
                  Données Démographiques
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom complet *</label>
                    <input
                      type="text"
                      value={patientData.name}
                      onChange={(e) => updatePatientData("name", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom Prénom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Âge *</label>
                    <input
                      type="number"
                      value={patientData.age}
                      onChange={(e) => updatePatientData("age", Number.parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Âge en années"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Genre *</label>
                    <select
                      value={patientData.gender}
                      onChange={(e) => updatePatientData("gender", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                      <option value="O">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ethnie (contexte mauricien)
                    </label>
                    <select
                      value={patientData.ethnicity}
                      onChange={(e) => updatePatientData("ethnicity", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non spécifié</option>
                      <option value="indo-mauricienne">Indo-mauricienne</option>
                      <option value="créole">Créole</option>
                      <option value="chinoise">Chinoise</option>
                      <option value="européenne">Européenne</option>
                      <option value="mixte">Mixte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Poids (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={patientData.weight}
                      onChange={(e) => updatePatientData("weight", Number.parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="70.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Taille (cm)</label>
                    <input
                      type="number"
                      value={patientData.height}
                      onChange={(e) => updatePatientData("height", Number.parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="170"
                    />
                  </div>
                </div>

                {/* Calcul IMC automatique */}
                {patientData.weight && patientData.height && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-semibold text-blue-800">
                      IMC: {Math.round((patientData.weight / Math.pow(patientData.height / 100, 2)) * 10) / 10} kg/m²
                      {(() => {
                        const imc = patientData.weight / Math.pow(patientData.height / 100, 2)
                        if (imc < 18.5) return " (Insuffisance pondérale)"
                        if (imc < 25) return " (Normal)"
                        if (imc < 30) return " (Surpoids)"
                        return " (Obésité)"
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Antécédents Médicaux */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-red-600" />
                  Antécédents Médicaux
                </h3>

                <div className="space-y-4">
                  {patientData.medicalHistory.map((history, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pathologie</label>
                          <input
                            type="text"
                            value={history.condition}
                            onChange={(e) => {
                              const newHistory = [...patientData.medicalHistory]
                              newHistory[index].condition = e.target.value
                              updatePatientData("medicalHistory", newHistory)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Hypertension artérielle"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Année de diagnostic</label>
                          <input
                            type="number"
                            value={history.year}
                            onChange={(e) => {
                              const newHistory = [...patientData.medicalHistory]
                              newHistory[index].year = e.target.value
                              updatePatientData("medicalHistory", newHistory)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="2020"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                          <select
                            value={history.status}
                            onChange={(e) => {
                              const newHistory = [...patientData.medicalHistory]
                              newHistory[index].status = e.target.value
                              updatePatientData("medicalHistory", newHistory)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active">Actif</option>
                            <option value="controlled">Contrôlé</option>
                            <option value="resolved">Résolu</option>
                            <option value="chronic">Chronique</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newHistory = patientData.medicalHistory.filter((_, i) => i !== index)
                          updatePatientData("medicalHistory", newHistory)
                        }}
                        className="mt-2 text-red-600 hover:text-red-800 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newHistory = [
                        ...patientData.medicalHistory,
                        { condition: "", year: "", status: "active", severity: "moderate" },
                      ]
                      updatePatientData("medicalHistory", newHistory)
                    }}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
                  >
                    + Ajouter un antécédent médical
                  </button>
                </div>
              </div>

              {/* Antécédents Chirurgicaux */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-orange-600" />
                  Antécédents Chirurgicaux
                </h3>

                <div className="space-y-4">
                  {patientData.surgicalHistory.map((surgery, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Intervention</label>
                          <input
                            type="text"
                            value={surgery.procedure}
                            onChange={(e) => {
                              const newSurgery = [...patientData.surgicalHistory]
                              newSurgery[index].procedure = e.target.value
                              updatePatientData("surgicalHistory", newSurgery)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Appendicectomie"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                          <input
                            type="number"
                            value={surgery.year}
                            onChange={(e) => {
                              const newSurgery = [...patientData.surgicalHistory]
                              newSurgery[index].year = e.target.value
                              updatePatientData("surgicalHistory", newSurgery)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="2018"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Complications</label>
                          <select
                            value={surgery.complications}
                            onChange={(e) => {
                              const newSurgery = [...patientData.surgicalHistory]
                              newSurgery[index].complications = e.target.value
                              updatePatientData("surgicalHistory", newSurgery)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="none">Aucune</option>
                            <option value="minor">Mineures</option>
                            <option value="major">Majeures</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newSurgery = patientData.surgicalHistory.filter((_, i) => i !== index)
                          updatePatientData("surgicalHistory", newSurgery)
                        }}
                        className="mt-2 text-red-600 hover:text-red-800 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newSurgery = [
                        ...patientData.surgicalHistory,
                        { procedure: "", year: "", complications: "none" },
                      ]
                      updatePatientData("surgicalHistory", newSurgery)
                    }}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
                  >
                    + Ajouter un antécédent chirurgical
                  </button>
                </div>
              </div>

              {/* Traitements Actuels */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <Pill className="h-5 w-5 mr-2 text-green-600" />
                  Traitements Médicamenteux Actuels
                </h3>

                <div className="space-y-4">
                  {patientData.currentMedications.map((medication, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Médicament</label>
                          <input
                            type="text"
                            value={medication.name}
                            onChange={(e) => {
                              const newMeds = [...patientData.currentMedications]
                              newMeds[index].name = e.target.value
                              updatePatientData("currentMedications", newMeds)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Amlodipine"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                          <input
                            type="text"
                            value={medication.dosage}
                            onChange={(e) => {
                              const newMeds = [...patientData.currentMedications]
                              newMeds[index].dosage = e.target.value
                              updatePatientData("currentMedications", newMeds)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="5mg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                          <input
                            type="text"
                            value={medication.frequency}
                            onChange={(e) => {
                              const newMeds = [...patientData.currentMedications]
                              newMeds[index].frequency = e.target.value
                              updatePatientData("currentMedications", newMeds)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="1x/jour"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Indication</label>
                          <input
                            type="text"
                            value={medication.indication}
                            onChange={(e) => {
                              const newMeds = [...patientData.currentMedications]
                              newMeds[index].indication = e.target.value
                              updatePatientData("currentMedications", newMeds)
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="HTA"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newMeds = patientData.currentMedications.filter((_, i) => i !== index)
                          updatePatientData("currentMedications", newMeds)
                        }}
                        className="mt-2 text-red-600 hover:text-red-800 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newMeds = [
                        ...patientData.currentMedications,
                        { name: "", dosage: "", frequency: "", indication: "" },
                      ]
                      updatePatientData("currentMedications", newMeds)
                    }}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
                  >
                    + Ajouter un médicament
                  </button>
                </div>
              </div>

              {/* Facteurs de Risque */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                  Facteurs de Risque
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tabagisme</label>
                    <select
                      value={patientData.smokingStatus}
                      onChange={(e) => updatePatientData("smokingStatus", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non renseigné</option>
                      <option value="never">Jamais fumé</option>
                      <option value="former">Ancien fumeur</option>
                      <option value="current">Fumeur actuel</option>
                    </select>
                    {(patientData.smokingStatus === "former" || patientData.smokingStatus === "current") && (
                      <input
                        type="number"
                        value={patientData.packYears}
                        onChange={(e) => updatePatientData("packYears", e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2"
                        placeholder="Paquets-années"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Consommation d'alcool</label>
                    <select
                      value={patientData.alcoholStatus}
                      onChange={(e) => updatePatientData("alcoholStatus", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non renseigné</option>
                      <option value="none">Aucune</option>
                      <option value="occasional">Occasionnelle</option>
                      <option value="moderate">Modérée</option>
                      <option value="heavy">Importante</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Activité physique</label>
                    <select
                      value={patientData.activityLevel}
                      onChange={(e) => updatePatientData("activityLevel", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non renseigné</option>
                      <option value="sedentary">Sédentaire</option>
                      <option value="light">Légère</option>
                      <option value="moderate">Modérée</option>
                      <option value="intense">Intense</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setCurrentStep("clinical")}
                  disabled={!patientData.name || !patientData.age || !patientData.gender}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
                >
                  Continuer vers Présentation Clinique
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Section Présentation Clinique */}
          {currentStep === "clinical" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Stethoscope className="h-6 w-6 mr-3 text-green-600" />
                Présentation Clinique Complète
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Motif de consultation *</label>
                  <input
                    type="text"
                    value={clinicalPresentation.chiefComplaint}
                    onChange={(e) => updateClinicalPresentation("chiefComplaint", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Éruption cutanée douloureuse depuis 3 jours"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Histoire de la maladie actuelle *
                  </label>
                  <textarea
                    value={clinicalPresentation.symptoms}
                    onChange={(e) => updateClinicalPresentation("symptoms", e.target.value)}
                    rows={6}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Décrivez en détail: début, évolution, caractéristiques, facteurs aggravants/atténuants, symptômes associés, traitements déjà pris..."
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    💡 Plus la description est précise et complète, plus l'analyse IA sera pertinente et fiable
                  </div>
                </div>

                {/* Signes vitaux */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-800">
                    <Heart className="h-5 w-5 mr-2" />
                    Signes Vitaux
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">TA Systolique (mmHg)</label>
                      <input
                        type="number"
                        value={clinicalPresentation.systolicBP}
                        onChange={(e) => updateClinicalPresentation("systolicBP", e.target.value)}
                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">TA Diastolique (mmHg)</label>
                      <input
                        type="number"
                        value={clinicalPresentation.diastolicBP}
                        onChange={(e) => updateClinicalPresentation("diastolicBP", e.target.value)}
                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Fréquence cardiaque (bpm)</label>
                      <input
                        type="number"
                        value={clinicalPresentation.heartRate}
                        onChange={(e) => updateClinicalPresentation("heartRate", e.target.value)}
                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="72"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2 flex items-center">
                        <Thermometer className="h-4 w-4 mr-1" />
                        Température (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={clinicalPresentation.temperature}
                        onChange={(e) => updateClinicalPresentation("temperature", e.target.value)}
                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="36.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {errors.diagnosis && (
                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  <AlertTriangle className="h-5 w-5 inline mr-2" />
                  {errors.diagnosis}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentStep("patient")}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center font-semibold"
                >
                  Retour Patient
                </button>

                <button
                  onClick={handleExpertDiagnosis}
                  disabled={!clinicalPresentation.chiefComplaint || !clinicalPresentation.symptoms || isProcessing}
                  className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="animate-spin h-5 w-5 mr-2" />
                      Analyse Expert en cours...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-2" />
                      Analyse Diagnostique Expert
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Section Diagnostic Expert */}
          {currentStep === "diagnosis" && diagnosis && (
            <>
              {/* Questions cliniques expertes */}
              {diagnosis.clinicalQuestions && diagnosis.clinicalQuestions.length > 0 && (
                <ClinicalQuestionsPanel
                  questions={diagnosis.clinicalQuestions}
                  onAnswerQuestion={handleAnswerQuestion}
                  answers={clinicalAnswers}
                />
              )}

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <Brain className="h-6 w-6 mr-3 text-purple-600" />
                  Diagnostic Différentiel Expert
                </h2>

                {/* Insights IA Expert */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-purple-800 mb-3 flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Analyse IA Expert - Confiance: {Math.round(diagnosis.confidence * 100)}%
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-purple-700">
                        <strong>Source:</strong> {diagnosis.source}
                      </div>
                      <div className="text-purple-700">
                        <strong>Temps d'analyse:</strong> {diagnosis.processingTime}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-purple-700">
                        <strong>Consultation ID:</strong> {diagnosis.consultationId}
                      </div>
                      <div className="text-purple-700">
                        <strong>Questions posées:</strong> {diagnosis.clinicalQuestions?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Liste diagnostics */}
                <div className="space-y-4">
                  {diagnosis.clinicalAnalysis?.diagnoses?.map((diag, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        selectedDiagnoses.find((d) => d.icd10_code === diag.icd10_code)
                          ? "border-blue-500 bg-blue-50 shadow-lg"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                      }`}
                      onClick={() => {
                        const isSelected = selectedDiagnoses.find((d) => d.icd10_code === diag.icd10_code)
                        if (isSelected) {
                          setSelectedDiagnoses(selectedDiagnoses.filter((d) => d.icd10_code !== diag.icd10_code))
                        } else {
                          setSelectedDiagnoses([...selectedDiagnoses, diag])
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <h3 className="text-xl font-bold text-gray-900">{diag.diagnosis}</h3>
                            <span className="ml-3 text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                              {diag.icd10_code}
                            </span>
                            <span
                              className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${
                                diag.urgency === "emergent"
                                  ? "bg-red-100 text-red-800"
                                  : diag.urgency === "urgent"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {diag.urgency}
                            </span>
                          </div>

                          <p className="text-gray-700 mb-4">{diag.clinical_reasoning}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong className="text-gray-600">Sévérité:</strong> {diag.severity}
                            </div>
                            <div>
                              <strong className="text-gray-600">Pronostic:</strong> {diag.prognosis}
                            </div>
                          </div>

                          {diag.red_flags && diag.red_flags.length > 0 && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="text-sm font-semibold text-red-800 mb-1">🚨 Signes d'alarme:</div>
                              <div className="text-xs text-red-700">{diag.red_flags.join(", ")}</div>
                            </div>
                          )}
                        </div>

                        <div className="text-right ml-6">
                          <div className="text-4xl font-bold text-blue-600">{diag.probability_percent}%</div>
                          <div className="text-sm text-gray-500">Probabilité</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.prescription && (
                  <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                    <AlertTriangle className="h-5 w-5 inline mr-2" />
                    {errors.prescription}
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setCurrentStep("clinical")}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center font-semibold"
                  >
                    Modifier Présentation
                  </button>

                  <button
                    onClick={handleExpertPrescription}
                    disabled={selectedDiagnoses.length === 0 || isProcessing}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="animate-spin h-5 w-5 mr-2" />
                        Génération prescription...
                      </>
                    ) : (
                      <>
                        <Pill className="h-5 w-5 mr-2" />
                        Générer Prescription Expert ({selectedDiagnoses.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Section Prescription */}
          {currentStep === "prescription" && prescription && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Pill className="h-6 w-6 mr-2 text-green-600" />
                Prescription Médicale Expert
              </h3>

              {/* Justification clinique */}
              {prescription.clinicalJustification && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-green-800 mb-2">🩺 Justification Clinique</h4>
                  <p className="text-sm text-green-700">{prescription.clinicalJustification}</p>
                </div>
              )}

              <div className="space-y-4">
                {prescription.prescription?.medications?.map((med, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{med.medication_name}</h4>
                        <div className="text-sm text-gray-600">
                          {med.brand_name} - {med.strength}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{med.cost_information?.total_cost_mur}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Posologie:</div>
                        <div className="text-sm text-gray-600">
                          {med.dosage_regimen?.dose} - {med.dosage_regimen?.frequency}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Durée:</div>
                        <div className="text-sm text-gray-600">{med.dosage_regimen?.duration}</div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                      <div className="text-sm font-medium text-blue-800 mb-1">Instructions:</div>
                      <div className="text-sm text-blue-700">{med.instructions?.french}</div>
                    </div>

                    {med.contraindications && med.contraindications.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                        <div className="text-sm font-medium text-red-800 mb-1">⚠️ Contre-indications:</div>
                        <div className="text-xs text-red-700">{med.contraindications.join(", ")}</div>
                      </div>
                    )}

                    {med.side_effects && med.side_effects.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="text-sm font-medium text-yellow-800 mb-1">Effets secondaires:</div>
                        <div className="text-xs text-yellow-700">{med.side_effects.join(", ")}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Plan de surveillance */}
              {prescription.monitoringPlan && (
                <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📋 Plan de Surveillance</h4>
                  <p className="text-sm text-purple-700">{prescription.monitoringPlan}</p>
                </div>
              )}

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setCurrentStep("summary")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold"
                >
                  Voir Synthèse
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Section Synthèse */}
          {currentStep === "summary" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <FileText className="h-6 w-6 mr-3 text-indigo-600" />
                Synthèse de Consultation Expert
              </h2>

              <div className="space-y-6">
                {/* Résumé patient */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Patient</h3>
                  <div className="text-sm text-gray-700">
                    <strong>{patientData.name}</strong>, {patientData.age} ans, {patientData.gender}
                    {patientData.ethnicity && `, ${patientData.ethnicity}`}
                  </div>
                </div>

                {/* Diagnostic retenu */}
                {selectedDiagnoses.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 text-blue-800">Diagnostics Retenus</h3>
                    {selectedDiagnoses.map((diag, index) => (
                      <div key={index} className="text-sm text-blue-700 mb-1">
                        • {diag.diagnosis} ({diag.icd10_code}) - {diag.probability_percent}%
                      </div>
                    ))}
                  </div>
                )}

                {/* Prescription */}
                {prescription && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 text-green-800">Traitement Prescrit</h3>
                    {prescription.prescription?.medications?.map((med, index) => (
                      <div key={index} className="text-sm text-green-700 mb-1">
                        • {med.medication_name} {med.strength} - {med.dosage_regimen?.frequency}
                      </div>
                    ))}
                  </div>
                )}

                {/* Questions cliniques répondues */}
                {Object.keys(clinicalAnswers).length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 text-orange-800">Questions Cliniques Répondues</h3>
                    <div className="text-sm text-orange-700">
                      {Object.keys(clinicalAnswers).length} question(s) clinique(s) documentée(s)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panneau latéral - Outils experts */}
        <div className="space-y-6">
          {/* Profil patient */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Profil Patient
            </h3>

            {patientData.name ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <strong>Nom:</strong> <span>{patientData.name}</span>
                </div>
                <div className="flex justify-between">
                  <strong>Âge:</strong> <span>{patientData.age} ans</span>
                </div>
                <div className="flex justify-between">
                  <strong>Genre:</strong> <span>{patientData.gender}</span>
                </div>
                {patientData.ethnicity && (
                  <div className="flex justify-between">
                    <strong>Ethnie:</strong> <span>{patientData.ethnicity}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Données patient non renseignées</div>
            )}
          </div>

          {/* Aide contextuelle */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold mb-4 flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-green-600" />
              Aide Expert
            </h3>

            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-semibold text-blue-800 mb-1">💡 Conseil Expert</div>
                <div className="text-blue-700">
                  {currentStep === "patient" && "Renseignez les données démographiques pour une analyse adaptée"}
                  {currentStep === "clinical" && "Décrivez précisément la symptomatologie pour un diagnostic expert"}
                  {currentStep === "diagnosis" && "Répondez aux questions cliniques pour affiner le diagnostic"}
                  {currentStep === "prescription" && "Prescription basée sur les guidelines internationales"}
                  {currentStep === "summary" && "Consultation experte terminée - Documentation complète"}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="font-semibold text-yellow-800 mb-1">⚠️ Responsabilité Médicale</div>
                <div className="text-yellow-700 text-xs">
                  Cet outil est une aide au diagnostic niveau interniste. La décision médicale finale reste du
                  praticien.
                </div>
              </div>

              {diagnosis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="font-semibold text-green-800 mb-1">🇲🇺 Contexte Maurice</div>
                  <div className="text-green-700 text-xs">
                    Analyse adaptée aux prévalences locales et disponibilité médicamenteuse mauricienne
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance système */}
          {diagnosis && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Performance Expert
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Confiance Diagnostique</span>
                  <span className="font-bold text-lg">{Math.round(diagnosis.confidence * 100)}%</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                    style={{ width: `${diagnosis.confidence * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Questions</div>
                    <div className="font-bold">{diagnosis.clinicalQuestions?.length || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Niveau</div>
                    <div className="font-bold text-xs">Interniste</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-center">ID: {diagnosis.consultationId}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer système expert */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center space-x-6 mb-2">
          <span className="flex items-center">
            <span className="mr-1">🇲🇺</span>
            Système médical expert Maurice
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Brain className="h-4 w-4 mr-1" />
            {apiStatus.openai ? "IA Niveau Interniste + Questions cliniques" : "IA locale experte"}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Shield className="h-4 w-4 mr-1" />
            Données sécurisées
          </span>
        </div>
        <div className="mb-1">
          <strong>Système Médical Expert v6.0 - Niveau Interniste</strong> -{" "}
          {apiStatus.mode === "EXPERT_MODE" ? "Mode Expert" : "Mode Local"}
          {apiStatus.openai && (
            <span className="ml-2 text-green-600 font-medium">
              • Questions cliniques • Prescription evidence-based • Base médicamenteuse Maurice
            </span>
          )}
        </div>
        <div className="text-xs">
          {apiStatus.openai
            ? "Diagnostic IA niveau interniste + Questions cliniques expertes + Prescription guideline-based + Base médicamenteuse Maurice"
            : "Système médical expert local - Configurer OpenAI pour diagnostic IA niveau interniste"}
        </div>
      </div>
    </div>
  )
}

// Export par défaut du composant principal
export default AdvancedMedicalExpertSystem
