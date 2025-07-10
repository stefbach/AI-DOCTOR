"use client"

import { Pill, User, Calendar, MapPin, Phone, AlertTriangle, Shield, Clock } from "lucide-react"

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
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const medications = prescriptionData?.prescription?.medications || [
    {
      name: "Paracétamol",
      brand_name: "Doliprane",
      strength: "1000mg",
      form: "Comprimé",
      quantity: "30 comprimés",
      dosage: "1 comprimé 3 fois par jour",
      duration: "7 jours",
      instructions: "À prendre avec un verre d'eau, de préférence après les repas",
      indication: "Douleur et fièvre",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg rounded-lg">
      {/* En-tête officiel */}
      <div className="border-b-2 border-green-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-green-800 mb-2">ORDONNANCE MÉDICALE</h1>
            <p className="text-lg text-gray-600">Prescription de Médicaments</p>
          </div>
          <div className="text-right">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Date de prescription</p>
              <p className="text-lg font-semibold">{currentDate}</p>
              <p className="text-xs text-gray-500 mt-1">N° Ordonnance: ORD-{Date.now().toString().slice(-6)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Informations praticien */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Praticien Prescripteur
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-lg">Dr. Jean MARTIN</p>
            <p className="text-gray-600">Médecin Généraliste</p>
            <p className="text-gray-600">N° RPPS: 12345678901</p>
            <p className="text-gray-600">N° ADELI: 123456789</p>
            <p className="text-gray-600">Conventionné Secteur 1</p>
          </div>
          <div>
            <p className="flex items-center text-gray-600 mb-1">
              <MapPin className="h-4 w-4 mr-1" />
              123 Avenue de la Santé
            </p>
            <p className="text-gray-600 ml-5">75000 Paris</p>
            <p className="flex items-center text-gray-600 mt-2">
              <Phone className="h-4 w-4 mr-1" />
              01 23 45 67 89
            </p>
            <p className="text-gray-600">Email: dr.martin@medical.fr</p>
          </div>
        </div>
      </div>

      {/* Informations patient */}
      <div className="mb-8 border border-blue-200 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Patient
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-lg font-semibold">{patientData.name || "Nom du patient"}</p>
            <p>
              <span className="font-semibold">Né(e) le:</span> {patientData.birthDate || "Date de naissance"}
            </p>
            <p>
              <span className="font-semibold">Âge:</span> {patientData.age || "Non renseigné"} ans
            </p>
            <p>
              <span className="font-semibold">Genre:</span>{" "}
              {patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Non renseigné"}
            </p>
            {patientData.weight && (
              <p>
                <span className="font-semibold">Poids:</span> {patientData.weight} kg
              </p>
            )}
          </div>
          <div>
            {patientData.insurance && (
              <p>
                <span className="font-semibold">N° Sécurité Sociale:</span> {patientData.insurance}
              </p>
            )}
            <p>
              <span className="font-semibold">Adresse:</span> [Adresse du patient]
            </p>
            <p>
              <span className="font-semibold">Mutuelle:</span> [Mutuelle du patient]
            </p>
          </div>
        </div>
      </div>

      {/* Indication thérapeutique */}
      <div className="mb-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-yellow-800">Indication Thérapeutique</h2>
        <div className="space-y-2">
          <p>
            <span className="font-semibold">Diagnostic:</span>{" "}
            {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0]?.diagnosis ||
              clinicalData.chiefComplaint}
          </p>
          {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0]?.icd10 && (
            <p>
              <span className="font-semibold">Code CIM-10:</span>{" "}
              {enhancedResults.diagnostic_analysis.differential_diagnoses[0].icd10}
            </p>
          )}
          <p>
            <span className="font-semibold">Contexte clinique:</span>{" "}
            {clinicalData.symptoms?.substring(0, 200) || "Traitement symptomatique"}...
          </p>
        </div>
      </div>

      {/* Médicaments prescrits */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Pill className="h-6 w-6 mr-3 text-green-600" />
          MÉDICAMENTS PRESCRITS
        </h2>

        <div className="space-y-6">
          {medications.map((med: any, index: number) => (
            <div key={index} className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              {/* En-tête médicament */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-green-800">{med.name}</h3>
                  {med.brand_name && <p className="text-lg text-green-600">({med.brand_name})</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{med.strength}</p>
                  <p className="text-sm text-gray-600">{med.form}</p>
                </div>
              </div>

              {/* Détails prescription */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-green-700 mb-1 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Posologie:
                    </h4>
                    <p className="text-lg font-semibold">{med.dosage}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-green-700 mb-1">Durée de traitement:</h4>
                    <p className="font-semibold">{med.duration}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-green-700 mb-1">Quantité à délivrer:</h4>
                    <p className="font-semibold">{med.quantity}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-green-700 mb-1">Instructions:</h4>
                    <p className="text-sm">{med.instructions}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-green-700 mb-1">Indication:</h4>
                    <p className="text-sm">{med.indication}</p>
                  </div>
                  {med.monitoring && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <h4 className="font-semibold text-blue-700 mb-1">Surveillance:</h4>
                      <p className="text-sm text-blue-600">{med.monitoring}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations pharmacien */}
              <div className="mt-4 pt-4 border-t border-green-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Générique autorisé
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Non substituable
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Renouvellement: ___
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Délivrance fractionnée
                  </label>
                </div>
              </div>

              {/* Effets secondaires et contre-indications */}
              {(med.side_effects || med.contraindications) && (
                <div className="mt-4 pt-4 border-t border-green-300">
                  {med.side_effects && (
                    <div className="mb-2">
                      <h4 className="font-semibold text-orange-700 mb-1 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Effets secondaires possibles:
                      </h4>
                      <ul className="text-xs text-orange-600 list-disc list-inside">
                        {med.side_effects.map((effect: string, idx: number) => (
                          <li key={idx}>{effect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {med.contraindications && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-1 flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        Contre-indications:
                      </h4>
                      <ul className="text-xs text-red-600 list-disc list-inside">
                        {med.contraindications.map((ci: string, idx: number) => (
                          <li key={idx}>{ci}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions générales */}
      <div className="mb-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Instructions Générales</h2>
        <div className="space-y-2">
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Respecter scrupuleusement les posologies et horaires de prise
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Ne pas arrêter le traitement sans avis médical
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Signaler tout effet indésirable au médecin ou pharmacien
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Conserver les médicaments dans leur emballage d'origine
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Tenir hors de portée des enfants
          </p>
          {prescriptionData?.prescription?.follow_up?.next_visit && (
            <p className="flex items-start text-blue-600">
              <Calendar className="h-4 w-4 mr-2 mt-0.5" />
              <span className="font-semibold">Prochain RDV:</span> {prescriptionData.prescription.follow_up.next_visit}
            </p>
          )}
        </div>
      </div>

      {/* Allergies et contre-indications patient */}
      {patientData.allergies && (
        <div className="mb-8 bg-red-50 border-2 border-red-300 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-red-800 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            ALLERGIES CONNUES DU PATIENT
          </h2>
          <p className="text-red-700 font-semibold text-lg">{patientData.allergies}</p>
          <p className="text-sm text-red-600 mt-2">
            ⚠️ Vérifier la compatibilité de tous les médicaments prescrits avec ces allergies
          </p>
        </div>
      )}

      {/* Suivi et surveillance */}
      {prescriptionData?.prescription?.follow_up && (
        <div className="mb-8 bg-orange-50 border border-orange-200 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-orange-800">Suivi et Surveillance</h2>
          <div className="space-y-3">
            {prescriptionData.prescription.follow_up.monitoring && (
              <div>
                <h3 className="font-semibold text-orange-700 mb-2">Paramètres à surveiller:</h3>
                <ul className="list-disc list-inside text-sm">
                  {prescriptionData.prescription.follow_up.monitoring.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {prescriptionData.prescription.follow_up.warning_signs && (
              <div>
                <h3 className="font-semibold text-red-700 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Signes d'alarme - Consulter immédiatement:
                </h3>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {prescriptionData.prescription.follow_up.warning_signs.map((sign: string, index: number) => (
                    <li key={index}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pied de page avec signature */}
      <div className="mt-12 pt-8 border-t-2 border-gray-300">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">Ordonnance valable 3 mois (1 an pour les traitements chroniques)</p>
            <p className="text-sm text-gray-600">Ne pas dépasser la dose prescrite</p>
            <p className="text-sm text-gray-600 mt-2">Document généré le {currentDate} - Système Médical Expert v2.0</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-8">Signature et cachet du médecin</p>
            <div className="border-t border-gray-400 w-48 mb-2"></div>
            <p className="text-sm font-semibold">Dr. Jean MARTIN</p>
          </div>
        </div>
      </div>

      {/* Mentions légales */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>
          Cette ordonnance est établie conformément aux dispositions du Code de la Santé Publique. Les médicaments
          prescrits sont adaptés à l'état clinique du patient et aux recommandations en vigueur. En cas de doute,
          n'hésitez pas à consulter votre pharmacien ou votre médecin.
        </p>
      </div>
    </div>
  )
}
