// /lib/medical-knowledge-base.ts - STRUCTURED MEDICAL KNOWLEDGE

/**
 * MEDICAL KNOWLEDGE BASE - STRUCTURED PROTOCOLS
 * 
 * This database contains HARD RULES that MUST be enforced
 * regardless of what GPT-4 generates.
 * 
 * Priority: CRITICAL - These rules prevent fatal medical errors
 */

export interface MedicalProtocol {
  diagnosis: string
  icd10_codes: string[]
  required_investigations: Array<{
    test: string
    timing: string[]
    critical: boolean
    interpretation?: string
    justification: string
  }>
  required_medications: Array<{
    drug: string
    dci: string
    dose: string
    timing: string
    critical: boolean
    justification: string
  }>
  contraindicated_medications: string[]
  specialist_referral: {
    specialty: string
    urgency: 'emergency' | 'urgent' | 'routine'
    timeframe: string
    required: boolean
  }
  red_flags: string[]
}

export const MEDICAL_PROTOCOLS: Record<string, MedicalProtocol> = {
  
  // ==================== ACUTE CORONARY SYNDROME ====================
  'ACS': {
    diagnosis: 'Acute Coronary Syndrome',
    icd10_codes: ['I20.0', 'I21.0', 'I21.1', 'I21.2', 'I21.3', 'I21.4'],
    
    required_investigations: [
      {
        test: 'Troponin hs (high-sensitivity)',
        timing: ['T0 (baseline)', 'T1h (1 hour)', 'T3h (3 hours)'],
        critical: true,
        interpretation: 'Δ >50% increase = NSTEMI',
        justification: 'ESC Guidelines 2023 - Essential for NSTEMI diagnosis'
      },
      {
        test: '12-lead ECG',
        timing: ['STAT (immediate)'],
        critical: true,
        interpretation: 'ST elevation ≥1mm in 2 contiguous leads = STEMI',
        justification: 'Identify STEMI requiring immediate PCI'
      },
      {
        test: 'U&E (Urea and Electrolytes) + eGFR',
        timing: ['STAT'],
        critical: true,
        justification: 'Renal function for Fondaparinux/LMWH dosing'
      },
      {
        test: 'Lipid profile (Total cholesterol, LDL, HDL, Triglycerides)',
        timing: ['Within 24 hours'],
        critical: true,
        justification: 'Risk stratification and statin therapy guidance'
      },
      {
        test: 'HbA1c + Glucose',
        timing: ['Within 24 hours'],
        critical: true,
        justification: 'Screen for diabetes (major ACS risk factor)'
      },
      {
        test: 'Full Blood Count (FBC)',
        timing: ['STAT'],
        critical: true,
        justification: 'Rule out anemia (Hb <10 g/dL = transfusion)'
      },
      {
        test: 'Coagulation screen (PT/INR, APTT)',
        timing: ['STAT'],
        critical: true,
        justification: 'Baseline before anticoagulation (INR >1.5 = caution)'
      },
      {
        test: 'Chest X-ray',
        timing: ['Within 24 hours'],
        critical: false,
        justification: 'Rule out complications (pulmonary edema, pneumothorax)'
      }
    ],
    
    required_medications: [
      {
        drug: 'Aspirin',
        dci: 'Aspirin',
        dose: '300mg',
        timing: 'STAT (loading dose)',
        critical: true,
        justification: 'ESC Guidelines 2023 - Immediate antiplatelet therapy'
      },
      {
        drug: 'Ticagrelor',
        dci: 'Ticagrelor',
        dose: '180mg',
        timing: 'STAT (loading dose)',
        critical: true,
        justification: 'ESC Guidelines 2023 - Dual antiplatelet therapy (DAPT)'
      },
      {
        drug: 'Atorvastatin',
        dci: 'Atorvastatin',
        dose: '80mg',
        timing: 'OD (daily)',
        critical: true,
        justification: 'High-intensity statin for LDL reduction'
      }
    ],
    
    contraindicated_medications: [
      'Ibuprofen',
      'Diclofenac',
      'Naproxen',
      'Celecoxib',
      'Indomethacin',
      'Ketorolac'
    ],
    
    specialist_referral: {
      specialty: 'Cardiology',
      urgency: 'emergency',
      timeframe: '24-48 hours',
      required: true
    },
    
    red_flags: [
      'ST elevation on ECG (immediate PCI within 120 minutes)',
      'Cardiogenic shock (immediate ICU)',
      'Ventricular arrhythmias',
      'Acute heart failure',
      'Persistent chest pain despite treatment'
    ]
  },
  
  // ==================== STROKE / CVA ====================
  'STROKE': {
    diagnosis: 'Cerebrovascular Accident (Stroke)',
    icd10_codes: ['I63.0', 'I63.1', 'I63.2', 'I63.3', 'I63.4', 'I63.5'],
    
    required_investigations: [
      {
        test: 'CT Brain (non-contrast)',
        timing: ['STAT (within 1 hour)'],
        critical: true,
        interpretation: 'Hemorrhage vs infarction - determines thrombolysis eligibility',
        justification: 'NICE CG68 - Essential for acute stroke management'
      },
      {
        test: 'Blood glucose',
        timing: ['STAT'],
        critical: true,
        justification: 'Hypoglycemia can mimic stroke symptoms'
      },
      {
        test: 'Full Blood Count (FBC)',
        timing: ['STAT'],
        critical: true,
        justification: 'Rule out thrombocytopenia before thrombolysis'
      },
      {
        test: 'Coagulation screen (PT/INR, APTT)',
        timing: ['STAT'],
        critical: true,
        justification: 'Assess bleeding risk before thrombolysis'
      },
      {
        test: 'U&E + eGFR',
        timing: ['STAT'],
        critical: true,
        justification: 'Renal function assessment'
      },
      {
        test: 'ECG',
        timing: ['STAT'],
        critical: true,
        justification: 'Identify atrial fibrillation (cardioembolic source)'
      }
    ],
    
    required_medications: [],  // Depends on ischemic vs hemorrhagic
    
    contraindicated_medications: [
      'Ibuprofen',
      'Diclofenac',
      'Naproxen',
      'Aspirin (if hemorrhagic stroke)'
    ],
    
    specialist_referral: {
      specialty: 'Neurology / Stroke Unit',
      urgency: 'emergency',
      timeframe: 'Immediate',
      required: true
    },
    
    red_flags: [
      'Symptom onset <4.5 hours (thrombolysis window)',
      'Decreased consciousness',
      'Seizures',
      'Rapidly worsening symptoms'
    ]
  },
  
  // ==================== PULMONARY EMBOLISM ====================
  'PE': {
    diagnosis: 'Pulmonary Embolism',
    icd10_codes: ['I26.0', 'I26.9'],
    
    required_investigations: [
      {
        test: 'D-Dimer',
        timing: ['STAT'],
        critical: true,
        interpretation: '<500 ng/mL = PE unlikely (if Wells score ≤4)',
        justification: 'NICE CG144 - Risk stratification'
      },
      {
        test: 'CT Pulmonary Angiography (CTPA)',
        timing: ['STAT (if D-Dimer positive)'],
        critical: true,
        interpretation: 'Definitive diagnosis of PE',
        justification: 'Gold standard for PE diagnosis'
      },
      {
        test: 'ABG (Arterial Blood Gas)',
        timing: ['STAT'],
        critical: true,
        justification: 'Assess hypoxemia and acid-base status'
      },
      {
        test: 'ECG',
        timing: ['STAT'],
        critical: true,
        interpretation: 'S1Q3T3 pattern suggests PE (low sensitivity)',
        justification: 'Rule out MI, identify RV strain'
      },
      {
        test: 'Troponin',
        timing: ['STAT'],
        critical: true,
        justification: 'Elevated troponin = RV dysfunction (poor prognosis)'
      },
      {
        test: 'U&E + eGFR',
        timing: ['STAT'],
        critical: true,
        justification: 'Renal function for anticoagulation dosing'
      }
    ],
    
    required_medications: [
      {
        drug: 'LMWH (Low Molecular Weight Heparin)',
        dci: 'Enoxaparin',
        dose: '1mg/kg BD or 1.5mg/kg OD',
        timing: 'STAT',
        critical: true,
        justification: 'Immediate anticoagulation (ESC Guidelines 2019)'
      }
    ],
    
    contraindicated_medications: [
      'NSAIDs (if on anticoagulation)'
    ],
    
    specialist_referral: {
      specialty: 'Respiratory Medicine / Acute Medicine',
      urgency: 'emergency',
      timeframe: 'Immediate',
      required: true
    },
    
    red_flags: [
      'Massive PE (hypotension, shock)',
      'Submassive PE (RV dysfunction on echo/troponin elevation)',
      'Severe hypoxemia (SpO2 <90%)',
      'Cardiac arrest'
    ]
  }
}

/**
 * Check if diagnosis matches a known critical protocol
 */
export function getCriticalProtocol(diagnosis: string): MedicalProtocol | null {
  const diagnosisLower = diagnosis.toLowerCase()
  
  // ACS detection
  if (diagnosisLower.includes('acs') || 
      diagnosisLower.includes('coronary') ||
      diagnosisLower.includes('stemi') ||
      diagnosisLower.includes('nstemi') ||
      diagnosisLower.includes('myocardial infarction') ||
      diagnosisLower.includes('angina')) {
    return MEDICAL_PROTOCOLS['ACS']
  }
  
  // Stroke detection
  if (diagnosisLower.includes('stroke') ||
      diagnosisLower.includes('cva') ||
      diagnosisLower.includes('cerebrovascular') ||
      diagnosisLower.includes('tia')) {
    return MEDICAL_PROTOCOLS['STROKE']
  }
  
  // PE detection
  if (diagnosisLower.includes('pulmonary embolism') ||
      diagnosisLower.includes('embolie pulmonaire')) {
    return MEDICAL_PROTOCOLS['PE']
  }
  
  return null
}

/**
 * Enforce medical protocol on analysis
 * This MUST be called BEFORE saving the analysis
 */
export function enforceProtocol(analysis: any, protocol: MedicalProtocol): {
  enforced: boolean
  changes: string[]
  criticalIssues: string[]
} {
  const changes: string[] = []
  const criticalIssues: string[] = []
  
  // 1. FORCE required investigations
  for (const investigation of protocol.required_investigations) {
    const exists = analysis.investigation_strategy?.laboratory_tests?.some(
      (test: any) => test.test_name?.toLowerCase().includes(investigation.test.toLowerCase())
    )
    
    if (!exists && investigation.critical) {
      changes.push(`ADDED CRITICAL: ${investigation.test}`)
      if (!analysis.investigation_strategy) analysis.investigation_strategy = {}
      if (!analysis.investigation_strategy.laboratory_tests) {
        analysis.investigation_strategy.laboratory_tests = []
      }
      analysis.investigation_strategy.laboratory_tests.push({
        test_name: investigation.test,
        clinical_justification: investigation.justification,
        expected_results: {},
        urgency: 'urgent',
        timing: investigation.timing.join(', ')
      })
    }
  }
  
  // 2. BLOCK contraindicated medications
  if (analysis.treatment_plan?.medications) {
    const originalCount = analysis.treatment_plan.medications.length
    analysis.treatment_plan.medications = analysis.treatment_plan.medications.filter(
      (med: any) => {
        const medName = (med?.medication_name || med?.drug || med?.dci || '').toLowerCase()
        const isContraindicated = protocol.contraindicated_medications.some(
          contra => medName.includes(contra.toLowerCase())
        )
        
        if (isContraindicated) {
          criticalIssues.push(`BLOCKED CONTRAINDICATED: ${medName} in ${protocol.diagnosis}`)
          return false
        }
        return true
      }
    )
    
    if (analysis.treatment_plan.medications.length < originalCount) {
      changes.push(`REMOVED ${originalCount - analysis.treatment_plan.medications.length} contraindicated medications`)
    }
  }
  
  // 3. FORCE required medications
  if (!analysis.treatment_plan) analysis.treatment_plan = {}
  if (!analysis.treatment_plan.medications) analysis.treatment_plan.medications = []
  
  for (const medication of protocol.required_medications) {
    const exists = analysis.treatment_plan.medications.some(
      (med: any) => (med?.dci || med?.drug || '').toLowerCase().includes(medication.dci.toLowerCase())
    )
    
    if (!exists && medication.critical) {
      changes.push(`ADDED CRITICAL: ${medication.drug} ${medication.dose}`)
      analysis.treatment_plan.medications.push({
        medication_name: `${medication.drug} ${medication.dose}`,
        drug: `${medication.drug} ${medication.dose}`,
        dci: medication.dci,
        indication: medication.justification,
        why_prescribed: medication.justification,
        how_to_take: `${medication.timing}`,
        duration: 'As prescribed',
        contraindications: '',
        side_effects: '',
        monitoring: 'Regular monitoring required'
      })
    }
  }
  
  // 4. FORCE specialist referral
  if (!analysis.follow_up_plan) analysis.follow_up_plan = {}
  if (protocol.specialist_referral.required) {
    analysis.follow_up_plan.specialist_referral = {
      required: true,
      specialty: protocol.specialist_referral.specialty,
      urgency: protocol.specialist_referral.urgency,
      reason: `${protocol.diagnosis} requiring ${protocol.specialist_referral.urgency} specialist review`,
      timeframe: protocol.specialist_referral.timeframe
    }
    changes.push(`FORCED SPECIALIST REFERRAL: ${protocol.specialist_referral.specialty} (${protocol.specialist_referral.urgency})`)
  }
  
  return {
    enforced: true,
    changes,
    criticalIssues
  }
}
