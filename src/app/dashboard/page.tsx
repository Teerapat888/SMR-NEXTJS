'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeProvider'
import { formatBedNumber, formatThaiDateTime, ALL_BEDS } from '@/lib/helpers'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface Patient { id: number; hn: string; firstName: string; lastName: string }
interface BedData {
  id: number; bedNumber: string; status: string; esiLevel: number | null
  patientId: number | null; admittedAt: string | null; patient: Patient | null
  deliveryStatus: string | null; otherSymptoms: string | null
}
interface Stats { available: number; occupied: number; queueCount: number }

const DELIVERY_STATUSES = [
  'รอตรวจ', 'รอผลเลือด', 'รอ x-ray / CT / MRI', 'รอผลเลือดและ X-ray',
  'รอทำแผล / ฉีดยา', 'สังเกตอาการหลังฉีดยา', 'ปรึกษาแพทย์เฉพาะทาง',
  'รอส่ง OPD', 'รอ Admit', 'รอรับยา', 'รอกลับบ้าน',
]

const ESI_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#fe0002', border: '#b80000', text: '#ffffff' },
  2: { bg: '#ff32cd', border: '#cc28a4', text: '#ffffff' },
  3: { bg: '#eaea03', border: '#c4c402', text: '#1f2937' },
  4: { bg: '#00af36', border: '#008c2b', text: '#ffffff' },
  5: { bg: '#cccbcb', border: '#a8a8a8', text: '#1f2937' },
}

function getBedStyle(status: string, esiLevel: number | null) {
  if (status === 'available') return { bg: '#fefce8', border: '#fcd34d', text: '#854d0e' }
  if (status === 'occupied') {
    if (esiLevel && ESI_COLORS[esiLevel]) return ESI_COLORS[esiLevel]
    return { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  }
  return { bg: '#e5e7eb', border: '#9ca3af', text: '#4b5563' }
}

function bedPrefix(displayName: string) {
  return (displayName === 'จุดคัดกรอง' || displayName === 'VVIP') ? '' : 'เตียง '
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [beds, setBeds] = useState<BedData[]>([])
  const [stats, setStats] = useState<Stats>({ available: 0, occupied: 0, queueCount: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { if (status === 'unauthenticated') router.replace('/login') }, [status, router])

  const fetchBeds = useCallback(async () => {
    try {
      const res = await fetch('/api/beds')
      const data = await res.json()
      if (data.success) { setBeds(data.beds); setStats(data.stats) }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { if (status === 'authenticated') fetchBeds() }, [status, fetchBeds])
  useEffect(() => {
    if (status !== 'authenticated') return
    const iv = setInterval(fetchBeds, 10000)
    return () => clearInterval(iv)
  }, [status, fetchBeds])

  const performAction = async (body: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/bed-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.success) { toast.error(data.error || 'เกิดข้อผิดพลาด'); return false }
      toast.success(data.message || 'สำเร็จ')
      await fetchBeds(); return true
    } catch { toast.error('เกิดข้อผิดพลาด'); return false }
  }

  const bedMap = new Map<string, BedData>()
  beds.forEach(b => bedMap.set(b.bedNumber, b))
  const mainBedDefs = ALL_BEDS.filter(b => b.zone === 'main')
  const tempBedDefs = ALL_BEDS.filter(b => b.zone === 'temporary')

  const openBedModal = (bedNumber: string) => {
    const bedData = bedMap.get(bedNumber)
    setSelectedBed(bedData ?? { id: 0, bedNumber, status: 'available', esiLevel: null, patientId: null, admittedAt: null, patient: null, deliveryStatus: null, otherSymptoms: null })
    setModalOpen(true)
  }

  if (status === 'loading' || loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    </div>
  )
  if (status === 'unauthenticated') return null

  const renderBedCard = (def: { number: string; label: string; zone: string }) => {
    const bedData = bedMap.get(def.number)
    const bedStatus = bedData?.status || 'available'
    const esiLevel = bedData?.esiLevel ?? null
    const style = getBedStyle(bedStatus, esiLevel)
    const displayName = formatBedNumber(def.number)
    const isOccupied = bedStatus === 'occupied'
    return (
      <div key={def.number} onClick={() => openBedModal(def.number)}
        className="bed-card border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 text-center"
        style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}>
        <div className="text-xl font-bold mb-2">{bedPrefix(displayName)}{displayName}</div>
        <div className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2">
          {isOccupied ? 'ใช้งาน' : 'ว่าง'}
        </div>
        {isOccupied && bedData?.patient ? (
          <div className="text-xs mt-3 border-t pt-2 space-y-1" style={{ borderColor: `${style.border}80` }}>
            <div><strong>HN:</strong> {bedData.patient.hn}</div>
            <div><strong>ชื่อ:</strong> {bedData.patient.firstName} {bedData.patient.lastName}</div>
            {bedData.deliveryStatus && <div><strong>สถานะ:</strong> {bedData.deliveryStatus}</div>}
            {bedData.otherSymptoms && <div><strong>หมายเหตุ:</strong> {bedData.otherSymptoms}</div>}
          </div>
        ) : (
          <div className="text-xs mt-2">คลิกเพื่อจัดการ</div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        .bed-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .transfer-card:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      `}</style>
      <Navbar user={{ name: session?.user?.name, role: (session?.user as any)?.role }} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics - matching original PHP: white bg, colored text, icon in colored circle */}
        <div className="flex flex-row gap-4 mb-6">
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">เตียงว่าง</p>
                <p className="text-3xl font-bold text-green-600">{stats.available}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">เตียงใช้งาน</p>
                <p className="text-3xl font-bold text-red-600">{stats.occupied}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">คิวรอ</p>
                <p className="text-3xl font-bold text-blue-600">{stats.queueCount}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Beds - 7 columns on lg, wrapped in white card */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">เตียงผู้ป่วยหลัก (R1-R3, N1-N2, NT1-NT11, T12-T19, 20-21)</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {mainBedDefs.map(renderBedCard)}
            </div>
          </div>
        </div>

        {/* Temporary Beds - 5 columns on lg */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">เตียงรักษาชั่วคราว (เตียง 29-38)</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tempBedDefs.map(renderBedCard)}
            </div>
          </div>
        </div>
      </main>

      {modalOpen && selectedBed && (
        <BedModal
          bed={selectedBed}
          allBeds={beds}
          onClose={() => { setModalOpen(false); setSelectedBed(null) }}
          onAction={performAction}
        />
      )}
    </div>
  )
}

function BedModal({ bed, allBeds, onClose, onAction }: {
  bed: BedData; allBeds: BedData[]
  onClose: () => void; onAction: (body: Record<string, unknown>) => Promise<boolean>
}) {
  const { colors } = useTheme()
  const isOccupied = bed.status === 'occupied'
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [transferView, setTransferView] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState(bed.deliveryStatus || 'รอตรวจ')
  const [otherSymptoms, setOtherSymptoms] = useState(bed.otherSymptoms || '')
  const [selectedEsi, setSelectedEsi] = useState<number | null>(bed.esiLevel)
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOccupied && barcodeRef.current) setTimeout(() => barcodeRef.current?.focus(), 100)
  }, [isOccupied])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const displayName = formatBedNumber(bed.bedNumber)

  const handleScanBarcode = async () => {
    if (!barcodeInput.trim()) { toast.error('กรุณากรอก HN หรือสแกนบาร์โค้ด'); return }
    setScanning(true)
    const ok = await onAction({ action: 'scan_barcode', bedNumber: bed.bedNumber, hn: barcodeInput.trim() })
    setScanning(false)
    if (ok) onClose()
  }

  const handleSave = async () => {
    setActionLoading(true)
    await onAction({ action: 'update_status', bedNumber: bed.bedNumber, deliveryStatus, otherSymptoms, esiLevel: selectedEsi })
    setActionLoading(false)
    onClose()
  }

  const handleDischarge = async () => {
    if (!window.confirm('ต้องการให้ผู้ป่วยกลับบ้านหรือไม่?')) return
    setActionLoading(true)
    const ok = await onAction({ action: 'discharge', bedNumber: bed.bedNumber })
    setActionLoading(false)
    if (ok) onClose()
  }

  const handleTransfer = async (targetBedNumber: string, targetDisplayName: string) => {
    if (!window.confirm(`ต้องการย้ายผู้ป่วยไปเตียง ${targetDisplayName} หรือไม่?`)) return
    setActionLoading(true)
    const ok = await onAction({ action: 'transfer', bedNumber: bed.bedNumber, targetBedNumber })
    setActionLoading(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden transition-all duration-300 ${transferView ? 'max-w-5xl' : 'max-w-xl'}`}>
        {/* Header - Teal to Emerald gradient matching other pages */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 text-white"
          style={{ background: colors.gradient, borderRadius: '1rem 1rem 0 0' }}>
          <div>
            <h2 className="text-lg font-extrabold" style={{ margin: 0 }}>{bedPrefix(displayName)}{displayName}</h2>
            <p className="text-xs mt-0.5" style={{ opacity: 0.7 }}>
              {isOccupied ? (transferView ? 'เลือกเตียงปลายทาง' : 'มีผู้ป่วยอยู่ในเตียง') : 'เตียงว่าง — พร้อมรับผู้ป่วย'}
            </p>
          </div>
          <button onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ปิด
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {isOccupied && bed.patient && !transferView ? (
            <>
              {/* Info Chips - 2x2 grid matching original PHP */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0' }}>
                  <div className="uppercase tracking-wider" style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.05em' }}>HN</div>
                  <div className="text-sm font-bold" style={{ color: '#4f46e5' }}>{bed.patient.hn}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0' }}>
                  <div className="uppercase tracking-wider" style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.05em' }}>ชื่อ-นามสกุล</div>
                  <div className="font-bold text-gray-800" style={{ fontSize: '0.85rem' }}>{bed.patient.firstName} {bed.patient.lastName}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0' }}>
                  <div className="uppercase tracking-wider" style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.05em' }}>เวลาเข้าเตียง</div>
                  <div className="font-bold text-gray-800" style={{ fontSize: '0.85rem' }}>{formatThaiDateTime(bed.admittedAt)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0' }}>
                  <div className="uppercase tracking-wider" style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.05em' }}>สถานะการรักษา</div>
                  <div className="font-bold text-gray-800" style={{ fontSize: '0.85rem' }}>{bed.deliveryStatus || 'รอตรวจ'}</div>
                </div>
              </div>

              {/* Delivery Status Select */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b', fontSize: '0.8rem' }}>สถานะการรักษา</label>
                <select value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value)}
                  className="w-full rounded-xl outline-none transition-colors"
                  style={{ padding: '0.625rem 0.75rem', border: '2px solid #e2e8f0', borderRadius: '0.625rem', fontSize: '0.9rem' }}>
                  {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Other Symptoms */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b', fontSize: '0.8rem' }}>สถานะเพิ่มเติม / หมายเหตุ</label>
                <textarea value={otherSymptoms} onChange={e => setOtherSymptoms(e.target.value)} rows={1} placeholder="บันทึกเพิ่มเติม..."
                  className="w-full outline-none transition-colors resize-none"
                  style={{ padding: '0.625rem 0.75rem', border: '2px solid #e2e8f0', borderRadius: '0.625rem', fontSize: '0.9rem' }} />
              </div>

              {/* ESI TRIAGE Buttons - 5 column grid with large numbers */}
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#64748b', fontSize: '0.8rem' }}>ESI TRIAGE</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(lv => {
                    const c = ESI_COLORS[lv]
                    const isSelected = selectedEsi === lv
                    return (
                      <button key={lv} onClick={() => setSelectedEsi(lv)}
                        className="rounded-xl py-2 text-center cursor-pointer transition-all active:scale-95"
                        style={{
                          backgroundColor: c.bg, color: c.text,
                          border: `3px solid ${c.border}`,
                          boxShadow: isSelected ? '0 0 0 3px #3b82f6' : 'none',
                        }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{lv}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons - 2x2 Grid matching original PHP */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleSave} disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all active:scale-97"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                  บันทึก
                </button>
                <button onClick={() => setTransferView(true)} disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-97 bg-white"
                  style={{ border: '2px solid #6366f1', color: '#4f46e5' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  ย้ายเตียง
                </button>
                <button onClick={handleDischarge} disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all active:scale-97"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  กลับบ้าน
                </button>
                <button onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-97"
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  ปิด
                </button>
              </div>
            </>
          ) : isOccupied && transferView ? (
            /* Transfer View - matching original PHP */
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  เลือกเตียงปลายทาง
                </div>
                <button onClick={() => setTransferView(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  กลับ
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-3" style={{ fontSize: '0.7rem' }}>
                <span className="flex items-center gap-1">
                  <span className="inline-block rounded-sm" style={{ width: '0.6rem', height: '0.6rem', background: '#fefce8', border: '2px solid #facc15' }} />
                  ว่าง
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block rounded-sm" style={{ width: '0.6rem', height: '0.6rem', background: '#eff6ff', border: '2px solid #93c5fd' }} />
                  ไม่มี ESI
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block rounded-sm" style={{ width: '0.6rem', height: '0.6rem', background: '#dbeafe', border: '2px solid #3b82f6' }} />
                  ปัจจุบัน
                </span>
              </div>

              {/* Transfer Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {allBeds.map(b => {
                  const isCurrent = b.bedNumber === bed.bedNumber
                  const isOcc = b.status === 'occupied'
                  const dn = formatBedNumber(b.bedNumber)
                  let cardStyle: { bg: string; border: string; text: string; cursor: string }

                  if (isCurrent) {
                    cardStyle = { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', cursor: 'default' }
                  } else if (!isOcc) {
                    cardStyle = { bg: '#fefce8', border: '#facc15', text: '#854d0e', cursor: 'pointer' }
                  } else if (b.esiLevel && ESI_COLORS[b.esiLevel]) {
                    const c = ESI_COLORS[b.esiLevel]
                    cardStyle = { bg: c.bg, border: c.border, text: c.text, cursor: 'not-allowed' }
                  } else {
                    cardStyle = { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', cursor: 'not-allowed' }
                  }

                  const handleClick = () => {
                    if (isCurrent) return
                    if (isOcc) { toast.error(`เตียง ${dn} มีผู้ป่วยแล้ว`); return }
                    handleTransfer(b.bedNumber, dn)
                  }

                  return (
                    <div key={b.bedNumber} onClick={handleClick}
                      className="transfer-card relative rounded-xl transition-all"
                      style={{
                        backgroundColor: cardStyle.bg, color: cardStyle.text, cursor: cardStyle.cursor,
                        border: `2.5px solid ${cardStyle.border}`,
                        padding: '0.625rem 0.5rem',
                      }}>
                      {isCurrent && (
                        <div className="absolute font-bold text-white rounded-full"
                          style={{ top: '-0.25rem', right: '-0.25rem', background: '#2563eb', fontSize: '0.5rem', padding: '0.1rem 0.3rem' }}>
                          ปัจจุบัน
                        </div>
                      )}
                      <div className="font-bold text-center" style={{ fontSize: '1.05rem' }}>{bedPrefix(dn)}{dn}</div>
                      {isOcc && !isCurrent ? (
                        <div className="mt-1.5 pt-1.5 space-y-0.5" style={{ fontSize: '0.65rem', borderTop: `1px solid ${cardStyle.border}80`, opacity: 0.9 }}>
                          <div><strong>HN:</strong> {b.patient?.hn}</div>
                          <div><strong>ชื่อ:</strong> {b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : ''}</div>
                          {b.deliveryStatus && <div><strong>สถานะ:</strong> {b.deliveryStatus}</div>}
                          {b.otherSymptoms && <div><strong>หมายเหตุ:</strong> {b.otherSymptoms}</div>}
                        </div>
                      ) : !isCurrent ? (
                        <div className="text-center" style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#16a34a', fontWeight: 600 }}>ว่าง</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            /* Available Bed - Barcode Input matching original PHP */
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-2" style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>สแกนบาร์โค้ดสายรัดข้อมือ หรือกรอก HN</p>
              <input ref={barcodeRef} type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleScanBarcode() }}
                placeholder="สแกนบาร์โค้ด / กรอก HN"
                className="w-full outline-none mb-3"
                style={{ textAlign: 'center', fontSize: '1.25rem', padding: '0.875rem', borderWidth: '3px', borderStyle: 'solid', borderColor: '#818cf8', borderRadius: '0.625rem' }} />
              <button onClick={handleScanBarcode} disabled={scanning || !barcodeInput.trim()}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '0.875rem', borderRadius: '0.625rem', fontSize: '1rem', border: 'none', cursor: 'pointer' }}>
                {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                ค้นหาและนำเข้าเตียง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
