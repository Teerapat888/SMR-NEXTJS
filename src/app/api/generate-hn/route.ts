import { queryOne } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await queryOne<any>('SELECT MAX(CAST(hn AS UNSIGNED)) as maxHn FROM patients')
    const maxHn = result?.maxHn || 0
    const nextHn = (maxHn + 1).toString().padStart(7, '0')
    return NextResponse.json({ success: true, hn: nextHn })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate HN' }, { status: 500 })
  }
}
