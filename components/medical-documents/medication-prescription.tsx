"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, Edit, Save, Plus, Trash2 } from "lucide-react"

const MedicationPrescriptionComponent = ({ patientData, clinicalData, enhancedResults }) => {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean DUPONT",
    specialty: "Médecine Générale",
    rpps: "10003123456",
    address: "123 Avenue de la République, 75011 Paris",
    phone: "01.42.12.34.56",
    adeli: "751234567",
  })

  const [editMode, setEditMode] = useState(false)

  const [prescribedMedications, setPrescribedMedications] = useState([
    {
      id: 1,
      name: "PARACETAMOL",
      dosage: "1000mg",
      form: "Comprimé",
      posology: "1 comprimé 3 fois par jour",
      duration: "7 jours",
      indication: "Douleur et fièvre",
      generic: true,
      urgent: false,
      quantity: "21 comprimés",
      renewals: "0",
    },
  ])

  const commonMedications = [
    {
      category: "ANTALGIQUES",
      medications: [
        { name: "PARACETAMOL", dosages: ["500mg", "1000mg"], forms: ["Comprimé", "Gélule", "Suppositoire"] },
        { name: "IBUPROFENE", dosages: ["200mg", "400mg", "600mg"], forms: ["Comprimé", "Gélule"] },
        { name: "ASPIRINE", dosages: ["500mg", "1000mg"], forms: ["Comprimé", "Poudre"] },
        { name: "CODEINE + PARACETAMOL", dosages: ["30mg/500mg"], forms: ["Comprimé"] },
        { name: "TRAMADOL", dosages: ["50mg", "100mg"], forms: ["Gélule", "Comprimé LP"] },
      ],
    },
    {
      category: "ANTIBIOTIQUES",
      medications: [
        { name: "AMOXICILLINE", dosages: ["500mg", "1000mg"], forms: ["Gélule", "Comprimé", "Suspension"] },
        { name: "AMOXICILLINE + ACIDE CLAVULANIQUE", dosages: ["500mg/125mg", "1000mg/125mg"], forms: ["Comprimé"] },
        { name: "AZITHROMYCINE", dosages: ["250mg", "500mg"], forms: ["Comprimé", "Suspension"] },
        { name: "CIPROFLOXACINE", dosages: ["250mg", "500mg"], forms: ["Comprimé"] },
        { name: "CEFIXIME", dosages: ["200mg", "400mg"], forms: ["Comprimé", "Suspension"] },
      ],
    },
    {
      category: "CARDIOVASCULAIRE",
      medications: [
        { name: "AMLODIPINE", dosages: ["5mg", "10mg"], forms: ["Comprimé"] },
        { name: "ENALAPRIL", dosages: ["5mg", "10mg", "20mg"], forms: ["Comprimé"] },
        { name: "ATENOLOL", dosages: ["50mg", "100mg"], forms: ["Comprimé"] },
        { name: "SIMVASTATINE", dosages: ["20mg", "40mg"], forms: ["Comprimé"] },
        { name: "ASPIRINE CARDIO", dosages: ["75mg", "100mg"], forms: ["Comprimé"] },
      ],
    },
    {
      category: "GASTRO-ENTEROLOGIE",
      medications: [
        { name: "OMEPRAZOLE", dosages: ["20mg", "40mg"], forms: ["Gélule"] },
        { name: "ESOMEPRAZOLE", dosages: ["20mg", "40mg"], forms: ["Comprimé"] },
        { name: "DOMPERIDONE", dosages: ["10mg"], forms: ["Comprimé"] },
        { name: "LOPERAMIDE", dosages: ["2mg"], forms: ["Gélule"] },
        { name: "SMECTA", dosages: ["3g"], forms: ["Poudre"] },
      ],
    },
    {
      category: "RESPIRATOIRE",
      medications: [
        { name: "SALBUTAMOL", dosages: ["100µg/dose"], forms: ["Aérosol"] },
        { name: "PREDNISOLONE", dosages: ["5mg", "20mg"], forms: ["Comprimé"] },
        { name: "CARBOCISTEINE", dosages: ["375mg"], forms: ["Gélule"] },
        { name: "DEXTROMETHORPHANE", dosages: ["15mg"], forms: ["Sirop"] },
      ],
    },
  ]

  const addMedication = () => {
    const newMedication = {
      id: Date.now(),
      name: "",
      dosage: "",
      form: "",
      posology: "",
      duration: "",
      indication: "",
      generic: true,
      urgent: false,
      quantity: "",
      renewals: "0",
    }
    setPrescribedMedications([...prescribedMedications, newMedication])
  }

  const removeMedication = (id) => {
    setPrescribedMedications(prescribedMedications.filter((med) => med.id !== id))
  }

  const updateMedication = (id, field, value) => {
    setPrescribedMedications(prescribedMedications.map((med) => (med.id === id ? { ...med, [field]: value } : med)))
  }

  const generatePrescription = () => {
    const prescriptionDate = new Date()

    return `
══════════════════════════════════════════════════════════════════════════════
                            ORDONNANCE MEDICAMENTEUSE
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

Allergies médicamenteuses: ${patientData.allergies || "Aucune allergie connue"}
Traitements en cours: ${patientData.currentMedications || "Aucun traitement"}

══════════════════════════════════════════════════════════════════════════════

DIAGNOSTIC ET INDICATION
Motif de consultation: ${clinicalData.chiefComplaint}
Diagnostic principal: ${enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0]?.diagnosis || "En cours d'évaluation"}

Signes vitaux:
${clinicalData.vitals?.bp ? `- TA: ${clinicalData.vitals.bp} mmHg` : ""}
${clinicalData.vitals?.hr ? `- FC: ${clinicalData.vitals.hr} bpm` : ""}
${clinicalData.vitals?.temp ? `- T°: ${clinicalData.vitals.temp}°C` : ""}

══════════════════════════════════════════════════════════════════════════════

PRESCRIPTION MEDICAMENTEUSE

${prescribedMedications
  .map(
    (med, index) =>
      `${index + 1}. ${med.name} ${med.dosage} - ${med.form}
   
   Posologie: ${med.posology}
   Durée du traitement: ${med.duration}
   Quantité à délivrer: ${med.quantity}
   Nombre de renouvellements: ${med.renewals}
   
   Indication: ${med.indication}
   ${med.generic ? "☑ Droit de substitution" : "☐ Non substituable"}
   ${med.urgent ? "⚠️ TRAITEMENT URGENT - Délivrance immédiate" : ""}
   
   ─────────────────────────────────────────────────────────────────────────
`,
  )
  .join("\n")}

══════════════════════════════════════════════════════════════════════════════

CONSEILS ET RECOMMANDATIONS

PRISE DES MEDICAMENTS:
- Respecter scrupuleusement les posologies prescrites
- Prendre les médicaments aux heures indiquées
- Ne pas arrêter le traitement sans avis médical
- En cas d'oubli: ne pas doubler la dose suivante

EFFETS INDESIRABLES:
- Surveiller l'apparition d'effets secondaires
- Contacter le médecin en cas de réaction inhabituelle
- Arrêter le traitement et consulter en urgence si allergie

INTERACTIONS:
- Signaler tout nouveau traitement à votre médecin/pharmacien
- Éviter l'automédication pendant le traitement
- Attention aux interactions avec l'alcool

CONSERVATION:
- Conserver les médicaments dans leur emballage d'origine
- Respecter les conditions de conservation
- Vérifier les dates de péremption

══════════════════════════════════════════════════════════════════════════════

SURVEILLANCE ET SUIVI

Consultation de contrôle recommandée:
- Dans 7-10 jours pour évaluation de l'efficacité
- Plus tôt en cas d'aggravation ou d'effets indésirables

Paramètres à surveiller:
${prescribedMedications.some((med) => med.name.includes("ANTIBIOTIQUE")) ? "- Évolution des signes infectieux" : ""}
${prescribedMedications.some((med) => med.name.includes("ANTALGIQUE")) ? "- Intensité de la douleur (échelle 0-10)" : ""}
${prescribedMedications.some((med) => med.name.includes("CARDIOVASCULAIRE")) ? "- Tension artérielle et fréquence cardiaque" : ""}

Contact en cas d'urgence: ${doctorInfo.phone}

══════════════════════════════════════════════════════════════════════════════

MENTIONS LEGALES

Cette ordonnance est valable 3 mois à compter de sa date d'établissement.
Les médicaments stupéfiants et assimilés ont une validité de 72 heures.

Le pharmacien doit:
- Vérifier l'identité du patient
- Contrôler la validité de l'ordonnance
- Délivrer la quantité exacte prescrite
- Apposer son cachet et sa signature

Droit de substitution: Sauf mention "non substituable", le pharmacien peut 
délivrer un générique ou un médicament de même composition.

══════════════════════════════════════════════════════════════════════════════

PRESCRIPTION ETABLIE EN 1 EXEMPLAIRE
À remettre au pharmacien lors de la délivrance

Signature et cachet du prescripteur:


Dr. ${doctorInfo.name}
${doctorInfo.specialty}
N° RPPS: ${doctorInfo.rpps}

══════════════════════════════════════════════════════════════════════════════

INFORMATIONS PATIENT

REMBOURSEMENT:
- Médicaments remboursés selon taux Sécurité Sociale
- Tiers payant possible selon votre mutuelle
- Conserver les vignettes pour remboursement

GENERIQUES:
- Même efficacité que le médicament de référence
- Économies pour l'Assurance Maladie
- Droit de refus du patient (reste à charge majoré)

OBSERVANCE:
- L'efficacité du traitement dépend du respect de la prescription
- Ne pas partager vos médicaments avec d'autres personnes
- Rapporter les médicaments non utilisés en pharmacie

QUESTIONS/CONSEILS:
- Votre pharmacien est votre interlocuteur privilégié
- N'hésitez pas à lui poser vos questions
- Demandez conseil pour l'utilisation des dispositifs (inhalateurs, etc.)

══════════════════════════════════════════════════════════════════════════════

Document généré le ${prescriptionDate.toLocaleDateString("fr-FR")} à ${prescriptionDate.toLocaleTimeString("fr-FR")}
ID Ordonnance: MED-${Date.now()}
`.trim()
  }

  const downloadPrescription = () => {
    const prescriptionContent = generatePrescription()
    const blob = new Blob([prescriptionContent], { type: "text/plain; charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Ordonnance_Medicaments_${patientData.name?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
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
          <title>Ordonnance Médicamenteuse</title>
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
          <CardTitle className="text-xl font-bold text-green-700">Ordonnance Médicamenteuse</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {editMode ? "Sauvegarder" : "Modifier"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPrescription}
              disabled={prescribedMedications.length === 0}
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={printPrescription}
              disabled={prescribedMedications.length === 0}
            >
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

        {/* Médicaments prescrits */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Médicaments Prescrits</h3>
            <Button onClick={addMedication} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un médicament
            </Button>
          </div>

          {prescribedMedications.map((medication, index) => (
            <Card key={medication.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    Médicament {index + 1}
                    {medication.urgent && (
                      <Badge variant="destructive" className="ml-2">
                        URGENT
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMedication(medication.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom du médicament</Label>
                  <Input
                    value={medication.name}
                    onChange={(e) => updateMedication(medication.id, "name", e.target.value)}
                    placeholder="Ex: PARACETAMOL"
                    autoComplete="nope"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label>Dosage</Label>
                  <Input
                    value={medication.dosage}
                    onChange={(e) => updateMedication(medication.id, "dosage", e.target.value)}
                    placeholder="Ex: 1000mg"
                    autoComplete="nope"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label>Forme</Label>
                  <Select
                    value={medication.form}
                    onValueChange={(value) => updateMedication(medication.id, "form", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la forme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comprimé">Comprimé</SelectItem>
                      <SelectItem value="Gélule">Gélule</SelectItem>
                      <SelectItem value="Sirop">Sirop</SelectItem>
                      <SelectItem value="Suppositoire">Suppositoire</SelectItem>
                      <SelectItem value="Pommade">Pommade</SelectItem>
                      <SelectItem value="Aérosol">Aérosol</SelectItem>
                      <SelectItem value="Injection">Injection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Posologie</Label>
                  <Input
                    value={medication.posology}
                    onChange={(e) => updateMedication(medication.id, "posology", e.target.value)}
                    placeholder="Ex: 1 comprimé 3 fois par jour"
                    autoComplete="nope"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label>Durée</Label>
                  <Input
                    value={medication.duration}
                    onChange={(e) => updateMedication(medication.id, "duration", e.target.value)}
                    placeholder="Ex: 7 jours"
                    autoComplete="nope"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label>Quantité</Label>
                  <Input
                    value={medication.quantity}
                    onChange={(e) => updateMedication(medication.id, "quantity", e.target.value)}
                    placeholder="Ex: 21 comprimés"
                    autoComplete="nope"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Indication</Label>
                  <Input
                    value={medication.indication}
                    onChange={(e) => updateMedication(medication.id, "indication", e.target.value)}
                    placeholder="Ex: Douleur et fièvre"
                    autoComplete="nope"
                    spellCheck="false"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="col-span-2 flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`generic-${medication.id}`}
                      checked={medication.generic}
                      onChange={(e) => updateMedication(medication.id, "generic", e.target.checked)}
                    />
                    <Label htmlFor={`generic-${medication.id}`}>Droit de substitution</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`urgent-${medication.id}`}
                      checked={medication.urgent}
                      onChange={(e) => updateMedication(medication.id, "urgent", e.target.checked)}
                    />
                    <Label htmlFor={`urgent-${medication.id}`}>Traitement urgent</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Médicaments courants pour aide à la prescription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aide à la Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {commonMedications.map((category) => (
                <div key={category.category}>
                  <h4 className="font-medium text-sm text-blue-600 mb-2">{category.category}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {category.medications.map((med) => (
                      <div
                        key={med.name}
                        className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          const newMed = {
                            id: Date.now(),
                            name: med.name,
                            dosage: med.dosages[0],
                            form: med.forms[0],
                            posology: "",
                            duration: "",
                            indication: "",
                            generic: true,
                            urgent: false,
                            quantity: "",
                            renewals: "0",
                          }
                          setPrescribedMedications([...prescribedMedications, newMed])
                        }}
                      >
                        <div className="font-medium">{med.name}</div>
                        <div className="text-gray-600">
                          {med.dosages.join(", ")} - {med.forms.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Aperçu de l'ordonnance */}
        {prescribedMedications.length > 0 && (
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

export default MedicationPrescriptionComponent
