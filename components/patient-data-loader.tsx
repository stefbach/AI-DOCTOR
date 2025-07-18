"use client"

import React, { useEffect, useState } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface PatientData {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  age: number
  height: number
  weight: number
  phone_number: string
  email: string
  address: string
  city: string
  country: string
}

interface ConsultationData {
  id: string
  patient_id: string
  doctor_id: string
  status: string
}

export function PatientDataLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  useEffect(() => {
    const loadPatientData = async () => {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const consultationId = urlParams.get('consultationId')
      const patientId = urlParams.get('patientId')
      const source = urlParams.get('source')

      // Only proceed if coming from TIBOK
      if (source !== 'tibok' || !consultationId || !patientId) {
        return
      }

      setIsLoading(true)

      try {
        console.log('Loading patient data from TIBOK...')

        // Get Supabase URL and anon key from environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Configuration Supabase manquante')
        }

        // Fetch consultation data using Supabase REST API
        const consultationResponse = await fetch(
          `${supabaseUrl}/rest/v1/consultations?id=eq.${consultationId}`,
          {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
          }
        )

        if (!consultationResponse.ok) {
          throw new Error('Failed to fetch consultation')
        }

        const consultationData = await consultationResponse.json()
        if (!consultationData || consultationData.length === 0) {
          throw new Error('Consultation non trouvée')
        }

        const consultation = consultationData[0]

        // Fetch patient data
        const patientResponse = await fetch(
          `${supabaseUrl}/rest/v1/patients?id=eq.${patientId}`,
          {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
          }
        )

        if (!patientResponse.ok) {
          throw new Error('Failed to fetch patient')
        }

        const patientData = await patientResponse.json()
        if (!patientData || patientData.length === 0) {
          throw new Error('Patient non trouvé')
        }

        const patient = patientData[0]

        // Dispatch custom event with patient data
        const event = new CustomEvent('tibok-patient-data', {
          detail: {
            patient,
            consultation
          }
        })
        window.dispatchEvent(event)

        // Try to auto-fill form fields
        autoFillForm(patient)

        setNotification({
          type: 'success',
          message: `Données de ${patient.first_name} ${patient.last_name} chargées avec succès`
        })

        // Clear URL parameters
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, document.title, cleanUrl)

      } catch (error) {
        console.error('Error loading patient data:', error)
        setNotification({
          type: 'error',
          message: error instanceof Error ? error.message : 'Erreur lors du chargement'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPatientData()
  }, [])

  const autoFillForm = (patient: PatientData) => {
    // Wait for form to be rendered
    setTimeout(() => {
      // Try different selector strategies for the patient form
      const fillField = (selectors: string[], value: any) => {
        for (const selector of selectors) {
          const field = document.querySelector(selector) as HTMLInputElement
          if (field) {
            field.value = value || ''
            field.dispatchEvent(new Event('input', { bubbles: true }))
            field.dispatchEvent(new Event('change', { bubbles: true }))
            break
          }
        }
      }

      // Fill patient information
      fillField([
        'input[name="firstName"]',
        'input[name="first_name"]',
        'input[placeholder*="Prénom"]',
        '#firstName'
      ], patient.first_name)

      fillField([
        'input[name="lastName"]',
        'input[name="last_name"]',
        'input[placeholder*="Nom"]',
        '#lastName'
      ], patient.last_name)

      fillField([
        'input[name="age"]',
        'input[placeholder*="Âge"]',
        'input[placeholder*="Age"]',
        '#age'
      ], patient.age?.toString())

      fillField([
        'input[name="weight"]',
        'input[placeholder*="Poids"]',
        '#weight'
      ], patient.weight?.toString())

      fillField([
        'input[name="height"]',
        'input[placeholder*="Taille"]',
        '#height'
      ], patient.height?.toString())

      // Handle gender selection
      const genderValue = patient.gender?.toLowerCase() === 'male' || patient.gender?.toLowerCase() === 'masculin' 
        ? 'Masculin' 
        : patient.gender?.toLowerCase() === 'female' || patient.gender?.toLowerCase() === 'féminin'
        ? 'Féminin'
        : patient.gender

      // Try radio buttons
      const genderRadios = document.querySelectorAll('input[name="gender"], input[name="sexe"]')
      genderRadios.forEach((radio: any) => {
        if (radio.value === genderValue || radio.value === patient.gender) {
          radio.checked = true
          radio.dispatchEvent(new Event('change', { bubbles: true }))
        }
      })

    }, 1000)
  }

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.type === 'success') {
      const timer = setTimeout(() => {
        setNotification({ type: null, message: '' })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Loading indicator
  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">
            Chargement des données patient depuis TIBOK...
          </span>
        </div>
      </div>
    )
  }

  // Success notification
  if (notification.type === 'success') {
    return (
      <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">
                Données patient chargées
              </h4>
              <p className="text-sm text-green-700 mt-1">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification({ type: null, message: '' })}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error notification
  if (notification.type === 'error') {
    return (
      <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">
                Erreur
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification({ type: null, message: '' })}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
