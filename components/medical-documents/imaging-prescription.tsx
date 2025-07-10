"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, Edit, Save, X } from "lucide-react"

const ImagingPrescriptionComponent = ({ patientData, clinicalData, enhancedResults, recommendedExams }) => {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean DUPONT",
    specialty: "Médecine Générale",
    rpps: "10003123456",
    address: "123 Avenue de la République, 75011 Paris",
    phone: "01.42.12.34.56",
    adeli: "751234567",
  })

  const [editMode, setEditMode] = useState(false)

  const imagingExams = [
    {
      category: "RADIOLOGIE CONVENTIONNELLE",
      exams: [
        {
          code: "RADIO01",
          name: "Radiographie thoracique (face + profil)",
          urgent: false,
          preparation: "Retirer bijoux et objets métalliques",
          indication: "Exploration pulmonaire et cardiaque",
        },
        {
          code: "RADIO02",
          name: "Radiographie de l'abdomen sans préparation (ASP)",
          urgent: false,
          preparation: "Aucune préparation particulière",
          indication: "Recherche d'occlusion, lithiases",
        },
        {
          code: "RADIO03",
          name: "Radiographie du rachis lombaire (face + profil)",
          urgent: false,
          preparation: "Aucune préparation",
          indication: "Exploration des lombalgies",
        },
        {
          code: "RADIO04",
          name: "Radiographie du bassin (face)",
          urgent: false,
          preparation: "Vider la vessie",
          indication: "Exploration coxo-fémorale",
        },
      ],
    },
    {
      category: "ECHOGRAPHIE",
      exams: [
        {
          code: "ECHO01",
          name: "Échographie abdominale",
          urgent: false,
          preparation: "À jeun 6h, vessie pleine",
          indication: "Exploration hépatobiliaire, rénale",
        },
        {
          code: "ECHO02",
          name: "Échographie pelvienne",
          urgent: false,
          preparation: "Vessie pleine",
          indication: "Exploration gynécologique/urologique",
        },
        {
          code: "ECHO03",
          name: "Échographie cardiaque (ETT)",
          urgent: false,
          preparation: "Aucune préparation",
          indication: "Exploration cardiaque structurelle et fonctionnelle",
        },
        {
          code: "ECHO04",
          name: "Écho-Doppler des membres inférieurs",
          urgent: false,
          preparation: "Aucune préparation",
          indication: "Recherche de thrombose veineuse",
        },
        {
          code: "ECHO05",
          name: "Échographie thyroïdienne",
          urgent: false,
          preparation: "Aucune préparation",
          indication: "Exploration de nodules thyroïdiens",
        },
      ],
    },
    {
      category: "SCANNER (TDM)",
      exams: [
        {
          code: "TDM01",
          name: "Scanner thoracique avec injection",
          urgent: false,
          preparation: "À jeun 4h, créatininémie < 3 mois",
          indication: "Exploration thoracique détaillée",
        },
        {
          code: "TDM02",
          name: "Scanner abdomino-pelvien avec injection",
          urgent: false,
          preparation: "À jeun 4h, créatininémie < 3 mois, produit de contraste per os",
          indication: "Exploration abdominale et pelvienne",
        },
        {
          code: "TDM03",
          name: "Scanner cérébral sans injection",
          urgent: true,
          preparation: "Aucune préparation",
          indication: "Urgence neurologique, AVC, traumatisme",
        },
        {
          code: "TDM04",
          name: "Angio-scanner des troncs supra-aortiques",
          urgent: true,
          preparation: "À jeun 4h, créatininémie < 3 mois",
          indication: "Exploration vasculaire cervico-encéphalique",
        },
      ],
    },
    {
      category: "IRM",
      exams: [
        {
          code: "IRM01",
          name: "IRM cérébrale et des troncs supra-aortiques",
          urgent: false,
          preparation: "Questionnaire de sécurité IRM, pas de produit ferromagnétique",
          indication: "Exploration neurologique fine",
        },
        {
          code: "IRM02",
          name: "IRM du rachis lombaire",
          urgent: false,
          preparation: "Questionnaire de sécurité IRM",
          indication: "Exploration des lombalgies, hernies discales",
        },
        {
          code: "IRM03",
          name: "IRM du genou",
          urgent: false,
          preparation: "Questionnaire de sécurité IRM",
          indication: "Exploration traumatique ou dégénérative",
        },
        {
          code: "IRM04",
          name: "IRM cardiaque",
          urgent: false,
          preparation: "Questionnaire de sécurité IRM, ECG récent",
          indication: "Exploration cardiaque structurelle et fonctionnelle",
        },
      ],
    },
    {
      category: "EXAMENS SPECIALISES",
      exams: [
        {
          code: "SPEC01",
          name: "Mammographie bilatérale + échographie mammaire",
          urgent: false,
          preparation: "Éviter la semaine précédant les règles",
          indication: "Dépistage ou diagnostic des pathologies mammaires",
        },
        {
          code: "SPEC02",
          name: "Densitométrie osseuse (ostéodensitométrie)",
          urgent: false,
          preparation: "Arrêt supplémentation calcique 24h avant",
          indication: "Diagnostic d'ostéoporose",
        },
        {
          code: "SPEC03",
          name: "Transit baryté œso-gastro-duodénal",
          urgent: false,
          preparation: "À jeun depuis la veille au soir",
          indication: "Exploration du tube digestif haut",
        },
        {
          code: "SPEC04",
          name: "Coloscopie virtuelle (coloscanner)",
          urgent: false,
          preparation: "Préparation colique, régime sans résidu 3 jours avant",
          indication: "Exploration colique alternative",
        },
      ],
    },
  ]

  const [selectedExams, setSelectedExams] = useState(new Set())

  const toggleExam = (examCode) => {
    const newSelected = new Set(selectedExams)
    if (newSelected.has(examCode)) {
      newSelected.delete(examCode)
    } else {
      newSelected.add(examCode)
    }
    setSelectedExams(newSelected)
  }

  const getSelectedExamsDetails = () => {
    const selected = []
    imagingExams.forEach((category) => {
      category.exams.forEach((exam) => {
        if (selectedExams.has(exam.code)) {
          selected.push({ ...exam, category: category.category })
        }
      })
    })
    return selected
  }

  const generatePrescription = () => {
    const selectedExamsDetails = getSelectedExamsDetails()
    const prescriptionDate = new Date()

    return `
══════════════════════════════════════════════════════════════════════════════
                        ORDONNANCE D'EXAMENS PARACLINIQUES
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
Poids: ${patientData.weight ? `${patientData.weight} kg` : "Non renseigné"}
Taille: ${patientData.height ? `${patientData.height} cm` : "Non renseignée"}

══════════════════════════════════════════════════════════════════════════════

RENSEIGNEMENTS CLINIQUES
Motif de consultation: ${clinicalData.chiefComplaint}
Histoire de la maladie: ${clinicalData.symptoms}
Diagnostic suspecté: ${enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0]?.diagnosis || "En cours d'évaluation"}

Signes vitaux:
${clinicalData.vitals?.bp ? `- TA: ${clinicalData.vitals.bp} mmHg` : ""}
${clinicalData.vitals?.hr ? `- FC: ${clinicalData.vitals.hr} bpm` : ""}
${clinicalData.vitals?.temp ? `- T°: ${clinicalData.vitals.temp}°C` : ""}

Antécédents: ${patientData.medicalHistory || "Non renseignés"}
Allergies: ${patientData.allergies || "Aucune allergie connue"}
Traitements: ${patientData.currentMedications || "Aucun traitement"}

══════════════════════════════════════════════════════════════════════════════

EXAMENS PRESCRITS

${
  selectedExamsDetails.length > 0
    ? selectedExamsDetails
        .map(
          (exam, index) =>
            `${index + 1}. ${exam.name} (${exam.code})
   
   Catégorie: ${exam.category}
   Indication clinique: ${exam.indication}
   
   ${exam.urgent ? "⚠️ EXAMEN URGENT - À réaliser dans les 24-48h" : "Examen programmé - Dans les 2-4 semaines"}
   
   Préparation du patient:
   ${exam.preparation}
   
   Question diagnostique:
   ${exam.indication}
   
   ─────────────────────────────────────────────────────────────────────────
`,
        )
        .join("\n")
    : "Aucun examen sélectionné"
}

══════════════════════════════════════════════════════════════════════════════

INSTRUCTIONS PARTICULÈRES

${
  selectedExamsDetails.some((exam) => exam.urgent)
    ? `
⚠️ EXAMENS URGENTS PRESCRITS
Les examens marqués comme urgents doivent être réalisés en priorité.
Contact du prescripteur pour coordination: ${doctorInfo.phone}

`
    : ""
}Contre-indications à rechercher:
- Allergie aux produits de contraste iodés ou gadolinium
- Insuffisance rénale (créatininémie récente obligatoire si injection)
- Grossesse (déclarative obligatoire)
- Matériel ferromagnétique pour IRM (stimulateur cardiaque, clips, etc.)

Précautions particulières:
- Diabète sous metformine: arrêt 48h après injection iodée
- Hyperthyroïdie: précautions avec produits de contraste iodés
- Claustrophobie: prémédication possible pour IRM

══════════════════════════════════════════════════════════════════════════════

TRANSMISSION DES RÉSULTATS

Mode de transmission souhaité:
☑ Envoi au médecin prescripteur (OBLIGATOIRE)
☑ Remise au patient
☑ Transmission par voie électronique sécurisée

Coordonnées pour transmission urgente:
Médecin prescripteur: ${doctorInfo.phone}
Email: [À compléter si souhaité]

En cas de découverte fortuite significative: Contact immédiat du prescripteur

══════════════════════════════════════════════════════════════════════════════

PRESCRIPTION VALABLE 1 AN
(Sauf mention contraire ou examen urgent)

Le patient doit se présenter avec:
- Cette ordonnance
- Carte Vitale et attestation de droits
- Carte de mutuelle
- Examens antérieurs similaires si disponibles
- Créatininémie de moins de 3 mois si injection prévue

Signature et cachet du prescripteur:


Dr. ${doctorInfo.name}
${doctorInfo.specialty}
N° RPPS: ${doctorInfo.rpps}

══════════════════════════════════════════════════════════════════════════════

Document généré le ${prescriptionDate.toLocaleDateString("fr-FR")} à ${prescriptionDate.toLocaleTimeString("fr-FR")}
ID Ordonnance: IMG-${Date.now()}
`.trim()
  }

  const downloadPrescription = () => {
    const prescriptionContent = generatePrescription()
    const blob = new Blob([prescriptionContent], { type: "text/plain; charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Ordonnance_Imagerie_${patientData.name?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
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
          <title>Ordonnance d'Examens Paracliniques</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 20px; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <pre>${prescriptionContent}</pre>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-blue-700">Ordonnance d'Examens Paracliniques</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {editMode ? "Sauvegarder" : "Modifier"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPrescription} disabled={selectedExams.size === 0}>
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
            <Button variant="outline" size="sm" onClick={printPrescription} disabled={selectedExams.size === 0}>
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informations du praticien */}
        {editMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations du Praticien</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctorName">Nom du médecin</Label>
                <Input
                  id="doctorName"
                  value={doctorInfo.name}
                  onChange={(e) => setDoctorInfo({ ...doctorInfo, name: e.target.value })}
                  autoComplete="nope"
                  spellCheck="false"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div>
                <Label htmlFor="specialty">Spécialité</Label>
                <Input
                  id="specialty"
                  value={doctorInfo.specialty}
                  onChange={(e) => setDoctorInfo({ ...doctorInfo, specialty: e.target.value })}
                  autoComplete="nope"
                  spellCheck="false"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div>
                <Label htmlFor="rpps">N° RPPS</Label>
                <Input
                  id="rpps"
                  value={doctorInfo.rpps}
                  onChange={(e) => setDoctorInfo({ ...doctorInfo, rpps: e.target.value })}
                  autoComplete="nope"
                  spellCheck="false"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={doctorInfo.phone}
                  onChange={(e) => setDoctorInfo({ ...doctorInfo, phone: e.target.value })}
                  autoComplete="nope"
                  spellCheck="false"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={doctorInfo.address}
                  onChange={(e) => setDoctorInfo({ ...doctorInfo, address: e.target.value })}
                  autoComplete="nope"
                  spellCheck="false"
                  autoCapitalize="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sélection des examens */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Sélection des Examens</h3>

          {imagingExams.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="text-base text-blue-600">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {category.exams.map((exam) => (
                    <div
                      key={exam.code}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedExams.has(exam.code)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleExam(exam.code)}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox checked={selectedExams.has(exam.code)} onChange={() => toggleExam(exam.code)} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{exam.name}</h4>
                            {exam.urgent && (
                              <Badge variant="destructive" className="text-xs">
                                URGENT
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Indication:</strong> {exam.indication}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Préparation:</strong> {exam.preparation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Résumé des examens sélectionnés */}
        {selectedExams.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Examens Sélectionnés ({selectedExams.size})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSelectedExamsDetails().map((exam, index) => (
                  <div key={exam.code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{exam.name}</span>
                      {exam.urgent && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          URGENT
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleExam(exam.code)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aperçu de l'ordonnance */}
        {selectedExams.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aperçu de l'Ordonnance</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                {generatePrescription()}
              </pre>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}

export default ImagingPrescriptionComponent
