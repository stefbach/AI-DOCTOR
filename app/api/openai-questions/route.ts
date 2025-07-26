// ASSISTANT IA TÉLÉCONSULTATION MÉDICALE - MAURICE
// Objectif : Aider le médecin pendant la consultation à distance

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { NextRequest, NextResponse } from "next/server"

// =============== INTERFACES SUPPLÉMENTAIRES ===============

interface InformationGap {
  category: string
  description: string
  priority: 'critical' | 'important' | 'optional'
  impact_on_diagnosis: number
}

interface DiscourseAnalysis {
  emotional_state: 'calm' | 'anxious' | 'distressed' | 'confused'
  education_level: 'low' | 'medium' | 'high'
  language_preference: 'creole' | 'french' | 'english' | 'hindi'
  key_phrases: string[]
  key_symptoms_mentioned: string[]
  temporal_elements: string[]
  concerning_elements: string[]
  cultural_references: string[]
}

interface ClinicalPresentation {
  chief_complaint: string
  symptoms: string[]
  duration: string
  severity: number
  associated_symptoms: string[]
}

interface PatientContext {
  age: number
  gender: string
  medical_history: string[]
  medications: string[]
  allergies: string[]
  season: 'hot_dry' | 'hot_humid' | 'cool_dry' | 'rainy'
  geographic_zone: string
  risk_factors: string[]
}

interface TeleconsultationContext {
  consultation_phase: 'anamnese' | 'examen_guide' | 'diagnostic' | 'prescription'
  patient_discourse: string[] // Conversation en temps réel
  symptoms_detected: string[]
  red_flags_potential: string[]
  physical_exam_limitations: string[]
  maurice_specific_risks: string[]
  consultation_duration: number
  patient_tech_comfort: 'low' | 'medium' | 'high'
}

interface AIAssistedQuestion {
  id: string
  timing: 'immediate' | 'after_patient_finishes' | 'before_conclusion'
  priority: 'essential' | 'important' | 'complementary'
  
  // Question pour le médecin (pas pour le patient)
  physician_prompt: string
  
  // Suggestions de formulation pour le patient
  patient_formulations: {
    simple: string    // Patient peu éduqué
    standard: string  // Patient moyen
    technical: string // Patient médical/éduqué
  }
  
  // Guidage examen physique à distance
  physical_guidance?: {
    instruction_patient: string
    what_to_observe: string
    red_flags_visual: string[]
    alternative_methods: string[]
  }
  
  // Contexte mauricien
  maurice_adaptation: {
    cultural_sensitivity: string
    language_options: string[] // Créole, français, anglais
    local_epidemiology: string
  }
  
  // Raison pour le médecin
  clinical_rationale: string
  ai_reasoning: string
}

// =============== MOTEUR IA TÉLÉCONSULTATION ===============

class TeleconsultationAIAssistant {
  
  async generateContextualQuestions(
    context: TeleconsultationContext,
    real_time_transcript: string,
    physician_notes: string
  ): Promise<AIAssistedQuestion[]> {
    
    // Analyse en temps réel du discours patient
    const discourse_analysis = await this.analyzePatientDiscourse(real_time_transcript)
    
    // Détection des gaps dans l'anamnèse
    const missing_elements = await this.identifyMissingInformation(
      discourse_analysis,
      context.symptoms_detected,
      physician_notes
    )
    
    // Génération questions IA contextuelle
    const ai_suggestions = await this.generateAISuggestions(
      context,
      missing_elements,
      discourse_analysis
    )
    
    return ai_suggestions
  }

  private async generateAISuggestions(
    context: TeleconsultationContext,
    gaps: InformationGap[],
    analysis: DiscourseAnalysis
  ): Promise<AIAssistedQuestion[]> {
    
    const aiPrompt = `Tu es un ASSISTANT IA EXPERT pour médecin en téléconsultation à Maurice.

CONTEXTE CONSULTATION TEMPS RÉEL :
- Phase actuelle : ${context.consultation_phase}
- Durée écoulée : ${context.consultation_duration} minutes
- Symptômes patient détectés : ${context.symptoms_detected.join(', ')}
- Niveau technologique patient : ${context.patient_tech_comfort}
- Phrases clés discours : "${analysis.key_phrases?.join(', ') || 'Non analysé'}"
- Émotion détectée : ${analysis.emotional_state || 'neutre'}
- Langue préférée : ${analysis.language_preference || 'français'}

GAPS INFORMATIONNELS IDENTIFIÉS :
${gaps.map(g => `- ${g.category}: ${g.description} (priorité: ${g.priority})`).join('\n')}

SPÉCIFICITÉS MAURICE (OBLIGATOIRE) :
- Épidémiologie actuelle : dengue/chikungunya selon saison
- Population multiculturelle : créole, français, anglais, hindi
- Médecine traditionnelle fréquente avant consultation
- Alimentation de rue = gastro-entérites fréquentes
- Transport médical difficile selon régions

LIMITATIONS TÉLÉCONSULTATION :
- Examen physique impossible → guidage auto-examen patient nécessaire
- Qualité vidéo/audio variable → questions visuelles simples
- Famille souvent présente → utiliser comme aide
- Urgences = problème évacuation → détection précoce critique

MISSION PRÉCISE :
Générer 3-4 questions INTELLIGENTES que le médecin devrait poser MAINTENANT pour :

1. ✅ Combler les gaps informationnels critiques détectés
2. ✅ Clarifier éléments ambigus du discours patient
3. ✅ Guider auto-examen physique à distance si pertinent  
4. ✅ Détecter red flags mauriciens spécifiques
5. ✅ Optimiser temps consultation (max 20min télé)

RÈGLES STRICTES :
- Questions pour ASSISTER le médecin, pas le remplacer
- Adaptation niveau éducation patient (simple/standard/technique)
- 3 formulations par question : créole mauricien / français standard / technique
- Guidage pratique auto-examen si nécessaire
- Contexte culturel mauricien obligatoire
- Focus sur éléments qui CHANGENT la prise en charge

RÉPONSE OBLIGATOIRE - FORMAT JSON EXACT :

{
  "ai_suggestions": [
    {
      "id": "unique_id_001",
      "timing": "immediate|after_patient_finishes|before_conclusion",
      "priority": "essential|important|complementary",
      "physician_prompt": "Message POUR LE MÉDECIN expliquant pourquoi poser cette question maintenant",
      "patient_formulations": {
        "simple": "Question en créole mauricien ou français simple",
        "standard": "Question français standard Maurice", 
        "technical": "Question technique/médicale"
      },
      "physical_guidance": {
        "instruction_patient": "Guidage auto-examen si nécessaire",
        "what_to_observe": "Ce que le médecin doit observer",
        "red_flags_visual": ["Signes d'alarme visuels"],
        "alternative_methods": ["Méthodes alternatives télé"]
      },
      "maurice_adaptation": {
        "cultural_sensitivity": "Adaptation culturelle mauricienne",
        "language_options": ["créole", "français", "anglais"],
        "local_epidemiology": "Contexte épidémiologique local"
      },
      "clinical_rationale": "Pourquoi cette question est cliniquement importante",
      "ai_reasoning": "Logique IA pour cette suggestion"
    }
  ],
  "context_analysis": {
    "urgency_detected": "low|medium|high",
    "missing_critical_info": ["éléments manquants critiques"],
    "maurice_specific_risks": ["risques spécifiques détectés"],
    "next_phase_recommendation": "anamnese|examen_guide|diagnostic|prescription"
  }
}

IMPORTANT : Répondre UNIQUEMENT en JSON valide. Aucun texte avant ou après le JSON.`

    try {
      // Appel OpenAI avec la bibliothèque ai
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: aiPrompt,
        temperature: 0.3, // Plus bas pour plus de cohérence
        maxTokens: 2500,
        topP: 0.9
      })

      console.log("🤖 Réponse IA brute:", result.text.substring(0, 200) + "...")

      // Parsing sécurisé du JSON
      return this.parseAIResponse(result.text)

    } catch (error) {
      console.error("❌ Erreur appel OpenAI:", error)
      
      // Fallback : questions de base selon contexte
      return this.generateFallbackQuestions(context, gaps)
    }
  }

  private parseAIResponse(aiResponseText: string): AIAssistedQuestion[] {
    try {
      // Nettoyage de la réponse
      let cleanedText = aiResponseText.trim()
      
      // Recherche du JSON dans la réponse
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Aucun JSON valide trouvé dans la réponse IA")
      }
      
      cleanedText = jsonMatch[0]
      
      // Nettoyage caractères problématiques
      cleanedText = cleanedText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caractères de contrôle
        .replace(/,(\s*[}\]])/g, '$1') // Virgules en trop
        
      const parsed = JSON.parse(cleanedText)
      
      // Validation structure
      if (!parsed.ai_suggestions || !Array.isArray(parsed.ai_suggestions)) {
        throw new Error("Structure JSON invalide : ai_suggestions manquant")
      }
      
      // Validation chaque suggestion
      const validatedSuggestions = parsed.ai_suggestions.map((suggestion: any, index: number) => {
        if (!suggestion.id || !suggestion.physician_prompt || !suggestion.patient_formulations) {
          console.warn(`⚠️ Suggestion ${index} incomplète, correction automatique`)
          
          return {
            id: suggestion.id || `ai_generated_${Date.now()}_${index}`,
            timing: suggestion.timing || "immediate",
            priority: suggestion.priority || "important", 
            physician_prompt: suggestion.physician_prompt || "Question générée automatiquement",
            patient_formulations: {
              simple: suggestion.patient_formulations?.simple || "Question simple non générée",
              standard: suggestion.patient_formulations?.standard || "Question standard non générée", 
              technical: suggestion.patient_formulations?.technical || "Question technique non générée"
            },
            physical_guidance: suggestion.physical_guidance || null,
            maurice_adaptation: suggestion.maurice_adaptation || {
              cultural_sensitivity: "Adaptation mauricienne standard",
              language_options: ["français"],
              local_epidemiology: "Contexte général Maurice"
            },
            clinical_rationale: suggestion.clinical_rationale || "Rationale médical à préciser",
            ai_reasoning: suggestion.ai_reasoning || "Logique IA non fournie"
          }
        }
        
        return suggestion
      })
      
      console.log(`✅ ${validatedSuggestions.length} suggestions IA parsées avec succès`)
      return validatedSuggestions
      
    } catch (parseError) {
      console.error("❌ Erreur parsing JSON IA:", parseError)
      console.error("Texte problématique:", aiResponseText.substring(0, 500))
      
      // Fallback en cas d'erreur parsing
      return [{
        id: `fallback_${Date.now()}`,
        timing: "immediate",
        priority: "important",
        physician_prompt: "Erreur génération IA - Question de sécurité : Y a-t-il des symptômes qui vous inquiètent particulièrement ?",
        patient_formulations: {
          simple: "Ena quelque chose ki faire ou peur ?",
          standard: "Y a-t-il quelque chose qui vous inquiète particulièrement ?",
          technical: "Identifiez-vous des symptômes préoccupants nécessitant une évaluation urgente ?"
        },
        physical_guidance: null,
        maurice_adaptation: {
          cultural_sensitivity: "Question de sécurité universelle",
          language_options: ["créole", "français"],
          local_epidemiology: "Applicable tous contextes"
        },
        clinical_rationale: "Question de sécurité en cas d'échec IA",
        ai_reasoning: "Fallback automatique"
      }]
    }
  }

  private generateFallbackQuestions(
    context: TeleconsultationContext, 
    gaps: InformationGap[]
  ): AIAssistedQuestion[] {
    
    // Questions de base selon la phase de consultation
    const fallbackQuestions: { [key: string]: AIAssistedQuestion } = {
      
      anamnese: {
        id: "fallback_anamnese_001",
        timing: "immediate",
        priority: "essential",
        physician_prompt: "Anamnèse - Chronologie des symptômes manquante",
        patient_formulations: {
          simple: "Depi kan sa problems la commencer ?",
          standard: "Depuis quand avez-vous ces symptômes ?", 
          technical: "Chronologie précise d'apparition des symptômes ?"
        },
        physical_guidance: null,
        maurice_adaptation: {
          cultural_sensitivity: "Question temporelle universelle",
          language_options: ["créole", "français"],
          local_epidemiology: "Base pour toute pathologie"
        },
        clinical_rationale: "Chronologie essentielle pour diagnostic différentiel",
        ai_reasoning: "Fallback anamnèse standard"
      },
      
      examen_guide: {
        id: "fallback_examen_001", 
        timing: "immediate",
        priority: "essential",
        physician_prompt: "Examen guidé - Auto-palpation nécessaire",
        patient_formulations: {
          simple: "Met to la main lor kot li faire mal et dire moi ki to senti",
          standard: "Placez votre main sur la zone douloureuse et décrivez ce que vous ressentez",
          technical: "Palpation guidée de la zone symptomatique avec description tactile"
        },
        physical_guidance: {
          instruction_patient: "Palpation douce puis ferme de la zone symptomatique",
          what_to_observe: "Expression faciale, protection, localisation précise",
          red_flags_visual: ["Défense", "Douleur vive", "Asymétrie"],
          alternative_methods: ["Comparaison controlatérale", "Palpation progressive"]
        },
        maurice_adaptation: {
          cultural_sensitivity: "Auto-examen accepté culturellement", 
          language_options: ["créole", "français"],
          local_epidemiology: "Technique universelle"
        },
        clinical_rationale: "Compensation absence examen physique direct",
        ai_reasoning: "Fallback examen télé standard"
      }
    }
    
    const currentPhase = context.consultation_phase
    const relevantQuestion = fallbackQuestions[currentPhase] || fallbackQuestions.anamnese
    
    return [relevantQuestion]
  }

  private async analyzePatientDiscourse(transcript: string): Promise<DiscourseAnalysis> {
    
    // Analyse linguistique basique
    const emotional_markers = {
      anxious: /inquiet|peur|angoisse|stress|nerveux/i,
      distressed: /mal|douleur|souffrance|terrible|insupportable/i,
      confused: /comprend pas|sais pas|peut-être|confus/i
    }
    
    let emotional_state: DiscourseAnalysis['emotional_state'] = 'calm'
    for (const [emotion, pattern] of Object.entries(emotional_markers)) {
      if (pattern.test(transcript)) {
        emotional_state = emotion as DiscourseAnalysis['emotional_state']
        break
      }
    }
    
    // Détection niveau d'éducation par vocabulaire
    const technical_terms = /symptôme|pathologie|diagnostic|traitement|médication/i
    const simple_terms = /mal|pas bien|ça fait mal|problème/i
    
    let education_level: DiscourseAnalysis['education_level'] = 'medium'
    if (technical_terms.test(transcript)) education_level = 'high'
    else if (simple_terms.test(transcript)) education_level = 'low'
    
    // Détection langue préférée
    const creole_markers = /mo|to|ena|faire|kot|depi/i
    const english_markers = /pain|feel|since|problem|doctor/i
    
    let language_preference: DiscourseAnalysis['language_preference'] = 'french'
    if (creole_markers.test(transcript)) language_preference = 'creole'
    else if (english_markers.test(transcript)) language_preference = 'english'
    
    // Extraction symptômes mentionnés
    const symptom_patterns = {
      'fièvre': /fièvre|fever|la fièvre|chaud/i,
      'douleur': /mal|douleur|pain|faire mal/i,
      'toux': /toux|cough|tousse/i,
      'nausée': /nausée|vomit|vomissement|mal cœur/i,
      'fatigue': /fatigue|fatigué|tired|épuisé/i
    }
    
    const key_symptoms_mentioned = Object.keys(symptom_patterns).filter(symptom =>
      symptom_patterns[symptom].test(transcript)
    )
    
    // Éléments temporels
    const temporal_patterns = /hier|aujourd'hui|depuis|il y a|morning|soir|nuit/gi
    const temporal_elements = transcript.match(temporal_patterns) || []
    
    // Éléments préoccupants
    const concerning_patterns = /urgent|grave|pire|empire|sang|rouge|difficulté/gi
    const concerning_elements = transcript.match(concerning_patterns) || []
    
    return {
      emotional_state,
      education_level,
      language_preference,
      key_phrases: transcript.split('.').slice(0, 3), // 3 premières phrases
      key_symptoms_mentioned,
      temporal_elements,
      concerning_elements,
      cultural_references: [] // À développer selon contexte mauricien
    }
  }

  private async identifyMissingInformation(
    discourse: DiscourseAnalysis,
    symptoms: string[],
    physician_notes: string
  ): Promise<InformationGap[]> {
    
    const gaps: InformationGap[] = []
    
    // Vérification chronologie
    if (discourse.temporal_elements.length === 0) {
      gaps.push({
        category: 'chronology',
        description: 'Début et évolution des symptômes non précisés',
        priority: 'critical',
        impact_on_diagnosis: 0.8
      })
    }
    
    // Vérification sévérité
    if (!physician_notes.includes('sévérité') && !physician_notes.includes('échelle')) {
      gaps.push({
        category: 'severity',
        description: 'Intensité des symptômes non quantifiée',
        priority: 'important',
        impact_on_diagnosis: 0.6
      })
    }
    
    // Vérification facteurs déclenchants
    if (!physician_notes.includes('déclenchant') && !physician_notes.includes('facteur')) {
      gaps.push({
        category: 'triggers',
        description: 'Facteurs déclenchants/améliorants non explorés',
        priority: 'important',
        impact_on_diagnosis: 0.7
      })
    }
    
    // Vérification contexte mauricien spécifique
    if (symptoms.includes('fièvre') && !physician_notes.includes('moustique') && !physician_notes.includes('voyage')) {
      gaps.push({
        category: 'tropical_exposure',
        description: 'Exposition vectorielle mauricienne non évaluée',
        priority: 'critical',
        impact_on_diagnosis: 0.9
      })
    }
    
    // Vérification médications
    if (!physician_notes.includes('médicament') && !physician_notes.includes('traitement')) {
      gaps.push({
        category: 'medications',
        description: 'Traitements actuels et récents non documentés',
        priority: 'important',
        impact_on_diagnosis: 0.5
      })
    }
    
    return gaps.sort((a, b) => b.impact_on_diagnosis - a.impact_on_diagnosis)
  }
}

// =============== EXEMPLES QUESTIONS IA CONTEXTUELLES ===============

const EXEMPLE_QUESTIONS_CONTEXTUELLES: AIAssistedQuestion[] = [
  
  // EXEMPLE 1 : Patient dit "j'ai mal au ventre depuis hier"
  {
    id: "abdominal_pain_contextual_001",
    timing: "immediate",
    priority: "essential",
    
    physician_prompt: `Le patient mentionne "mal au ventre" - terme très vague. 
    
    SUGGESTION IA : Préciser localisation et caractère pour distinguer :
    - Douleur viscérale vs pariétale
    - Obstruction vs inflammation vs perforation
    - Contexte mauricien : intoxication alimentaire très fréquente`,
    
    patient_formulations: {
      simple: "Ou côté to mal le ventre la ? Montre moi avec to la main exact kot li faire mal",
      standard: "Pouvez-vous me montrer précisément où vous avez mal ? Est-ce que ça fait mal quand je compte jusqu'à 3 et vous appuyez fort ?",
      technical: "Localisez précisément la douleur et décrivez le caractère : crampes, brûlures, coups de poignard ?"
    },
    
    physical_guidance: {
      instruction_patient: "Placez votre main sur l'endroit exact où ça fait le plus mal. Ensuite, appuyez doucement et relâchez rapidement",
      what_to_observe: "Grimace lors pression, protection abdominale, signe de Blumberg positif",
      red_flags_visual: ["Défense abdominale", "Pâleur", "Sudation"],
      alternative_methods: ["Test de saut sur place", "Évaluation position antalgique"]
    },
    
    maurice_adaptation: {
      cultural_sensitivity: "À Maurice, 'mal ventre' souvent lié alimentation de rue - explorer sans jugement",
      language_options: ["Créole mauricien", "Français"],
      local_epidemiology: "Gastro-entérites très fréquentes saison chaude, paludisme rare mais possible"
    },
    
    clinical_rationale: "Localisation précise oriente diagnostic différentiel abdominal",
    ai_reasoning: "IA détecte terme vague 'mal ventre' nécessitant précision sémiologique urgente"
  },

  // EXEMPLE 2 : Patient mentionne "fièvre" en contexte mauricien
  {
    id: "fever_maurice_contextual_002", 
    timing: "immediate",
    priority: "essential",
    
    physician_prompt: `Patient signale fièvre - CONTEXTE MAURICE CRITIQUE.
    
    SUGGESTION IA : Dépistage systématique arboviroses :
    - Saison des pluies = pic dengue/chikungunya
    - Pattern fièvre + localisation = orientation diagnostique
    - Surveillance complications hémorragiques dengue`,
    
    patient_formulations: {
      simple: "Depi kan to gagné la fièvre ? Li vini comment - d'un coup ou petit à petit ?",
      standard: "Votre fièvre : elle monte et descend dans la journée ou elle reste tout le temps haute ?",
      technical: "Décrivez le pattern fébrile : continue, rémittente, ou intermittente ? Frissons associés ?"
    },
    
    physical_guidance: {
      instruction_patient: "Regardez votre peau : vous voyez des petits points rouges quelque part ? Surtout sur les bras et jambes",
      what_to_observe: "Éruption pétéchiale, rash maculeux, pâleur conjonctivale",
      red_flags_visual: ["Pétéchies", "Saignements spontanés", "Ictère"],
      alternative_methods: ["Test fragilité capillaire", "Inspection muqueuses"]
    },
    
    maurice_adaptation: {
      cultural_sensitivity: "Fièvre souvent traitée médecine traditionnelle d'abord - explorer traitements pris",
      language_options: ["Créole mauricien", "Français", "Hindi"],
      local_epidemiology: "Surveillance dengue active - vérifier zones épidémiques actuelles"
    },
    
    clinical_rationale: "Pattern fébrile différencie dengue vs chikungunya vs bactérienne",
    ai_reasoning: "IA déclenche protocole fièvre tropicale adapté épidémiologie mauricienne temps réel"
  },

  // EXEMPLE 3 : Patient dit "je tousse"
  {
    id: "cough_telemedicine_003",
    timing: "after_patient_finishes", 
    priority: "important",
    
    physician_prompt: `Toux mentionnée - TÉLÉCONSULTATION LIMITÉE pour examen pulmonaire.
    
    SUGGESTION IA : Guidage auscultation à distance + évaluation gravité :
    - Patient comme "stéthoscope humain"
    - Recherche dyspnée d'effort masquée
    - Dépistage pneumonie sans signes physiques`,
    
    patient_formulations: {
      simple: "Met to la main lor to la poitrine et tousse fort. To senti si ça vibre ?",
      standard: "Placez une main sur votre poitrine, toussez fort et dites-moi si vous sentez des vibrations",
      technical: "Auto-palpation vibrations vocales + test effort : 10 flexions rapides possible sans essoufflement ?"
    },
    
    physical_guidance: {
      instruction_patient: "Respirez profondément et placez vos mains sur les côtés de votre poitrine. Ça bouge de la même façon des deux côtés ?",
      what_to_observe: "Asymétrie expansion thoracique, tirage, cyanose des lèvres",
      red_flags_visual: ["Cyanose", "Tirage", "Battement ailes du nez"],
      alternative_methods: ["Test parole entrecoupée", "Comptage à voix haute", "Position tripode"]
    },
    
    maurice_adaptation: {
      cultural_sensitivity: "Toux souvent négligée - expliquer importance dépistage précoce",
      language_options: ["Créole mauricien", "Français"],
      local_epidemiology: "Tuberculose encore présente - dépistage si toux > 2 semaines"
    },
    
    clinical_rationale: "Évaluation gravité pneumopathie sans examen physique direct",
    ai_reasoning: "IA compense limitation auscultation par guidage auto-examen patient"
  },

  // EXEMPLE 4 : Contexte urgence détectée
  {
    id: "emergency_red_flags_004",
    timing: "immediate",
    priority: "essential",
    
    physician_prompt: `🚨 IA DÉTECTE URGENCE POTENTIELLE 🚨
    
    Éléments inquiétants dans discours patient :
    - Mots-clés danger détectés par IA
    - Combinaison symptômes = red flags
    
    SUGGESTION : Questions urgence vitale IMMÉDIATE`,
    
    patient_formulations: {
      simple: "C'est important : to capave parler normal ou to essoufflé ?",
      standard: "Question importante : vous arrivez à parler normalement ou vous êtes essoufflé ?",
      technical: "Évaluation dyspnée : pouvez-vous compter jusqu'à 20 sans reprendre votre souffle ?"
    },
    
    physical_guidance: {
      instruction_patient: "URGENT : Regardez vos ongles et vos lèvres dans un miroir. Quelle couleur vous voyez ?",
      what_to_observe: "Cyanose, marbrures, pâleur extrême",
      red_flags_visual: ["Cyanose", "Marbrures", "Agitation"],
      alternative_methods: ["Test orientation", "Évaluation conscience", "Vital signs patient"]
    },
    
    maurice_adaptation: {
      cultural_sensitivity: "Urgence = rassurer famille souvent présente + organisation transport",
      language_options: ["Langue préférée patient"],
      local_epidemiology: "Coordination SAMU Maurice si évacuation nécessaire"
    },
    
    clinical_rationale: "Détection précoce urgence vitale en téléconsultation",
    ai_reasoning: "IA analyse semantic + patterns = alerte rouge automatique"
  }
]

// =============== INTÉGRATION TEMPS RÉEL ===============

class RealTimeTeleconsultationAI {
  
  private consultation_transcript: string[] = []
  private ai_suggestions: AIAssistedQuestion[] = []
  private consultation_context: TeleconsultationContext
  private telemed_assistant: TeleconsultationAIAssistant

  constructor() {
    this.telemed_assistant = new TeleconsultationAIAssistant()
    this.consultation_context = {
      consultation_phase: 'anamnese',
      patient_discourse: [],
      symptoms_detected: [],
      red_flags_potential: [],
      physical_exam_limitations: [],
      maurice_specific_risks: [],
      consultation_duration: 0,
      patient_tech_comfort: 'medium'
    }
  }
  
  // Méthode appelée en temps réel pendant consultation
  async onPatientSpeak(
    spoken_text: string,
    physician_notes: string,
    vital_signs?: any
  ): Promise<{
    immediate_suggestions: AIAssistedQuestion[],
    background_analysis: DiscourseAnalysis,
    red_flags_detected: string[]
  }> {
    
    // Ajout à transcript
    this.consultation_transcript.push(spoken_text)
    this.consultation_context.patient_discourse.push(spoken_text)
    
    // Analyse IA en temps réel
    const analysis = await this.analyzeCurrentContext(
      spoken_text,
      this.consultation_transcript,
      physician_notes
    )
    
    // Génération suggestions immédiates
    const immediate_suggestions = await this.generateImmediateSuggestions(analysis)
    
    // Détection red flags
    const red_flags = this.detectEmergencyPatterns(analysis)
    
    // Mise à jour contexte
    this.updateConsultationContext(analysis, red_flags)
    
    return {
      immediate_suggestions,
      background_analysis: analysis,
      red_flags_detected: red_flags
    }
  }

  private async analyzeCurrentContext(
    current_text: string,
    full_transcript: string[],
    notes: string
  ): Promise<DiscourseAnalysis> {
    
    const combined_text = full_transcript.join(' ')
    return await this.telemed_assistant['analyzePatientDiscourse'](combined_text)
  }

  private async generateImmediateSuggestions(analysis: DiscourseAnalysis): Promise<AIAssistedQuestion[]> {
    
    // Identifier les gaps basés sur l'analyse
    const gaps = await this.telemed_assistant['identifyMissingInformation'](
      analysis, 
      analysis.key_symptoms_mentioned,
      'Notes en cours de consultation'
    )
    
    // Générer suggestions via IA
    const suggestions = await this.telemed_assistant.generateContextualQuestions(
      this.consultation_context,
      this.consultation_transcript.join(' '),
      'Notes en temps réel'
    )
    
    // Filtrer pour suggestions immédiates uniquement
    return suggestions.filter(s => s.timing === 'immediate').slice(0, 3)
  }

  private detectEmergencyPatterns(analysis: DiscourseAnalysis): string[] {
    const red_flags: string[] = []
    
    // Patterns d'urgence détectés dans le discours
    const emergency_patterns = {
      'difficulty_breathing': /difficile respirer|essoufflé|souffle court|cannot breathe/i,
      'chest_pain_severe': /douleur poitrine|mal cœur|chest pain|oppression/i,
      'loss_consciousness': /évanoui|inconscient|perte connaissance|blackout/i,
      'severe_bleeding': /sang|saignement|hémorragie|bleeding/i,
      'high_fever_child': /fièvre|très chaud|fever.*high/i
    }
    
    const combined_discourse = analysis.key_phrases.join(' ')
    
    Object.entries(emergency_patterns).forEach(([flag, pattern]) => {
      if (pattern.test(combined_discourse)) {
        red_flags.push(flag)
      }
    })
    
    return red_flags
  }

  private updateConsultationContext(analysis: DiscourseAnalysis, red_flags: string[]): void {
    
    // Mise à jour symptômes détectés
    this.consultation_context.symptoms_detected = [
      ...new Set([...this.consultation_context.symptoms_detected, ...analysis.key_symptoms_mentioned])
    ]
    
    // Mise à jour red flags
    this.consultation_context.red_flags_potential = [
      ...new Set([...this.consultation_context.red_flags_potential, ...red_flags])
    ]
    
    // Détermination phase consultation selon progression
    if (this.consultation_transcript.length > 10) {
      this.consultation_context.consultation_phase = 'examen_guide'
    }
    if (this.consultation_transcript.length > 20) {
      this.consultation_context.consultation_phase = 'diagnostic'
    }
  }

  // Interface médecin - suggestions en sidebar
  renderPhysicianInterface(): any {
    return {
      immediate_suggestions: this.ai_suggestions.filter(s => s.timing === 'immediate'),
      context_analysis: {
        symptoms_detected: this.consultation_context.symptoms_detected,
        consultation_phase: this.consultation_context.consultation_phase,
        red_flags_potential: this.consultation_context.red_flags_potential,
        duration: this.consultation_context.consultation_duration
      },
      maurice_specific: {
        epidemiological_alerts: this.getMauritianEpidemiologicalAlerts(),
        cultural_adaptations: this.getCulturalAdaptations(),
        language_suggestions: this.getLanguageSuggestions()
      }
    }
  }

  private getMauritianEpidemiologicalAlerts(): string[] {
    // Simulation alertes épidémiologiques temps réel
    const current_month = new Date().getMonth()
    const alerts = []
    
    if (current_month >= 10 || current_month <= 3) { // Nov-Mar : saison chaude
      alerts.push("Pic dengue/chikungunya attendu")
      alerts.push("Surveillance gastro-entérites alimentation")
    }
    
    if (current_month >= 4 && current_month <= 9) { // Avr-Sep : saison fraîche
      alerts.push("Recrudescence infections respiratoires")
      alerts.push("Moins de risque vectoriel")
    }
    
    return alerts
  }

  private getCulturalAdaptations(): string[] {
    return [
      "Famille souvent présente - utiliser comme aide",
      "Médecine traditionnelle fréquente - explorer sans jugement",
      "Auto-médication courante - vérifier traitements pris"
    ]
  }

  private getLanguageSuggestions(): string[] {
    return [
      "Créole mauricien pour patients âgés ruraux",
      "Français standard population urbaine", 
      "Anglais communauté indienne éduquée"
    ]
  }
}

// =============== FONCTIONS UTILITAIRES ===============

function extractSymptomsFromDiscourse(discourse: string): string[] {
  const symptom_patterns = {
    'fièvre': /fièvre|fever|la fièvre|chaud|température/i,
    'douleur': /mal|douleur|pain|faire mal|ça fait mal/i,
    'toux': /toux|cough|tousse|crache/i,
    'nausée': /nausée|vomit|vomissement|mal au cœur|envie vomir/i,
    'fatigue': /fatigue|fatigué|tired|épuisé|faiblesse/i,
    'vertige': /vertige|tournis|étourdi|dizzy/i,
    'maux_tête': /mal de tête|migraine|céphalée|headache/i,
    'essoufflement': /essoufflé|dyspnée|souffle court|difficile respirer/i,
    'palpitations': /palpitation|cœur bat fort|heart racing/i,
    'diarrhée': /diarrhée|selles liquides|courante|diarrhea/i
  }
  
  return Object.keys(symptom_patterns).filter(symptom =>
    symptom_patterns[symptom].test(discourse)
  )
}

function detectMauricianContext(discourse: string): {
  risk_factors: string[],
  cultural_elements: string[],
  language_detected: string
} {
  const maurice_risks = {
    'vector_exposure': /moustique|piqûre|insecte|dehors|jardin/i,
    'food_contamination': /manger dehors|street food|restaurant|buffet/i,
    'water_exposure': /rivière|mer|eau|baignade|inondation/i,
    'traditional_medicine': /tisane|herbe|remède grand-mère|ayurveda/i
  }
  
  const cultural_markers = {
    'family_involvement': /famille|mari|femme|enfant|papa|maman/i,
    'religious_reference': /dieu|prière|temple|église|mosquée/i,
    'work_context': /travail|usine|bureau|champ|pêche/i
  }
  
  const language_markers = {
    'creole': /mo|to|ena|faire|kot|depi|aster|bonheur/i,
    'english': /feel|pain|since|doctor|problem|help/i,
    'french': /je|vous|depuis|problème|médecin|mal/i
  }
  
  return {
    risk_factors: Object.keys(maurice_risks).filter(risk => 
      maurice_risks[risk].test(discourse)
    ),
    cultural_elements: Object.keys(cultural_markers).filter(element =>
      cultural_markers[element].test(discourse)
    ),
    language_detected: Object.keys(language_markers).find(lang =>
      language_markers[lang].test(discourse)
    ) || 'french'
  }
}

// =============== API ENDPOINT TEMPS RÉEL ===============

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    const { 
      consultation_id,
      patient_discourse_real_time,
      physician_notes,
      consultation_phase,
      maurice_context,
      patient_metadata 
    } = await request.json()

    console.log(`🩺 Assistant IA Télémédecine - Consultation ${consultation_id}`)

    // Validation données requises
    if (!patient_discourse_real_time || !consultation_phase) {
      return NextResponse.json({
        success: false,
        error: "Données consultation manquantes",
        required_fields: ["patient_discourse_real_time", "consultation_phase"]
      }, { status: 400 })
    }

    // Initialisation assistant IA
    const aiAssistant = new TeleconsultationAIAssistant()
    const realtimeAI = new RealTimeTeleconsultationAI()
    
    // Analyse contexte mauricien
    const mauritian_analysis = detectMauricianContext(patient_discourse_real_time)
    
    // Contexte consultation enrichi
    const enhanced_context: TeleconsultationContext = {
      consultation_phase: consultation_phase as any,
      patient_discourse: [patient_discourse_real_time],
      symptoms_detected: extractSymptomsFromDiscourse(patient_discourse_real_time),
      red_flags_potential: [],
      physical_exam_limitations: ['no_physical_contact', 'video_quality_variable'],
      maurice_specific_risks: mauritian_analysis.risk_factors,
      consultation_duration: Math.floor((Date.now() - (maurice_context?.start_time || Date.now())) / 60000),
      patient_tech_comfort: patient_metadata?.tech_comfort || 'medium'
    }
    
    // Génération suggestions IA contextuelle
    const ai_suggestions = await aiAssistant.generateContextualQuestions(
      enhanced_context,
      patient_discourse_real_time,
      physician_notes || "Notes en cours"
    )
    
    // Analyse temps réel
    const realtime_analysis = await realtimeAI.onPatientSpeak(
      patient_discourse_real_time,
      physician_notes || "",
      maurice_context?.vital_signs
    )
    
    // Interface médecin enrichie
    const physician_interface = realtimeAI.renderPhysicianInterface()
    
    // Calcul métriques performance
    const processing_time = Date.now() - startTime
    
    const response = {
      success: true,
      consultation_id,
      processing_time_ms: processing_time,
      
      // Suggestions IA principales
      ai_suggestions: ai_suggestions.slice(0, 4), // Max 4 suggestions
      
      // Analyse temps réel
      real_time_analysis: {
        symptoms_detected: enhanced_context.symptoms_detected,
        emotional_state: realtime_analysis.background_analysis.emotional_state,
        language_preference: realtime_analysis.background_analysis.language_preference,
        education_level: realtime_analysis.background_analysis.education_level,
        urgency_detected: realtime_analysis.red_flags_detected.length > 0 ? 'high' : 'low'
      },
      
      // Interface médecin
      physician_interface: {
        immediate_suggestions: realtime_analysis.immediate_suggestions,
        context_summary: physician_interface.context_analysis,
        maurice_adaptations: physician_interface.maurice_specific,
        red_flags_monitoring: realtime_analysis.red_flags_detected
      },
      
      // Contexte mauricien enrichi
      mauritius_context: {
        epidemiological_status: physician_interface.maurice_specific.epidemiological_alerts,
        cultural_factors: mauritian_analysis.cultural_elements,
        language_recommendations: physician_interface.maurice_specific.language_suggestions,
        seasonal_risks: physician_interface.maurice_specific.epidemiological_alerts,
        risk_factors_detected: mauritian_analysis.risk_factors
      },
      
      // Recommandations consultation
      consultation_guidance: {
        next_phase_suggestion: enhanced_context.consultation_duration > 15 ? 'diagnostic' : consultation_phase,
        time_management: {
          elapsed_minutes: enhanced_context.consultation_duration,
          suggested_remaining: Math.max(5, 20 - enhanced_context.consultation_duration),
          efficiency_score: ai_suggestions.length > 0 ? 'good' : 'needs_improvement'
        },
        priority_actions: realtime_analysis.red_flags_detected.length > 0 
          ? ['Évaluer urgence', 'Examens complémentaires', 'Orientation si nécessaire']
          : ['Compléter anamnèse', 'Examen guidé', 'Synthèse diagnostique']
      },
      
      // Métadonnées système
      system_metadata: {
        ai_model: "gpt-4o",
        assistant_version: "telemedicine_v1.0",
        mauritius_epidemiology: "real_time_integrated",
        language_support: ["créole", "français", "anglais"],
        consultation_quality_score: calculateConsultationQuality(ai_suggestions, realtime_analysis),
        fallback_available: true
      }
    }

    console.log(`✅ Suggestions générées: ${ai_suggestions.length} | Red flags: ${realtime_analysis.red_flags_detected.length} | Temps: ${processing_time}ms`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error("❌ Erreur assistant IA téléconsultation:", error)
    
    // Réponse fallback avec suggestions de base
    const fallback_suggestions = [
      {
        id: `fallback_${Date.now()}`,
        timing: "immediate",
        priority: "essential",
        physician_prompt: "Erreur IA - Question de base recommandée",
        patient_formulations: {
          simple: "Ki zot problème principal zordi ?",
          standard: "Quel est votre problème principal aujourd'hui ?",
          technical: "Décrivez votre motif de consultation principal"
        },
        maurice_adaptation: {
          cultural_sensitivity: "Question universelle de base",
          language_options: ["créole", "français"],
          local_epidemiology: "Applicable tous contextes"
        },
        clinical_rationale: "Question de sécurité en cas d'erreur système",
        ai_reasoning: "Fallback automatique"
      }
    ]
    
    return NextResponse.json({
      success: false,
      error: "Erreur assistant IA téléconsultation",
      details: error.message,
      fallback_mode: true,
      fallback_suggestions,
      emergency_guidance: {
        message: "Système IA indisponible - Poursuivre consultation manuelle",
        basic_questions: [
          "Motif de consultation principal ?",
          "Depuis quand ces symptômes ?", 
          "Avez-vous pris des médicaments ?",
          "Y a-t-il des signes qui vous inquiètent ?"
        ]
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Fonction utilitaire pour calculer qualité consultation
function calculateConsultationQuality(suggestions: AIAssistedQuestion[], analysis: any): number {
  let score = 0.5 // Base
  
  if (suggestions.length >= 3) score += 0.2 // Suggestions pertinentes
  if (analysis.red_flags_detected.length === 0) score += 0.1 // Pas d'urgence manquée
  if (suggestions.some(s => s.priority === 'essential')) score += 0.2 // Questions essentielles
  
  return Math.min(1.0, score)
}
