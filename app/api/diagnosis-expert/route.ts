import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔍 === DEBUG DIAGNOSIS EXPERT ===")
  
  try {
    // Test 1: Variables d'environnement
    console.log("1️⃣ Test variables d'environnement:")
    console.log("   OPENAI_API_KEY présente:", !!process.env.OPENAI_API_KEY)
    console.log("   OPENAI_API_KEY longueur:", process.env.OPENAI_API_KEY?.length || 0)
    console.log("   OPENAI_API_KEY début:", process.env.OPENAI_API_KEY?.substring(0, 20) || "MANQUANTE")
    
    // Test 2: Parsing de la requête
    console.log("2️⃣ Test parsing requête:")
    const requestBody = await request.json()
    console.log("   Données reçues:", Object.keys(requestBody))
    console.log("   PatientData présent:", !!requestBody.patientData)
    console.log("   ClinicalData présent:", !!requestBody.clinicalData)
    
    const { patientData, clinicalData, questionsData } = requestBody

    if (!patientData || !clinicalData) {
      console.log("❌ Données manquantes")
      return NextResponse.json({ 
        success: false, 
        error: "Données patient ou cliniques manquantes" 
      }, { status: 400 })
    }
    
    // Test 3: Import OpenAI
    console.log("3️⃣ Test import OpenAI:")
    try {
      const { generateText } = await import("ai")
      const { openai } = await import("@ai-sdk/openai")
      console.log("   ✅ Imports OpenAI réussis")
      
      // Test 4: Connexion OpenAI simple
      console.log("4️⃣ Test connexion OpenAI:")
      const simpleTest = await generateText({
        model: openai("gpt-4o-mini"), // Modèle moins cher pour test
        prompt: "Dis juste 'OK'",
        maxTokens: 5,
      })
      console.log("   ✅ Test OpenAI réussi:", simpleTest.text)
      
      // Test 5: Diagnostic simple
      console.log("5️⃣ Test diagnostic simple:")
      const simpleDiagnostic = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `
Patient: ${patientData.firstName || "Test"}, ${patientData.age || 30} ans
Symptômes: ${(clinicalData.symptoms || ["fatigue"]).join(", ")}

Réponds avec ce JSON simple:
{
  "diagnostic": "Diagnostic médical simple basé sur les symptômes",
  "probabilite": 75,
  "description": "Description du diagnostic en 2-3 phrases"
}
        `,
        maxTokens: 200,
        temperature: 0.1,
      })
      
      console.log("   ✅ Diagnostic simple généré")
      console.log("   📝 Réponse:", simpleDiagnostic.text.substring(0, 200))
      
      // Parser JSON simple
      let result
      try {
        result = JSON.parse(simpleDiagnostic.text.trim())
        console.log("   ✅ JSON parsé avec succès")
      } catch (parseError) {
        console.log("   ⚠️ JSON non parsable, utilisation texte brut")
        result = {
          diagnostic: "Évaluation clinique en cours",
          probabilite: 70,
          description: simpleDiagnostic.text.substring(0, 200)
        }
      }
      
      // Retourner résultat simple mais fonctionnel
      return NextResponse.json({
        success: true,
        diagnosis: {
          primaryDiagnosis: {
            condition: result.diagnostic || "Diagnostic en cours",
            probability: result.probabilite || 70,
            arguments: ["Basé sur les symptômes présentés"],
            severity: "À évaluer"
          },
          clinicalReasoning: {
            semiology: result.description || "Analyse en cours",
            syndromes: ["Syndrome à préciser"],
            pathophysiology: "Mécanismes à élucider"
          },
          recommendedExams: [
            {
              category: "Biologie",
              exam: "Bilan standard",
              indication: "Évaluation générale",
              urgency: "Programmée"
            }
          ],
          therapeuticStrategy: {
            immediate: [
              {
                type: "Symptomatique",
                treatment: "Selon symptômes",
                indication: "Soulagement",
                duration: "Selon évolution"
              }
            ]
          },
          prognosis: {
            shortTerm: "À évaluer",
            longTerm: "Selon diagnostic final",
            complications: ["À surveiller"],
            followUp: "Réévaluation nécessaire"
          },
          aiConfidence: result.probabilite || 70,
          redFlags: ["Aggravation des symptômes"],
          metadata: {
            analysisDate: new Date().toISOString(),
            model: "gpt-4o-mini-debug",
            evidenceLevel: "Test"
          }
        },
        metadata: {
          debugMode: true,
          patientAge: patientData.age,
          symptomsCount: (clinicalData.symptoms || []).length,
          generatedAt: new Date().toISOString()
        }
      })
      
    } catch (openaiError) {
      console.error("❌ Erreur OpenAI:", openaiError)
      throw new Error(`OpenAI Error: ${openaiError.message}`)
    }
    
  } catch (importError) {
    console.error("❌ Erreur import:", importError)
    throw new Error(`Import Error: ${importError.message}`)
  }
    
  } catch (error) {
    console.error("❌ === ERREUR GLOBALE ===")
    console.error("Type:", error.constructor.name)
    console.error("Message:", error.message)
    console.error("Stack:", error.stack)
    
    return NextResponse.json({
      success: false,
      error: "Erreur de diagnostic",
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
        env: {
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
          keyLength: process.env.OPENAI_API_KEY?.length || 0,
          nodeEnv: process.env.NODE_ENV
        }
      }
    }, { status: 500 })
  }
}

`
