// lib/tibok-consultation-service.ts
// Service to fetch consultation data from Tibok's consultations table

import { supabase } from './supabase'

export type ConsultationSpecialty = 'general' | 'dermatology' | 'chronic_disease'

export interface TibokConsultationData {
  id: string
  consultation_specialty: ConsultationSpecialty
  temp_image_url: string | null
  has_temp_image: boolean
  image_expires_at: string | null
  unable_to_provide_image: boolean
  patient_id: string
  doctor_id: string
}

export interface FetchConsultationResult {
  success: boolean
  data: TibokConsultationData | null
  error: string | null
}

/**
 * Fetch consultation data from Tibok's consultations table
 * This includes consultation type and dermatology image URL
 */
export async function fetchTibokConsultationData(
  consultationId: string
): Promise<FetchConsultationResult> {
  if (!consultationId) {
    return {
      success: false,
      data: null,
      error: 'No consultation ID provided'
    }
  }

  try {
    console.log('🔍 Fetching consultation data from Tibok for ID:', consultationId)

    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id,
        consultation_specialty,
        temp_image_url,
        has_temp_image,
        image_expires_at,
        unable_to_provide_image,
        patient_id,
        doctor_id
      `)
      .eq('id', consultationId)
      .single()

    if (error) {
      console.error('❌ Error fetching consultation data:', error)
      return {
        success: false,
        data: null,
        error: error.message
      }
    }

    if (!data) {
      console.warn('⚠️ No consultation found for ID:', consultationId)
      return {
        success: false,
        data: null,
        error: 'Consultation not found'
      }
    }

    console.log('✅ Consultation data fetched successfully:', {
      id: data.id,
      specialty: data.consultation_specialty,
      hasImage: data.has_temp_image,
      imageUrl: data.temp_image_url ? '✓ Present' : '✗ Not present',
      unableToProvide: data.unable_to_provide_image
    })

    return {
      success: true,
      data: {
        id: data.id,
        consultation_specialty: data.consultation_specialty || 'general',
        temp_image_url: data.temp_image_url,
        has_temp_image: data.has_temp_image || false,
        image_expires_at: data.image_expires_at,
        unable_to_provide_image: data.unable_to_provide_image || false,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id
      },
      error: null
    }
  } catch (error) {
    console.error('❌ Unexpected error fetching consultation:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if the image URL is still valid (not expired)
 */
export function isImageUrlValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false

  const expirationDate = new Date(expiresAt)
  const now = new Date()

  return expirationDate > now
}

/**
 * Fetch dermatology image from Tibok's temp URL
 * Returns the image as a base64 data URL
 */
export async function fetchDermatologyImage(
  imageUrl: string
): Promise<{ success: boolean; dataUrl: string | null; error: string | null }> {
  if (!imageUrl) {
    return {
      success: false,
      dataUrl: null,
      error: 'No image URL provided'
    }
  }

  try {
    console.log('📸 Fetching dermatology image from Tibok...')

    const response = await fetch(imageUrl)

    if (!response.ok) {
      console.error('❌ Failed to fetch image:', response.status, response.statusText)
      return {
        success: false,
        dataUrl: null,
        error: `Failed to fetch image: ${response.status} ${response.statusText}`
      }
    }

    const blob = await response.blob()

    // Convert blob to base64 data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        console.log('✅ Image fetched successfully, size:', Math.round(blob.size / 1024), 'KB')
        resolve({
          success: true,
          dataUrl,
          error: null
        })
      }
      reader.onerror = () => {
        console.error('❌ Error reading image blob')
        resolve({
          success: false,
          dataUrl: null,
          error: 'Failed to read image data'
        })
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('❌ Error fetching image:', error)
    return {
      success: false,
      dataUrl: null,
      error: error instanceof Error ? error.message : 'Unknown error fetching image'
    }
  }
}

/**
 * Map consultation_specialty to internal consultation type
 */
export function mapSpecialtyToConsultationType(
  specialty: ConsultationSpecialty
): 'normal' | 'dermatology' | 'chronic' {
  switch (specialty) {
    case 'dermatology':
      return 'dermatology'
    case 'chronic_disease':
      return 'chronic'
    case 'general':
    default:
      return 'normal'
  }
}
