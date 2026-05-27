'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Users, Search, TrendingUp, ShoppingBag, Crown, ArrowUpDown,
  ArrowUp, ArrowDown, RefreshCw, Mail, Phone, MapPin, Package,
  Star, Clock, Award, Filter
} from 'lucide-react'
import api from '@/lib/api'
import { motion } from 'framer-motion'

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function MusterilerPage() {
  const [orders, setOrders] = useState<MktOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [segment, setSegment] = useState<SegmentFilter>('all')

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

                  return (
                    <motion.tr
                      key={c.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-800/30 transition-colors"
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
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground text-xs truncate max-w-[160px]">{c.name}</p>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${seg.cls} shrink-0`}>
                                {seg.label}
                              </span>
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
                      <td className="px-6 py-4 text-right hidden lg:table-cell">
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
    </div>
  )
}
