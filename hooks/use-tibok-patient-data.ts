import { useEffect, useState } from 'react'

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

export function useTibokPatientData() {
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null)
  const [isFromTibok, setIsFromTibok] = useState(false)

  useEffect(() => {
    const handlePatientData = (event: CustomEvent) => {
      console.log('Received patient data from TIBOK:', event.detail)
      setPatientData(event.detail.patient)
      setConsultationData(event.detail.consultation)
      setIsFromTibok(true)
    }

    // Listen for the custom event
    window.addEventListener('tibok-patient-data', handlePatientData as EventListener)

    return () => {
      window.removeEventListener('tibok-patient-data', handlePatientData as EventListener)
    }
  }, [])

  return {
    patientData,
    consultationData,
    isFromTibok
  }
}
