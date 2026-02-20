import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Match original PHP: check queues called within last 10 seconds
    const calls = await query(`
      SELECT q.id, q.called_at,
             p.hn, p.first_name, p.last_name
      FROM queues q
      JOIN patients p ON q.patient_id = p.id
      WHERE q.status = 'called'
        AND q.called_at >= NOW() - INTERVAL 10 SECOND
      ORDER BY q.called_at DESC
    `)

    return NextResponse.json({
      success: true,
      calls: calls.map((c: any) => ({
        id: c.id,
        hn: c.hn,
        patient_name: `${c.first_name} ${c.last_name}`,
        bed_number: null,
        called_at: c.called_at,
      })),
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch queue calls' }, { status: 500 })
  }
}
