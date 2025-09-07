import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Wand2,
  FileText,
  Pill,
  TestTube,
  Scan,
  Edit3,
  RefreshCw,
  Stethoscope,
  Save,
  AlertTriangle,
  Bug
} from 'lucide-react';

// ==================== TYPES ====================
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestion?: {
    section: string;
    originalText: string;
    suggestedText: string;
    applied: boolean;
    reasoning?: string;
    appliedAt?: string;
  };
}

interface MedicalAIAssistantProps {
  reportData: any;
  onUpdateSection: (section: string, content: string) => void;
  currentSection?: string;
}

// ==================== COMPOSANTS UTILITAIRES ====================

// Composant pour afficher les suggestions avec debugging amélioré
const SuggestionCard = ({ 
  suggestion, 
  messageId, 
  onApply 
}: {
  suggestion: any;
  messageId: string;
  onApply: (messageId: string) => void;
}) => {
  const [isApplying, setIsApplying] = useState(false);
  
  const handleApply = async () => {
    console.log('🤖 SuggestionCard: Starting apply process for message:', messageId);
    setIsApplying(true);
    
    try {
      await onApply(messageId);
      console.log('🤖 SuggestionCard: Apply completed successfully');
    } catch (error) {
      console.error('🤖 SuggestionCard: Apply failed:', error);
      toast({
        title: "❌ Erreur d'application",
        description: "Impossible d'appliquer la suggestion",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };
  
  return (
    <div className="mt-3 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-300">
          🏥 Suggestion IA Maurice: {suggestion.section}
        </Badge>
        {suggestion.applied && (
          <Badge className="bg-green-100 text-green-800 text-xs border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Appliquée {suggestion.appliedAt ? `à ${new Date(suggestion.appliedAt).toLocaleTimeString()}` : ''}
          </Badge>
        )}
      </div>
      
      {/* Informations de debug */}
      <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-50 p-1 rounded">
        Debug: Section="{suggestion.section}" | Texte={suggestion.suggestedText?.length || 0} chars | 
        Type={typeof suggestion.suggestedText}
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">📄 Texte original :</p>
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto border">
            {suggestion.originalText || '(Aucun texte original)'}
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">✨ Amélioration suggérée :</p>
          <div className="text-xs text-gray-800 bg-blue-50 p-2 rounded max-h-32 overflow-y-auto border border-blue-200">
            {suggestion.suggestedText || '(Aucune suggestion)'}
          </div>
        </div>
        
        {suggestion.reasoning && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">💡 Justification médicale :</p>
            <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
              {suggestion.reasoning}
            </div>
          </div>
        )}
      </div>
      
      {!suggestion.applied && suggestion.suggestedText && typeof suggestion.suggestedText === 'string' && suggestion.suggestedText.trim().length > 0 ? (
        <Button
          size="sm"
          onClick={handleApply}
          disabled={isApplying}
          className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Application en cours...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Appliquer cette amélioration MCM
            </>
          )}
        </Button>
      ) : suggestion.applied ? (
        <div className="w-full mt-3 p-2 bg-green-50 text-green-700 text-center text-sm rounded border border-green-200">
          ✅ Suggestion déjà appliquée
        </div>
      ) : (
        <div className="w-full mt-3 p-2 bg-red-50 text-red-700 text-center text-sm rounded border border-red-200">
          ❌ Suggestion invalide (texte manquant ou vide)
        </div>
      )}
    </div>
  );
};

// Panel de debug pour tester les fonctions
const DebugPanel = ({ 
  reportData, 
  onUpdateSection,
  currentSection 
}: {
  reportData: any;
  onUpdateSection: (section: string, content: string) => void;
  currentSection?: string;
}) => {
  const testUpdateSection = (section: string) => {
    const testContent = `TEST DEBUG: Section mise à jour automatiquement à ${new Date().toLocaleTimeString()}

Ceci est un test pour vérifier que la fonction onUpdateSection fonctionne correctement.

Contenu généré par le panel de debug de l'Assistant IA Médical Maurice.

Standards appliqués : Medical Council of Mauritius
Nomenclature : UK/Anglo-Saxonne
Test réussi : ${new Date().toISOString()}`;
    
    console.log('🔧 Debug Panel: Testing section update:', section);
    console.log('🔧 Debug Panel: Test content length:', testContent.length);
    
    try {
      onUpdateSection(section, testContent);
      toast({
        title: "🔧 Test Debug Réussi",
        description: `Section "${section}" mise à jour par le debug`,
        duration: 2000
      });
    } catch (error) {
      console.error('🔧 Debug Panel: Error during test:', error);
      toast({
        title: "🔧 Test Debug Échoué",
        description: `Erreur lors du test: ${error}`,
        variant: "destructive"
      });
    }
  };
  
  const availableSections = [
    'motifConsultation', 'anamnese', 'antecedents', 'examenClinique',
    'syntheseDiagnostique', 'conclusionDiagnostique', 'priseEnCharge',
    'surveillance', 'conclusion'
  ];
  
  return (
    <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Bug className="h-4 w-4 text-yellow-600" />
        <h4 className="font-bold text-yellow-800">🔧 Debug Assistant IA</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => testUpdateSection('motifConsultation')}
          className="text-xs"
        >
          Test Motif
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => testUpdateSection('conclusionDiagnostique')}
          className="text-xs"
        >
          Test Diagnostic
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => testUpdateSection('priseEnCharge')}
          className="text-xs"
        >
          Test Traitement
        </Button>
      </div>
      
      <div className="text-xs text-gray-600 bg-white p-2 rounded border font-mono">
        <p>🔍 Report exists: <strong>{!!reportData ? 'OUI' : 'NON'}</strong></p>
        <p>📊 Sections disponibles: <strong>{Object.keys(reportData?.compteRendu?.rapport || {}).length}</strong></p>
        <p>🎯 Section courante: <strong>{currentSection || 'Non définie'}</strong></p>
        <p>👨‍⚕️ Patient: <strong>{reportData?.compteRendu?.patient?.nom || 'N/A'}</strong></p>
        <p>🔧 onUpdateSection: <strong>{typeof onUpdateSection}</strong></p>
      </div>
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================
export default function MedicalAIAssistant({ 
  reportData, 
  onUpdateSection, 
  currentSection 
}: MedicalAIAssistantProps) {
  // ==================== ÉTATS ====================
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState(currentSection || 'motifConsultation');
  const [showDebugPanel, setShowDebugPanel] = useState(process.env.NODE_ENV === 'development');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==================== FONCTIONS UTILITAIRES ====================
  
  // Fonction helper pour afficher le texte en toute sécurité
  const getSafeText = (text: any, maxLength: number = 100): string => {
    if (typeof text !== 'string' || !text) {
      return 'Texte non disponible';
    }
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  };

  // Mapping élargi des sections
  const getSectionMapping = (): { [key: string]: string } => ({
    // Sections principales du rapport
    'motifConsultation': 'motifConsultation',
    'anamnese': 'anamnese', 
    'antecedents': 'antecedents',
    'examenClinique': 'examenClinique',
    'syntheseDiagnostique': 'syntheseDiagnostique',
    'conclusionDiagnostique': 'conclusionDiagnostique',
    'priseEnCharge': 'priseEnCharge',
    'surveillance': 'surveillance',
    'conclusion': 'conclusion',
    
    // Aliases en anglais que l'IA pourrait utiliser
    'chiefComplaint': 'motifConsultation',
    'chief_complaint': 'motifConsultation',
    'historyOfPresentIllness': 'anamnese',
    'history_of_present_illness': 'anamnese',
    'pastMedicalHistory': 'antecedents',
    'past_medical_history': 'antecedents',
    'physicalExamination': 'examenClinique',
    'physical_examination': 'examenClinique',
    'diagnosticSynthesis': 'syntheseDiagnostique',
    'diagnostic_synthesis': 'syntheseDiagnostique',
    'diagnosticConclusion': 'conclusionDiagnostique',
    'diagnostic_conclusion': 'conclusionDiagnostique',
    'managementPlan': 'priseEnCharge',
    'management_plan': 'priseEnCharge',
    'followUpPlan': 'surveillance',
    'follow_up_plan': 'surveillance',
    'finalRemarks': 'conclusion',
    'final_remarks': 'conclusion',
    
    // Sections courtes
    'motif': 'motifConsultation',
    'histoire': 'anamnese',
    'examen': 'examenClinique',
    'diagnostic': 'conclusionDiagnostique',
    'traitement': 'priseEnCharge',
    'suivi': 'surveillance'
  });

  // Récupérer le texte original d'une section
  const getOriginalText = (section: string): string => {
    const sectionMapping = getSectionMapping();
    const targetSection = sectionMapping[section] || section;
    
    if (reportData?.compteRendu?.rapport?.[targetSection]) {
      const text = reportData.compteRendu.rapport[targetSection];
      return typeof text === 'string' ? text : '';
    }
    return '';
  };

  // ==================== FONCTIONS PRINCIPALES ====================

  // Auto-scroll vers le bas lors de nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Message d'accueil initial
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `🏥 **Assistant IA Médical - Système Maurice Anglo-Saxon** 

Je suis votre assistant IA spécialisé dans l'amélioration des rapports médicaux selon les standards du **Medical Council of Mauritius** et la nomenclature **UK/Anglo-Saxonne**.

**🎯 Je peux vous aider à :**
- **Corriger et améliorer** les sections du rapport médical
- **Standardiser** la terminologie médicale UK/Maurice
- **Optimiser** les prescriptions avec DCI précis
- **Enrichir** le contenu clinique selon standards MCM
- **Vérifier** la conformité aux guidelines mauritiennes

**📋 Exemples de commandes :**
- *"Améliore la section motif de consultation avec terminologie UK"*
- *"Corrige l'examen clinique selon standards MCM"*
- *"Enrichis le diagnostic avec critères diagnostiques précis"*
- *"Révise le plan de traitement selon protocoles mauritiens"*
- *"Optimise toute la prise en charge selon nomenclature britannique"*

**Quelle section souhaitez-vous améliorer ?** 🩺`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Fonction d'application des suggestions - VERSION AMÉLIORÉE
  const applySuggestion = (messageId: string) => {
    console.log('🤖 applySuggestion: Starting process for message:', messageId);
    
    const message = messages.find(m => m.id === messageId);
    
    if (!message) {
      console.error('🤖 applySuggestion: Message not found:', messageId);
      toast({
        title: "❌ Erreur",
        description: "Message de suggestion introuvable",
        variant: "destructive"
      });
      return;
    }
    
    if (!message.suggestion) {
      console.error('🤖 applySuggestion: No suggestion in message:', message);
      toast({
        title: "❌ Erreur", 
        description: "Aucune suggestion trouvée dans ce message",
        variant: "destructive"
      });
      return;
    }
    
    const { section, suggestedText } = message.suggestion;
    
    console.log('🤖 applySuggestion: Suggestion details:', {
      section,
      suggestedTextType: typeof suggestedText,
      suggestedTextLength: suggestedText?.length,
      suggestedTextPreview: typeof suggestedText === 'string' ? suggestedText.substring(0, 50) + '...' : suggestedText
    });
    
    // Validation stricte
    if (!section || !suggestedText || typeof suggestedText !== 'string') {
      console.error('🤖 applySuggestion: Invalid suggestion data:', { 
        section: section, 
        suggestedTextType: typeof suggestedText,
        suggestedText: suggestedText 
      });
      toast({
        title: "❌ Suggestion invalide",
        description: `Données invalides: section="${section}", texte=${typeof suggestedText}`,
        variant: "destructive"
      });
      return;
    }
    
    if (suggestedText.trim().length === 0) {
      console.error('🤖 applySuggestion: Empty suggestion text');
      toast({
        title: "❌ Texte vide",
        description: "Le texte de la suggestion est vide",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log('🤖 applySuggestion: Calling onUpdateSection with:', {
        section,
        contentLength: suggestedText.length,
        onUpdateSectionType: typeof onUpdateSection
      });
      
      // Appel de la fonction de mise à jour
      onUpdateSection(section, suggestedText);
      
      // Marquer comme appliqué SEULEMENT après succès
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              suggestion: { 
                ...m.suggestion!, 
                applied: true,
                appliedAt: new Date().toISOString()
              } 
            }
          : m
      ));
      
      console.log('🤖 applySuggestion: Success - suggestion applied');
      
      toast({
        title: "✅ Suggestion appliquée avec succès",
        description: `Section "${section}" mise à jour selon standards MCM`,
        duration: 4000
      });
      
    } catch (error) {
      console.error('🤖 applySuggestion: Error applying suggestion:', error);
      
      toast({
        title: "❌ Erreur d'application",
        description: `Impossible d'appliquer: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive"
      });
    }
  };

  // Fonction d'envoi de message - VERSION AMÉLIORÉE
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('🤖 handleSendMessage: Starting AI request');
      console.log('🤖 User message:', inputMessage);
      console.log('🤖 Current selected section:', selectedSection);
      console.log('🤖 Report data exists:', !!reportData);
      
      // Préparer le contexte médical complet
      const medicalContext = {
        currentReport: reportData,
        selectedSection: selectedSection,
        patientInfo: {
          age: reportData?.compteRendu?.patient?.age || 'N/A',
          sex: reportData?.compteRendu?.patient?.sexe || 'N/A',
          diagnosis: reportData?.compteRendu?.rapport?.conclusionDiagnostique || 'En cours'
        },
        currentMedications: reportData?.ordonnances?.medicaments?.prescription?.medicaments || [],
        currentLabTests: reportData?.ordonnances?.biologie?.prescription?.analyses || {},
        currentImaging: reportData?.ordonnances?.imagerie?.prescription?.examens || []
      };

      console.log('🤖 Medical context prepared:', {
        hasReport: !!medicalContext.currentReport,
        selectedSection: medicalContext.selectedSection,
        patientAge: medicalContext.patientInfo.age,
        medicationsCount: medicalContext.currentMedications.length,
        contextSize: JSON.stringify(medicalContext).length
      });

      // Appel à l'API OpenAI GPT-4 avec prompt spécialisé mauricien
      const response = await fetch('/api/medical-ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRequest: inputMessage,
          medicalContext: medicalContext,
          requestType: 'medical_improvement',
          mauritiusStandards: true
        })
      });

      console.log('🤖 API Response status:', response.status);
      console.log('🤖 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🤖 API Error response:', errorText);
        throw new Error(`Erreur API ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🤖 API Response data received:', {
        success: data.success,
        hasResponse: !!data.response,
        hasSuggestion: !!data.suggestion,
        responseLength: data.response?.length,
        suggestionSection: data.suggestion?.section,
        suggestionTextLength: data.suggestion?.text?.length
      });

      if (!data.success) {
        throw new Error(data.error || 'Erreur de traitement de l\'IA');
      }

      // Créer le message de l'assistant
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.explanation || "Réponse générée par l'IA médicale Maurice",
        timestamp: new Date()
      };

      // Traitement des suggestions avec validation renforcée
      if (data.suggestion && data.suggestion.text && data.suggestion.section) {
        console.log('🤖 Processing suggestion from API:', {
          section: data.suggestion.section,
          textLength: data.suggestion.text.length,
          textType: typeof data.suggestion.text,
          hasReasoning: !!data.suggestion.reasoning,
          textPreview: data.suggestion.text.substring(0, 100) + '...'
        });
        
        // Validation de la section
        const sectionMapping = getSectionMapping();
        const mappedSection = sectionMapping[data.suggestion.section] || data.suggestion.section;
        
        console.log('🤖 Section mapping:', {
          original: data.suggestion.section,
          mapped: mappedSection,
          isValid: ['motifConsultation', 'anamnese', 'antecedents', 'examenClinique', 'syntheseDiagnostique', 'conclusionDiagnostique', 'priseEnCharge', 'surveillance', 'conclusion'].includes(mappedSection)
        });
        
        assistantMessage.suggestion = {
          section: mappedSection,
          originalText: getOriginalText(mappedSection),
          suggestedText: data.suggestion.text,
          applied: false,
          reasoning: data.suggestion.reasoning || "Amélioration suggérée par l'IA selon standards MCM"
        };
        
        console.log('🤖 Suggestion object created:', {
          section: assistantMessage.suggestion.section,
          originalTextLength: assistantMessage.suggestion.originalText.length,
          suggestedTextLength: assistantMessage.suggestion.suggestedText.length,
          hasReasoning: !!assistantMessage.suggestion.reasoning
        });
      } else {
        console.log('🤖 No valid suggestion in API response:', {
          hasSuggestion: !!data.suggestion,
          hasText: !!data.suggestion?.text,
          hasSection: !!data.suggestion?.section
        });
      }

      setMessages(prev => [...prev, assistantMessage]);
      console.log('🤖 Message added to conversation');

    } catch (error) {
      console.error('🤖 Error in handleSendMessage:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Erreur technique de l'Assistant IA**

**Erreur détaillée:** ${error instanceof Error ? error.message : 'Erreur inconnue'}

**Suggestions de dépannage :**
• Vérifiez que l'API OpenAI est configurée dans les variables d'environnement
• Réessayez avec une demande plus simple
• Vérifiez votre connexion internet
• Contactez le support technique si le problème persiste

**Informations de debug :**
- Timestamp: ${new Date().toISOString()}
- User Agent: ${navigator.userAgent}
- Error Type: ${error instanceof Error ? error.constructor.name : typeof error}

*L'Assistant IA Maurice reste disponible pour de nouvelles tentatives.*`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Actions rapides adaptées au système mauricien
  const quickActions = [
    {
      icon: <Stethoscope className="h-4 w-4" />,
      label: "Standards MCM",
      action: () => setInputMessage("Révise tout le rapport selon les standards du Medical Council of Mauritius avec terminologie anglo-saxonne")
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Améliorer diagnostic",
      action: () => setInputMessage("Enrichis le diagnostic avec terminologie médicale UK et critères diagnostiques précis")
    },
    {
      icon: <Pill className="h-4 w-4" />,
      label: "Optimiser prescriptions",
      action: () => setInputMessage("Optimise toutes les prescriptions avec DCI précis, posologie UK (OD/BD/TDS/QDS) et indications détaillées")
    },
    {
      icon: <TestTube className="h-4 w-4" />,
      label: "Tests laboratoire UK",
      action: () => setInputMessage("Corrige les tests de laboratoire avec nomenclature britannique (FBC, U&E, LFTs, TFTs)")
    },
    {
      icon: <Edit3 className="h-4 w-4" />,
      label: "Examen clinique",
      action: () => setInputMessage("Améliore l'examen clinique avec sémiologie détaillée et terminologie médicale précise")
    },
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: "Révision complète",
      action: () => setInputMessage("Fais une révision complète avec standards Maurice Anglo-Saxon, DCI précis et conformité MCM")
    }
  ];

  // ==================== RENDU CONDITIONNEL ====================
  
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
        >
          <Wand2 className="h-5 w-5 mr-2" />
          Assistant IA Maurice
        </Button>
      </div>
    );
  }

  // ==================== RENDU PRINCIPAL ====================
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[700px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <span className="font-semibold">Assistant IA Maurice</span>
            <p className="text-xs opacity-90">Standards MCM • Nomenclature UK • DCI Précis</p>
          </div>
        </div>
        <div className="flex gap-1">
          {/* Bouton Debug */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-white hover:bg-white/20 p-1"
              title="Toggle Debug Panel"
            >
              <Bug className="h-4 w-4" />
            </Button>
          )}
          
          {/* Bouton Fermer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panel de Debug (développement uniquement) */}
      {showDebugPanel && (
        <div className="border-b border-gray-200">
          <DebugPanel 
            reportData={reportData} 
            onUpdateSection={onUpdateSection}
            currentSection={selectedSection}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-600 mb-2">🏥 Actions rapides Maurice :</p>
        <div className="grid grid-cols-2 gap-1">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={action.action}
              className="text-xs h-8 justify-start hover:bg-blue-50"
            >
              {action.icon}
              <span className="ml-1 truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  {message.role === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Suggestion Card Améliorée */}
                    {message.suggestion && (
                      <SuggestionCard
                        suggestion={message.suggestion}
                        messageId={message.id}
                        onApply={applySuggestion}
                      />
                    )}
                    
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">L'IA analyse selon standards Maurice MCM...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Demandez une amélioration médicale selon standards MCM..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-1">
          🏥 Standards MCM • Nomenclature UK • DCI Précis • IA GPT-4
        </p>
      </div>
    </div>
  );
}
