'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeProvider'
import { THEME_PRESETS } from '@/lib/themes'
import toast from 'react-hot-toast'
import { Settings, Volume2, Mic, Timer, Save, Loader2, ToggleLeft, ToggleRight, Palette, Check } from 'lucide-react'

interface SoundSettings {
  googleTtsEnabled: boolean
  browserTtsEnabled: boolean
  voiceName: string
  voiceLang: string
  speechTemplate: string
  speechPause: number
  speechRate: number
  pageInterval: number
  showSoundButton: boolean
}

const defaults: SoundSettings = {
  googleTtsEnabled: true, browserTtsEnabled: false, voiceName: '', voiceLang: 'th-TH',
  speechTemplate: 'ขอเชิญหมายเลข {{HN}} เข้ารับการรักษา', speechPause: 0.5, speechRate: 1, pageInterval: 15, showSoundButton: true,
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { theme: currentTheme, colors, setTheme } = useTheme()
  const [settings, setSettings] = useState<SoundSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTheme, setSavingTheme] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && (session.user as any)?.role !== 'admin') { router.push('/dashboard'); toast.error('เฉพาะผู้ดูแลระบบ') }
  }, [status, session, router])

  useEffect(() => {
    fetch('/api/sound-settings').then(r => r.json()).then(data => {
      if (data.settings) setSettings({ ...defaults, ...data.settings })
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const loadVoices = () => { const v = speechSynthesis.getVoices(); if (v.length) setVoices(v) }
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/sound-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast.success('บันทึกสำเร็จ')
      else toast.error('บันทึกไม่สำเร็จ')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    setSaving(false)
  }

  const handleThemeChange = async (themeKey: string) => {
    setSavingTheme(true)
    setTheme(themeKey)
    try {
      const res = await fetch('/api/theme', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeKey }),
      })
      if (res.ok) toast.success('เปลี่ยนธีมสำเร็จ')
      else toast.error('บันทึกธีมไม่สำเร็จ')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    setSavingTheme(false)
  }

  const testTts = () => {
    const text = settings.speechTemplate.replace('{{HN}}', '0000001')
    if (settings.browserTtsEnabled) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = settings.voiceLang
      u.rate = settings.speechRate
      if (settings.voiceName) { const v = voices.find(v => v.name === settings.voiceName); if (v) u.voice = v }
      speechSynthesis.speak(u)
    } else {
      const audio = new Audio(`/api/google-tts?text=${encodeURIComponent(text)}&lang=th`)
      audio.play()
    }
  }

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button onClick={() => onChange(!value)} className="flex items-center gap-3 w-full py-2">
      {value ? <ToggleRight className="w-8 h-8" style={{ color: colors.primary }} /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
      <span className={value ? 'text-gray-800 font-medium' : 'text-gray-500'}>{label}</span>
    </button>
  )

  if (status === 'loading' || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} /></div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <Navbar user={{ name: session.user?.name, role: (session.user as any)?.role }} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: colors.gradient }}><Settings className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-800">ตั้งค่าระบบ</h1><p className="text-gray-500 text-sm">System Settings</p></div>
        </div>

        <div className="space-y-5">
          {/* Theme Color */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: colors.primary }} /> สีธีมเว็บ
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                const isActive = currentTheme === key
                return (
                  <button
                    key={key}
                    onClick={() => handleThemeChange(key)}
                    disabled={savingTheme}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105"
                    style={{
                      borderColor: isActive ? preset.colors.primary : '#e5e7eb',
                      background: isActive ? `${preset.colors.primary}10` : '#fff',
                      boxShadow: isActive ? `0 0 0 3px ${preset.colors.primary}30` : 'none',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                      style={{ background: preset.colors.gradient }}
                    >
                      {isActive && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-xs font-medium text-gray-600">{preset.label.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* TTS Settings */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Volume2 className="w-5 h-5" style={{ color: colors.primary }} /> ตั้งค่าเสียงเรียก</h3>
            <div className="space-y-3">
              <Toggle value={settings.googleTtsEnabled} onChange={v => setSettings(s => ({ ...s, googleTtsEnabled: v }))} label="Google TTS (ต้องมีอินเทอร์เน็ต)" />
              <Toggle value={settings.browserTtsEnabled} onChange={v => setSettings(s => ({ ...s, browserTtsEnabled: v }))} label="Browser TTS (ใช้ได้แบบ Offline)" />
              <Toggle value={settings.showSoundButton} onChange={v => setSettings(s => ({ ...s, showSoundButton: v }))} label="แสดงปุ่มเสียงในหน้าจอแสดงผล" />
            </div>
          </div>

          {/* Voice Settings */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Mic className="w-5 h-5" style={{ color: colors.primary }} /> ตั้งค่าเสียง</h3>
            <div className="space-y-4">
              {settings.browserTtsEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เสียงพูด (Browser TTS)</label>
                  <select value={settings.voiceName} onChange={e => setSettings(s => ({ ...s, voiceName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none"
                    style={{ '--tw-ring-color': colors.focusRing } as any}>
                    <option value="">เสียงเริ่มต้น</option>
                    {voices.filter(v => v.lang.startsWith('th')).map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    {voices.filter(v => !v.lang.startsWith('th')).map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รูปแบบข้อความ</label>
                <input type="text" value={settings.speechTemplate} onChange={e => setSettings(s => ({ ...s, speechTemplate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none" />
                <p className="text-xs text-gray-400 mt-1">ใช้ {'{{HN}}'} แทนหมายเลข HN</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ช่วงหยุด (วินาที)</label>
                  <input type="number" step="0.1" min="0" max="5" value={settings.speechPause} onChange={e => setSettings(s => ({ ...s, speechPause: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ความเร็วเสียง</label>
                  <input type="number" step="0.1" min="0.5" max="2" value={settings.speechRate} onChange={e => setSettings(s => ({ ...s, speechRate: parseFloat(e.target.value) || 1 }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>
              <button onClick={testTts} className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-200 flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> ทดสอบเสียง
              </button>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Timer className="w-5 h-5" style={{ color: colors.primary }} /> ตั้งค่าจอแสดงผล</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สลับหน้าอัตโนมัติ (วินาที)</label>
              <input type="number" min="5" max="120" value={settings.pageInterval} onChange={e => setSettings(s => ({ ...s, pageInterval: parseInt(e.target.value) || 15 }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none" />
            </div>
          </div>

          {/* Save */}
          <button onClick={save} disabled={saving}
            className="w-full py-3.5 text-white rounded-2xl font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: colors.gradient }}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  )
}
