import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🧪 TEST ULTRA SIMPLE")
  console.log("🔑 Clé API:", process.env.OPENAI_API_KEY ? "PRÉSENTE" : "MANQUANTE")
  
  try {
    const data = await request.json()
    console.log("📝 Données reçues:", Object.keys(data))
    
    return NextResponse.json({
      success: true,
      diagnosis: {
        primaryDiagnosis: {
          condition: "Test diagnostic fonctionnel",
          probability: 75,
          arguments: ["Test OK"],
          severity: "Test"
        }
      }
    })
    
  } catch (error) {
    console.error("❌ Erreur:", error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
