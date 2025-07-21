// hooks/use-tibok-doctor-data.ts
import { useEffect, useState } from 'react'

interface DoctorData {
  id: string
  fullName: string
  email: string
  phone: string
  medicalCouncilNumber: string
  specialty: string
  experience: string
  languages: string[]
  description: string
}

export function useTibokDoctorData() {
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null)
  const [isFromTibok, setIsFromTibok] = useState(false)

  useEffect(() => {
    // Check sessionStorage for doctor data
    const storedDoctorData = sessionStorage.getItem('tibokDoctorData')
    if (storedDoctorData) {
      try {
        const parsedData = JSON.parse(storedDoctorData)
        console.log('Doctor data from sessionStorage:', parsedData)
        setDoctorData(parsedData)
        setIsFromTibok(true)
      } catch (error) {
        console.error('Error parsing stored doctor data:', error)
      }
    }

    // Also check URL parameters (as backup)
    const params = new URLSearchParams(window.location.search)
    const doctorDataParam = params.get('doctorData')
    
    if (doctorDataParam && !doctorData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(doctorDataParam))
        console.log('Doctor data from URL:', parsedData)
        setDoctorData(parsedData)
        setIsFromTibok(true)
        
        // Store in sessionStorage for persistence
        sessionStorage.setItem('tibokDoctorData', JSON.stringify(parsedData))
      } catch (error) {
        console.error('Error parsing doctor data from URL:', error)
      }
    }
  }, [])

  return {
    doctorData,
    isFromTibok
  }
}
