'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatBedNumber } from '@/lib/helpers'
import { useTheme } from '@/components/ThemeProvider'
import { Activity } from 'lucide-react'

// ESI colors matching original PHP (1-5 = in bed, 6 = pending ESI, 7 = waiting queue)
const ESI_COLORS: Record<number, { bg: string; text: string; name: string }> = {
  1: { bg: '#fe0002', text: '#FFFFFF', name: 'Immediate' },
  2: { bg: '#ff32cd', text: '#FFFFFF', name: 'Emergency' },
  3: { bg: '#eaea03', text: '#1F2937', name: 'Urgency' },
  4: { bg: '#00af36', text: '#FFFFFF', name: 'Semi-Urgency' },
  5: { bg: '#cccbcb', text: '#1F2937', name: 'Non-Urgency' },
  6: { bg: '#3b82f6', text: '#FFFFFF', name: 'Pending ESI' },
  7: { bg: '#6B7280', text: '#FFFFFF', name: 'รอคิว' },
}

const ROWS_PER_PAGE = 5
const GOOGLE_TTS_SPEED_BOOST = 1.3

// Thai digit names for TTS
const thaiDigits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
function digitToThai(str: string) {
  return str.split('').map(ch => thaiDigits[parseInt(ch)] || ch).join(' ')
}

interface PatientRow {
  hn: string
  bed_number: string | null
  status: string
  esi_level: number
  source: string
}

interface SoundSettings {
  speechTemplate?: string
  speechPause?: number
  speechRate?: number
  googleTtsEnabled?: boolean
  browserTtsEnabled?: boolean
  soundEnabled?: boolean
  showSoundButton?: boolean
  pageInterval?: number
}

export default function ViewPage() {
  const { colors } = useTheme()
  const [allPatients, setAllPatients] = useState<PatientRow[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [countdown, setCountdown] = useState(15)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundEngine, setSoundEngine] = useState('')
  const [showOverlay, setShowOverlay] = useState(false)
  const [alertData, setAlertData] = useState<{ hn: string; bedNumber: string | null } | null>(null)
  const [settings, setSettings] = useState<SoundSettings | null>(null)
  const [pageHasGesture, setPageHasGesture] = useState(false)

  const processedCallsRef = useRef<Set<string>>(new Set())
  const pendingSpeechRef = useRef<string | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const isSpeakingRef = useRef(false)
  const soundEnabledRef = useRef(false)
  const pageHasGestureRef = useRef(false)
  const settingsRef = useRef<SoundSettings | null>(null)

  const autoplayAttemptedRef = useRef(false)

  // Keep refs in sync
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
  useEffect(() => { pageHasGestureRef.current = pageHasGesture }, [pageHasGesture])
  useEffect(() => { settingsRef.current = settings }, [settings])

  const pageInterval = settings?.pageInterval || 15
  const totalPages = Math.max(1, Math.ceil(allPatients.length / ROWS_PER_PAGE))

  // Get speech settings
  const getSpeechSettings = useCallback(() => {
    const s = settingsRef.current
    return {
      template: s?.speechTemplate || 'ขอเชิญหมายเลข {{HN}} เข้ารับการรักษา',
      pause: s?.speechPause || 0.5,
      rate: s?.speechRate || 1,
      googleTtsEnabled: s?.googleTtsEnabled === true,
      browserTtsEnabled: s?.browserTtsEnabled !== false,
    }
  }, [])

  // Generate speech text
  const generateSpeechText = useCallback((hn: string, engine: string) => {
    const s = getSpeechSettings()
    const hnSpoken = engine === 'google' ? digitToThai(hn) : hn.split('').join(' ')
    let pauseText = ''
    if (s.pause > 0) {
      pauseText = engine === 'google' ? ', ' : ' ' + '.'.repeat(Math.ceil(s.pause * 3)) + ' '
    }
    return s.template.replace(/\{\{HN\}\}/gi, pauseText + hnSpoken + pauseText)
  }, [getSpeechSettings])

  // Google TTS: play 2 rounds
  const speakGoogle = useCallback((text: string, rate: number) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    window.speechSynthesis?.cancel()
    isSpeakingRef.current = true

    let playCount = 0
    const playRound = () => {
      const audio = new Audio(`/api/google-tts?text=${encodeURIComponent(text)}&lang=th`)
      audio.playbackRate = rate * GOOGLE_TTS_SPEED_BOOST
      currentAudioRef.current = audio

      audio.onended = () => {
        playCount++
        if (playCount < 2) {
          setTimeout(playRound, 1000)
        } else {
          currentAudioRef.current = null
          isSpeakingRef.current = false
        }
      }
      audio.onerror = () => {
        currentAudioRef.current = null
        isSpeakingRef.current = false
      }
      audio.play().catch(() => {
        currentAudioRef.current = null
        isSpeakingRef.current = false
      })
    }
    playRound()
  }, [])

  // Browser TTS: play 2 rounds
  const speakBrowser = useCallback((text: string, rate: number) => {
    window.speechSynthesis?.cancel()
    isSpeakingRef.current = true

    let playCount = 0
    const playRound = () => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'th-TH'
      utterance.rate = rate
      utterance.pitch = 1.0
      const voices = window.speechSynthesis.getVoices()
      const thaiVoice = voices.find(v => v.lang.includes('th'))
      if (thaiVoice) utterance.voice = thaiVoice

      utterance.onend = () => {
        playCount++
        if (playCount < 2) {
          setTimeout(playRound, 1000)
        } else {
          isSpeakingRef.current = false
        }
      }
      utterance.onerror = () => { isSpeakingRef.current = false }
      window.speechSynthesis.speak(utterance)
    }
    playRound()
  }, [])

  // Main speak function - try playing directly, fallback to overlay
  const speak = useCallback((text: string) => {
    if (!soundEnabledRef.current) return
    const s = getSpeechSettings()

    // Always try to play directly first (works with Chrome autoplay flag or after unlock)
    if (pageHasGestureRef.current) {
      if (s.googleTtsEnabled) {
        speakGoogle(text, s.rate)
      } else if (s.browserTtsEnabled) {
        speakBrowser(text, s.rate)
      }
      return
    }

    // Try to play anyway - if Chrome has autoplay allowed, it will work
    if (s.googleTtsEnabled) {
      const testAudio = new Audio(`/api/google-tts?text=${encodeURIComponent(text)}&lang=th`)
      testAudio.play().then(() => {
        // Autoplay worked! Mark gesture as done
        testAudio.pause()
        pageHasGestureRef.current = true
        setPageHasGesture(true)
        sessionStorage.setItem('userInteracted', 'true')
        speakGoogle(text, s.rate)
      }).catch(() => {
        // Autoplay blocked - show overlay
        pendingSpeechRef.current = text
        setShowOverlay(true)
      })
    } else if (s.browserTtsEnabled) {
      try {
        speakBrowser(text, s.rate)
        pageHasGestureRef.current = true
        setPageHasGesture(true)
        sessionStorage.setItem('userInteracted', 'true')
      } catch {
        pendingSpeechRef.current = text
        setShowOverlay(true)
      }
    }
  }, [getSpeechSettings, speakGoogle, speakBrowser])

  // Process queue call
  const processQueueCall = useCallback((hn: string, bedNumber: string | null) => {
    if (processedCallsRef.current.has(hn)) return
    processedCallsRef.current.add(hn)
    setTimeout(() => processedCallsRef.current.delete(hn), 30000)

    setAlertData({ hn, bedNumber })
    setTimeout(() => setAlertData(null), 15000)

    const s = getSpeechSettings()
    const engine = s.googleTtsEnabled ? 'google' : 'browser'
    const speechText = generateSpeechText(hn, engine)
    speak(speechText)
  }, [getSpeechSettings, generateSpeechText, speak])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/view-data')
      const data = await res.json()
      if (data.success) {
        setAllPatients(data.allPatients || [])
      }
    } catch {}
  }, [])

  // Try to auto-unlock audio by playing a silent AudioContext
  const tryAutoUnlockAudio = useCallback(async (): Promise<boolean> => {
    try {
      // Method 1: AudioContext - most reliable for autoplay unlock
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        // Create a silent oscillator and play it briefly
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        gain.gain.value = 0 // silent
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.01)
        // Check if context is running (means autoplay is allowed)
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        const success = ctx.state === 'running'
        ctx.close()
        if (success) return true
      }

      // Method 2: Try playing a silent data URI audio
      const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
      await silentAudio.play()
      silentAudio.pause()
      return true
    } catch {
      return false
    }
  }, [])

  // Load settings from API + attempt auto-enable sound
  useEffect(() => {
    fetch('/api/sound-settings').then(r => r.json()).then(async (d) => {
      if (d.settings) {
        setSettings(d.settings)
        const engine = d.settings.googleTtsEnabled ? 'Google' : 'Microsoft'

        // Always try to auto-unlock audio immediately
        if (!autoplayAttemptedRef.current) {
          autoplayAttemptedRef.current = true
          const unlocked = await tryAutoUnlockAudio()
          if (unlocked) {
            // Audio autoplay is allowed - enable sound directly
            setPageHasGesture(true)
            sessionStorage.setItem('userInteracted', 'true')
            setSoundEnabled(true)
            setSoundEngine(engine)
            return
          }
        }

        // Fallback: check previous interaction
        if (d.settings.soundEnabled) {
          const hadInteraction = sessionStorage.getItem('userInteracted')
          if (hadInteraction) {
            setSoundEnabled(true)
            setSoundEngine(engine)
            setPageHasGesture(true)
          } else {
            // Show overlay only if autoplay failed
            setShowOverlay(true)
          }
        }
      }
    }).catch(() => {})
  }, [tryAutoUnlockAudio])

  // Data polling (10s)
  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 10000); return () => clearInterval(iv) }, [fetchData])

  // Queue call polling (3s)
  useEffect(() => {
    const checkCalls = async () => {
      try {
        const res = await fetch('/api/queue-calls')
        const data = await res.json()
        if (data.success && data.calls?.length > 0) {
          data.calls.forEach((call: any, index: number) => {
            setTimeout(() => {
              processQueueCall(call.hn, call.bed_number)
            }, index * 3000)
          })
        }
      } catch {}
    }
    checkCalls()
    const iv = setInterval(checkCalls, 3000)
    return () => clearInterval(iv)
  }, [processQueueCall])

  // Page rotation countdown
  useEffect(() => {
    setCountdown(pageInterval)
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCurrentPage(p => (p + 1) % Math.max(1, Math.ceil(allPatients.length / ROWS_PER_PAGE)))
          return pageInterval
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [pageInterval, allPatients.length])

  // Dismiss overlay and enable sound
  const dismissOverlay = () => {
    setShowOverlay(false)
    setPageHasGesture(true)
    sessionStorage.setItem('userInteracted', 'true')
    setSoundEnabled(true)
    const s = getSpeechSettings()
    setSoundEngine(s.googleTtsEnabled ? 'Google' : 'Microsoft')

    if (pendingSpeechRef.current) {
      const text = pendingSpeechRef.current
      pendingSpeechRef.current = null
      setTimeout(() => speak(text), 100)
    } else {
      if (s.googleTtsEnabled) {
        speakGoogle('เปิดเสียงแล้ว', s.rate)
      } else {
        speakBrowser('เปิดเสียงแล้ว', s.rate)
      }
    }
  }

  // Manual sound enable
  const enableSoundManually = () => {
    setPageHasGesture(true)
    sessionStorage.setItem('userInteracted', 'true')
    setSoundEnabled(true)
    const s = getSpeechSettings()
    setSoundEngine(s.googleTtsEnabled ? 'Google' : 'Microsoft')
    if (s.googleTtsEnabled) {
      speakGoogle('เปิดเสียงเรียบร้อยแล้ว', s.rate)
    } else {
      speakBrowser('เปิดเสียงเรียบร้อยแล้ว', s.rate)
    }
  }

  // User interaction detection for auto-enable
  useEffect(() => {
    const onInteraction = () => {
      setPageHasGesture(true)
      sessionStorage.setItem('userInteracted', 'true')
      setShowOverlay(false)
      if (!soundEnabledRef.current && settingsRef.current?.soundEnabled) {
        setSoundEnabled(true)
        const s = getSpeechSettings()
        setSoundEngine(s.googleTtsEnabled ? 'Google' : 'Microsoft')
      }
      if (soundEnabledRef.current && pendingSpeechRef.current) {
        const text = pendingSpeechRef.current
        pendingSpeechRef.current = null
        speak(text)
      }
      document.removeEventListener('click', onInteraction)
      document.removeEventListener('touchstart', onInteraction)
      document.removeEventListener('keydown', onInteraction)
    }
    document.addEventListener('click', onInteraction)
    document.addEventListener('touchstart', onInteraction)
    document.addEventListener('keydown', onInteraction)
    return () => {
      document.removeEventListener('click', onInteraction)
      document.removeEventListener('touchstart', onInteraction)
      document.removeEventListener('keydown', onInteraction)
    }
  }, [getSpeechSettings, speak])

  // Build page rows (always 5 rows, fill empty with placeholder)
  const pageRows: (PatientRow | null)[] = []
  const startIdx = currentPage * ROWS_PER_PAGE
  for (let i = 0; i < ROWS_PER_PAGE; i++) {
    pageRows.push(allPatients[startIdx + i] || null)
  }

  return (
    <>
      <style jsx global>{`
        html, body { margin: 0; padding: 0; height: 100vh; overflow: hidden; background: ${colors.viewBg}; }
        .main-container { display: flex; flex-direction: column; height: 100vh; padding: 0.5rem; box-sizing: border-box; }
        .header-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; background: rgba(255,255,255,0.1); border-radius: 0.75rem; margin-bottom: 0.5rem; backdrop-filter: blur(10px); flex-wrap: wrap; gap: 0.5rem; }
        .header-title { color: white; font-size: clamp(0.9rem, 2vw, 1.5rem); font-weight: bold; }
        .header-info { display: flex; gap: 0.75rem; align-items: center; color: white; flex-wrap: wrap; }
        .table-container { flex: 1; display: flex; flex-direction: column; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .table-header { display: grid; grid-template-columns: 1.2fr 0.8fr 1.5fr; gap: 0.5rem; background: ${colors.gradient}; color: white; font-weight: bold; font-size: clamp(0.9rem, 2.5vw, 2rem); padding: 0.5rem 1rem; text-align: center; }
        .table-header > div { padding: 0.25rem; text-align: center; }
        .table-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .table-row { display: grid; grid-template-columns: 1.2fr 0.8fr 1.5fr; gap: 0.5rem; flex: 1; align-items: center; padding: 0 1rem; font-size: clamp(1.2rem, 4vw, 3rem); font-weight: 700; border-bottom: 3px solid rgba(255,255,255,0.3); transition: background 0.3s; text-align: center; min-height: 0; }
        .table-row > div { padding: 0.25rem; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hn-cell { font-weight: 800; font-size: clamp(1.2rem, 4vw, 3rem); }
        .bed-cell { font-weight: 800; font-size: clamp(1.2rem, 4vw, 3rem); }
        .status-cell { font-size: clamp(0.9rem, 3vw, 2.2rem); font-weight: 600; }
        .empty-row { color: #9ca3af; font-style: italic; text-align: center; font-size: clamp(0.9rem, 2vw, 1.5rem); }
        .esi-legend { display: flex; gap: 0.5rem; font-size: clamp(0.55rem, 1.2vw, 1rem); font-weight: 600; flex-wrap: wrap; }
        .esi-legend-item { display: flex; align-items: center; gap: 0.2rem; }
        .esi-legend-dot { width: clamp(10px, 1.5vw, 18px); height: clamp(10px, 1.5vw, 18px); border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); flex-shrink: 0; }

        .voice-alert { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .voice-alert-content { background: white; padding: 3rem; border-radius: 1.5rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); animation: popIn 0.3s ease-out; }
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .voice-alert-hn { font-size: 3rem; font-weight: bold; color: #1e40af; margin: 1rem 0; }

        .click-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .click-overlay-content { text-align: center; color: white; }

        @media (max-width: 768px) {
          .main-container { padding: 0.25rem; }
          .header-bar { flex-direction: column; align-items: flex-start; padding: 0.5rem; }
          .header-info { width: 100%; justify-content: space-between; }
          .esi-legend { display: none !important; }
          .table-header { padding: 0.5rem; }
          .table-row { padding: 0 0.5rem; border-bottom: 2px solid rgba(255,255,255,0.3); }
        }
        @media (max-width: 480px) {
          .header-title { font-size: 0.85rem; }
          .table-header { font-size: 0.85rem; }
          .table-row { font-size: 1rem; }
          .hn-cell, .bed-cell { font-size: 1rem; }
          .status-cell { font-size: 0.85rem; }
        }
        @media (min-width: 769px) and (max-width: 1400px) {
          .header-title { font-size: 1.1rem; }
          .table-header { font-size: 1.3rem; }
          .table-row { font-size: 1.8rem; }
          .hn-cell, .bed-cell { font-size: 1.8rem; }
          .status-cell { font-size: 1.4rem; }
          .esi-legend { font-size: 0.75rem; gap: 0.6rem; }
          .esi-legend-dot { width: 14px; height: 14px; }
        }
        @media (min-width: 1401px) and (max-width: 1919px) {
          .header-title { font-size: 1.4rem; }
          .table-header { font-size: 1.8rem; }
          .table-row { font-size: 2.5rem; }
          .hn-cell, .bed-cell { font-size: 2.5rem; }
          .status-cell { font-size: 2rem; }
          .esi-legend { font-size: 0.95rem; gap: 1rem; }
          .esi-legend-dot { width: 18px; height: 18px; }
        }
        @media (min-width: 1920px) {
          .table-header { font-size: 2.5rem; padding: 0.75rem 1.5rem; }
          .table-row { font-size: 3.5rem; padding: 0 1.5rem; }
          .hn-cell, .bed-cell { font-size: 3.5rem; }
          .status-cell { font-size: 2.8rem; }
          .header-title { font-size: 1.8rem; }
          .esi-legend { font-size: 1.2rem; gap: 1.5rem; }
          .esi-legend-dot { width: 22px; height: 22px; }
        }
      `}</style>

      {/* Click to Enable Sound Overlay */}
      {showOverlay && (
        <div className="click-overlay" onClick={dismissOverlay}>
          <div className="click-overlay-content">
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🔊</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>คลิกที่หน้าจอเพื่อเปิดเสียง</div>
            <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>ตั้งค่าเสียงจากหลังบ้านแล้ว - แตะหน้าจอ 1 ครั้ง</div>
          </div>
        </div>
      )}

      {/* Voice Alert Modal */}
      {alertData && (
        <div className="voice-alert">
          <div className="voice-alert-content">
            <div style={{ fontSize: '4rem' }}>📢</div>
            <div style={{ fontSize: '1.5rem', color: '#666' }}>เรียกคิว</div>
            <div className="voice-alert-hn">HN: {alertData.hn}</div>
            <div style={{ fontSize: '1.25rem', color: '#666' }}>
              {alertData.bedNumber ? `กรุณาเข้ารับการรักษาที่เตียง ${formatBedNumber(alertData.bedNumber)}` : 'กรุณาเข้ารับการรักษา'}
            </div>
          </div>
        </div>
      )}

      <div className="main-container">
        {/* Header */}
        <div className="header-bar">
          <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity className="w-5 h-5" /> ติดตามสถานะผู้ป่วยและญาติ</div>
          <div className="header-info">
            <div className="esi-legend">
              {[1, 2, 3, 4, 5, 7].map(level => {
                const c = ESI_COLORS[level]
                return (
                  <div key={level} className="esi-legend-item">
                    <span className="esi-legend-dot" style={{ background: c.bg }} />
                    <span style={{ color: 'white' }}>{c.name}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ color: 'white', fontSize: 'clamp(0.6rem, 1.2vw, 0.9rem)' }}>
              หน้า {currentPage + 1}/{totalPages} ({allPatients.length} คน)
            </div>
            <div style={{ color: 'white', fontSize: 'clamp(0.6rem, 1.2vw, 0.9rem)' }}>
              {countdown}s
            </div>
            <button
              onClick={enableSoundManually}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: soundEnabled ? '#22c55e' : '#ef4444',
                color: 'white',
                fontSize: 'clamp(0.55rem, 1vw, 0.85rem)',
              }}
            >
              {soundEnabled ? `🔊 เสียงเปิด (${soundEngine})` : '🔇 คลิกเพื่อเปิดเสียง'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <div className="table-header">
            <div>HN</div>
            <div>เตียง</div>
            <div>สถานะ</div>
          </div>
          <div className="table-body">
            {pageRows.map((item, i) => {
              if (item) {
                const esiLevel = item.esi_level || 7
                const color = ESI_COLORS[esiLevel] || ESI_COLORS[7]
                return (
                  <div key={i} className="table-row" style={{ background: color.bg, color: color.text }}>
                    <div className="hn-cell" style={{ color: color.text }}>{item.hn}</div>
                    <div className="bed-cell" style={{ color: color.text }}>{item.bed_number ? formatBedNumber(item.bed_number) : '-'}</div>
                    <div className="status-cell" style={{ color: color.text }}>{item.status || '-'}</div>
                  </div>
                )
              } else {
                return (
                  <div key={i} className="table-row" style={{ background: '#f8fafc' }}>
                    <div className="empty-row" style={{ gridColumn: '1 / -1' }}>-</div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      </div>
    </>
  )
}
