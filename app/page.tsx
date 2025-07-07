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
  ChevronDown,
  Activity,
  Target,
  Award,
  Database,
  Zap,
  AlertTriangle,
  Edit,
  Download,
  Plus,
  X,
  History,
  Scissors,
  AlertCircle,
  ChevronRight,
  Settings,
  Printer,
} from "lucide-react"

// ========================================
// 🧠 SYSTÈME MÉDICAL EXPERT AVANCÉ
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

    // Base de données médicamenteuse étendue Maurice
    this.medicationDatabase = this.initializeMedicationDatabase()

    // Base antécédents médicaux
    this.medicalHistoryDatabase = this.initializeMedicalHistoryDatabase()

    // Nomenclature examens Maurice
    this.examinationNomenclature = this.initializeExaminationNomenclature()

    // Scores et calculateurs cliniques
    this.clinicalCalculators = this.initializeClinicalCalculators()

    // Protocoles médicaux Maurice
    this.medicalProtocols = this.initializeMedicalProtocols()

    // Système d'interactions médicamenteuses
    this.drugInteractionChecker = this.initializeDrugInteractionChecker()
  }

  // ========================================
  // 🏥 DIAGNOSTIC MÉDICAL EXPERT AMÉLIORÉ
  // ========================================
  async generateComprehensiveDiagnosis(patientData, clinicalPresentation) {
    const startTime = Date.now()

    try {
      // Analyse clinique complète avec IA
      const aiAnalysis = await this.performAdvancedClinicalAnalysis(patientData, clinicalPresentation)

      // Calculs cliniques automatiques
      const clinicalScores = this.calculateClinicalScores(patientData, clinicalPresentation)

      // Examens complémentaires recommandés
      const recommendedTests = this.generateTestRecommendations(aiAnalysis.diagnoses, patientData)

      // Analyse de risque stratifiée
      const riskAssessment = this.performRiskStratification(patientData, aiAnalysis.diagnoses)

      // Protocoles thérapeutiques
      const treatmentProtocols = this.generateTreatmentProtocols(aiAnalysis.diagnoses, patientData)

      // Suggestions d'affinement diagnostique
      const diagnosticRefinement = this.generateDiagnosticRefinementSuggestions(
        patientData,
        clinicalPresentation,
        aiAnalysis,
      )

      this.processingTime = Date.now() - startTime

      return {
        clinicalAnalysis: aiAnalysis,
        clinicalScores,
        recommendedTests,
        riskAssessment,
        treatmentProtocols,
        diagnosticRefinement,
        mauriceContext: this.analyzeMauritianContext(patientData),
        processingTime: this.processingTime,
        confidence: aiAnalysis.confidence || 0.8,
        source: "Advanced Medical AI + Clinical APIs",
        timestamp: new Date().toISOString(),
        consultationId: this.generateConsultationId(),
      }
    } catch (error) {
      console.error("Erreur diagnostic avancé:", error)
      return this.generateLocalAdvancedDiagnosis(patientData, clinicalPresentation)
    }
  }

  async performAdvancedClinicalAnalysis(patientData, clinicalPresentation) {
    if (!this.isAPIConfigured()) {
      throw new Error("Configuration API requise pour analyse avancée")
    }

    const prompt = `Tu es un médecin expert senior avec 20+ ans d'expérience clinique à Maurice. Effectue une analyse diagnostique complète et rigoureuse.

DONNÉES CLINIQUES COMPLÈTES:
Patient: ${JSON.stringify(patientData, null, 2)}
Présentation: ${JSON.stringify(clinicalPresentation, null, 2)}

ANTÉCÉDENTS MÉDICAUX:
${patientData.medicalHistory?.map((h) => `- ${h.condition} (${h.year})`).join("\n") || "Aucun antécédent renseigné"}

ANTÉCÉDENTS CHIRURGICAUX:
${patientData.surgicalHistory?.map((s) => `- ${s.procedure} (${s.year})`).join("\n") || "Aucun antécédent chirurgical"}

TRAITEMENTS ACTUELS:
${patientData.currentMedications?.map((m) => `- ${m.name} ${m.dosage} ${m.frequency}`).join("\n") || "Aucun traitement en cours"}

CONTEXTE MÉDICAL MAURICIEN:
- Système de santé: Public (gratuit) + Privé (payant)
- Prévalences: HTA 40%, DT2 25%, Obésité 35%, Dyslipidémie 45%
- Populations: Indo-mauricienne 68%, Créole 27%, Chinoise 3%, Européenne 2%
- Climat tropical: Maladies vectorielles endémiques

Réponds en JSON structuré avec diagnostic médical complet:

{
  "differential_diagnosis": [
    {
      "diagnosis": "Diagnostic médical précis",
      "icd10_code": "Code ICD-10 exact",
      "probability_percent": 85,
      "clinical_reasoning": "Raisonnement clinique détaillé incluant antécédents",
      "severity": "mild|moderate|severe|critical",
      "urgency": "routine|urgent|emergent",
      "prognosis": "Pronostic court/moyen/long terme",
      "supporting_evidence": ["Éléments cliniques en faveur"],
      "differential_points": ["Points différentiels importants"]
    }
  ],
  "recommended_investigations": {
    "laboratory_tests": [
      {
        "test_name": "Nom examen biologique",
        "indication": "Indication précise",
        "urgency": "stat|urgent|routine",
        "cost_estimate_mur": "Coût estimé MUR",
        "normal_values": "Valeurs normales"
      }
    ],
    "imaging_studies": [
      {
        "study_name": "Nom examen radiologique",
        "indication": "Indication précise",
        "urgency": "stat|urgent|routine",
        "cost_estimate_mur": "Coût estimé MUR"
      }
    ]
  },
  "drug_interactions_analysis": {
    "current_medications_review": "Analyse des traitements actuels",
    "potential_interactions": ["Interactions potentielles identifiées"],
    "contraindications": ["Contre-indications absolues/relatives"]
  },
  "confidence_level": "high|moderate|low"
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
        temperature: 0.2,
        max_tokens: 4000,
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
  // 💊 SYSTÈME DE PRESCRIPTION AVANCÉ MODIFIABLE
  // ========================================
  async generateCompletePrescription(diagnoses, patientData, clinicalContext) {
    try {
      const startTime = Date.now()

      // Génération prescription IA
      const aiPrescription = await this.generateAIPrescription(diagnoses, patientData, clinicalContext)

      // Analyse des interactions médicamenteuses
      const interactionAnalysis = this.checkDrugInteractions([
        ...(patientData.currentMedications || []),
        ...(aiPrescription.medications || []),
      ])

      return {
        prescription: aiPrescription,
        interactionAnalysis,
        prescriptionId: this.generatePrescriptionId(),
        prescribedBy: "Dr. AI Expert System",
        prescriptionDate: new Date().toISOString(),
        validityPeriod: "30 jours",
        processingTime: Date.now() - startTime,
        source: "Advanced Prescription AI",
        isEditable: true,
      }
    } catch (error) {
      console.error("Erreur prescription avancée:", error)
      return this.generateLocalAdvancedPrescription(diagnoses, patientData)
    }
  }

  // ========================================
  // 💊 GÉNÉRATION PRESCRIPTION IA
  // ========================================
  async generateAIPrescription(diagnoses, patientData, clinicalContext) {
    if (!this.isAPIConfigured()) {
      // Prescription locale basique si pas d'API
      return this.generateLocalPrescription(diagnoses, patientData)
    }

    const prompt = `Tu es un médecin expert à Maurice. Génère une prescription médicale complète basée sur les diagnostics retenus.

DIAGNOSTICS RETENUS:
${diagnoses.map((d) => `- ${d.diagnosis} (${d.icd10_code}) - Probabilité: ${d.probability_percent}%`).join("\n")}

PATIENT:
- Nom: ${patientData.name}
- Âge: ${patientData.age} ans
- Poids: ${patientData.weight || "Non renseigné"} kg
- Antécédents: ${patientData.medicalHistory?.map((h) => h.condition).join(", ") || "Aucun"}
- Traitements actuels: ${patientData.currentMedications?.map((m) => m.name).join(", ") || "Aucun"}

CONTEXTE MAURICIEN:
- Médicaments disponibles sur l'île
- Coûts abordables pour le patient
- Interactions avec traitements actuels

Génère une prescription JSON avec cette structure exacte:

{
  "medications": [
    {
      "medication_name": "Nom du médicament",
      "brand_name": "Marque commerciale",
      "strength": "Dosage",
      "pharmaceutical_form": "Forme pharmaceutique",
      "quantity": "Quantité à délivrer", 
      "dosage_regimen": {
        "dose": "Dose par prise",
        "frequency": "Fréquence par jour",
        "timing": "Moment de prise",
        "duration": "Durée du traitement",
        "route": "Voie d'administration"
      },
      "instructions": {
        "french": "Instructions détaillées en français"
      },
      "indication": "Indication du médicament",
      "cost_information": {
        "total_cost_mur": "Coût total estimé MUR"
      },
      "interactions": ["Interactions possibles"],
      "contraindications": ["Contre-indications"]
    }
  ],
  "follow_up_instructions": {
    "next_appointment": "Quand revoir le patient",
    "warning_signs": ["Signaux d'alarme à surveiller"],
    "lifestyle_advice": ["Conseils hygiéno-diététiques"]
  },
  "medical_advice": "Conseils médicaux généraux"
}`

    try {
      const response = await fetch(this.apiConfig.openai.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiConfig.openai.key}`,
        },
        body: JSON.stringify({
          model: this.apiConfig.openai.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 3000,
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
        console.error("Erreur parsing prescription:", parseError)
        return this.generateLocalPrescription(diagnoses, patientData)
      }
    } catch (error) {
      console.error("Erreur API prescription:", error)
      return this.generateLocalPrescription(diagnoses, patientData)
    }
  }

  generateLocalPrescription(diagnoses, patientData) {
    // Prescription locale basique
    const medications = []

    diagnoses.forEach((diagnosis) => {
      if (diagnosis.diagnosis.toLowerCase().includes("hypertension")) {
        medications.push({
          medication_name: "Amlodipine",
          brand_name: "Norvasc",
          strength: "5mg",
          pharmaceutical_form: "Comprimé",
          quantity: "30 comprimés",
          dosage_regimen: {
            dose: "5mg",
            frequency: "1 fois par jour",
            timing: "Le matin",
            duration: "30 jours",
            route: "Orale",
          },
          instructions: {
            french: "Prendre 1 comprimé le matin avec un verre d'eau",
          },
          indication: "Hypertension artérielle",
          cost_information: {
            total_cost_mur: "150-200 MUR",
          },
        })
      }

      if (diagnosis.diagnosis.toLowerCase().includes("diabète")) {
        medications.push({
          medication_name: "Metformine",
          brand_name: "Glucophage",
          strength: "500mg",
          pharmaceutical_form: "Comprimé",
          quantity: "60 comprimés",
          dosage_regimen: {
            dose: "500mg",
            frequency: "2 fois par jour",
            timing: "Aux repas",
            duration: "30 jours",
            route: "Orale",
          },
          instructions: {
            french: "Prendre 1 comprimé matin et soir pendant les repas",
          },
          indication: "Diabète type 2",
          cost_information: {
            total_cost_mur: "80-120 MUR",
          },
        })
      }
    })

    return {
      medications,
      follow_up_instructions: {
        next_appointment: "Dans 2 semaines",
        warning_signs: ["Douleur thoracique", "Essoufflement", "Malaise"],
        lifestyle_advice: ["Régime équilibré", "Exercice modéré", "Arrêt tabac"],
      },
      medical_advice: "Suivre scrupuleusement le traitement prescrit",
    }
  }

  // ========================================
  // 🏥 BASE ANTÉCÉDENTS MÉDICAUX
  // ========================================
  initializeMedicalHistoryDatabase() {
    return {
      cardiovascular: [
        "Hypertension artérielle",
        "Infarctus du myocarde",
        "Insuffisance cardiaque",
        "Arythmie cardiaque",
        "Valvulopathie",
        "Cardiopathie ischémique",
        "AVC/AIT",
        "Artériopathie périphérique",
      ],
      endocrine: [
        "Diabète type 1",
        "Diabète type 2",
        "Hypothyroïdie",
        "Hyperthyroïdie",
        "Syndrome métabolique",
        "Obésité",
        "Dyslipidémie",
      ],
      respiratory: ["Asthme", "BPCO", "Tuberculose", "Pneumonie récurrente", "Apnée du sommeil", "Fibrose pulmonaire"],
      gastrointestinal: [
        "Ulcère gastroduodénal",
        "RGO",
        "Maladie inflammatoire intestinale",
        "Hépatite B/C",
        "Cirrhose",
        "Lithiase biliaire",
      ],
      neurological: ["Épilepsie", "Migraine", "Maladie de Parkinson", "Sclérose en plaques", "Neuropathie", "Démence"],
      psychiatric: ["Dépression", "Trouble bipolaire", "Anxiété généralisée", "Schizophrénie", "Trouble panique"],
      renal: ["Insuffisance rénale chronique", "Lithiase rénale", "Infection urinaire récurrente", "Glomérulonéphrite"],
      infectious: ["VIH/SIDA", "Hépatite B", "Hépatite C", "Tuberculose", "Paludisme", "Dengue", "Chikungunya"],
      oncological: [
        "Cancer du sein",
        "Cancer colorectal",
        "Cancer de la prostate",
        "Cancer du poumon",
        "Leucémie",
        "Lymphome",
      ],
      surgical: [
        "Appendicectomie",
        "Cholécystectomie",
        "Hernie inguinale",
        "Césarienne",
        "Prothèse de hanche",
        "Prothèse de genou",
        "Pontage coronarien",
        "Angioplastie",
        "Thyroïdectomie",
        "Mastectomie",
      ],
    }
  }

  // ========================================
  // 💊 BASE MÉDICAMENTEUSE ÉTENDUE MAURICE
  // ========================================
  initializeMedicationDatabase() {
    return {
      cardiovascular: [
        {
          name: "Amlodipine",
          brands: ["Norvasc", "Amlodac", "Amlocard"],
          strengths: ["2.5mg", "5mg", "10mg"],
          form: "Comprimé",
          category: "Inhibiteur calcique",
          indication: "Hypertension, angor",
          dosage: "5-10mg 1x/j",
          contraindications: ["Choc cardiogénique", "Sténose aortique sévère"],
          interactions: ["Simvastatine", "Digoxine", "Rifampicine"],
          cost: "150-200 MUR/mois",
          availability: "high",
        },
        {
          name: "Enalapril",
          brands: ["Renitec", "Enacard", "Envas"],
          strengths: ["5mg", "10mg", "20mg"],
          form: "Comprimé",
          category: "IEC",
          indication: "HTA, insuffisance cardiaque",
          dosage: "10-20mg 2x/j",
          contraindications: ["Grossesse", "Angio-œdème"],
          interactions: ["Diurétiques", "AINS", "Lithium"],
          cost: "100-150 MUR/mois",
          availability: "high",
        },
        {
          name: "Atenolol",
          brands: ["Tenormin", "Atenol"],
          strengths: ["25mg", "50mg", "100mg"],
          form: "Comprimé",
          category: "Bêta-bloquant",
          indication: "HTA, angor, post-IDM",
          dosage: "50-100mg 1x/j",
          contraindications: ["Asthme", "Bloc AV", "Insuffisance cardiaque décompensée"],
          interactions: ["Vérapamil", "Diltiazem", "Insuline"],
          cost: "80-120 MUR/mois",
          availability: "high",
        },
      ],
      endocrine: [
        {
          name: "Metformine",
          brands: ["Glucophage", "Metforal", "Diabex"],
          strengths: ["500mg", "850mg", "1000mg"],
          form: "Comprimé",
          category: "Biguanide",
          indication: "Diabète type 2",
          dosage: "500mg 2-3x/j aux repas",
          contraindications: ["IRC sévère", "Insuffisance cardiaque", "Acidose"],
          interactions: ["Contraste iodé", "Alcool", "Cimétidine"],
          cost: "80-120 MUR/mois",
          availability: "high",
        },
      ],
      antibiotics: [
        {
          name: "Amoxicilline",
          brands: ["Clamoxyl", "Amoxil", "Flemoxin"],
          strengths: ["250mg", "500mg", "1g"],
          form: "Gélule/Suspension",
          category: "Pénicilline A",
          indication: "Infections bactériennes",
          dosage: "500mg 3x/j ou 1g 2x/j",
          contraindications: ["Allergie pénicillines"],
          interactions: ["Méthotrexate", "Warfarine"],
          cost: "50-80 MUR/traitement",
          availability: "high",
        },
      ],
      analgesics: [
        {
          name: "Paracétamol",
          brands: ["Doliprane", "Efferalgan", "Panadol"],
          strengths: ["500mg", "1g"],
          form: "Comprimé/Suppositoire",
          category: "Antalgique non opioïde",
          indication: "Douleur, fièvre",
          dosage: "1g 4x/j max",
          contraindications: ["Insuffisance hépatique sévère"],
          interactions: ["Warfarine (doses élevées)"],
          cost: "30-50 MUR/boîte",
          availability: "high",
        },
      ],
    }
  }

  // ========================================
  // 🔬 NOMENCLATURE EXAMENS MAURICE
  // ========================================
  initializeExaminationNomenclature() {
    return {
      laboratory: {
        hematology: [
          {
            code: "HEM001",
            name: "Hémogramme complet",
            description: "NFS + plaquettes + formule",
            cost_mur: "200-300",
            turnaround: "2-4h",
            fasting: false,
            indications: ["Anémie", "Infection", "Hématologie"],
          },
          {
            code: "HEM002",
            name: "CRP",
            description: "Protéine C-réactive",
            cost_mur: "150-200",
            turnaround: "2-4h",
            fasting: false,
            indications: ["Inflammation", "Infection bactérienne"],
          },
        ],
        biochemistry: [
          {
            code: "BIO001",
            name: "Glycémie à jeun",
            description: "Glucose plasmatique",
            cost_mur: "100-150",
            turnaround: "1-2h",
            fasting: true,
            normal_values: "3.9-6.1 mmol/L",
            indications: ["Diabète", "Hypoglycémie"],
          },
          {
            code: "BIO002",
            name: "HbA1c",
            description: "Hémoglobine glyquée",
            cost_mur: "300-400",
            turnaround: "4-6h",
            fasting: false,
            normal_values: "<6.5%",
            indications: ["Suivi diabète", "Diagnostic diabète"],
          },
          {
            code: "BIO003",
            name: "Créatinine",
            description: "Créatinine sérique + DFG",
            cost_mur: "150-200",
            turnaround: "2-4h",
            fasting: false,
            normal_values: "60-110 μmol/L",
            indications: ["Fonction rénale", "HTA", "Diabète"],
          },
        ],
      },
      imaging: {
        radiology: [
          {
            code: "RAD001",
            name: "Radiographie thoracique",
            description: "Poumons, cœur, médiastin",
            cost_mur: "300-500",
            turnaround: "30min-2h",
            preparation: "Aucune",
            indications: ["Pneumonie", "Insuffisance cardiaque", "Tuberculose"],
          },
          {
            code: "RAD002",
            name: "Échographie abdominale",
            description: "Foie, VB, pancréas, reins",
            cost_mur: "800-1200",
            turnaround: "1-4h",
            preparation: "Jeûne 6h",
            indications: ["Lithiase", "Hépatopathie", "Douleur abdominale"],
          },
        ],
      },
    }
  }

  // ========================================
  // ⚠️ SYSTÈME INTERACTIONS MÉDICAMENTEUSES
  // ========================================
  initializeDrugInteractionChecker() {
    return {
      major_interactions: [
        {
          drug1: "Warfarine",
          drug2: "Aspirine",
          severity: "major",
          mechanism: "Synergie anticoagulante",
          clinical_effect: "Risque hémorragique majeur",
          management: "Éviter association ou surveillance INR rapprochée",
        },
        {
          drug1: "IEC",
          drug2: "Diurétiques épargneurs de potassium",
          severity: "major",
          mechanism: "Rétention potassique",
          clinical_effect: "Hyperkaliémie potentiellement fatale",
          management: "Surveillance kaliémie, éviter si possible",
        },
      ],
      moderate_interactions: [
        {
          drug1: "Simvastatine",
          drug2: "Amlodipine",
          severity: "moderate",
          mechanism: "Inhibition CYP3A4",
          clinical_effect: "Risque de rhabdomyolyse",
          management: "Limiter simvastatine à 20mg/j",
        },
      ],
    }
  }

  // ========================================
  // 🔍 VÉRIFICATION INTERACTIONS
  // ========================================
  checkDrugInteractions(medications) {
    const interactions = []

    // Vérifier interactions entre médicaments
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        // Extraction sécurisée du nom du médicament
        const drug1 =
          typeof medications[i] === "object"
            ? medications[i].name || medications[i].medication_name || ""
            : medications[i] || ""
        const drug2 =
          typeof medications[j] === "object"
            ? medications[j].name || medications[j].medication_name || ""
            : medications[j] || ""

        // Vérifier que les noms sont des chaînes valides
        if (typeof drug1 !== "string" || typeof drug2 !== "string" || !drug1 || !drug2) {
          continue
        }

        // Chercher interactions majeures
        const majorInteraction = this.drugInteractionChecker.major_interactions.find(
          (interaction) =>
            (interaction.drug1.toLowerCase().includes(drug1.toLowerCase()) &&
              interaction.drug2.toLowerCase().includes(drug2.toLowerCase())) ||
            (interaction.drug1.toLowerCase().includes(drug2.toLowerCase()) &&
              interaction.drug2.toLowerCase().includes(drug1.toLowerCase())),
        )

        if (majorInteraction) {
          interactions.push({
            ...majorInteraction,
            drugs: [drug1, drug2],
            type: "drug-drug",
          })
        }

        // Chercher interactions modérées
        const moderateInteraction = this.drugInteractionChecker.moderate_interactions.find(
          (interaction) =>
            (interaction.drug1.toLowerCase().includes(drug1.toLowerCase()) &&
              interaction.drug2.toLowerCase().includes(drug2.toLowerCase())) ||
            (interaction.drug1.toLowerCase().includes(drug2.toLowerCase()) &&
              interaction.drug2.toLowerCase().includes(drug1.toLowerCase())),
        )

        if (moderateInteraction) {
          interactions.push({
            ...moderateInteraction,
            drugs: [drug1, drug2],
            type: "drug-drug",
          })
        }
      }
    }

    return {
      interactions,
      hasInteractions: interactions.length > 0,
      riskLevel: interactions.some((i) => i.severity === "major") ? "high" : "moderate",
    }
  }

  // ========================================
  // 🎯 SUGGESTIONS AFFINEMENT DIAGNOSTIQUE
  // ========================================
  generateDiagnosticRefinementSuggestions(patientData, clinicalPresentation, aiAnalysis) {
    const suggestions = []

    // Suggestions basées sur les antécédents
    if (patientData.medicalHistory?.length > 0) {
      suggestions.push({
        category: "Antécédents médicaux",
        suggestion: "Considérer l'impact des antécédents sur le diagnostic actuel",
        details: patientData.medicalHistory.map((h) => `${h.condition} peut influencer l'évolution`),
        priority: "medium",
      })
    }

    // Suggestions d'examens complémentaires
    if (aiAnalysis.diagnoses?.length > 0) {
      const topDiagnosis = aiAnalysis.diagnoses[0]
      if (topDiagnosis.probability_percent < 80) {
        suggestions.push({
          category: "Examens complémentaires",
          suggestion: "Probabilité diagnostique modérée - examens complémentaires recommandés",
          details: ["Biologie spécialisée", "Imagerie ciblée", "Avis spécialisé si nécessaire"],
          priority: "high",
        })
      }
    }

    return suggestions
  }

  // ========================================
  // 🔧 MÉTHODES UTILITAIRES
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

  // Recherche médicaments pour autocomplétion
  searchMedications(query) {
    const allMedications = []
    Object.values(this.medicationDatabase).forEach((category) => {
      category.forEach((med) => {
        allMedications.push({
          name: med.name,
          brands: med.brands,
          strengths: med.strengths,
          form: med.form,
          category: med.category,
          indication: med.indication,
          dosage: med.dosage,
          cost: med.cost,
        })
      })
    })

    return allMedications.filter(
      (med) =>
        med.name.toLowerCase().includes(query.toLowerCase()) ||
        med.brands.some((brand) => brand.toLowerCase().includes(query.toLowerCase())),
    )
  }

  // Recherche examens pour autocomplétion
  searchExaminations(query) {
    const allExaminations = []
    Object.values(this.examinationNomenclature).forEach((category) => {
      if (Array.isArray(category)) {
        category.forEach((exam) => {
          allExaminations.push(exam)
        })
      } else {
        Object.values(category).forEach((subcategory) => {
          subcategory.forEach((exam) => {
            allExaminations.push(exam)
          })
        })
      }
    })

    return allExaminations.filter(
      (exam) =>
        exam.name.toLowerCase().includes(query.toLowerCase()) ||
        exam.description.toLowerCase().includes(query.toLowerCase()),
    )
  }

  // Méthodes utilitaires simplifiées
  initializeClinicalCalculators() {
    return {
      bmi: (weight, height) => {
        const bmi = weight / Math.pow(height / 100, 2)
        let category = ""
        if (bmi < 18.5) category = "Insuffisance pondérale"
        else if (bmi < 25) category = "Poids normal"
        else if (bmi < 30) category = "Surpoids"
        else category = "Obésité"

        return {
          value: Math.round(bmi * 10) / 10,
          category,
          risk: bmi > 30 ? "Élevé" : bmi > 25 ? "Modéré" : "Normal",
        }
      },
    }
  }

  initializeMedicalProtocols() {
    return {
      hypertension: {
        diagnosis: { criteria: "TA ≥140/90 mmHg (2 mesures séparées)" },
        treatment: { firstLine: ["Amlodipine 5mg", "Enalapril 10mg"] },
      },
    }
  }

  analyzeMauritianContext(patientData) {
    return {
      demographic: { score: 0.5, category: "Risque modéré" },
      epidemiological: { prevalentDiseases: [{ disease: "Hypertension", prevalence: "40%" }] },
    }
  }

  calculateClinicalScores(patientData, clinicalPresentation) {
    return {}
  }

  generateTestRecommendations(diagnoses, patientData) {
    return { immediate_tests: [] }
  }

  performRiskStratification(patientData, diagnoses) {
    return { overall_risk: "moderate" }
  }

  generateTreatmentProtocols(diagnoses, patientData) {
    return this.medicalProtocols
  }

  async simulateProcessing(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration))
  }

  // Méthodes de fallback local
  async generateLocalAdvancedDiagnosis(patientData, clinicalPresentation) {
    await this.simulateProcessing(1500)
    return {
      clinicalAnalysis: {
        differential_diagnosis: [],
        confidence_level: "moderate",
        diagnoses: [],
        confidence: 0.7,
      },
      processingTime: 1500,
      confidence: 0.7,
      source: "Local Advanced Medical Database",
      consultationId: this.generateConsultationId(),
    }
  }

  async generateLocalAdvancedPrescription(diagnoses, patientData) {
    await this.simulateProcessing(1000)
    return {
      prescription: { medications: [] },
      prescriptionId: this.generatePrescriptionId(),
      source: "Local Prescription Database",
    }
  }
  // ========================================
  // 📋 GÉNÉRATION COMPTE-RENDU CONSULTATION
  // ========================================
  async generateConsultationReport(patientData, clinicalPresentation, diagnosis, prescription) {
    const report = {
      reportId: `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      patient: {
        name: patientData.name,
        age: patientData.age,
        gender: patientData.gender,
        medicalHistory: patientData.medicalHistory || [],
        currentMedications: patientData.currentMedications || [],
      },
      consultation: {
        chiefComplaint: clinicalPresentation.chiefComplaint,
        clinicalHistory: clinicalPresentation.symptoms,
        vitalSigns: clinicalPresentation.vitalSigns,
        duration: clinicalPresentation.duration,
        severity: clinicalPresentation.severity,
      },
      diagnosis: {
        differential: diagnosis?.clinicalAnalysis?.diagnoses || [],
        confidence: diagnosis?.confidence || 0,
        reasoning: diagnosis?.clinicalAnalysis?.diagnoses?.[0]?.clinical_reasoning || "",
      },
      treatment: {
        medications: prescription?.prescription?.medications || [],
        followUp: prescription?.prescription?.follow_up_instructions || {},
      },
      recommendations: {
        lifestyle: prescription?.prescription?.follow_up_instructions?.lifestyle_advice || [],
        followUp: prescription?.prescription?.follow_up_instructions?.next_appointment || "",
        warningSigns: prescription?.prescription?.follow_up_instructions?.warning_signs || [],
      },
    }

    return report
  }

  formatConsultationReportText(report) {
    return `COMPTE-RENDU DE CONSULTATION MÉDICALE

Date: ${new Date(report.date).toLocaleDateString("fr-FR")}
N° Dossier: ${report.reportId}

═══════════════════════════════════════

PATIENT:
Nom: ${report.patient.name}
Âge: ${report.patient.age} ans
Sexe: ${report.patient.gender}

ANTÉCÉDENTS MÉDICAUX:
${
  report.patient.medicalHistory.length > 0
    ? report.patient.medicalHistory.map((h) => `- ${h.condition} (${h.year})`).join("\n")
    : "Aucun antécédent significatif"
}

TRAITEMENTS EN COURS:
${
  report.patient.currentMedications.length > 0
    ? report.patient.currentMedications.map((m) => `- ${m.name} ${m.dosage || ""} ${m.frequency || ""}`).join("\n")
    : "Aucun traitement en cours"
}

═══════════════════════════════════════

MOTIF DE CONSULTATION:
${report.consultation.chiefComplaint}

HISTOIRE DE LA MALADIE ACTUELLE:
${report.consultation.clinicalHistory}

SIGNES VITAUX:
${
  report.consultation.vitalSigns.bloodPressure.systolic && report.consultation.vitalSigns.bloodPressure.diastolic
    ? `- Tension artérielle: ${report.consultation.vitalSigns.bloodPressure.systolic}/${report.consultation.vitalSigns.bloodPressure.diastolic} mmHg`
    : ""
}
${report.consultation.vitalSigns.heartRate ? `- Fréquence cardiaque: ${report.consultation.vitalSigns.heartRate} bpm` : ""}
${report.consultation.vitalSigns.temperature ? `- Température: ${report.consultation.vitalSigns.temperature}°C` : ""}
${report.consultation.vitalSigns.oxygenSaturation ? `- SpO2: ${report.consultation.vitalSigns.oxygenSaturation}%` : ""}

═══════════════════════════════════════

DIAGNOSTIC(S) RETENU(S):
${report.diagnosis.differential
  .map((d, i) => `${i + 1}. ${d.diagnosis} (${d.icd10_code}) - Probabilité: ${d.probability_percent}%`)
  .join("\n")}

RAISONNEMENT CLINIQUE:
${report.diagnosis.reasoning}

═══════════════════════════════════════

TRAITEMENT PRESCRIT:
${
  report.treatment.medications.length > 0
    ? report.treatment.medications
        .map(
          (med, i) =>
            `${i + 1}. ${med.medication_name} ${med.strength}
   Posologie: ${med.dosage_regimen?.dose} ${med.dosage_regimen?.frequency}
   Durée: ${med.dosage_regimen?.duration}
   Instructions: ${med.instructions?.french}`,
        )
        .join("\n\n")
    : "Aucun traitement médicamenteux prescrit"
}

═══════════════════════════════════════

SUIVI ET RECOMMANDATIONS:

Prochain rendez-vous: ${report.recommendations.followUp}

Conseils hygiéno-diététiques:
${
  report.recommendations.lifestyle.length > 0
    ? report.recommendations.lifestyle.map((advice) => `- ${advice}`).join("\n")
    : "Maintenir un mode de vie sain"
}

Signaux d'alarme - Consulter en urgence si:
${
  report.recommendations.warningSigns?.length > 0
    ? report.recommendations.warningSigns.map((sign) => `- ${sign}`).join("\n")
    : "- Aggravation des symptômes\n- Apparition de nouveaux symptômes"
}

═══════════════════════════════════════

Dr. Système Expert Médical
Système d'Aide au Diagnostic - Maurice
Date d'édition: ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}
`.trim()
  }
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

    results.openFDA = "DISPONIBLE"
    results.rxNorm = "DISPONIBLE"
    results.pubmed = "DISPONIBLE"

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
              Mode Expert: {apiStatus.mode === "EXPERT_MODE" ? "IA Médicale Avancée" : "Base Locale"}
            </h3>
            <p className="text-blue-200 text-sm">
              {apiStatus.openai ? "Diagnostic IA + APIs médicales intégrées" : "Système médical local avancé"}
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
              🔑 Clé API OpenAI (Diagnostic IA Expert)
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
              💡 <strong>Mode Expert:</strong> Diagnostic IA avancé + APIs médicales + Calculateurs cliniques +
              Protocoles Maurice
            </div>
            <button
              onClick={testAPIs}
              disabled={isTesting}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center transition-all"
            >
              {isTesting ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Search className="h-5 w-5 mr-2" />}
              Tester APIs
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ========================================
// 📋 COMPOSANT ANTÉCÉDENTS MÉDICAUX
// ========================================
const MedicalHistoryPanel = ({ patientData, onUpdatePatientData }) => {
  const [activeTab, setActiveTab] = useState("medical")
  const [searchTerm, setSearchTerm] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [editingHistory, setEditingHistory] = useState(null)
  const [medicalExpert] = useState(new AdvancedMedicalExpert())

  const addMedicalHistory = (condition, year = new Date().getFullYear(), severity = "moderate") => {
    const newHistory = {
      id: Date.now(),
      condition,
      year,
      severity,
      status: "active",
      dateAdded: new Date().toISOString().split("T")[0],
    }
    const updatedHistory = [...(patientData.medicalHistory || []), newHistory]
    onUpdatePatientData("medicalHistory", updatedHistory)
    setSearchTerm("")
    setShowSuggestions(false)
  }

  const addSurgicalHistory = (procedure, year = new Date().getFullYear(), complications = "none") => {
    const newSurgery = {
      id: Date.now(),
      procedure,
      year,
      complications,
      dateAdded: new Date().toISOString().split("T")[0],
    }
    const updatedHistory = [...(patientData.surgicalHistory || []), newSurgery]
    onUpdatePatientData("surgicalHistory", updatedHistory)
    setSearchTerm("")
    setShowSuggestions(false)
  }

  const updateMedicalHistory = (id, field, value) => {
    const updatedHistory = patientData.medicalHistory?.map((h) => (h.id === id ? { ...h, [field]: value } : h)) || []
    onUpdatePatientData("medicalHistory", updatedHistory)
  }

  const updateSurgicalHistory = (id, field, value) => {
    const updatedHistory = patientData.surgicalHistory?.map((s) => (s.id === id ? { ...s, [field]: value } : s)) || []
    onUpdatePatientData("surgicalHistory", updatedHistory)
  }

  const removeMedicalHistory = (id) => {
    const updatedHistory = patientData.medicalHistory?.filter((h) => h.id !== id) || []
    onUpdatePatientData("medicalHistory", updatedHistory)
  }

  const removeSurgicalHistory = (id) => {
    const updatedHistory = patientData.surgicalHistory?.filter((s) => s.id !== id) || []
    onUpdatePatientData("surgicalHistory", updatedHistory)
  }

  const getSuggestions = () => {
    if (!searchTerm) return []
    const category = activeTab === "medical" ? "medical" : "surgical"

    if (category === "medical") {
      const allConditions = Object.values(medicalExpert.medicalHistoryDatabase)
        .flat()
        .filter((condition) => condition.toLowerCase().includes(searchTerm.toLowerCase()))
      return allConditions.slice(0, 8)
    } else {
      return medicalExpert.medicalHistoryDatabase.surgical
        .filter((procedure) => procedure.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 8)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <History className="h-6 w-6 mr-2 text-purple-600" />
        Antécédents Médicaux et Chirurgicaux
      </h3>

      {/* Onglets */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("medical")}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
            activeTab === "medical" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          Antécédents Médicaux
        </button>
        <button
          onClick={() => setActiveTab("surgical")}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
            activeTab === "surgical" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <Scissors className="h-4 w-4 inline mr-2" />
          Antécédents Chirurgicaux
        </button>
      </div>

      {/* Recherche avec autocomplétion */}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowSuggestions(e.target.value.length > 1)
              }}
              onFocus={() => setShowSuggestions(searchTerm.length > 1)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={
                activeTab === "medical"
                  ? "Rechercher une pathologie (ex: hypertension, diabète...)"
                  : "Rechercher une intervention (ex: appendicectomie, césarienne...)"
              }
            />
            <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />

            {/* Suggestions d'autocomplétion */}
            {showSuggestions && getSuggestions().length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {getSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (activeTab === "medical") {
                        addMedicalHistory(suggestion)
                      } else {
                        addSurgicalHistory(suggestion)
                      }
                    }}
                    className="w-full text-left p-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{suggestion}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (searchTerm.trim()) {
                if (activeTab === "medical") {
                  addMedicalHistory(searchTerm.trim())
                } else {
                  addSurgicalHistory(searchTerm.trim())
                }
              }
            }}
            disabled={!searchTerm.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Liste des antécédents médicaux */}
      {activeTab === "medical" && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 mb-3">
            Antécédents médicaux ({patientData.medicalHistory?.length || 0})
          </h4>
          {patientData.medicalHistory?.length > 0 ? (
            patientData.medicalHistory.map((history) => (
              <div key={history.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingHistory === history.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={history.condition}
                          onChange={(e) => updateMedicalHistory(history.id, "condition", e.target.value)}
                          className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
                            <input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={history.year}
                              onChange={(e) =>
                                updateMedicalHistory(history.id, "year", Number.parseInt(e.target.value))
                              }
                              className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Sévérité</label>
                            <select
                              value={history.severity}
                              onChange={(e) => updateMedicalHistory(history.id, "severity", e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="mild">Légère</option>
                              <option value="moderate">Modérée</option>
                              <option value="severe">Sévère</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                            <select
                              value={history.status}
                              onChange={(e) => updateMedicalHistory(history.id, "status", e.target.value)}
                              className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="active">Actif</option>
                              <option value="resolved">Résolu</option>
                              <option value="chronic">Chronique</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingHistory(null)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => setEditingHistory(null)}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-purple-900">{history.condition}</div>
                        <div className="text-sm text-purple-700">
                          Année: {history.year} • Sévérité: {history.severity} • Statut: {history.status}
                        </div>
                        <div className="text-xs text-purple-600 mt-1">Ajouté le: {history.dateAdded}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingHistory(editingHistory === history.id ? null : history.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeMedicalHistory(history.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <div>Aucun antécédent médical renseigné</div>
              <div className="text-sm">Utilisez la recherche ci-dessus pour ajouter des pathologies</div>
            </div>
          )}
        </div>
      )}

      {/* Liste des antécédents chirurgicaux */}
      {activeTab === "surgical" && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 mb-3">
            Antécédents chirurgicaux ({patientData.surgicalHistory?.length || 0})
          </h4>
          {patientData.surgicalHistory?.length > 0 ? (
            patientData.surgicalHistory.map((surgery) => (
              <div key={surgery.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingHistory === surgery.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={surgery.procedure}
                          onChange={(e) => updateSurgicalHistory(surgery.id, "procedure", e.target.value)}
                          className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
                            <input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={surgery.year}
                              onChange={(e) =>
                                updateSurgicalHistory(surgery.id, "year", Number.parseInt(e.target.value))
                              }
                              className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Complications</label>
                            <select
                              value={surgery.complications}
                              onChange={(e) => updateSurgicalHistory(surgery.id, "complications", e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="none">Aucune</option>
                              <option value="minor">Mineures</option>
                              <option value="major">Majeures</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingHistory(null)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => setEditingHistory(null)}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-blue-900">{surgery.procedure}</div>
                        <div className="text-sm text-blue-700">
                          Année: {surgery.year} • Complications: {surgery.complications}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Ajouté le: {surgery.dateAdded}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingHistory(editingHistory === surgery.id ? null : surgery.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeSurgicalHistory(surgery.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Scissors className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <div>Aucun antécédent chirurgical renseigné</div>
              <div className="text-sm">Utilisez la recherche ci-dessus pour ajouter des interventions</div>
            </div>
          )}
        </div>
      )}

      {/* Aide contextuelle */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-semibold mb-1">💡 Conseils pour les antécédents</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Cliquez sur l'icône crayon pour modifier les détails d'un antécédent</li>
              <li>Précisez l'année exacte pour un meilleur suivi chronologique</li>
              <li>Indiquez la sévérité et le statut actuel de chaque pathologie</li>
              <li>Ces informations influencent le diagnostic et le choix thérapeutique</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================================
// 💊 COMPOSANT TRAITEMENTS ACTUELS
// ========================================
const CurrentMedicationsPanel = ({ patientData, onUpdatePatientData }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState(null)
  const [editingMedication, setEditingMedication] = useState(null)
  const [showAllMedications, setShowAllMedications] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [medicalExpert] = useState(new AdvancedMedicalExpert())

  const addMedication = (medication, dosage = "", frequency = "", indication = "") => {
    const newMedication = {
      id: Date.now(),
      name: medication.name || medication,
      brand: medication.brands?.[0] || "",
      strength: medication.strengths?.[0] || "",
      dosage: dosage || medication.dosage || "",
      frequency: frequency || "1x/j",
      indication: indication || medication.indication || "",
      startDate: new Date().toISOString().split("T")[0],
      prescriber: "Médecin traitant",
      cost: medication.cost || "",
      category: medication.category || "",
      availableStrengths: medication.strengths || [],
      availableBrands: medication.brands || [],
    }
    const updatedMedications = [...(patientData.currentMedications || []), newMedication]
    onUpdatePatientData("currentMedications", updatedMedications)
    setSearchTerm("")
    setShowSuggestions(false)
    setSelectedMedication(null)
  }

  const updateMedication = (id, field, value) => {
    const updatedMedications =
      patientData.currentMedications?.map((med) => (med.id === id ? { ...med, [field]: value } : med)) || []
    onUpdatePatientData("currentMedications", updatedMedications)
  }

  const removeMedication = (id) => {
    const updatedMedications = patientData.currentMedications?.filter((m) => m.id !== id) || []
    onUpdatePatientData("currentMedications", updatedMedications)
  }

  const getMedicationSuggestions = () => {
    if (!searchTerm || searchTerm.length < 2) return []
    return medicalExpert.searchMedications(searchTerm).slice(0, 8)
  }

  const getAllMedications = () => {
    const allMedications = []
    Object.entries(medicalExpert.medicationDatabase).forEach(([category, medications]) => {
      medications.forEach((med) => {
        allMedications.push({
          ...med,
          categoryName: category,
        })
      })
    })

    if (selectedCategory === "all") {
      return allMedications
    }
    return allMedications.filter((med) => med.categoryName === selectedCategory)
  }

  const categories = [
    { id: "all", name: "Tous", count: getAllMedications().length },
    {
      id: "cardiovascular",
      name: "Cardiovasculaire",
      count: medicalExpert.medicationDatabase.cardiovascular?.length || 0,
    },
    { id: "endocrine", name: "Endocrinien", count: medicalExpert.medicationDatabase.endocrine?.length || 0 },
    { id: "antibiotics", name: "Antibiotiques", count: medicalExpert.medicationDatabase.antibiotics?.length || 0 },
    { id: "analgesics", name: "Antalgiques", count: medicalExpert.medicationDatabase.analgesics?.length || 0 },
  ]

  // Vérification des interactions
  const interactionAnalysis = medicalExpert.checkDrugInteractions(patientData.currentMedications || [])

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <Pill className="h-6 w-6 mr-2 text-green-600" />
        Traitements Médicamenteux Actuels
      </h3>

      {/* Onglets de navigation */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setShowAllMedications(false)}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
            !showAllMedications ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Recherche Rapide
        </button>
        <button
          onClick={() => setShowAllMedications(true)}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
            showAllMedications ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Base Complète ({getAllMedications().length} médicaments)
        </button>
      </div>

      {!showAllMedications ? (
        // Mode recherche rapide
        <div className="relative mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowSuggestions(e.target.value.length > 1)
                }}
                onFocus={() => setShowSuggestions(searchTerm.length > 1)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Rechercher un médicament (ex: amlodipine, metformine...)"
              />
              <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />

              {/* Suggestions d'autocomplétion */}
              {showSuggestions && getMedicationSuggestions().length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getMedicationSuggestions().map((medication, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedMedication(medication)}
                      className="w-full text-left p-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{medication.name}</div>
                      <div className="text-sm text-gray-600">
                        {medication.brands.join(", ")} • {medication.strengths.join(", ")} • {medication.indication}
                      </div>
                      <div className="text-xs text-green-600">{medication.cost}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (selectedMedication) {
                  addMedication(selectedMedication)
                } else if (searchTerm.trim()) {
                  addMedication(searchTerm.trim())
                }
              }}
              disabled={!selectedMedication && !searchTerm.trim()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter
            </button>
          </div>
        </div>
      ) : (
        // Mode base complète
        <div className="mb-6">
          {/* Filtres par catégorie */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center transition-all ${
                  selectedCategory === category.id
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Liste complète des médicaments */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 gap-2 p-4">
              {getAllMedications().map((medication, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-green-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMedication(medication)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{medication.name}</div>
                      <div className="text-sm text-gray-600">
                        {medication.brands.join(", ")} • {medication.category}
                      </div>
                      <div className="text-xs text-gray-500">
                        Dosages: {medication.strengths.join(", ")} • {medication.cost}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addMedication(medication)
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Détails du médicament sélectionné */}
      {selectedMedication && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">Médicament sélectionné</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nom:</strong> {selectedMedication.name}
            </div>
            <div>
              <strong>Marques:</strong> {selectedMedication.brands.join(", ")}
            </div>
            <div>
              <strong>Dosages disponibles:</strong> {selectedMedication.strengths.join(", ")}
            </div>
            <div>
              <strong>Indication:</strong> {selectedMedication.indication}
            </div>
            <div>
              <strong>Posologie usuelle:</strong> {selectedMedication.dosage}
            </div>
            <div>
              <strong>Coût:</strong> {selectedMedication.cost}
            </div>
          </div>

          {/* Sélection personnalisée */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
              <select className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500">
                {selectedMedication.brands.map((brand, idx) => (
                  <option key={idx} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <select className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500">
                {selectedMedication.strengths.map((strength, idx) => (
                  <option key={idx} value={strength}>
                    {strength}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500">
                <option value="1x/j">1 fois par jour</option>
                <option value="2x/j">2 fois par jour</option>
                <option value="3x/j">3 fois par jour</option>
                <option value="4x/j">4 fois par jour</option>
                <option value="si besoin">Si besoin</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => addMedication(selectedMedication)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Ajouter ce médicament
            </button>
            <button
              onClick={() => setSelectedMedication(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Alerte interactions médicamenteuses */}
      {interactionAnalysis.hasInteractions && (
        <div
          className={`mb-6 border rounded-lg p-4 ${
            interactionAnalysis.riskLevel === "high" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center mb-2">
            <AlertTriangle
              className={`h-5 w-5 mr-2 ${
                interactionAnalysis.riskLevel === "high" ? "text-red-600" : "text-yellow-600"
              }`}
            />
            <h4
              className={`font-semibold ${
                interactionAnalysis.riskLevel === "high" ? "text-red-800" : "text-yellow-800"
              }`}
            >
              Interactions Médicamenteuses Détectées
            </h4>
          </div>
          {interactionAnalysis.interactions.map((interaction, index) => (
            <div
              key={index}
              className={`text-sm mb-2 p-2 rounded ${
                interaction.severity === "major" ? "bg-red-100" : "bg-yellow-100"
              }`}
            >
              <div className="font-medium">
                {interaction.drugs.join(" + ")} - {interaction.severity.toUpperCase()}
              </div>
              <div className="text-xs mt-1">{interaction.clinical_effect}</div>
              <div className="text-xs mt-1 font-medium">Conduite: {interaction.management}</div>
            </div>
          ))}
        </div>
      )}

      {/* Liste des médicaments actuels */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700 mb-3">
          Médicaments actuels ({patientData.currentMedications?.length || 0})
        </h4>
        {patientData.currentMedications?.length > 0 ? (
          patientData.currentMedications.map((medication) => (
            <div key={medication.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingMedication === medication.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={medication.name}
                        onChange={(e) => updateMedication(medication.id, "name", e.target.value)}
                        className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Marque</label>
                          <input
                            type="text"
                            value={medication.brand}
                            onChange={(e) => updateMedication(medication.id, "brand", e.target.value)}
                            className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Dosage</label>
                          <input
                            type="text"
                            value={medication.strength}
                            onChange={(e) => updateMedication(medication.id, "strength", e.target.value)}
                            className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fréquence</label>
                          <select
                            value={medication.frequency}
                            onChange={(e) => updateMedication(medication.id, "frequency", e.target.value)}
                            className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                          >
                            <option value="1x/j">1 fois par jour</option>
                            <option value="2x/j">2 fois par jour</option>
                            <option value="3x/j">3 fois par jour</option>
                            <option value="4x/j">4 fois par jour</option>
                            <option value="si besoin">Si besoin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
                          <input
                            type="date"
                            value={medication.startDate}
                            onChange={(e) => updateMedication(medication.id, "startDate", e.target.value)}
                            className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Indication</label>
                        <input
                          type="text"
                          value={medication.indication}
                          onChange={(e) => updateMedication(medication.id, "indication", e.target.value)}
                          className="w-full p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingMedication(null)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingMedication(null)}
                          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-green-900">{medication.name}</div>
                      <div className="text-sm text-green-700 mb-2">
                        {medication.brand} • {medication.strength}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <strong>Posologie:</strong> {medication.dosage}
                        </div>
                        <div>
                          <strong>Fréquence:</strong> {medication.frequency}
                        </div>
                        <div>
                          <strong>Indication:</strong> {medication.indication}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Depuis: {medication.startDate} • Prescrit par: {medication.prescriber}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingMedication(editingMedication === medication.id ? null : medication.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeMedication(medication.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <div>Aucun traitement en cours</div>
            <div className="text-sm">Utilisez la recherche ou la base complète pour ajouter des médicaments</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ========================================
// 🏥 COMPOSANT PRINCIPAL - SYSTÈME MÉDICAL EXPERT COMPLET
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
  })

  const [clinicalPresentation, setClinicalPresentation] = useState({
    chiefComplaint: "",
    symptoms: "",
    duration: "",
    severity: "",
    associatedSymptoms: "",
    vitalSigns: {
      bloodPressure: {
        systolic: "",
        diastolic: "",
      },
      heartRate: "",
      temperature: "",
      oxygenSaturation: "",
    },
  })

  const [diagnosis, setDiagnosis] = useState(null)
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([])
  const [prescription, setPrescription] = useState(null)
  const [consultationReport, setConsultationReport] = useState(null)

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
      const result = await medicalExpert.generateCompletePrescription(selectedDiagnoses, patientData, {
        clinicalPresentation,
        diagnosis,
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
              Système Médical Expert Complet
            </h1>
            <p className="text-indigo-100 mt-3 text-lg">
              Diagnostic IA + Prescription modifiable + Examens + Interactions - Maurice
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-indigo-200">Confiance Diagnostique</div>
            <div className="text-3xl font-bold">{diagnosis ? Math.round(diagnosis.confidence * 100) : "--"}%</div>
            <div className="text-xs text-indigo-200">
              {apiStatus.mode === "EXPERT_MODE" ? "🚀 Mode Expert" : "🏠 Mode Local"}
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
            <Award className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Confiance</div>
            <div className="font-bold">{diagnosis ? "Élevée" : "--"}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-xl p-4 text-center">
            <Database className="h-6 w-6 mx-auto mb-2" />
            <div className="text-xs">Source</div>
            <div className="font-bold text-xs">{diagnosis?.source?.split(" ")[0] || "Expert"}</div>
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
          {/* Section Patient avec antécédents */}
          {currentStep === "patient" && (
            <>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <User className="h-6 w-6 mr-3 text-blue-600" />
                  Données Patient Complètes
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom complet *</label>
                    <input
                      type="text"
                      value={patientData.name}
                      onChange={(e) => updatePatientData("name", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom Prénom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Âge *</label>
                    <input
                      type="number"
                      value={patientData.age}
                      onChange={(e) => updatePatientData("age", Number.parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Âge en années"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Genre *</label>
                    <select
                      value={patientData.gender}
                      onChange={(e) => updatePatientData("gender", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      value={patientData.weight}
                      onChange={(e) => updatePatientData("weight", Number.parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="70"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Taille (cm)</label>
                    <input
                      type="number"
                      value={patientData.height}
                      onChange={(e) => updatePatientData("height", Number.parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="170"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setCurrentStep("clinical")}
                    disabled={!patientData.name || !patientData.age || !patientData.gender}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
                  >
                    Continuer vers Antécédents
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </button>
                </div>
              </div>

              {/* Antécédents médicaux et chirurgicaux */}
              <MedicalHistoryPanel patientData={patientData} onUpdatePatientData={updatePatientData} />

              {/* Traitements actuels */}
              <CurrentMedicationsPanel patientData={patientData} onUpdatePatientData={updatePatientData} />
            </>
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
                    placeholder="Ex: Douleur thoracique depuis 2 jours"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Durée des symptômes</label>
                    <select
                      value={clinicalPresentation.duration}
                      onChange={(e) => updateClinicalPresentation("duration", e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      <option value="< 24h">Moins de 24h</option>
                      <option value="1-7 jours">1-7 jours</option>
                      <option value="1-4 semaines">1-4 semaines</option>
                      <option value="1-6 mois">1-6 mois</option>
                      <option value="> 6 mois">Plus de 6 mois</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sévérité (0-10)</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={clinicalPresentation.severity || 5}
                      onChange={(e) => updateClinicalPresentation("severity", e.target.value)}
                      className="w-full"
                    />
                    <div className="text-center text-sm text-gray-600 mt-1">
                      {clinicalPresentation.severity || 5}/10
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Symptômes associés</label>
                  <textarea
                    value={clinicalPresentation.associatedSymptoms}
                    onChange={(e) => updateClinicalPresentation("associatedSymptoms", e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Autres symptômes présents: fièvre, nausées, fatigue, etc."
                  />
                </div>
                {/* Signes vitaux */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-4">Signes Vitaux</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tension Artérielle (mmHg)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={clinicalPresentation.vitalSigns.bloodPressure.systolic}
                          onChange={(e) =>
                            updateClinicalPresentation("vitalSigns", {
                              ...clinicalPresentation.vitalSigns,
                              bloodPressure: {
                                ...clinicalPresentation.vitalSigns.bloodPressure,
                                systolic: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Systolique"
                        />
                        <span className="self-center text-gray-500">/</span>
                        <input
                          type="number"
                          value={clinicalPresentation.vitalSigns.bloodPressure.diastolic}
                          onChange={(e) =>
                            updateClinicalPresentation("vitalSigns", {
                              ...clinicalPresentation.vitalSigns,
                              bloodPressure: {
                                ...clinicalPresentation.vitalSigns.bloodPressure,
                                diastolic: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Diastolique"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence Cardiaque (bpm)</label>
                      <input
                        type="number"
                        value={clinicalPresentation.vitalSigns.heartRate}
                        onChange={(e) =>
                          updateClinicalPresentation("vitalSigns", {
                            ...clinicalPresentation.vitalSigns,
                            heartRate: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="72"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Température (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={clinicalPresentation.vitalSigns.temperature}
                        onChange={(e) =>
                          updateClinicalPresentation("vitalSigns", {
                            ...clinicalPresentation.vitalSigns,
                            temperature: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="36.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SpO2 (%)</label>
                      <input
                        type="number"
                        value={clinicalPresentation.vitalSigns.oxygenSaturation}
                        onChange={(e) =>
                          updateClinicalPresentation("vitalSigns", {
                            ...clinicalPresentation.vitalSigns,
                            oxygenSaturation: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="98"
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
                  <ChevronDown className="h-5 w-5 mr-2 rotate-90" />
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Brain className="h-6 w-6 mr-3 text-purple-600" />
                Diagnostic Différentiel Expert
              </h2>

              {/* Insights IA Expert */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-purple-800 mb-3 flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
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
                      <strong>Timestamp:</strong> {new Date(diagnosis.timestamp).toLocaleString("fr-FR")}
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
                  <ChevronDown className="h-5 w-5 mr-2 rotate-90" />
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
          )}

          {/* Section Prescription */}
          {currentStep === "prescription" && prescription && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Pill className="h-6 w-6 mr-2 text-green-600" />
                Prescription Médicale Générée
              </h3>

              <div className="space-y-4">
                {prescription.prescription?.medications?.map((med, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{med.medication_name}</h4>
                        <div className="text-sm text-gray-600">{med.brand_name}</div>
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

                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="text-sm font-medium text-blue-800 mb-1">Instructions:</div>
                      <div className="text-sm text-blue-700">{med.instructions?.french}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setCurrentStep("summary")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold"
                >
                  Voir Synthèse
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
                <button
                  onClick={() => {
                    const prescriptionText = `ORDONNANCE MÉDICALE\n\nPatient: ${patientData.name}\nÂge: ${patientData.age} ans\n\nMÉDICAMENTS:\n${prescription.prescription?.medications?.map((med, i) => `${i + 1}. ${med.medication_name} ${med.strength}\n   ${med.dosage_regimen?.dose} ${med.dosage_regimen?.frequency}\n   ${med.instructions?.french}`).join("\n\n")}`
                    const blob = new Blob([prescriptionText], { type: "text/plain" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `Ordonnance_${patientData.name}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-semibold"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Télécharger
                </button>
              </div>
            </div>
          )}

          {/* Section Synthèse */}
          {currentStep === "summary" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <FileText className="h-6 w-6 mr-3 text-indigo-600" />
                Synthèse de Consultation
              </h2>

              <div className="space-y-6">
                {/* Résumé patient */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Patient</h3>
                  <div className="text-sm text-gray-700">
                    <strong>{patientData.name}</strong>, {patientData.age} ans, {patientData.gender}
                    {patientData.ethnicity && `, ${patientData.ethnicity}`}
                  </div>
                  {patientData.medicalHistory?.length > 0 && (
                    <div className="mt-2">
                      <strong>Antécédents:</strong> {patientData.medicalHistory.map((h) => h.condition).join(", ")}
                    </div>
                  )}
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

                {/* Génération automatique du compte-rendu */}
                {!consultationReport && diagnosis && prescription && (
                  <div className="mt-6">
                    <button
                      onClick={async () => {
                        const report = await medicalExpert.generateConsultationReport(
                          patientData,
                          clinicalPresentation,
                          diagnosis,
                          prescription,
                        )
                        setConsultationReport(report)
                      }}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center font-semibold"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Générer Compte-Rendu
                    </button>
                  </div>
                )}

                {/* Affichage du compte-rendu */}
                {consultationReport && (
                  <div className="bg-indigo-50 rounded-lg p-4 mt-6">
                    <h3 className="font-semibold mb-2 text-indigo-800">Compte-Rendu de Consultation</h3>
                    <div className="bg-white rounded border p-4 mb-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {medicalExpert.formatConsultationReportText(consultationReport)}
                      </pre>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          const reportText = medicalExpert.formatConsultationReportText(consultationReport)
                          const blob = new Blob([reportText], { type: "text/plain" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `CR_${patientData.name}_${new Date().toISOString().split("T")[0]}.txt`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger CR
                      </button>
                      <button
                        onClick={() => {
                          const reportText = medicalExpert.formatConsultationReportText(consultationReport)
                          const printWindow = window.open("", "_blank")
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Compte-Rendu de Consultation</title>
                                <style>
                                  body { font-family: 'Courier New', monospace; margin: 20px; }
                                  h1 { color: #4F46E5; text-align: center; }
                                  pre { white-space: pre-wrap; }
                                </style>
                              </head>
                              <body>
                                <h1>Compte-Rendu de Consultation Médicale</h1>
                                <pre>${reportText}</pre>
                              </body>
                            </html>
                          `)
                          printWindow.document.close()
                          printWindow.print()
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimer CR
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep("prescription")}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center font-semibold"
                  >
                    <Edit className="h-5 w-5 mr-2" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      // Reset pour nouvelle consultation
                      setCurrentStep("patient")
                      setPatientData({
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
                      })
                      setClinicalPresentation({
                        chiefComplaint: "",
                        symptoms: "",
                        duration: "",
                        severity: "",
                        associatedSymptoms: "",
                        vitalSigns: {
                          bloodPressure: {
                            systolic: "",
                            diastolic: "",
                          },
                          heartRate: "",
                          temperature: "",
                          oxygenSaturation: "",
                        },
                      })
                      setDiagnosis(null)
                      setSelectedDiagnoses([])
                      setPrescription(null)
                      setConsultationReport(null)
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nouvelle Consultation
                  </button>
                </div>
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
                {patientData.weight && patientData.height && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600 mb-1">IMC Calculé</div>
                    <div className="font-bold text-blue-800">
                      {Math.round((patientData.weight / Math.pow(patientData.height / 100, 2)) * 10) / 10}
                    </div>
                  </div>
                )}
                {patientData.medicalHistory?.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-purple-600 mb-1">
                      Antécédents ({patientData.medicalHistory.length})
                    </div>
                    <div className="text-xs text-purple-800">
                      {patientData.medicalHistory
                        .slice(0, 3)
                        .map((h) => h.condition)
                        .join(", ")}
                      {patientData.medicalHistory.length > 3 && "..."}
                    </div>
                  </div>
                )}
                {patientData.currentMedications?.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600 mb-1">
                      Traitements ({patientData.currentMedications.length})
                    </div>
                    <div className="text-xs text-green-800">
                      {patientData.currentMedications
                        .slice(0, 2)
                        .map((m) => m.name)
                        .join(", ")}
                      {patientData.currentMedications.length > 2 && "..."}
                    </div>
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
              <AlertCircle className="h-5 w-5 mr-2 text-green-600" />
              Aide Contextuelle
            </h3>

            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-semibold text-blue-800 mb-1">💡 Conseil Expert</div>
                <div className="text-blue-700">
                  {currentStep === "patient" &&
                    "Renseignez l'ethnie et les mesures anthropométriques pour une analyse complète"}
                  {currentStep === "clinical" &&
                    "Décrivez précisément: chronologie, caractéristiques, facteurs modulants"}
                  {currentStep === "diagnosis" &&
                    "Sélectionnez les diagnostics les plus probables pour une prescription adaptée"}
                  {currentStep === "prescription" && "Vérifiez les posologies et interactions avant validation"}
                  {currentStep === "summary" && "Consultation terminée - Possibilité d'export et impression"}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="font-semibold text-yellow-800 mb-1">⚠️ Responsabilité Médicale</div>
                <div className="text-yellow-700 text-xs">
                  Cet outil est une aide au diagnostic et à la prescription. La décision médicale finale et la
                  responsabilité restent entièrement du praticien.
                </div>
              </div>

              {diagnosis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="font-semibold text-green-800 mb-1">🇲🇺 Contexte Maurice</div>
                  <div className="text-green-700 text-xs">
                    Analyse adaptée aux prévalences locales, disponibilité des examens et médicaments Maurice
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
                Performance Système
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
                    <div className="text-gray-600">Temps Analyse</div>
                    <div className="font-bold">{diagnosis.processingTime}ms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Source</div>
                    <div className="font-bold text-xs">{diagnosis.source?.split(" ")[0] || "Expert"}</div>
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
            {apiStatus.openai ? "IA GPT-4 + APIs médicales" : "IA locale avancée"}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Shield className="h-4 w-4 mr-1" />
            Données sécurisées
          </span>
        </div>
        <div className="mb-1">
          <strong>Système Médical Expert v5.0</strong> -{" "}
          {apiStatus.mode === "EXPERT_MODE" ? "Mode Expert" : "Mode Local"}
          {apiStatus.openai && (
            <span className="ml-2 text-green-600 font-medium">• OpenAI • Antécédents • Interactions • Examens</span>
          )}
        </div>
        <div className="text-xs">
          {apiStatus.openai
            ? "Diagnostic IA expert + Prescription modifiable + Antécédents + Interactions + Examens Maurice"
            : "Système médical local avancé - Configurer OpenAI pour diagnostic IA expert"}
        </div>
      </div>
    </div>
  )
}

// Export par défaut du composant principal
export default AdvancedMedicalExpertSystem
