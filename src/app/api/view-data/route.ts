import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Combined query matching original PHP: bed patients + waiting queue, sorted by ESI
    const allPatients = await query(`
      SELECT
        p.hn,
        b.bed_number,
        pbh.delivery_status as status,
        CASE
          WHEN pbh.esi_level IS NULL THEN 6
          ELSE pbh.esi_level
        END as esi_level,
        COALESCE(pbh.admission_time, pbh.performed_at) as sort_time,
        'bed' as source
      FROM patient_bed_history pbh
      JOIN patients p ON pbh.patient_id = p.id
      JOIN beds b ON pbh.bed_id = b.id
      WHERE pbh.discharge_time IS NULL
      AND (pbh.delivery_status IS NULL OR pbh.delivery_status != 'กลับบ้านเรียบร้อย')

      UNION ALL

      SELECT
        p.hn,
        NULL as bed_number,
        'รอเรียกคิว' as status,
        7 as esi_level,
        q.created_at as sort_time,
        'queue' as source
      FROM queues q
      JOIN patients p ON q.patient_id = p.id
      WHERE q.status = 'waiting'

      ORDER BY esi_level ASC, sort_time ASC
    `)

    return NextResponse.json({
      success: true,
      allPatients: allPatients.map((p: any) => ({
        hn: p.hn,
        bed_number: p.bed_number,
        status: p.status || '-',
        esi_level: p.esi_level,
        source: p.source,
      })),
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch view data' }, { status: 500 })
  }
}
