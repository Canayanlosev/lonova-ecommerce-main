'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, Plus, Search, Edit2, Trash2, X, Save, Check,
  Phone, Mail, MapPin, Building2, FileText, DollarSign,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, Package,
  ArrowRight, TrendingUp, Filter, Download, RefreshCw
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type PaperStatus = 'taslak' | 'gönderildi' | 'teslim_alındı' | 'iptal'

interface Supplier {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  taxNo: string
  paymentTerms: string   // e.g. "Net 30", "Net 60", "Peşin"
  notes: string
  createdAt: string
}

interface PurchaseOrderItem {
  id: string
  productName: string
  sku: string
  quantity: number
  unitCost: number
}

interface PurchaseOrder {
  id: string
  supplierId: string
  orderNo: string
  orderDate: string
  expectedDate: string
  status: PaperStatus
  items: PurchaseOrderItem[]
  notes: string
  isPaid: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPPLIERS_KEY = 'tedarik-suppliers'
const PO_KEY = 'tedarik-purchase-orders'

const STATUS_CONFIG: Record<PaperStatus, { label: string; cls: string }> = {
  taslak:       { label: 'Taslak',        cls: 'bg-slate-700/40 text-slate-400 border-slate-600/20' },
  gönderildi:   { label: 'Gönderildi',    cls: 'bg-primary/10 text-primary border-primary/20' },
  teslim_alındı: { label: 'Teslim Alındı', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  iptal:         { label: 'İptal',         cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const PAYMENT_TERMS = ['Peşin', 'Net 7', 'Net 15', 'Net 30', 'Net 60', 'Net 90']

const EMPTY_SUPPLIER: Omit<Supplier, 'id' | 'createdAt'> = {
  name: '', contactPerson: '', phone: '', email: '',
  address: '', taxNo: '', paymentTerms: 'Net 30', notes: '',
}

const EMPTY_ITEM: Omit<PurchaseOrderItem, 'id'> = {
  productName: '', sku: '', quantity: 1, unitCost: 0,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function nextPONo(orders: PurchaseOrder[]): string {
  const year = new Date().getFullYear()
  const count = orders.filter(o => o.orderNo.startsWith(`PO-${year}`)).length + 1
  return `PO-${year}-${String(count).padStart(4, '0')}`
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TedarikPage() {
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])

  // Supplier form
  const [showSupForm, setShowSupForm] = useState(false)
  const [supForm, setSupForm] = useState<Omit<Supplier, 'id' | 'createdAt'>>(EMPTY_SUPPLIER)
  const [editSupId, setEditSupId] = useState<string | null>(null)

  // Order form
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
  })
  const [orderItems, setOrderItems] = useState<Omit<PurchaseOrderItem, 'id'>[]>([{ ...EMPTY_ITEM }])
  const [editOrderId, setEditOrderId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PaperStatus>('all')

  // Detail panel
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const rawS = localStorage.getItem(SUPPLIERS_KEY)
      if (rawS) setSuppliers(JSON.parse(rawS))

      const rawO = localStorage.getItem(PO_KEY)
      if (rawO) setOrders(JSON.parse(rawO))
    } catch {}
  }, [])

  const saveSuppliers = useCallback((list: Supplier[]) => {
    setSuppliers(list)
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list))
  }, [])

  const saveOrders = useCallback((list: PurchaseOrder[]) => {
    setOrders(list)
    localStorage.setItem(PO_KEY, JSON.stringify(list))
  }, [])

  // ── Supplier CRUD ─────────────────────────────────────────────────────────────

  const openNewSupplier = () => {
    setSupForm(EMPTY_SUPPLIER)
    setEditSupId(null)
    setShowSupForm(true)
  }

  const openEditSupplier = (s: Supplier) => {
    setSupForm({ name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, taxNo: s.taxNo, paymentTerms: s.paymentTerms, notes: s.notes })
    setEditSupId(s.id)
    setShowSupForm(true)
  }

  const handleSaveSupplier = () => {
    if (!supForm.name.trim()) return
    if (editSupId) {
      saveSuppliers(suppliers.map(s => s.id === editSupId ? { ...s, ...supForm } : s))
    } else {
      const newS: Supplier = { ...supForm, id: uid(), createdAt: new Date().toISOString() }
      saveSuppliers([...suppliers, newS])
    }
    setShowSupForm(false)
  }

  const handleDeleteSupplier = (id: string) => {
    if (!confirm('Bu tedarikçi silinecek. Emin misiniz?')) return
    saveSuppliers(suppliers.filter(s => s.id !== id))
  }

  // ── Purchase Order CRUD ───────────────────────────────────────────────────────

  const openNewOrder = (supplierId?: string) => {
    setOrderForm({ supplierId: supplierId ?? '', expectedDate: '', notes: '' })
    setOrderItems([{ ...EMPTY_ITEM }])
    setEditOrderId(null)
    setShowOrderForm(true)
    setTab('orders')
  }

  const openEditOrder = (o: PurchaseOrder) => {
    setOrderForm({ supplierId: o.supplierId, expectedDate: o.expectedDate, notes: o.notes })
    setOrderItems(o.items.map(({ id: _id, ...rest }) => rest))
    setEditOrderId(o.id)
    setShowOrderForm(true)
  }

  const handleSaveOrder = () => {
    if (!orderForm.supplierId || orderItems.some(i => !i.productName.trim() || i.quantity <= 0)) return
    const items: PurchaseOrderItem[] = orderItems.map(item => ({ ...item, id: uid() }))
    if (editOrderId) {
      saveOrders(orders.map(o => o.id === editOrderId ? { ...o, ...orderForm, items } : o))
      if (detailOrder?.id === editOrderId) {
        setDetailOrder(prev => prev ? { ...prev, ...orderForm, items } : null)
      }
    } else {
      const newO: PurchaseOrder = {
        ...orderForm,
        id: uid(),
        orderNo: nextPONo(orders),
        orderDate: new Date().toISOString().slice(0, 10),
        status: 'taslak',
        items,
        isPaid: false,
      }
      saveOrders([...orders, newO])
    }
    setShowOrderForm(false)
  }

  const handleDeleteOrder = (id: string) => {
    if (!confirm('Bu sipariş silinecek. Emin misiniz?')) return
    saveOrders(orders.filter(o => o.id !== id))
    if (detailOrder?.id === id) setDetailOrder(null)
  }

  const handleStatusChange = (id: string, status: PaperStatus) => {
    const updated = orders.map(o => o.id === id ? { ...o, status } : o)
    saveOrders(updated)
    if (detailOrder?.id === id) setDetailOrder(prev => prev ? { ...prev, status } : null)
  }

  const handleTogglePaid = (id: string) => {
    const updated = orders.map(o => o.id === id ? { ...o, isPaid: !o.isPaid } : o)
    saveOrders(updated)
    if (detailOrder?.id === id) setDetailOrder(prev => prev ? { ...prev, isPaid: !prev.isPaid } : null)
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const supplierMap = useMemo(() => {
    const m: Record<string, Supplier> = {}
    for (const s of suppliers) m[s.id] = s
    return m
  }, [suppliers])

  const filteredOrders = useMemo(() => {
    let list = orders
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.orderNo.toLowerCase().includes(q) ||
        (supplierMap[o.supplierId]?.name ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => b.orderDate.localeCompare(a.orderDate))
  }, [orders, statusFilter, search, supplierMap])

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.toLowerCase()
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    )
  }, [suppliers, search])

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const pending = orders.filter(o => o.status === 'gönderildi').length
    const received = orders.filter(o => o.status === 'teslim_alındı').length
    const totalValue = orders.reduce((s, o) =>
      s + o.items.reduce((is, item) => is + item.quantity * item.unitCost, 0), 0)
    const unpaid = orders
      .filter(o => !o.isPaid && o.status !== 'iptal')
      .reduce((s, o) => s + o.items.reduce((is, item) => is + item.quantity * item.unitCost, 0), 0)
    return { totalOrders, pending, received, totalValue, unpaid }
  }, [orders])

  const handleExportCsv = () => {
    const rows = [
      ['Sipariş No', 'Tedarikçi', 'Tarih', 'Beklenen Teslim', 'Durum', 'Ödendi', 'Toplam (₺)'],
      ...orders.map(o => {
        const total = o.items.reduce((s, i) => s + i.quantity * i.unitCost, 0)
        return [
          o.orderNo,
          supplierMap[o.supplierId]?.name ?? '-',
          o.orderDate,
          o.expectedDate ?? '-',
          STATUS_CONFIG[o.status]?.label ?? o.status,
          o.isPaid ? 'Evet' : 'Hayır',
          String(Math.round(total)),
        ]
      })
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satin-alma-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Truck className="w-7 h-7 text-primary" />
            Tedarik & Satın Alma
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Tedarikçileri ve satın alma siparişlerini yönetin
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
            onClick={() => tab === 'suppliers' ? openNewSupplier() : openNewOrder()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            {tab === 'suppliers' ? 'Yeni Tedarikçi' : 'Yeni Sipariş'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tedarikçi',         value: String(suppliers.length),           cls: 'text-primary',         icon: <Building2 className="w-3.5 h-3.5" /> },
          { label: 'Toplam Sipariş',    value: String(stats.totalOrders),           cls: 'text-foreground',      icon: <FileText className="w-3.5 h-3.5" /> },
          { label: 'Bekleyen',          value: String(stats.pending),               cls: 'text-amber-400',       icon: <Clock className="w-3.5 h-3.5" /> },
          { label: 'Teslim Alındı',     value: String(stats.received),              cls: 'text-emerald-400',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
          { label: 'Ödenmemiş Tutar',   value: fmt(stats.unpaid),                   cls: 'text-red-400',         icon: <DollarSign className="w-3.5 h-3.5" /> },
        ].map(({ label, value, cls, icon }) => (
          <div key={label} className="premium-card p-3.5 flex items-center gap-3 border border-border/80 bg-slate-900/40">
            <div className={`w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center ${cls}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider truncate">{label}</p>
              <p className={`text-base font-black ${cls} truncate`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-border/60 w-fit">
        {(['suppliers', 'orders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t
                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            {t === 'suppliers' ? `Tedarikçiler (${suppliers.length})` : `Satın Alma (${orders.length})`}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'suppliers' ? 'Tedarikçi ara…' : 'Sipariş no veya tedarikçi ara…'}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
          />
        </div>
        {tab === 'orders' && (
          <div className="flex items-center gap-1">
            {(['all', 'taslak', 'gönderildi', 'teslim_alındı', 'iptal'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                  statusFilter === s
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'border-border/60 text-slate-500 hover:text-foreground hover:border-border'
                }`}
              >
                {s === 'all' ? 'Tümü' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── SUPPLIERS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'suppliers' && (
        <div className="space-y-4">
          {/* Form */}
          <AnimatePresence>
            {showSupForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="premium-card p-6 border border-primary/20 bg-primary/3 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground">
                    {editSupId ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi'}
                  </h3>
                  <button onClick={() => setShowSupForm(false)} className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 hover:text-foreground transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ['name',          'Firma Adı *',       Building2, 'text'],
                    ['contactPerson', 'İletişim Kişisi',   'user',    'text'],
                    ['phone',         'Telefon',           Phone,     'tel'],
                    ['email',         'E-posta',           Mail,      'email'],
                    ['taxNo',         'Vergi Numarası',    FileText,  'text'],
                  ] as [keyof typeof supForm, string, React.ElementType | 'user', string][]).map(([field, label, Icon, type]) => (
                    <div key={field}>
                      <label className="text-xs text-slate-400 mb-1.5 block font-medium">{label}</label>
                      <input
                        type={type}
                        value={supForm[field]}
                        onChange={e => setSupForm(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ödeme Koşulları</label>
                    <select
                      value={supForm.paymentTerms}
                      onChange={e => setSupForm(p => ({ ...p, paymentTerms: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    >
                      {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Adres</label>
                    <input
                      value={supForm.address}
                      onChange={e => setSupForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Şehir, ilçe"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Notlar</label>
                    <textarea
                      value={supForm.notes}
                      onChange={e => setSupForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSupplier}
                    disabled={!supForm.name.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {editSupId ? 'Güncelle' : 'Kaydet'}
                  </button>
                  <button
                    onClick={() => setShowSupForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-800/40 transition-all font-medium"
                  >
                    İptal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supplier list */}
          {filteredSuppliers.length === 0 ? (
            <div className="premium-card p-16 flex flex-col items-center justify-center text-center border border-border/80">
              <Building2 className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-bold">
                {search ? 'Tedarikçi bulunamadı.' : 'Henüz tedarikçi eklenmemiş.'}
              </p>
              {!search && (
                <button onClick={openNewSupplier} className="mt-4 text-xs text-primary font-bold hover:underline">
                  İlk tedarikçiyi ekle →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(s => {
                const supplierOrders = orders.filter(o => o.supplierId === s.id)
                const unpaid = supplierOrders
                  .filter(o => !o.isPaid && o.status !== 'iptal')
                  .reduce((sum, o) => sum + o.items.reduce((is, item) => is + item.quantity * item.unitCost, 0), 0)
                return (
                  <motion.div
                    key={s.id}
                    layout
                    className="premium-card p-5 border border-border/80 bg-slate-900/40 hover:border-primary/30 transition-all duration-200 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary shrink-0">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate text-sm">{s.name}</p>
                          {s.contactPerson && <p className="text-[10px] text-slate-500">{s.contactPerson}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditSupplier(s)} className="p-1.5 rounded-lg border border-transparent hover:bg-slate-800/40 text-slate-500 hover:text-foreground transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 rounded-lg border border-transparent hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400">
                      {s.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{s.email}</span>
                        </div>
                      )}
                      {s.address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-slate-500">
                          <span className="font-bold text-foreground">{supplierOrders.length}</span> sipariş
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800/60 border border-border/40 text-slate-400 font-mono">
                          {s.paymentTerms}
                        </span>
                      </div>
                      {unpaid > 0 && (
                        <span className="text-[10px] font-bold text-red-400">
                          Borç: {fmt(unpaid)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => openNewOrder(s.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Sipariş Ver
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS TAB ────────────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {/* Order form */}
          <AnimatePresence>
            {showOrderForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="premium-card p-6 border border-primary/20 bg-primary/3 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground">
                    {editOrderId ? 'Siparişi Düzenle' : 'Yeni Satın Alma Siparişi'}
                  </h3>
                  <button onClick={() => setShowOrderForm(false)} className="p-1 rounded-lg hover:bg-slate-800/40 text-slate-400 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tedarikçi *</label>
                    <select
                      value={orderForm.supplierId}
                      onChange={e => setOrderForm(p => ({ ...p, supplierId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    >
                      <option value="">Seçin…</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Beklenen Teslim</label>
                    <input
                      type="date"
                      value={orderForm.expectedDate}
                      onChange={e => setOrderForm(p => ({ ...p, expectedDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Notlar</label>
                    <input
                      value={orderForm.notes}
                      onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="İsteğe bağlı"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ürünler *</label>
                    <button
                      onClick={() => setOrderItems(prev => [...prev, { ...EMPTY_ITEM }])}
                      className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Satır Ekle
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <span className="col-span-4">Ürün Adı</span>
                      <span className="col-span-2">SKU</span>
                      <span className="col-span-2">Adet</span>
                      <span className="col-span-3">Birim Maliyet</span>
                      <span className="col-span-1" />
                    </div>
                    {orderItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          value={item.productName}
                          onChange={e => setOrderItems(prev => prev.map((it, idx) => idx === i ? { ...it, productName: e.target.value } : it))}
                          placeholder="Ürün adı"
                          className="col-span-4 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                        <input
                          value={item.sku}
                          onChange={e => setOrderItems(prev => prev.map((it, idx) => idx === i ? { ...it, sku: e.target.value } : it))}
                          placeholder="SKU"
                          className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => setOrderItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Number(e.target.value) } : it))}
                          className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                        <div className="col-span-3 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₺</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitCost}
                            onChange={e => setOrderItems(prev => prev.map((it, idx) => idx === i ? { ...it, unitCost: Number(e.target.value) } : it))}
                            className="w-full pl-6 pr-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                          />
                        </div>
                        <button
                          onClick={() => setOrderItems(prev => prev.filter((_, idx) => idx !== i))}
                          disabled={orderItems.length <= 1}
                          className="col-span-1 flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {/* Total */}
                    <div className="flex justify-end pt-1 pr-8">
                      <p className="text-sm font-black text-foreground">
                        Toplam: {fmt(orderItems.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveOrder}
                    disabled={!orderForm.supplierId || orderItems.every(i => !i.productName.trim())}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {editOrderId ? 'Güncelle' : 'Sipariş Oluştur'}
                  </button>
                  <button
                    onClick={() => setShowOrderForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-800/40 transition-all font-medium"
                  >
                    İptal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Orders table */}
          {filteredOrders.length === 0 ? (
            <div className="premium-card p-16 flex flex-col items-center justify-center text-center border border-border/80">
              <FileText className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 font-bold">
                {search || statusFilter !== 'all' ? 'Sipariş bulunamadı.' : 'Henüz satın alma siparişi yok.'}
              </p>
              {!search && statusFilter === 'all' && (
                <button onClick={() => openNewOrder()} className="mt-4 text-xs text-primary font-bold hover:underline">
                  İlk siparişi oluştur →
                </button>
              )}
            </div>
          ) : (
            <div className="premium-card border border-border/80 bg-slate-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-slate-950/30">
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Sipariş No</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Tedarikçi</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Tarih</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Teslim</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Durum</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Tutar</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Ödeme</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => {
                      const supplier = supplierMap[o.supplierId]
                      const total = o.items.reduce((s, i) => s + i.quantity * i.unitCost, 0)
                      const sc = STATUS_CONFIG[o.status]
                      return (
                        <tr
                          key={o.id}
                          onClick={() => setDetailOrder(o)}
                          className="border-b border-border/40 hover:bg-slate-800/10 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold font-mono text-foreground">{o.orderNo}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-foreground">{supplier?.name ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-slate-500">{o.orderDate}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-slate-500">{o.expectedDate || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-black text-foreground font-mono">{fmt(total)}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <button
                              onClick={e => { e.stopPropagation(); handleTogglePaid(o.id) }}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                o.isPaid
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-border text-transparent hover:border-emerald-500'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditOrder(o)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(o.id)}
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
        </div>
      )}

      {/* ── ORDER DETAIL PANEL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailOrder(null)}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">Satın Alma Siparişi</p>
                    <h3 className="text-lg font-black text-foreground font-mono">{detailOrder.orderNo}</h3>
                  </div>
                  <button
                    onClick={() => setDetailOrder(null)}
                    className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border ${STATUS_CONFIG[detailOrder.status].cls}`}>
                    {STATUS_CONFIG[detailOrder.status].label}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border ${
                    detailOrder.isPaid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {detailOrder.isPaid ? '✓ Ödendi' : '⏳ Ödenmedi'}
                  </span>
                </div>

                {/* Info */}
                <div className="premium-card p-4 space-y-2 border border-border/80 bg-slate-900/40">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tedarikçi</span>
                    <span className="font-bold text-foreground">{supplierMap[detailOrder.supplierId]?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Sipariş Tarihi</span>
                    <span className="font-bold text-foreground">{detailOrder.orderDate}</span>
                  </div>
                  {detailOrder.expectedDate && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Beklenen Teslim</span>
                      <span className="font-bold text-foreground">{detailOrder.expectedDate}</span>
                    </div>
                  )}
                  {detailOrder.notes && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Notlar</span>
                      <span className="font-medium text-foreground text-right max-w-[180px]">{detailOrder.notes}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Ürünler</h4>
                  <div className="space-y-1.5">
                    {detailOrder.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-border/40">
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.productName}</p>
                          {item.sku && <p className="text-[10px] text-slate-500 font-mono">{item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-foreground font-mono">{fmt(item.quantity * item.unitCost)}</p>
                          <p className="text-[10px] text-slate-500">{item.quantity} × {fmt(item.unitCost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40">
                    <span className="text-sm font-black text-slate-400">Toplam</span>
                    <span className="text-lg font-black text-foreground font-mono">
                      {fmt(detailOrder.items.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Durum Güncelle</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['taslak', 'gönderildi', 'teslim_alındı', 'iptal'] as PaperStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(detailOrder.id, s)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          detailOrder.status === s
                            ? STATUS_CONFIG[s].cls
                            : 'border-border/60 text-slate-500 hover:border-border hover:text-foreground'
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleTogglePaid(detailOrder.id)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                      detailOrder.isPaid
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {detailOrder.isPaid ? 'Ödendi olarak işaretlendi' : 'Ödendi olarak işaretle'}
                  </button>

                  <button
                    onClick={() => openEditOrder(detailOrder)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold border border-border/60 text-foreground hover:bg-slate-800/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Siparişi Düzenle
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
