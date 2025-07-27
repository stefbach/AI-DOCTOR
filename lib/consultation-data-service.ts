// lib/consultation-data-service.ts - Version avec génération locale
import { MauritianDocumentsGenerator } from './mauritian-documents-generator'

class ConsultationDataService {
  private consultationId: string | null = null
  private patientId: string | null = null  
  private doctorId: string | null = null
  private currentData: Record<string, any> = {}

  // Initialize consultation with IDs
  initializeConsultation(consultationId: string, patientId: string, doctorId: string) {
    this.consultationId = consultationId
    this.patientId = patientId
    this.doctorId = doctorId
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentConsultationId', consultationId)
      localStorage.setItem('currentPatientId', patientId)
      localStorage.setItem('currentDoctorId', doctorId)
    }
    
    console.log('Consultation initialized:', { consultationId, patientId, doctorId })
  }

  // Get current consultation ID
  getCurrentConsultationId(): string | null {
    if (this.consultationId) return this.consultationId
    
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentConsultationId')
    }
    
    return null
  }

  // Save data for a specific step
  async saveStepData(step: number, data: any) {
    const stepKey = `step_${step}`
    this.currentData[stepKey] = data
    
    // Also save specific data types
    if (step === 0) {
      this.currentData.patientData = data
    } else if (step === 1) {
      this.currentData.clinicalData = data
    } else if (step === 2) {
      this.currentData.questionsData = data
    } else if (step === 3) {
      this.currentData.diagnosisData = data
    }
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        const key = `consultation_${consultationId}_data`
        localStorage.setItem(key, JSON.stringify(this.currentData))
      }
    }
  }

  // Get all saved data
  getAllData(): any {
    const consultationId = this.getCurrentConsultationId()
    if (!consultationId) return this.currentData
    
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const key = `consultation_${consultationId}_data`
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          this.currentData = JSON.parse(saved)
        } catch (e) {
          console.error('Error parsing saved data:', e)
        }
      }
    }
    
    return this.currentData
  }

  // Save consultation report
  async saveConsultationReport(reportData: any) {
    this.currentData.consultationReport = reportData
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      const consultationId = this.getCurrentConsultationId()
      if (consultationId) {
        const key = `consultation_${consultationId}_data`
        localStorage.setItem(key, JSON.stringify(this.currentData))
      }
    }
  }

  // ✅ NEW: Generate consultation report locally
  async generateConsultationReport(
    patientData: any,
    clinicalData: any,
    questionsData: any,
    diagnosisData: any
  ): Promise<any> {
    try {
      console.log('🚀 Generating consultation report locally...')

      // Get doctor data from sessionStorage
      let doctorInfo = null
      const doctorDataStr = sessionStorage.getItem('tibokDoctorData')
      if (doctorDataStr) {
        doctorInfo = JSON.parse(doctorDataStr)
      }

      // Prepare doctor info with defaults
      const doctor = {
        fullName: doctorInfo?.full_name || doctorInfo?.fullName || "Dr. MÉDECIN EXPERT",
        specialty: doctorInfo?.specialty || "Médecine générale",
        address: doctorInfo?.address || "Cabinet médical, Maurice",
        city: doctorInfo?.city || "Port-Louis, Maurice",
        phone: doctorInfo?.phone || "+230 xxx xxx xxx",
        email: doctorInfo?.email || "contact@cabinet.mu",
        registrationNumber: doctorInfo?.medical_council_number || doctorInfo?.medicalCouncilNumber || "Medical Council of Mauritius - Reg. No. XXXXX"
      }

      // Create consultation data structure
      const consultationData = {
        patientInfo: {
          name: `${patientData.firstName} ${patientData.lastName}`,
          age: patientData.age,
          gender: Array.isArray(patientData.gender) ? patientData.gender[0] : patientData.gender,
          date: new Date().toLocaleDateString('fr-FR'),
          address: patientData.address || '',
          phone: patientData.phone || patientData.phoneNumber || '',
          allergies: patientData.allergies?.join(', ') || 'Aucune'
        },
        chiefComplaint: clinicalData.chiefComplaint || 'Consultation de contrôle',
        diseaseHistory: clinicalData.diseaseHistory || '',
        symptoms: clinicalData.symptoms || [],
        vitalSigns: clinicalData.vitalSigns || {},
        examination: this.generateExaminationText(clinicalData, questionsData),
        diagnosis: diagnosisData?.diagnosis?.primary?.condition || 'À déterminer',
        diagnosticReasoning: diagnosisData?.diagnosis?.primary?.reasoning || '',
        treatment: this.generateTreatmentPlan(diagnosisData),
        followUp: this.generateFollowUpPlan(diagnosisData),
        questionsResponses: questionsData?.responses || {}
      }

      // Generate Mauritian documents using the generator
      const mauritianDocuments = MauritianDocumentsGenerator.generateMauritianDocuments(
        { consultationData },
        doctor,
        patientData,
        diagnosisData
      )

      // Create complete consultation report
      const consultationReport = {
        consultationData,
        mauritianDocuments,
        generatedAt: new Date().toISOString(),
        doctorInfo: doctor,
        success: true
      }

      console.log('✅ Consultation report generated locally:', consultationReport)

      return consultationReport

    } catch (error) {
      console.error('❌ Error generating consultation report:', error)
      throw error
    }
  }

  // Helper methods for generating report sections
  private generateExaminationText(clinicalData: any, questionsData: any): string {
    let exam = 'Examen clinique:\n'
    
    if (clinicalData.vitalSigns) {
      exam += '\nSignes vitaux:\n'
      if (clinicalData.vitalSigns.temperature) {
        exam += `- Température: ${clinicalData.vitalSigns.temperature}°C\n`
      }
      if (clinicalData.vitalSigns.bloodPressureSystolic && clinicalData.vitalSigns.bloodPressureDiastolic) {
        exam += `- Tension artérielle: ${clinicalData.vitalSigns.bloodPressureSystolic}/${clinicalData.vitalSigns.bloodPressureDiastolic} mmHg\n`
      }
    }

    if (questionsData?.responses) {
      exam += '\nRéponses aux questions cliniques:\n'
      Object.entries(questionsData.responses).forEach(([key, value]) => {
        exam += `- ${key}: ${value}\n`
      })
    }

    return exam || 'Examen physique normal'
  }

  private generateTreatmentPlan(diagnosisData: any): string {
    if (!diagnosisData?.treatmentPlan) {
      return 'Plan thérapeutique à définir selon les résultats des examens complémentaires'
    }

    let plan = 'Plan thérapeutique:\n'
    
    if (diagnosisData.treatmentPlan.medications) {
      plan += '\nMédicaments:\n'
      diagnosisData.treatmentPlan.medications.forEach((med: any) => {
        plan += `- ${med.name}: ${med.dosage}\n`
      })
    }

    if (diagnosisData.treatmentPlan.recommendations) {
      plan += '\nRecommandations:\n'
      diagnosisData.treatmentPlan.recommendations.forEach((rec: string) => {
        plan += `- ${rec}\n`
      })
    }

    return plan
  }

  private generateFollowUpPlan(diagnosisData: any): string {
    if (!diagnosisData?.followUp) {
      return 'Suivi à prévoir selon l\'évolution clinique'
    }

    let followUp = 'Plan de suivi:\n'
    
    if (diagnosisData.followUp.nextVisit) {
      followUp += `- Prochaine consultation: ${diagnosisData.followUp.nextVisit}\n`
    }

    if (diagnosisData.followUp.monitoring) {
      followUp += '\nSurveillance:\n'
      diagnosisData.followUp.monitoring.forEach((item: string) => {
        followUp += `- ${item}\n`
      })
    }

    return followUp
  }

  // Clear consultation data
  clearConsultation() {
    this.consultationId = null
    this.patientId = null
    this.doctorId = null
    this.currentData = {}
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentConsultationId')
      localStorage.removeItem('currentPatientId')
      localStorage.removeItem('currentDoctorId')
    }
  }
}

export const consultationDataService = new ConsultationDataService()
