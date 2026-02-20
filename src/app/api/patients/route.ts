import { queryOne, execute } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const hn = new URL(request.url).searchParams.get('hn')
    if (!hn) return NextResponse.json({ success: false, error: 'hn is required' }, { status: 400 })

    const patient = await queryOne('SELECT id, hn, first_name as firstName, last_name as lastName FROM patients WHERE hn = ?', [hn])
    if (!patient) return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 })

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to search patient' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hn, firstName, lastName } = await request.json()
    if (!hn || !firstName || !lastName) return NextResponse.json({ success: false, error: 'hn, firstName, lastName required' }, { status: 400 })

    const existing = await queryOne('SELECT id FROM patients WHERE hn = ?', [hn])
    if (existing) return NextResponse.json({ success: false, error: 'HN already exists' }, { status: 409 })

    const result = await execute('INSERT INTO patients (hn, first_name, last_name, created_at) VALUES (?, ?, ?, NOW())', [hn, firstName, lastName])
    const patientId = result.insertId

    // Auto add to waiting queue
    const existingQueue = await queryOne("SELECT id FROM queues WHERE patient_id = ? AND status IN ('waiting','called')", [patientId])
    if (!existingQueue) {
      await execute('INSERT INTO queues (patient_id, status, created_at) VALUES (?, ?, NOW())', [patientId, 'waiting'])
    }

    return NextResponse.json({ success: true, id: patientId, hn, firstName, lastName }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create patient' }, { status: 500 })
  }
}
