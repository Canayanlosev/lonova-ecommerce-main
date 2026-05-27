'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, Plus, Search, X, Save, Check, Trash2, Edit2,
  Package, AlertTriangle, CheckCircle2, Clock, DollarSign,
  FileText, ChevronRight, Filter, Download, User, MessageSquare,
  ArrowRight, Loader2
} from 'lucide-react'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type ReturnStatus = 'beklemede' | 'inceleniyor' | 'onaylandı' | 'reddedildi' | 'iade_tamamlandı'
type ReturnReason = 'hatalı_ürün' | 'yanlış_ürün' | 'hasar_var' | 'beğenmedim' | 'geç_teslimat' | 'diğer'
type RefundMethod = 'iade_ödeme' | 'değişim' | 'kredi'

interface ReturnRequest {
  id: string
  orderRef: string          // e.g. order number or order ID
  customerName: string
  customerEmail: string
  productName: string
  quantity: number
  unitPrice: number
  reason: ReturnReason
  status: ReturnStatus
  refundMethod: RefundMethod
  notes: string
  internalNotes: string
  createdAt: string
  updatedAt: string
  images: string[]           // URLs (for tracking - entered manually)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RETURNS_KEY = 'iade-requests'

const STATUS_CONFIG: Record<ReturnStatus, { label: string; cls: string; icon: React.ElementType }> = {
  beklemede:        { label: 'Beklemede',       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: Clock },
  inceleniyor:      { label: 'İnceleniyor',      cls: 'bg-primary/10 text-primary border-primary/20',         icon: FileText },
  onaylandı:        { label: 'Onaylandı',        cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  reddedildi:       { label: 'Reddedildi',       cls: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: X },
  iade_tamamlandı:  { label: 'İade Tamamlandı',  cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: RotateCcw },
}

const REASON_LABELS: Record<ReturnReason, string> = {
  hatalı_ürün:   'Hatalı/Bozuk Ürün',
  yanlış_ürün:   'Yanlış Ürün Geldi',
  hasar_var:     'Hasarlı Geldi',
  beğenmedim:    'Beğenmedim / Fikir Değişti',
  geç_teslimat:  'Geç Teslimat',
  diğer:         'Diğer',
}

const REFUND_LABELS: Record<RefundMethod, string> = {
  iade_ödeme: 'Para İadesi',
  değişim:    'Ürün Değişimi',
  kredi:      'Mağaza Kredisi',
}

const EMPTY_FORM: Omit<ReturnRequest, 'id' | 'createdAt' | 'updatedAt'> = {
  orderRef: '', customerName: '', customerEmail: '',
  productName: '', quantity: 1, unitPrice: 0,
  reason: 'hatalı_ürün', status: 'beklemede',
  refundMethod: 'iade_ödeme', notes: '', internalNotes: '', images: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'Az önce'
  if (mins < 60) return `${mins}dk önce`
  if (hrs < 24) return `${hrs}sa önce`
  return `${days}g önce`
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function IadelerPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<ReturnRequest, 'id' | 'createdAt' | 'updatedAt'>>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [detailRet, setDetailRet] = useState<ReturnRequest | null>(null)
  const [noteInput, setNoteInput] = useState('')

  // Load marketplace orders for quick-fill
  const [mktOrders, setMktOrders] = useState<Array<{ id: string; orderNo?: string; recipientName: string; totalAmount: number }>>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RETURNS_KEY)
      if (raw) setReturns(JSON.parse(raw))
    } catch {}

    // Load recent orders for quick reference
    api.get('/api/marketplace/admin/orders?pageSize=50&page=1')
      .then(r => {
        const items = r.data.Items ?? r.data.items ?? []
        setMktOrders(items)
      })
      .catch(() => {})
  }, [])

  const saveReturns = useCallback((list: ReturnRequest[]) => {
    setReturns(list)
    localStorage.setItem(RETURNS_KEY, JSON.stringify(list))
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (r: ReturnRequest) => {
    setForm({
      orderRef: r.orderRef, customerName: r.customerName, customerEmail: r.customerEmail,
      productName: r.productName, quantity: r.quantity, unitPrice: r.unitPrice,
      reason: r.reason, status: r.status, refundMethod: r.refundMethod,
      notes: r.notes, internalNotes: r.internalNotes, images: r.images,
    })
    setEditId(r.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.customerName.trim() || !form.productName.trim()) return
    const now = new Date().toISOString()
    if (editId) {
      const updated = returns.map(r => r.id === editId ? { ...r, ...form, updatedAt: now } : r)
      saveReturns(updated)
      if (detailRet?.id === editId) setDetailRet(prev => prev ? { ...prev, ...form, updatedAt: now } : null)
    } else {
      const newR: ReturnRequest = { ...form, id: uid(), createdAt: now, updatedAt: now }
      saveReturns([newR, ...returns])
    }
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Bu iade talebi silinecek. Emin misiniz?')) return
    saveReturns(returns.filter(r => r.id !== id))
    if (detailRet?.id === id) setDetailRet(null)
  }

  const handleStatusChange = (id: string, status: ReturnStatus) => {
    const now = new Date().toISOString()
    const updated = returns.map(r => r.id === id ? { ...r, status, updatedAt: now } : r)
    saveReturns(updated)
    if (detailRet?.id === id) setDetailRet(prev => prev ? { ...prev, status, updatedAt: now } : null)
  }

  const handleSaveInternalNote = (id: string) => {
    if (!noteInput.trim()) return
    const now = new Date().toISOString()
    const updated = returns.map(r => {
      if (r.id !== id) return r
      const existingNote = r.internalNotes ? r.internalNotes + '\n' : ''
      return { ...r, internalNotes: existingNote + `[${new Date().toLocaleString('tr-TR')}] ${noteInput.trim()}`, updatedAt: now }
    })
    saveReturns(updated)
    if (detailRet?.id === id) {
      const upd = updated.find(r => r.id === id)
      if (upd) setDetailRet(upd)
    }
    setNoteInput('')
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = returns
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.customerName.toLowerCase().includes(q) ||
        r.orderRef.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q)
      )
    }
    return list
  }, [returns, statusFilter, search])

  const stats = useMemo(() => {
    const total = returns.length
    const pending = returns.filter(r => r.status === 'beklemede').length
    const approved = returns.filter(r => r.status === 'onaylandı' || r.status === 'iade_tamamlandı').length
    const refundTotal = returns
      .filter(r => r.status === 'onaylandı' || r.status === 'iade_tamamlandı')
      .reduce((s, r) => s + r.quantity * r.unitPrice, 0)
    const rejected = returns.filter(r => r.status === 'reddedildi').length
    return { total, pending, approved, refundTotal, rejected }
  }, [returns])

  const handleExportCsv = () => {
    const rows = [
      ['Tarih', 'Müşteri', 'Sipariş Ref', 'Ürün', 'Adet', 'Tutar', 'Neden', 'Durum', 'İade Yöntemi'],
      ...returns.map(r => [
        new Date(r.createdAt).toLocaleDateString('tr-TR'),
        r.customerName,
        r.orderRef,
        r.productName,
        String(r.quantity),
        String(r.quantity * r.unitPrice),
        REASON_LABELS[r.reason],
        STATUS_CONFIG[r.status].label,
        REFUND_LABELS[r.refundMethod],
      ])
    ]
    const csv = rows.map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iadeler-${new Date().toISOString().slice(0, 10)}.csv`
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
            <RotateCcw className="w-7 h-7 text-primary" />
            İade Yönetimi
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Müşteri iade taleplerini takip edin ve yönetin
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
            <Plus className="w-4 h-4" /> Yeni İade Talebi
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Toplam Talep',    value: String(stats.total),     cls: 'text-foreground',  onClick: () => setStatusFilter('all') },
          { label: 'Beklemede',       value: String(stats.pending),   cls: 'text-amber-400',   onClick: () => setStatusFilter('beklemede') },
          { label: 'Onaylanan',       value: String(stats.approved),  cls: 'text-emerald-400', onClick: () => setStatusFilter('onaylandı') },
          { label: 'Reddedilen',      value: String(stats.rejected),  cls: 'text-red-400',     onClick: () => setStatusFilter('reddedildi') },
          { label: 'İade Edilecek',   value: fmt(stats.refundTotal),  cls: 'text-violet-400',  onClick: () => {} },
        ].map(({ label, value, cls, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="premium-card p-3.5 flex items-start flex-col gap-0.5 border border-border/80 bg-slate-900/40 hover:border-primary/30 transition-all text-left"
          >
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-base font-black ${cls}`}>{value}</p>
          </button>
        ))}
      </div>

      {/* Alert for pending */}
      {stats.pending > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 font-bold">
            {stats.pending} iade talebi yanıt bekliyor. Müşteri memnuniyeti için hızlı yanıt verin.
          </p>
          <button
            onClick={() => setStatusFilter('beklemede')}
            className="ml-auto text-[10px] text-amber-400 font-black hover:underline"
          >
            Görüntüle
          </button>
        </div>
      )}

      {/* Search + status filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Müşteri adı, sipariş no veya ürün ara…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${statusFilter === 'all' ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/60 text-slate-500 hover:text-foreground'}`}
          >
            Tümü
          </button>
          {(Object.keys(STATUS_CONFIG) as ReturnStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${statusFilter === s ? STATUS_CONFIG[s].cls : 'border-border/60 text-slate-500 hover:text-foreground'}`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* New/Edit form */}
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
                {editId ? 'İade Talebini Düzenle' : 'Yeni İade Talebi'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Sipariş Referansı *</label>
                <input
                  value={form.orderRef}
                  onChange={e => setForm(p => ({ ...p, orderRef: e.target.value }))}
                  placeholder="#SIP-001 veya UUID"
                  list="order-suggestions"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
                <datalist id="order-suggestions">
                  {mktOrders.slice(0, 20).map(o => (
                    <option key={o.id} value={o.id}>{o.recipientName} — {fmt(o.totalAmount)}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Müşteri Adı *</label>
                <input
                  value={form.customerName}
                  onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                  placeholder="Ad Soyad"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">E-posta</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))}
                  placeholder="musteri@ornek.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ürün Adı *</label>
                <input
                  value={form.productName}
                  onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                  placeholder="İade edilen ürün"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Adet</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Birim Fiyat</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.unitPrice}
                    onChange={e => setForm(p => ({ ...p, unitPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">İade Nedeni</label>
                <select
                  value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value as ReturnReason }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                >
                  {(Object.entries(REASON_LABELS) as [ReturnReason, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">İade Yöntemi</label>
                <select
                  value={form.refundMethod}
                  onChange={e => setForm(p => ({ ...p, refundMethod: e.target.value as RefundMethod }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                >
                  {(Object.entries(REFUND_LABELS) as [RefundMethod, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Durum</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as ReturnStatus }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                >
                  {(Object.entries(STATUS_CONFIG) as [ReturnStatus, { label: string; cls: string; icon: React.ElementType }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Müşteri Notu</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Müşterinin ilettiği açıklama"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={handleSave}
                disabled={!form.customerName.trim() || !form.productName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all"
              >
                <Save className="w-4 h-4" />
                {editId ? 'Güncelle' : 'Talep Oluştur'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-800/40 transition-all font-medium"
              >
                İptal
              </button>
              {!editId && form.quantity > 0 && form.unitPrice > 0 && (
                <span className="ml-auto text-sm font-black text-foreground font-mono">
                  Toplam: {fmt(form.quantity * form.unitPrice)}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Returns list */}
      {filtered.length === 0 ? (
        <div className="premium-card p-16 flex flex-col items-center justify-center text-center border border-border/80">
          <RotateCcw className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-bold">
            {search || statusFilter !== 'all' ? 'İade talebi bulunamadı.' : 'Henüz iade talebi yok. 🎉'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={openNew} className="mt-4 text-xs text-primary font-bold hover:underline">
              İlk iade talebini oluştur →
            </button>
          )}
        </div>
      ) : (
        <div className="premium-card border border-border/80 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-slate-950/30">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Ürün</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Neden</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Tutar</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Tarih</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const sc = STATUS_CONFIG[r.status]
                  return (
                    <tr
                      key={r.id}
                      onClick={() => { setDetailRet(r); setNoteInput('') }}
                      className={`border-b border-border/40 hover:bg-slate-800/10 cursor-pointer transition-colors ${r.status === 'beklemede' ? 'border-l-2 border-l-amber-500/60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-foreground">{r.customerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{r.orderRef || '—'}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs text-foreground font-medium truncate max-w-[140px]">{r.productName}</p>
                        <p className="text-[10px] text-slate-500">x{r.quantity}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-[10px] text-slate-400">{REASON_LABELS[r.reason]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-black text-foreground font-mono">
                          {fmt(r.quantity * r.unitPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-[10px] text-slate-500">{relativeTime(r.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
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
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Panel ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailRet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailRet(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-slate-950 border-l border-border/80 overflow-y-auto"
            >
              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">İade Talebi</p>
                    <h3 className="text-lg font-black text-foreground">{detailRet.customerName}</h3>
                    <p className="text-xs text-slate-500 font-mono">{detailRet.orderRef || 'Sipariş ref yok'}</p>
                  </div>
                  <button
                    onClick={() => setDetailRet(null)}
                    className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status + refund method badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border ${STATUS_CONFIG[detailRet.status].cls}`}>
                    {STATUS_CONFIG[detailRet.status].label}
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-black bg-slate-800/60 border border-border/40 text-slate-400">
                    {REFUND_LABELS[detailRet.refundMethod]}
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-black bg-slate-800/60 border border-border/40 text-slate-400">
                    {REASON_LABELS[detailRet.reason]}
                  </span>
                </div>

                {/* Details */}
                <div className="premium-card p-4 space-y-2.5 border border-border/80 bg-slate-900/40">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Ürün</span>
                    <span className="font-bold text-foreground">{detailRet.productName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Adet × Fiyat</span>
                    <span className="font-bold text-foreground font-mono">{detailRet.quantity} × {fmt(detailRet.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-border/40 pt-2">
                    <span className="text-slate-500 font-black">İade Tutarı</span>
                    <span className="font-black text-foreground font-mono text-base">{fmt(detailRet.quantity * detailRet.unitPrice)}</span>
                  </div>
                  {detailRet.customerEmail && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">E-posta</span>
                      <span className="font-medium text-primary">{detailRet.customerEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tarih</span>
                    <span className="text-foreground">{relativeTime(detailRet.createdAt)}</span>
                  </div>
                </div>

                {/* Customer note */}
                {detailRet.notes && (
                  <div className="p-3.5 rounded-xl bg-slate-800/30 border border-border/40">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Müşteri Notu</p>
                    <p className="text-xs text-foreground">{detailRet.notes}</p>
                  </div>
                )}

                {/* Status change */}
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Durum Güncelle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(STATUS_CONFIG) as ReturnStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(detailRet.id, s)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                          detailRet.status === s
                            ? STATUS_CONFIG[s].cls
                            : 'border-border/60 text-slate-500 hover:text-foreground hover:border-border'
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Internal notes */}
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Dahili Notlar</p>
                  {detailRet.internalNotes && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-border/40 mb-2 max-h-32 overflow-y-auto">
                      <p className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap">{detailRet.internalNotes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveInternalNote(detailRet.id)}
                      placeholder="Dahili not ekle (Enter)…"
                      className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    />
                    <button
                      onClick={() => handleSaveInternalNote(detailRet.id)}
                      disabled={!noteInput.trim()}
                      className="px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(detailRet)}
                    className="py-2.5 rounded-xl text-xs font-bold border border-border/60 text-foreground hover:bg-slate-800/40 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(detailRet.id)}
                    className="py-2.5 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
