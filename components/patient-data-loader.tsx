"use client"

import React, { useEffect, useState } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface PatientData {
  id?: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  age?: number
  gender?: string
  weight?: number
  height?: number
}

export function PatientDataLoader() {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  useEffect(() => {
    const loadPatientData = () => {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const consultationId = urlParams.get('consultationId')
      const patientId = urlParams.get('patientId')
      const source = urlParams.get('source')
      const patientDataParam = urlParams.get('patientData')

      // Only proceed if coming from TIBOK
      if (source !== 'tibok' || !consultationId || !patientId) {
        return
      }

      try {
        console.log('Processing TIBOK data...')
        
        let patientData: PatientData = { id: patientId }
        
        // Try to parse patient data from URL if provided
        if (patientDataParam) {
          try {
            const decodedData = JSON.parse(decodeURIComponent(patientDataParam))
            patientData = { ...patientData, ...decodedData }
            console.log('Patient data from URL:', patientData)
          } catch (e) {
            console.log('Could not parse patient data from URL')
          }
        }

        // Dispatch custom event with whatever data we have
        const event = new CustomEvent('tibok-patient-data', {
          detail: {
            patient: {
              id: patientId,
              first_name: patientData.firstName || patientData.first_name || '',
              last_name: patientData.lastName || patientData.last_name || '',
              age: patientData.age,
              gender: patientData.gender,
              weight: patientData.weight,
              height: patientData.height
            },
            consultation: {
              id: consultationId,
              patient_id: patientId
            },
            isFromTibok: true
          }
        })
        window.dispatchEvent(event)

        // If we have some patient data, try to auto-fill
        if (patientData.firstName || patientData.lastName || patientData.first_name || patientData.last_name) {
          autoFillForm({
            first_name: patientData.firstName || patientData.first_name || '',
            last_name: patientData.lastName || patientData.last_name || '',
            age: patientData.age,
            gender: patientData.gender,
            weight: patientData.weight,
            height: patientData.height
          } as any)
          
          setNotification({
            type: 'success',
            message: `Consultation TIBOK liée - Patient: ${patientData.firstName || patientData.first_name || 'ID'} ${patientData.lastName || patientData.last_name || patientId}`
          })
        } else {
          setNotification({
            type: 'success',
            message: `Consultation TIBOK liée - ID Patient: ${patientId}`
          })
        }

        // Clear URL parameters
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, document.title, cleanUrl)

      } catch (error) {
        console.error('Error processing TIBOK data:', error)
        setNotification({
          type: 'error',
          message: 'Erreur lors du traitement des données TIBOK'
        })
      }
    }

    // Run immediately
    loadPatientData()
  }, [])

  const autoFillForm = (patient: any) => {
    console.log('Auto-filling form with patient data:', patient)
    
    // Wait for form to be rendered
    setTimeout(() => {
      const fillField = (selectors: string[], value: any) => {
        if (!value) return
        
        for (const selector of selectors) {
          const field = document.querySelector(selector) as HTMLInputElement
          if (field) {
            console.log(`Filling field ${selector} with value:`, value)
            field.value = value.toString()
            
            // Dispatch multiple events to ensure React components update
            field.dispatchEvent(new Event('input', { bubbles: true }))
            field.dispatchEvent(new Event('change', { bubbles: true }))
            field.dispatchEvent(new Event('blur', { bubbles: true }))
            
            // Force React to update
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(field, value.toString())
              field.dispatchEvent(new Event('input', { bubbles: true }))
            }
            break
          }
        }
      }

      // Fill patient information
      fillField([
        'input[name="firstName"]',
        'input[id="firstName"]',
        'input[placeholder*="Prénom"]'
      ], patient.first_name)

      fillField([
        'input[name="lastName"]',
        'input[id="lastName"]',
        'input[placeholder*="Nom"]'
      ], patient.last_name)

      fillField([
        'input[name="age"]',
        'input[id="age"]',
        'input[type="number"][placeholder*="années"]'
      ], patient.age)

      fillField([
        'input[name="weight"]',
        'input[id="weight"]',
        'input[placeholder*="Poids"]'
      ], patient.weight)

      fillField([
        'input[name="height"]',
        'input[id="height"]',
        'input[placeholder*="Taille"]'
      ], patient.height)

      // Handle gender with select dropdown
      if (patient.gender) {
        setTimeout(() => {
          const genderValue = patient.gender.toLowerCase()
          console.log('Setting gender value:', genderValue)
          
          // Map gender values to the expected format
          let mappedGender = patient.gender
          if (genderValue === 'm' || genderValue === 'male' || genderValue.includes('mas')) {
            mappedGender = 'Masculin'
          } else if (genderValue === 'f' || genderValue === 'female' || genderValue.includes('fem')) {
            mappedGender = 'Féminin'
          }
          
          // Fill the select dropdown
          fillField([
            'select[name="gender"]',
            'select[id="gender"]',
            '#gender',
            '[name="gender"]'
          ], mappedGender)
          
          // Also try to trigger the select component
          const selectTrigger = document.querySelector('[id="gender"]') as HTMLElement
          if (selectTrigger) {
            // For shadcn/ui Select component, we might need to update the trigger button
            const triggerButton = selectTrigger.querySelector('button') || selectTrigger
            if (triggerButton) {
              console.log('Found select trigger button')
              // Update the displayed value
              const valueSpan = triggerButton.querySelector('span')
              if (valueSpan) {
                valueSpan.textContent = mappedGender
              }
            }
          }
        }, 500)
      }

    }, 1500)
  }

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.type) {
      const timer = setTimeout(() => {
        setNotification({ type: null, message: '' })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Success notification
  if (notification.type === 'success') {
    return (
      <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">
                Connexion TIBOK établie
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
