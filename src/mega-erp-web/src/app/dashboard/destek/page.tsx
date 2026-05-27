'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  MessageSquare, Plus, Search, Filter, X, ChevronDown,
  AlertTriangle, Clock, CheckCircle2, Send, Download,
  Paperclip, User, Tag, ArrowRight, RefreshCw, Eye,
  AlertCircle, Circle, CheckCheck, Pause, XCircle,
  LifeBuoy, ShoppingCart, RotateCcw, CreditCard, Wrench,
  ChevronLeft, ChevronRight, Inbox
} from 'lucide-react'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'açık' | 'işlemde' | 'beklemede' | 'çözüldü' | 'kapatıldı'
type TicketPriority = 'düşük' | 'orta' | 'yüksek' | 'acil'
type TicketCategory = 'teknik' | 'sipariş' | 'iade' | 'ödeme' | 'genel' | 'kargo'

interface TicketNote {
  id: string
  authorName: string
  authorRole: 'müşteri' | 'destek' | 'sistem'
  body: string
  createdAt: string
  isInternal: boolean
}

interface Ticket {
  id: string
  no: string
  subject: string
  body: string
  customerName: string
  customerEmail: string
  customerPhone: string
  orderId: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignee: string
  notes: TicketNote[]
  createdAt: string
  updatedAt: string
  resolvedAt: string
  firstResponseAt: string
  tags: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'destek-tickets'

const STATUS_MAP: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  açık:        { label: 'Açık',        color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',    icon: Circle },
  işlemde:     { label: 'İşlemde',     color: 'text-violet-400 bg-violet-500/15 border-violet-500/30', icon: RefreshCw },
  beklemede:   { label: 'Beklemede',   color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',  icon: Pause },
  çözüldü:     { label: 'Çözüldü',     color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  kapatıldı:   { label: 'Kapatıldı',   color: 'text-slate-400 bg-slate-500/15 border-slate-500/30', icon: XCircle },
}

const PRIORITY_MAP: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  düşük:  { label: 'Düşük',  color: 'text-slate-400', dot: 'bg-slate-400' },
  orta:   { label: 'Orta',   color: 'text-blue-400',  dot: 'bg-blue-400' },
  yüksek: { label: 'Yüksek', color: 'text-amber-400', dot: 'bg-amber-400' },
  acil:   { label: 'Acil',   color: 'text-red-400',   dot: 'bg-red-400' },
}

const CATEGORY_MAP: Record<TicketCategory, { label: string; icon: React.ElementType }> = {
  teknik:  { label: 'Teknik',     icon: Wrench },
  sipariş: { label: 'Sipariş',    icon: ShoppingCart },
  iade:    { label: 'İade',       icon: RotateCcw },
  ödeme:   { label: 'Ödeme',      icon: CreditCard },
  genel:   { label: 'Genel',      icon: MessageSquare },
  kargo:   { label: 'Kargo',      icon: LifeBuoy },
}

const AGENTS = ['Atanmamış', 'Ayşe Demir', 'Mehmet Kaya', 'Zeynep Çelik', 'Arda Yıldız']

const STATUSES: TicketStatus[] = ['açık', 'işlemde', 'beklemede', 'çözüldü', 'kapatıldı']
const PRIORITIES: TicketPriority[] = ['düşük', 'orta', 'yüksek', 'acil']
const CATEGORIES: TicketCategory[] = ['teknik', 'sipariş', 'iade', 'ödeme', 'genel', 'kargo']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()

let _counter = 1
function nextNo(): string {
  const year = new Date().getFullYear()
  const n = String(_counter++).padStart(4, '0')
  return `DT-${year}-${n}`
}

function elapsed(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}g önce`
  if (hours > 0) return `${hours}s önce`
  return `${mins}d önce`
}

function slaColor(isoStr: string, status: TicketStatus): string {
  if (status === 'çözüldü' || status === 'kapatıldı') return 'text-slate-500'
  const hours = (Date.now() - new Date(isoStr).getTime()) / 3600000
  if (hours > 48) return 'text-red-400'
  if (hours > 24) return 'text-amber-400'
  return 'text-slate-400'
}

// ─── Demo Seeds ───────────────────────────────────────────────────────────────

const DEMO_TICKETS: Ticket[] = [
  {
    id: uid(), no: 'DT-2026-0001',
    subject: 'Sipariş takip numarası gelmiyor',
    body: 'Siparişimi 3 gün önce verdim ama kargo takip numarası hâlâ gelmedi. Sipariş no: #29401',
    customerName: 'Fatma Şahin', customerEmail: 'fatma@example.com', customerPhone: '0532 111 2233',
    orderId: '29401', category: 'kargo', priority: 'yüksek', status: 'açık',
    assignee: 'Ayşe Demir',
    notes: [
      { id: uid(), authorName: 'Fatma Şahin', authorRole: 'müşteri', body: 'Hâlâ bir güncelleme yok, lütfen yardım edin.', createdAt: new Date(Date.now() - 7200000).toISOString(), isInternal: false },
    ],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    resolvedAt: '', firstResponseAt: '', tags: ['kargo', 'bekleyen'],
  },
  {
    id: uid(), no: 'DT-2026-0002',
    subject: 'Yanlış ürün gönderildi',
    body: 'Beden M sipariş ettim, L geldi. İade süreci nasıl işliyor?',
    customerName: 'Ahmet Koç', customerEmail: 'ahmet.koc@example.com', customerPhone: '0533 444 5566',
    orderId: '29388', category: 'iade', priority: 'acil', status: 'işlemde',
    assignee: 'Mehmet Kaya',
    notes: [
      { id: uid(), authorName: 'Mehmet Kaya', authorRole: 'destek', body: 'Müşteriye iade formu gönderildi. Takipte.', createdAt: new Date(Date.now() - 3600000).toISOString(), isInternal: true },
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    resolvedAt: '', firstResponseAt: new Date(Date.now() - 86400000).toISOString(), tags: ['iade', 'öncelikli'],
  },
  {
    id: uid(), no: 'DT-2026-0003',
    subject: 'Ödeme çekildi ama sipariş oluşmadı',
    body: 'Kredi kartımdan ₺480 çekildi ancak siparişim listede görünmüyor.',
    customerName: 'Elif Arslan', customerEmail: 'elif.arslan@example.com', customerPhone: '0535 777 8899',
    orderId: '', category: 'ödeme', priority: 'acil', status: 'açık',
    assignee: 'Atanmamış',
    notes: [],
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    resolvedAt: '', firstResponseAt: '', tags: ['ödeme', 'acil'],
  },
  {
    id: uid(), no: 'DT-2026-0004',
    subject: 'Şifremi unutdum, e-posta gelmiyor',
    body: 'Şifre sıfırlama maili almıyorum. Spam klasörünü de kontrol ettim.',
    customerName: 'Can Öztürk', customerEmail: 'can.oz@example.com', customerPhone: '0542 333 4455',
    orderId: '', category: 'teknik', priority: 'orta', status: 'çözüldü',
    assignee: 'Zeynep Çelik',
    notes: [
      { id: uid(), authorName: 'Zeynep Çelik', authorRole: 'destek', body: 'E-posta adresi manuel olarak doğrulandı ve şifre sıfırlandı.', createdAt: new Date(Date.now() - 86400000).toISOString(), isInternal: false },
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000).toISOString(), firstResponseAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
    tags: ['hesap', 'teknik'],
  },
  {
    id: uid(), no: 'DT-2026-0005',
    subject: 'Toplu sipariş fiyatlandırması hakkında',
    body: '50 adet ve üzeri siparişlerde kurumsal indirim uyguluyor musunuz?',
    customerName: 'Büyük Tekstil A.Ş.', customerEmail: 'info@buyuktekstil.com', customerPhone: '0212 555 6677',
    orderId: '', category: 'genel', priority: 'düşük', status: 'beklemede',
    assignee: 'Arda Yıldız',
    notes: [
      { id: uid(), authorName: 'Arda Yıldız', authorRole: 'destek', body: 'Satış ekibi ile koordine ediliyor, 2 iş günü içinde dönülecek.', createdAt: new Date(Date.now() - 12 * 3600000).toISOString(), isInternal: true },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    resolvedAt: '', firstResponseAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    tags: ['kurumsal', 'satış'],
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DestekPage() {
  const toast = useToast()

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'tümü'>('tümü')
  const [filterPriority, setFilterPriority] = useState<TicketPriority | 'tümü'>('tümü')
  const [filterCategory, setFilterCategory] = useState<TicketCategory | 'tümü'>('tümü')
  const [newNote, setNewNote] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // New ticket form state
  const [form, setForm] = useState({
    subject: '', body: '', customerName: '', customerEmail: '', customerPhone: '',
    orderId: '', category: 'genel' as TicketCategory, priority: 'orta' as TicketPriority,
    assignee: 'Atanmamış',
  })

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Ticket[]
        // Set counter to max + 1
        const maxNo = parsed.reduce((m, t) => {
          const n = parseInt(t.no.split('-')[2] || '0')
          return Math.max(m, n)
        }, 0)
        _counter = maxNo + 1
        setTickets(parsed)
      } else {
        _counter = DEMO_TICKETS.length + 1
        setTickets(DEMO_TICKETS)
        localStorage.setItem(LS_KEY, JSON.stringify(DEMO_TICKETS))
      }
    } catch {
      setTickets(DEMO_TICKETS)
    }
  }, [])

  const save = useCallback((updated: Ticket[]) => {
    setTickets(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  // Stats
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'açık').length
    const inProgress = tickets.filter(t => t.status === 'işlemde').length
    const urgent = tickets.filter(t => t.priority === 'acil' && (t.status === 'açık' || t.status === 'işlemde')).length
    const resolvedToday = tickets.filter(t => t.resolvedAt && t.resolvedAt.startsWith(new Date().toISOString().slice(0, 10))).length
    const avgResponseTimes = tickets
      .filter(t => t.firstResponseAt && t.createdAt)
      .map(t => (new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime()) / 3600000)
    const avgResponse = avgResponseTimes.length > 0
      ? (avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length).toFixed(1)
      : '—'
    const unassigned = tickets.filter(t => t.assignee === 'Atanmamış' && t.status !== 'kapatıldı').length
    return { open, inProgress, urgent, resolvedToday, avgResponse, unassigned }
  }, [tickets])

  // Filtered + paginated
  const filtered = useMemo(() => {
    let list = tickets
    if (filterStatus !== 'tümü') list = list.filter(t => t.status === filterStatus)
    if (filterPriority !== 'tümü') list = list.filter(t => t.priority === filterPriority)
    if (filterCategory !== 'tümü') list = list.filter(t => t.category === filterCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.no.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => {
      const pOrder: Record<TicketPriority, number> = { acil: 0, yüksek: 1, orta: 2, düşük: 3 }
      const sDiff = (a.status === 'açık' || a.status === 'işlemde' ? 0 : 1) - (b.status === 'açık' || b.status === 'işlemde' ? 0 : 1)
      if (sDiff !== 0) return sDiff
      return pOrder[a.priority] - pOrder[b.priority]
    })
  }, [tickets, filterStatus, filterPriority, filterCategory, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openPanel = (t: Ticket) => { setSelected(t); setPanelOpen(true); setNewNote('') }
  const closePanel = () => { setPanelOpen(false); setSelected(null) }

  const handleStatusChange = (ticket: Ticket, status: TicketStatus) => {
    const updated = tickets.map(t => t.id === ticket.id ? {
      ...t, status,
      resolvedAt: status === 'çözüldü' ? now() : t.resolvedAt,
      updatedAt: now(),
    } : t)
    save(updated)
    if (selected?.id === ticket.id) setSelected(updated.find(t => t.id === ticket.id) || null)
    toast.success(`Durum güncellendi: ${STATUS_MAP[status].label}`)
  }

  const handleAssigneeChange = (ticket: Ticket, assignee: string) => {
    const updated = tickets.map(t => t.id === ticket.id ? { ...t, assignee, updatedAt: now() } : t)
    save(updated)
    if (selected?.id === ticket.id) setSelected(updated.find(t => t.id === ticket.id) || null)
  }

  const handlePriorityChange = (ticket: Ticket, priority: TicketPriority) => {
    const updated = tickets.map(t => t.id === ticket.id ? { ...t, priority, updatedAt: now() } : t)
    save(updated)
    if (selected?.id === ticket.id) setSelected(updated.find(t => t.id === ticket.id) || null)
    toast.success(`Öncelik güncellendi: ${PRIORITY_MAP[priority].label}`)
  }

  const handleAddNote = (ticket: Ticket) => {
    if (!newNote.trim()) return
    const note: TicketNote = {
      id: uid(), authorName: 'Destek Ekibi', authorRole: 'destek',
      body: newNote.trim(), createdAt: now(), isInternal,
    }
    const updated = tickets.map(t => t.id === ticket.id ? {
      ...t,
      notes: [...t.notes, note],
      updatedAt: now(),
      firstResponseAt: t.firstResponseAt || now(),
      status: t.status === 'açık' ? 'işlemde' as TicketStatus : t.status,
    } : t)
    save(updated)
    setSelected(updated.find(t => t.id === ticket.id) || null)
    setNewNote('')
    toast.success(isInternal ? 'Dahili not eklendi' : 'Müşteriye yanıt gönderildi')
  }

  const handleDelete = (id: string) => {
    save(tickets.filter(t => t.id !== id))
    if (selected?.id === id) closePanel()
    toast.success('Talep silindi')
  }

  const handleCreate = () => {
    if (!form.subject.trim() || !form.customerName.trim()) {
      toast.error('Konu ve müşteri adı zorunludur')
      return
    }
    const ticket: Ticket = {
      id: uid(), no: nextNo(),
      ...form,
      status: 'açık',
      notes: [],
      createdAt: now(), updatedAt: now(), resolvedAt: '', firstResponseAt: '',
      tags: [],
    }
    const updated = [ticket, ...tickets]
    save(updated)
    setShowForm(false)
    setForm({ subject: '', body: '', customerName: '', customerEmail: '', customerPhone: '', orderId: '', category: 'genel', priority: 'orta', assignee: 'Atanmamış' })
    toast.success(`Talep oluşturuldu: ${ticket.no}`)
    openPanel(ticket)
  }

  const handleExport = () => {
    const header = ['No', 'Konu', 'Müşteri', 'Kategori', 'Öncelik', 'Durum', 'Sorumlu', 'Oluşturulma']
    const rows = filtered.map(t => [t.no, t.subject, t.customerName, CATEGORY_MAP[t.category].label, PRIORITY_MAP[t.priority].label, STATUS_MAP[t.status].label, t.assignee, new Date(t.createdAt).toLocaleDateString('tr-TR')])
    const csv = [header, ...rows].map(r => r.join('\t')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/tab-separated-values' }))
    a.download = 'destek-talepleri.csv'
    a.click()
    toast.success('CSV indirildi')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Destek Talepleri</h1>
          <p className="text-slate-400 text-sm font-semibold">Müşteri destek taleplerini takip edin ve yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:border-primary/40 transition-all text-sm">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Plus size={16} /> Yeni Talep
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Açık',        value: stats.open,       color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'İşlemde',     value: stats.inProgress, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          { label: 'Acil',        value: stats.urgent,     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
          { label: 'Atanmamış',   value: stats.unassigned, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
          { label: 'Bugün Çözüldü',value: stats.resolvedToday, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Ort. Yanıt',  value: stats.avgResponse === '—' ? '—' : `${stats.avgResponse}s`, color: 'text-slate-300 bg-slate-800/40 border-slate-700/40' },
        ].map(s => (
          <div key={s.label} className={`premium-card border rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Urgent banner */}
      {stats.urgent > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          <AlertTriangle size={16} />
          {stats.urgent} acil talep yanıt bekliyor — hemen müdahale edilmeli
        </div>
      )}

      {/* Filters */}
      <div className="premium-card rounded-2xl p-4 border border-border/40 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="No, konu, müşteri ara..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as TicketStatus | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors">
          <option value="tümü">Tüm Durumlar</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value as TicketPriority | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors">
          <option value="tümü">Tüm Öncelikler</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_MAP[p].label}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value as TicketCategory | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors">
          <option value="tümü">Tüm Kategoriler</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_MAP[c].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="premium-card rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-slate-900/40">
              <tr>
                {['No', 'Konu', 'Müşteri', 'Kategori', 'Öncelik', 'Durum', 'Sorumlu', 'Açılış', ''].map(h => (
                  <th key={h} className="text-left px-5 py-4 font-bold text-xs text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500">
                    <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                    <p className="font-semibold">Talep bulunamadı</p>
                  </td>
                </tr>
              ) : paged.map(ticket => {
                const StatusIcon = STATUS_MAP[ticket.status].icon
                const CatIcon = CATEGORY_MAP[ticket.category].icon
                const isActive = ticket.status === 'açık' || ticket.status === 'işlemde'
                return (
                  <tr key={ticket.id}
                    onClick={() => openPanel(ticket)}
                    className={`hover:bg-slate-800/20 cursor-pointer transition-colors ${isActive && ticket.priority === 'acil' ? 'border-l-2 border-l-red-500' : isActive && ticket.priority === 'yüksek' ? 'border-l-2 border-l-amber-500' : ''}`}>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-500">{ticket.no}</span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="font-semibold truncate">{ticket.subject}</p>
                      {ticket.notes.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">{ticket.notes.length} not</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{ticket.customerName}</p>
                      <p className="text-xs text-slate-500">{ticket.customerEmail}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CatIcon size={13} />
                        {CATEGORY_MAP[ticket.category].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${PRIORITY_MAP[ticket.priority].color}`}>
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_MAP[ticket.priority].dot}`} />
                        {PRIORITY_MAP[ticket.priority].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[ticket.status].color}`}>
                        <StatusIcon size={11} />
                        {STATUS_MAP[ticket.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-xs text-slate-400">
                      {ticket.assignee}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className={`text-xs ${slaColor(ticket.createdAt, ticket.status)}`}>
                        {elapsed(ticket.createdAt)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 hover:text-primary transition-colors" onClick={e => { e.stopPropagation(); openPanel(ticket) }}>
                      <Eye size={16} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-sm text-slate-400">
            <span>{filtered.length} talep · Sayfa {page}/{totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Panel ────────────────────────────────────────────────────── */}
      {panelOpen && selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-2xl bg-background border-l border-border h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Panel header */}
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500">{selected.no}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_MAP[selected.status].color}`}>
                    {STATUS_MAP[selected.status].label}
                  </span>
                  <span className={`text-xs font-bold ${PRIORITY_MAP[selected.priority].color}`}>
                    {PRIORITY_MAP[selected.priority].label}
                  </span>
                </div>
                <h2 className="font-bold text-lg leading-snug">{selected.subject}</h2>
              </div>
              <button onClick={closePanel} className="p-2 rounded-lg hover:bg-slate-800/40 transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Customer info + controls */}
              <div className="px-6 py-4 border-b border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Müşteri</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {selected.customerName[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{selected.customerName}</p>
                      <p className="text-xs text-slate-400">{selected.customerEmail}</p>
                    </div>
                  </div>
                  {selected.customerPhone && <p className="text-xs text-slate-400">{selected.customerPhone}</p>}
                  {selected.orderId && (
                    <p className="text-xs text-slate-400">Sipariş: <span className="text-primary font-semibold">#{selected.orderId}</span></p>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Durum</p>
                    <select
                      value={selected.status}
                      onChange={e => handleStatusChange(selected, e.target.value as TicketStatus)}
                      className="w-full px-3 py-1.5 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Sorumlu</p>
                    <select
                      value={selected.assignee}
                      onChange={e => handleAssigneeChange(selected, e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                    >
                      {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Öncelik</p>
                    <select
                      value={selected.priority}
                      onChange={e => handlePriorityChange(selected, e.target.value as TicketPriority)}
                      className="w-full px-3 py-1.5 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50"
                    >
                      {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_MAP[p].label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Original message */}
              <div className="px-6 py-4 border-b border-border/40">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Orijinal Mesaj</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selected.body}</p>
                <p className="text-xs text-slate-600 mt-2">{new Date(selected.createdAt).toLocaleString('tr-TR')}</p>
              </div>

              {/* Conversation timeline */}
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notlar & Yanıtlar ({selected.notes.length})</p>
                {selected.notes.length === 0 && (
                  <p className="text-slate-600 text-sm">Henüz not yok.</p>
                )}
                {selected.notes.map(note => (
                  <div key={note.id} className={`rounded-xl p-4 border ${note.isInternal
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : note.authorRole === 'destek'
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-slate-800/40 border-border/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-xs font-bold">
                        <User size={12} />
                        {note.authorName}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          note.authorRole === 'müşteri' ? 'bg-blue-500/20 text-blue-400'
                          : note.authorRole === 'destek' ? 'bg-primary/20 text-primary'
                          : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {note.authorRole === 'müşteri' ? 'Müşteri' : note.authorRole === 'destek' ? 'Destek' : 'Sistem'}
                        </span>
                        {note.isInternal && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400">Dahili</span>}
                      </span>
                      <span className="text-xs text-slate-500">{elapsed(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-300">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply box */}
            <div className="px-6 py-4 border-t border-border/60 space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400" />
                  Dahili not (müşteriye görünmez)
                </label>
              </div>
              <textarea
                rows={3}
                value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder={isInternal ? 'Dahili not ekle (sadece ekip görür)...' : 'Müşteriye yanıt yaz...'}
                className="w-full px-4 py-3 bg-slate-900/60 border border-border/40 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors placeholder:text-slate-600"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                >
                  Talebi Sil
                </button>
                <button
                  onClick={() => handleAddNote(selected)}
                  disabled={!newNote.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={14} />
                  {isInternal ? 'Not Ekle' : 'Yanıt Gönder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Ticket Form ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">Yeni Destek Talebi</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Konu *</label>
                  <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Kısa açıklama..."
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Müşteri Adı *</label>
                  <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">E-Posta</label>
                  <input value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                    type="email"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Telefon</label>
                  <input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Sipariş No</label>
                  <input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
                    placeholder="Opsiyonel"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_MAP[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Öncelik</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_MAP[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Sorumlu</label>
                  <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Açıklama</label>
                  <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    rows={4} placeholder="Müşteri talebinin detayları..."
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400 hover:text-foreground transition-colors">
                  İptal
                </button>
                <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Plus size={16} /> Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
