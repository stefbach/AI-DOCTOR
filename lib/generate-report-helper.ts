// lib/generate-report-helper.ts

import { consultationDataService } from './consultation-data-service'

export interface ReportGenerationResult {
  success: boolean
  report?: any
  documents?: any
  error?: string
  errorDetails?: any
}

/**
 * Génère le rapport médical complet en appelant l'API
 * Cette fonction s'assure que les données sont au bon format pour l'API
 */
export async function generateMedicalReport(): Promise<ReportGenerationResult> {
  try {
    console.log('🚀 Début de la génération du rapport médical')
    
    // 1. Récupérer toutes les données au format API
    const reportData = await consultationDataService.getDataForReportGeneration()
    
    // 2. Valider les données
    const validation = consultationDataService.validateDataForReport(reportData)
    if (!validation.isValid) {
      console.error('❌ Données invalides:', validation.errors)
      return {
        success: false,
        error: 'Données incomplètes',
        errorDetails: validation.errors
      }
    }
    
    console.log('✅ Données validées, envoi à l\'API...')
    console.log('📋 Structure des données:', {
      patientData: reportData.patientData ? '✓' : '✗',
      clinicalData: reportData.clinicalData ? '✓' : '✗',
      questionsData: reportData.questionsData ? '✓' : '✗',
      diagnosisData: reportData.diagnosisData ? '✓' : '✗',
      patientDataFormat: reportData.patientData ? {
        nom: reportData.patientData.nom,
        prenom: reportData.patientData.prenom,
        sexe: reportData.patientData.sexe
      } : 'N/A'
    })
    
    // 3. Appeler l'API
    const response = await fetch('/api/generate-consultation-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    })
    
    console.log('📨 Réponse API reçue:', response.status)
    
    // 4. Traiter la réponse
    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ Erreur API:', result)
      return {
        success: false,
        error: result.error || `Erreur HTTP: ${response.status}`,
        errorDetails: result.details || result
      }
    }
    
    console.log('✅ Rapport généré avec succès')
    console.log('📊 Statistiques:', result.statistics)
    
    return {
      success: true,
      report: result.report,
      documents: result.documents
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      errorDetails: error
    }
  }
}

/**
 * Fonction de test pour vérifier que les données sont correctement formatées
 */
export async function testDataFormat(): Promise<void> {
  try {
    const allData = await consultationDataService.getAllData()
    const reportData = await consultationDataService.getDataForReportGeneration()
    
    console.log('=== TEST FORMAT DES DONNÉES ===')
    console.log('1. Données originales (patientData):', allData?.patientData)
    console.log('2. Données transformées (patientDataAPI):', allData?.patientDataAPI)
    console.log('3. Données pour le rapport:', reportData.patientData)
    console.log('4. Validation:', consultationDataService.validateDataForReport(reportData))
    console.log('===============================')
  } catch (error) {
    console.error('Erreur test format:', error)
  }
}

/**
 * Fonction pour réessayer la génération du rapport en cas d'échec
 */
export async function retryGenerateReport(maxRetries: number = 3): Promise<ReportGenerationResult> {
  let lastError: any = null
  
  for (let i = 0; i < maxRetries; i++) {
    console.log(`🔄 Tentative ${i + 1}/${maxRetries}...`)
    
    const result = await generateMedicalReport()
    if (result.success) {
      return result
    }
    
    lastError = result.error
    console.log(`⏳ Attente avant nouvelle tentative...`)
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Attente progressive
  }
  
  return {
    success: false,
    error: `Échec après ${maxRetries} tentatives. Dernière erreur: ${lastError}`
  }
}

/**
 * Fonction pour vérifier l'état de l'API
 */
export async function checkAPIStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/generate-consultation-report', {
      method: 'GET'
    })
    
    if (response.ok) {
      const status = await response.json()
      console.log('📊 État de l\'API:', status)
      return true
    }
    
    return false
  } catch (error) {
    console.error('❌ API inaccessible:', error)
    return false
  }
}

/**
 * Fonction pour récupérer uniquement les données patient formatées pour l'API
 */
export async function getPatientDataForAPI() {
  const data = await consultationDataService.getPatientDataForAPI()
  if (!data) {
    // Si pas de données API, transformer les données du formulaire
    const allData = await consultationDataService.getAllData()
    if (allData?.patientData) {
      return consultationDataService.transformPatientDataForAPI(allData.patientData)
    }
  }
  return data
}

// Export des types utiles
export type { PatientDataAPI } from './consultation-data-service'
