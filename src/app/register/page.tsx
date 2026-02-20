'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeProvider'
import { UserPlus, Hash, User, Sparkles, Loader2, CheckCircle2, Printer, RotateCcw, AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { colors } = useTheme()
  const [hn, setHn] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState<{ hn: string; firstName: string; lastName: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [barcodeReady, setBarcodeReady] = useState(false)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  useEffect(() => {
    if (registered && barcodeReady && canvasRef.current && (window as any).JsBarcode) {
      try {
        (window as any).JsBarcode(canvasRef.current, registered.hn, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 16,
          fontOptions: 'bold',
          margin: 10,
        })
      } catch {}
    }
  }, [registered, barcodeReady])

  const generateHn = async () => {
    setGenLoading(true)
    try {
      const res = await fetch('/api/generate-hn')
      const data = await res.json()
      if (data.hn) setHn(data.hn)
    } catch { setError('ไม่สามารถสร้าง HN ได้') }
    setGenLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!hn.trim() || !firstName.trim() || !lastName.trim()) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hn: hn.trim(), firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      if (res.status === 409) { setError('HN นี้มีในระบบแล้ว'); setSubmitting(false); return }
      if (!res.ok) throw new Error('ลงทะเบียนไม่สำเร็จ')
      setRegistered({ hn: hn.trim(), firstName: firstName.trim(), lastName: lastName.trim() })
    } catch (err: any) { setError(err.message || 'เกิดข้อผิดพลาด') }
    setSubmitting(false)
  }

  const reset = () => { setHn(''); setFirstName(''); setLastName(''); setError(''); setRegistered(null) }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <Script src="/JsBarcode.all.min.js" strategy="afterInteractive" onLoad={() => setBarcodeReady(true)} />
      <Navbar user={{ name: session.user?.name, role: (session.user as any)?.role }} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-5" style={{ background: colors.gradient }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><UserPlus className="w-5 h-5 text-white" /></div>
              <div><h1 className="text-xl font-bold text-white">ลงทะเบียนผู้ป่วย</h1><p className="text-sm" style={{ color: colors.textSubtle }}>Patient Registration</p></div>
            </div>
          </div>

          {!registered ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">HN (Hospital Number)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={hn} onChange={e => setHn(e.target.value)} placeholder="เช่น 0000001"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                  </div>
                  <button type="button" onClick={generateHn} disabled={genLoading}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                    {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} สร้าง HN
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="ชื่อจริง" required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">นามสกุล</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="นามสกุล" required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" />
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: colors.gradient }}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} ลงทะเบียน
              </button>
            </form>
          ) : (
            <div className="p-6 animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-8 h-8 text-green-600" /></div>
                <h2 className="text-lg font-bold text-gray-800">ลงทะเบียนสำเร็จ!</h2>
              </div>
              <div className="print-area bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center mb-6">
                <p className="text-xs text-gray-500 mb-2">SMART ER - HOSPITAL</p>
                <canvas ref={canvasRef} className="mx-auto mb-2" />
                <p className="font-bold text-lg">{registered.firstName} {registered.lastName}</p>
                <p className="text-gray-500 text-sm">HN: {registered.hn}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" /> พิมพ์สายรัดข้อมือ
                </button>
                <button onClick={reset} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> ลงทะเบียนรายใหม่
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
