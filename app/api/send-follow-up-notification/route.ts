import { NextRequest, NextResponse } from 'next/server'

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
    const watiApiUrl = process.env.WATI_API_URL || 'https://live-mt-server.wati.io/371422'
    const watiApiKey = process.env.WATI_API_KEY || ''

    if (!watiApiKey) {
      console.error('❌ WATI_API_KEY not configured')
      return NextResponse.json({ success: false, error: 'WATI not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { patientPhone, diseaseSubtypes } = body

    console.log('📱 Follow-up notification request:', { patientPhone, diseaseSubtypes, watiApiUrl: watiApiUrl.substring(0, 30) + '...' })

    if (!patientPhone || !diseaseSubtypes || !Array.isArray(diseaseSubtypes) || diseaseSubtypes.length === 0) {
      console.error('❌ Missing required fields:', { patientPhone: !!patientPhone, diseaseSubtypes })
      return NextResponse.json({ success: false, error: 'Missing patientPhone or diseaseSubtypes' }, { status: 400 })
    }

    const phone = formatPhone(patientPhone)
    if (!phone) {
      console.error('❌ Invalid phone after formatting:', patientPhone)
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

    console.log('📱 Formatted phone:', phone)

    const results = []
    for (const subtype of diseaseSubtypes) {
      const typeName = TYPE_NAMES[subtype] || subtype
      const url = `${watiApiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`
      const payload = {
        template_name: 'param_suivi_active',
        broadcast_name: 'param_suivi_active',
        parameters: [
          { name: '1', value: typeName }
        ],
      }

      console.log('📱 Sending WATI request:', { url, typeName, subtype })

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${watiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        let data
        try {
          data = await response.json()
        } catch {
          data = await response.text()
        }

        console.log(`📱 WATI response for ${subtype}:`, { status: response.status, ok: response.ok, data })
        results.push({ subtype, success: response.ok, status: response.status, data })
      } catch (err) {
        console.error(`❌ WATI fetch failed for ${subtype}:`, err)
        results.push({ subtype, success: false, error: String(err) })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('❌ Error in send-follow-up-notification:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
