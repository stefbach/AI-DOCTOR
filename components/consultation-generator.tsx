import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { consultationDataService } from '@/lib/consultation-data-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Download, Edit3, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

// Hook personnalisé pour la gestion du cache
const useConsultationCache = (consultationId?: string | null) => {
  const [cache, setCache] = useState<{
    data: any;
    timestamp: number;
    version: string;
  } | null>(null);
  
  const CACHE_KEY = `consultation_cache_${consultationId || 'current'}`;
  const CACHE_VERSION = '1.0.0';
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Charger depuis le cache local
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        
        // Vérifier la validité du cache (version et TTL)
        if (parsed.version === CACHE_VERSION && 
            now - parsed.timestamp < CACHE_TTL) {
          console.log('✅ Cache valide trouvé');
          return parsed;
        } else {
          console.log('⚠️ Cache expiré ou version différente');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Erreur lecture cache:', error);
    }
    return null;
  }, [CACHE_KEY, CACHE_VERSION, CACHE_TTL]);

  // Sauvegarder dans le cache
  const saveToCache = useCallback((data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCache(cacheData);
      console.log('💾 Données sauvegardées dans le cache');
    } catch (error) {
      console.error('Erreur sauvegarde cache:', error);
    }
  }, [CACHE_KEY, CACHE_VERSION]);

  // Invalider le cache
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setCache(null);
    console.log('🗑️ Cache invalidé');
  }, [CACHE_KEY]);

  // Charger le cache au montage
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setCache(cached);
    }
  }, [loadFromCache]);

  return { cache, saveToCache, invalidateCache, loadFromCache };
};

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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Utiliser le hook de cache personnalisé
  const { cache, saveToCache, invalidateCache } = useConsultationCache(consultationId);

  // État consolidé pour toutes les données
  const [consolidatedData, setConsolidatedData] = useState<{
    patientData: any;
    clinicalData: any;
    questionsData: any;
    diagnosisData: any;
    consultationReport: any;
  }>({
    patientData: null,
    clinicalData: null,
    questionsData: null,
    diagnosisData: null,
    consultationReport: null
  });

  // Mémoriser les données complètes
  const completeData = useMemo(() => ({
    patientData: consolidatedData.patientData || patientData,
    clinicalData: consolidatedData.clinicalData || clinicalData,
    questionsData: consolidatedData.questionsData || questionsData,
    diagnosisData: consolidatedData.diagnosisData || diagnosisData
  }), [consolidatedData, patientData, clinicalData, questionsData, diagnosisData]);

  // Charger les données existantes avec stratégie de cache
  const loadExistingData = useCallback(async (forceRefresh = false) => {
    try {
      const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId();
      console.log("📌 Loading data for consultation:", currentConsultationId, { forceRefresh });
      
      // Si on a un cache valide et pas de forceRefresh, l'utiliser
      if (!forceRefresh && cache?.data) {
        console.log("📦 Using cached data");
        setConsolidatedData(cache.data);
        if (cache.data.consultationReport) {
          setConsultationReport(cache.data.consultationReport);
          setShowEditor(true);
        }
        return;
      }

      if (currentConsultationId) {
        setSyncStatus('syncing');
        
        // Charger depuis Supabase
        const loadedData = await consultationDataService.loadFromSupabase(currentConsultationId);
        console.log("🔄 Data loaded from Supabase:", loadedData);
        
        // Récupérer aussi depuis le cache local du service
        const savedData = await consultationDataService.getAllData();
        console.log("📦 All saved data from service:", savedData);
        
        // Fusionner les données (priorité à Supabase si plus récent)
        const mergedData = {
          patientData: loadedData?.patientData || savedData?.patientData || savedData?.step_0,
          clinicalData: loadedData?.clinicalData || savedData?.clinicalData || savedData?.step_1,
          questionsData: loadedData?.questionsData || savedData?.questionsData || savedData?.step_2,
          diagnosisData: loadedData?.diagnosisData || savedData?.diagnosisData || savedData?.step_3,
          consultationReport: loadedData?.consultationReport || savedData?.consultationReport
        };
        
        // Mettre à jour l'état et le cache
        setConsolidatedData(mergedData);
        saveToCache(mergedData);
        
        if (mergedData.consultationReport) {
          console.log("📋 Existing consultation report found");
          setConsultationReport(mergedData.consultationReport);
          setShowEditor(true);
        }
        
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      setError('Erreur lors du chargement des données');
      setSyncStatus('error');
      
      // En cas d'erreur, essayer d'utiliser le cache si disponible
      if (cache?.data) {
        console.log("⚠️ Using cache as fallback");
        setConsolidatedData(cache.data);
        if (cache.data.consultationReport) {
          setConsultationReport(cache.data.consultationReport);
          setShowEditor(true);
        }
      }
    }
  }, [consultationId, cache, saveToCache]);

  // Charger les données au montage et quand l'ID change
  useEffect(() => {
    loadExistingData();
  }, [consultationId]);

  // Synchronisation automatique périodique
  useEffect(() => {
    const interval = setInterval(() => {
      if (consolidatedData && Object.values(consolidatedData).some(v => v !== null)) {
        console.log('⏰ Auto-sync triggered');
        syncWithBackend();
      }
    }, 5 * 60 * 1000); // Toutes les 5 minutes

    return () => clearInterval(interval);
  }, [consolidatedData]);

  // Synchroniser avec le backend
  const syncWithBackend = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const currentId = consultationId || consultationDataService.getCurrentConsultationId();
      
      if (currentId && consolidatedData) {
        // Sauvegarder toutes les données
        if (consolidatedData.patientData) {
          await consultationDataService.saveStepData(0, consolidatedData.patientData);
        }
        if (consolidatedData.clinicalData) {
          await consultationDataService.saveStepData(1, consolidatedData.clinicalData);
        }
        if (consolidatedData.questionsData) {
          await consultationDataService.saveStepData(2, consolidatedData.questionsData);
        }
        if (consolidatedData.diagnosisData) {
          await consultationDataService.saveStepData(3, consolidatedData.diagnosisData);
        }
        if (consolidatedData.consultationReport) {
          await consultationDataService.saveConsultationReport(consolidatedData.consultationReport);
        }
        
        // Sauvegarder dans Supabase
        await consultationDataService.saveToSupabase(currentId);
        
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        console.log('✅ Synchronisation réussie');
      }
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      setSyncStatus('error');
    }
  }, [consultationId, consolidatedData]);

  const generateConsultationReport = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Starting consultation report generation...");
      console.log("📋 Using complete data:", {
        hasPatient: !!completeData.patientData,
        hasClinical: !!completeData.clinicalData,
        hasQuestions: !!completeData.questionsData,
        hasDiagnosis: !!completeData.diagnosisData
      });

      // Validation des données requises
      if (!completeData.patientData || !completeData.clinicalData || !completeData.diagnosisData) {
        throw new Error("Données insuffisantes pour générer le rapport");
      }

      // Générer le rapport
      const generatedReport = await consultationDataService.generateConsultationReport(
        completeData.patientData,
        completeData.clinicalData,
        completeData.questionsData,
        completeData.diagnosisData
      );

      console.log("✅ Report generated successfully");

      if (generatedReport) {
        setConsultationReport(generatedReport);
        
        // Mettre à jour les données consolidées
        const updatedData = {
          ...consolidatedData,
          consultationReport: generatedReport
        };
        setConsolidatedData(updatedData);
        
        // Sauvegarder dans le cache
        saveToCache(updatedData);
        
        // Sauvegarder via le service
        await consultationDataService.saveConsultationReport(generatedReport);
        
        // Synchroniser avec le backend
        await syncWithBackend();
        
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
      console.log("💾 Saving edited report");
      
      const updatedReport = {
        ...consultationReport,
        editedContent: editedData,
        lastModified: new Date().toISOString()
      };
      
      setConsultationReport(updatedReport);
      
      // Mettre à jour les données consolidées
      const updatedData = {
        ...consolidatedData,
        consultationReport: updatedReport
      };
      setConsolidatedData(updatedData);
      
      // Sauvegarder dans le cache
      saveToCache(updatedData);
      
      // Sauvegarder via le service
      await consultationDataService.saveConsultationReport(updatedReport);
      
      // Synchroniser avec le backend
      await syncWithBackend();
      
      console.log("✅ Report saved successfully");
      
      if (onComplete) {
        onComplete(updatedReport);
      }
      
    } catch (error) {
      console.error("❌ Error saving:", error);
      setError("Erreur lors de la sauvegarde");
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    invalidateCache();
    loadExistingData(true);
  };

  // Indicateur de statut de synchronisation
  const SyncStatusIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {syncStatus === 'syncing' && (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-blue-600">Synchronisation...</span>
        </>
      )}
      {syncStatus === 'synced' && lastSyncTime && (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-600">
            Synchronisé ({lastSyncTime.toLocaleTimeString('fr-FR')})
          </span>
        </>
      )}
      {syncStatus === 'error' && (
        <>
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-red-600">Erreur de synchronisation</span>
        </>
      )}
    </div>
  );

  // Le reste du composant reste identique avec l'ajout de l'indicateur de sync
  // et du bouton de rafraîchissement dans l'interface...

  // Interface de génération
  if (!consultationReport && !showEditor) {
    return (
      <div className="space-y-6">
        {/* En-tête avec indicateur de sync */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  <FileText className="h-8 w-8 text-blue-600" />
                  Génération Compte-Rendu de Consultation
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Générez un compte-rendu professionnel basé sur toutes les données collectées
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="text-blue-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rafraîchir
                </Button>
                <SyncStatusIndicator />
              </div>
            </div>
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
                    {completeData.patientData ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Données Patient</span>
                    <span className="text-sm text-gray-500">
                      {completeData.patientData?.firstName || 'Non renseigné'} {completeData.patientData?.lastName || ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {completeData.clinicalData ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Données Cliniques</span>
                    <span className="text-sm text-gray-500">
                      {completeData.clinicalData?.chiefComplaint || "Non renseigné"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {completeData.questionsData ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Questions IA</span>
                    <span className="text-sm text-gray-500">
                      {completeData.questionsData ? "Complétées" : "Optionnel"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {completeData.diagnosisData?.diagnosis ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="font-medium">Diagnostic IA</span>
                    <span className="text-sm text-gray-500">
                      {completeData.diagnosisData?.diagnosis?.primary?.condition || "Non renseigné"}
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

              {/* Informations de cache */}
              {cache && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <p>💾 Données en cache depuis : {new Date(cache.timestamp).toLocaleString('fr-FR')}</p>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-between">
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    Retour
                  </Button>
                )}
                
                <Button 
                  onClick={generateConsultationReport}
                  disabled={loading || !completeData.patientData || !completeData.clinicalData || !completeData.diagnosisData}
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

  // Interface d'affichage du rapport généré (reste identique)
  if (consultationReport) {
    const patientInfo = consultationReport.consultationData?.patientInfo || {};
    
    return (
      <div className="space-y-6">
        {/* En-tête du rapport généré avec indicateur de sync */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  Compte-Rendu de Consultation Généré
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Votre rapport a été généré avec succès
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <SyncStatusIndicator />
              </div>
            </div>
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
              
              <Button 
                onClick={syncWithBackend}
                variant="outline"
                disabled={syncStatus === 'syncing'}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Synchroniser
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
                    onClick={() => setShowEditor(false)}
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
