'use client'

import { useState, useEffect, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import {
  HeartPulse,
  Shield,
  User,
  Lock,
  LogIn,
  AlertCircle,
  Loader2,
  Activity,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { colors } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Debug shortcut: Ctrl+D fills in test credentials
  const handleDebugShortcut = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault()
      setUsername('doctor1')
      setPassword('password123')
      setError('')
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleDebugShortcut)
    return () => window.removeEventListener('keydown', handleDebugShortcut)
  }, [handleDebugShortcut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (!result || result.error) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        setIsLoading(false)
        return
      }

      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      const role: string = session?.user?.role ?? ''

      if (role === 'admin' || role === 'nurse') {
        router.push('/dashboard')
      } else if (role === 'triage') {
        router.push('/register')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0" style={{ background: colors.viewBg }} />

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Decorative glowing orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl" style={{ background: `${colors.primary}30` }} />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl" style={{ background: `${colors.focusRing}25` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: `${colors.primary}15` }} />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Header / Logo area */}
          <div className="relative px-8 pt-10 pb-8 text-center" style={{ background: colors.gradient }}>
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-20 h-20 rounded-full bg-white/20 animate-pulse-ring" />
              <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <HeartPulse className="w-9 h-9 text-white" strokeWidth={2.2} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Smart ER
            </h1>
            <p className="text-sm mt-1 font-light" style={{ color: colors.textSubtle }}>
              ระบบจัดการคิวห้องฉุกเฉินอัจฉริยะ
            </p>

            {/* Decorative bottom wave */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg
                viewBox="0 0 400 24"
                className="w-full h-6 text-white/95"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,24 L0,8 Q50,0 100,8 T200,8 T300,8 T400,8 L400,24 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* Form area */}
          <div className="px-8 pb-10 pt-4">
            {error && (
              <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setError('')
                    }}
                    placeholder="กรอกชื่อผู้ใช้"
                    required
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    placeholder="กรอกรหัสผ่าน"
                    required
                    autoComplete="current-password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed"
                style={{ background: colors.gradient }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                <span>ระบบรักษาความปลอดภัยข้อมูลผู้ป่วย</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer beneath the card */}
        <div className="text-center mt-6 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: `${colors.textMuted}b0` }}>
            <Activity className="w-3.5 h-3.5" />
            <span>Smart Emergency Room v1.0</span>
          </div>
          <p className="text-xs" style={{ color: `${colors.textMuted}60` }}>
            &copy; {new Date().getFullYear()} ระบบจัดการห้องฉุกเฉินอัจฉริยะ
          </p>
        </div>
      </div>
    </div>
  )
}
