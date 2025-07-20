import React, { useState, useRef } from 'react';
import { Download, Edit3, Save, Eye, FileText, Stethoscope, Pill, TestTube, Brain, Loader, Check, X } from 'lucide-react';

const CompleteMauritianDocumentEditor = () => {
  const [activeTab, setActiveTab] = useState('consultation');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [documents, setDocuments] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const printRef = useRef();

  // Données patient exemple pour démo
  const [patientData] = useState({
    firstName: "Jean",
    lastName: "DUPONT", 
    age: 45,
    gender: "Homme",
    weight: 75,
    height: 175,
    medicalHistory: ["Hypertension artérielle"],
    allergies: [],
    currentMedicationsText: "Amlodipine 5mg"
  });

  const [clinicalData] = useState({
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
    physicalExam: "Examen cardiaque et pulmonaire à compléter"
  });

  // Génération complète via API
  const generateCompleteDocuments = async () => {
    setIsGenerating(true);
    setGenerationComplete(false);

    try {
      console.log("🚀 Lancement génération documents mauriciens complets");

      const response = await fetch('/api/openai-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData: {
            responses: [
              { question: "Avez-vous des antécédents cardiaques ?", answer: "Hypertension" },
              { question: "Prenez-vous des médicaments ?", answer: "Amlodipine" }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDiagnosis(data.diagnosis);
        setDocuments(data.mauritianDocuments);
        setGenerationComplete(true);
        setActiveTab('consultation'); // Revenir à l'onglet principal
        console.log("✅ Documents mauriciens générés avec succès");
      } else {
        throw new Error(data.error || "Erreur génération");
      }

    } catch (error) {
      console.error("❌ Erreur génération documents:", error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Mise à jour des documents
  const updateDocument = (docType, path, value) => {
    if (!documents) return;

    setDocuments(prev => {
      const newDocs = { ...prev };
      const keys = path.split('.');
      let current = newDocs[docType];
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newDocs;
    });
  };

  // Mise à jour des prescriptions (arrays)
  const updatePrescription = (docType, index, field, value) => {
    if (!documents) return;

    setDocuments(prev => {
      const newDocs = { ...prev };
      newDocs[docType].prescriptions[index][field] = value;
      return newDocs;
    });
  };

  // Téléchargement PDF
  const downloadDocument = () => {
    if (!documents) return;

    const element = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Documents Médicaux - ${patientData.firstName} ${patientData.lastName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .patient-info { background: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #0066cc; }
            .prescription-item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
            .footer { margin-top: 30px; text-align: right; }
            h1 { color: #0066cc; margin: 5px 0; }
            h2 { color: #333; margin: 10px 0; }
            .urgent { color: #e74c3c; font-weight: bold; }
            .page-break { page-break-before: always; }
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

  // Composant champ éditable
  const EditableField = ({ value, onSave, placeholder, multiline = false, className = "" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    const handleSave = () => {
      onSave(tempValue);
      setIsEditing(false);
    };

    if (isEditing) {
      return multiline ? (
        <div className="relative">
          <textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className={`w-full p-2 border-2 border-blue-300 rounded-md focus:border-blue-500 outline-none ${className}`}
            rows={4}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
            >
              <Save className="w-4 h-4 inline mr-1" /> Sauver
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className={`w-full p-2 border-2 border-blue-300 rounded-md focus:border-blue-500 outline-none ${className}`}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
            >
              <Save className="w-4 h-4 inline mr-1" /> Sauver
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
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
      >
        <span className={value ? "" : "text-gray-400 italic"}>
          {value || placeholder}
        </span>
        <Edit3 className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity" />
      </div>
    );
  };

  // Interface principale
  if (!generationComplete) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                TIBOK IA DOCTOR - Documents Mauriciens
              </h1>
              <p className="text-gray-600">
                Génération complète de tous les documents médicaux mauriciens modifiables
              </p>
            </div>

            {/* Résumé patient */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h2 className="text-lg font-semibold mb-4">Résumé Patient</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Patient:</strong> {patientData.firstName} {patientData.lastName}</div>
                <div><strong>Âge:</strong> {patientData.age} ans</div>
                <div><strong>Motif:</strong> {clinicalData.chiefComplaint}</div>
                <div><strong>Symptômes:</strong> {clinicalData.symptoms.join(", ")}</div>
              </div>
            </div>

            {/* Documents à générer */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold">Consultation</h3>
                <p className="text-sm text-gray-600">Compte-rendu détaillé</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <TestTube className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h3 className="font-semibold">Examens Biologiques</h3>
                <p className="text-sm text-gray-600">Prescriptions laboratoire</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <Stethoscope className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold">Examens Paracliniques</h3>
                <p className="text-sm text-gray-600">Imagerie et explorations</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <Pill className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold">Médicaments</h3>
                <p className="text-sm text-gray-600">Prescriptions sécurisées</p>
              </div>
            </div>

            {/* Bouton génération */}
            <button
              onClick={generateCompleteDocuments}
              disabled={isGenerating}
              className={`px-8 py-4 text-white font-semibold rounded-lg transition-all ${
                isGenerating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader className="w-5 h-5 inline mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 inline mr-2" />
                  Générer tous les documents
                </>
              )}
            </button>

            {isGenerating && (
              <div className="mt-6 text-sm text-gray-600">
                <div className="flex justify-center items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <p className="mt-2">Analyse diagnostique et génération des documents mauriciens...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Interface documents générés
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header avec diagnostic */}
        {diagnosis && (
          <div className="bg-white rounded-lg shadow-md mb-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Check className="w-6 h-6 text-green-500 mr-2" />
                  Documents Générés avec Succès
                </h1>
                <p className="text-gray-600 mt-1">Diagnostic: {diagnosis.primary.condition}</p>
                <p className="text-sm text-gray-500">Confiance: {diagnosis.primary.confidence}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Tous les champs sont modifiables</p>
                <p className="text-sm text-gray-500">Cliquez pour éditer</p>
              </div>
            </div>
          </div>
        )}

        {/* Header avec onglets */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('consultation')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'consultation' 
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <FileText className="w-5 h-5 mr-2" />
              Consultation
            </button>
            
            <button
              onClick={() => setActiveTab('biology')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'biology' 
                  ? 'border-b-2 border-red-500 text-red-600 bg-red-50' 
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <TestTube className="w-5 h-5 mr-2" />
              Examens Biologiques
            </button>
            
            <button
              onClick={() => setActiveTab('paraclinical')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'paraclinical' 
                  ? 'border-b-2 border-green-500 text-green-600 bg-green-50' 
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              <Stethoscope className="w-5 h-5 mr-2" />
              Examens Paracliniques
            </button>
            
            <button
              onClick={() => setActiveTab('medication')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'medication' 
                  ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <Pill className="w-5 h-5 mr-2" />
              Médicaments
            </button>
          </div>

          {/* Actions */}
          <div className="p-4 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-600">
              <Edit3 className="w-4 h-4 mr-2" />
              Cliquez sur n'importe quel champ pour l'éditer
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={downloadDocument}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </button>
              
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Imprimer
              </button>

              <button
                onClick={() => {
                  setGenerationComplete(false);
                  setDocuments(null);
                  setDiagnosis(null);
                }}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Nouveau
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

      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .print\\:shadow-none { box-shadow: none !important; }
          button { display: none !important; }
          .bg-gray-100 { background: white !important; }
        }
      `}</style>
    </div>
  );
};

// Composant Document de Consultation
const ConsultationDocument = ({ document, updateDocument, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-blue-800 pb-6 mb-8">
      <h1 className="text-2xl font-bold text-blue-800 mb-1">
        <EditableField 
          value={document.header.title}
          onSave={(val) => updateDocument('consultation', 'header.title', val)}
          placeholder="Titre du document"
        />
      </h1>
      <p className="text-lg text-gray-600">
        <EditableField 
          value={document.header.subtitle}
          onSave={(val) => updateDocument('consultation', 'header.subtitle', val)}
          placeholder="Sous-titre"
        />
      </p>
      <div className="flex justify-between text-sm text-gray-600 mt-4">
        <span>Date: <EditableField value={document.header.date} onSave={(val) => updateDocument('consultation', 'header.date', val)} placeholder="Date" /></span>
        <span>Heure: <EditableField value={document.header.time} onSave={(val) => updateDocument('consultation', 'header.time', val)} placeholder="Heure" /></span>
      </div>
    </div>

    {/* Médecin */}
    <div className="bg-blue-50 p-6 rounded-lg mb-6">
      <h2 className="text-lg font-semibold text-blue-800 mb-3">Médecin</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <strong>Nom:</strong> <EditableField value={document.header.physician} onSave={(val) => updateDocument('consultation', 'header.physician', val)} placeholder="Nom du médecin" />
        </div>
        <div>
          <strong>N° d'enregistrement:</strong> <EditableField value={document.header.registration} onSave={(val) => updateDocument('consultation', 'header.registration', val)} placeholder="Numéro" />
        </div>
      </div>
    </div>

    {/* Patient */}
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-green-500">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Patient</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <strong>Nom:</strong> <EditableField value={`${document.patient.firstName} ${document.patient.lastName}`} onSave={(val) => {
            const [first, ...rest] = val.split(' ');
            updateDocument('consultation', 'patient.firstName', first);
            updateDocument('consultation', 'patient.lastName', rest.join(' '));
          }} placeholder="Nom complet" />
        </div>
        <div>
          <strong>Âge:</strong> <EditableField value={document.patient.age} onSave={(val) => updateDocument('consultation', 'patient.age', val)} placeholder="Âge" />
        </div>
        <div>
          <strong>Adresse:</strong> <EditableField value={document.patient.address} onSave={(val) => updateDocument('consultation', 'patient.address', val)} placeholder="Adresse complète" />
        </div>
        <div>
          <strong>Carte d'identité:</strong> <EditableField value={document.patient.idNumber} onSave={(val) => updateDocument('consultation', 'patient.idNumber', val)} placeholder="Numéro carte d'identité" />
        </div>
      </div>
    </div>

    {/* Contenu médical */}
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Motif de consultation</h3>
        <EditableField 
          value={document.content.chiefComplaint}
          onSave={(val) => updateDocument('consultation', 'content.chiefComplaint', val)}
          placeholder="Motif principal"
          multiline={true}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Histoire de la maladie</h3>
        <EditableField 
          value={document.content.history}
          onSave={(val) => updateDocument('consultation', 'content.history', val)}
          placeholder="Histoire détaillée"
          multiline={true}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Examen clinique</h3>
        <EditableField 
          value={document.content.examination}
          onSave={(val) => updateDocument('consultation', 'content.examination', val)}
          placeholder="Résultats examen"
          multiline={true}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Diagnostic</h3>
        <EditableField 
          value={document.content.diagnosis}
          onSave={(val) => updateDocument('consultation', 'content.diagnosis', val)}
          placeholder="Diagnostic retenu"
          multiline={true}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Plan de traitement</h3>
        <EditableField 
          value={document.content.plan}
          onSave={(val) => updateDocument('consultation', 'content.plan', val)}
          placeholder="Plan thérapeutique"
          multiline={true}
        />
      </div>
    </div>

    {/* Signature */}
    <div className="mt-8 pt-6 border-t-2 border-gray-300 text-right">
      <p className="text-sm text-gray-600 mb-2">Fait à Port-Louis, le {document.header.date}</p>
      <div className="w-48 h-20 border-2 border-dashed border-gray-400 ml-auto flex items-center justify-center text-gray-500">
        Signature et cachet médical
      </div>
    </div>
  </div>
);

// Composant Document Biologie
const BiologyDocument = ({ document, updateDocument, updatePrescription, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-red-600 pb-6 mb-8">
      <h1 className="text-2xl font-bold text-red-600 mb-2">{document.header.title}</h1>
      <h2 className="text-lg text-gray-600 mb-4">{document.header.subtitle}</h2>
      <div className="flex justify-between text-sm">
        <span>Date: {document.header.date}</span>
        <span>N° Ordonnance: {document.header.number}</span>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Examens prescrits:</h3>
      
      {document.prescriptions.map((prescription, index) => (
        <div key={prescription.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Ligne {prescription.id}:</strong>
              <EditableField 
                value={prescription.exam}
                onSave={(val) => updatePrescription('biology', index, 'exam', val)}
                placeholder="Nom de l'examen"
              />
            </div>
            <div className={prescription.urgency === 'Urgent' ? 'text-red-600 font-bold' : ''}>
              <strong>Urgence:</strong> 
              <EditableField 
                value={prescription.urgency}
                onSave={(val) => updatePrescription('biology', index, 'urgency', val)}
                placeholder="Niveau d'urgence"
              />
            </div>
            <div className="col-span-2">
              <strong>Indication:</strong>
              <EditableField 
                value={prescription.indication}
                onSave={(val) => updatePrescription('biology', index, 'indication', val)}
                placeholder="Indication médicale"
                multiline={true}
              />
            </div>
            <div>
              <strong>À jeun:</strong> {prescription.fasting}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
      <h4 className="font-semibold text-yellow-800 mb-2">Instructions:</h4>
      <ul className="text-sm text-yellow-700 space-y-1">
        <li>• Présenter cette ordonnance dans tout laboratoire agréé à Maurice</li>
        <li>• Apporter une pièce d'identité</li>
        <li>• Respecter le jeûne si indiqué</li>
        <li>• Ordonnance valable 6 mois</li>
      </ul>
    </div>
  </div>
);

// Composant Document Paraclinique  
const ParaclinicalDocument = ({ document, updateDocument, updatePrescription, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-green-600 pb-6 mb-8">
      <h1 className="text-2xl font-bold text-green-600 mb-2">{document.header.title}</h1>
      <h2 className="text-lg text-gray-600 mb-4">{document.header.subtitle}</h2>
      <div className="flex justify-between text-sm">
        <span>Date: {document.header.date}</span>
        <span>N° Ordonnance: {document.header.number}</span>
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Examens prescrits:</h3>
      
      {document.prescriptions.map((prescription, index) => (
        <div key={prescription.id} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Ligne {prescription.id}:</strong>
              <EditableField 
                value={prescription.exam}
                onSave={(val) => updatePrescription('paraclinical', index, 'exam', val)}
                placeholder="Nom de l'examen"
              />
            </div>
            <div className={prescription.urgency === 'Urgent' ? 'text-red-600 font-bold' : ''}>
              <strong>Urgence:</strong> 
              <EditableField 
                value={prescription.urgency}
                onSave={(val) => updatePrescription('paraclinical', index, 'urgency', val)}
                placeholder="Niveau d'urgence"
              />
            </div>
            <div className="col-span-2">
              <strong>Indication:</strong>
              <EditableField 
                value={prescription.indication}
                onSave={(val) => updatePrescription('paraclinical', index, 'indication', val)}
                placeholder="Indication médicale"
                multiline={true}
              />
            </div>
            <div>
              <strong>Préparation:</strong> {prescription.preparation}
            </div>
            <div>
              <strong>Durée:</strong> {prescription.duration}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
      <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
      <ul className="text-sm text-blue-700 space-y-1">
        <li>• Prendre rendez-vous dans centre agréé Maurice</li>
        <li>• Apporter ordonnance et pièce d'identité</li>
        <li>• Respecter la préparation si indiquée</li>
        <li>• Ordonnance valable 6 mois</li>
      </ul>
    </div>
  </div>
);

// Composant Document Médicaments
const MedicationDocument = ({ document, updateDocument, updatePrescription, EditableField }) => (
  <div className="bg-white p-8 shadow-lg rounded-lg">
    <div className="text-center border-b-4 border-purple-600 pb-6 mb-8">
      <h1 className="text-2xl font-bold text-purple-600 mb-2">{document.header.title}</h1>
      <h2 className="text-lg text-gray-600 mb-4">{document.header.subtitle}</h2>
      <div className="flex justify-between text-sm">
        <span>Date: {document.header.date}</span>
        <span>N° Ordonnance: {document.header.number}</span>
      </div>
    </div>

    {/* Allergies patient */}
    {document.patient.allergies && document.patient.allergies !== "Aucune" && (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <strong>⚠️ ALLERGIES PATIENT:</strong> {document.patient.allergies}
            </p>
          </div>
        </div>
      </div>
    )}

    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Médicaments prescrits:</h3>
      
      {document.prescriptions.map((prescription, index) => (
        <div key={prescription.id} className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="text-lg font-bold text-purple-800 mb-2">
                Ligne {prescription.id}: 
                <EditableField 
                  value={`${prescription.dci} (${prescription.brand})`}
                  onSave={(val) => {
                    const [dci, brand] = val.split('(');
                    updatePrescription('medication', index, 'dci', dci.trim());
                    updatePrescription('medication', index, 'brand', brand?.replace(')', '').trim() || '');
                  }}
                  placeholder="DCI (Marque)"
                />
              </div>
            </div>
            
            <div>
              <strong>Dosage:</strong>
              <EditableField 
                value={prescription.dosage}
                onSave={(val) => updatePrescription('medication', index, 'dosage', val)}
                placeholder="Dosage"
              />
            </div>
            
            <div>
              <strong>Fréquence:</strong>
              <EditableField 
                value={prescription.frequency}
                onSave={(val) => updatePrescription('medication', index, 'frequency', val)}
                placeholder="Fréquence"
              />
            </div>
            
            <div>
              <strong>Durée:</strong>
              <EditableField 
                value={prescription.duration}
                onSave={(val) => updatePrescription('medication', index, 'duration', val)}
                placeholder="Durée"
              />
            </div>
            
            <div className="col-span-2">
              <strong>Indication:</strong>
              <EditableField 
                value={prescription.indication}
                onSave={(val) => updatePrescription('medication', index, 'indication', val)}
                placeholder="Indication thérapeutique"
                multiline={true}
              />
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
      <h4 className="font-semibold text-blue-800 mb-2">Conseils au patient:</h4>
      <ul className="text-sm text-blue-700 space-y-1">
        <li>• Respecter scrupuleusement les doses prescrites</li>
        <li>• Ne pas arrêter le traitement sans avis médical</li>
        <li>• Signaler tout effet indésirable</li>
        <li>• Ordonnance valable 3 mois</li>
        <li>• En cas d'urgence: 15 (SAMU) ou 114 (Police/Ambulance Maurice)</li>
      </ul>
    </div>
  </div>
);

export default CompleteMauritianDocumentEditor;
