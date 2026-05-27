'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Plus, Search, Edit2, Trash2, X, Save, Check,
  TrendingDown, TrendingUp, Calendar, Download, Filter,
  Home, Zap, Users, Truck, Package, Smartphone, Coffee,
  DollarSign, AlertTriangle, ChevronLeft, ChevronRight,
  BarChart3, PieChart as PieIcon
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────

type ExpenseCategory =
  | 'kira' | 'elektrik_su_gaz' | 'personel' | 'kargo_lojistik'
  | 'malzeme_stok' | 'pazarlama' | 'teknoloji' | 'yemek_temsil'
  | 'vergi_sigorta' | 'bakım_onarım' | 'diğer'

type PaymentMethod = 'nakit' | 'kredi_karti' | 'banka_transferi' | 'çek'

interface Expense {
  id: string
  date: string        // YYYY-MM-DD
  description: string
  category: ExpenseCategory
  amount: number
  paymentMethod: PaymentMethod
  vendor: string
  notes: string
  receiptRef: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSES_KEY = 'business-expenses'

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ElementType; color: string }> = {
  kira:              { label: 'Kira',             icon: Home,        color: '#6366f1' },
  elektrik_su_gaz:   { label: 'Elektrik/Su/Gaz',  icon: Zap,         color: '#f59e0b' },
  personel:          { label: 'Personel',          icon: Users,       color: '#22d3ee' },
  kargo_lojistik:    { label: 'Kargo/Lojistik',   icon: Truck,       color: '#f97316' },
  malzeme_stok:      { label: 'Malzeme/Stok',     icon: Package,     color: '#a855f7' },
  pazarlama:         { label: 'Pazarlama',         icon: Smartphone,  color: '#ec4899' },
  teknoloji:         { label: 'Teknoloji',         icon: Zap,         color: '#3b82f6' },
  yemek_temsil:      { label: 'Yemek/Temsil',     icon: Coffee,      color: '#10b981' },
  vergi_sigorta:     { label: 'Vergi/Sigorta',    icon: Receipt,     color: '#ef4444' },
  bakım_onarım:      { label: 'Bakım/Onarım',     icon: DollarSign,  color: '#84cc16' },
  diğer:             { label: 'Diğer',             icon: DollarSign,  color: '#94a3b8' },
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  nakit:           'Nakit',
  kredi_karti:     'Kredi Kartı',
  banka_transferi: 'Banka Transferi',
  çek:             'Çek',
}

const EMPTY_FORM: Omit<Expense, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  description: '',
  category: 'diğer',
  amount: 0,
  paymentMethod: 'nakit',
  vendor: '',
  notes: '',
  receiptRef: '',
}

const PIE_COLORS = Object.values(CATEGORY_CONFIG).map(c => c.color)

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function getLast6MonthKeys() {
  const keys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    keys.push(d.toISOString().slice(0, 7))
  }
  return keys
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function TrTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-border/80 rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="text-slate-400 font-bold mb-1.5">{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }} className="font-black">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GiderlerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all')
  const [viewMonth, setViewMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<Expense, 'id'>>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'charts'>('list')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPENSES_KEY)
      if (raw) setExpenses(JSON.parse(raw))
    } catch {}
  }, [])

  const saveExpenses = useCallback((list: Expense[]) => {
    setExpenses(list)
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(list))
  }, [])

  // ── Month navigation ───────────────────────────────────────────────────────

  const navigateMonth = (delta: number) => {
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setViewMonth(d.toISOString().slice(0, 7))
  }

  const viewMonthLabel = useMemo(() => {
    const [y, m] = viewMonth.split('-').map(Number)
    return `${MONTH_LABELS[m - 1]} ${y}`
  }, [viewMonth])

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const openNew = () => {
    setForm({ ...EMPTY_FORM, date: viewMonth + '-' + new Date().getDate().toString().padStart(2, '0') })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (e: Expense) => {
    setForm({ date: e.date, description: e.description, category: e.category, amount: e.amount, paymentMethod: e.paymentMethod, vendor: e.vendor, notes: e.notes, receiptRef: e.receiptRef })
    setEditId(e.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.description.trim() || form.amount <= 0) return
    if (editId) {
      saveExpenses(expenses.map(e => e.id === editId ? { ...e, ...form } : e))
    } else {
      saveExpenses([{ ...form, id: uid() }, ...expenses])
    }
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    saveExpenses(expenses.filter(e => e.id !== id))
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const monthExpenses = useMemo(
    () => expenses.filter(e => e.date.startsWith(viewMonth)),
    [expenses, viewMonth]
  )

  const prevMonthKey = useMemo(() => {
    const [y, m] = viewMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return d.toISOString().slice(0, 7)
  }, [viewMonth])

  const prevMonthTotal = useMemo(
    () => expenses.filter(e => e.date.startsWith(prevMonthKey)).reduce((s, e) => s + e.amount, 0),
    [expenses, prevMonthKey]
  )

  const monthTotal = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses])
  const momChange = prevMonthTotal > 0 ? Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 100) : null

  const filtered = useMemo(() => {
    let list = monthExpenses
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.vendor.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [monthExpenses, categoryFilter, search])

  // Category breakdown for current month
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of monthExpenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, value]) => ({
        name: CATEGORY_CONFIG[cat as ExpenseCategory]?.label ?? cat,
        value: Math.round(value),
        color: CATEGORY_CONFIG[cat as ExpenseCategory]?.color ?? '#94a3b8',
      }))
  }, [monthExpenses])

  // 6-month trend
  const monthlyTrend = useMemo(() => {
    return getLast6MonthKeys().map(monthKey => {
      const [y, m] = monthKey.split('-').map(Number)
      const total = expenses
        .filter(e => e.date.startsWith(monthKey))
        .reduce((s, e) => s + e.amount, 0)
      return { ay: `${MONTH_LABELS[m - 1]}`, Gider: Math.round(total) }
    })
  }, [expenses])

  // Top categories for stats
  const topCategory = categoryBreakdown[0]

  const handleExportCsv = () => {
    const rows = [
      ['Tarih', 'Açıklama', 'Kategori', 'Tedarikçi', 'Ödeme', 'Tutar (₺)', 'Fiş No', 'Notlar'],
      ...expenses.map(e => [
        e.date,
        e.description,
        CATEGORY_CONFIG[e.category]?.label ?? e.category,
        e.vendor,
        PAYMENT_LABELS[e.paymentMethod],
        String(e.amount),
        e.receiptRef,
        e.notes,
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `giderler-${viewMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Receipt className="w-7 h-7 text-primary" />
            Gider Takibi
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            İşletme giderlerini kategorilere göre takip edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border border-border/80 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Gider Ekle
          </button>
        </div>
      </div>

      {/* Month navigation + stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-foreground px-2 min-w-[100px] text-center">{viewMonthLabel}</span>
          <button
            onClick={() => navigateMonth(1)}
            disabled={viewMonth >= new Date().toISOString().slice(0, 7)}
            className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 disabled:opacity-40 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Month totals */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-xl bg-red-500/8 border border-red-500/15">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bu Ay Gider</p>
            <p className="text-lg font-black text-red-400 font-mono">{fmt(monthTotal)}</p>
          </div>
          {momChange !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
              momChange > 0
                ? 'bg-red-500/8 border-red-500/15 text-red-400'
                : 'bg-emerald-500/8 border-emerald-500/15 text-emerald-400'
            }`}>
              {momChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {momChange > 0 ? '+' : ''}{momChange}% geçen aya göre
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-border/60 w-fit">
        {(['list', 'charts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === t
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            {t === 'list' ? <><Filter className="w-3 h-3" /> Liste</> : <><BarChart3 className="w-3 h-3" /> Grafikler</>}
          </button>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="premium-card p-6 border border-primary/20 bg-primary/3 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">
                {editId ? 'Gideri Düzenle' : 'Yeni Gider'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-slate-400 mb-1 block font-medium">Açıklama *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Nereye harcandı?"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Tutar (₺) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount || ''}
                  onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Tarih</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Kategori</label>
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                >
                  {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Ödeme Yöntemi</label>
                <select
                  value={form.paymentMethod}
                  onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                >
                  {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Satıcı / Firma</label>
                <input
                  value={form.vendor}
                  onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                  placeholder="Ödeme yapılan yer"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Fiş / Fatura No</label>
                <input
                  value={form.receiptRef}
                  onChange={e => setForm(p => ({ ...p, receiptRef: e.target.value }))}
                  placeholder="#FIS-001"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block font-medium">Notlar</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="İsteğe bağlı açıklama"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={handleSave}
                disabled={!form.description.trim() || form.amount <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all"
              >
                <Save className="w-4 h-4" />
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-800/40 transition-all font-medium"
              >
                İptal
              </button>
              {form.amount > 0 && (
                <span className="ml-auto text-sm font-black text-red-400 font-mono">{fmt(form.amount)}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search + category filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Açıklama, satıcı ara…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as 'all' | ExpenseCategory)}
              className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
            >
              <option value="all">Tüm Kategoriler</option>
              {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="premium-card p-16 flex flex-col items-center justify-center text-center border border-border/80">
              <Receipt className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-bold">
                {search || categoryFilter !== 'all' ? 'Gider bulunamadı.' : `${viewMonthLabel} için gider yok.`}
              </p>
              {!search && categoryFilter === 'all' && (
                <button onClick={openNew} className="mt-4 text-xs text-primary font-bold hover:underline">
                  İlk gideri ekle →
                </button>
              )}
            </div>
          ) : (
            <div className="premium-card border border-border/80 bg-slate-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-slate-950/30">
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Kategori</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Satıcı</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Ödeme</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Tutar</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => {
                      const cat = CATEGORY_CONFIG[e.category]
                      const CatIcon = cat.icon
                      return (
                        <tr key={e.id} className="border-b border-border/40 hover:bg-slate-800/10 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-foreground">{e.description}</p>
                            {e.receiptRef && <p className="text-[10px] text-slate-500 font-mono">{e.receiptRef}</p>}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <CatIcon className="w-3 h-3 shrink-0" style={{ color: cat.color }} />
                              <span className="text-xs text-slate-400">{cat.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-slate-400">{e.vendor || '—'}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[10px] text-slate-500">{PAYMENT_LABELS[e.paymentMethod]}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-400">{e.date}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-black text-red-400 font-mono">{fmt(e.amount)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(e)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(e.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/60 bg-slate-950/20">
                      <td colSpan={5} className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">
                        {filtered.length} gider
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-black text-red-400 font-mono">
                          {fmt(filtered.reduce((s, e) => s + e.amount, 0))}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category pie */}
          <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4">Kategori Dağılımı — {viewMonthLabel}</h3>
            {categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-xs">Bu ay gider yok</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {categoryBreakdown.slice(0, 6).map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-400 flex-1 truncate">{item.name}</span>
                      <span className="text-xs font-black text-foreground font-mono">{fmt(item.value)}</span>
                      <span className="text-[10px] text-slate-500 w-10 text-right">
                        %{monthTotal > 0 ? Math.round((item.value / monthTotal) * 100) : 0}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 6-month trend */}
          <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4">6 Aylık Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TrTooltip />} />
                <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category quick cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, { label: string; icon: React.ElementType; color: string }][]).map(([cat, config]) => {
              const total = monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
              const CatIcon = config.icon
              return (
                <button
                  key={cat}
                  onClick={() => { setCategoryFilter(cat); setActiveTab('list') }}
                  className={`premium-card p-3 border transition-all text-left hover:border-primary/30 ${total > 0 ? 'border-border/80 bg-slate-900/40' : 'border-border/40 bg-slate-900/20 opacity-60'}`}
                >
                  <CatIcon className="w-4 h-4 mb-1.5" style={{ color: config.color }} />
                  <p className="text-[10px] text-slate-400 font-medium truncate">{config.label}</p>
                  <p className="text-sm font-black text-foreground font-mono">{total > 0 ? fmt(total) : '—'}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
