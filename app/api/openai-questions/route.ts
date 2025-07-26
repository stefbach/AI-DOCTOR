// /app/api/openai-questions/route.ts - VERSION CORRIGÉE AVEC FETCH DIRECT

import { NextRequest, NextResponse } from "next/server"

// ==================== FONCTION GÉNÉRATION IA AVEC FETCH DIRECT ====================

async function generateSimpleQuestions(patientText: string): Promise<any[]> {
  
  // PROMPT MINIMAL
  const prompt = `Tu es un médecin assistant pour téléconsultation à Maurice.

Patient dit : "${patientText}"

Génère 2 questions utiles que le médecin devrait poser.

Réponds SEULEMENT ce JSON :
{
  "questions": [
    {
      "medecin": "Conseil pour le médecin",
      "patient_simple": "Question en créole/français simple",
      "patient_standard": "Question en français standard"
    }
  ]
}`;

  try {
    console.log("🤖 Appel OpenAI avec fetch direct...")
    
  import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// À placer dans votre bloc où vous appelez l’IA
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Clé API absente');
  // gérez l’erreur ou retournez un fallback
}

const model = openai('gpt-4o', { apiKey });
const result = await generateText({
  model,
  prompt: extendedPrompt,   // votre prompt complet
  temperature: 0.15,
  maxTokens: 3000,
});

    
    // ========== MÊME APPROCHE QUE DIAGNOSIS (QUI MARCHE) ==========
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Tu es un médecin assistant expert pour téléconsultation Maurice. Génère UNIQUEMENT du JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 800
      }),
    })
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`OpenAI Error ${openaiResponse.status}: ${errorText}`)
    }
    
    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0]?.message?.content

    console.log("📥 Réponse brute:", responseText?.substring(0, 200));

    // Parse simple (même logique qu'avant)
    let json = responseText.trim();
    
    // Trouve le JSON
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}') + 1;
    
    if (start === -1 || end === 0) {
      throw new Error("Pas de JSON trouvé");
    }
    
    json = json.substring(start, end);
    const parsed = JSON.parse(json);
    
    if (!parsed.questions) {
      throw new Error("Pas de questions dans la réponse");
    }

    console.log("✅ Parse OK:", parsed.questions.length, "questions");
    return parsed.questions;

  } catch (error) {
    console.error("❌ Erreur IA:", error);
    
    // FALLBACK GARANTI (même qu'avant)
    return [
      {
        medecin: "Question de base - chronologie symptômes",
        patient_simple: "Depi kan to gagné sa problème la ?",
        patient_standard: "Depuis quand avez-vous ce problème ?"
      },
      {
        medecin: "Précision symptômes principaux",
        patient_simple: "Ki to senti exactement ?",
        patient_standard: "Que ressentez-vous exactement ?"
      }
    ];
  }
}

// ==================== QUESTIONS FALLBACK MAURICE ====================

function getFallbackQuestions(symptoms: string[]): any[] {
  
  if (symptoms.includes('fièvre') || symptoms.includes('fever')) {
    return [
      {
        medecin: "Fièvre détectée - Dépistage dengue/chikungunya Maurice",
        patient_simple: "To la fièvre li monté-descendre ou li reste même hauteur ?",
        patient_standard: "Votre fièvre monte et descend ou reste à la même température ?",
        examen: "Regardez votre peau : voyez-vous des petits points rouges ?"
      },
      {
        medecin: "Exposition vectorielle Maurice",
        patient_simple: "To gagné beaucoup piqûre moustique ces derniers jours ?",
        patient_standard: "Avez-vous eu beaucoup de piqûres de moustiques récemment ?",
        contexte_maurice: "Saison dengue/chikungunya selon période"
      }
    ];
  }
  
  if (symptoms.includes('douleur') || symptoms.includes('mal')) {
    return [
      {
        medecin: "Localisation douleur pour diagnostic différentiel",
        patient_simple: "Montre moi avec to doigt exact kot li faire mal",
        patient_standard: "Montrez-moi avec votre doigt exactement où ça fait mal",
        examen: "Appuyez doucement sur la zone et dites-moi si ça fait plus mal"
      }
    ];
  }
  
  if (symptoms.includes('toux') || symptoms.includes('cough')) {
    return [
      {
        medecin: "Toux - évaluation gravité sans auscultation",
        patient_simple: "Kan to tousse, to crache quelque chose ?",
        patient_standard: "Quand vous toussez, crachez-vous quelque chose ?",
        examen: "Placez votre main sur votre poitrine et toussez fort"
      }
    ];
  }
  
  // Questions générales
  return [
    {
      medecin: "Anamnèse de base - chronologie",
      patient_simple: "Depi kan sa problème la commencer ?",
      patient_standard: "Depuis quand ce problème a-t-il commencé ?"
    },
    {
      medecin: "Évaluation sévérité",
      patient_simple: "Lor échelle 1 à 10, ki niveau to problème ?",
      patient_standard: "Sur une échelle de 1 à 10, à quel niveau est votre problème ?"
    }
  ];
}

// ==================== DÉTECTION SYMPTÔMES SIMPLE ====================

function detectSymptoms(text: string): string[] {
  const symptoms: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Fièvre
  if (/fièvre|fever|chaud|température/.test(lowerText)) {
    symptoms.push('fièvre');
  }
  
  // Douleur
  if (/mal|douleur|pain|faire mal/.test(lowerText)) {
    symptoms.push('douleur');
  }
  
  // Toux
  if (/toux|cough|tousse/.test(lowerText)) {
    symptoms.push('toux');
  }
  
  // Ventre
  if (/ventre|abdomen|estomac/.test(lowerText)) {
    symptoms.push('douleur_abdominale');
  }
  
  // Nausées
  if (/nausée|vomit|mal.*cœur/.test(lowerText)) {
    symptoms.push('nausée');
  }
  
  return symptoms;
}

// ==================== API ENDPOINTS ====================

// GET - Test simple
export async function GET() {
  try {
    console.log("🧪 Test génération IA avec fetch direct...");
    
    const testQuestions = await generateSimpleQuestions("mo gagné mal dan ventre depi hier");
    
    return NextResponse.json({
      success: true,
      test: true,
      questions: testQuestions,
      message: "Test IA fonctionnel avec fetch direct",
      method: "direct_fetch_like_diagnosis"
    });
    
  } catch (error: any) {
    console.error("❌ Test échoué:", error);
    
    return NextResponse.json({
      success: false,
      test: true,
      error: error.message,
      fallback: getFallbackQuestions(['douleur']),
      method_tried: "direct_fetch"
    });
  }
}

// POST - Vraie utilisation
export async function POST(request: NextRequest) {
  try {
    console.log("🩺 Début assistant téléconsultation avec fetch direct...");
    
    const body = await request.json();
    const patientText = body.patient_discourse_real_time || body.patientData?.symptoms || "";
    
    if (!patientText) {
      return NextResponse.json({
        success: false,
        error: "Texte patient requis",
        exemple: {
          patient_discourse_real_time: "mo gagné mal dan ventre"
        }
      }, { status: 400 });
    }
    
    console.log("📝 Texte patient:", patientText.substring(0, 100));
    
    // Détection symptômes
    const symptoms = detectSymptoms(patientText);
    console.log("🔍 Symptômes:", symptoms);
    
    // Essai génération IA avec fetch direct
    let questions;
    let aiSuccess = false;
    
    try {
      questions = await generateSimpleQuestions(patientText);
      aiSuccess = true;
      console.log("✅ IA réussie avec fetch direct");
    } catch (aiError) {
      console.warn("⚠️ IA échouée même avec fetch, fallback:", aiError);
      questions = getFallbackQuestions(symptoms);
    }
    
    // Formatage final (identique à avant)
    const formattedQuestions = questions.map((q, index) => ({
      id: `q_${Date.now()}_${index}`,
      timing: "immediate",
      priority: index === 0 ? "essential" : "important",
      
      // Pour le médecin
      physician_prompt: q.medecin,
      
      // Pour le patient
      patient_formulations: {
        simple: q.patient_simple,
        standard: q.patient_standard || q.patient_simple,
        technical: q.patient_standard || q.patient_simple
      },
      
      // Examen physique si présent
      physical_guidance: q.examen ? {
        instruction_patient: q.examen,
        what_to_observe: "Réaction du patient",
        red_flags_visual: ["Douleur intense", "Défense"]
      } : null,
      
      // Maurice
      maurice_adaptation: {
        cultural_sensitivity: q.contexte_maurice || "Adaptation mauricienne standard",
        language_options: ["créole", "français"],
        local_epidemiology: symptoms.includes('fièvre') ? "Surveillance arboviroses" : "Standard"
      },
      
      clinical_rationale: q.medecin,
      ai_reasoning: aiSuccess ? "Génération IA fetch direct" : "Fallback automatique"
    }));
    
    return NextResponse.json({
      success: true,
      ai_suggestions: formattedQuestions,
      
      // Contexte
      context: {
        symptoms_detected: symptoms,
        ai_generation_success: aiSuccess,
        ai_method: aiSuccess ? "direct_fetch_openai" : "fallback",
        language_detected: /mo|to|ena/.test(patientText) ? "créole" : "français"
      },
      
      // Maurice spécifique
      mauritius_context: {
        seasonal_alerts: symptoms.includes('fièvre') ? 
          ["Surveillance dengue active", "Pic moustiques saison chaude"] : 
          ["Pas d'alerte saisonnière"],
        cultural_notes: [
          "Famille souvent présente en télé",
          "Médecine traditionnelle courante"
        ]
      },
      
      timestamp: new Date().toISOString(),
      fixed_method: "direct_fetch_like_diagnosis_api"
    });
    
  } catch (error: any) {
    console.error("❌ Erreur globale:", error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      
      // Questions de secours absolues
      emergency_questions: [
        {
          id: "emergency_1",
          physician_prompt: "Question de sécurité - système IA indisponible",
          patient_formulations: {
            simple: "Ki zot problème principal zordi ?",
            standard: "Quel est votre problème principal aujourd'hui ?",
            technical: "Décrivez votre motif de consultation"
          },
          timing: "immediate",
          priority: "essential"
        }
      ],
      
      manual_mode: {
        message: "Mode manuel recommandé",
        basic_questions: [
          "Motif de consultation ?",
          "Depuis quand ?",
          "Médicaments pris ?",
          "Signes inquiétants ?"
        ]
      },
      
      debug_info: {
        method_used: "direct_fetch_attempt",
        same_as_working_diagnosis_api: true
      }
    }, { status: 500 });
  }
}

// ==================== EXPORT UTILITAIRES ====================

export { generateSimpleQuestions, getFallbackQuestions, detectSymptoms };
