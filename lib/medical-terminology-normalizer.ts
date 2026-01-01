// lib/medical-terminology-normalizer.ts
// NORMALISATION COMPLÈTE EN NOMENCLATURE ANGLO-SAXONNE (UK/US)
// Pour dictée vocale Whisper → Standardisation médicale internationale

/**
 * OBJECTIF: Normaliser TOUT ce qui est dicté en nomenclature anglo-saxonne standard:
 * - Médicaments: DCI en anglais (Amoxicillin, NOT Amoxicilline)
 * - Termes médicaux: anglais (chest pain, NOT douleur thoracique)
 * - Examens: anglais (ECG, Troponin, NOT troponine)
 * - Conditions: anglais (ACS, NOT SCA)
 */

// ============================================
// 1. NORMALISATION DES MÉDICAMENTS (DCI ANGLAIS)
// ============================================

export const MEDICATION_NORMALIZATION_MAP: Record<string, {
  correctDCI: string;
  brandNames: string[];
  commonMisspellings: string[];
}> = {
  // Antibiotiques
  'amoxicillin': {
    correctDCI: 'Amoxicillin',
    brandNames: ['Amoxil', 'Flemoxin', 'Trimox'],
    commonMisspellings: ['amoxicilline', 'amoxicilin', 'amoxycillin', 'amoksisilin']
  },
  'azithromycin': {
    correctDCI: 'Azithromycin',
    brandNames: ['Zithromax', 'Azithrocin'],
    commonMisspellings: ['azithromycine', 'azitromycin', 'azythromycin']
  },
  'ciprofloxacin': {
    correctDCI: 'Ciprofloxacin',
    brandNames: ['Cipro', 'Ciproxin'],
    commonMisspellings: ['ciprofloxacine', 'cypro', 'siprofloxacin']
  },
  'metronidazole': {
    correctDCI: 'Metronidazole',
    brandNames: ['Flagyl'],
    commonMisspellings: ['métronidazole', 'metronidazol']
  },
  
  // Analgésiques / Anti-inflammatoires
  'paracetamol': {
    correctDCI: 'Paracetamol',
    brandNames: ['Panadol', 'Tylenol', 'Calpol'],
    commonMisspellings: ['paracétamol', 'paracetomol', 'acetaminophen']
  },
  'ibuprofen': {
    correctDCI: 'Ibuprofen',
    brandNames: ['Brufen', 'Nurofen', 'Advil'],
    commonMisspellings: ['ibuprofene', 'ibuprofène', 'ibuprofen', 'ibuprofin']
  },
  'diclofenac': {
    correctDCI: 'Diclofenac',
    brandNames: ['Voltaren', 'Voltarol'],
    commonMisspellings: ['diclofénac', 'diclofen', 'diclofenac']
  },
  'naproxen': {
    correctDCI: 'Naproxen',
    brandNames: ['Naprosyn', 'Aleve'],
    commonMisspellings: ['naproxène', 'naproxin']
  },
  'aspirin': {
    correctDCI: 'Aspirin',
    brandNames: ['Disprin', 'Aspro'],
    commonMisspellings: ['aspirine', 'asprine', 'asprin']
  },
  
  // Cardiovasculaires
  'atenolol': {
    correctDCI: 'Atenolol',
    brandNames: ['Tenormin'],
    commonMisspellings: ['aténolol', 'atenelol']
  },
  'amlodipine': {
    correctDCI: 'Amlodipine',
    brandNames: ['Norvasc'],
    commonMisspellings: ['amlodipina', 'amlodipín']
  },
  'enalapril': {
    correctDCI: 'Enalapril',
    brandNames: ['Vasotec'],
    commonMisspellings: ['énalapril', 'enalipril']
  },
  'simvastatin': {
    correctDCI: 'Simvastatin',
    brandNames: ['Zocor'],
    commonMisspellings: ['simvastatine', 'simvastine']
  },
  'atorvastatin': {
    correctDCI: 'Atorvastatin',
    brandNames: ['Lipitor'],
    commonMisspellings: ['atorvastatine', 'atorvastine']
  },
  'clopidogrel': {
    correctDCI: 'Clopidogrel',
    brandNames: ['Plavix'],
    commonMisspellings: ['clopidogrèl', 'clopidogral']
  },
  'ticagrelor': {
    correctDCI: 'Ticagrelor',
    brandNames: ['Brilinta', 'Brilique'],
    commonMisspellings: ['ticagrélor', 'ticagrelor']
  },
  
  // Diabète
  'metformin': {
    correctDCI: 'Metformin',
    brandNames: ['Glucophage'],
    commonMisspellings: ['metformine', 'metfromin']
  },
  'glibenclamide': {
    correctDCI: 'Glibenclamide',
    brandNames: ['Daonil', 'Glyburide'],
    commonMisspellings: ['glibenclamida', 'glyburide']
  },
  'insulin': {
    correctDCI: 'Insulin',
    brandNames: ['Humulin', 'Lantus', 'Novorapid'],
    commonMisspellings: ['insuline', 'insulina']
  },
  
  // Gastro-intestinaux
  'omeprazole': {
    correctDCI: 'Omeprazole',
    brandNames: ['Losec', 'Prilosec'],
    commonMisspellings: ['oméprazole', 'omeprazol']
  },
  'ranitidine': {
    correctDCI: 'Ranitidine',
    brandNames: ['Zantac'],
    commonMisspellings: ['ranitidina', 'ranitidín']
  },
  'metoclopramide': {
    correctDCI: 'Metoclopramide',
    brandNames: ['Maxolon', 'Reglan', 'Primperan'],
    commonMisspellings: ['métoclopramide', 'metoclopramida']
  },
  
  // Respiratoires
  'salbutamol': {
    correctDCI: 'Salbutamol',
    brandNames: ['Ventolin', 'Albuterol'],
    commonMisspellings: ['albuterol', 'salbutomol']
  },
  'prednisolone': {
    correctDCI: 'Prednisolone',
    brandNames: ['Prelone'],
    commonMisspellings: ['prednisolona', 'prednisolon']
  },
  
  // Neurologiques / Psychiatriques
  'amitriptyline': {
    correctDCI: 'Amitriptyline',
    brandNames: ['Elavil'],
    commonMisspellings: ['amitriptylin', 'amitryptilina']
  },
  'diazepam': {
    correctDCI: 'Diazepam',
    brandNames: ['Valium'],
    commonMisspellings: ['diazépam', 'diazepan']
  },
  'carbamazepine': {
    correctDCI: 'Carbamazepine',
    brandNames: ['Tegretol'],
    commonMisspellings: ['carbamazépine', 'carbamazepina']
  }
};

// ============================================
// 2. NORMALISATION DES TERMES MÉDICAUX
// ============================================

export const MEDICAL_TERMS_NORMALIZATION: Record<string, string> = {
  // Symptômes - Français → Anglais
  'douleur thoracique': 'chest pain',
  'douleur poitrine': 'chest pain',
  'mal à la poitrine': 'chest pain',
  'douleur cardiaque': 'cardiac chest pain',
  'essoufflement': 'shortness of breath',
  'dyspnée': 'dyspnoea',
  'palpitations': 'palpitations',
  'vertiges': 'dizziness',
  'étourdissements': 'dizziness',
  'céphalée': 'headache',
  'mal de tête': 'headache',
  'fièvre': 'fever',
  'température': 'fever',
  'toux': 'cough',
  'nausée': 'nausea',
  'vomissement': 'vomiting',
  'diarrhée': 'diarrhoea',
  'constipation': 'constipation',
  'fatigue': 'fatigue',
  'faiblesse': 'weakness',
  'douleur abdominale': 'abdominal pain',
  'mal au ventre': 'abdominal pain',
  
  // Examens - Français → Anglais
  'électrocardiogramme': 'electrocardiogram',
  'échocardiographie': 'echocardiography',
  'radiographie': 'x-ray',
  'radio': 'x-ray',
  'scanner': 'CT scan',
  'tomodensitométrie': 'CT scan',
  'irm': 'MRI',
  'imagerie par résonance magnétique': 'MRI',
  'échographie': 'ultrasound',
  'écho': 'ultrasound',
  'prise de sang': 'blood test',
  'analyse de sang': 'blood test',
  'hémogramme': 'full blood count',
  'numération formule sanguine': 'full blood count',
  'nfs': 'FBC',
  'troponine': 'troponin',
  'créatinine': 'creatinine',
  'urée': 'urea',
  'glycémie': 'blood glucose',
  'hémoglobine glyquée': 'HbA1c',
  'lipides': 'lipids',
  'cholestérol': 'cholesterol',
  
  // Conditions médicales - Français → Anglais
  'syndrome coronarien aigu': 'acute coronary syndrome',
  'sca': 'ACS',
  'infarctus': 'myocardial infarction',
  'crise cardiaque': 'heart attack',
  'angine': 'angina',
  'angor': 'angina',
  'accident vasculaire cérébral': 'stroke',
  'avc': 'stroke',
  'accident ischémique transitoire': 'transient ischaemic attack',
  'ait': 'TIA',
  'embolie pulmonaire': 'pulmonary embolism',
  'ep': 'PE',
  'hypertension': 'hypertension',
  'hta': 'HTN',
  'diabète': 'diabetes',
  'diabète de type 2': 'type 2 diabetes',
  'asthme': 'asthma',
  'pneumonie': 'pneumonia',
  'bronchite': 'bronchitis',
  'insuffisance cardiaque': 'heart failure',
  'fibrillation auriculaire': 'atrial fibrillation',
  'fa': 'AF',
  
  // Signes vitaux
  'tension artérielle': 'blood pressure',
  'ta': 'BP',
  'fréquence cardiaque': 'heart rate',
  'fc': 'HR',
  'pouls': 'pulse',
  'fréquence respiratoire': 'respiratory rate',
  'fr': 'RR',
  'saturation en oxygène': 'oxygen saturation',
  'spo2': 'SpO2',
  'température corporelle': 'body temperature'
};

// ============================================
// 3. NORMALISATION DES DOSAGES
// ============================================

export const DOSAGE_NORMALIZATION: Record<string, string> = {
  // Fréquences - Français → Anglais
  'fois par jour': 'times daily',
  'par jour': 'daily',
  'une fois par jour': 'once daily',
  'deux fois par jour': 'twice daily',
  'trois fois par jour': 'three times daily',
  'quatre fois par jour': 'four times daily',
  'matin': 'morning',
  'midi': 'noon',
  'soir': 'evening',
  'nuit': 'night',
  'au coucher': 'at bedtime',
  'avant les repas': 'before meals',
  'après les repas': 'after meals',
  'avec de la nourriture': 'with food',
  
  // Abréviations latines (standard médical)
  '1x/j': 'OD',
  '2x/j': 'BD',
  '3x/j': 'TDS',
  '4x/j': 'QDS',
  'od': 'OD',  // once daily
  'bd': 'BD',  // bis die (twice daily)
  'tds': 'TDS', // ter die sumendum (three times daily)
  'qds': 'QDS', // quater die sumendum (four times daily)
  'prn': 'PRN', // pro re nata (as needed)
  'stat': 'STAT', // immediately
};

// ============================================
// 4. FONCTION DE NORMALISATION PRINCIPALE
// ============================================

export interface NormalizationResult {
  originalText: string;
  normalizedText: string;
  corrections: Array<{
    type: 'medication' | 'medical_term' | 'dosage' | 'spelling';
    original: string;
    corrected: string;
    position?: number;
  }>;
  confidence: number;
}

/**
 * Normalise le texte de transcription Whisper en nomenclature anglo-saxonne standard
 */
export function normalizeTranscriptionToEnglish(transcriptionText: string): NormalizationResult {
  let normalizedText = transcriptionText;
  const corrections: NormalizationResult['corrections'] = [];
  
  console.log('🔄 Starting transcription normalization to English...');
  
  // 1. Normaliser les médicaments
  Object.entries(MEDICATION_NORMALIZATION_MAP).forEach(([key, value]) => {
    const regex = new RegExp(`\\b(${[key, ...value.commonMisspellings, ...value.brandNames].join('|')})\\b`, 'gi');
    
    const matches = normalizedText.match(regex);
    if (matches) {
      matches.forEach(match => {
        if (match.toLowerCase() !== value.correctDCI.toLowerCase()) {
          corrections.push({
            type: 'medication',
            original: match,
            corrected: value.correctDCI
          });
        }
      });
      
      normalizedText = normalizedText.replace(regex, value.correctDCI);
    }
  });
  
  // 2. Normaliser les termes médicaux
  Object.entries(MEDICAL_TERMS_NORMALIZATION).forEach(([french, english]) => {
    const regex = new RegExp(`\\b${french}\\b`, 'gi');
    
    if (regex.test(normalizedText)) {
      corrections.push({
        type: 'medical_term',
        original: french,
        corrected: english
      });
      
      normalizedText = normalizedText.replace(regex, english);
    }
  });
  
  // 3. Normaliser les dosages
  Object.entries(DOSAGE_NORMALIZATION).forEach(([french, english]) => {
    const regex = new RegExp(`\\b${french}\\b`, 'gi');
    
    if (regex.test(normalizedText)) {
      corrections.push({
        type: 'dosage',
        original: french,
        corrected: english
      });
      
      normalizedText = normalizedText.replace(regex, english);
    }
  });
  
  // 4. Calculer le score de confiance
  const totalWords = transcriptionText.split(/\s+/).length;
  const correctionRate = corrections.length / Math.max(totalWords, 1);
  const confidence = Math.max(0, Math.min(100, 100 - (correctionRate * 100)));
  
  console.log(`✅ Normalization complete: ${corrections.length} corrections made`);
  console.log(`   Confidence: ${confidence.toFixed(1)}%`);
  
  return {
    originalText: transcriptionText,
    normalizedText,
    corrections,
    confidence
  };
}

/**
 * Normalise spécifiquement les noms de médicaments
 */
export function normalizeMedicationName(medicationName: string): {
  normalized: string;
  originalWasIncorrect: boolean;
  brandName?: string;
} {
  const lowerName = medicationName.toLowerCase().trim();
  
  // Chercher dans le dictionnaire
  for (const [key, value] of Object.entries(MEDICATION_NORMALIZATION_MAP)) {
    // Check DCI
    if (lowerName === key || lowerName === value.correctDCI.toLowerCase()) {
      return {
        normalized: value.correctDCI,
        originalWasIncorrect: lowerName !== value.correctDCI.toLowerCase()
      };
    }
    
    // Check misspellings
    if (value.commonMisspellings.some(ms => ms.toLowerCase() === lowerName)) {
      return {
        normalized: value.correctDCI,
        originalWasIncorrect: true
      };
    }
    
    // Check brand names
    const matchingBrand = value.brandNames.find(bn => bn.toLowerCase() === lowerName);
    if (matchingBrand) {
      return {
        normalized: value.correctDCI,
        originalWasIncorrect: false,
        brandName: matchingBrand
      };
    }
  }
  
  // Pas trouvé - retourner tel quel avec avertissement
  console.warn(`⚠️ Medication not in dictionary: ${medicationName}`);
  return {
    normalized: medicationName,
    originalWasIncorrect: false
  };
}

/**
 * Valide et normalise une liste de médicaments
 */
export function normalizeMedicationList(medications: string[]): Array<{
  original: string;
  normalized: string;
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
}> {
  return medications.map(med => {
    const result = normalizeMedicationName(med);
    
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let warning: string | undefined;
    
    if (result.originalWasIncorrect) {
      confidence = 'medium';
      warning = `Corrected from "${med}" to "${result.normalized}"`;
    }
    
    if (!MEDICATION_NORMALIZATION_MAP[result.normalized.toLowerCase()]) {
      confidence = 'low';
      warning = `Medication "${result.normalized}" not in standard dictionary`;
    }
    
    return {
      original: med,
      normalized: result.normalized,
      confidence,
      warning
    };
  });
}
