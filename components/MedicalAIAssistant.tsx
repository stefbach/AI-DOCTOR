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
 Bug,
 Plus,
 Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
 type?: 'text' | 'medication' | 'labTest' | 'imaging';
 data?: any; // Pour les données structurées (médicaments, tests, etc.)
 };
}

interface MedicalAIAssistantProps {
 reportData: any;
 onUpdateSection: (section: string, content: string) => void;
 onUpdateMedication?: (index: number, medication: any) => void;
 onAddMedication?: (medication: any) => void;
 onUpdateLabTest?: (category: string, index: number, test: any) => void;
 onAddLabTest?: (category: string, test: any) => void;
 onUpdateImaging?: (index: number, exam: any) => void;
 onAddImaging?: (exam: any) => void;
 currentSection?: string;
}

// ==================== COMPOSANTS UTILITAIRES ====================

// Composant pour afficher les suggestions avec support multi-type
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

 const getSuggestionIcon = () => {
 switch (suggestion.type) {
 case 'medication': return <Pill className="h-4 w-4" />;
 case 'labTest': return <TestTube className="h-4 w-4" />;
 case 'imaging': return <Scan className="h-4 w-4" />;
 default: return <FileText className="h-4 w-4" />;
 }
 };

 const getSuggestionTitle = () => {
 switch (suggestion.type) {
 case 'medication': return 'Médicament';
 case 'labTest': return 'Analyse biologique';
 case 'imaging': return 'Imagerie';
 default: return 'Section du rapport';
 }
 };
 
 return (
 <div className="mt-3 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
 <div className="flex items-center justify-between mb-3">
 <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-300">
 {getSuggestionIcon()}
 <span className="ml-1">{getSuggestionTitle()}: {suggestion.section}</span>
 </Badge>
 {suggestion.applied && (
 <Badge className="bg-teal-100 text-teal-800 text-xs border-teal-300">
 <CheckCircle className="h-3 w-3 mr-1" />
 Appliquée {suggestion.appliedAt ? `à ${new Date(suggestion.appliedAt).toLocaleTimeString()}` : ''}
 </Badge>
 )}
 </div>
 
 <div className="space-y-3">
 {suggestion.type === 'text' ? (
 <>
 <div>
 <p className="text-xs font-medium text-gray-600 mb-1">Texte original :</p>
 <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto border">
 {suggestion.originalText || '(Aucun texte original)'}
 </div>
 </div>
 
 <div>
 <p className="text-xs font-medium text-gray-600 mb-1">Amélioration suggérée :</p>
 <div className="text-xs text-gray-800 bg-blue-50 p-2 rounded max-h-32 overflow-y-auto border border-blue-200">
 {suggestion.suggestedText || '(Aucune suggestion)'}
 </div>
 </div>
 </>
 ) : (
 <div>
 <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
 <Wand2 className="h-3 w-3" /> Données suggérées :
 </p>
 <div className="text-xs text-gray-800 bg-blue-50 p-2 rounded max-h-32 overflow-y-auto border border-blue-200">
 <pre className="whitespace-pre-wrap font-mono text-xs">
 {JSON.stringify(suggestion.data, null, 2)}
 </pre>
 </div>
 </div>
 )}
 
 {suggestion.reasoning && (
 <div>
 <p className="text-xs font-medium text-gray-600 mb-1">Justification médicale :</p>
 <div className="text-xs text-gray-600 bg-cyan-50 p-2 rounded border border-cyan-200">
 {suggestion.reasoning}
 </div>
 </div>
 )}
 </div>
 
 {!suggestion.applied && suggestion.suggestedText ? (
 <Button
 size="sm"
 onClick={handleApply}
 disabled={isApplying}
 className="w-full mt-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
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
 <div className="w-full mt-3 p-2 bg-teal-50 text-teal-700 text-center text-sm rounded border border-teal-200 flex items-center justify-center gap-2">
 <CheckCircle className="h-4 w-4" />
 Suggestion déjà appliquée
 </div>
 ) : (
 <div className="w-full mt-3 p-2 bg-blue-50 text-blue-700 text-center text-sm rounded border border-blue-200 flex items-center justify-center gap-2">
 <AlertCircle className="h-4 w-4" />
 Suggestion invalide (données manquantes)
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
 
 console.log('Debug Panel: Testing section update:', section);
 console.log('Debug Panel: Test content length:', testContent.length);
 
 try {
 onUpdateSection(section, testContent);
 toast({
 title: "Test Debug Réussi",
 description: `Section "${section}" mise à jour par le debug`,
 duration: 2000
 });
 } catch (error) {
 console.error('Debug Panel: Error during test:', error);
 toast({
 title: "Test Debug Échoué",
 description: `Erreur lors du test: ${error}`,
 variant: "destructive"
 });
 }
 };
 
 return (
 <div className="p-3 bg-cyan-50 border-2 border-cyan-300 rounded-lg mb-3">
 <div className="flex items-center gap-2 mb-2">
 <Bug className="h-4 w-4 text-cyan-600" />
 <h4 className="font-bold text-cyan-800">Debug Assistant IA</h4>
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
 <p>Report exists: <strong>{!!reportData ? 'OUI' : 'NON'}</strong></p>
 <p>Sections disponibles: <strong>{Object.keys(reportData?.compteRendu?.rapport || {}).length}</strong></p>
 <p>Section courante: <strong>{currentSection || 'Non définie'}</strong></p>
 <p>Patient: <strong>{reportData?.compteRendu?.patient?.nom || 'N/A'}</strong></p>
 <p>onUpdateSection: <strong>{typeof onUpdateSection}</strong></p>
 </div>
 </div>
 );
};

// ==================== COMPOSANT PRINCIPAL ====================
export default function MedicalAIAssistant({ 
 reportData, 
 onUpdateSection,
 onUpdateMedication,
 onAddMedication,
 onUpdateLabTest,
 onAddLabTest,
 onUpdateImaging,
 onAddImaging,
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
 content: `**Assistant IA Médical - Système Maurice Anglo-Saxon** 

Je suis votre assistant IA spécialisé dans l'amélioration des rapports médicaux selon les standards du **Medical Council of Mauritius** et la nomenclature **UK/Anglo-Saxonne**.

**Je peux maintenant vous aider à :**
- **Corriger et améliorer** les sections du rapport médical
- **Standardiser** la terminologie médicale UK/Maurice
- **Optimiser et modifier** les prescriptions avec DCI précis
- **Ajouter/modifier** les analyses biologiques
- **Gérer** les examens d'imagerie
- **Enrichir** le contenu clinique selon standards MCM
- **Vérifier** la conformité aux guidelines mauritiennes

**📋 Exemples de commandes :**
- *"Améliore la section motif de consultation avec terminologie UK"*
- *"Ajoute un médicament pour l'hypertension avec DCI précis"*
- *"Corrige l'examen clinique selon standards MCM"*
- *"Ajoute des analyses de sang pour contrôle diabète"*
- *"Enrichis le diagnostic avec critères diagnostiques précis"*
- *"Ajoute une radiographie thoracique"*
- *"Révise le plan de traitement selon protocoles mauritiens"*
- *"Optimise toute la prise en charge selon nomenclature britannique"*

**Quelle section ou ordonnance souhaitez-vous améliorer ?** 🩺`,
 timestamp: new Date()
 };
 setMessages([welcomeMessage]);
 }
 }, []);

 // Fonction d'application des suggestions - VERSION AMÉLIORÉE AVEC SUPPORT MULTI-TYPE
 const applySuggestion = async (messageId: string) => {
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
 
 const { section, suggestedText, type, data } = message.suggestion;
 
 console.log('🤖 applySuggestion: Suggestion details:', {
 section,
 type,
 suggestedTextType: typeof suggestedText,
 suggestedTextLength: suggestedText?.length,
 hasData: !!data
 });
 
 try {
 // Application selon le type de suggestion
 switch (type) {
 case 'medication':
 if (data && onAddMedication) {
 onAddMedication(data);
 toast({
 title: "✅ Médicament ajouté",
 description: `${data.nom} ajouté à la prescription`,
 duration: 4000
 });
 } else {
 throw new Error('Impossible d\'ajouter le médicament');
 }
 break;
 
 case 'labTest':
 if (data && onAddLabTest) {
 onAddLabTest(data.category || 'general', data);
 toast({
 title: "✅ Analyse ajoutée",
 description: `${data.nom} ajouté aux analyses biologiques`,
 duration: 4000
 });
 } else {
 throw new Error('Impossible d\'ajouter l\'analyse');
 }
 break;
 
 case 'imaging':
 if (data && onAddImaging) {
 onAddImaging(data);
 toast({
 title: "✅ Imagerie ajoutée",
 description: `${data.type} ajouté aux examens d'imagerie`,
 duration: 4000
 });
 } else {
 throw new Error('Impossible d\'ajouter l\'examen d\'imagerie');
 }
 break;
 
 default: // type 'text' ou non spécifié
 if (!section || !suggestedText || typeof suggestedText !== 'string') {
 throw new Error('Données de suggestion invalides pour modification de texte');
 }
 
 if (suggestedText.trim().length === 0) {
 throw new Error('Le texte de la suggestion est vide');
 }
 
 console.log('🤖 applySuggestion: Calling onUpdateSection with:', {
 section,
 contentLength: suggestedText.length
 });
 
 onUpdateSection(section, suggestedText);
 
 toast({
 title: "✅ Section mise à jour",
 description: `Section "${section}" mise à jour selon standards MCM`,
 duration: 4000
 });
 break;
 }
 
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
 
 } catch (error) {
 console.error('🤖 applySuggestion: Error applying suggestion:', error);
 
 toast({
 title: "❌ Erreur d'application",
 description: `Impossible d'appliquer: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
 variant: "destructive"
 });
 }
 };

 // Fonction d'envoi de message - VERSION AMÉLIORÉE AVEC NOUVEAU PROMPT
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
 console.log('🤖 handleSendMessage: Starting enhanced AI request');
 console.log('🤖 User message:', inputMessage);
 console.log('🤖 Current selected section:', selectedSection);
 console.log('🤖 Report data exists:', !!reportData);
 
 // Préparer le contexte médical complet avec capacités étendues
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
 currentImaging: reportData?.ordonnances?.imagerie?.prescription?.examens || [],
 // Nouveau : Capacités étendues
 capabilities: {
 canModifyText: true,
 canAddMedications: !!onAddMedication,
 canAddLabTests: !!onAddLabTest,
 canAddImaging: !!onAddImaging,
 canUpdateMedications: !!onUpdateMedication,
 canUpdateLabTests: !!onUpdateLabTest,
 canUpdateImaging: !!onUpdateImaging
 }
 };

 console.log('🤖 Enhanced medical context prepared:', {
 hasReport: !!medicalContext.currentReport,
 selectedSection: medicalContext.selectedSection,
 patientAge: medicalContext.patientInfo.age,
 medicationsCount: medicalContext.currentMedications.length,
 capabilities: medicalContext.capabilities,
 contextSize: JSON.stringify(medicalContext).length
 });

 // Appel à l'API avec nouveau contexte
 const response = await fetch('/api/medical-ai-assistant', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 userRequest: inputMessage,
 medicalContext: medicalContext,
 requestType: 'enhanced_medical_improvement', // Nouveau type
 mauritiusStandards: true,
 enhancedCapabilities: true // Flag pour activer les nouvelles capacités
 })
 });

 console.log('🤖 Enhanced API Response status:', response.status);

 if (!response.ok) {
 const errorText = await response.text();
 console.error('🤖 API Error response:', errorText);
 throw new Error(`Erreur API ${response.status}: ${errorText}`);
 }

 const data = await response.json();
 console.log('🤖 Enhanced API Response data received:', {
 success: data.success,
 hasResponse: !!data.response,
 hasSuggestion: !!data.suggestion,
 responseLength: data.response?.length,
 suggestionSection: data.suggestion?.section,
 suggestionType: data.suggestion?.type
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

 // Traitement des suggestions avec support multi-type
 if (data.suggestion) {
 console.log('🤖 Processing enhanced suggestion from API:', {
 type: data.suggestion.type,
 section: data.suggestion.section,
 hasText: !!data.suggestion.text,
 hasData: !!data.suggestion.data,
 hasReasoning: !!data.suggestion.reasoning
 });
 
 const suggestionType = data.suggestion.type || 'text';
 
 // Validation selon le type
 let isValid = false;
 switch (suggestionType) {
 case 'medication':
 isValid = !!data.suggestion.data && !!data.suggestion.data.nom;
 break;
 case 'labTest':
 isValid = !!data.suggestion.data && !!data.suggestion.data.nom;
 break;
 case 'imaging':
 isValid = !!data.suggestion.data && !!data.suggestion.data.type;
 break;
 default: // 'text'
 isValid = !!data.suggestion.text && !!data.suggestion.section;
 break;
 }
 
 if (isValid) {
 // Mapping des sections pour compatibilité
 const sectionMapping = getSectionMapping();
 const mappedSection = sectionMapping[data.suggestion.section] || data.suggestion.section;
 
 assistantMessage.suggestion = {
 section: mappedSection,
 originalText: suggestionType === 'text' ? getOriginalText(mappedSection) : '',
 suggestedText: data.suggestion.text || '',
 applied: false,
 reasoning: data.suggestion.reasoning || "Amélioration suggérée par l'IA selon standards MCM",
 type: suggestionType,
 data: data.suggestion.data
 };
 
 console.log('🤖 Enhanced suggestion object created:', {
 type: assistantMessage.suggestion.type,
 section: assistantMessage.suggestion.section,
 hasData: !!assistantMessage.suggestion.data,
 hasText: !!assistantMessage.suggestion.suggestedText
 });
 } else {
 console.log('🤖 Invalid suggestion received:', data.suggestion);
 }
 }

 setMessages(prev => [...prev, assistantMessage]);
 console.log('🤖 Enhanced message added to conversation');

 } catch (error) {
 console.error('🤖 Error in enhanced handleSendMessage:', error);
 
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

 // Actions rapides étendues pour le système mauricien
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
 label: "Ajouter médicament",
 action: () => setInputMessage("Ajoute un médicament adapté au diagnostic avec DCI précis, posologie UK (OD/BD/TDS/QDS) et indications détaillées")
 },
 {
 icon: <TestTube className="h-4 w-4" />,
 label: "Ajouter analyses",
 action: () => setInputMessage("Ajoute des analyses biologiques appropriées au diagnostic avec nomenclature britannique (FBC, U&E, LFTs, TFTs)")
 },
 {
 icon: <Scan className="h-4 w-4" />,
 label: "Ajouter imagerie",
 action: () => setInputMessage("Ajoute un examen d'imagerie approprié au diagnostic avec indications cliniques précises")
 },
 {
 icon: <RefreshCw className="h-4 w-4" />,
 label: "Révision complète",
 action: () => setInputMessage("Fais une révision complète avec standards Maurice Anglo-Saxon, ajoute médicaments, analyses et imagerie si nécessaire, avec conformité MCM")
 }
 ];

 // ==================== RENDU CONDITIONNEL ====================
 
 if (!isOpen) {
 return (
 <div className="fixed bottom-6 right-6 z-50">
 <Button
 onClick={() => setIsOpen(true)}
 size="lg"
 className="rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white"
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
 <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-t-lg">
 <div className="flex items-center gap-2">
 <Bot className="h-5 w-5" />
 <div>
 <span className="font-semibold">Assistant IA Maurice</span>
 <p className="text-xs opacity-90">Standards MCM • Nomenclature UK • DCI Précis • Multi-fonctions</p>
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
 <p className="text-xs text-gray-600 mb-2">Actions rapides Maurice :</p>
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
 
 {/* Suggestion Card Améliorée avec support multi-type */}
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
 Standards MCM • Nomenclature UK • DCI Précis • IA GPT-4 • Multi-fonctions
 </p>
 </div>
 </div>
 );
}
 );
}
