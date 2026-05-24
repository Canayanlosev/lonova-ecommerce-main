'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, ShoppingCart, Users, CreditCard, Package, RefreshCw } from 'lucide-react'
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

function StatCard({
  icon, label, value, sub, color
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
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
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
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
      // Load all pages
      const res = await api.get('/api/marketplace/admin/orders?pageSize=200&page=1')
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

  // ── Computed analytics ─────────────────────────────────────────────────────

  const now = new Date()
  const cutoff = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const periodOrders = useMemo(
    () => orders.filter(o => new Date(o.createdAt) >= cutoff),
    [orders, cutoff]
  )

  const paidOrders = useMemo(
    () => periodOrders.filter(o => o.paymentStatus === 'Paid' || o.paymentStatus === 'Refunded' || ['Shipped', 'Delivered', 'Processing'].includes(o.status)),
    [periodOrders]
  )

  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0)
  const totalOrders = periodOrders.length
  const avgBasket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
  const uniqueBuyers = new Set(periodOrders.map(o => o.buyerUserId)).size

  // Daily revenue chart
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
  }, [paidOrders, period])

  // Top 5 products
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
          <p className="text-slate-400 text-sm mt-0.5">Gelir, sipariş ve ürün performansı</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period toggle */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-primary" />}
          label="Toplam Gelir"
          value={loading ? '...' : fmt(totalRevenue)}
          sub={`Son ${period} gün`}
          color="bg-primary/10"
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-emerald-400" />}
          label="Sipariş Sayısı"
          value={loading ? '...' : totalOrders.toString()}
          sub={`${paidOrders.length} ödendi`}
          color="bg-emerald-500/10"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
          label="Ortalama Sepet"
          value={loading ? '...' : fmt(avgBasket)}
          sub="Ödenen sipariş başına"
          color="bg-violet-500/10"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-amber-400" />}
          label="Aktif Alıcı"
          value={loading ? '...' : uniqueBuyers.toString()}
          sub="Tekil sipariş veren"
          color="bg-amber-500/10"
        />
      </div>

      {/* Revenue chart */}
      <div className="premium-card p-6">
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
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 10, formatter: (v: unknown) => fmt(v as number) }} />
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
                {periodOrders.slice(0, 20).map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-slate-400">{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="py-2.5 text-slate-400 text-xs">
                      {new Date(o.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${
                        o.status === 'Delivered' ? 'bg-green-500/15 text-green-400' :
                        o.status === 'Cancelled' ? 'bg-red-500/15 text-red-400' :
                        o.status === 'Shipped' ? 'bg-cyan-500/15 text-cyan-400' :
                        'bg-primary/15 text-primary'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-foreground">
                      {fmt(o.totalAmount)}
                    </td>
                  </tr>
                ))}
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
