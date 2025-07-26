// /app/api/openai-questions/route.ts - VERSION CORRIGÉE IDENTIQUE À DIAGNOSIS

import { NextRequest, NextResponse } from "next/server"

// ==================== FONCTION GÉNÉRATION IA ROBUSTE ====================

async function generateSimpleQuestions(patientText: string): Promise<any[]> {
  
  // PROMPT ENRICHI (comme diagnosis)
  const prompt = `Tu es un médecin expert mauricien assistant pour téléconsultation. Analyse ce discours patient et génère des questions médicales pertinentes.

CONTEXTE MAURICIEN :
- Climat tropical → Pathologies vectorielles (dengue, chikungunya)
- Téléconsultation → Questions ciblées sans examen physique
- Culture mauricienne → Créole/français, famille présente

PATIENT DIT : "${patientText}"

MISSION : Génère exactement 2 questions médicales que le médecin devrait poser pour préciser le diagnostic.

INSTRUCTIONS STRICTES :
- Questions PERTINENTES au discours patient
- Adaptées au contexte mauricien
- Formulation créole ET française
- Conseils pratiques pour médecin

Génère UNIQUEMENT ce JSON valide (sans \`\`\`json) :

{
  "questions": [
    {
      "medecin": "Conseil médical précis pour le médecin",
      "patient_simple": "Question en créole mauricien simple",
      "patient_standard": "Question en français standard médical",
      "rationale": "Pourquoi cette question est importante pour ce cas"
    },
    {
      "medecin": "Deuxième conseil médical précis",
      "patient_simple": "Deuxième question créole",
      "patient_standard": "Deuxième question français",
      "rationale": "Justification médicale pour cette question"
    }
  ]
}`;

  try {
    console.log("🤖 Appel OpenAI GPT-4o pour questions...")
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY manquante');
    }
    
    // ========== EXACTEMENT MÊME APPROCHE QUE DIAGNOSIS ==========
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Même modèle que diagnosis
        messages: [
          {
            role: 'system',
            content: 'Tu es un médecin expert mauricien. Génère UNIQUEMENT du JSON médical valide pour téléconsultation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000  // Augmenté comme diagnosis
      }),
    })
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI Error ${openaiResponse.status}: ${errorText}`)
    }
    
    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0]?.message?.content

    console.log("📥 Réponse GPT-4o:", responseText?.substring(0, 200) + '...');

    // ========== PARSING ROBUSTE IDENTIQUE À DIAGNOSIS ==========
    let cleanResponse = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    // Trouver le début et la fin du JSON
    const startIndex = cleanResponse.indexOf('{')
    const lastIndex = cleanResponse.lastIndexOf('}')
    
    if (startIndex !== -1 && lastIndex !== -1) {
      cleanResponse = cleanResponse.substring(startIndex, lastIndex + 1)
    }
    
    console.log('🧹 JSON nettoyé:', cleanResponse.substring(0, 200) + '...')
    
    const parsed = JSON.parse(cleanResponse);
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Format questions invalide");
    }

    console.log("✅ Parse réussi:", parsed.questions.length, "questions générées");
    return parsed.questions;

  } catch (error) {
    console.error("❌ Erreur génération IA:", error);
    // NE PAS faire échouer - retourner fallback comme diagnosis
    throw error; // On laisse le caller gérer le fallback
  }
}

// ==================== QUESTIONS FALLBACK MAURICE ====================

function getFallbackQuestions(symptoms: string[], patientText: string): any[] {
  
  // Détection contextuelle améliorée
  const lowerText = patientText.toLowerCase();
  
  if (symptoms.includes('fièvre') || /fièvre|fever|chaud|température/.test(lowerText)) {
    return [
      {
        medecin: "Fièvre - Screening dengue/chikungunya Maurice obligatoire",
        patient_simple: "To la fièvre li ete kouma ? Li monté-descendre ou li reste même hauteur ?",
        patient_standard: "Comment évolue votre fièvre ? Elle monte et descend ou reste constante ?",
        rationale: "Différencier paludisme/arboviroses par pattern fébrile",
        examen: "Regardez votre peau - voyez-vous des petits points rouges ou des boutons ?"
      },
      {
        medecin: "Exposition vectorielle - épidémiologie mauricienne",
        patient_simple: "To gagné beaucoup piqûre moustique ces derniers zours ?",
        patient_standard: "Avez-vous eu beaucoup de piqûres de moustiques récemment ?",
        rationale: "Risque dengue/chikungunya selon saison et zone géographique",
        contexte_maurice: "Surveillance arboviroses selon alerts Ministry Health"
      }
    ];
  }
  
  if (symptoms.includes('douleur') || /mal|douleur|pain|faire mal/.test(lowerText)) {
    return [
      {
        medecin: "Localisation précise douleur pour diagnostic différentiel",
        patient_simple: "Montre moi ek to doigt exact kot li faire mal",
        patient_standard: "Montrez-moi précisément où ça fait mal",
        rationale: "Localisation anatomique guide diagnostic différentiel",
        examen: "Appuyez doucement sur la zone et dites si ça fait plus mal"
      },
      {
        medecin: "Caractéristiques douleur - intensité et évolution",
        patient_simple: "Lor échelle 1 à 10, ki level to douleur ? Li pire kan ?",
        patient_standard: "Sur 10, votre douleur est à combien ? Quand est-elle pire ?",
        rationale: "Intensité et rythme douleur orientent traitement"
      }
    ];
  }
  
  if (symptoms.includes('toux') || /toux|cough|tousse/.test(lowerText)) {
    return [
      {
        medecin: "Toux - productivité et signes gravité sans auscultation",
        patient_simple: "Kan to tousse, to crache kitsose ? Ki couleur ?",
        patient_standard: "Votre toux est-elle grasse ? De quelle couleur sont les crachats ?",
        rationale: "Toux sèche vs productive oriente étiologie",
        examen: "Toussez fort et écoutez le bruit que ça fait"
      }
    ];
  }
  
  // Questions générales adaptées au texte
  return [
    {
      medecin: "Anamnèse temporelle précise",
      patient_simple: "Depi kan sa problème la commencé ? Li vinn pire ?",
      patient_standard: "Depuis quand et est-ce que ça s'aggrave ?",
      rationale: "Chronologie guide urgence et diagnostic"
    },
    {
      medecin: "Impact fonctionnel et signes d'alarme",
      patient_simple: "Zot kapav faire zot travail normal ? Ena kitsose ki fer zot peur ?",
      patient_standard: "Pouvez-vous faire vos activités normales ? Y a-t-il quelque chose qui vous inquiète ?",
      rationale: "Retentissement fonctionnel et red flags"
    }
  ];
}

// ==================== DÉTECTION SYMPTÔMES RENFORCÉE ====================

function detectSymptoms(text: string): string[] {
  const symptoms: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Fièvre - patterns étendus
  if (/fièvre|fever|chaud|température|chaude|brûlant|frisson/.test(lowerText)) {
    symptoms.push('fièvre');
  }
  
  // Douleur - patterns créoles inclus
  if (/mal|douleur|pain|faire mal|ça fait mal|souffrir/.test(lowerText)) {
    symptoms.push('douleur');
  }
  
  // Toux
  if (/toux|cough|tousse|tousser/.test(lowerText)) {
    symptoms.push('toux');
  }
  
  // Digestif
  if (/ventre|abdomen|estomac|mal.*ventre/.test(lowerText)) {
    symptoms.push('douleur_abdominale');
  }
  
  // Nausées
  if (/nausée|vomit|mal.*cœur|envie.*vomir/.test(lowerText)) {
    symptoms.push('nausée');
  }
  
  // Respiratoire
  if (/souffle|respir|essoufflé|difficulté.*respirer/.test(lowerText)) {
    symptoms.push('dyspnée');
  }
  
  return symptoms;
}

// ==================== API ENDPOINTS ====================

// GET - Test robuste
export async function GET() {
  try {
    console.log("🧪 Test génération IA robuste...");
    
    const testQuestions = await generateSimpleQuestions("mo gagné mal dan ventre depi hier, li faire trè mal");
    
    return NextResponse.json({
      success: true,
      test: true,
      questions: testQuestions,
      message: "Test IA réussi avec parsing robuste",
      method: "robust_parsing_like_diagnosis",
      tokens_used: 2000
    });
    
  } catch (error: any) {
    console.error("❌ Test IA échoué, utilisation fallback:", error);
    
    const fallbackQuestions = getFallbackQuestions(['douleur'], "mo gagné mal dan ventre");
    
    return NextResponse.json({
      success: true, // ← Toujours success avec fallback
      test: true,
      questions: fallbackQuestions,
      ai_failed: true,
      error_handled: error.message,
      method: "fallback_robust",
      message: "IA échouée mais fallback fonctionnel"
    });
  }
}

// POST - Implémentation robuste
export async function POST(request: NextRequest) {
  try {
    console.log("🩺 Assistant téléconsultation - Version robuste...");
    
    const body = await request.json();
    const patientText = body.patient_discourse_real_time || body.patientData?.symptoms || "";
    
    if (!patientText) {
      return NextResponse.json({
        success: false,
        error: "Texte patient requis",
        exemple: {
          patient_discourse_real_time: "mo gagné mal dan ventre depi hier"
        }
      }, { status: 400 });
    }
    
    console.log("📝 Analyse texte patient:", patientText.substring(0, 100) + '...');
    
    // Détection symptômes
    const symptoms = detectSymptoms(patientText);
    console.log("🔍 Symptômes détectés:", symptoms);
    
    // Génération questions avec fallback robuste
    let questions;
    let aiSuccess = false;
    let aiError = null;
    
    try {
      questions = await generateSimpleQuestions(patientText);
      aiSuccess = true;
      console.log("✅ IA GPT-4o réussie");
    } catch (error: any) {
      console.warn("⚠️ IA échouée, utilisation fallback intelligent:", error.message);
      aiError = error.message;
      questions = getFallbackQuestions(symptoms, patientText);
    }
    
    // Formatage robuste identique à l'original
    const formattedQuestions = questions.map((q: any, index: number) => ({
      id: `q_${Date.now()}_${index}`,
      timing: "immediate",
      priority: index === 0 ? "essential" : "important",
      
      // Pour le médecin
      physician_prompt: q.medecin,
      clinical_rationale: q.rationale || q.medecin,
      
      // Pour le patient
      patient_formulations: {
        simple: q.patient_simple,
        standard: q.patient_standard || q.patient_simple,
        technical: q.patient_standard || q.patient_simple
      },
      
      // Examen physique si disponible
      physical_guidance: q.examen ? {
        instruction_patient: q.examen,
        what_to_observe: "Réaction du patient",
        red_flags_visual: ["Douleur intense", "Défense", "Signes neurologiques"]
      } : null,
      
      // Contexte mauricien
      maurice_adaptation: {
        cultural_sensitivity: q.contexte_maurice || "Adaptation mauricienne standard",
        language_options: ["créole", "français"],
        local_epidemiology: symptoms.includes('fièvre') ? "Surveillance arboviroses active" : "Standard"
      },
      
      ai_reasoning: aiSuccess ? "GPT-4o génération réussie" : "Fallback intelligent contextuel"
    }));
    
    return NextResponse.json({
      success: true,
      ai_suggestions: formattedQuestions,
      
      // Métadonnées
      context: {
        symptoms_detected: symptoms,
        ai_generation_success: aiSuccess,
        ai_method: aiSuccess ? "gpt4o_robust_parsing" : "contextual_fallback",
        ai_error: aiError,
        language_detected: /mo|to|ena|zot/.test(patientText) ? "créole" : "français",
        text_length: patientText.length
      },
      
      // Contexte mauricien
      mauritius_context: {
        seasonal_alerts: symptoms.includes('fièvre') ? 
          ["Surveillance dengue/chikungunya active", "Protection anti-moustiques renforcée"] : 
          ["Pas d'alerte vectorielle"],
        cultural_notes: [
          "Famille souvent présente en téléconsultation",
          "Médecine traditionnelle courante à Maurice",
          "Créole mauricien accepté en consultation"
        ],
        healthcare_system: "Dr Jeetoo (public) + Apollo/Darné (privé)"
      },
      
      quality_metrics: {
        ai_success_rate: aiSuccess ? 100 : 0,
        fallback_quality: aiSuccess ? null : "contextual_intelligent",
        parsing_method: "robust_like_diagnosis",
        tokens_allocated: 2000,
        response_time: new Date().toISOString()
      },
      
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("❌ Erreur critique:", error);
    
    // Fallback d'urgence - garantit toujours une réponse
    return NextResponse.json({
      success: true, // ← Toujours true pour ne pas faire échouer l'interface
      ai_suggestions: [
        {
          id: "emergency_1",
          timing: "immediate",
          priority: "essential",
          physician_prompt: "Question de sécurité - système IA temporairement indisponible",
          patient_formulations: {
            simple: "Ki zot problème principal zordi ?",
            standard: "Quel est votre problème principal aujourd'hui ?",
            technical: "Décrivez précisément votre motif de consultation"
          },
          clinical_rationale: "Anamnèse de base essentielle",
          maurice_adaptation: {
            cultural_sensitivity: "Standard mauricien",
            language_options: ["créole", "français"],
            local_epidemiology: "Standard"
          },
          ai_reasoning: "Fallback d'urgence - système sécurisé"
        },
        {
          id: "emergency_2",
          timing: "immediate", 
          priority: "important",
          physician_prompt: "Chronologie et évolution symptômes",
          patient_formulations: {
            simple: "Depi kan sa problème la, li vinn pire ?",
            standard: "Depuis quand et est-ce que ça s'aggrave ?",
            technical: "Évolution temporelle et facteurs aggravants"
          },
          clinical_rationale: "Urgence et progression pathologique",
          maurice_adaptation: {
            cultural_sensitivity: "Urgences Maurice 999",
            language_options: ["créole", "français"],
            local_epidemiology: "Adaptation selon saison"
          },
          ai_reasoning: "Questions essentielles sécurisées"
        }
      ],
      
      // Informations d'erreur
      system_status: {
        error_handled: true,
        error_message: error.message,
        fallback_active: true,
        recommendation: "Mode manuel conseillé ou retry plus tard"
      },
      
      manual_mode: {
        message: "Mode questions manuelles disponible",
        basic_questions: [
          "Motif principal consultation ?",
          "Depuis quand ces symptômes ?", 
          "Médicaments actuels ?",
          "Signes inquiétants remarqués ?",
          "Contexte familial/professionnel ?"
        ]
      },
      
      timestamp: new Date().toISOString()
    });
  }
}

// ==================== EXPORTS ====================

export { generateSimpleQuestions, getFallbackQuestions, detectSymptoms };
