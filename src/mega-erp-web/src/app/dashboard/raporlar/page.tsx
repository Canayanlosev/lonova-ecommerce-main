'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Package, Users, Warehouse,
  DollarSign, ShoppingBag, CreditCard, AlertTriangle, Download,
  RefreshCw, ArrowRight, CheckCircle2, BarChart3, FileText
} from 'lucide-react'
import api from '@/lib/api'
import { ordersService } from '@/lib/services/orders.service'
import { productsService } from '@/lib/services/products.service'

// ── Interfaces ────────────────────────────────────────────────────────────────
interface MktOrder {
  id: string; totalAmount: number; status: string; createdAt: string; itemCount: number
}
interface B2BOrder {
  id: string; totalAmount: number; status: string; orderDate: string
}
interface JournalEntry {
  id: string; date: string; description: string; debit: number; credit: number
}
interface Employee {
  id: string; firstName: string; lastName: string; salary: number
  departmentName?: string
}
interface StockItem {
  productId: string; quantity: number; isLowStock: boolean; minStockLevel: number
}
interface ProductPrice {
  id: string; name: string; basePrice: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function getLast6MonthKeys(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(d.toISOString().slice(0, 7))
  }
  return keys
}

function monthLabel(iso: string): string {
  const [, m] = iso.split('-')
  return MONTH_LABELS[parseInt(m) - 1] ?? iso
}

// ── PIE colors ────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#22d3ee', '#f97316', '#ef4444', '#a855f7', '#10b981']

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function TrTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-border/80 rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="text-slate-400 font-bold mb-2">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-black">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RaporlarPage() {
  const [mktOrders, setMktOrders] = useState<MktOrder[]>([])
  const [b2bOrders, setB2bOrders] = useState<B2BOrder[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [products, setProducts] = useState<ProductPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadAll = async () => {
    setLoading(true)
    const [mkt, b2b, journal, emps, stockRes, prodRes] = await Promise.allSettled([
      api.get('/api/marketplace/admin/orders?pageSize=500&page=1').then(r => r.data.Items ?? r.data.items ?? []),
      ordersService.getAll().catch(() => [] as B2BOrder[]),
      api.get('/api/accounting/journal-entries').then(r => r.data).catch(() => []),
      api.get('/api/hr/employees').then(r => r.data).catch(() => []),
      api.get('/api/wms/stock').then(r => r.data).catch(() => []),
      productsService.getAll().catch(() => []),
    ])
    if (mkt.status === 'fulfilled') setMktOrders(mkt.value as MktOrder[])
    if (b2b.status === 'fulfilled') setB2bOrders(b2b.value as B2BOrder[])
    if (journal.status === 'fulfilled') setJournalEntries(journal.value as JournalEntry[])
    if (emps.status === 'fulfilled') setEmployees(emps.value as Employee[])
    if (stockRes.status === 'fulfilled') setStock(stockRes.value as StockItem[])
    if (prodRes.status === 'fulfilled') setProducts(prodRes.value as ProductPrice[])
    setLoading(false)
    setLastUpdated(new Date())
  }

  useEffect(() => { loadAll() }, [])

  // ── KPI memos ────────────────────────────────────────────────────────────────
  const months6 = useMemo(() => getLast6MonthKeys(), [])
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const prevMonth = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  }, [])

  const mktRevTotal = useMemo(
    () => mktOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    [mktOrders]
  )
  const b2bRevTotal = useMemo(
    () => b2bOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    [b2bOrders]
  )
  const totalRevenue = mktRevTotal + b2bRevTotal

  const totalExpenses = useMemo(
    () => journalEntries.reduce((s, e) => s + (e.credit ?? 0), 0),
    [journalEntries]
  )
  const netProfit = totalRevenue - totalExpenses
  const netProfitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0

  const monthlyPayroll = useMemo(
    () => employees.reduce((s, e) => s + (e.salary ?? 0), 0),
    [employees]
  )
  const annualPayroll = monthlyPayroll * 12

  // Inventory value
  const priceMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of products) m[p.id] = p.basePrice
    return m
  }, [products])

  const inventoryValue = useMemo(
    () => stock.reduce((s, item) => s + (priceMap[item.productId] ?? 0) * item.quantity, 0),
    [stock, priceMap]
  )

  // ── Monthly trend (6 months) ─────────────────────────────────────────────────
  const monthlyTrend = useMemo(() =>
    months6.map(m => {
      const b2cRev = mktOrders
        .filter(o => o.status !== 'Cancelled' && o.createdAt?.slice(0, 7) === m)
        .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
      const b2bRev = b2bOrders
        .filter(o => o.status !== 'Cancelled' && o.orderDate?.slice(0, 7) === m)
        .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
      const expenses = journalEntries
        .filter(e => e.date.slice(0, 7) === m)
        .reduce((s, e) => s + (e.credit ?? 0), 0)
      const total = b2cRev + b2bRev
      return {
        ay: monthLabel(m),
        'B2C Gelir': Math.round(b2cRev),
        'B2B Gelir': Math.round(b2bRev),
        'Toplam Gelir': Math.round(total),
        'Gider': Math.round(expenses),
        'Net Kâr': Math.round(total - expenses),
      }
    }),
    [months6, mktOrders, b2bOrders, journalEntries]
  )

  // ── This month vs last month ─────────────────────────────────────────────────
  const thisMonthRev = useMemo(() => {
    const b2c = mktOrders.filter(o => o.status !== 'Cancelled' && o.createdAt?.slice(0, 7) === currentMonth).reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    const b2b = b2bOrders.filter(o => o.status !== 'Cancelled' && o.orderDate?.slice(0, 7) === currentMonth).reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    return b2c + b2b
  }, [mktOrders, b2bOrders, currentMonth])

  const lastMonthRev = useMemo(() => {
    const b2c = mktOrders.filter(o => o.status !== 'Cancelled' && o.createdAt?.slice(0, 7) === prevMonth).reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    const b2b = b2bOrders.filter(o => o.status !== 'Cancelled' && o.orderDate?.slice(0, 7) === prevMonth).reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    return b2c + b2b
  }, [mktOrders, b2bOrders, prevMonth])

  const momChange = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : null

  // ── Cost breakdown pie ────────────────────────────────────────────────────────
  const costBreakdown = useMemo(() => {
    const expMap: Record<string, number> = {}
    for (const e of journalEntries) {
      if (!e.credit || e.credit <= 0) continue
      const key = e.description.includes('Maaş') || e.description.includes('SGK') || e.description.includes('Bordro')
        ? 'Personel Gideri'
        : e.description.includes('Kira')
        ? 'Kira'
        : e.description.includes('Kargo') || e.description.includes('Nakliye')
        ? 'Lojistik'
        : e.description.includes('Pazarlama') || e.description.includes('Reklam')
        ? 'Pazarlama'
        : 'Diğer Gider'
      expMap[key] = (expMap[key] ?? 0) + e.credit
    }
    if (monthlyPayroll > 0 && !expMap['Personel Gideri']) {
      expMap['Personel Gideri'] = annualPayroll
    }
    return Object.entries(expMap)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [journalEntries, monthlyPayroll, annualPayroll])

  // ── Top products by order frequency ──────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; name?: string }> = {}
    for (const o of mktOrders.filter(o => o.status !== 'Cancelled')) {
      const key = `mkt-${o.id}`
      // We only have order-level data without item breakdown here, so show top orders
      map[key] = { count: o.itemCount ?? 1, revenue: o.totalAmount ?? 0 }
    }
    // Instead show top months by product usage via B2B orders
    return []
  }, [mktOrders])

  // Monthly orders count
  const monthlyOrders = useMemo(() =>
    months6.map(m => {
      const b2c = mktOrders.filter(o => o.createdAt?.slice(0, 7) === m).length
      const b2b = b2bOrders.filter(o => o.orderDate?.slice(0, 7) === m).length
      return { ay: monthLabel(m), 'Marketplace': b2c, 'B2B': b2b, toplam: b2c + b2b }
    }),
    [months6, mktOrders, b2bOrders]
  )

  // ── Health score (0-100) ─────────────────────────────────────────────────────
  const healthScore = useMemo(() => {
    let score = 50
    if (netProfitMargin >= 20) score += 20
    else if (netProfitMargin >= 10) score += 10
    else if (netProfitMargin < 0) score -= 20
    if (momChange !== null && momChange > 0) score += 15
    else if (momChange !== null && momChange < -10) score -= 15
    if (stock.filter(s => s.isLowStock).length === 0) score += 5
    else if (stock.filter(s => s.isLowStock).length > 5) score -= 5
    if (employees.length > 0) score += 5
    return Math.max(0, Math.min(100, score))
  }, [netProfitMargin, momChange, stock, employees])

  const healthLabel = healthScore >= 75 ? { label: 'Mükemmel', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    : healthScore >= 55 ? { label: 'İyi', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
    : healthScore >= 40 ? { label: 'Orta', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
    : { label: 'Kritik', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Ay', 'B2C Gelir (₺)', 'B2B Gelir (₺)', 'Toplam Gelir (₺)', 'Gider (₺)', 'Net Kâr (₺)'],
      ...monthlyTrend.map(r => [r.ay, r['B2C Gelir'], r['B2B Gelir'], r['Toplam Gelir'], r['Gider'], r['Net Kâr']].map(String)),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `raporlar-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            İş Raporları
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Tüm modüllerden çekilen çapraz finansal özet
            {lastUpdated && <span className="ml-2 text-[10px] text-slate-600">· son güncelleme {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold border border-border/80 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border/80 hover:bg-slate-800/40 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="premium-card p-5 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-2/3 mb-3" />
              <div className="h-7 bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI Row ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="premium-card p-5 border border-border/80 bg-slate-900/40 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Toplam Gelir</p>
              </div>
              <p className="text-2xl font-black text-primary font-mono">{fmt(totalRevenue)}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                B2C: {fmt(mktRevTotal)} · B2B: {fmt(b2bRevTotal)}
              </p>
            </div>

            {/* Total Expenses */}
            <div className="premium-card p-5 border border-border/80 bg-slate-900/40 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Toplam Gider</p>
              </div>
              <p className="text-2xl font-black text-red-400 font-mono">{fmt(totalExpenses)}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Muhasebe kayıtlarından
              </p>
            </div>

            {/* Net Profit */}
            <div className={`premium-card p-5 border hover:-translate-y-0.5 transition-all ${netProfit >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <DollarSign className={`w-4 h-4 ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Kâr</p>
              </div>
              <p className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(netProfit)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Kâr marjı: <span className={`font-black ${netProfitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>%{netProfitMargin}</span>
              </p>
            </div>

            {/* Business Health */}
            <div className={`premium-card p-5 border hover:-translate-y-0.5 transition-all ${healthLabel.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${healthLabel.bg}`}>
                  <CheckCircle2 className={`w-4 h-4 ${healthLabel.color}`} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">İş Sağlığı</p>
              </div>
              <div className="flex items-end gap-2">
                <p className={`text-2xl font-black font-mono ${healthLabel.color}`}>{healthScore}</p>
                <p className={`text-xs font-black mb-0.5 ${healthLabel.color}`}>/ 100</p>
              </div>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    healthScore >= 75 ? 'bg-emerald-400' : healthScore >= 55 ? 'bg-primary' : healthScore >= 40 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
              <p className={`text-[10px] font-black mt-1 ${healthLabel.color}`}>{healthLabel.label}</p>
            </div>
          </div>

          {/* ── Secondary KPIs ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Aylık Bordro</p>
                <p className="text-base font-black text-violet-400 font-mono">{fmt(monthlyPayroll)}</p>
                <p className="text-[10px] text-slate-500">{employees.length} çalışan</p>
              </div>
            </div>
            <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Warehouse className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Stok Değeri</p>
                <p className="text-base font-black text-cyan-400 font-mono">{fmt(inventoryValue)}</p>
                <p className="text-[10px] text-slate-500">{stock.length} ürün çeşidi</p>
              </div>
            </div>
            <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stock.filter(s => s.isLowStock).length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                <AlertTriangle className={`w-4 h-4 ${stock.filter(s => s.isLowStock).length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Kritik Stok</p>
                <p className={`text-base font-black font-mono ${stock.filter(s => s.isLowStock).length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stock.filter(s => s.isLowStock).length}
                </p>
                <p className="text-[10px] text-slate-500">düşük stok uyarısı</p>
              </div>
            </div>
            <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${momChange !== null && momChange >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <ShoppingBag className={`w-4 h-4 ${momChange !== null && momChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Bu Ay Gelir</p>
                <p className="text-base font-black font-mono text-foreground">{fmt(thisMonthRev)}</p>
                {momChange !== null && (
                  <p className={`text-[10px] font-black ${momChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {momChange >= 0 ? '▲' : '▼'} %{Math.abs(momChange)} geçen aya göre
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Revenue Trend Chart ───────────────────────────────────────── */}
          <div className="premium-card p-6 border border-border/80 bg-slate-900/40">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Son 6 Ay Gelir Trendi</h2>
                <p className="text-xs text-slate-500 mt-0.5">B2C + B2B birleşik — gider ve net kâr dahil</p>
              </div>
              <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
                Detaylı Analitik <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gelirGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="giderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={(props) => <TrTooltip active={props.active} label={props.label as string | undefined} payload={(props.payload as unknown) as Array<{ name: string; value: number; color: string }>} />} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                <Area type="monotone" dataKey="Toplam Gelir" stroke="#6366f1" strokeWidth={2} fill="url(#gelirGrad)" dot={false} />
                <Area type="monotone" dataKey="Net Kâr" stroke="#10b981" strokeWidth={2} fill="url(#netGrad)" dot={false} />
                <Area type="monotone" dataKey="Gider" stroke="#ef4444" strokeWidth={1.5} fill="url(#giderGrad)" dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Two column: Order Volume + Cost Breakdown ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Order Volume */}
            <div className="premium-card p-6 border border-border/80 bg-slate-900/40">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Aylık Sipariş Hacmi</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Marketplace + B2B kanalları</p>
                </div>
                <Link href="/dashboard/marketplace-orders" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Siparişler <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyOrders} barSize={16} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: 11 }} />
                  <Bar dataKey="Marketplace" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="B2B" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cost Breakdown Pie */}
            <div className="premium-card p-6 border border-border/80 bg-slate-900/40">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Gider Dağılımı</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Muhasebe + bordro analizi</p>
                </div>
                <Link href="/dashboard/accounting" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Muhasebe <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {costBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                  <BarChart3 className="w-8 h-8 mb-2" />
                  <p className="text-xs">Muhasebe verisi yok</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={160}>
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {costBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => [fmt(v as number), '']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {costBreakdown.slice(0, 5).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[10px] text-slate-400 truncate flex-1">{item.name}</span>
                        <span className="text-[10px] font-black text-foreground font-mono shrink-0">
                          {fmt(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Financial Summary Table ──────────────────────────────────── */}
          <div className="premium-card overflow-hidden border border-border/80 bg-slate-900/40">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-slate-950/20">
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Aylık Finansal Özet</h2>
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-slate-400">
                    <th className="text-left px-6 py-3 font-black uppercase tracking-wider">Dönem</th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">B2C Gelir</th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider hidden sm:table-cell">B2B Gelir</th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">Toplam Gelir</th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider hidden md:table-cell">Gider</th>
                    <th className="text-right px-6 py-3 font-black uppercase tracking-wider">Net Kâr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {monthlyTrend.map((row) => (
                    <tr key={row.ay} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-3 font-bold text-foreground">{row.ay}</td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono">{fmt(row['B2C Gelir'])}</td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono hidden sm:table-cell">{fmt(row['B2B Gelir'])}</td>
                      <td className="px-4 py-3 text-right font-black text-primary font-mono">{fmt(row['Toplam Gelir'])}</td>
                      <td className="px-4 py-3 text-right text-red-400 font-mono hidden md:table-cell">
                        {row['Gider'] > 0 ? `−${fmt(row['Gider'])}` : '—'}
                      </td>
                      <td className={`px-6 py-3 text-right font-black font-mono ${row['Net Kâr'] >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row['Net Kâr'] >= 0 ? fmt(row['Net Kâr']) : `−${fmt(Math.abs(row['Net Kâr']))}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-slate-950/30">
                    <td className="px-6 py-3 font-black text-foreground uppercase tracking-wider text-xs">TOPLAM</td>
                    <td className="px-4 py-3 text-right font-black text-foreground font-mono">{fmt(mktRevTotal)}</td>
                    <td className="px-4 py-3 text-right font-black text-foreground font-mono hidden sm:table-cell">{fmt(b2bRevTotal)}</td>
                    <td className="px-4 py-3 text-right font-black text-primary font-mono">{fmt(totalRevenue)}</td>
                    <td className="px-4 py-3 text-right font-black text-red-400 font-mono hidden md:table-cell">−{fmt(totalExpenses)}</td>
                    <td className={`px-6 py-3 text-right font-black font-mono text-sm ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Quick links ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/dashboard/accounting', icon: CreditCard, color: 'text-primary bg-primary/10 border-primary/20', label: 'Yevmiye Defteri', desc: 'Muhasebe kayıtları' },
              { href: '/dashboard/hr', icon: Users, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', label: 'İK & Bordro', desc: `${employees.length} çalışan` },
              { href: '/dashboard/wms', icon: Warehouse, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'Stok Durumu', desc: `${stock.filter(s => s.isLowStock).length} düşük stok` },
              { href: '/dashboard/billing', icon: Package, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Faturalar', desc: 'KDV özeti' },
            ].map(({ href, icon: Icon, color, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="premium-card p-4 flex items-center gap-3 hover:border-primary/30 transition-all group border border-border/80 bg-slate-900/40"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary ml-auto shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
