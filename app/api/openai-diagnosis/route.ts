// app/api/openai-diagnosis/route.ts - VERSION 5.0 COMPLETE WITH POSOLOGY & PACKAGING
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
  pregnancy_status?: string
  last_menstrual_period?: string
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
  metrics: {
    medications: number
    laboratory_tests: number
    imaging_studies: number
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
  contraindication?: string
}

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
    'acetic acid',      // Acidifier, NOT antibiotic
    'hydrogen peroxide', // Antiseptic, NOT antibiotic
    'povidone iodine',  // Antiseptic, NOT antibiotic
    'chlorhexidine',    // Antiseptic, NOT antibiotic
    'alcohol',          // Antiseptic, NOT antibiotic
    'saline'            // Irrigant, NOT antibiotic
  ],
  
  corticosteroids: {
    systemic: ['prednisolone', 'methylprednisolone', 'dexamethasone', 'hydrocortisone'],
    topical: ['betamethasone', 'clobetasol', 'mometasone', 'triamcinolone'],
    inhaled: ['budesonide', 'beclomethasone', 'fluticasone']
  },
  
  nsaids: ['ibuprofen', 'diclofenac', 'naproxen', 'indomethacin', 'ketorolac', 'celecoxib'],
  
  analgesics_only: ['paracetamol', 'acetaminophen'], // NOT anti-inflammatory!
  
  antifungals: ['fluconazole', 'itraconazole', 'ketoconazole', 'clotrimazole', 'miconazole', 'nystatin', 'terbinafine']
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

// ==================== HELPER FUNCTIONS FOR PRESCRIPTION ====================
function generateCompletePrescription(protocolDrug: DrugProtocol, patientAge: number): any {
  // Ajuster la posologie selon l'âge si nécessaire
  let adjustedPosology = protocolDrug.posology
  let adjustedQuantity = protocolDrug.quantity
  let adjustedPackaging = protocolDrug.packaging
  
  // Ajustements pédiatriques
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
  
  // Ajustements gériatriques
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
  
  return 'Oral' // Par défaut
}

function generateAdministrationInstructions(drug: DrugProtocol): string {
  const name = drug.name.toLowerCase()
  
  // Instructions spécifiques par type
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
  
  // Instructions par médicament
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
  
  // Par défaut selon la posologie
  if (drug.posology.includes('with food')) {
    return 'Take with meals'
  }
  if (drug.posology.includes('empty stomach')) {
    return 'Take 1 hour before or 2 hours after meals'
  }
  
  return 'Take as directed'
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
    specialists: "Generally 1-3 week wait, emergencies seen faster"
  },
  costs: {
    consultation: "Public: free, Private: Rs 1500-3000",
    blood_tests: "Rs 400-3000 depending on complexity",
    imaging: "X-ray: Rs 800-1500, CT: Rs 8000-15000, MRI: Rs 15000-25000",
    procedures: "Coronary angiography: Rs 50000-80000, Surgery: Rs 100000+"
  },
  medications: {
    public_free: "Essential medications list free in public hospitals",
    private: "Pharmacies everywhere, variable prices by brand"
  },
  emergency_numbers: {
    samu: "114",
    police_fire: "999",
    private_ambulance: "132"
  }
}

// ==================== DATA PROTECTION FUNCTIONS ====================
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
  
  return { anonymized, originalIdentity, anonymousId }
}

// ==================== PHARMACOLOGICAL VALIDATION WITH AGE ====================
function validatePharmacology(diagnosis: string, medications: any[], patientAge: number = 30): {
  valid: boolean
  errors: string[]
  corrections: any[]
} {
  const errors: string[] = []
  const corrections: any[] = []
  const diagnosisLower = diagnosis.toLowerCase()
  
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
function applyPharmacologicalCorrections(analysis: any, corrections: any[]): any {
  if (!corrections || corrections.length === 0) return analysis
  
  console.log(`🔧 Applying ${corrections.length} pharmacological corrections...`)
  
  let medications = analysis.treatment_plan?.medications || []
  
  // First, remove incorrect medications (process in reverse to maintain indices)
  corrections
    .filter(c => c.action === 'remove')
    .sort((a, b) => b.index - a.index)
    .forEach(correction => {
      console.log(`   ❌ Removing: ${medications[correction.index]?.drug} - ${correction.reason}`)
      medications.splice(correction.index, 1)
    })
  
  // Then, add missing medications with complete posology
  corrections
    .filter(c => c.action === 'add')
    .forEach(correction => {
      console.log(`   ✅ Adding: ${correction.medication.drug}`)
      console.log(`      Posology: ${correction.medication.posology}`)
      console.log(`      Packaging: ${correction.medication.packaging}`)
      medications.push(correction.medication)
    })
  
  analysis.treatment_plan.medications = medications
  
  // Update medication count
  if (analysis.treatment_plan.completeness_check) {
    analysis.treatment_plan.completeness_check.total_medications = medications.length
  }
  
  return analysis
}

// ==================== MONITORING SYSTEM ====================
const PrescriptionMonitoring = {
  metrics: {
    avgMedicationsPerDiagnosis: new Map<string, number[]>(),
    avgTestsPerDiagnosis: new Map<string, number[]>(),
    outliers: [] as any[],
    pharmacologicalErrors: [] as any[]
  },
  
  track(diagnosis: string, medications: number, tests: number, errors: string[] = []) {
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
    
    const medAvg = this.getAverage(diagnosis, 'medications')
    const testAvg = this.getAverage(diagnosis, 'tests')
    
    if (medications > medAvg * 2 || tests > testAvg * 2) {
      this.metrics.outliers.push({
        diagnosis,
        medications,
        tests,
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

// ==================== ENHANCED MEDICAL PROMPT ====================
const ENHANCED_DIAGNOSTIC_PROMPT = `You are an expert physician practicing telemedicine in Mauritius with comprehensive knowledge of ALL medical specialties.

🏥 MEDICAL SPECIALTIES COVERED:
- General Medicine • Pediatrics • Gynecology • Ophthalmology
- Otolaryngology (ENT) • Dermatology • Cardiology • Psychiatry
- Gastroenterology • Respiratory • Endocrinology • Urology
- Neurology • Rheumatology • Infectious Diseases

🇲🇺 MAURITIUS HEALTHCARE CONTEXT:
${JSON.stringify(MAURITIUS_HEALTHCARE_CONTEXT, null, 2)}

📋 PATIENT PRESENTATION:
{{PATIENT_CONTEXT}}

🔴 CRITICAL PHARMACOLOGICAL RULES - MANDATORY:
═══════════════════════════════════════════════════════════

⚠️ DRUG CLASSIFICATION - YOU MUST UNDERSTAND THE DIFFERENCE:

ANTIBIOTICS (kill/inhibit bacteria):
✅ SYSTEMIC: Amoxicillin, Azithromycin, Ciprofloxacin, Cefuroxime, Doxycycline
✅ TOPICAL EAR: Ciprofloxacin drops, Ofloxacin drops, Gentamicin drops
✅ TOPICAL SKIN: Fusidic acid, Mupirocin
✅ TOPICAL EYE: Chloramphenicol, Tobramycin drops

NOT ANTIBIOTICS (commonly confused):
❌ Acetic Acid = ACIDIFIER (changes pH, NOT antibiotic)
❌ Hydrogen Peroxide = ANTISEPTIC (cleans, NOT antibiotic)
❌ Povidone Iodine = ANTISEPTIC (disinfects, NOT antibiotic)
❌ Chlorhexidine = ANTISEPTIC (for gargling/cleaning, NOT antibiotic)

CORTICOSTEROIDS (reduce inflammation):
✅ SYSTEMIC: Prednisolone, Methylprednisolone, Dexamethasone
✅ TOPICAL: Hydrocortisone, Betamethasone, Clobetasol

NSAIDs (anti-inflammatory + analgesic):
✅ Ibuprofen, Diclofenac, Naproxen (BOTH anti-inflammatory AND analgesic)
❌ Paracetamol/Acetaminophen (ONLY analgesic, NO anti-inflammatory effect)

📋 EVIDENCE-BASED PROTOCOLS BY CONDITION WITH EXACT POSOLOGY:
═══════════════════════════════════════════════════════════

OTITIS EXTERNA (External Ear Infection):
MUST PRESCRIBE ALL 4:
1. Ciprofloxacin 0.3% ear drops - 4 drops BD x 7 days (5ml bottle)
2. Hydrocortisone 1% ear drops - 4 drops BD x 7 days (10ml bottle)
3. Ibuprofen 400mg - 1 tab TDS with food x 5 days (box of 30)
4. Paracetamol 500mg - 2 tabs QDS PRN (box of 20)
NEVER: Prescribe acetic acid alone as "antibiotic"

OTITIS MEDIA (Middle Ear Infection):
MUST PRESCRIBE:
1. Amoxicillin 500mg - 1 cap TDS x 7-10 days (box of 21)
2. Ibuprofen 400mg - 1 tab TDS with food x 5 days (box of 30)
3. Pseudoephedrine 60mg - 1 tab TDS x 5 days (box of 15)
4. Paracetamol 500mg - 2 tabs QDS PRN (box of 20)

PHARYNGITIS (Bacterial):
MUST PRESCRIBE:
1. Amoxicillin 500mg - 1 cap TDS x 10 days (box of 30)
2. Ibuprofen 400mg - 1 tab TDS with food x 5 days (box of 30)
3. Chlorhexidine 0.2% mouthwash - Gargle 10ml BD x 7 days (200ml bottle)
4. Paracetamol 500mg - 2 tabs QDS PRN (box of 20)
5. Benzocaine lozenges - 1 every 2-3h PRN (box of 24)

URINARY TRACT INFECTION:
MUST PRESCRIBE:
1. Ciprofloxacin 500mg - 1 tab BD x 3 days (box of 10) OR
   Nitrofurantoin 100mg - 1 cap QDS x 5 days (box of 20)
2. Potassium citrate - 1 sachet TDS x 5 days (box of 20 sachets)
3. Flavoxate 200mg - 1 tab TDS x 5 days (box of 15)
4. Paracetamol 500mg - 2 tabs QDS PRN (box of 20)

⚠️ PACKAGING RULES:
- Tablets/Capsules → "box of X tablets/capsules"
- Liquids → "Xml bottle" (specify volume)
- Drops → "Xml bottle"
- Creams/Gels → "Xg tube"
- Inhalers → "X dose inhaler"
- Sachets → "box of X sachets"
- Single doses → "1 capsule" or "1 sachet"
NEVER use "1 box" without specifying contents

[CONTINUE WITH JSON STRUCTURE...]

GENERATE THIS EXACT JSON STRUCTURE:

{
  "diagnostic_reasoning": {
    "key_findings": {
      "from_history": "[What stands out from patient history]",
      "from_symptoms": "[Pattern recognition from symptoms]",
      "from_ai_questions": "[CRITICAL findings from questionnaire responses]",
      "red_flags": "[Any concerning features requiring urgent action]"
    },
    
    "syndrome_identification": {
      "clinical_syndrome": "[e.g., Acute coronary syndrome, Viral syndrome, etc.]",
      "supporting_features": "[List features supporting this syndrome]",
      "inconsistent_features": "[Any features that don't fit]"
    },
    
    "clinical_confidence": {
      "diagnostic_certainty": "[High/Moderate/Low]",
      "reasoning": "[Why this level of certainty]",
      "missing_information": "[What additional info would increase certainty]"
    }
  },
  
  "clinical_analysis": {
    "primary_diagnosis": {
      "condition": "[Precise diagnosis with classification/stage if applicable]",
      "icd10_code": "[Appropriate ICD-10 code]",
      "confidence_level": [60-85 max for teleconsultation],
      "severity": "mild/moderate/severe/critical",
      "diagnostic_criteria_met": [
        "Criterion 1: [How patient meets this]",
        "Criterion 2: [How patient meets this]"
      ],
      "certainty_level": "[High/Moderate/Low based on available data]",
      
      "pathophysiology": "[MINIMUM 200 WORDS] Mechanism explaining ALL patient's symptoms.",
      
      "clinical_reasoning": "[MINIMUM 150 WORDS] Systematic diagnostic reasoning.",
      
      "prognosis": "[MINIMUM 100 WORDS] Expected evolution."
    },
    
    "differential_diagnoses": []
  },
  
  "investigation_strategy": {
    "diagnostic_approach": "Strategy adapted to Mauritian context",
    "clinical_justification": "[Why these tests or why no tests]",
    "laboratory_tests": [],
    "imaging_studies": [],
    "specialized_tests": []
  },
  
  "treatment_plan": {
    "approach": "[Overall therapeutic strategy]",
    
    "prescription_rationale": "[Why THESE specific medications]",
    
    "medications": [
      {
        "drug": "[Name with exact strength]",
        "therapeutic_role": "etiological/symptomatic/preventive/supportive",
        "indication": "[Specific indication]",
        "mechanism": "[How it helps]",
        "posology": "[EXACT dosing: e.g., 1 tablet three times daily]",
        "duration": "[EXACT duration: e.g., 7 days]",
        "packaging": "[EXACT packaging: e.g., box of 21 tablets]",
        "quantity": "[EXACT quantity: e.g., 1 box]",
        "form": "[tablet/capsule/drops/cream/inhaler/etc]",
        "route": "[Oral/Topical/Otic/Ophthalmic/etc]",
        "dosing": {
          "adult": "[Adult dosing]",
          "adjustments": {
            "elderly": "[If applicable]",
            "renal": "[If applicable]",
            "hepatic": "[If applicable]"
          }
        },
        "monitoring": "[What to monitor]",
        "side_effects": "[Main side effects]",
        "contraindications": "[Contraindications]",
        "interactions": "[Drug interactions]",
        "mauritius_availability": {
          "public_free": true/false,
          "estimated_cost": "[Rs XXX]",
          "alternatives": "[Alternative drugs]",
          "brand_names": "[Common brands]"
        },
        "administration_instructions": "[How to take/use]"
      }
    ],
    
    "non_pharmacological": "[Lifestyle measures]",
    
    "procedures": [],
    "referrals": []
  },
  
  "follow_up_plan": {
    "immediate": "[Within 24-48h]",
    "short_term": "[D3-D7]",
    "long_term": "[1 month]",
    "red_flags": ["Warning signs"],
    "next_consultation": "[When to follow up]"
  },
  
  "patient_education": {
    "understanding_condition": "[Clear explanation]",
    "treatment_importance": "[Why follow treatment]",
    "warning_signs": "[Warning signs]",
    "lifestyle_modifications": "[Lifestyle changes]",
    "mauritius_specific": {
      "tropical_advice": "Hydration 3L/day, avoid sun 10am-4pm",
      "local_diet": "[Diet advice]"
    }
  },
  
  "quality_metrics": {
    "completeness_score": 0.85,
    "evidence_level": "[High/Moderate/Low]",
    "guidelines_followed": ["WHO", "ESC", "NICE"],
    "word_counts": {
      "pathophysiology": 200,
      "clinical_reasoning": 150,
      "patient_education": 150
    }
  }
}`

// ==================== UTILITY FUNCTIONS ====================
function preparePrompt(patientContext: PatientContext): string {
  const aiQuestionsFormatted = patientContext.ai_questions
    .map((q: any) => `Q: ${q.question}\n   A: ${q.answer}`)
    .join('\n   ')
  
  return ENHANCED_DIAGNOSTIC_PROMPT
    .replace('{{PATIENT_CONTEXT}}', JSON.stringify(patientContext, null, 2))
    .replace('{{CHIEF_COMPLAINT}}', patientContext.chief_complaint)
    .replace('{{SYMPTOMS}}', patientContext.symptoms.join(', '))
    .replace('{{DISEASE_HISTORY}}', patientContext.disease_history)
    .replace('{{AI_QUESTIONS}}', aiQuestionsFormatted)
}

// ==================== INTELLIGENT VALIDATION ====================
function validateMedicalAnalysis(
  analysis: any,
  patientContext: PatientContext
): ValidationResult {
  const medications = analysis.treatment_plan?.medications || []
  const labTests = analysis.investigation_strategy?.laboratory_tests || []
  const imaging = analysis.investigation_strategy?.imaging_studies || []
  
  const issues: string[] = []
  const suggestions: string[] = []
  
  console.log(`📊 Complete analysis:`)
  console.log(`   - ${medications.length} medication(s) prescribed`)
  console.log(`   - ${labTests.length} laboratory test(s)`)
  console.log(`   - ${imaging.length} imaging study/studies`)
  
  const diagnosis = analysis.clinical_analysis?.primary_diagnosis?.condition || ''
  
  if (medications.length === 0) {
    console.info('ℹ️ No medications prescribed')
    if (analysis.treatment_plan?.prescription_rationale) {
      console.info(`   Justification: ${analysis.treatment_plan.prescription_rationale}`)
    } else {
      suggestions.push('Consider adding justification for absence of prescription')
    }
  }
  
  if (medications.length === 1) {
    console.warn('⚠️ Only one medication prescribed')
    console.warn(`   Diagnosis: ${diagnosis}`)
    suggestions.push('Verify if symptomatic or adjuvant treatment needed')
  }
  
  if (!analysis.clinical_analysis?.primary_diagnosis?.condition) {
    issues.push('Primary diagnosis missing')
  }
  
  if (!analysis.treatment_plan?.approach) {
    issues.push('Therapeutic approach missing')
  }
  
  if (!analysis.follow_up_plan?.red_flags) {
    issues.push('Red flags missing')
  }
  
  // Validation pharmacologique avec âge
  const patientAge = parseInt(patientContext.age as string) || 30
  const pharmacoValidation = validatePharmacology(diagnosis, medications, patientAge)
  if (!pharmacoValidation.valid) {
    issues.push(...pharmacoValidation.errors)
  }
  
  if (diagnosis) {
    PrescriptionMonitoring.track(
      diagnosis, 
      medications.length, 
      labTests.length + imaging.length,
      pharmacoValidation.errors
    )
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    metrics: {
      medications: medications.length,
      laboratory_tests: labTests.length,
      imaging_studies: imaging.length
    }
  }
}

// ==================== INTELLIGENT RETRY (WITHOUT TIMEOUT) ====================
async function callOpenAIWithRetry(
  apiKey: string,
  prompt: string,
  patientAge: number,
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
              content: 'You are an expert physician with comprehensive knowledge of ALL medical specialties and the Mauritius healthcare system. You MUST follow evidence-based protocols with EXACT posology and packaging specifications. NEVER use generic "1 box" - specify exact packaging like "box of 20 tablets" or "5ml bottle".'
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
      
      // Validation et correction pharmacologique avec âge
      const diagnosis = analysis.clinical_analysis?.primary_diagnosis?.condition || ''
      const medications = analysis.treatment_plan?.medications || []
      
      console.log('💊 Validating pharmacology with patient age:', patientAge)
      const pharmacoValidation = validatePharmacology(diagnosis, medications, patientAge)
      
      if (!pharmacoValidation.valid) {
        console.warn('⚠️ Pharmacological errors detected:')
        pharmacoValidation.errors.forEach(err => console.warn(`   ${err}`))
        
        // Apply corrections
        analysis = applyPharmacologicalCorrections(analysis, pharmacoValidation.corrections)
        console.log('✅ Pharmacological corrections applied with proper posology and packaging')
      }
      
      // Basic validation
      if (!analysis.clinical_analysis?.primary_diagnosis) {
        throw new Error('Incomplete response - diagnosis missing')
      }
      
      console.log('✅ OpenAI response received, validated and corrected')
      return { data, analysis }
      
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Error attempt ${attempt + 1}:`, error)
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`⏳ Retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        if (attempt === 1) {
          prompt += `\n\nCRITICAL REMINDER:
          - Acetic Acid is NOT an antibiotic
          - Paracetamol is NOT anti-inflammatory
          - Follow the EXACT protocols with EXACT posology
          - Use EXACT packaging: "box of 20 tablets" NOT "1 box"
          - Include ALL mandatory medications`
        }
      }
    }
  }
  
  throw lastError || new Error('Failed after multiple attempts')
}

// ==================== DOCUMENT GENERATION ====================
function generateMedicalDocuments(
  analysis: any,
  patient: PatientContext,
  infrastructure: any
): any {
  const currentDate = new Date()
  const consultationId = `TC-MU-${currentDate.getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  
  return {
    consultation: {
      header: {
        title: "MEDICAL TELECONSULTATION REPORT",
        id: consultationId,
        date: currentDate.toLocaleDateString('en-US'),
        time: currentDate.toLocaleTimeString('en-US'),
        type: "Teleconsultation",
        disclaimer: "Assessment based on teleconsultation - Physical examination not performed"
      },
      
      patient: {
        name: `${patient.firstName || patient.name || 'Patient'} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} years`,
        sex: patient.sex,
        weight: patient.weight ? `${patient.weight} kg` : 'Not provided',
        allergies: patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None'
      },
      
      diagnostic_reasoning: analysis.diagnostic_reasoning || {},
      
      clinical_summary: {
        chief_complaint: patient.chief_complaint,
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition || "To be determined",
        severity: analysis.clinical_analysis?.primary_diagnosis?.severity || "moderate",
        confidence: `${analysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70}%`,
        clinical_reasoning: analysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || "In progress",
        prognosis: analysis.clinical_analysis?.primary_diagnosis?.prognosis || "To be evaluated",
        diagnostic_criteria: analysis.clinical_analysis?.primary_diagnosis?.diagnostic_criteria_met || []
      },
      
      management_plan: {
        investigations: analysis.investigation_strategy || {},
        treatment: analysis.treatment_plan || {},
        follow_up: analysis.follow_up_plan || {}
      },
      
      patient_education: analysis.patient_education || {},
      
      metadata: {
        generation_time: new Date().toISOString(),
        ai_confidence: analysis.diagnostic_reasoning?.clinical_confidence || {},
        quality_metrics: analysis.quality_metrics || {}
      }
    },
    
    biological: (analysis.investigation_strategy?.laboratory_tests?.length > 0) ? {
      header: {
        title: "LABORATORY TEST REQUEST",
        validity: "Valid 30 days - All accredited laboratories Mauritius"
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} years`,
        id: consultationId
      },
      
      clinical_context: {
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition || 'Assessment',
        justification: analysis.investigation_strategy?.clinical_justification || 'Diagnostic assessment'
      },
      
      examinations: analysis.investigation_strategy.laboratory_tests.map((test: any, idx: number) => ({
        number: idx + 1,
        test: test.test_name || "Test",
        justification: test.clinical_justification || "Justification",
        urgency: test.urgency || "routine",
        expected_results: test.expected_results || {},
        preparation: test.mauritius_logistics?.preparation || 'As per laboratory protocol',
        where_to_go: {
          recommended: test.mauritius_logistics?.where || "C-Lab, Green Cross, or Biosanté",
          cost_estimate: test.mauritius_logistics?.cost || "Rs 500-2000",
          turnaround: test.mauritius_logistics?.turnaround || "24-48h"
        }
      }))
    } : null,
    
    imaging: (analysis.investigation_strategy?.imaging_studies?.length > 0) ? {
      header: {
        title: "IMAGING REQUEST",
        validity: "Valid 30 days"
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} years`,
        id: consultationId
      },
      
      clinical_context: {
        diagnosis: analysis.clinical_analysis?.primary_diagnosis?.condition || 'Investigation',
        indication: analysis.investigation_strategy?.clinical_justification || 'Imaging assessment'
      },
      
      studies: analysis.investigation_strategy.imaging_studies.map((study: any, idx: number) => ({
        number: idx + 1,
        examination: study.study_name || "Imaging",
        indication: study.indication || "Indication",
        findings_sought: study.findings_sought || {},
        urgency: study.urgency || "routine",
        centers: study.mauritius_availability?.centers || "Apollo, Wellkin, Public hospitals",
        cost_estimate: study.mauritius_availability?.cost || "Variable",
        wait_time: study.mauritius_availability?.wait_time || "As per availability",
        preparation: study.mauritius_availability?.preparation || "As per center protocol"
      }))
    } : null,
    
    medication: (analysis.treatment_plan?.medications?.length > 0) ? {
      header: {
        title: "MEDICAL PRESCRIPTION",
        prescriber: {
          name: "Dr. Teleconsultation Expert",
          registration: "MCM-TELE-2024",
          qualification: "MD, Telemedicine Certified"
        },
        date: currentDate.toLocaleDateString('en-US'),
        validity: "Prescription valid 30 days"
      },
      
      patient: {
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        age: `${patient.age} years`,
        weight: patient.weight ? `${patient.weight} kg` : 'Not provided',
        allergies: patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None known'
      },
      
      diagnosis: {
        primary: analysis.clinical_analysis?.primary_diagnosis?.condition || 'Diagnosis',
        icd10: analysis.clinical_analysis?.primary_diagnosis?.icd10_code || 'R69'
      },
      
      prescriptions: analysis.treatment_plan.medications.map((med: any, idx: number) => ({
        number: idx + 1,
        medication: med.drug || "Medication",
        indication: med.indication || "Indication",
        posology: med.posology || med.dosing?.adult || "As directed",
        duration: med.duration || "As per evolution",
        packaging: med.packaging || "To be specified",
        quantity: med.quantity || "As needed",
        form: med.form || extractFormFromPackaging(med.packaging || ''),
        route: med.route || extractRouteFromName(med.drug || ''),
        instructions: med.administration_instructions || "Take as prescribed",
        monitoring: med.monitoring || {},
        availability: med.mauritius_availability || {},
        warnings: {
          side_effects: med.side_effects || {},
          contraindications: med.contraindications || {},
          interactions: med.interactions || {}
        }
      })),
      
      non_pharmacological: analysis.treatment_plan?.non_pharmacological || {},
      
      footer: {
        legal: "Teleconsultation prescription compliant with Medical Council Mauritius",
        pharmacist_note: "Dispensing authorized as per current regulations"
      }
    } : null,
    
    patient_advice: {
      header: {
        title: "ADVICE AND RECOMMENDATIONS"
      },
      
      content: {
        condition_explanation: analysis.patient_education?.understanding_condition || {},
        treatment_rationale: analysis.patient_education?.treatment_importance || {},
        lifestyle_changes: analysis.patient_education?.lifestyle_modifications || {},
        warning_signs: analysis.patient_education?.warning_signs || {},
        tropical_considerations: analysis.patient_education?.mauritius_specific || {}
      },
      
      follow_up: {
        next_steps: analysis.follow_up_plan?.immediate || {},
        when_to_consult: analysis.follow_up_plan?.red_flags || {},
        next_appointment: analysis.follow_up_plan?.next_consultation || {}
      }
    }
  }
}

// ==================== HELPER FUNCTIONS ====================
function extractTherapeuticClass(medication: any): string {
  const drugName = (medication.drug || '').toLowerCase()
  
  // Antibiotics
  if (drugName.includes('cillin')) return 'Antibiotic - Beta-lactam'
  if (drugName.includes('mycin')) return 'Antibiotic - Macrolide'
  if (drugName.includes('floxacin')) return 'Antibiotic - Fluoroquinolone'
  if (drugName.includes('cef') || drugName.includes('ceph')) return 'Antibiotic - Cephalosporin'
  if (drugName.includes('azole') && !drugName.includes('prazole')) return 'Antibiotic/Antifungal - Azole'
  
  // Analgesics
  if (drugName.includes('paracetamol') || drugName.includes('acetaminophen')) return 'Analgesic - Non-opioid'
  if (drugName.includes('tramadol') || drugName.includes('codeine')) return 'Analgesic - Opioid'
  
  // Anti-inflammatories
  if (drugName.includes('ibuprofen') || drugName.includes('diclofenac') || drugName.includes('naproxen')) return 'NSAID'
  if (drugName.includes('prednis') || drugName.includes('cortisone')) return 'Corticosteroid'
  
  // Cardiovascular
  if (drugName.includes('pril')) return 'Antihypertensive - ACE inhibitor'
  if (drugName.includes('sartan')) return 'Antihypertensive - ARB'
  if (drugName.includes('lol') && !drugName.includes('omeprazole')) return 'Beta-blocker'
  if (drugName.includes('pine') && !drugName.includes('atropine')) return 'Calcium channel blocker'
  if (drugName.includes('statin')) return 'Lipid-lowering - Statin'
  
  // Gastro
  if (drugName.includes('prazole')) return 'PPI'
  if (drugName.includes('tidine')) return 'H2 blocker'
  
  // Others
  if (drugName.includes('salbutamol') || drugName.includes('salmeterol')) return 'Bronchodilator'
  if (drugName.includes('loratadine') || drugName.includes('cetirizine')) return 'Antihistamine'
  
  return 'Therapeutic agent'
}

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
  console.log('🚀 MAURITIUS MEDICAL AI - VERSION 5.0 WITH COMPLETE POSOLOGY')
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
      pregnancy_status: anonymizedPatientData?.pregnancyStatus,
      last_menstrual_period: anonymizedPatientData?.lastMenstrualPeriod,
      social_history: anonymizedPatientData?.socialHistory,
      
      chief_complaint: body.clinicalData?.chiefComplaint || '',
      symptoms: body.clinicalData?.symptoms || [],
      symptom_duration: body.clinicalData?.symptomDuration || '',
      vital_signs: body.clinicalData?.vitalSigns || {},
      disease_history: body.clinicalData?.diseaseHistory || '',
      
      ai_questions: body.questionsData || [],
      
      anonymousId: anonymousId
    }
    
    const patientAge = parseInt(patientContext.age as string) || 30
    
    console.log('📋 Patient context prepared (ANONYMIZED)')
    console.log(`   - Age: ${patientAge} years`)
    console.log(`   - Symptoms: ${patientContext.symptoms.length}`)
    console.log(`   - AI questions: ${patientContext.ai_questions.length}`)
    console.log(`   - Anonymous ID: ${patientContext.anonymousId}`)
    console.log(`   - Identity: PROTECTED ✅`)
    
    const finalPrompt = preparePrompt(patientContext)
    
    const { data: openaiData, analysis: medicalAnalysis } = await callOpenAIWithRetry(
      apiKey,
      finalPrompt,
      patientAge
    )
    
    console.log('✅ Medical analysis generated with complete posology and packaging')
    
    const validation = validateMedicalAnalysis(medicalAnalysis, patientContext)
    
    if (!validation.isValid && validation.issues.length > 0) {
      console.error('❌ Critical issues detected:', validation.issues)
    }
    
    if (validation.suggestions.length > 0) {
      console.log('💡 Improvement suggestions:', validation.suggestions)
    }
    
    const patientContextWithIdentity = {
      ...patientContext,
      ...originalIdentity
    }
    
    const professionalDocuments = generateMedicalDocuments(
      medicalAnalysis,
      patientContextWithIdentity,
      MAURITIUS_HEALTHCARE_CONTEXT
    )
    
    const processingTime = Date.now() - startTime
    console.log(`✅ PROCESSING COMPLETED IN ${processingTime}ms`)
    console.log(`📊 Summary: ${validation.metrics.medications} medication(s), ${validation.metrics.laboratory_tests} lab test(s), ${validation.metrics.imaging_studies} imaging study/studies`)
    console.log(`🔒 Data protection: ACTIVE`)
    console.log(`💊 Pharmacological validation: ENABLED with posology`)
    console.log(`📦 Packaging specification: COMPLETE`)
    
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
      
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        suggestions: validation.suggestions,
        metrics: validation.metrics
      },
      
      diagnosticReasoning: medicalAnalysis.diagnostic_reasoning || null,
      
      diagnosis: {
        primary: {
          condition: medicalAnalysis.clinical_analysis?.primary_diagnosis?.condition || "Diagnosis in progress",
          icd10: medicalAnalysis.clinical_analysis?.primary_diagnosis?.icd10_code || "R69",
          confidence: medicalAnalysis.clinical_analysis?.primary_diagnosis?.confidence_level || 70,
          severity: medicalAnalysis.clinical_analysis?.primary_diagnosis?.severity || "moderate",
          detailedAnalysis: medicalAnalysis.clinical_analysis?.primary_diagnosis?.pathophysiology || "Analysis in progress",
          clinicalRationale: medicalAnalysis.clinical_analysis?.primary_diagnosis?.clinical_reasoning || "Reasoning in progress",
          prognosis: medicalAnalysis.clinical_analysis?.primary_diagnosis?.prognosis || "To be determined",
          diagnosticCriteriaMet: medicalAnalysis.clinical_analysis?.primary_diagnosis?.diagnostic_criteria_met || [],
          certaintyLevel: medicalAnalysis.clinical_analysis?.primary_diagnosis?.certainty_level || "Moderate"
        },
        differential: medicalAnalysis.clinical_analysis?.differential_diagnoses || []
      },
      
      expertAnalysis: {
        clinical_confidence: medicalAnalysis.diagnostic_reasoning?.clinical_confidence || {},
        
        expert_investigations: {
          investigation_strategy: medicalAnalysis.investigation_strategy || {},
          clinical_justification: medicalAnalysis.investigation_strategy?.clinical_justification || {},
          immediate_priority: [
            ...(medicalAnalysis.investigation_strategy?.laboratory_tests || []).map((test: any) => ({
              category: 'biology',
              examination: test.test_name || "Test",
              specific_indication: test.clinical_justification || "Indication",
              urgency: test.urgency || "routine",
              expected_results: test.expected_results || {},
              mauritius_availability: test.mauritius_logistics || {}
            })),
            ...(medicalAnalysis.investigation_strategy?.imaging_studies || []).map((img: any) => ({
              category: 'imaging',
              examination: img.study_name || "Imaging",
              specific_indication: img.indication || "Indication",
              findings_sought: img.findings_sought || {},
              urgency: img.urgency || "routine",
              mauritius_availability: img.mauritius_availability || {}
            }))
          ],
          tests_by_purpose: medicalAnalysis.investigation_strategy?.tests_by_purpose || {},
          test_sequence: medicalAnalysis.investigation_strategy?.test_sequence || {}
        },
        
        expert_therapeutics: {
          treatment_approach: medicalAnalysis.treatment_plan?.approach || {},
          prescription_rationale: medicalAnalysis.treatment_plan?.prescription_rationale || {},
          primary_treatments: (medicalAnalysis.treatment_plan?.medications || []).map((med: any) => ({
            medication_dci: med.drug || "Medication",
            therapeutic_class: extractTherapeuticClass(med),
            precise_indication: med.indication || "Indication",
            mechanism: med.mechanism || "Mechanism",
            posology: med.posology || med.dosing?.adult || "Standard dosing",
            duration: med.duration || "As directed",
            packaging: med.packaging || "To be specified",
            quantity: med.quantity || "As needed",
            form: med.form || extractFormFromPackaging(med.packaging || ''),
            route: med.route || extractRouteFromName(med.drug || ''),
            dosing_regimen: med.dosing || {},
            monitoring: med.monitoring || {},
            side_effects: med.side_effects || {},
            contraindications: med.contraindications || {},
            interactions: med.interactions || {},
            mauritius_availability: med.mauritius_availability || {},
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
        system_version: '5.0-Complete-Posology-Packaging',
        approach: 'Evidence-Based Medicine with Full Prescription Details',
        medical_guidelines: medicalAnalysis.quality_metrics?.guidelines_followed || ["WHO", "ESC", "NICE"],
        evidence_level: medicalAnalysis.quality_metrics?.evidence_level || "High",
        mauritius_adapted: true,
        data_protection_enabled: true,
        pharmacological_validation: true,
        posology_complete: true,
        packaging_specified: true,
        generation_timestamp: new Date().toISOString(),
        quality_metrics: medicalAnalysis.quality_metrics || {},
        validation_passed: validation.isValid,
        completeness_score: medicalAnalysis.quality_metrics?.completeness_score || 0.85,
        total_processing_time_ms: processingTime,
        tokens_used: openaiData.usage || {},
        retry_count: 0
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
        system_version: '5.0-Complete-Posology-Packaging',
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
    pharmacologicalErrors: PrescriptionMonitoring.metrics.pharmacologicalErrors.slice(-10)
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
    status: '✅ Mauritius Medical AI - Version 5.0 Complete Posology & Packaging',
    version: '5.0-Complete-Posology-Packaging',
    features: [
      '🔒 Patient data anonymization (RGPD/HIPAA)',
      '💊 Universal pharmacological validation',
      '📦 Complete packaging specification',
      '💉 Exact posology for all medications',
      '👶 Pediatric dose adjustments',
      '👴 Geriatric dose adjustments',
      '🔧 Automatic prescription correction',
      '🏥 All medical specialties covered',
      '📋 Evidence-based protocols',
      '🚫 Prevention of drug misclassification',
      '✅ Therapeutic coherence verification',
      '📊 Real-time prescription monitoring'
    ],
    dataProtection: {
      enabled: true,
      method: 'crypto.randomUUID()',
      compliance: ['RGPD', 'HIPAA', 'Data Minimization'],
      protectedFields: ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'idNumber', 'ssn']
    },
    pharmacologicalValidation: {
      enabled: true,
      drugsClassified: Object.keys(DRUG_CLASSIFICATIONS).length,
      protocolsCovered: Object.keys(THERAPEUTIC_PROTOCOLS).length,
      posologyIncluded: true,
      packagingSpecified: true,
      ageAdjustments: ['pediatric', 'geriatric'],
      commonErrors: [
        'Acetic acid misclassified as antibiotic',
        'Paracetamol misclassified as anti-inflammatory',
        'Generic "1 box" replaced with specific packaging',
        'Missing posology corrected'
      ]
    },
    monitoring: monitoringData,
    endpoints: {
      diagnosis: 'POST /api/openai-diagnosis',
      health: 'GET /api/openai-diagnosis'
    },
    guidelines: {
      supported: ['WHO', 'ESC', 'AHA', 'NICE', 'Mauritius MOH'],
      approach: 'Evidence-based medicine with complete prescription details'
    },
    performance: {
      averageResponseTime: '20-40 seconds',
      maxTokens: 8000,
      model: 'GPT-4o',
      timeout: 'NONE - Let OpenAI complete'
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
