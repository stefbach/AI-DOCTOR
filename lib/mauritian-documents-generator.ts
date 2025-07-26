// lib/mauritian-documents-generator.ts

export interface DoctorInfo {
  fullName: string
  specialty: string
  address: string
  city: string
  phone: string
  email: string
  registrationNumber: string
}

export interface PatientInfo {
  firstName: string
  lastName: string
  dateOfBirth: string
  address: string
  age: string
  weight?: string
  height?: string
  allergies?: string
}

export interface MauritianDocuments {
  consultation: ConsultationReport
  biology: BiologyPrescription
  paraclinical: ParaclinicalPrescription
  medication: MedicationPrescription
}

interface ConsultationReport {
  header: DocumentHeader
  patient: PatientInfo
  anamnesis: {
    chiefComplaint: string
    historyOfDisease: string
    medicalHistory: string
    currentMedications: string
  }
  physicalExam: {
    generalExam: string
    vitalSigns: string
    systemicExam: string
  }
  diagnosticAssessment: {
    primaryDiagnosis: string
    differentialDiagnosis: string[]
    icd10Code?: string
  }
  investigationsPlan: {
    laboratoryTests: string[]
    imaging: string[]
    specialTests: string[]
  }
  therapeuticPlan: {
    medications: string[]
    nonPharmacological: string[]
    followUp: string
  }
  footer: {
    physicianSignature: string
    date: string
    nextAppointment?: string
  }
}

interface BiologyPrescription {
  header: DocumentHeader
  patient: PatientInfo
  prescriptions: Array<{
    exam: string
    indication: string
    urgency: string
    fasting: string
    sampleType: string
    expectedResults: string
    mauritianAvailability: string
  }>
}

interface ParaclinicalPrescription {
  header: DocumentHeader
  patient: PatientInfo
  prescriptions: Array<{
    category: string
    exam: string
    indication: string
    urgency: string
    preparation: string
    contraindications: string
    mauritianAvailability: string
  }>
}

interface MedicationPrescription {
  header: DocumentHeader
  patient: PatientInfo
  prescriptions: Array<{
    medication: string
    dci: string
    dosage: string
    frequency: string
    duration: string
    indication: string
    contraindications: string
    mauritianAvailability: string
  }>
  clinicalAdvice: {
    hydration: string
    activity: string
    diet: string
    mosquitoProtection: string
    followUp: string
    emergency: string
  }
}

interface DocumentHeader {
  title: string
  doctorName: string
  specialty: string
  address: string
  city: string
  phone: string
  email: string
  registrationNumber: string
  date: string
  documentNumber: string
}

export class MauritianDocumentsGenerator {
  
  /**
   * Génère automatiquement les 4 documents mauriciens à partir du compte-rendu
   */
  static generateMauritianDocuments(
    consultationReport: any,
    doctorInfo: DoctorInfo,
    patientData: any,
    diagnosisData: any
  ): MauritianDocuments {
    
    const baseHeader = this.createBaseHeader(doctorInfo)
    const patientInfo = this.extractPatientInfo(patientData, consultationReport)
    
    return {
      consultation: this.generateConsultationReport(consultationReport, baseHeader, patientInfo, diagnosisData),
      biology: this.generateBiologyPrescription(consultationReport, baseHeader, patientInfo, diagnosisData),
      paraclinical: this.generateParaclinicalPrescription(consultationReport, baseHeader, patientInfo, diagnosisData),
      medication: this.generateMedicationPrescription(consultationReport, baseHeader, patientInfo, diagnosisData)
    }
  }

  /**
   * Crée l'en-tête de base pour tous les documents
   */
  private static createBaseHeader(doctorInfo: DoctorInfo): DocumentHeader {
    const currentDate = new Date().toLocaleDateString('fr-FR')
    
    return {
      title: "CABINET MÉDICAL",
      doctorName: `Dr ${doctorInfo.fullName}`,
      specialty: doctorInfo.specialty || "Médecine générale",
      address: doctorInfo.address || "Adresse à compléter",
      city: doctorInfo.city || "Maurice",
      phone: doctorInfo.phone || "+230 xxx xxx xxx",
      email: doctorInfo.email || "email@cabinet.mu",
      registrationNumber: doctorInfo.registrationNumber || "Medical Council of Mauritius - Reg. No. XXXXX",
      date: currentDate,
      documentNumber: `DOC-${Date.now().toString().slice(-8)}`
    }
  }

  /**
   * Extrait les informations patient
   */
  private static extractPatientInfo(patientData: any, consultationReport: any): PatientInfo {
    return {
      firstName: patientData?.firstName || "Prénom",
      lastName: patientData?.lastName || "Nom",
      dateOfBirth: patientData?.dateOfBirth || patientData?.birthDate || "__/__/____",
      address: patientData?.address || "Adresse à compléter, Maurice",
      age: patientData?.age ? `${patientData.age} ans` : "__ ans",
      weight: patientData?.weight || "",
      height: patientData?.height || "",
      allergies: Array.isArray(patientData?.allergies) 
        ? patientData.allergies.join(', ') 
        : patientData?.allergies || "Aucune allergie connue"
    }
  }

  /**
   * Génère le compte-rendu de consultation
   */
  private static generateConsultationReport(
    consultationReport: any, 
    header: DocumentHeader, 
    patient: PatientInfo,
    diagnosisData: any
  ): ConsultationReport {
    
    const primary = diagnosisData?.diagnosis?.primary || consultationReport?.diagnosticAssessment?.primaryDiagnosis
    const investigations = consultationReport?.investigationsPlan || diagnosisData?.recommendations
    
    return {
      header: {
        ...header,
        title: "COMPTE-RENDU DE CONSULTATION",
        documentNumber: `CR-${header.documentNumber}`
      },
      patient,
      anamnesis: {
        chiefComplaint: consultationReport?.anamnesis?.chiefComplaint || "Motif de consultation à documenter",
        historyOfDisease: consultationReport?.anamnesis?.historyOfDisease || "Histoire de la maladie actuelle",
        medicalHistory: consultationReport?.anamnesis?.medicalHistory || "Antécédents médicaux",
        currentMedications: consultationReport?.anamnesis?.currentMedications || "Traitements en cours"
      },
      physicalExam: {
        generalExam: consultationReport?.physicalExam?.generalExam || "Examen général : patient en bon état général",
        vitalSigns: consultationReport?.physicalExam?.vitalSigns || "Signes vitaux dans les normes",
        systemicExam: consultationReport?.physicalExam?.systemicExam || "Examen systémique selon symptomatologie"
      },
      diagnosticAssessment: {
        primaryDiagnosis: primary?.condition || "Diagnostic à préciser",
        differentialDiagnosis: consultationReport?.diagnosticAssessment?.differentialDiagnosis || [],
        icd10Code: primary?.icd10 || ""
      },
      investigationsPlan: {
        laboratoryTests: investigations?.exams?.filter((e: any) => e.category === 'laboratory')?.map((e: any) => e.name) || [],
        imaging: investigations?.exams?.filter((e: any) => e.category === 'imaging')?.map((e: any) => e.name) || [],
        specialTests: investigations?.exams?.filter((e: any) => e.category === 'special')?.map((e: any) => e.name) || []
      },
      therapeuticPlan: {
        medications: investigations?.medications?.map((m: any) => `${m.name} - ${m.dosage} - ${m.frequency}`) || [],
        nonPharmacological: consultationReport?.therapeuticPlan?.nonPharmacological || [
          "Repos adapté",
          "Hydratation renforcée (climat tropical Maurice)",
          "Consultation de réévaluation si pas d'amélioration"
        ],
        followUp: consultationReport?.therapeuticPlan?.followUp || "Suivi selon évolution clinique"
      },
      footer: {
        physicianSignature: header.doctorName,
        date: header.date,
        nextAppointment: "À programmer selon évolution"
      }
    }
  }

  /**
   * Génère l'ordonnance d'examens biologiques
   */
  private static generateBiologyPrescription(
    consultationReport: any,
    header: DocumentHeader,
    patient: PatientInfo,
    diagnosisData: any
  ): BiologyPrescription {
    
    const biologyExams = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority
      ?.filter((exam: any) => exam.category === 'biology') || []

    const defaultExams = biologyExams.length === 0 ? [{
      exam: "Hémogramme complet (NFS) + CRP",
      indication: "Recherche syndrome anémique, infectieux, inflammatoire",
      urgency: "Semi-urgent (24-48h)",
      fasting: "Non",
      sampleType: "Sang veineux",
      expectedResults: "Numération globulaire, formule leucocytaire, CRP",
      mauritianAvailability: "Disponible tous laboratoires Maurice - Pris en charge sécurité sociale"
    }] : []

    const prescriptions = [...biologyExams.map((exam: any) => ({
      exam: exam.examination || "",
      indication: exam.specific_indication || "",
      urgency: exam.urgency === 'immediate' ? "Urgent (dans les heures)" : "Semi-urgent (24-48h)",
      fasting: exam.fasting_required ? "Oui - 8h" : "Non",
      sampleType: exam.sample_type || "Sang veineux",
      expectedResults: exam.interpretation_keys || "",
      mauritianAvailability: exam.mauritius_availability ? 
        `Disponible: ${exam.mauritius_availability.public_centers?.join(', ') || 'Laboratoires Maurice'}` :
        "Disponible laboratoires Maurice"
    })), ...defaultExams]

    return {
      header: {
        ...header,
        title: "ORDONNANCE MÉDICALE - EXAMENS BIOLOGIQUES",
        documentNumber: `BIO-${header.documentNumber}`
      },
      patient,
      prescriptions
    }
  }

  /**
   * Génère l'ordonnance d'examens paracliniques
   */
  private static generateParaclinicalPrescription(
    consultationReport: any,
    header: DocumentHeader,
    patient: PatientInfo,
    diagnosisData: any
  ): ParaclinicalPrescription {
    
    const imagingExams = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority
      ?.filter((exam: any) => exam.category === 'imaging' || exam.category === 'functional') || []

    const defaultExams = imagingExams.length === 0 ? [{
      category: "Imagerie thoracique",
      exam: "Radiographie thoracique de face et profil",
      indication: "Exploration parenchyme pulmonaire selon symptomatologie",
      urgency: "Programmé (1-2 semaines)",
      preparation: "Retrait bijoux et objets métalliques",
      contraindications: "Grossesse (radioprotection)",
      mauritianAvailability: "Hôpitaux publics et centres privés - Gratuit secteur public"
    }] : []

    const prescriptions = [...imagingExams.map((exam: any) => ({
      category: this.determineParaclinicalCategory(exam.examination),
      exam: exam.examination || "",
      indication: exam.specific_indication || "",
      urgency: exam.urgency === 'immediate' ? "Urgent (dans les heures)" : "Programmé (1-2 semaines)",
      preparation: exam.patient_preparation || "Aucune préparation spéciale",
      contraindications: exam.contraindications || "Aucune",
      mauritianAvailability: exam.mauritius_availability ? 
        `${exam.mauritius_availability.public_centers?.join(', ') || 'Centres publics et privés'}` :
        "Centres publics et privés"
    })), ...defaultExams]

    return {
      header: {
        ...header,
        title: "ORDONNANCE MÉDICALE - EXAMENS PARACLINIQUES",
        documentNumber: `PARA-${header.documentNumber}`
      },
      patient,
      prescriptions
    }
  }

  /**
   * Génère l'ordonnance de médicaments
   */
  private static generateMedicationPrescription(
    consultationReport: any,
    header: DocumentHeader,
    patient: PatientInfo,
    diagnosisData: any
  ): MedicationPrescription {
    
    const treatments = diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments || []

    const defaultMedications = treatments.length === 0 ? [{
      medication: "Paracétamol 1000mg",
      dci: "Paracétamol",
      dosage: "1000mg",
      frequency: "3 fois par jour si douleur",
      duration: "5 jours maximum",
      indication: "Traitement symptomatique douleur/fièvre",
      contraindications: "Insuffisance hépatique sévère",
      mauritianAvailability: "Disponible toutes pharmacies Maurice - Médicament essentiel"
    }] : []

    const prescriptions = [...treatments.map((treatment: any) => ({
      medication: `${treatment.medication_dci} ${treatment.dosing_regimen?.standard_adult || ''}`,
      dci: treatment.medication_dci || "",
      dosage: this.extractDosage(treatment.dosing_regimen?.standard_adult),
      frequency: this.extractFrequency(treatment.dosing_regimen?.standard_adult),
      duration: treatment.treatment_duration || "7 jours",
      indication: treatment.precise_indication || "",
      contraindications: treatment.contraindications_absolute?.join(', ') || "À vérifier",
      mauritianAvailability: treatment.mauritius_availability?.locally_available ? 
        "Disponible toutes pharmacies Maurice" : "À commander"
    })), ...defaultMedications]

    return {
      header: {
        ...header,
        title: "ORDONNANCE MÉDICALE - MÉDICAMENTS",
        documentNumber: `MED-${header.documentNumber}`
      },
      patient,
      prescriptions,
      clinicalAdvice: {
        hydration: "Hydratation renforcée (2-3L/jour) - climat tropical Maurice",
        activity: "Repos adapté selon symptômes, éviter efforts intenses aux heures chaudes",
        diet: "Alimentation équilibrée, éviter aliments épicés si troubles digestifs",
        mosquitoProtection: "Protection anti-moustiques indispensable (dengue/chikungunya endémiques)",
        followUp: "Consultation de réévaluation si pas d'amélioration sous 48-72h",
        emergency: "Urgences Maurice: 999 (SAMU) - Cliniques 24h: Apollo Bramwell, Wellkin"
      }
    }
  }

  /**
   * Helpers pour extraction de données
   */
  private static determineParaclinicalCategory(examName: string): string {
    const name = examName?.toLowerCase() || ""
    if (name.includes('echo') || name.includes('écho')) return "Échographie"
    if (name.includes('scanner') || name.includes('tdm')) return "Scanner (TDM)"
    if (name.includes('irm')) return "IRM"
    if (name.includes('radio') && name.includes('thorax')) return "Imagerie thoracique"
    if (name.includes('ecg')) return "Explorations cardiologiques"
    return "Imagerie thoracique"
  }

  private static extractDosage(dosingRegimen: string): string {
    if (!dosingRegimen) return ""
    const match = dosingRegimen.match(/(\d+\s*mg|\d+\s*g|\d+\s*cp)/i)
    return match ? match[1] : ""
  }

  private static extractFrequency(dosingRegimen: string): string {
    if (!dosingRegimen) return "3 fois par jour"
    if (dosingRegimen.includes('x 3/jour') || dosingRegimen.includes('3 fois')) return "3 fois par jour"
    if (dosingRegimen.includes('x 2/jour') || dosingRegimen.includes('2 fois')) return "2 fois par jour"
    if (dosingRegimen.includes('x 4/jour') || dosingRegimen.includes('4 fois')) return "4 fois par jour"
    if (dosingRegimen.includes('x 1/jour') || dosingRegimen.includes('1 fois')) return "1 fois par jour"
    return "3 fois par jour"
  }

  /**
   * Convertit les documents en format d'impression
   */
  static formatForPrint(documents: MauritianDocuments): {
    consultation: string
    biology: string
    paraclinical: string
    medication: string
  } {
    return {
      consultation: this.formatConsultationForPrint(documents.consultation),
      biology: this.formatPrescriptionForPrint(documents.biology, 'BIOLOGIE'),
      paraclinical: this.formatPrescriptionForPrint(documents.paraclinical, 'PARACLINIQUE'),
      medication: this.formatMedicationForPrint(documents.medication)
    }
  }

  private static formatConsultationForPrint(report: ConsultationReport): string {
    return `
**${report.header.title}**
**${report.header.doctorName}**
Spécialité : ${report.header.specialty}
Adresse : ${report.header.address}
Localité : ${report.header.city}
📞 ${report.header.phone} | 📧 ${report.header.email}
💼 ${report.header.registrationNumber}

═══════════════════════════════════════════════

**COMPTE-RENDU DE CONSULTATION**

**Patient :** ${report.patient.firstName} ${report.patient.lastName}
**Date de naissance :** ${report.patient.dateOfBirth}
**Âge :** ${report.patient.age}
**Date de consultation :** ${report.header.date}

**ANAMNÈSE :**
• Motif de consultation : ${report.anamnesis.chiefComplaint}
• Histoire de la maladie : ${report.anamnesis.historyOfDisease}
• Antécédents médicaux : ${report.anamnesis.medicalHistory}
• Traitements actuels : ${report.anamnesis.currentMedications}

**EXAMEN PHYSIQUE :**
• État général : ${report.physicalExam.generalExam}
• Signes vitaux : ${report.physicalExam.vitalSigns}
• Examen systémique : ${report.physicalExam.systemicExam}

**DIAGNOSTIC :**
• Diagnostic principal : ${report.diagnosticAssessment.primaryDiagnosis}
${report.diagnosticAssessment.icd10Code ? `• Code CIM-10 : ${report.diagnosticAssessment.icd10Code}` : ''}

**PLAN DE PRISE EN CHARGE :**
• Examens complémentaires prescrits
• Traitement instauré selon ordonnances jointes
• ${report.therapeuticPlan.followUp}

═══════════════════════════════════════════════

👨⚕️ **${report.footer.physicianSignature}**
Date : ${report.footer.date}
    `.trim()
  }

  private static formatPrescriptionForPrint(prescription: any, type: string): string {
    return `
**CABINET MÉDICAL DU ${prescription.header.doctorName}**
Spécialité : ${prescription.header.specialty}
Adresse : ${prescription.header.address}
Localité : ${prescription.header.city}
📞 ${prescription.header.phone} | 📧 ${prescription.header.email}
💼 ${prescription.header.registrationNumber}

**ORDONNANCE MÉDICALE / PRESCRIPTION - ${type}**

**Nom du patient :** ${prescription.patient.firstName} ${prescription.patient.lastName}
**Date de naissance :** ${prescription.patient.dateOfBirth}
**Adresse du patient :** ${prescription.patient.address}
**Date de prescription :** ${prescription.header.date}

🧪 **Examens demandés :**

${prescription.prescriptions.map((item: any, index: number) => `
${index + 1}. **${item.exam || item.medication}**
   • ${item.indication}
   • Urgence : ${item.urgency}
   ${item.fasting ? `• Jeûne : ${item.fasting}` : ''}
   ${item.contraindications ? `• Contre-indications : ${item.contraindications}` : ''}
   • Disponibilité Maurice : ${item.mauritianAvailability}
`).join('\n')}

💬 **Remarques complémentaires :**
À faire en laboratoire agréé / centre médical reconnu
${type === 'BIOLOGIE' ? 'Résultats à rapporter à la prochaine consultation' : ''}

═══════════════════════════════════════════════

👨⚕️ **Signature et cachet du médecin :**
${prescription.header.doctorName}
Date : ${prescription.header.date}
    `.trim()
  }

  private static formatMedicationForPrint(prescription: MedicationPrescription): string {
    return `
**CABINET MÉDICAL DU ${prescription.header.doctorName}**
Spécialité : ${prescription.header.specialty}
Adresse : ${prescription.header.address}
Localité : ${prescription.header.city}
📞 ${prescription.header.phone} | 📧 ${prescription.header.email}
💼 ${prescription.header.registrationNumber}

**ORDONNANCE MÉDICALE / PRESCRIPTION**

**Nom du patient :** ${prescription.patient.firstName} ${prescription.patient.lastName}
**Date de naissance :** ${prescription.patient.dateOfBirth}
**Adresse du patient :** ${prescription.patient.address}
**Allergies :** ${prescription.patient.allergies}
**Date de prescription :** ${prescription.header.date}

💊 **Médicaments prescrits :**

${prescription.prescriptions.map((med: any, index: number) => `
${index + 1}. **${med.medication}** (DCI : ${med.dci})
   • Posologie : ${med.dosage} - ${med.frequency}
   • Durée : ${med.duration}
   • Indication : ${med.indication}
   • Disponible : ${med.mauritianAvailability}
`).join('\n')}

💬 **Conseils au patient :**
• ${prescription.clinicalAdvice.hydration}
• ${prescription.clinicalAdvice.activity}
• ${prescription.clinicalAdvice.diet}
• ${prescription.clinicalAdvice.mosquitoProtection}
• ${prescription.clinicalAdvice.followUp}
• **URGENCES :** ${prescription.clinicalAdvice.emergency}

⚠️ **Respecter les posologies prescrites**
⚠️ **Consulter en urgence si aggravation**

═══════════════════════════════════════════════

👨⚕️ **Signature et cachet du médecin :**
${prescription.header.doctorName}
Date : ${prescription.header.date}
    `.trim()
  }
}
