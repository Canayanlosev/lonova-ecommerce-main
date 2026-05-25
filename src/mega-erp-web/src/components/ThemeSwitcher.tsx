'use client'

import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, Palette } from 'lucide-react'
import { useThemeStore, ThemeMode, AccentColor } from '@/store/theme.store'
import { motion, AnimatePresence } from 'framer-motion'

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const { themeMode, accentColor, setThemeMode, setAccentColor } = useThemeStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const modes: { value: ThemeMode; label: string; icon: any }[] = [
    { value: 'light', label: 'Açık', icon: Sun },
    { value: 'dark', label: 'Koyu', icon: Moon },
    { value: 'system', label: 'Sistem', icon: Monitor },
  ]

  const accents: { value: AccentColor; label: string; colorClass: string }[] = [
    { value: 'blue', label: 'Mavi', colorClass: 'bg-blue-500' },
    { value: 'indigo', label: 'İndigo', colorClass: 'bg-indigo-500' },
    { value: 'violet', label: 'Mor', colorClass: 'bg-violet-500' },
    { value: 'emerald', label: 'Zümrüt', colorClass: 'bg-emerald-500' },
    { value: 'rose', label: 'Gül', colorClass: 'bg-rose-500' },
    { value: 'amber', label: 'Kehribar', colorClass: 'bg-amber-500' },
  ]

  const CurrentIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Monitor

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-slate-800/20 transition-colors flex items-center justify-center text-foreground"
        title="Temayı Değiştir"
      >
        <CurrentIcon className="w-5 h-5 text-slate-400 hover:text-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl p-3 shadow-2xl shadow-black/25 z-[100] space-y-4"
          >
            {/* Theme Mode Selector */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-400 pl-1">Görünüm</h4>
              <div className="grid grid-cols-3 gap-1 bg-slate-950/20 dark:bg-slate-900/60 p-1 rounded-xl border border-border/20">
                {modes.map((mode) => {
                  const Icon = mode.icon
                  const active = themeMode === mode.value
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setThemeMode(mode.value)}
                      className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-surface text-primary border border-border/40 shadow-sm'
                          : 'text-slate-400 hover:text-foreground'
                      }`}
                      title={mode.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Accent Color Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 pl-1">
                <Palette className="w-3 h-3 text-slate-400" />
                <h4 className="text-xs font-semibold text-slate-400">Renk Vurgusu</h4>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1">
                {accents.map((accent) => {
                  const active = accentColor === accent.value
                  return (
                    <button
                      key={accent.value}
                      onClick={() => setAccentColor(accent.value)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-200 ${
                        active
                          ? 'border-primary/60 bg-primary/5 text-primary shadow-sm'
                          : 'border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-950/5 dark:hover:bg-slate-900/20'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${accent.colorClass} shrink-0`} />
                      <span className="truncate">{accent.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
