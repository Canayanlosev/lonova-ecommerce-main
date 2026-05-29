'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Plus, X, ChevronDown, ArrowRight, TrendingUp,
  Building2, User, Phone, Mail, DollarSign, Calendar,
  Tag, Star, Trophy, Clock, AlertTriangle, Target,
  Edit2, Trash2, Download, Eye, CheckCircle2, XCircle,
  Briefcase, BarChart3, Filter
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'lead' | 'on_görüşme' | 'teklif' | 'müzakere' | 'kazanıldı' | 'kaybedildi'
type Priority = 'düşük' | 'orta' | 'yüksek'

interface Deal {
  id: string
  title: string
  company: string
  contactName: string
  contactEmail: string
  contactPhone: string
  stage: Stage
  value: number        // estimated deal value (₺)
  probability: number  // 0-100%
  closeDate: string    // ISO date
  assignee: string
  priority: Priority
  source: string       // how they found us
  notes: string
  createdAt: string
  updatedAt: string
  wonAt: string
  lostAt: string
  lostReason: string
  tags: string[]
  quoteNo: string      // linked Teklif number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'crm-pipeline'

interface StageConfig {
  label: string
  color: string         // border/text
  bg: string            // column bg
  headerBg: string
  probability: number   // default probability
}

const STAGE_MAP: Record<Stage, StageConfig> = {
  lead:        { label: 'Lead',           color: 'text-slate-400 border-slate-500/30', bg: 'bg-slate-900/20',    headerBg: 'bg-slate-800/60', probability: 10 },
  on_görüşme:  { label: 'Ön Görüşme',     color: 'text-blue-400 border-blue-500/30',   bg: 'bg-blue-950/20',     headerBg: 'bg-blue-900/40',  probability: 25 },
  teklif:      { label: 'Teklif Gönderildi', color: 'text-violet-400 border-violet-500/30', bg: 'bg-violet-950/20', headerBg: 'bg-violet-900/40', probability: 50 },
  müzakere:    { label: 'Müzakere',        color: 'text-amber-400 border-amber-500/30', bg: 'bg-amber-950/20',    headerBg: 'bg-amber-900/40', probability: 75 },
  kazanıldı:   { label: 'Kazanıldı ✓',    color: 'text-emerald-400 border-emerald-500/30', bg: 'bg-emerald-950/20', headerBg: 'bg-emerald-900/40', probability: 100 },
  kaybedildi:  { label: 'Kaybedildi',     color: 'text-red-400 border-red-500/30',     bg: 'bg-red-950/20',      headerBg: 'bg-red-900/40',   probability: 0 },
}

const ACTIVE_STAGES: Stage[] = ['lead', 'on_görüşme', 'teklif', 'müzakere']
const ALL_STAGES: Stage[] = ['lead', 'on_görüşme', 'teklif', 'müzakere', 'kazanıldı', 'kaybedildi']

const PRIORITY_MAP: Record<Priority, { label: string; color: string; dot: string }> = {
  düşük:  { label: 'Düşük',  color: 'text-slate-400', dot: 'bg-slate-500' },
  orta:   { label: 'Orta',   color: 'text-blue-400',  dot: 'bg-blue-400' },
  yüksek: { label: 'Yüksek', color: 'text-amber-400', dot: 'bg-amber-400' },
}

const SOURCES = ['Web Sitesi', 'Referans', 'Sosyal Medya', 'Fuar/Etkinlik', 'Soğuk Arama', 'LinkedIn', 'Diğer']
const AGENTS = ['Atanmamış', 'Ayşe Demir', 'Mehmet Kaya', 'Zeynep Çelik', 'Arda Yıldız']
const LOST_REASONS = ['Fiyat çok yüksek', 'Rakip seçildi', 'Bütçe yok', 'Zaman uygun değil', 'İletişim kesildi', 'Diğer']

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

// ─── Demo Seeds ───────────────────────────────────────────────────────────────

const DEMO: Deal[] = [
  {
    id: uid(), title: 'ERP Sistemi Kurulumu', company: 'Güneş Tekstil A.Ş.', contactName: 'Ali Güneş', contactEmail: 'ali@gunestekstil.com', contactPhone: '0212 555 1122',
    stage: 'müzakere', value: 85000, probability: 75, closeDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    assignee: 'Ayşe Demir', priority: 'yüksek', source: 'Referans', notes: 'Yönetim kurulu onayı bekleniyor.',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: now(), wonAt: '', lostAt: '', lostReason: '', tags: ['enterprise', 'tekstil'], quoteNo: 'TKF-2026-0003',
  },
  {
    id: uid(), title: 'Mağaza Kurulum Paketi', company: 'Yıldız Gıda Ltd.', contactName: 'Fatma Yıldız', contactEmail: 'fatma@yildzgida.com', contactPhone: '0533 444 5566',
    stage: 'teklif', value: 18500, probability: 50, closeDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    assignee: 'Mehmet Kaya', priority: 'orta', source: 'Web Sitesi', notes: 'Demo videosu izledi, fiyat teklifi bekledi.',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: now(), wonAt: '', lostAt: '', lostReason: '', tags: ['gıda', 'küçük'], quoteNo: 'TKF-2026-0005',
  },
  {
    id: uid(), title: 'Muhasebe Modülü', company: 'Çetin & Ortakları', contactName: 'Burak Çetin', contactEmail: 'b.cetin@cetinorak.com', contactPhone: '0542 333 7788',
    stage: 'on_görüşme', value: 12000, probability: 25, closeDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    assignee: 'Zeynep Çelik', priority: 'orta', source: 'LinkedIn', notes: 'İkinci toplantı planlandı.',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: now(), wonAt: '', lostAt: '', lostReason: '', tags: ['muhasebe'], quoteNo: '',
  },
  {
    id: uid(), title: 'KOBİ Başlangıç Paketi', company: 'Demir Ayakkabıcılık', contactName: 'Hasan Demir', contactEmail: 'hasan@demirayakkabi.com', contactPhone: '0532 111 9900',
    stage: 'lead', value: 5500, probability: 10, closeDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    assignee: 'Atanmamış', priority: 'düşük', source: 'Sosyal Medya', notes: 'Instagram reklamından geldi.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: now(), wonAt: '', lostAt: '', lostReason: '', tags: ['smb'], quoteNo: '',
  },
  {
    id: uid(), title: 'E-Ticaret Entegrasyonu', company: 'Moda Koleksiyon', contactName: 'Selin Moda', contactEmail: 'selin@modakoleksiyon.com', contactPhone: '0535 222 4433',
    stage: 'kazanıldı', value: 32000, probability: 100, closeDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    assignee: 'Ayşe Demir', priority: 'yüksek', source: 'Fuar/Etkinlik', notes: 'Sözleşme imzalandı.',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), updatedAt: now(), wonAt: new Date(Date.now() - 5 * 86400000).toISOString(), lostAt: '', lostReason: '', tags: ['moda', 'e-ticaret'], quoteNo: 'TKF-2026-0002',
  },
  {
    id: uid(), title: 'WMS Depo Yönetimi', company: 'Anadolu Lojistik', contactName: 'Timur Anadolu', contactEmail: 'timur@anadoluloj.com', contactPhone: '0216 444 8877',
    stage: 'kaybedildi', value: 60000, probability: 0, closeDate: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
    assignee: 'Arda Yıldız', priority: 'yüksek', source: 'Soğuk Arama', notes: 'Farklı tedarikçi seçildi.',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), updatedAt: now(), wonAt: '', lostAt: new Date(Date.now() - 10 * 86400000).toISOString(), lostReason: 'Rakip seçildi', tags: ['lojistik', 'wms'], quoteNo: '',
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PipelinePage() {
  const toast = useToast()
  const [deals, setDeals] = useState<Deal[]>([])
  const [selected, setSelected] = useState<Deal | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [showWon, setShowWon] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [filterAssignee, setFilterAssignee] = useState('tümü')
  const [showLostModal, setShowLostModal] = useState<{ deal: Deal; targetStage: Stage } | null>(null)
  const [lostReason, setLostReason] = useState(LOST_REASONS[0])

  const emptyForm = (): Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'wonAt' | 'lostAt'> => ({
    title: '', company: '', contactName: '', contactEmail: '', contactPhone: '',
    stage: 'lead', value: 0, probability: 10, closeDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    assignee: 'Atanmamış', priority: 'orta', source: 'Web Sitesi', notes: '', tags: [], quoteNo: '', lostReason: '',
  })

  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      setDeals(raw ? JSON.parse(raw) : DEMO)
      if (!raw) localStorage.setItem(LS_KEY, JSON.stringify(DEMO))
    } catch { setDeals(DEMO) }
  }, [])

  const save = useCallback((updated: Deal[]) => {
    setDeals(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  // Pipeline stats
  const stats = useMemo(() => {
    const active = deals.filter(d => ACTIVE_STAGES.includes(d.stage))
    const won = deals.filter(d => d.stage === 'kazanıldı')
    const lost = deals.filter(d => d.stage === 'kaybedildi')
    const pipelineValue = active.reduce((s, d) => s + d.value, 0)
    const weightedValue = active.reduce((s, d) => s + d.value * d.probability / 100, 0)
    const wonValue = won.reduce((s, d) => s + d.value, 0)
    const totalClosed = won.length + lost.length
    const winRate = totalClosed > 0 ? Math.round(won.length / totalClosed * 100) : 0
    const overdue = active.filter(d => d.closeDate && daysUntil(d.closeDate) < 0).length
    return { pipelineValue, weightedValue, wonValue, winRate, activeCount: active.length, overdue }
  }, [deals])

  // Kanban columns
  const byStage = useMemo(() => {
    const map: Record<Stage, Deal[]> = {} as Record<Stage, Deal[]>
    for (const s of ALL_STAGES) map[s] = []
    for (const d of deals) {
      if (filterAssignee !== 'tümü' && d.assignee !== filterAssignee) continue
      map[d.stage].push(d)
    }
    // Sort within each stage by value desc
    for (const s of ALL_STAGES) map[s].sort((a, b) => b.value - a.value)
    return map
  }, [deals, filterAssignee])

  const openPanel = (d: Deal) => { setSelected(d); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setSelected(null) }

  const moveDeal = (deal: Deal, targetStage: Stage) => {
    if (targetStage === 'kaybedildi') {
      setShowLostModal({ deal, targetStage })
      return
    }
    const updated = deals.map(d => d.id === deal.id ? {
      ...d, stage: targetStage,
      probability: STAGE_MAP[targetStage].probability,
      wonAt: targetStage === 'kazanıldı' ? now() : d.wonAt,
      updatedAt: now(),
    } : d)
    save(updated)
    if (selected?.id === deal.id) setSelected(updated.find(d => d.id === deal.id) || null)
    toast.success(`"${deal.title}" → ${STAGE_MAP[targetStage].label}`)
  }

  const confirmLost = () => {
    if (!showLostModal) return
    const { deal } = showLostModal
    const updated = deals.map(d => d.id === deal.id ? {
      ...d, stage: 'kaybedildi' as Stage, probability: 0,
      lostAt: now(), lostReason, updatedAt: now(),
    } : d)
    save(updated)
    if (selected?.id === deal.id) setSelected(updated.find(d => d.id === deal.id) || null)
    setShowLostModal(null)
    toast.success(`"${deal.title}" kaybedildi olarak işaretlendi`)
  }

  const handleDelete = (id: string) => {
    save(deals.filter(d => d.id !== id))
    if (selected?.id === id) closePanel()
    toast.success('Fırsat silindi')
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.company.trim()) {
      toast.error('Başlık ve şirket adı zorunludur')
      return
    }
    if (editingDeal) {
      const updated = deals.map(d => d.id === editingDeal.id ? { ...d, ...form, updatedAt: now() } : d)
      save(updated)
      if (selected?.id === editingDeal.id) setSelected(updated.find(d => d.id === editingDeal.id) || null)
      toast.success('Fırsat güncellendi')
    } else {
      const deal: Deal = { id: uid(), ...form, createdAt: now(), updatedAt: now(), wonAt: '', lostAt: '' }
      save([deal, ...deals])
      toast.success(`Fırsat eklendi: ${form.title}`)
    }
    setShowForm(false)
    setEditingDeal(null)
    setForm(emptyForm())
  }

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setForm({
      title: deal.title, company: deal.company, contactName: deal.contactName,
      contactEmail: deal.contactEmail, contactPhone: deal.contactPhone,
      stage: deal.stage, value: deal.value, probability: deal.probability,
      closeDate: deal.closeDate.slice(0, 10), assignee: deal.assignee,
      priority: deal.priority, source: deal.source, notes: deal.notes,
      tags: deal.tags, quoteNo: deal.quoteNo, lostReason: deal.lostReason,
    })
    setShowForm(true)
    closePanel()
  }

  const handleExport = () => {
    const header = ['Başlık', 'Şirket', 'Kişi', 'Aşama', 'Değer', 'Olasılık', 'Kapanış', 'Sorumlu', 'Kaynak', 'Durum']
    const rows = deals.map(d => [d.title, d.company, d.contactName, STAGE_MAP[d.stage].label, d.value, `%${d.probability}`, d.closeDate, d.assignee, d.source, d.stage === 'kazanıldı' ? 'Kazanıldı' : d.stage === 'kaybedildi' ? 'Kaybedildi' : 'Aktif'])
    const csv = [header, ...rows].map(r => r.join('\t')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/tab-separated-values' }))
    a.download = 'pipeline.csv'
    a.click()
    toast.success('CSV indirildi')
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Satış Hattı</h1>
          <p className="text-slate-400 text-sm font-semibold">Fırsatları aşama aşama takip edin, dönüşüm oranınızı artırın</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:border-primary/40 transition-all text-sm">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => { setEditingDeal(null); setForm(emptyForm()); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus size={16} /> Fırsat Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Pipeline Değeri',    value: `₺${fmt(stats.pipelineValue)}`,    color: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Ağırlıklı Değer',   value: `₺${fmt(stats.weightedValue)}`,    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          { label: 'Kazanılan',          value: `₺${fmt(stats.wonValue)}`,         color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Kazanma Oranı',      value: `%${stats.winRate}`,              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Aktif Fırsat',       value: stats.activeCount,                color: 'text-slate-300 bg-slate-800/40 border-slate-700/40' },
          { label: 'Gecikmiş',           value: stats.overdue,                    color: stats.overdue > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
        ].map(s => (
          <div key={s.label} className={`premium-card rounded-2xl border p-4 ${s.color}`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter size={14} />
          <span className="font-semibold">Filtre:</span>
        </div>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          className="px-3 py-1.5 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors">
          <option value="tümü">Tüm Sorumlular</option>
          {AGENTS.filter(a => a !== 'Atanmamış').map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => setShowWon(p => !p)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${showWon ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' : 'border-border/40 text-slate-400 hover:border-emerald-500/30'}`}>
          Kazanılanları Göster ({byStage.kazanıldı.length})
        </button>
        <button onClick={() => setShowLost(p => !p)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${showLost ? 'border-red-500/40 bg-red-500/15 text-red-400' : 'border-border/40 text-slate-400 hover:border-red-500/30'}`}>
          Kaybedilenleri Göster ({byStage.kaybedildi.length})
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={byStage[stage]}
            onMove={moveDeal}
            onOpen={openPanel}
            onAdd={() => { setEditingDeal(null); setForm({ ...emptyForm(), stage }); setShowForm(true) }}
          />
        ))}
        {showWon && (
          <KanbanColumn stage="kazanıldı" deals={byStage.kazanıldı} onMove={moveDeal} onOpen={openPanel} />
        )}
        {showLost && (
          <KanbanColumn stage="kaybedildi" deals={byStage.kaybedildi} onMove={moveDeal} onOpen={openPanel} />
        )}
      </div>

      {/* ── Detail Panel ────────────────────────────────────────────────────── */}
      {panelOpen && selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-lg bg-background border-l border-border h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold">{selected.company}</p>
                <h2 className="font-bold text-lg leading-tight">{selected.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STAGE_MAP[selected.stage].color}`}>
                    {STAGE_MAP[selected.stage].label}
                  </span>
                  <span className={`text-xs font-bold ${PRIORITY_MAP[selected.priority].color}`}>
                    {PRIORITY_MAP[selected.priority].label}
                  </span>
                </div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-lg hover:bg-slate-800/40 transition-colors shrink-0 mt-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Value */}
              <div className="grid grid-cols-3 gap-3">
                <div className="premium-card rounded-xl p-3 border border-border/40 text-center">
                  <p className="text-lg font-black text-primary">₺{fmt(selected.value)}</p>
                  <p className="text-xs text-slate-500">Tahmini Değer</p>
                </div>
                <div className="premium-card rounded-xl p-3 border border-border/40 text-center">
                  <p className="text-lg font-black text-violet-400">%{selected.probability}</p>
                  <p className="text-xs text-slate-500">Olasılık</p>
                </div>
                <div className={`premium-card rounded-xl p-3 border text-center ${
                  selected.closeDate && daysUntil(selected.closeDate) < 0
                    ? 'border-red-500/30 bg-red-950/20'
                    : daysUntil(selected.closeDate) < 7
                      ? 'border-amber-500/30 bg-amber-950/20'
                      : 'border-border/40'
                }`}>
                  <p className={`text-lg font-black ${selected.closeDate && daysUntil(selected.closeDate) < 0 ? 'text-red-400' : daysUntil(selected.closeDate) < 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {selected.closeDate ? `${daysUntil(selected.closeDate)}g` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Kapanışa Kalan</p>
                </div>
              </div>

              {/* Contact */}
              <div className="premium-card rounded-xl p-4 border border-border/40 space-y-2.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">İletişim</p>
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-slate-500" />
                  <span className="font-semibold">{selected.contactName || '—'}</span>
                </div>
                {selected.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail size={14} className="text-slate-500" />
                    <a href={`mailto:${selected.contactEmail}`} className="hover:text-primary transition-colors">{selected.contactEmail}</a>
                  </div>
                )}
                {selected.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone size={14} className="text-slate-500" />
                    {selected.contactPhone}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="premium-card rounded-xl p-3 border border-border/40">
                  <p className="text-xs text-slate-500 mb-1">Sorumlu</p>
                  <p className="font-semibold">{selected.assignee}</p>
                </div>
                <div className="premium-card rounded-xl p-3 border border-border/40">
                  <p className="text-xs text-slate-500 mb-1">Kaynak</p>
                  <p className="font-semibold">{selected.source}</p>
                </div>
                <div className="premium-card rounded-xl p-3 border border-border/40">
                  <p className="text-xs text-slate-500 mb-1">Kapanış Tarihi</p>
                  <p className="font-semibold">{selected.closeDate ? new Date(selected.closeDate).toLocaleDateString('tr-TR') : '—'}</p>
                </div>
                {selected.quoteNo && (
                  <div className="premium-card rounded-xl p-3 border border-border/40">
                    <p className="text-xs text-slate-500 mb-1">Teklif No</p>
                    <Link href="/dashboard/teklifler" className="font-semibold text-primary hover:underline">{selected.quoteNo}</Link>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="premium-card rounded-xl p-4 border border-border/40">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Notlar</p>
                  <p className="text-sm text-slate-300">{selected.notes}</p>
                </div>
              )}

              {selected.lostReason && (
                <div className="premium-card rounded-xl p-4 border border-red-500/20 bg-red-950/20">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Kayıp Nedeni</p>
                  <p className="text-sm text-red-300">{selected.lostReason}</p>
                </div>
              )}

              {/* Move to stage */}
              {ACTIVE_STAGES.includes(selected.stage) && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Aşamayı Değiştir</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STAGES.filter(s => s !== selected.stage).map(s => (
                      <button key={s} onClick={() => moveDeal(selected, s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors hover:opacity-90 ${STAGE_MAP[s].color}`}>
                        → {STAGE_MAP[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between">
              <button onClick={() => handleDelete(selected.id)}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                Sil
              </button>
              <button onClick={() => handleEdit(selected)}
                className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 transition-all">
                <Edit2 size={14} /> Düzenle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lost Reason Modal ──────────────────────────────────────────────── */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLostModal(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-red-400">
              <XCircle size={20} /> Kayıp Nedeni
            </h3>
            <p className="text-sm text-slate-400">"{showLostModal.deal.title}" fırsatı neden kaybedildi?</p>
            <select value={lostReason} onChange={e => setLostReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-red-500/50">
              {LOST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLostModal(null)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">
                İptal
              </button>
              <button onClick={confirmLost} className="px-4 py-2 bg-red-600 rounded-xl text-white text-sm font-bold hover:bg-red-500 transition-colors">
                Kaybedildi İşaretle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingDeal(null) }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editingDeal ? 'Fırsatı Düzenle' : 'Yeni Fırsat'}</h3>
              <button onClick={() => { setShowForm(false); setEditingDeal(null) }} className="p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Fırsat Başlığı *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="ör. ERP Kurulum Projesi"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Şirket *</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">İletişim Kişisi</label>
                  <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">E-Posta</label>
                  <input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                    type="email" className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Telefon</label>
                  <input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tahmini Değer (₺)</label>
                  <input value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                    type="number" min={0}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Olasılık (%)</label>
                  <input value={form.probability} onChange={e => setForm(f => ({ ...f, probability: parseInt(e.target.value) || 0 }))}
                    type="number" min={0} max={100}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Kapanış Tarihi</label>
                  <input value={form.closeDate} onChange={e => setForm(f => ({ ...f, closeDate: e.target.value }))}
                    type="date"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Aşama</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage, probability: STAGE_MAP[e.target.value as Stage].probability }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {ALL_STAGES.map(s => <option key={s} value={s}>{STAGE_MAP[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Öncelik</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(['düşük', 'orta', 'yüksek'] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_MAP[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Sorumlu</label>
                  <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Kaynak</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Teklif No</label>
                  <input value={form.quoteNo} onChange={e => setForm(f => ({ ...f, quoteNo: e.target.value }))}
                    placeholder="ör. TKF-2026-0001"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Notlar</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3} placeholder="Fırsat hakkında ek bilgiler..."
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingDeal(null) }}
                  className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400 hover:text-foreground transition-colors">
                  İptal
                </button>
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {editingDeal ? <><CheckCircle2 size={15} /> Güncelle</> : <><Plus size={15} /> Oluştur</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, deals, onMove, onOpen, onAdd,
}: {
  stage: Stage
  deals: Deal[]
  onMove: (deal: Deal, to: Stage) => void
  onOpen: (deal: Deal) => void
  onAdd?: () => void
}) {
  const config = STAGE_MAP[stage]
  const totalValue = deals.reduce((s, d) => s + d.value, 0)
  const isTerminal = stage === 'kazanıldı' || stage === 'kaybedildi'

  return (
    <div className={`flex-shrink-0 w-72 rounded-2xl border ${config.color} overflow-hidden`} style={{ minHeight: 400 }}>
      {/* Column Header */}
      <div className={`px-4 py-3 ${config.headerBg} flex items-center justify-between`}>
        <div>
          <p className={`text-sm font-black ${config.color.split(' ')[0]}`}>{config.label}</p>
          <p className="text-xs text-slate-500">{deals.length} fırsat · ₺{totalValue.toLocaleString('tr-TR')}</p>
        </div>
        {onAdd && (
          <button onClick={onAdd} className="p-1.5 rounded-lg hover:bg-slate-700/40 transition-colors text-slate-400 hover:text-white">
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className={`p-3 space-y-2.5 min-h-64 ${config.bg}`}>
        {deals.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-700 text-xs">
            <Briefcase size={24} className="mb-2 opacity-50" />
            <span>Fırsat yok</span>
          </div>
        )}
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} onOpen={onOpen} onMove={onMove} isTerminal={isTerminal} />
        ))}
      </div>
    </div>
  )
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal, onOpen, onMove, isTerminal }: {
  deal: Deal
  onOpen: (d: Deal) => void
  onMove: (d: Deal, to: Stage) => void
  isTerminal: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const days = deal.closeDate ? daysUntil(deal.closeDate) : null
  const isOverdue = days !== null && days < 0 && !isTerminal

  return (
    <div
      onClick={() => onOpen(deal)}
      className={`premium-card rounded-xl p-3 border border-border/40 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group ${isOverdue ? 'border-l-2 border-l-red-500' : deal.priority === 'yüksek' ? 'border-l-2 border-l-amber-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight flex-1">{deal.title}</p>
        {!isTerminal && (
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(o => !o)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/40">
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-6 z-20 w-44 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                  {ALL_STAGES.filter(s => s !== deal.stage).map(s => (
                    <button key={s} onClick={() => { onMove(deal, s); setMenuOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-800/40 transition-colors ${STAGE_MAP[s].color.split(' ')[0]}`}>
                      → {STAGE_MAP[s].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-1 truncate">{deal.company}</p>

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-xs font-black text-primary">₺{deal.value.toLocaleString('tr-TR')}</span>
        <span className="text-xs text-slate-500">%{deal.probability}</span>
      </div>

      {deal.assignee !== 'Atanmamış' && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] text-primary font-bold">
            {deal.assignee[0]}
          </div>
          <span className="text-[11px] text-slate-500">{deal.assignee}</span>
        </div>
      )}

      {days !== null && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${isOverdue ? 'text-red-400' : days < 7 ? 'text-amber-400' : 'text-slate-500'}`}>
          {isOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
          {isOverdue ? `${Math.abs(days)}g gecikmiş` : `${days}g kaldı`}
        </div>
      )}
    </div>
  )
}
