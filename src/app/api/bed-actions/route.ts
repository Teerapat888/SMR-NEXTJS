import { query, queryOne, execute, pool } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, bedNumber } = body

    if (!action || !bedNumber) return NextResponse.json({ success: false, error: 'action and bedNumber required' }, { status: 400 })

    const bed = await queryOne<any>('SELECT * FROM beds WHERE bed_number = ?', [bedNumber])
    if (!bed) return NextResponse.json({ success: false, error: `Bed ${bedNumber} not found` }, { status: 404 })

    switch (action) {
      case 'scan_barcode': {
        const { hn } = body
        if (!hn) return NextResponse.json({ success: false, error: 'hn is required' }, { status: 400 })

        const patient = await queryOne<any>('SELECT * FROM patients WHERE hn = ?', [hn])
        if (!patient) return NextResponse.json({ success: false, error: `Patient HN ${hn} not found` }, { status: 404 })
        if (bed.status === 'occupied') return NextResponse.json({ success: false, error: 'Bed is already occupied' }, { status: 409 })

        await execute('UPDATE beds SET status = ?, patient_id = ?, admitted_at = NOW() WHERE bed_number = ?', ['occupied', patient.id, bedNumber])
        await execute(
          'INSERT INTO patient_bed_history (patient_id, bed_id, action, delivery_status, admission_time, performed_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [patient.id, bed.id, 'admit', 'รอตรวจ']
        )

        return NextResponse.json({ success: true, message: 'รับผู้ป่วยเข้าเตียงสำเร็จ' })
      }

      case 'update_esi': {
        const esiLevel = parseInt(body.esiLevel, 10)
        if (isNaN(esiLevel) || esiLevel < 1 || esiLevel > 5) return NextResponse.json({ success: false, error: 'ESI must be 1-5' }, { status: 400 })

        await execute('UPDATE beds SET esi_level = ? WHERE bed_number = ?', [esiLevel, bedNumber])
        if (bed.patient_id) {
          await execute(
            'UPDATE patient_bed_history SET esi_level = ? WHERE patient_id = ? AND bed_id = ? AND discharge_time IS NULL',
            [esiLevel, bed.patient_id, bed.id]
          )
        }

        return NextResponse.json({ success: true, message: `อัปเดต ESI Level ${esiLevel} สำเร็จ` })
      }

      case 'update_status': {
        const { deliveryStatus, otherSymptoms, esiLevel } = body
        if (!bed.patient_id) return NextResponse.json({ success: false, error: 'No patient in bed' }, { status: 400 })

        await execute(
          'UPDATE patient_bed_history SET delivery_status = ?, other_symptoms = ? WHERE patient_id = ? AND bed_id = ? AND discharge_time IS NULL',
          [deliveryStatus || 'รอตรวจ', otherSymptoms || null, bed.patient_id, bed.id]
        )

        if (esiLevel !== undefined && esiLevel !== null) {
          const esi = parseInt(esiLevel, 10)
          if (esi >= 1 && esi <= 5) {
            await execute('UPDATE beds SET esi_level = ? WHERE bed_number = ?', [esi, bedNumber])
            await execute('UPDATE patient_bed_history SET esi_level = ? WHERE patient_id = ? AND bed_id = ? AND discharge_time IS NULL', [esi, bed.patient_id, bed.id])
          }
        }

        return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ' })
      }

      case 'discharge': {
        if (bed.status !== 'occupied' || !bed.patient_id) return NextResponse.json({ success: false, error: 'Bed is not occupied' }, { status: 400 })

        await execute(
          "UPDATE patient_bed_history SET discharge_time = NOW(), delivery_status = 'จำหน่ายแล้ว' WHERE patient_id = ? AND bed_id = ? AND discharge_time IS NULL",
          [bed.patient_id, bed.id]
        )
        await execute('UPDATE beds SET status = ?, patient_id = NULL, esi_level = NULL, admitted_at = NULL WHERE bed_number = ?', ['available', bedNumber])

        return NextResponse.json({ success: true, message: 'จำหน่ายผู้ป่วยสำเร็จ' })
      }

      case 'transfer': {
        const { targetBedNumber } = body
        if (!targetBedNumber) return NextResponse.json({ success: false, error: 'targetBedNumber required' }, { status: 400 })
        if (bed.status !== 'occupied' || !bed.patient_id) return NextResponse.json({ success: false, error: 'Source bed is not occupied' }, { status: 400 })

        const targetBed = await queryOne<any>('SELECT * FROM beds WHERE bed_number = ?', [targetBedNumber])
        if (!targetBed) return NextResponse.json({ success: false, error: 'Target bed not found' }, { status: 404 })
        if (targetBed.status === 'occupied') return NextResponse.json({ success: false, error: 'Target bed is occupied' }, { status: 409 })

        // Get current history data for this bed
        const oldHistory = await queryOne<any>(
          'SELECT delivery_status, other_symptoms, esi_level FROM patient_bed_history WHERE patient_id = ? AND bed_id = ? AND discharge_time IS NULL LIMIT 1',
          [bed.patient_id, bed.id]
        )

        const conn = await pool.getConnection()
        try {
          await conn.beginTransaction()
          // Close old history for this bed
          await conn.execute(
            "UPDATE patient_bed_history SET discharge_time = NOW(), delivery_status = CONCAT(IFNULL(delivery_status,''), ' (ย้ายเตียง)') WHERE patient_id = ? AND bed_id = ? AND discharge_time IS NULL",
            [bed.patient_id, bed.id]
          )
          // Clear source bed
          await conn.execute('UPDATE beds SET status = ?, patient_id = NULL, esi_level = NULL, admitted_at = NULL WHERE bed_number = ?', ['available', bedNumber])
          // Occupy target bed
          await conn.execute('UPDATE beds SET status = ?, patient_id = ?, esi_level = ?, admitted_at = NOW() WHERE bed_number = ?', ['occupied', bed.patient_id, bed.esi_level, targetBedNumber])
          // Create new history at target with copied data
          await conn.execute(
            'INSERT INTO patient_bed_history (patient_id, bed_id, action, delivery_status, other_symptoms, esi_level, admission_time, performed_at) SELECT ?, id, ?, ?, ?, ?, NOW(), NOW() FROM beds WHERE bed_number = ?',
            [bed.patient_id, 'transfer_in', oldHistory?.delivery_status || 'รอตรวจ', oldHistory?.other_symptoms || null, oldHistory?.esi_level || null, targetBedNumber]
          )
          await conn.commit()
        } catch (e) {
          await conn.rollback()
          throw e
        } finally {
          conn.release()
        }

        return NextResponse.json({ success: true, message: `ย้ายเตียงไป ${targetBedNumber} สำเร็จ` })
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process bed action' }, { status: 500 })
  }
}
