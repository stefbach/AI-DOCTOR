// lib/consultation-data-service.ts

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Types pour les données de consultation
export interface ConsultationData {
  patientData?: any
  patientDataAPI?: any // Données transformées pour l'API
  clinicalData?: any
  questionsData?: any
  diagnosisData?: any
  documentData?: any
  editedDocuments?: any
  language?: string
  timestamp?: string
  currentStep?: number
}

export interface PatientDataAPI {
  nom: string
  prenom: string
  dateNaissance: string
  age: string
  sexe: string
  sex?: string
  gender?: string
  profession?: string
  telephone: string
  email: string
  adresse: string
  ville?: string
  pays?: string
  numeroSecuriteSociale?: string
  medecinTraitant?: string
  poids: string
  taille: string
  allergies: string
  antecedents: {
    medicaux: string
    chirurgicaux: string
    familiaux: string
  }
  medicamentsActuels: string
  habitudes: {
    tabac: string
    alcool: string
    activitePhysique: string
    alimentation: string
    sommeil: string
  }
}

class ConsultationDataService {
  private supabase: SupabaseClient | null = null
  private storagePrefix = 'consultation_data_'
  private currentConsultationKey = 'current_consultation_id'

  constructor() {
    this.supabase = supabase
  }

  /**
   * Vérifie si on est côté client
   */
  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  /**
   * Génère une clé de stockage pour une consultation
   */
  private getStorageKey(consultationId: string): string {
    return `${this.storagePrefix}${consultationId}`
  }

  /**
   * Définit l'ID de consultation actuel
   */
  setCurrentConsultationId(consultationId: string | null) {
    if (!this.isClient()) return
    
    if (consultationId) {
      localStorage.setItem(this.currentConsultationKey, consultationId)
    } else {
      localStorage.removeItem(this.currentConsultationKey)
    }
  }

  /**
   * Récupère l'ID de consultation actuel
   */
  getCurrentConsultationId(): string | null {
    if (!this.isClient()) return null
    return localStorage.getItem(this.currentConsultationKey)
  }

  /**
   * Sauvegarde toutes les données de consultation
   */
  async saveAllData(data: ConsultationData): Promise<ConsultationData> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        throw new Error('No consultation ID found')
      }

      // Ajouter le timestamp
      const dataWithTimestamp = {
        ...data,
        timestamp: new Date().toISOString()
      }

      // Sauvegarder dans localStorage si disponible
      if (this.isClient()) {
        localStorage.setItem(this.getStorageKey(consultationId), JSON.stringify(dataWithTimestamp))
      }

      // Sauvegarder dans Supabase si disponible
      if (this.supabase) {
        const { error } = await this.supabase
          .from('consultation_data')
          .upsert({
            consultation_id: consultationId,
            data: dataWithTimestamp,
            updated_at: new Date().toISOString()
          })

        if (error) {
          console.error('Error saving to Supabase:', error)
          // Ne pas bloquer si Supabase échoue, localStorage est suffisant
        }
      }

      return dataWithTimestamp
    } catch (error) {
      console.error('Error saving consultation data:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les données de consultation
   */
  async getAllData(): Promise<ConsultationData | null> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) {
        return null
      }

      // Essayer d'abord Supabase pour les données les plus récentes
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('consultation_data')
            .select('data')
            .eq('consultation_id', consultationId)
            .single()

          if (!error && data) {
            // Mettre à jour localStorage avec les données de Supabase
            if (this.isClient()) {
              localStorage.setItem(this.getStorageKey(consultationId), JSON.stringify(data.data))
            }
            return data.data
          }
        } catch (supabaseError) {
          console.warn('Supabase fetch failed, falling back to localStorage:', supabaseError)
        }
      }

      // Fallback sur localStorage
      if (this.isClient()) {
        const localData = localStorage.getItem(this.getStorageKey(consultationId))
        if (localData) {
          return JSON.parse(localData)
        }
      }

      return null
    } catch (error) {
      console.error('Error getting consultation data:', error)
      return null
    }
  }

  /**
   * Sauvegarde les données d'une étape spécifique
   */
  async saveStepData(step: number, data: any): Promise<void> {
    try {
      const currentData = await this.getAllData() || {}
      
      // Mapper les étapes aux clés de données
      const stepKeys = {
        0: 'patientData',
        1: 'clinicalData',
        2: 'questionsData',
        3: 'diagnosisData',
        4: 'documentData'
      }

      const key = stepKeys[step as keyof typeof stepKeys]
      if (key) {
        currentData[key] = data
        currentData.currentStep = step
        await this.saveAllData(currentData)
      }
    } catch (error) {
      console.error(`Error saving step ${step} data:`, error)
      throw error
    }
  }

  /**
   * Récupère les données d'une étape spécifique
   */
  async getStepData(step: number): Promise<any | null> {
    try {
      const allData = await this.getAllData()
      if (!allData) return null

      const stepKeys = {
        0: 'patientData',
        1: 'clinicalData',
        2: 'questionsData',
        3: 'diagnosisData',
        4: 'documentData'
      }

      const key = stepKeys[step as keyof typeof stepKeys]
      return key ? allData[key] : null
    } catch (error) {
      console.error(`Error getting step ${step} data:`, error)
      return null
    }
  }

  /**
   * Sauvegarde les données patient au format attendu par l'API
   */
  async savePatientDataForAPI(data: PatientDataAPI): Promise<void> {
    try {
      const currentData = await this.getAllData() || {}
      currentData.patientDataAPI = data
      await this.saveAllData(currentData)
    } catch (error) {
      console.error('Error saving patient data for API:', error)
      throw error
    }
  }

  /**
   * Récupère les données patient au format API
   */
  async getPatientDataForAPI(): Promise<PatientDataAPI | null> {
    try {
      const allData = await this.getAllData()
      return allData?.patientDataAPI || null
    } catch (error) {
      console.error('Error getting patient data for API:', error)
      return null
    }
  }

  /**
   * Transforme les données du formulaire patient au format attendu par l'API
   */
  transformPatientDataForAPI(formData: any): PatientDataAPI {
    // Transformation du genre
    let sexe = 'Non renseigné'
    if (formData.gender && formData.gender.length > 0) {
      const gender = formData.gender[0]
      if (gender === 'Masculin' || gender === 'Male' || gender.toLowerCase() === 'masculin' || gender.toLowerCase() === 'male') {
        sexe = 'Masculin'
      } else if (gender === 'Féminin' || gender === 'Female' || gender.toLowerCase() === 'féminin' || gender.toLowerCase() === 'female') {
        sexe = 'Féminin'
      } else {
        sexe = gender
      }
    } else if (formData.otherGender) {
      sexe = formData.otherGender
    }

    // Transformation des allergies
    const allergiesText = [
      ...(formData.allergies || []),
      ...(formData.otherAllergies ? [formData.otherAllergies] : [])
    ].filter(Boolean).join(', ') || 'Aucune allergie connue'

    // Transformation des antécédents
    const antecedentsText = [
      ...(formData.medicalHistory || []),
      ...(formData.otherMedicalHistory ? [formData.otherMedicalHistory] : [])
    ].filter(Boolean).join(', ') || 'Aucun antécédent notable'

    return {
      // Format attendu par l'API (noms en français)
      nom: formData.lastName || '',
      prenom: formData.firstName || '',
      dateNaissance: formData.birthDate || '',
      age: formData.age || '',
      sexe: sexe,
      sex: sexe, // Ajout pour compatibilité
      gender: sexe, // Ajout pour compatibilité
      profession: formData.profession || '',
      telephone: formData.phone || formData.phoneNumber || '',
      email: formData.email || '',
      adresse: formData.address || '',
      ville: formData.city || '',
      pays: formData.country || 'Maurice',
      numeroSecuriteSociale: formData.numeroSecuriteSociale || '',
      medecinTraitant: formData.medecinTraitant || '',
      
      // Données médicales
      poids: formData.weight || '',
      taille: formData.height || '',
      allergies: allergiesText,
      antecedents: {
        medicaux: antecedentsText,
        chirurgicaux: formData.surgicalHistory || '',
        familiaux: formData.familyHistory || ''
      },
      medicamentsActuels: formData.currentMedicationsText || 'Aucun',
      
      // Habitudes de vie
      habitudes: {
        tabac: formData.lifeHabits?.smoking || 'Non renseigné',
        alcool: formData.lifeHabits?.alcohol || 'Non renseigné',
        activitePhysique: formData.lifeHabits?.physicalActivity || 'Non renseignée',
        alimentation: formData.lifeHabits?.diet || 'Non renseignée',
        sommeil: formData.lifeHabits?.sleep || 'Non renseigné'
      }
    }
  }

  /**
   * Sauvegarde les données cliniques
   */
  async saveClinicalData(data: any): Promise<void> {
    await this.saveStepData(1, data)
  }

  /**
   * Sauvegarde les réponses aux questions
   */
  async saveQuestionsData(data: any): Promise<void> {
    await this.saveStepData(2, data)
  }

  /**
   * Sauvegarde le diagnostic
   */
  async saveDiagnosisData(data: any): Promise<void> {
    await this.saveStepData(3, data)
  }

  /**
   * Sauvegarde les documents édités
   */
  async saveEditedDocuments(documents: any): Promise<void> {
    try {
      const currentData = await this.getAllData() || {}
      currentData.editedDocuments = documents
      await this.saveAllData(currentData)
    } catch (error) {
      console.error('Error saving edited documents:', error)
      throw error
    }
  }

  /**
   * Récupère les documents édités
   */
  async getEditedDocuments(): Promise<any | null> {
    try {
      const allData = await this.getAllData()
      return allData?.editedDocuments || null
    } catch (error) {
      console.error('Error getting edited documents:', error)
      return null
    }
  }

  /**
   * Sauvegarde la langue préférée
   */
  async saveLanguage(language: string): Promise<void> {
    try {
      const currentData = await this.getAllData() || {}
      currentData.language = language
      await this.saveAllData(currentData)
    } catch (error) {
      console.error('Error saving language:', error)
      throw error
    }
  }

  /**
   * Efface toutes les données de la consultation actuelle
   */
  async clearCurrentConsultation(): Promise<void> {
    try {
      const consultationId = this.getCurrentConsultationId()
      if (!consultationId) return

      // Effacer de localStorage
      if (this.isClient()) {
        localStorage.removeItem(this.getStorageKey(consultationId))
      }

      // Effacer de Supabase si disponible
      if (this.supabase) {
        await this.supabase
          .from('consultation_data')
          .delete()
          .eq('consultation_id', consultationId)
      }

      // Effacer l'ID de consultation actuel
      this.setCurrentConsultationId(null)
    } catch (error) {
      console.error('Error clearing consultation data:', error)
      throw error
    }
  }

  /**
   * Vérifie si des données existent pour la consultation actuelle
   */
  async hasData(): Promise<boolean> {
    const data = await this.getAllData()
    return data !== null && Object.keys(data).length > 0
  }

  /**
   * Récupère l'étape actuelle
   */
  async getCurrentStep(): Promise<number> {
    const data = await this.getAllData()
    return data?.currentStep || 0
  }

  /**
   * Exporte toutes les données de consultation
   */
  async exportConsultationData(): Promise<ConsultationData | null> {
    return await this.getAllData()
  }

  /**
   * Importe des données de consultation
   */
  async importConsultationData(data: ConsultationData): Promise<void> {
    await this.saveAllData(data)
  }

  /**
   * Valide et corrige les données patient pour l'API
   */
  validateAndFixPatientDataForAPI(data: any): PatientDataAPI {
    const fixed = { ...data }
    
    // Corriger le sexe si nécessaire
    if (!fixed.sexe || fixed.sexe === 'inconnu' || fixed.sexe === '') {
      if (fixed.gender && Array.isArray(fixed.gender) && fixed.gender.length > 0) {
        const gender = fixed.gender[0].toLowerCase()
        if (gender.includes('mas') || gender === 'male' || gender === 'm') {
          fixed.sexe = 'Masculin'
        } else if (gender.includes('fém') || gender === 'female' || gender === 'f') {
          fixed.sexe = 'Féminin'
        }
      }
    }
    
    // S'assurer que les champs requis sont présents
    fixed.nom = fixed.nom || fixed.lastName || 'Non renseigné'
    fixed.prenom = fixed.prenom || fixed.firstName || 'Non renseigné'
    fixed.age = fixed.age || '0'
    fixed.sex = fixed.sexe // Ajout pour compatibilité
    fixed.gender = fixed.sexe // Ajout pour compatibilité
    
    return fixed as PatientDataAPI
  }

  /**
   * Initialise un nouvel ID de consultation
   */
  initializeNewConsultation(): string {
    const newId = `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.setCurrentConsultationId(newId)
    return newId
  }

  /**
   * Obtient l'ID de consultation depuis Supabase
   */
  async getConsultationIdFromSupabase(patientId?: string): Promise<string | null> {
    if (!this.supabase || !patientId) return null

    try {
      const { data, error } = await this.supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        return data.id
      }
    } catch (error) {
      console.error('Error getting consultation from Supabase:', error)
    }

    return null
  }
}

// Export d'une instance singleton
export const consultationDataService = new ConsultationDataService()

// Export du type
export type { ConsultationDataService }
