// ==================== 1. INTERFACES TYPESCRIPT (À AJOUTER AU DÉBUT DU FICHIER) ====================
interface BiologyResult {
  id: string
  testId: string
  patientId: string
  consultationId: string
  laboratoryId: string
  laboratoryName: string
  testName: string
  category: 'hematology' | 'clinicalChemistry' | 'immunology' | 'microbiology' | 'endocrinology' | 'general'
  value: number | string
  unit: string
  referenceRange: {
    min?: number
    max?: number
    normalRange: string
    interpretation: 'normal' | 'low' | 'high' | 'critical'
  }
  status: 'pending' | 'received' | 'validated' | 'integrated'
  receivedAt: string
  validatedAt?: string
  validatedBy?: string
  isAbnormal: boolean
  isCritical: boolean
  comments?: string
  labSignature?: string
  attachments?: string[]
}

interface PendingTest {
  id: string
  testName: string
  category: string
  prescribedAt: string
  expectedBy: string
  laboratoryId: string
  urgency: 'routine' | 'urgent' | 'stat'
  status: 'ordered' | 'in_progress' | 'ready' | 'cancelled'
}

interface LabIntegration {
  laboratoryId: string
  name: string
  apiEndpoint: string
  isActive: boolean
  lastSync: string
  supportedTests: string[]
}

// ==================== 2. COMPOSANT PRINCIPAL BiologyResultsManager ====================
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { 
  TestTube, Download, Eye, Check, AlertTriangle, Clock, 
  RefreshCw, FileText, Upload, Search, Filter, Calendar,
  TrendingUp, TrendingDown, Minus, AlertCircle
} from "lucide-react"

interface BiologyResultsManagerProps {
  consultationId: string
  patientId: string
  prescribedTests: any[]
  onResultsUpdated: (results: BiologyResult[]) => void
}

export const BiologyResultsManager = ({
  consultationId,
  patientId,
  prescribedTests,
  onResultsUpdated
}: BiologyResultsManagerProps) => {
  // ========== États ==========
  const [results, setResults] = useState<BiologyResult[]>([])
  const [pendingTests, setPendingTests] = useState<PendingTest[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [selectedLab, setSelectedLab] = useState("all")
  
  // ========== États pour l'ajout manuel ==========
  const [manualEntry, setManualEntry] = useState({
    testName: "",
    category: "general" as const,
    value: "",
    unit: "",
    normalRange: "",
    interpretation: "normal" as const,
    laboratoryName: "",
    comments: ""
  })

  // ========== Chargement initial ==========
  useEffect(() => {
    loadPendingTests()
    loadExistingResults()
    
    // Polling pour nouveaux résultats toutes les 30 secondes
    const interval = setInterval(checkForNewResults, 30000)
    return () => clearInterval(interval)
  }, [consultationId, patientId])

  // ========== Fonctions de chargement ==========
  const loadPendingTests = async () => {
    try {
      // Convertir les tests prescrits en tests en attente
      const pending = prescribedTests.map(test => ({
        id: `pending_${Date.now()}_${Math.random()}`,
        testName: test.nom || test.name,
        category: test.categorie || test.category,
        prescribedAt: new Date().toISOString(),
        expectedBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24h
        laboratoryId: "lab_general",
        urgency: test.urgence ? 'urgent' : 'routine',
        status: 'ordered' as const
      }))
      
      setPendingTests(pending)
    } catch (error) {
      console.error("Erreur lors du chargement des tests en attente:", error)
    }
  }

  const loadExistingResults = async () => {
    setLoading(true)
    try {
      // Simuler le chargement depuis l'API
      const savedResults = localStorage.getItem(`biology_results_${consultationId}`)
      if (savedResults) {
        const parsedResults = JSON.parse(savedResults)
        setResults(parsedResults)
        onResultsUpdated(parsedResults)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des résultats:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkForNewResults = async () => {
    try {
      // Ici serait l'appel API réel vers les laboratoires
      console.log("Vérification de nouveaux résultats...")
      
      // Simuler la réception d'un nouveau résultat
      if (Math.random() > 0.95 && pendingTests.length > 0) {
        const randomTest = pendingTests[Math.floor(Math.random() * pendingTests.length)]
        await simulateNewResult(randomTest)
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error)
    }
  }

  // ========== Simulation de réception de résultat ==========
  const simulateNewResult = async (test: PendingTest) => {
    const newResult: BiologyResult = {
      id: `result_${Date.now()}`,
      testId: test.id,
      patientId,
      consultationId,
      laboratoryId: test.laboratoryId,
      laboratoryName: "Laboratoire Central Maurice",
      testName: test.testName,
      category: test.category as any,
      value: generateMockValue(test.testName),
      unit: getMockUnit(test.testName),
      referenceRange: getMockReferenceRange(test.testName),
      status: 'received',
      receivedAt: new Date().toISOString(),
      isAbnormal: Math.random() > 0.7,
      isCritical: Math.random() > 0.9,
      labSignature: "digital_signature_" + Date.now()
    }

    // Ajouter le résultat
    const updatedResults = [...results, newResult]
    setResults(updatedResults)
    
    // Retirer de la liste des tests en attente
    setPendingTests(prev => prev.filter(p => p.id !== test.id))
    
    // Sauvegarder et notifier
    localStorage.setItem(`biology_results_${consultationId}`, JSON.stringify(updatedResults))
    onResultsUpdated(updatedResults)
    
    toast({
      title: "Nouveau résultat reçu",
      description: `${newResult.testName} - ${newResult.isAbnormal ? 'Anormal' : 'Normal'}`
    })
  }

  // ========== Fonctions utilitaires pour la simulation ==========
  const generateMockValue = (testName: string): string => {
    const values: Record<string, () => string> = {
      "Complete Blood Count": () => "4.5",
      "Glucose": () => (Math.random() * 50 + 70).toFixed(1),
      "Cholesterol": () => (Math.random() * 100 + 150).toFixed(0),
      "Creatinine": () => (Math.random() * 0.5 + 0.7).toFixed(2),
      "Hemoglobin": () => (Math.random() * 5 + 12).toFixed(1)
    }
    
    return values[testName]?.() || (Math.random() * 100).toFixed(1)
  }

  const getMockUnit = (testName: string): string => {
    const units: Record<string, string> = {
      "Complete Blood Count": "x10³/μL",
      "Glucose": "mg/dL",
      "Cholesterol": "mg/dL", 
      "Creatinine": "mg/dL",
      "Hemoglobin": "g/dL"
    }
    
    return units[testName] || "units"
  }

  const getMockReferenceRange = (testName: string) => {
    const ranges: Record<string, any> = {
      "Complete Blood Count": {
        min: 4.0,
        max: 11.0,
        normalRange: "4.0-11.0 x10³/μL",
        interpretation: "normal"
      },
      "Glucose": {
        min: 70,
        max: 100,
        normalRange: "70-100 mg/dL",
        interpretation: "normal"
      }
    }
    
    return ranges[testName] || {
      normalRange: "Voir valeurs de référence",
      interpretation: "normal"
    }
  }

  // ========== Ajout manuel de résultat ==========
  const handleManualEntry = async () => {
    if (!manualEntry.testName || !manualEntry.value) {
      toast({
        title: "Erreur",
        description: "Le nom du test et la valeur sont requis",
        variant: "destructive"
      })
      return
    }

    const newResult: BiologyResult = {
      id: `manual_${Date.now()}`,
      testId: `manual_test_${Date.now()}`,
      patientId,
      consultationId,
      laboratoryId: "manual_entry",
      laboratoryName: manualEntry.laboratoryName || "Saisie manuelle",
      testName: manualEntry.testName,
      category: manualEntry.category,
      value: manualEntry.value,
      unit: manualEntry.unit,
      referenceRange: {
        normalRange: manualEntry.normalRange,
        interpretation: manualEntry.interpretation
      },
      status: 'validated',
      receivedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(),
      validatedBy: "Manuel",
      isAbnormal: manualEntry.interpretation !== 'normal',
      isCritical: manualEntry.interpretation === 'critical',
      comments: manualEntry.comments
    }

    const updatedResults = [...results, newResult]
    setResults(updatedResults)
    localStorage.setItem(`biology_results_${consultationId}`, JSON.stringify(updatedResults))
    onResultsUpdated(updatedResults)

    // Reset du formulaire
    setManualEntry({
      testName: "",
      category: "general",
      value: "",
      unit: "",
      normalRange: "",
      interpretation: "normal",
      laboratoryName: "",
      comments: ""
    })

    toast({
      title: "Résultat ajouté",
      description: "Le résultat a été ajouté manuellement"
    })
  }

  // ========== Validation de résultat ==========
  const validateResult = async (resultId: string) => {
    setResults(prev => prev.map(result => 
      result.id === resultId 
        ? { 
            ...result, 
            status: 'validated',
            validatedAt: new Date().toISOString(),
            validatedBy: "Dr. Current"
          }
        : result
    ))
    
    toast({
      title: "Résultat validé",
      description: "Le résultat a été validé par le médecin"
    })
  }

  // ========== Filtrage et recherche ==========
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      const matchesSearch = result.testName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === "all" || result.category === filterCategory
      const matchesLab = selectedLab === "all" || result.laboratoryName.includes(selectedLab)
      
      return matchesSearch && matchesCategory && matchesLab
    })
  }, [results, searchTerm, filterCategory, selectedLab])

  // ========== Statistiques ==========
  const stats = useMemo(() => {
    const total = results.length
    const abnormal = results.filter(r => r.isAbnormal).length
    const critical = results.filter(r => r.isCritical).length
    const pending = pendingTests.length
    
    return { total, abnormal, critical, pending }
  }, [results, pendingTests])

  // ========== Rendu des composants ==========
  const ResultCard = ({ result }: { result: BiologyResult }) => (
    <Card className={`mb-4 ${result.isCritical ? 'border-blue-500' : result.isAbnormal ? 'border-cyan-500' : 'border-teal-500'}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-bold">{result.testName}</h4>
            <p className="text-sm text-gray-600">{result.laboratoryName}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={
              result.isCritical ? 'bg-blue-100 text-blue-800' :
              result.isAbnormal ? 'bg-cyan-100 text-cyan-800' :
              'bg-teal-100 text-teal-800'
            }>
              {result.isCritical ? 'CRITIQUE' : result.isAbnormal ? 'ANORMAL' : 'NORMAL'}
            </Badge>
            <Badge variant="outline">
              {result.status === 'validated' ? 'Validé' : 'Non validé'}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Valeur: </span>
            <span className="text-lg font-bold">{result.value} {result.unit}</span>
          </div>
          <div>
            <span className="font-medium">Référence: </span>
            {result.referenceRange.normalRange}
          </div>
          <div>
            <span className="font-medium">Reçu le: </span>
            {new Date(result.receivedAt).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Catégorie: </span>
            {result.category}
          </div>
        </div>
        
        {result.comments && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <span className="font-medium">Commentaires: </span>
            {result.comments}
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          {result.status !== 'validated' && (
            <Button size="sm" onClick={() => validateResult(result.id)}>
              <Check className="h-4 w-4 mr-2" />
              Valider
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Détails
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const PendingTestCard = ({ test }: { test: PendingTest }) => (
    <Card className="mb-4 border-gray-300">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold">{test.testName}</h4>
            <p className="text-sm text-gray-600">Prescrit le: {new Date(test.prescribedAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={test.urgency === 'urgent' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}>
              {test.urgency === 'urgent' ? 'URGENT' : 'ROUTINE'}
            </Badge>
            <Badge variant="outline">EN ATTENTE</Badge>
          </div>
        </div>
        <div className="mt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => simulateNewResult(test)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Simuler réception
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // ========== Rendu principal ==========
  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TestTube className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm text-gray-600">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
            <p className="text-2xl font-bold">{stats.abnormal}</p>
            <p className="text-sm text-gray-600">Anormaux</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{stats.critical}</p>
            <p className="text-sm text-gray-600">Critiques</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nom du test..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="hematology">Hématologie</SelectItem>
                  <SelectItem value="clinicalChemistry">Biochimie</SelectItem>
                  <SelectItem value="immunology">Immunologie</SelectItem>
                  <SelectItem value="microbiology">Microbiologie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Laboratoire</Label>
              <Select value={selectedLab} onValueChange={setSelectedLab}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="Central">Laboratoire Central</SelectItem>
                  <SelectItem value="Clinique">Clinique Darné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={checkForNewResults} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            En attente ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="results">
            Résultats ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="manual">
            Saisie manuelle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="space-y-4">
            {pendingTests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Aucun test en attente</p>
                </CardContent>
              </Card>
            ) : (
              pendingTests.map(test => (
                <PendingTestCard key={test.id} test={test} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Aucun résultat disponible</p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map(result => (
                <ResultCard key={result.id} result={result} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un résultat manuellement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom du test</Label>
                  <Input
                    value={manualEntry.testName}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, testName: e.target.value }))}
                    placeholder="Ex: Hemoglobin"
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select 
                    value={manualEntry.category} 
                    onValueChange={(value: any) => setManualEntry(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Général</SelectItem>
                      <SelectItem value="hematology">Hématologie</SelectItem>
                      <SelectItem value="clinicalChemistry">Biochimie</SelectItem>
                      <SelectItem value="immunology">Immunologie</SelectItem>
                      <SelectItem value="microbiology">Microbiologie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valeur</Label>
                  <Input
                    value={manualEntry.value}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Ex: 12.5"
                  />
                </div>
                <div>
                  <Label>Unité</Label>
                  <Input
                    value={manualEntry.unit}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Ex: g/dL"
                  />
                </div>
                <div>
                  <Label>Valeurs de référence</Label>
                  <Input
                    value={manualEntry.normalRange}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, normalRange: e.target.value }))}
                    placeholder="Ex: 12.0-15.5 g/dL"
                  />
                </div>
                <div>
                  <Label>Interprétation</Label>
                  <Select 
                    value={manualEntry.interpretation} 
                    onValueChange={(value: any) => setManualEntry(prev => ({ ...prev, interpretation: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Bas</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Laboratoire</Label>
                  <Input
                    value={manualEntry.laboratoryName}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, laboratoryName: e.target.value }))}
                    placeholder="Ex: Laboratoire Central"
                  />
                </div>
              </div>
              <div>
                <Label>Commentaires</Label>
                <Textarea
                  value={manualEntry.comments}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Commentaires optionnels..."
                />
              </div>
              <Button onClick={handleManualEntry}>
                <Upload className="h-4 w-4 mr-2" />
                Ajouter le résultat
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== 3. INTÉGRATION DANS LE RAPPORT PROFESSIONNEL ====================
// Ajouter ce bloc dans ProfessionalReportEditable après la ligne 45 (après les autres imports)

// Import du nouveau composant
import { BiologyResultsManager } from './biology-results-manager'

// ==================== 4. MODIFICATIONS À APPORTER ====================

/* 
ÉTAPE 1: Dans professional-report.tsx, ajouter un nouvel onglet "Résultats" après l'onglet "Imagerie"

REMPLACER cette section (ligne ~1950):
<TabsList className="grid w-full grid-cols-5">

PAR:
<TabsList className="grid w-full grid-cols-6">

ET AJOUTER après TabsTrigger "imagerie":
<TabsTrigger value="resultats">
  <TestTube className="h-4 w-4 mr-2" />
  Résultats
  {results.length > 0 && (
    <Badge variant="secondary" className="ml-2">
      {results.length}
    </Badge>
  )}
</TabsTrigger>

PUIS AJOUTER après TabsContent "imagerie":
<TabsContent value="resultats">
  <BiologyResultsManager
    consultationId={reportId || ""}
    patientId={getReportPatient().nom || ""}
    prescribedTests={report?.ordonnances?.biologie?.prescription?.analyses ? 
      Object.values(report.ordonnances.biologie.prescription.analyses).flat() : []}
    onResultsUpdated={(results) => {
      // Mettre à jour l'état des résultats dans le rapport
      setResults(results)
    }}
  />
</TabsContent>
*/

/* 
ÉTAPE 2: Ajouter l'état des résultats dans ProfessionalReportEditable

AJOUTER après la ligne const [saving, setSaving] = useState(false):
const [results, setResults] = useState<BiologyResult[]>([])
*/

/*
ÉTAPE 3: Modifier la section biologie pour afficher les résultats

Dans BiologyPrescription, AJOUTER après le rendu des tests prescrits:

{results.length > 0 && (
  <div className="mt-8 border-t pt-6">
    <h3 className="font-bold text-lg mb-4 text-blue-800">RÉSULTATS REÇUS</h3>
    <div className="space-y-4">
      {results.map(result => (
        <div key={result.id} className="p-4 border rounded-lg bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{result.testName}</p>
              <p className="text-lg font-bold">
                {result.value} {result.unit}
                <Badge className={`ml-2 ${
                  result.isCritical ? 'bg-blue-100 text-blue-800' :
                  result.isAbnormal ? 'bg-cyan-100 text-cyan-800' :
                  'bg-teal-100 text-teal-800'
                }`}>
                  {result.isCritical ? 'CRITIQUE' : result.isAbnormal ? 'ANORMAL' : 'NORMAL'}
                </Badge>
              </p>
              <p className="text-sm text-gray-600">
                Référence: {result.referenceRange.normalRange}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(result.receivedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
*/

export default BiologyResultsManager
