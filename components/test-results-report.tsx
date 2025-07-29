// components/test-results-report.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Download,
  Brain,
  ClipboardList
} from 'lucide-react'

interface TestResultsReportProps {
  testPatient: {
    id: string
    description: string
    expectedConditions?: string[]
    patientData: any
    clinicalData: any
  }
  aiQuestions?: any[]
  aiDiagnosis?: {
    conditions?: string[]
    primaryDiagnosis?: string
    differentialDiagnoses?: string[]
    recommendations?: string[]
  }
  generatedDocuments?: any[]
}

export default function TestResultsReport({
  testPatient,
  aiQuestions,
  aiDiagnosis,
  generatedDocuments
}: TestResultsReportProps) {
  
  // Calculer le score de correspondance pour le diagnostic
  const calculateDiagnosisMatch = () => {
    if (!testPatient.expectedConditions || !aiDiagnosis?.conditions) {
      return { score: 0, matches: [], misses: [] }
    }

    const expected = testPatient.expectedConditions.map(c => c.toLowerCase())
    const actual = aiDiagnosis.conditions.map(c => c.toLowerCase())
    
    const matches = expected.filter(e => 
      actual.some(a => a.includes(e) || e.includes(a))
    )
    
    const misses = expected.filter(e => 
      !actual.some(a => a.includes(e) || e.includes(a))
    )
    
    const score = (matches.length / expected.length) * 100

    return { score, matches, misses }
  }

  const diagnosisMatch = calculateDiagnosisMatch()

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const exportReport = () => {
    const report = {
      testId: testPatient.id,
      timestamp: new Date().toISOString(),
      patient: testPatient.patientData,
      clinical: testPatient.clinicalData,
      expectedConditions: testPatient.expectedConditions,
      aiResults: {
        questions: aiQuestions,
        diagnosis: aiDiagnosis,
        diagnosisScore: diagnosisMatch.score
      },
      documents: generatedDocuments
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-report-${testPatient.id}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="mt-6 border-2 border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <FileText className="h-5 w-5" />
            Rapport de Test IA
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportReport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Information du patient test */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-semibold mb-2">Patient Test</h3>
          <p className="text-sm text-gray-600">ID: {testPatient.id}</p>
          <p className="text-sm">{testPatient.description}</p>
        </div>

        {/* Résultats des questions IA */}
        {aiQuestions && aiQuestions.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Questions IA Générées
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Nombre de questions: {aiQuestions.length}
              </p>
              <Badge variant="secondary">
                {aiQuestions.some(q => q.critical) ? 'Questions critiques détectées' : 'Pas de questions critiques'}
              </Badge>
            </div>
          </div>
        )}

        {/* Résultats du diagnostic IA */}
        {aiDiagnosis && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Diagnostic IA
            </h3>
            
            {/* Score de correspondance */}
            {testPatient.expectedConditions && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Score de correspondance:</span>
                  <span className={`text-2xl font-bold ${getScoreColor(diagnosisMatch.score)}`}>
                    {diagnosisMatch.score.toFixed(0)}%
                  </span>
                </div>
                
                {/* Correspondances */}
                {diagnosisMatch.matches.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Conditions correctement identifiées:</p>
                    <div className="flex flex-wrap gap-1">
                      {diagnosisMatch.matches.map((match, idx) => (
                        <Badge key={idx} variant="default" className="text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {match}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Manqués */}
                {diagnosisMatch.misses.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Conditions manquées:</p>
                    <div className="flex flex-wrap gap-1">
                      {diagnosisMatch.misses.map((miss, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs gap-1">
                          <XCircle className="h-3 w-3" />
                          {miss}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Diagnostic principal */}
            {aiDiagnosis.primaryDiagnosis && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Diagnostic principal:</p>
                <Badge variant="outline" className="text-sm">
                  {aiDiagnosis.primaryDiagnosis}
                </Badge>
              </div>
            )}

            {/* Diagnostics différentiels */}
            {aiDiagnosis.differentialDiagnoses && aiDiagnosis.differentialDiagnoses.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Diagnostics différentiels:</p>
                <div className="flex flex-wrap gap-1">
                  {aiDiagnosis.differentialDiagnoses.map((diag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {diag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents générés */}
        {generatedDocuments && generatedDocuments.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents Générés
            </h3>
            <p className="text-sm text-gray-600">
              {generatedDocuments.length} document(s) généré(s) avec succès
            </p>
          </div>
        )}

        {/* Statut global */}
        <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
          <div className="flex items-center gap-2">
            {diagnosisMatch.score >= 80 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-600">Test réussi</span>
              </>
            ) : diagnosisMatch.score >= 60 ? (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-600">Test partiellement réussi</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-600">Test échoué - Vérification requise</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
