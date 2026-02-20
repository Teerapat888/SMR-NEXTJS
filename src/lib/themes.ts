export interface ThemeColors {
  gradient: string
  navFrom: string
  navTo: string
  mobileBg: string
  primary: string
  primaryDark: string
  viewBg: string
  textMuted: string    // light text on dark bg (like teal-200)
  textSubtle: string   // subtle text on dark bg (like teal-100)
  focusRing: string
  swatch: string
}

export interface ThemePreset {
  label: string
  colors: ThemeColors
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  teal: {
    label: 'Teal (เขียวเข้ม)',
    colors: {
      gradient: 'linear-gradient(135deg, #0d9488, #059669)',
      navFrom: '#0f766e',
      navTo: '#0d9488',
      mobileBg: '#134e4a',
      primary: '#0d9488',
      primaryDark: '#0f766e',
      viewBg: 'linear-gradient(135deg, #134e4a, #115e59)',
      textMuted: '#99f6e4',
      textSubtle: '#ccfbf1',
      focusRing: '#14b8a6',
      swatch: '#0d9488',
    },
  },
  blue: {
    label: 'Blue (น้ำเงิน)',
    colors: {
      gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      navFrom: '#1d4ed8',
      navTo: '#2563eb',
      mobileBg: '#1e3a8a',
      primary: '#2563eb',
      primaryDark: '#1d4ed8',
      viewBg: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
      textMuted: '#93c5fd',
      textSubtle: '#bfdbfe',
      focusRing: '#3b82f6',
      swatch: '#2563eb',
    },
  },
  purple: {
    label: 'Purple (ม่วง)',
    colors: {
      gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      navFrom: '#6d28d9',
      navTo: '#7c3aed',
      mobileBg: '#4c1d95',
      primary: '#7c3aed',
      primaryDark: '#6d28d9',
      viewBg: 'linear-gradient(135deg, #4c1d95, #5b21b6)',
      textMuted: '#c4b5fd',
      textSubtle: '#ddd6fe',
      focusRing: '#8b5cf6',
      swatch: '#7c3aed',
    },
  },
  indigo: {
    label: 'Indigo (คราม)',
    colors: {
      gradient: 'linear-gradient(135deg, #4f46e5, #4338ca)',
      navFrom: '#4338ca',
      navTo: '#4f46e5',
      mobileBg: '#312e81',
      primary: '#4f46e5',
      primaryDark: '#4338ca',
      viewBg: 'linear-gradient(135deg, #312e81, #3730a3)',
      textMuted: '#a5b4fc',
      textSubtle: '#c7d2fe',
      focusRing: '#6366f1',
      swatch: '#4f46e5',
    },
  },
  rose: {
    label: 'Rose (ชมพู)',
    colors: {
      gradient: 'linear-gradient(135deg, #e11d48, #be123c)',
      navFrom: '#be123c',
      navTo: '#e11d48',
      mobileBg: '#881337',
      primary: '#e11d48',
      primaryDark: '#be123c',
      viewBg: 'linear-gradient(135deg, #881337, #9f1239)',
      textMuted: '#fda4af',
      textSubtle: '#fecdd3',
      focusRing: '#f43f5e',
      swatch: '#e11d48',
    },
  },
  amber: {
    label: 'Amber (ส้มทอง)',
    colors: {
      gradient: 'linear-gradient(135deg, #d97706, #b45309)',
      navFrom: '#b45309',
      navTo: '#d97706',
      mobileBg: '#78350f',
      primary: '#d97706',
      primaryDark: '#b45309',
      viewBg: 'linear-gradient(135deg, #78350f, #92400e)',
      textMuted: '#fcd34d',
      textSubtle: '#fde68a',
      focusRing: '#f59e0b',
      swatch: '#d97706',
    },
  },
}

export const DEFAULT_THEME = 'teal'

export function getThemeColors(preset: string): ThemeColors {
  return (THEME_PRESETS[preset] || THEME_PRESETS[DEFAULT_THEME]).colors
}
