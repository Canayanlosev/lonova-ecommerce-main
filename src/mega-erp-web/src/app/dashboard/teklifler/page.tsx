'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Search, Edit2, Trash2, X, Save, Check,
  Send, Copy, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, DollarSign, User, Mail, Phone, Calendar, Download,
  Package, Loader2, ArrowRight, RefreshCw, Printer
} from 'lucide-react'
import { productsService } from '@/lib/services/products.service'
import type { Product } from '@/types/api.types'

// ── Types ─────────────────────────────────────────────────────────────────────

type QuoteStatus = 'taslak' | 'gönderildi' | 'görüldü' | 'onaylandı' | 'reddedildi' | 'süresi_doldu'

interface QuoteItem {
  id: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  discountPercent: number
}

interface Quote {
  id: string
  quoteNo: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany: string
  validUntil: string
  status: QuoteStatus
  items: QuoteItem[]
  notes: string
  terms: string
  taxRate: number          // % applied to all items
  createdAt: string
  updatedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUOTES_KEY = 'crm-teklifler'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; cls: string }> = {
  taslak:       { label: 'Taslak',        cls: 'bg-slate-700/40 text-slate-400 border-slate-600/30' },
  gönderildi:   { label: 'Gönderildi',    cls: 'bg-primary/10 text-primary border-primary/20' },
  görüldü:      { label: 'Görüldü',       cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  onaylandı:    { label: 'Onaylandı',     cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  reddedildi:   { label: 'Reddedildi',    cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  süresi_doldu: { label: 'Süresi Doldu',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
}

const EMPTY_ITEM: Omit<QuoteItem, 'id'> = {
  description: '', productId: undefined, quantity: 1, unitPrice: 0, discountPercent: 0,
}

const EMPTY_FORM: Omit<Quote, 'id' | 'quoteNo' | 'createdAt' | 'updatedAt'> = {
  customerName: '', customerEmail: '', customerPhone: '', customerCompany: '',
  validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  status: 'taslak',
  items: [],
  notes: '',
  terms: 'Fiyatlar KDV hariçtir. Teklif geçerlilik süresi belirtilen tarihe kadardır.',
  taxRate: 20,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function nextQuoteNo(quotes: Quote[]): string {
  const year = new Date().getFullYear()
  const count = quotes.filter(q => q.quoteNo.startsWith(`TKF-${year}`)).length + 1
  return `TKF-${year}-${String(count).padStart(4, '0')}`
}

function calcTotals(items: QuoteItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => {
    const line = i.quantity * i.unitPrice
    const discount = line * (i.discountPercent / 100)
    return s + line - discount
  }, 0)
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}

function isExpired(q: Quote) {
  return q.status === 'taslak' || q.status === 'gönderildi' || q.status === 'görüldü'
    ? q.validUntil < new Date().toISOString().slice(0, 10)
    : false
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TekliflerPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<Quote, 'id' | 'quoteNo' | 'createdAt' | 'updatedAt'>>(EMPTY_FORM)
  const [formItems, setFormItems] = useState<Omit<QuoteItem, 'id'>[]>([{ ...EMPTY_ITEM }])
  const [editId, setEditId] = useState<string | null>(null)
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null)
  const [printing, setPrinting] = useState(false)

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTES_KEY)
      if (raw) setQuotes(JSON.parse(raw))
    } catch {}

    productsService.getAll().then(setProducts).catch(() => {})
  }, [])

  // Auto-expire quotes
  useEffect(() => {
    const toExpire = quotes.filter(q => isExpired(q))
    if (toExpire.length > 0) {
      const updated = quotes.map(q => isExpired(q) ? { ...q, status: 'süresi_doldu' as QuoteStatus } : q)
      setQuotes(updated)
      localStorage.setItem(QUOTES_KEY, JSON.stringify(updated))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveQuotes = useCallback((list: Quote[]) => {
    setQuotes(list)
    localStorage.setItem(QUOTES_KEY, JSON.stringify(list))
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const openNew = () => {
    setForm({ ...EMPTY_FORM })
    setFormItems([{ ...EMPTY_ITEM }])
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (q: Quote) => {
    setForm({
      customerName: q.customerName, customerEmail: q.customerEmail,
      customerPhone: q.customerPhone, customerCompany: q.customerCompany,
      validUntil: q.validUntil, status: q.status, items: q.items,
      notes: q.notes, terms: q.terms, taxRate: q.taxRate,
    })
    setFormItems(q.items.map(({ id: _id, ...rest }) => rest))
    setEditId(q.id)
    setShowForm(true)
  }

  const openDuplicate = (q: Quote) => {
    setForm({
      customerName: q.customerName, customerEmail: q.customerEmail,
      customerPhone: q.customerPhone, customerCompany: q.customerCompany,
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'taslak', items: q.items,
      notes: q.notes, terms: q.terms, taxRate: q.taxRate,
    })
    setFormItems(q.items.map(({ id: _id, ...rest }) => rest))
    setEditId(null)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.customerName.trim() || formItems.every(i => !i.description.trim())) return
    const now = new Date().toISOString()
    const items: QuoteItem[] = formItems.map(item => ({ ...item, id: uid() }))

    if (editId) {
      const updated = quotes.map(q => q.id === editId ? { ...q, ...form, items, updatedAt: now } : q)
      saveQuotes(updated)
      if (detailQuote?.id === editId) setDetailQuote(prev => prev ? { ...prev, ...form, items, updatedAt: now } : null)
    } else {
      const newQ: Quote = {
        ...form,
        id: uid(),
        quoteNo: nextQuoteNo(quotes),
        items,
        createdAt: now,
        updatedAt: now,
      }
      saveQuotes([newQ, ...quotes])
    }
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Bu teklif silinecek. Emin misiniz?')) return
    saveQuotes(quotes.filter(q => q.id !== id))
    if (detailQuote?.id === id) setDetailQuote(null)
  }

  const handleStatusChange = (id: string, status: QuoteStatus) => {
    const now = new Date().toISOString()
    const updated = quotes.map(q => q.id === id ? { ...q, status, updatedAt: now } : q)
    saveQuotes(updated)
    if (detailQuote?.id === id) setDetailQuote(prev => prev ? { ...prev, status, updatedAt: now } : null)
  }

  const handleProductSelect = (i: number, productId: string) => {
    const p = products.find(p => p.id === productId)
    setFormItems(prev => prev.map((item, idx) =>
      idx !== i ? item : {
        ...item,
        productId,
        description: p?.name ?? item.description,
        unitPrice: p?.basePrice ?? item.unitPrice,
      }
    ))
  }

  const handlePrint = (q: Quote) => {
    const totals = calcTotals(q.items, q.taxRate)
    const win = window.open('', '_blank')
    if (!win) return
    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>${q.quoteNo}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #111; }
    h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .label { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 2px; }
    .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    .totals { text-align: right; padding: 16px 0; }
    .totals p { margin: 4px 0; }
    .total-final { font-size: 20px; font-weight: 900; border-top: 2px solid #111; padding-top: 8px; }
    .notes { margin-top: 24px; font-size: 12px; color: #555; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>FİYAT TEKLİFİ</h1>
  <div class="meta">${q.quoteNo} — ${new Date(q.createdAt).toLocaleDateString('tr-TR')}</div>
  <div class="grid">
    <div>
      <div class="label">Müşteri</div>
      <div class="value">${q.customerName}</div>
      ${q.customerCompany ? `<div>${q.customerCompany}</div>` : ''}
      ${q.customerEmail ? `<div>${q.customerEmail}</div>` : ''}
      ${q.customerPhone ? `<div>${q.customerPhone}</div>` : ''}
    </div>
    <div>
      <div class="label">Geçerlilik</div>
      <div class="value">${q.validUntil}</div>
      <div class="label" style="margin-top:12px">Durum</div>
      <div class="value">${STATUS_CONFIG[q.status].label}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Ürün / Açıklama</th><th>Adet</th><th>Birim Fiyat</th><th>İndirim</th><th>Toplam</th></tr></thead>
    <tbody>
      ${q.items.map((item, i) => {
        const line = item.quantity * item.unitPrice
        const disc = line * (item.discountPercent / 100)
        const net = line - disc
        return `<tr>
          <td>${i + 1}</td>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${line.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
          <td>${item.discountPercent > 0 ? '%' + item.discountPercent : '-'}</td>
          <td>${net.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
  <div class="totals">
    <p>Ara Toplam: ${totals.subtotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
    <p>KDV (%${q.taxRate}): ${totals.tax.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
    <p class="total-final">Genel Toplam: ${totals.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
  </div>
  ${q.notes ? `<div class="notes"><strong>Notlar:</strong> ${q.notes}</div>` : ''}
  ${q.terms ? `<div class="notes"><strong>Koşullar:</strong> ${q.terms}</div>` : ''}
  <script>window.print()</script>
</body>
</html>`
    win.document.write(html)
    win.document.close()
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = quotes
    if (statusFilter !== 'all') list = list.filter(q => q.status === statusFilter)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(q =>
        q.quoteNo.toLowerCase().includes(s) ||
        q.customerName.toLowerCase().includes(s) ||
        q.customerCompany.toLowerCase().includes(s)
      )
    }
    return list
  }, [quotes, statusFilter, search])

  const stats = useMemo(() => {
    const total = quotes.length
    const pending = quotes.filter(q => q.status === 'gönderildi' || q.status === 'görüldü').length
    const approved = quotes.filter(q => q.status === 'onaylandı').length
    const totalValue = quotes
      .filter(q => q.status !== 'reddedildi' && q.status !== 'süresi_doldu')
      .reduce((s, q) => s + calcTotals(q.items, q.taxRate).total, 0)
    const approvedValue = quotes
      .filter(q => q.status === 'onaylandı')
      .reduce((s, q) => s + calcTotals(q.items, q.taxRate).total, 0)
    return { total, pending, approved, totalValue, approvedValue }
  }, [quotes])

  const formTotals = useMemo(
    () => calcTotals(formItems.map(i => ({ ...i, id: '' })), form.taxRate),
    [formItems, form.taxRate]
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            Teklifler
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            B2B müşterilerinize fiyat teklifi oluşturun
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-sm shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Yeni Teklif
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Toplam Teklif',   value: String(stats.total),       cls: 'text-foreground' },
          { label: 'Bekleyen',         value: String(stats.pending),     cls: 'text-amber-400' },
          { label: 'Onaylanan',        value: String(stats.approved),    cls: 'text-emerald-400' },
          { label: 'Aktif Değer',      value: fmt(stats.totalValue),     cls: 'text-primary' },
          { label: 'Kazanılan Değer',  value: fmt(stats.approvedValue),  cls: 'text-emerald-400' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="premium-card p-3.5 border border-border/80 bg-slate-900/40">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-base font-black ${cls} mt-0.5`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Teklif no, müşteri veya şirket ara…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${statusFilter === 'all' ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/60 text-slate-500 hover:text-foreground'}`}
          >
            Tümü
          </button>
          {(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map(s => (
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

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="premium-card p-6 border border-primary/20 bg-primary/3 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">
                {editId ? 'Teklifi Düzenle' : 'Yeni Fiyat Teklifi'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer info */}
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Müşteri Bilgileri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {([
                  ['customerName',    'Müşteri Adı *',    'Ad Soyad'],
                  ['customerCompany', 'Şirket',           'Şirket Adı'],
                  ['customerEmail',   'E-posta',          'musteri@ornek.com'],
                  ['customerPhone',   'Telefon',          '0532 000 00 00'],
                ] as [keyof typeof form, string, string][]).map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">{label}</label>
                    <input
                      value={String(form[field] ?? '')}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quote settings */}
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">Teklif Ayarları</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Geçerlilik Tarihi</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">KDV Oranı (%)</label>
                  <select
                    value={form.taxRate}
                    onChange={e => setForm(p => ({ ...p, taxRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  >
                    {[0, 1, 8, 10, 18, 20].map(r => <option key={r} value={r}>%{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Durum</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as QuoteStatus }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  >
                    {(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kalemler *</h4>
                <button
                  onClick={() => setFormItems(prev => [...prev, { ...EMPTY_ITEM }])}
                  className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Kalem Ekle
                </button>
              </div>

              {/* Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-2 mb-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                <span className="col-span-4">Açıklama / Ürün</span>
                <span className="col-span-2">Adet</span>
                <span className="col-span-2">Birim Fiyat</span>
                <span className="col-span-2">İndirim %</span>
                <span className="col-span-1 text-right">Tutar</span>
                <span className="col-span-1" />
              </div>

              <div className="space-y-2">
                {formItems.map((item, i) => {
                  const line = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          value={item.description}
                          onChange={e => setFormItems(prev => prev.map((it, idx) => idx !== i ? it : { ...it, description: e.target.value }))}
                          placeholder="Ürün adı veya açıklama"
                          list={`products-${i}`}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                        <datalist id={`products-${i}`}>
                          {products.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                      </div>
                      <input
                        type="number" min={1} value={item.quantity}
                        onChange={e => setFormItems(prev => prev.map((it, idx) => idx !== i ? it : { ...it, quantity: Number(e.target.value) }))}
                        className="col-span-4 sm:col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                      />
                      <div className="col-span-4 sm:col-span-2 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₺</span>
                        <input
                          type="number" min={0} step={0.01} value={item.unitPrice}
                          onChange={e => setFormItems(prev => prev.map((it, idx) => idx !== i ? it : { ...it, unitPrice: Number(e.target.value) }))}
                          className="w-full pl-5 pr-2 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2 relative">
                        <input
                          type="number" min={0} max={100} value={item.discountPercent}
                          onChange={e => setFormItems(prev => prev.map((it, idx) => idx !== i ? it : { ...it, discountPercent: Number(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                      </div>
                      <p className="col-span-0 sm:col-span-1 text-right text-xs font-black text-foreground font-mono hidden sm:block">
                        {fmt(line)}
                      </p>
                      <button
                        onClick={() => setFormItems(prev => prev.filter((_, idx) => idx !== i))}
                        disabled={formItems.length <= 1}
                        className="col-span-1 flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="flex justify-end mt-3 pr-8">
                <div className="text-right space-y-1 text-xs">
                  <p className="text-slate-400">Ara Toplam: <span className="font-black text-foreground font-mono">{fmt(formTotals.subtotal)}</span></p>
                  <p className="text-slate-400">KDV %{form.taxRate}: <span className="font-black text-foreground font-mono">{fmt(formTotals.tax)}</span></p>
                  <p className="text-sm font-black text-foreground">Genel Toplam: <span className="font-mono text-primary">{fmt(formTotals.total)}</span></p>
                </div>
              </div>
            </div>

            {/* Notes + Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Notlar</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Koşullar</label>
                <textarea
                  value={form.terms}
                  onChange={e => setForm(p => ({ ...p, terms: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!form.customerName.trim() || formItems.every(i => !i.description.trim())}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all"
              >
                <Save className="w-4 h-4" />
                {editId ? 'Güncelle' : 'Teklif Oluştur'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-800/40 transition-all font-medium"
              >
                İptal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quotes list */}
      {filtered.length === 0 ? (
        <div className="premium-card p-16 flex flex-col items-center justify-center text-center border border-border/80">
          <FileText className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-bold">
            {search || statusFilter !== 'all' ? 'Teklif bulunamadı.' : 'Henüz teklif oluşturulmadı.'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={openNew} className="mt-4 text-xs text-primary font-bold hover:underline">
              İlk teklifi oluştur →
            </button>
          )}
        </div>
      ) : (
        <div className="premium-card border border-border/80 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-slate-950/30">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Teklif No</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Geçerlilik</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Toplam</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const totals = calcTotals(q.items, q.taxRate)
                  const sc = STATUS_CONFIG[q.status]
                  return (
                    <tr
                      key={q.id}
                      onClick={() => setDetailQuote(q)}
                      className="border-b border-border/40 hover:bg-slate-800/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold font-mono text-foreground">{q.quoteNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">{q.customerName}</p>
                        {q.customerCompany && <p className="text-[10px] text-slate-500">{q.customerCompany}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs ${q.validUntil < new Date().toISOString().slice(0, 10) ? 'text-red-400' : 'text-slate-400'}`}>
                          {q.validUntil}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-black text-foreground font-mono">{fmt(totals.total)}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePrint(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Yazdır / PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDuplicate(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                            title="Kopyala"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(q)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
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
        {detailQuote && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailQuote(null)}
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
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Fiyat Teklifi</p>
                    <h3 className="text-lg font-black text-foreground font-mono">{detailQuote.quoteNo}</h3>
                  </div>
                  <button
                    onClick={() => setDetailQuote(null)}
                    className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-black border ${STATUS_CONFIG[detailQuote.status].cls}`}>
                  {STATUS_CONFIG[detailQuote.status].label}
                </span>

                {/* Customer */}
                <div className="premium-card p-4 space-y-2 border border-border/80 bg-slate-900/40">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Müşteri</p>
                  <p className="font-bold text-foreground">{detailQuote.customerName}</p>
                  {detailQuote.customerCompany && <p className="text-xs text-slate-400">{detailQuote.customerCompany}</p>}
                  {detailQuote.customerEmail && <p className="text-xs text-primary">{detailQuote.customerEmail}</p>}
                  {detailQuote.customerPhone && <p className="text-xs text-slate-400">{detailQuote.customerPhone}</p>}
                  <div className="flex justify-between text-xs pt-2 border-t border-border/40">
                    <span className="text-slate-500">Geçerlilik</span>
                    <span className={`font-bold ${detailQuote.validUntil < new Date().toISOString().slice(0, 10) ? 'text-red-400' : 'text-foreground'}`}>
                      {detailQuote.validUntil}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Kalemler</p>
                  <div className="space-y-2">
                    {detailQuote.items.map(item => {
                      const net = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-border/40">
                          <div>
                            <p className="text-xs font-bold text-foreground">{item.description}</p>
                            <p className="text-[10px] text-slate-500">{item.quantity} × {fmt(item.unitPrice)}{item.discountPercent > 0 ? ` (-%${item.discountPercent})` : ''}</p>
                          </div>
                          <p className="text-xs font-black text-foreground font-mono">{fmt(net)}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="space-y-1 mt-3 pt-3 border-t border-border/40 text-xs text-right">
                    <p className="text-slate-400">Ara Toplam: <span className="font-black text-foreground">{fmt(calcTotals(detailQuote.items, detailQuote.taxRate).subtotal)}</span></p>
                    <p className="text-slate-400">KDV %{detailQuote.taxRate}: <span className="font-black text-foreground">{fmt(calcTotals(detailQuote.items, detailQuote.taxRate).tax)}</span></p>
                    <p className="text-base font-black text-foreground">Genel Toplam: <span className="text-primary font-mono">{fmt(calcTotals(detailQuote.items, detailQuote.taxRate).total)}</span></p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Durum Güncelle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(detailQuote.id, s)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                          detailQuote.status === s
                            ? STATUS_CONFIG[s].cls
                            : 'border-border/60 text-slate-500 hover:text-foreground hover:border-border'
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { handlePrint(detailQuote) }}
                    className="py-2.5 rounded-xl text-xs font-bold border border-border/60 text-foreground hover:bg-slate-800/40 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Yazdır / PDF
                  </button>
                  <button
                    onClick={() => { openDuplicate(detailQuote); setDetailQuote(null) }}
                    className="py-2.5 rounded-xl text-xs font-bold border border-violet-500/20 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" /> Kopyala
                  </button>
                  <button
                    onClick={() => openEdit(detailQuote)}
                    className="py-2.5 rounded-xl text-xs font-bold border border-border/60 text-foreground hover:bg-slate-800/40 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(detailQuote.id)}
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
