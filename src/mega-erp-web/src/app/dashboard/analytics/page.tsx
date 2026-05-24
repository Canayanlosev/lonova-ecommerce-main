'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Tooltip as ReTooltip,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, CreditCard,
  Package, RefreshCw, Minus
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
  Confirmed:  { label: 'Onaylandı', color: '#8b5cf6' },
  Processing: { label: 'İşlemde',   color: '#6366f1' },
  Shipped:    { label: 'Kargoda',   color: '#0ea5e9' },
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
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs shadow-lg">
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

  const fmt = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

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
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
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
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
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
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
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
