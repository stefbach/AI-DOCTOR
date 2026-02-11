import { NextRequest, NextResponse } from 'next/server'

const WATI_API_URL = 'https://live-mt-server.wati.io/371422'
const WATI_API_KEY = process.env.WATI_API_KEY || ''

const TYPE_NAMES: Record<string, string> = {
  hypertension: 'Suivi HTA (tension artérielle)',
  diabetes_type_1: 'Suivi Diabète Type 1 (glycémie)',
  diabetes_type_2: 'Suivi Diabète Type 2 (glycémie)',
  obesity: 'Suivi Poids (obésité)',
}

function formatPhone(phone: string): string {
  // Strip all non-digit characters
  let digits = phone.replace(/[^\d]/g, '')
  // Remove leading 00 if present
  if (digits.startsWith('00')) {
    digits = digits.substring(2)
  }
  // If 7-8 digits (local Mauritius number), add 230 prefix
  if (digits.length >= 7 && digits.length <= 8) {
    digits = '230' + digits
  }
  return digits
}

export async function POST(request: NextRequest) {
  try {
    if (!WATI_API_KEY) {
      console.warn('WATI_API_KEY not configured, skipping notification')
      return NextResponse.json({ success: false, error: 'WATI not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { patientPhone, diseaseSubtypes } = body

    if (!patientPhone || !diseaseSubtypes || !Array.isArray(diseaseSubtypes) || diseaseSubtypes.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing patientPhone or diseaseSubtypes' }, { status: 400 })
    }

    const phone = formatPhone(patientPhone)
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

    const results = []
    for (const subtype of diseaseSubtypes) {
      const typeName = TYPE_NAMES[subtype] || subtype
      try {
        const response = await fetch(`${WATI_API_URL}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WATI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_name: 'param_suivi_active',
            broadcast_name: 'param_suivi_active',
            parameters: [
              { name: '1', value: typeName }
            ],
          }),
        })
        const data = await response.json()
        results.push({ subtype, success: response.ok, data })
        console.log(`📱 WATI notification for ${subtype}:`, response.ok ? 'sent' : 'failed')
      } catch (err) {
        console.error(`❌ WATI notification failed for ${subtype}:`, err)
        results.push({ subtype, success: false, error: String(err) })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error in send-follow-up-notification:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
