export interface Medication {
  drug: string
  posology: string
  duration: string
  quantity: string
  packaging: string
  contraindications?: string[]
  interactions?: string[]
}

export interface LaboratoryTest {
  test_name: string
  justification: string
  urgency: 'routine' | 'urgent' | 'stat'
  contraindications?: string[]
}

export interface ImagingStudy {
  study_name: string
  justification: string
  urgency: 'routine' | 'urgent' | 'stat'
  contraindications?: string[]
  radiation_exposure?: boolean
  pregnancy_alternative?: string
}

export interface InvestigationStrategy {
  diagnostic_approach?: string
  clinical_justification?: string
  laboratory_tests: LaboratoryTest[]
  imaging_studies: ImagingStudy[]
}

export interface TreatmentPlan {
  approach?: string
  prescription_rationale?: string
  medications: Medication[]
}

export interface ClinicalAnalysis {
  primary_diagnosis?: {
    condition: string
    icd10_code: string
    confidence_level: number
    severity: string
    pregnancy_impact?: string
    fetal_risk?: string
    diagnostic_criteria_met: string[]
    certainty_level: string
    pathophysiology: string
    clinical_reasoning: string
    prognosis: string
  }
  differential_diagnoses?: any[]
  pregnancy_assessment?: any
}

export interface MedicalAnalysis {
  clinical_analysis?: ClinicalAnalysis
  investigation_strategy?: InvestigationStrategy
  treatment_plan?: TreatmentPlan
  follow_up_plan?: any
  patient_education?: any
  pregnancy_warnings?: string[]
}
