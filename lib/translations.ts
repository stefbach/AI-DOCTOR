// lib/translations.ts

export type Language = 'fr' | 'en'

export const translations = {
  // Common terms
  common: {
    next: {
      fr: "Continuer",
      en: "Continue"
    },
    previous: {
      fr: "Retour",
      en: "Back"
    },
    save: {
      fr: "Enregistrer",
      en: "Save"
    },
    cancel: {
      fr: "Annuler",
      en: "Cancel"
    },
    edit: {
      fr: "Modifier",
      en: "Edit"
    },
    delete: {
      fr: "Supprimer",
      en: "Delete"
    },
    add: {
      fr: "Ajouter",
      en: "Add"
    },
    search: {
      fr: "Rechercher",
      en: "Search"
    },
    download: {
      fr: "Télécharger",
      en: "Download"
    },
    print: {
      fr: "Imprimer",
      en: "Print"
    },
    validate: {
      fr: "Valider",
      en: "Validate"
    },
    loading: {
      fr: "Chargement...",
      en: "Loading..."
    },
    error: {
      fr: "Erreur",
      en: "Error"
    },
    success: {
      fr: "Succès",
      en: "Success"
    },
    required: {
      fr: "Requis",
      en: "Required"
    },
    optional: {
      fr: "Optionnel",
      en: "Optional"
    },
    yes: {
      fr: "Oui",
      en: "Yes"
    },
    no: {
      fr: "Non",
      en: "No"
    },
    autoSave: {
      fr: "Sauvegarde automatique",
      en: "Auto-save"
    }
  },

  // Main page translations
  mainPage: {
    title: {
      fr: "TIBOK IA DOCTOR",
      en: "TIBOK AI DOCTOR"
    },
    subtitle: {
      fr: "Système Expert de Diagnostic Médical par Intelligence Artificielle",
      en: "Expert Medical Diagnostic System by Artificial Intelligence"
    },
    progress: {
      fr: "Progression",
      en: "Progress"
    },
    step: {
      fr: "Étape",
      en: "Step"
    },
    of: {
      fr: "sur",
      en: "of"
    },
    aiModel: {
      fr: "Modèle IA",
      en: "AI Model"
    },
    integrated: {
      fr: "Intégrées",
      en: "Integrated"
    },
    available: {
      fr: "Disponible",
      en: "Available"
    },
    medical: {
      fr: "Médicales",
      en: "Medical"
    }
  },

  // Steps
  steps: {
    patientInfo: {
      title: {
        fr: "Informations Patient",
        en: "Patient Information"
      },
      description: {
        fr: "Identité, antécédents, allergies",
        en: "Identity, history, allergies"
      }
    },
    clinicalExam: {
      title: {
        fr: "Examen Clinique",
        en: "Clinical Examination"
      },
      description: {
        fr: "Symptômes, signes vitaux, examen physique",
        en: "Symptoms, vital signs, physical exam"
      }
    },
    aiQuestions: {
      title: {
        fr: "Questions IA",
        en: "AI Questions"
      },
      description: {
        fr: "Questions personnalisées générées par l'IA",
        en: "Personalized AI-generated questions"
      }
    },
    aiDiagnosis: {
      title: {
        fr: "Diagnostic IA",
        en: "AI Diagnosis"
      },
      description: {
        fr: "Analyse diagnostique par intelligence artificielle",
        en: "Diagnostic analysis by artificial intelligence"
      }
    },
    medicalWorkflow: {
      title: {
        fr: "Workflow Médical",
        en: "Medical Workflow"
      },
      description: {
        fr: "Traitement complet avec APIs médicales",
        en: "Complete processing with medical APIs"
      }
    },
    completeConsultation: {
      title: {
        fr: "Consultation Complète",
        en: "Complete Consultation"
      },
      description: {
        fr: "Rapport final et prescriptions",
        en: "Final report and prescriptions"
      }
    }
  },

  // Patient form translations
  patientForm: {
    title: {
      fr: "Dossier Patient",
      en: "Patient File"
    },
    formProgress: {
      fr: "Progression du formulaire",
      en: "Form progress"
    },
    personalInfo: {
      fr: "Informations Personnelles",
      en: "Personal Information"
    },
    firstName: {
      fr: "Prénom",
      en: "First Name"
    },
    lastName: {
      fr: "Nom",
      en: "Last Name"
    },
    birthDate: {
      fr: "Date de naissance",
      en: "Date of Birth"
    },
    calculatedAge: {
      fr: "Âge calculé",
      en: "Calculated Age"
    },
    years: {
      fr: "ans",
      en: "years"
    },
    gender: {
      fr: "Sexe",
      en: "Gender"
    },
    male: {
      fr: "Masculin",
      en: "Male"
    },
    female: {
      fr: "Féminin",
      en: "Female"
    },
    otherSpecify: {
      fr: "Autre (préciser)",
      en: "Other (specify)"
    },
    declaredGender: {
      fr: "Sexe déclaré:",
      en: "Declared gender:"
    },
    weight: {
      fr: "Poids (kg)",
      en: "Weight (kg)"
    },
    height: {
      fr: "Taille (cm)",
      en: "Height (cm)"
    },
    bmi: {
      fr: "IMC",
      en: "BMI"
    },
    underweight: {
      fr: "Insuffisance pondérale",
      en: "Underweight"
    },
    normalWeight: {
      fr: "Poids normal",
      en: "Normal weight"
    },
    overweight: {
      fr: "Surpoids",
      en: "Overweight"
    },
    obesity: {
      fr: "Obésité",
      en: "Obesity"
    },
    // Contact Information translations
    contactInfo: {
      fr: "Informations de Contact",
      en: "Contact Information"
    },
    phone: {
      fr: "Téléphone",
      en: "Phone"
    },
    phonePlaceholder: {
      fr: "+230 5XXX XXXX",
      en: "+230 5XXX XXXX"
    },
    email: {
      fr: "Email",
      en: "Email"
    },
    emailPlaceholder: {
      fr: "adresse@email.com",
      en: "email@address.com"
    },
    address: {
      fr: "Adresse",
      en: "Address"
    },
    addressPlaceholder: {
      fr: "Adresse complète",
      en: "Full address"
    },
    city: {
      fr: "Ville",
      en: "City"
    },
    cityPlaceholder: {
      fr: "Port Louis, Curepipe, etc.",
      en: "Port Louis, Curepipe, etc."
    },
    country: {
      fr: "Pays",
      en: "Country"
    },
    countryPlaceholder: {
      fr: "Maurice",
      en: "Mauritius"
    },
    idNumber: {
      fr: "Numéro d'identité",
      en: "ID Number"
    },
    idNumberPlaceholder: {
      fr: "Numéro d'identité nationale",
      en: "National ID number"
    },
    knownAllergies: {
      fr: "Allergies Connues",
      en: "Known Allergies"
    },
    searchAllergy: {
      fr: "Rechercher une allergie...",
      en: "Search for an allergy..."
    },
    otherAllergies: {
      fr: "Autres allergies",
      en: "Other allergies"
    },
    declaredAllergies: {
      fr: "Allergies déclarées:",
      en: "Declared allergies:"
    },
    medicalHistory: {
      fr: "Antécédents Médicaux",
      en: "Medical History"
    },
    searchMedicalHistory: {
      fr: "Rechercher un antécédent médical...",
      en: "Search for medical history..."
    },
    otherMedicalHistory: {
      fr: "Autres antécédents",
      en: "Other medical history"
    },
    declaredHistory: {
      fr: "Antécédents déclarés:",
      en: "Declared history:"
    },
    currentMedications: {
      fr: "Médicaments Actuels",
      en: "Current Medications"
    },
    ongoingTreatments: {
      fr: "Traitements en cours",
      en: "Ongoing treatments"
    },
    medicationPlaceholder: {
      fr: "Listez tous les médicaments actuels avec posologies...\nExemple: \n- Paracétamol 1g 3 fois par jour\n- Lisinopril 10mg 1 fois le matin",
      en: "List all current medications with dosages...\nExample: \n- Paracetamol 1g 3 times a day\n- Lisinopril 10mg once in the morning"
    },
    treatmentsEntered: {
      fr: "Traitements renseignés",
      en: "Treatments entered"
    },
    lines: {
      fr: "lignes",
      en: "lines"
    },
    lifestyle: {
      fr: "Habitudes de Vie",
      en: "Lifestyle Habits"
    },
    tobacco: {
      fr: "Tabac",
      en: "Tobacco"
    },
    nonSmoker: {
      fr: "Non-fumeur",
      en: "Non-smoker"
    },
    currentSmoker: {
      fr: "Fumeur actuel",
      en: "Current smoker"
    },
    exSmoker: {
      fr: "Ex-fumeur",
      en: "Ex-smoker"
    },
    alcohol: {
      fr: "Alcool",
      en: "Alcohol"
    },
    never: {
      fr: "Jamais",
      en: "Never"
    },
    occasional: {
      fr: "Occasionnel",
      en: "Occasional"
    },
    regular: {
      fr: "Régulier",
      en: "Regular"
    },
    physicalActivity: {
      fr: "Activité physique",
      en: "Physical activity"
    },
    sedentary: {
      fr: "Sédentaire",
      en: "Sedentary"
    },
    moderate: {
      fr: "Modérée",
      en: "Moderate"
    },
    intense: {
      fr: "Intense",
      en: "Intense"
    },
    continueButton: {
      fr: "Continuer vers l'Examen Clinique",
      en: "Continue to Clinical Examination"
    },
    errors: {
      firstNameRequired: {
        fr: "Prénom requis",
        en: "First name required"
      },
      lastNameRequired: {
        fr: "Nom requis",
        en: "Last name required"
      },
      birthDateRequired: {
        fr: "Date de naissance requise",
        en: "Date of birth required"
      },
      futureBirthDate: {
        fr: "La date de naissance ne peut pas être dans le futur",
        en: "Birth date cannot be in the future"
      },
      invalidAge: {
        fr: "Âge calculé invalide (0-120 ans)",
        en: "Invalid calculated age (0-120 years)"
      },
      genderRequired: {
        fr: "Veuillez sélectionner un sexe ou remplir le champ libre",
        en: "Please select a gender or fill in the free field"
      },
      validWeightRequired: {
        fr: "Poids valide requis (1-300 kg)",
        en: "Valid weight required (1-300 kg)"
      },
      validHeightRequired: {
        fr: "Taille valide requise (50-250 cm)",
        en: "Valid height required (50-250 cm)"
      }
    },
    tibokNotification: {
      fr: "Consultation TIBOK - Patient:",
      en: "TIBOK Consultation - Patient:"
    },
    loadingPatientData: {
      fr: "Chargement des données patient...",
      en: "Loading patient data..."
    }
  },

  // Common allergies
  allergies: {
    penicillin: {
      fr: "Pénicilline",
      en: "Penicillin"
    },
    aspirin: {
      fr: "Aspirine",
      en: "Aspirin"
    },
    nsaids: {
      fr: "Anti-inflammatoires (AINS)",
      en: "Anti-inflammatory drugs (NSAIDs)"
    },
    codeine: {
      fr: "Codéine",
      en: "Codeine"
    },
    latex: {
      fr: "Latex",
      en: "Latex"
    },
    iodine: {
      fr: "Iode",
      en: "Iodine"
    },
    localAnesthetics: {
      fr: "Anesthésiques locaux",
      en: "Local anesthetics"
    },
    sulfonamides: {
      fr: "Sulfamides",
      en: "Sulfonamides"
    }
  },

  // Medical history conditions
  medicalConditions: {
    hypertension: {
      fr: "Hypertension artérielle",
      en: "Arterial hypertension"
    },
    type2Diabetes: {
      fr: "Diabète type 2",
      en: "Type 2 diabetes"
    },
    type1Diabetes: {
      fr: "Diabète type 1",
      en: "Type 1 diabetes"
    },
    asthma: {
      fr: "Asthme",
      en: "Asthma"
    },
    heartDisease: {
      fr: "Maladie cardiaque",
      en: "Heart disease"
    },
    depressionAnxiety: {
      fr: "Dépression/Anxiété",
      en: "Depression/Anxiety"
    },
    arthritis: {
      fr: "Arthrose",
      en: "Arthritis"
    },
    migraine: {
      fr: "Migraine",
      en: "Migraine"
    },
    gerd: {
      fr: "Reflux gastro-œsophagien",
      en: "Gastroesophageal reflux disease"
    },
    highCholesterol: {
      fr: "Hypercholestérolémie",
      en: "High cholesterol"
    }
  },

  // Clinical form translations
  clinicalForm: {
    title: {
      fr: "Examen Clinique",
      en: "Clinical Examination"
    },
    progressTitle: {
      fr: "Progression de l'examen",
      en: "Examination progress"
    },
    chiefComplaint: {
      fr: "Motif de Consultation",
      en: "Chief Complaint"
    },
    mainReason: {
      fr: "Motif principal de consultation",
      en: "Main reason for consultation"
    },
    describePlaceholder: {
      fr: "Décrivez le motif principal de la consultation...",
      en: "Describe the main reason for the consultation..."
    },
    summaryHint: {
      fr: "Résumé en une phrase du problème principal qui amène le patient",
      en: "One-sentence summary of the main problem bringing the patient"
    },
    diseaseHistory: {
      fr: "Histoire de la Maladie Actuelle",
      en: "History of Present Illness"
    },
    symptomEvolution: {
      fr: "Chronologie et évolution des symptômes",
      en: "Chronology and evolution of symptoms"
    },
    historyPlaceholder: {
      fr: "Décrivez l'évolution chronologique des symptômes, les circonstances d'apparition, les facteurs aggravants ou améliorants...",
      en: "Describe the chronological evolution of symptoms, circumstances of onset, aggravating or relieving factors..."
    },
    detailedHistory: {
      fr: "Histoire détaillée : début, évolution, caractéristiques, facteurs déclenchants",
      en: "Detailed history: onset, evolution, characteristics, triggering factors"
    },
    documentedHistory: {
      fr: "Histoire documentée",
      en: "Documented history"
    },
    characters: {
      fr: "caractères",
      en: "characters"
    },
    duration: {
      fr: "Depuis Combien de Temps",
      en: "Duration"
    },
    symptomDuration: {
      fr: "Durée d'évolution des symptômes",
      en: "Duration of symptom evolution"
    },
    selectDuration: {
      fr: "Sélectionnez la durée d'évolution",
      en: "Select duration of evolution"
    },
    evolutionSince: {
      fr: "Évolution depuis :",
      en: "Evolution since:"
    },
    currentSymptoms: {
      fr: "Symptômes Présents",
      en: "Current Symptoms"
    },
    searchSymptom: {
      fr: "Rechercher un symptôme...",
      en: "Search for a symptom..."
    },
    selectedSymptoms: {
      fr: "Symptômes sélectionnés",
      en: "Selected symptoms"
    },
    vitalSigns: {
      fr: "Signes Vitaux",
      en: "Vital Signs"
    },
    temperature: {
      fr: "Température (°C)",
      en: "Temperature (°C)"
    },
    hypothermia: {
      fr: "Hypothermie",
      en: "Hypothermia"
    },
    normal: {
      fr: "Normal",
      en: "Normal"
    },
    fever: {
      fr: "Fièvre",
      en: "Fever"
    },
    systolicBP: {
      fr: "Tension systolique (mmHg)",
      en: "Systolic blood pressure (mmHg)"
    },
    diastolicBP: {
      fr: "Tension diastolique (mmHg)",
      en: "Diastolic blood pressure (mmHg)"
    },
    bloodPressure: {
      fr: "Tension artérielle :",
      en: "Blood pressure:"
    },
    hypertension: {
      fr: "Hypertension",
      en: "Hypertension"
    },
    preHypertension: {
      fr: "Pré-hypertension",
      en: "Pre-hypertension"
    },
    backButton: {
      fr: "Retour aux Informations Patient",
      en: "Back to Patient Information"
    },
    continueToAI: {
      fr: "Continuer vers les Questions IA",
      en: "Continue to AI Questions"
    },
    sections: {
      complaint: {
        fr: "Motif",
        en: "Complaint"
      },
      history: {
        fr: "Histoire",
        en: "History"
      },
      duration: {
        fr: "Durée",
        en: "Duration"
      },
      symptoms: {
        fr: "Symptômes",
        en: "Symptoms"
      },
      vitals: {
        fr: "Signes vitaux",
        en: "Vital signs"
      }
    }
  },

  // Duration options
  durationOptions: {
    lessHour: {
      fr: "Moins d'1 heure",
      en: "Less than 1 hour"
    },
    oneToSixHours: {
      fr: "1-6 heures",
      en: "1-6 hours"
    },
    sixToTwentyFourHours: {
      fr: "6-24 heures",
      en: "6-24 hours"
    },
    oneToThreeDays: {
      fr: "1-3 jours",
      en: "1-3 days"
    },
    threeToSevenDays: {
      fr: "3-7 jours",
      en: "3-7 days"
    },
    oneToFourWeeks: {
      fr: "1-4 semaines",
      en: "1-4 weeks"
    },
    oneToSixMonths: {
      fr: "1-6 mois",
      en: "1-6 months"
    },
    moreSixMonths: {
      fr: "Plus de 6 mois",
      en: "More than 6 months"
    }
  },

  // Common symptoms
  symptoms: {
    chestPain: {
      fr: "Douleur thoracique",
      en: "Chest pain"
    },
    shortness: {
      fr: "Essoufflement",
      en: "Shortness of breath"
    },
    palpitations: {
      fr: "Palpitations",
      en: "Palpitations"
    },
    fatigue: {
      fr: "Fatigue",
      en: "Fatigue"
    },
    nausea: {
      fr: "Nausées",
      en: "Nausea"
    },
    vomiting: {
      fr: "Vomissements",
      en: "Vomiting"
    },
    diarrhea: {
      fr: "Diarrhée",
      en: "Diarrhea"
    },
    constipation: {
      fr: "Constipation",
      en: "Constipation"
    },
    headache: {
      fr: "Maux de tête",
      en: "Headache"
    },
    dizziness: {
      fr: "Vertiges",
      en: "Dizziness"
    },
    fever: {
      fr: "Fièvre",
      en: "Fever"
    },
    chills: {
      fr: "Frissons",
      en: "Chills"
    },
    cough: {
      fr: "Toux",
      en: "Cough"
    },
    abdominalPain: {
      fr: "Douleur abdominale",
      en: "Abdominal pain"
    },
    backPain: {
      fr: "Douleur dorsale",
      en: "Back pain"
    },
    insomnia: {
      fr: "Insomnie",
      en: "Insomnia"
    },
    anxiety: {
      fr: "Anxiété",
      en: "Anxiety"
    },
    lossAppetite: {
      fr: "Perte d'appétit",
      en: "Loss of appetite"
    },
    weightLoss: {
      fr: "Perte de poids",
      en: "Weight loss"
    },
    legSwelling: {
      fr: "Gonflement des jambes",
      en: "Leg swelling"
    },
    jointPain: {
      fr: "Douleur articulaire",
      en: "Joint pain"
    },
    rash: {
      fr: "Éruption cutanée",
      en: "Skin rash"
    },
    blurredVision: {
      fr: "Vision floue",
      en: "Blurred vision"
    },
    hearingProblems: {
      fr: "Troubles de l'audition",
      en: "Hearing problems"
    }
  },

  // Questions form translations
  questionsForm: {
    title: {
      fr: "Questions IA Personnalisées",
      en: "Personalized AI Questions"
    },
    progressTitle: {
      fr: "Progression des questions",
      en: "Questions progress"
    },
    answered: {
      fr: "répondues",
      en: "answered"
    },
    fallbackMode: {
      fr: "Mode fallback",
      en: "Fallback mode"
    },
    generating: {
      fr: "Génération des questions personnalisées...",
      en: "Generating personalized questions..."
    },
    analyzingProfile: {
      fr: "L'IA analyse votre profil pour créer des questions adaptées à votre situation",
      en: "AI is analyzing your profile to create questions adapted to your situation"
    },
    question: {
      fr: "Question",
      en: "Question"
    },
    aiGenerated: {
      fr: "Question générée spécifiquement pour votre profil médical",
      en: "Question specifically generated for your medical profile"
    },
    answerRecorded: {
      fr: "Réponse enregistrée",
      en: "Answer recorded"
    },
    yourAnswer: {
      fr: "Votre réponse :",
      en: "Your answer:"
    },
    previousQuestion: {
      fr: "Question précédente",
      en: "Previous question"
    },
    nextQuestion: {
      fr: "Question suivante",
      en: "Next question"
    },
    launchAIDiagnosis: {
      fr: "Lancer le Diagnostic IA",
      en: "Launch AI Diagnosis"
    },
    aiDiagnosisReady: {
      fr: "🚀 Diagnostic IA Prêt - Cliquez ici !",
      en: "🚀 AI Diagnosis Ready - Click here!"
    },
    summaryAnswers: {
      fr: "Résumé de vos Réponses",
      en: "Summary of Your Answers"
    },
    backToClinical: {
      fr: "Retour à l'Examen Clinique",
      en: "Back to Clinical Examination"
    },
    continueToDiagnosis: {
      fr: "Continuer vers le Diagnostic IA",
      en: "Continue to AI Diagnosis"
    },
    fallbackWarning: {
      fr: "⚠️ Génération IA indisponible. Questions génériques utilisées pour assurer la continuité du diagnostic.",
      en: "⚠️ AI generation unavailable. Generic questions used to ensure diagnostic continuity."
    },
    lowImpact: {
      fr: "Faible impact",
      en: "Low impact"
    },
    majorImpact: {
      fr: "Impact majeur",
      en: "Major impact"
    },
    describePlaceholder: {
      fr: "Décrivez en détail votre réponse...",
      en: "Describe your answer in detail..."
    },
    yourAnswerPlaceholder: {
      fr: "Votre réponse...",
      en: "Your answer..."
    }
  },

  // Diagnosis form translations
  diagnosisForm: {
    title: {
      fr: "Diagnostic IA Expert + Documents Mauriciens",
      en: "Expert AI Diagnosis + Mauritian Documents"
    },
    generatingComplete: {
      fr: "Génération complète en cours...",
      en: "Complete generation in progress..."
    },
    generatingDescription: {
      fr: "Diagnostic IA expert + Documents mauriciens modifiables",
      en: "Expert AI diagnosis + Editable Mauritian documents"
    },
    expertAnalysis: {
      fr: "Analyse diagnostique experte",
      en: "Expert diagnostic analysis"
    },
    reportGeneration: {
      fr: "Génération compte-rendu consultation",
      en: "Consultation report generation"
    },
    biologyPrescriptions: {
      fr: "Création ordonnances biologiques",
      en: "Creating biological prescriptions"
    },
    paraclinicalPrescriptions: {
      fr: "Création ordonnances paracliniques",
      en: "Creating paraclinical prescriptions"
    },
    medicationPrescription: {
      fr: "Prescription médicamenteuse sécurisée",
      en: "Secure medication prescription"
    },
    directGeneration: {
      fr: "Génération directe complète - Prêt pour édition !",
      en: "Complete direct generation - Ready for editing!"
    },
    successTitle: {
      fr: "Diagnostic IA Expert + Documents Mauriciens Générés",
      en: "Expert AI Diagnosis + Mauritian Documents Generated"
    },
    aiConfidence: {
      fr: "Confiance IA:",
      en: "AI Confidence:"
    },
    documentsReady: {
      fr: "4 Documents Mauriciens Prêts",
      en: "4 Mauritian Documents Ready"
    },
    fallbackActivated: {
      fr: "Mode Fallback Activé",
      en: "Fallback Mode Activated"
    },
    primaryDiagnosis: {
      fr: "Diagnostic Principal Retenu",
      en: "Primary Diagnosis Retained"
    },
    probability: {
      fr: "Probabilité:",
      en: "Probability:"
    },
    severity: {
      fr: "Sévérité:",
      en: "Severity:"
    },
    toEvaluate: {
      fr: "À évaluer",
      en: "To evaluate"
    },
    detailedAnalysis: {
      fr: "Analyse Détaillée",
      en: "Detailed Analysis"
    },
    clinicalReasoning: {
      fr: "Raisonnement Clinique",
      en: "Clinical Reasoning"
    },
    differentialDiagnosis: {
      fr: "Diagnostics Différentiels",
      en: "Differential Diagnoses"
    },
    distinguishingFeatures: {
      fr: "Éléments distinctifs:",
      en: "Distinguishing features:"
    },
    mauritianDocuments: {
      fr: "Documents Mauriciens Générés et Modifiables",
      en: "Generated and Editable Mauritian Documents"
    },
    consultationReport: {
      fr: "Compte-rendu de Consultation",
      en: "Consultation Report"
    },
    professionalDocument: {
      fr: "Document professionnel mauricien",
      en: "Mauritian professional document"
    },
    patient: {
      fr: "Patient:",
      en: "Patient:"
    },
    diagnosis: {
      fr: "Diagnostic:",
      en: "Diagnosis:"
    },
    biologicalExams: {
      fr: "Ordonnance Examens Biologiques",
      en: "Biological Examinations Prescription"
    },
    labPrescription: {
      fr: "Prescription laboratoire Maurice",
      en: "Mauritius laboratory prescription"
    },
    exams: {
      fr: "Examens:",
      en: "Examinations:"
    },
    prescriptions: {
      fr: "prescription(s)",
      en: "prescription(s)"
    },
    format: {
      fr: "Format:",
      en: "Format:"
    },
    mauritianCompliant: {
      fr: "Conforme réglementation mauricienne",
      en: "Mauritius regulations compliant"
    },
    paraclinicalExams: {
      fr: "Examens Paracliniques",
      en: "Paraclinical Examinations"
    },
    imagingExplorations: {
      fr: "Imagerie et explorations",
      en: "Imaging and explorations"
    },
    medicationPrescriptionTitle: {
      fr: "Ordonnance Médicamenteuse",
      en: "Medication Prescription"
    },
    securePrescription: {
      fr: "Prescription sécurisée Maurice",
      en: "Secure Mauritius prescription"
    },
    medications: {
      fr: "Médicaments:",
      en: "Medications:"
    },
    safety: {
      fr: "Sécurité:",
      en: "Safety:"
    },
    allergyChecks: {
      fr: "Vérifications allergies incluses",
      en: "Allergy checks included"
    },
    fullyEditable: {
      fr: "Documents Entièrement Modifiables",
      en: "Fully Editable Documents"
    },
    editableDescription: {
      fr: "Tous les documents sont entièrement modifiables. Vous pouvez éditer chaque champ selon vos besoins avant impression/téléchargement.",
      en: "All documents are fully editable. You can edit each field according to your needs before printing/downloading."
    },
    backToQuestions: {
      fr: "Retour aux Questions IA",
      en: "Back to AI Questions"
    },
    editDocuments: {
      fr: "Éditer les Documents Mauriciens",
      en: "Edit Mauritian Documents"
    },
    generateDiagnosisDocuments: {
      fr: "Générer Diagnostic + Documents",
      en: "Generate Diagnosis + Documents"
    },
    temporarilyUnavailable: {
      fr: "Diagnostic Temporairement Indisponible",
      en: "Diagnosis Temporarily Unavailable"
    },
    cannotGenerate: {
      fr: "Impossible de générer le diagnostic automatique.",
      en: "Cannot generate automatic diagnosis."
    },
    retry: {
      fr: "Réessayer la génération complète",
      en: "Retry complete generation"
    },
    preparingDiagnosis: {
      fr: "Préparation du Diagnostic",
      en: "Preparing Diagnosis"
    },
    initializing: {
      fr: "Initialisation en cours...",
      en: "Initializing..."
    },
    startGeneration: {
      fr: "Lancer la génération",
      en: "Start generation"
    },
    sections: {
      primary: {
        fr: "Diagnostic principal",
        en: "Primary diagnosis"
      },
      reasoning: {
        fr: "Raisonnement",
        en: "Reasoning"
      },
      differential: {
        fr: "Différentiels",
        en: "Differentials"
      },
      documents: {
        fr: "Documents générés",
        en: "Generated documents"
      }
    },
    fallbackMessage: {
      fr: "⚠️ Diagnostic IA Expert indisponible. Analyse générique + Documents de base générés pour assurer la continuité.",
      en: "⚠️ Expert AI Diagnosis unavailable. Generic analysis + Basic documents generated to ensure continuity."
    }
  },

  // Workflow manager translations
  workflowManager: {
    title: {
      fr: "Workflow Médical Direct - Génération Tous Documents",
      en: "Direct Medical Workflow - All Documents Generation"
    },
    steps: {
      analysis: {
        fr: "Analyse diagnostique IA complète",
        en: "Complete AI diagnostic analysis"
      },
      report: {
        fr: "Génération compte-rendu consultation",
        en: "Consultation report generation"
      },
      biology: {
        fr: "Création ordonnances biologiques",
        en: "Creating biological prescriptions"
      },
      paraclinical: {
        fr: "Création ordonnances paracliniques",
        en: "Creating paraclinical prescriptions"
      },
      medication: {
        fr: "Prescription médicamenteuse sécurisée",
        en: "Secure medication prescription"
      }
    },
    status: {
      pending: {
        fr: "En attente",
        en: "Pending"
      },
      processing: {
        fr: "En cours",
        en: "Processing"
      },
      completed: {
        fr: "Terminé",
        en: "Completed"
      },
      error: {
        fr: "Erreur",
        en: "Error"
      }
    },
    patientInfo: {
      fr: "Patient",
      en: "Patient"
    },
    name: {
      fr: "Nom:",
      en: "Name:"
    },
    age: {
      fr: "Âge:",
      en: "Age:"
    },
    sex: {
      fr: "Sexe:",
      en: "Gender:"
    },
    weight: {
      fr: "Poids:",
      en: "Weight:"
    },
    progressionTitle: {
      fr: "Progression du Traitement Direct",
      en: "Direct Processing Progress"
    },
    step: {
      fr: "Étape",
      en: "Step"
    },
    documentGenerated: {
      fr: "Document généré avec succès",
      en: "Document successfully generated"
    },
    generationInProgress: {
      fr: "Génération en cours...",
      en: "Generation in progress..."
    },
    generateButton: {
      fr: "Générer Diagnostic + Documents Mauriciens",
      en: "Generate Diagnosis + Mauritian Documents"
    },
    retry: {
      fr: "Réessayer",
      en: "Retry"
    },
    downloadReport: {
      fr: "Télécharger le Rapport",
      en: "Download Report"
    },
    aiDiagnosis: {
      fr: "Diagnostic IA",
      en: "AI Diagnosis"
    },
    confidence: {
      fr: "Confiance:",
      en: "Confidence:"
    },
    differentials: {
      fr: "Différentiels:",
      en: "Differentials:"
    },
    considered: {
      fr: "considéré(s)",
      en: "considered"
    },
    mauritianDocuments: {
      fr: "Documents Mauriciens",
      en: "Mauritian Documents"
    },
    consultationReport: {
      fr: "Compte-rendu consultation",
      en: "Consultation report"
    },
    biologicalExams: {
      fr: "Ordonnance examens biologiques",
      en: "Biological examinations prescription"
    },
    paraclinicalExams: {
      fr: "Ordonnance examens paracliniques",
      en: "Paraclinical examinations prescription"
    },
    medicationPrescription: {
      fr: "Prescription médicamenteuse",
      en: "Medication prescription"
    },
    allEditable: {
      fr: "Tous les documents sont modifiables",
      en: "All documents are editable"
    },
    articlesFound: {
      fr: "Articles trouvés:",
      en: "Articles found:"
    },
    database: {
      fr: "Base de données:",
      en: "Database:"
    },
    verified: {
      fr: "✓ Vérifié",
      en: "✓ Verified"
    },
    inProgress: {
      fr: "En cours",
      en: "In progress"
    },
    available: {
      fr: "Disponible",
      en: "Available"
    },
    integrated: {
      fr: "Intégré",
      en: "Integrated"
    },
    attention: {
      fr: "Attention:",
      en: "Attention:"
    },
    fallbackMode: {
      fr: "Le système a basculé en mode sécurisé avec documents de base.",
      en: "The system has switched to safe mode with basic documents."
    },
    directWorkflow: {
      fr: "Workflow médical direct - API unique optimisée",
      en: "Direct medical workflow - Optimized single API"
    }
  },

  // Integrated consultation translations
  integratedConsultation: {
    title: {
      fr: "Consultation Médicale Complète",
      en: "Complete Medical Consultation"
    },
    date: {
      fr: "Date:",
      en: "Date:"
    },
    age: {
      fr: "Âge:",
      en: "Age:"
    },
    sex: {
      fr: "Sexe:",
      en: "Gender:"
    },
    analysisCompleted: {
      fr: "Analyse IA Complétée",
      en: "AI Analysis Completed"
    },
    validated: {
      fr: "Validés",
      en: "Validated"
    },
    tabs: {
      report: {
        fr: "Rapport",
        en: "Report"
      },
      diagnosis: {
        fr: "Diagnostic",
        en: "Diagnosis"
      },
      exams: {
        fr: "Examens",
        en: "Examinations"
      },
      prescription: {
        fr: "Prescription",
        en: "Prescription"
      },
      evidence: {
        fr: "Evidence",
        en: "Evidence"
      }
    },
    consultationReport: {
      fr: "Compte-Rendu de Consultation",
      en: "Consultation Report"
    },
    mainDiagnosis: {
      fr: "Diagnostic Principal",
      en: "Main Diagnosis"
    },
    mostProbable: {
      fr: "Diagnostic le plus probable",
      en: "Most probable diagnosis"
    },
    differentialDiagnoses: {
      fr: "Diagnostics Différentiels",
      en: "Differential Diagnoses"
    },
    noDifferential: {
      fr: "Aucun diagnostic différentiel spécifique",
      en: "No specific differential diagnosis"
    },
    completeAnalysis: {
      fr: "Analyse Complète IA",
      en: "Complete AI Analysis"
    },
    biologicalExams: {
      fr: "Examens Biologiques",
      en: "Biological Examinations"
    },
    medicalImaging: {
      fr: "Imagerie Médicale",
      en: "Medical Imaging"
    },
    completeRecommendations: {
      fr: "Recommandations Complètes",
      en: "Complete Recommendations"
    },
    medicationPrescription: {
      fr: "Ordonnance Médicamenteuse",
      en: "Medication Prescription"
    },
    fdaVerification: {
      fr: "Vérification FDA",
      en: "FDA Verification"
    },
    medicationsVerified: {
      fr: "Médicaments vérifiés FDA",
      en: "FDA verified medications"
    },
    verificationInProgress: {
      fr: "En cours de vérification",
      en: "Verification in progress"
    },
    completePrescription: {
      fr: "Prescription Complète",
      en: "Complete Prescription"
    },
    scientificReferences: {
      fr: "Références Scientifiques PubMed",
      en: "PubMed Scientific References"
    },
    articlesFound: {
      fr: "Articles trouvés:",
      en: "Articles found:"
    },
    database: {
      fr: "Base de données:",
      en: "Database:"
    },
    article: {
      fr: "Article",
      en: "Article"
    },
    authorsNotSpecified: {
      fr: "Auteurs non spécifiés",
      en: "Authors not specified"
    },
    journalNotSpecified: {
      fr: "Journal non spécifié",
      en: "Journal not specified"
    },
    noArticlesFound: {
      fr: "Aucun article PubMed trouvé pour ce cas",
      en: "No PubMed articles found for this case"
    },
    regulatoryChecks: {
      fr: "Vérifications Réglementaires",
      en: "Regulatory Checks"
    },
    verified: {
      fr: "✓ Vérifié",
      en: "✓ Verified"
    },
    inProgress: {
      fr: "En cours",
      en: "In progress"
    },
    available: {
      fr: "Disponible",
      en: "Available"
    },
    integrated: {
      fr: "Intégré",
      en: "Integrated"
    },
    validateAndSave: {
      fr: "Valider et Sauvegarder",
      en: "Validate and Save"
    },
    validationTitle: {
      fr: "Validation de la Consultation",
      en: "Consultation Validation"
    },
    validationDescription: {
      fr: "Veuillez valider chaque section avant de sauvegarder la consultation.",
      en: "Please validate each section before saving the consultation."
    },
    progress: {
      fr: "Progrès:",
      en: "Progress:"
    },
    sectionsValidated: {
      fr: "sections validées",
      en: "sections validated"
    },
    iValidate: {
      fr: "Je valide",
      en: "I validate"
    },
    theReport: {
      fr: "le Rapport",
      en: "the Report"
    },
    theDiagnosis: {
      fr: "le Diagnostic",
      en: "the Diagnosis"
    },
    theExams: {
      fr: "les Examens",
      en: "the Examinations"
    },
    thePrescriptions: {
      fr: "les Prescriptions",
      en: "the Prescriptions"
    },
    theEvidence: {
      fr: "l'Evidence",
      en: "the Evidence"
    },
    beingModified: {
      fr: "(en cours de modification)",
      en: "(being modified)"
    },
    allSectionsMustBeValidated: {
      fr: "Toutes les sections doivent être validées avant la sauvegarde.",
      en: "All sections must be validated before saving."
    },
    sectionsBeingModified: {
      fr: "Certaines sections sont en cours de modification. Terminez les modifications avant de valider.",
      en: "Some sections are being modified. Complete the modifications before validating."
    },
    savingInProgress: {
      fr: "Sauvegarde en cours...",
      en: "Saving in progress..."
    },
    save: {
      fr: "Sauvegarder",
      en: "Save"
    },
    modificationsRegistered: {
      fr: "Modifications enregistrées",
      en: "Modifications saved"
    },
    sectionModifications: {
      fr: "Les modifications de la section",
      en: "The modifications of section"
    },
    haveBeenSaved: {
      fr: "ont été enregistrées.",
      en: "have been saved."
    },
    consultationSavedSuccess: {
      fr: "Consultation sauvegardée avec succès",
      en: "Consultation saved successfully"
    },
    documentsSent: {
      fr: "Les documents ont été envoyés au tableau de bord du patient.",
      en: "Documents have been sent to the patient's dashboard."
    },
    errorSaving: {
      fr: "Erreur lors de la sauvegarde",
      en: "Error during save"
    },
    errorOccurred: {
      fr: "Une erreur s'est produite. Veuillez réessayer.",
      en: "An error occurred. Please try again."
    },
    mainDiagnosisLabel: {
      fr: "Diagnostic principal",
      en: "Main diagnosis"
    },
    confidenceLevel: {
      fr: "Niveau de confiance",
      en: "Confidence level"
    },
    addDifferential: {
      fr: "Ajouter un diagnostic différentiel",
      en: "Add a differential diagnosis"
    },
    differentialPlaceholder: {
      fr: "Diagnostic différentiel",
      en: "Differential diagnosis"
    },
    addBiologicalExam: {
      fr: "Ajouter un examen biologique",
      en: "Add a biological examination"
    },
    biologicalExamPlaceholder: {
      fr: "Examen biologique",
      en: "Biological examination"
    },
    noSpecificBiological: {
      fr: "Aucun examen biologique spécifique recommandé",
      en: "No specific biological examination recommended"
    },
    addImaging: {
      fr: "Ajouter une imagerie",
      en: "Add imaging"
    },
    imagingPlaceholder: {
      fr: "Imagerie",
      en: "Imaging"
    },
    noSpecificImaging: {
      fr: "Aucune imagerie spécifique recommandée",
      en: "No specific imaging recommended"
    },
    addMedication: {
      fr: "Ajouter un médicament",
      en: "Add medication"
    },
    medicationPlaceholder: {
      fr: "Médicament - Posologie",
      en: "Medication - Dosage"
    },
    noSpecificMedication: {
      fr: "Aucun médicament spécifique prescrit",
      en: "No specific medication prescribed"
    },
    enterConsultationReport: {
      fr: "Entrez le rapport de consultation...",
      en: "Enter consultation report..."
    },
    dataNotAvailable: {
      fr: "Données non disponibles",
      en: "Data not available"
    },
    jsonDataAvailable: {
      fr: "Données structurées disponibles",
      en: "Structured data available"
    },
    diagnosisInAnalysis: {
      fr: "Diagnostic en analyse (format JSON)",
      en: "Diagnosis under analysis (JSON format)"
    },
    confidenceEvaluation: {
      fr: "Confiance: Données structurées disponibles",
      en: "Confidence: Structured data available"
    },
    diagnosisUnderAnalysis: {
      fr: "Diagnostic en cours d'analyse",
      en: "Diagnosis under analysis"
    },
    confidenceUnderEvaluation: {
      fr: "Confiance: En évaluation",
      en: "Confidence: Under evaluation"
    },
    errorDiagnosticAnalysis: {
      fr: "Erreur lors de l'analyse diagnostique",
      en: "Error during diagnostic analysis"
    },
    errorProcessing: {
      fr: "Confiance: Erreur de traitement",
      en: "Confidence: Processing error"
    },
    biologicalExamsData: {
      fr: "Examens biologiques (données structurées disponibles)",
      en: "Biological examinations (structured data available)"
    },
    medicalImagingData: {
      fr: "Imagerie médicale (données structurées disponibles)",
      en: "Medical imaging (structured data available)"
    },
    medicationPrescriptionData: {
      fr: "Prescription médicamenteuse (données structurées disponibles)",
      en: "Medication prescription (structured data available)"
    },
    medication: {
      fr: "Médicament",
      en: "Medication"
    },
    dosageToDefine: {
      fr: "Posologie à définir",
      en: "Dosage to define"
    },
    consultationComplete: {
      fr: "CONSULTATION MÉDICALE COMPLÈTE",
      en: "COMPLETE MEDICAL CONSULTATION"
    },
    treatingPhysician: {
      fr: "MÉDECIN TRAITANT:",
      en: "TREATING PHYSICIAN:"
    },
    medicalCouncilNumber: {
      fr: "N° CONSEIL MÉDICAL:",
      en: "MEDICAL COUNCIL NUMBER:"
    },
    specialty: {
      fr: "SPÉCIALITÉ:",
      en: "SPECIALTY:"
    },
    email: {
      fr: "EMAIL:",
      en: "EMAIL:"
    },
    phone: {
      fr: "TÉLÉPHONE:",
      en: "PHONE:"
    },
    generalMedicine: {
      fr: "Médecine Générale",
      en: "General Medicine"
    },
    patient: {
      fr: "PATIENT:",
      en: "PATIENT:"
    },
    reportTitle: {
      fr: "RAPPORT DE CONSULTATION",
      en: "CONSULTATION REPORT"
    },
    detailedDiagnosis: {
      fr: "DIAGNOSTIC DÉTAILLÉ",
      en: "DETAILED DIAGNOSIS"
    },
    mainDiagnosisColon: {
      fr: "Diagnostic Principal:",
      en: "Main Diagnosis:"
    },
    differentialDiagnosisColon: {
      fr: "Diagnostics Différentiels:",
      en: "Differential Diagnoses:"
    },
    complementaryExams: {
      fr: "EXAMENS COMPLÉMENTAIRES",
      en: "COMPLEMENTARY EXAMINATIONS"
    },
    biologicalExamsColon: {
      fr: "Examens Biologiques:",
      en: "Biological Examinations:"
    },
    medicalImagingColon: {
      fr: "Imagerie Médicale:",
      en: "Medical Imaging:"
    },
    medicationPrescriptionColon: {
      fr: "PRESCRIPTION MÉDICAMENTEUSE",
      en: "MEDICATION PRESCRIPTION"
    },
    scientificReferencesColon: {
      fr: "RÉFÉRENCES SCIENTIFIQUES",
      en: "SCIENTIFIC REFERENCES"
    },
    pubmedArticlesConsulted: {
      fr: "Articles PubMed consultés:",
      en: "PubMed articles consulted:"
    },
    fdaVerificationColon: {
      fr: "Vérification FDA:",
      en: "FDA Verification:"
    },
    validated: {
      fr: "Validée",
      en: "Validated"
    },
    toVerify: {
      fr: "À vérifier",
      en: "To verify"
    },
    signature: {
      fr: "SIGNATURE",
      en: "SIGNATURE"
    },
    generatedBy: {
      fr: "Généré par TIBOK IA DOCTOR le",
      en: "Generated by TIBOK AI DOCTOR on"
    }
  }
}

// Helper function to get translation
export function getTranslation(key: string, language: Language): string {
  const keys = key.split('.')
  let result: any = translations
  
  for (const k of keys) {
    if (result[k]) {
      result = result[k]
    } else {
      return key // Return the key if translation not found
    }
  }
  
  return result[language] || result['fr'] || key
}

// Helper hook to use translations
import { useEffect, useState } from 'react'

export function useTranslations() {
  const [language, setLanguage] = useState<Language>('fr')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  const t = (key: string) => getTranslation(key, language)

  return { t, language, setLanguage }
}
