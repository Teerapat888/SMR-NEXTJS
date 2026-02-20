import { queryOne, execute } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_THEME, THEME_PRESETS } from '@/lib/themes'

export async function GET() {
  try {
    const row = await queryOne<any>("SELECT setting_value FROM system_settings WHERE setting_key = 'theme'")
    let theme = DEFAULT_THEME
    if (row?.setting_value && THEME_PRESETS[row.setting_value]) {
      theme = row.setting_value
    }
    return NextResponse.json({ success: true, theme })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: true, theme: DEFAULT_THEME })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { theme } = await request.json()
    if (!theme || !THEME_PRESETS[theme]) {
      return NextResponse.json({ success: false, error: 'Invalid theme' }, { status: 400 })
    }

    await execute(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES ('theme', ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [theme, theme]
    )

    return NextResponse.json({ success: true, theme })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save theme' }, { status: 500 })
  }
}
