import { query, queryOne } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const beds = await query(`
      SELECT b.*, p.hn, p.first_name, p.last_name,
             pbh.delivery_status, pbh.other_symptoms, pbh.admission_time
      FROM beds b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN patient_bed_history pbh ON p.id = pbh.patient_id AND pbh.bed_id = b.id AND pbh.discharge_time IS NULL
      ORDER BY b.id ASC
    `)

    const bedsFormatted = beds.map((bed: any) => ({
      id: bed.id, bedNumber: bed.bed_number, zone: bed.zone, status: bed.status,
      patientId: bed.patient_id, esiLevel: bed.esi_level, admittedAt: bed.admitted_at,
      deliveryStatus: bed.delivery_status || null,
      otherSymptoms: bed.other_symptoms || null,
      patient: bed.patient_id ? {
        id: bed.patient_id, hn: bed.hn, firstName: bed.first_name, lastName: bed.last_name,
      } : null,
    }))

    const available = beds.filter((b: any) => b.status === 'available').length
    const occupied = beds.filter((b: any) => b.status === 'occupied').length
    const queueResult = await queryOne<any>('SELECT COUNT(*) as cnt FROM queues WHERE status = ?', ['waiting'])
    const queueCount = queueResult?.cnt || 0

    return NextResponse.json({ success: true, beds: bedsFormatted, stats: { available, occupied, queueCount } })
  } catch (error) {
    console.error('Error fetching beds:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch beds' }, { status: 500 })
  }
}
