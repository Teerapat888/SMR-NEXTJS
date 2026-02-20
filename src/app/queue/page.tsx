'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeProvider'
import toast from 'react-hot-toast'
import { ListOrdered, Search, PhoneCall, PhoneForwarded, CheckCircle, XCircle, Loader2, Clock, UserCheck, Hash, Plus } from 'lucide-react'

interface Patient { id: number; hn: string; firstName: string; lastName: string }
interface QueueItem { id: number; patientId: number; status: string; createdAt: string; calledAt: string | null; patient: Patient }

export default function QueuePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { colors } = useTheme()
  const [waiting, setWaiting] = useState<QueueItem[]>([])
  const [called, setCalled] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchHn, setSearchHn] = useState('')
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)
  const [addingQueue, setAddingQueue] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchQueues = useCallback(async () => {
    try {
      const res = await fetch('/api/queues')
      const data = await res.json()
      if (data.success) { setWaiting(data.waiting); setCalled(data.called) }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchQueues(); const iv = setInterval(fetchQueues, 5000); return () => clearInterval(iv) }, [fetchQueues])

  const searchPatient = async () => {
    if (!searchHn.trim()) return
    setSearching(true); setFoundPatient(null)
    try {
      const res = await fetch(`/api/patients?hn=${searchHn.trim()}`)
      if (res.ok) { const data = await res.json(); setFoundPatient(data) }
      else toast.error('ไม่พบผู้ป่วย HN: ' + searchHn)
    } catch { toast.error('เกิดข้อผิดพลาด') }
    setSearching(false)
  }

  const addToQueue = async () => {
    if (!foundPatient) return
    setAddingQueue(true)
    try {
      const res = await fetch('/api/queues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: foundPatient.id }),
      })
      if (res.status === 409) { toast.error('ผู้ป่วยอยู่ในคิวแล้ว'); setAddingQueue(false); return }
      if (res.ok) { toast.success('เพิ่มคิวสำเร็จ'); setFoundPatient(null); setSearchHn(''); fetchQueues() }
      else toast.error('เพิ่มคิวไม่สำเร็จ')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    setAddingQueue(false)
  }

  const queueAction = async (id: number, action: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/queues/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const labels: Record<string, string> = { call: 'เรียกคิวแล้ว', recall: 'เรียกซ้ำแล้ว', complete: 'เสร็จสิ้น', cancel: 'ยกเลิกแล้ว' }
        toast.success(labels[action] || 'สำเร็จ')
        fetchQueues()
      }
    } catch { toast.error('เกิดข้อผิดพลาด') }
    setActionLoading(null)
  }

  if (status === 'loading' || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <Navbar user={{ name: session.user?.name, role: (session.user as any)?.role }} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: colors.gradient }}>
            <ListOrdered className="w-5 h-5 text-white" />
          </div>
          <div><h1 className="text-2xl font-bold text-gray-800">จัดการคิว</h1><p className="text-gray-500 text-sm">Queue Management</p></div>
        </div>

        {/* Search & Add to Queue */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> เพิ่มผู้ป่วยเข้าคิว</h3>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchHn} onChange={e => setSearchHn(e.target.value)} placeholder="ค้นหา HN ผู้ป่วย..."
                onKeyDown={e => e.key === 'Enter' && searchPatient()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
            </div>
            <button onClick={searchPatient} disabled={searching}
              className="px-5 py-2.5 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ background: colors.primary }}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} ค้นหา
            </button>
          </div>
          {foundPatient && (
            <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-xl animate-fade-in">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <div><span className="font-medium text-gray-800">{foundPatient.firstName} {foundPatient.lastName}</span><span className="text-gray-500 text-sm ml-2">HN: {foundPatient.hn}</span></div>
              </div>
              <button onClick={addToQueue} disabled={addingQueue}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {addingQueue ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่มเข้าคิว
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Waiting Queue */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-white" /><h2 className="text-lg font-bold text-white">รอเรียก</h2></div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">{waiting.length} คิว</span>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {waiting.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ไม่มีคิวรอเรียก</p>
              ) : waiting.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    <div>
                      <p className="font-medium text-gray-800">{q.patient.firstName} {q.patient.lastName}</p>
                      <p className="text-xs text-gray-500">HN: {q.patient.hn}</p>
                    </div>
                  </div>
                  <button onClick={() => queueAction(q.id, 'call')} disabled={actionLoading === q.id}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-md flex items-center gap-1.5 disabled:opacity-50">
                    {actionLoading === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />} เรียก
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Called Queue */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><PhoneForwarded className="w-5 h-5 text-white" /><h2 className="text-lg font-bold text-white">เรียกแล้ว</h2></div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">{called.length} คิว</span>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {called.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ยังไม่มีคิวที่เรียก</p>
              ) : called.map(q => (
                <div key={q.id} className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{q.patient.firstName} {q.patient.lastName}</p>
                      <p className="text-xs text-gray-500">HN: {q.patient.hn} | เรียกเมื่อ: {q.calledAt ? new Date(q.calledAt).toLocaleTimeString('th-TH') : '-'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => queueAction(q.id, 'recall')} disabled={actionLoading === q.id}
                      className="flex-1 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center justify-center gap-1 disabled:opacity-50">
                      <PhoneForwarded className="w-3.5 h-3.5" /> เรียกซ้ำ
                    </button>
                    <button onClick={() => queueAction(q.id, 'complete')} disabled={actionLoading === q.id}
                      className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-1 disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> เสร็จ
                    </button>
                    <button onClick={() => queueAction(q.id, 'cancel')} disabled={actionLoading === q.id}
                      className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center justify-center gap-1 disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> ยกเลิก
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
