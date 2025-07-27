// lib/mauritian-documents-generator.ts - Version améliorée avec ordonnances basées sur le diagnostic

export class MauritianDocumentsGenerator {
  static generateMauritianDocuments(
    consultationReport: any,
    doctorInfo: any,
    patientData: any,
    diagnosisData: any
  ) {
    console.log('🚀 Generating Mauritian documents with diagnosis data:', diagnosisData)
    
    const currentDate = new Date().toLocaleDateString('fr-FR')
    
    // 1. Generate consultation report
    const consultation = this.generateConsultationReport(
      consultationReport.consultationData,
      doctorInfo,
      currentDate
    )
    
    // 2. Generate biology prescriptions based on diagnosis
    const biology = this.generateBiologyPrescription(
      patientData,
      diagnosisData,
      doctorInfo,
      currentDate
    )
    
    // 3. Generate paraclinical prescriptions based on diagnosis
    const paraclinical = this.generateParaclinicalPrescription(
      patientData,
      diagnosisData,
      doctorInfo,
      currentDate
    )
    
    // 4. Generate medication prescriptions based on diagnosis
    const medication = this.generateMedicationPrescription(
      patientData,
      diagnosisData,
      doctorInfo,
      currentDate
    )
    
    return {
      consultation,
      biology,
      paraclinical,
      medication
    }
  }

  // 1. CONSULTATION REPORT (unchanged)
  static generateConsultationReport(consultationData: any, doctorInfo: any, date: string) {
    return {
      header: {
        title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        doctorName: doctorInfo.fullName,
        specialty: doctorInfo.specialty,
        address: doctorInfo.address,
        city: doctorInfo.city,
        phone: doctorInfo.phone,
        email: doctorInfo.email,
        registrationNumber: doctorInfo.registrationNumber,
        date: date,
        time: new Date().toLocaleTimeString('fr-FR')
      },
      patient: {
        firstName: consultationData.patientInfo.firstName,
        lastName: consultationData.patientInfo.lastName,
        age: consultationData.patientInfo.age,
        gender: consultationData.patientInfo.gender,
        address: consultationData.patientInfo.address,
        phone: consultationData.patientInfo.phone,
        allergies: consultationData.patientInfo.allergies,
        weight: consultationData.patientInfo.weight,
        height: consultationData.patientInfo.height,
        bmi: consultationData.patientInfo.bmi
      },
      anamnesis: `
MOTIF DE CONSULTATION:
${consultationData.chiefComplaint}

HISTOIRE DE LA MALADIE:
${consultationData.diseaseHistory}

SYMPTÔMES RAPPORTÉS:
${consultationData.symptoms?.join(', ') || 'Non spécifiés'}

DURÉE DES SYMPTÔMES:
${consultationData.symptomDuration || 'Non précisée'}
      `.trim(),
      physicalExam: consultationData.examination || 'Examen clinique complet effectué',
      diagnosticAssessment: `
DIAGNOSTIC PRINCIPAL:
${consultationData.diagnosis} (Confiance: ${consultationData.diagnosticConfidence}%)

RAISONNEMENT DIAGNOSTIQUE:
${consultationData.diagnosticReasoning || 'Basé sur l\'anamnèse et l\'examen clinique'}

DIAGNOSTICS DIFFÉRENTIELS:
${consultationData.differentialDiagnoses?.map((d: any) => 
  `- ${d.condition} (${d.confidence}%)`
).join('\n') || 'Aucun'}
      `.trim(),
      therapeuticPlan: consultationData.treatment || 'Plan thérapeutique détaillé ci-dessous',
      followUp: consultationData.followUpPlan || 'Suivi selon évolution',
      signature: {
        physician: doctorInfo.fullName,
        date: date
      }
    }
  }

  // 2. BIOLOGY PRESCRIPTIONS - Based on diagnosis
  static generateBiologyPrescription(
    patientData: any,
    diagnosisData: any,
    doctorInfo: any,
    date: string
  ) {
    const prescriptions = []
    
    // Extract lab tests from diagnosis data
    if (diagnosisData?.suggestedExams?.lab && diagnosisData.suggestedExams.lab.length > 0) {
      diagnosisData.suggestedExams.lab.forEach((exam: any) => {
        prescriptions.push({
          exam: exam.name || exam,
          indication: exam.indication || `Pour ${diagnosisData.diagnosis?.primary?.condition || 'diagnostic'}`,
          urgency: exam.urgency || "Dans les 48h",
          fasting: exam.fasting || this.determineFastingRequirement(exam.name),
          mauritianAvailability: this.getMauritianLabAvailability(exam.name)
        })
      })
    } else {
      // Default lab tests based on diagnosis
      prescriptions.push(...this.getDefaultLabTests(diagnosisData))
    }
    
    return {
      header: {
        title: "ORDONNANCE D'EXAMENS BIOLOGIQUES",
        subtitle: "Prescription for Laboratory Tests",
        physician: doctorInfo.fullName,
        registration: doctorInfo.registrationNumber,
        date: date,
        validity: "Valable 3 mois"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age,
        gender: Array.isArray(patientData.gender) ? patientData.gender[0] : patientData.gender,
        idNumber: patientData.idNumber || "À compléter"
      },
      prescriptions,
      instructions: {
        general: "Examens à réaliser dans un laboratoire agréé",
        preparation: "Respecter les conditions de prélèvement indiquées",
        results: "Résultats à communiquer au médecin prescripteur"
      }
    }
  }

  // 3. PARACLINICAL PRESCRIPTIONS - Based on diagnosis
  static generateParaclinicalPrescription(
    patientData: any,
    diagnosisData: any,
    doctorInfo: any,
    date: string
  ) {
    const prescriptions = []
    
    // Extract imaging tests from diagnosis data
    if (diagnosisData?.suggestedExams?.imaging && diagnosisData.suggestedExams.imaging.length > 0) {
      diagnosisData.suggestedExams.imaging.forEach((exam: any) => {
        prescriptions.push({
          exam: exam.name || exam,
          category: this.determineImagingCategory(exam.name),
          indication: exam.indication || `Évaluation ${diagnosisData.diagnosis?.primary?.condition || 'diagnostique'}`,
          urgency: exam.urgency || "Dans la semaine",
          preparation: exam.preparation || this.getImagingPreparation(exam.name),
          mauritianAvailability: this.getMauritianImagingCenters(exam.name)
        })
      })
    } else {
      // Default imaging based on diagnosis
      prescriptions.push(...this.getDefaultImagingTests(diagnosisData))
    }
    
    // Add other paraclinical exams if needed
    if (diagnosisData?.suggestedExams?.other) {
      diagnosisData.suggestedExams.other.forEach((exam: any) => {
        prescriptions.push({
          exam: exam.name || exam,
          category: "Exploration fonctionnelle",
          indication: exam.indication || "Complément diagnostic",
          urgency: "Programmé",
          preparation: exam.preparation || "Aucune",
          mauritianAvailability: "Centres spécialisés"
        })
      })
    }
    
    return {
      header: {
        title: "ORDONNANCE D'EXAMENS PARACLINIQUES",
        subtitle: "Prescription for Medical Imaging & Functional Tests",
        physician: doctorInfo.fullName,
        registration: doctorInfo.registrationNumber,
        date: date,
        validity: "Valable 3 mois"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age,
        gender: Array.isArray(patientData.gender) ? patientData.gender[0] : patientData.gender,
        weight: patientData.weight + " kg",
        allergies: patientData.allergies?.join(', ') || 'Aucune'
      },
      prescriptions,
      specialInstructions: {
        contrast: prescriptions.some(p => p.exam.includes('Scanner') || p.exam.includes('IRM')) 
          ? "Vérifier créatinine si injection de produit de contraste"
          : null,
        pregnancy: "Signaler toute grossesse en cours ou suspectée",
        metalImplants: prescriptions.some(p => p.exam.includes('IRM'))
          ? "Signaler tout implant métallique ou pacemaker"
          : null
      }
    }
  }

  // 4. MEDICATION PRESCRIPTIONS - Based on diagnosis treatment plan
  static generateMedicationPrescription(
    patientData: any,
    diagnosisData: any,
    doctorInfo: any,
    date: string
  ) {
    const prescriptions = []
    
    // Extract medications from treatment plan
    if (diagnosisData?.treatmentPlan?.medications && diagnosisData.treatmentPlan.medications.length > 0) {
      diagnosisData.treatmentPlan.medications.forEach((med: any) => {
        prescriptions.push({
          dci: med.name || med.dci,
          brand: med.brand || this.getMauritianBrand(med.name),
          class: med.class || this.getMedicationClass(med.name),
          dosage: med.dosage || "À adapter",
          frequency: med.frequency || "Selon prescription",
          duration: med.duration || "Selon évolution",
          totalQuantity: this.calculateQuantity(med),
          indication: med.indication || diagnosisData.diagnosis?.primary?.condition,
          administration: med.route || "Voie orale",
          specialInstructions: med.instructions || this.getMedicationInstructions(med.name)
        })
      })
    } else {
      // Generate default medications based on diagnosis
      prescriptions.push(...this.getDefaultMedications(diagnosisData))
    }
    
    // Add symptomatic treatments if needed
    if (diagnosisData?.symptoms || diagnosisData?.diagnosis?.primary?.symptoms) {
      prescriptions.push(...this.getSymptomaticTreatments(diagnosisData))
    }
    
    return {
      header: {
        title: "ORDONNANCE MÉDICAMENTEUSE",
        subtitle: "Medical Prescription / Prescription Médicale",
        physician: doctorInfo.fullName,
        registration: doctorInfo.registrationNumber,
        date: date,
        validity: "Ordonnance valable 1 mois sauf mention contraire",
        renewability: "Non renouvelable sauf mention"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age,
        gender: Array.isArray(patientData.gender) ? patientData.gender[0] : patientData.gender,
        weight: patientData.weight + " kg",
        allergies: patientData.allergies?.join(', ') || 'AUCUNE ALLERGIE CONNUE'
      },
      prescriptions,
      clinicalAdvice: {
        hydration: "Maintenir une bonne hydratation (1.5-2L/jour)",
        activity: diagnosisData?.treatmentPlan?.recommendations?.find((r: string) => 
          r.toLowerCase().includes('repos') || r.toLowerCase().includes('activité')
        ) || "Activité selon tolérance",
        diet: diagnosisData?.treatmentPlan?.recommendations?.find((r: string) => 
          r.toLowerCase().includes('régime') || r.toLowerCase().includes('alimentation')
        ) || "Alimentation équilibrée",
        followUp: diagnosisData?.followUp?.nextVisit || "Revoir si pas d'amélioration dans 72h",
        emergency: "Si aggravation des symptômes, consulter en urgence",
        additionalRecommendations: diagnosisData?.treatmentPlan?.recommendations || []
      }
    }
  }

  // HELPER METHODS

  static determineFastingRequirement(examName: string): string {
    const fastingExams = ['glycémie', 'cholestérol', 'triglycérides', 'bilan lipidique']
    return fastingExams.some(exam => examName.toLowerCase().includes(exam))
      ? "À jeun 12h"
      : "Non à jeun"
  }

  static getMauritianLabAvailability(examName: string): string {
    const commonExams = ['NFS', 'CRP', 'glycémie', 'créatinine', 'ASAT', 'ALAT']
    if (commonExams.some(exam => examName.includes(exam))) {
      return "Tous laboratoires (Lancet, BioMed, City Clinic Lab)"
    }
    return "Laboratoires spécialisés - Se renseigner"
  }

  static getDefaultLabTests(diagnosisData: any): any[] {
    const condition = diagnosisData?.diagnosis?.primary?.condition?.toLowerCase() || ''
    const tests = []
    
    // Common baseline tests
    tests.push({
      exam: "NFS (Numération Formule Sanguine)",
      indication: "Bilan de base",
      urgency: "48h",
      fasting: "Non à jeun",
      mauritianAvailability: "Tous laboratoires"
    })
    
    tests.push({
      exam: "CRP (Protéine C-Réactive)",
      indication: "Recherche syndrome inflammatoire",
      urgency: "48h",
      fasting: "Non à jeun",
      mauritianAvailability: "Tous laboratoires"
    })
    
    // Condition-specific tests
    if (condition.includes('diabète') || condition.includes('glyc')) {
      tests.push({
        exam: "Glycémie à jeun + HbA1c",
        indication: "Évaluation diabète",
        urgency: "48h",
        fasting: "À jeun 12h",
        mauritianAvailability: "Tous laboratoires"
      })
    }
    
    if (condition.includes('cardiaque') || condition.includes('cœur') || condition.includes('angine')) {
      tests.push({
        exam: "Troponine I",
        indication: "Marqueur cardiaque",
        urgency: "URGENT",
        fasting: "Non à jeun",
        mauritianAvailability: "Urgences hospitalières"
      })
      
      tests.push({
        exam: "BNP ou NT-proBNP",
        indication: "Insuffisance cardiaque",
        urgency: "24h",
        fasting: "Non à jeun",
        mauritianAvailability: "Laboratoires spécialisés"
      })
    }
    
    if (condition.includes('infection') || condition.includes('fièvre')) {
      tests.push({
        exam: "Hémocultures x2",
        indication: "Recherche bactériémie",
        urgency: "URGENT avant antibiotiques",
        fasting: "Non à jeun",
        mauritianAvailability: "Hôpitaux et cliniques"
      })
    }
    
    return tests
  }

  static determineImagingCategory(examName: string): string {
    if (examName.toLowerCase().includes('radio') || examName.toLowerCase().includes('rx')) {
      return "Radiologie conventionnelle"
    } else if (examName.toLowerCase().includes('scanner') || examName.toLowerCase().includes('ct')) {
      return "Tomodensitométrie"
    } else if (examName.toLowerCase().includes('irm') || examName.toLowerCase().includes('mri')) {
      return "Imagerie par résonance magnétique"
    } else if (examName.toLowerCase().includes('écho') || examName.toLowerCase().includes('doppler')) {
      return "Échographie"
    }
    return "Imagerie médicale"
  }

  static getImagingPreparation(examName: string): string {
    if (examName.toLowerCase().includes('abdomin')) {
      return "À jeun 6h, vessie pleine"
    } else if (examName.toLowerCase().includes('pelvi')) {
      return "Vessie pleine (boire 1L d'eau 1h avant)"
    } else if (examName.toLowerCase().includes('scanner') && examName.toLowerCase().includes('thorax')) {
      return "Pas de préparation particulière"
    }
    return "Selon protocole du centre"
  }

  static getMauritianImagingCenters(examName: string): string {
    if (examName.toLowerCase().includes('irm')) {
      return "Apollo Bramwell, Wellkin, City Clinic"
    } else if (examName.toLowerCase().includes('scanner')) {
      return "Tous hôpitaux privés et publics"
    } else if (examName.toLowerCase().includes('radio')) {
      return "Tous centres de radiologie"
    }
    return "Centres d'imagerie agréés"
  }

  static getDefaultImagingTests(diagnosisData: any): any[] {
    const condition = diagnosisData?.diagnosis?.primary?.condition?.toLowerCase() || ''
    const tests = []
    
    if (condition.includes('thorax') || condition.includes('poumon') || condition.includes('angine')) {
      tests.push({
        exam: "Radiographie thoracique face",
        category: "Radiologie conventionnelle",
        indication: "Bilan thoracique de base",
        urgency: "48h",
        preparation: "Retirer bijoux et objets métalliques",
        mauritianAvailability: "Tous centres de radiologie"
      })
    }
    
    if (condition.includes('cardiaque') || condition.includes('cœur')) {
      tests.push({
        exam: "ECG 12 dérivations",
        category: "Exploration fonctionnelle",
        indication: "Évaluation fonction cardiaque",
        urgency: "URGENT",
        preparation: "Aucune",
        mauritianAvailability: "Tous centres médicaux"
      })
      
      tests.push({
        exam: "Échocardiographie transthoracique",
        category: "Échographie",
        indication: "Évaluation morphologie et fonction cardiaque",
        urgency: "Dans la semaine",
        preparation: "Aucune",
        mauritianAvailability: "Cardiologues et centres spécialisés"
      })
    }
    
    if (condition.includes('abdomin')) {
      tests.push({
        exam: "Échographie abdominale complète",
        category: "Échographie",
        indication: "Exploration abdominale",
        urgency: "48-72h",
        preparation: "À jeun 6h",
        mauritianAvailability: "Tous centres d'imagerie"
      })
    }
    
    return tests
  }

  static getMauritianBrand(dciName: string): string {
    const brandMap: Record<string, string> = {
      'paracétamol': 'Panadol, Doliprane',
      'ibuprofène': 'Brufen, Nurofen',
      'amoxicilline': 'Amoxil, Clamoxyl',
      'oméprazole': 'Losec, Mopral',
      'métformine': 'Glucophage',
      'amlodipine': 'Amlor, Norvasc',
      'aspirine': 'Aspirin Protect',
      'atorvastatine': 'Lipitor, Tahor'
    }
    
    return brandMap[dciName.toLowerCase()] || 'Générique disponible'
  }

  static getMedicationClass(medicationName: string): string {
    const name = medicationName.toLowerCase()
    
    if (name.includes('cilline') || name.includes('mycine') || name.includes('floxacine')) {
      return 'Antibiotique'
    } else if (name.includes('azole') || name.includes('prazole')) {
      return 'Inhibiteur pompe à protons'
    } else if (name.includes('statine')) {
      return 'Hypolipémiant'
    } else if (name.includes('pril') || name.includes('sartan')) {
      return 'Antihypertenseur'
    } else if (name.includes('formine')) {
      return 'Antidiabétique'
    } else if (name.includes('doliprane') || name.includes('paracétamol')) {
      return 'Antalgique/Antipyrétique'
    }
    
    return 'Médicament'
  }

  static calculateQuantity(medication: any): string {
    if (!medication.dosage || !medication.frequency || !medication.duration) {
      return "QSP traitement"
    }
    
    // Simple calculation logic
    const freq = medication.frequency.toLowerCase()
    const duration = medication.duration.toLowerCase()
    
    let dailyDoses = 1
    if (freq.includes('2') || freq.includes('deux')) dailyDoses = 2
    if (freq.includes('3') || freq.includes('trois')) dailyDoses = 3
    if (freq.includes('4') || freq.includes('quatre')) dailyDoses = 4
    
    let days = 7
    if (duration.includes('10')) days = 10
    if (duration.includes('14')) days = 14
    if (duration.includes('21')) days = 21
    if (duration.includes('mois') || duration.includes('30')) days = 30
    
    const total = dailyDoses * days
    return `${total} comprimés`
  }

  static getMedicationInstructions(medicationName: string): string {
    const name = medicationName.toLowerCase()
    
    if (name.includes('antibio') || name.includes('cilline')) {
      return "À prendre pendant toute la durée prescrite même si amélioration"
    } else if (name.includes('prazole')) {
      return "À prendre 30 min avant le repas"
    } else if (name.includes('aspirine')) {
      return "À prendre pendant le repas"
    } else if (name.includes('metformine')) {
      return "À prendre pendant ou après le repas"
    }
    
    return "Selon prescription"
  }

  static getDefaultMedications(diagnosisData: any): any[] {
    const condition = diagnosisData?.diagnosis?.primary?.condition?.toLowerCase() || ''
    const medications = []
    
    // Pain management (common)
    medications.push({
      dci: "Paracétamol",
      brand: "Panadol, Doliprane",
      class: "Antalgique/Antipyrétique",
      dosage: "500mg",
      frequency: "1-2 cp 3 fois par jour",
      duration: "5 jours",
      totalQuantity: "30 comprimés",
      indication: "Douleur et/ou fièvre",
      administration: "Voie orale",
      specialInstructions: "Maximum 4g/jour. Espacer les prises de 6h"
    })
    
    // Condition-specific medications
    if (condition.includes('infection') || condition.includes('angine')) {
      medications.push({
        dci: "Amoxicilline",
        brand: "Amoxil, Clamoxyl",
        class: "Antibiotique β-lactamine",
        dosage: "1g",
        frequency: "2 fois par jour",
        duration: "7 jours",
        totalQuantity: "14 comprimés",
        indication: "Infection bactérienne probable",
        administration: "Voie orale",
        specialInstructions: "À prendre pendant les repas. Traitement complet obligatoire"
      })
    }
    
    if (condition.includes('gastro') || condition.includes('reflux')) {
      medications.push({
        dci: "Oméprazole",
        brand: "Losec, Mopral",
        class: "IPP",
        dosage: "20mg",
        frequency: "1 fois par jour le matin",
        duration: "14 jours",
        totalQuantity: "14 gélules",
        indication: "Protection gastrique",
        administration: "Voie orale",
        specialInstructions: "À jeun 30 min avant petit-déjeuner"
      })
    }
    
    return medications
  }

  static getSymptomaticTreatments(diagnosisData: any): any[] {
    const treatments = []
    const symptoms = diagnosisData?.symptoms || []
    
    if (symptoms.some((s: string) => s.toLowerCase().includes('nausée'))) {
      treatments.push({
        dci: "Métoclopramide",
        brand: "Primpéran",
        class: "Antiémétique",
        dosage: "10mg",
        frequency: "3 fois par jour si nausées",
        duration: "3 jours maximum",
        totalQuantity: "9 comprimés",
        indication: "Nausées",
        administration: "Voie orale",
        specialInstructions: "30 min avant repas. Attention somnolence"
      })
    }
    
    if (symptoms.some((s: string) => s.toLowerCase().includes('toux'))) {
      treatments.push({
        dci: "Dextrométhorphane",
        brand: "Tussidane",
        class: "Antitussif",
        dosage: "15mg",
        frequency: "3 fois par jour",
        duration: "5 jours",
        totalQuantity: "15 comprimés",
        indication: "Toux sèche",
        administration: "Voie orale",
        specialInstructions: "Ne pas associer avec expectorants"
      })
    }
    
    return treatments
  }
}
