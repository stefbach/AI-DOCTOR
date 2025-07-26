// /app/api/openai-questions/route.ts - SYSTÈME QUESTIONS ADAPTATIVES UNIVERSEL
import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ==================== INTERFACES SYSTÈME QUESTIONS EXPERT ====================

interface AdaptiveQuestion {
  id: number
  question: string
  type: 'multiple_choice' | 'yes_no' | 'scale' | 'open_text'
  options?: string[]
  rationale: string
  category: 'accessible' | 'technical' | 'global' | 'critical'
  complexity_level: 'simple' | 'moderate' | 'advanced'
  medical_explanation: string
  patient_benefit: string
  diagnostic_value: 'high' | 'medium' | 'low'
  clinical_context: string
  urgency_level?: 'routine' | 'urgent' | 'immediate'
  followup_questions?: number[]
}

interface ClinicalContextAnalysis {
  probableCondition: string
  primarySystem: 'cardiovascular' | 'respiratory' | 'gastrointestinal' | 'neurological' | 
                 'endocrine' | 'musculoskeletal' | 'genitourinary' | 'dermatological' | 
                 'psychiatric' | 'hematological' | 'infectious' | 'tropical' | 'medication_induced' | 'general'
  questionsCategory: string
  priority: string
  specificFocus: string[]
  redFlags: string[]
  urgencyLevel: string
  medicationConcerns: boolean
}

interface MedicationQuestionProfile {
  category: string
  questions: AdaptiveQuestion[]
  triggerMedications: string[]
  symptoms: string[]
}

// ==================== BASE DE DONNÉES QUESTIONS PAR SYSTÈME ====================

const SYSTEM_SPECIFIC_QUESTIONS = {
  
  // ========== SYSTÈME CARDIOVASCULAIRE ==========
  cardiovascular: {
    chest_pain: [
      {
        id: 1,
        question: "Comment décririez-vous votre douleur thoracique ?",
        type: "multiple_choice" as const,
        options: [
          "Oppression/serrement, comme un étau sur la poitrine",
          "Brûlure ou sensation de feu dans la poitrine", 
          "Coups de poignard, douleur aiguë et localisée",
          "Difficile à décrire, sensation bizarre"
        ],
        rationale: "Le type de douleur oriente vers l'origine cardiaque, œsophagienne ou pariétale",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Douleur oppressive = typique coronaire, brûlure = reflux, poignard = pariétal",
        patient_benefit: "Aide à identifier rapidement si la douleur peut venir du cœur",
        diagnostic_value: "high" as const,
        clinical_context: "chest_pain_characterization"
      },
      {
        id: 2,
        question: "Selon le score HEART (évaluation du risque cardiaque), votre douleur présente-t-elle des caractéristiques inquiétantes ?",
        type: "multiple_choice" as const,
        options: [
          "Douleur typique cardiaque : oppression + effort + localisation centrale",
          "Douleur partiellement typique : quelques caractéristiques seulement",
          "Douleur atypique : localisée, positionnelle, reproductible",
          "Je ne sais pas évaluer ces caractéristiques"
        ],
        rationale: "Le score HEART stratifie le risque de syndrome coronaire aigu",
        category: "technical" as const,
        complexity_level: "moderate" as const,
        medical_explanation: "Score HEART = évaluation standardisée du risque cardiaque en 5 critères",
        patient_benefit: "Détermine rapidement si des examens cardiaques urgents sont nécessaires",
        diagnostic_value: "high" as const,
        clinical_context: "cardiac_risk_stratification"
      }
    ],
    hypertension: [
      {
        id: 1,
        question: "Avez-vous des symptômes que vous associez à votre tension artérielle ?",
        type: "multiple_choice" as const,
        options: [
          "Maux de tête, surtout le matin au réveil",
          "Vertiges, sensation d'instabilité",
          "Saignements de nez sans traumatisme", 
          "Aucun symptôme particulier"
        ],
        rationale: "L'HTA est souvent asymptomatique, ces symptômes peuvent indiquer une HTA sévère",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "HTA symptomatique peut indiquer valeurs élevées ou complications",
        patient_benefit: "Évalue le retentissement de votre tension sur votre bien-être",
        diagnostic_value: "medium" as const,
        clinical_context: "hypertension_evaluation"
      }
    ]
  },

  // ========== SYSTÈME GASTRO-INTESTINAL ==========
  gastrointestinal: {
    gastroenteritis: [
      {
        id: 1,
        question: "Concernant l'origine possible de vos troubles digestifs, qu'avez-vous consommé récemment ?",
        type: "multiple_choice" as const,
        options: [
          "Nourriture de rue, restaurant ou vendeur ambulant à Maurice",
          "Fruits de mer, poisson ou crustacés",
          "Pique-nique, buffet ou nourriture restée longtemps à température ambiante",
          "Uniquement des repas préparés à la maison comme d'habitude"
        ],
        rationale: "À Maurice, les gastro-entérites sont majoritairement d'origine alimentaire",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Le climat tropical favorise la multiplication microbienne rapide",
        patient_benefit: "Identifier la source aide à éviter les récidives et guide le traitement",
        diagnostic_value: "high" as const,
        clinical_context: "food_poisoning_investigation"
      },
      {
        id: 2,
        question: "Vos selles présentent-elles des caractéristiques particulières ?",
        type: "multiple_choice" as const,
        options: [
          "Présence de sang rouge visible",
          "Glaires ou mucus (filaments transparents/jaunâtres)",
          "Selles liquides jaunâtres sans sang ni glaires",
          "Je n'ai pas examiné attentivement"
        ],
        rationale: "Sang/glaires orientent vers infection invasive nécessitant traitement spécifique",
        category: "technical" as const,
        complexity_level: "moderate" as const,
        medical_explanation: "Sang = atteinte muqueuse, glaires = inflammation colique",
        patient_benefit: "Détermine si vous avez besoin d'antibiotiques ou d'examens supplémentaires",
        diagnostic_value: "high" as const,
        clinical_context: "inflammatory_diarrhea_assessment"
      }
    ],
    medication_induced_GI: [
      {
        id: 1,
        question: "Quand avez-vous commencé ou modifié un traitement récemment ?",
        type: "multiple_choice" as const,
        options: [
          "Nouveau médicament dans les 2 dernières semaines",
          "Augmentation de dose il y a 1-4 semaines",
          "Nouveau traitement il y a 1-3 mois",
          "Aucun changement thérapeutique récent"
        ],
        rationale: "La chronologie médicament-symptômes est cruciale pour identifier un effet secondaire",
        category: "technical" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Effet secondaire = relation temporelle entre prise médicament et symptômes",
        patient_benefit: "Détermine si vos symptômes sont liés à vos médicaments",
        diagnostic_value: "high" as const,
        clinical_context: "medication_timeline_analysis"
      },
      {
        id: 2,
        question: "Parmi vos médicaments actuels, lesquels avez-vous commencé récemment ?",
        type: "multiple_choice" as const,
        options: [
          "Médicaments pour le diabète (Ozempic, Victoza, Metformine)",
          "Antibiotiques ou anti-inflammatoires",
          "Médicaments pour le cœur ou la tension",
          "Compléments alimentaires ou vitamines"
        ],
        rationale: "Certains médicaments causent fréquemment des troubles digestifs",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "GLP-1, Metformine, AINS sont connus pour leurs effets digestifs",
        patient_benefit: "Identifie si un médicament spécifique peut expliquer vos symptômes",
        diagnostic_value: "high" as const,
        clinical_context: "drug_specific_identification"
      }
    ],
    abdominal_pain: [
      {
        id: 1,
        question: "Où se situe précisément votre douleur abdominale ?",
        type: "multiple_choice" as const,
        options: [
          "Côté droit, sous les côtes (hypochondre droit)",
          "Au centre, dans le creux de l'estomac (épigastre)",
          "Autour du nombril (région périombilicale)",
          "Partout dans le ventre, difficile à localiser"
        ],
        rationale: "La localisation oriente vers l'organe concerné et le diagnostic",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Chaque région correspond à des organes spécifiques",
        patient_benefit: "Aide à identifier quel organe pourrait être en cause",
        diagnostic_value: "high" as const,
        clinical_context: "abdominal_pain_localization"
      }
    ]
  },
  
  // ========== SYSTÈME RESPIRATOIRE ==========
  respiratory: {
    cough: [
      {
        id: 1,
        question: "Votre toux s'accompagne-t-elle d'expectorations (crachats) ?",
        type: "multiple_choice" as const,
        options: [
          "Oui, crachats jaunes ou verts (purulents)",
          "Oui, crachats clairs ou blancs (muqueux)",
          "Oui, crachats avec traces de sang",
          "Non, toux sèche sans crachats"
        ],
        rationale: "L'aspect des crachats oriente vers infection, allergie ou pathologie grave",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Crachats purulents = infection, sang = urgence médicale",
        patient_benefit: "Détermine la gravité et le type de traitement nécessaire",
        diagnostic_value: "high" as const,
        clinical_context: "productive_cough_analysis"
      }
    ],
    dyspnea: [
      {
        id: 1,
        question: "Dans quelles circonstances ressentez-vous cet essoufflement ?",
        type: "multiple_choice" as const,
        options: [
          "Au moindre effort (marcher, monter quelques marches)",
          "Lors d'efforts modérés (montée d'étages, marche rapide)",
          "Seulement lors d'efforts intenses",
          "Même au repos, allongé dans le lit"
        ],
        rationale: "L'évaluation fonctionnelle classe la sévérité de l'essoufflement",
        category: "technical" as const,
        complexity_level: "moderate" as const,
        medical_explanation: "Classification NYHA de l'insuffisance cardiaque ou échelle MRC respiratoire",
        patient_benefit: "Évalue l'impact sur votre vie quotidienne et oriente le traitement",
        diagnostic_value: "high" as const,
        clinical_context: "functional_dyspnea_assessment"
      }
    ]
  },

  // ========== SYSTÈME NEUROLOGIQUE ==========
  neurological: {
    headache: [
      {
        id: 1,
        question: "Comment s'est installé votre mal de tête ?",
        type: "multiple_choice" as const,
        options: [
          "Brutalement, comme un 'coup de tonnerre' en quelques secondes",
          "Progressivement sur plusieurs heures",
          "Graduellement sur plusieurs jours",
          "Comme mes maux de tête habituels"
        ],
        rationale: "Un début brutal peut signaler une urgence neurologique (hémorragie)",
        category: "technical" as const,
        complexity_level: "moderate" as const,
        medical_explanation: "Céphalée en coup de tonnerre = red flag neurologique majeur",
        patient_benefit: "Détecte les maux de tête dangereux nécessitant une prise en charge urgente",
        diagnostic_value: "high" as const,
        clinical_context: "headache_red_flags",
        urgency_level: "immediate"
      },
      {
        id: 2,
        question: "Votre mal de tête s'accompagne-t-il d'autres symptômes ?",
        type: "multiple_choice" as const,
        options: [
          "Raideur dans la nuque, difficulté à pencher la tête",
          "Nausées, vomissements, gêne à la lumière",
          "Troubles visuels, difficultés à parler",
          "Aucun autre symptôme associé"
        ],
        rationale: "Les signes associés orientent vers méningite, migraine ou AVC",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Chaque association de symptômes évoque une cause différente",
        patient_benefit: "Oriente rapidement vers le bon spécialiste et les examens nécessaires",
        diagnostic_value: "high" as const,
        clinical_context: "associated_neurological_symptoms"
      }
    ],
    neurological_deficit: [
      {
        id: 1,
        question: "Avez-vous des difficultés de mouvement ou de sensation ?",
        type: "multiple_choice" as const,
        options: [
          "Faiblesse d'un côté du corps (bras et/ou jambe)",
          "Troubles de la parole ou de la compréhension",
          "Engourdissements, fourmillements d'un côté",
          "Troubles de l'équilibre, sensation de vertige"
        ],
        rationale: "Ces symptômes évoquent un AVC nécessitant une prise en charge urgente",
        category: "technical" as const,
        complexity_level: "advanced" as const,
        medical_explanation: "Déficit neurologique focal = urgence neurovasculaire",
        patient_benefit: "Détection rapide d'un AVC pour traitement dans la fenêtre thérapeutique",
        diagnostic_value: "high" as const,
        clinical_context: "stroke_assessment",
        urgency_level: "immediate"
      }
    ]
  },

  // ========== SYSTÈME INFECTIEUX/TROPICAL ==========
  infectious: {
    fever: [
      {
        id: 1,
        question: "Comment évolue votre fièvre depuis son début ?",
        type: "multiple_choice" as const,
        options: [
          "Fièvre constamment élevée depuis le début",
          "Fièvre qui monte et descend plusieurs fois par jour",
          "Épisodes de fièvre alternant avec des périodes normales",
          "Fièvre qui diminue progressivement"
        ],
        rationale: "Le pattern fébrile oriente vers différents types d'infections",
        category: "technical" as const,
        complexity_level: "moderate" as const,
        medical_explanation: "Fièvre continue = bactérienne, intermittente = paludisme, rémittente = virale",
        patient_benefit: "Aide à identifier le type d'infection pour un traitement adapté",
        diagnostic_value: "high" as const,
        clinical_context: "fever_pattern_analysis"
      },
      {
        id: 2,
        question: "À Maurice, avez-vous eu des expositions particulières récemment ?",
        type: "multiple_choice" as const,
        options: [
          "Piqûres de moustiques nombreuses ou inhabituelles",
          "Contact avec de l'eau stagnante ou inondée",
          "Contact avec des personnes malades",
          "Aucune exposition particulière identifiée"
        ],
        rationale: "À Maurice, certaines expositions orientent vers dengue, chikungunya, leptospirose",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Les maladies tropicales ont des modes de transmission spécifiques",
        patient_benefit: "Oriente vers les bonnes analyses selon le contexte mauricien",
        diagnostic_value: "high" as const,
        clinical_context: "tropical_disease_exposure"
      }
    ],
    tropical_diseases: [
      {
        id: 1,
        question: "En plus de la fièvre, quels autres symptômes ressentez-vous ?",
        type: "multiple_choice" as const,
        options: [
          "Douleurs articulaires intenses, surtout mains et pieds",
          "Maux de tête sévères avec douleurs derrière les yeux",
          "Éruption cutanée (boutons, rougeurs sur la peau)",
          "Courbatures généralisées dans tout le corps"
        ],
        rationale: "Ces symptômes différencient dengue, chikungunya et autres viroses tropicales",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Chaque maladie tropicale a sa signature symptomatique",
        patient_benefit: "Permet un diagnostic rapide des maladies vectorielles mauriciennes",
        diagnostic_value: "high" as const,
        clinical_context: "tropical_disease_differentiation"
      }
    ]
  }
}

// ==================== QUESTIONS LIÉES AUX MÉDICAMENTS ====================

const MEDICATION_SPECIFIC_QUESTIONS: { [key: string]: MedicationQuestionProfile } = {
  
  // GLP-1 (Semaglutide, Liraglutide)
  glp1_agonists: {
    category: "antidiabetic_GLP1",
    triggerMedications: ["semaglutide", "ozempic", "wegovy", "liraglutide", "victoza", "saxenda", "dulaglutide", "trulicity"],
    symptoms: ["nausées", "vomissements", "diarrhée", "douleur_abdominale", "constipation"],
    questions: [
      {
        id: 1,
        question: "Quand avez-vous commencé ou augmenté la dose de votre injection pour le diabète (Ozempic, Victoza, etc.) ?",
        type: "multiple_choice" as const,
        options: [
          "J'ai commencé il y a moins de 2 semaines",
          "J'ai augmenté la dose il y a 1-4 semaines",
          "Je prends la même dose depuis plus de 2 mois",
          "Je n'ai pas changé ce traitement récemment"
        ],
        rationale: "Les GLP-1 causent des effets digestifs surtout en début de traitement ou lors d'augmentation",
        category: "technical" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Les effets secondaires digestifs des GLP-1 sont dose-dépendants et transitoires",
        patient_benefit: "Confirme si vos symptômes sont liés à ce médicament spécifique",
        diagnostic_value: "high" as const,
        clinical_context: "glp1_temporal_relationship"
      },
      {
        id: 2,
        question: "Avez-vous respecté les conseils alimentaires avec ce traitement ?",
        type: "multiple_choice" as const,
        options: [
          "Oui, je mange de plus petites portions et évite les graisses",
          "Partiellement, j'ai réduit les quantités mais pas changé mes habitudes",
          "Non, je mange comme avant de commencer le traitement",
          "Je n'ai pas reçu de conseils alimentaires spécifiques"
        ],
        rationale: "Les GLP-1 nécessitent une adaptation alimentaire pour réduire les effets secondaires",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Alimentation adaptée réduit nausées et troubles digestifs sous GLP-1",
        patient_benefit: "Apprend comment mieux tolérer votre traitement",
        diagnostic_value: "medium" as const,
        clinical_context: "glp1_dietary_adaptation"
      }
    ]
  },

  // Metformine
  metformin: {
    category: "antidiabetic_metformin",
    triggerMedications: ["metformine", "glucophage", "stagid", "metformin"],
    symptoms: ["diarrhée", "nausées", "vomissements", "douleur_abdominale", "goût_métallique"],
    questions: [
      {
        id: 1,
        question: "Comment prenez-vous votre Metformine ?",
        type: "multiple_choice" as const,
        options: [
          "Pendant les repas avec suffisamment de nourriture",
          "Entre les repas ou estomac vide",
          "De façon irrégulière selon mes oublis",
          "Je ne sais pas si c'est important"
        ],
        rationale: "La prise de Metformine pendant les repas réduit considérablement les effets digestifs",
        category: "accessible" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Prise avec nourriture améliore tolérance digestive de la Metformine",
        patient_benefit: "Améliore votre confort digestif avec ce médicament",
        diagnostic_value: "high" as const,
        clinical_context: "metformin_administration_optimization"
      }
    ]
  },

  // Antibiotiques
  antibiotics: {
    category: "antibiotic_effects",
    triggerMedications: ["amoxicilline", "clamoxyl", "augmentin", "ciprofloxacine", "ciflox", "azithromycine", "zithromax"],
    symptoms: ["diarrhée", "nausées", "candidose", "rash", "colite"],
    questions: [
      {
        id: 1,
        question: "Depuis quand prenez-vous des antibiotiques ?",
        type: "multiple_choice" as const,
        options: [
          "J'ai commencé il y a 1-3 jours",
          "Je prends depuis 4-7 jours",
          "J'ai terminé le traitement il y a quelques jours",
          "Je prends des antibiotiques depuis plus d'une semaine"
        ],
        rationale: "La diarrhée aux antibiotiques peut survenir pendant ou après le traitement",
        category: "technical" as const,
        complexity_level: "simple" as const,
        medical_explanation: "Altération du microbiote intestinal par les antibiotiques",
        patient_benefit: "Explique vos troubles digestifs et guide le traitement",
        diagnostic_value: "high" as const,
        clinical_context: "antibiotic_associated_diarrhea"
      }
    ]
  },

  // IEC (toux sèche)
  ace_inhibitors: {
    category: "cardiovascular_ACE",
    triggerMedications: ["lisinopril", "enalapril", "ramipril", "perindopril", "prinivil", "renitec"],
    symptoms: ["toux_sèche", "toux_persistante"],
    questions: [
      {
        id: 1,
        question: "Votre toux a-t-elle commencé après le début d'un médicament pour la tension ?",
        type: "multiple_choice" as const,
        options: [
          "Oui, dans les semaines suivant le début du traitement",
          "Oui, mais plusieurs mois après le début",
          "Non, j'avais cette toux avant le médicament",
          "Je ne me souviens pas de la chronologie"
        ],
        rationale: "La toux aux IEC peut survenir précocement ou tardivement après initiation",
        category: "technical" as const,
        complexity_level: "moderate" as const,
        medical_explanation: "Accumulation de bradykinine causée par les IEC provoque toux sèche",
        patient_benefit: "Identifie si votre médicament pour la tension cause votre toux",
        diagnostic_value: "high" as const,
        clinical_context: "ace_inhibitor_cough"
      }
    ]
  }
}

// ==================== FONCTIONS D'ANALYSE CONTEXTUELLE ====================

function analyzeComprehensiveClinicalContext(patientData: any, clinicalData: any): ClinicalContextAnalysis {
  const symptoms = `${clinicalData.symptoms || ''} ${clinicalData.chiefComplaint || ''}`.toLowerCase()
  const medications = (patientData.currentMedicationsText || '').toLowerCase()
  const temperature = parseFloat(clinicalData.vitalSigns?.temperature || '0')
  const age = patientData.age || 30
  
  let primarySystem: ClinicalContextAnalysis['primarySystem'] = 'general'
  let probableCondition = 'Syndrome clinique indéterminé'
  let questionsCategory = 'general_assessment'
  let priority = 'symptom_characterization'
  let specificFocus: string[] = []
  let redFlags: string[] = []
  let urgencyLevel = 'routine'
  let medicationConcerns = false

  // ========== ANALYSE PAR SYSTÈME AVEC DÉTECTION AVANCÉE ==========
  
  // SYSTÈME GASTRO-INTESTINAL
  if (/diarrhée|selles liquides|vomissement|nausée|abdomen|ventre|gastro/.test(symptoms)) {
    primarySystem = 'gastrointestinal'
    
    // Détection médicaments GI
    if (/semaglutide|ozempic|liraglutide|victoza|dulaglutide|trulicity/.test(medications)) {
      probableCondition = 'Effet secondaire GLP-1'
      questionsCategory = 'medication_induced_GI'
      priority = 'glp1_temporal_correlation'
      specificFocus = ['chronologie_glp1', 'adaptation_alimentaire', 'dose_récente']
      medicationConcerns = true
    }
    else if (/metformine|glucophage|stagid/.test(medications)) {
      probableCondition = 'Effet secondaire Metformine' 
      questionsCategory = 'medication_induced_GI'
      priority = 'metformin_administration'
      specificFocus = ['prise_pendant_repas', 'dose_progressive']
      medicationConcerns = true
    }
    else if (/amoxicilline|augmentin|ciprofloxacine|antibiotique/.test(medications)) {
      probableCondition = 'Diarrhée post-antibiotique'
      questionsCategory = 'antibiotic_induced_GI' 
      priority = 'antibiotic_timeline'
      specificFocus = ['durée_antibiotique', 'microbiote_altération']
      medicationConcerns = true
    }
    else {
      probableCondition = 'Gastro-entérite infectieuse'
      questionsCategory = 'infectious_gastroenteritis'
      priority = 'contamination_source'
      specificFocus = ['alimentation_suspecte', 'contact_malade', 'caractère_selles']
    }
    
    // Red flags GI
    if (/sang|méléna|rectorragie/.test(symptoms)) {
      redFlags.push('hémorragie_digestive')
      urgencyLevel = 'urgent'
    }
    if (temperature > 38.5) {
      redFlags.push('fièvre_élevée_GI')
      urgencyLevel = 'urgent'
    }
  }
  
  // SYSTÈME CARDIOVASCULAIRE
  else if (/douleur.*thorax|douleur.*poitrine|oppression|dyspnée|palpitation|cœur/.test(symptoms)) {
    primarySystem = 'cardiovascular'
    probableCondition = 'Douleur thoracique'
    questionsCategory = 'chest_pain_evaluation'
    priority = 'cardiac_risk_stratification'
    specificFocus = ['caractère_douleur', 'facteurs_déclenchants', 'signes_associés']
    
    // Red flags cardiovasculaires
    if (/irradiation|bras|mâchoire|sueur/.test(symptoms)) {
      redFlags.push('douleur_coronaire_typique')
      urgencyLevel = 'immediate'
    }
    if (age > 45 || /diabète|hta|tabac/.test(patientData.medicalHistory?.join(' ').toLowerCase() || '')) {
      redFlags.push('facteurs_risque_cv')
      urgencyLevel = 'urgent'
    }
  }
  
  // SYSTÈME RESPIRATOIRE
  else if (/toux|expectoration|dyspnée|essoufflement|poumon|bronche/.test(symptoms)) {
    primarySystem = 'respiratory'
    
    // Détection toux IEC
    if (/toux.*sèche|toux.*persistante/.test(symptoms) && 
        /lisinopril|enalapril|ramipril|perindopril|prinivil/.test(medications)) {
      probableCondition = 'Toux induite par IEC'
      questionsCategory = 'medication_induced_cough'
      priority = 'ace_inhibitor_correlation'
      specificFocus = ['chronologie_iec', 'caractère_toux_sèche']
      medicationConcerns = true
    } else {
      probableCondition = 'Syndrome respiratoire'
      questionsCategory = 'respiratory_syndrome'
      priority = 'infection_vs_allergy'
      specificFocus = ['caractère_toux', 'expectoration', 'dyspnée_effort']
    }
    
    // Red flags respiratoires
    if (/hémoptysie|crachat.*sang/.test(symptoms)) {
      redFlags.push('hémoptysie')
      urgencyLevel = 'urgent'
    }
    if (temperature > 38 && /dyspnée|essoufflement/.test(symptoms)) {
      redFlags.push('pneumonie_probable')
      urgencyLevel = 'urgent'
    }
  }
  
  // SYSTÈME NEUROLOGIQUE
  else if (/céphalée|mal.*tête|migraine|vertige|trouble.*vision/.test(symptoms)) {
    primarySystem = 'neurological'
    probableCondition = 'Céphalées'
    questionsCategory = 'headache_evaluation'
    priority = 'red_flags_detection'
    specificFocus = ['début_brutal', 'signes_associés', 'red_flags_neuro']
    
    // Red flags neurologiques CRITIQUES
    if (/brutal|coup.*tonnerre|soudain/.test(symptoms)) {
      redFlags.push('céphalée_brutale')
      urgencyLevel = 'immediate'
    }
    if (/raideur.*nuque|photophobie/.test(symptoms)) {
      redFlags.push('syndrome_méningé')
      urgencyLevel = 'immediate'
    }
    if (/trouble.*parole|faiblesse|déficit/.test(symptoms)) {
      redFlags.push('déficit_neurologique')
      urgencyLevel = 'immediate'
    }
  }
  
  // SYSTÈME INFECTIEUX/TROPICAL (spécifique Maurice)
  else if (temperature > 37.5 || /fièvre|frisson|malaise|courbature/.test(symptoms)) {
    primarySystem = 'infectious'
    
    // Contexte mauricien - maladies vectorielles
    if (/arthralgie|douleur.*articulation/.test(symptoms)) {
      probableCondition = 'Chikungunya suspecté'
      questionsCategory = 'tropical_arthralgia'
      priority = 'vector_exposure'
      specificFocus = ['piqûres_moustiques', 'arthralgies_spécifiques', 'contexte_épidémique']
    }
    else if (/céphalée.*intense|douleur.*yeux/.test(symptoms)) {
      probableCondition = 'Dengue suspectée'
      questionsCategory = 'tropical_fever'
      priority = 'dengue_criteria'
      specificFocus = ['triade_dengue', 'surveillance_plaquettes', 'signes_alarme']
    }
    else {
      probableCondition = 'Syndrome fébrile'
      questionsCategory = 'fever_syndrome'
      priority = 'infection_source'
      specificFocus = ['pattern_fièvre', 'exposition_tropicale', 'signes_gravité']
    }
    
    // Red flags infectieux
    if (temperature > 39.5) {
      redFlags.push('hyperthermie_majeure')
      urgencyLevel = 'urgent'
    }
  }

  return {
    probableCondition,
    primarySystem,
    questionsCategory,
    priority,
    specificFocus,
    redFlags,
    urgencyLevel,
    medicationConcerns
  }
}

function generateSystemSpecificQuestions(contextAnalysis: ClinicalContextAnalysis): AdaptiveQuestion[] {
  const { primarySystem, questionsCategory, medicationConcerns } = contextAnalysis
  
  let questions: AdaptiveQuestion[] = []
  
  // Questions spécifiques au système
  const systemQuestions = SYSTEM_SPECIFIC_QUESTIONS[primarySystem]
  if (systemQuestions && systemQuestions[questionsCategory]) {
    questions = [...systemQuestions[questionsCategory]]
  }
  
  // Questions médicamenteuses si concerné
  if (medicationConcerns) {
    Object.values(MEDICATION_SPECIFIC_QUESTIONS).forEach(medProfile => {
      if (questionsCategory.includes(medProfile.category.split('_')[1])) {
        questions.push(...medProfile.questions)
      }
    })
  }
  
  // Questions globales obligatoires
  questions.push({
    id: 99,
    question: "Comment ces symptômes affectent-ils votre vie quotidienne actuellement ?",
    type: "multiple_choice",
    options: [
      "Je peux continuer toutes mes activités normalement",
      "Je dois adapter ou réduire certaines activités",
      "J'ai des difficultés importantes dans mes activités habituelles",
      "Je suis très limité(e), incapable de faire mes tâches usuelles"
    ],
    rationale: "L'impact fonctionnel guide l'urgence et l'intensité du traitement",
    category: "global",
    complexity_level: "simple",
    medical_explanation: "Évaluation de la répercussion sur la qualité de vie",
    patient_benefit: "S'assure que votre vécu est pris en compte dans les soins",
    diagnostic_value: "medium",
    clinical_context: "functional_impact_assessment"
  })
  
  return questions.slice(0, 6) // Maximum 6 questions
}

function detectRedundantElements(patientData: any, clinicalData: any): string[] {
  const alreadyKnown: string[] = []
  
  // Données patient
  if (patientData.age) alreadyKnown.push("âge")
  if (patientData.gender) alreadyKnown.push("sexe") 
  if (patientData.weight && patientData.height) alreadyKnown.push("morphologie")
  if (patientData.allergies?.length) alreadyKnown.push("allergies")
  if (patientData.medicalHistory?.length) alreadyKnown.push("antécédents")
  if (patientData.currentMedicationsText) alreadyKnown.push("traitements_actuels")
  if (patientData.lifeHabits?.smoking) alreadyKnown.push("tabac")
  
  // Données cliniques
  if (clinicalData.chiefComplaint) alreadyKnown.push("motif_consultation")
  if (clinicalData.symptoms) alreadyKnown.push("symptômes_principaux")
  if (clinicalData.vitalSigns?.temperature) alreadyKnown.push("température")
  if (clinicalData.vitalSigns?.bloodPressure) alreadyKnown.push("tension_artérielle")
  
  return alreadyKnown
}

// ==================== FONCTION EXPORT POST API ====================

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 API QUESTIONS ADAPTATIVES UNIVERSELLES - Début")

    let requestData: { patientData?: any; clinicalData?: any }

    try {
      requestData = await request.json()
      console.log("📝 Données reçues pour analyse contextuelle")
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON:", parseError)
      return NextResponse.json(
        { error: "Format JSON invalide", success: false },
        { status: 400 }
      )
    }

    const { patientData, clinicalData } = requestData

    if (!patientData || !clinicalData) {
      return NextResponse.json(
        { error: "Données patient et cliniques requises", success: false },
        { status: 400 }
      )
    }

    console.log(`🔍 Analyse contextuelle pour: ${patientData.firstName} ${patientData.lastName}`)
    
    // ========== ANALYSE CONTEXTUELLE AVANCÉE ==========
    const contextAnalysis = analyzeComprehensiveClinicalContext(patientData, clinicalData)
    const redundantElements = detectRedundantElements(patientData, clinicalData)
    
    console.log(`🎯 Contexte identifié: ${contextAnalysis.probableCondition} (${contextAnalysis.primarySystem})`)
    console.log(`⚠️ Red flags: ${contextAnalysis.redFlags.join(', ') || 'Aucun'}`)
    console.log(`💊 Concerns médicamenteux: ${contextAnalysis.medicationConcerns ? 'Oui' : 'Non'}`)
    
    // ========== GÉNÉRATION QUESTIONS ADAPTATIVES ==========
    let questionsData: { questions: AdaptiveQuestion[] }
    
    // Si contexte clair et non-urgent, utiliser questions pré-définies
    if (contextAnalysis.probableCondition !== 'Syndrome clinique indéterminé' && 
        contextAnalysis.urgencyLevel !== 'immediate') {
      
      const adaptiveQuestions = generateSystemSpecificQuestions(contextAnalysis)
      questionsData = { questions: adaptiveQuestions }
      
      console.log(`✅ ${adaptiveQuestions.length} questions adaptatives générées automatiquement`)
      
    } else {
      // Utiliser IA pour cas complexes ou urgents
      console.log("🧠 Cas complexe - Génération IA avec contexte avancé")
      
      const advancedPrompt =Tu es un MÉDECIN EXPERT générant des questions ULTRA-ADAPTÉES au contexte clinique analysé.

ANALYSE CONTEXTUELLE AUTOMATISÉE :
Patient : ${patientData.firstName} ${patientData.lastName}, ${patientData.age} ans
Antécédents : ${patientData.medicalHistory?.join(", ") || "aucun"}
Médicaments en cours : ${patientData.currentMedicationsText || "aucun"}
Motif d'hospitalisation : ${clinicalData.reason || "non précisé"}
Condition probable : ${contextAnalysis.probableCondition}
Systèmes identifiés : ${contextAnalysis.primarySystem.toUpperCase()}, mais explorer aussi cardiovasculaire, respiratoire, digestif, neurologique, musculosquelettique, génito-urinaire, endocrinien, dermatologique, psychiatrique, hématologique.
Red flags détectés : ${contextAnalysis.redFlags.join(", ") || "Aucun"}
Urgence : ${contextAnalysis.urgencyLevel.toUpperCase()}
Focus spécifique : ${contextAnalysis.specificFocus.join(", ")}

DONNÉES DÉJÀ CONNUES (ne pas redemander) :
${redundantElements.join(", ")}

INSTRUCTIONS GÉNÉRATION EXPERTE :
1. Proposer des questions pour confirmer ou infirmer plusieurs diagnostics possibles et couvrir tous les systèmes pertinents.
2. Si des drapeaux rouges existent → questions orientées sur la gravité et l'évolution.
3. Si des médicaments ou antécédents sont en cause → explorer la chronologie et l'interaction avec les symptômes.
4. 70 % de questions accessibles et pratiques, 30 % techniques avec explications.
5. Poser au moins une question de dépistage pour les systèmes non encore explorés.
6. Maximum 6 questions ciblées.

RÈGLES ABSOLUES :
✓ Questions directement liées au contexte analysé et aux systèmes restants
✓ Éviter toute redondance avec données connues
✓ Adapter l'urgence aux red flags détectés
✓ Couvrir toutes les spécialités médicales pertinentes
✓ Questions pratiques et actionnables

{
  "questions": [
    {
      "id": 1,
      "question": "Question ultra-spécifique au contexte ${contextAnalysis.probableCondition}",
      "type": "multiple_choice",
      "options": ["Option ciblée 1", "Option ciblée 2", "Option ciblée 3", "Option alternative"],
      "rationale": "Justification précise pour ce contexte spécifique",
      "category": "accessible|technical|critical",
      "complexity_level": "simple|moderate|advanced",
      "medical_explanation": "Explication médicale adaptée au niveau",
      "patient_benefit": "Bénéfice concret pour le patient",
      "diagnostic_value": "high|medium|low",
      "clinical_context": "${contextAnalysis.questionsCategory}",
      "urgency_level": "${contextAnalysis.urgencyLevel}"
    }
  ]
}`
      // Appel à l'API OpenAI avec le prompt étendu
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: extendedPrompt,
        temperature: 0.15,
        maxTokens: 3000,
      });

      // Parsing du JSON généré par l’IA (inchangé)
      // …
    }

    // Évaluation de la qualité et construction de la réponse finale (inchangé)
    // …
  } catch (error: any) {
    // Gestion des erreurs (inchangé)
  }

      try {
        const result = await generateText({
          model: openai("gpt-4o"),
          prompt: advancedPrompt,
          temperature: 0.15,
          maxTokens: 3000,
        })

        console.log("🧠 Questions IA générées avec contexte avancé")

        // Parsing sécurisé
        let cleanedText = result.text.trim()
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanedText = jsonMatch[0]
        }

        questionsData = JSON.parse(cleanedText)

        if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
          throw new Error("Structure JSON invalide")
        }

        console.log(`✅ ${questionsData.questions.length} questions IA parsées avec succès`)

      } catch (aiError) {
        console.warn("⚠️ Erreur IA, utilisation questions adaptatives automatiques")
        const adaptiveQuestions = generateSystemSpecificQuestions(contextAnalysis)
        questionsData = { questions: adaptiveQuestions }
      }
    }

    // ========== ÉVALUATION QUALITÉ ==========
    const qualityAssessment = {
      contextualRelevance: questionsData.questions.filter(q => 
        q.clinical_context?.includes(contextAnalysis.questionsCategory) ||
        q.question.toLowerCase().includes(contextAnalysis.probableCondition.toLowerCase().split(' ')[0])
      ).length,
      accessibilityBalance: {
        accessible: questionsData.questions.filter(q => q.category === 'accessible').length,
        technical: questionsData.questions.filter(q => q.category === 'technical').length,
        critical: questionsData.questions.filter(q => q.category === 'critical').length
      },
      urgencyAdaptation: contextAnalysis.urgencyLevel === 'immediate' ? 
        questionsData.questions.filter(q => q.urgency_level === 'immediate').length > 0 : true,
      medicationFocus: contextAnalysis.medicationConcerns ? 
        questionsData.questions.some(q => q.question.toLowerCase().includes('médicament')) : true
    }

    // ========== RÉPONSE FINALE ==========
    const response = {
      success: true,
      questions: questionsData.questions,
      
      // Métadonnées contextuelles
      contextual_analysis: {
        probable_condition: contextAnalysis.probableCondition,
        primary_system: contextAnalysis.primarySystem,
        urgency_level: contextAnalysis.urgencyLevel,
        red_flags_detected: contextAnalysis.redFlags,
        medication_concerns: contextAnalysis.medicationConcerns,
        specific_focus: contextAnalysis.specificFocus
      },
      
      // Métriques qualité
      quality_metrics: {
        questions_count: questionsData.questions.length,
        contextual_relevance_score: qualityAssessment.contextualRelevance / questionsData.questions.length,
        accessibility_balance: qualityAssessment.accessibilityBalance,
        urgency_appropriate: qualityAssessment.urgencyAdaptation,
        medication_addressed: qualityAssessment.medicationFocus,
        redundancy_avoided: redundantElements.length,
        generation_method: contextAnalysis.probableCondition !== 'Syndrome clinique indéterminé' ? 'adaptive_automatic' : 'ai_enhanced'
      },
      
      // Recommandations cliniques
      clinical_recommendations: {
        immediate_actions: contextAnalysis.urgencyLevel === 'immediate' ? 
          ["Évaluation médicale urgente recommandée", "Surveillance des red flags détectés"] : 
          ["Surveillance évolution symptômes", "Documentation réponses pour suivi"],
        follow_up_strategy: contextAnalysis.redFlags.length > 0 ? 
          "Réévaluation rapide selon évolution" : "Suivi standard selon réponses",
        specialist_referral: contextAnalysis.primarySystem !== 'general' && contextAnalysis.urgencyLevel === 'urgent' ?
          `Avis ${contextAnalysis.primarySystem} recommandé` : "Selon évolution clinique"
      },
      
      // Métadonnées système
      system_metadata: {
        generation_timestamp: new Date().toISOString(),
        ai_model: "gpt-4o",
        analysis_engine: "contextual_adaptive_v2",
        mauritian_context: true,
        medication_database_integrated: true,
        red_flags_monitoring: true,
        universal_system_coverage: true
      }
    }

    console.log(`✅ Questions contextuelles finalisées: ${questionsData.questions.length} - Système: ${contextAnalysis.primarySystem} - Urgence: ${contextAnalysis.urgencyLevel}`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error("❌ Erreur système questions:", error)
    
    return NextResponse.json(
      {
        error: "Erreur système questions adaptatives",
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
        fallback_available: true
      },
      { status: 500 }
    )
  }
}
