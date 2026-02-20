import { queryOne, execute } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULTS = {
  googleTtsEnabled: true, browserTtsEnabled: false, voiceName: '', voiceLang: 'th-TH',
  speechTemplate: 'ขอเชิญหมายเลข {{HN}} เข้ารับการรักษา',
  speechPause: 0.5, speechRate: 1, pageInterval: 15, showSoundButton: true,
}

export async function GET() {
  try {
    const row = await queryOne<any>("SELECT setting_value FROM system_settings WHERE setting_key = 'sound_settings'")
    let settings = DEFAULTS
    if (row?.setting_value) {
      try { settings = { ...DEFAULTS, ...JSON.parse(row.setting_value) } } catch {}
    }
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = { ...DEFAULTS, ...body }
    const value = JSON.stringify(settings)

    await execute(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES ('sound_settings', ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [value, value]
    )

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 })
  }
}
