'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Target, Plus, X, Edit2, Trash2, TrendingUp, TrendingDown,
  CheckCircle2, Clock, AlertTriangle, Trophy, Zap, Check,
  BarChart3, Users, ShoppingCart, DollarSign, Package,
  Star, ArrowUp, ArrowDown, Minus, ChevronDown, Flag
} from 'lucide-react'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalPeriod = 'aylık' | 'çeyreklik' | 'yıllık'
type GoalMetric = 'gelir' | 'sipariş_sayısı' | 'yeni_müşteri' | 'iade_oranı' | 'ortalama_sepet' | 'dönüşüm_oranı' | 'ürün_satışı' | 'özel'
type GoalStatus = 'aktif' | 'tamamlandı' | 'başarısız' | 'taslak'

interface Milestone {
  id: string
  label: string
  threshold: number  // % of target
  achievedAt: string
}

interface Goal {
  id: string
  title: string
  description: string
  metric: GoalMetric
  period: GoalPeriod
  target: number
  current: number
  unit: string        // '₺', 'adet', '%', etc.
  startDate: string
  endDate: string
  status: GoalStatus
  priority: 'düşük' | 'orta' | 'yüksek'
  owner: string
  milestones: Milestone[]
  color: string
  icon: string       // lucide icon name
  createdAt: string
  updatedAt: string
  lastUpdatedCurrent: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'kpi-hedefler'

const METRIC_DEFS: Record<GoalMetric, { label: string; icon: React.ElementType; defaultUnit: string; color: string }> = {
  gelir:             { label: 'Gelir',              icon: DollarSign,  defaultUnit: '₺',     color: '#10b981' },
  sipariş_sayısı:    { label: 'Sipariş Sayısı',     icon: ShoppingCart, defaultUnit: 'adet', color: '#6366f1' },
  yeni_müşteri:      { label: 'Yeni Müşteri',       icon: Users,       defaultUnit: 'kişi',  color: '#3b82f6' },
  iade_oranı:        { label: 'İade Oranı',         icon: TrendingDown, defaultUnit: '%',    color: '#ef4444' },
  ortalama_sepet:    { label: 'Ort. Sepet Tutarı',  icon: BarChart3,   defaultUnit: '₺',     color: '#f59e0b' },
  dönüşüm_oranı:     { label: 'Dönüşüm Oranı',     icon: Zap,         defaultUnit: '%',     color: '#8b5cf6' },
  ürün_satışı:       { label: 'Ürün Satışı',        icon: Package,     defaultUnit: 'adet',  color: '#ec4899' },
  özel:              { label: 'Özel KPI',           icon: Star,        defaultUnit: 'birim', color: '#14b8a6' },
}

const GOAL_COLORS = ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const PERIODS: GoalPeriod[] = ['aylık', 'çeyreklik', 'yıllık']
const OWNERS = ['Tüm Ekip', 'Satış', 'Pazarlama', 'Operasyon', 'Yönetim']

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()
const todayISO = () => new Date().toISOString().slice(0, 10)

function progressColor(pct: number, isInverse = false): string {
  if (isInverse) pct = 100 - pct  // for metrics where lower is better
  if (pct >= 100) return '#10b981'
  if (pct >= 75)  return '#6366f1'
  if (pct >= 50)  return '#f59e0b'
  return '#ef4444'
}

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000))
}

function daysElapsed(startDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000))
}

function progressPct(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(150, Math.round((current / target) * 100))
}

function requiredDailyRate(current: number, target: number, endDate: string): number {
  const days = daysLeft(endDate)
  if (days === 0) return 0
  return Math.max(0, (target - current) / days)
}

// ─── Demo Seed ────────────────────────────────────────────────────────────────

const thisMonth = new Date()
const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().slice(0, 10)
const monthEnd   = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().slice(0, 10)
const qStart = new Date(thisMonth.getFullYear(), Math.floor(thisMonth.getMonth() / 3) * 3, 1).toISOString().slice(0, 10)
const qEnd   = new Date(thisMonth.getFullYear(), Math.floor(thisMonth.getMonth() / 3) * 3 + 3, 0).toISOString().slice(0, 10)
const yearStart = `${thisMonth.getFullYear()}-01-01`
const yearEnd   = `${thisMonth.getFullYear()}-12-31`

const DEMO_GOALS: Goal[] = [
  {
    id: uid(), title: 'Aylık Satış Hedefi', description: 'Bu ay ₺250.000 ciro hedefi',
    metric: 'gelir', period: 'aylık', target: 250000, current: 184200,
    unit: '₺', startDate: monthStart, endDate: monthEnd, status: 'aktif',
    priority: 'yüksek', owner: 'Satış', color: '#10b981', icon: 'DollarSign',
    milestones: [
      { id: uid(), label: '%25 Ulaşıldı', threshold: 25, achievedAt: new Date(Date.now() - 20 * 86400000).toISOString() },
      { id: uid(), label: '%50 Ulaşıldı', threshold: 50, achievedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: uid(), label: '%75 Ulaşıldı', threshold: 75, achievedAt: '' },
    ],
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(), updatedAt: now(), lastUpdatedCurrent: now(),
  },
  {
    id: uid(), title: 'Aylık Sipariş Adedi', description: 'Bu ay 500 sipariş',
    metric: 'sipariş_sayısı', period: 'aylık', target: 500, current: 347,
    unit: 'adet', startDate: monthStart, endDate: monthEnd, status: 'aktif',
    priority: 'orta', owner: 'Operasyon', color: '#6366f1', icon: 'ShoppingCart',
    milestones: [],
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(), updatedAt: now(), lastUpdatedCurrent: now(),
  },
  {
    id: uid(), title: 'Yeni Müşteri Edinimi', description: 'Q2\'de 200 yeni müşteri',
    metric: 'yeni_müşteri', period: 'çeyreklik', target: 200, current: 143,
    unit: 'kişi', startDate: qStart, endDate: qEnd, status: 'aktif',
    priority: 'yüksek', owner: 'Pazarlama', color: '#3b82f6', icon: 'Users',
    milestones: [
      { id: uid(), label: '100 Müşteri', threshold: 50, achievedAt: new Date(Date.now() - 15 * 86400000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), updatedAt: now(), lastUpdatedCurrent: now(),
  },
  {
    id: uid(), title: 'İade Oranını Düşür', description: 'Yıl sonuna kadar %3\'ün altına indir',
    metric: 'iade_oranı', period: 'yıllık', target: 3, current: 4.2,
    unit: '%', startDate: yearStart, endDate: yearEnd, status: 'aktif',
    priority: 'orta', owner: 'Operasyon', color: '#ef4444', icon: 'TrendingDown',
    milestones: [],
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), updatedAt: now(), lastUpdatedCurrent: now(),
  },
  {
    id: uid(), title: 'Yıllık Ciro Hedefi', description: '2026 yılı toplam ciro: ₺3.000.000',
    metric: 'gelir', period: 'yıllık', target: 3000000, current: 1240000,
    unit: '₺', startDate: yearStart, endDate: yearEnd, status: 'aktif',
    priority: 'yüksek', owner: 'Yönetim', color: '#f59e0b', icon: 'Trophy',
    milestones: [
      { id: uid(), label: '₺1M', threshold: 33, achievedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: uid(), label: '₺2M', threshold: 67, achievedAt: '' },
      { id: uid(), label: '₺3M', threshold: 100, achievedAt: '' },
    ],
    createdAt: new Date(Date.now() - 150 * 86400000).toISOString(), updatedAt: now(), lastUpdatedCurrent: now(),
  },
  {
    id: uid(), title: 'Ortalama Sepet Tutarı', description: 'Ay sonuna kadar ₺450\'nin üstüne çıkar',
    metric: 'ortalama_sepet', period: 'aylık', target: 450, current: 387,
    unit: '₺', startDate: monthStart, endDate: monthEnd, status: 'aktif',
    priority: 'düşük', owner: 'Pazarlama', color: '#8b5cf6', icon: 'BarChart3',
    milestones: [],
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(), updatedAt: now(), lastUpdatedCurrent: now(),
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HedeflerPage() {
  const toast = useToast()
  const [goals, setGoals] = useState<Goal[]>([])
  const [selected, setSelected] = useState<Goal | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [filterPeriod, setFilterPeriod] = useState<GoalPeriod | 'tümü'>('tümü')
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'tümü'>('aktif' as GoalStatus)
  const [updateMode, setUpdateMode] = useState(false)
  const [newCurrentValue, setNewCurrentValue] = useState('')

  const emptyForm = (): Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdatedCurrent'> => ({
    title: '', description: '', metric: 'gelir', period: 'aylık',
    target: 0, current: 0, unit: '₺',
    startDate: monthStart, endDate: monthEnd,
    status: 'aktif', priority: 'orta', owner: OWNERS[0],
    milestones: [], color: GOAL_COLORS[0], icon: 'DollarSign',
  })
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      setGoals(raw ? JSON.parse(raw) : DEMO_GOALS)
      if (!raw) localStorage.setItem(LS_KEY, JSON.stringify(DEMO_GOALS))
    } catch { setGoals(DEMO_GOALS) }
  }, [])

  const save = useCallback((updated: Goal[]) => {
    setGoals(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  const filtered = useMemo(() => {
    let list = goals
    if (filterPeriod !== 'tümü') list = list.filter(g => g.period === filterPeriod)
    if (filterStatus !== 'tümü') list = list.filter(g => g.status === filterStatus)
    return list.sort((a, b) => {
      const p = { yüksek: 0, orta: 1, düşük: 2 }
      return p[a.priority] - p[b.priority]
    })
  }, [goals, filterPeriod, filterStatus])

  const kpiSummary = useMemo(() => {
    const active = goals.filter(g => g.status === 'aktif')
    const onTrack = active.filter(g => progressPct(g.current, g.target) >= 75).length
    const atRisk = active.filter(g => {
      const pct = progressPct(g.current, g.target)
      return pct < 50
    }).length
    const completed = goals.filter(g => g.status === 'tamamlandı').length
    return { total: active.length, onTrack, atRisk, completed }
  }, [goals])

  const handleSaveGoal = () => {
    if (!form.title.trim() || form.target <= 0) { toast.error('Başlık ve hedef değer zorunludur'); return }
    if (editingGoal) {
      save(goals.map(g => g.id === editingGoal.id ? { ...g, ...form, updatedAt: now() } : g))
      toast.success('Hedef güncellendi')
    } else {
      const goal: Goal = { id: uid(), ...form, createdAt: now(), updatedAt: now(), lastUpdatedCurrent: now() }
      save([goal, ...goals])
      toast.success('Hedef oluşturuldu')
    }
    setShowForm(false); setEditingGoal(null); setForm(emptyForm())
  }

  const handleUpdateCurrent = (goal: Goal) => {
    const val = parseFloat(newCurrentValue)
    if (isNaN(val) || val < 0) { toast.error('Geçerli bir değer girin'); return }
    const wasComplete = goal.current >= goal.target
    const nowComplete = val >= goal.target
    const updated = goals.map(g => g.id === goal.id ? {
      ...g, current: val, updatedAt: now(), lastUpdatedCurrent: now(),
      status: nowComplete && !wasComplete ? 'tamamlandı' as GoalStatus : g.status,
    } : g)
    save(updated)
    setSelected(updated.find(g => g.id === goal.id) || null)
    setUpdateMode(false); setNewCurrentValue('')
    if (nowComplete && !wasComplete) toast.success(`🎉 "${goal.title}" tamamlandı!`)
    else toast.success('Güncel değer güncellendi')
  }

  const handleDelete = (id: string) => {
    save(goals.filter(g => g.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Hedef silindi')
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setForm({ title: goal.title, description: goal.description, metric: goal.metric, period: goal.period, target: goal.target, current: goal.current, unit: goal.unit, startDate: goal.startDate, endDate: goal.endDate, status: goal.status, priority: goal.priority, owner: goal.owner, milestones: goal.milestones, color: goal.color, icon: goal.icon })
    setShowForm(true); setSelected(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">KPI & Hedefler</h1>
          <p className="text-slate-400 text-sm font-semibold">İşletme hedeflerinizi belirleyin ve ilerlemeyi takip edin</p>
        </div>
        <button onClick={() => { setEditingGoal(null); setForm(emptyForm()); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all self-start sm:self-auto">
          <Plus size={16} /> Hedef Ekle
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Aktif Hedef',    value: kpiSummary.total,     color: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Yolunda',        value: kpiSummary.onTrack,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Risk Altında',   value: kpiSummary.atRisk,    color: kpiSummary.atRisk > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          { label: 'Tamamlanan',     value: kpiSummary.completed, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
        ].map(s => (
          <div key={s.label} className={`premium-card rounded-2xl border p-4 ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['aktif', 'tamamlandı', 'başarısız', 'tümü'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s === 'tümü' ? 'tümü' : s as GoalStatus)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors capitalize ${filterStatus === s ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/40 text-slate-400 hover:border-primary/30'}`}>
            {s === 'aktif' ? '🔵 Aktif' : s === 'tamamlandı' ? '✅ Tamamlandı' : s === 'başarısız' ? '❌ Başarısız' : '📋 Tümü'}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setFilterPeriod(prev => prev === p ? 'tümü' : p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors capitalize ${filterPeriod === p ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/40 text-slate-400 hover:border-primary/30'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(goal => {
          const pct = progressPct(goal.current, goal.target)
          const isInverse = goal.metric === 'iade_oranı'
          const effective = isInverse ? Math.min(100, Math.round((goal.target / goal.current) * 100)) : pct
          const color = progressColor(effective)
          const MetricIcon = METRIC_DEFS[goal.metric].icon
          const days = daysLeft(goal.endDate)
          const isSelected = selected?.id === goal.id

          return (
            <button key={goal.id}
              onClick={() => setSelected(isSelected ? null : goal)}
              className={`premium-card rounded-2xl border p-5 text-left transition-all hover:shadow-lg group ${isSelected ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/40 hover:border-border/70'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + '20', border: `1px solid ${goal.color}40` }}>
                    <MetricIcon size={18} style={{ color: goal.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{goal.title}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{goal.period} · {goal.owner}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${goal.priority === 'yüksek' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : goal.priority === 'orta' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-slate-500 border-slate-600/30 bg-slate-800/30'}`}>
                  {goal.priority}
                </span>
              </div>

              {/* Progress radial + value */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="100%"
                      data={[{ value: Math.min(100, effective), fill: color }]} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1e293b' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black" style={{ color }}>{effective}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-black text-foreground">
                    {goal.unit === '₺' ? `₺${goal.current.toLocaleString('tr-TR')}` : `${goal.current.toLocaleString('tr-TR')} ${goal.unit}`}
                  </p>
                  <p className="text-xs text-slate-500">/ {goal.unit === '₺' ? `₺${goal.target.toLocaleString('tr-TR')}` : `${goal.target.toLocaleString('tr-TR')} ${goal.unit}`}</p>
                  {days > 0 ? (
                    <p className={`text-xs font-semibold mt-1 ${days < 7 ? 'text-amber-400' : 'text-slate-400'}`}>
                      <Clock size={10} className="inline mr-1" />{days} gün kaldı
                    </p>
                  ) : (
                    <p className="text-xs font-semibold mt-1 text-slate-500">Süre doldu</p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, effective)}%`, backgroundColor: color }} />
              </div>

              {/* Milestones */}
              {goal.milestones.length > 0 && (
                <div className="flex gap-1.5">
                  {goal.milestones.map(m => (
                    <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${m.achievedAt ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 border-slate-700/40 bg-slate-800/30'}`}>
                      {m.achievedAt ? '✓' : '○'} {m.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Status badge for non-active */}
              {goal.status === 'tamamlandı' && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Trophy size={12} /> Tamamlandı!
                </div>
              )}
            </button>
          )
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center py-20 text-slate-600">
            <Target size={48} className="mb-4" />
            <p className="text-lg font-bold">Henüz hedef yok</p>
            <p className="text-sm mt-1">İlk KPI hedefini oluşturmak için "Hedef Ekle"ye tıklayın</p>
          </div>
        )}
      </div>

      {/* ── Detail Panel (below selected card) ────────────────────────────── */}
      {selected && (
        <div className="premium-card rounded-2xl border border-primary/30 p-6 space-y-5 shadow-xl shadow-primary/5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg">{selected.title}</h2>
              {selected.description && <p className="text-sm text-slate-400 mt-1">{selected.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(selected)} className="p-2 rounded-xl border border-border/40 hover:border-primary/30 hover:text-primary transition-colors text-slate-400">
                <Edit2 size={15} />
              </button>
              <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-xl border border-border/40 hover:border-red-500/30 hover:text-red-400 transition-colors text-slate-400">
                <Trash2 size={15} />
              </button>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl border border-border/40 hover:bg-slate-800/40 transition-colors text-slate-400">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="premium-card rounded-xl p-3 border border-border/40 text-center">
              <p className="text-xs text-slate-500 mb-1">Güncel</p>
              <p className="font-black text-lg text-foreground">{selected.current.toLocaleString('tr-TR')} {selected.unit}</p>
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40 text-center">
              <p className="text-xs text-slate-500 mb-1">Hedef</p>
              <p className="font-black text-lg text-primary">{selected.target.toLocaleString('tr-TR')} {selected.unit}</p>
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40 text-center">
              <p className="text-xs text-slate-500 mb-1">Kalan</p>
              <p className="font-black text-lg text-amber-400">
                {Math.max(0, selected.target - selected.current).toLocaleString('tr-TR')} {selected.unit}
              </p>
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40 text-center">
              <p className="text-xs text-slate-500 mb-1">Günlük Ger.</p>
              <p className="font-black text-lg text-violet-400">
                {requiredDailyRate(selected.current, selected.target, selected.endDate).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} {selected.unit}
              </p>
            </div>
          </div>

          {/* Update current value */}
          <div>
            {!updateMode ? (
              <button onClick={() => { setUpdateMode(true); setNewCurrentValue(String(selected.current)) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/8 text-primary text-sm font-bold hover:bg-primary/15 transition-colors">
                <Zap size={15} /> Güncel Değeri Güncelle
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <input type="number" value={newCurrentValue} onChange={e => setNewCurrentValue(e.target.value)}
                  placeholder={`Yeni değer (${selected.unit})`}
                  className="w-48 px-3 py-2 bg-slate-900/60 border border-primary/40 rounded-xl text-sm focus:outline-none focus:border-primary/70 font-mono"
                  autoFocus
                />
                <button onClick={() => handleUpdateCurrent(selected)} className="px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                  Kaydet
                </button>
                <button onClick={() => { setUpdateMode(false); setNewCurrentValue('') }} className="px-3 py-2 rounded-xl border border-border/40 text-slate-400 text-sm transition-colors">
                  İptal
                </button>
              </div>
            )}
          </div>

          {/* Milestones */}
          {selected.milestones.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Kilometre Taşları</p>
              <div className="space-y-2">
                {selected.milestones.map(m => (
                  <div key={m.id} className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm ${m.achievedAt ? 'border-emerald-500/20 bg-emerald-950/20' : progressPct(selected.current, selected.target) >= m.threshold ? 'border-primary/20 bg-primary/5' : 'border-border/40'}`}>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${m.achievedAt ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                      {m.achievedAt && <Check size={11} className="text-white" />}
                    </span>
                    <span className="font-semibold flex-1">{m.label}</span>
                    <span className="text-xs text-slate-500">%{m.threshold}</span>
                    {m.achievedAt && <span className="text-xs text-emerald-400">{new Date(m.achievedAt).toLocaleDateString('tr-TR')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-border/40">
            <span>Başlangıç: {new Date(selected.startDate).toLocaleDateString('tr-TR')}</span>
            <span>Bitiş: {new Date(selected.endDate).toLocaleDateString('tr-TR')}</span>
            <span>Sorumlu: {selected.owner}</span>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingGoal(null) }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editingGoal ? 'Hedefi Düzenle' : 'Yeni KPI Hedefi'}</h3>
              <button onClick={() => { setShowForm(false); setEditingGoal(null) }} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Hedef Başlığı *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ör. Aylık Satış Hedefi"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Açıklama</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Kısa açıklama..."
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Metrik</label>
                  <select value={form.metric} onChange={e => { const m = e.target.value as GoalMetric; setForm(f => ({ ...f, metric: m, unit: METRIC_DEFS[m].defaultUnit })) }}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(Object.entries(METRIC_DEFS) as [GoalMetric, typeof METRIC_DEFS[GoalMetric]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Dönem</label>
                  <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as GoalPeriod }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Hedef Değer *</label>
                  <input type="number" min={0} value={form.target || ''} onChange={e => setForm(f => ({ ...f, target: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Başlangıç Değeri</label>
                  <input type="number" min={0} value={form.current || ''} onChange={e => setForm(f => ({ ...f, current: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Birim</label>
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="₺, adet, %, ..."
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Öncelik</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Goal['priority'] }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {['düşük', 'orta', 'yüksek'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Başlangıç</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Bitiş</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Sorumlu</label>
                  <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Renk</label>
                  <div className="flex gap-2 mt-1">
                    {GOAL_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingGoal(null) }} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
                <button onClick={handleSaveGoal} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {editingGoal ? <><CheckCircle2 size={15} /> Güncelle</> : <><Plus size={15} /> Oluştur</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
