// app/test-documents/page.tsx
"use client"

import { useState } from 'react'
import { MauritianDocumentsGenerator } from '@/lib/mauritian-documents-generator'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TestDocumentsPage() {
  const [documents, setDocuments] = useState<any>(null)

  // Example complete diagnosis data
  const mockDiagnosisData = {
    diagnosis: {
      primary: {
        condition: "Angine de poitrine stable",
        confidence: 85,
        reasoning: "Douleur thoracique typique à l'effort, facteurs de risque cardiovasculaire présents"
      },
      differential: [
        { condition: "Reflux gastro-œsophagien", confidence: 60, reasoning: "Possible composante digestive" },
        { condition: "Anxiété", confidence: 40, reasoning: "Contexte de stress" }
      ]
    },
    treatmentPlan: {
      medications: [
        {
          name: "Aspirine",
          dosage: "100mg",
          frequency: "1 fois par jour",
          duration: "Au long cours",
          indication: "Antiagrégant plaquettaire"
        },
        {
          name: "Aténolol",
          dosage: "50mg",
          frequency: "1 fois par jour",
          duration: "Au long cours",
          indication: "Bêtabloquant cardiosélectif"
        },
        {
          name: "Trinitrine sublinguale",
          dosage: "0.3mg",
          frequency: "Si douleur thoracique",
          duration: "À la demande",
          indication: "Crise angineuse"
        }
      ],
      recommendations: [
        "Repos relatif pendant 48h",
        "Éviter efforts intenses",
        "Régime pauvre en graisses saturées",
        "Arrêt tabac impératif",
        "Activité physique progressive après amélioration"
      ]
    },
    suggestedExams: {
      lab: [
        {
          name: "Troponine I ultrasensible",
          indication: "Éliminer syndrome coronarien aigu",
          urgency: "URGENT - Dans l'heure"
        },
        {
          name: "NFS, CRP",
          indication: "Bilan inflammatoire",
          urgency: "Dans les 24h"
        },
        {
          name: "Bilan lipidique complet",
          indication: "Évaluation risque cardiovasculaire",
          urgency: "À jeun, dans la semaine"
        },
        {
          name: "TSH",
          indication: "Dépistage dysthyroïdie",
          urgency: "Dans la semaine"
        }
      ],
      imaging: [
        {
          name: "ECG 12 dérivations",
          indication: "Recherche ischémie myocardique",
          urgency: "IMMÉDIAT"
        },
        {
          name: "Radiographie thoracique",
          indication: "Éliminer pathologie pulmonaire",
          urgency: "Dans les 24h"
        },
        {
          name: "Échocardiographie transthoracique",
          indication: "Évaluation fonction ventriculaire",
          urgency: "Dans la semaine"
        },
        {
          name: "Test d'effort",
          indication: "Recherche ischémie d'effort",
          urgency: "Après stabilisation, dans les 15 jours"
        }
      ]
    },
    redFlags: [
      "Douleur thoracique au repos ou prolongée > 20 min",
      "Dyspnée brutale",
      "Syncope ou malaise",
      "Palpitations prolongées"
    ],
    monitoring: [
      "Surveillance TA quotidienne",
      "Carnet de suivi des douleurs",
      "Poids hebdomadaire"
    ],
    followUp: {
      nextVisit: "Dans 1 semaine",
      frequency: "Mensuelle après stabilisation"
    }
  }

  const mockPatientData = {
    firstName: "Jean",
    lastName: "Dupont",
    age: "55",
    gender: ["Masculin"],
    weight: "85",
    height: "175",
    allergies: ["Pénicilline"],
    address: "123 Rue des Flamboyants, Curepipe",
    phone: "+230 5123 4567"
  }

  const mockDoctorInfo = {
    fullName: "Dr. Marie LAURENT",
    specialty: "Médecine générale",
    address: "Centre Médical Phoenix, Route Royale",
    city: "Vacoas, Maurice",
    phone: "+230 698 1234",
    email: "dr.laurent@medical.mu",
    registrationNumber: "Medical Council of Mauritius - Reg. No. 2024/1234"
  }

  const mockConsultationData = {
    consultationData: {
      patientInfo: {
        ...mockPatientData,
        name: `${mockPatientData.firstName} ${mockPatientData.lastName}`
      },
      chiefComplaint: "Douleur thoracique à l'effort",
      diseaseHistory: "Patient de 55 ans présentant des douleurs thoraciques constrictives lors des efforts depuis 2 semaines",
      symptoms: ["Douleur thoracique", "Essoufflement à l'effort", "Fatigue"],
      vitalSigns: {
        temperature: "36.8",
        bloodPressureSystolic: "145",
        bloodPressureDiastolic: "90"
      }
    }
  }

  const generateDocuments = () => {
    const generatedDocs = MauritianDocumentsGenerator.generateMauritianDocuments(
      mockConsultationData,
      mockDoctorInfo,
      mockPatientData,
      mockDiagnosisData
    )
    
    setDocuments(generatedDocs)
    console.log('Generated documents:', generatedDocs)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              🧪 Test de Génération des Documents Mauriciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Button onClick={generateDocuments} size="lg" className="mb-4">
                Générer les 4 Documents
              </Button>
              <p className="text-sm text-gray-600">
                Cliquez pour générer les ordonnances basées sur le diagnostic d'angine de poitrine
              </p>
            </div>
          </CardContent>
        </Card>

        {documents && (
          <Card>
            <CardHeader>
              <CardTitle>Documents Générés</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="consultation">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="consultation">Consultation</TabsTrigger>
                  <TabsTrigger value="biology">Biologie</TabsTrigger>
                  <TabsTrigger value="paraclinical">Paraclinique</TabsTrigger>
                  <TabsTrigger value="medication">Médicaments</TabsTrigger>
                </TabsList>

                <TabsContent value="consultation">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4">Compte-rendu de Consultation</h3>
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(documents.consultation, null, 2)}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="biology">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4">Ordonnance Examens Biologiques</h3>
                    <div className="space-y-4">
                      {documents.biology.prescriptions.map((p: any, i: number) => (
                        <div key={i} className="border p-4 rounded">
                          <h4 className="font-semibold">{p.exam}</h4>
                          <p className="text-sm">Indication: {p.indication}</p>
                          <p className="text-sm">Urgence: <span className="font-semibold text-red-600">{p.urgency}</span></p>
                          <p className="text-sm">Jeûne: {p.fasting}</p>
                          <p className="text-sm">Disponibilité: {p.mauritianAvailability}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="paraclinical">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4">Ordonnance Examens Paracliniques</h3>
                    <div className="space-y-4">
                      {documents.paraclinical.prescriptions.map((p: any, i: number) => (
                        <div key={i} className="border p-4 rounded">
                          <h4 className="font-semibold">{p.exam}</h4>
                          <p className="text-sm">Catégorie: {p.category}</p>
                          <p className="text-sm">Indication: {p.indication}</p>
                          <p className="text-sm">Urgence: <span className="font-semibold text-orange-600">{p.urgency}</span></p>
                          <p className="text-sm">Préparation: {p.preparation}</p>
                          <p className="text-sm">Centres: {p.mauritianAvailability}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="medication">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4">Ordonnance Médicamenteuse</h3>
                    <div className="space-y-4">
                      {documents.medication.prescriptions.map((p: any, i: number) => (
                        <div key={i} className="border p-4 rounded">
                          <h4 className="font-semibold">{p.dci}</h4>
                          <p className="text-sm">Marque: {p.brand}</p>
                          <p className="text-sm">Classe: {p.class}</p>
                          <p className="text-sm">Dosage: {p.dosage} - {p.frequency}</p>
                          <p className="text-sm">Durée: {p.duration}</p>
                          <p className="text-sm">Quantité: {p.totalQuantity}</p>
                          <p className="text-sm">Instructions: {p.specialInstructions}</p>
                        </div>
                      ))}
                      
                      <div className="mt-4 p-4 bg-blue-50 rounded">
                        <h4 className="font-semibold text-blue-800">Conseils cliniques:</h4>
                        <ul className="text-sm space-y-1 mt-2">
                          <li>• {documents.medication.clinicalAdvice.hydration}</li>
                          <li>• {documents.medication.clinicalAdvice.activity}</li>
                          <li>• {documents.medication.clinicalAdvice.diet}</li>
                          <li>• {documents.medication.clinicalAdvice.followUp}</li>
                          <li className="text-red-600 font-semibold">• {documents.medication.clinicalAdvice.emergency}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Diagnosis data display */}
        <Card>
          <CardHeader>
            <CardTitle>Données de Diagnostic Utilisées</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(mockDiagnosisData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
