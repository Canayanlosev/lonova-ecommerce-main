'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, ShoppingBag, DollarSign, Package,
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

function buildLastNDays(orders: Order[], n: number): DayStats[] {
  const days: DayStats[] = [];
  // For longer ranges, group by week or show every Nth day
  const step = n <= 7 ? 1 : n <= 30 ? 1 : 7
  const totalPoints = Math.ceil(n / step)
  for (let i = totalPoints - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * step);
    const label = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    const dateStr = d.toISOString().slice(0, 10);
    // For weekly step, sum the 7 days ending at d
    if (step === 7) {
      const weekOrders = orders.filter(o => {
        const orderDate = o.orderDate?.slice(0, 10)
        if (!orderDate) return false
        const diffMs = new Date(dateStr).getTime() - new Date(orderDate).getTime()
        return diffMs >= 0 && diffMs < 7 * 24 * 60 * 60 * 1000
      })
      days.push({
        date: label,
        orders: weekOrders.length,
        revenue: weekOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
      })
    } else {
      const dayOrders = orders.filter(o => o.orderDate?.slice(0, 10) === dateStr);
      days.push({
        date: label,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
      });
    }
  }
  return days;
}

// Keep backward-compatible alias
function buildLast7Days(orders: Order[]): DayStats[] {
  return buildLastNDays(orders, 7);
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
  const [chartRange, setChartRange] = useState<7 | 30 | 90>(7);

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
  const displayChartData = useMemo(() => buildLastNDays(orders, chartRange), [orders, chartRange]);
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

  // Last month revenue comparison
  const lastMonthRevenue = useMemo(() => {
    const now = new Date()
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthISO = lm.toISOString().slice(0, 7)
    const b2b = orders
      .filter(o => o.orderDate?.slice(0, 7) === lastMonthISO)
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    const b2c = mktOrders
      .filter(o => o.createdAt?.slice(0, 7) === lastMonthISO)
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    return b2b + b2c
  }, [orders, mktOrders])

  const momChange = lastMonthRevenue > 0
    ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null

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

  // ── Platform Health Score ─────────────────────────────────────────────────
  const platformHealth = useMemo(() => {
    const metrics: { label: string; score: number; detail: string }[] = []

    // 1. Fulfillment rate (marketplace orders)
    const completable = mktOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Pending')
    const fulfilled = completable.filter(o => o.status === 'Shipped' || o.status === 'Delivered')
    const fulfillScore = completable.length > 0 ? Math.round((fulfilled.length / completable.length) * 100) : 100
    metrics.push({ label: 'Kargo Oranı', score: fulfillScore, detail: `${fulfilled.length}/${completable.length} sipariş` })

    // 2. Inventory health (% NOT low stock)
    const [allStock, lowStockCount] = [lowStock.length + (productCount > 0 ? productCount : lowStock.length), lowStock.length]
    const stockScore = allStock > 0 ? Math.round(((allStock - lowStockCount) / allStock) * 100) : 100
    metrics.push({ label: 'Stok Sağlığı', score: stockScore, detail: `${lowStockCount} kritik ürün` })

    // 3. Accounting health (booked %)
    const completedMkt = mktOrders.filter(o => o.status === 'Delivered' || o.status === 'Shipped').length
    const accScore = completedMkt === 0 ? 100 : Math.max(0, Math.round(((completedMkt - unbookedCount) / completedMkt) * 100))
    metrics.push({ label: 'Muhasebe', score: accScore, detail: `${unbookedCount} bekleyen kayıt` })

    // 4. Target progress (only if target set)
    if (monthlyTarget > 0) {
      metrics.push({ label: 'Hedef', score: Math.min(100, targetProgress), detail: `%${targetProgress} tamamlandı` })
    }

    const composite = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
    return { composite, metrics }
  }, [mktOrders, lowStock.length, productCount, unbookedCount, monthlyTarget, targetProgress])

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
      <div className="flex flex-col gap-1 pb-1">
        <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-slate-450">
          Komuta Merkezi
        </h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          Günaydın, <span className="text-foreground">{firstName}</span>. İşte bugünün ERP özeti.
        </p>
      </div>

      {/* Bugün Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          href="/dashboard/orders"
          className="premium-card p-5 flex items-center gap-4 border border-border/80 border-t-primary/80 hover:border-t-primary hover:-translate-y-0.5 transition-all duration-300 group"
        >
          <div className="w-10.5 h-10.5 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Bugünün Siparişleri</p>
            {loading ? (
              <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-foreground font-mono">
                {today.count}
                <span className="text-xs font-bold text-slate-450 ml-2">
                  ₺{today.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/orders"
          className="premium-card p-5 flex items-center gap-4 border border-border/80 border-t-amber-500/80 hover:border-t-amber-400 hover:-translate-y-0.5 transition-all duration-300 group"
        >
          <div className="w-10.5 h-10.5 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Bekleyen İşlem</p>
            {loading ? (
              <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-amber-405 font-mono">{today.pending}</p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/orders"
          className="premium-card p-5 flex items-center gap-4 border border-border/80 border-t-emerald-500/80 hover:border-t-emerald-400 hover:-translate-y-0.5 transition-all duration-300 group"
        >
          <div className="w-10.5 h-10.5 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Kargoya Hazır</p>
            {loading ? (
              <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-emerald-405 font-mono">{today.readyToShip}</p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Hızlı Aksiyon Bar */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/ecommerce/new"
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Yeni Ürün Ekle
        </Link>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold border border-border/80 text-foreground bg-slate-900/40 hover:bg-slate-800/40 hover:border-primary/50 transition-all hover:-translate-y-0.5"
        >
          <ShoppingBag className="w-4 h-4 text-slate-400" /> Siparişleri Gör
        </Link>
        <Link
          href="/dashboard/accounting"
          className="relative inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold border border-border/80 text-foreground bg-slate-900/40 hover:bg-slate-800/40 hover:border-primary/50 transition-all hover:-translate-y-0.5"
        >
          <BookOpen className="w-4 h-4 text-slate-400" /> Muhasebe Aktar
          {unbookedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md shadow-red-500/30">
              {unbookedCount > 99 ? '99+' : unbookedCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/wms"
          className="relative inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold border border-border/80 text-foreground bg-slate-900/40 hover:bg-slate-800/40 hover:border-amber-500/50 transition-all hover:-translate-y-0.5"
        >
          <Warehouse className="w-4 h-4 text-slate-400" /> Stok Durumu
          {lowStock.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md shadow-amber-500/30">
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-wider">
            <Store className="w-4 h-4 text-violet-400" /> Mağaza Siparişleri
          </h2>
          <Link href="/dashboard/marketplace-orders" className="text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors flex items-center gap-1">
            Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="premium-card p-5 border border-border/80 border-t-violet-500/80 hover:border-t-violet-500 hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider mb-1">Bugün (Mağaza)</p>
            {mktLoading ? (
              <div className="h-6 w-24 bg-slate-700/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-foreground mt-0.5 font-mono">
                {mktTodayOrders.length}
                <span className="text-xs font-bold text-slate-450 ml-2">
                  ₺{mktTodayRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
              </p>
            )}
          </div>
          <div className="premium-card p-5 border border-border/80 border-t-amber-500/80 hover:border-t-amber-500 hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider mb-1">Bekleyen Mağaza</p>
            {mktLoading ? (
              <div className="h-6 w-12 bg-slate-700/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-amber-405 mt-0.5 font-mono">{mktPending}</p>
            )}
          </div>
          <div className="premium-card p-5 border border-border/80 border-t-emerald-500/80 hover:border-t-emerald-500 hover:-translate-y-0.5 transition-all duration-300">
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider mb-1">Toplam Mağaza Geliri</p>
            {mktLoading ? (
              <div className="h-6 w-24 bg-slate-700/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-emerald-405 mt-0.5 font-mono">
                ₺{mktTotalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
        </div>
        {/* Recent marketplace orders mini-table */}
        {!mktLoading && recentMktOrders.length > 0 && (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/85 bg-slate-900/40 text-[9px] text-slate-450 font-black uppercase tracking-wider">
                    <th className="text-left px-5 py-3.5">Sipariş</th>
                    <th className="text-left px-5 py-3.5 hidden sm:table-cell">Alıcı</th>
                    <th className="text-left px-5 py-3.5">Durum</th>
                    <th className="text-right px-5 py-3.5">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentMktOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-300">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3 text-slate-400 font-semibold hidden sm:table-cell">{o.recipientName ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] border uppercase tracking-wider ${MKT_STATUS[o.status]?.cls ?? 'bg-slate-750 text-slate-300 border-slate-700'}`}>
                          {MKT_STATUS[o.status]?.label ?? o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-black text-foreground font-mono">
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
        <div className="premium-card p-6 lg:col-span-2 min-h-[360px] border border-border/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
              Son {chartRange} Gün — Sipariş & Gelir
            </h3>
            <div className="flex items-center gap-1 p-0.5 rounded-xl border border-border/80 bg-slate-950/40">
              {([7, 30, 90] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    chartRange === r ? 'bg-slate-800 text-primary border border-border/40 shadow-md shadow-black/20' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {r}G
                </button>
              ))}
            </div>
          </div>
          <div>
            {loading ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={displayChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', padding: '10px 14px' }}
                    labelStyle={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, marginBottom: 4 }}
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
        <div className="premium-card p-6 min-h-[360px] border border-border/80 bg-slate-900/40">
          <div className="mb-4">
            <div className="flex items-center gap-1 border border-border/80 rounded-xl p-0.5 bg-slate-950/40">
              <button
                onClick={() => setAlertTab('stock')}
                className={`flex-1 text-xs font-black px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${alertTab === 'stock' ? 'bg-slate-800 text-foreground border border-border/40 shadow-sm' : 'text-slate-550 hover:text-white'}`}
              >
                Düşük Stok {lowStock.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black">{lowStock.length}</span>}
              </button>
              <button
                onClick={() => setAlertTab('accounting')}
                className={`flex-1 text-xs font-black px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${alertTab === 'accounting' ? 'bg-slate-800 text-foreground border border-border/40 shadow-sm' : 'text-slate-550 hover:text-white'}`}
              >
                Muhasebe {unbookedCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black">{unbookedCount}</span>}
              </button>
            </div>
          </div>
          <div>
            {alertTab === 'stock' ? (
              loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/65 rounded-xl animate-pulse" />)}
                </div>
              ) : lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-bold text-foreground">Stok Durumu Normal</p>
                  <p className="text-xs text-slate-500 font-semibold">Kritik stok seviyesinde ürün yok</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                  {lowStock.map((s, i) => (
                    <Link key={i} href="/dashboard/wms" className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-450/40 hover:-translate-y-0.5 transition-all duration-300 group">
                      <AlertTriangle className="w-4 h-4 text-amber-450 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {productNameMap[s.productId] ?? `Ürün #${s.productId.slice(0, 8)}`}
                        </p>
                        <p className="text-[10px] text-amber-450 font-bold font-mono mt-0.5">{s.quantity} / min {s.minStockLevel} adet</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-amber-405 transition-colors" />
                    </Link>
                  ))}
                </div>
              )
            ) : (
              loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/65 rounded-xl animate-pulse" />)}
                </div>
              ) : unbookedCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-bold text-foreground">Muhasebe Güncel</p>
                  <p className="text-xs text-slate-500 font-semibold">Tüm siparişler muhasebeleştirildi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4.5 rounded-xl bg-red-500/5 border border-red-500/20 text-xs leading-relaxed">
                    <p className="font-bold text-foreground">{unbookedCount} sipariş</p>
                    <p className="text-slate-400 font-semibold mt-0.5">muhasebeleştirilmemiş olabilir.</p>
                  </div>
                  <Link
                    href="/dashboard/accounting"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-all shadow-md shadow-primary/20"
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
      <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{ayAdi} Satış Hedefi</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Cari ay toplam gelir (B2B + B2C)</p>
            </div>
          </div>
          {!editingTarget ? (
            <button
              onClick={() => { setTargetInput(monthlyTarget > 0 ? String(monthlyTarget) : ''); setEditingTarget(true) }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-slate-800/50 transition-all font-bold"
            >
              <Edit3 className="w-3 h-3" />
              {monthlyTarget > 0 ? 'Hedefi Değiştir' : 'Hedef Belirle'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₺</span>
                <input
                  type="number"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
                  autoFocus
                  placeholder="100000"
                  className="pl-6 pr-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs w-28 focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold font-mono"
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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-black text-foreground font-mono">
                ₺{currentMonthRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
              {monthlyTarget > 0 && (
                <span className="text-slate-500 text-sm font-bold font-mono">/ ₺{monthlyTarget.toLocaleString('tr-TR')}</span>
              )}
              {momChange !== null && !mktLoading && !loading && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
                  momChange >= 0
                    ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-450 border-red-500/20'
                }`}>
                  {momChange >= 0
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  {momChange >= 0 ? '+' : ''}{momChange}% Geçen Ay
                </span>
              )}
            </div>
          </div>
          {monthlyTarget > 0 && (
            <span className={`text-lg font-black font-mono ${targetProgress >= 100 ? 'text-emerald-400' : targetProgress >= 70 ? 'text-primary' : targetProgress >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              %{targetProgress}
            </span>
          )}
        </div>

        {monthlyTarget > 0 ? (
          <>
            <div className="h-2 bg-slate-950/60 border border-border/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  targetProgress >= 100 ? 'bg-emerald-500' :
                  targetProgress >= 70 ? 'bg-primary' :
                  targetProgress >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${targetProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-2">
              {targetProgress >= 100
                ? '🎉 Hedef aşıldı!'
                : `₺${(monthlyTarget - currentMonthRevenue).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} daha gerekiyor`
              }
            </p>
          </>
        ) : (
          <div className="h-2 bg-slate-950/60 border border-border/40 rounded-full overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full w-0" />
          </div>
        )}
      </div>

      {/* Platform Health Score */}
      {!loading && !mktLoading && (
        <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                platformHealth.composite >= 80 ? 'bg-emerald-500/10' : platformHealth.composite >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'
              }`}>
                <Store className={`w-4 h-4 ${
                  platformHealth.composite >= 80 ? 'text-emerald-405' : platformHealth.composite >= 60 ? 'text-amber-450' : 'text-red-405'
                }`} />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Platform Sağlığı</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Kargo, stok, muhasebe ve hedef bütünleşik skoru</p>
              </div>
            </div>
            <div className={`text-3xl font-black font-mono ${
              platformHealth.composite >= 80 ? 'text-emerald-405' : platformHealth.composite >= 60 ? 'text-amber-450' : 'text-red-405'
            }`}>
              {platformHealth.composite}
            </div>
          </div>

          {/* Score bar */}
          <div className="h-2 bg-slate-950/60 border border-border/40 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                platformHealth.composite >= 80 ? 'bg-emerald-500' : platformHealth.composite >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${platformHealth.composite}%` }}
            />
          </div>

          {/* Metrics breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platformHealth.metrics.map(m => (
              <div key={m.label} className="p-3.5 rounded-xl bg-slate-950/20 border border-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-400 font-bold">{m.label}</p>
                  <span className={`text-xs font-black font-mono ${m.score >= 80 ? 'text-emerald-405' : m.score >= 60 ? 'text-amber-450' : 'text-red-405'}`}>
                    {m.score}
                  </span>
                </div>
                <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.score >= 80 ? 'bg-emerald-500' : m.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${m.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-1.5">{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Customers */}
      {!mktLoading && topCustomers.length > 0 && (
        <div className="premium-card p-6 border border-border/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-450" /> En İyi Müşteriler
            </h3>
            <Link href="/dashboard/analytics" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-bold">
              Analitik <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {topCustomers.map((c, i) => {
              const pct = topCustomers[0].totalSpent > 0 ? (c.totalSpent / topCustomers[0].totalSpent) * 100 : 0
              const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.']
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm w-6 shrink-0 text-center font-bold font-mono">{MEDALS[i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                      <p className="text-xs font-black text-primary shrink-0 ml-2 font-mono">
                        ₺{c.totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-950/60 border border-border/40 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold shrink-0 font-mono">{c.orderCount} sipariş</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Son Siparişler */}
      <div className="premium-card p-6 border border-border/80 bg-slate-900/40">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Son Siparişler</h3>
            <Link href="/dashboard/orders" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-bold">
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
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <ShoppingBag className="w-10 h-10 text-slate-655" />
              <p className="text-xs font-bold">Henüz sipariş yok</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-800/10 border border-transparent hover:border-border/40 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-xs group-hover:text-primary transition-colors">
                        {order.orderNumber ?? `#${order.id?.slice(0, 8)}`}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-wider rounded-full ${ORDER_STATUS[order.status]?.cls ?? 'bg-amber-500/15 text-amber-400 border-amber-500/20'}`}>
                      {ORDER_STATUS[order.status]?.label ?? order.status}
                    </span>
                    <p className="font-black text-xs text-emerald-405 font-mono">
                      ₺{(order.totalAmount ?? 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Canlı Sipariş Akışı ─────────────────────────────────────────── */}
      <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-405 animate-pulse" />
            Canlı Sipariş Akışı
          </h3>
          <Link href="/dashboard/marketplace-orders" className="text-xs text-primary hover:text-primary/80 font-bold flex items-center gap-1">
            Tümü <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {mktLoading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-11 bg-slate-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : recentMktOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-8 h-8 text-slate-655 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Henüz marketplace siparişi yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[...mktOrders]
              .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
              .slice(0, 8)
              .map((o) => {
                const sc = MKT_STATUS[o.status] ?? { label: o.status, cls: 'bg-slate-700 text-slate-300' }
                const diff = Date.now() - new Date(o.createdAt).getTime()
                const mins = Math.floor(diff / 60000)
                const hrs = Math.floor(diff / 3600000)
                const days = Math.floor(diff / 86400000)
                const ago = mins < 2 ? 'Az önce' : mins < 60 ? `${mins}dk önce` : hrs < 24 ? `${hrs}sa önce` : `${days}g önce`
                const dotColor = o.status === 'Delivered' ? 'bg-emerald-400' : o.status === 'Shipped' ? 'bg-primary' : o.status === 'Cancelled' ? 'bg-red-400' : 'bg-amber-405'
                return (
                  <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/10 border border-transparent hover:border-border/20 transition-all duration-300">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground truncate">{o.recipientName ?? 'Müşteri'}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${sc.cls}`}>{sc.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono mt-0.5">₺{o.totalAmount.toLocaleString('tr-TR')} · {ago}</p>
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}
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
    <div className="premium-card p-6 flex items-start justify-between border border-border/80 bg-slate-900/40 hover:-translate-y-0.5 hover:border-slate-700/80 transition-all duration-300">
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-450 uppercase tracking-wider mb-0.5">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-slate-900/60 rounded-lg animate-pulse mt-2" />
        ) : (
          <h4 className="text-3xl font-black text-foreground mt-1.5 tracking-tight">{value}</h4>
        )}
        <p className="text-xs text-slate-500 font-semibold mt-1">{sub}</p>
      </div>
      <div className={`w-10.5 h-10.5 rounded-xl bg-slate-950/40 border border-border/60 flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105 ${color}`}>
        {icon}
      </div>
    </div>
  );
}
