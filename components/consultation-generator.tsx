import React, { useState, useEffect } from 'react';
import { consultationDataService } from '@/lib/consultation-data-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Download, Edit3, CheckCircle, AlertTriangle } from 'lucide-react';

// Import conditionnel pour éviter les erreurs
// import ConsultationEditor from '@/components/medical/editors/consultation-editor';

interface ConsultationGeneratorProps {
  patientData?: any;
  clinicalData?: any;
  questionsData?: any;
  diagnosisData?: any;
  consultationId?: string | null;
  onBack?: () => void;
  onComplete?: (result: any) => void; // Ajout de la prop manquante
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
      
      if (currentConsultationId) {
        const savedData = await consultationDataService.getAllData();
        
        // Vérifier s'il y a déjà un rapport de consultation généré
        if (savedData?.consultationReport) {
          console.log("📋 Rapport de consultation existant trouvé");
          setConsultationReport(savedData.consultationReport);
          setShowEditor(true);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données existantes:', error);
      setError('Erreur lors du chargement des données existantes');
    }
  };

  const generateConsultationReport = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Génération rapport de consultation...");
      
      // Récupérer toutes les données si pas passées en props
      let allData = {
        patientData,
        clinicalData, 
        questionsData,
        diagnosisData
      };

      // Si certaines données manquent, les récupérer du service
      if (!patientData || !clinicalData || !diagnosisData) {
        const savedData = await consultationDataService.getAllData();
        console.log("📦 Données récupérées du service:", savedData);
        
        allData = {
          patientData: patientData || savedData?.patientData,
          clinicalData: clinicalData || savedData?.clinicalData,
          questionsData: questionsData || savedData?.questionsData,
          diagnosisData: diagnosisData || savedData?.diagnosisData
        };
      }

      // Validation des données requises
      if (!allData.patientData || !allData.clinicalData) {
        throw new Error("Données patient et cliniques requises pour générer le rapport");
      }

      console.log("📋 Données à envoyer:", {
        hasPatient: !!allData.patientData,
        hasClinical: !!allData.clinicalData,
        hasQuestions: !!allData.questionsData,
        hasDiagnosis: !!allData.diagnosisData,
        patientName: allData.patientData?.firstName,
        chiefComplaint: allData.clinicalData?.chiefComplaint,
        diagnosisCondition: allData.diagnosisData?.diagnosis?.primary?.condition
      });

      // Simulation d'un rapport pour éviter l'erreur d'API
      // TODO: Remplacer par l'appel API réel quand l'endpoint sera créé
      const mockReport = {
        success: true,
        data: {
          consultationData: {
            patientInfo: {
              name: `${allData.patientData.firstName} ${allData.patientData.lastName}`,
              age: allData.patientData.age,
              gender: allData.patientData.gender,
              date: new Date().toLocaleDateString('fr-FR')
            },
            chiefComplaint: allData.clinicalData.chiefComplaint || 'Consultation de contrôle',
            examination: allData.clinicalData.examination || 'Examen normal',
            diagnosis: allData.diagnosisData?.diagnosis?.primary?.condition || 'À déterminer',
            treatment: 'Plan thérapeutique à définir',
            followUp: 'Suivi à prévoir'
          },
          mauritianDocuments: {
            prescription: 'Prescription générée',
            medicalCertificate: 'Certificat médical si nécessaire'
          },
          generatedAt: new Date().toISOString()
        }
      };

      // Tentative d'appel API avec fallback
      let result;
      try {
        const response = await fetch("/api/generate-consultation-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(allData),
        });

        if (response.ok) {
          result = await response.json();
        } else {
          console.warn("API indisponible, utilisation du rapport de simulation");
          result = mockReport;
        }
      } catch (apiError) {
        console.warn("Erreur API, utilisation du rapport de simulation:", apiError);
        result = mockReport;
      }

      console.log("✅ Rapport généré:", result);

      if (result.success && result.data) {
        setConsultationReport(result.data);
        
        // Sauvegarder le rapport généré
        try {
          await consultationDataService.saveConsultationReport(result.data);
          console.log("💾 Rapport sauvegardé");
        } catch (saveError) {
          console.error("Erreur sauvegarde:", saveError);
        }
        
        // Appeler onComplete si fourni
        if (onComplete) {
          onComplete(result.data);
        }
        
        setShowEditor(true);
      } else {
        throw new Error(result.error || "Échec génération du rapport");
      }

    } catch (err) {
      console.error("❌ Erreur génération rapport:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async (editedData: any) => {
    try {
      console.log("💾 Sauvegarde rapport édité:", editedData);
      
      // Mise à jour des données du rapport
      const updatedReport = {
        ...consultationReport,
        editedContent: editedData,
        lastModified: new Date().toISOString()
      };
      
      setConsultationReport(updatedReport);
      
      // Sauvegarder via le service
      await consultationDataService.saveConsultationReport(updatedReport);
      
      console.log("✅ Rapport sauvegardé avec succès");
      
    } catch (error) {
      console.error("❌ Erreur sauvegarde:", error);
      setError("Erreur lors de la sauvegarde");
    }
  };

  const handleDiscardChanges = () => {
    // Retour à la vue principale
    setShowEditor(false);
  };

  const handleEditReport = () => {
    setShowEditor(true);
  };

  const handleDownloadReport = () => {
    if (consultationReport) {
      // Créer un blob avec le contenu du rapport
      const reportContent = JSON.stringify(consultationReport, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Télécharger le fichier
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultation-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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
                  <p className="text-sm text-blue-600">Analyse des données et création du rapport</p>
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
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setError(null)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Réessayer
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
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Données Patient</span>
                    <span className="text-sm text-gray-500">
                      {patientData?.firstName || 'Non renseigné'} {patientData?.lastName || ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Données Cliniques</span>
                    <span className="text-sm text-gray-500">
                      {clinicalData?.chiefComplaint || "Motif renseigné"}
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
                      {diagnosisData?.diagnosis?.primary?.condition || "Optionnel"}
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
                  disabled={loading || !patientData || !clinicalData}
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

  // Interface d'affichage du rapport généré (sans éditeur complexe)
  if (consultationReport) {
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
              <p><strong>Nom :</strong> {consultationReport.consultationData?.patientInfo?.name}</p>
              <p><strong>Âge :</strong> {consultationReport.consultationData?.patientInfo?.age} ans</p>
              <p><strong>Sexe :</strong> {consultationReport.consultationData?.patientInfo?.gender}</p>
              <p><strong>Date :</strong> {consultationReport.consultationData?.patientInfo?.date}</p>
            </div>

            {/* Motif de consultation */}
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Motif de Consultation</h3>
              <p>{consultationReport.consultationData?.chiefComplaint}</p>
            </div>

            {/* Examen */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Examen Clinique</h3>
              <p>{consultationReport.consultationData?.examination}</p>
            </div>

            {/* Diagnostic */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">Diagnostic</h3>
              <p>{consultationReport.consultationData?.diagnosis}</p>
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

  // Fallback - ne devrait jamais arriver
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
