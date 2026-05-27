'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Bell, ShoppingBag, AlertTriangle, BookOpen, CalendarDays, Users,
  RefreshCw, ArrowRight, CheckCircle2, Truck, Package, Clock,
  TrendingUp, Loader2
} from 'lucide-react'
import api from '@/lib/api'
import { ordersService } from '@/lib/services/orders.service'
import { hrService } from '@/lib/services/hr.service'
import { motion } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Alert {
  id: string
  type: 'order' | 'stock' | 'accounting' | 'leave' | 'deadline' | 'anniversary'
  priority: 'critical' | 'high' | 'medium' | 'info'
  title: string
  body: string
  href: string
  createdAt?: string
}

interface MktOrder { id: string; status: string; totalAmount: number; recipientName: string; createdAt: string }
interface StockItem { productId: string; quantity: number; minStockLevel: number; isLowStock: boolean }
interface Employee { id: string; firstName: string; lastName: string; hireDate: string }
interface LeaveRequest { id: string; employeeName: string; status: string; startDate: string; endDate: string }

// ── Component ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: 'Kritik',  cls: 'border-l-red-500    bg-red-500/5    border-red-500/20'  },
  high:     { label: 'Yüksek',  cls: 'border-l-amber-500  bg-amber-500/5  border-amber-500/20' },
  medium:   { label: 'Orta',    cls: 'border-l-primary     bg-primary/5    border-primary/20'   },
  info:     { label: 'Bilgi',   cls: 'border-l-slate-500   bg-slate-800/20 border-border/60'    },
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order:       <ShoppingBag className="w-4 h-4 text-primary" />,
  stock:       <AlertTriangle className="w-4 h-4 text-amber-400" />,
  accounting:  <BookOpen className="w-4 h-4 text-violet-400" />,
  leave:       <Users className="w-4 h-4 text-cyan-400" />,
  deadline:    <CalendarDays className="w-4 h-4 text-red-400" />,
  anniversary: <TrendingUp className="w-4 h-4 text-emerald-400" />,
}

export default function BildirimlerPage() {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'info'>('all')

  const loadAlerts = async () => {
    setLoading(true)
    const newAlerts: Alert[] = []

    // ── 1. Marketplace orders ─────────────────────────────────────────────
    try {
      const res = await api.get('/api/marketplace/admin/orders?pageSize=200&page=1')
      const mktOrders: MktOrder[] = res.data.Items ?? res.data.items ?? []
      const todayISO = new Date().toISOString().slice(0, 10)
      const threshold = new Date(); threshold.setHours(threshold.getHours() - 24)

      const stale = mktOrders.filter(o => o.status === 'Pending' && new Date(o.createdAt) < threshold)
      if (stale.length > 0) {
        newAlerts.push({
          id: 'stale-orders',
          type: 'order',
          priority: 'critical',
          title: `${stale.length} Gecikmiş Sipariş`,
          body: `${stale.length} sipariş 24 saatten uzun süredir Beklemede durumunda. En eski: ${stale[0].recipientName}`,
          href: '/dashboard/marketplace-orders',
        })
      }

      const todayPending = mktOrders.filter(o => o.status === 'Pending' && o.createdAt?.slice(0, 10) === todayISO && new Date(o.createdAt) >= threshold)
      if (todayPending.length > 0) {
        newAlerts.push({
          id: 'today-pending',
          type: 'order',
          priority: 'high',
          title: `${todayPending.length} Yeni Bekleyen Sipariş`,
          body: `Bugün gelen ${todayPending.length} sipariş işlem bekliyor.`,
          href: '/dashboard/marketplace-orders',
        })
      }

      const processing = mktOrders.filter(o => o.status === 'Processing' || o.status === 'Confirmed')
      if (processing.length > 0) {
        newAlerts.push({
          id: 'processing-orders',
          type: 'order',
          priority: 'medium',
          title: `${processing.length} Sipariş Kargoya Hazır`,
          body: `${processing.length} sipariş işleniyor/onaylandı, kargoya verilebilir.`,
          href: '/dashboard/marketplace-orders',
        })
      }
    } catch { /* ignore */ }

    // ── 2. Stock alerts ───────────────────────────────────────────────────
    try {
      const stockRes = await api.get('/api/wms/stock')
      const stock: StockItem[] = stockRes.data ?? []
      const lowStock = stock.filter(s => s.isLowStock)
      const outOfStock = stock.filter(s => s.quantity === 0)

      if (outOfStock.length > 0) {
        newAlerts.push({
          id: 'out-of-stock',
          type: 'stock',
          priority: 'critical',
          title: `${outOfStock.length} Ürün Tükendi`,
          body: `${outOfStock.length} ürünün stoğu sıfır. Satışlar durabilir.`,
          href: '/dashboard/wms',
        })
      }

      if (lowStock.length > 0) {
        newAlerts.push({
          id: 'low-stock',
          type: 'stock',
          priority: 'high',
          title: `${lowStock.length} Ürün Kritik Stok Seviyesinde`,
          body: `${lowStock.length} ürün minimum stok seviyesinin altında. Sipariş vermeyi düşünün.`,
          href: '/dashboard/wms',
        })
      }
    } catch { /* ignore */ }

    // ── 3. Accounting ─────────────────────────────────────────────────────
    try {
      const [ordersRes, entriesRes] = await Promise.allSettled([
        ordersService.getAll(),
        api.get('/api/accounting/journal-entries').then(r => r.data),
      ])
      if (ordersRes.status === 'fulfilled' && entriesRes.status === 'fulfilled') {
        const orders = ordersRes.value
        const entries: { description: string }[] = entriesRes.value
        const completed = orders.filter(o => ['Paid','Shipped','Delivered'].includes(o.status))
        const bookedIds = new Set(entries.map(e => e.description.match(/\[ORDER:([^\]]+)\]/)?.[1]).filter(Boolean))
        const unbooked = completed.filter(o => !bookedIds.has(o.id)).length
        if (unbooked > 0) {
          newAlerts.push({
            id: 'unbooked',
            type: 'accounting',
            priority: unbooked > 10 ? 'high' : 'medium',
            title: `${unbooked} Sipariş Muhasebeleştirilmemiş`,
            body: `${unbooked} tamamlanan sipariş henüz muhasebe kayıtlarına aktarılmamış.`,
            href: '/dashboard/accounting',
          })
        }
      }
    } catch { /* ignore */ }

    // ── 4. Leave requests ─────────────────────────────────────────────────
    try {
      const leaveRes = await hrService.getLeaveRequests()
      const pending: LeaveRequest[] = leaveRes.filter((r: LeaveRequest) => r.status === 'Pending')
      if (pending.length > 0) {
        newAlerts.push({
          id: 'pending-leaves',
          type: 'leave',
          priority: 'medium',
          title: `${pending.length} Bekleyen İzin Talebi`,
          body: `${pending.map((r: LeaveRequest) => r.employeeName).slice(0, 3).join(', ')}${pending.length > 3 ? ` ve ${pending.length - 3} diğeri` : ''} izin talebinde bulundu.`,
          href: '/dashboard/hr',
        })
      }
    } catch { /* ignore */ }

    // ── 5. SGK/Tax deadlines ──────────────────────────────────────────────
    const today = new Date()
    const DEADLINES = [
      { day: 23, title: 'Muhtasar Beyanname', category: 'Muhtasar' },
      { day: 23, title: 'SGK Bildirge',       category: 'SGK' },
      { day: 26, title: 'KDV Beyannamesi',    category: 'KDV' },
    ]
    for (const dl of DEADLINES) {
      const deadline = new Date(today.getFullYear(), today.getMonth(), dl.day)
      const daysLeft = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft >= 0 && daysLeft <= 7) {
        newAlerts.push({
          id: `deadline-${dl.category}`,
          type: 'deadline',
          priority: daysLeft <= 2 ? 'critical' : 'high',
          title: `${dl.title} — ${daysLeft === 0 ? 'Bugün!' : `${daysLeft} Gün Kaldı`}`,
          body: `${today.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} dönemi ${dl.title} beyanname son günü yaklaşıyor.`,
          href: '/dashboard/accounting',
        })
      }
    }

    // ── 6. Employee anniversaries ─────────────────────────────────────────
    try {
      const emps: Employee[] = await hrService.getEmployees()
      const todayDate = new Date()
      for (const e of emps) {
        const hire = new Date(e.hireDate)
        const anniversary = new Date(todayDate.getFullYear(), hire.getMonth(), hire.getDate())
        const diff = Math.round((anniversary.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
        const years = todayDate.getFullYear() - hire.getFullYear()
        if (diff >= 0 && diff <= 7 && years >= 1) {
          newAlerts.push({
            id: `anniv-${e.id}`,
            type: 'anniversary',
            priority: 'info',
            title: `${e.firstName} ${e.lastName} — ${years}. Yıldönümü`,
            body: `${diff === 0 ? 'Bugün' : `${diff} gün sonra`} ${years}. iş yılını dolduruyor. Tebrik etmeyi unutmayın!`,
            href: '/dashboard/hr',
          })
        }
      }
    } catch { /* ignore */ }

    // Sort: critical > high > medium > info
    const priorityOrder = { critical: 0, high: 1, medium: 2, info: 3 }
    newAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    setAlerts(newAlerts)
    setLoading(false)
  }

  useEffect(() => { loadAlerts() }, [])

  const displayed = useMemo(() =>
    filter === 'all' ? alerts : alerts.filter(a => a.priority === filter),
    [alerts, filter]
  )

  const counts = useMemo(() => ({
    critical: alerts.filter(a => a.priority === 'critical').length,
    high:     alerts.filter(a => a.priority === 'high').length,
    medium:   alerts.filter(a => a.priority === 'medium').length,
    info:     alerts.filter(a => a.priority === 'info').length,
  }), [alerts])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-primary" /> Uyarı Merkezi
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Tüm modüllerden gerçek zamanlı uyarılar ve aksiyon gerektiren maddeler
          </p>
        </div>
        <button
          onClick={loadAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-slate-950/20 text-slate-400 hover:text-white hover:border-primary/45 transition-all text-xs font-bold w-fit disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </button>
      </div>

      {/* Priority stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { key: 'critical', label: 'Kritik',  count: counts.critical, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { key: 'high',     label: 'Yüksek',  count: counts.high,     color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { key: 'medium',   label: 'Orta',    count: counts.medium,   color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
            { key: 'info',     label: 'Bilgi',   count: counts.info,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ] as const).map(({ key, label, count, color, bg }) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`premium-card p-4 border text-left transition-all hover:-translate-y-0.5 ${
                filter === key ? `${bg} ring-1 ring-inset ring-current` : 'border-border/80 bg-slate-900/40'
              }`}
            >
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{count}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 p-1 bg-slate-900/40 border border-border/80 rounded-xl w-fit">
        {(['all', 'critical', 'high', 'medium', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              filter === f
                ? 'bg-slate-800 text-foreground border border-border/70 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Tümü' : f === 'critical' ? 'Kritik' : f === 'high' ? 'Yüksek' : f === 'medium' ? 'Orta' : 'Bilgi'}
            {f !== 'all' && counts[f] > 0 && (
              <span className="ml-1.5 text-[9px] font-black">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="premium-card p-5 border border-border/60 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-56" />
                  <div className="h-3 bg-slate-800/60 rounded w-full" />
                </div>
                <div className="h-4 bg-slate-800 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="premium-card p-16 text-center border border-border/80">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <p className="text-foreground font-black text-base">
            {filter === 'all' ? 'Her şey yolunda!' : `Bu kategoride uyarı yok.`}
          </p>
          <p className="text-slate-500 text-sm mt-1 font-semibold">
            {filter === 'all' ? 'Aksiyon gerektiren bir şey görünmüyor.' : 'Diğer kategorilere bakın.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((alert, i) => {
            const pConf = PRIORITY_CONFIG[alert.priority]
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={alert.href}>
                  <div className={`premium-card p-5 border border-l-4 flex items-start gap-4 hover:-translate-y-0.5 transition-all duration-300 group ${pConf.cls}`}>
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-border/60 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                      {TYPE_ICONS[alert.type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-black text-foreground">{alert.title}</p>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          alert.priority === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          alert.priority === 'high'     ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          alert.priority === 'medium'   ? 'bg-primary/10 text-primary border-primary/20' :
                                                          'bg-slate-700/40 text-slate-400 border-border/60'
                        }`}>
                          {pConf.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">{alert.body}</p>
                    </div>

                    {/* CTA */}
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Summary footer */}
      {!loading && alerts.length > 0 && (
        <p className="text-[11px] text-slate-600 text-center font-semibold">
          {alerts.length} uyarı · {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} itibarıyla güncellendi
        </p>
      )}
    </div>
  )
}
