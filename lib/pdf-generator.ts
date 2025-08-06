import jsPDF from 'jspdf'
import 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface DoctorInfo {
  fullName: string
  email: string
  phone: string
  medicalCouncilNumber: string
  specialty: string
  qualifications?: string
  clinicAddress?: string
}

interface PatientInfo {
  name: string
  age: number
  gender: string
  id?: string
  email?: string
  phone?: string
}

interface MedicalReport {
  consultationDate: string
  chiefComplaint: string
  diagnosis: string
  prescriptions?: any[]
  labTests?: any[]
  imagingTests?: any[]
  followUp?: string
  advice?: string
}

interface Signatures {
  consultation?: string
  prescription?: string
  laboratory?: string
  imaging?: string
}

export class MedicalReportPDFGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
    this.margin = 20
    this.currentY = this.margin
  }

  private addHeader(doctorInfo: DoctorInfo) {
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Medical Consultation Report', this.pageWidth / 2, this.currentY, { align: 'center' })
    
    this.currentY += 10
    
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Dr. ${doctorInfo.fullName}`, this.margin, this.currentY)
    this.currentY += 6
    this.doc.text(`${doctorInfo.specialty} | ${doctorInfo.qualifications || 'MBBS, MD'}`, this.margin, this.currentY)
    this.currentY += 6
    this.doc.text(`License: ${doctorInfo.medicalCouncilNumber}`, this.margin, this.currentY)
    this.currentY += 6
    
    if (doctorInfo.clinicAddress) {
      this.doc.setFontSize(10)
      this.doc.text(doctorInfo.clinicAddress, this.margin, this.currentY)
      this.currentY += 6
    }
    
    this.doc.text(`Phone: ${doctorInfo.phone} | Email: ${doctorInfo.email}`, this.margin, this.currentY)
    
    this.currentY += 8
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10
  }

  private addPatientInfo(patientInfo: PatientInfo) {
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Patient Information', this.margin, this.currentY)
    this.currentY += 6
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Name: ${patientInfo.name}`, this.margin, this.currentY)
    this.doc.text(`Age: ${patientInfo.age} years`, this.pageWidth / 2, this.currentY)
    this.currentY += 6
    
    this.doc.text(`Gender: ${patientInfo.gender}`, this.margin, this.currentY)
    if (patientInfo.id) {
      this.doc.text(`Patient ID: ${patientInfo.id}`, this.pageWidth / 2, this.currentY)
    }
    this.currentY += 10
  }

  private addSection(title: string, content: string) {
    this.checkPageBreak(30)
    
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 6
    
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin)
    this.doc.text(lines, this.margin, this.currentY)
    this.currentY += lines.length * 5 + 5
  }

  private addSignature(signature: string, label: string = 'Doctor\'s Signature') {
    this.checkPageBreak(60)
    
    this.doc.setFontSize(10)
    this.doc.text(label, this.pageWidth - this.margin - 60, this.currentY)
    this.currentY += 5
    
    if (signature && signature.startsWith('data:image')) {
      try {
        this.doc.addImage(
          signature,
          'PNG',
          this.pageWidth - this.margin - 80,
          this.currentY,
          60,
          20
        )
      } catch (error) {
        console.error('Error adding signature to PDF:', error)
      }
    }
    
    this.currentY += 25
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }

  public generateReport(
    doctorInfo: DoctorInfo,
    patientInfo: PatientInfo,
    report: MedicalReport,
    signatures: Signatures
  ): Blob {
    this.addHeader(doctorInfo)
    this.addPatientInfo(patientInfo)
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Date: ${new Date(report.consultationDate).toLocaleDateString()}`, this.margin, this.currentY)
    this.currentY += 10
    
    if (report.chiefComplaint) {
      this.addSection('Chief Complaint', report.chiefComplaint)
    }
    
    if (report.diagnosis) {
      this.addSection('Diagnosis', report.diagnosis)
    }
    
    if (signatures.consultation) {
      this.currentY += 10
      this.addSignature(signatures.consultation, 'Doctor\'s Signature')
    }
    
    this.doc.setFontSize(8)
    this.doc.text(
      'This is a computer-generated report with digital signature',
      this.pageWidth / 2,
      this.pageHeight - 10,
      { align: 'center' }
    )
    
    return this.doc.output('blob')
  }

  public download(filename: string = 'medical-report.pdf') {
    this.doc.save(filename)
  }
}
