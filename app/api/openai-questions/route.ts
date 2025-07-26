// ASSISTANT IA TÉLÉCONSULTATION MÉDICALE - MAURICE
// Objectif : Aider le médecin pendant la consultation à distance

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
    
    const aiPrompt = `
    CONTEXTE TÉLÉCONSULTATION MAURICE - ASSISTANT MÉDECIN

    SITUATION ACTUELLE :
    - Phase : ${context.consultation_phase}
    - Durée écoulée : ${context.consultation_duration} min
    - Symptômes détectés : ${context.symptoms_detected.join(', ')}
    - Discours patient analysé : "${analysis.key_phrases.join(', ')}"
    - Éléments manquants identifiés : ${gaps.map(g => g.category).join(', ')}
    
    SPÉCIFICITÉS MAURICE :
    - Risques tropicaux : dengue, chikungunya, paludisme importé
    - Populations : créole, indien, chinois, européen
    - Langues : créole mauricien, français, anglais
    - Saison actuelle et risques épidémiques
    
    LIMITATIONS TÉLÉCONSULTATION :
    - Pas d'examen physique direct
    - Qualité vidéo variable
    - Patient potentiellement seul
    - Besoin guidage auto-examen

    MISSION : Générer 3-5 questions intelligentes que le médecin devrait poser MAINTENANT pour :
    1. Combler les gaps informationnels détectés
    2. Clarifier les éléments ambigus du discours patient  
    3. Guider un examen physique à distance si nécessaire
    4. Détecter les red flags mauriciens spécifiques
    5. Optimiser le temps de consultation

    RÈGLES :
    - Questions pour AIDER le médecin, pas le remplacer
    - Adaptation au niveau d'éducation patient détecté
    - Prise en compte contexte culturel mauricien
    - Focus sur ce qui change la prise en charge
    - Guidage pratique pour examen à distance

    Répondre en JSON avec structure AIAssistedQuestion.
    `
    
    const aiResponse = await this.callOpenAI(aiPrompt)
    return this.parseAIResponse(aiResponse)
  }

  private async analyzePatientDiscourse(transcript: string): Promise<DiscourseAnalysis> {
    return {
      emotional_state: this.detectEmotionalMarkers(transcript),
      education_level: this.estimateEducationLevel(transcript),
      language_preference: this.detectLanguagePreference(transcript),
      key_symptoms_mentioned: this.extractSymptoms(transcript),
      temporal_elements: this.extractTimeline(transcript),
      concerning_elements: this.detectRedFlagMarkers(transcript),
      cultural_references: this.detectCulturalContext(transcript)
    }
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
  
  // Méthode appelée en temps réel pendant consultation
  async onPatientSpeak(
    spoken_text: string,
    physician_notes: string,
    vital_signs?: any
  ): Promise<{
    immediate_suggestions: AIAssistedQuestion[],
    background_analysis: any,
    red_flags_detected: string[]
  }> {
    
    // Ajout à transcript
    this.consultation_transcript.push(spoken_text)
    
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
    
    return {
      immediate_suggestions,
      background_analysis: analysis,
      red_flags_detected: red_flags
    }
  }

  // Interface médecin - suggestions en sidebar
  renderPhysicianInterface(): JSX.Element {
    return (
      <div className="ai-assistant-sidebar">
        <h3>🤖 Assistant IA Téléconsultation</h3>
        
        {/* Suggestions immédiates */}
        <div className="immediate-suggestions">
          <h4>💡 Suggestions maintenant :</h4>
          {this.ai_suggestions.map(suggestion => (
            <div key={suggestion.id} className="suggestion-card">
              <div className="physician-prompt">
                {suggestion.physician_prompt}
              </div>
              <div className="patient-formulations">
                <select>
                  <option value="simple">{suggestion.patient_formulations.simple}</option>
                  <option value="standard">{suggestion.patient_formulations.standard}</option>
                  <option value="technical">{suggestion.patient_formulations.technical}</option>
                </select>
              </div>
              {suggestion.physical_guidance && (
                <div className="physical-guidance">
                  <strong>Guidage examen :</strong>
                  <p>{suggestion.physical_guidance.instruction_patient}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Analyse contextuelle */}
        <div className="context-analysis">
          <h4>📊 Analyse IA :</h4>
          <ul>
            <li>Symptômes détectés : {this.consultation_context.symptoms_detected.join(', ')}</li>
            <li>Phase consultation : {this.consultation_context.consultation_phase}</li>
            <li>Red flags potentiels : {this.consultation_context.red_flags_potential.join(', ')}</li>
          </ul>
        </div>
        
        {/* Suggestions Maurice spécifiques */}
        <div className="maurice-specific">
          <h4>🏝️ Contexte Maurice :</h4>
          <p>Épidémiologie actuelle, adaptations culturelles, risques saisonniers</p>
        </div>
      </div>
    )
  }
}

// =============== API ENDPOINT TEMPS RÉEL ===============

export async function POST(request: NextRequest) {
  try {
    const { 
      consultation_id,
      patient_discourse_real_time,
      physician_notes,
      consultation_phase,
      maurice_context 
    } = await request.json()

    const aiAssistant = new TeleconsultationAIAssistant()
    
    // Génération suggestions IA contextuelle
    const suggestions = await aiAssistant.generateContextualQuestions({
      consultation_phase,
      patient_discourse: [patient_discourse_real_time],
      symptoms_detected: extractSymptomsFromDiscourse(patient_discourse_real_time),
      maurice_specific_risks: maurice_context.current_epidemiology,
      consultation_duration: Date.now() - maurice_context.start_time
    }, patient_discourse_real_time, physician_notes)

    return NextResponse.json({
      success: true,
      ai_suggestions: suggestions,
      real_time_analysis: {
        emotional_state: "detected_from_voice_tone",
        urgency_level: "calculated_from_discourse",
        maurice_adaptation: "cultural_language_medical"
      },
      physician_interface: {
        immediate_actions: suggestions.filter(s => s.timing === 'immediate'),
        background_suggestions: suggestions.filter(s => s.timing !== 'immediate'),
        red_flags_monitoring: "active"
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Erreur assistant IA téléconsultation",
      fallback: "Mode manuel médecin"
    }, { status: 500 })
  }
}
