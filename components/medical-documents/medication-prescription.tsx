"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Pill, User, Calendar, AlertTriangle, Shield } from "lucide-react"

interface MedicationPrescriptionProps {
  patientData: any
  clinicalData: any
  prescriptionData: any
  enhancedResults: any
}

export default function MedicationPrescription({
  patientData,
  clinicalData,
  prescriptionData,
  enhancedResults,
}: MedicationPrescriptionProps) {
  const currentDate = new Date().toLocaleDateString("fr-FR")

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* En-tête officielle */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ORDONNANCE MÉDICALE</h1>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-4">
          <div className="text-left">
            <div className="font-semibold">Dr. Médecin Expert</div>
            <div>Médecine Générale</div>
            <div>N° RPPS: 12345678901</div>
            <div>123 Rue de la Santé</div>
            <div>75000 Paris</div>
            <div>Tél: 01.23.45.67.89</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">PRESCRIPTION</div>
            <div>Date: {currentDate}</div>
          </div>
          <div className="text-right">
            <div>Secteur 1</div>
            <div>Conventionné</div>
          </div>
        </div>
      </div>

      {/* Informations Patient */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nom:</strong> {patientData.name || "Non renseigné"}
            </div>
            <div>
              <strong>Âge:</strong> {patientData.age || "Non renseigné"} ans
            </div>
            <div>
              <strong>Genre:</strong>{" "}
              {patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Non renseigné"}
            </div>
            <div>
              <strong>Poids:</strong> {patientData.weight || "Non renseigné"} kg
            </div>
            <div>
              <strong>N° Sécurité Sociale:</strong> ***************
            </div>
            <div>
              <strong>Assurance:</strong> {patientData.insurance || "Non renseignée"}
            </div>
          </div>
          {patientData.allergies && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <strong>ALLERGIES:</strong> {patientData.allergies}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostic */}
      {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0] && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Diagnostic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div>
                <strong>Diagnostic principal:</strong>{" "}
                {enhancedResults.diagnostic_analysis.differential_diagnoses[0].diagnosis}
              </div>
              {enhancedResults.diagnostic_analysis.differential_diagnoses[0].icd10 && (
                <div>
                  <strong>Code CIM-10:</strong> {enhancedResults.diagnostic_analysis.differential_diagnoses[0].icd10}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Médicaments Prescrits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Pill className="h-5 w-5 mr-2 text-green-600" />
            Médicaments Prescrits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptionData?.prescription?.medications ? (
            <div className="space-y-6">
              {prescriptionData.prescription.medications.map((med: any, index: number) => (
                <div key={index} className="border-2 border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{med.name}</h4>
                      {med.brand_name && <div className="text-sm text-gray-600">({med.brand_name})</div>}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {med.form || "Forme non spécifiée"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div>
                        <strong>Dosage:</strong> {med.strength || "Non spécifié"}
                      </div>
                      <div>
                        <strong>Posologie:</strong> {med.dosage || "Selon prescription"}
                      </div>
                      <div>
                        <strong>Durée:</strong> {med.duration || "Non spécifiée"}
                      </div>
                      <div>
                        <strong>Quantité:</strong> {med.quantity || "Selon durée"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <strong>Indication:</strong> {med.indication || "Selon diagnostic"}
                      </div>
                      <div>
                        <strong>Instructions:</strong> {med.instructions || "Suivre la posologie"}
                      </div>
                      {med.monitoring && (
                        <div className="text-blue-600">
                          <strong>Surveillance:</strong> {med.monitoring}
                        </div>
                      )}
                    </div>
                  </div>

                  {(med.contraindications?.length > 0 || med.side_effects?.length > 0) && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                      {med.contraindications?.length > 0 && (
                        <div className="mb-2">
                          <strong className="text-red-600">Contre-indications:</strong>
                          <ul className="list-disc list-inside text-red-600 text-xs mt-1">
                            {med.contraindications.map((ci: string, idx: number) => (
                              <li key={idx}>{ci}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {med.side_effects?.length > 0 && (
                        <div>
                          <strong className="text-orange-600">Effets secondaires possibles:</strong>
                          <ul className="list-disc list-inside text-orange-600 text-xs mt-1">
                            {med.side_effects.map((se: string, idx: number) => (
                              <li key={idx}>{se}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="my-3" />

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div>□ Non substituable</div>
                    <div>□ Renouvellement: ___ fois</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun médicament prescrit</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions de Suivi */}
      {prescriptionData?.prescription?.follow_up && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Instructions de Suivi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-3">
              {prescriptionData.prescription.follow_up.next_visit && (
                <div>
                  <strong>Prochain rendez-vous:</strong> {prescriptionData.prescription.follow_up.next_visit}
                </div>
              )}

              {prescriptionData.prescription.follow_up.monitoring?.length > 0 && (
                <div>
                  <strong className="text-blue-600">Surveillance requise:</strong>
                  <ul className="list-disc list-inside mt-1 text-blue-600">
                    {prescriptionData.prescription.follow_up.monitoring.map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {prescriptionData.prescription.follow_up.warning_signs?.length > 0 && (
                <div>
                  <strong className="text-red-600">Signes d'alarme - Consulter immédiatement:</strong>
                  <ul className="list-disc list-inside mt-1 text-red-600">
                    {prescriptionData.prescription.follow_up.warning_signs.map((sign: string, index: number) => (
                      <li key={index}>{sign}</li>
                    ))}
                  </ul>
                </div>
              )}

              {prescriptionData.prescription.follow_up.lifestyle_advice?.length > 0 && (
                <div>
                  <strong className="text-green-600">Conseils hygiéno-diététiques:</strong>
                  <ul className="list-disc list-inside mt-1 text-green-600">
                    {prescriptionData.prescription.follow_up.lifestyle_advice.map((advice: string, index: number) => (
                      <li key={index}>{advice}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Considérations de Sécurité */}
      {prescriptionData?.safety_considerations && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-orange-600" />
              Considérations de Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm p-3 bg-orange-50 border border-orange-200 rounded">
              {prescriptionData.safety_considerations}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pied de page avec signature */}
      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between items-end">
          <div className="text-sm text-gray-600">
            <div>Ordonnance établie le {currentDate}</div>
            <div>Validité: 3 mois (1 an pour les affections longue durée)</div>
            <div className="mt-2 text-xs">En cas d'urgence: 15 (SAMU) - Centre antipoison: 01.40.05.48.48</div>
          </div>
          <div className="text-right">
            <div className="border-t pt-4 w-64">
              <div className="text-sm font-semibold">Dr. Médecin Expert</div>
              <div className="text-xs text-gray-600 mt-1">Signature et cachet du médecin</div>
              <div className="h-16 border border-dashed border-gray-300 mt-2 rounded flex items-center justify-center text-xs text-gray-400">
                Zone de signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
