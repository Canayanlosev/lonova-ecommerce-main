'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp, ShoppingBag, DollarSign, Package,
  AlertTriangle, BookOpen, Plus, ArrowRight, CheckCircle2,
  Clock, Warehouse, Store, Target, Edit3, Check, X, Users
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ordersService } from '@/lib/services/orders.service';
import { productsService } from '@/lib/services/products.service';
import api from '@/lib/api';
import type { Order } from '@/types/api.types';
import { useAuthStore } from '@/store/auth.store';

interface DayStats { date: string; orders: number; revenue: number }
interface StockDto { productId: string; binId: string; quantity: number; minStockLevel: number; isLowStock: boolean }
interface MktOrder { id: string; totalAmount: number; status: string; paymentStatus: string; createdAt: string; itemCount: number; recipientName: string }

const MKT_STATUS: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'Beklemede',     cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  Processing: { label: 'İşleniyor',     cls: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  Confirmed:  { label: 'Onaylandı',     cls: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  Shipped:    { label: 'Kargoda',       cls: 'bg-primary/10 text-primary border border-primary/20' },
  Delivered:  { label: 'Teslim Edildi', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Cancelled:  { label: 'İptal',         cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  Delivered:  { label: 'Teslim Edildi', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Shipped:    { label: 'Kargoda',       cls: 'bg-primary/10 text-primary border border-primary/20' },
  Paid:       { label: 'Ödendi',        cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  Cancelled:  { label: 'İptal',         cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  Pending:    { label: 'Beklemede',     cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  Processing: { label: 'İşleniyor',     cls: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
}

function buildLast7Days(orders: Order[]): DayStats[] {
  const days: DayStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.orderDate?.slice(0, 10) === dateStr);
    days.push({
      date: label,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    });
  }
  return days;
}

function buildToday(orders: Order[]) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.orderDate?.slice(0, 10) === todayISO);
  return {
    count: todayOrders.length,
    revenue: todayOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    pending: orders.filter(o => o.status === 'Pending').length,
    readyToShip: orders.filter(o => o.status === 'Paid').length,
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [chartData, setChartData] = useState<DayStats[]>([]);
  const [lowStock, setLowStock] = useState<StockDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertTab, setAlertTab] = useState<'stock' | 'accounting'>('stock');

  // Marketplace orders
  const [mktOrders, setMktOrders] = useState<MktOrder[]>([]);
  const [mktLoading, setMktLoading] = useState(true);

  // Product name map for resolving IDs → names
  const [productNameMap, setProductNameMap] = useState<Record<string, string>>({})

  // Monthly target (persisted in localStorage)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0)
  const [targetInput, setTargetInput] = useState('')
  const [editingTarget, setEditingTarget] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? Number(localStorage.getItem('monthly-target')) || 0 : 0
    setMonthlyTarget(saved)
  }, [])

  useEffect(() => {
    Promise.all([
      ordersService.getAll().catch(() => [] as Order[]),
      productsService.getAll().catch(() => []),
      api.get('/api/wms/stock').then(r => r.data as StockDto[]).catch(() => [] as StockDto[]),
    ]).then(([ord, prods, stock]) => {
      setOrders(ord);
      setProductCount(prods.length);
      setChartData(buildLast7Days(ord));
      setLowStock(stock.filter(s => s.isLowStock));
      // Build product name map
      const map: Record<string, string> = {}
      for (const p of prods) { if (p.id) map[p.id] = p.name }
      setProductNameMap(map)
    }).finally(() => setLoading(false));

    // Marketplace orders (separate, non-blocking)
    api.get('/api/marketplace/admin/orders?pageSize=200&page=1')
      .then(r => {
        const items = r.data.Items ?? r.data.items ?? []
        setMktOrders(items)
      })
      .catch(() => {})
      .finally(() => setMktLoading(false))
  }, []);

  const today = useMemo(() => buildToday(orders), [orders]);
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const recentOrders = [...orders]
    .sort((a, b) => (b.orderDate ?? '').localeCompare(a.orderDate ?? ''))
    .slice(0, 5);

  // Marketplace stats
  const mktTodayISO = new Date().toISOString().slice(0, 10);
  const mktTodayOrders = mktOrders.filter(o => o.createdAt?.slice(0, 10) === mktTodayISO);
  const mktTodayRevenue = mktTodayOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const mktPending = mktOrders.filter(o => o.status === 'Processing' || o.status === 'Confirmed').length;
  const mktTotalRevenue = mktOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const recentMktOrders = [...mktOrders]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5);

  const bookedCount = orders.filter(o =>
    o.status === 'Paid' || o.status === 'Delivered' || o.status === 'Shipped'
  ).length;
  const unbookedCount = bookedCount; // conservative: show all completed as "may need booking"

  // Monthly target progress
  const currentMonthISO = new Date().toISOString().slice(0, 7)
  const currentMonthRevenue = useMemo(() => {
    const b2b = orders
      .filter(o => o.orderDate?.slice(0, 7) === currentMonthISO)
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    const b2c = mktOrders
      .filter(o => o.createdAt?.slice(0, 7) === currentMonthISO)
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    return b2b + b2c
  }, [orders, mktOrders, currentMonthISO])

  const targetProgress = monthlyTarget > 0 ? Math.min(100, Math.round((currentMonthRevenue / monthlyTarget) * 100)) : 0
  const ayAdi = new Date().toLocaleDateString('tr-TR', { month: 'long' })

  // Top customers from marketplace orders
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; orderCount: number; totalSpent: number }> = {}
    for (const o of mktOrders) {
      if (!o.recipientName || o.status === 'Cancelled') continue
      if (!map[o.recipientName]) map[o.recipientName] = { name: o.recipientName, orderCount: 0, totalSpent: 0 }
      map[o.recipientName].orderCount += 1
      map[o.recipientName].totalSpent += o.totalAmount ?? 0
    }
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)
  }, [mktOrders])

  const handleSaveTarget = () => {
    const val = Number(targetInput.replace(/[.\s]/g, '').replace(',', '.'))
    if (val > 0) {
      localStorage.setItem('monthly-target', String(val))
      setMonthlyTarget(val)
    }
    setEditingTarget(false)
  }

  const firstName = user?.firstName ?? 'İyi';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">Komuta Merkezi</h1>
        <p className="text-slate-500">
          Günaydın, <span className="font-semibold text-foreground">{firstName}</span>. İşte bugünün özeti.
        </p>
      </div>

      {/* Bugün Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/orders"
          className="premium-card p-4 flex items-center gap-4 border-l-4 border-primary hover:border-primary/80 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Bugünün Siparişleri</p>
            {loading
              ? <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-foreground">
                  {today.count}
                  <span className="text-sm font-normal text-slate-400 ml-1.5">
                    ₺{today.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                </p>
            }
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/dashboard/orders"
          className="premium-card p-4 flex items-center gap-4 border-l-4 border-amber-500 hover:border-amber-400 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Bekleyen İşlem</p>
            {loading
              ? <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-amber-400">{today.pending}</p>
            }
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-amber-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/orders"
          className="premium-card p-4 flex items-center gap-4 border-l-4 border-emerald-500 hover:border-emerald-400 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Kargoya Hazır</p>
            {loading
              ? <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-emerald-400">{today.readyToShip}</p>
            }
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* Hızlı Aksiyon Bar */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/ecommerce/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white transition-all shadow-sm shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Yeni Ürün Ekle
        </Link>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface hover:border-primary/50 transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> Siparişleri Gör
        </Link>
        <Link
          href="/dashboard/accounting"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface hover:border-primary/50 transition-all"
        >
          <BookOpen className="w-4 h-4" /> Muhasebe Aktar
          {unbookedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unbookedCount > 99 ? '99+' : unbookedCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/wms"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface hover:border-amber-500/50 transition-all"
        >
          <Warehouse className="w-4 h-4" /> Stok Durumu
          {lowStock.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {lowStock.length}
            </span>
          )}
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Gelir"
          value={`₺${totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
          sub={`${orders.length} sipariş`}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Toplam Sipariş"
          value={String(orders.length)}
          sub="tüm zamanlar"
          icon={<ShoppingBag className="w-5 h-5" />}
          color="text-primary"
          loading={loading}
        />
        <StatCard
          title="Ürün Sayısı"
          value={String(productCount)}
          sub="katalogda"
          icon={<Package className="w-5 h-5" />}
          color="text-orange-500"
          loading={loading}
        />
        <StatCard
          title="Son 7 Gün"
          value={String(chartData.reduce((s, d) => s + d.orders, 0))}
          sub="sipariş"
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-purple-500"
          loading={loading}
        />
      </div>

      {/* Marketplace B2C Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-violet-400" /> Mağaza Siparişleri
          </h2>
          <Link href="/dashboard/marketplace-orders" className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
            Tümünü gör <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="premium-card p-4 border-l-4 border-violet-500">
            <p className="text-xs text-slate-500">Bugün (Mağaza)</p>
            {mktLoading
              ? <div className="h-6 w-24 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-foreground mt-0.5">
                  {mktTodayOrders.length}
                  <span className="text-sm font-normal text-slate-400 ml-1.5">
                    ₺{mktTodayRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                </p>
            }
          </div>
          <div className="premium-card p-4 border-l-4 border-amber-500">
            <p className="text-xs text-slate-500">Bekleyen Mağaza</p>
            {mktLoading
              ? <div className="h-6 w-12 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-amber-400 mt-0.5">{mktPending}</p>
            }
          </div>
          <div className="premium-card p-4 border-l-4 border-emerald-500">
            <p className="text-xs text-slate-500">Toplam Mağaza Geliri</p>
            {mktLoading
              ? <div className="h-6 w-24 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-emerald-400 mt-0.5">
                  ₺{mktTotalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </p>
            }
          </div>
        </div>
        {/* Recent marketplace orders mini-table */}
        {!mktLoading && recentMktOrders.length > 0 && (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Sipariş</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium hidden sm:table-cell">Alıcı</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Durum</th>
                    <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMktOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-300">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">{o.recipientName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${MKT_STATUS[o.status]?.cls ?? 'bg-slate-700 text-slate-300'}`}>
                          {MKT_STATUS[o.status]?.label ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-foreground">
                        ₺{o.totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Charts + Alert Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart — 2 cols */}
        <div className="premium-card p-6 lg:col-span-2 min-h-[360px]">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground">Son 7 Gün — Sipariş & Gelir</h3>
          </div>
          <div>
            {loading ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'hsl(var(--border) / 0.4)' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'hsl(var(--border) / 0.4)' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border) / 0.8)', background: 'hsl(var(--surface) / 0.9)', backdropFilter: 'blur(12px)' }}
                    formatter={(val, name) =>
                      name === 'revenue'
                        ? [`₺${Number(val).toLocaleString('tr-TR')}`, 'Gelir']
                        : [String(val), 'Sipariş']
                    }
                  />
                  <Area type="monotone" dataKey="orders" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#colorOrders)" name="orders" />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-secondary)" strokeWidth={2.5} fill="url(#colorRevenue)" name="revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Alert Widget — 1 col */}
        <div className="premium-card p-6 min-h-[360px]">
          <div className="mb-3">
            <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-background">
              <button
                onClick={() => setAlertTab('stock')}
                className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${alertTab === 'stock' ? 'bg-surface text-foreground shadow-sm' : 'text-slate-500 hover:text-foreground'}`}
              >
                Düşük Stok {lowStock.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">{lowStock.length}</span>}
              </button>
              <button
                onClick={() => setAlertTab('accounting')}
                className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${alertTab === 'accounting' ? 'bg-surface text-foreground shadow-sm' : 'text-slate-500 hover:text-foreground'}`}
              >
                Muhasebe {unbookedCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px]">{unbookedCount}</span>}
              </button>
            </div>
          </div>
          <div>
            {alertTab === 'stock' ? (
              loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />)}
                </div>
              ) : lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground">Stok durumu normal</p>
                  <p className="text-xs text-slate-500">Kritik stok seviyesinde ürün yok</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {lowStock.map((s, i) => (
                    <Link key={i} href="/dashboard/wms" className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors group">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {productNameMap[s.productId] ?? `Ürün #${s.productId.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-amber-400">{s.quantity} / min {s.minStockLevel} adet</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-amber-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              )
            ) : (
              loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />)}
                </div>
              ) : unbookedCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground">Muhasebe güncel</p>
                  <p className="text-xs text-slate-500">Tüm siparişler muhasebeleştirildi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-sm font-bold text-foreground">{unbookedCount} sipariş</p>
                    <p className="text-xs text-slate-400 mt-0.5">muhasebeleştirilmemiş olabilir</p>
                  </div>
                  <Link
                    href="/dashboard/accounting"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-white transition-all"
                  >
                    <BookOpen className="w-4 h-4" /> Muhasebe'ye Git
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Aylık Satış Hedefi */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{ayAdi} Satış Hedefi</h3>
              <p className="text-xs text-slate-500">Cari ay toplam gelir (B2B + B2C)</p>
            </div>
          </div>
          {!editingTarget ? (
            <button
              onClick={() => { setTargetInput(monthlyTarget > 0 ? String(monthlyTarget) : ''); setEditingTarget(true) }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-slate-800/50 transition-all"
            >
              <Edit3 className="w-3 h-3" />
              {monthlyTarget > 0 ? 'Hedefi Değiştir' : 'Hedef Belirle'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₺</span>
                <input
                  type="number"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
                  autoFocus
                  placeholder="100000"
                  className="pl-6 pr-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs w-28 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button onClick={handleSaveTarget} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingTarget(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mb-2.5">
          <div>
            <span className="text-2xl font-black text-foreground">
              ₺{currentMonthRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </span>
            {monthlyTarget > 0 && (
              <span className="text-slate-500 text-sm ml-2">/ ₺{monthlyTarget.toLocaleString('tr-TR')}</span>
            )}
          </div>
          {monthlyTarget > 0 && (
            <span className={`text-lg font-black ${targetProgress >= 100 ? 'text-emerald-400' : targetProgress >= 70 ? 'text-primary' : targetProgress >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              %{targetProgress}
            </span>
          )}
        </div>

        {monthlyTarget > 0 ? (
          <>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  targetProgress >= 100 ? 'bg-emerald-500' :
                  targetProgress >= 70 ? 'bg-primary' :
                  targetProgress >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${targetProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {targetProgress >= 100
                ? '🎉 Hedef aşıldı!'
                : `₺${(monthlyTarget - currentMonthRevenue).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} daha gerekiyor`
              }
            </p>
          </>
        ) : (
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full w-0" />
          </div>
        )}
      </div>

      {/* Top Customers */}
      {!mktLoading && topCustomers.length > 0 && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" /> En İyi Müşteriler
            </h3>
            <Link href="/dashboard/analytics" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium">
              Analitik <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {topCustomers.map((c, i) => {
              const pct = topCustomers[0].totalSpent > 0 ? (c.totalSpent / topCustomers[0].totalSpent) * 100 : 0
              const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.']
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm w-6 shrink-0 text-center">{MEDALS[i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-xs font-bold text-primary shrink-0 ml-2">
                        ₺{c.totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{c.orderCount} sipariş</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Son Siparişler */}
      <div className="premium-card p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Son Siparişler</h3>
            <Link href="/dashboard/orders" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium">
              Tümü <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        <div>
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <ShoppingBag className="w-10 h-10 text-slate-600" />
              <p>Henüz sipariş yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm group-hover:text-primary transition-colors">
                        {order.orderNumber ?? `#${order.id?.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ORDER_STATUS[order.status]?.cls ?? 'bg-amber-500/15 text-amber-400'}`}>
                      {ORDER_STATUS[order.status]?.label ?? order.status}
                    </span>
                    <p className="font-bold text-sm text-emerald-400">
                      ₺{(order.totalAmount ?? 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title, value, sub, icon, color, loading
}: {
  title: string; value: string; sub: string; icon: React.ReactNode; color: string; loading: boolean;
}) {
  return (
    <div className="premium-card p-6 flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        {loading
          ? <div className="h-8 w-24 bg-slate-900/60 rounded-lg animate-pulse mt-2" />
          : <h4 className="text-3xl font-black text-foreground mt-1.5">{value}</h4>
        }
        <p className="text-xs mt-1 text-slate-500">{sub}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl bg-slate-950/20 dark:bg-slate-900/40 border border-border/20 flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
    </div>
  );
}
