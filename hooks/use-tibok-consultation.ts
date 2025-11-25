// hooks/use-tibok-consultation.ts
// React hook to fetch and manage consultation data from Tibok

import { useEffect, useState, useCallback } from 'react'
import {
  fetchTibokConsultationData,
  fetchDermatologyImage,
  isImageUrlValid,
  mapSpecialtyToConsultationType,
  TibokConsultationData,
  ConsultationSpecialty
} from '@/lib/tibok-consultation-service'

export interface DermatologyImageData {
  id: number
  name: string
  size: number
  type: string
  dataUrl: string
  uploadedAt: string
  source: 'tibok' | 'manual'
}

export interface UseTibokConsultationResult {
  // Consultation data
  consultationData: TibokConsultationData | null
  consultationType: 'normal' | 'dermatology' | 'chronic' | null

  // Dermatology specific
  dermatologyImage: DermatologyImageData | null
  hasPatientImage: boolean
  imageExpired: boolean
  unableToProvideImage: boolean

  // Loading states
  loading: boolean
  loadingImage: boolean

  // Errors
  error: string | null
  imageError: string | null

  // Actions
  fetchConsultation: (consultationId: string) => Promise<void>
  fetchImage: () => Promise<void>

  // Flags
  isDermatology: boolean
  shouldShowImageUpload: boolean
}

export function useTibokConsultation(): UseTibokConsultationResult {
  const [consultationData, setConsultationData] = useState<TibokConsultationData | null>(null)
  const [consultationType, setConsultationType] = useState<'normal' | 'dermatology' | 'chronic' | null>(null)
  const [dermatologyImage, setDermatologyImage] = useState<DermatologyImageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingImage, setLoadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  // Derived states
  const hasPatientImage = consultationData?.has_temp_image || false
  const imageExpired = consultationData?.image_expires_at
    ? !isImageUrlValid(consultationData.image_expires_at)
    : true
  const unableToProvideImage = consultationData?.unable_to_provide_image || false
  const isDermatology = consultationData?.consultation_specialty === 'dermatology'

  // Should show manual upload if:
  // - Patient didn't upload image (no temp_image_url and not unable_to_provide)
  // - OR image has expired
  // - OR there was an error fetching the image
  const shouldShowImageUpload = isDermatology && (
    (!hasPatientImage && !unableToProvideImage) ||
    imageExpired ||
    (imageError !== null && dermatologyImage === null)
  )

  /**
   * Fetch consultation data from Tibok
   */
  const fetchConsultation = useCallback(async (consultationId: string) => {
    if (!consultationId) {
      console.log('⚠️ No consultation ID provided to fetch')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching Tibok consultation data...')
      const result = await fetchTibokConsultationData(consultationId)

      if (result.success && result.data) {
        setConsultationData(result.data)

        // Map specialty to consultation type
        const mappedType = mapSpecialtyToConsultationType(result.data.consultation_specialty)
        setConsultationType(mappedType)

        console.log('✅ Consultation data loaded:', {
          specialty: result.data.consultation_specialty,
          mappedType,
          hasImage: result.data.has_temp_image,
          imageUrl: result.data.temp_image_url ? 'Present' : 'Not present'
        })

        // Auto-fetch dermatology image if available
        if (
          result.data.consultation_specialty === 'dermatology' &&
          result.data.has_temp_image &&
          result.data.temp_image_url &&
          isImageUrlValid(result.data.image_expires_at)
        ) {
          console.log('📸 Dermatology consultation with valid image, auto-fetching...')
          await fetchImageInternal(result.data.temp_image_url)
        }
      } else {
        setError(result.error || 'Failed to fetch consultation data')
        console.error('❌ Failed to fetch consultation:', result.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('❌ Error fetching consultation:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Internal function to fetch image
   */
  const fetchImageInternal = async (imageUrl: string) => {
    setLoadingImage(true)
    setImageError(null)

    try {
      console.log('📸 Fetching dermatology image...')
      const result = await fetchDermatologyImage(imageUrl)

      if (result.success && result.dataUrl) {
        // Create image data object
        const imageData: DermatologyImageData = {
          id: Date.now(),
          name: 'patient-uploaded-image.jpg',
          size: Math.round((result.dataUrl.length * 3) / 4), // Approximate size from base64
          type: 'image/jpeg',
          dataUrl: result.dataUrl,
          uploadedAt: new Date().toISOString(),
          source: 'tibok'
        }

        setDermatologyImage(imageData)
        console.log('✅ Dermatology image loaded from Tibok')
      } else {
        setImageError(result.error || 'Failed to fetch image')
        console.error('❌ Failed to fetch image:', result.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setImageError(errorMessage)
      console.error('❌ Error fetching image:', err)
    } finally {
      setLoadingImage(false)
    }
  }

  /**
   * Public function to fetch image (can be called manually)
   */
  const fetchImage = useCallback(async () => {
    if (!consultationData?.temp_image_url) {
      console.log('⚠️ No image URL available to fetch')
      return
    }

    if (!isImageUrlValid(consultationData.image_expires_at)) {
      setImageError('Image URL has expired')
      console.log('⚠️ Image URL has expired')
      return
    }

    await fetchImageInternal(consultationData.temp_image_url)
  }, [consultationData])

  // Auto-fetch consultation on mount if consultationId is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const consultationId = urlParams.get('consultationId')

    if (consultationId) {
      console.log('🚀 Auto-fetching consultation from URL param:', consultationId)
      fetchConsultation(consultationId)
    }
  }, [fetchConsultation])

  return {
    // Data
    consultationData,
    consultationType,
    dermatologyImage,
    hasPatientImage,
    imageExpired,
    unableToProvideImage,

    // Loading states
    loading,
    loadingImage,

    // Errors
    error,
    imageError,

    // Actions
    fetchConsultation,
    fetchImage,

    // Flags
    isDermatology,
    shouldShowImageUpload
  }
}
