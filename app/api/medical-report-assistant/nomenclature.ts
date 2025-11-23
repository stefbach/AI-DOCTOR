// app/api/medical-report-assistant/nomenclature.ts
// Nomenclature stricte pour examens de laboratoire et imagerie

export interface LabTestNomenclature {
  code: string
  name: string
  category: 'hematology' | 'biochemistry' | 'immunology' | 'microbiology' | 'endocrinology'
  aliases: string[]
  sampleType: string
  tubeType: string
  fastingRequired: boolean
  clinicalIndications: string[]
  turnaroundTime: string
}

export interface ImagingNomenclature {
  code: string
  name: string
  modality: 'x-ray' | 'ct' | 'mri' | 'ultrasound' | 'nuclear-medicine'
  bodyPart: string
  aliases: string[]
  clinicalIndications: string[]
  contraindications: string[]
  pregnancySafe: boolean
}

// ==================== LABORATORY TESTS NOMENCLATURE ====================
export const LAB_TESTS_NOMENCLATURE: LabTestNomenclature[] = [
  // HEMATOLOGY
  {
    code: 'FBC',
    name: 'Full Blood Count (Complete Blood Count)',
    category: 'hematology',
    aliases: ['NFS', 'hemogramme', 'CBC', 'blood count', 'hémogramme complet'],
    sampleType: 'Whole blood',
    tubeType: 'EDTA (Purple/Lavender top)',
    fastingRequired: false,
    clinicalIndications: [
      'Anemia screening',
      'Infection investigation',
      'Bleeding disorders',
      'Routine health check',
      'Pre-operative assessment'
    ],
    turnaroundTime: '2-4 hours'
  },
  {
    code: 'ESR',
    name: 'Erythrocyte Sedimentation Rate (ESR)',
    category: 'hematology',
    aliases: ['VS', 'vitesse de sédimentation', 'sed rate'],
    sampleType: 'Whole blood',
    tubeType: 'EDTA (Purple/Lavender top)',
    fastingRequired: false,
    clinicalIndications: [
      'Inflammatory conditions',
      'Autoimmune diseases',
      'Infection monitoring',
      'Cancer screening'
    ],
    turnaroundTime: '1 hour'
  },

  // BIOCHEMISTRY
  {
    code: 'HBA1C',
    name: 'Glycated Hemoglobin (HbA1c)',
    category: 'biochemistry',
    aliases: ['hemoglobine glyquée', 'A1C', 'glycohemoglobin'],
    sampleType: 'Whole blood',
    tubeType: 'EDTA (Purple/Lavender top)',
    fastingRequired: false,
    clinicalIndications: [
      'Diabetes diagnosis',
      'Glycemic control monitoring (3-month average)',
      'Diabetes management',
      'Pre-diabetes screening'
    ],
    turnaroundTime: '24 hours'
  },
  {
    code: 'FBG',
    name: 'Fasting Blood Glucose',
    category: 'biochemistry',
    aliases: ['glycémie à jeun', 'fasting sugar', 'FBS'],
    sampleType: 'Serum/Plasma',
    tubeType: 'Grey top (Fluoride/Oxalate)',
    fastingRequired: true,
    clinicalIndications: [
      'Diabetes screening',
      'Hypoglycemia investigation',
      'Metabolic syndrome assessment'
    ],
    turnaroundTime: '1-2 hours'
  },
  {
    code: 'LIPID_PROFILE',
    name: 'Lipid Profile (Complete)',
    category: 'biochemistry',
    aliases: ['bilan lipidique', 'cholesterol panel', 'profil lipidique complet'],
    sampleType: 'Serum',
    tubeType: 'Red top (No additive)',
    fastingRequired: true,
    clinicalIndications: [
      'Cardiovascular risk assessment',
      'Dyslipidemia diagnosis',
      'Statin therapy monitoring',
      'Metabolic syndrome evaluation'
    ],
    turnaroundTime: '4-6 hours'
  },
  {
    code: 'CREAT',
    name: 'Serum Creatinine',
    category: 'biochemistry',
    aliases: ['créatinine', 'creatinine sérique'],
    sampleType: 'Serum',
    tubeType: 'Red top (No additive)',
    fastingRequired: false,
    clinicalIndications: [
      'Renal function assessment',
      'Drug dosing adjustment',
      'Chronic kidney disease monitoring',
      'Pre-operative evaluation'
    ],
    turnaroundTime: '2-4 hours'
  },
  {
    code: 'eGFR',
    name: 'Estimated Glomerular Filtration Rate',
    category: 'biochemistry',
    aliases: ['DFG', 'débit de filtration glomérulaire', 'GFR'],
    sampleType: 'Calculated from creatinine',
    tubeType: 'Red top (No additive)',
    fastingRequired: false,
    clinicalIndications: [
      'Chronic kidney disease staging',
      'Renal function assessment',
      'Drug dosing in renal impairment'
    ],
    turnaroundTime: '2-4 hours'
  },
  {
    code: 'LFT',
    name: 'Liver Function Tests (Complete Panel)',
    category: 'biochemistry',
    aliases: ['bilan hépatique', 'hepatic panel', 'fonction hépatique'],
    sampleType: 'Serum',
    tubeType: 'Red top (No additive)',
    fastingRequired: false,
    clinicalIndications: [
      'Liver disease screening',
      'Hepatotoxic drug monitoring',
      'Jaundice investigation',
      'Chronic liver disease follow-up'
    ],
    turnaroundTime: '4-6 hours'
  },

  // IMMUNOLOGY
  {
    code: 'CRP',
    name: 'C-Reactive Protein (CRP)',
    category: 'immunology',
    aliases: ['protéine C réactive', 'CRP quantitative'],
    sampleType: 'Serum',
    tubeType: 'Red top (No additive)',
    fastingRequired: false,
    clinicalIndications: [
      'Acute inflammation',
      'Bacterial infection vs viral',
      'Post-operative infection monitoring',
      'Cardiovascular risk (high-sensitivity CRP)'
    ],
    turnaroundTime: '2-4 hours'
  },
  {
    code: 'DENGUE_NS1',
    name: 'Dengue NS1 Antigen',
    category: 'immunology',
    aliases: ['dengue rapid test', 'NS1 antigen', 'dengue antigen'],
    sampleType: 'Serum',
    tubeType: 'Red top (No additive)',
    fastingRequired: false,
    clinicalIndications: [
      'Early dengue fever diagnosis (Day 1-7)',
      'Acute febrile illness in endemic areas'
    ],
    turnaroundTime: '30 minutes (Rapid test)'
  },

  // MICROBIOLOGY
  {
    code: 'URINE_CS',
    name: 'Urine Culture & Sensitivity',
    category: 'microbiology',
    aliases: ['ECBU', 'urine culture', 'culture urine'],
    sampleType: 'Clean-catch midstream urine',
    tubeType: 'Sterile urine container',
    fastingRequired: false,
    clinicalIndications: [
      'Urinary tract infection confirmation',
      'Antibiotic selection',
      'Recurrent UTI investigation',
      'Pyelonephritis'
    ],
    turnaroundTime: '48-72 hours'
  },
  {
    code: 'BLOOD_CULTURE',
    name: 'Blood Culture (Aerobic & Anaerobic)',
    category: 'microbiology',
    aliases: ['hémoculture', 'culture sanguine', 'blood C&S'],
    sampleType: 'Venous blood (2 sets minimum)',
    tubeType: 'Blood culture bottles (Aerobic + Anaerobic)',
    fastingRequired: false,
    clinicalIndications: [
      'Sepsis investigation',
      'Fever of unknown origin',
      'Endocarditis',
      'Bacteremia'
    ],
    turnaroundTime: '48-72 hours'
  },

  // ENDOCRINOLOGY
  {
    code: 'TSH',
    name: 'Thyroid Stimulating Hormone (TSH)',
    category: 'endocrinology',
    aliases: ['thyréostimuline', 'thyroid function', 'TSH ultrasensible'],
    sampleType: 'Serum',
    tubeType: 'Red top (No additive)',
    fastingRequired: false,
    clinicalIndications: [
      'Thyroid disorder screening',
      'Hypothyroidism diagnosis',
      'Hyperthyroidism diagnosis',
      'Thyroid replacement therapy monitoring'
    ],
    turnaroundTime: '24 hours'
  }
]

// ==================== IMAGING STUDIES NOMENCLATURE ====================
export const IMAGING_NOMENCLATURE: ImagingNomenclature[] = [
  // X-RAY
  {
    code: 'CXR',
    name: 'Chest X-Ray (PA & Lateral)',
    modality: 'x-ray',
    bodyPart: 'Chest/Thorax',
    aliases: ['radiographie thoracique', 'chest radiograph', 'radio poumons'],
    clinicalIndications: [
      'Respiratory infection (pneumonia)',
      'Chronic cough investigation',
      'Dyspnea assessment',
      'Pre-operative screening',
      'Tuberculosis screening'
    ],
    contraindications: ['Pregnancy (unless urgent)'],
    pregnancySafe: false,
    turnaroundTime: '30 minutes'
  },
  {
    code: 'AXR',
    name: 'Abdominal X-Ray (Supine & Erect)',
    modality: 'x-ray',
    bodyPart: 'Abdomen',
    aliases: ['radiographie abdominale', 'ASP', 'abdomen plain film'],
    clinicalIndications: [
      'Acute abdominal pain',
      'Bowel obstruction',
      'Perforation (free air)',
      'Foreign body',
      'Renal/ureteric stones'
    ],
    contraindications: ['Pregnancy (unless life-threatening)'],
    pregnancySafe: false,
    turnaroundTime: '30 minutes'
  },

  // ULTRASOUND
  {
    code: 'US_ABD',
    name: 'Abdominal Ultrasound (Complete)',
    modality: 'ultrasound',
    bodyPart: 'Abdomen',
    aliases: ['échographie abdominale', 'abdominal US', 'echo abdomen'],
    clinicalIndications: [
      'Hepatobiliary disease',
      'Renal pathology',
      'Abdominal pain investigation',
      'Ascites assessment',
      'Abdominal mass'
    ],
    contraindications: [],
    pregnancySafe: true,
    turnaroundTime: '24-48 hours'
  },
  {
    code: 'US_PELVIS',
    name: 'Pelvic Ultrasound (Transabdominal)',
    modality: 'ultrasound',
    bodyPart: 'Pelvis',
    aliases: ['échographie pelvienne', 'pelvic US', 'echo pelvis'],
    clinicalIndications: [
      'Gynecological disorders',
      'Pregnancy assessment',
      'Pelvic pain',
      'Bladder pathology',
      'Ovarian cysts'
    ],
    contraindications: [],
    pregnancySafe: true,
    turnaroundTime: '24-48 hours'
  },

  // CT SCAN
  {
    code: 'CT_HEAD',
    name: 'CT Brain (Non-contrast)',
    modality: 'ct',
    bodyPart: 'Head/Brain',
    aliases: ['scanner cérébral', 'CT brain', 'brain CT'],
    clinicalIndications: [
      'Head trauma',
      'Stroke investigation (acute)',
      'Severe headache',
      'Loss of consciousness',
      'Seizures (new onset)'
    ],
    contraindications: ['Pregnancy', 'Contrast allergy (if contrast needed)'],
    pregnancySafe: false,
    turnaroundTime: '2-4 hours (Emergency: 30 min)'
  },
  {
    code: 'CT_ABD_PELVIS',
    name: 'CT Abdomen & Pelvis (With Contrast)',
    modality: 'ct',
    bodyPart: 'Abdomen & Pelvis',
    aliases: ['scanner abdomino-pelvien', 'CT abdomen pelvis'],
    clinicalIndications: [
      'Acute abdomen',
      'Appendicitis',
      'Malignancy staging',
      'Trauma',
      'Abscess/collection'
    ],
    contraindications: ['Pregnancy', 'Severe renal impairment (eGFR <30)', 'Contrast allergy'],
    pregnancySafe: false,
    turnaroundTime: '4-6 hours'
  },

  // MRI
  {
    code: 'MRI_BRAIN',
    name: 'MRI Brain (With & Without Contrast)',
    modality: 'mri',
    bodyPart: 'Brain',
    aliases: ['IRM cérébrale', 'brain MRI'],
    clinicalIndications: [
      'Brain tumor investigation',
      'Multiple sclerosis',
      'Stroke (subacute)',
      'Complex neurological disorders',
      'Detailed brain pathology'
    ],
    contraindications: ['Pacemaker', 'Metallic implants', 'Cochlear implants', 'Claustrophobia (severe)'],
    pregnancySafe: true,
    turnaroundTime: '24-48 hours'
  }
]

// ==================== HELPER FUNCTIONS ====================

/**
 * Find lab test by name or alias (fuzzy matching)
 */
export function findLabTest(searchTerm: string): LabTestNomenclature | null {
  const normalized = searchTerm.toLowerCase().trim()
  
  return LAB_TESTS_NOMENCLATURE.find(test => {
    if (test.code.toLowerCase() === normalized) return true
    if (test.name.toLowerCase().includes(normalized)) return true
    return test.aliases.some(alias => alias.toLowerCase().includes(normalized))
  }) || null
}

/**
 * Find imaging study by name or alias (fuzzy matching)
 */
export function findImagingStudy(searchTerm: string): ImagingNomenclature | null {
  const normalized = searchTerm.toLowerCase().trim()
  
  return IMAGING_NOMENCLATURE.find(img => {
    if (img.code.toLowerCase() === normalized) return true
    if (img.name.toLowerCase().includes(normalized)) return true
    return img.aliases.some(alias => alias.toLowerCase().includes(normalized))
  }) || null
}

/**
 * Validate lab test against nomenclature
 */
export function validateLabTest(testName: string): {
  valid: boolean
  standardized?: LabTestNomenclature
  suggestion?: string
} {
  const found = findLabTest(testName)
  
  if (found) {
    return {
      valid: true,
      standardized: found
    }
  }
  
  // Find closest match
  const closestMatch = LAB_TESTS_NOMENCLATURE.find(test => 
    test.aliases.some(alias => 
      alias.toLowerCase().includes(testName.toLowerCase()) ||
      testName.toLowerCase().includes(alias.toLowerCase())
    )
  )
  
  if (closestMatch) {
    return {
      valid: false,
      suggestion: closestMatch.name
    }
  }
  
  return {
    valid: false,
    suggestion: 'Test non reconnu - vérifier nomenclature'
  }
}

/**
 * Validate imaging study against nomenclature
 */
export function validateImagingStudy(studyName: string): {
  valid: boolean
  standardized?: ImagingNomenclature
  suggestion?: string
} {
  const found = findImagingStudy(studyName)
  
  if (found) {
    return {
      valid: true,
      standardized: found
    }
  }
  
  // Find closest match
  const closestMatch = IMAGING_NOMENCLATURE.find(img => 
    img.aliases.some(alias => 
      alias.toLowerCase().includes(studyName.toLowerCase()) ||
      studyName.toLowerCase().includes(alias.toLowerCase())
    )
  )
  
  if (closestMatch) {
    return {
      valid: false,
      suggestion: closestMatch.name
    }
  }
  
  return {
    valid: false,
    suggestion: 'Examen non reconnu - vérifier nomenclature'
  }
}
