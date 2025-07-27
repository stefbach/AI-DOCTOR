import React, { useState, useEffect } from 'react';
import { consultationDataService } from '@/lib/consultation-data-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Download, Edit3, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConsultationGeneratorProps {
  patientData?: any;
  clinicalData?: any;
  questionsData?: any;
  diagnosisData?: any;
  consultationId?: string | null;
  onBack?: () => void;
  onComplete?: (result: any) => void;
}

const ConsultationGenerator: React.FC<ConsultationGeneratorProps> = ({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  consultationId,
  onBack,
  onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consultationReport, setConsultationReport] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Charger les données existantes au montage
  useEffect(() => {
    loadExistingData();
  }, [consultationId]);

  const loadExistingData = async () => {
    try {
      const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId();
      console.log("📌 Loading existing data for consultation:", currentConsultationId);
      
      if (currentConsultationId) {
        // Forcer le rechargement depuis Supabase
        const loadedData = await consultationDataService.loadFromSupabase(currentConsultationId);
        console.log("🔄 Data loaded from Supabase:", loadedData);
        
        // Sinon, récupérer depuis le cache local
        const savedData = await consultationDataService.getAllData();
        console.log("📦 All saved data:", savedData);
        
        // Vérifier s'il y a déjà un rapport de consultation généré
        if (savedData?.consultationReport || loadedData?.consultationReport) {
          console.log("📋 Existing consultation report found");
          setConsultationReport(savedData.consultationReport || loadedData.consultationReport);
          setShowEditor(true);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      setError('Erreur lors du chargement des données existantes');
    }
  };

  const generateConsultationReport = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Starting consultation report generation...");
      
      // Récupérer TOUTES les données disponibles
      const savedData = await consultationDataService.getAllData();
      console.log("📦 All available data:", savedData);
      
      // Prioriser les données sauvegardées sur les props
      let completeData = {
        patientData: patientData || savedData?.patientData || savedData?.step_0,
        clinicalData: clinicalData || savedData?.clinicalData || savedData?.step_1,
        questionsData: questionsData || savedData?.questionsData || savedData?.step_2,
        diagnosisData: diagnosisData || savedData?.diagnosisData || savedData?.step_3
      };

      console.log("📋 Complete data for generation:", {
        hasPatient: !!completeData.patientData,
        hasClinical: !!completeData.clinicalData,
        hasQuestions: !!completeData.questionsData,
        hasDiagnosis: !!completeData.diagnosisData,
        patientName: completeData.patientData?.firstName + ' ' + completeData.patientData?.lastName,
        patientAge: completeData.patientData?.age,
        chiefComplaint: completeData.clinicalData?.chiefComplaint,
        diagnosis: completeData.diagnosisData?.diagnosis?.primary?.condition
      });

      // Validation des données requises
      if (!completeData.patientData || !completeData.clinicalData || !completeData.diagnosisData) {
        throw new Error("Données insuffisantes pour générer le rapport (patient, clinique et diagnostic requis)");
      }

      // Utiliser la génération locale via consultationDataService
      console.log("🔧 Using local generation method...");
      const generatedReport = await consultationDataService.generateConsultationReport(
        completeData.patientData,
        completeData.clinicalData,
        completeData.questionsData,
        completeData.diagnosisData
      );

      console.log("✅ Report generated successfully:", generatedReport);

      if (generatedReport) {
        setConsultationReport(generatedReport);
        
        // Sauvegarder le rapport généré
        await consultationDataService.saveConsultationReport(generatedReport);
        console.log("💾 Report saved");
        
        // Appeler onComplete si fourni
        if (onComplete) {
          onComplete(generatedReport);
        }
        
        setShowEditor(true);
      } else {
        throw new Error("Échec de la génération du rapport");
      }

    } catch (err) {
      console.error("❌ Error generating report:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async (editedData: any) => {
    try {
      console.log("💾 Saving edited report:", editedData);
      
      // Mise à jour des données du rapport
      const updatedReport = {
        ...consultationReport,
        editedContent: editedData,
        lastModified: new Date().toISOString()
      };
      
      setConsultationReport(updatedReport);
      
      // Sauvegarder via le service
      await consultationDataService.saveConsultationReport(updatedReport);
      
      console.log("✅ Report saved successfully");
      
      if (onComplete) {
        onComplete(updatedReport);
      }
      
    } catch (error) {
      console.error("❌ Error saving:", error);
      setError("Erreur lors de la sauvegarde");
    }
  };

  const handleDiscardChanges = () => {
    setShowEditor(false);
  };

  const handleEditReport = () => {
    setShowEditor(true);
  };

  const handleDownloadReport = () => {
    if (consultationReport) {
      const reportContent = JSON.stringify(consultationReport, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultation-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Debug button pour tester avec des données
  const handleGenerateWithTestData = () => {
    const testData = {
      patientData: {
        firstName: "Test",
        lastName: "Patient",
        age: 30,
        gender: "Masculin",
        weight: 70,
        height: 175,
        address: "123 Rue Test, Port-Louis",
        phone: "+230 5555 5555"
      },
      clinicalData: {
        chiefComplaint: "Douleur thoracique",
        examination: "Examen cardiovasculaire normal"
      },
      diagnosisData: {
        diagnosis: {
          primary: {
            condition: "Angine de poitrine stable",
            confidence: 85
          }
        }
      }
    };
    
    // Sauvegarder les données de test
    consultationDataService.saveStepData(0, testData.patientData);
    consultationDataService.saveStepData(1, testData.clinicalData);
    consultationDataService.saveStepData(3, testData.diagnosisData);
    
    // Générer le rapport
    generateConsultationReport();
  };

  // Interface de génération
  if (!consultationReport && !showEditor) {
    return (
      <div className="space-y-6">
        {/* En-tête */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              <FileText className="h-8 w-8 text-blue-600" />
              Génération Compte-Rendu de Consultation
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Générez un compte-rendu professionnel basé sur toutes les données collectées
            </p>
          </CardHeader>
        </Card>

        {/* État du chargement */}
        {loading && (
          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-800">Génération en cours...</p>
                  <p className="text-sm text-blue-600">Création des documents mauriciens</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erreur */}
        {error && (
          <Card className="bg-red-50 border border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-800">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Erreur de génération</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setError(null)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Réessayer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateWithTestData}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Générer avec données test
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interface de génération */}
        {!loading && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                Données Disponibles pour le Rapport
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                
                {/* État des données */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {patientData ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Données Patient</span>
                    <span className="text-sm text-gray-500">
                      {patientData?.firstName || 'Non renseigné'} {patientData?.lastName || ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {clinicalData ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Données Cliniques</span>
                    <span className="text-sm text-gray-500">
                      {clinicalData?.chiefComplaint || "Non renseigné"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {questionsData ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Questions IA</span>
                    <span className="text-sm text-gray-500">
                      {questionsData ? "Complétées" : "Optionnel"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {diagnosisData?.diagnosis ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Diagnostic IA</span>
                    <span className="text-sm text-gray-500">
                      {diagnosisData?.diagnosis?.primary?.condition || "Non renseigné"}
                    </span>
                  </div>
                </div>

                {/* Aperçu du contenu */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Aperçu du rapport à générer :</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• En-tête professionnel avec données patient</li>
                    <li>• Anamnèse détaillée basée sur les symptômes</li>
                    <li>• Examen physique et constantes vitales</li>
                    <li>• Évaluation diagnostique avec raisonnement</li>
                    <li>• Plan d'examens complémentaires</li>
                    <li>• Plan thérapeutique adapté</li>
                    <li>• Documents mauriciens (prescriptions, etc.)</li>
                  </ul>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between">
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    Retour
                  </Button>
                )}
                
                <Button 
                  onClick={generateConsultationReport}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Générer le Rapport
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Interface d'affichage du rapport généré
  if (consultationReport) {
    const patientInfo = consultationReport.consultationData?.patientInfo || {};
    
    return (
      <div className="space-y-6">
        {/* En-tête du rapport généré */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              <CheckCircle className="h-8 w-8 text-green-600" />
              Compte-Rendu de Consultation Généré
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Votre rapport a été généré avec succès
            </p>
          </CardHeader>
        </Card>

        {/* Contenu du rapport */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              Aperçu du Rapport
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Informations patient */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Informations Patient</h3>
              <p><strong>Nom :</strong> {patientInfo.name || `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`}</p>
              <p><strong>Âge :</strong> {patientInfo.age || 'Non renseigné'} ans</p>
              <p><strong>Sexe :</strong> {patientInfo.gender || 'Non renseigné'}</p>
              <p><strong>Date :</strong> {patientInfo.date || new Date().toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Motif de consultation */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Motif de Consultation</h3>
              <p>{consultationReport.consultationData?.chiefComplaint || 'Non renseigné'}</p>
            </div>

            {/* Examen */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Examen Clinique</h3>
              <p>{consultationReport.consultationData?.examination || 'Non renseigné'}</p>
            </div>

            {/* Diagnostic */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">Diagnostic</h3>
              <p>{consultationReport.consultationData?.diagnosis || 'Non renseigné'}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleDownloadReport}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              
              <Button 
                onClick={handleEditReport}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Éditer
              </Button>
              
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Retour
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mode édition simple */}
        {showEditor && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Edit3 className="h-6 w-6" />
                Édition du Rapport (Mode Simple)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Motif de Consultation</label>
                  <textarea 
                    className="w-full p-3 border rounded-lg" 
                    rows={3}
                    defaultValue={consultationReport.consultationData?.chiefComplaint}
                    onChange={(e) => {
                      setConsultationReport(prev => ({
                        ...prev,
                        consultationData: {
                          ...prev.consultationData,
                          chiefComplaint: e.target.value
                        }
                      }));
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Examen Clinique</label>
                  <textarea 
                    className="w-full p-3 border rounded-lg" 
                    rows={4}
                    defaultValue={consultationReport.consultationData?.examination}
                    onChange={(e) => {
                      setConsultationReport(prev => ({
                        ...prev,
                        consultationData: {
                          ...prev.consultationData,
                          examination: e.target.value
                        }
                      }));
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Diagnostic</label>
                  <textarea 
                    className="w-full p-3 border rounded-lg" 
                    rows={3}
                    defaultValue={consultationReport.consultationData?.diagnosis}
                    onChange={(e) => {
                      setConsultationReport(prev => ({
                        ...prev,
                        consultationData: {
                          ...prev.consultationData,
                          diagnosis: e.target.value
                        }
                      }));
                    }}
                  />
                </div>
                
                <div className="flex gap-4 justify-center pt-4">
                  <Button 
                    onClick={() => {
                      handleSaveReport(consultationReport);
                      setShowEditor(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  
                  <Button 
                    onClick={handleDiscardChanges}
                    variant="outline"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">État inattendu</h3>
          <p className="text-gray-600">Veuillez rafraîchir la page ou revenir à l'étape précédente.</p>
          {onBack && (
            <Button className="mt-4" onClick={onBack}>
              Retour
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultationGenerator;
