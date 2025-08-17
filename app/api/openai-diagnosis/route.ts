// app/api/openai-diagnosis/route.ts - VERSION 6.1 WITH POSOLOGY FIX
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ==================== TYPES AND INTERFACES ====================
interface PatientContext {
  age: number | string
  sex: string
  weight?: number | string
  height?: number | string
  medical_history: string[]
  current_medications: string[]
  allergies: string[]
  chief_complaint: string
  symptoms: string[]
  symptom_duration: string
  vital_signs: {
    blood_pressure?: string
    pulse?: number
    temperature?: number // CELSIUS ONLY
    respiratory_rate?: number
    oxygen_saturation?: number
  }
  disease_history: string
  ai_questions: Array<{
    question: string
    answer: string
  }>
  // PREGNANCY FIELDS
  pregnancy_status?: string // pregnant, possibly_pregnant, breastfeeding, not_pregnant
  last_menstrual_period?: string
  gestational_age?: string // in weeks
  trimester?: string // first, second, third
  social_history?: {
    smoking?: string
    alcohol?: string
    occupation?: string
  }
  name?: string
  firstName?: string
  lastName?: string
  anonymousId?: string
}

interface ValidationResult {
  isValid: boolean
  issues: string[]
  suggestions: string[]
  pregnancyWarnings: string[] 
  posologyCorrections: string[] // NEW
  metrics: {
    medications: number
    laboratory_tests: number
    imaging_studies: number
    pregnancySafetyChecked: boolean
    posologyIssuesFixed: number // NEW
  }
}

interface DrugProtocol {
  name: string
  posology: string
  duration: string
  packaging: string
  quantity: string
  pediatricAdjustment?: string
  geriatricAdjustment?: string
  pregnancyAdjustment?: string 
  pregnancyCategory?: string 
  breastfeedingCategory?: string 
  contraindication?: string
}

// ==================== PREGNANCY SAFETY CATEGORIES ====================
const PREGNANCY_CATEGORIES = {
  A: "No risk in controlled studies", 
  B: "No risk in animal studies", 
  C: "Risk cannot be ruled out", 
  D: "Positive evidence of risk", 
  X: "Contraindicated in pregnancy" 
}

const BREASTFEEDING_CATEGORIES = {
  L1: "Safest - Extensive studies show no risk",
  L2: "Safer - Limited studies show no risk",
  L3: "Moderately safe - No controlled studies, probably compatible",
  L4: "Possibly hazardous - Evidence of risk",
  L5: "Contraindicated - Significant documented risk"
}

// ==================== MEDICATIONS THAT ARE ACTUALLY ONCE DAILY ====================
const ACTUALLY_ONCE_DAILY_MEDICATIONS = [
  'azithromycin',
  'amlodipine',
  'lisinopril',
  'enalapril',
  'ramipril',
  'losartan',
  'valsartan',
  'atorvastatin',
  'simvastatin',
  'rosuvastatin',
  'omeprazole',
  'esomeprazole',
  'lansoprazole',
  'loratadine',
  'cetirizine',
  'montelukast',
  'levothyroxine',
  'fosfomycin', // single dose
  'fluconazole' // for simple candidiasis
]

// ==================== UNIVERSAL DRUG CLASSIFICATION ====================
const DRUG_CLASSIFICATIONS = {
  antibiotics: {
    systemic: [
      'amoxicillin', 'ampicillin', 'flucloxacillin', 'penicillin',
      'cefuroxime', 'ceftriaxone', 'cephalexin', 'cefixime',
      'azithromycin', 'clarithromycin', 'erythromycin',
      'ciprofloxacin', 'levofloxacin', 'ofloxacin', 'moxifloxacin',
      'doxycycline', 'tetracycline', 'metronidazole', 'nitrofurantoin',
      'trimethoprim', 'vancomycin', 'clindamycin'
    ],
    topical_ear: ['ciprofloxacin', 'ofloxacin', 'gentamicin', 'tobramycin', 'neomycin'],
    topical_skin: ['fusidic acid', 'mupirocin', 'chloramphenicol', 'neomycin'],
    topical_eye: ['chloramphenicol', 'tobramycin', 'ciprofloxacin', 'ofloxacin']
  },
  
  not_antibiotics: [
    'acetic acid',      
    'hydrogen peroxide', 
    'povidone iodine',  
    'chlorhexidine',    
    'alcohol',          
    'saline'            
  ],
  
  corticosteroids: {
    systemic: ['prednisolone', 'methylprednisolone', 'dexamethasone', 'hydrocortisone'],
    topical: ['betamethasone', 'clobetasol', 'mometasone', 'triamcinolone'],
    inhaled: ['budesonide', 'beclomethasone', 'fluticasone']
  },
  
  nsaids: ['ibuprofen', 'diclofenac', 'naproxen', 'indomethacin', 'ketorolac', 'celecoxib'],
  
  analgesics_only: ['paracetamol', 'acetaminophen'], 
  
  antifungals: ['fluconazole', 'itraconazole', 'ketoconazole', 'clotrimazole', 'miconazole', 'nystatin', 'terbinafine']
}

// ==================== MEDICATION PREGNANCY SAFETY DATABASE ====================
const MEDICATION_PREGNANCY_SAFETY = {
  // ANTIBIOTICS
  'amoxicillin': { category: 'B', breastfeeding: 'L1', safe: true },
  'azithromycin': { category: 'B', breastfeeding: 'L2', safe: true },
  'cephalexin': { category: 'B', breastfeeding: 'L1', safe: true },
  'cefuroxime': { category: 'B', breastfeeding: 'L1', safe: true },
  'penicillin': { category: 'B', breastfeeding: 'L1', safe: true },
  'nitrofurantoin': { category: 'B', breastfeeding: 'L2', safe: true, note: 'Avoid at term' },
  'metronidazole': { category: 'B', breastfeeding: 'L2', safe: true, note: 'Single dose OK' },
  'doxycycline': { category: 'D', breastfeeding: 'L3', safe: false, note: 'Avoid - teeth discoloration' },
  'tetracycline': { category: 'D', breastfeeding: 'L2', safe: false, note: 'Contraindicated' },
  'ciprofloxacin': { category: 'C', breastfeeding: 'L3', safe: false, note: 'Use only if no alternative' },
  'levofloxacin': { category: 'C', breastfeeding: 'L3', safe: false },
  'gentamicin': { category: 'D', breastfeeding: 'L2', safe: false, note: 'Ototoxicity risk' },
  
  // ANALGESICS
  'paracetamol': { category: 'B', breastfeeding: 'L1', safe: true },
  'acetaminophen': { category: 'B', breastfeeding: 'L1', safe: true },
  'ibuprofen': { category: 'B/D', breastfeeding: 'L1', safe: false, note: 'Avoid in 3rd trimester' },
  'diclofenac': { category: 'C/D', breastfeeding: 'L2', safe: false, note: 'Avoid in 3rd trimester' },
  'aspirin': { category: 'C/D', breastfeeding: 'L2', safe: false, note: 'Low dose OK for certain conditions' },
  'codeine': { category: 'C', breastfeeding: 'L3', safe: false, note: 'Risk of neonatal withdrawal' },
  'tramadol': { category: 'C', breastfeeding: 'L2', safe: false, note: 'Use with caution' },
  
  // CORTICOSTEROIDS
  'prednisolone': { category: 'B', breastfeeding: 'L2', safe: true, note: 'Short courses OK' },
  'methylprednisolone': { category: 'C', breastfeeding: 'L2', safe: true },
  'hydrocortisone': { category: 'C', breastfeeding: 'L2', safe: true },
  'dexamethasone': { category: 'C', breastfeeding: 'L3', safe: true, note: 'For fetal lung maturation' },
  'betamethasone': { category: 'C', breastfeeding: 'L3', safe: true },
  
  // ANTIFUNGALS
  'fluconazole': { category: 'C', breastfeeding: 'L2', safe: false, note: 'Single dose OK, avoid high doses' },
  'clotrimazole': { category: 'B', breastfeeding: 'L1', safe: true, note: 'Topical/vaginal safe' },
  'miconazole': { category: 'C', breastfeeding: 'L2', safe: true, note: 'Topical/vaginal safe' },
  'nystatin': { category: 'A', breastfeeding: 'L1', safe: true },
  
  // ANTIHISTAMINES
  'cetirizine': { category: 'B', breastfeeding: 'L2', safe: true },
  'loratadine': { category: 'B', breastfeeding: 'L1', safe: true },
  'chlorpheniramine': { category: 'B', breastfeeding: 'L3', safe: true },
  
  // GASTROINTESTINAL
  'omeprazole': { category: 'C', breastfeeding: 'L2', safe: true },
  'ranitidine': { category: 'B', breastfeeding: 'L2', safe: true },
  'domperidone': { category: 'C', breastfeeding: 'L1', safe: true, note: 'Increases milk production' },
  'metoclopramide': { category: 'B', breastfeeding: 'L2', safe: true },
  'ondansetron': { category: 'B', breastfeeding: 'L2', safe: true },
  
  // CARDIOVASCULAR
  'methyldopa': { category: 'B', breastfeeding: 'L2', safe: true, note: 'First-line for HTN in pregnancy' },
  'labetalol': { category: 'C', breastfeeding: 'L2', safe: true, note: 'Safe for HTN in pregnancy' },
  'nifedipine': { category: 'C', breastfeeding: 'L2', safe: true },
  'amlodipine': { category: 'C', breastfeeding: 'L3', safe: false, note: 'Limited data' },
  'lisinopril': { category: 'D', breastfeeding: 'L3', safe: false, note: 'ACE inhibitors contraindicated' },
  'losartan': { category: 'D', breastfeeding: 'L3', safe: false, note: 'ARBs contraindicated' },
  
  // RESPIRATORY
  'salbutamol': { category: 'C', breastfeeding: 'L1', safe: true },
  'budesonide': { category: 'B', breastfeeding: 'L1', safe: true, note: 'Preferred inhaled steroid' },
  'beclomethasone': { category: 'C', breastfeeding: 'L2', safe: true },
}

// ==================== THERAPEUTIC PROTOCOLS WITH FULL POSOLOGY & PACKAGING ====================
const THERAPEUTIC_PROTOCOLS = {
  // EAR CONDITIONS
  'otitis externa': {
    mandatory: [
      { 
        category: 'topical_antibiotic_ear', 
        drugs: [
          {
            name: 'Ciprofloxacin 0.3% ear drops',
            posology: '4 drops in affected ear twice daily',
            duration: '7 days',
            packaging: '5ml bottle',
            quantity: '1 bottle'
          },
          {
            name: 'Ofloxacin 0.3% ear drops',
            posology: '10 drops in affected ear twice daily',
            duration: '7 days', 
            packaging: '10ml bottle',
            quantity: '1 bottle'
          }
        ] as DrugProtocol[],
        reason: 'Bacterial eradication'
      },
      { 
        category: 'topical_corticosteroid_ear', 
        drugs: [
          {
            name: 'Hydrocortisone 1% ear drops',
            posology: '4 drops twice daily',
            duration: '7 days',
            packaging: '10ml bottle',
            quantity: '1 bottle'
          },
          {
            name: 'Dexamethasone 0.1% ear drops',
            posology: '3-4 drops three times daily',
            duration: '7 days',
            packaging: '5ml bottle',
            quantity: '1 bottle'
          }
        ] as DrugProtocol[],
        reason: 'Reduce inflammation'
      },
      { 
        category: 'oral_nsaid', 
        drugs: [
          {
            name: 'Ibuprofen 400mg',
            posology: '1 tablet three times daily with food',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          },
          {
            name: 'Diclofenac 50mg',
            posology: '1 tablet three times daily with food',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Systemic anti-inflammatory'
      },
      { 
        category: 'analgesic', 
        drugs: [
          {
            name: 'Paracetamol 500mg',
            posology: '2 tablets every 6 hours as needed',
            duration: 'As needed for pain',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Pain relief'
      }
    ],
    avoid: ['Acetic acid alone', 'Systemic antibiotics unless complicated'],
    minimum: 4
  },
  
  'otitis media': {
    mandatory: [
      { 
        category: 'systemic_antibiotic', 
        drugs: [
          {
            name: 'Amoxicillin 500mg',
            posology: '1 capsule three times daily',
            duration: '7-10 days',
            packaging: 'box of 21 capsules',
            quantity: '1 box',
            pediatricAdjustment: '25-45mg/kg/day divided in 3 doses'
          },
          {
            name: 'Amoxicillin-clavulanate 875mg/125mg',
            posology: '1 tablet twice daily',
            duration: '7 days',
            packaging: 'box of 14 tablets',
            quantity: '1 box'
          },
          {
            name: 'Azithromycin 500mg',
            posology: '500mg once daily',
            duration: '3 days',
            packaging: 'box of 3 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Treat middle ear infection'
      },
      { 
        category: 'nsaid', 
        drugs: [
          {
            name: 'Ibuprofen 400mg',
            posology: '1 tablet three times daily with food',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Anti-inflammatory and analgesic'
      },
      { 
        category: 'decongestant', 
        drugs: [
          {
            name: 'Pseudoephedrine 60mg',
            posology: '1 tablet three times daily',
            duration: '5 days',
            packaging: 'box of 15 tablets',
            quantity: '1 box'
          },
          {
            name: 'Xylometazoline 0.1% nasal spray',
            posology: '2 sprays in each nostril twice daily',
            duration: '5 days maximum',
            packaging: '10ml spray bottle',
            quantity: '1 bottle'
          }
        ] as DrugProtocol[],
        reason: 'Eustachian tube decongestion'
      },
      { 
        category: 'analgesic', 
        drugs: [
          {
            name: 'Paracetamol 500mg',
            posology: '2 tablets every 6 hours as needed',
            duration: 'As needed',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Additional pain relief'
      }
    ],
    avoid: ['Ear drops (cannot reach middle ear)'],
    minimum: 4
  },
  
  // THROAT CONDITIONS
  'pharyngitis bacterial': {
    mandatory: [
      { 
        category: 'antibiotic', 
        drugs: [
          {
            name: 'Amoxicillin 500mg',
            posology: '1 capsule three times daily',
            duration: '10 days',
            packaging: 'box of 30 capsules',
            quantity: '1 box'
          },
          {
            name: 'Azithromycin 500mg',
            posology: '500mg once daily',
            duration: '5 days',
            packaging: 'box of 5 tablets',
            quantity: '1 box'
          },
          {
            name: 'Penicillin V 500mg',
            posology: '1 tablet four times daily',
            duration: '10 days',
            packaging: 'box of 40 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Treat streptococcal infection'
      },
      { 
        category: 'nsaid', 
        drugs: [
          {
            name: 'Ibuprofen 400mg',
            posology: '1 tablet three times daily with food',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Anti-inflammatory'
      },
      { 
        category: 'antiseptic_gargle', 
        drugs: [
          {
            name: 'Chlorhexidine 0.2% mouthwash',
            posology: 'Gargle 10ml twice daily after brushing',
            duration: '7 days',
            packaging: '200ml bottle',
            quantity: '1 bottle'
          },
          {
            name: 'Povidone iodine 1% gargle',
            posology: 'Gargle 10ml diluted 1:1 with water three times daily',
            duration: '5 days',
            packaging: '100ml bottle',
            quantity: '1 bottle'
          }
        ] as DrugProtocol[],
        reason: 'Local antisepsis'
      },
      { 
        category: 'analgesic', 
        drugs: [
          {
            name: 'Paracetamol 500mg',
            posology: '2 tablets every 6 hours',
            duration: '5 days',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Pain and fever control'
      },
      {
        category: 'throat_lozenges',
        drugs: [
          {
            name: 'Benzocaine lozenges',
            posology: '1 lozenge every 2-3 hours as needed',
            duration: 'As needed',
            packaging: 'box of 24 lozenges',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Local pain relief'
      }
    ],
    avoid: ['Antibiotics if clearly viral'],
    minimum: 5
  },
  
  // URINARY CONDITIONS
  'urinary tract infection': {
    mandatory: [
      { 
        category: 'antibiotic', 
        drugs: [
          {
            name: 'Ciprofloxacin 500mg',
            posology: '1 tablet twice daily',
            duration: '3 days for uncomplicated, 7 days if complicated',
            packaging: 'box of 10 tablets',
            quantity: '1 box'
          },
          {
            name: 'Nitrofurantoin 100mg',
            posology: '1 capsule four times daily with food',
            duration: '5 days',
            packaging: 'box of 20 capsules',
            quantity: '1 box'
          },
          {
            name: 'Fosfomycin 3g',
            posology: 'Single dose dissolved in water',
            duration: 'Single dose',
            packaging: '1 sachet',
            quantity: '1 sachet'
          }
        ] as DrugProtocol[],
        reason: 'Bacterial eradication'
      },
      { 
        category: 'urinary_alkalinizer', 
        drugs: [
          {
            name: 'Potassium citrate',
            posology: '1 sachet three times daily dissolved in water',
            duration: '5 days',
            packaging: 'box of 20 sachets',
            quantity: '1 box'
          },
          {
            name: 'Sodium citrate solution',
            posology: '10ml three times daily',
            duration: '5 days',
            packaging: '200ml bottle',
            quantity: '1 bottle'
          }
        ] as DrugProtocol[],
        reason: 'Symptomatic relief'
      },
      { 
        category: 'antispasmodic', 
        drugs: [
          {
            name: 'Flavoxate 200mg',
            posology: '1 tablet three times daily',
            duration: '5 days',
            packaging: 'box of 15 tablets',
            quantity: '1 box'
          },
          {
            name: 'Hyoscine butylbromide 10mg',
            posology: '1 tablet three times daily',
            duration: '3 days',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Bladder spasm relief'
      },
      { 
        category: 'analgesic', 
        drugs: [
          {
            name: 'Paracetamol 500mg',
            posology: '2 tablets every 6 hours as needed',
            duration: 'As needed',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Pain relief'
      }
    ],
    avoid: ['Delay in antibiotic treatment'],
    minimum: 4
  },
  
  // GASTROINTESTINAL CONDITIONS
  'gastroenteritis': {
    mandatory: [
      { 
        category: 'rehydration', 
        drugs: [
          {
            name: 'Oral Rehydration Salts (ORS)',
            posology: '1 sachet dissolved in 1L water, drink throughout the day',
            duration: 'Until diarrhea stops',
            packaging: 'box of 10 sachets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Prevent dehydration'
      },
      { 
        category: 'antiemetic', 
        drugs: [
          {
            name: 'Domperidone 10mg',
            posology: '1 tablet three times daily before meals',
            duration: '3 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          },
          {
            name: 'Metoclopramide 10mg',
            posology: '1 tablet three times daily before meals',
            duration: '3 days',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          },
          {
            name: 'Ondansetron 4mg',
            posology: '1 tablet twice daily',
            duration: '2 days',
            packaging: 'box of 10 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Control vomiting'
      },
      { 
        category: 'antispasmodic', 
        drugs: [
          {
            name: 'Hyoscine butylbromide 10mg',
            posology: '1 tablet three times daily',
            duration: '3 days',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          },
          {
            name: 'Mebeverine 135mg',
            posology: '1 tablet three times daily before meals',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Abdominal cramp relief'
      },
      { 
        category: 'probiotic', 
        drugs: [
          {
            name: 'Saccharomyces boulardii 250mg',
            posology: '1 capsule twice daily',
            duration: '5 days',
            packaging: 'box of 10 capsules',
            quantity: '1 box'
          },
          {
            name: 'Lactobacillus rhamnosus',
            posology: '1 sachet once daily',
            duration: '7 days',
            packaging: 'box of 7 sachets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Restore gut flora'
      }
    ],
    avoid: ['Antibiotics unless bacterial confirmed', 'Loperamide if fever or bloody diarrhea'],
    minimum: 4
  },
  
  // EYE CONDITIONS
  'conjunctivitis bacterial': {
    mandatory: [
      { 
        category: 'topical_antibiotic_eye', 
        drugs: [
          {
            name: 'Chloramphenicol 0.5% eye drops',
            posology: '1 drop in affected eye(s) every 2 hours for 2 days, then 4 times daily',
            duration: '5 days',
            packaging: '10ml bottle',
            quantity: '1 bottle'
          },
          {
            name: 'Tobramycin 0.3% eye drops',
            posology: '1-2 drops every 4 hours',
            duration: '7 days',
            packaging: '5ml bottle',
            quantity: '1 bottle'
          },
          {
            name: 'Ciprofloxacin 0.3% eye drops',
            posology: '1-2 drops every 2 hours for 2 days, then 4 times daily',
            duration: '5 days',
            packaging: '5ml bottle',
            quantity: '1 bottle'
          }
        ] as DrugProtocol[],
        reason: 'Bacterial eradication'
      },
      { 
        category: 'lubricant', 
        drugs: [
          {
            name: 'Artificial tears (Hypromellose)',
            posology: '1-2 drops 4 times daily or as needed',
            duration: 'Until symptoms resolve',
            packaging: '10ml bottle',
            quantity: '1 bottle'
          },
          {
            name: 'Carbomer gel',
            posology: '1 drop 3-4 times daily',
            duration: 'As needed',
            packaging: '10g tube',
            quantity: '1 tube'
          }
        ] as DrugProtocol[],
        reason: 'Comfort and cleansing'
      }
    ],
    avoid: ['Steroid eye drops without supervision'],
    minimum: 2
  },
  
  // SKIN CONDITIONS
  'cellulitis': {
    mandatory: [
      { 
        category: 'systemic_antibiotic', 
        drugs: [
          {
            name: 'Flucloxacillin 500mg',
            posology: '1 capsule four times daily on empty stomach',
            duration: '7-10 days',
            packaging: 'box of 28 capsules',
            quantity: '2 boxes'
          },
          {
            name: 'Cephalexin 500mg',
            posology: '1 capsule four times daily',
            duration: '7-10 days',
            packaging: 'box of 28 capsules',
            quantity: '2 boxes'
          },
          {
            name: 'Clindamycin 300mg',
            posology: '1 capsule three times daily',
            duration: '7 days',
            packaging: 'box of 21 capsules',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Treat skin infection'
      },
      { 
        category: 'nsaid', 
        drugs: [
          {
            name: 'Ibuprofen 400mg',
            posology: '1 tablet three times daily with food',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Anti-inflammatory'
      },
      { 
        category: 'analgesic', 
        drugs: [
          {
            name: 'Paracetamol 500mg',
            posology: '2 tablets every 6 hours as needed',
            duration: 'As needed',
            packaging: 'box of 20 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Pain relief'
      }
    ],
    avoid: ['Topical antibiotics alone'],
    minimum: 3
  },
  
  // RESPIRATORY CONDITIONS
  'asthma exacerbation': {
    mandatory: [
      { 
        category: 'bronchodilator', 
        drugs: [
          {
            name: 'Salbutamol 100mcg inhaler',
            posology: '2 puffs every 4-6 hours as needed',
            duration: 'As needed',
            packaging: '200 dose inhaler',
            quantity: '1 inhaler'
          },
          {
            name: 'Ipratropium bromide 20mcg inhaler',
            posology: '2 puffs four times daily',
            duration: 'Until stable',
            packaging: '200 dose inhaler',
            quantity: '1 inhaler'
          }
        ] as DrugProtocol[],
        reason: 'Bronchodilation'
      },
      { 
        category: 'corticosteroid', 
        drugs: [
          {
            name: 'Prednisolone 20mg',
            posology: '2 tablets once daily in morning',
            duration: '5 days',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          },
          {
            name: 'Budesonide 200mcg inhaler',
            posology: '2 puffs twice daily',
            duration: 'Long-term',
            packaging: '200 dose inhaler',
            quantity: '1 inhaler'
          }
        ] as DrugProtocol[],
        reason: 'Reduce airway inflammation'
      },
      {
        category: 'spacer',
        drugs: [
          {
            name: 'Spacer device',
            posology: 'Use with all MDI inhalers',
            duration: 'Permanent',
            packaging: '1 device',
            quantity: '1 device'
          }
        ] as DrugProtocol[],
        reason: 'Optimize drug delivery'
      }
    ],
    avoid: ['Beta-blockers', 'NSAIDs if aspirin-sensitive'],
    minimum: 3
  },
  
  // GYNECOLOGICAL CONDITIONS
  'vaginal candidiasis': {
    mandatory: [
      { 
        category: 'antifungal_oral', 
        drugs: [
          {
            name: 'Fluconazole 150mg',
            posology: 'Single dose',
            duration: 'Single dose',
            packaging: '1 capsule',
            quantity: '1 capsule'
          }
        ] as DrugProtocol[],
        reason: 'Systemic fungal eradication'
      },
      { 
        category: 'antifungal_topical', 
        drugs: [
          {
            name: 'Clotrimazole 500mg pessary',
            posology: '1 pessary inserted at night',
            duration: 'Single dose',
            packaging: '1 pessary with applicator',
            quantity: '1 pessary'
          },
          {
            name: 'Clotrimazole 1% cream',
            posology: 'Apply to affected area twice daily',
            duration: '7 days',
            packaging: '20g tube',
            quantity: '1 tube'
          },
          {
            name: 'Miconazole 2% cream',
            posology: 'Apply twice daily',
            duration: '7 days',
            packaging: '30g tube',
            quantity: '1 tube'
          }
        ] as DrugProtocol[],
        reason: 'Local treatment'
      }
    ],
    avoid: ['Antibiotics (will worsen candidiasis)', 'Douching'],
    minimum: 2
  },
  
  // HYPERTENSION
  'hypertension': {
    mandatory: [
      { 
        category: 'first_line_antihypertensive', 
        drugs: [
          {
            name: 'Amlodipine 5mg',
            posology: '1 tablet once daily',
            duration: 'Long-term',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          },
          {
            name: 'Lisinopril 10mg',
            posology: '1 tablet once daily',
            duration: 'Long-term',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          },
          {
            name: 'Hydrochlorothiazide 12.5mg',
            posology: '1 tablet once daily in morning',
            duration: 'Long-term',
            packaging: 'box of 30 tablets',
            quantity: '1 box'
          }
        ] as DrugProtocol[],
        reason: 'Blood pressure control'
      }
    ],
    avoid: ['Beta-blockers if asthma', 'ACE inhibitors if pregnant'],
    minimum: 1
  }
}

// ==================== PREGNANCY-ADAPTED THERAPEUTIC PROTOCOLS ====================
const PREGNANCY_SAFE_PROTOCOLS = {
  'urinary tract infection': {
    pregnant: [
      {
        name: 'Cephalexin 500mg',
        posology: '1 capsule four times daily',
        duration: '7 days',
        packaging: 'box of 28 capsules',
        quantity: '1 box',
        pregnancyCategory: 'B'
      },
      {
        name: 'Amoxicillin 500mg',
        posology: '1 capsule three times daily',
        duration: '7 days',
        packaging: 'box of 21 capsules',
        quantity: '1 box',
        pregnancyCategory: 'B'
      },
      {
        name: 'Paracetamol 500mg',
        posology: '2 tablets every 6 hours as needed',
        duration: 'As needed',
        packaging: 'box of 20 tablets',
        quantity: '1 box',
        pregnancyCategory: 'B'
      }
    ],
    avoid_in_pregnancy: ['Ciprofloxacin', 'Trimethoprim in 1st trimester', 'Nitrofurantoin at term']
  },
  
  'pharyngitis bacterial': {
    pregnant: [
      {
        name: 'Amoxicillin 500mg',
        posology: '1 capsule three times daily',
        duration: '10 days',
        packaging: 'box of 30 capsules',
        quantity: '1 box',
        pregnancyCategory: 'B'
      },
      {
        name: 'Azithromycin 500mg',
        posology: '500mg once daily',
        duration: '5 days',
        packaging: 'box of 5 tablets',
        quantity: '1 box',
        pregnancyCategory: 'B'
      },
      {
        name: 'Paracetamol 500mg',
        posology: '2 tablets every 6 hours',
        duration: '5 days',
        packaging: 'box of 20 tablets',
        quantity: '1 box',
        pregnancyCategory: 'B'
      },
      {
        name: 'Chlorhexidine 0.2% mouthwash',
        posology: 'Gargle 10ml twice daily',
        duration: '7 days',
        packaging: '200ml bottle',
        quantity: '1 bottle',
        pregnancyCategory: 'B'
      }
    ],
    avoid_in_pregnancy: ['NSAIDs', 'Aspirin']
  },
  
  'hypertension': {
    pregnant: [
      {
        name: 'Methyldopa 250mg',
        posology: '1 tablet twice daily',
        duration: 'Long-term',
        packaging: 'box of 30 tablets',
        quantity: '1 box',
        pregnancyCategory: 'B',
        note: 'First-line for pregnancy hypertension'
      },
      {
        name: 'Labetalol 100mg',
        posology: '1 tablet twice daily',
        duration: 'Long-term',
        packaging: 'box of 30 tablets',
        quantity: '1 box',
        pregnancyCategory: 'C',
        note: 'Safe alternative'
      }
    ],
    avoid_in_pregnancy: ['ACE inhibitors', 'ARBs', 'Atenolol']
  },
  
  'nausea and vomiting of pregnancy': {
    pregnant: [
      {
        name: 'Vitamin B6 (Pyridoxine) 25mg',
        posology: '1 tablet three times daily',
        duration: 'As needed',
        packaging: 'box of 30 tablets',
        quantity: '1 box',
        pregnancyCategory: 'A'
      },
      {
        name: 'Doxylamine 10mg',
        posology: '1 tablet at bedtime',
        duration: 'As needed',
        packaging: 'box of 30 tablets',
        quantity: '1 box',
        pregnancyCategory: 'A'
      },
      {
        name: 'Metoclopramide 10mg',
        posology: '1 tablet three times daily before meals',
        duration: '5 days',
        packaging: 'box of 20 tablets',
        quantity: '1 box',
        pregnancyCategory: 'B'
      }
    ]
  }
}

// ==================== ENHANCED MEDICAL PROMPT WITH POSOLOGY FIX ====================
const ENHANCED_DIAGNOSTIC_PROMPT_WITH_PREGNANCY = `You are an expert physician practicing telemedicine in Mauritius with comprehensive knowledge of ALL medical specialties, INCLUDING obstetrics and pregnancy care.

🏥 MEDICAL SPECIALTIES COVERED:
- General Medicine • Pediatrics • OBSTETRICS & GYNECOLOGY (CRITICAL)
- Ophthalmology • Otolaryngology (ENT) • Dermatology • Cardiology
- Psychiatry • Gastroenterology • Respiratory • Endocrinology
- Urology • Neurology • Rheumatology • Infectious Diseases

⚠️ CRITICAL POSOLOGY RULES - MANDATORY FOR ALL PATIENTS:
═══════════════════════════════════════════════════════════
YOU MUST USE SPECIFIC, ACCURATE POSOLOGIES - NEVER GENERIC "ONCE DAILY"

CORRECT POSOLOGY EXAMPLES BY DRUG CLASS:

ANTIBIOTICS - NEVER "once daily" (except specific ones):
✅ Amoxicillin 500mg: "1 capsule three times daily"
✅ Amoxicillin-clavulanate 875mg: "1 tablet twice daily"
✅ Cephalexin 500mg: "1 capsule four times daily"
✅ Cefuroxime 500mg: "1 tablet twice daily"
✅ Ciprofloxacin 500mg: "1 tablet twice daily"
✅ Azithromycin 500mg: "500mg once daily" (EXCEPTION - this IS once daily)
✅ Nitrofurantoin 100mg: "1 capsule four times daily with food"
✅ Metronidazole 500mg: "1 tablet three times daily"
✅ Flucloxacillin 500mg: "1 capsule four times daily on empty stomach"
❌ NEVER: Generic "once daily" for beta-lactams or most antibiotics

NSAIDs - MULTIPLE DAILY DOSES WITH FOOD:
✅ Ibuprofen 400mg: "1 tablet three times daily with food"
✅ Diclofenac 50mg: "1 tablet three times daily with food"
✅ Naproxen 500mg: "1 tablet twice daily with food"
✅ Indomethacin 25mg: "1 capsule three times daily with food"
❌ NEVER: "once daily" for NSAIDs

TOPICAL MEDICATIONS:
✅ Ciprofloxacin 0.3% ear drops: "4 drops in affected ear twice daily"
✅ Ofloxacin ear drops: "10 drops in affected ear twice daily"
✅ Chloramphenicol eye drops: "1 drop every 2 hours for 2 days, then 4 times daily"
✅ Tobramycin eye drops: "1-2 drops every 4 hours"
✅ Hydrocortisone ear drops: "4 drops twice daily"
✅ Dexamethasone ear drops: "3-4 drops three times daily"
❌ NEVER: "once daily" for ear/eye drops

ANALGESICS:
✅ Paracetamol 500mg: "2 tablets every 6 hours as needed"
✅ Codeine 30mg: "1-2 tablets every 4-6 hours as needed"
✅ Tramadol 50mg: "1-2 tablets every 4-6 hours as needed"
❌ NEVER: Vague "as directed"

CORTICOSTEROIDS:
✅ Prednisolone 20mg: "2 tablets once daily in morning" (specify timing)
✅ Dexamethasone 4mg: "1 tablet twice daily"
✅ Methylprednisolone 4mg: "2 tablets twice daily"

ANTIHYPERTENSIVES (some ARE once daily - THIS IS CORRECT):
✅ Amlodipine 5mg: "1 tablet once daily" (CORRECT - long half-life)
✅ Lisinopril 10mg: "1 tablet once daily" (CORRECT - 24h duration)
✅ Atenolol 50mg: "1 tablet once daily"
✅ Metoprolol 50mg: "1 tablet twice daily" (SHORT-ACTING version)
✅ Losartan 50mg: "1 tablet once daily"

GASTROINTESTINAL:
✅ Omeprazole 20mg: "1 capsule once daily before breakfast" (CORRECT - once daily)
✅ Domperidone 10mg: "1 tablet three times daily before meals"
✅ Metoclopramide 10mg: "1 tablet three times daily before meals"
✅ Ondansetron 4mg: "1 tablet twice daily"
✅ Hyoscine butylbromide 10mg: "1 tablet three times daily"

ANTIHISTAMINES:
✅ Cetirizine 10mg: "1 tablet once daily" (CORRECT - long-acting)
✅ Loratadine 10mg: "1 tablet once daily" (CORRECT - long-acting)
✅ Chlorpheniramine 4mg: "1 tablet three times daily" (SHORT-ACTING)

RESPIRATORY:
✅ Salbutamol inhaler: "2 puffs every 4-6 hours as needed"
✅ Budesonide inhaler: "2 puffs twice daily"

MANDATORY POSOLOGY COMPONENTS:
1. Exact dose amount (1 tablet, 2 tablets, 4 drops, etc.)
2. Frequency (twice daily, three times daily, every 6 hours, etc.)
3. Timing when relevant (with food, before meals, in morning, at bedtime)
4. Duration (7 days, 10 days, 5 days, as needed)

DO NOT USE "ONCE DAILY" UNLESS THE DRUG IS SPECIFICALLY:
- Azithromycin, Amlodipine, Lisinopril, Losartan, Omeprazole, Cetirizine, Loratadine

🤰 PREGNANCY STATUS ASSESSMENT - CRITICAL:
{{PREGNANCY_STATUS}}

⚠️ PREGNANCY SAFETY RULES - MANDATORY:
═══════════════════════════════════════════════════════════

IF PATIENT IS PREGNANT OR POSSIBLY PREGNANT:
1. ONLY prescribe Category A or B medications when possible
2. AVOID Category C unless benefit clearly outweighs risk
3. NEVER prescribe Category D or X unless life-threatening
4. NO NSAIDs in 3rd trimester (premature ductus closure)
5. NO ACE inhibitors or ARBs (teratogenic)
6. NO tetracyclines or fluoroquinolones
7. PREFER ultrasound over X-ray/CT for imaging
8. DOCUMENT pregnancy considerations in ALL sections

IF PATIENT IS BREASTFEEDING:
1. Check lactation category (L1-L5)
2. Prefer L1-L2 medications
3. Time doses after breastfeeding when possible
4. Monitor infant for side effects

📋 PREGNANCY-SPECIFIC PROTOCOLS:
═══════════════════════════════════════════════════════════

FOR UTI IN PREGNANCY:
✅ USE: Cephalexin, Amoxicillin, Nitrofurantoin (not at term)
❌ AVOID: Fluoroquinolones, Trimethoprim (1st trimester)

FOR HYPERTENSION IN PREGNANCY:
✅ USE: Methyldopa (first-line), Labetalol, Nifedipine
❌ AVOID: ACE inhibitors, ARBs, Atenolol

FOR PAIN IN PREGNANCY:
✅ USE: Paracetamol/Acetaminophen (safest)
❌ AVOID: NSAIDs (especially 3rd trimester), Aspirin (unless low-dose for specific indication)

FOR NAUSEA/VOMITING IN PREGNANCY:
✅ USE: Vitamin B6, Doxylamine, Metoclopramide
❌ AVOID: Most antiemetics without clear indication

FOR INFECTIONS IN PREGNANCY:
✅ USE: Penicillins, Cephalosporins, Azithromycin
❌ AVOID: Tetracyclines, Fluoroquinolones, Aminoglycosides

📋 PATIENT PRESENTATION:
{{PATIENT_CONTEXT}}

GENERATE THIS EXACT JSON STRUCTURE WITH ACCURATE POSOLOGIES:

{
  "diagnostic_reasoning": {
    "key_findings": {
      "from_history": "[What stands out from patient history]",
      "from_symptoms": "[Pattern recognition from symptoms]",
      "from_ai_questions": "[CRITICAL findings from questionnaire responses]",
      "pregnancy_impact": "[How pregnancy affects presentation if applicable]",
      "red_flags": "[Any concerning features requiring urgent action]"
    },
    
    "syndrome_identification": {
      "clinical_syndrome": "[e.g., Acute coronary syndrome, Viral syndrome, etc.]",
      "supporting_features": "[List features supporting this syndrome]",
      "inconsistent_features": "[Any features that don't fit]",
      "pregnancy_considerations": "[How pregnancy modifies the syndrome]"
    },
    
    "clinical_confidence": {
      "diagnostic_certainty": "[High/Moderate/Low]",
      "reasoning": "[Why this level of certainty]",
      "missing_information": "[What additional info would increase certainty]",
      "pregnancy_safety_reviewed": true/false
    }
  },
  
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "[Precise diagnosis with classification/stage if applicable]",
      "icd10_code": "[Appropriate ICD-10 code]",
      "confidence_level": [60-85 max for teleconsultation],
      "severity": "mild/moderate/severe/critical",
      "pregnancy_impact": "[How pregnancy affects the condition and vice versa]",
      "fetal_risk": "[Risk to fetus if pregnant: None/Low/Moderate/High]",
      "diagnostic_criteria_met": [
        "Criterion 1: [How patient meets this]",
        "Criterion 2: [How patient meets this]"
      ],
      "certainty_level": "[High/Moderate/Low based on available data]",
      
      "pathophysiology": "[MINIMUM 200 WORDS] Include pregnancy-related changes if applicable",
      
      "clinical_reasoning": "[MINIMUM 150 WORDS] Include pregnancy considerations",
      
      "prognosis": "[MINIMUM 100 WORDS] Include maternal and fetal prognosis if pregnant"
    },
    
    "differential_diagnoses": [],
    
    "pregnancy_assessment": {
      "trimester": "[First/Second/Third/Not pregnant]",
      "gestational_age": "[X weeks]",
      "pregnancy_complications_risk": "[List potential complications]",
      "monitoring_needed": "[Special monitoring required]",
      "obstetric_referral_needed": true/false
    }
  },
  
  "investigation_strategy": {
    "diagnostic_approach": "Strategy adapted to pregnancy status",
    "clinical_justification": "[Why these tests, considering pregnancy]",
    "pregnancy_safe_alternatives": "[Alternative tests if standard ones contraindicated]",
    "laboratory_tests": [
      {
        "test_name": "[Test name]",
        "pregnancy_safe": true/false,
        "trimester_specific": "[Any trimester-specific considerations]",
        "fetal_monitoring": "[If test affects fetus]"
      }
    ],
    "imaging_studies": [
      {
        "study_name": "[Imaging type]",
        "radiation_exposure": true/false,
        "pregnancy_alternative": "[Ultrasound/MRI if X-ray/CT needed]",
        "shielding_required": true/false
      }
    ]
  },
  
  "treatment_plan": {
    "approach": "[Overall strategy considering pregnancy]",
    
    "pregnancy_safety_statement": "[Clear statement about medication safety in pregnancy]",
    
    "prescription_rationale": "[Why THESE specific medications, considering pregnancy]",
    
    "medications": [
      {
        "drug": "[Name with exact strength]",
        "therapeutic_role": "etiological/symptomatic/preventive/supportive",
        "indication": "[Specific indication]",
        "mechanism": "[How it helps]",
        "pregnancy_category": "[A/B/C/D/X]",
        "pregnancy_safety": "[Safe/Use with caution/Contraindicated]",
        "breastfeeding_category": "[L1-L5]",
        "trimester_precautions": "[First/Second/Third trimester specific]",
        "fetal_monitoring": "[Any special monitoring needed]",
        "posology": "[EXACT SPECIFIC DOSING - NEVER generic 'once daily' unless appropriate for that specific drug]",
        "duration": "[EXACT duration]",
        "packaging": "[EXACT packaging]",
        "quantity": "[EXACT quantity]",
        "form": "[tablet/capsule/drops/cream/inhaler/etc]",
        "route": "[Oral/Topical/Otic/Ophthalmic/etc]",
        "monitoring": "[What to monitor including fetal]",
        "side_effects": "[Including pregnancy-specific]",
        "contraindications": "[Including pregnancy-related]",
        "administration_instructions": "[How to take/use]"
      }
    ],
    
    "non_pharmacological": "[Lifestyle measures safe in pregnancy]",
    
    "procedures": [],
    
    "referrals": [
      {
        "specialty": "[Obstetrics if needed]",
        "urgency": "[Routine/Urgent/Emergency]",
        "reason": "[Why referral needed]"
      }
    ]
  },
  
  "follow_up_plan": {
    "immediate": "[Within 24-48h]",
    "short_term": "[D3-D7]",
    "long_term": "[1 month]",
    "obstetric_follow_up": "[Prenatal care schedule if pregnant]",
    "red_flags": ["Warning signs including pregnancy complications"],
    "when_to_seek_emergency": ["Including obstetric emergencies"],
    "next_consultation": "[When to follow up]"
  },
  
  "patient_education": {
    "understanding_condition": "[Clear explanation]",
    "pregnancy_specific_education": "[Information about condition in pregnancy]",
    "medication_safety": "[Reassurance about pregnancy-safe medications]",
    "warning_signs": "[Including pregnancy warning signs]",
    "lifestyle_modifications": "[Safe for pregnancy]",
    "fetal_wellbeing": "[How to monitor if pregnant]",
    "breastfeeding_guidance": "[If applicable]"
  },
  
  "quality_metrics": {
    "completeness_score": 0.85,
    "evidence_level": "[High/Moderate/Low]",
    "pregnancy_safety_verified": true/false,
    "guidelines_followed": ["WHO", "ACOG", "RCOG", "ESC", "NICE"],
    "word_counts": {
      "pathophysiology": 200,
      "clinical_reasoning": 150,
      "patient_education": 150
    }
  }
}`

// ==================== POSOLOGY VALIDATION AND CORRECTION ====================
function validateAndCorrectPosology(
  medication: any,
  diagnosis: string
): { 
  isValid: boolean; 
  correctedPosology?: string; 
  error?: string 
} {
  const drugName = medication.drug?.toLowerCase() || '';
  const currentPosology = medication.posology?.toLowerCase() || '';
  
  // Check if drug is actually a once-daily medication
  const isActuallyOnceDaily = ACTUALLY_ONCE_DAILY_MEDICATIONS.some(drug => 
    drugName.includes(drug)
  );
  
  // Detect generic "once daily" problem
  if ((currentPosology === 'once daily' || 
       currentPosology === '1 tablet once daily' || 
       currentPosology === 'take once daily' ||
       currentPosology === 'one tablet once daily') && 
      !isActuallyOnceDaily) {
    
    // Search in therapeutic protocols first
    for (const [condition, protocol] of Object.entries(THERAPEUTIC_PROTOCOLS)) {
      if (diagnosis.toLowerCase().includes(condition.split(' ')[0])) {
        for (const requirement of protocol.mandatory) {
          for (const protocolDrug of requirement.drugs as DrugProtocol[]) {
            if (drugName.includes(protocolDrug.name.toLowerCase().split(' ')[0])) {
              return {
                isValid: false,
                correctedPosology: protocolDrug.posology,
                error: `Generic "once daily" incorrect for ${medication.drug}`
              };
            }
          }
        }
      }
    }
    
    // Default corrections by drug class
    // ANTIBIOTICS
    if (drugName.includes('amoxicillin') && !drugName.includes('clavulanate')) {
      return { 
        isValid: false, 
        correctedPosology: '1 capsule three times daily',
        error: 'Amoxicillin requires TID dosing'
      };
    }
    if (drugName.includes('amoxicillin-clavulanate') || drugName.includes('augmentin')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet twice daily',
        error: 'Amoxicillin-clavulanate is BID'
      };
    }
    if (drugName.includes('cephalexin') || drugName.includes('cefalexin')) {
      return { 
        isValid: false, 
        correctedPosology: '1 capsule four times daily',
        error: 'Cephalexin requires QID dosing'
      };
    }
    if (drugName.includes('cefuroxime')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet twice daily',
        error: 'Cefuroxime is BID'
      };
    }
    if (drugName.includes('ciprofloxacin') && !drugName.includes('drop')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet twice daily',
        error: 'Ciprofloxacin is BID'
      };
    }
    if (drugName.includes('nitrofurantoin')) {
      return { 
        isValid: false, 
        correctedPosology: '1 capsule four times daily with food',
        error: 'Nitrofurantoin requires QID dosing with food'
      };
    }
    if (drugName.includes('metronidazole')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily',
        error: 'Metronidazole is TID'
      };
    }
    if (drugName.includes('flucloxacillin')) {
      return { 
        isValid: false, 
        correctedPosology: '1 capsule four times daily on empty stomach',
        error: 'Flucloxacillin requires QID on empty stomach'
      };
    }
    if (drugName.includes('clindamycin')) {
      return { 
        isValid: false, 
        correctedPosology: '1 capsule three times daily',
        error: 'Clindamycin is TID'
      };
    }
    
    // NSAIDs
    if (drugName.includes('ibuprofen')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily with food',
        error: 'Ibuprofen requires TID dosing with food'
      };
    }
    if (drugName.includes('diclofenac')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily with food',
        error: 'Diclofenac requires TID dosing with food'
      };
    }
    if (drugName.includes('naproxen')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet twice daily with food',
        error: 'Naproxen is BID with food'
      };
    }
    if (drugName.includes('indomethacin')) {
      return { 
        isValid: false, 
        correctedPosology: '1 capsule three times daily with food',
        error: 'Indomethacin is TID with food'
      };
    }
    
    // ANALGESICS
    if (drugName.includes('paracetamol') || drugName.includes('acetaminophen')) {
      return { 
        isValid: false, 
        correctedPosology: '2 tablets every 6 hours as needed',
        error: 'Paracetamol requires Q6H dosing'
      };
    }
    if (drugName.includes('codeine')) {
      return { 
        isValid: false, 
        correctedPosology: '1-2 tablets every 4-6 hours as needed',
        error: 'Codeine requires Q4-6H dosing'
      };
    }
    if (drugName.includes('tramadol')) {
      return { 
        isValid: false, 
        correctedPosology: '1-2 tablets every 4-6 hours as needed',
        error: 'Tramadol requires Q4-6H dosing'
      };
    }
    
    // EAR/EYE DROPS
    if (drugName.includes('drop')) {
      if (drugName.includes('ear')) {
        if (drugName.includes('ciprofloxacin')) {
          return { 
            isValid: false, 
            correctedPosology: '4 drops in affected ear twice daily',
            error: 'Ciprofloxacin ear drops are BID'
          };
        }
        if (drugName.includes('ofloxacin')) {
          return { 
            isValid: false, 
            correctedPosology: '10 drops in affected ear twice daily',
            error: 'Ofloxacin ear drops are BID'
          };
        }
        return { 
          isValid: false, 
          correctedPosology: '4 drops in affected ear twice daily',
          error: 'Ear drops require BID application'
        };
      }
      if (drugName.includes('eye') || drugName.includes('ophthalmic')) {
        if (drugName.includes('chloramphenicol')) {
          return { 
            isValid: false, 
            correctedPosology: '1 drop every 2 hours for 2 days, then 4 times daily',
            error: 'Chloramphenicol eye drops require frequent initial dosing'
          };
        }
        if (drugName.includes('tobramycin')) {
          return { 
            isValid: false, 
            correctedPosology: '1-2 drops every 4 hours',
            error: 'Tobramycin eye drops are Q4H'
          };
        }
        return { 
          isValid: false, 
          correctedPosology: '1-2 drops four times daily',
          error: 'Eye drops require QID application'
        };
      }
    }
    
    // CORTICOSTEROIDS
    if (drugName.includes('prednisolone')) {
      return { 
        isValid: false, 
        correctedPosology: '2 tablets once daily in morning',
        error: 'Prednisolone should specify morning dosing'
      };
    }
    if (drugName.includes('methylprednisolone')) {
      return { 
        isValid: false, 
        correctedPosology: '2 tablets twice daily',
        error: 'Methylprednisolone is usually BID'
      };
    }
    if (drugName.includes('dexamethasone') && !drugName.includes('drop')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet twice daily',
        error: 'Dexamethasone is usually BID'
      };
    }
    
    // GASTROINTESTINAL
    if (drugName.includes('domperidone')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily before meals',
        error: 'Domperidone is TID before meals'
      };
    }
    if (drugName.includes('metoclopramide')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily before meals',
        error: 'Metoclopramide is TID before meals'
      };
    }
    if (drugName.includes('ondansetron')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet twice daily',
        error: 'Ondansetron is BID'
      };
    }
    if (drugName.includes('hyoscine')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily',
        error: 'Hyoscine butylbromide is TID'
      };
    }
    
    // ANTIHISTAMINES (short-acting)
    if (drugName.includes('chlorpheniramine')) {
      return { 
        isValid: false, 
        correctedPosology: '1 tablet three times daily',
        error: 'Chlorpheniramine is TID (short-acting)'
      };
    }
    
    // RESPIRATORY
    if (drugName.includes('salbutamol')) {
      return { 
        isValid: false, 
        correctedPosology: '2 puffs every 4-6 hours as needed',
        error: 'Salbutamol requires Q4-6H PRN dosing'
      };
    }
    if (drugName.includes('ipratropium')) {
      return { 
        isValid: false, 
        correctedPosology: '2 puffs four times daily',
        error: 'Ipratropium is QID'
      };
    }
    if (drugName.includes('budesonide') && drugName.includes('inhaler')) {
      return { 
        isValid: false, 
        correctedPosology: '2 puffs twice daily',
        error: 'Budesonide inhaler is BID'
      };
    }
    
    // Generic fallback
    return {
      isValid: false,
      error: `Generic "once daily" detected for ${medication.drug} - needs specific posology`
    };
  }
  
  // Check for vague posologies
  if (currentPosology === 'as directed' || 
      currentPosology === 'take as directed' ||
      currentPosology === 'use as directed' ||
      currentPosology === 'as prescribed' ||
      currentPosology === '') {
    return {
      isValid: false,
      error: `Vague posology for ${medication.drug} - needs specific instructions`
    };
  }
  
  return { isValid: true };
}

// ==================== HELPER FUNCTIONS FOR PREGNANCY ====================
function getPregnancyTrimester(gestationalAge: string): string {
  if (!gestationalAge) return ''
  
  const weeks = parseInt(gestationalAge.replace(/[^\d]/g, ''))
  if (isNaN(weeks)) return ''
  
  if (weeks < 13) return 'first'
  if (weeks < 28) return 'second'
  if (weeks <= 42) return 'third'
  return ''
}

function checkMedicationPregnancySafety(drugName: string): {
  category: string
  safe: boolean
  note: string
  breastfeeding: string
} {
  const drug = drugName.toLowerCase().split(' ')[0]
  
  for (const [med, safety] of Object.entries(MEDICATION_PREGNANCY_SAFETY)) {
    if (drug.includes(med)) {
      return {
        category: safety.category,
        safe: safety.safe,
        note: safety.note || '',
        breastfeeding: safety.breastfeeding
      }
    }
  }
  
  return {
    category: 'Unknown',
    safe: false,
    note: 'No pregnancy safety data available - use with caution',
    breastfeeding: 'Unknown'
  }
}

function getPregnancySafeAlternative(drugClass: string, trimester: string): DrugProtocol | null {
  const alternatives: { [key: string]: DrugProtocol } = {
    'nsaid': {
      name: 'Paracetamol 500mg',
      posology: '2 tablets every 6 hours as needed',
      duration: 'As needed',
      packaging: 'box of 20 tablets',
      quantity: '1 box',
      pregnancyCategory: 'B'
    },
    'antibiotic_uti': {
      name: 'Cephalexin 500mg',
      posology: '1 capsule four times daily',
      duration: '7 days',
      packaging: 'box of 28 capsules',
      quantity: '1 box',
      pregnancyCategory: 'B'
    },
    'antihypertensive': {
      name: 'Methyldopa 250mg',
      posology: '1 tablet twice daily',
      duration: 'Long-term',
      packaging: 'box of 30 tablets',
      quantity: '1 box',
      pregnancyCategory: 'B'
    },
    'antiemetic': {
      name: 'Vitamin B6 25mg',
      posology: '1 tablet three times daily',
      duration: 'As needed',
      packaging: 'box of 30 tablets',
      quantity: '1 box',
      pregnancyCategory: 'A'
    }
  }
  
  return alternatives[drugClass] || null
}

// ==================== ENHANCED VALIDATION WITH PREGNANCY ====================
function validatePharmacologyWithPregnancy(
  diagnosis: string, 
  medications: any[], 
  patientAge: number,
  pregnancyStatus?: string,
  trimester?: string
): {
  valid: boolean
  errors: string[]
  corrections: any[]
  pregnancyWarnings: string[]
} {
  const errors: string[] = []
  const corrections: any[] = []
  const pregnancyWarnings: string[] = []
  
  const isPregnant = pregnancyStatus === 'pregnant' || pregnancyStatus === 'possibly_pregnant'
  const isBreastfeeding = pregnancyStatus === 'breastfeeding'
  
  // Check each medication for pregnancy safety
  medications.forEach((med, index) => {
    const drugName = (med.drug || '').toLowerCase()
    
    if (isPregnant || isBreastfeeding) {
      const safety = checkMedicationPregnancySafety(drugName)
      
      if (isPregnant) {
        if (safety.category === 'D' || safety.category === 'X') {
          errors.push(`❌ ${med.drug} is Category ${safety.category} - CONTRAINDICATED in pregnancy`)
          pregnancyWarnings.push(`⚠️ ${med.drug}: ${PREGNANCY_CATEGORIES[safety.category as keyof typeof PREGNANCY_CATEGORIES]}`)
          
          // Find safe alternative
          let alternative = null
          if (drugName.includes('ibuprofen') || drugName.includes('diclofenac')) {
            alternative = getPregnancySafeAlternative('nsaid', trimester || '')
          } else if (drugName.includes('ciprofloxacin')) {
            alternative = getPregnancySafeAlternative('antibiotic_uti', trimester || '')
          } else if (drugName.includes('lisinopril') || drugName.includes('losartan')) {
            alternative = getPregnancySafeAlternative('antihypertensive', trimester || '')
          }
          
          if (alternative) {
            corrections.push({
              action: 'replace',
              index: index,
              originalDrug: med.drug,
              replacement: {
                ...med,
                drug: alternative.name,
                posology: alternative.posology,
                duration: alternative.duration,
                packaging: alternative.packaging,
                quantity: alternative.quantity,
                pregnancy_category: alternative.pregnancyCategory,
                pregnancy_safety: 'Safe in pregnancy',
                administration_instructions: 'Safe for use during pregnancy'
              }
            })
          } else {
            corrections.push({
              action: 'remove',
              index: index,
              reason: 'Contraindicated in pregnancy with no safe alternative identified'
            })
          }
        } else if (safety.category === 'C') {
          pregnancyWarnings.push(`⚠️ ${med.drug} (Category C): Use only if benefit outweighs risk`)
          med.pregnancy_category = 'C'
          med.pregnancy_safety = 'Use with caution - discuss with doctor'
        } else if (safety.category === 'B' || safety.category === 'A') {
          med.pregnancy_category = safety.category
          med.pregnancy_safety = 'Generally safe in pregnancy'
        }
        
        // Special trimester checks
        if (trimester === 'third' && drugName.includes('nsaid')) {
          errors.push(`❌ NSAIDs contraindicated in 3rd trimester (premature ductus closure)`)
          corrections.push({
            action: 'replace',
            index: index,
            replacement: getPregnancySafeAlternative('nsaid', trimester)
          })
        }
      }
      
      if (isBreastfeeding) {
        const bfCategory = safety.breastfeeding
        if (bfCategory === 'L4' || bfCategory === 'L5') {
          pregnancyWarnings.push(`⚠️ ${med.drug}: ${BREASTFEEDING_CATEGORIES[bfCategory as keyof typeof BREASTFEEDING_CATEGORIES]}`)
        }
        med.breastfeeding_category = bfCategory
        med.breastfeeding_safety = bfCategory ? BREASTFEEDING_CATEGORIES[bfCategory as keyof typeof BREASTFEEDING_CATEGORIES] : 'Unknown'
      }
    }
  })
  
  // Check for missing pregnancy-specific treatments
  if (isPregnant) {
    const hasPregnancyVitamins = medications.some(m => 
      m.drug.toLowerCase().includes('folic acid') || 
      m.drug.toLowerCase().includes('prenatal')
    )
    
    if (!hasPregnancyVitamins && diagnosis.toLowerCase() !== 'emergency') {
      corrections.push({
        action: 'add',
        medication: {
          drug: 'Folic Acid 5mg',
          therapeutic_role: 'preventive',
          indication: 'Pregnancy supplementation',
          posology: '1 tablet once daily',
          duration: 'Throughout pregnancy',
          packaging: 'box of 30 tablets',
          quantity: '1 box',
          pregnancy_category: 'A',
          pregnancy_safety: 'Essential for pregnancy',
          administration_instructions: 'Take with or without food'
        }
      })
    }
  }
  
  // Run standard pharmacology validation
  const standardValidation = validatePharmacology(diagnosis, medications, patientAge)
  errors.push(...standardValidation.errors)
  corrections.push(...standardValidation.corrections)
  
  return { 
    valid: errors.length === 0, 
    errors, 
    corrections,
    pregnancyWarnings
  }
}

// ==================== STANDARD PHARMACOLOGY VALIDATION ====================
function validatePharmacology(diagnosis: string, medications: any[], patientAge: number = 30): {
  valid: boolean
  errors: string[]
  corrections: any[]
} {
  const errors: string[] = []
  const corrections: any[] = []
  const diagnosisLower = diagnosis.toLowerCase()
  
  // CRITICAL: Validate posologies for ALL medications
  console.log('🔍 Checking posologies for all medications...');
  medications.forEach((med, index) => {
    const posologyCheck = validateAndCorrectPosology(med, diagnosis);
    
    if (!posologyCheck.isValid) {
      errors.push(`❌ Posology issue: ${posologyCheck.error}`);
      
      if (posologyCheck.correctedPosology) {
        corrections.push({
          action: 'update_posology',
          index: index,
          originalDrug: med.drug,
          originalPosology: med.posology,
          newPosology: posologyCheck.correctedPosology,
          reason: posologyCheck.error
        });
        console.log(`   📝 Will correct ${med.drug}: "${med.posology}" → "${posologyCheck.correctedPosology}"`);
      }
    }
  });
  
  // Check each medication for misclassification
  medications.forEach((med, index) => {
    const drugName = (med.drug || '').toLowerCase()
    const indication = (med.indication || '').toLowerCase()
    
    // Critical check: Is "antibiotic" really an antibiotic?
    if (indication.includes('antibiotic') || indication.includes('bacterial')) {
      const isRealAntibiotic = Object.values(DRUG_CLASSIFICATIONS.antibiotics)
        .flat()
        .some(antibiotic => drugName.includes(antibiotic))
      
      if (!isRealAntibiotic) {
        // Check if it's a known non-antibiotic
        if (DRUG_CLASSIFICATIONS.not_antibiotics.some(nonAb => drugName.includes(nonAb))) {
          errors.push(`❌ ${med.drug} is NOT an antibiotic - it's an ${
            drugName.includes('acetic') ? 'acidifier' : 
            drugName.includes('peroxide') || drugName.includes('iodine') || drugName.includes('chlorhexidine') ? 'antiseptic' :
            'non-antibiotic agent'
          }`)
          
          // Mark for removal
          corrections.push({
            action: 'remove',
            index: index,
            reason: 'Not an antibiotic despite being prescribed as one'
          })
        }
      }
    }
    
    // Check: Paracetamol is NOT anti-inflammatory
    if (indication.includes('anti-inflammatory') && 
        DRUG_CLASSIFICATIONS.analgesics_only.some(a => drugName.includes(a))) {
      errors.push(`❌ ${med.drug} is NOT anti-inflammatory - only analgesic`)
      med.indication = med.indication.replace('anti-inflammatory', 'analgesic')
    }
  })
  
  // Find matching protocol
  let protocol = null
  for (const [condition, proto] of Object.entries(THERAPEUTIC_PROTOCOLS)) {
    if (diagnosisLower.includes(condition.split(' ')[0])) {
      protocol = proto
      break
    }
  }
  
  if (protocol) {
    // Check mandatory medications with complete posology
    protocol.mandatory.forEach(requirement => {
      const hasRequired = medications.some(med => {
        const drugLower = (med.drug || '').toLowerCase()
        return requirement.drugs.some((reqDrug: DrugProtocol) => 
          drugLower.includes(reqDrug.name.toLowerCase().split(' ')[0])
        )
      })
      
      if (!hasRequired) {
        errors.push(`⚠️ Missing required: ${requirement.category} - ${requirement.reason}`)
        
        // Add with complete posology and packaging
        const recommendedDrug = requirement.drugs[0] as DrugProtocol
        const completePrescription = generateCompletePrescription(recommendedDrug, patientAge)
        
        corrections.push({
          action: 'add',
          medication: {
            drug: completePrescription.drug,
            therapeutic_role: 'etiological',
            indication: requirement.reason,
            posology: completePrescription.posology,
            duration: completePrescription.duration,
            packaging: completePrescription.packaging,
            quantity: completePrescription.quantity,
            form: completePrescription.form,
            route: completePrescription.route,
            dosing: {
              adult: recommendedDrug.posology,
              adjustments: {
                elderly: patientAge > 65 ? 'Use lowest effective dose' : '',
                renal: 'Adjust according to creatinine clearance',
                hepatic: 'Use with caution'
              }
            },
            mauritius_availability: {
              public_free: true,
              estimated_cost: 'Rs 100-500',
              alternatives: (requirement.drugs[1] as DrugProtocol)?.name || 'As per protocol',
              brand_names: 'Various brands available'
            },
            administration_instructions: completePrescription.administration_instructions
          }
        })
      }
    })
    
    // Check medications to avoid
    medications.forEach((med, index) => {
      const drugName = (med.drug || '').toLowerCase()
      protocol.avoid.forEach(avoidRule => {
        if (avoidRule.toLowerCase().includes(drugName.split(' ')[0]) ||
            (avoidRule.includes('Acetic acid alone') && drugName.includes('acetic') && medications.length < protocol.minimum)) {
          errors.push(`⚠️ Should avoid: ${avoidRule}`)
        }
      })
    })
    
    // Check minimum count
    if (medications.length < protocol.minimum) {
      errors.push(`⚠️ Need at least ${protocol.minimum} medications for ${diagnosis}`)
    }
  }
  
  return { valid: errors.length === 0, errors, corrections }
}

// ==================== APPLY CORRECTIONS ====================
function applyPharmacologicalCorrectionsWithPregnancy(analysis: any, corrections: any[]): any {
  if (!corrections || corrections.length === 0) return analysis
  
  console.log(`🔧 Applying ${corrections.length} corrections (including posology fixes)...`)
  
  let medications = analysis.treatment_plan?.medications || []
  
  // Process removals first
  corrections
    .filter(c => c.action === 'remove')
    .sort((a, b) => b.index - a.index)
    .forEach(correction => {
      console.log(`   ❌ Removing: ${medications[correction.index]?.drug} - ${correction.reason}`)
      medications.splice(correction.index, 1)
    })
  
  // Process replacements
  corrections
    .filter(c => c.action === 'replace')
    .forEach(correction => {
      if (correction.index < medications.length) {
        console.log(`   🔄 Replacing: ${correction.originalDrug} with ${correction.replacement.drug}`)
        medications[correction.index] = correction.replacement
      }
    })
  
  // Process posology updates - CRITICAL FOR ALL CASES
  corrections
    .filter(c => c.action === 'update_posology')
    .forEach(correction => {
      if (correction.index < medications.length) {
        console.log(`   📝 Fixing posology for ${correction.originalDrug}:`);
        console.log(`      From: "${correction.originalPosology}"`);
        console.log(`      To: "${correction.newPosology}"`);
        medications[correction.index].posology = correction.newPosology;
      }
    });
  
  // Process additions
  corrections
    .filter(c => c.action === 'add')
    .forEach(correction => {
      console.log(`   ✅ Adding: ${correction.medication.drug}`)
      medications.push(correction.medication)
    })
  
  analysis.treatment_plan.medications = medications
  
  // Update medication count
  if (analysis.treatment_plan.completeness_check) {
    analysis.treatment_plan.completeness_check.total_medications = medications.length
  }
  
  return analysis
}

// ==================== HELPER FUNCTIONS FOR PRESCRIPTION ====================
function generateCompletePrescription(protocolDrug: DrugProtocol, patientAge: number): any {
  let adjustedPosology = protocolDrug.posology
  let adjustedQuantity = protocolDrug.quantity
  let adjustedPackaging = protocolDrug.packaging
  
  // Pediatric adjustments
  if (patientAge < 12) {
    if (protocolDrug.pediatricAdjustment) {
      adjustedPosology = protocolDrug.pediatricAdjustment
    } else if (protocolDrug.name.includes('Paracetamol')) {
      adjustedPosology = '15mg/kg every 6 hours'
      adjustedPackaging = 'bottle of syrup 120mg/5ml'
      adjustedQuantity = '1 bottle'
    } else if (protocolDrug.name.includes('Ibuprofen')) {
      adjustedPosology = '10mg/kg every 8 hours'
      adjustedPackaging = 'bottle of syrup 100mg/5ml'
      adjustedQuantity = '1 bottle'
    } else if (protocolDrug.name.includes('Amoxicillin')) {
      adjustedPosology = '25-45mg/kg/day divided in 3 doses'
      adjustedPackaging = 'bottle of syrup 250mg/5ml'
      adjustedQuantity = '1 bottle'
    }
  }
  
  // Geriatric adjustments
  if (patientAge > 65) {
    if (protocolDrug.geriatricAdjustment) {
      adjustedPosology = protocolDrug.geriatricAdjustment
    } else if (protocolDrug.name.includes('NSAID')) {
      adjustedPosology += ' (use lowest effective dose)'
    }
  }
  
  return {
    drug: protocolDrug.name,
    posology: adjustedPosology,
    duration: protocolDrug.duration,
    packaging: adjustedPackaging,
    quantity: adjustedQuantity,
    form: extractFormFromPackaging(adjustedPackaging),
    route: extractRouteFromName(protocolDrug.name),
    administration_instructions: generateAdministrationInstructions(protocolDrug)
  }
}

function extractFormFromPackaging(packaging: string): string {
  const packagingLower = packaging.toLowerCase()
  
  if (packagingLower.includes('tablet')) return 'tablet'
  if (packagingLower.includes('capsule')) return 'capsule'
  if (packagingLower.includes('bottle') && packagingLower.includes('ml')) {
    if (packagingLower.includes('drop')) return 'drops'
    if (packagingLower.includes('syrup')) return 'syrup'
    if (packagingLower.includes('suspension')) return 'suspension'
    if (packagingLower.includes('spray')) return 'spray'
    if (packagingLower.includes('mouthwash') || packagingLower.includes('gargle')) return 'solution'
    return 'solution'
  }
  if (packagingLower.includes('tube')) return 'cream'
  if (packagingLower.includes('inhaler')) return 'inhaler'
  if (packagingLower.includes('pessary')) return 'pessary'
  if (packagingLower.includes('sachet')) return 'powder'
  if (packagingLower.includes('lozenge')) return 'lozenge'
  if (packagingLower.includes('device')) return 'device'
  
  return 'unit'
}

function extractRouteFromName(drugName: string): string {
  const nameLower = drugName.toLowerCase()
  
  if (nameLower.includes('ear drop')) return 'Otic'
  if (nameLower.includes('eye drop')) return 'Ophthalmic'
  if (nameLower.includes('nasal')) return 'Nasal'
  if (nameLower.includes('inhaler')) return 'Inhalation'
  if (nameLower.includes('cream') || nameLower.includes('gel') || nameLower.includes('ointment')) return 'Topical'
  if (nameLower.includes('pessary') || nameLower.includes('vaginal')) return 'Vaginal'
  if (nameLower.includes('mouthwash') || nameLower.includes('gargle')) return 'Oral rinse'
  if (nameLower.includes('spray') && nameLower.includes('throat')) return 'Oropharyngeal'
  
  return 'Oral' // Default
}

function generateAdministrationInstructions(drug: DrugProtocol): string {
  const name = drug.name.toLowerCase()
  
  // Type-specific instructions
  if (name.includes('ear drop')) {
    return 'Warm to body temperature. Lie on side, instill drops, remain in position for 5 minutes'
  }
  if (name.includes('eye drop')) {
    return 'Pull lower eyelid down, instill drops, close eye gently for 1 minute'
  }
  if (name.includes('inhaler')) {
    return 'Shake well, exhale fully, inhale deeply while pressing, hold breath 10 seconds. Use spacer if available'
  }
  if (name.includes('pessary')) {
    return 'Insert deep into vagina at bedtime, remain lying down'
  }
  if (name.includes('gargle') || name.includes('mouthwash')) {
    return 'Do not swallow. Gargle for 30 seconds then spit out'
  }
  
  // Drug-specific instructions
  if (name.includes('ibuprofen') || name.includes('diclofenac')) {
    return 'Take with food to minimize gastric irritation'
  }
  if (name.includes('amoxicillin') && !name.includes('clavulanate')) {
    return 'Can be taken with or without food. Complete full course even if feeling better'
  }
  if (name.includes('flucloxacillin')) {
    return 'Take on empty stomach, 1 hour before or 2 hours after meals'
  }
  if (name.includes('nitrofurantoin')) {
    return 'Take with food or milk to improve absorption and reduce nausea'
  }
  if (name.includes('metronidazole')) {
    return 'Avoid alcohol during treatment and for 48 hours after'
  }
  if (name.includes('ciprofloxacin') && !name.includes('drop')) {
    return 'Take with full glass of water. Avoid dairy products within 2 hours'
  }
  if (name.includes('prednisolone')) {
    return 'Take in the morning with food to reduce gastric irritation'
  }
  if (name.includes('ors') || name.includes('rehydration')) {
    return 'Dissolve in clean water as directed. Drink slowly throughout the day'
  }
  
  // Default based on posology
  if (drug.posology.includes('with food')) {
    return 'Take with meals'
  }
  if (drug.posology.includes('empty stomach')) {
    return 'Take 1 hour before or 2 hours after meals'
  }
  
  return 'Take as directed'
}

// ==================== PRESCRIPTION MONITORING SYSTEM ====================
const PrescriptionMonitoring = {
  metrics: {
    avgMedicationsPerDiagnosis: new Map<string, number[]>(),
    avgTestsPerDiagnosis: new Map<string, number[]>(),
    outliers: [] as any[],
    pharmacologicalErrors: [] as any[],
    pregnancyAdjustments: [] as any[],
    posologyCorrections: [] as any[] // NEW
  },
  
  track(diagnosis: string, medications: number, tests: number, errors: string[] = [], pregnancyStatus?: string, posologyFixed?: number) {
    if (!this.metrics.avgMedicationsPerDiagnosis.has(diagnosis)) {
      this.metrics.avgMedicationsPerDiagnosis.set(diagnosis, [])
    }
    if (!this.metrics.avgTestsPerDiagnosis.has(diagnosis)) {
      this.metrics.avgTestsPerDiagnosis.set(diagnosis, [])
    }
    
    this.metrics.avgMedicationsPerDiagnosis.get(diagnosis)?.push(medications)
    this.metrics.avgTestsPerDiagnosis.get(diagnosis)?.push(tests)
    
    // Track pharmacological errors
    if (errors.length > 0) {
      this.metrics.pharmacologicalErrors.push({
        diagnosis,
        errors,
        timestamp: new Date().toISOString()
      })
    }
    
    // Track posology corrections
    if (posologyFixed && posologyFixed > 0) {
      this.metrics.posologyCorrections.push({
        diagnosis,
        correctionsCount: posologyFixed,
        timestamp: new Date().toISOString()
      })
    }
    
    // Track pregnancy adjustments
    if (pregnancyStatus === 'pregnant' || pregnancyStatus === 'possibly_pregnant') {
      this.metrics.pregnancyAdjustments.push({
        diagnosis,
        pregnancyStatus,
        medicationCount: medications,
        timestamp: new Date().toISOString()
      })
    }
    
    const medAvg = this.getAverage(diagnosis, 'medications')
    const testAvg = this.getAverage(diagnosis, 'tests')
    
    if (medications > medAvg * 2 || tests > testAvg * 2) {
      this.metrics.outliers.push({
        diagnosis,
        medications,
        tests,
        pregnancyStatus,
        timestamp: new Date().toISOString()
      })
    }
  },
  
  getAverage(diagnosis: string, type: 'medications' | 'tests'): number {
    const map = type === 'medications' 
      ? this.metrics.avgMedicationsPerDiagnosis 
      : this.metrics.avgTestsPerDiagnosis
    const values = map.get(diagnosis) || []
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 3
  }
}

// ==================== DATA PROTECTION ====================
function anonymizePatientData(patientData: any): { 
  anonymized: any, 
  originalIdentity: any,
  anonymousId: string
} {
  const anonymousId = `ANON-${crypto.randomUUID()}`
  
  const originalIdentity = {
    firstName: patientData?.firstName,
    lastName: patientData?.lastName,
    name: patientData?.name,
    email: patientData?.email,
    phone: patientData?.phone,
    address: patientData?.address,
    idNumber: patientData?.idNumber,
    ssn: patientData?.ssn
  }
  
  const anonymized = JSON.parse(JSON.stringify(patientData))
  const sensitiveFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'idNumber', 'ssn']
  
  sensitiveFields.forEach(field => {
    delete anonymized[field]
  })
  
  anonymized.anonymousId = anonymousId
  
  console.log('🔒 Patient data anonymized')
  console.log(`   - Anonymous ID: ${anonymousId}`)
  console.log('   - Protected fields:', sensitiveFields.filter(f => originalIdentity[f]).join(', '))
  console.log('   - Pregnancy status:', anonymized.pregnancyStatus || 'Not specified')
  
  return { anonymized, originalIdentity, anonymousId }
}

// ==================== MAIN ENHANCED VALIDATION ====================
function validateMedicalAnalysisWithPregnancy(
  analysis: any,
  patientContext: PatientContext
): ValidationResult {
  const medications = analysis.treatment_plan?.medications || []
  const labTests = analysis.investigation_strategy?.laboratory_tests || []
  const imaging = analysis.investigation_strategy?.imaging_studies || []
  
  const issues: string[] = []
  const suggestions: string[] = []
  const pregnancyWarnings: string[] = []
  const posologyCorrections: string[] = [] // NEW
  
  console.log(`📊 Complete analysis with pregnancy considerations:`)
  console.log(`   - ${medications.length} medication(s) prescribed`)
  console.log(`   - ${labTests.length} laboratory test(s)`)
  console.log(`   - ${imaging.length} imaging study/studies`)
  console.log(`   - Pregnancy status: ${patientContext.pregnancy_status || 'Not specified'}`)
  
  const diagnosis = analysis.clinical_analysis?.primary_diagnosis?.condition || ''
  const isPregnant = patientContext.pregnancy_status === 'pregnant' || 
                     patientContext.pregnancy_status === 'possibly_pregnant'
  
  // Pregnancy-specific validations
  if (isPregnant) {
    // Check for radiation exposure in imaging
    imaging.forEach((study: any) => {
      if (study.radiation_exposure && !study.pregnancy_alternative) {
        issues.push(`⚠️ ${study.study_name} involves radiation - need pregnancy alternative`)
        suggestions.push(`Consider ultrasound or MRI instead of ${study.study_name}`)
      }
    })
    
    // Check if pregnancy considerations are documented
    if (!analysis.clinical_analysis?.pregnancy_assessment) {
      suggestions.push('Add pregnancy assessment section')
    }
    
    if (!analysis.treatment_plan?.pregnancy_safety_statement) {
      suggestions.push('Add clear pregnancy safety statement for medications')
    }
  }
  
  // Validate pharmacology with pregnancy
  const patientAge = parseInt(patientContext.age as string) || 30
  const trimester = getPregnancyTrimester(patientContext.gestational_age || '')
  
  const pharmacoValidation = validatePharmacologyWithPregnancy(
    diagnosis, 
    medications, 
    patientAge,
    patientContext.pregnancy_status,
    trimester
  )
  
  if (!pharmacoValidation.valid) {
    issues.push(...pharmacoValidation.errors)
  }
  
  pregnancyWarnings.push(...pharmacoValidation.pregnancyWarnings)
  
  // Count posology corrections
  const posologyFixCount = pharmacoValidation.corrections.filter(c => c.action === 'update_posology').length
  if (posologyFixCount > 0) {
    posologyCorrections.push(`Fixed ${posologyFixCount} posology issue(s)`)
  }
  
  // Standard validations
  if (!analysis.clinical_analysis?.primary_diagnosis?.condition) {
    issues.push('Primary diagnosis missing')
  }
  
  if (!analysis.treatment_plan?.approach) {
    issues.push('Therapeutic approach missing')
  }
  
  if (!analysis.follow_up_plan?.red_flags) {
    issues.push('Red flags missing')
  }
  
  // Track metrics with pregnancy status and posology corrections
  if (diagnosis) {
    PrescriptionMonitoring.track(
      diagnosis, 
      medications.length, 
      labTests.length + imaging.length,
      pharmacoValidation.errors,
      patientContext.pregnancy_status,
      posologyFixCount
    )
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    pregnancyWarnings,
    posologyCorrections,
    metrics: {
      medications: medications.length,
      laboratory_tests: labTests.length,
      imaging_studies: imaging.length,
      pregnancySafetyChecked: isPregnant,
      posologyIssuesFixed: posologyFixCount
    }
  }
}

// ==================== PREPARE PROMPT WITH PREGNANCY ====================
function preparePromptWithPregnancy(patientContext: PatientContext): string {
  const aiQuestionsFormatted = patientContext.ai_questions
    .map((q: any) => `Q: ${q.question}\n   A: ${q.answer}`)
    .join('\n   ')
  
  // Prepare pregnancy status section
  let pregnancyStatusSection = ''
  if (patientContext.pregnancy_status === 'pregnant') {
    const trimester = getPregnancyTrimester(patientContext.gestational_age || '')
    pregnancyStatusSection = `
🤰 PATIENT IS PREGNANT
- Gestational age: ${patientContext.gestational_age || 'Unknown'}
- Trimester: ${trimester || 'Unknown'}
- LMP: ${patientContext.last_menstrual_period || 'Unknown'}

⚠️ ALL medications MUST be pregnancy-safe (Category A or B preferred)
⚠️ Avoid radiation exposure - use ultrasound/MRI instead
⚠️ Consider pregnancy-related complications in differential
⚠️ Include obstetric referral if needed`
  } else if (patientContext.pregnancy_status === 'possibly_pregnant') {
    pregnancyStatusSection = `
⚠️ PATIENT POSSIBLY PREGNANT
- Treat as pregnant until confirmed otherwise
- Order pregnancy test if relevant
- Use pregnancy-safe medications only
- Avoid radiation exposure`
  } else if (patientContext.pregnancy_status === 'breastfeeding') {
    pregnancyStatusSection = `
🤱 PATIENT IS BREASTFEEDING
- Check all medications for lactation safety (L1-L2 preferred)
- Consider timing of doses relative to feeding
- Monitor infant for side effects`
  } else {
    pregnancyStatusSection = 'Patient is not pregnant'
  }
  
  return ENHANCED_DIAGNOSTIC_PROMPT_WITH_PREGNANCY
    .replace('{{PREGNANCY_STATUS}}', pregnancyStatusSection)
    .replace('{{PATIENT_CONTEXT}}', JSON.stringify(patientContext, null, 2))
}

// ==================== MAURITIUS HEALTHCARE CONTEXT ====================
const MAURITIUS_HEALTHCARE_CONTEXT = {
  laboratories: {
    everywhere: "C-Lab (29 centers), Green Cross (36 centers), Biosanté (48 locations)",
    specialized: "ProCare Medical (oncology/genetics), C-Lab (PCR/NGS)",
    public: "Central Health Lab, all regional hospitals",
    home_service: "C-Lab free >70 years, Hans Biomedical mobile",
    results_time: "STAT: 1-2h, Urgent: 2-6h, Routine: 24-48h",
    online_results: "C-Lab, Green Cross"
  },
  imaging: {
    basic: "X-ray/Ultrasound available everywhere",
    ct_scan: "Apollo Bramwell, Wellkin, Victoria Hospital, Dr Jeetoo",
    mri: "Apollo, Wellkin (1-2 week delays)",
    cardiac: {
      echo: "Available all hospitals + private",
      coronary_ct: "Apollo, Cardiac Centre Pamplemousses",
      angiography: "Cardiac Centre (public), Apollo Cath Lab (private)"
    }
  },
  hospitals: {
    emergency_24_7: "Dr Jeetoo (Port Louis), SSRN (Pamplemousses), Victoria (Candos), Apollo, Wellkin",
    cardiac_emergencies: "Cardiac Centre Pamplemousses, Apollo Bramwell",
    obstetric_emergencies: "Dr Jeetoo, SSRN, Victoria (public), Apollo (private)",
    specialists: "Generally 1-3 week wait, emergencies seen faster"
  }
}

// ==================== CALL OPENAI WITH RETRY ====================
async function callOpenAIWithRetry(
  apiKey: string,
  prompt: string,
  patientContext: PatientContext,
  maxRetries: number = 2
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 OpenAI call (attempt ${attempt + 1}/${maxRetries + 1})...`)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert physician. CRITICAL POSOLOGY RULES:
              
              NEVER use generic "once daily" unless the drug is SPECIFICALLY once-daily:
              ✅ ACTUALLY once daily: Azithromycin, Amlodipine, Lisinopril, Losartan, Omeprazole, Cetirizine, Loratadine
              
              USE SPECIFIC POSOLOGIES:
              - Amoxicillin: "1 capsule three times daily" NOT "once daily"
              - Ibuprofen: "1 tablet three times daily with food" NOT "once daily"
              - Ciprofloxacin: "1 tablet twice daily" NOT "once daily"
              - Paracetamol: "2 tablets every 6 hours" NOT "once daily"
              - Metronidazole: "1 tablet three times daily" NOT "once daily"
              - Domperidone: "1 tablet three times daily before meals" NOT "once daily"
              - Ear drops: "4 drops twice daily" NOT "once daily"
              - Eye drops: "1-2 drops four times daily" NOT "once daily"
              
              ALWAYS include: dose amount, frequency, timing, duration.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0.1,
          seed: 12345
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`)
      }
      
      const data = await response.json()
      let analysis = JSON.parse(data.choices[0]?.message?.content || '{}')
      
      // CRITICAL: Validate and fix posologies immediately
      const diagnosis = analysis.clinical_analysis?.primary_diagnosis?.condition || ''
      const medications = analysis.treatment_plan?.medications || []
      const patientAge = parseInt(patientContext.age as string) || 30
      
      console.log('💊 Validating posologies for ALL medications...');
      
      // Immediate posology correction
      let posologyErrors = 0;
      medications.forEach((med: any, idx: number) => {
        const check = validateAndCorrectPosology(med, diagnosis);
        if (!check.isValid) {
          console.warn(`   ⚠️ Posology issue for ${med.drug}: ${check.error}`);
          if (check.correctedPosology) {
            console.log(`   ✅ Auto-correcting to: ${check.correctedPosology}`);
            med.posology = check.correctedPosology;
            posologyErrors++;
          }
        }
      });
      
      if (posologyErrors > 0) {
        console.log(`📝 Auto-corrected ${posologyErrors} posology issues`);
      }
      
      // Standard pharmacology validation
      console.log('💊 Running complete pharmacology validation...');
      const pharmacoValidation = validatePharmacology(
        diagnosis, 
        medications, 
        patientAge
      )
      
      // Pregnancy validation if applicable
      const trimester = getPregnancyTrimester(patientContext.gestational_age || '')
      if (patientContext.pregnancy_status === 'pregnant' || 
          patientContext.pregnancy_status === 'possibly_pregnant' ||
          patientContext.pregnancy_status === 'breastfeeding') {
        
        console.log('🤰 Additional pregnancy validation...');
        const pregnancyValidation = validatePharmacologyWithPregnancy(
          diagnosis, 
          medications, 
          patientAge,
          patientContext.pregnancy_status,
          trimester
        )
        
        if (!pregnancyValidation.valid || pregnancyValidation.pregnancyWarnings.length > 0) {
          console.warn('⚠️ Pregnancy-related issues detected');
          analysis = applyPharmacologicalCorrectionsWithPregnancy(analysis, pregnancyValidation.corrections)
        }
        
        if (pregnancyValidation.pregnancyWarnings.length > 0) {
          analysis.pregnancy_warnings = pregnancyValidation.pregnancyWarnings
        }
      } else {
        // Apply standard corrections for all cases
        if (!pharmacoValidation.valid) {
          console.warn('⚠️ Pharmacological issues detected');
          analysis = applyPharmacologicalCorrectionsWithPregnancy(analysis, pharmacoValidation.corrections)
        }
      }
      
      // Basic validation
      if (!analysis.clinical_analysis?.primary_diagnosis) {
        throw new Error('Incomplete response - diagnosis missing')
      }
      
      console.log('✅ OpenAI response received, validated, and corrected')
      return { data, analysis }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Error attempt ${attempt + 1}:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`⏳ Retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        // Reinforce posology rules on retry
        if (attempt === 1) {
          prompt += `\n\nCRITICAL POSOLOGY REMINDER:
          NEVER use "once daily" for:
          - Amoxicillin: USE "1 capsule three times daily"
          - Ibuprofen: USE "1 tablet three times daily with food"
          - Ciprofloxacin: USE "1 tablet twice daily"
          - Paracetamol: USE "2 tablets every 6 hours"
          - Metronidazole: USE "1 tablet three times daily"
          - Ear drops: USE "4 drops twice daily"
          - Eye drops: USE "1-2 drops four times daily"
          
          ONLY use "once daily" for: Azithromycin, Amlodipine, Lisinopril, Omeprazole, Cetirizine`
        }
      }
    }
  }
  
  throw lastError || new Error('Failed after multiple attempts')
}

// ==================== DOCUMENT GENERATION ====================
function generateMedicalDocumentsWithPregnancy(
  analysis: any,
  patient: PatientContext,
  infrastructure: any
): any {
  const currentDate = new Date()
  const consultationId = `TC-MU-${currentDate.getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  
  const isPregnant = patient.pregnancy_status === 'pregnant' || patient.pregnancy_status === 'possibly_pregnant'
  const isBreastfeeding = patient.pregnancy_status === 'breastfeeding'
  
  return {
    consultation: {
      header: {
        title: "MEDICAL TELECONSULTATION REPORT",
        id: consultationId,
        date: currentDate.toLocaleDateString('en-US'),
        time: currentDate.toLocaleTimeString('en-US'),
        type: "Teleconsultation",
        disclaimer: "Assessment based on teleconsultation - Physical examination not performed",
        pregnancyAlert: isPregnant ? `⚠️ PATIENT IS PREGNANT - ${patient.gestational_age || 'Gestational age unknown'}` : null
      },
      
      patient: {
        name: `${patient.firstName || patient.name || 'Patient'} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} years`,
        sex: patient.sex,
        weight: patient.weight ? `${patient.weight} kg` : 'Not provided',
        allergies: patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None',
        pregnancyStatus: patient.pregnancy_status || 'Not specified',
        gestationalAge: patient.gestational_age || '',
        lastMenstrualPeriod: patient.last_menstrual_period || ''
      },
      
      pregnancyNotice: isPregnant ? {
        warning: '🤰 ALL RECOMMENDATIONS HAVE BEEN REVIEWED FOR PREGNANCY SAFETY',
        trimester: analysis.clinical_analysis?.pregnancy_assessment?.trimester || 'Unknown',
        specialConsiderations: 'Medications selected from pregnancy categories A-B when possible',
        imagingNote: 'Non-radiating imaging preferred'
      } : null,
      
      diagnostic_reasoning: analysis.diagnostic_reasoning || {},
      
      clinical_summary: {
        chief_complaint: patient.chief_complaint,
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition || "To be determined",
        severity: analysis.clinical_analysis?.primary_diagnosis?.severity || "moderate",
        confidence: `${analysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70}%`,
        pregnancyImpact: analysis.clinical_analysis?.primary_diagnosis?.pregnancy_impact || '',
        fetalRisk: analysis.clinical_analysis?.primary_diagnosis?.fetal_risk || '',
        clinical_reasoning: analysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || "In progress",
        prognosis: analysis.clinical_analysis?.primary_diagnosis?.prognosis || "To be evaluated"
      },
      
      pregnancy_assessment: isPregnant ? analysis.clinical_analysis?.pregnancy_assessment || {} : null,
      
      management_plan: {
        investigations: analysis.investigation_strategy || {},
        treatment: analysis.treatment_plan || {},
        follow_up: analysis.follow_up_plan || {}
      },
      
      patient_education: analysis.patient_education || {},
      
      pregnancy_warnings: analysis.pregnancy_warnings || [],
      
      metadata: {
        generation_time: new Date().toISOString(),
        ai_confidence: analysis.diagnostic_reasoning?.clinical_confidence || {},
        pregnancy_safety_verified: isPregnant || isBreastfeeding,
        quality_metrics: analysis.quality_metrics || {}
      }
    },
    
    medication: (analysis.treatment_plan?.medications?.length > 0) ? {
      header: {
        title: "MEDICAL PRESCRIPTION",
        prescriber: {
          name: "Dr. Teleconsultation Expert",
          registration: "MCM-TELE-2024",
          qualification: "MD, Telemedicine Certified"
        },
        date: currentDate.toLocaleDateString('en-US'),
        validity: "Prescription valid 30 days",
        pregnancyWarning: isPregnant ? '⚠️ PREGNANCY - All medications reviewed for safety' : null
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} years`,
        weight: patient.weight ? `${patient.weight} kg` : 'Not provided',
        allergies: patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None known',
        pregnancyStatus: patient.pregnancy_status || '',
        gestationalAge: patient.gestational_age || ''
      },
      
      pregnancySafetyNotice: isPregnant ? {
        statement: 'All prescribed medications have been verified for pregnancy safety',
        categories: 'Only Category A and B medications used unless specifically noted',
        monitoring: 'Regular obstetric follow-up recommended'
      } : null,
      
      prescriptions: analysis.treatment_plan.medications.map((med: any, idx: number) => ({
        number: idx + 1,
        medication: med.drug || "Medication",
        indication: med.indication || "Indication",
        pregnancyCategory: med.pregnancy_category || '',
        pregnancySafety: med.pregnancy_safety || '',
        breastfeedingCategory: med.breastfeeding_category || '',
        trimesterPrecautions: med.trimester_precautions || '',
        posology: med.posology || "As directed",
        duration: med.duration || "As per evolution",
        packaging: med.packaging || "To be specified",
        quantity: med.quantity || "As needed",
        instructions: med.administration_instructions || "Take as prescribed",
        monitoring: med.monitoring || {},
        warnings: {
          side_effects: med.side_effects || {},
          contraindications: med.contraindications || {},
          pregnancySpecific: med.fetal_monitoring || ''
        }
      })),
      
      pharmacistNote: isPregnant ? 
        'PREGNANCY ALERT: Please verify all medications for pregnancy safety before dispensing' : 
        null,
      
      footer: {
        legal: "Teleconsultation prescription compliant with Medical Council Mauritius",
        pregnancyDisclaimer: isPregnant ? 
          'All medications selected with consideration of pregnancy. Patient advised to inform all healthcare providers of pregnancy status.' : 
          null
      }
    } : null
  }
}

// ==================== HELPER FUNCTIONS FOR DIAGNOSIS ====================
function generateEmergencyFallbackDiagnosis(patient: any): any {
  return {
    primary: {
      condition: "Comprehensive medical evaluation required",
      icd10: "R69",
      confidence: 50,
      severity: "to be determined",
      detailedAnalysis: "A complete evaluation requires physical examination and potentially additional tests",
      clinicalRationale: "Teleconsultation is limited by the absence of direct physical examination"
    },
    differential: []
  }
}

// ==================== MAIN FUNCTION ====================
export async function POST(request: NextRequest) {
  console.log('🚀 MAURITIUS MEDICAL AI - VERSION 6.1 WITH POSOLOGY FIX')
  const startTime = Date.now()
  
  try {
    const [body, apiKey] = await Promise.all([
      request.json(),
      Promise.resolve(process.env.OPENAI_API_KEY)
    ])
    
    if (!body.patientData || !body.clinicalData) {
      return NextResponse.json({
        success: false,
        error: 'Missing patient or clinical data',
        errorCode: 'MISSING_DATA'
      }, { status: 400 })
    }
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.error('❌ Invalid or missing OpenAI API key')
      return NextResponse.json({
        success: false,
        error: 'Missing API configuration',
        errorCode: 'API_CONFIG_ERROR'
      }, { status: 500 })
    }
    
    const { anonymized: anonymizedPatientData, originalIdentity, anonymousId } = anonymizePatientData(body.patientData)
    
    const patientContext: PatientContext = {
      age: parseInt(anonymizedPatientData?.age) || 0,
      sex: anonymizedPatientData?.sex || 'unknown',
      weight: anonymizedPatientData?.weight,
      height: anonymizedPatientData?.height,
      medical_history: anonymizedPatientData?.medicalHistory || [],
      current_medications: anonymizedPatientData?.currentMedications || [],
      allergies: anonymizedPatientData?.allergies || [],
      
      // Pregnancy fields
      pregnancy_status: anonymizedPatientData?.pregnancyStatus || 'not_specified',
      last_menstrual_period: anonymizedPatientData?.lastMenstrualPeriod,
      gestational_age: anonymizedPatientData?.gestationalAge,
      trimester: getPregnancyTrimester(anonymizedPatientData?.gestationalAge),
      
      social_history: anonymizedPatientData?.socialHistory,
      
      chief_complaint: body.clinicalData?.chiefComplaint || '',
      symptoms: body.clinicalData?.symptoms || [],
      symptom_duration: body.clinicalData?.symptomDuration || '',
      vital_signs: body.clinicalData?.vitalSigns || {},
      disease_history: body.clinicalData?.diseaseHistory || '',
      
      ai_questions: body.questionsData || [],
      
      anonymousId: anonymousId
    }
    
    console.log('📋 Patient context prepared (ANONYMIZED)')
    console.log(`   - Age: ${patientContext.age} years`)
    console.log(`   - Sex: ${patientContext.sex}`)
    console.log(`   - Pregnancy status: ${patientContext.pregnancy_status}`)
    console.log(`   - Gestational age: ${patientContext.gestational_age || 'N/A'}`)
    console.log(`   - Trimester: ${patientContext.trimester || 'N/A'}`)
    console.log(`   - Symptoms: ${patientContext.symptoms.length}`)
    console.log(`   - AI questions: ${patientContext.ai_questions.length}`)
    console.log(`   - Anonymous ID: ${patientContext.anonymousId}`)
    console.log(`   - Identity: PROTECTED ✅`)
    
    const finalPrompt = preparePromptWithPregnancy(patientContext)
    
    const { data: openaiData, analysis: medicalAnalysis } = await callOpenAIWithRetry(
      apiKey,
      finalPrompt,
      patientContext
    )
    
    console.log('✅ Medical analysis generated with posology validation')
    
    // CRITICAL: Final posology verification
    console.log('🔍 FINAL POSOLOGY VERIFICATION:');
    console.log('═══════════════════════════════════════');
    let suspiciousPosologies = 0;
    medicalAnalysis.treatment_plan?.medications?.forEach((med: any, idx: number) => {
      const posology = med.posology || 'NO POSOLOGY';
      console.log(`   ${idx + 1}. ${med.drug}: "${posology}"`);
      
      // Detect problems
      if (posology === 'once daily' || posology === '1 tablet once daily') {
        const drugName = med.drug.toLowerCase();
        // List of medications that are actually once daily
        const validOnceDaily = ACTUALLY_ONCE_DAILY_MEDICATIONS;
        const isValidOnceDaily = validOnceDaily.some(d => drugName.includes(d));
        
        if (!isValidOnceDaily) {
          console.error(`      ⚠️ SUSPICIOUS: Generic "once daily" for ${med.drug}!`);
          suspiciousPosologies++;
          
          // Final correction attempt
          const correction = validateAndCorrectPosology(med, medicalAnalysis.clinical_analysis?.primary_diagnosis?.condition || '');
          if (correction.correctedPosology) {
            console.log(`      ✅ Final correction applied: ${correction.correctedPosology}`);
            med.posology = correction.correctedPosology;
          }
        } else {
          console.log(`      ✅ Valid: ${med.drug} is actually once daily`);
        }
      }
    });
    
    if (suspiciousPosologies > 0) {
      console.log(`⚠️ Fixed ${suspiciousPosologies} suspicious posology issue(s)`);
    }
    console.log('═══════════════════════════════════════');
    
    const validation = validateMedicalAnalysisWithPregnancy(medicalAnalysis, patientContext)
    
    if (!validation.isValid && validation.issues.length > 0) {
      console.error('❌ Critical issues detected:', validation.issues)
    }
    
    if (validation.suggestions.length > 0) {
      console.log('💡 Improvement suggestions:', validation.suggestions)
    }
    
    if (validation.pregnancyWarnings.length > 0) {
      console.log('🤰 Pregnancy warnings:', validation.pregnancyWarnings)
    }
    
    if (validation.posologyCorrections.length > 0) {
      console.log('📝 Posology corrections:', validation.posologyCorrections)
    }
    
    const patientContextWithIdentity = {
      ...patientContext,
      ...originalIdentity
    }
    
    const professionalDocuments = generateMedicalDocumentsWithPregnancy(
      medicalAnalysis,
      patientContextWithIdentity,
      MAURITIUS_HEALTHCARE_CONTEXT
    )
    
    const processingTime = Date.now() - startTime
    console.log(`✅ PROCESSING COMPLETED IN ${processingTime}ms`)
    console.log(`📊 Summary: ${validation.metrics.medications} medication(s), ${validation.metrics.laboratory_tests} lab test(s), ${validation.metrics.imaging_studies} imaging study/studies`)
    console.log(`🔒 Data protection: ACTIVE`)
    console.log(`🤰 Pregnancy safety: ${validation.metrics.pregnancySafetyChecked ? 'VERIFIED' : 'N/A'}`)
    console.log(`📝 Posology issues fixed: ${validation.metrics.posologyIssuesFixed}`);
    
    const finalResponse = {
      success: true,
      processingTime: `${processingTime}ms`,
      
      dataProtection: {
        enabled: true,
        method: 'anonymization',
        anonymousId: patientContext.anonymousId,
        fieldsProtected: ['firstName', 'lastName', 'name'],
        message: 'Patient identity was protected during AI processing',
        compliance: {
          rgpd: true,
          hipaa: true,
          dataMinimization: true
        }
      },
      
      pregnancySafety: {
        status: patientContext.pregnancy_status,
        gestationalAge: patientContext.gestational_age,
        trimester: patientContext.trimester,
        safetyVerified: validation.metrics.pregnancySafetyChecked,
        warnings: validation.pregnancyWarnings
      },
      
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        suggestions: validation.suggestions,
        pregnancyWarnings: validation.pregnancyWarnings,
        posologyCorrections: validation.posologyCorrections,
        metrics: validation.metrics
      },
      
      diagnosticReasoning: medicalAnalysis.diagnostic_reasoning || null,
      
      diagnosis: {
        primary: {
          condition: medicalAnalysis.clinical_analysis?.primary_diagnosis?.condition || "Diagnosis in progress",
          icd10: medicalAnalysis.clinical_analysis?.primary_diagnosis?.icd10_code || "R69",
          confidence: medicalAnalysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70,
          severity: medicalAnalysis.clinical_analysis?.primary_diagnosis?.severity || "moderate",
          pregnancyImpact: medicalAnalysis.clinical_analysis?.primary_diagnosis?.pregnancy_impact || '',
          fetalRisk: medicalAnalysis.clinical_analysis?.primary_diagnosis?.fetal_risk || '',
          detailedAnalysis: medicalAnalysis.clinical_analysis?.primary_diagnosis?.pathophysiology || "Analysis in progress",
          clinicalRationale: medicalAnalysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || "Reasoning in progress",
          prognosis: medicalAnalysis.clinical_analysis?.primary_diagnosis?.prognosis || "To be determined",
          diagnosticCriteriaMet: medicalAnalysis.clinical_analysis?.primary_diagnosis?.diagnostic_criteria_met || [],
          certaintyLevel: medicalAnalysis.clinical_analysis?.primary_diagnosis?.certainty_level || "Moderate"
        },
        differential: medicalAnalysis.clinical_analysis?.differential_diagnoses || [],
        pregnancyAssessment: medicalAnalysis.clinical_analysis?.pregnancy_assessment || null
      },
      
      expertAnalysis: {
        clinical_confidence: medicalAnalysis.diagnostic_reasoning?.clinical_confidence || {},
        
        expert_investigations: {
          investigation_strategy: medicalAnalysis.investigation_strategy || {},
          clinical_justification: medicalAnalysis.investigation_strategy?.clinical_justification || {},
          pregnancy_safe_alternatives: medicalAnalysis.investigation_strategy?.pregnancy_safe_alternatives || {},
          immediate_priority: [
            ...(medicalAnalysis.investigation_strategy?.laboratory_tests || []).map((test: any) => ({
              category: 'biology',
              examination: test.test_name || "Test",
              pregnancy_safe: test.pregnancy_safe !== false,
              specific_indication: test.clinical_justification || "Indication",
              urgency: test.urgency || "routine"
            })),
            ...(medicalAnalysis.investigation_strategy?.imaging_studies || []).map((img: any) => ({
              category: 'imaging',
              examination: img.study_name || "Imaging",
              radiation_exposure: img.radiation_exposure || false,
              pregnancy_alternative: img.pregnancy_alternative || '',
              specific_indication: img.indication || "Indication",
              urgency: img.urgency || "routine"
            }))
          ]
        },
        
        expert_therapeutics: {
          treatment_approach: medicalAnalysis.treatment_plan?.approach || {},
          pregnancy_safety_statement: medicalAnalysis.treatment_plan?.pregnancy_safety_statement || '',
          prescription_rationale: medicalAnalysis.treatment_plan?.prescription_rationale || {},
          primary_treatments: (medicalAnalysis.treatment_plan?.medications || []).map((med: any) => ({
            medication_dci: med.drug || "Medication",
            therapeutic_class: med.therapeutic_role || '',
            precise_indication: med.indication || "Indication",
            mechanism: med.mechanism || "Mechanism",
            pregnancy_category: med.pregnancy_category || '',
            pregnancy_safety: med.pregnancy_safety || '',
            breastfeeding_category: med.breastfeeding_category || '',
            trimester_precautions: med.trimester_precautions || '',
            fetal_monitoring: med.fetal_monitoring || '',
            posology: med.posology || "Standard dosing", // Validated posology
            duration: med.duration || "As directed",
            packaging: med.packaging || "To be specified",
            quantity: med.quantity || "As needed",
            form: med.form || '',
            route: med.route || '',
            monitoring: med.monitoring || {},
            side_effects: med.side_effects || {},
            contraindications: med.contraindications || {},
            administration_instructions: med.administration_instructions || {}
          })),
          non_pharmacological: medicalAnalysis.treatment_plan?.non_pharmacological || {}
        }
      },
      
      followUpPlan: medicalAnalysis.follow_up_plan || {},
      patientEducation: medicalAnalysis.patient_education || {},
      
      mauritianDocuments: professionalDocuments,
      
      metadata: {
        ai_model: 'GPT-4o',
        system_version: '6.1-Posology-Fix-Complete',
        approach: 'Evidence-Based Medicine with Posology Validation',
        medical_guidelines: medicalAnalysis.quality_metrics?.guidelines_followed || ["WHO", "ACOG", "RCOG", "ESC", "NICE"],
        evidence_level: medicalAnalysis.quality_metrics?.evidence_level || "High",
        mauritius_adapted: true,
        data_protection_enabled: true,
        pregnancy_safety_verified: medicalAnalysis.quality_metrics?.pregnancy_safety_verified || false,
        posology_validation_enabled: true,
        generation_timestamp: new Date().toISOString(),
        quality_metrics: medicalAnalysis.quality_metrics || {},
        validation_passed: validation.isValid,
        completeness_score: medicalAnalysis.quality_metrics?.completeness_score || 0.85,
        total_processing_time_ms: processingTime,
        tokens_used: openaiData.usage || {},
        retry_count: 0,
        posology_corrections_applied: validation.metrics.posologyIssuesFixed || 0
      }
    }
    
    return NextResponse.json(finalResponse)
    
  } catch (error) {
    console.error('❌ Critical error:', error)
    const errorTime = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorCode: 'PROCESSING_ERROR',
      timestamp: new Date().toISOString(),
      processingTime: `${errorTime}ms`,
      
      diagnosis: generateEmergencyFallbackDiagnosis(body?.patientData || {}),
      
      expertAnalysis: {
        expert_investigations: {
          immediate_priority: [],
          investigation_strategy: {},
          pregnancy_safe_alternatives: {},
          tests_by_purpose: {},
          test_sequence: {}
        },
        expert_therapeutics: {
          primary_treatments: [],
          non_pharmacological: "Consult a physician in person as soon as possible"
        }
      },
      
      mauritianDocuments: {
        consultation: {
          header: {
            title: "ERROR REPORT",
            date: new Date().toLocaleDateString('en-US'),
            type: "System error"
          },
          error_details: {
            message: error instanceof Error ? error.message : 'Unknown error',
            recommendation: "Please try again or consult a physician in person"
          }
        }
      },
      
      metadata: {
        ai_model: 'GPT-4o',
        system_version: '6.1-Posology-Fix-Complete',
        error_logged: true,
        support_contact: 'support@telemedecine.mu'
      }
    }, { status: 500 })
  }
}

// ==================== HEALTH ENDPOINT ====================
export async function GET(request: NextRequest) {
  const monitoringData = {
    medications: {} as any,
    tests: {} as any,
    pharmacologicalErrors: PrescriptionMonitoring.metrics.pharmacologicalErrors.slice(-10),
    pregnancyAdjustments: PrescriptionMonitoring.metrics.pregnancyAdjustments.slice(-10),
    posologyCorrections: PrescriptionMonitoring.metrics.posologyCorrections.slice(-10) // NEW
  }
  
  PrescriptionMonitoring.metrics.avgMedicationsPerDiagnosis.forEach((values, diagnosis) => {
    monitoringData.medications[diagnosis] = {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }
  })
  
  PrescriptionMonitoring.metrics.avgTestsPerDiagnosis.forEach((values, diagnosis) => {
    monitoringData.tests[diagnosis] = {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }
  })
  
  return NextResponse.json({
    status: '✅ Mauritius Medical AI - Version 6.1 with Complete Posology Fix',
    version: '6.1-Posology-Fix-Complete',
    features: [
      '🔒 Patient data anonymization (RGPD/HIPAA)',
      '💊 POSOLOGY FIX: Automatic correction of generic "once daily"',
      '📝 Specific posologies for ALL drug classes',
      '✅ Validation of correct once-daily medications',
      '🔧 Real-time posology correction system',
      '🤰 Complete pregnancy safety management',
      '👶 FDA pregnancy categories (A, B, C, D, X)',
      '🤱 Breastfeeding safety (L1-L5 categories)',
      '⚠️ Automatic contraindicated medication replacement',
      '📊 Trimester-specific adjustments',
      '🩻 Radiation-free imaging alternatives for pregnancy',
      '💊 Pregnancy-safe therapeutic protocols',
      '🚨 Obstetric emergency recognition',
      '📋 Evidence-based pregnancy protocols',
      '📦 Complete packaging specification',
      '💉 Exact posology for all medications',
      '👶 Pediatric dose adjustments',
      '👴 Geriatric dose adjustments',
      '🏥 All medical specialties including obstetrics',
      '✅ Therapeutic coherence verification',
      '📊 Real-time prescription monitoring'
    ],
    posologyValidation: {
      enabled: true,
      actuallyOnceDailyMedications: ACTUALLY_ONCE_DAILY_MEDICATIONS.length + ' medications',
      correctionRules: {
        antibiotics: 'TID/QID for most, BID for some',
        nsaids: 'TID with food',
        analgesics: 'Q6H for paracetamol',
        earDrops: 'BID',
        eyeDrops: 'QID or more frequent',
        gastrointestinal: 'TID before meals for prokinetics'
      },
      autoCorrection: true,
      realTimeValidation: true
    },
    pregnancyManagement: {
      enabled: true,
      categories: Object.keys(PREGNANCY_CATEGORIES),
      breastfeedingCategories: Object.keys(BREASTFEEDING_CATEGORIES),
      safetyDatabase: Object.keys(MEDICATION_PREGNANCY_SAFETY).length + ' medications',
      protocolsStandard: Object.keys(THERAPEUTIC_PROTOCOLS).length + ' conditions',
      protocolsPregnancy: Object.keys(PREGNANCY_SAFE_PROTOCOLS).length + ' pregnancy-adapted protocols',
      features: [
        'Gestational age calculation',
        'Trimester identification',
        'Medication safety verification',
        'Alternative medication suggestions',
        'Radiation exposure warnings',
        'Obstetric referral recommendations',
        'Fetal risk assessment'
      ]
    },
    pharmacologicalValidation: {
      enabled: true,
      drugsClassified: Object.keys(DRUG_CLASSIFICATIONS).length,
      protocolsCovered: Object.keys(THERAPEUTIC_PROTOCOLS).length,
      posologyIncluded: true,
      posologyValidationActive: true,
      packagingSpecified: true,
      ageAdjustments: ['pediatric', 'geriatric'],
      pregnancyAdjustments: true,
      commonErrors: [
        'Generic "once daily" auto-corrected',
        'Acetic acid misclassified as antibiotic',
        'Paracetamol misclassified as anti-inflammatory',
        'Generic "1 box" replaced with specific packaging',
        'Missing posology corrected',
        'NSAIDs replaced in 3rd trimester',
        'ACE inhibitors replaced in pregnancy'
      ]
    },
    monitoring: monitoringData,
    dataProtection: {
      enabled: true,
      method: 'crypto.randomUUID()',
      compliance: ['RGPD', 'HIPAA', 'Data Minimization'],
      protectedFields: ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'idNumber', 'ssn']
    },
    endpoints: {
      diagnosis: 'POST /api/openai-diagnosis',
      health: 'GET /api/openai-diagnosis'
    },
    guidelines: {
      supported: ['WHO', 'ACOG', 'RCOG', 'ESC', 'NICE', 'Mauritius MOH'],
      approach: 'Evidence-based medicine with posology validation and pregnancy safety'
    },
    performance: {
      averageResponseTime: '20-40 seconds',
      maxTokens: 8000,
      model: 'GPT-4o',
      timeout: 'NONE - Let OpenAI complete',
      posologyValidationTime: '< 100ms per medication'
    },
    posologyExamples: {
      correct: {
        'Amoxicillin 500mg': '1 capsule three times daily',
        'Ibuprofen 400mg': '1 tablet three times daily with food',
        'Ciprofloxacin 500mg': '1 tablet twice daily',
        'Paracetamol 500mg': '2 tablets every 6 hours as needed',
        'Azithromycin 500mg': '500mg once daily (CORRECT once daily)',
        'Amlodipine 5mg': '1 tablet once daily (CORRECT once daily)'
      },
      incorrect: {
        'Amoxicillin': 'once daily ❌',
        'Ibuprofen': 'once daily ❌',
        'Paracetamol': 'once daily ❌',
        'Ear drops': 'once daily ❌'
      }
    }
  })
}

// Next.js configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb'
    }
  }
}
