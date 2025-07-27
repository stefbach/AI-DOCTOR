// app/debug-consultation/page.tsx
"use client"

import DebugConsultationData from '@/components/debug-consultation-data'
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function DebugConsultationPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold mb-6 text-center">
          🔍 Debug - Vérification des Données
        </h1>
        
        <DebugConsultationData />
        
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Cette page affiche toutes les données sauvegardées dans le localStorage</p>
          <p>Utilisez-la pour vérifier que toutes les étapes ont bien enregistré leurs données</p>
        </div>
      </div>
    </div>
  )
}
