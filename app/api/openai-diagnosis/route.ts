// /app/api/openai-diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔥 API ROUTE ACCESSIBLE - DÉBUT')
  
  try {
    console.log('🔥 Tentative de parsing du body...')
    const body = await request.json()
    console.log('🔥 Body parsé avec succès')
    
    console.log('🔥 Vérification OpenAI import...')
    
    // Test import dynamique OpenAI
    let openai
    try {
      const OpenAI = (await import('openai')).default
      console.log('🔥 OpenAI importé avec succès')
      
      console.log('🔥 Vérification API Key...')
      const apiKey = process.env.OPENAI_API_KEY
      console.log('🔥 API Key présente:', !!apiKey)
      
      if (!apiKey) {
        return NextResponse.json({
          error: 'OPENAI_API_KEY manquante',
          success: false
        }, { status: 500 })
      }
      
      openai = new OpenAI({ apiKey })
      console.log('🔥 Client OpenAI créé')
      
    } catch (importError) {
      console.error('❌ Erreur import OpenAI:', importError)
      return NextResponse.json({
        error: 'Problème import OpenAI',
        details: importError.message,
        success: false
      }, { status: 500 })
    }
    
    console.log('🔥 Test appel OpenAI basique...')
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user", 
          content: "Réponds juste: OK"
        }
      ],
      max_tokens: 10,
    })
    
    console.log('🔥 OpenAI a répondu:', completion.choices[0]?.message?.content)
    
    // FALLBACK SIMPLE SANS OPENAI POUR L'INSTANT
    const fallbackDiagnosis = {
      primary: {
        condition: "Test diagnostic - API fonctionnelle",
        icd10: "Z00.0",
        confidence: 95,
        severity: "mild",
        detailedAnalysis: "Test réussi - API route accessible et fonctionnelle",
        clinicalRationale: "Diagnostic de test pour vérifier la connectivité",
        prognosis: "Excellent - système opérationnel"
      },
      differential: [
        {
          condition: "Test alternatif",
          probability: 50,
          rationale: "Alternative de test"
        }
      ]
    }
    
    const fallbackDocuments = {
      consultation: {
        header: {
          title: "TEST - COMPTE-RENDU DE CONSULTATION",
          subtitle: "République de Maurice - Test API",
          date: new Date().toLocaleDateString('fr-FR'),
          physician: "Dr. TEST API"
        },
        patient: {
          firstName: body.patientData?.firstName || "TEST",
          lastName: body.patientData?.lastName || "PATIENT",
          age: `${body.patientData?.age || 30} ans`
        },
        content: {
          chiefComplaint: body.clinicalData?.chiefComplaint || "Test API",
          history: "Test de fonctionnement de l'API",
          examination: "API opérationnelle",
          diagnosis: "Test réussi",
          plan: "Continuer les tests"
        }
      },
      biology: {
        header: {
          title: "TEST - ORDONNANCE BIOLOGIE",
          subtitle: "Test API Maurice"
        },
        prescriptions: [
          {
            exam: "Test NFS",
            indication: "Test API",
            urgency: "Test"
          }
        ]
      },
      paraclinical: {
        header: {
          title: "TEST - ORDONNANCE PARACLINIQUE", 
          subtitle: "Test API Maurice"
        },
        prescriptions: [
          {
            exam: "Test Radio",
            indication: "Test API"
          }
        ]
      },
      medication: {
        header: {
          title: "TEST - ORDONNANCE MÉDICAMENTS",
          subtitle: "Test API Maurice"
        },
        prescriptions: [
          {
            dci: "Test Paracétamol",
            dosage: "Test 1g",
            frequency: "Test 3x/jour",
            duration: "Test 5j"
          }
        ]
      }
    }
    
    console.log('🔥 Génération réponse de test...')
    
    return NextResponse.json({
      success: true,
      diagnosis: fallbackDiagnosis,
      mauritianDocuments: fallbackDocuments,
      debug: {
        message: "API ROUTE FONCTIONNE - Test réussi !",
        timestamp: new Date().toISOString(),
        openaiTest: completion.choices[0]?.message?.content
      }
    })
    
  } catch (error) {
    console.error('❌ ERREUR DANS API ROUTE:', error)
    console.error('❌ Message:', error.message)
    console.error('❌ Stack:', error.stack)
    
    return NextResponse.json({
      error: 'Erreur détectée dans API route',
      details: error.message,
      stack: error.stack?.substring(0, 200),
      success: false
    }, { status: 500 })
  }
}
