'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Users, Clock,
  Sun, Sunset, Moon, Coffee, AlertTriangle, Download,
  Calendar, CheckCircle2, Copy, Printer, RotateCcw
} from 'lucide-react'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftType = 'sabah' | 'öğle' | 'akşam' | 'tam_gün' | 'izin' | 'boş'

interface ShiftDef {
  type: ShiftType
  label: string
  short: string
  timeRange: string
  hours: number
  color: string
  bg: string
  icon: React.ElementType
}

interface StaffMember {
  id: string
  name: string
  role: string
  color: string
}

interface ShiftEntry {
  employeeId: string
  date: string       // YYYY-MM-DD
  type: ShiftType
  note: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_STAFF = 'vardiya-staff'
const LS_SHIFTS = 'vardiya-shifts'

const SHIFT_DEFS: Record<ShiftType, ShiftDef> = {
  sabah:    { type: 'sabah',    label: 'Sabah',    short: 'S',  timeRange: '08:00–16:00', hours: 8,  color: 'text-amber-300',   bg: 'bg-amber-500/20 border-amber-400/40',    icon: Sun },
  öğle:     { type: 'öğle',    label: 'Öğle',     short: 'Ö',  timeRange: '12:00–20:00', hours: 8,  color: 'text-blue-300',    bg: 'bg-blue-500/20 border-blue-400/40',      icon: Coffee },
  akşam:    { type: 'akşam',   label: 'Akşam',    short: 'A',  timeRange: '16:00–00:00', hours: 8,  color: 'text-violet-300',  bg: 'bg-violet-500/20 border-violet-400/40',  icon: Moon },
  tam_gün:  { type: 'tam_gün', label: 'Tam Gün',  short: 'T',  timeRange: '09:00–18:00', hours: 8,  color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-400/40',icon: CheckCircle2 },
  izin:     { type: 'izin',    label: 'İzin',     short: 'İ',  timeRange: '—',           hours: 0,  color: 'text-slate-400',   bg: 'bg-slate-700/40 border-slate-600/40',    icon: RotateCcw },
  boş:      { type: 'boş',     label: 'Boş',      short: '—',  timeRange: '—',           hours: 0,  color: 'text-slate-600',   bg: 'bg-transparent border-transparent',      icon: X },
}

const ACTIVE_SHIFT_TYPES: ShiftType[] = ['sabah', 'öğle', 'akşam', 'tam_gün', 'izin']

const STAFF_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#ef4444']
const ROLES = ['Satış Danışmanı', 'Kasa Operatörü', 'Depo Görevlisi', 'Yönetici', 'Muhasebe', 'Müşteri Hizmetleri', 'Kurye', 'Teknisyen']

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const TR_DAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

function getWeekDates(offset = 0): Date[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ─── Demo Seed ────────────────────────────────────────────────────────────────

const DEMO_STAFF: StaffMember[] = [
  { id: 's1', name: 'Ayşe Demir',   role: 'Satış Danışmanı',    color: '#6366f1' },
  { id: 's2', name: 'Mehmet Kaya',  role: 'Kasa Operatörü',      color: '#10b981' },
  { id: 's3', name: 'Zeynep Çelik', role: 'Müşteri Hizmetleri', color: '#f59e0b' },
  { id: 's4', name: 'Arda Yıldız',  role: 'Depo Görevlisi',     color: '#ec4899' },
  { id: 's5', name: 'Selin Koç',    role: 'Yönetici',           color: '#3b82f6' },
]

function buildDemoShifts(staff: StaffMember[]): ShiftEntry[] {
  const dates = getWeekDates(0)
  const patterns: Record<string, ShiftType[]> = {
    s1: ['sabah', 'sabah', 'öğle', 'öğle', 'sabah', 'izin', 'boş'],
    s2: ['öğle', 'öğle', 'sabah', 'sabah', 'akşam', 'öğle', 'boş'],
    s3: ['tam_gün', 'tam_gün', 'tam_gün', 'izin', 'tam_gün', 'boş', 'boş'],
    s4: ['akşam', 'sabah', 'akşam', 'sabah', 'akşam', 'izin', 'boş'],
    s5: ['tam_gün', 'tam_gün', 'tam_gün', 'tam_gün', 'tam_gün', 'boş', 'boş'],
  }
  const shifts: ShiftEntry[] = []
  for (const emp of staff) {
    const pattern = patterns[emp.id] ?? []
    pattern.forEach((type, i) => {
      if (type !== 'boş') {
        shifts.push({ employeeId: emp.id, date: dateKey(dates[i]), type, note: '' })
      }
    })
  }
  return shifts
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VardiyaPage() {
  const toast = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [shifts, setShifts] = useState<ShiftEntry[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [pickerCell, setPickerCell] = useState<{ empId: string; date: string } | null>(null)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [staffForm, setStaffForm] = useState({ name: '', role: ROLES[0], color: STAFF_COLORS[0] })
  const [copyFrom, setCopyFrom] = useState<number | null>(null)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  useEffect(() => {
    try {
      const rawS = localStorage.getItem(LS_STAFF)
      const rawSh = localStorage.getItem(LS_SHIFTS)
      const loadedStaff: StaffMember[] = rawS ? JSON.parse(rawS) : DEMO_STAFF
      const loadedShifts: ShiftEntry[] = rawSh ? JSON.parse(rawSh) : buildDemoShifts(loadedStaff)
      setStaff(loadedStaff)
      setShifts(loadedShifts)
      if (!rawS) localStorage.setItem(LS_STAFF, JSON.stringify(loadedStaff))
      if (!rawSh) localStorage.setItem(LS_SHIFTS, JSON.stringify(buildDemoShifts(loadedStaff)))
    } catch {
      setStaff(DEMO_STAFF)
      setShifts(buildDemoShifts(DEMO_STAFF))
    }
  }, [])

  const saveStaff = useCallback((s: StaffMember[]) => { setStaff(s); localStorage.setItem(LS_STAFF, JSON.stringify(s)) }, [])
  const saveShifts = useCallback((s: ShiftEntry[]) => { setShifts(s); localStorage.setItem(LS_SHIFTS, JSON.stringify(s)) }, [])

  // Get shift for a specific employee + date
  const getShift = useCallback((empId: string, date: string): ShiftType => {
    return shifts.find(s => s.employeeId === empId && s.date === date)?.type ?? 'boş'
  }, [shifts])

  // Set shift
  const setShift = useCallback((empId: string, date: string, type: ShiftType) => {
    const filtered = shifts.filter(s => !(s.employeeId === empId && s.date === date))
    if (type !== 'boş') {
      filtered.push({ employeeId: empId, date, type, note: '' })
    }
    saveShifts(filtered)
    setPickerCell(null)
  }, [shifts, saveShifts])

  // Weekly stats per employee
  const weeklyStats = useMemo(() => {
    const stats: Record<string, { hours: number; shifts: number; days: string[] }> = {}
    for (const emp of staff) {
      const empShifts = weekDates.map(d => getShift(emp.id, dateKey(d))).filter(t => t !== 'boş' && t !== 'izin')
      stats[emp.id] = {
        hours: empShifts.reduce((s, t) => s + SHIFT_DEFS[t].hours, 0),
        shifts: empShifts.length,
        days: empShifts,
      }
    }
    return stats
  }, [staff, shifts, weekDates, getShift])

  // Coverage per day (how many employees working)
  const dayCoverage = useMemo(() => {
    return weekDates.map(d => {
      const date = dateKey(d)
      const working = staff.filter(emp => {
        const t = getShift(emp.id, date)
        return t !== 'boş' && t !== 'izin'
      }).length
      return { date, working }
    })
  }, [staff, shifts, weekDates, getShift])

  const handleAddStaff = () => {
    if (!staffForm.name.trim()) { toast.error('Ad zorunludur'); return }
    const s: StaffMember = { id: uid(), ...staffForm }
    saveStaff([...staff, s])
    setShowStaffForm(false)
    setStaffForm({ name: '', role: ROLES[0], color: STAFF_COLORS[0] })
    toast.success(`${s.name} eklendi`)
  }

  const handleDeleteStaff = (id: string) => {
    saveStaff(staff.filter(s => s.id !== id))
    saveShifts(shifts.filter(s => s.employeeId !== id))
    toast.success('Personel silindi')
  }

  const handleCopyWeek = (fromOffset: number) => {
    const fromDates = getWeekDates(fromOffset)
    const toDates = weekDates
    const newShifts = shifts.filter(s => !toDates.map(d => dateKey(d)).includes(s.date))
    for (let i = 0; i < 7; i++) {
      const fromDate = dateKey(fromDates[i])
      const toDate = dateKey(toDates[i])
      const dayShifts = shifts.filter(s => s.date === fromDate)
      for (const sh of dayShifts) newShifts.push({ ...sh, date: toDate })
    }
    saveShifts(newShifts)
    setCopyFrom(null)
    toast.success('Hafta kopyalandı')
  }

  const handleClearWeek = () => {
    const weekDateStrings = weekDates.map(d => dateKey(d))
    saveShifts(shifts.filter(s => !weekDateStrings.includes(s.date)))
    toast.success('Hafta temizlendi')
  }

  const handlePrint = () => window.print()

  const today = dateKey(new Date())
  const weekLabel = `${weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Vardiya Takvimi</h1>
          <p className="text-slate-400 text-sm font-semibold">Haftalık personel vardiya planlaması</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground text-sm transition-colors">
            <Printer size={14} /> Yazdır
          </button>
          <button onClick={() => setCopyFrom(weekOffset - 1)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground text-sm transition-colors">
            <Copy size={14} /> Geçen Hafta Kopyala
          </button>
          <button onClick={handleClearWeek} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-red-400 text-sm transition-colors">
            <X size={14} /> Temizle
          </button>
          <button onClick={() => setShowStaffForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus size={16} /> Personel Ekle
          </button>
        </div>
      </div>

      {/* Shift Legend */}
      <div className="flex gap-2 flex-wrap">
        {ACTIVE_SHIFT_TYPES.map(t => {
          const def = SHIFT_DEFS[t]
          const Icon = def.icon
          return (
            <span key={t} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${def.color} ${def.bg}`}>
              <Icon size={12} /> {def.label} <span className="opacity-60">{def.timeRange}</span>
            </span>
          )
        })}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-xl border border-border/40 hover:border-primary/40 hover:text-primary transition-colors text-slate-400">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-bold text-lg">{weekLabel}</p>
          {weekOffset === 0 && <p className="text-xs text-primary font-semibold">Bu Hafta</p>}
          {weekOffset === 1 && <p className="text-xs text-slate-400 font-semibold">Gelecek Hafta</p>}
          {weekOffset === -1 && <p className="text-xs text-slate-400 font-semibold">Geçen Hafta</p>}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-xl border border-border/40 hover:border-primary/40 hover:text-primary transition-colors text-slate-400">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Schedule Grid */}
      <div className="premium-card rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-900/50 border-b border-border/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide w-48">Personel</th>
                {weekDates.map((d, i) => {
                  const key = dateKey(d)
                  const cov = dayCoverage.find(c => c.date === key)
                  const isToday = key === today
                  return (
                    <th key={key} className={`px-2 py-3 text-center ${isToday ? 'bg-primary/10' : ''}`}>
                      <p className={`text-xs font-black ${isToday ? 'text-primary' : i >= 5 ? 'text-slate-500' : 'text-foreground'}`}>{TR_DAYS[i]}</p>
                      <p className={`text-[10px] ${isToday ? 'text-primary/70' : 'text-slate-500'}`}>{d.getDate()}</p>
                      {cov && (
                        <p className={`text-[9px] mt-0.5 font-semibold ${cov.working === 0 ? 'text-red-400' : cov.working < 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {cov.working}/{staff.length}
                        </p>
                      )}
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Hafta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {staff.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 group">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ backgroundColor: emp.color }}>
                        {emp.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{emp.name}</p>
                        <p className="text-[10px] text-slate-500">{emp.role}</p>
                      </div>
                      <button onClick={() => handleDeleteStaff(emp.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  </td>
                  {weekDates.map((d) => {
                    const date = dateKey(d)
                    const type = getShift(emp.id, date)
                    const def = SHIFT_DEFS[type]
                    const Icon = def.icon
                    const isToday = date === today
                    const isOpen = pickerCell?.empId === emp.id && pickerCell?.date === date
                    return (
                      <td key={date} className={`px-1 py-2 text-center relative ${isToday ? 'bg-primary/5' : ''}`}>
                        <button
                          onClick={() => setPickerCell(isOpen ? null : { empId: emp.id, date })}
                          className={`w-full px-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all hover:opacity-80 ${type !== 'boş' ? `${def.color} ${def.bg}` : 'border-dashed border-border/30 text-slate-700 hover:border-primary/30 hover:text-slate-400'}`}>
                          {type !== 'boş' ? (
                            <span className="flex items-center justify-center gap-0.5">
                              <Icon size={10} className="shrink-0" />
                              {def.short}
                            </span>
                          ) : (
                            <span>+</span>
                          )}
                        </button>

                        {/* Shift picker dropdown */}
                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setPickerCell(null)} />
                            <div className="absolute top-full left-1/2 -translate-x-1/2 z-30 mt-1 w-36 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
                              {ACTIVE_SHIFT_TYPES.map(t => {
                                const d2 = SHIFT_DEFS[t]
                                const D2Icon = d2.icon
                                return (
                                  <button key={t} onClick={() => setShift(emp.id, date, t)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-slate-800/40 transition-colors ${type === t ? `${d2.color} bg-slate-800/40` : 'text-slate-400'}`}>
                                    <D2Icon size={12} className={d2.color} />
                                    <span>{d2.label}</span>
                                    <span className="ml-auto text-[9px] text-slate-600">{d2.timeRange !== '—' ? d2.timeRange.slice(0, 5) : '—'}</span>
                                  </button>
                                )
                              })}
                              <button onClick={() => setShift(emp.id, date, 'boş')}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors border-t border-border/40">
                                <X size={12} /> Sil
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-black text-foreground">{weeklyStats[emp.id]?.hours ?? 0}s</p>
                    <p className="text-[10px] text-slate-500">{weeklyStats[emp.id]?.shifts ?? 0} vardiya</p>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                  <p className="font-semibold">Personel eklenmemiş</p>
                </td></tr>
              )}
            </tbody>
            {/* Footer — daily coverage row */}
            {staff.length > 0 && (
              <tfoot className="border-t border-border/40 bg-slate-900/30">
                <tr>
                  <td className="px-4 py-2 text-xs font-bold text-slate-400">Toplam Kapsama</td>
                  {weekDates.map(d => {
                    const date = dateKey(d)
                    const working = staff.filter(emp => {
                      const t = getShift(emp.id, date)
                      return t !== 'boş' && t !== 'izin'
                    })
                    const isToday = date === today
                    return (
                      <td key={date} className={`px-1 py-2 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                        <div className="flex justify-center gap-0.5 flex-wrap">
                          {working.map(emp => (
                            <span key={emp.id} className="w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                              style={{ backgroundColor: emp.color }}>
                              {emp.name[0]}
                            </span>
                          ))}
                          {working.length === 0 && (
                            <span className="text-red-400 text-[10px] font-bold">—</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-4 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Weekly summary cards */}
      {staff.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {staff.map(emp => {
            const s = weeklyStats[emp.id] ?? { hours: 0, shifts: 0 }
            const overage = s.hours > 40
            return (
              <div key={emp.id} className="premium-card rounded-xl p-3 border border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: emp.color }}>
                    {emp.name[0]}
                  </div>
                  <p className="text-xs font-bold truncate">{emp.name.split(' ')[0]}</p>
                </div>
                <p className={`text-xl font-black ${overage ? 'text-amber-400' : 'text-foreground'}`}>{s.hours}s</p>
                <p className="text-[10px] text-slate-500">{s.shifts} vardiya{overage && <span className="text-amber-400 ml-1">↑</span>}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Copy week confirmation */}
      {copyFrom !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCopyFrom(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">Haftayı Kopyala</h3>
            <p className="text-sm text-slate-400">
              {getWeekDates(copyFrom)[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} haftasındaki vardiyalar bu haftaya kopyalanacak. Mevcut vardiyalar silinecek.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCopyFrom(null)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
              <button onClick={() => handleCopyWeek(copyFrom)} className="px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90">Kopyala</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStaffForm(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">Personel Ekle</h3>
              <button onClick={() => setShowStaffForm(false)} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Ad Soyad *</label>
                <input value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Personel adı..."
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Unvan</label>
                <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Renk</label>
                <div className="flex gap-2">
                  {STAFF_COLORS.map(c => (
                    <button key={c} onClick={() => setStaffForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${staffForm.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowStaffForm(false)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
                <button onClick={handleAddStaff} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Plus size={15} /> Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
