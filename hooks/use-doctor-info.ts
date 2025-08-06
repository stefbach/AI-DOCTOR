'use client'

import { useState, useEffect } from 'react'
import { useTibokDoctorData } from './use-tibok-doctor-data'

const supabaseUrl = 'https://ehlqjfuutyhpbrqcvdut.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobHFqZnV1dHlocGJycWN2ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODkxMzQsImV4cCI6MjA2Mjk2NTEzNH0.-pujAg_Fn9zONxS61HCNJ_8zsnaX00N5raoUae2olAs'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDoctorInfo()
  }, [tibokDoctorData])

  const fetchDoctorInfo = async () => {
    try {
      setLoading(true)
      
      if (tibokDoctorData && isFromTibok) {
        console.log('Using TIBOK doctor data:', tibokDoctorData)
        
        if (tibokDoctorData.id) {
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/doctors?user_id=eq.${tibokDoctorData.id}`, {
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              }
            })
            
            if (response.ok) {
              const doctors = await response.json()
              if (doctors && doctors.length > 0) {
                const doctorRecord = doctors[0]
                
                const mergedData: DoctorInfo = {
                  id: tibokDoctorData.id,
                  fullName: tibokDoctorData.fullName || doctorRecord.full_name,
                  email: tibokDoctorData.email || doctorRecord.email,
                  phone: tibokDoctorData.phone || doctorRecord.phone,
                  medicalCouncilNumber: tibokDoctorData.medicalCouncilNumber || doctorRecord.medical_council_number,
                  specialty: tibokDoctorData.specialty || doctorRecord.specialty,
                  experience: tibokDoctorData.experience || doctorRecord.experience,
                  languages: tibokDoctorData.languages || doctorRecord.languages,
                  description: tibokDoctorData.description || doctorRecord.description,
                  qualifications: doctorRecord.qualifications || 'MBBS, MD (Medicine)',
                  clinicAddress: doctorRecord.clinic_address || 'Medical Center, Port Louis',
                  consultationHours: doctorRecord.consultation_hours || 'Mon-Fri: 8:30am-5:30pm',
                  licenseNumber: doctorRecord.license_number || doctorRecord.medical_council_number
                }
                
                setDoctorInfo(mergedData)
                sessionStorage.setItem('doctorFullInfo', JSON.stringify(mergedData))
                return
              }
            }
          } catch (err) {
            console.error('Error fetching from Supabase:', err)
          }
        }
        
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
          qualifications: 'MBBS, MD (Medicine)',
          clinicAddress: 'Medical Center, Port Louis',
          consultationHours: 'Mon-Fri: 8:30am-5:30pm',
          licenseNumber: tibokDoctorData.medicalCouncilNumber
        }
        
        setDoctorInfo(doctorData)
        sessionStorage.setItem('doctorFullInfo', JSON.stringify(doctorData))
      } else {
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
        console.log('Using default doctor data for testing')
      }
    } catch (err) {
      console.error('Error fetching doctor info:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch doctor information')
    } finally {
      setLoading(false)
    }
  }

  const updateDoctorInfo = (updates: Partial<DoctorInfo>) => {
    if (doctorInfo) {
      const updatedInfo = { ...doctorInfo, ...updates }
      setDoctorInfo(updatedInfo)
      sessionStorage.setItem('doctorFullInfo', JSON.stringify(updatedInfo))
    }
  }

  return {
    doctorInfo,
    loading,
    error,
    refetch: fetchDoctorInfo,
    updateDoctorInfo
  }
}
