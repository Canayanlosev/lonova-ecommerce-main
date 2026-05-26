'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Tooltip as ReTooltip,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, CreditCard,
  Package, RefreshCw, Minus, Download
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

interface Order {
  id: string
  totalAmount: number
  status: string
  paymentStatus: string
  buyerUserId: string
  createdAt: string
  items: OrderItem[]
}

interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

interface TopProduct {
  productId: string
  name: string
  quantity: number
  revenue: number
}

interface StatusCount {
  name: string
  value: number
  color: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Pending:    { label: 'Bekleyen',   color: '#f59e0b' },
  Confirmed:  { label: 'Onaylandı', color: 'var(--color-secondary)' },
  Processing: { label: 'İşlemde',   color: 'var(--color-secondary)' },
  Shipped:    { label: 'Kargoda',   color: 'var(--color-primary)' },
  Delivered:  { label: 'Teslim',    color: '#22c55e' },
  Cancelled:  { label: 'İptal',     color: '#ef4444' },
  Refunded:   { label: 'İade',      color: '#ec4899' },
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  const pct = previous === 0
    ? (current > 0 ? 100 : 0)
    : Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
      <Minus className="w-2.5 h-2.5" /> 0%
    </span>
  )
  const up = pct > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

function StatCard({
  icon, label, value, sub, color, prev, curr
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
  prev?: number
  curr?: number
}) {
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
        {prev !== undefined && curr !== undefined && (
          <DeltaBadge current={curr} previous={prev} />
        )}
      </div>
    </div>
  )
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: StatusCount }> }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-lg backdrop-blur-md">
      <p className="font-semibold" style={{ color: d.payload.color }}>{d.name}</p>
      <p className="text-slate-300">{d.value} sipariş</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { token } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<30 | 7>(30)

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/marketplace/admin/orders?pageSize=500&page=1')
      setOrders(res.data.Items ?? res.data.items ?? [])
    } catch {
      setError('Veriler yüklenemedi. API\'ye erişim sağlanamıyor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadOrders()
  }, [token])

  // ── Date cutoffs ────────────────────────────────────────────────────────────
  const now = useMemo(() => new Date(), [])

  const cutoff = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period, now])

  const prevCutoff = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - period * 2)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period, now])

  // ── Current period ──────────────────────────────────────────────────────────
  const periodOrders = useMemo(
    () => orders.filter(o => new Date(o.createdAt) >= cutoff),
    [orders, cutoff]
  )

  const paidOrders = useMemo(
    () => periodOrders.filter(o =>
      o.paymentStatus === 'Paid' || o.paymentStatus === 'Refunded' ||
      ['Shipped', 'Delivered', 'Processing'].includes(o.status)
    ),
    [periodOrders]
  )

  // ── Previous period (for comparison) ───────────────────────────────────────
  const prevPeriodOrders = useMemo(
    () => orders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= prevCutoff && d < cutoff
    }),
    [orders, prevCutoff, cutoff]
  )

  const prevPaidOrders = useMemo(
    () => prevPeriodOrders.filter(o =>
      o.paymentStatus === 'Paid' || o.paymentStatus === 'Refunded' ||
      ['Shipped', 'Delivered', 'Processing'].includes(o.status)
    ),
    [prevPeriodOrders]
  )

  // ── KPI values ──────────────────────────────────────────────────────────────
  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
  const prevRevenue = prevPaidOrders.reduce((s, o) => s + o.totalAmount, 0)

  const totalOrders = periodOrders.length
  const prevTotalOrders = prevPeriodOrders.length

  const avgBasket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
  const prevAvgBasket = prevPaidOrders.length > 0 ? prevRevenue / prevPaidOrders.length : 0

  const uniqueBuyers = new Set(periodOrders.map(o => o.buyerUserId)).size
  const prevUniqueBuyers = new Set(prevPeriodOrders.map(o => o.buyerUserId)).size

  // ── Status distribution ─────────────────────────────────────────────────────
  const statusCounts = useMemo((): StatusCount[] => {
    const map: Record<string, number> = {}
    for (const o of periodOrders) {
      map[o.status] = (map[o.status] ?? 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([status, value]) => ({
        name: STATUS_MAP[status]?.label ?? status,
        value,
        color: STATUS_MAP[status]?.color ?? '#64748b',
      }))
  }, [periodOrders])

  // ── Daily revenue chart ─────────────────────────────────────────────────────
  const dailyData = useMemo((): DailyRevenue[] => {
    const map: Record<string, DailyRevenue> = {}
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map[key] = { date: key, revenue: 0, orders: 0 }
    }
    for (const o of paidOrders) {
      const key = o.createdAt.slice(0, 10)
      if (map[key]) {
        map[key].revenue += o.totalAmount
        map[key].orders += 1
      }
    }
    return Object.values(map).map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    }))
  }, [paidOrders, period, now])

  // ── Top 5 products ──────────────────────────────────────────────────────────
  const topProducts = useMemo((): TopProduct[] => {
    const map: Record<string, TopProduct> = {}
    for (const o of paidOrders) {
      for (const item of (o.items ?? [])) {
        if (!map[item.productId]) {
          map[item.productId] = { productId: item.productId, name: item.productName, quantity: 0, revenue: 0 }
        }
        map[item.productId].quantity += item.quantity
        map[item.productId].revenue += item.unitPrice * item.quantity
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [paidOrders])

  // ── Hourly order distribution ───────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${h.toString().padStart(2, '0')}:00`, count: 0 }))
    for (const o of periodOrders) {
      const h = new Date(o.createdAt).getHours()
      hours[h].count += 1
    }
    return hours
  }, [periodOrders])

  const peakHour = useMemo(() => {
    if (hourlyData.every(h => h.count === 0)) return null
    return hourlyData.reduce((max, h) => h.count > max.count ? h : max)
  }, [hourlyData])

  // ── Day-of-week revenue ─────────────────────────────────────────────────────
  const DOW_LABELS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  const dowData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i], orders: 0, revenue: 0 }))
    for (const o of paidOrders) {
      const d = new Date(o.createdAt).getDay() // 0=Sun
      buckets[d].orders += 1
      buckets[d].revenue += o.totalAmount
    }
    return buckets
  }, [paidOrders])

  // ── Revenue forecast (14-day moving avg → 30-day projection) ───────────────
  const forecast = useMemo(() => {
    if (paidOrders.length === 0) return null
    // Use last 14 days of paid orders for baseline
    const baseline = new Date(now)
    baseline.setDate(baseline.getDate() - 14)
    const last14 = paidOrders.filter(o => new Date(o.createdAt) >= baseline)
    if (last14.length === 0) return null
    const dailyAvg = last14.reduce((s, o) => s + o.totalAmount, 0) / 14
    const proj7  = dailyAvg * 7
    const proj30 = dailyAvg * 30
    // Week-over-week: compare last 7 vs prev 7 daily avg
    const last7cut = new Date(now); last7cut.setDate(last7cut.getDate() - 7)
    const prev7cut = new Date(now); prev7cut.setDate(prev7cut.getDate() - 14)
    const last7rev = paidOrders.filter(o => new Date(o.createdAt) >= last7cut).reduce((s, o) => s + o.totalAmount, 0) / 7
    const prev7rev = paidOrders.filter(o => new Date(o.createdAt) >= prev7cut && new Date(o.createdAt) < last7cut).reduce((s, o) => s + o.totalAmount, 0) / 7
    const wowChange = prev7rev > 0 ? Math.round(((last7rev - prev7rev) / prev7rev) * 100) : null
    return { dailyAvg, proj7, proj30, wowChange }
  }, [paidOrders, now])

  // ── Product performance: current vs previous period ──────────────────────
  const productPerformance = useMemo(() => {
    const prevMap: Record<string, number> = {}
    for (const o of prevPaidOrders) {
      for (const item of (o.items ?? [])) {
        prevMap[item.productId] = (prevMap[item.productId] ?? 0) + item.quantity
      }
    }
    const currMap: Record<string, { name: string; qty: number }> = {}
    for (const o of paidOrders) {
      for (const item of (o.items ?? [])) {
        if (!currMap[item.productId]) currMap[item.productId] = { name: item.productName, qty: 0 }
        currMap[item.productId].qty += item.quantity
      }
    }
    return Object.entries(currMap)
      .map(([id, { name, qty }]) => {
        const prevQty = prevMap[id] ?? 0
        const change = prevQty > 0 ? Math.round(((qty - prevQty) / prevQty) * 100) : null
        return { id, name, qty, prevQty, change }
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [paidOrders, prevPaidOrders])

  // ── New vs Returning buyers ─────────────────────────────────────────────────
  const buyerSegmentation = useMemo(() => {
    // Buyers who ordered BEFORE the current period (in prevPeriodOrders or earlier)
    const prevBuyerIds = new Set(
      orders
        .filter(o => new Date(o.createdAt) < cutoff)
        .map(o => o.buyerUserId)
    )
    let newBuyers = 0, returningBuyers = 0
    const seen = new Set<string>()
    for (const o of periodOrders) {
      if (seen.has(o.buyerUserId)) continue
      seen.add(o.buyerUserId)
      if (prevBuyerIds.has(o.buyerUserId)) returningBuyers++
      else newBuyers++
    }
    return { newBuyers, returningBuyers }
  }, [orders, periodOrders, cutoff])

  const fmt = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

  const handleExportCsv = () => {
    const rows: string[][] = [
      ['Sipariş ID', 'Tarih', 'Durum', 'Ödeme Durumu', 'Tutar (₺)', 'Ürün Adı', 'Adet', 'Birim Fiyat'],
    ]
    for (const o of periodOrders) {
      const dateStr = new Date(o.createdAt).toLocaleDateString('tr-TR')
      const statusLabel = STATUS_MAP[o.status]?.label ?? o.status
      if (o.items && o.items.length > 0) {
        for (const item of o.items) {
          rows.push([
            o.id.slice(0, 8).toUpperCase(),
            dateStr,
            statusLabel,
            o.paymentStatus,
            o.totalAmount.toFixed(2),
            item.productName ?? '',
            item.quantity.toString(),
            item.unitPrice.toFixed(2),
          ])
        }
      } else {
        rows.push([
          o.id.slice(0, 8).toUpperCase(),
          dateStr,
          statusLabel,
          o.paymentStatus,
          o.totalAmount.toFixed(2),
          '', '', '',
        ])
      }
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analitik-son${period}gun-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Satış Analitik</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Gelir, sipariş ve ürün performansı
            {!loading && prevPeriodOrders.length > 0 && (
              <span className="ml-2 text-xs text-slate-500">
                (Önceki {period} gün ile karşılaştırılıyor)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
            {([7, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Son {p} Gün
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={loading || periodOrders.length === 0}
            title="CSV olarak indir"
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="premium-card p-4 border-l-4 border-red-500 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* KPI Cards with period comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-primary" />}
          label="Toplam Gelir"
          value={loading ? '...' : fmt(totalRevenue)}
          sub={`Son ${period} gün`}
          color="bg-primary/10"
          curr={totalRevenue}
          prev={prevRevenue}
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-emerald-400" />}
          label="Sipariş Sayısı"
          value={loading ? '...' : totalOrders.toString()}
          sub={`${paidOrders.length} ödendi`}
          color="bg-emerald-500/10"
          curr={totalOrders}
          prev={prevTotalOrders}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
          label="Ortalama Sepet"
          value={loading ? '...' : fmt(avgBasket)}
          sub="Ödenen sipariş başına"
          color="bg-violet-500/10"
          curr={avgBasket}
          prev={prevAvgBasket}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-amber-400" />}
          label="Aktif Alıcı"
          value={loading ? '...' : uniqueBuyers.toString()}
          sub="Tekil sipariş veren"
          color="bg-amber-500/10"
          curr={uniqueBuyers}
          prev={prevUniqueBuyers}
        />
      </div>

      {/* Revenue chart + Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart — 2 cols */}
        <div className="premium-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Günlük Gelir — Son {period} Gün
          </h2>
          {loading ? (
            <div className="h-52 bg-slate-800 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={period === 30 ? 4 : 0}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v) => [fmt(v as number), 'Gelir']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status distribution — 1 col */}
        <div className="premium-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Sipariş Durumu Dağılımı
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />)}
            </div>
          ) : statusCounts.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-slate-500 text-sm">
              Bu dönem sipariş yok
            </div>
          ) : (
            <div className="space-y-1">
              {/* Stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {statusCounts.map(s => (
                  <div
                    key={s.name}
                    style={{
                      width: `${(s.value / periodOrders.length) * 100}%`,
                      backgroundColor: s.color
                    }}
                    title={`${s.name}: ${s.value}`}
                  />
                ))}
              </div>
              {statusCounts.map(s => (
                <div key={s.name} className="flex items-center gap-3 py-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-slate-400 flex-1">{s.name}</span>
                  <span className="text-xs font-semibold text-foreground">{s.value}</span>
                  <span className="text-xs text-slate-500 w-10 text-right">
                    {Math.round((s.value / periodOrders.length) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pie chart — compact */}
          {!loading && statusCounts.length > 0 && (
            <div className="mt-4 -mb-2">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {statusCounts.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="premium-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> En Çok Satan 5 Ürün
        </h2>
        {loading ? (
          <div className="h-52 bg-slate-800 rounded-xl animate-pulse" />
        ) : topProducts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Bu dönem için satış verisi bulunamadı.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={130}
                tickFormatter={(v: string) => v.length > 18 ? `${v.slice(0, 18)}…` : v}
              />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v, name) => [
                  name === 'revenue' ? fmt(v as number) : `${v} adet`,
                  name === 'revenue' ? 'Gelir' : 'Adet'
                ]}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                label={{
                  position: 'right',
                  fill: '#64748b',
                  fontSize: 10,
                  formatter: (v: unknown) => fmt(v as number)
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hourly order distribution */}
      {!loading && periodOrders.length > 0 && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Saatlik Sipariş Yoğunluğu
            </h2>
            {peakHour && (
              <span className="text-xs text-slate-400 font-medium">
                En yoğun saat: <span className="text-primary font-bold">{peakHour.hour}</span>
                <span className="ml-1">({peakHour.count} sipariş)</span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#64748b', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval={3}
                tickFormatter={(v: string) => v.replace(':00', '')}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                formatter={(v: unknown) => [String(v), 'Sipariş']}
                labelFormatter={(label) => `Saat ${label}`}
              />
              <Bar
                dataKey="count"
                radius={[3, 3, 0, 0]}
                fill="hsl(var(--primary))"
                maxBarSize={20}
                label={false}
              >
                {hourlyData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={peakHour && entry.hour === peakHour.hour
                      ? 'hsl(var(--primary))'
                      : `hsla(var(--primary), ${Math.max(0.2, entry.count / (peakHour?.count || 1))})`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Müşterileriniz en çok hangi saatlerde sipariş veriyor? Kampanyalarınızı buna göre planlayın.
          </p>
        </div>
      )}

      {/* Day-of-week revenue distribution */}
      {!loading && paidOrders.length > 0 && (
        <div className="premium-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Haftalık Satış Dağılımı</h2>
          <p className="text-xs text-slate-500 mb-4">Hangi günler daha fazla sipariş ve gelir geliyor?</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dowData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `₺${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => [
                  (v as number).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }),
                  'Gelir'
                ]}
                labelFormatter={(label) => `${label} günü`}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          {/* Best & worst day summary */}
          {dowData.some(d => d.revenue > 0) && (() => {
            const sorted = [...dowData].filter(d => d.revenue > 0).sort((a, b) => b.revenue - a.revenue)
            const best = sorted[0]
            const worst = sorted[sorted.length - 1]
            return (
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span>🏆 En iyi gün: <span className="text-emerald-400 font-semibold">{best.day}</span> — {best.revenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</span>
                <span>📉 En düşük: <span className="text-slate-500 font-semibold">{worst.day}</span></span>
              </div>
            )
          })()}
        </div>
      )}

      {/* New vs Returning buyers */}
      {!loading && periodOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="premium-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Yeni Alıcılar</p>
              <p className="text-2xl font-bold text-foreground">{buyerSegmentation.newBuyers}</p>
              <p className="text-xs text-slate-500 mt-1">
                {uniqueBuyers > 0 ? Math.round((buyerSegmentation.newBuyers / uniqueBuyers) * 100) : 0}% toplam alıcı
              </p>
            </div>
          </div>
          <div className="premium-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Tekrar Eden Alıcılar</p>
              <p className="text-2xl font-bold text-foreground">{buyerSegmentation.returningBuyers}</p>
              <p className="text-xs text-slate-500 mt-1">
                {uniqueBuyers > 0 ? Math.round((buyerSegmentation.returningBuyers / uniqueBuyers) * 100) : 0}% toplam alıcı
              </p>
              {buyerSegmentation.returningBuyers > 0 && (
                <p className="text-[11px] text-emerald-400 font-medium mt-0.5">Sadık müşteri tabanı güçlü 🎯</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Forecast */}
      {!loading && forecast && (
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-foreground">Gelir Tahmini</h2>
            <span className="text-xs text-slate-500 ml-auto">Son 14 gün ortalamasına göre</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-border">
              <p className="text-xs text-slate-400 mb-1">Günlük Ortalama</p>
              <p className="text-xl font-black text-foreground">{fmt(forecast.dailyAvg)}</p>
              {forecast.wowChange !== null && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 ${forecast.wowChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {forecast.wowChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {forecast.wowChange >= 0 ? '+' : ''}{forecast.wowChange}% hafta/hafta
                </span>
              )}
            </div>
            <div className="p-4 rounded-xl bg-primary/8 border border-primary/20">
              <p className="text-xs text-slate-400 mb-1">Önümüzdeki 7 Gün</p>
              <p className="text-xl font-black text-primary">{fmt(forecast.proj7)}</p>
              <p className="text-xs text-slate-500 mt-1">tahmini gelir</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <p className="text-xs text-slate-400 mb-1">Aylık Projeksiyon</p>
              <p className="text-xl font-black text-emerald-400">{fmt(forecast.proj30)}</p>
              <p className="text-xs text-slate-500 mt-1">30 günlük tahmini gelir</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3">⚠️ Tahminler geçmiş veri ortalamasına dayalıdır. Gerçek değerler farklılık gösterebilir.</p>
        </div>
      )}

      {/* Product Performance Comparison */}
      {!loading && productPerformance.length > 0 && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Ürün Performansı</h2>
            </div>
            <span className="text-xs text-slate-500">Mevcut vs. önceki dönem</span>
          </div>
          <div className="space-y-3">
            {productPerformance.map((p, i) => {
              const maxQty = productPerformance[0].qty
              const pct = maxQty > 0 ? (p.qty / maxQty) * 100 : 0
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-4 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-foreground truncate max-w-[60%]">{p.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">{p.qty} adet</span>
                        {p.change !== null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.change > 0 ? 'bg-emerald-500/15 text-emerald-400' : p.change < 0 ? 'bg-red-500/15 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                            {p.change > 0 ? '+' : ''}{p.change}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="premium-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Son Siparişler</h2>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : periodOrders.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Bu dönem sipariş yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-border">
                  <th className="text-left pb-2 font-medium">Sipariş No</th>
                  <th className="text-left pb-2 font-medium">Tarih</th>
                  <th className="text-left pb-2 font-medium">Durum</th>
                  <th className="text-right pb-2 font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periodOrders.slice(0, 20).map(o => {
                  const sc = STATUS_MAP[o.status]
                  return (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-mono text-xs text-slate-400">{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-2.5 text-slate-400 text-xs">
                        {new Date(o.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg font-medium"
                          style={{
                            backgroundColor: `${sc?.color ?? '#64748b'}18`,
                            color: sc?.color ?? '#94a3b8',
                          }}
                        >
                          {sc?.label ?? o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-foreground">
                        {fmt(o.totalAmount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {periodOrders.length > 20 && (
              <p className="text-xs text-slate-500 text-center mt-3">{periodOrders.length - 20} sipariş daha var</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
