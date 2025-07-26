import React, { useState, useRef } from 'react';
import { Download, Edit3, Save, Eye, FileText, Stethoscope, Pill, TestTube, Brain, Loader, Check, X, AlertCircle, Printer } from 'lucide-react';

// ============================================
// INTERFACES ET TYPES
// ============================================

interface PatientData {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  weight?: number;
  height?: number;
  medicalHistory?: string[] | string;
  allergies?: string[] | string;
  currentMedicationsText?: string;
  address?: string;
}

interface ClinicalData {
  chiefComplaint: string;
  symptoms: string[];
  painScale?: number;
  symptomDuration: string;
  vitalSigns?: {
    temperature?: number;
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
  };
  physicalExam?: string;
}

interface DiagnosisData {
  primary: {
    condition: string;
    confidence: number;
  };
}

interface DocumentStructure {
  consultation?: any;
  biology?: any;
  paraclinical?: any;
  medication?: any;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const CompleteMauritianDocumentEditor: React.FC = () => {
  // États principaux
  const [activeTab, setActiveTab] = useState<string>('consultation');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationComplete, setGenerationComplete] = useState<boolean>(false);
  const [documents, setDocuments] = useState<DocumentStructure | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  // Données patient de démonstration
  const [patientData] = useState<PatientData>({
    firstName: "Jean",
    lastName: "DUPONT", 
    age: 45,
    gender: "Homme",
    weight: 75,
    height: 175,
    medicalHistory: ["Hypertension artérielle"],
    allergies: [],
    currentMedicationsText: "Amlodipine 5mg/jour",
    address: "Port-Louis, Maurice"
  });

  const [clinicalData] = useState<ClinicalData>({
    chiefComplaint: "Douleurs thoraciques et essoufflement depuis 3 jours",
    symptoms: ["Douleur thoracique", "Essoufflement", "Fatigue"],
    painScale: 6,
    symptomDuration: "3 jours",
    vitalSigns: {
      temperature: 36.8,
      heartRate: 85,
      bloodPressureSystolic: 150,
      bloodPressureDiastolic: 90
    },
    physicalExam: "Patient en état général satisfaisant"
  });

  // ============================================
  // GÉNÉRATION COMPLÈTE DES DOCUMENTS
  // ============================================

  const generateCompleteDocuments = async (): Promise<void> => {
    setIsGenerating(true);
    setGenerationComplete(false);
    setError(null);

    try {
      console.log("🚀 Lancement génération documents mauriciens complets");

      // Préparation des données de diagnostic simulées
      const diagnosisDataPayload = {
        diagnosis: {
          primary: {
            condition: "Syndrome coronarien aigu possible",
            confidence: 75,
            severity: "Modéré",
            rationale: "Basé sur douleurs thoraciques et facteurs de risque cardiovasculaires"
          }
        },
        expertAnalysis: {
          expert_investigations: {
            immediate_priority: [
              {
                category: "biology",
                examination: "Troponines cardiaques + ECG",
                urgency: "immediate",
                specific_indication: "Recherche syndrome coronarien aigu",
                fasting_required: false,
                sample_type: "Sang veineux",
                interpretation_keys: "Troponines, ECG",
                mauritius_availability: {
                  public_centers: ["Hôpital Dr Jeetoo", "Hôpital Candos"],
                  estimated_cost: "Gratuit secteur public"
                }
              },
              {
                category: "biology",
                examination: "Bilan lipidique complet",
                urgency: "routine",
                specific_indication: "Évaluation facteurs de risque cardiovasculaires",
                fasting_required: true,
                sample_type: "Sang veineux"
              },
              {
                category: "imaging",
                examination: "Radiographie thoracique face et profil",
                urgency: "urgent",
                specific_indication: "Éliminer pathologie pulmonaire",
                patient_preparation: "Retrait bijoux et objets métalliques",
                contraindications: "Grossesse",
                mauritius_availability: {
                  public_centers: ["Tous hôpitaux publics Maurice"]
                }
              },
              {
                category: "imaging",
                examination: "Échographie cardiaque transthoracique",
                urgency: "urgent",
                specific_indication: "Évaluation fonction ventriculaire gauche",
                patient_preparation: "Aucune préparation spéciale"
              }
            ]
          },
          expert_therapeutics: {
            primary_treatments: [
              {
                medication_dci: "Aspirine",
                therapeutic_class: "Antiagrégant plaquettaire",
                dosing_regimen: {
                  standard_adult: "75mg x 1/jour",
                  elderly_adjustment: "75mg x 1/jour"
                },
                treatment_duration: "Au long cours",
                precise_indication: "Prévention secondaire cardiovasculaire",
                contraindications_absolute: ["Allergie aspirine", "Ulcère gastro-duodénal actif"],
                monitoring_parameters: ["Tolérance digestive", "Signes hémorragiques"],
                mauritius_availability: {
                  locally_available: true,
                  brand_names: ["Kardégic", "Aspégic"],
                  private_sector_cost: "Rs 50-100/mois"
                }
              },
              {
                medication_dci: "Paracétamol",
                therapeutic_class: "Antalgique non opioïde",
                dosing_regimen: {
                  standard_adult: "1000mg x 3/jour si douleur",
                  elderly_adjustment: "500mg x 3/jour si douleur"
                },
                treatment_duration: "5 jours maximum",
                precise_indication: "Traitement symptomatique des douleurs",
                contraindications_absolute: ["Insuffisance hépatique sévère"],
                monitoring_parameters: ["Efficacité antalgique"],
                mauritius_availability: {
                  locally_available: true,
                  brand_names: ["Efferalgan", "Doliprane"],
                  private_sector_cost: "Rs 30-60/boîte"
                }
              }
            ]
          }
        }
      };

      // Appel API
      const response = await fetch('/api/generate-consultation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData: {
            responses: {
              "Avez-vous des antécédents cardiaques ?": "Hypertension artérielle depuis 5 ans",
              "Prenez-vous des médicaments ?": "Amlodipine 5mg/jour",
              "Fumez-vous ?": "Non-fumeur depuis 2 ans",
              "Activité physique ?": "Sédentaire"
            }
          },
          diagnosisData: diagnosisDataPayload
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Erreur API ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 API Response:', data);
      
      if (data.success) {
        // Adaptation des données pour le composant
        const adaptedDiagnosis: DiagnosisData = {
          primary: {
            condition: data.data.diagnosticAssessment?.primaryDiagnosis?.condition || "Syndrome coronarien aigu possible",
            confidence: data.data.diagnosticAssessment?.primaryDiagnosis?.confidence || 75
          }
        };

        const adaptedDocuments: DocumentStructure = {
          consultation: adaptConsultationDocument(data.data),
          biology: adaptBiologyDocument(data.data),
          paraclinical: adaptParaclinicalDocument(data.data),
          medication: adaptMedicationDocument(data.data)
        };

        setDiagnosis(adaptedDiagnosis);
        setDocuments(adaptedDocuments);
        setGenerationComplete(true);
        setActiveTab('consultation');
        console.log("✅ Documents mauriciens générés avec succès");
      } else {
        throw new Error(data.error || "Erreur lors de la génération");
      }

    } catch (error) {
      console.error("❌ Erreur génération documents:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // FONCTIONS D'ADAPTATION DES DONNÉES
  // ============================================

  const adaptConsultationDocument = (reportData: any) => {
    const mauritianDoc = reportData.mauritianDocuments?.consultation;
    
    return {
      header: {
        title: "COMPTE-RENDU DE CONSULTATION",
        subtitle: "Consultation médicale spécialisée",
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        physician: mauritianDoc?.header?.doctorName || "Dr. MÉDECIN EXPERT",
        registration: mauritianDoc?.header?.registrationNumber || "Medical Council Maurice - REG001"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: `${patientData.age} ans`,
        address: patientData.address || "Adresse, Maurice",
        idNumber: "IDXXXXXX"
      },
      content: {
        chiefComplaint: reportData.anamnesis?.chiefComplaint || clinicalData.chiefComplaint,
        history: reportData.anamnesis?.historyOfDisease || `Patient consulte pour ${clinicalData.chiefComplaint}. Évolution depuis ${clinicalData.symptomDuration}.`,
        examination: `État général : ${reportData.physicalExam?.generalExam || "Patient en bon état général"}\nSignes vitaux : ${reportData.physicalExam?.vitalSigns || "TA 150/90 mmHg, FC 85/min, T° 36.8°C"}\nExamen systémique : ${reportData.physicalExam?.systemicExam || "Selon symptomatologie"}`,
        diagnosis: reportData.diagnosticAssessment?.primaryDiagnosis?.condition || "Syndrome coronarien aigu possible",
        plan: reportData.therapeuticPlan?.followUp || "Examens complémentaires prescrits, traitement instauré, consultation de réévaluation programmée"
      }
    };
  };

  const adaptBiologyDocument = (reportData: any) => {
    const mauritianDoc = reportData.mauritianDocuments?.biology;
    
    return {
      header: {
        title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        subtitle: "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
        date: new Date().toLocaleDateString('fr-FR'),
        number: `BIO-MU-${Date.now().toString().slice(-8)}`,
        physician: "Dr. MÉDECIN EXPERT",
        registration: "Medical Council Maurice - REG001"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: `${patientData.age} ans`,
        address: patientData.address || "Maurice"
      },
      prescriptions: mauritianDoc?.prescriptions?.map((exam: any, index: number) => ({
        id: index + 1,
        exam: exam.exam || "Hémogramme complet + CRP",
        indication: exam.indication || "Bilan inflammatoire et hématologique",
        urgency: exam.urgency || "Semi-urgent (24-48h)",
        fasting: exam.fasting || "Non",
        expectedResults: exam.expectedResults || "Numération, formule, CRP",
        mauritianAvailability: exam.mauritianAvailability || "Disponible tous laboratoires Maurice"
      })) || [
        {
          id: 1,
          exam: "Troponines cardiaques",
          indication: "Recherche syndrome coronarien aigu",
          urgency: "Urgent (dans les heures)",
          fasting: "Non",
          expectedResults: "Troponines Ic et T",
          mauritianAvailability: "Hôpitaux publics et privés Maurice"
        },
        {
          id: 2,
          exam: "Bilan lipidique complet",
          indication: "Évaluation facteurs de risque cardiovasculaires",
          urgency: "Programmé (3-7 jours)",
          fasting: "Oui - 12h",
          expectedResults: "CT, HDL, LDL, TG",
          mauritianAvailability: "Tous laboratoires Maurice"
        }
      ]
    };
  };

  const adaptParaclinicalDocument = (reportData: any) => {
    const mauritianDoc = reportData.mauritianDocuments?.imaging;
    
    return {
      header: {
        title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        subtitle: "PRESCRIPTION D'EXAMENS PARACLINIQUES",
        date: new Date().toLocaleDateString('fr-FR'),
        number: `PARA-MU-${Date.now().toString().slice(-8)}`,
        physician: "Dr. MÉDECIN EXPERT",
        registration: "Medical Council Maurice - REG001"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: `${patientData.age} ans`,
        address: patientData.address || "Maurice"
      },
      prescriptions: mauritianDoc?.prescriptions?.map((exam: any, index: number) => ({
        id: index + 1,
        category: exam.category || "Imagerie thoracique",
        exam: exam.exam || "Radiographie thoracique",
        indication: exam.indication || "Exploration selon symptomatologie",
        urgency: exam.urgency || "Programmé (1-2 semaines)",
        preparation: exam.preparation || "Retrait bijoux",
        duration: exam.duration || "15 minutes",
        mauritianAvailability: exam.mauritianAvailability || "Hôpitaux publics et centres privés"
      })) || [
        {
          id: 1,
          category: "Imagerie thoracique",
          exam: "Radiographie thoracique face et profil",
          indication: "Éliminer pathologie pulmonaire",
          urgency: "Semi-urgent (24-48h)",
          preparation: "Retrait bijoux et objets métalliques",
          duration: "10 minutes",
          mauritianAvailability: "Tous hôpitaux publics Maurice"
        },
        {
          id: 2,
          category: "Échographie",
          exam: "Échographie cardiaque transthoracique",
          indication: "Évaluation fonction ventriculaire gauche",
          urgency: "Semi-urgent (24-48h)",
          preparation: "Aucune préparation spéciale",
          duration: "30 minutes",
          mauritianAvailability: "Centres publics et privés"
        }
      ]
    };
  };

  const adaptMedicationDocument = (reportData: any) => {
    const mauritianDoc = reportData.mauritianDocuments?.medication;
    
    return {
      header: {
        title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        subtitle: "PRESCRIPTION THÉRAPEUTIQUE",
        date: new Date().toLocaleDateString('fr-FR'),
        number: `MED-MU-${Date.now().toString().slice(-8)}`,
        physician: "Dr. MÉDECIN EXPERT",
        registration: "Medical Council Maurice - REG001",
        validity: "Ordonnance valable 3 mois"
      },
      patient: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: `${patientData.age} ans`,
        weight: patientData.weight ? `${patientData.weight}kg` : "",
        allergies: Array.isArray(patientData.allergies) && patientData.allergies.length > 0 
          ? patientData.allergies.join(', ') 
          : "Aucune allergie connue",
        address: patientData.address || "Maurice"
      },
      prescriptions: mauritianDoc?.prescriptions?.map((med: any, index: number) => ({
        id: index + 1,
        class: med.class || "Antiagrégant plaquettaire",
        dci: med.dci || "Aspirine",
        brand: med.brand || "Kardégic / Aspégic (Maurice)",
        dosage: med.dosage || "75mg",
        frequency: med.frequency || "1 fois par jour",
        duration: med.duration || "Au long cours",
        totalQuantity: med.totalQuantity || "30 comprimés",
        indication: med.indication || "Prévention cardiovasculaire",
        administration: med.administration || "Per os avec un grand verre d'eau",
        mauritianAvailability: med.mauritianAvailability || "Disponible toutes pharmacies Maurice"
      })) || [
        {
          id: 1,
          class: "Antiagrégant plaquettaire",
          dci: "Aspirine",
          brand: "Kardégic / Aspégic (Maurice)",
          dosage: "75mg",
          frequency: "1 fois par jour",
          duration: "Au long cours",
          totalQuantity: "30 comprimés",
          indication: "Prévention secondaire cardiovasculaire",
          administration: "Per os, le matin avec un grand verre d'eau",
          mauritianAvailability: "Disponible toutes pharmacies Maurice"
        },
        {
          id: 2,
          class: "Antalgique non opioïde",
          dci: "Paracétamol",
          brand: "Efferalgan / Doliprane (Maurice)",
          dosage: "1000mg",
          frequency: "3 fois par jour si douleur",
          duration: "5 jours maximum",
          totalQuantity: "15 comprimés",
          indication: "Traitement symptomatique des douleurs",
          administration: "Per os avec un grand verre d'eau",
          mauritianAvailability: "Disponible toutes pharmacies Maurice"
        }
      ],
      clinicalAdvice: mauritianDoc?.clinicalAdvice || {
        hydration: "Hydratation renforcée (2-3L/jour) - climat tropical Maurice",
        activity: "Repos adapté selon symptômes, éviter efforts intenses aux heures chaudes",
        diet: "Alimentation équilibrée, réduire sel si hypertension",
        mosquitoProtection: "Protection anti-moustiques indispensable (dengue/chikungunya endémiques)",
        followUp: "Consultation de réévaluation si pas d'amélioration sous 48-72h",
        emergency: "Urgences Maurice: 999 (SAMU) - Cliniques 24h: Apollo Bramwell, Wellkin"
      }
    };
  };

  // ============================================
  // GESTION DES MODIFICATIONS
  // ============================================

  const updateDocument = (docType: string, path: string, value: string): void => {
    if (!documents) return;

    setDocuments(prev => {
      if (!prev) return prev;
      const newDocs = { ...prev };
      const keys = path.split('.');
      let current = newDocs[docType as keyof DocumentStructure];
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newDocs;
    });
  };

  const updatePrescription = (docType: string, index: number, field: string, value: string): void => {
    if (!documents) return;

    setDocuments(prev => {
      if (!prev) return prev;
      const newDocs = { ...prev };
      const doc = newDocs[docType as keyof DocumentStructure];
      if (doc?.prescriptions?.[index]) {
        doc.prescriptions[index][field] = value;
      }
      return newDocs;
    });
  };

  // ============================================
  // ACTIONS DE DOCUMENTS
  // ============================================

  const downloadDocument = (): void => {
    if (!documents || !printRef.current) return;

    const element = printRef.current;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Documents Médicaux - ${patientData.firstName} ${patientData.lastName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; line-height: 1.4; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .patient-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #0066cc; }
            .prescription-item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; page-break-inside: avoid; }
            .footer { margin-top: 30px; text-align: right; }
            .page-break { page-break-before: always; }
            h1 { color: #0066cc; margin: 5px 0; font-size: 18px; }
            h2 { color: #333; margin: 10px 0; font-size: 16px; }
            .urgent { color: #e74c3c; font-weight: bold; }
            @media print {
              .no-print { display: none !important; }
              body { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetDocuments = (): void => {
    setGenerationComplete(false);
    setDocuments(null);
    setDiagnosis(null);
    setError(null);
    setActiveTab('consultation');
  };

  // ============================================
  // COMPOSANT CHAMP ÉDITABLE
  // ============================================

  const EditableField: React.FC<{
    value: string;
    onSave: (value: string) => void;
    placeholder: string;
    multiline?: boolean;
    className?: string;
  }> = ({ value, onSave, placeholder, multiline = false, className = "" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    const handleSave = () => {
      onSave(tempValue);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setTempValue(value);
      setIsEditing(false);
    };

    if (isEditing) {
      const InputComponent = multiline ? 'textarea' : 'input';
      const inputProps = multiline ? { rows: 4 } : { type: 'text' };

      return (
        <div className="relative">
          <InputComponent
            value={tempValue}
            onChange={(e: any) => setTempValue(e.target.value)}
            className={`w-full p-2 border-2 border-blue-300 rounded-md focus:border-blue-500 outline-none ${className}`}
            autoFocus
            onKeyPress={!multiline ? (e) => e.key === 'Enter' && handleSave() : undefined}
            {...inputProps}
          />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4 inline mr-1" /> Sauver
            </button>
            <button 
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`group relative cursor-pointer hover:bg-blue-50 p-2 rounded-md transition-colors ${className}`}
        onClick={() => setIsEditing(true)}
        title="Cliquer pour éditer"
      >
        <span className={value ? "" : "text-gray-400 italic"}>
          {value || placeholder}
        </span>
        <Edit3 className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity" />
      </div>
    );
  };

  // ============================================
  // INTERFACE DE GÉNÉRATION
  // ============================================

  if (!generationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="mb-8">
              <Brain className="w-20 h-20 text-blue-600 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-800 mb-3">
                TIBOK IA DOCTOR
              </h1>
              <h2 className="text-xl text-blue-600 mb-2">
                Documents Médicaux Mauriciens
              </h2>
              <p className="text-gray-600">
                Génération complète et modification de tous les documents médicaux conformes aux standards mauriciens
              </p>
            </div>

            {/* Résumé patient */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Résumé Patient</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <span className="font-medium text-gray-600">Patient:</span>
                  <span className="ml-2 text-gray-800">{patientData.firstName} {patientData.lastName}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600">Âge:</span>
                  <span className="ml-2 text-gray-800">{patientData.age} ans</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600">Sexe:</span>
                  <span className="ml-2 text-gray-800">{patientData.gender}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-600">Localité:</span>
                  <span className="ml-2 text-gray-800">{patientData.address}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Motif de consultation:</span>
                  <span className="ml-2 text-gray-800">{clinicalData.chiefComplaint}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Symptômes:</span>
                  <span className="ml-2 text-gray-800">{clinicalData.symptoms.join(", ")}</span>
                </div>
              </div>
            </div>

            {/* Documents à générer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                <FileText className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h4 className="font-semibold text-blue-800">Consultation</h4>
                <p className="text-xs text-blue-600 mt-1">Compte-rendu détaillé</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                <TestTube className="w-10 h-10 text-red-600 mx-auto mb-3" />
                <h4 className="font-semibold text-red-800">Biologie</h4>
                <p className="text-xs text-red-600 mt-1">Examens laboratoire</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                <Stethoscope className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-green-800">Paraclinique</h4>
                <p className="text-xs text-green-600 mt-1">Imagerie & explorations</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
                <Pill className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <h4 className="font-semibold text-purple-800">Médicaments</h4>
                <p className="text-xs text-purple-600 mt-1">Prescriptions sécurisées</p>
              </div>
            </div>

            {/* Gestion des erreurs */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Erreur lors de la génération</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 text-sm underline mt-2 hover:text-red-800"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Bouton génération */}
            <button
              onClick={generateCompleteDocuments}
              disabled={isGenerating}
              className={`px-10 py-4 text-white font-semibold rounded-xl transition-all shadow-lg ${
                isGenerating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader className="w-6 h-6 inline mr-3 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Brain className="w-6 h-6 inline mr-3" />
                  Générer tous les documents
                </>
              )}
            </button>

            {/* Animation de chargement */}
            {isGenerating && (
              <div className="mt-8 text-sm text-gray-600">
                <div className="flex justify-center items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="font-medium text-blue-800 mb-2">Traitement en cours...</p>
                  <div className="space-y-1 text-xs text-blue-600">
                    <p>• Analyse diagnostique IA</p>
                    <p>• Génération documents mauriciens</p>
                    <p>• Adaptation format local</p>
                    <p>• Validation conformité</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // INTERFACE DOCUMENTS GÉNÉRÉS
  // ============================================

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header avec diagnostic */}
        {diagnosis && (
          <div className="bg-white rounded-lg shadow-md mb-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Check className="w-7 h-7 text-green-500 mr-3" />
                  Documents Générés avec Succès
                </h1>
                <div className="mt-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Diagnostic principal:</span> {diagnosis.primary.condition}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium">Niveau de confiance:</span> {diagnosis.primary.confidence}%
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>🔍 Tous les champs sont modifiables</p>
                <p>✏️ Cliquez pour éditer le contenu</p>
                <p>📋 Documents conformes standards Maurice</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation par onglets */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            {[
              { id: 'consultation', label: 'Consultation', icon: FileText, color: 'blue' },
              { id: 'biology', label: 'Examens Biologiques', icon: TestTube, color: 'red' },
              { id: 'paraclinical', label: 'Examens Paracliniques', icon: Stethoscope, color: 'green' },
              { id: 'medication', label: 'Médicaments', icon: Pill, color: 'purple' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? `border-b-2 border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50` 
                      : `text-gray-600 hover:text-${tab.color}-600 hover:bg-${tab.color}-25`
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Barre d'actions */}
          <div className="p-4 bg-gray-50 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <Edit3 className="w-4 h-4 mr-2" />
              Cliquez sur n'importe quel champ pour l'éditer
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={downloadDocument}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </button>
              
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-md"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </button>

              <button
                onClick={resetDocuments}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-md"
              >
                <X className="w-4 h-4 mr-2" />
                Nouveau Patient
              </button>
            </div>
          </div>
        </div>

        {/* Contenu des documents */}
        <div ref={printRef} className="print:shadow-none">
          {activeTab === 'consultation' && documents?.consultation && (
            <ConsultationDocument 
              document={documents.consultation} 
              updateDocument={updateDocument}
              EditableField={EditableField}
            />
          )}
          
          {activeTab === 'biology' && documents?.biology && (
            <BiologyDocument 
              document={documents.biology} 
              updateDocument={updateDocument}
              updatePrescription={updatePrescription}
              EditableField={EditableField}
            />
          )}
          
          {activeTab === 'paraclinical' && documents?.paraclinical && (
            <ParaclinicalDocument 
              document={documents.paraclinical} 
              updateDocument={updateDocument}
              updatePrescription={updatePrescription}
              EditableField={EditableField}
            />
          )}
          
          {activeTab === 'medication' && documents?.medication && (
            <MedicationDocument 
              document={documents.medication} 
              updateDocument={updateDocument}
              updatePrescription={updatePrescription}
              EditableField={EditableField}
            />
          )}
        </div>
      </div>

      {/* Styles pour l'impression */}
      <style jsx global>{`
        @media print {
          body { margin: 0; background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .no-print, button { display: none !important; }
          .bg-gray-100 { background: white !important; }
          .bg-blue-50, .bg-red-50, .bg-green-50, .bg-purple-50 { background: #f8f9fa !important; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// COMPOSANTS DE DOCUMENTS INDIVIDUELS
// ============================================

interface DocumentProps {
  document: any;
  updateDocument: (docType: string, path: string, value: string) => void;
  updatePrescription?: (docType: string, index: number, field: string, value: string) => void;
  EditableField: React.FC<any>;
}

// Composant Document de Consultation
const ConsultationDocument: React.FC<DocumentProps> = ({ document, updateDocument, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-blue-800 pb-6 mb-8">
      <h1 className="text-3xl font-bold text-blue-800 mb-2">
        <EditableField 
          value={document.header.title}
          onSave={(val: string) => updateDocument('consultation', 'header.title', val)}
          placeholder="Titre du document"
        />
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        <EditableField 
          value={document.header.subtitle}
          onSave={(val: string) => updateDocument('consultation', 'header.subtitle', val)}
          placeholder="Sous-titre"
        />
      </p>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Date: <EditableField value={document.header.date} onSave={(val: string) => updateDocument('consultation', 'header.date', val)} placeholder="Date" /></span>
        <span>Heure: <EditableField value={document.header.time} onSave={(val: string) => updateDocument('consultation', 'header.time', val)} placeholder="Heure" /></span>
      </div>
    </div>

    {/* Informations médecin */}
    <div className="bg-blue-50 p-6 rounded-lg mb-6 border border-blue-200">
      <h2 className="text-lg font-semibold text-blue-800 mb-4">Médecin Prescripteur</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <strong className="text-blue-700">Nom:</strong> 
          <EditableField 
            value={document.header.physician} 
            onSave={(val: string) => updateDocument('consultation', 'header.physician', val)} 
            placeholder="Nom du médecin" 
          />
        </div>
        <div>
          <strong className="text-blue-700">N° d'enregistrement:</strong> 
          <EditableField 
            value={document.header.registration} 
            onSave={(val: string) => updateDocument('consultation', 'header.registration', val)} 
            placeholder="Numéro d'enregistrement" 
          />
        </div>
      </div>
    </div>

    {/* Informations patient */}
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-green-500">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Informations Patient</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <strong className="text-gray-700">Nom complet:</strong> 
          <EditableField 
            value={`${document.patient.firstName} ${document.patient.lastName}`} 
            onSave={(val: string) => {
              const [first, ...rest] = val.split(' ');
              updateDocument('consultation', 'patient.firstName', first);
              updateDocument('consultation', 'patient.lastName', rest.join(' '));
            }} 
            placeholder="Nom complet" 
          />
        </div>
        <div>
          <strong className="text-gray-700">Âge:</strong> 
          <EditableField 
            value={document.patient.age} 
            onSave={(val: string) => updateDocument('consultation', 'patient.age', val)} 
            placeholder="Âge" 
          />
        </div>
        <div>
          <strong className="text-gray-700">Adresse:</strong> 
          <EditableField 
            value={document.patient.address} 
            onSave={(val: string) => updateDocument('consultation', 'patient.address', val)} 
            placeholder="Adresse complète" 
          />
        </div>
        <div>
          <strong className="text-gray-700">Carte d'identité:</strong> 
          <EditableField 
            value={document.patient.idNumber} 
            onSave={(val: string) => updateDocument('consultation', 'patient.idNumber', val)} 
            placeholder="Numéro carte d'identité" 
          />
        </div>
      </div>
    </div>

    {/* Contenu médical */}
    <div className="space-y-6">
      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          📋 Motif de consultation
        </h3>
        <EditableField 
          value={document.content.chiefComplaint}
          onSave={(val: string) => updateDocument('consultation', 'content.chiefComplaint', val)}
          placeholder="Motif principal de la consultation"
          multiline={true}
        />
      </div>

      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          📝 Histoire de la maladie
        </h3>
        <EditableField 
          value={document.content.history}
          onSave={(val: string) => updateDocument('consultation', 'content.history', val)}
          placeholder="Histoire détaillée de la maladie actuelle"
          multiline={true}
        />
      </div>

      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          🔍 Examen clinique
        </h3>
        <EditableField 
          value={document.content.examination}
          onSave={(val: string) => updateDocument('consultation', 'content.examination', val)}
          placeholder="Résultats de l'examen physique"
          multiline={true}
        />
      </div>

      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          🎯 Diagnostic
        </h3>
        <EditableField 
          value={document.content.diagnosis}
          onSave={(val: string) => updateDocument('consultation', 'content.diagnosis', val)}
          placeholder="Diagnostic retenu"
          multiline={true}
        />
      </div>

      <div className="bg-white p-6 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          📋 Plan de traitement
        </h3>
        <EditableField 
          value={document.content.plan}
          onSave={(val: string) => updateDocument('consultation', 'content.plan', val)}
          placeholder="Plan thérapeutique et suivi"
          multiline={true}
        />
      </div>
    </div>

    {/* Signature */}
    <div className="mt-8 pt-6 border-t-2 border-gray-300 text-right">
      <p className="text-sm text-gray-600 mb-4">Fait à Port-Louis, le {document.header.date}</p>
      <div className="w-64 h-24 border-2 border-dashed border-gray-400 ml-auto flex items-center justify-center text-gray-500 bg-gray-50 rounded">
        <div className="text-center">
          <p className="text-sm font-medium">Signature et cachet médical</p>
          <p className="text-xs">{document.header.physician}</p>
        </div>
      </div>
    </div>
  </div>
);

// Composant Document Biologie
const BiologyDocument: React.FC<DocumentProps> = ({ document, updateDocument, updatePrescription, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-red-600 pb-6 mb-8">
      <h1 className="text-3xl font-bold text-red-600 mb-2">{document.header.title}</h1>
      <h2 className="text-xl text-gray-600 mb-4">{document.header.subtitle}</h2>
      <div className="flex justify-between text-sm text-gray-600">
        <span><strong>Date:</strong> {document.header.date}</span>
        <span><strong>N° Ordonnance:</strong> {document.header.number}</span>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <span><strong>Médecin:</strong> {document.header.physician}</span>
        <span className="ml-4"><strong>Enregistrement:</strong> {document.header.registration}</span>
      </div>
    </div>

    {/* Informations patient */}
    <div className="bg-red-50 p-6 rounded-lg mb-6 border border-red-200">
      <h3 className="text-lg font-semibold text-red-800 mb-4">Patient</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div><strong>Nom:</strong> {document.patient.firstName} {document.patient.lastName}</div>
        <div><strong>Âge:</strong> {document.patient.age}</div>
        <div><strong>Adresse:</strong> {document.patient.address}</div>
      </div>
    </div>

    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        🧪 Examens Biologiques Prescrits
      </h3>
      
      {document.prescriptions.map((prescription: any, index: number) => (
        <div key={prescription.id} className="border-2 border-red-200 rounded-lg p-6 hover:border-red-300 transition-colors bg-red-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center mb-3">
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                  Ligne {prescription.id}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  prescription.urgency.includes('Urgent') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {prescription.urgency}
                </span>
              </div>
              <div className="text-lg font-bold text-red-800">
                <EditableField 
                  value={prescription.exam}
                  onSave={(val: string) => updatePrescription && updatePrescription('biology', index, 'exam', val)}
                  placeholder="Nom de l'examen"
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <strong className="text-red-700">Indication médicale:</strong>
              <EditableField 
                value={prescription.indication}
                onSave={(val: string) => updatePrescription && updatePrescription('biology', index, 'indication', val)}
                placeholder="Indication médicale de l'examen"
                multiline={true}
              />
            </div>
            
            <div>
              <strong className="text-red-700">Jeûne requis:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                prescription.fasting === 'Oui' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
              }`}>
                {prescription.fasting}
              </span>
            </div>
            
            <div>
              <strong className="text-red-700">Résultats attendus:</strong>
              <div className="text-sm text-gray-600 mt-1">{prescription.expectedResults}</div>
            </div>
          </div>
          
          <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>📍 Disponibilité Maurice:</strong> {prescription.mauritianAvailability}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
      <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
        📋 Instructions Importantes
      </h4>
      <ul className="text-sm text-blue-700 space-y-2">
        <li>• Se présenter dans tout laboratoire agréé à Maurice avec cette ordonnance</li>
        <li>• Apporter une pièce d'identité valide</li>
        <li>• Respecter le jeûne si indiqué (généralement 8 à 12 heures)</li>
        <li>• Ordonnance valable 6 mois à compter de la date d'émission</li>
        <li>• Résultats à rapporter lors de la prochaine consultation</li>
      </ul>
    </div>

    {/* Signature */}
    <div className="mt-8 pt-6 border-t-2 border-gray-300 text-right">
      <p className="text-sm text-gray-600 mb-4">Date d'émission: {document.header.date}</p>
      <div className="w-64 h-20 border-2 border-dashed border-gray-400 ml-auto flex items-center justify-center text-gray-500 bg-gray-50 rounded">
        <div className="text-center">
          <p className="text-sm font-medium">Signature et cachet médical</p>
          <p className="text-xs">{document.header.physician}</p>
        </div>
      </div>
    </div>
  </div>
);

// Composant Document Paraclinique  
const ParaclinicalDocument: React.FC<DocumentProps> = ({ document, updateDocument, updatePrescription, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-green-600 pb-6 mb-8">
      <h1 className="text-3xl font-bold text-green-600 mb-2">{document.header.title}</h1>
      <h2 className="text-xl text-gray-600 mb-4">{document.header.subtitle}</h2>
      <div className="flex justify-between text-sm text-gray-600">
        <span><strong>Date:</strong> {document.header.date}</span>
        <span><strong>N° Ordonnance:</strong> {document.header.number}</span>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <span><strong>Médecin:</strong> {document.header.physician}</span>
        <span className="ml-4"><strong>Enregistrement:</strong> {document.header.registration}</span>
      </div>
    </div>

    {/* Informations patient */}
    <div className="bg-green-50 p-6 rounded-lg mb-6 border border-green-200">
      <h3 className="text-lg font-semibold text-green-800 mb-4">Patient</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div><strong>Nom:</strong> {document.patient.firstName} {document.patient.lastName}</div>
        <div><strong>Âge:</strong> {document.patient.age}</div>
        <div><strong>Adresse:</strong> {document.patient.address}</div>
      </div>
    </div>

    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        🏥 Examens Paracliniques Prescrits
      </h3>
      
      {document.prescriptions.map((prescription: any, index: number) => (
        <div key={prescription.id} className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center mb-3">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                  Ligne {prescription.id}
                </span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-3">
                  {prescription.category}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  prescription.urgency.includes('Urgent') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {prescription.urgency}
                </span>
              </div>
              <div className="text-lg font-bold text-green-800">
                <EditableField 
                  value={prescription.exam}
                  onSave={(val: string) => updatePrescription && updatePrescription('paraclinical', index, 'exam', val)}
                  placeholder="Nom de l'examen"
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <strong className="text-green-700">Indication médicale:</strong>
              <EditableField 
                value={prescription.indication}
                onSave={(val: string) => updatePrescription && updatePrescription('paraclinical', index, 'indication', val)}
                placeholder="Indication médicale de l'examen"
                multiline={true}
              />
            </div>
            
            <div>
              <strong className="text-green-700">Préparation:</strong>
              <div className="text-sm text-gray-600 mt-1">{prescription.preparation}</div>
            </div>
            
            <div>
              <strong className="text-green-700">Durée estimée:</strong>
              <div className="text-sm text-gray-600 mt-1">{prescription.duration}</div>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>📍 Disponibilité Maurice:</strong> {prescription.mauritianAvailability}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 bg-orange-50 p-6 rounded-lg border border-orange-200">
      <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
        📋 Instructions Importantes
      </h4>
      <ul className="text-sm text-orange-700 space-y-2">
        <li>• Prendre rendez-vous dans un centre agréé à Maurice</li>
        <li>• Apporter l'ordonnance et une pièce d'identité</li>
        <li>• Respecter la préparation si indiquée</li>
        <li>• Ordonnance valable 6 mois à compter de la date d'émission</li>
        <li>• Rapporter les résultats et compte-rendu à la prochaine consultation</li>
      </ul>
    </div>

    {/* Signature */}
    <div className="mt-8 pt-6 border-t-2 border-gray-300 text-right">
      <p className="text-sm text-gray-600 mb-4">Date d'émission: {document.header.date}</p>
      <div className="w-64 h-20 border-2 border-dashed border-gray-400 ml-auto flex items-center justify-center text-gray-500 bg-gray-50 rounded">
        <div className="text-center">
          <p className="text-sm font-medium">Signature et cachet médical</p>
          <p className="text-xs">{document.header.physician}</p>
        </div>
      </div>
    </div>
  </div>
);

// Composant Document Médicaments
const MedicationDocument: React.FC<DocumentProps> = ({ document, updateDocument, updatePrescription, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-purple-600 pb-6 mb-8">
      <h1 className="text-3xl font-bold text-purple-600 mb-2">{document.header.title}</h1>
      <h2 className="text-xl text-gray-600 mb-4">{document.header.subtitle}</h2>
      <div className="flex justify-between text-sm text-gray-600">
        <span><strong>Date:</strong> {document.header.date}</span>
        <span><strong>N° Ordonnance:</strong> {document.header.number}</span>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <span><strong>Médecin:</strong> {document.header.physician}</span>
        <span className="ml-4"><strong>Enregistrement:</strong> {document.header.registration}</span>
      </div>
      <div className="mt-2 text-sm text-purple-600 font-medium">{document.header.validity}</div>
    </div>

    {/* Informations patient avec allergies */}
    <div className="bg-purple-50 p-6 rounded-lg mb-6 border border-purple-200">
      <h3 className="text-lg font-semibold text-purple-800 mb-4">Patient</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div><strong>Nom:</strong> {document.patient.firstName} {document.patient.lastName}</div>
        <div><strong>Âge:</strong> {document.patient.age}</div>
        <div><strong>Poids:</strong> {document.patient.weight || "Non renseigné"}</div>
        <div><strong>Adresse:</strong> {document.patient.address}</div>
      </div>
      
      {/* Allergies importantes */}
      {document.patient.allergies && document.patient.allergies !== "Aucune allergie connue" && (
        <div className="mt-4 bg-red-100 border border-red-300 p-3 rounded">
          <div className="flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            <strong>⚠️ ALLERGIES PATIENT:</strong>
            <span className="ml-2 font-medium">{document.patient.allergies}</span>
          </div>
        </div>
      )}
    </div>

    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        💊 Médicaments Prescrits
      </h3>
      
      {document.prescriptions.map((prescription: any, index: number) => (
        <div key={prescription.id} className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center mb-3">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                  Ligne {prescription.id}
                </span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  {prescription.class}
                </span>
              </div>
              <div className="text-lg font-bold text-purple-800 mb-2">
                <EditableField 
                  value={`${prescription.dci} (${prescription.brand})`}
                  onSave={(val: string) => {
                    const [dci, brand] = val.split('(');
                    updatePrescription && updatePrescription('medication', index, 'dci', dci.trim());
                    updatePrescription && updatePrescription('medication', index, 'brand', brand?.replace(')', '').trim() || '');
                  }}
                  placeholder="DCI (Marque)"
                />
              </div>
            </div>
            
            <div>
              <strong className="text-purple-700">Dosage:</strong>
              <EditableField 
                value={prescription.dosage}
                onSave={(val: string) => updatePrescription && updatePrescription('medication', index, 'dosage', val)}
                placeholder="Dosage"
              />
            </div>
            
            <div>
              <strong className="text-purple-700">Fréquence:</strong>
              <EditableField 
                value={prescription.frequency}
                onSave={(val: string) => updatePrescription && updatePrescription('medication', index, 'frequency', val)}
                placeholder="Fréquence"
              />
            </div>
            
            <div>
              <strong className="text-purple-700">Durée:</strong>
              <EditableField 
                value={prescription.duration}
                onSave={(val: string) => updatePrescription && updatePrescription('medication', index, 'duration', val)}
                placeholder="Durée"
              />
            </div>
            
            <div>
              <strong className="text-purple-700">Quantité totale:</strong>
              <div className="text-sm text-gray-600 mt-1">{prescription.totalQuantity}</div>
            </div>
            
            <div className="md:col-span-2">
              <strong className="text-purple-700">Indication thérapeutique:</strong>
              <EditableField 
                value={prescription.indication}
                onSave={(val: string) => updatePrescription && updatePrescription('medication', index, 'indication', val)}
                placeholder="Indication thérapeutique"
                multiline={true}
              />
            </div>
            
            <div className="md:col-span-2">
              <strong className="text-purple-700">Mode d'administration:</strong>
              <div className="text-sm text-gray-600 mt-1">{prescription.administration}</div>
            </div>
          </div>
          
          <div className="mt-4 bg-green-50 p-3 rounded border border-green-200">
            <div className="text-sm text-green-800">
              <strong>📍 Disponibilité Maurice:</strong> {prescription.mauritianAvailability}
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Conseils cliniques */}
    <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
      <h4 className="font-semibold text-blue-800 mb-4 flex items-center">
        🏥 Conseils et Surveillance Spécifique Maurice
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <strong className="text-blue-700">💧 Hydratation:</strong>
          <p className="text-blue-600 mt-1">{document.clinicalAdvice.hydration}</p>
        </div>
        <div>
          <strong className="text-blue-700">🏃 Activité:</strong>
          <p className="text-blue-600 mt-1">{document.clinicalAdvice.activity}</p>
        </div>
        <div>
          <strong className="text-blue-700">🍽️ Alimentation:</strong>
          <p className="text-blue-600 mt-1">{document.clinicalAdvice.diet}</p>
        </div>
        <div>
          <strong className="text-blue-700">🦟 Protection anti-vectorielle:</strong>
          <p className="text-blue-600 mt-1">{document.clinicalAdvice.mosquitoProtection}</p>
        </div>
        <div>
          <strong className="text-blue-700">📅 Suivi médical:</strong>
          <p className="text-blue-600 mt-1">{document.clinicalAdvice.followUp}</p>
        </div>
        <div>
          <strong className="text-blue-700">🚨 Urgences:</strong>
          <p className="text-blue-600 mt-1">{document.clinicalAdvice.emergency}</p>
        </div>
      </div>
    </div>

    {/* Instructions finales */}
    <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-3">📋 Instructions Importantes</h4>
      <ul className="text-sm text-gray-700 space-y-2">
        <li>• <strong>Respecter scrupuleusement les doses prescrites</strong></li>
        <li>• Ne pas arrêter le traitement sans avis médical</li>
        <li>• Signaler immédiatement tout effet indésirable</li>
        <li>• Conserver les médicaments à l'abri de la chaleur et de l'humidité (climat tropical)</li>
        <li>• Ordonnance valable 3 mois à compter de la date d'émission</li>
        <li>• En cas d'urgence: <strong>999 (SAMU)</strong> ou <strong>114 (Police/Ambulance Maurice)</strong></li>
      </ul>
    </div>

    {/* Signature */}
    <div className="mt-8 pt-6 border-t-2 border-gray-300 text-right">
      <p className="text-sm text-gray-600 mb-4">Date d'émission: {document.header.date}</p>
      <div className="w-64 h-20 border-2 border-dashed border-gray-400 ml-auto flex items-center justify-center text-gray-500 bg-gray-50 rounded">
        <div className="text-center">
          <p className="text-sm font-medium">Signature et cachet médical</p>
          <p className="text-xs">{document.header.physician}</p>
        </div>
      </div>
    </div>
  </div>
);

export default CompleteMauritianDocumentEditor;
