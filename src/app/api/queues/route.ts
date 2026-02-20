import { query, queryOne, execute } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const waiting = await query(
      `SELECT q.id, q.patient_id as patientId, q.status, q.created_at as createdAt, q.called_at as calledAt,
        p.id as pId, p.hn, p.first_name as firstName, p.last_name as lastName
       FROM queues q JOIN patients p ON q.patient_id = p.id
       WHERE q.status = 'waiting' ORDER BY q.created_at ASC`
    )
    const called = await query(
      `SELECT q.id, q.patient_id as patientId, q.status, q.created_at as createdAt, q.called_at as calledAt,
        p.id as pId, p.hn, p.first_name as firstName, p.last_name as lastName
       FROM queues q JOIN patients p ON q.patient_id = p.id
       WHERE q.status = 'called' ORDER BY q.called_at DESC`
    )

    const format = (rows: any[]) => rows.map(r => ({
      id: r.id, patientId: r.patientId, status: r.status, createdAt: r.createdAt, calledAt: r.calledAt,
      patient: { id: r.pId, hn: r.hn, firstName: r.firstName, lastName: r.lastName },
    }))

    return NextResponse.json({ success: true, waiting: format(waiting), called: format(called) })
  } catch (error) {
    console.error('Error fetching queues:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch queues' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { patientId } = await request.json()
    if (!patientId) return NextResponse.json({ success: false, error: 'patientId is required' }, { status: 400 })

    const patient = await queryOne('SELECT * FROM patients WHERE id = ?', [patientId])
    if (!patient) return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 })

    const existing = await queryOne("SELECT id FROM queues WHERE patient_id = ? AND status IN ('waiting','called')", [patientId])
    if (existing) return NextResponse.json({ success: false, error: 'Patient already has an active queue' }, { status: 409 })

    const result = await execute('INSERT INTO queues (patient_id, status, created_at) VALUES (?, ?, NOW())', [patientId, 'waiting'])
    return NextResponse.json({ success: true, queue: { id: result.insertId, patientId, status: 'waiting' } }, { status: 201 })
  } catch (error) {
    console.error('Error creating queue:', error)
    return NextResponse.json({ success: false, error: 'Failed to create queue' }, { status: 500 })
  }
}
