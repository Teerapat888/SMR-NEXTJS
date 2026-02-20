'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { formatBedNumber, formatThaiDateTime, ALL_BEDS } from '@/lib/helpers'
import { useTheme } from '@/components/ThemeProvider'
import toast from 'react-hot-toast'
import { Loader2, Download, X, Tablet } from 'lucide-react'

const DELIVERY_STATUSES = [
  'รอตรวจ', 'รอผลเลือด', 'รอ x-ray / CT / MRI', 'รอผลเลือดและ X-ray',
  'รอทำแผล / ฉีดยา', 'สังเกตอาการหลังฉีดยา', 'ปรึกษาแพทย์เฉพาะทาง',
  'รอส่ง OPD', 'รอ Admit', 'รอรับยา', 'รอกลับบ้าน'
]

const ESI_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#fe0002', border: '#b80000', text: '#ffffff' },
  2: { bg: '#ff32cd', border: '#cc28a4', text: '#ffffff' },
  3: { bg: '#eaea03', border: '#c4c402', text: '#1f2937' },
  4: { bg: '#00af36', border: '#008c2b', text: '#ffffff' },
  5: { bg: '#cccbcb', border: '#a8a8a8', text: '#1f2937' },
}

interface BedData {
  id: number; bedNumber: string; status: string; patientId: number | null
  esiLevel: number | null; admittedAt: string | null
  deliveryStatus: string | null; otherSymptoms: string | null
  patient?: { id: number; hn: string; firstName: string; lastName: string } | null
}

function bedPrefix(displayName: string) {
  return (displayName === 'จุดคัดกรอง' || displayName === 'VVIP') ? '' : 'เตียง '
}

function getStatusBadgeStyle(status: string, esiLevel: number | null) {
  if (status === 'available') return { background: '#fefce8', color: '#854d0e', border: '1px solid #facc15' }
  if (status === 'occupied') {
    if (esiLevel && ESI_COLORS[esiLevel]) {
      const c = ESI_COLORS[esiLevel]
      return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
    }
    return { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }
  }
  return { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }
}

export default function BedPage() {
  const params = useParams()
  const bedNumber = params.bedNumber as string
  const [bed, setBed] = useState<BedData | null>(null)
  const [allBeds, setAllBeds] = useState<BedData[]>([])
  const [loading, setLoading] = useState(true)
  const [scanHn, setScanHn] = useState('')
  const [scanning, setScanning] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState('')
  const [otherSymptoms, setOtherSymptoms] = useState('')
  const [selectedEsi, setSelectedEsi] = useState<number | null>(null)
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { colors } = useTheme()

  // PWA: Dynamic manifest + Service Worker registration
  useEffect(() => {
    // Check if already running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Inject dynamic manifest link
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      document.head.appendChild(manifestLink)
    }
    manifestLink.href = `/api/manifest/${bedNumber}`

    // Set theme-color meta
    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement
    if (!themeMeta) {
      themeMeta = document.createElement('meta')
      themeMeta.name = 'theme-color'
      document.head.appendChild(themeMeta)
    }
    themeMeta.content = '#0d9488'

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show install popup if not dismissed before
      const dismissed = sessionStorage.getItem(`pwa-dismiss-${bedNumber}`)
      if (!dismissed) setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    const installed = () => {
      setShowInstall(false)
      setDeferredPrompt(null)
      setIsStandalone(true)
    }
    window.addEventListener('appinstalled', installed)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [bedNumber])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstall(false)
      setDeferredPrompt(null)
    }
  }

  const dismissInstall = () => {
    setShowInstall(false)
    sessionStorage.setItem(`pwa-dismiss-${bedNumber}`, '1')
  }

  const fetchBed = useCallback(async () => {
    try {
      const res = await fetch('/api/beds')
      const data = await res.json()
      if (data.success) {
        const found = data.beds.find((b: any) => b.bedNumber === bedNumber)
        if (found) {
          setBed(found)
          const newPatientId = found.patientId || null
          setCurrentPatientId(prev => {
            // Patient changed or bed became empty → reset form fields
            if (prev !== newPatientId) {
              setDeliveryStatus(found.deliveryStatus || 'รอตรวจ')
              setOtherSymptoms(found.otherSymptoms || '')
              setSelectedEsi(found.esiLevel)
            }
            return newPatientId
          })
        }
        setAllBeds(data.beds)
      }
    } catch {} finally { setLoading(false) }
  }, [bedNumber])

  useEffect(() => { fetchBed(); const iv = setInterval(fetchBed, 15000); return () => clearInterval(iv) }, [fetchBed])

  // Escape to close transfer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTransfer(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const performAction = async (action: string, extra: Record<string, any> = {}) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/bed-actions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, bedNumber, ...extra }),
      })
      const data = await res.json()
      if (data.success) { toast.success(data.message || 'สำเร็จ'); fetchBed(); setScanHn(''); setShowTransfer(false) }
      else toast.error(data.error || 'เกิดข้อผิดพลาด')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    setActionLoading(false)
    setScanning(false)
  }

  const handleScan = () => {
    if (!scanHn.trim()) { toast.error('กรุณากรอก HN หรือสแกนบาร์โค้ด'); return }
    setScanning(true)
    performAction('scan_barcode', { hn: scanHn.trim() })
  }

  const handleSave = () => {
    performAction('update_status', { deliveryStatus, otherSymptoms, esiLevel: selectedEsi })
  }

  const handleDischarge = () => {
    if (window.confirm('ต้องการให้ผู้ป่วยกลับบ้านหรือไม่?')) performAction('discharge')
  }

  const handleTransfer = (targetBedNumber: string, targetDisplayName: string) => {
    if (window.confirm(`ต้องการย้ายผู้ป่วยไปเตียง ${targetDisplayName} หรือไม่?`)) performAction('transfer', { targetBedNumber })
  }

  const label = formatBedNumber(bedNumber)
  const isOccupied = bed?.status === 'occupied'
  const badgeStyle = getStatusBadgeStyle(bed?.status || 'available', bed?.esiLevel ?? null)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1f5f9' }}>
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  )

  return (
    <div style={{ background: '#f1f5f9', margin: 0, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .bed-page-main { flex: 1; minHeight: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .bed-page-main::-webkit-scrollbar { display: none; }
        .bed-page-main.state-available { display: flex; align-items: center; justify-content: center; }
        .scan-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.15); background: #fff; animation: pulse-ring 2s infinite; }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.3); } 70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } }
        .esi-btn:active { transform: scale(0.95); }
        .esi-btn.selected { box-shadow: 0 0 0 3px #3b82f6, 0 4px 12px rgba(59,130,246,0.3); }
        .action-btn:active { transform: scale(0.97); }
        .bed-card-t:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        @media (max-height: 700px) {
          .card-header { padding: 0.625rem 1rem !important; }
          .card-body { padding: 0.75rem 1rem !important; }
          .info-chip { padding: 0.5rem 0.75rem !important; }
          .esi-btn { padding: 0.5rem 0.125rem !important; }
          .action-btn { padding: 0.625rem 0.75rem !important; font-size: 0.85rem !important; }
        }
        @media (max-height: 580px) {
          .card-header { padding: 0.5rem 0.75rem !important; }
          .card-body { padding: 0.5rem 0.75rem !important; }
          .info-chip { padding: 0.375rem 0.5rem !important; }
          .esi-btn { padding: 0.375rem 0.125rem !important; }
          .esi-num { font-size: 1.15rem !important; }
          .action-btn { padding: 0.5rem 0.5rem !important; font-size: 0.78rem !important; }
        }
      `}</style>

      {/* Header - Teal to Emerald gradient matching other pages */}
      <header style={{ background: colors.gradient, color: '#fff', flexShrink: 0 }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0.875rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a href="/dashboard" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.85 }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span style={{ fontSize: '0.8rem' }}>เตียงผู้ป่วย</span>
              </a>
              <div style={{ width: '1px', height: '2rem', background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{bedPrefix(label)}{label}</h1>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>
                  {parseInt(bedNumber) <= 28 ? 'เตียงผู้ป่วยหลัก' : 'เตียงรักษาชั่วคราว'}
                </p>
              </div>
            </div>
            <div style={{ ...badgeStyle, padding: '0.375rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700 }}>
              {isOccupied ? 'ใช้งาน' : 'ว่าง'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`bed-page-main ${!isOccupied ? 'state-available' : ''}`}
        style={{ width: '100%', maxWidth: '80rem', margin: '0 auto', padding: '1rem 1.25rem' }}>

        {isOccupied && bed?.patient ? (
          <>
            {/* Patient Info Card */}
            <div className="card" style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '1rem' }}>
              <div className="card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>ข้อมูลผู้ป่วย</h2>
              </div>
              <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <div className="info-chip" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>HN</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#4f46e5' }}>{bed.patient.hn}</div>
                  </div>
                  <div className="info-chip" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ชื่อ-นามสกุล</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{bed.patient.firstName} {bed.patient.lastName}</div>
                  </div>
                  <div className="info-chip" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>เวลาเข้าเตียง</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{formatThaiDateTime(bed.admittedAt)}</div>
                  </div>
                  <div className="info-chip" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>สถานะการรักษา</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{bed.deliveryStatus || 'รอตรวจ'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Form Card */}
            <div className="card" style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '1rem' }}>
              <div className="card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>อัพเดทข้อมูลการรักษา</h2>
              </div>
              <div className="card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Delivery Status & Notes - 2 column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.375rem' }}>สถานะการรักษา</label>
                    <select value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.95rem', outline: 'none', background: '#fff' }}>
                      {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.375rem' }}>สถานะเพิ่มเติม / หมายเหตุ</label>
                    <textarea value={otherSymptoms} onChange={e => setOtherSymptoms(e.target.value)} rows={1} placeholder="บันทึกเพิ่มเติม..."
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.95rem', outline: 'none', resize: 'none' }} />
                  </div>
                </div>

                {/* ESI TRIAGE */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>ESI TRIAGE</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(lv => {
                      const c = ESI_COLORS[lv]
                      const isSelected = selectedEsi === lv
                      return (
                        <button key={lv} onClick={() => setSelectedEsi(lv)}
                          className={`esi-btn ${isSelected ? 'selected' : ''}`}
                          style={{
                            background: c.bg, color: c.text,
                            border: `3px solid ${c.border}`,
                            borderRadius: '0.75rem', padding: '0.75rem 0.25rem',
                            textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                          }}>
                          <div className="esi-num" style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{lv}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={handleSave} disabled={actionLoading}
                    className="action-btn" style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s', opacity: actionLoading ? 0.5 : 1 }}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                    บันทึก
                  </button>
                  <button onClick={() => setShowTransfer(true)} disabled={actionLoading}
                    className="action-btn" style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', background: '#fff', border: '2px solid #6366f1', color: '#4f46e5', transition: 'all 0.2s' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    ย้ายเตียง
                  </button>
                  <button onClick={handleDischarge} disabled={actionLoading}
                    className="action-btn" style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', boxShadow: '0 4px 14px rgba(5,150,105,0.25)', transition: 'all 0.2s', opacity: actionLoading ? 0.5 : 1 }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    กลับบ้าน
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Available Bed - Scan to Admit */
          <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', maxWidth: '36rem', width: '100%' }}>
            <div className="card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>สแกนรับผู้ป่วยเข้าเตียง</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>สแกนบาร์โค้ดสายรัดข้อมือ หรือกรอก HN</p>
              </div>
            </div>
            <div className="card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input ref={inputRef} type="text" value={scanHn} onChange={e => setScanHn(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleScan() }} autoFocus autoComplete="off"
                placeholder="สแกนบาร์โค้ด / กรอก HN"
                className="scan-input"
                style={{ width: '100%', padding: '1.25rem', fontSize: '1.5rem', textAlign: 'center', border: '3px solid #818cf8', borderRadius: '1rem', outline: 'none', transition: 'all 0.2s', background: '#fafafe' }} />
              <button onClick={handleScan} disabled={scanning || !scanHn.trim()}
                style={{ width: '100%', padding: '1.125rem', fontSize: '1.15rem', fontWeight: 700, border: 'none', borderRadius: '1rem', color: '#fff', background: 'linear-gradient(135deg, #059669, #0d9488)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: scanning || !scanHn.trim() ? 0.5 : 1 }}>
                {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                ค้นหาและนำเข้าเตียง
              </button>
              <div style={{ padding: '0.75rem', background: '#eef2ff', borderRadius: '0.625rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#4338ca' }}>
                  <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  วางเคอร์เซอร์ในช่องและสแกนบาร์โค้ดจากสายรัดข้อมือ
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transfer Modal - Full screen overlay matching original PHP */}
      {showTransfer && isOccupied && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#f8fafc', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Modal Header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: colors.gradient, color: '#fff', padding: '1rem 1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  ย้ายเตียง
                </h2>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
                  จาก {bedPrefix(label)}{label} &mdash; {bed?.patient?.firstName} {bed?.patient?.lastName}
                </p>
              </div>
              <button onClick={() => setShowTransfer(false)}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ปิด
              </button>
            </div>
          </div>

          {/* Bed Grid */}
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem 1rem 2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }} className="transfer-bed-grid">
              <style>{`
                @media(min-width:480px) { .transfer-bed-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 0.75rem !important; } }
                @media(min-width:640px) { .transfer-bed-grid { grid-template-columns: repeat(5, 1fr) !important; } }
                @media(min-width:768px) { .transfer-bed-grid { grid-template-columns: repeat(6, 1fr) !important; gap: 0.875rem !important; } }
                @media(min-width:1024px) { .transfer-bed-grid { grid-template-columns: repeat(7, 1fr) !important; gap: 1rem !important; } }
                @media(min-width:1280px) { .transfer-bed-grid { grid-template-columns: repeat(8, 1fr) !important; } }
              `}</style>
              {allBeds.map(b => {
                const isCurrent = b.bedNumber === bedNumber
                const isOcc = b.status === 'occupied'
                const dn = formatBedNumber(b.bedNumber)
                let cardBg: string, cardBorder: string, cardText: string, cursor: string

                if (isCurrent) {
                  cardBg = '#dbeafe'; cardBorder = '#3b82f6'; cardText = '#1e40af'; cursor = 'default'
                } else if (!isOcc) {
                  cardBg = '#fefce8'; cardBorder = '#facc15'; cardText = '#854d0e'; cursor = 'pointer'
                } else if (b.esiLevel && ESI_COLORS[b.esiLevel]) {
                  const c = ESI_COLORS[b.esiLevel]
                  cardBg = c.bg; cardBorder = c.border; cardText = c.text; cursor = 'not-allowed'
                } else {
                  cardBg = '#eff6ff'; cardBorder = '#93c5fd'; cardText = '#1e40af'; cursor = 'not-allowed'
                }

                const handleClick = () => {
                  if (isCurrent) return
                  if (isOcc) { toast.error(`เตียง ${dn} มีผู้ป่วยแล้ว (${b.patient?.firstName || ''})`); return }
                  handleTransfer(b.bedNumber, dn)
                }

                return (
                  <button key={b.bedNumber} onClick={handleClick}
                    className="bed-card-t"
                    style={{
                      background: cardBg, borderColor: cardBorder, color: cardText, cursor,
                      border: `2.5px solid ${cardBorder}`, borderRadius: '0.75rem',
                      padding: '0.75rem 0.375rem', textAlign: 'center',
                      transition: 'all 0.2s', position: 'relative',
                    }}>
                    {isCurrent && (
                      <div style={{ position: 'absolute', top: '-0.375rem', right: '-0.375rem', background: '#2563eb', color: '#fff', fontSize: '0.55rem', padding: '0.125rem 0.375rem', borderRadius: '1rem', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                        ปัจจุบัน
                      </div>
                    )}
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>{dn}</div>
                    {isOcc && !isCurrent ? (
                      <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: 1.3, opacity: 0.85 }}>
                        {b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : ''}
                        {b.esiLevel ? <strong> ESI {b.esiLevel}</strong> : ''}
                      </div>
                    ) : !isCurrent ? (
                      <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#16a34a', fontWeight: 600 }}>ว่าง</div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Popup */}
      {showInstall && !isStandalone && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: '1.25rem', padding: '1.25rem',
            maxWidth: '28rem', width: '100%',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.3s ease-out',
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '1rem', flexShrink: 0,
                background: 'linear-gradient(135deg, #0d9488, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Tablet className="w-6 h-6" style={{ color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                    ติดตั้งแอพ {bedPrefix(label)}{label}
                  </h3>
                  <button onClick={dismissInstall} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                  ติดตั้งลงแท็บเล็ตเพื่อเปิดใช้งาน{bedPrefix(label)}{label}ได้ทันที
                </p>
                <button onClick={handleInstall} style={{
                  width: '100%', padding: '0.875rem', border: 'none', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #0d9488, #059669)', color: '#fff',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
                }}>
                  <Download className="w-5 h-5" />
                  ติดตั้งแอพ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
