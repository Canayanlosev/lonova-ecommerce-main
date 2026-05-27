'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, ChevronLeft, ChevronRight, ListTodo, FileText,
  Truck, RotateCcw, Users, Megaphone, AlertTriangle, Circle,
  Clock, CheckCircle2, X, Plus
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'task' | 'quote' | 'supplier' | 'return' | 'leave' | 'campaign'

interface CalEvent {
  id: string
  date: string       // YYYY-MM-DD
  title: string
  type: EventType
  href: string
  priority?: string  // for tasks
  isDone?: boolean
  isOverdue?: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<EventType, { label: string; icon: React.ElementType; cls: string; dot: string }> = {
  task:     { label: 'Görev',      icon: ListTodo,    cls: 'bg-primary/10 text-primary border-primary/20',     dot: 'bg-primary' },
  quote:    { label: 'Teklif',     icon: FileText,    cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-400' },
  supplier: { label: 'Tedarik',   icon: Truck,       cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
  return:   { label: 'İade',      icon: RotateCcw,   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   dot: 'bg-amber-400' },
  leave:    { label: 'İzin',      icon: Users,       cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',       dot: 'bg-cyan-400' },
  campaign: { label: 'Kampanya',  icon: Megaphone,   cls: 'bg-pink-500/10 text-pink-400 border-pink-500/20',       dot: 'bg-pink-400' },
}

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun,1=Mon…6=Sat → convert to Mon=0
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function padDate(n: number) {
  return String(n).padStart(2, '0')
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TakvimPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(today)
  const [filterType, setFilterType] = useState<'all' | EventType>('all')

  // ── Load events from all localStorage sources ──────────────────────────────

  useEffect(() => {
    const loaded: CalEvent[] = []

    // Tasks
    try {
      const raw = localStorage.getItem('crm-gorevler')
      if (raw) {
        const tasks = JSON.parse(raw) as Array<{ id: string; title: string; dueDate: string; priority: string; completed: boolean }>
        for (const t of tasks) {
          if (!t.dueDate) continue
          loaded.push({
            id: `task-${t.id}`, date: t.dueDate, title: t.title,
            type: 'task', href: '/dashboard/gorevler',
            priority: t.priority, isDone: t.completed,
            isOverdue: !t.completed && t.dueDate < today,
          })
        }
      }
    } catch {}

    // Quotes (expiry)
    try {
      const raw = localStorage.getItem('crm-teklifler')
      if (raw) {
        const quotes = JSON.parse(raw) as Array<{ id: string; quoteNo: string; customerName: string; validUntil: string; status: string }>
        for (const q of quotes) {
          if (!q.validUntil || q.status === 'onaylandı' || q.status === 'reddedildi') continue
          loaded.push({
            id: `quote-${q.id}`, date: q.validUntil,
            title: `${q.quoteNo} — ${q.customerName} geçerlilik`,
            type: 'quote', href: '/dashboard/teklifler',
            isOverdue: q.validUntil < today && (q.status === 'gönderildi' || q.status === 'görüldü'),
          })
        }
      }
    } catch {}

    // Supplier deliveries (expected date)
    try {
      const raw = localStorage.getItem('tedarik-purchase-orders')
      if (raw) {
        const orders = JSON.parse(raw) as Array<{ id: string; orderNo: string; expectedDate: string; status: string }>
        for (const o of orders) {
          if (!o.expectedDate || o.status === 'teslim_alındı' || o.status === 'iptal') continue
          loaded.push({
            id: `supplier-${o.id}`, date: o.expectedDate,
            title: `${o.orderNo} teslim alınacak`,
            type: 'supplier', href: '/dashboard/tedarik',
            isOverdue: o.expectedDate < today && o.status === 'gönderildi',
          })
        }
      }
    } catch {}

    // Returns (created date + 3 days = expected resolution)
    try {
      const raw = localStorage.getItem('iade-requests')
      if (raw) {
        const returns = JSON.parse(raw) as Array<{ id: string; customerName: string; createdAt: string; status: string }>
        for (const r of returns) {
          if (r.status === 'iade_tamamlandı' || r.status === 'reddedildi') continue
          const resolutionDate = new Date(new Date(r.createdAt).getTime() + 3 * 86400000).toISOString().slice(0, 10)
          loaded.push({
            id: `return-${r.id}`, date: resolutionDate,
            title: `${r.customerName} iade yanıtı`,
            type: 'return', href: '/dashboard/iadeler',
            isOverdue: resolutionDate < today,
          })
        }
      }
    } catch {}

    // HR leave requests
    try {
      const raw = localStorage.getItem('hr-leave-requests')
      if (raw) {
        const leaves = JSON.parse(raw) as Array<{ id: string; employeeName?: string; startDate: string; endDate: string; status: string }>
        for (const l of leaves) {
          if (!l.startDate || l.status === 'rejected') continue
          loaded.push({
            id: `leave-${l.id}`, date: l.startDate,
            title: `${l.employeeName ?? 'Çalışan'} — izin başlıyor`,
            type: 'leave', href: '/dashboard/hr',
          })
        }
      }
    } catch {}

    // Marketing campaigns
    try {
      const raw = localStorage.getItem('marketing-campaigns')
      if (raw) {
        const campaigns = JSON.parse(raw) as Array<{ id: string; name: string; scheduledAt?: string; status: string }>
        for (const c of campaigns) {
          if (!c.scheduledAt) continue
          const date = c.scheduledAt.slice(0, 10)
          loaded.push({
            id: `campaign-${c.id}`, date,
            title: `${c.name} — kampanya`,
            type: 'campaign', href: '/dashboard/pazarlama',
          })
        }
      }
    } catch {}

    setEvents(loaded)
  }, [today])

  // ── Calendar grid computation ──────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  const navigateMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  // Events for selected day
  const selectedEvents = useMemo(() => {
    if (!selectedDay) return []
    const evs = eventsByDay[selectedDay] ?? []
    if (filterType === 'all') return evs
    return evs.filter(e => e.type === filterType)
  }, [selectedDay, eventsByDay, filterType])

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const from = today
    const to = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    return events
      .filter(e => e.date >= from && e.date <= to && !e.isDone)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10)
  }, [events, today])

  // ── Render ────────────────────────────────────────────────────────────────────

  const monthLabel = `${MONTHS_TR[viewMonth]} ${viewYear}`

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Calendar className="w-7 h-7 text-primary" />
            Takvim
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Görevler, teklifler, tedarik ve daha fazlası tek görünümde
          </p>
        </div>
        <Link
          href="/dashboard/gorevler"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-all"
        >
          <Plus className="w-4 h-4" /> Görev Ekle
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${filterType === 'all' ? 'bg-slate-700/60 border-border text-foreground' : 'border-border/60 text-slate-500 hover:text-foreground'}`}
        >
          <Circle className="w-2 h-2 fill-slate-400 text-slate-400" /> Tümü
        </button>
        {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? 'all' : type)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${filterType === type ? cfg.cls : 'border-border/60 text-slate-500 hover:text-foreground'}`}
          >
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar */}
        <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
          {/* Month header */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-black text-foreground">{monthLabel}</h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:bg-slate-800/40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_TR.map(d => (
              <div key={d} className="text-[10px] font-black text-slate-500 uppercase text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDay + 1
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
              const dateStr = isCurrentMonth
                ? `${viewYear}-${padDate(viewMonth + 1)}-${padDate(dayNum)}`
                : ''
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDay
              const dayEvents = dateStr ? (eventsByDay[dateStr] ?? []) : []
              const filteredDayEvents = filterType === 'all' ? dayEvents : dayEvents.filter(e => e.type === filterType)
              const hasOverdue = filteredDayEvents.some(e => e.isOverdue)

              return (
                <button
                  key={idx}
                  onClick={() => isCurrentMonth ? setSelectedDay(dateStr) : undefined}
                  disabled={!isCurrentMonth}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1 transition-all text-xs font-bold ${
                    !isCurrentMonth ? 'opacity-0 cursor-default' :
                    isSelected ? 'bg-primary text-white' :
                    isToday ? 'bg-primary/15 text-primary border border-primary/30' :
                    'hover:bg-slate-800/40 text-foreground border border-transparent'
                  }`}
                >
                  <span>{isCurrentMonth ? dayNum : ''}</span>
                  {filteredDayEvents.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center">
                      {filteredDayEvents.slice(0, 3).map((e, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${EVENT_CONFIG[e.type].dot} ${isSelected ? 'bg-white/70' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                  {hasOverdue && !isSelected && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day events */}
          {selectedDay && (
            <div className="premium-card p-4 border border-border/80 bg-slate-900/40">
              <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {selectedDay === today ? 'Bugün' : new Date(selectedDay).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                {selectedEvents.length > 0 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black border border-primary/20">
                    {selectedEvents.length}
                  </span>
                )}
              </h3>

              {selectedEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500/30 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500 font-medium">Bu gün için etkinlik yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(e => {
                    const cfg = EVENT_CONFIG[e.type]
                    const EIcon = cfg.icon
                    return (
                      <Link
                        key={e.id}
                        href={e.href}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all hover:opacity-80 ${
                          e.isOverdue ? 'bg-red-500/8 border-red-500/20' :
                          e.isDone ? 'bg-slate-800/20 border-border/30 opacity-60' :
                          cfg.cls
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          e.isOverdue ? 'bg-red-500/15' : 'bg-white/5'
                        }`}>
                          {e.isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                            e.isOverdue ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> :
                            <EIcon className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${e.isDone ? 'line-through text-slate-500' : 'text-foreground'}`}>
                            {e.title}
                          </p>
                          <p className="text-[10px] text-slate-500">{cfg.label}</p>
                        </div>
                        {e.priority && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black border shrink-0 ${
                            e.priority === 'acil' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            e.priority === 'yüksek' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-slate-700/40 text-slate-400 border-border/40'
                          }`}>
                            {e.priority}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming 7 days */}
          <div className="premium-card p-4 border border-border/80 bg-slate-900/40">
            <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Yaklaşan 7 Gün
            </h3>
            {upcomingEvents.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-500">Önümüzdeki 7 günde etkinlik yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(e => {
                  const cfg = EVENT_CONFIG[e.type]
                  const EIcon = cfg.icon
                  const daysUntil = Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000)
                  return (
                    <Link
                      key={e.id}
                      href={e.href}
                      onClick={() => setSelectedDay(e.date)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/20 border border-transparent hover:border-border/30 transition-all"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{e.title}</p>
                        <p className="text-[10px] text-slate-500">{cfg.label}</p>
                      </div>
                      <span className={`text-[9px] font-black shrink-0 ${
                        daysUntil === 0 ? 'text-red-400' :
                        daysUntil === 1 ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        {daysUntil === 0 ? 'Bugün' : daysUntil === 1 ? 'Yarın' : `${daysUntil}g`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="premium-card p-4 border border-border/80 bg-slate-900/40">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Bu Ay Özet</h3>
            <div className="space-y-2">
              {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => {
                const count = events.filter(e => e.date.startsWith(`${viewYear}-${padDate(viewMonth + 1)}`) && e.type === type).length
                if (count === 0) return null
                const cfg = EVENT_CONFIG[type]
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs text-slate-400 flex-1">{cfg.label}</span>
                    <span className="text-xs font-black text-foreground">{count}</span>
                  </div>
                )
              })}
              {events.filter(e => e.date.startsWith(`${viewYear}-${padDate(viewMonth + 1)}`)).length === 0 && (
                <p className="text-xs text-slate-500">Bu ay için etkinlik yok</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
