'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Users, Search, TrendingUp, ShoppingBag, Crown, ArrowUpDown,
  ArrowUp, ArrowDown, RefreshCw, Mail, Phone, MapPin, Package,
  Star, Clock, Award, Filter, X, StickyNote, ChevronRight,
  CheckCircle2, ExternalLink, MessageSquare, CalendarDays, Repeat
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MktOrder {
  id: string
  buyerUserId: string
  recipientName: string
  recipientPhone?: string
  recipientEmail?: string
  shippingCity?: string
  totalAmount: number
  status: string
  createdAt: string
  itemCount: number
}

interface CustomerRow {
  userId: string
  name: string
  phone: string
  email: string
  city: string
  orderCount: number
  totalSpent: number
  avgOrderValue: number
  firstOrderISO: string
  lastOrderISO: string
  isVip: boolean
  segment: 'vip' | 'returning' | 'new'
}

type SortKey = 'name' | 'orderCount' | 'totalSpent' | 'avgOrderValue' | 'lastOrderISO'
type SortDir = 'asc' | 'desc'
type SegmentFilter = 'all' | 'vip' | 'returning' | 'new'

const CRM_NOTES_KEY = 'crm-customer-notes'
const CRM_TAGS_KEY  = 'crm-customer-tags'

const CUSTOMER_TAGS = ['VIP', 'Sorunlu', 'Potansiyel', 'Toptan', 'Sadık', 'Yeni']
const TAG_COLORS: Record<string, string> = {
  VIP:        'bg-amber-500/10 text-amber-400 border-amber-500/25',
  Sorunlu:    'bg-red-500/10 text-red-400 border-red-500/25',
  Potansiyel: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  Toptan:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  Sadık:      'bg-primary/10 text-primary border-primary/25',
  Yeni:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
}

const ORDER_STATUS_TR: Record<string, { label: string; cls: string }> = {
  Pending:   { label: 'Beklemede',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  Paid:      { label: 'Ödendi',     cls: 'bg-primary/10 text-primary border-primary/20' },
  Shipped:   { label: 'Kargoda',    cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  Delivered: { label: 'Teslim',     cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  Cancelled: { label: 'İptal',      cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  Refunded:  { label: 'İade',       cls: 'bg-slate-800 text-slate-400 border-border/80' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MusterilerPage() {
  const [orders, setOrders] = useState<MktOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [segment, setSegment] = useState<SegmentFilter>('all')

  // CRM detail panel
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [crmNotes, setCrmNotes] = useState<Record<string, string>>({})
  const [crmTags, setCrmTags] = useState<Record<string, string[]>>({})
  const [noteInput, setNoteInput] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/api/marketplace/admin/orders?pageSize=1000&page=1')
      .then(r => {
        const items: MktOrder[] = r.data.Items ?? r.data.items ?? []
        setOrders(items.filter(o => o.status !== 'Cancelled'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load CRM data from localStorage
  useEffect(() => {
    try {
      const notes = JSON.parse(localStorage.getItem(CRM_NOTES_KEY) ?? '{}') as Record<string, string>
      const tags  = JSON.parse(localStorage.getItem(CRM_TAGS_KEY)  ?? '{}') as Record<string, string[]>
      setCrmNotes(notes)
      setCrmTags(tags)
    } catch {}
  }, [])

  const openCustomer = useCallback((c: CustomerRow) => {
    setSelectedCustomer(c)
    setNoteInput(crmNotes[c.userId] ?? '')
    setNoteSaved(false)
  }, [crmNotes])

  const handleSaveNote = useCallback(() => {
    if (!selectedCustomer) return
    const next = { ...crmNotes, [selectedCustomer.userId]: noteInput }
    setCrmNotes(next)
    localStorage.setItem(CRM_NOTES_KEY, JSON.stringify(next))
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }, [selectedCustomer, crmNotes, noteInput])

  const handleToggleTag = useCallback((tag: string) => {
    if (!selectedCustomer) return
    const current = crmTags[selectedCustomer.userId] ?? []
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    const nextMap = { ...crmTags, [selectedCustomer.userId]: next }
    setCrmTags(nextMap)
    localStorage.setItem(CRM_TAGS_KEY, JSON.stringify(nextMap))
  }, [selectedCustomer, crmTags])

  // ── Aggregate per customer ────────────────────────────────────────────────
  const customers = useMemo<CustomerRow[]>(() => {
    const map: Record<string, {
      name: string; phone: string; email: string; city: string
      orders: number; spent: number; dates: string[]
    }> = {}

    for (const o of orders) {
      const uid = o.buyerUserId || o.recipientName || 'unknown'
      if (!map[uid]) {
        map[uid] = {
          name: o.recipientName || 'Bilinmiyor',
          phone: o.recipientPhone ?? '',
          email: o.recipientEmail ?? '',
          city: o.shippingCity ?? '',
          orders: 0,
          spent: 0,
          dates: [],
        }
      }
      map[uid].orders += 1
      map[uid].spent += o.totalAmount ?? 0
      map[uid].dates.push(o.createdAt)
      // prefer non-empty values
      if (o.recipientPhone && !map[uid].phone) map[uid].phone = o.recipientPhone
      if (o.recipientEmail && !map[uid].email) map[uid].email = o.recipientEmail
      if (o.shippingCity && !map[uid].city) map[uid].city = o.shippingCity
    }

    const rows = Object.entries(map).map(([uid, d]) => {
      const sorted = d.dates.slice().sort()
      const firstOrder = sorted[0] ?? ''
      const lastOrder = sorted[sorted.length - 1] ?? ''
      return {
        userId: uid,
        name: d.name,
        phone: d.phone,
        email: d.email,
        city: d.city,
        orderCount: d.orders,
        totalSpent: d.spent,
        avgOrderValue: d.orders > 0 ? Math.round(d.spent / d.orders) : 0,
        firstOrderISO: firstOrder,
        lastOrderISO: lastOrder,
        isVip: false,
        segment: d.orders === 1 ? 'new' : 'returning',
      } as CustomerRow
    })

    // Mark top 10% by spend as VIP (minimum 3+ orders)
    const eligible = rows.filter(r => r.orderCount >= 3).sort((a, b) => b.totalSpent - a.totalSpent)
    const vipThreshold = Math.max(1, Math.ceil(eligible.length * 0.1))
    eligible.slice(0, vipThreshold).forEach(r => {
      r.isVip = true
      r.segment = 'vip'
    })

    return rows
  }, [orders])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: customers.length,
    vip: customers.filter(c => c.segment === 'vip').length,
    returning: customers.filter(c => c.segment === 'returning').length,
    newCustomers: customers.filter(c => c.segment === 'new').length,
    avgSpend: customers.length > 0
      ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length)
      : 0,
  }), [customers])

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let rows = customers

    if (segment !== 'all') rows = rows.filter(c => c.segment === segment)

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    }

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name, 'tr')
      if (sortKey === 'orderCount') return dir * (a.orderCount - b.orderCount)
      if (sortKey === 'totalSpent') return dir * (a.totalSpent - b.totalSpent)
      if (sortKey === 'avgOrderValue') return dir * (a.avgOrderValue - b.avgOrderValue)
      if (sortKey === 'lastOrderISO') return dir * a.lastOrderISO.localeCompare(b.lastOrderISO)
      return 0
    })

    return rows
  }, [customers, segment, search, sortKey, sortDir])

  // Customer order history for panel
  const customerOrders = useMemo<MktOrder[]>(() => {
    if (!selectedCustomer) return []
    return orders.filter(o =>
      o.buyerUserId === selectedCustomer.userId ||
      o.recipientName === selectedCustomer.name
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [orders, selectedCustomer])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />
  }

  const SEGMENT_CONFIG = {
    vip:       { label: 'VIP',       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    returning: { label: 'Sadık',     cls: 'bg-primary/10 text-primary border-primary/20' },
    new:       { label: 'Yeni',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" /> Müşteriler
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Mağaza siparişlerinden türetilen müşteri CRM görünümü
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); api.get('/api/marketplace/admin/orders?pageSize=1000&page=1').then(r => { setOrders((r.data.Items ?? r.data.items ?? []).filter((o: MktOrder) => o.status !== 'Cancelled')) }).catch(() => {}).finally(() => setLoading(false)) }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-slate-950/20 text-slate-400 hover:text-white hover:border-primary/45 transition-all text-xs font-bold w-fit disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      {/* Stats */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Toplam Müşteri', value: stats.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'VIP Müşteri', value: stats.vip, icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Sadık Müşteri', value: stats.returning, icon: Star, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Yeni Müşteri', value: stats.newCustomers, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            {
              label: 'Ortalama Harcama',
              value: `₺${stats.avgSpend.toLocaleString('tr-TR')}`,
              icon: ShoppingBag,
              color: 'text-cyan-400',
              bg: 'bg-cyan-500/10'
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider truncate">{label}</p>
                <p className={`text-lg font-black ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim, şehir, telefon veya e-posta ara…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all font-semibold placeholder:text-slate-600"
          />
        </div>

        {/* Segment filter */}
        <div className="flex gap-1.5 p-1 bg-slate-900/40 border border-border/80 rounded-xl w-fit shrink-0">
          {([['all', 'Tümü'], ['vip', 'VIP'], ['returning', 'Sadık'], ['new', 'Yeni']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSegment(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                segment === id
                  ? 'bg-slate-800 text-foreground border border-border/70 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="premium-card border border-border/80">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-border/30 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-800 rounded w-40" />
                  <div className="h-2.5 bg-slate-800/60 rounded w-28" />
                </div>
                <div className="h-4 bg-slate-800 rounded w-20 hidden md:block" />
                <div className="h-4 bg-slate-800 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="premium-card p-16 text-center border border-border/80">
          <Users className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">Henüz mağaza siparişi yok.</p>
          <p className="text-slate-600 text-xs mt-1">Marketplace siparişleri geldikçe müşteri verileri burada görünecek.</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="premium-card p-12 text-center border border-border/80">
          <Search className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">Aramanızla eşleşen müşteri bulunamadı.</p>
        </div>
      ) : (
        <div className="premium-card overflow-hidden border border-border/80">
          <div className="px-6 py-3.5 border-b border-border/80 bg-slate-900/40 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">
              {displayed.length} <span className="text-slate-500 font-semibold">müşteri</span>
              {segment !== 'all' && <span className="text-primary ml-1 text-xs font-bold">({segment === 'vip' ? 'VIP' : segment === 'returning' ? 'Sadık' : 'Yeni'})</span>}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-950/20">
                  <th className="text-left px-6 py-4 font-bold w-[280px]">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-white transition-colors">
                      Müşteri <SortIcon k="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-4 font-bold hidden lg:table-cell">Konum</th>
                  <th className="text-center px-4 py-4 font-bold">
                    <button onClick={() => handleSort('orderCount')} className="flex items-center gap-1.5 hover:text-white transition-colors mx-auto">
                      Sipariş <SortIcon k="orderCount" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-4 font-bold">
                    <button onClick={() => handleSort('totalSpent')} className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto">
                      Toplam Harcama <SortIcon k="totalSpent" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-4 font-bold hidden md:table-cell">
                    <button onClick={() => handleSort('avgOrderValue')} className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto">
                      Ort. Sipariş <SortIcon k="avgOrderValue" />
                    </button>
                  </th>
                  <th className="text-right px-6 py-4 font-bold hidden lg:table-cell">
                    <button onClick={() => handleSort('lastOrderISO')} className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto">
                      Son Sipariş <SortIcon k="lastOrderISO" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {displayed.map((c) => {
                  const seg = SEGMENT_CONFIG[c.segment]
                  const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  const daysSinceLast = c.lastOrderISO
                    ? Math.floor((Date.now() - new Date(c.lastOrderISO).getTime()) / (1000 * 60 * 60 * 24))
                    : null
                  const hasCrmNote = !!crmNotes[c.userId]
                  const hasCrmTags = (crmTags[c.userId]?.length ?? 0) > 0
                  const isSelected = selectedCustomer?.userId === c.userId

                  return (
                    <motion.tr
                      key={c.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => openCustomer(c)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-slate-800/30'}`}
                    >
                      {/* Customer info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            c.segment === 'vip'       ? 'bg-amber-500/15 border-amber-500/20 text-amber-400' :
                            c.segment === 'returning' ? 'bg-primary/10 border-primary/20 text-primary' :
                                                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {c.segment === 'vip'
                              ? <Crown className="w-4 h-4" />
                              : <span className="text-[11px] font-black">{initials}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-foreground text-xs truncate max-w-[140px]">{c.name}</p>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${seg.cls} shrink-0`}>
                                {seg.label}
                              </span>
                              {hasCrmNote && <StickyNote className="w-3 h-3 text-amber-400 shrink-0" aria-label="Not var" />}
                              {hasCrmTags && <MessageSquare className="w-3 h-3 text-violet-400 shrink-0" aria-label="Etiket var" />}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {c.phone && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                  <Phone className="w-2.5 h-2.5" />{c.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* City */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {c.city ? (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-600" />
                            {c.city}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Order count */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3 h-3 text-slate-500" />
                          <span className="font-black text-foreground font-mono text-xs">{c.orderCount}</span>
                        </div>
                      </td>

                      {/* Total spent */}
                      <td className="px-4 py-4 text-right">
                        <span className={`font-black font-mono text-sm ${
                          c.segment === 'vip' ? 'text-amber-400' :
                          c.segment === 'returning' ? 'text-primary' : 'text-foreground'
                        }`}>
                          ₺{c.totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Avg order value */}
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <span className="text-slate-400 font-mono font-semibold text-xs">
                          ₺{c.avgOrderValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Last order */}
                      <td className="px-4 py-4 text-right hidden lg:table-cell">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 font-mono">
                            {c.lastOrderISO ? new Date(c.lastOrderISO).toLocaleDateString('tr-TR') : '—'}
                          </p>
                          {daysSinceLast !== null && (
                            <p className={`text-[10px] font-bold mt-0.5 ${
                              daysSinceLast > 90 ? 'text-red-400' :
                              daysSinceLast > 30 ? 'text-amber-400' : 'text-slate-500'
                            }`}>
                              {daysSinceLast === 0 ? 'Bugün' : `${daysSinceLast}g önce`}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Open detail arrow */}
                      <td className="px-4 py-4 text-right">
                        <ChevronRight className={`w-4 h-4 ml-auto transition-colors ${isSelected ? 'text-primary' : 'text-slate-600 group-hover:text-slate-400'}`} />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border/40 bg-slate-950/10 flex items-center justify-between">
            <p className="text-[10px] text-slate-600 font-semibold">
              Veriler marketplace siparişlerinden türetilmiştir. İptal edilen siparişler dahil değildir.
            </p>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              {(['vip', 'returning', 'new'] as const).map(s => {
                const conf = SEGMENT_CONFIG[s]
                return (
                  <span key={s} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${conf.cls}`}>
                    {conf.label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CRM Detail Panel ── */}
      <AnimatePresence>
        {selectedCustomer && (() => {
          const c = selectedCustomer
          const seg = SEGMENT_CONFIG[c.segment]
          const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
          const tags = crmTags[c.userId] ?? []
          const noteVal = crmNotes[c.userId] ?? ''

          return (
            <>
              {/* Backdrop */}
              <motion.div
                key="crm-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCustomer(null)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              />

              {/* Panel */}
              <motion.div
                key="crm-panel"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-0 right-0 h-full z-50 w-full max-w-md bg-slate-900 border-l border-border/80 shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Panel header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-border/60 bg-slate-950/60 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border text-sm font-black shrink-0 ${
                      c.segment === 'vip'       ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' :
                      c.segment === 'returning' ? 'bg-primary/12 border-primary/25 text-primary' :
                                                  'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    }`}>
                      {c.segment === 'vip' ? <Crown className="w-5 h-5" /> : initials}
                    </div>
                    <div>
                      <p className="font-black text-foreground text-sm">{c.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${seg.cls}`}>
                        {seg.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                  {/* Contact info */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">İletişim</h3>
                    <div className="space-y-1.5">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors group">
                          <Phone className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary transition-colors" />
                          <span className="text-xs font-semibold text-foreground">{c.phone}</span>
                          <ExternalLink className="w-3 h-3 text-slate-600 ml-auto group-hover:text-primary transition-colors" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/20">
                          <Phone className="w-3.5 h-3.5 text-slate-700" />
                          <span className="text-xs text-slate-600">Telefon yok</span>
                        </div>
                      )}
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors group">
                          <Mail className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary transition-colors" />
                          <span className="text-xs font-semibold text-foreground truncate">{c.email}</span>
                          <ExternalLink className="w-3 h-3 text-slate-600 ml-auto group-hover:text-primary transition-colors" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/20">
                          <Mail className="w-3.5 h-3.5 text-slate-700" />
                          <span className="text-xs text-slate-600">E-posta yok</span>
                        </div>
                      )}
                      {c.city && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/20">
                          <MapPin className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-xs text-slate-400 font-semibold">{c.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats strip */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Sipariş', value: c.orderCount, icon: Package, color: 'text-primary' },
                      { label: 'Toplam', value: `₺${Math.round(c.totalSpent).toLocaleString('tr-TR')}`, icon: ShoppingBag, color: 'text-emerald-400' },
                      { label: 'Ort. Sipariş', value: `₺${c.avgOrderValue.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-cyan-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="premium-card p-3 text-center border border-border/60">
                        <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                        <p className={`text-sm font-black ${color}`}>{value}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Date info */}
                  <div className="flex gap-3">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-slate-800/30 space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">İlk Sipariş</p>
                      <p className="text-xs font-bold text-slate-400">
                        {c.firstOrderISO ? new Date(c.firstOrderISO).toLocaleDateString('tr-TR') : '—'}
                      </p>
                    </div>
                    <div className="flex-1 px-3 py-2 rounded-xl bg-slate-800/30 space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Son Sipariş</p>
                      <p className="text-xs font-bold text-slate-400">
                        {c.lastOrderISO ? new Date(c.lastOrderISO).toLocaleDateString('tr-TR') : '—'}
                      </p>
                    </div>
                  </div>

                  {/* CRM Tags */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Etiketler</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {CUSTOMER_TAGS.map(tag => {
                        const active = tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => handleToggleTag(tag)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                              active
                                ? (TAG_COLORS[tag] ?? 'bg-primary/10 text-primary border-primary/25')
                                : 'bg-transparent text-slate-500 border-border/60 hover:border-border hover:text-slate-300'
                            }`}
                          >
                            {active ? '✓ ' : ''}{tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* CRM Notes */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <StickyNote className="w-3 h-3" /> Müşteri Notları
                    </h3>
                    <textarea
                      value={noteInput}
                      onChange={e => { setNoteInput(e.target.value); setNoteSaved(false) }}
                      placeholder="Bu müşteri hakkında not ekle… (ör. tercihler, özel indirim, kargo notu)"
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-border/70 text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none placeholder:text-slate-600 transition-all"
                    />
                    <button
                      onClick={handleSaveNote}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        noteSaved
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                      }`}
                    >
                      {noteSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StickyNote className="w-3.5 h-3.5" />}
                      {noteSaved ? 'Kaydedildi!' : 'Notu Kaydet'}
                    </button>
                    {noteVal && noteVal !== noteInput && (
                      <p className="text-[10px] text-slate-600 font-semibold">
                        Son kayıt: {noteVal.slice(0, 60)}{noteVal.length > 60 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  {/* Order history */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Repeat className="w-3 h-3" /> Sipariş Geçmişi
                      </span>
                      <span className="text-slate-600 normal-case font-semibold">{customerOrders.length} sipariş</span>
                    </h3>
                    {customerOrders.length === 0 ? (
                      <div className="py-6 text-center">
                        <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-600 font-semibold">Sipariş geçmişi bulunamadı.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {customerOrders.map(o => {
                          const st = ORDER_STATUS_TR[o.status] ?? { label: o.status, cls: 'bg-slate-800 text-slate-400 border-border/80' }
                          return (
                            <div key={o.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold text-slate-400">
                                    {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-mono truncate max-w-[120px]">#{o.id.slice(0, 8)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${st.cls}`}>
                                  {st.label}
                                </span>
                                <span className="text-xs font-black text-foreground font-mono">
                                  ₺{(o.totalAmount ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel footer */}
                <div className="px-6 py-4 border-t border-border/60 bg-slate-950/40 shrink-0">
                  <Link
                    href="/dashboard/marketplace-orders"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold border border-primary/20"
                  >
                    <Package className="w-3.5 h-3.5" /> Tüm Siparişleri Gör
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            </>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
