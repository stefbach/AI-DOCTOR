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
      console.log('Input data:', { patientData, clinicalData, questionsData, diagnosisData })

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

      // Create COMPLETE consultation data structure with ALL information
      const consultationData = {
        // Patient information
        patientInfo: {
          name: `${patientData.firstName} ${patientData.lastName}`,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: patientData.age,
          birthDate: patientData.birthDate,
          gender: Array.isArray(patientData.gender) ? patientData.gender[0] : patientData.gender,
          weight: patientData.weight,
          height: patientData.height,
          bmi: patientData.weight && patientData.height ? 
            (patientData.weight / Math.pow(patientData.height/100, 2)).toFixed(1) : null,
          date: new Date().toLocaleDateString('fr-FR'),
          address: patientData.address || '',
          phone: patientData.phone || patientData.phoneNumber || '',
          email: patientData.email || '',
          allergies: patientData.allergies?.join(', ') || 'Aucune',
          medicalHistory: patientData.medicalHistory?.join(', ') || 'Aucun',
          currentMedications: patientData.currentMedicationsText || 'Aucun',
          lifeHabits: patientData.lifeHabits || {}
        },
        
        // Clinical information
        chiefComplaint: clinicalData.chiefComplaint || 'Consultation de contrôle',
        diseaseHistory: clinicalData.diseaseHistory || '',
        symptomDuration: clinicalData.symptomDuration || '',
        symptoms: clinicalData.symptoms || [],
        vitalSigns: {
          temperature: clinicalData.vitalSigns?.temperature || '',
          bloodPressureSystolic: clinicalData.vitalSigns?.bloodPressureSystolic || '',
          bloodPressureDiastolic: clinicalData.vitalSigns?.bloodPressureDiastolic || '',
          bloodPressure: clinicalData.vitalSigns?.bloodPressureSystolic && 
                        clinicalData.vitalSigns?.bloodPressureDiastolic ? 
                        `${clinicalData.vitalSigns.bloodPressureSystolic}/${clinicalData.vitalSigns.bloodPressureDiastolic} mmHg` : ''
        },
        
        // AI Questions responses
        questionsResponses: questionsData?.responses || {},
        questionsAnswered: questionsData?.questions || [],
        
        // Complete diagnosis information
        diagnosis: diagnosisData?.diagnosis?.primary?.condition || 'À déterminer',
        diagnosticConfidence: diagnosisData?.diagnosis?.primary?.confidence || 0,
        diagnosticReasoning: diagnosisData?.diagnosis?.primary?.reasoning || '',
        
        // Differential diagnoses
        differentialDiagnoses: diagnosisData?.diagnosis?.differential || [],
        
        // Treatment plan
        treatmentPlan: diagnosisData?.treatmentPlan || {},
        medications: diagnosisData?.treatmentPlan?.medications || [],
        recommendations: diagnosisData?.treatmentPlan?.recommendations || [],
        
        // Examinations
        suggestedExams: diagnosisData?.suggestedExams || {},
        labTests: diagnosisData?.suggestedExams?.lab || [],
        imagingTests: diagnosisData?.suggestedExams?.imaging || [],
        
        // Red flags and monitoring
        redFlags: diagnosisData?.redFlags || [],
        monitoring: diagnosisData?.monitoring || [],
        
        // Follow-up
        followUp: diagnosisData?.followUp || {},
        nextVisit: diagnosisData?.followUp?.nextVisit || '',
        
        // Full examination text
        examination: this.generateExaminationText(clinicalData, questionsData),
        treatment: this.generateTreatmentPlan(diagnosisData),
        followUpPlan: this.generateFollowUpPlan(diagnosisData)
      }

      // Log the complete consultation data
      console.log('📋 Complete consultation data:', consultationData)

      // Generate Mauritian documents using the generator with FULL data
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
        // Include original data for reference
        originalData: {
          patientData,
          clinicalData,
          questionsData,
          diagnosisData
        },
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
    let exam = 'EXAMEN CLINIQUE COMPLET\n'
    exam += '======================\n\n'
    
    // Vital signs
    if (clinicalData.vitalSigns) {
      exam += 'Signes vitaux:\n'
      if (clinicalData.vitalSigns.temperature) {
        exam += `- Température: ${clinicalData.vitalSigns.temperature}°C\n`
      }
      if (clinicalData.vitalSigns.bloodPressureSystolic && clinicalData.vitalSigns.bloodPressureDiastolic) {
        exam += `- Tension artérielle: ${clinicalData.vitalSigns.bloodPressureSystolic}/${clinicalData.vitalSigns.bloodPressureDiastolic} mmHg\n`
      }
      exam += '\n'
    }

    // Chief complaint and history
    if (clinicalData.chiefComplaint) {
      exam += `Motif de consultation:\n${clinicalData.chiefComplaint}\n\n`
    }

    if (clinicalData.diseaseHistory) {
      exam += `Histoire de la maladie:\n${clinicalData.diseaseHistory}\n\n`
    }

    // Symptoms
    if (clinicalData.symptoms && clinicalData.symptoms.length > 0) {
      exam += `Symptômes rapportés:\n`
      clinicalData.symptoms.forEach((symptom: string) => {
        exam += `- ${symptom}\n`
      })
      exam += '\n'
    }

    // Duration
    if (clinicalData.symptomDuration) {
      exam += `Durée des symptômes: ${clinicalData.symptomDuration}\n\n`
    }

    // AI Questions responses
    if (questionsData?.responses && Object.keys(questionsData.responses).length > 0) {
      exam += 'Réponses aux questions cliniques spécifiques:\n'
      Object.entries(questionsData.responses).forEach(([question, answer]) => {
        exam += `Q: ${question}\n`
        exam += `R: ${answer}\n\n`
      })
    }

    return exam || 'Examen physique normal'
  }

  private generateTreatmentPlan(diagnosisData: any): string {
    let plan = 'PLAN THÉRAPEUTIQUE DÉTAILLÉ\n'
    plan += '==========================\n\n'

    // Primary diagnosis
    if (diagnosisData?.diagnosis?.primary) {
      plan += `Diagnostic principal: ${diagnosisData.diagnosis.primary.condition}\n`
      plan += `Niveau de confiance: ${diagnosisData.diagnosis.primary.confidence}%\n\n`
      
      if (diagnosisData.diagnosis.primary.reasoning) {
        plan += `Raisonnement diagnostique:\n${diagnosisData.diagnosis.primary.reasoning}\n\n`
      }
    }

    // Differential diagnoses
    if (diagnosisData?.diagnosis?.differential && diagnosisData.diagnosis.differential.length > 0) {
      plan += 'Diagnostics différentiels:\n'
      diagnosisData.diagnosis.differential.forEach((diff: any, index: number) => {
        plan += `${index + 1}. ${diff.condition} (${diff.confidence}%)\n`
        if (diff.reasoning) {
          plan += `   Justification: ${diff.reasoning}\n`
        }
      })
      plan += '\n'
    }

    // Medications
    if (diagnosisData?.treatmentPlan?.medications && diagnosisData.treatmentPlan.medications.length > 0) {
      plan += 'Médications prescrites:\n'
      diagnosisData.treatmentPlan.medications.forEach((med: any, index: number) => {
        plan += `${index + 1}. ${med.name}\n`
        plan += `   - Dosage: ${med.dosage}\n`
        plan += `   - Fréquence: ${med.frequency}\n`
        plan += `   - Durée: ${med.duration}\n`
        if (med.indication) {
          plan += `   - Indication: ${med.indication}\n`
        }
        plan += '\n'
      })
    }

    // Recommendations
    if (diagnosisData?.treatmentPlan?.recommendations && diagnosisData.treatmentPlan.recommendations.length > 0) {
      plan += 'Recommandations thérapeutiques:\n'
      diagnosisData.treatmentPlan.recommendations.forEach((rec: string, index: number) => {
        plan += `${index + 1}. ${rec}\n`
      })
      plan += '\n'
    }

    // Red flags
    if (diagnosisData?.redFlags && diagnosisData.redFlags.length > 0) {
      plan += '⚠️ SIGNES D\'ALARME À SURVEILLER:\n'
      diagnosisData.redFlags.forEach((flag: string) => {
        plan += `- ${flag}\n`
      })
      plan += '\n'
    }

    return plan || 'Plan thérapeutique à définir selon les résultats des examens complémentaires'
  }

  private generateFollowUpPlan(diagnosisData: any): string {
    let followUp = 'PLAN DE SUIVI ET EXAMENS\n'
    followUp += '========================\n\n'

    // Suggested lab tests
    if (diagnosisData?.suggestedExams?.lab && diagnosisData.suggestedExams.lab.length > 0) {
      followUp += 'Examens biologiques recommandés:\n'
      diagnosisData.suggestedExams.lab.forEach((exam: any, index: number) => {
        followUp += `${index + 1}. ${exam.name}\n`
        if (exam.indication) {
          followUp += `   Indication: ${exam.indication}\n`
        }
        if (exam.urgency) {
          followUp += `   Urgence: ${exam.urgency}\n`
        }
      })
      followUp += '\n'
    }

    // Suggested imaging tests
    if (diagnosisData?.suggestedExams?.imaging && diagnosisData.suggestedExams.imaging.length > 0) {
      followUp += 'Examens d\'imagerie recommandés:\n'
      diagnosisData.suggestedExams.imaging.forEach((exam: any, index: number) => {
        followUp += `${index + 1}. ${exam.name}\n`
        if (exam.indication) {
          followUp += `   Indication: ${exam.indication}\n`
        }
        if (exam.preparation) {
          followUp += `   Préparation: ${exam.preparation}\n`
        }
      })
      followUp += '\n'
    }

    // Monitoring
    if (diagnosisData?.monitoring && diagnosisData.monitoring.length > 0) {
      followUp += 'Surveillance recommandée:\n'
      diagnosisData.monitoring.forEach((item: string) => {
        followUp += `- ${item}\n`
      })
      followUp += '\n'
    }

    // Follow-up schedule
    if (diagnosisData?.followUp) {
      if (diagnosisData.followUp.nextVisit) {
        followUp += `Prochaine consultation: ${diagnosisData.followUp.nextVisit}\n`
      }
      if (diagnosisData.followUp.frequency) {
        followUp += `Fréquence de suivi: ${diagnosisData.followUp.frequency}\n`
      }
      followUp += '\n'
    }

    return followUp || 'Suivi à prévoir selon l\'évolution clinique'
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
