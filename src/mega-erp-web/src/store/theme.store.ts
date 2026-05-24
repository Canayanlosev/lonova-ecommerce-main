import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'blue' | 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber'

interface ThemeState {
  themeMode: ThemeMode
  accentColor: AccentColor
  setThemeMode: (mode: ThemeMode) => void
  setAccentColor: (color: AccentColor) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      accentColor: 'blue',
      setThemeMode: (themeMode) => set({ themeMode }),
      setAccentColor: (accentColor) => set({ accentColor }),
    }),
    {
      name: 'app-theme',
    }
  )
)
