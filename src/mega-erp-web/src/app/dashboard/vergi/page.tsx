'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Calendar, CheckCircle2, XCircle, Clock, AlertTriangle,
  Plus, X, Edit2, Trash2, Bell, ExternalLink,
  ChevronDown, DollarSign, FileText, Building2,
  TrendingUp, AlertCircle, Check, ChevronRight
} from 'lucide-react'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaxStatus = 'bekliyor' | 'tamamlandı' | 'gecikti' | 'iptal'
type TaxCategory = 'kdv' | 'muhtasar' | 'sgk' | 'gecici_vergi' | 'kurumlar' | 'gelir' | 'damga' | 'diger'
type Recurrence = 'aylık' | 'üç_aylık' | 'yıllık' | 'tek_seferlik'

interface TaxEntry {
  id: string
  title: string
  description: string
  category: TaxCategory
  dueDate: string        // YYYY-MM-DD
  period: string         // "Mayıs 2026" etc.
  estimatedAmount: number
  paidAmount: number
  status: TaxStatus
  recurrence: Recurrence
  reference: string      // accrual/beyanname no
  reminderDaysBefore: number
  notes: string
  paidAt: string
  createdAt: string
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'vergi-takvimi'

const CATEGORY_MAP: Record<TaxCategory, { label: string; color: string; bg: string; icon: React.ElementType; detail: string }> = {
  kdv:           { label: 'KDV Beyannamesi',       color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',      icon: FileText,  detail: 'Her ayın 24\'üne kadar' },
  muhtasar:      { label: 'Muhtasar Beyanname',    color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/30',  icon: DollarSign, detail: 'Her ayın 26\'sına kadar' },
  sgk:           { label: 'SGK Primi',             color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: Building2, detail: 'Her ayın sonuna kadar' },
  gecici_vergi:  { label: 'Geçici Vergi',          color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',    icon: TrendingUp, detail: 'Her çeyrekte' },
  kurumlar:      { label: 'Kurumlar Vergisi',      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',        icon: Building2, detail: 'Nisan ayı sonuna kadar' },
  gelir:         { label: 'Gelir Vergisi',         color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',  icon: TrendingUp, detail: 'Mart ayı sonuna kadar' },
  damga:         { label: 'Damga Vergisi',         color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/30',    icon: FileText,  detail: 'Her ayın 26\'sına kadar' },
  diger:         { label: 'Diğer',                 color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/30',      icon: Calendar,  detail: '' },
}

const STATUS_MAP: Record<TaxStatus, { label: string; color: string; icon: React.ElementType }> = {
  bekliyor:    { label: 'Bekliyor',    color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',      icon: Clock },
  tamamlandı:  { label: 'Tamamlandı', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  gecikti:     { label: 'Gecikti',    color: 'text-red-400 bg-red-500/15 border-red-500/30',          icon: AlertTriangle },
  iptal:       { label: 'İptal',      color: 'text-slate-400 bg-slate-500/15 border-slate-500/30',    icon: XCircle },
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()
const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

function urgencyColor(days: number, status: TaxStatus): string {
  if (status === 'tamamlandı' || status === 'iptal') return 'text-slate-500'
  if (days < 0) return 'text-red-400'
  if (days <= 3) return 'text-red-400'
  if (days <= 7) return 'text-amber-400'
  return 'text-slate-400'
}

// ─── Build recurring Turkey tax calendar ─────────────────────────────────────

function buildTurkishTaxCalendar(): TaxEntry[] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() // 0-indexed
  const entries: TaxEntry[] = []

  // Helper to add months
  const addMonths = (base: Date, n: number): Date => {
    const d = new Date(base)
    d.setMonth(d.getMonth() + n)
    return d
  }

  const monthName = (d: Date) => d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  // KDV beyanname — 24th of next month, for current and next 2 months
  for (let i = -1; i <= 2; i++) {
    const periodDate = addMonths(new Date(year, month, 1), i)
    const dueDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 24)
    const past = dueDate < today
    entries.push({
      id: uid(), title: `KDV Beyannamesi — ${monthName(periodDate)}`,
      description: `${monthName(periodDate)} dönemi KDV beyannamesi ve ödemesi`,
      category: 'kdv', dueDate: dueDate.toISOString().slice(0, 10),
      period: monthName(periodDate),
      estimatedAmount: 18500 + Math.random() * 5000,
      paidAmount: past ? 18500 : 0,
      status: past ? 'tamamlandı' : 'bekliyor',
      recurrence: 'aylık', reference: '', reminderDaysBefore: 5,
      notes: '', paidAt: past ? dueDate.toISOString() : '', createdAt: now(), updatedAt: now(),
    })
  }

  // Muhtasar — 26th of next month
  for (let i = -1; i <= 2; i++) {
    const periodDate = addMonths(new Date(year, month, 1), i)
    const dueDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 26)
    const past = dueDate < today
    entries.push({
      id: uid(), title: `Muhtasar Beyanname — ${monthName(periodDate)}`,
      description: `Stopaj gelir vergisi (ücret) beyanı`,
      category: 'muhtasar', dueDate: dueDate.toISOString().slice(0, 10),
      period: monthName(periodDate),
      estimatedAmount: 8200 + Math.random() * 2000,
      paidAmount: past ? 8200 : 0,
      status: past ? 'tamamlandı' : 'bekliyor',
      recurrence: 'aylık', reference: '', reminderDaysBefore: 5,
      notes: '', paidAt: past ? dueDate.toISOString() : '', createdAt: now(), updatedAt: now(),
    })
  }

  // SGK — end of month
  for (let i = -1; i <= 2; i++) {
    const periodDate = addMonths(new Date(year, month, 1), i)
    const dueDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0) // last day
    const past = dueDate < today
    entries.push({
      id: uid(), title: `SGK Primi — ${monthName(periodDate)}`,
      description: `İşveren + işçi SGK ve işsizlik sigortası primleri`,
      category: 'sgk', dueDate: dueDate.toISOString().slice(0, 10),
      period: monthName(periodDate),
      estimatedAmount: 45000,
      paidAmount: past ? 45000 : 0,
      status: past ? 'tamamlandı' : 'bekliyor',
      recurrence: 'aylık', reference: '', reminderDaysBefore: 7,
      notes: '', paidAt: past ? dueDate.toISOString() : '', createdAt: now(), updatedAt: now(),
    })
  }

  // Geçici Vergi — quarterly (Q2: Aug 17, Q3: Nov 17, Q4: Feb 17)
  const geçiciDates = [
    { period: 'Q2 2026', due: `${year}-08-17` },
    { period: 'Q3 2026', due: `${year}-11-17` },
    { period: 'Q4 2026', due: `${year + 1}-02-17` },
  ]
  for (const gv of geçiciDates) {
    const past = new Date(gv.due) < today
    entries.push({
      id: uid(), title: `Geçici Vergi — ${gv.period}`,
      description: `Kurumlar/gelir vergisi üzerinden %25 geçici vergi`,
      category: 'gecici_vergi', dueDate: gv.due,
      period: gv.period,
      estimatedAmount: 28000,
      paidAmount: past ? 28000 : 0,
      status: past ? 'tamamlandı' : 'bekliyor',
      recurrence: 'üç_aylık', reference: '', reminderDaysBefore: 14,
      notes: '', paidAt: past ? gv.due + 'T00:00:00.000Z' : '', createdAt: now(), updatedAt: now(),
    })
  }

  // Kurumlar Vergisi — April 30
  entries.push({
    id: uid(), title: `Kurumlar Vergisi — ${year}`,
    description: `${year} yılı kurumlar vergisi beyanı ve ödemesi`,
    category: 'kurumlar', dueDate: `${year}-04-30`,
    period: String(year),
    estimatedAmount: 85000,
    paidAmount: new Date(`${year}-04-30`) < today ? 85000 : 0,
    status: new Date(`${year}-04-30`) < today ? 'tamamlandı' : 'bekliyor',
    recurrence: 'yıllık', reference: '', reminderDaysBefore: 30,
    notes: '', paidAt: new Date(`${year}-04-30`) < today ? `${year}-04-30T00:00:00.000Z` : '', createdAt: now(), updatedAt: now(),
  })

  // Sort by due date
  return entries.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VergiPage() {
  const toast = useToast()
  const [entries, setEntries] = useState<TaxEntry[]>([])
  const [filterCat, setFilterCat] = useState<TaxCategory | 'tümü'>('tümü')
  const [filterStatus, setFilterStatus] = useState<TaxStatus | 'tümü'>('tümü')
  const [selected, setSelected] = useState<TaxEntry | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TaxEntry | null>(null)
  const [paidInput, setPaidInput] = useState('')

  const emptyForm = (): Omit<TaxEntry, 'id' | 'createdAt' | 'updatedAt'> => ({
    title: '', description: '', category: 'kdv',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    period: '', estimatedAmount: 0, paidAmount: 0,
    status: 'bekliyor', recurrence: 'aylık', reference: '',
    reminderDaysBefore: 7, notes: '', paidAt: '',
  })
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        setEntries(JSON.parse(raw))
      } else {
        const demos = buildTurkishTaxCalendar()
        setEntries(demos)
        localStorage.setItem(LS_KEY, JSON.stringify(demos))
      }
    } catch {
      setEntries(buildTurkishTaxCalendar())
    }
  }, [])

  const save = useCallback((updated: TaxEntry[]) => {
    setEntries(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  // Auto-overdue check on load
  useEffect(() => {
    if (entries.length === 0) return
    const updated = entries.map(e =>
      e.status === 'bekliyor' && daysUntil(e.dueDate) < 0
        ? { ...e, status: 'gecikti' as TaxStatus, updatedAt: now() }
        : e
    )
    const changed = updated.some((e, i) => e.status !== entries[i].status)
    if (changed) save(updated)
  }, [entries.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stats
  const stats = useMemo(() => {
    const pending = entries.filter(e => e.status === 'bekliyor')
    const overdue = entries.filter(e => e.status === 'gecikti')
    const next7 = pending.filter(e => daysUntil(e.dueDate) <= 7)
    const totalPending = pending.reduce((s, e) => s + e.estimatedAmount, 0)
    const totalPaid = entries.filter(e => e.status === 'tamamlandı').reduce((s, e) => s + e.paidAmount, 0)
    return { pending: pending.length, overdue: overdue.length, next7: next7.length, totalPending, totalPaid }
  }, [entries])

  const filtered = useMemo(() => {
    let list = entries
    if (filterCat !== 'tümü') list = list.filter(e => e.category === filterCat)
    if (filterStatus !== 'tümü') list = list.filter(e => e.status === filterStatus)
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [entries, filterCat, filterStatus])

  const handleMarkPaid = (entry: TaxEntry) => {
    const amount = parseFloat(paidInput) || entry.estimatedAmount
    const updated = entries.map(e => e.id === entry.id ? {
      ...e, status: 'tamamlandı' as TaxStatus, paidAmount: amount, paidAt: now(), updatedAt: now(),
    } : e)
    save(updated)
    setSelected(updated.find(e => e.id === entry.id) || null)
    setPaidInput('')
    toast.success(`₺${fmt(amount)} ödeme olarak işaretlendi`)
  }

  const handleDelete = (id: string) => {
    save(entries.filter(e => e.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Vergi kaydı silindi')
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.dueDate) { toast.error('Başlık ve vade tarihi zorunludur'); return }
    if (editingEntry) {
      save(entries.map(e => e.id === editingEntry.id ? { ...e, ...form, updatedAt: now() } : e))
      toast.success('Güncellendi')
    } else {
      save([...entries, { id: uid(), ...form, createdAt: now(), updatedAt: now() }])
      toast.success('Vergi takvime eklendi')
    }
    setShowForm(false); setEditingEntry(null); setForm(emptyForm())
  }

  // Group by month for timeline view
  const grouped = useMemo(() => {
    const groups: Record<string, TaxEntry[]> = {}
    for (const e of filtered) {
      const month = e.dueDate.slice(0, 7)
      if (!groups[month]) groups[month] = []
      groups[month].push(e)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Vergi Takvimi</h1>
          <p className="text-slate-400 text-sm font-semibold">Yasal vergi ve prim beyanname tarihlerini takip edin</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://www.gib.gov.tr" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground text-sm transition-colors">
            <ExternalLink size={14} /> GİB Portal
          </a>
          <button onClick={() => { setEditingEntry(null); setForm(emptyForm()); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus size={16} /> Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Bekleyen',       value: stats.pending,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Gecikmiş',       value: stats.overdue,    color: stats.overdue > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          { label: '7 Gün İçinde',   value: stats.next7,      color: stats.next7 > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          { label: 'Bekleyen Tutar', value: `₺${(stats.totalPending/1000).toFixed(0)}K`, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          { label: 'Ödenen (YTD)',   value: `₺${(stats.totalPaid/1000).toFixed(0)}K`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={`premium-card rounded-2xl border p-4 ${s.color}`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          <AlertTriangle size={16} />
          {stats.overdue} vergi/prim vadesi geçti! Gecikme zammı uygulanmadan önce ödeme yapın.
        </div>
      )}
      {stats.next7 > 0 && stats.overdue === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold">
          <Bell size={16} />
          {stats.next7} vergi/prim son 7 gün içinde vadeleşiyor.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('tümü')} className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${filterStatus === 'tümü' ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/40 text-slate-400 hover:border-primary/30'}`}>
          Tümü
        </button>
        {(Object.entries(STATUS_MAP) as [TaxStatus, typeof STATUS_MAP[TaxStatus]][]).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(prev => prev === k ? 'tümü' : k)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${filterStatus === k ? `${v.color} border-current/40` : 'border-border/40 text-slate-400 hover:border-primary/30'}`}>
            {v.label}
          </button>
        ))}
        <div className="flex gap-2 ml-auto flex-wrap">
          {(Object.entries(CATEGORY_MAP) as [TaxCategory, typeof CATEGORY_MAP[TaxCategory]][]).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCat(prev => prev === k ? 'tümü' : k)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${filterCat === k ? `${v.color} ${v.bg}` : 'border-border/40 text-slate-500 hover:border-primary/30'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline grouped by month */}
      <div className="space-y-6">
        {grouped.map(([month, monthEntries]) => {
          const monthDate = new Date(month + '-01')
          const monthLabel = monthDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
          const totalAmt = monthEntries.filter(e => e.status !== 'iptal').reduce((s, e) => s + e.estimatedAmount, 0)
          const allDone = monthEntries.every(e => e.status === 'tamamlandı' || e.status === 'iptal')
          return (
            <div key={month}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${allDone ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-300 bg-slate-800/40 border-slate-700/40'}`}>
                  <Calendar size={12} />
                  {monthLabel}
                  {allDone && <CheckCircle2 size={12} />}
                </div>
                <span className="text-xs text-slate-500 font-semibold">₺{fmt(totalAmt)} tahmini</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              <div className="space-y-2.5">
                {monthEntries.map(entry => {
                  const cat = CATEGORY_MAP[entry.category]
                  const st = STATUS_MAP[entry.status]
                  const CatIcon = cat.icon
                  const StIcon = st.icon
                  const days = daysUntil(entry.dueDate)
                  const isSelected = selected?.id === entry.id
                  return (
                    <div key={entry.id}>
                      <button
                        onClick={() => setSelected(isSelected ? null : entry)}
                        className={`w-full premium-card rounded-xl border p-4 text-left transition-all hover:shadow-md group ${isSelected ? 'border-primary/40 shadow-md shadow-primary/5' : entry.status === 'gecikti' ? 'border-red-500/30' : 'border-border/40 hover:border-border/60'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cat.bg}`}>
                            <CatIcon size={16} className={cat.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{entry.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <p className="text-sm font-black text-primary">₺{fmt(entry.estimatedAmount)}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}>
                              <StIcon size={9} /> {st.label}
                            </span>
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p className="text-xs font-mono text-slate-400">{entry.dueDate}</p>
                            <p className={`text-[11px] font-bold ${urgencyColor(days, entry.status)}`}>
                              {entry.status === 'tamamlandı' ? '✓ Ödendi' : days < 0 ? `${Math.abs(days)}g gecikmiş` : `${days}g kaldı`}
                            </p>
                          </div>
                          <ChevronRight size={14} className={`text-slate-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isSelected && (
                        <div className="mt-1 ml-4 premium-card rounded-xl border border-primary/20 p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-500">Tahmini Tutar</p>
                              <p className="font-bold">₺{fmt(entry.estimatedAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Ödenen</p>
                              <p className="font-bold text-emerald-400">₺{fmt(entry.paidAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Referans</p>
                              <p className="font-semibold text-xs">{entry.reference || '—'}</p>
                            </div>
                          </div>

                          {entry.notes && (
                            <p className="text-xs text-slate-400 italic">{entry.notes}</p>
                          )}

                          {entry.paidAt && (
                            <p className="text-xs text-emerald-400">
                              <CheckCircle2 size={11} className="inline mr-1" />
                              {new Date(entry.paidAt).toLocaleDateString('tr-TR')} tarihinde ödendi
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {entry.status !== 'tamamlandı' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" value={paidInput} onChange={e => setPaidInput(e.target.value)}
                                  placeholder={`₺${fmt(entry.estimatedAmount)}`}
                                  className="w-36 px-2.5 py-1.5 bg-slate-900/60 border border-border/40 rounded-lg text-xs font-mono focus:outline-none focus:border-primary/50"
                                />
                                <button onClick={() => handleMarkPaid(entry)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 rounded-lg text-white text-xs font-bold hover:bg-emerald-500 transition-colors">
                                  <Check size={12} /> Ödendi İşaretle
                                </button>
                              </div>
                            )}
                            <button onClick={() => { setEditingEntry(entry); setForm({ title: entry.title, description: entry.description, category: entry.category, dueDate: entry.dueDate, period: entry.period, estimatedAmount: entry.estimatedAmount, paidAmount: entry.paidAmount, status: entry.status, recurrence: entry.recurrence, reference: entry.reference, reminderDaysBefore: entry.reminderDaysBefore, notes: entry.notes, paidAt: entry.paidAt }); setShowForm(true); setSelected(null) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-slate-400 hover:text-primary text-xs font-semibold transition-colors">
                              <Edit2 size={12} /> Düzenle
                            </button>
                            <button onClick={() => handleDelete(entry.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors">
                              <Trash2 size={12} /> Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {grouped.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-700" />
            <p className="font-semibold">Vergi kaydı bulunamadı</p>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingEntry(null) }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editingEntry ? 'Düzenle' : 'Vergi Takvime Ekle'}</h3>
              <button onClick={() => { setShowForm(false); setEditingEntry(null) }} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Başlık *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ör. KDV Beyannamesi — Haziran 2026"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TaxCategory }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(Object.entries(CATEGORY_MAP) as [TaxCategory, typeof CATEGORY_MAP[TaxCategory]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Vade Tarihi *</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tahmini Tutar (₺)</label>
                  <input type="number" min={0} value={form.estimatedAmount || ''} onChange={e => setForm(f => ({ ...f, estimatedAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tekrarlanma</label>
                  <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as Recurrence }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    <option value="aylık">Aylık</option>
                    <option value="üç_aylık">Üç Aylık</option>
                    <option value="yıllık">Yıllık</option>
                    <option value="tek_seferlik">Tek Seferlik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Hatırlatma (gün önce)</label>
                  <input type="number" min={1} max={60} value={form.reminderDaysBefore} onChange={e => setForm(f => ({ ...f, reminderDaysBefore: parseInt(e.target.value) || 7 }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Durum</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaxStatus }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(Object.entries(STATUS_MAP) as [TaxStatus, typeof STATUS_MAP[TaxStatus]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Notlar</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingEntry(null) }} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Calendar size={15} /> {editingEntry ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
