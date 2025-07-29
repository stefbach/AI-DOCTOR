import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Base de données exhaustive des scores cliniques avec explications détaillées
const CLINICAL_SCORES_DETAILED = {
  cardiology: {
    HEART: {
      fullName: "History, ECG, Age, Risk factors, Troponin",
      description: "Score de stratification du risque dans la douleur thoracique aux urgences",
      purpose: "Évalue le risque d'événement cardiaque majeur (MACE) à 6 semaines",
      components: [
        "History (Histoire) : Anamnèse suspecte (0-2 points)",
        "ECG : Normal (0), Non spécifique (1), Ischémie ST (2)",
        "Age : <45 ans (0), 45-65 (1), >65 (2)",
        "Risk factors : 0 FDR (0), 1-2 FDR (1), ≥3 FDR ou ATCD coronarien (2)",
        "Troponine : Normal (0), 1-3x normale (1), >3x normale (2)"
      ],
      interpretation: {
        "0-3": "Risque faible (1.7%) - Sortie possible",
        "4-6": "Risque intermédiaire (16.6%) - Observation",
        "7-10": "Risque élevé (50.1%) - Admission"
      },
      howToCalculate: "Additionner les points de chaque critère (score total sur 10)",
      whenToUse: "Douleur thoracique aux urgences chez patient >21 ans",
      references: "Backus BE et al. Chest 2013;143(5):1397-1405",
      onlineCalculator: "https://www.mdcalc.com/heart-score-major-cardiac-events"
    },
    TIMI: {
      fullName: "Thrombolysis In Myocardial Infarction Risk Score",
      description: "Score de risque pour syndrome coronarien aigu sans sus-ST",
      purpose: "Prédit mortalité, IDM, revascularisation urgente à 14 jours",
      components: [
        "Âge ≥65 ans (1 point)",
        "≥3 facteurs de risque CV (1 point)",
        "Sténose coronaire connue ≥50% (1 point)",
        "Prise d'aspirine dans les 7 jours (1 point)",
        "≥2 épisodes angineux en 24h (1 point)",
        "Élévation des marqueurs cardiaques (1 point)",
        "Déviation ST ≥0.5mm (1 point)"
      ],
      interpretation: {
        "0-1": "Risque faible (4.7%)",
        "2": "Risque faible (8.3%)",
        "3": "Risque intermédiaire (13.2%)",
        "4": "Risque intermédiaire (19.9%)",
        "5": "Risque élevé (26.2%)",
        "6-7": "Risque très élevé (40.9%)"
      },
      howToCalculate: "1 point par critère présent (score sur 7)",
      whenToUse: "SCA sans sus-ST confirmé",
      references: "Antman EM et al. JAMA 2000;284:835-42"
    },
    "CHA2DS2-VASc": {
      fullName: "Congestive heart failure, Hypertension, Age, Diabetes, Stroke, Vascular disease, Sex category",
      description: "Score de risque d'AVC dans la fibrillation atriale",
      purpose: "Guide l'anticoagulation dans la FA non valvulaire",
      components: [
        "C - Insuffisance cardiaque/dysfonction VG (1 point)",
        "H - Hypertension (1 point)",
        "A2 - Âge ≥75 ans (2 points)",
        "D - Diabète (1 point)",
        "S2 - AVC/AIT/embolie antérieur (2 points)",
        "V - Maladie vasculaire (IDM, artériopathie) (1 point)",
        "A - Âge 65-74 ans (1 point)",
        "Sc - Sexe féminin (1 point)"
      ],
      interpretation: {
        "0": "Risque faible - Pas d'anticoagulation",
        "1": "Risque intermédiaire - Considérer anticoagulation",
        "≥2": "Risque élevé - Anticoagulation recommandée"
      },
      howToCalculate: "Additionner les points (score maximum 9)",
      whenToUse: "Tout patient avec FA non valvulaire",
      references: "ESC Guidelines 2020",
      onlineCalculator: "https://www.mdcalc.com/cha2ds2-vasc-score-atrial-fibrillation-stroke-risk"
    }
  },
  neurology: {
    NIHSS: {
      fullName: "National Institutes of Health Stroke Scale",
      description: "Échelle de gravité de l'AVC",
      purpose: "Évalue la sévérité neurologique et guide la thrombolyse",
      components: [
        "1a. Niveau de conscience (0-3)",
        "1b. Questions LOC (0-2)",
        "1c. Commandes LOC (0-2)",
        "2. Regard (0-2)",
        "3. Vision (0-3)",
        "4. Paralysie faciale (0-3)",
        "5-6. Motricité bras G/D (0-4 chaque)",
        "7-8. Motricité jambe G/D (0-4 chaque)",
        "9. Ataxie (0-2)",
        "10. Sensibilité (0-2)",
        "11. Langage (0-3)",
        "12. Dysarthrie (0-2)",
        "13. Négligence (0-2)"
      ],
      interpretation: {
        "0": "Pas de déficit",
        "1-4": "AVC mineur",
        "5-15": "AVC modéré",
        "16-20": "AVC modéré à sévère",
        "21-42": "AVC sévère"
      },
      howToCalculate: "Somme des 15 items (0-42 points)",
      whenToUse: "Suspicion d'AVC aigu, suivi évolutif",
      criticalInfo: "Score ≥6 = éligible thrombolyse si <4.5h",
      references: "Brott T et al. Stroke 1989",
      onlineCalculator: "https://www.mdcalc.com/nih-stroke-scale-score-nihss"
    },
    ABCD2: {
      fullName: "Age, Blood pressure, Clinical features, Duration, Diabetes",
      description: "Score de risque d'AVC après AIT",
      purpose: "Prédit le risque d'AVC à 2, 7, 90 jours après AIT",
      components: [
        "A - Âge ≥60 ans (1 point)",
        "B - Blood pressure ≥140/90 (1 point)",
        "C - Clinical: Déficit moteur (2 pts) ou trouble parole sans déficit (1 pt)",
        "D - Duration: ≥60 min (2 pts) ou 10-59 min (1 pt)",
        "D - Diabète (1 point)"
      ],
      interpretation: {
        "0-3": "Risque faible (1% à 2j)",
        "4-5": "Risque modéré (4.1% à 2j)",
        "6-7": "Risque élevé (8.1% à 2j)"
      },
      howToCalculate: "Addition simple (score sur 7)",
      whenToUse: "Après AIT confirmé",
      clinicalAction: "Score ≥4 = hospitalisation recommandée",
      references: "Johnston SC et al. Lancet 2007"
    }
  },
  pneumology: {
    "CURB-65": {
      fullName: "Confusion, Urea, Respiratory rate, Blood pressure, age 65",
      description: "Score de sévérité de la pneumonie communautaire",
      purpose: "Guide l'hospitalisation et prédit la mortalité",
      components: [
        "C - Confusion (désorientation temporo-spatiale) (1 point)",
        "U - Urée >7 mmol/L (>42 mg/dL) (1 point)",
        "R - Respiratory rate ≥30/min (1 point)",
        "B - Blood pressure: PAS <90 ou PAD ≤60 mmHg (1 point)",
        "65 - Âge ≥65 ans (1 point)"
      ],
      interpretation: {
        "0-1": "Mortalité faible (1.5%) - Ambulatoire possible",
        "2": "Mortalité intermédiaire (9.2%) - Hospitalisation courte/ambulatoire surveillé",
        "3-5": "Mortalité élevée (22%) - Hospitalisation, considérer USI si 4-5"
      },
      simplifiedVersion: "CRB-65 (sans urée) utilisable en ville",
      howToCalculate: "1 point par critère (0-5)",
      whenToUse: "Pneumonie communautaire confirmée",
      references: "Lim WS et al. Thorax 2003"
    },
    "Wells-PE": {
      fullName: "Wells Criteria for Pulmonary Embolism",
      description: "Score de probabilité clinique d'embolie pulmonaire",
      purpose: "Stratifie le risque pré-test d'EP",
      components: [
        "Signes cliniques de TVP (3 points)",
        "Diagnostic alternatif moins probable que EP (3 points)",
        "FC >100/min (1.5 points)",
        "Immobilisation/chirurgie <4 sem (1.5 points)",
        "ATCD TVP/EP (1.5 points)",
        "Hémoptysie (1 point)",
        "Cancer actif (1 point)"
      ],
      interpretation: {
        "≤4": "EP peu probable - D-dimères",
        ">4": "EP probable - Angio-TDM directement"
      },
      simplifiedInterpretation: {
        "<2": "Risque faible (1.3%)",
        "2-6": "Risque intermédiaire (16.2%)",
        ">6": "Risque élevé (40.6%)"
      },
      howToCalculate: "Somme des points (max 12.5)",
      whenToUse: "Suspicion clinique d'EP",
      references: "Wells PS et al. Ann Intern Med 2001"
    }
  },
  psychiatry: {
    "PHQ-9": {
      fullName: "Patient Health Questionnaire-9",
      description: "Échelle de dépistage et suivi de la dépression",
      purpose: "Dépiste et évalue la sévérité de la dépression",
      instructions: "Sur les 2 dernières semaines, à quelle fréquence avez-vous été gêné par:",
      components: [
        "Peu d'intérêt ou plaisir à faire les choses",
        "Sentiment de tristesse, déprime ou désespoir",
        "Difficultés à s'endormir/rester endormi ou trop dormir",
        "Fatigue ou peu d'énergie",
        "Peu d'appétit ou manger trop",
        "Mauvaise estime de soi",
        "Difficultés de concentration",
        "Lenteur ou agitation psychomotrice",
        "Pensées suicidaires ou d'automutilation"
      ],
      scoring: "Chaque item: Jamais (0), Plusieurs jours (1), Plus de la moitié du temps (2), Presque tous les jours (3)",
      interpretation: {
        "0-4": "Pas de dépression",
        "5-9": "Dépression légère",
        "10-14": "Dépression modérée",
        "15-19": "Dépression modérément sévère",
        "20-27": "Dépression sévère"
      },
      criticalItem: "Question 9 (suicide) >0 = évaluation immédiate",
      howToCalculate: "Somme des 9 items (0-27)",
      whenToUse: "Dépistage en soins primaires, suivi thérapeutique",
      references: "Kroenke K et al. J Gen Intern Med 2001"
    },
    "GAD-7": {
      fullName: "Generalized Anxiety Disorder-7",
      description: "Échelle de dépistage des troubles anxieux",
      purpose: "Dépiste et évalue l'anxiété généralisée",
      instructions: "Sur les 2 dernières semaines, à quelle fréquence:",
      components: [
        "Sentiment de nervosité, anxiété ou tension",
        "Incapacité à arrêter ou contrôler les inquiétudes",
        "Inquiétudes excessives à propos de diverses choses",
        "Difficultés à se détendre",
        "Agitation, difficultés à tenir en place",
        "Irritabilité",
        "Peur que quelque chose de terrible arrive"
      ],
      scoring: "Identique au PHQ-9: 0-3 par item",
      interpretation: {
        "0-4": "Anxiété minimale",
        "5-9": "Anxiété légère",
        "10-14": "Anxiété modérée",
        "15-21": "Anxiété sévère"
      },
      cutoff: "≥10 = sensibilité 89%, spécificité 82% pour TAG",
      howToCalculate: "Somme des 7 items (0-21)",
      whenToUse: "Dépistage anxiété en soins primaires",
      references: "Spitzer RL et al. Arch Intern Med 2006"
    }
  },
  pediatrics: {
    PEWS: {
      fullName: "Pediatric Early Warning Score",
      description: "Score de détection précoce de détérioration clinique pédiatrique",
      purpose: "Identifie les enfants à risque de décompensation",
      components: [
        "Comportement: Normal (0), Somnolent (1), Irritable (2), Léthargique (3)",
        "Cardiovasculaire: Normal (0), Pâle (1), Gris (2), Gris+TRC>3s (3)",
        "Respiratoire: Normal (0), Détresse légère (1), Modérée (2), Sévère (3)"
      ],
      additionalFactors: "Ajouter 2 points si: O2 nécessaire, 1/4h nébulisation, vomissements post-op persistants",
      interpretation: {
        "0-2": "Surveillance standard",
        "3-4": "Surveillance rapprochée, appel médecin",
        "≥5": "Appel urgent médecin senior/réanimation"
      },
      ageSpecific: "Paramètres vitaux selon courbes âge",
      howToCalculate: "Somme des 3 domaines + facteurs additionnels",
      whenToUse: "Tout enfant hospitalisé",
      references: "Monaghan A. Arch Dis Child 2005"
    }
  },
  gastroenterology: {
    "Child-Pugh": {
      fullName: "Child-Pugh Score",
      description: "Classification de la sévérité de la cirrhose",
      purpose: "Évalue le pronostic et guide les décisions thérapeutiques",
      components: [
        "Bilirubine: <34 μmol/L (1pt), 34-50 (2pts), >50 (3pts)",
        "Albumine: >35 g/L (1pt), 28-35 (2pts), <28 (3pts)",
        "INR: <1.7 (1pt), 1.7-2.3 (2pts), >2.3 (3pts)",
        "Ascite: Absente (1pt), Modérée (2pts), Tendue (3pts)",
        "Encéphalopathie: Absente (1pt), Grade 1-2 (2pts), Grade 3-4 (3pts)"
      ],
      interpretation: {
        "5-6": "Classe A - Survie 95% à 1 an",
        "7-9": "Classe B - Survie 80% à 1 an",
        "10-15": "Classe C - Survie 45% à 1 an"
      },
      clinicalUse: "Contre-indication chirurgie si score >9",
      howToCalculate: "Somme des 5 paramètres (5-15)",
      whenToUse: "Toute cirrhose connue",
      limitations: "Subjectif pour ascite/encéphalopathie",
      references: "Child CG, Turcotte JG. Surgery 1964"
    }
  },
  emergency: {
    NEWS2: {
      fullName: "National Early Warning Score 2",
      description: "Score de détection précoce de détérioration clinique",
      purpose: "Standardise l'évaluation et la réponse clinique",
      components: [
        "FR: 12-20 (0), 9-11 (1), 21-24 (2), ≤8 ou ≥25 (3)",
        "SpO2 échelle 1: ≥96 (0), 94-95 (1), 92-93 (2), ≤91 (3)",
        "SpO2 échelle 2 (BPCO): 88-92 (0), 86-87 (1), 84-85 (2), ≤83 (3)",
        "O2 supplémentaire: Non (0), Oui (2)",
        "T°C: 36.1-38 (0), 35.1-36 ou 38.1-39 (1), ≥39.1 (2), ≤35 (3)",
        "PAS: 111-219 (0), 101-110 (1), 91-100 (2), ≤90 ou ≥220 (3)",
        "FC: 51-90 (0), 41-50 ou 91-110 (1), 111-130 (2), ≤40 ou ≥131 (3)",
        "Conscience: Alerte (0), Nouveau CVPU (3)"
      ],
      interpretation: {
        "0": "Surveillance minimum 12h",
        "1-4": "Surveillance minimum 4-6h",
        "5-6": "Surveillance horaire, réponse urgente",
        "≥7": "Surveillance continue, équipe d'urgence"
      },
      howToCalculate: "Somme des paramètres (0-20)",
      whenToUse: "Tout patient hospitalisé adulte",
      references: "RCP UK 2017"
    }
  },
  geriatrics: {
    CFS: {
      fullName: "Clinical Frailty Scale",
      description: "Échelle de fragilité clinique",
      purpose: "Évalue le degré de fragilité et prédit les outcomes",
      components: [
        "1 - Très en forme: Robuste, actif, énergique",
        "2 - En forme: Sans maladie active mais moins en forme que 1",
        "3 - Gère bien: Problèmes médicaux bien contrôlés",
        "4 - Vulnérable: Pas dépendant mais symptômes limitent activités",
        "5 - Légèrement fragile: Aide pour activités instrumentales",
        "6 - Modérément fragile: Aide pour AVQ et activités instrumentales",
        "7 - Sévèrement fragile: Dépendant pour AVQ",
        "8 - Très sévèrement fragile: Totalement dépendant, fin de vie",
        "9 - En phase terminale: Espérance de vie <6 mois"
      ],
      interpretation: {
        "1-3": "Robuste",
        "4": "Pré-fragile",
        "5-6": "Fragile léger-modéré",
        "7-9": "Fragile sévère"
      },
      clinicalImpact: "Score ≥5 = mortalité x2, complications post-op x3",
      howToEvaluate: "Jugement clinique global basé sur 2 semaines avant",
      whenToUse: "Tout patient >65 ans, pré-op, urgences",
      references: "Rockwood K et al. CMAJ 2005"
    }
  }
}

// Fonction pour générer une explication complète d'un score pour les médecins
function generateScoreEducation(scoreName: string): any {
  const scoreDetails = getScoreDetails(scoreName)
  if (!scoreDetails) {
    return {
      explanation: `Score ${scoreName} - Détails non disponibles`,
      calculator: null
    }
  }

  return {
    fullName: scoreDetails.fullName,
    explanation: scoreDetails.description,
    purpose: scoreDetails.purpose,
    howToCalculate: scoreDetails.howToCalculate,
    interpretation: scoreDetails.interpretation,
    clinicalAction: scoreDetails.clinicalAction || scoreDetails.clinicalUse || "Selon résultat",
    reference: scoreDetails.references,
    calculatorLink: scoreDetails.onlineCalculator || null,
    criticalInfo: scoreDetails.criticalInfo || scoreDetails.criticalItem || null
  }
}

// Fonction améliorée pour générer des questions avec éducation sur les scores
function enrichQuestionWithScoreEducation(question: any): any {
  if (question.clinical_score) {
    const scoreEducation = generateScoreEducation(question.clinical_score)
    return {
      ...question,
      score_full_name: scoreEducation.fullName,
      score_explanation: scoreEducation.explanation,
      score_purpose: scoreEducation.purpose,
      score_calculation: scoreEducation.howToCalculate,
      score_clinical_action: scoreEducation.clinicalAction,
      score_reference: scoreEducation.reference,
      score_calculator_link: scoreEducation.calculatorLink,
      score_critical_info: scoreEducation.criticalInfo
    }
  }
  return question
}

// Base de données simplifiée pour la liste des scores par spécialité
const CLINICAL_SCORES_DATABASE = {
  cardiology: {
    scores: Object.keys(CLINICAL_SCORES_DETAILED.cardiology),
    guidelines: ["ESC", "ACC/AHA", "NICE"],
  },
  neurology: {
    scores: Object.keys(CLINICAL_SCORES_DETAILED.neurology),
    guidelines: ["AAN", "ESO", "IHS"],
  },
  pneumology: {
    scores: ["CURB-65", "PSI", "Wells-PE", "Geneva", "BODE", "MRC Dyspnea", "CAT", "ACT"],
    guidelines: ["GOLD", "GINA", "BTS", "ATS/ERS"],
  },
  gastroenterology: {
    scores: ["Child-Pugh", "MELD", "Rockall", "Glasgow-Blatchford", "APRI", "FIB-4", "Mayo", "Harvey-Bradshaw"],
    guidelines: ["EASL", "AASLD", "ACG", "ECCO"],
  },
  nephrology: {
    scores: ["CKD-EPI", "MDRD", "KDIGO", "RIFLE", "AKIN", "Cockcroft-Gault"],
    guidelines: ["KDIGO", "ERA-EDTA", "NKF"],
  },
  hematology: {
    scores: ["ISTH-DIC", "4Ts", "PLASMIC", "IPI", "ISS", "SOKAL", "CLL-IPI"],
    guidelines: ["ASH", "EHA", "ISTH"],
  },
  infectiology: {
    scores: ["SIRS", "qSOFA", "SOFA", "APACHE II", "CPIS", "Centor", "McIsaac"],
    guidelines: ["IDSA", "ESCMID", "WHO"],
  },
  rheumatology: {
    scores: ["DAS28", "CDAI", "SLEDAI", "BASDAI", "ACR criteria", "EULAR criteria"],
    guidelines: ["ACR", "EULAR", "BSR"],
  },
  endocrinology: {
    scores: ["FINDRISC", "HOMA-IR", "Ottawa criteria", "FRAX", "TIRADS", "Bethesda"],
    guidelines: ["ADA", "AACE", "Endocrine Society"],
  },
  psychiatry: {
    scores: ["PHQ-9", "GAD-7", "MADRS", "HAM-D", "PANSS", "MMSE", "MoCA", "Y-BOCS", "PCL-5"],
    guidelines: ["APA", "NICE", "WFSBP"],
  },
  pediatrics: {
    scores: ["PEWS", "APGAR", "Centor pédiatrique", "PedCRASH", "PRAM", "Cincinnati"],
    guidelines: ["AAP", "ESPGHAN", "ESPID"],
  },
  geriatrics: {
    scores: ["CFS", "Barthel", "Lawton", "GDS", "MMSE", "CAM", "STOPP/START"],
    guidelines: ["AGS", "BGS", "EUGMS"],
  },
  obstetrics: {
    scores: ["Bishop", "APGAR", "Wells grossesse", "HELLP criteria", "MEOWS"],
    guidelines: ["ACOG", "RCOG", "FIGO"],
  },
  dermatology: {
    scores: ["SCORAD", "PASI", "DLQI", "IHS", "ABCDE", "Glasgow-7"],
    guidelines: ["AAD", "EADV", "BAD"],
  },
  ophthalmology: {
    scores: ["AREDS", "ETDRS", "Oxford", "VF-14", "Snellen", "LogMAR"],
    guidelines: ["AAO", "RCOphth", "ESCRS"],
  },
  orl: {
    scores: ["Centor", "SNOT-22", "THI", "VHI", "Epworth", "STOP-BANG", "Berlin"],
    guidelines: ["AAO-HNS", "EAACI"],
  },
  emergency: {
    scores: ["REMS", "NEWS2", "MEWS", "Canadian C-Spine", "NEXUS", "PECARN"],
    guidelines: ["ACEP", "ERC", "NICE"],
  },
  orthopedics: {
    scores: ["KOOS", "WOMAC", "Harris Hip", "Constant-Murley", "DASH", "Ottawa ankle/knee"],
    guidelines: ["AAOS", "EFORT", "BOA"],
  },
  urology: {
    scores: ["IPSS", "IIEF", "STONE", "RENAL", "Bosniak", "PI-RADS"],
    guidelines: ["EAU", "AUA", "NICE"],
  },
  anesthesiology: {
    scores: ["ASA", "Mallampati", "STOP-BANG", "Apfel", "Aldrete", "P-POSSUM"],
    guidelines: ["ASA", "ESA", "SAMBA"],
  },
}

// Mots-clés pour détection automatique de spécialité
const SPECIALTY_KEYWORDS = {
  cardiology: ["thorax", "poitrine", "cardiaque", "palpitation", "essoufflement", "œdème", "syncope", "malaise"],
  neurology: ["céphalée", "tête", "vertige", "paresthésie", "faiblesse", "paralysie", "convulsion", "trouble visuel"],
  pneumology: ["toux", "dyspnée", "expectoration", "hémoptysie", "sifflement", "douleur pleurale"],
  gastroenterology: ["abdomen", "ventre", "nausée", "vomissement", "diarrhée", "constipation", "reflux", "dysphagie"],
  psychiatry: ["anxiété", "dépression", "insomnie", "stress", "panique", "tristesse", "suicide", "angoisse"],
  dermatology: ["peau", "éruption", "prurit", "lésion", "tache", "bouton", "rougeur", "desquamation"],
  pediatrics: ["enfant", "bébé", "nourrisson", "croissance", "développement", "vaccin"],
  gynecology: ["règles", "menstruation", "grossesse", "enceinte", "contraception", "ménopause", "pertes"],
  urology: ["urine", "miction", "prostate", "testicule", "érection", "colique néphrétique"],
  ophthalmology: ["œil", "vision", "vue", "cécité", "diplopie", "photophobie", "œil rouge"],
  orl: ["oreille", "audition", "surdité", "acouphène", "gorge", "voix", "nez", "sinusite"],
  rheumatology: ["articulation", "arthrite", "douleur articulaire", "gonflement", "raideur"],
  endocrinology: ["diabète", "thyroïde", "hormone", "poids", "soif", "polyurie"],
  hematology: ["saignement", "ecchymose", "anémie", "fatigue chronique", "ganglion"],
  orthopedics: ["fracture", "entorse", "trauma", "chute", "douleur osseuse", "boiterie"],
}

// Fonction améliorée de détection de spécialité
function detectMedicalSpecialties(patientData: any, clinicalData: any): string[] {
  const detectedSpecialties: string[] = []
  const symptoms = safeStringConversion(clinicalData.symptoms)
  const chiefComplaint = safeStringConversion(clinicalData.chiefComplaint)
  const medicalHistory = safeStringConversion(patientData.medicalHistory)
  const combinedText = `${symptoms} ${chiefComplaint} ${medicalHistory}`.toLowerCase()

  // Détection par mots-clés
  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (keywords.some(keyword => combinedText.includes(keyword))) {
      detectedSpecialties.push(specialty)
    }
  }

  // Ajout de spécialités basées sur l'âge
  if (patientData.age < 18) detectedSpecialties.push("pediatrics")
  if (patientData.age > 65) detectedSpecialties.push("geriatrics")
  if (patientData.gender === "Féminin" && patientData.age >= 12 && patientData.age <= 55) {
    if (!detectedSpecialties.includes("gynecology")) detectedSpecialties.push("gynecology")
  }

  // Si aucune spécialité détectée, médecine interne par défaut
  if (detectedSpecialties.length === 0) {
    detectedSpecialties.push("internal_medicine")
  }

  // Limiter à 3 spécialités principales
  return detectedSpecialties.slice(0, 3)
}

// Génération du prompt enrichi avec toutes les spécialités et explications des scores
function generateEnhancedPrompt(patientData: any, clinicalData: any, askedElements: string[]): string {
  const detectedSpecialties = detectMedicalSpecialties(patientData, clinicalData)
  
  // Récupération des scores avec leurs explications complètes
  const specialtyContext = detectedSpecialties.map(spec => {
    const data = CLINICAL_SCORES_DATABASE[spec]
    if (!data) return ""
    
    // Récupérer les détails des 2-3 scores les plus pertinents pour cette spécialité
    const relevantScores = data.scores.slice(0, 3).map(scoreName => {
      const scoreDetails = getScoreDetails(scoreName)
      if (!scoreDetails) return ""
      return `
  - ${scoreName}: ${scoreDetails.description}
    → Utilité: ${scoreDetails.purpose}
    → Calcul: ${scoreDetails.howToCalculate}`
    }).join("\n")
    
    return `
${spec.toUpperCase()}:
${relevantScores}
- Guidelines: ${data.guidelines.join(", ")}`
  }).join("\n")

  return `
En tant que CLINICIEN EXPERT POLYVALENT à l'île Maurice, générez des questions diagnostiques ÉQUILIBRÉES et DIDACTIQUES adaptées à TOUTES les spécialités médicales.

IMPORTANT - EXPLICATION DES SCORES CLINIQUES:
Lorsque vous utilisez un score clinique, vous DEVEZ fournir:
1. Le nom complet du score (pas juste l'acronyme)
2. Ce que le score mesure exactement
3. Comment le calculer simplement
4. L'interprétation des résultats
5. Pourquoi c'est utile dans ce contexte

SPÉCIALITÉS DÉTECTÉES: ${detectedSpecialties.join(", ")}

APPROCHE EXPERTE UNIVERSELLE ÉQUILIBRÉE:
1. **Questions accessibles** (70%) : Compréhensibles par tous, langage simple
2. **Questions techniques** (30%) : Scores cliniques SPÉCIFIQUES À LA SPÉCIALITÉ avec EXPLICATIONS COMPLÈTES
3. **Pédagogie médicale** : Expliquer POURQUOI chaque question est importante
4. **Didactique pour médecins** : Expliquer comment utiliser et interpréter chaque score
5. **Approche holistique** : Considérer les aspects bio-psycho-sociaux

PATIENT (Analyse complète multidisciplinaire):
- ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans, ${patientData.gender}
- IMC: ${calculateBMI(patientData.weight, patientData.height)} (${getBMICategory(patientData.weight, patientData.height)})
- Facteurs de risque CV: ${getCardiovascularRisk(patientData)}
- Terrain immunologique: ${getImmuneStatus(patientData)}
- Allergies: ${patientData.allergies?.join(", ") || "Aucune"} ${patientData.otherAllergies ? "+ " + patientData.otherAllergies : ""}
- Antécédents: ${patientData.medicalHistory?.join(", ") || "Aucun"} ${patientData.otherMedicalHistory ? "+ " + patientData.otherMedicalHistory : ""}
- Médicaments: ${patientData.currentMedicationsText || "Aucun"}
- Habitudes: Tabac: ${patientData.lifeHabits?.smoking || "Non renseigné"}, Alcool: ${patientData.lifeHabits?.alcohol || "Non renseigné"}

DONNÉES CLINIQUES:
- Motif: ${clinicalData.chiefComplaint || "Non renseigné"}
- Symptômes: ${clinicalData.symptoms || "Non renseigné"}
- Examen: ${clinicalData.physicalExam || "Non renseigné"}
- Signes vitaux: T°${clinicalData.vitalSigns?.temperature || "?"}°C, TA ${clinicalData.vitalSigns?.bloodPressure || "?"}, FC ${clinicalData.vitalSigns?.heartRate || "?"}/min, FR ${clinicalData.vitalSigns?.respiratoryRate || "?"}/min, SpO2 ${clinicalData.vitalSigns?.oxygenSaturation || "?"}%

ÉLÉMENTS DÉJÀ DOCUMENTÉS (ne pas redemander):
${askedElements.map(element => `- ${element}`).join('\n')}

SCORES CLINIQUES PERTINENTS AVEC EXPLICATIONS:
${specialtyContext}

EXEMPLES D'UTILISATION DES SCORES AVEC EXPLICATIONS COMPLÈTES:

**EXEMPLE CARDIOLOGIE - Score HEART**:
Question: "Pour évaluer votre risque cardiaque, j'aimerais calculer votre score HEART. Ce score nous aide à déterminer la probabilité d'un problème cardiaque."
Explication pour le médecin:
- HEART = History, ECG, Age, Risk factors, Troponin
- Calcul: 5 critères notés 0-2 points chacun (total sur 10)
- Interprétation: 0-3 = risque faible (1.7%), 4-6 = intermédiaire (16.6%), 7-10 = élevé (50.1%)
- Action: Score ≤3 permet sortie, ≥7 nécessite hospitalisation
- Référence: Backus et al. Chest 2013

**EXEMPLE PNEUMOLOGIE - Score CURB-65**:
Question: "Pour évaluer la sévérité de votre pneumonie, utilisons le score CURB-65 qui prédit le risque de complications."
Explication pour le médecin:
- CURB-65 = Confusion, Urée >7 mmol/L, Respiratory rate ≥30, Blood pressure <90/60, age ≥65
- Calcul: 1 point par critère présent (0-5)
- Interprétation: 0-1 = ambulatoire possible, 2 = hospitalisation courte, 3-5 = hospitalisation/USI
- Version simplifiée CRB-65 utilisable sans bilan sanguin
- Référence: Lim et al. Thorax 2003

**EXEMPLE PSYCHIATRIE - Score PHQ-9**:
Question: "Pour évaluer votre humeur, j'utilise le questionnaire PHQ-9 qui mesure les symptômes dépressifs sur les 2 dernières semaines."
Explication pour le médecin:
- PHQ-9 = 9 questions sur symptômes dépressifs (DSM-IV)
- Calcul: Chaque item 0-3 points (jamais à presque tous les jours), total 0-27
- Interprétation: <5 = pas de dépression, 5-9 = légère, 10-14 = modérée, 15-19 = modérément sévère, ≥20 = sévère
- Action: Score ≥10 = traitement recommandé, Question 9 (suicide) >0 = évaluation immédiate
- Référence: Kroenke et al. J Gen Intern Med 2001

GÉNÉRATION INTELLIGENTE - 5-8 QUESTIONS ADAPTÉES:

Format JSON enrichi avec explications complètes:
{
  "questions": [
    {
      "id": 1,
      "question": "Question adaptée à la spécialité détectée",
      "type": "multiple_choice",
      "options": ["Options pertinentes pour le contexte"],
      "rationale": "Justification claire de l'intérêt diagnostique",
      "category": "accessible|technical|global",
      "complexity_level": "simple|moderate|advanced",
      "specialty": "${detectedSpecialties[0]}",
      "medical_explanation": "Explication adaptée au niveau patient",
      "clinical_score": "Nom du score si applicable",
      "score_full_name": "Nom complet et signification de l'acronyme",
      "score_explanation": "Ce que mesure ce score en termes simples",
      "score_calculation": "Comment calculer le score étape par étape",
      "score_interpretation": "Comment interpréter les résultats (avec seuils)",
      "score_clinical_action": "Quelle action selon le résultat",
      "score_reference": "Référence bibliographique principale",
      "score_calculator_link": "Lien vers calculateur en ligne si disponible",
      "patient_benefit": "Impact concret pour le patient",
      "diagnostic_value": "high|medium|low",
      "guidelines_reference": "Source evidence-based",
      "red_flags": "Signes d'alerte spécifiques",
      "differential_diagnosis": ["Liste des diagnostics possibles"],
      "next_steps": "Orientation suggérée"
    }
  ],
  "specialty_coverage": {
    "primary": "${detectedSpecialties[0]}",
    "secondary": ${JSON.stringify(detectedSpecialties.slice(1))},
    "confidence": "high|medium|low"
  },
  "score_education": {
    "scores_mentioned": ["Liste des scores utilisés"],
    "education_provided": true,
    "calculator_links": ["URLs des calculateurs"]
  }
}

RÈGLES D'OR POUR L'UTILISATION DES SCORES:
✓ TOUJOURS expliquer ce que signifie l'acronyme du score
✓ TOUJOURS dire ce que le score mesure en langage simple
✓ TOUJOURS expliquer comment on le calcule (critères principaux)
✓ TOUJOURS donner les seuils d'interprétation avec leur signification
✓ TOUJOURS expliquer l'action clinique selon le résultat
✓ Fournir un lien vers un calculateur en ligne quand possible
✓ Adapter l'explication au niveau du médecin (généraliste vs spécialiste)
✓ Mentionner les limites du score si pertinent

EXEMPLES DE MAUVAISE vs BONNE UTILISATION:

❌ MAUVAIS: "Quel est votre score HEART?"
✅ BON: "Pour évaluer votre risque cardiaque, j'utilise le score HEART (History, ECG, Age, Risk factors, Troponin) qui prédit sur une échelle de 0-10 votre risque d'événement cardiaque dans les 6 prochaines semaines. Un score de 0-3 signifie risque faible (1.7%), 4-6 risque intermédiaire (16.6%), et 7-10 risque élevé (50.1%)."

❌ MAUVAIS: "Calculons votre CURB-65"
✅ BON: "Le score CURB-65 évalue la sévérité de votre pneumonie en vérifiant 5 critères: Confusion, Urée élevée (>7 mmol/L), Respiration rapide (≥30/min), tension Basse (<90/60), et âge ≥65 ans. Chaque critère vaut 1 point. Un score de 0-1 permet souvent un traitement à domicile, tandis qu'un score ≥3 nécessite généralement une hospitalisation."

EXPERTISE PAR DOMAINE MÉDICAL:

**CARDIOLOGIE**:
- Accessible: localisation douleur, facteurs déclenchants, antécédents familiaux
- Technique: Score HEART/TIMI (risque coronarien), CHA2DS2-VASc (FA), Framingham
- Red flags: douleur thoracique typique, dyspnée aiguë, syncope

**NEUROLOGIE**:
- Accessible: caractère céphalée, troubles sensitifs/moteurs, chronologie
- Technique: NIHSS (AVC), ABCD2 (AIT), Glasgow (coma), critères IHS (migraine)
- Red flags: céphalée en coup de tonnerre, déficit focal, trouble conscience

**PNEUMOLOGIE**:
- Accessible: toux productive/sèche, essoufflement effort/repos, tabagisme
- Technique: CURB-65 (pneumonie), Wells (EP), scores BODE/CAT (BPCO)
- Red flags: hémoptysie, douleur pleurale, détresse respiratoire

**GASTRO-ENTÉROLOGIE**:
- Accessible: douleur abdominale (siège/irradiation), transit, appétit
- Technique: Child-Pugh (cirrhose), Rockall (hémorragie), Mayo (MICI)
- Red flags: méléna, défense abdominale, ictère fébrile

**PSYCHIATRIE**:
- Accessible: humeur, sommeil, anxiété, contexte psychosocial
- Technique: PHQ-9 (dépression), GAD-7 (anxiété), risque suicidaire
- Red flags: idées suicidaires, rupture de contact, agitation

**PÉDIATRIE**:
- Accessible: alimentation, comportement, développement, vaccinations
- Technique: PEWS (gravité), scores spécifiques âge, courbes croissance
- Red flags: léthargie, refus alimentaire, détresse respiratoire

**DERMATOLOGIE**:
- Accessible: prurit, évolution lésions, facteurs déclenchants, phototype
- Technique: SCORAD (eczéma), PASI (psoriasis), critères ABCDE (mélanome)
- Red flags: lésion évolutive, signes systémiques, nécrose

**GYNÉCOLOGIE-OBSTÉTRIQUE**:
- Accessible: cycles, contraception, symptômes gynéco, grossesse
- Technique: Bishop (travail), Wells grossesse (EP), critères HELLP
- Red flags: métrorragies, douleur pelvienne aiguë, HTA gravidique

**OPHTALMOLOGIE**:
- Accessible: baisse acuité, douleur oculaire, photophobie, sécrétions
- Technique: Mesure acuité visuelle, examen lampe à fente indications
- Red flags: BAV brutale, œil rouge douloureux, halos colorés

**ORL**:
- Accessible: douleur gorge/oreille, troubles audition/équilibre, ronflements
- Technique: Centor (angine), SNOT-22 (sinusite), Epworth (SAOS)
- Red flags: dysphagie, dysphonie >15j, otorragie

**RHUMATOLOGIE**:
- Accessible: horaire douleur, raideur matinale, gonflement articulaire
- Technique: DAS28 (PR), BASDAI (SPA), critères classification
- Red flags: arthrite fébrile, impotence fonctionnelle, signes neurologiques

**ENDOCRINOLOGIE**:
- Accessible: symptômes diabète, signes thyroïde, variations poids
- Technique: FINDRISC (risque diabète), scores thyroïdiens
- Red flags: coma hyper/hypoglycémique, crise thyrotoxique

**HÉMATOLOGIE**:
- Accessible: fatigue, saignements, ecchymoses, infections répétées
- Technique: Scores coagulation, NFS interprétation
- Red flags: pancytopénie, syndrome hémorragique, ADP généralisées

**NÉPHROLOGIE**:
- Accessible: œdèmes, mictions, couleur urines, antécédents rénaux
- Technique: DFG (CKD-EPI), classification KDIGO, protéinurie
- Red flags: anurie, œdème pulmonaire, hyperkaliémie

**UROLOGIE**:
- Accessible: troubles mictionnels, douleur pelvienne, sexualité
- Technique: IPSS (prostate), scores colique néphrétique
- Red flags: rétention aiguë, hématurie macroscopique, torsion testiculaire

**MÉDECINE D'URGENCE**:
- Accessible: circonstances, témoins, premiers gestes
- Technique: NEWS2, scores trauma, critères hospitalisation
- Red flags: tous signes vitesse selon contexte

**GÉRIATRIE**:
- Accessible: autonomie, chutes, polymédication, support social
- Technique: Scores fragilité (CFS), évaluation gériatrique
- Red flags: confusion aiguë, chute répétée, dénutrition

**CONTEXTE TROPICAL MAURICIEN**:
- Pathologies endémiques: dengue, chikungunya, leptospirose
- Résistances locales, facteurs environnementaux
- Adaptation culturelle des questions

GÉNÉRATION INTELLIGENTE - 5-8 QUESTIONS ADAPTÉES:

Format JSON enrichi:
{
  "questions": [
    {
      "id": 1,
      "question": "Question adaptée à la spécialité détectée",
      "type": "multiple_choice",
      "options": ["Options pertinentes pour le contexte"],
      "rationale": "Justification claire de l'intérêt diagnostique",
      "category": "accessible|technical|global",
      "complexity_level": "simple|moderate|advanced",
      "specialty": "${detectedSpecialties[0]}",
      "medical_explanation": "Explication adaptée au niveau patient",
      "clinical_score": "Score spécifique si applicable",
      "score_explanation": "Vulgarisation du score utilisé",
      "patient_benefit": "Impact concret pour le patient",
      "diagnostic_value": "high|medium|low",
       "differential_diagnosis: []
      "guidelines_reference": "Source evidence-based",
      "red_flags": "Signes d'alerte spécifiques",
      "differential_diagnosis": ["Liste des diagnostics possibles"],
      "next_steps": "Orientation suggérée"
    }
  ],
  "specialty_coverage": {
    "primary": "${detectedSpecialties[0]}",
    "secondary": ${JSON.stringify(detectedSpecialties.slice(1))},
    "confidence": "high|medium|low"
  }
}

RÈGLES D'OR UNIVERSELLES:
✓ Adapter au niveau de littératie en santé du patient
✓ Intégrer l'approche biopsychosociale
✓ Respecter les guidelines internationales ET locales
✓ Prioriser sécurité patient (red flags)
✓ Maintenir équilibre expertise/accessibilité
✓ Considérer les spécificités d'âge/genre/culture
✓ Éviter sur-médicalisation tout en étant exhaustif
✓ Questions orientées vers action thérapeutique
`
}

// Génération de fallback spécialisé par domaine avec explications complètes
function generateSpecialtyFallbackQuestions(
  patientData: any, 
  clinicalData: any, 
  askedElements: string[],
  specialty: string
): any {
  const fallbackQuestions = {
    cardiology: [
      {
        id: 1,
        question: "Pouvez-vous me montrer avec votre main où se situe exactement votre douleur thoracique?",
        type: "multiple_choice",
        options: [
          "Au centre de la poitrine (rétrosternal)",
          "Sur le côté gauche de la poitrine",
          "Diffuse dans toute la poitrine",
          "Dans le dos entre les omoplates"
        ],
        rationale: "La localisation précise oriente vers l'origine cardiaque ou non de la douleur",
        category: "accessible",
        specialty: "cardiology",
        medical_explanation: "Une douleur rétrosternale est plus évocatrice d'origine cardiaque",
        diagnostic_value: "high"
        differential_diagnosis: []
      },
      {
        id: 2,
        question: "Pour évaluer votre risque cardiaque, j'aimerais calculer votre score HEART. Ce score combine 5 éléments: votre Histoire clinique, l'ECG, votre Âge, vos facteurs de Risque cardiovasculaire, et le dosage de Troponine. Il prédit votre risque d'événement cardiaque dans les 6 semaines.",
        type: "multiple_choice",
        options: [
          "0-1 facteur de risque CV (tabac, HTA, diabète, cholestérol, hérédité)",
          "2 facteurs de risque CV",
          "3 facteurs de risque CV ou plus",
          "Antécédent de maladie coronaire connue"
        ],
        rationale: "Le score HEART est validé pour stratifier le risque aux urgences",
        category: "technical",
        clinical_score: "HEART",
        score_full_name: "History, ECG, Age, Risk factors, Troponin",
        score_explanation: "Score de 0-10 qui évalue le risque d'infarctus, décès ou revascularisation urgente dans les 6 semaines",
        score_calculation: "Histoire suspecte (0-2) + ECG (0-2) + Âge (0-2) + Facteurs risque (0-2) + Troponine (0-2)",
        score_interpretation: "0-3 points = risque faible 1.7% (sortie possible), 4-6 = risque intermédiaire 16.6% (observation), 7-10 = risque élevé 50.1% (hospitalisation)",
        score_clinical_action: "Score ≤3: sortie avec suivi. Score 4-6: observation 6-12h + tests. Score ≥7: admission en cardiologie",
        score_reference: "Backus BE et al. Chest 2013",
        score_calculator_link: "https://www.mdcalc.com/heart-score-major-cardiac-events",
        patient_benefit: "Permet d'adapter rapidement la prise en charge selon votre niveau de risque",
        diagnostic_value: "high"
      }
    ],
    neurology: [
      {
        id: 1,
        question: "Votre mal de tête est-il apparu de façon très brutale, comme un coup de tonnerre?",
        type: "multiple_choice",
        options: [
          "Oui, en quelques secondes, très violent",
          "Non, installation progressive sur quelques heures",
          "Installation sur plusieurs jours",
          "Je ne me souviens pas du début exact"
        ],
        rationale: "Une céphalée en coup de tonnerre est une urgence neurologique absolue",
        category: "technical",
        specialty: "neurology",
        red_flags: "Céphalée brutale = suspicion hémorragie méningée",
        diagnostic_value: "high"
        differential_diagnosis: []
      },
      {
        id: 2,
        question: "Si vous avez eu des symptômes neurologiques transitoires, j'aimerais calculer votre score ABCD2. Ce score prédit le risque d'AVC après un AIT (Accident Ischémique Transitoire) en évaluant: Âge, Blood pressure (tension), Clinical features (symptômes), Duration (durée), et Diabète.",
        type: "multiple_choice",
        options: [
          "Symptômes <10 minutes",
          "Symptômes 10-59 minutes", 
          "Symptômes ≥60 minutes",
          "Symptômes toujours présents"
        ],
        rationale: "La durée des symptômes est un facteur pronostique majeur post-AIT",
        category: "technical",
        clinical_score: "ABCD2",
        score_full_name: "Age, Blood pressure, Clinical features, Duration, Diabetes",
        score_explanation: "Score de 0-7 qui prédit le risque d'AVC dans les 2, 7 et 90 jours après un AIT",
        score_calculation: "Âge ≥60 (1pt) + TA ≥140/90 (1pt) + Déficit moteur (2pts) ou trouble parole seul (1pt) + Durée ≥60min (2pts) ou 10-59min (1pt) + Diabète (1pt)",
        score_interpretation: "0-3 = risque faible (1% à 2j), 4-5 = risque modéré (4.1% à 2j), 6-7 = risque élevé (8.1% à 2j)",
        score_clinical_action: "Score ≥4 = hospitalisation recommandée pour bilan étiologique urgent",
        score_reference: "Johnston SC et al. Lancet 2007",
        score_calculator_link: "https://www.mdcalc.com/abcd2-score-tia",
        specialty: "neurology",
        diagnostic_value: "high"
      }
    ],
    psychiatry: [
      {
        id: 1,
        question: "Pour évaluer votre niveau de dépression, j'utilise le questionnaire PHQ-9 (Patient Health Questionnaire). Il évalue 9 symptômes de dépression sur les 2 dernières semaines. Au cours des 2 dernières semaines, à quelle fréquence avez-vous eu peu d'intérêt ou de plaisir à faire les choses?",
        type: "multiple_choice",
        options: [
          "Jamais (0 point)",
          "Plusieurs jours (1 point)",
          "Plus de la moitié du temps (2 points)",
          "Presque tous les jours (3 points)"
        ],
        rationale: "Première question du PHQ-9, symptôme cardinal de la dépression",
        category: "technical",
        clinical_score: "PHQ-9",
        score_full_name: "Patient Health Questionnaire-9",
        score_explanation: "Questionnaire de 9 items évaluant la sévérité des symptômes dépressifs selon les critères DSM-IV",
        score_calculation: "9 questions notées 0-3 (jamais à presque tous les jours), score total 0-27",
        score_interpretation: "0-4 = pas de dépression, 5-9 = dépression légère, 10-14 = modérée, 15-19 = modérément sévère, 20-27 = sévère",
        score_clinical_action: "Score ≥10 = traitement recommandé (psychothérapie et/ou antidépresseurs). Question 9 (idées suicidaires) >0 = évaluation psychiatrique urgente",
        score_reference: "Kroenke K et al. J Gen Intern Med 2001",
        score_calculator_link: "https://www.mdcalc.com/phq-9-patient-health-questionnaire-9",
        score_critical_info: "Question 9 évalue le risque suicidaire - si positive, évaluation immédiate",
        specialty: "psychiatry",
        patient_benefit: "Permet de mesurer objectivement la sévérité de vos symptômes et suivre l'évolution",
        diagnostic_value: "high"
      }
    ],
    pediatrics: [
      {
        id: 1,
        question: "Comment décririez-vous le comportement de votre enfant par rapport à d'habitude?",
        type: "multiple_choice",
        options: [
          "Joue normalement, comportement habituel",
          "Un peu grognon mais consolable",
          "Très irritable, pleure beaucoup",
          "Anormalement calme, somnolent"
        ],
        rationale: "Le changement de comportement est un signe d'alerte important chez l'enfant",
        category: "accessible",
        specialty: "pediatrics",
        red_flags: "Léthargie = urgence pédiatrique",
        diagnostic_value: "high"
        differential_diagnosis: []
      },
      {
        id: 2,
        question: "Pour évaluer la gravité de l'état de votre enfant, j'utilise le score PEWS (Pediatric Early Warning Score). Ce score évalue 3 domaines: le Comportement, l'état Cardiovasculaire (couleur de peau), et l'état Respiratoire. Il nous aide à détecter précocement une détérioration.",
        type: "multiple_choice",
        options: [
          "Peau rose, bien colorée (0 point)",
          "Peau pâle ou marbrée (1 point)",
          "Peau grise ou cyanosée (2 points)",
          "Peau grise avec temps de recoloration >3 secondes (3 points)"
        ],
        rationale: "L'état cardiovasculaire est un élément clé du PEWS",
        category: "technical",
        clinical_score: "PEWS",
        score_full_name: "Pediatric Early Warning Score",
        score_explanation: "Score de détection précoce de détérioration clinique chez l'enfant hospitalisé",
        score_calculation: "Comportement (0-3) + Cardiovasculaire (0-3) + Respiratoire (0-3) + 2 points si O2 nécessaire",
        score_interpretation: "0-2 = surveillance standard, 3-4 = surveillance rapprochée + appel médecin, ≥5 = appel urgent médecin senior/réanimation",
        score_clinical_action: "Score ≥3 = augmenter fréquence surveillance. Score ≥5 = mobiliser équipe de réanimation pédiatrique",
        score_reference: "Monaghan A. Arch Dis Child 2005",
        specialty: "pediatrics",
        patient_benefit: "Permet de détecter rapidement si l'état de votre enfant se dégrade",
        diagnostic_value: "high"
      }
    ],
    emergency: [
      {
        id: 1,
        question: "Pour évaluer votre état général et détecter tout signe de détérioration, j'utilise le score NEWS2 (National Early Warning Score). Il évalue 7 paramètres vitaux. Avez-vous besoin d'oxygène supplémentaire actuellement?",
        type: "multiple_choice",
        options: [
          "Non, je respire normalement à l'air ambiant (0 point)",
          "Oui, j'ai besoin d'oxygène (2 points)",
          "Je ne sais pas",
          "J'ai une BPCO et utilise de l'oxygène à domicile"
        ],
        rationale: "Le besoin en oxygène est un critère important du NEWS2",
        category: "technical",
        clinical_score: "NEWS2",
        score_full_name: "National Early Warning Score 2",
        score_explanation: "Score standardisé de détection précoce de détérioration clinique chez l'adulte",
        score_calculation: "FR + SpO2 + O2 supp + Température + PAS + FC + Conscience (chaque paramètre 0-3 points)",
        score_interpretation: "0 = surveillance 12h, 1-4 = surveillance 4-6h, 5-6 = surveillance horaire + réponse urgente, ≥7 = surveillance continue + équipe d'urgence",
        score_clinical_action: "Score total ≥5 ou 3 points dans un paramètre = escalade des soins",
        score_reference: "Royal College of Physicians UK 2017",
        score_calculator_link: "https://www.mdcalc.com/national-early-warning-score-news-2",
        specialty: "emergency",
        patient_benefit: "Assure une surveillance adaptée à votre état clinique",
        diagnostic_value: "high"
        differential_diagnosis: []
      }
    ],
    gastroenterology: [
      {
        id: 1,
        question: "Si vous avez une maladie du foie connue, j'aimerais évaluer sa sévérité avec le score de Child-Pugh. Ce score évalue 5 paramètres: Bilirubine, Albumine, INR (coagulation), Ascite (liquide dans le ventre), et Encéphalopathie (confusion). Avez-vous du liquide dans le ventre (ascite)?",
        type: "multiple_choice",
        options: [
          "Non, pas de liquide (1 point)",
          "Oui, un peu de liquide détecté à l'échographie (2 points)",
          "Oui, ventre gonflé avec liquide évident (3 points)",
          "Je ne sais pas"
        ],
        rationale: "L'ascite est un critère majeur de décompensation hépatique",
        category: "technical",
        clinical_score: "Child-Pugh",
        score_full_name: "Child-Pugh Score",
        score_explanation: "Classification de la sévérité de la cirrhose et du pronostic",
        score_calculation: "Bilirubine (1-3) + Albumine (1-3) + INR (1-3) + Ascite (1-3) + Encéphalopathie (1-3)",
        score_interpretation: "5-6 points = Classe A (survie 95% à 1 an), 7-9 = Classe B (survie 80% à 1 an), 10-15 = Classe C (survie 45% à 1 an)",
        score_clinical_action: "Classe A = compensation acceptable, Classe B = décompensation modérée, Classe C = décompensation sévère (contre-indication chirurgie si >9)",
        score_reference: "Child CG, Turcotte JG. Surgery 1964",
        score_calculator_link: "https://www.mdcalc.com/child-pugh-score-cirrhosis-mortality",
        specialty: "gastroenterology",
        diagnostic_value: "high"
        differential_diagnosis: []
      }
    ]
    // Ajouter plus de spécialités selon les besoins...
  }

  const questions = fallbackQuestions[specialty] || generateSmartFallbackQuestions(patientData, clinicalData, askedElements)
  
  // Enrichir toutes les questions avec l'éducation sur les scores
  const enrichedQuestions = questions.map(q => enrichQuestionWithScoreEducation(q))
  
  return { questions: deduplicateExpertQuestions(enrichedQuestions, askedElements) }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 API Questions IA Médicales Complètes - Début")

    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour génération questions multi-spécialités")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON:", parseError)
      return NextResponse.json(
        {
          error: "Format JSON invalide",
          success: false,
        },
        { status: 400 },
      )
    }

    const { patientData, clinicalData } = requestData

    if (!patientData || !clinicalData) {
      console.log("⚠️ Données manquantes")
      return NextResponse.json(
        {
          error: "Données patient et cliniques requises",
          success: false,
        },
        { status: 400 },
      )
    }

    // Détection des spécialités pertinentes
    const detectedSpecialties = detectMedicalSpecialties(patientData, clinicalData)
    console.log(`🏥 Spécialités détectées: ${detectedSpecialties.join(", ")}`)

    // Extraction des éléments déjà documentés
    const askedElements = extractAlreadyAskedElements(patientData, clinicalData)
    
    // Génération du prompt enrichi
    const enhancedPrompt = generateEnhancedPrompt(patientData, clinicalData, askedElements)

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: enhancedPrompt,
      temperature: 0.3, // Légèrement augmenté pour plus de créativité médicale
      maxTokens: 4096, // Augmenté pour permettre des réponses plus détaillées
    })

    console.log("🧠 Questions médicales spécialisées générées")

    let questionsData
    try {
      let cleanedText = result.text.trim()
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      questionsData = JSON.parse(cleanedText)

      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        throw new Error("Structure JSON invalide")
      }

      // Déduplication et validation
      questionsData.questions = deduplicateExpertQuestions(questionsData.questions, askedElements)
      
      // Enrichissement automatique des questions avec éducation sur les scores
      questionsData.questions = questionsData.questions.map(q => enrichQuestionWithScoreEducation(q))
      
      // Évaluation du niveau médical
      const medicalAssessment = assessMedicalExpertLevel(questionsData.questions)
      
      console.log(`✅ ${questionsData.questions.length} questions spécialisées générées - Niveau: ${medicalAssessment.level}`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing, génération fallback spécialisé")
      // Utiliser le fallback spécialisé pour la première spécialité détectée
      questionsData = generateSpecialtyFallbackQuestions(
        patientData, 
        clinicalData, 
        askedElements,
        detectedSpecialties[0] || "general"
      )
    }

    // Évaluation finale
    const finalAssessment = questionsData.medicalAssessment || assessMedicalExpertLevel(questionsData.questions)

    // Génération des recommandations spécialisées
    const specialtyRecommendations = generateSpecialtyRecommendations(
      detectedSpecialties,
      questionsData.questions,
      patientData,
      clinicalData
    )

    // Extraction des informations d'éducation sur les scores utilisés
    const scoresUsed = questionsData.questions
      .filter(q => q.clinical_score)
      .map(q => ({
        name: q.clinical_score,
        fullName: q.score_full_name,
        explanation: q.score_explanation,
        calculation: q.score_calculation,
        interpretation: q.score_interpretation,
        action: q.score_clinical_action,
        reference: q.score_reference,
        calculator: q.score_calculator_link
      }))

    const response = {
      success: true,
      questions: questionsData.questions,
      metadata: {
        // Données patient
        patientAge: patientData.age,
        patientGender: patientData.gender,
        patientBMI: calculateBMI(patientData.weight, patientData.height),
        patientBMICategory: getBMICategory(patientData.weight, patientData.height),
        
        // Stratification des risques
        cardiovascularRisk: getCardiovascularRisk(patientData),
        immuneStatus: getImmuneStatus(patientData),
        
        // Spécialités détectées
        detectedSpecialties: detectedSpecialties,
        primarySpecialty: detectedSpecialties[0],
        specialtyConfidence: questionsData.specialty_coverage?.confidence || "high",
        
        // Données cliniques
        chiefComplaint: clinicalData.chiefComplaint,
        vitalSigns: clinicalData.vitalSigns,
        
        // Métadonnées de génération
        questionsCount: questionsData.questions.length,
        generatedAt: new Date().toISOString(),
        aiModel: "gpt-4o",
        
        // Contexte
        location: "Maurice",
        approach: "multi-specialty-expert-with-education",
        medicalLevel: finalAssessment.level,
        medicalScore: finalAssessment.score,
        questionBalance: finalAssessment.balance,
        
        // Exclusions
        excludedElements: askedElements,
        
        // Analyse qualité
        expertFeatures: {
          accessibleQuestions: questionsData.questions.filter(q => q.category === 'accessible').length,
          technicalQuestionsExplained: questionsData.questions.filter(q => q.category === 'technical' && q.score_explanation).length,
          globalQuestions: questionsData.questions.filter(q => q.category === 'global').length,
          specialtySpecificQuestions: questionsData.questions.filter(q => q.specialty).length,
          clinicalScoresUsed: [...new Set(questionsData.questions.filter(q => q.clinical_score).map(q => q.clinical_score))],
          scoresWithFullExplanation: questionsData.questions.filter(q => q.score_calculation && q.score_interpretation).length,
          specialtiesCovered: [...new Set(questionsData.questions.filter(q => q.specialty).map(q => q.specialty))],
        },
        
        // Éducation sur les scores
        scoreEducation: {
          scoresUsed: scoresUsed,
          totalScoresExplained: scoresUsed.length,
          allScoresHaveCalculators: scoresUsed.every(s => s.calculator),
          educationalValue: scoresUsed.length > 0 ? "high" : "none"
        },
        
        // Base de connaissances disponible
        availableSpecialties: Object.keys(CLINICAL_SCORES_DATABASE),
        clinicalScoresAvailable: Object.entries(CLINICAL_SCORES_DETAILED).reduce((acc, [specialty, scores]) => {
          acc[specialty] = Object.keys(scores)
          return acc
        }, {}),
      },
      
      // Recommandations cliniques spécialisées
      clinicalRecommendations: {
        urgencyLevel: determineSpecialtyUrgencyLevel(questionsData.questions, detectedSpecialties),
        suggestedWorkup: specialtyRecommendations.workup,
        specialistReferrals: specialtyRecommendations.referrals,
        redFlagAlerts: extractRedFlags(questionsData.questions),
        followUpRecommendations: specialtyRecommendations.followUp,
        differentialDiagnosis: specialtyRecommendations.differentials,
      },
      
      // Guide d'utilisation des scores pour le médecin
      scoreUsageGuide: scoresUsed.length > 0 ? {
        message: "Scores cliniques utilisés dans cette consultation",
        scores: scoresUsed,
        howToUse: "Chaque score a été expliqué avec ses critères, son calcul et son interprétation. Des liens vers des calculateurs en ligne sont fournis quand disponibles.",
        clinicalTip: "Ces scores sont des outils d'aide à la décision. Le jugement clinique reste primordial."
      } : null
    }

    console.log(`✅ Génération complète - Spécialités: ${detectedSpecialties.join("/")} - Questions: ${questionsData.questions.length} - Scores expliqués: ${scoresUsed.length}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Questions IA Multi-Spécialités:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions médicales spécialisées",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Nouvelles fonctions helper pour la couverture médicale complète

function generateSpecialtyRecommendations(
  specialties: string[], 
  questions: any[], 
  patientData: any,
  clinicalData: any
): any {
  const recommendations = {
    workup: [],
    referrals: [],
    followUp: [],
    differentials: []
  }

  // Recommandations par spécialité
  const specialtyWorkup = {
    cardiology: ["ECG 12D", "Troponines HS", "BNP/NT-proBNP", "Écho-cœur"],
    neurology: ["TDM cérébrale", "IRM cérébrale", "EEG", "PL si méningite"],
    pneumology: ["Rx thorax", "Gaz du sang", "Spirométrie", "TDM thoracique"],
    gastroenterology: ["Bilan hépatique", "Lipase", "Échographie abdominale", "Endoscopie"],
    psychiatry: ["Bilan thyroïdien", "Bilan toxicologique", "Évaluation psychométrique"],
    dermatology: ["Biopsie cutanée", "Dermoscopie", "Culture fongique/bactérienne"],
    pediatrics: ["Bilan infectieux adapté âge", "Rx selon point d'appel", "ECBU"],
    nephrology: ["Créatinine + DFG", "ECBU + protéinurie", "Échographie rénale"],
    hematology: ["NFS + frottis", "Bilan coagulation", "Électrophorèse protéines"],
    endocrinology: ["Glycémie + HbA1c", "TSH + T4", "Cortisol", "Bilan hormonal"],
  }

  // Ajout des examens selon spécialités détectées
  specialties.forEach(specialty => {
    if (specialtyWorkup[specialty]) {
      recommendations.workup.push(...specialtyWorkup[specialty])
    }
  })

  // Orientations spécialisées
  if (specialties.includes("cardiology") && questions.some(q => q.diagnostic_value === "high")) {
    recommendations.referrals.push("Cardiologue en urgence si score HEART élevé")
  }
  
  if (specialties.includes("neurology") && questions.some(q => q.red_flags)) {
    recommendations.referrals.push("Neurologue urgent si red flags neurologiques")
  }

  // Diagnostics différentiels par syndrome
  if (specialties.includes("cardiology")) {
    recommendations.differentials.push("SCA", "EP", "Dissection aortique", "Péricardite")
  }

  // Suivi adapté
  recommendations.followUp.push(
    `Réévaluation dans ${determineFollowUpDelay(specialties, questions)}`,
    "Éducation thérapeutique spécifique à la pathologie"
  )

  return recommendations
}

function determineSpecialtyUrgencyLevel(questions: any[], specialties: string[]): string {
  // Urgences par spécialité
  const emergencySpecialties = ["cardiology", "neurology", "emergency"]
  
  if (specialties.some(s => emergencySpecialties.includes(s)) && 
      questions.some(q => q.red_flags)) {
    return "URGENCE ABSOLUE - Prise en charge immédiate"
  }
  
  const redFlagCount = questions.filter(q => q.red_flags).length
  if (redFlagCount >= 2) return "URGENT - Évaluation rapide nécessaire"
  if (redFlagCount === 1) return "PRIORITAIRE - Consultation dans la journée"
  
  return "STANDARD - Consultation programmée possible"
}

function determineFollowUpDelay(specialties: string[], questions: any[]): string {
  if (questions.some(q => q.red_flags)) return "24-48h"
  if (specialties.includes("psychiatry")) return "1 semaine"
  if (specialties.includes("cardiology")) return "48-72h"
  if (specialties.includes("dermatology")) return "2-4 semaines"
  return "1-2 semaines"
}

// Conserver les fonctions helper existantes
function extractAlreadyAskedElements(patientData: any, clinicalData: any): string[] {
  const askedElements: string[] = []

  if (patientData.age) askedElements.push("âge du patient")
  if (patientData.gender) askedElements.push("sexe du patient")
  if (patientData.weight && patientData.height) askedElements.push("poids et taille (IMC calculable)")
  if (patientData.allergies?.length) askedElements.push("allergies connues")
  if (patientData.medicalHistory?.length) askedElements.push("antécédents médicaux")
  if (patientData.currentMedicationsText) askedElements.push("médicaments actuels")
  if (patientData.lifeHabits?.smoking) askedElements.push("habitudes tabagiques")
  if (patientData.lifeHabits?.alcohol) askedElements.push("consommation d'alcool")
  if (clinicalData.chiefComplaint) askedElements.push("motif de consultation")
  if (clinicalData.symptoms) askedElements.push("symptômes principaux")
  if (clinicalData.physicalExam) askedElements.push("données d'examen physique")
  if (clinicalData.vitalSigns?.temperature) askedElements.push("température")
  if (clinicalData.vitalSigns?.bloodPressure) askedElements.push("tension artérielle")
  if (clinicalData.vitalSigns?.heartRate) askedElements.push("fréquence cardiaque")

  return askedElements
}

function safeStringConversion(data: any): string {
  try {
    if (!data) return ""
    if (typeof data === 'string') return data.toLowerCase()
    if (Array.isArray(data)) return data.join(' ').toLowerCase()
    if (typeof data === 'object') return Object.values(data).join(' ').toLowerCase()
    return String(data).toLowerCase()
  } catch (error) {
    console.warn("Erreur conversion:", error)
    return ""
  }
}

function calculateBMI(weight: number, height: number): string {
  if (!weight || !height) return "non calculable"
  const heightM = height / 100
  const bmi = weight / (heightM * heightM)
  return bmi.toFixed(1)
}

function getBMICategory(weight: number, height: number): string {
  if (!weight || !height) return "non évaluable"
  const heightM = height / 100
  const bmi = weight / (heightM * heightM)
  
  if (bmi < 18.5) return "Insuffisance pondérale"
  if (bmi < 25) return "Poids normal"
  if (bmi < 30) return "Surpoids"
  if (bmi < 35) return "Obésité modérée"
  return "Obésité sévère"
}

function getCardiovascularRisk(patientData: any): string {
  const risks = []
  const age = patientData.age
  const gender = patientData.gender
  
  if (age > 45 && gender === "Masculin") risks.push("Âge + sexe masculin")
  if (age > 55 && gender === "Féminin") risks.push("Âge + sexe féminin")
  if (patientData.lifeHabits?.smoking === "Oui") risks.push("Tabagisme actif")
  if (patientData.medicalHistory?.includes("Diabète")) risks.push("Diabète")
  if (patientData.medicalHistory?.includes("HTA")) risks.push("HTA")
  if (patientData.medicalHistory?.includes("Hypercholestérolémie")) risks.push("Dyslipidémie")
  
  const bmi = calculateBMI(patientData.weight, patientData.height)
  if (parseFloat(bmi) >= 30) risks.push("Obésité")
  
  return risks.length > 0 ? risks.join(", ") : "Faible risque CV"
}

function getImmuneStatus(patientData: any): string {
  const immunoRisks = []
  
  if (patientData.age > 65) immunoRisks.push("Âge > 65 ans")
  if (patientData.medicalHistory?.includes("Diabète")) immunoRisks.push("Diabète")
  if (patientData.medicalHistory?.includes("Insuffisance rénale")) immunoRisks.push("IRC")
  if (patientData.medicalHistory?.includes("Cancer")) immunoRisks.push("Néoplasie")
  
  const medications = safeStringConversion(patientData.currentMedicationsText)
  if (medications.includes("corticoïdes")) immunoRisks.push("Corticothérapie")
  if (medications.includes("immunosuppresseur")) immunoRisks.push("Immunosuppression")
  
  return immunoRisks.length > 0 ? `Terrain fragilisé: ${immunoRisks.join(", ")}` : "Terrain immunocompétent"
}

function deduplicateExpertQuestions(questions: any[], askedElements: string[]): any[] {
  return questions.filter(question => {
    const questionText = question.question.toLowerCase()
    
    const redundantKeywords = [
      { keywords: ["âge", "ans"], element: "âge du patient" },
      { keywords: ["poids", "pèse", "imc"], element: "poids et taille" },
      { keywords: ["allergique", "allergie"], element: "allergies connues" },
      { keywords: ["médicament", "traitement"], element: "médicaments actuels" },
      { keywords: ["fume", "tabac"], element: "habitudes tabagiques" },
      { keywords: ["alcool", "boisson"], element: "consommation d'alcool" },
      { keywords: ["température", "fièvre"], element: "température" },
      { keywords: ["tension", "pression"], element: "tension artérielle" },
    ]

    return !redundantKeywords.some(({ keywords, element }) => 
      keywords.some(keyword => questionText.includes(keyword)) && 
      askedElements.includes(element)
    )
  })
}

function assessMedicalExpertLevel(questions: any[]): {
  level: string;
  score: number;
  details: string[];
  balance: { accessible: number; technical: number; global: number };
} {
  let expertScore = 0
  const totalQuestions = questions.length
  const details: string[] = []
  const balance = { accessible: 0, technical: 0, global: 0 }

  questions.forEach((q, index) => {
    let questionScore = 0
    
    if (q.category === 'accessible') balance.accessible++
    else if (q.category === 'technical') balance.technical++
    else if (q.category === 'global') balance.global++
    
    if (q.clinical_score && q.score_explanation) {
      questionScore += 3
      details.push(`Q${index + 1}: Score clinique expliqué (${q.clinical_score})`)
    }
    if (q.specialty) {
      questionScore += 2
      details.push(`Q${index + 1}: Spécialité identifiée (${q.specialty})`)
    }
    if (q.medical_explanation) questionScore += 2
    if (q.patient_benefit) questionScore += 2
    if (q.guidelines_reference) questionScore += 1
    if (q.differential_diagnosis) questionScore += 2
    if (q.red_flags) questionScore += 2
    if (q.diagnostic_value === 'high') questionScore += 1

    expertScore += questionScore
  })

  const averageScore = expertScore / totalQuestions
  const accessibleRatio = balance.accessible / totalQuestions
  
  let balanceBonus = 0
  if (accessibleRatio >= 0.6 && accessibleRatio <= 0.8) balanceBonus += 2
  
  const finalScore = averageScore + balanceBonus

  let level: string
  if (finalScore >= 12) level = "Expert polyvalent+ (médecine intégrative complète)"
  else if (finalScore >= 10) level = "Expert spécialisé équilibré"
  else if (finalScore >= 8) level = "Avancé multi-disciplinaire"
  else if (finalScore >= 6) level = "Intermédiaire spécialisé"
  else level = "Basique généraliste"

  return {
    level,
    score: Math.round(finalScore * 10) / 10,
    details,
    balance
  }
}

function generateSmartFallbackQuestions(patientData: any, clinicalData: any, askedElements: string[]) {
  // Fallback généraliste si aucune spécialité n'est détectée
  const questions = [
    {
      id: 1,
      question: "Quel aspect de vos symptômes vous préoccupe le plus actuellement?",
      type: "multiple_choice",
      options: [
        "L'intensité ou la gravité des symptômes",
        "La durée ou la persistance",
        "L'impact sur mes activités quotidiennes",
        "La peur que ce soit quelque chose de grave"
      ],
      rationale: "Comprendre vos préoccupations principales nous aide à prioriser la prise en charge",
      category: "global",
      complexity_level: "simple",
      medical_explanation: "L'inquiétude du patient est un facteur important dans l'évaluation globale",
      patient_benefit: "Assure que vos préoccupations sont entendues et prises en compte",
      diagnostic_value: "medium"
      differential_diagnosis: []
    },
    {
      id: 2,
      question: "Y a-t-il eu un événement déclencheur ou un changement récent dans votre vie?",
      type: "multiple_choice",
      options: [
        "Oui, un stress important ou changement majeur",
        "Oui, une exposition ou contact particulier",
        "Non, apparition sans cause apparente",
        "Je ne sais pas, peut-être"
      ],
      rationale: "Les facteurs déclenchants orientent souvent vers la cause des symptômes",
      category: "accessible",
      complexity_level: "simple",
      medical_explanation: "L'identification des facteurs déclenchants est cruciale pour le diagnostic étiologique",
      diagnostic_value: "high"
      differential_diagnosis: []
    },
    {
      id: 3,
      question: "Comment évaluez-vous votre état de santé général avant ces symptômes?",
      type: "multiple_choice",
      options: [
        "Excellente santé, rarement malade",
        "Bonne santé avec quelques problèmes mineurs",
        "Santé fragile, souvent des soucis",
        "Problèmes de santé chroniques importants"
      ],
      rationale: "L'état de santé antérieur influence l'approche diagnostique et thérapeutique",
      category: "accessible",
      complexity_level: "simple",
      medical_explanation: "Le terrain du patient oriente la probabilité diagnostique",
      diagnostic_value: "medium"
      differential_diagnosis: []
    }
  ]

  return { questions: deduplicateExpertQuestions(questions, askedElements) }
}

function extractRedFlags(questions: any[]): string[] {
  return questions
    .filter(q => q.red_flags)
    .map(q => q.red_flags)
    .filter((flag, index, array) => array.indexOf(flag) === index)
}
