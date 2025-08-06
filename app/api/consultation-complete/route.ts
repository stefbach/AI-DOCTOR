import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    
    // Forward to Tibok's save-report endpoint
    const tibokUrl = process.env.NEXT_PUBLIC_TIBOK_URL || 'http://localhost:3001'
    const tibokResponse = await fetch(`${tibokUrl}/api/consultations/save-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consultationId: reportData.consultationId,
        patientId: reportData.patientId,
        doctorId: reportData.doctorId,
        patient: reportData.patient,
        consultation: {
          doctorName: reportData.doctorInfo?.nom,
          doctorSpecialty: reportData.doctorInfo?.specialite,
          doctorCouncilNumber: reportData.doctorInfo?.numeroEnregistrement,
          consultationDate: reportData.report?.compteRendu?.patient?.dateExamen,
          consultationType: 'Télémédecine'
        },
        medical: {
          clinical: reportData.clinicalData,
          questions: reportData.questionsData,
          diagnosis: reportData.diagnosisData
        },
        documents: {
          consultation: reportData.report?.compteRendu,
          prescriptions: {
            medication: reportData.report?.ordonnances?.medicaments,
            biology: reportData.report?.ordonnances?.biologie,
            imaging: reportData.report?.ordonnances?.imagerie
          },
          invoice: reportData.report?.invoice
        },
        signatures: reportData.signatures
      })
    })

    if (!tibokResponse.ok) {
      throw new Error('Failed to save to Tibok')
    }

    const tibokData = await tibokResponse.json()
    
    return NextResponse.json({
      success: true,
      ...tibokData
    })
  } catch (error) {
    console.error('Error completing consultation:', error)
    return NextResponse.json(
      { error: 'Failed to complete consultation' },
      { status: 500 }
    )
  }
}
