'use client'

import { useState, useEffect } from 'react'
import { useTibokDoctorData } from './use-tibok-doctor-data'

export interface DoctorInfo {
  id: string
  fullName: string
  email: string
  phone: string
  medicalCouncilNumber: string
  specialty: string
  experience?: string
  languages?: string[]
  description?: string
  qualifications?: string
  clinicAddress?: string
  consultationHours?: string
  licenseNumber?: string
}

export function useDoctorInfo() {
  const { doctorData: tibokDoctorData, isFromTibok } = useTibokDoctorData()
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tibokDoctorData && isFromTibok) {
      const doctorData: DoctorInfo = {
        id: tibokDoctorData.id,
        fullName: tibokDoctorData.fullName,
        email: tibokDoctorData.email,
        phone: tibokDoctorData.phone,
        medicalCouncilNumber: tibokDoctorData.medicalCouncilNumber,
        specialty: tibokDoctorData.specialty,
        experience: tibokDoctorData.experience,
        languages: tibokDoctorData.languages,
        description: tibokDoctorData.description,
        qualifications: tibokDoctorData.qualifications || 'MBBS, MD (Medicine)',
        clinicAddress: tibokDoctorData.clinicAddress || 'Medical Center, Port Louis',
        consultationHours: tibokDoctorData.consultationHours || 'Mon-Fri: 8:30am-5:30pm',
        licenseNumber: tibokDoctorData.licenseNumber || tibokDoctorData.license_number || 'PL/2024/123' // FIX: Check for license_number field
      }
      setDoctorInfo(doctorData)
    } else {
      // Default doctor for testing
      const defaultDoctor: DoctorInfo = {
        id: 'default-doctor',
        fullName: 'Dr. John Smith',
        email: 'doctor@tibok.mu',
        phone: '+230 5555 5555',
        medicalCouncilNumber: 'MC/MD/12345',
        specialty: 'General Medicine',
        experience: '10 years',
        languages: ['English', 'French'],
        description: 'Experienced general practitioner',
        qualifications: 'MBBS, MD (Medicine)',
        clinicAddress: 'Medical Center, Port Louis',
        consultationHours: 'Mon-Fri: 8:30am-5:30pm',
        licenseNumber: 'PL/2024/123'
      }
      setDoctorInfo(defaultDoctor)
    }
    setLoading(false)
  }, [tibokDoctorData, isFromTibok])

  const updateDoctorInfo = (updates: Partial<DoctorInfo>) => {
    if (doctorInfo) {
      const updatedInfo = { ...doctorInfo, ...updates }
      setDoctorInfo(updatedInfo)
    }
  }

  return {
    doctorInfo,
    loading,
    error: null,
    updateDoctorInfo
  }
}
