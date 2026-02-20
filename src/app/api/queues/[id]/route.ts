import { queryOne, execute } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const queueId = parseInt(id, 10)
    if (isNaN(queueId)) return NextResponse.json({ success: false, error: 'Invalid queue ID' }, { status: 400 })

    const { action } = await request.json()
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })

    const existing = await queryOne('SELECT * FROM queues WHERE id = ?', [queueId])
    if (!existing) return NextResponse.json({ success: false, error: 'Queue not found' }, { status: 404 })

    switch (action) {
      case 'call':
      case 'recall':
        await execute('UPDATE queues SET status = ?, called_at = NOW() WHERE id = ?', ['called', queueId])
        await execute('INSERT INTO queue_calls (queue_id, called_at) VALUES (?, NOW())', [queueId])
        break
      case 'complete':
        await execute('UPDATE queues SET status = ? WHERE id = ?', ['completed', queueId])
        break
      case 'cancel':
        await execute('UPDATE queues SET status = ? WHERE id = ?', ['cancelled', queueId])
        break
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating queue:', error)
    return NextResponse.json({ success: false, error: 'Failed to update queue' }, { status: 500 })
  }
}
