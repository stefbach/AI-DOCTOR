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

        // Call the API route
        const response = await fetch(`/api/consultation?consultationId=${consultationId}&patientId=${patientId}&source=tibok`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch data')
        }

        const data = await response.json()
        console.log('Received data:', data)

        // Dispatch custom event with patient data
        const event = new CustomEvent('tibok-patient-data', {
          detail: {
            patient: data.patient,
            consultation: data.consultation
          }
        })
        window.dispatchEvent(event)

        // Try to auto-fill form fields
        autoFillForm(data.patient)

        setNotification({
          type: 'success',
          message: `Données de ${data.patient.first_name} ${data.patient.last_name} chargées avec succès`
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
    console.log('Auto-filling form with patient data:', patient)
    
    // Wait for form to be rendered
    setTimeout(() => {
      // Try different selector strategies for the patient form
      const fillField = (selectors: string[], value: any) => {
        for (const selector of selectors) {
          const field = document.querySelector(selector) as HTMLInputElement
          if (field) {
            console.log(`Filling field ${selector} with value:`, value)
            field.value = value || ''
            field.dispatchEvent(new Event('input', { bubbles: true }))
            field.dispatchEvent(new Event('change', { bubbles: true }))
            // Also try React's synthetic event
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(field, value || '')
              const inputEvent = new Event('input', { bubbles: true })
              field.dispatchEvent(inputEvent)
            }
            break
          }
        }
      }

      // Fill patient information
      fillField([
        'input[name="firstName"]',
        'input[id="firstName"]',
        'input[placeholder*="Prénom"]',
        '#firstName'
      ], patient.first_name)

      fillField([
        'input[name="lastName"]',
        'input[id="lastName"]',
        'input[placeholder*="Nom"]',
        '#lastName'
      ], patient.last_name)

      fillField([
        'input[name="age"]',
        'input[id="age"]',
        'input[placeholder*="Âge"]',
        'input[placeholder*="Age"]',
        'input[type="number"][placeholder*="années"]',
        '#age'
      ], patient.age?.toString())

      fillField([
        'input[name="weight"]',
        'input[id="weight"]',
        'input[placeholder*="Poids"]',
        '#weight'
      ], patient.weight?.toString())

      fillField([
        'input[name="height"]',
        'input[id="height"]',
        'input[placeholder*="Taille"]',
        '#height'
      ], patient.height?.toString())

      // Handle gender selection with better matching
      setTimeout(() => {
        const genderValue = patient.gender?.toLowerCase()
        console.log('Setting gender:', genderValue)
        
        // Try radio buttons with different value formats
        const genderRadios = document.querySelectorAll('input[type="radio"][name="gender"], input[type="radio"][id*="male"], input[type="radio"][id*="female"]')
        genderRadios.forEach((radio: any) => {
          const radioValue = radio.value.toLowerCase()
          const radioId = radio.id.toLowerCase()
          
          if ((genderValue === 'male' || genderValue === 'masculin' || genderValue === 'm') && 
              (radioValue === 'masculin' || radioId === 'male')) {
            console.log('Checking male radio:', radio)
            radio.checked = true
            radio.dispatchEvent(new Event('change', { bubbles: true }))
            radio.click()
          } else if ((genderValue === 'female' || genderValue === 'féminin' || genderValue === 'f') && 
                     (radioValue === 'féminin' || radioId === 'female')) {
            console.log('Checking female radio:', radio)
            radio.checked = true
            radio.dispatchEvent(new Event('change', { bubbles: true }))
            radio.click()
          }
        })
      }, 500)

    }, 1500) // Increased timeout to ensure form is loaded
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
