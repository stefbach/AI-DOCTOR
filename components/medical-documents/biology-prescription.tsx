"use client"

import { useState } from "react"
import { FlaskConical, Download, Printer, Edit, AlertTriangle } from "lucide-react"

const BiologyPrescriptionComponent = ({ patientData, clinicalData, enhancedResults, recommendedExams }) => {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean DUPONT",
    specialty: "Médecine Générale",
    rpps: "10003123456",
    address: "123 Avenue de la République, 75011 Paris",
    phone: "01.42.12.34.56",
    adeli: "751234567",
  })

  const [editMode, setEditMode] = useState(false)

  const biologicalTests = [
    {
      category: "HEMATOLOGIE",
      tests: [
        { code: "HEMA01", name: "Numération Formule Sanguine (NFS)", urgent: false },
        { code: "HEMA02", name: "Plaquettes", urgent: false },
        { code: "HEMA03", name: "Réticulocytes", urgent: false },
        { code: "HEMA04", name: "Vitesse de Sédimentation (VS)", urgent: false },
      ],
    },
    {
      category: "BIOCHIMIE",
      tests: [
        { code: "BIOC01", name: "Glycémie à jeun", urgent: false },
        { code: "BIOC02", name: "Créatininémie + DFG", urgent: false },
        { code: "BIOC03", name: "Urée", urgent: false },
        { code: "BIOC04", name: "Acide urique", urgent: false },
        { code: "BIOC05", name: "Bilan lipidique complet", urgent: false },
        { code: "BIOC06", name: "Transaminases (ALAT, ASAT)", urgent: false },
        { code: "BIOC07", name: "Gamma GT", urgent: false },
        { code: "BIOC08", name: "Bilirubine totale et conjuguée", urgent: false },
        { code: "BIOC09", name: "Phosphatases alcalines", urgent: false },
        { code: "BIOC10", name: "Protéines totales + Électrophorèse", urgent: false },
      ],
    },
    {
      category: "INFLAMMATION",
      tests: [
        { code: "INFL01", name: "C-Réactive Protéine (CRP)", urgent: true },
        { code: "INFL02", name: "Procalcitonine", urgent: true },
        { code: "INFL03", name: "Fibrinogène", urgent: false },
      ],
    },
    {
      category: "ENDOCRINOLOGIE",
      tests: [
        { code: "ENDO01", name: "TSH", urgent: false },
        { code: "ENDO02", name: "T3 libre, T4 libre", urgent: false },
        { code: "ENDO03", name: "HbA1c (Hémoglobine glyquée)", urgent: false },
        { code: "ENDO04", name: "Cortisol", urgent: false },
      ],
    },
    {
      category: "CARDIOLOGIE",
      tests: [
        { code: "CARD01", name: "Troponines I ou T", urgent: true },
        { code: "CARD02", name: "CPK, CPK-MB", urgent: true },
        { code: "CARD03", name: "LDH", urgent: false },
        { code: "CARD04", name: "Myoglobine", urgent: true },
        { code: "CARD05", name: "Pro-BNP ou NT-pro-BNP", urgent: false },
      ],
    },
    {
      category: "IMMUNOLOGIE",
      tests: [
        { code: "IMMU01", name: "Facteur Rhumatoïde", urgent: false },
        { code: "IMMU02", name: "Anticorps Anti-CCP", urgent: false },
        { code: "IMMU03", name: "Anticorps Antinucléaires (AAN)", urgent: false },
        { code: "IMMU04", name: "Complément C3, C4", urgent: false },
      ],
    },
    {
      category: "INFECTIOLOGIE",
      tests: [
        { code: "INFE01", name: "Hémocultures (2 flacons)", urgent: true },
        { code: "INFE02", name: "ECBU", urgent: false },
        { code: "INFE03", name: "Sérologies VIH, VHB, VHC", urgent: false },
        { code: "INFE04", name: "Sérologie COVID-19", urgent: false },
      ],
    },
    {
      category: "VITAMINES ET OLIGO-ELEMENTS",
      tests: [
        { code: "VITA01", name: "Vitamine D (25-OH-D3)", urgent: false },
        { code: "VITA02", name: "Vitamine B12", urgent: false },
        { code: "VITA03", name: "Folates sériques", urgent: false },
        { code: "VITA04", name: "Fer sérique + Ferritine", urgent: false },
        { code: "VITA05", name: "Coefficient de saturation transferrine", urgent: false },
      ],
    },
  ]

  const [selectedTests, setSelectedTests] = useState(new Set())

  const toggleTest = (testCode) => {
    const newSelected = new Set(selectedTests)
    if (newSelected.has(testCode)) {
      newSelected.delete(testCode)
    } else {
      newSelected.add(testCode)
    }
    setSelectedTests(newSelected)
  }

  const getSelectedTestsDetails = () => {
    const selected = []
    biologicalTests.forEach((category) => {
      category.tests.forEach((test) => {
        if (selectedTests.has(test.code)) {
          selected.push({ ...test, category: category.category })
        }
      })
    })
    return selected
  }

  const generatePrescription = () => {
    const selectedTestsDetails = getSelectedTestsDetails()
    const prescriptionDate = new Date()

    return `
══════════════════════════════════════════════════════════════════════════════
                              ORDONNANCE DE BIOLOGIE
══════════════════════════════════════════════════════════════════════════════

PRATICIEN PRESCRIPTEUR
${doctorInfo.name}
${doctorInfo.specialty}
N° RPPS: ${doctorInfo.rpps} | N° ADELI: ${doctorInfo.adeli}
${doctorInfo.address}
Tél: ${doctorInfo.phone}

Date: ${prescriptionDate.toLocaleDateString("fr-FR")}
Heure: ${prescriptionDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}

══════════════════════════════════════════════════════════════════════════════

PATIENT
Nom et Prénom: ${patientData.name}
Date de naissance: ${patientData.age ? `${patientData.age} ans` : "Non renseignée"}
Sexe: ${patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Non précisé"}
N° Sécurité Sociale: [À compléter]
Mutuelle: ${patientData.insurance || "Non renseignée"}

══════════════════════════════════════════════════════════════════════════════

INDICATION CLINIQUE
Motif: ${clinicalData.chiefComplaint}
Diagnostic suspecté: ${enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0]?.diagnosis || "En cours d'évaluation"}

══════════════════════════════════════════════════════════════════════════════

EXAMENS BIOLOGIQUES PRESCRITS

${
  selectedTestsDetails.length > 0
    ? selectedTestsDetails
        .map(
          (test, index) =>
            `${index + 1}. ${test.name} (${test.code})
   Catégorie: ${test.category}
   ${test.urgent ? "⚠️ URGENT - Résultat souhaité dans les 2h" : "Résultat souhaité dans les 24-48h"}
`,
        )
        .join("\n")
    : "Aucun examen sélectionné"
}

══════════════════════════════════════════════════════════════════════════════

INSTRUCTIONS PARTICULIÈRES

Conditions de prélèvement:
- Patient à jeun depuis 12 heures pour: Glycémie, Bilan lipidique
- Prélèvement le matin de préférence pour: Cortisol, TSH
- Arrêt anticoagulants si nécessaire (après avis médical)
- Signaler tout traitement en cours au laboratoire

${
  selectedTestsDetails.some((test) => test.urgent)
    ? `
⚠️ EXAMENS URGENTS PRESCRITS
Les examens marqués comme urgents nécessitent un rendu de résultats rapide.
Merci de contacter le prescripteur dès réception des résultats critiques.
`
    : ""
}

══════════════════════════════════════════════════════════════════════════════

SURVEILLANCE ET SUIVI

Transmission des résultats:
- Au prescripteur: OUI (Obligatoire)
- Au patient: OUI
- Mode: Email + Courrier postal

Valeurs critiques: Appel téléphonique immédiat au prescripteur
Contact urgence: ${doctorInfo.phone}

══════════════════════════════════════════════════════════════════════════════

PRESCRIPTION VALABLE 1 AN
(Sauf mention contraire)

Signature et cachet du prescripteur:


Dr. ${doctorInfo.name}
${doctorInfo.specialty}
N° RPPS: ${doctorInfo.rpps}

══════════════════════════════════════════════════════════════════════════════

INFORMATIONS PATIENT

Lieu de prélèvement: Laboratoire d'analyses médicales agréé
Pièces à présenter: Carte Vitale + Carte de mutuelle + Ordonnance

Conseils pré-analytiques:
• Respecter le jeûne si prescrit
• Éviter l'effort intense 24h avant le prélèvement
• Signaler tout traitement médicamenteux
• Boire normalement sauf indication contraire

En cas de question: Contacter le laboratoire ou le prescripteur

══════════════════════════════════════════════════════════════════════════════

Document généré le ${prescriptionDate.toLocaleDateString("fr-FR")} à ${prescriptionDate.toLocaleTimeString("fr-FR")}
ID Ordonnance: BIO-${Date.now()}
`.trim()
  }

  const downloadPrescription = () => {
    const prescriptionContent = generatePrescription()
    const blob = new Blob([prescriptionContent], { type: "text/plain; charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Ordonnance_Biologie_${patientData.name?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const printPrescription = () => {
    const prescriptionContent = generatePrescription()
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <html>
        <head>
          <title>Ordonnance de Biologie - ${patientData.name}</title>
          <style>
            @page { 
              margin: 1.5cm;
              size: A4;
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px;
              line-height: 1.4;
              color: #000;
            }
            .urgent { 
              color: #d63384; 
              font-weight: bold; 
            }
            @media print {
              body { font-size: 11px; }
            }
          </style>
        </head>
        <body>
          <pre>${prescriptionContent}</pre>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center">
          <FlaskConical className="h-6 w-6 mr-2 text-blue-600" />
          Ordonnance de Biologie
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors text-sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editMode ? "Lecture" : "Modifier"}
          </button>
          <button
            onClick={downloadPrescription}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </button>
          <button
            onClick={printPrescription}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center transition-colors text-sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Informations médecin - Mode édition */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold mb-4 text-blue-800">Informations du Prescripteur</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={doctorInfo.name}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nom du médecin"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.specialty}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, specialty: e.target.value }))}
              placeholder="Spécialité"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.rpps}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, rpps: e.target.value }))}
              placeholder="N° RPPS"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.adeli}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, adeli: e.target.value }))}
              placeholder="N° ADELI"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.phone}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Téléphone"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={doctorInfo.address}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Adresse du cabinet"
              rows={2}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Sélection des examens */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold mb-4 text-gray-800 flex items-center">
          <FlaskConical className="h-5 w-5 mr-2" />
          Sélection des Examens Biologiques
        </h4>

        <div className="space-y-6">
          {biologicalTests.map((category) => (
            <div key={category.category} className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3 bg-gray-50 px-3 py-2 rounded">{category.category}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.tests.map((test) => (
                  <div key={test.code} className="flex items-center">
                    <input
                      type="checkbox"
                      id={test.code}
                      checked={selectedTests.has(test.code)}
                      onChange={() => toggleTest(test.code)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={test.code}
                      className={`text-sm cursor-pointer flex-1 ${test.urgent ? "text-red-600 font-medium" : "text-gray-700"}`}
                    >
                      {test.name}
                      {test.urgent && <AlertTriangle className="inline h-4 w-4 ml-1" />}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <div className="text-sm text-yellow-800">
              <strong>Examens sélectionnés:</strong> {selectedTests.size} examens
              {getSelectedTestsDetails().some((test) => test.urgent) && (
                <span className="ml-2 text-red-600 font-medium">
                  (Dont {getSelectedTestsDetails().filter((test) => test.urgent).length} urgent(s))
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aperçu de l'ordonnance */}
      <div className="bg-white border border-gray-300 rounded-xl">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-xl">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <FlaskConical className="h-5 w-5 mr-2" />
            Aperçu de l'Ordonnance de Biologie
          </h4>
        </div>

        <div className="p-6">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 font-mono text-xs whitespace-pre-line max-h-96 overflow-y-auto shadow-inner">
            {generatePrescription()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BiologyPrescriptionComponent
