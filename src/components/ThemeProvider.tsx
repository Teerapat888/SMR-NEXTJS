'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getThemeColors, DEFAULT_THEME, type ThemeColors } from '@/lib/themes'

interface ThemeContextValue {
  theme: string
  colors: ThemeColors
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  colors: getThemeColors(DEFAULT_THEME),
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function applyThemeVars(colors: ThemeColors) {
  const root = document.documentElement
  root.style.setProperty('--theme-gradient', colors.gradient)
  root.style.setProperty('--theme-nav-from', colors.navFrom)
  root.style.setProperty('--theme-nav-to', colors.navTo)
  root.style.setProperty('--theme-nav-mobile', colors.mobileBg)
  root.style.setProperty('--theme-primary', colors.primary)
  root.style.setProperty('--theme-primary-dark', colors.primaryDark)
  root.style.setProperty('--theme-view-bg', colors.viewBg)
  root.style.setProperty('--theme-text-muted', colors.textMuted)
  root.style.setProperty('--theme-text-subtle', colors.textSubtle)
  root.style.setProperty('--theme-focus-ring', colors.focusRing)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME)
  const [colors, setColors] = useState<ThemeColors>(getThemeColors(DEFAULT_THEME))

  useEffect(() => {
    fetch('/api/theme')
      .then(r => r.json())
      .then(data => {
        if (data.theme) {
          const c = getThemeColors(data.theme)
          setThemeState(data.theme)
          setColors(c)
          applyThemeVars(c)
        }
      })
      .catch(() => {
        applyThemeVars(getThemeColors(DEFAULT_THEME))
      })
  }, [])

  // Apply default theme vars immediately on mount
  useEffect(() => {
    applyThemeVars(colors)
  }, [])

  const setTheme = (newTheme: string) => {
    const c = getThemeColors(newTheme)
    setThemeState(newTheme)
    setColors(c)
    applyThemeVars(c)
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
