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

// Cache pour les scores cliniques
const CLINICAL_SCORES_CACHE = new Map<string, any>()

// Fonction pour obtenir les détails d'un score
function getScoreDetails(scoreName: string): any {
  // Vérifier le cache d'abord
  if (CLINICAL_SCORES_CACHE.has(scoreName)) {
    return CLINICAL_SCORES_CACHE.get(scoreName)
  }

  // Parcourir toutes les spécialités pour trouver le score
  for (const [specialty, scores] of Object.entries(CLINICAL_SCORES_DETAILED)) {
    if (scores[scoreName]) {
      CLINICAL_SCORES_CACHE.set(scoreName, scores[scoreName])
      return scores[scoreName]
    }
  }
  return null
}

// Fonction améliorée pour générer des explications claires des scores
function generateClearScoreExplanation(scoreName: string, scoreDetails: any): any {
  if (!scoreDetails) return null

  // Créer une explication en langage simple
  const simpleExplanations = {
    HEART: {
      whatItDoes: "Ce score prédit votre risque d'avoir un problème cardiaque grave dans les 6 prochaines semaines",
      howItWorks: "On évalue 5 critères simples : votre histoire médicale, votre ECG, votre âge, vos facteurs de risque (tabac, diabète, etc.), et un test sanguin (troponine)",
      whatResultsMean: {
        low: "Score 0-3 : Risque très faible (moins de 2%). Vous pouvez probablement rentrer chez vous avec un suivi",
        medium: "Score 4-6 : Risque modéré (environ 17%). Une observation de quelques heures est recommandée",
        high: "Score 7-10 : Risque élevé (plus de 50%). Une hospitalisation est nécessaire"
      },
      simpleAnalogy: "C'est comme un feu tricolore : vert (0-3) = ok, orange (4-6) = prudence, rouge (7-10) = danger"
    },
    "CURB-65": {
      whatItDoes: "Ce score évalue la gravité de votre pneumonie et aide à décider si vous devez être hospitalisé",
      howItWorks: "On vérifie 5 points : confusion, taux d'urée dans le sang, respiration rapide, tension basse, et âge supérieur à 65 ans",
      whatResultsMean: {
        low: "Score 0-1 : Pneumonie légère. Traitement possible à domicile avec antibiotiques",
        medium: "Score 2 : Pneumonie modérée. Hospitalisation courte ou surveillance rapprochée",
        high: "Score 3-5 : Pneumonie sévère. Hospitalisation nécessaire, parfois en soins intensifs"
      },
      simpleAnalogy: "Plus le score est élevé, plus votre corps a du mal à combattre l'infection"
    },
    "PHQ-9": {
      whatItDoes: "Ce questionnaire mesure la sévérité de vos symptômes dépressifs sur les 2 dernières semaines",
      howItWorks: "9 questions sur votre humeur, votre énergie, votre sommeil, etc. Chaque réponse vaut 0 à 3 points selon la fréquence",
      whatResultsMean: {
        low: "Score 0-4 : Pas de dépression significative",
        medium: "Score 5-14 : Dépression légère à modérée. Un soutien psychologique peut aider",
        high: "Score 15-27 : Dépression sévère. Un traitement (thérapie et/ou médicaments) est fortement recommandé"
      },
      simpleAnalogy: "C'est comme un thermomètre pour votre moral - plus le score est élevé, plus vous avez besoin d'aide"
    },
    "CHA2DS2-VASc": {
      whatItDoes: "Ce score calcule votre risque d'AVC si vous avez de la fibrillation auriculaire (rythme cardiaque irrégulier)",
      howItWorks: "On compte vos facteurs de risque : insuffisance cardiaque, hypertension, âge, diabète, antécédent d'AVC, maladie vasculaire, sexe",
      whatResultsMean: {
        low: "Score 0 : Risque très faible. Pas besoin d'anticoagulants",
        medium: "Score 1 : Risque modéré. On peut considérer les anticoagulants",
        high: "Score 2 ou plus : Risque élevé. Les anticoagulants sont recommandés pour prévenir l'AVC"
      },
      simpleAnalogy: "Plus vous avez de facteurs de risque, plus il est important de 'fluidifier' votre sang pour éviter les caillots"
    },
    ABCD2: {
      whatItDoes: "Ce score prédit votre risque d'AVC dans les jours suivant un AIT (mini-AVC)",
      howItWorks: "On évalue 5 critères : votre âge, votre tension, vos symptômes, la durée de l'épisode, et si vous avez du diabète",
      whatResultsMean: {
        low: "Score 0-3 : Risque faible (1% dans les 2 jours)",
        medium: "Score 4-5 : Risque modéré (4% dans les 2 jours)",
        high: "Score 6-7 : Risque élevé (8% dans les 2 jours)"
      },
      simpleAnalogy: "C'est un signal d'alarme - plus le score est élevé, plus vite il faut agir pour éviter un AVC"
    },
    NIHSS: {
      whatItDoes: "Ce score mesure la gravité d'un AVC et aide à décider du traitement",
      howItWorks: "On teste 15 fonctions neurologiques : conscience, vision, mouvements, langage, etc.",
      whatResultsMean: {
        low: "Score 0-4 : AVC mineur. Bon pronostic de récupération",
        medium: "Score 5-15 : AVC modéré. Nécessite une prise en charge active",
        high: "Score 16+ : AVC sévère. Soins intensifs nécessaires"
      },
      simpleAnalogy: "C'est comme évaluer les dégâts après un orage - plus le score est élevé, plus les dommages sont importants"
    },
    PEWS: {
      whatItDoes: "Ce score détecte si l'état de votre enfant se dégrade et nécessite une attention urgente",
      howItWorks: "On observe 3 choses : le comportement de l'enfant, sa couleur de peau, et sa respiration",
      whatResultsMean: {
        low: "Score 0-2 : État stable. Surveillance normale",
        medium: "Score 3-4 : Attention requise. Le médecin doit être prévenu",
        high: "Score 5+ : Urgence. Équipe médicale immédiatement"
      },
      simpleAnalogy: "C'est comme un détecteur de fumée - plus il sonne fort (score élevé), plus vite il faut agir"
    },
    NEWS2: {
      whatItDoes: "Ce score surveille votre état général et détecte toute détérioration",
      howItWorks: "On mesure 7 signes vitaux : respiration, oxygène, température, tension, pouls, conscience, besoin d'oxygène",
      whatResultsMean: {
        low: "Score 0-4 : État stable. Surveillance régulière",
        medium: "Score 5-6 : Surveillance rapprochée nécessaire",
        high: "Score 7+ : État critique. Équipe d'urgence requise"
      },
      simpleAnalogy: "C'est comme les voyants du tableau de bord d'une voiture - plus il y a de voyants rouges, plus c'est urgent"
    },
    "Child-Pugh": {
      whatItDoes: "Ce score évalue la gravité de votre maladie du foie (cirrhose)",
      howItWorks: "On mesure 5 éléments : jaunisse, albumine, coagulation, liquide dans le ventre, confusion",
      whatResultsMean: {
        low: "Classe A (5-6 points) : Foie qui fonctionne encore bien",
        medium: "Classe B (7-9 points) : Fonction hépatique modérément altérée",
        high: "Classe C (10-15 points) : Foie très malade, pronostic réservé"
      },
      simpleAnalogy: "C'est comme noter l'état d'une maison - A = bon état, B = réparations nécessaires, C = gros travaux urgents"
    },
    "GAD-7": {
      whatItDoes: "Ce questionnaire mesure votre niveau d'anxiété sur les 2 dernières semaines",
      howItWorks: "7 questions sur vos inquiétudes, votre nervosité, votre agitation. Chaque réponse vaut 0 à 3 points",
      whatResultsMean: {
        low: "Score 0-4 : Anxiété minimale",
        medium: "Score 5-14 : Anxiété légère à modérée. Des techniques de relaxation peuvent aider",
        high: "Score 15-21 : Anxiété sévère. Un traitement est recommandé"
      },
      simpleAnalogy: "C'est comme mesurer la pression dans une cocotte-minute - plus c'est élevé, plus il faut relâcher la pression"
    },
    CFS: {
      whatItDoes: "Cette échelle évalue votre niveau de fragilité et votre autonomie",
      howItWorks: "On évalue votre capacité à faire vos activités quotidiennes sur une échelle de 1 à 9",
      whatResultsMean: {
        low: "Score 1-3 : En forme et autonome",
        medium: "Score 4-6 : Besoin d'aide pour certaines activités",
        high: "Score 7-9 : Très fragile, dépendant pour la plupart des activités"
      },
      simpleAnalogy: "C'est comme évaluer la solidité d'un pont - plus le score est bas, plus vous êtes solide"
    }
  }

  const explanation = simpleExplanations[scoreName] || {
    whatItDoes: scoreDetails.purpose || scoreDetails.description,
    howItWorks: scoreDetails.howToCalculate,
    whatResultsMean: scoreDetails.interpretation,
    simpleAnalogy: "Ce score nous aide à mieux évaluer votre situation"
  }

  return {
    scoreName: scoreName,
    fullName: scoreDetails.fullName,
    // Explication en 3 parties simples
    simpleExplanation: {
      whatItDoes: explanation.whatItDoes,
      howItWorks: explanation.howItWorks,
      whatResultsMean: explanation.whatResultsMean,
      analogy: explanation.simpleAnalogy
    },
    // Version technique pour les professionnels
    technicalDetails: {
      components: scoreDetails.components,
      calculation: scoreDetails.howToCalculate,
      interpretation: scoreDetails.interpretation,
      reference: scoreDetails.references,
      calculator: scoreDetails.onlineCalculator
    },
    // Action pratique
    whatNext: scoreDetails.clinicalAction || "Votre médecin utilisera ce score pour adapter votre traitement"
  }
}

// Fonction pour enrichir les questions avec des explications claires
function enrichQuestionWithClearScoreEducation(question: any): any {
  if (question.clinical_score) {
    const scoreDetails = getScoreDetails(question.clinical_score)
    if (!scoreDetails) return question

    const clearExplanation = generateClearScoreExplanation(question.clinical_score, scoreDetails)
    
    return {
      ...question,
      // Conserver les champs existants
      score_full_name: clearExplanation.fullName,
      
      // Remplacer par des explications plus claires
      score_explanation: clearExplanation.simpleExplanation.whatItDoes,
      score_purpose: clearExplanation.simpleExplanation.whatItDoes,
      
      // Comment ça marche en langage simple
      score_how_it_works: clearExplanation.simpleExplanation.howItWorks,
      
      // Interprétation simplifiée
      score_simple_interpretation: clearExplanation.simpleExplanation.whatResultsMean,
      
      // Analogie pour mieux comprendre
      score_analogy: clearExplanation.simpleExplanation.analogy,
      
      // Ce qui va se passer ensuite
      score_what_next: clearExplanation.whatNext,
      
      // Garder les détails techniques pour les professionnels
      score_technical_details: clearExplanation.technicalDetails,
      
      // Formulation de la question améliorée
      improved_question_intro: `Je vais utiliser le score ${question.clinical_score} pour mieux évaluer votre situation. ${clearExplanation.simpleExplanation.whatItDoes}. ${clearExplanation.simpleExplanation.howItWorks}.`
    }
  }
  return question
}

// Fonction améliorée pour extraire les éléments déjà documentés
function extractAlreadyAskedElements(patientData: any, clinicalData: any): string[] {
  const askedElements: string[] = []

  // Données démographiques
  if (patientData.age) askedElements.push("âge du patient")
  if (patientData.gender) askedElements.push("sexe du patient")
  if (patientData.weight && patientData.height) askedElements.push("poids et taille (IMC calculable)")
  
  // Allergies
  if (patientData.allergies?.length) askedElements.push("allergies connues")
  
  // Antécédents
  if (patientData.medicalHistory?.length) askedElements.push("antécédents médicaux")
  
  // Médicaments
  if (patientData.currentMedicationsText) askedElements.push("médicaments actuels")
  
  // Habitudes de vie - CORRECTION IMPORTANTE ICI
  if (patientData.lifeHabits?.smoking !== undefined) {
    askedElements.push("habitudes tabagiques")
    askedElements.push("tabagisme")
    askedElements.push("consommation de tabac")
    askedElements.push("fumeur")
    askedElements.push("cigarette")
  }
  
  if (patientData.lifeHabits?.alcohol !== undefined) {
    askedElements.push("consommation d'alcool")
    askedElements.push("habitudes alcooliques")
    askedElements.push("boisson alcoolisée")
    askedElements.push("alcool")
  }
  
  if (patientData.lifeHabits?.exercise !== undefined) {
    askedElements.push("activité physique")
    askedElements.push("exercice")
    askedElements.push("sport")
  }
  
  if (patientData.lifeHabits?.diet !== undefined) {
    askedElements.push("alimentation")
    askedElements.push("régime alimentaire")
    askedElements.push("habitudes alimentaires")
  }
  
  // Données cliniques
  if (clinicalData.chiefComplaint) askedElements.push("motif de consultation")
  if (clinicalData.symptoms) askedElements.push("symptômes principaux")
  if (clinicalData.physicalExam) askedElements.push("données d'examen physique")
  
  // Signes vitaux
  if (clinicalData.vitalSigns?.temperature !== undefined) askedElements.push("température")
  if (clinicalData.vitalSigns?.bloodPressure) askedElements.push("tension artérielle")
  if (clinicalData.vitalSigns?.heartRate !== undefined) askedElements.push("fréquence cardiaque")
  if (clinicalData.vitalSigns?.respiratoryRate !== undefined) askedElements.push("fréquence respiratoire")
  if (clinicalData.vitalSigns?.oxygenSaturation !== undefined) askedElements.push("saturation en oxygène")

  return askedElements
}

// Fonction pour nettoyer et valider les questions
function validateAndCleanQuestions(questions: any[], patientData: any): any[] {
  return questions
    .filter(q => {
      const questionText = q.question.toLowerCase()
      
      // Filtrer les questions sur les habitudes déjà renseignées
      if (patientData.lifeHabits?.smoking !== undefined && 
          (questionText.includes('fumez') || 
           questionText.includes('tabac') || 
           questionText.includes('cigarette') ||
           questionText.includes('tabagisme'))) {
        console.log(`Question filtrée (tabac déjà renseigné) : ${q.question}`)
        return false
      }
      
      if (patientData.lifeHabits?.alcohol !== undefined && 
          (questionText.includes('alcool') || 
           questionText.includes('buvez') ||
           questionText.includes('boisson alcoolisée') ||
           questionText.includes('consommation d\'alcool'))) {
        console.log(`Question filtrée (alcool déjà renseigné) : ${q.question}`)
        return false
      }
      
      if (patientData.lifeHabits?.exercise !== undefined && 
          (questionText.includes('exercice') || 
           questionText.includes('sport') ||
           questionText.includes('activité physique'))) {
        console.log(`Question filtrée (exercice déjà renseigné) : ${q.question}`)
        return false
      }
      
      if (patientData.lifeHabits?.diet !== undefined && 
          (questionText.includes('alimentation') || 
           questionText.includes('régime') ||
           questionText.includes('nourriture') ||
           questionText.includes('manger'))) {
        console.log(`Question filtrée (alimentation déjà renseignée) : ${q.question}`)
        return false
      }
      
      return true
    })
    .map(q => {
      // Enrichir avec des explications claires pour les scores
      if (q.clinical_score) {
        return enrichQuestionWithClearScoreEducation(q)
      }
      return q
    })
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

// Génération du prompt enrichi avec toutes les spécialités et explications claires
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

RÈGLES CRITIQUES - ÉVITER LES REDONDANCES:
1. **NE JAMAIS poser de questions sur des éléments déjà documentés** listés ci-dessous
2. **Vérifier chaque question** pour éviter toute redondance
3. **Si une habitude de vie est déjà renseignée** (alcool, tabac, etc.), NE PAS la redemander

RÈGLES POUR EXPLIQUER LES SCORES DE MANIÈRE CLAIRE :

Quand vous utilisez un score clinique, expliquez-le en 3 étapes simples :

1. **Ce que ça fait** : En une phrase simple, dites à quoi sert ce score
   Exemple : "Ce score prédit votre risque cardiaque"

2. **Comment ça marche** : Expliquez les critères en langage courant
   Exemple : "On regarde 5 choses : votre âge, vos symptômes, etc."

3. **Ce que les résultats signifient** : Utilisez des comparaisons simples
   Exemple : "C'est comme un feu tricolore - vert = ok, orange = prudence, rouge = danger"

ÉVITEZ :
- Le jargon médical non expliqué
- Les acronymes sans explication
- Les pourcentages complexes
- Les formules mathématiques

PRÉFÉREZ :
- Des analogies du quotidien
- Des explications visuelles (échelles, couleurs)
- Des actions concrètes selon le résultat
- Un langage rassurant mais honnête

SPÉCIALITÉS DÉTECTÉES: ${detectedSpecialties.join(", ")}

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

ÉLÉMENTS DÉJÀ DOCUMENTÉS (NE PAS REDEMANDER - TRÈS IMPORTANT):
${askedElements.map(element => `- ${element}`).join('\n')}

SCORES CLINIQUES PERTINENTS AVEC EXPLICATIONS:
${specialtyContext}

EXEMPLES D'UTILISATION DES SCORES AVEC EXPLICATIONS CLAIRES:

**EXEMPLE CARDIOLOGIE - Score HEART**:
Question: "Pour évaluer votre risque cardiaque, j'aimerais utiliser le score HEART. C'est un outil simple qui prédit votre risque d'avoir un problème cardiaque dans les 6 prochaines semaines."
Explication claire:
- Ce que ça fait: Prédit le risque d'infarctus ou autre problème cardiaque grave
- Comment ça marche: On regarde 5 choses: votre histoire, l'ECG, votre âge, vos facteurs de risque, et un test sanguin
- Les résultats: Comme un feu tricolore - Vert (0-3 points) = risque faible, rentrez chez vous. Orange (4-6) = surveillance quelques heures. Rouge (7-10) = hospitalisation nécessaire

**EXEMPLE PNEUMOLOGIE - Score CURB-65**:
Question: "Pour évaluer la gravité de votre pneumonie, j'utilise le score CURB-65. Il nous aide à décider si vous pouvez être traité à la maison ou si vous devez être hospitalisé."
Explication claire:
- Ce que ça fait: Évalue si votre pneumonie est légère, modérée ou sévère
- Comment ça marche: On vérifie 5 points simples - confusion, urée dans le sang, respiration rapide, tension basse, âge >65 ans
- Les résultats: 0-1 point = traitement à domicile possible. 2 points = surveillance rapprochée. 3+ points = hospitalisation recommandée

**EXEMPLE PSYCHIATRIE - Score PHQ-9**:
Question: "Pour mieux comprendre votre état émotionnel, j'utilise le questionnaire PHQ-9. C'est comme un thermomètre pour mesurer votre moral."
Explication claire:
- Ce que ça fait: Mesure la sévérité de vos symptômes dépressifs
- Comment ça marche: 9 questions sur votre humeur, énergie, sommeil des 2 dernières semaines
- Les résultats: 0-4 = pas de dépression, 5-14 = dépression légère à modérée (soutien utile), 15+ = dépression sévère (traitement recommandé)

GÉNÉRATION INTELLIGENTE - 5-8 QUESTIONS ADAPTÉES:

Format JSON avec explications claires:
{
  "questions": [
    {
      "id": 1,
      "question": "Question formulée simplement, sans jargon médical",
      "type": "multiple_choice",
      "options": ["Options claires et compréhensibles"],
      "rationale": "Justification simple de pourquoi on pose cette question",
      "category": "accessible|technical|global",
      "complexity_level": "simple|moderate|advanced",
      "specialty": "${detectedSpecialties[0]}",
      "patient_friendly_explanation": "Explication en langage simple pour le patient",
      "what_happens_next": "Ce qu'on fera avec cette information",
      "clinical_score": "Nom du score si applicable",
      "score_simple_explanation": {
        "what": "Ce que le score mesure en termes simples",
        "how": "Comment on le calcule simplement",
        "results": "Ce que signifient les résultats avec analogie",
        "analogy": "Comparaison simple (feu tricolore, thermomètre, etc.)"
      },
      "score_full_name": "Nom complet du score",
      "score_technical_details": "Détails techniques pour les professionnels",
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
    "simple_explanations": true
  }
}

RÈGLES D'OR POUR DES QUESTIONS CLAIRES:
✓ Éviter ABSOLUMENT de redemander les habitudes de vie déjà documentées
✓ Utiliser un langage simple et accessible
✓ Expliquer chaque score avec une analogie
✓ Donner des résultats en termes de "faible/moyen/élevé" plutôt qu'en pourcentages
✓ Toujours expliquer ce qui va se passer après
✓ Rassurer tout en étant honnête
✓ Adapter le niveau de langage au patient

EXPERTISE PAR DOMAINE MÉDICAL:

**CARDIOLOGIE**:
- Accessible: localisation douleur, facteurs déclenchants, antécédents familiaux
- Technique: Score HEART/TIMI (expliqués simplement), CHA2DS2-VASc (avec analogie)
- Red flags: douleur thoracique typique, dyspnée aiguë, syncope

**NEUROLOGIE**:
- Accessible: caractère céphalée, troubles sensitifs/moteurs, chronologie
- Technique: NIHSS (comme évaluer les dégâts), ABCD2 (signal d'alarme)
- Red flags: céphalée en coup de tonnerre, déficit focal

**PNEUMOLOGIE**:
- Accessible: toux productive/sèche, essoufflement effort/repos
- Technique: CURB-65 (gravité infection), Wells (risque caillot)
- Red flags: hémoptysie, détresse respiratoire

**PSYCHIATRIE**:
- Accessible: humeur, sommeil, anxiété, contexte psychosocial
- Technique: PHQ-9 (thermomètre du moral), GAD-7 (mesure de l'anxiété)
- Red flags: idées suicidaires, rupture de contact

**PÉDIATRIE**:
- Accessible: alimentation, comportement, développement
- Technique: PEWS (détecteur de problèmes), courbes croissance
- Red flags: léthargie, refus alimentaire

CONTEXTE TROPICAL MAURICIEN:
- Pathologies endémiques: dengue, chikungunya, leptospirose
- Adaptation culturelle des questions
`
}

// Génération de fallback spécialisé par domaine avec explications claires
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
        patient_friendly_explanation: "L'endroit exact de la douleur nous aide à comprendre si elle vient du cœur ou d'autre chose",
        what_happens_next: "Selon votre réponse, nous pourrons faire les examens les plus appropriés",
        diagnostic_value: "high",
        differential_diagnosis: ["Syndrome coronarien", "Reflux gastrique", "Douleur musculaire", "Anxiété"]
      },
      {
        id: 2,
        question: "Je vais utiliser le score HEART pour évaluer votre risque cardiaque. C'est un outil simple qui nous aide à savoir si votre douleur vient du cœur. Combien avez-vous de facteurs de risque cardiovasculaire parmi : tabac, hypertension, diabète, cholestérol élevé, ou maladie cardiaque dans la famille?",
        type: "multiple_choice",
        options: [
          "Aucun facteur de risque",
          "1 facteur de risque",
          "2 facteurs de risque",
          "3 facteurs de risque ou plus"
        ],
        rationale: "Les facteurs de risque sont une partie importante du score HEART",
        category: "technical",
        clinical_score: "HEART",
        score_simple_explanation: {
          what: "Prédit votre risque d'avoir un problème cardiaque dans les 6 prochaines semaines",
          how: "On regarde 5 choses : votre histoire, l'ECG, votre âge, vos facteurs de risque, et un test sanguin",
          results: "0-3 points = risque faible (rentrer à la maison), 4-6 = surveillance, 7-10 = hospitalisation",
          analogy: "C'est comme un feu tricolore : vert = ok, orange = prudence, rouge = danger"
        },
        score_full_name: "History, ECG, Age, Risk factors, Troponin",
        patient_friendly_explanation: "Plus vous avez de facteurs de risque, plus il faut être vigilant",
        what_happens_next: "Ce score nous aidera à décider si vous pouvez rentrer chez vous ou si nous devons vous garder en observation",
        diagnostic_value: "high",
        differential_diagnosis: ["Syndrome coronarien aigu", "Angor stable", "Douleur non cardiaque"]
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
        rationale: "Une céphalée brutale peut signaler une urgence neurologique",
        category: "technical",
        specialty: "neurology",
        patient_friendly_explanation: "Un mal de tête qui arrive comme un coup de tonnerre peut être le signe d'un problème grave",
        what_happens_next: "Si c'est brutal, nous devrons faire un scanner en urgence",
        red_flags: "Céphalée brutale = suspicion hémorragie méningée",
        diagnostic_value: "high",
        differential_diagnosis: ["Hémorragie méningée", "Migraine", "Céphalée de tension", "AVC"]
      },
      {
        id: 2,
        question: "Si vous avez eu des symptômes neurologiques qui ont disparu, j'utilise le score ABCD2. C'est comme un signal d'alarme qui nous dit si vous risquez un AVC. Combien de temps ont duré vos symptômes?",
        type: "multiple_choice",
        options: [
          "Moins de 10 minutes",
          "Entre 10 et 59 minutes", 
          "Une heure ou plus",
          "Les symptômes sont toujours présents"
        ],
        rationale: "La durée des symptômes prédit le risque d'AVC après un AIT",
        category: "technical",
        clinical_score: "ABCD2",
        score_simple_explanation: {
          what: "Prédit votre risque d'avoir un AVC dans les prochains jours",
          how: "On évalue 5 critères : âge, tension, symptômes, durée, diabète",
          results: "0-3 = risque faible, 4-5 = risque moyen (hospitalisation), 6-7 = risque élevé (urgence)",
          analogy: "C'est un signal d'alarme - plus le score est haut, plus vite il faut agir"
        },
        score_full_name: "Age, Blood pressure, Clinical features, Duration, Diabetes",
        patient_friendly_explanation: "Plus les symptômes ont duré longtemps, plus le risque est important",
        what_happens_next: "Selon le score, nous déciderons si vous devez être hospitalisé pour des examens urgents",
        specialty: "neurology",
        diagnostic_value: "high",
        differential_diagnosis: ["AIT", "AVC constitué", "Migraine avec aura", "Crise d'épilepsie"]
      }
    ],
    psychiatry: [
      {
        id: 1,
        question: "Pour évaluer votre moral, j'utilise le questionnaire PHQ-9. C'est comme un thermomètre pour mesurer votre bien-être émotionnel. Sur les 2 dernières semaines, avez-vous eu peu d'intérêt ou de plaisir à faire les choses?",
        type: "multiple_choice",
        options: [
          "Jamais",
          "Plusieurs jours",
          "Plus de la moitié du temps",
          "Presque tous les jours"
        ],
        rationale: "Première question du PHQ-9 pour évaluer la dépression",
        category: "technical",
        clinical_score: "PHQ-9",
        score_simple_explanation: {
          what: "Mesure la sévérité de vos symptômes dépressifs",
          how: "9 questions sur votre humeur, énergie, sommeil sur 2 semaines",
          results: "0-4 = pas de dépression, 5-14 = dépression légère (soutien utile), 15+ = dépression sévère (traitement nécessaire)",
          analogy: "C'est comme un thermomètre pour votre moral - plus c'est élevé, plus vous avez besoin d'aide"
        },
        score_full_name: "Patient Health Questionnaire-9",
        patient_friendly_explanation: "Cette question nous aide à comprendre si vous souffrez de dépression",
        what_happens_next: "Selon vos réponses, nous pourrons vous proposer le soutien approprié",
        specialty: "psychiatry",
        diagnostic_value: "high",
        differential_diagnosis: ["Dépression majeure", "Dysthymie", "Trouble bipolaire", "Burn-out"]
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
        patient_friendly_explanation: "Le comportement de votre enfant nous dit beaucoup sur son état de santé",
        what_happens_next: "Si votre enfant est anormalement calme, nous devrons l'examiner rapidement",
        red_flags: "Léthargie = urgence pédiatrique",
        diagnostic_value: "high",
        differential_diagnosis: ["Infection virale bénigne", "Méningite", "Déshydratation", "Sepsis"]
      },
      {
        id: 2,
        question: "J'utilise le score PEWS pour évaluer l'état de votre enfant. C'est comme un détecteur qui nous alerte si son état se dégrade. Quelle est la couleur de sa peau?",
        type: "multiple_choice",
        options: [
          "Rose, bien colorée",
          "Un peu pâle ou marbrée",
          "Grise ou bleutée",
          "Grise avec les lèvres bleues"
        ],
        rationale: "La couleur de peau reflète l'oxygénation et la circulation",
        category: "technical",
        clinical_score: "PEWS",
        score_simple_explanation: {
          what: "Détecte si l'état de votre enfant se dégrade",
          how: "On observe le comportement, la couleur de peau, et la respiration",
          results: "0-2 = tout va bien, 3-4 = surveillance rapprochée, 5+ = urgence médicale",
          analogy: "C'est comme un détecteur de fumée - plus il sonne fort, plus vite il faut agir"
        },
        score_full_name: "Pediatric Early Warning Score",
        patient_friendly_explanation: "La couleur de la peau nous indique si votre enfant reçoit assez d'oxygène",
        what_happens_next: "Si la peau est grise ou bleue, nous devrons agir immédiatement",
        specialty: "pediatrics",
        diagnostic_value: "high",
        differential_diagnosis: ["État septique", "Déshydratation sévère", "Choc", "Détresse respiratoire"]
      }
    ]
  }

  const questions = fallbackQuestions[specialty] || generateSmartFallbackQuestions(patientData, clinicalData, askedElements)
  
  // Nettoyer et enrichir les questions
  return { 
    questions: validateAndCleanQuestions(questions, patientData)
  }
}

// Fonctions helper existantes
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
      { keywords: ["fumez", "tabac", "cigarette", "tabagisme"], element: "habitudes tabagiques" },
      { keywords: ["alcool", "buvez", "boisson alcoolisée"], element: "consommation d'alcool" },
      { keywords: ["température", "fièvre"], element: "température" },
      { keywords: ["tension", "pression artérielle"], element: "tension artérielle" },
      { keywords: ["exercice", "sport", "activité physique"], element: "activité physique" },
      { keywords: ["alimentation", "régime", "nourriture"], element: "alimentation" }
    ]

    const isRedundant = redundantKeywords.some(({ keywords, element }) => 
      keywords.some(keyword => questionText.includes(keyword)) && 
      askedElements.some(asked => asked.includes(element) || element.includes(asked))
    )
    
    if (isRedundant) {
      console.log(`Question filtrée (redondante): ${question.question}`)
    }
    
    return !isRedundant
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
    
    if (q.clinical_score && q.score_simple_explanation) {
      questionScore += 4
      details.push(`Q${index + 1}: Score clinique avec explication claire (${q.clinical_score})`)
    }
    if (q.patient_friendly_explanation) questionScore += 2
    if (q.what_happens_next) questionScore += 2
    if (q.score_simple_explanation?.analogy) questionScore += 3
    if (q.specialty) questionScore += 1
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
  if (finalScore >= 12) level = "Expert avec communication excellente"
  else if (finalScore >= 10) level = "Expert avec bonnes explications"
  else if (finalScore >= 8) level = "Avancé avec explications claires"
  else if (finalScore >= 6) level = "Intermédiaire avec efforts pédagogiques"
  else level = "Basique"

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
      patient_friendly_explanation: "Vos inquiétudes sont importantes et nous aident à mieux vous soigner",
      what_happens_next: "Nous adapterons notre approche selon ce qui vous préoccupe le plus",
      diagnostic_value: "medium",
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
      patient_friendly_explanation: "Parfois, un événement peut déclencher des problèmes de santé",
      what_happens_next: "Cette information nous aidera à comprendre l'origine de vos symptômes",
      diagnostic_value: "high",
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
      patient_friendly_explanation: "Connaître votre état de santé habituel nous aide à mieux évaluer la situation actuelle",
      what_happens_next: "Nous adapterons nos examens selon votre état de santé général",
      diagnostic_value: "medium",
      differential_diagnosis: []
    }
  ]

  return questions.filter(q => !askedElements.some(element => 
    q.question.toLowerCase().includes(element.toLowerCase())
  ))
}

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

function extractRedFlags(questions: any[]): string[] {
  return questions
    .filter(q => q.red_flags)
    .map(q => q.red_flags)
    .filter((flag, index, array) => array.indexOf(flag) === index)
}

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 API Questions IA Médicales Améliorées - Début")

    let requestData: {
      patientData?: any
      clinicalData?: any
    }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour génération questions")
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
    console.log(`📋 Éléments déjà documentés: ${askedElements.length}`)
    
    // Génération du prompt enrichi
    const enhancedPrompt = generateEnhancedPrompt(patientData, clinicalData, askedElements)

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: enhancedPrompt,
      temperature: 0.3,
      maxTokens: 4096,
    })

    console.log("🧠 Questions médicales générées")

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

      // Nettoyage et validation des questions
      questionsData.questions = validateAndCleanQuestions(questionsData.questions, patientData)
      
      console.log(`✅ ${questionsData.questions.length} questions validées et nettoyées`)
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing, génération fallback")
      questionsData = generateSpecialtyFallbackQuestions(
        patientData, 
        clinicalData, 
        askedElements,
        detectedSpecialties[0] || "general"
      )
    }

    // Évaluation finale
    const finalAssessment = assessMedicalExpertLevel(questionsData.questions)

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
        simpleExplanation: q.score_simple_explanation,
        analogy: q.score_simple_explanation?.analogy,
        whatNext: q.score_what_next,
        technicalDetails: q.score_technical_details
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
        approach: "patient-friendly-with-clear-explanations",
        medicalLevel: finalAssessment.level,
        medicalScore: finalAssessment.score,
        questionBalance: finalAssessment.balance,
        
        // Exclusions
        excludedElements: askedElements,
        
        // Analyse qualité
        expertFeatures: {
          accessibleQuestions: questionsData.questions.filter(q => q.category === 'accessible').length,
          technicalQuestionsWithClearExplanations: questionsData.questions.filter(q => q.category === 'technical' && q.score_simple_explanation).length,
          questionsWithAnalogies: questionsData.questions.filter(q => q.score_simple_explanation?.analogy).length,
          questionsWithWhatNext: questionsData.questions.filter(q => q.what_happens_next).length,
          clinicalScoresUsed: [...new Set(questionsData.questions.filter(q => q.clinical_score).map(q => q.clinical_score))],
          specialtiesCovered: [...new Set(questionsData.questions.filter(q => q.specialty).map(q => q.specialty))],
        },
        
        // Éducation sur les scores
        scoreEducation: {
          scoresUsed: scoresUsed,
          totalScoresExplained: scoresUsed.length,
          allScoresHaveSimpleExplanations: scoresUsed.every(s => s.simpleExplanation),
          allScoresHaveAnalogies: scoresUsed.every(s => s.analogy),
          educationalValue: scoresUsed.length > 0 ? "high" : "none"
        },
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
      
      // Guide d'utilisation des scores pour le patient
      patientScoreGuide: scoresUsed.length > 0 ? {
        message: "Explication simple des scores utilisés",
        scores: scoresUsed.map(s => ({
          name: s.name,
          whatItDoes: s.simpleExplanation?.what,
          analogy: s.analogy,
          whatHappensNext: s.whatNext
        })),
        reassurance: "Ces scores nous aident à mieux vous soigner. N'hésitez pas à poser des questions si quelque chose n'est pas clair."
      } : null
    }

    console.log(`✅ Génération complète - Questions: ${questionsData.questions.length} - Scores expliqués: ${scoresUsed.length}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("❌ Erreur Questions IA:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de la génération des questions médicales",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
