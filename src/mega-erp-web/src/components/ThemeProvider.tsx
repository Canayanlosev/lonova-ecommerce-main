'use client'

import { useEffect, useState } from 'react'
import { useThemeStore } from '@/store/theme.store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, accentColor } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    
    // Apply accent color attribute
    root.setAttribute('data-accent', accentColor)

    // Apply dark/light class
    const applyTheme = () => {
      root.classList.remove('light', 'dark')
      
      if (themeMode === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(themeMode)
      }
    }

    applyTheme()

    // Listen for system preference changes if in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => {
        root.classList.remove('light', 'dark')
        root.classList.add(mediaQuery.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [themeMode, accentColor, mounted])

  return <>{children}</>
}
