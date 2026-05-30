'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  FileText, Plus, X, Search, Download, Printer,
  CheckCircle2, Clock, AlertTriangle, XCircle, Send,
  ChevronLeft, ChevronRight, Trash2, Eye, Edit2,
  Building2, User, Hash, Calendar, Copy, ExternalLink,
  ReceiptText, Package, Percent
} from 'lucide-react'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceType = 'e-fatura' | 'e-arsiv'
type InvoiceStatus = 'taslak' | 'oluşturuldu' | 'gönderildi' | 'iptal' | 'itiraz'
type VatRate = 0 | 1 | 8 | 10 | 18 | 20

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: VatRate
  discountPct: number
  lineTotal: number   // computed: qty * unitPrice * (1 - discount/100)
  vatAmount: number   // computed
}

interface Invoice {
  id: string
  no: string
  type: InvoiceType
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  // Seller
  sellerName: string
  sellerTaxNo: string
  sellerAddress: string
  // Buyer
  buyerName: string
  buyerTaxNo: string
  buyerAddress: string
  buyerEmail: string
  // Items
  items: InvoiceItem[]
  // Totals (computed)
  subtotal: number
  totalVat: number
  total: number
  // Misc
  currency: 'TRY' | 'USD' | 'EUR'
  notes: string
  gibUuid: string
  orderId: string
  createdAt: string
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'efatura-invoices'
const LS_SETTINGS = 'efatura-settings'

interface SellerSettings {
  name: string
  taxNo: string
  taxOffice: string
  address: string
  phone: string
  email: string
  gibUsername: string
}

const STATUS_MAP: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  taslak:       { label: 'Taslak',      color: 'text-slate-400 bg-slate-500/15 border-slate-500/30',    icon: Clock },
  oluşturuldu:  { label: 'Oluşturuldu', color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',       icon: FileText },
  gönderildi:   { label: 'Gönderildi',  color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  iptal:        { label: 'İptal',       color: 'text-red-400 bg-red-500/15 border-red-500/30',          icon: XCircle },
  itiraz:       { label: 'İtiraz',      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',    icon: AlertTriangle },
}

const VAT_RATES: VatRate[] = [0, 1, 8, 10, 18, 20]
const UNITS = ['Adet', 'Kg', 'Lt', 'M', 'M²', 'M³', 'Kutu', 'Paket', 'Hizmet', 'Saat']
const CURRENCIES = ['TRY', 'USD', 'EUR'] as const

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()
const todayISO = () => new Date().toISOString().slice(0, 10)
const gibUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase()
})

let _counter = 1
function nextInvoiceNo(type: InvoiceType): string {
  const year = new Date().getFullYear()
  const prefix = type === 'e-fatura' ? 'EF' : 'EA'
  return `${prefix}-${year}-${String(_counter++).padStart(6, '0')}`
}

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function computeItem(item: Omit<InvoiceItem, 'lineTotal' | 'vatAmount'>): InvoiceItem {
  const base = item.quantity * item.unitPrice * (1 - item.discountPct / 100)
  const vat = base * item.vatRate / 100
  return { ...item, lineTotal: base, vatAmount: vat }
}

function computeTotals(items: InvoiceItem[]): Pick<Invoice, 'subtotal' | 'totalVat' | 'total'> {
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
  const totalVat = items.reduce((s, i) => s + i.vatAmount, 0)
  return { subtotal, totalVat, total: subtotal + totalVat }
}

// ─── Demo Seeds ───────────────────────────────────────────────────────────────

const DEFAULT_SELLER: SellerSettings = {
  name: 'CanayanWeb Teknoloji A.Ş.',
  taxNo: '1234567890',
  taxOffice: 'Atatürk VD',
  address: 'Maslak Mahallesi, Büyükdere Cad. No:123, Sarıyer / İstanbul',
  phone: '0212 555 0000',
  email: 'fatura@canayanweb.com',
  gibUsername: 'CANAYANWEB',
}

function buildDemoInvoices(seller: SellerSettings): Invoice[] {
  const item1: InvoiceItem = computeItem({ id: uid(), description: 'E-Ticaret Platform Lisansı (1 Yıl)', quantity: 1, unit: 'Adet', unitPrice: 18000, vatRate: 20, discountPct: 0 })
  const item2: InvoiceItem = computeItem({ id: uid(), description: 'Muhasebe Modülü', quantity: 1, unit: 'Adet', unitPrice: 6000, vatRate: 20, discountPct: 0 })
  const t1 = computeTotals([item1, item2])
  const i1: Invoice = {
    id: uid(), no: 'EF-2026-000001', type: 'e-fatura', status: 'gönderildi',
    issueDate: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    sellerName: seller.name, sellerTaxNo: seller.taxNo, sellerAddress: seller.address,
    buyerName: 'Güneş Tekstil A.Ş.', buyerTaxNo: '9876543210', buyerAddress: 'Bağcılar / İstanbul', buyerEmail: 'muhasebe@gunestekstil.com',
    items: [item1, item2], ...t1,
    currency: 'TRY', notes: 'Yıllık lisans ücreti', gibUuid: gibUuid(), orderId: '',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), updatedAt: now(),
  }

  const item3: InvoiceItem = computeItem({ id: uid(), description: 'Danışmanlık Hizmeti', quantity: 8, unit: 'Saat', unitPrice: 750, vatRate: 20, discountPct: 0 })
  const t2 = computeTotals([item3])
  const i2: Invoice = {
    id: uid(), no: 'EF-2026-000002', type: 'e-fatura', status: 'oluşturuldu',
    issueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
    sellerName: seller.name, sellerTaxNo: seller.taxNo, sellerAddress: seller.address,
    buyerName: 'Yıldız Gıda Ltd. Şti.', buyerTaxNo: '5551234567', buyerAddress: 'Kadıköy / İstanbul', buyerEmail: 'info@yildzgida.com',
    items: [item3], ...t2,
    currency: 'TRY', notes: '', gibUuid: gibUuid(), orderId: '',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), updatedAt: now(),
  }

  const item4: InvoiceItem = computeItem({ id: uid(), description: 'Laptop Satışı', quantity: 2, unit: 'Adet', unitPrice: 22500, vatRate: 20, discountPct: 5 })
  const t3 = computeTotals([item4])
  const i3: Invoice = {
    id: uid(), no: 'EA-2026-000001', type: 'e-arsiv', status: 'gönderildi',
    issueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    sellerName: seller.name, sellerTaxNo: seller.taxNo, sellerAddress: seller.address,
    buyerName: 'Ali Veli', buyerTaxNo: '11111111111', buyerAddress: 'Ankara', buyerEmail: 'ali@example.com',
    items: [item4], ...t3,
    currency: 'TRY', notes: '', gibUuid: gibUuid(), orderId: 'ORD-29388',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: now(),
  }

  const item5: InvoiceItem = computeItem({ id: uid(), description: 'Website Tasarım', quantity: 1, unit: 'Hizmet', unitPrice: 8500, vatRate: 20, discountPct: 0 })
  const t4 = computeTotals([item5])
  const i4: Invoice = {
    id: uid(), no: 'EF-2026-000003', type: 'e-fatura', status: 'taslak',
    issueDate: todayISO(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    sellerName: seller.name, sellerTaxNo: seller.taxNo, sellerAddress: seller.address,
    buyerName: 'Moda Koleksiyon', buyerTaxNo: '2223334445', buyerAddress: 'Beşiktaş / İstanbul', buyerEmail: 'selin@modakoleksiyon.com',
    items: [item5], ...t4,
    currency: 'TRY', notes: 'Taslak — onay bekleniyor', gibUuid: '', orderId: '',
    createdAt: now(), updatedAt: now(),
  }

  _counter = 4
  return [i1, i2, i3, i4]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EFaturaPage() {
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [seller, setSeller] = useState<SellerSettings>(DEFAULT_SELLER)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingInv, setEditingInv] = useState<Invoice | null>(null)
  const [showPrint, setShowPrint] = useState<Invoice | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'tümü'>('tümü')
  const [filterType, setFilterType] = useState<InvoiceType | 'tümü'>('tümü')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // Form state
  const emptyInv = (type: InvoiceType = 'e-fatura'): Omit<Invoice, 'id' | 'no' | 'createdAt' | 'updatedAt' | 'subtotal' | 'totalVat' | 'total'> => ({
    type, status: 'taslak', issueDate: todayISO(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    sellerName: seller.name, sellerTaxNo: seller.taxNo, sellerAddress: seller.address,
    buyerName: '', buyerTaxNo: '', buyerAddress: '', buyerEmail: '',
    items: [computeItem({ id: uid(), description: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20, discountPct: 0 })],
    currency: 'TRY', notes: '', gibUuid: '', orderId: '',
  })

  const [form, setForm] = useState(emptyInv())

  useEffect(() => {
    try {
      const rawS = localStorage.getItem(LS_SETTINGS)
      const loadedSeller: SellerSettings = rawS ? JSON.parse(rawS) : DEFAULT_SELLER
      setSeller(loadedSeller)
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed: Invoice[] = JSON.parse(raw)
        const maxNo = parsed.reduce((m, inv) => {
          const n = parseInt(inv.no.split('-')[2] || '0')
          return Math.max(m, n)
        }, 0)
        _counter = maxNo + 1
        setInvoices(parsed)
      } else {
        const demos = buildDemoInvoices(loadedSeller)
        setInvoices(demos)
        localStorage.setItem(LS_KEY, JSON.stringify(demos))
      }
    } catch {
      const demos = buildDemoInvoices(DEFAULT_SELLER)
      setInvoices(demos)
    }
  }, [])

  const save = useCallback((updated: Invoice[]) => {
    setInvoices(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  // Stats
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthInvs = invoices.filter(i => i.issueDate.startsWith(thisMonth))
    const totalThisMonth = monthInvs.filter(i => i.status !== 'iptal').reduce((s, i) => s + i.total, 0)
    const drafts = invoices.filter(i => i.status === 'taslak').length
    const sent = invoices.filter(i => i.status === 'gönderildi').length
    const pending = invoices.filter(i => i.status === 'oluşturuldu').length
    return { totalThisMonth, drafts, sent, pending, total: invoices.length }
  }, [invoices])

  // Filtered
  const filtered = useMemo(() => {
    let list = invoices
    if (filterStatus !== 'tümü') list = list.filter(i => i.status === filterStatus)
    if (filterType !== 'tümü') list = list.filter(i => i.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.no.toLowerCase().includes(q) || i.buyerName.toLowerCase().includes(q) || i.buyerTaxNo.includes(q))
    }
    return list.sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  }, [invoices, filterStatus, filterType, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleStatusChange = (inv: Invoice, status: InvoiceStatus) => {
    const updated = invoices.map(i => i.id === inv.id ? {
      ...i, status,
      gibUuid: status === 'gönderildi' && !i.gibUuid ? gibUuid() : i.gibUuid,
      updatedAt: now(),
    } : i)
    save(updated)
    if (selected?.id === inv.id) setSelected(updated.find(i => i.id === inv.id) || null)
    toast.success(`Durum: ${STATUS_MAP[status].label}`)
  }

  const updateFormItem = (idx: number, patch: Partial<InvoiceItem>) => {
    const items = [...form.items]
    const merged = { ...items[idx], ...patch }
    items[idx] = computeItem(merged)
    setForm(f => ({ ...f, items }))
  }

  const addFormItem = () => {
    setForm(f => ({ ...f, items: [...f.items, computeItem({ id: uid(), description: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20, discountPct: 0 })] }))
  }

  const removeFormItem = (idx: number) => {
    if (form.items.length === 1) return
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const handleSave = () => {
    if (!form.buyerName.trim()) { toast.error('Alıcı adı zorunludur'); return }
    const totals = computeTotals(form.items)
    if (editingInv) {
      save(invoices.map(i => i.id === editingInv.id ? { ...i, ...form, ...totals, updatedAt: now() } : i))
      toast.success('Fatura güncellendi')
    } else {
      const inv: Invoice = { id: uid(), no: nextInvoiceNo(form.type), ...form, ...totals, createdAt: now(), updatedAt: now() }
      save([inv, ...invoices])
      toast.success(`Fatura oluşturuldu: ${inv.no}`)
    }
    setShowForm(false); setEditingInv(null); setForm(emptyInv())
  }

  const handleEdit = (inv: Invoice) => {
    setEditingInv(inv)
    setForm({ type: inv.type, status: inv.status, issueDate: inv.issueDate, dueDate: inv.dueDate, sellerName: inv.sellerName, sellerTaxNo: inv.sellerTaxNo, sellerAddress: inv.sellerAddress, buyerName: inv.buyerName, buyerTaxNo: inv.buyerTaxNo, buyerAddress: inv.buyerAddress, buyerEmail: inv.buyerEmail, items: inv.items, currency: inv.currency, notes: inv.notes, gibUuid: inv.gibUuid, orderId: inv.orderId })
    setShowForm(true); setSelected(null)
  }

  const handleDelete = (id: string) => {
    save(invoices.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Fatura silindi')
  }

  const handleExport = () => {
    const header = ['No', 'Tür', 'Tarih', 'Alıcı', 'VKN/TCK', 'KDVsiz', 'KDV', 'Toplam', 'Durum']
    const rows = filtered.map(i => [i.no, i.type === 'e-fatura' ? 'E-Fatura' : 'E-Arşiv', i.issueDate, i.buyerName, i.buyerTaxNo, fmt(i.subtotal), fmt(i.totalVat), fmt(i.total), STATUS_MAP[i.status].label])
    const csv = [header, ...rows].map(r => r.join('\t')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/tab-separated-values' })); a.download = 'efatura-listesi.csv'; a.click()
    toast.success('CSV indirildi')
  }

  const formTotals = computeTotals(form.items)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">E-Fatura / E-Arşiv</h1>
          <p className="text-slate-400 text-sm font-semibold">Elektronik fatura oluştur, gönder ve takip et</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground text-sm transition-colors">
            <Building2 size={14} /> Firma Bilgileri
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground text-sm transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { setEditingInv(null); setForm(emptyInv('e-fatura')); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus size={16} /> Fatura Oluştur
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Bu Ay Toplam', value: `₺${fmt(stats.totalThisMonth)}`, color: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Gönderildi',   value: stats.sent,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Onay Bekliyor', value: stats.pending, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Taslak',       value: stats.drafts,  color: 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          { label: 'Toplam Fatura', value: stats.total,  color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
        ].map(s => (
          <div key={s.label} className={`premium-card rounded-2xl border p-4 ${s.color}`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-card rounded-2xl border border-border/40 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Fatura no, alıcı, VKN ara..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as InvoiceStatus | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.entries(STATUS_MAP) as [InvoiceStatus, typeof STATUS_MAP[InvoiceStatus]][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value as InvoiceType | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
          <option value="tümü">E-Fatura + E-Arşiv</option>
          <option value="e-fatura">E-Fatura</option>
          <option value="e-arsiv">E-Arşiv</option>
        </select>
      </div>

      {/* Invoice table */}
      <div className="premium-card rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-slate-900/40">
              <tr>
                {['Fatura No', 'Tür', 'Alıcı', 'Tarih', 'Vade', 'KDVsiz', 'Toplam', 'Durum', ''].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paged.map(inv => {
                const StatusIcon = STATUS_MAP[inv.status].icon
                return (
                  <tr key={inv.id} onClick={() => setSelected(s => s?.id === inv.id ? null : inv)}
                    className="hover:bg-slate-800/20 cursor-pointer transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-primary">{inv.no}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${inv.type === 'e-fatura' ? 'text-violet-400 bg-violet-500/10 border-violet-500/30' : 'text-blue-400 bg-blue-500/10 border-blue-500/30'}`}>
                        {inv.type === 'e-fatura' ? 'E-Fatura' : 'E-Arşiv'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{inv.buyerName}</p>
                      <p className="text-xs text-slate-500">{inv.buyerTaxNo}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 font-mono">{inv.issueDate}</td>
                    <td className="px-5 py-4 text-xs text-slate-400 font-mono hidden md:table-cell">{inv.dueDate}</td>
                    <td className="px-5 py-4 text-sm font-semibold hidden lg:table-cell">₺{fmt(inv.subtotal)}</td>
                    <td className="px-5 py-4 text-sm font-black text-primary">₺{fmt(inv.total)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[inv.status].color}`}>
                        <StatusIcon size={10} />
                        {STATUS_MAP[inv.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setShowPrint(inv)} className="p-1.5 rounded-lg hover:bg-slate-700/40 text-slate-500 hover:text-foreground transition-colors">
                        <Printer size={14} />
                      </button>
                      <button onClick={() => handleEdit(inv)} className="p-1.5 rounded-lg hover:bg-slate-700/40 text-slate-500 hover:text-primary transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {paged.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">
                  <ReceiptText className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                  <p className="font-semibold">Fatura bulunamadı</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-sm text-slate-400">
            <span>{filtered.length} fatura · Sayfa {page}/{totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Inline Detail ──────────────────────────────────────────────────── */}
      {selected && (
        <div className="premium-card rounded-2xl border border-primary/30 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-black text-primary">{selected.no}</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[selected.status].color}`}>
                  {STATUS_MAP[selected.status].label}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{selected.buyerName} · {selected.issueDate}</p>
              {selected.gibUuid && (
                <p className="text-xs text-slate-600 font-mono mt-1">GİB UUID: {selected.gibUuid}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPrint(selected)} className="p-2 rounded-xl border border-border/40 hover:border-primary/30 text-slate-400 hover:text-primary transition-colors"><Printer size={15} /></button>
              <button onClick={() => handleEdit(selected)} className="p-2 rounded-xl border border-border/40 hover:border-primary/30 text-slate-400 hover:text-primary transition-colors"><Edit2 size={15} /></button>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl border border-border/40 hover:bg-slate-800/40 text-slate-400"><X size={15} /></button>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/40 border-b border-border/40">
                <tr>
                  {['Açıklama', 'Miktar', 'Birim Fiyat', 'İndirim', 'KDV', 'Tutar'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {selected.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-semibold">{item.description}</td>
                    <td className="px-4 py-2.5 text-slate-400">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-2.5 text-slate-400">₺{fmt(item.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{item.discountPct > 0 ? `%${item.discountPct}` : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-400">%{item.vatRate}</td>
                    <td className="px-4 py-2.5 font-bold">₺{fmt(item.lineTotal + item.vatAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border/40 bg-slate-900/20">
                <tr>
                  <td colSpan={4} />
                  <td className="px-4 py-2 text-xs font-bold text-slate-400">KDVsiz Toplam</td>
                  <td className="px-4 py-2 font-semibold">₺{fmt(selected.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} />
                  <td className="px-4 py-2 text-xs font-bold text-slate-400">KDV Tutarı</td>
                  <td className="px-4 py-2 font-semibold">₺{fmt(selected.totalVat)}</td>
                </tr>
                <tr>
                  <td colSpan={4} />
                  <td className="px-4 py-2 text-sm font-black text-primary">GENEL TOPLAM</td>
                  <td className="px-4 py-2 text-lg font-black text-primary">₺{fmt(selected.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Status transitions */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(STATUS_MAP) as [InvoiceStatus, typeof STATUS_MAP[InvoiceStatus]][])
              .filter(([k]) => k !== selected.status)
              .map(([k, v]) => {
                const VIcon = v.icon
                return (
                  <button key={k} onClick={() => handleStatusChange(selected, k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${v.color}`}>
                    <VIcon size={11} /> {v.label}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Create/Edit Form Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingInv(null) }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">{editingInv ? 'Faturayı Düzenle' : 'Yeni Fatura'}</h3>
                <div className="flex gap-2">
                  {(['e-fatura', 'e-arsiv'] as InvoiceType[]).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${form.type === t ? 'bg-violet-500/20 border-violet-500/40 text-violet-400' : 'border-border/40 text-slate-400 hover:border-primary/30'}`}>
                      {t === 'e-fatura' ? 'E-Fatura' : 'E-Arşiv'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setEditingInv(null) }} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Dates + currency */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Fatura Tarihi</label>
                  <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Vade Tarihi</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Para Birimi</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'TRY' | 'USD' | 'EUR' }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Buyer */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-2"><User size={12} /> Alıcı Bilgileri</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Ad / Unvan *</label>
                    <input value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">VKN / TC Kimlik</label>
                    <input value={form.buyerTaxNo} onChange={e => setForm(f => ({ ...f, buyerTaxNo: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm font-mono focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Adres</label>
                    <input value={form.buyerAddress} onChange={e => setForm(f => ({ ...f, buyerAddress: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">E-Posta</label>
                    <input value={form.buyerEmail} onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))}
                      type="email" className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-2"><Package size={12} /> Kalemler</p>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <input value={item.description} onChange={e => updateFormItem(idx, { description: e.target.value })}
                          placeholder="Ürün/hizmet açıklaması"
                          className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-border/40 rounded-lg text-xs focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min={0} value={item.quantity} onChange={e => updateFormItem(idx, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-full px-2 py-1.5 bg-slate-900/60 border border-border/40 rounded-lg text-xs text-center focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={0} step="0.01" value={item.unitPrice || ''} onChange={e => updateFormItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          placeholder="Birim fiyat"
                          className="w-full px-2 py-1.5 bg-slate-900/60 border border-border/40 rounded-lg text-xs text-right focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="col-span-1">
                        <input type="number" min={0} max={100} value={item.discountPct || ''} onChange={e => updateFormItem(idx, { discountPct: parseFloat(e.target.value) || 0 })}
                          placeholder="%"
                          className="w-full px-2 py-1.5 bg-slate-900/60 border border-border/40 rounded-lg text-xs text-center focus:outline-none focus:border-primary/50" />
                      </div>
                      <div className="col-span-1">
                        <select value={item.vatRate} onChange={e => updateFormItem(idx, { vatRate: parseInt(e.target.value) as VatRate })}
                          className="w-full px-1.5 py-1.5 bg-slate-900/60 border border-border/40 rounded-lg text-xs focus:outline-none focus:border-primary/50">
                          {VAT_RATES.map(r => <option key={r} value={r}>%{r}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-400 flex-1 text-right">₺{fmt(item.lineTotal + item.vatAmount)}</span>
                        <button onClick={() => removeFormItem(idx)} disabled={form.items.length === 1} className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 disabled:opacity-30"><X size={12} /></button>
                      </div>
                      <div className="col-span-1" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={addFormItem} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-semibold">
                    <Plus size={13} /> Kalem Ekle
                  </button>
                  <div className="text-right space-y-0.5">
                    <p className="text-xs text-slate-400">KDVsiz: ₺{fmt(formTotals.subtotal)}</p>
                    <p className="text-xs text-slate-400">KDV: ₺{fmt(formTotals.totalVat)}</p>
                    <p className="text-sm font-black text-primary">Toplam: ₺{fmt(formTotals.total)}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Notlar</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Ödeme koşulları, özel notlar..."
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowForm(false); setEditingInv(null) }} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                <FileText size={15} /> {editingInv ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Modal ────────────────────────────────────────────────────── */}
      {showPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPrint(null)} />
          <div className="relative bg-white text-black w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-3 bg-slate-100 border-b">
              <span className="font-bold text-sm text-slate-700">Fatura Önizleme</span>
              <div className="flex gap-2">
                <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(document.getElementById('print-area')?.outerHTML ?? ''); w.print(); w.close() } }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold">
                  <Printer size={13} /> Yazdır
                </button>
                <button onClick={() => setShowPrint(null)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"><X size={16} /></button>
              </div>
            </div>
            <div id="print-area" className="p-8 text-sm font-sans">
              {/* Invoice header */}
              <div className="flex justify-between mb-8">
                <div>
                  <div className="text-2xl font-black text-slate-800 mb-1">{showPrint.type === 'e-fatura' ? 'E-FATURA' : 'E-ARŞİV FATURA'}</div>
                  <div className="text-slate-500 text-xs">{showPrint.type === 'e-fatura' ? 'GİB Onaylı' : 'GİB Onaylı'}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-slate-800">{showPrint.no}</div>
                  <div className="text-xs text-slate-500">{showPrint.issueDate}</div>
                  {showPrint.gibUuid && <div className="text-[9px] text-slate-400 mt-1 font-mono">{showPrint.gibUuid}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 mb-6 text-xs">
                <div>
                  <p className="font-black text-slate-600 uppercase tracking-wide mb-1.5 text-[10px]">Satıcı</p>
                  <p className="font-bold">{showPrint.sellerName}</p>
                  <p className="text-slate-500">VKN: {showPrint.sellerTaxNo}</p>
                  <p className="text-slate-500">{showPrint.sellerAddress}</p>
                </div>
                <div>
                  <p className="font-black text-slate-600 uppercase tracking-wide mb-1.5 text-[10px]">Alıcı</p>
                  <p className="font-bold">{showPrint.buyerName}</p>
                  <p className="text-slate-500">VKN: {showPrint.buyerTaxNo}</p>
                  <p className="text-slate-500">{showPrint.buyerAddress}</p>
                </div>
              </div>
              <table className="w-full text-xs mb-4 border-collapse">
                <thead><tr className="bg-slate-100">
                  <th className="text-left p-2 border border-slate-200">Açıklama</th>
                  <th className="text-right p-2 border border-slate-200">Miktar</th>
                  <th className="text-right p-2 border border-slate-200">B.Fiyat</th>
                  <th className="text-right p-2 border border-slate-200">KDV%</th>
                  <th className="text-right p-2 border border-slate-200">Tutar</th>
                </tr></thead>
                <tbody>{showPrint.items.map(item => (
                  <tr key={item.id}>
                    <td className="p-2 border border-slate-200">{item.description}</td>
                    <td className="p-2 border border-slate-200 text-right">{item.quantity} {item.unit}</td>
                    <td className="p-2 border border-slate-200 text-right">₺{fmt(item.unitPrice)}</td>
                    <td className="p-2 border border-slate-200 text-right">%{item.vatRate}</td>
                    <td className="p-2 border border-slate-200 text-right font-bold">₺{fmt(item.lineTotal + item.vatAmount)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-56 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Ara Toplam</span><span>₺{fmt(showPrint.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">KDV</span><span>₺{fmt(showPrint.totalVat)}</span></div>
                  <div className="flex justify-between font-black text-base pt-1 border-t border-slate-300"><span>TOPLAM</span><span className="text-blue-700">₺{fmt(showPrint.total)}</span></div>
                </div>
              </div>
              {showPrint.notes && <p className="text-xs text-slate-500 mt-4 italic">{showPrint.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">Firma Bilgileri</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {([
                { key: 'name', label: 'Firma Adı', placeholder: 'Şirket adı' },
                { key: 'taxNo', label: 'Vergi No', placeholder: '10 haneli VKN' },
                { key: 'taxOffice', label: 'Vergi Dairesi', placeholder: 'Bağlı olduğunuz VD' },
                { key: 'address', label: 'Adres', placeholder: 'Tam adres' },
                { key: 'phone', label: 'Telefon', placeholder: '0212...' },
                { key: 'email', label: 'E-Posta', placeholder: 'fatura@firma.com' },
                { key: 'gibUsername', label: 'GİB Kullanıcı Adı', placeholder: 'GİB portal kullanıcı adı' },
              ] as { key: keyof SellerSettings; label: string; placeholder: string }[]).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">{f.label}</label>
                  <input value={seller[f.key]} onChange={e => setSeller(s => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
                <button onClick={() => { localStorage.setItem(LS_SETTINGS, JSON.stringify(seller)); setShowSettings(false); toast.success('Firma bilgileri kaydedildi') }}
                  className="px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
