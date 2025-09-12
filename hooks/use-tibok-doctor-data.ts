import { useEffect, useState } from 'react'

interface DoctorData {
  id: string
  fullName: string
  email: string
  phone: string
  medicalCouncilNumber: string
  medical_council_number?: string  // Alternative field name
  mcm_reg_no?: string              // Your actual database column
  specialty: string
  experience: string
  languages: string[]
  description: string
  qualifications?: string
  clinicAddress?: string
  clinic_address?: string  // Database field name
  consultationHours?: string
  consultation_hours?: string  // Database field name
}

export function useTibokDoctorData() {
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null)
  const [isFromTibok, setIsFromTibok] = useState(false)

  useEffect(() => {
    // Check URL parameters first
    const params = new URLSearchParams(window.location.search)
    const doctorDataParam = params.get('doctorData')
    
    if (doctorDataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(doctorDataParam))
        console.log('👨‍⚕️ Doctor data from URL:', parsedData)
        
        // Normalize field names from database with all possible variations
        const normalizedData = {
          ...parsedData,
          // Map the MCM registration number from various possible field names
          medicalCouncilNumber: parsedData.medicalCouncilNumber || 
                               parsedData.medical_council_number || 
                               parsedData.mcm_reg_no || 
                               '[MCM Registration Required]',
          clinicAddress: parsedData.clinicAddress || parsedData.clinic_address,
          consultationHours: parsedData.consultationHours || parsedData.consultation_hours
        }
        
        setDoctorData(normalizedData)
        setIsFromTibok(true)
        
        // Store in sessionStorage for persistence
        sessionStorage.setItem('tibokDoctorData', JSON.stringify(normalizedData))
      } catch (error) {
        console.error('Error parsing doctor data from URL:', error)
      }
    } else {
      // Check sessionStorage as fallback
      const storedDoctorData = sessionStorage.getItem('tibokDoctorData')
      if (storedDoctorData) {
        try {
          const parsedData = JSON.parse(storedDoctorData)
          console.log('👨‍⚕️ Doctor data from sessionStorage:', parsedData)
          setDoctorData(parsedData)
          setIsFromTibok(true)
        } catch (error) {
          console.error('Error parsing stored doctor data:', error)
        }
      }
    }
  }, [])

  return {
    doctorData,
    isFromTibok
  }
}
