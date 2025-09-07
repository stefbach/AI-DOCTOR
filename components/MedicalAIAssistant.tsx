import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea';
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
  Stethoscope
} from 'lucide-react';

// Types pour les messages du chat
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
  };
}

interface MedicalAIAssistantProps {
  reportData: any;
  onUpdateSection: (section: string, content: string) => void;
  currentSection?: string;
}

export default function MedicalAIAssistant({ reportData, onUpdateSection, currentSection }: MedicalAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState(currentSection || 'motifConsultation');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas lors de nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Message d'accueil initial adapté au système mauricien
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `🏥 **Assistant IA Médical - Système Maurice Anglo-Saxon**

Je suis votre assistant IA spécialisé dans l'amélioration des rapports médicaux selon les standards du **Medical Council of Mauritius** et la nomenclature **UK/Anglo-Saxonne**.

**🎯 Je peux vous aider à :**
• **Corriger et améliorer** les sections du rapport médical
• **Standardiser** la terminologie médicale UK/Maurice
• **Optimiser** les prescriptions avec DCI précis
• **Enrichir** le contenu clinique
• **Vérifier** la conformité aux standards MCM

**📋 Exemples de commandes :**
• *"Améliore la section motif de consultation avec terminologie UK"*
• *"Corrige l'examen clinique selon standards MCM"*
• *"Ajoute une prescription d'Amoxicilline 500mg avec DCI"*
• *"Révise le diagnostic pour plus de précision clinique"*
• *"Optimise toutes les prescriptions selon nomenclature britannique"*

**Quelle section souhaitez-vous améliorer ?** 🩺`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

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

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur de traitement');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.explanation || "Réponse générée",
        timestamp: new Date()
      };

      // Si c'est une suggestion de modification
      if (data.suggestion) {
        assistantMessage.suggestion = {
          section: data.suggestion.section,
          originalText: getOriginalText(data.suggestion.section),
          suggestedText: data.suggestion.text,
          applied: false
        };
      }

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Erreur Assistant IA:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Erreur technique**\n\nUne erreur s'est produite lors du traitement de votre demande. Le système Maurice Anglo-Saxon est temporairement indisponible.\n\n**Veuillez :**\n• Vérifier votre connexion\n• Réessayer dans quelques instants\n• Contacter le support si le problème persiste\n\n*Système : ${error instanceof Error ? error.message : 'Erreur inconnue'}*`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getOriginalText = (section: string) => {
    // Récupère le texte original d'une section
    if (reportData?.compteRendu?.rapport?.[section]) {
      return reportData.compteRendu.rapport[section];
    }
    return '';
  };

  const applySuggestion = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.suggestion) {
      onUpdateSection(message.suggestion.section, message.suggestion.suggestedText);
      
      // Marquer la suggestion comme appliquée
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, suggestion: { ...m.suggestion!, applied: true } }
          : m
      ));
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

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <span className="font-semibold">Assistant IA Maurice</span>
            <p className="text-xs opacity-90">Standards MCM • Nomenclature UK</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

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
              className="text-xs h-8 justify-start"
            >
              {action.icon}
              <span className="ml-1 truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto max-h-96">
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
                    
                    {/* Suggestion Card */}
                    {message.suggestion && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            🏥 Suggestion MCM: {message.suggestion.section}
                          </Badge>
                          {message.suggestion.applied && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Appliqué
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-600">Texte original :</p>
                            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              {message.suggestion.originalText.substring(0, 100)}...
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-600">Amélioration suggérée :</p>
                            <p className="text-xs text-gray-800 bg-blue-50 p-2 rounded">
                              {message.suggestion.suggestedText.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                        
                        {!message.suggestion.applied && (
                          <Button
                            size="sm"
                            onClick={() => applySuggestion(message.id)}
                            className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Appliquer l'amélioration
                          </Button>
                        )}
                      </div>
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
                  <span className="text-sm text-gray-600">L'IA analyse selon standards Maurice...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Demandez une amélioration médicale..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
          🏥 Standards MCM • Nomenclature UK • DCI Précis
        </p>
      </div>
    </div>
  );
}
