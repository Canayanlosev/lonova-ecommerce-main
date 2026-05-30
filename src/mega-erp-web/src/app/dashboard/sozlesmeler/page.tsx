'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  FileSignature, Plus, X, Search, Download, Edit2, Trash2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye,
  ChevronLeft, ChevronRight, Building2, User, Calendar,
  DollarSign, Tag, Copy, ExternalLink, Bell, Shield,
  CheckCheck, RefreshCw, FileText, Pen
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractStatus = 'taslak' | 'müzakere' | 'aktif' | 'yenileme_bekliyor' | 'sona_erdi' | 'iptal'
type ContractType = 'hizmet' | 'satış' | 'kira' | 'tedarik' | 'gizlilik' | 'iş_ortaklığı' | 'diğer'
type SignatureStatus = 'imzalanmadı' | 'taraf_imzaladı' | 'karşı_taraf_imzaladı' | 'tamamlandı'

interface ContractParty {
  name: string
  title: string
  email: string
  taxNo: string
  signedAt: string
}

interface ContractMilestone {
  id: string
  label: string
  date: string
  completed: boolean
}

interface Contract {
  id: string
  no: string
  title: string
  description: string
  type: ContractType
  status: ContractStatus
  // Parties
  seller: ContractParty
  buyer: ContractParty
  // Dates
  startDate: string
  endDate: string
  signedDate: string
  reviewDate: string
  // Financial
  value: number
  currency: 'TRY' | 'USD' | 'EUR'
  paymentTerms: string
  // References
  quoteNo: string
  invoiceNos: string
  pipelineId: string
  // Status
  signatureStatus: SignatureStatus
  autoRenew: boolean
  renewNoticeDays: number
  milestones: ContractMilestone[]
  tags: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'sozlesmeler'

const STATUS_MAP: Record<ContractStatus, { label: string; color: string; icon: React.ElementType }> = {
  taslak:             { label: 'Taslak',             color: 'text-slate-400 bg-slate-500/15 border-slate-500/30',       icon: FileText },
  müzakere:           { label: 'Müzakerede',         color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',          icon: RefreshCw },
  aktif:              { label: 'Aktif',              color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  yenileme_bekliyor:  { label: 'Yenileme Bekliyor',  color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',       icon: Bell },
  sona_erdi:          { label: 'Sona Erdi',          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',       icon: Clock },
  iptal:              { label: 'İptal',              color: 'text-red-400 bg-red-500/15 border-red-500/30',             icon: XCircle },
}

const TYPE_MAP: Record<ContractType, { label: string; color: string }> = {
  hizmet:        { label: 'Hizmet Sözleşmesi',    color: 'text-violet-400' },
  satış:         { label: 'Satış Sözleşmesi',      color: 'text-blue-400' },
  kira:          { label: 'Kira Sözleşmesi',       color: 'text-emerald-400' },
  tedarik:       { label: 'Tedarik Sözleşmesi',    color: 'text-amber-400' },
  gizlilik:      { label: 'NDA / Gizlilik',         color: 'text-slate-300' },
  iş_ortaklığı:  { label: 'İş Ortaklığı',          color: 'text-pink-400' },
  diğer:         { label: 'Diğer',                 color: 'text-slate-400' },
}

const SIG_MAP: Record<SignatureStatus, { label: string; color: string }> = {
  imzalanmadı:            { label: 'İmzalanmadı',              color: 'text-slate-500' },
  taraf_imzaladı:         { label: 'Bizim Taraf İmzaladı',     color: 'text-blue-400' },
  karşı_taraf_imzaladı:   { label: 'Karşı Taraf İmzaladı',     color: 'text-amber-400' },
  tamamlandı:             { label: 'Her İki Taraf İmzaladı',   color: 'text-emerald-400' },
}

const PAYMENT_TERMS = ['Peşin', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Aylık', 'Üç Aylık', 'Yıllık Ön Ödeme']
const CONTRACT_TYPES: ContractType[] = ['hizmet', 'satış', 'kira', 'tedarik', 'gizlilik', 'iş_ortaklığı', 'diğer']
const CURRENCIES = ['TRY', 'USD', 'EUR'] as const

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const now = () => new Date().toISOString()
const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

let _counter = 1
function nextNo(): string {
  return `SZL-${new Date().getFullYear()}-${String(_counter++).padStart(4, '0')}`
}

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

// ─── Demo Seeds ───────────────────────────────────────────────────────────────

const MY_PARTY: ContractParty = {
  name: 'CanayanWeb Teknoloji A.Ş.',
  title: 'Hizmet Sağlayıcı',
  email: 'sozlesme@canayanweb.com',
  taxNo: '1234567890',
  signedAt: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
}

const DEMO: Contract[] = [
  {
    id: uid(), no: 'SZL-2026-0001',
    title: 'Yıllık Platform Lisans Sözleşmesi — Güneş Tekstil',
    description: 'CanayanWeb All-in-One platform yıllık lisans ve destek sözleşmesi',
    type: 'hizmet', status: 'aktif',
    seller: MY_PARTY,
    buyer: { name: 'Güneş Tekstil A.Ş.', title: 'Müşteri', email: 'muhasebe@gunestekstil.com', taxNo: '9876543210', signedAt: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10) },
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 335 * 86400000).toISOString().slice(0, 10),
    signedDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
    reviewDate: new Date(Date.now() + 305 * 86400000).toISOString().slice(0, 10),
    value: 24000, currency: 'TRY', paymentTerms: 'Aylık',
    quoteNo: 'TKF-2026-0003', invoiceNos: 'EF-2026-000001', pipelineId: '',
    signatureStatus: 'tamamlandı', autoRenew: true, renewNoticeDays: 30,
    milestones: [
      { id: uid(), label: 'Sözleşme İmzalandı', date: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10), completed: true },
      { id: uid(), label: 'Onboarding Tamamlandı', date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10), completed: true },
      { id: uid(), label: '6 Ay Değerlendirmesi', date: new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10), completed: false },
    ],
    tags: ['platform', 'yıllık', 'tekstil'],
    notes: 'Aylık fatura otomatik kesilecek.',
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(), updatedAt: now(),
  },
  {
    id: uid(), no: 'SZL-2026-0002',
    title: 'E-Ticaret Entegrasyon Projesi — Moda Koleksiyon',
    description: 'Trendyol ve HepsiBurada entegrasyon geliştirme projesi',
    type: 'satış', status: 'müzakere',
    seller: MY_PARTY,
    buyer: { name: 'Moda Koleksiyon', title: 'Müşteri', email: 'selin@modakoleksiyon.com', taxNo: '2223334445', signedAt: '' },
    startDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 104 * 86400000).toISOString().slice(0, 10),
    signedDate: '', reviewDate: '',
    value: 32000, currency: 'TRY', paymentTerms: 'Net 30',
    quoteNo: 'TKF-2026-0005', invoiceNos: '', pipelineId: '',
    signatureStatus: 'taraf_imzaladı', autoRenew: false, renewNoticeDays: 14,
    milestones: [],
    tags: ['proje', 'entegrasyon'],
    notes: 'Müzakere devam ediyor. Sözleşme düzenlemesi bekleniyor.',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: now(),
  },
  {
    id: uid(), no: 'SZL-2026-0003',
    title: 'Ofis Kiralama Sözleşmesi — Maslak Plaza',
    description: 'Merkez ofis 3 yıllık kira sözleşmesi',
    type: 'kira', status: 'yenileme_bekliyor',
    seller: { name: 'Maslak Plaza Yönetimi', title: 'Kiraya Veren', email: 'yonetim@maslakplaza.com', taxNo: '5551112223', signedAt: new Date(Date.now() - 1095 * 86400000).toISOString().slice(0, 10) },
    buyer: { ...MY_PARTY, title: 'Kiracı' },
    startDate: new Date(Date.now() - 1095 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    signedDate: new Date(Date.now() - 1090 * 86400000).toISOString().slice(0, 10),
    reviewDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    value: 102000, currency: 'TRY', paymentTerms: 'Aylık',
    quoteNo: '', invoiceNos: '', pipelineId: '',
    signatureStatus: 'tamamlandı', autoRenew: true, renewNoticeDays: 60,
    milestones: [],
    tags: ['kira', 'ofis'],
    notes: 'Yenileme için 45 günlük bildirim yapılması gerekiyor.',
    createdAt: new Date(Date.now() - 1095 * 86400000).toISOString(), updatedAt: now(),
  },
  {
    id: uid(), no: 'SZL-2026-0004',
    title: 'NDA — Yıldız Gıda Ltd.',
    description: 'Yazılım geliştirme görüşmeleri öncesi karşılıklı gizlilik sözleşmesi',
    type: 'gizlilik', status: 'aktif',
    seller: MY_PARTY,
    buyer: { name: 'Yıldız Gıda Ltd. Şti.', title: 'Diğer Taraf', email: 'fatma@yildzgida.com', taxNo: '5551234567', signedAt: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) },
    startDate: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 355 * 86400000).toISOString().slice(0, 10),
    signedDate: new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10),
    reviewDate: '',
    value: 0, currency: 'TRY', paymentTerms: '—',
    quoteNo: '', invoiceNos: '', pipelineId: '',
    signatureStatus: 'tamamlandı', autoRenew: false, renewNoticeDays: 30,
    milestones: [],
    tags: ['nda', 'gizlilik'],
    notes: '',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), updatedAt: now(),
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SozlesmelerPage() {
  const toast = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selected, setSelected] = useState<Contract | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'tümü'>('tümü')
  const [filterType, setFilterType] = useState<ContractType | 'tümü'>('tümü')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const emptyForm = (): Omit<Contract, 'id' | 'no' | 'createdAt' | 'updatedAt'> => ({
    title: '', description: '', type: 'hizmet', status: 'taslak',
    seller: { ...MY_PARTY }, buyer: { name: '', title: 'Müşteri', email: '', taxNo: '', signedAt: '' },
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    signedDate: '', reviewDate: '',
    value: 0, currency: 'TRY', paymentTerms: 'Net 30',
    quoteNo: '', invoiceNos: '', pipelineId: '',
    signatureStatus: 'imzalanmadı', autoRenew: false, renewNoticeDays: 30,
    milestones: [], tags: [], notes: '',
  })
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed: Contract[] = JSON.parse(raw)
        const maxNo = parsed.reduce((m, c) => Math.max(m, parseInt(c.no.split('-')[2] || '0')), 0)
        _counter = maxNo + 1
        setContracts(parsed)
      } else {
        _counter = DEMO.length + 1
        setContracts(DEMO)
        localStorage.setItem(LS_KEY, JSON.stringify(DEMO))
      }
    } catch { setContracts(DEMO) }
  }, [])

  const save = useCallback((updated: Contract[]) => {
    setContracts(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  // Auto-expire check
  useEffect(() => {
    if (contracts.length === 0) return
    const updated = contracts.map(c => {
      if (c.status !== 'aktif') return c
      const days = daysUntil(c.endDate)
      if (days < 0) return { ...c, status: 'sona_erdi' as ContractStatus, updatedAt: now() }
      if (days <= c.renewNoticeDays) return { ...c, status: 'yenileme_bekliyor' as ContractStatus, updatedAt: now() }
      return c
    })
    if (updated.some((c, i) => c.status !== contracts[i].status)) save(updated)
  }, [contracts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'aktif')
    const expiringSoon = contracts.filter(c => c.status === 'yenileme_bekliyor').length
    const totalValue = active.reduce((s, c) => s + (c.currency === 'TRY' ? c.value : 0), 0)
    const unsigned = contracts.filter(c => c.signatureStatus !== 'tamamlandı' && c.status !== 'iptal' && c.status !== 'sona_erdi').length
    return { active: active.length, expiringSoon, totalValue, unsigned, total: contracts.length }
  }, [contracts])

  const filtered = useMemo(() => {
    let list = contracts
    if (filterStatus !== 'tümü') list = list.filter(c => c.status === filterStatus)
    if (filterType !== 'tümü') list = list.filter(c => c.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.no.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.buyer.name.toLowerCase().includes(q))
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [contracts, filterStatus, filterType, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleStatusChange = (contract: Contract, status: ContractStatus) => {
    const updated = contracts.map(c => c.id === contract.id ? { ...c, status, updatedAt: now() } : c)
    save(updated)
    if (selected?.id === contract.id) setSelected(updated.find(c => c.id === contract.id) || null)
    toast.success(`Durum: ${STATUS_MAP[status].label}`)
  }

  const handleSignature = (contract: Contract, sig: SignatureStatus) => {
    const updated = contracts.map(c => c.id === contract.id ? {
      ...c, signatureStatus: sig,
      status: sig === 'tamamlandı' && c.status === 'taslak' ? 'aktif' as ContractStatus : c.status,
      signedDate: sig === 'tamamlandı' && !c.signedDate ? new Date().toISOString().slice(0, 10) : c.signedDate,
      updatedAt: now(),
    } : c)
    save(updated)
    if (selected?.id === contract.id) setSelected(updated.find(c => c.id === contract.id) || null)
    toast.success('İmza durumu güncellendi')
  }

  const handleDelete = (id: string) => {
    save(contracts.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Sözleşme silindi')
  }

  const handleSave = () => {
    if (!form.title.trim() || !form.buyer.name.trim()) { toast.error('Başlık ve alıcı adı zorunludur'); return }
    if (editingContract) {
      save(contracts.map(c => c.id === editingContract.id ? { ...c, ...form, updatedAt: now() } : c))
      toast.success('Sözleşme güncellendi')
    } else {
      const contract: Contract = { id: uid(), no: nextNo(), ...form, createdAt: now(), updatedAt: now() }
      save([contract, ...contracts])
      toast.success(`Sözleşme oluşturuldu: ${contract.no}`)
    }
    setShowForm(false); setEditingContract(null); setForm(emptyForm())
  }

  const handleExport = () => {
    const header = ['No', 'Başlık', 'Tür', 'Alıcı', 'Durum', 'Değer', 'Başlangıç', 'Bitiş', 'İmza']
    const rows = filtered.map(c => [c.no, c.title, TYPE_MAP[c.type].label, c.buyer.name, STATUS_MAP[c.status].label, c.value, c.startDate, c.endDate, SIG_MAP[c.signatureStatus].label])
    const csv = [header, ...rows].map(r => r.join('\t')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/tab-separated-values' })); a.download = 'sozlesmeler.csv'; a.click()
    toast.success('CSV indirildi')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Sözleşme Yönetimi</h1>
          <p className="text-slate-400 text-sm font-semibold">Tüm sözleşmeleri tek yerden takip edin, vade uyarılarını kaçırmayın</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground text-sm transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => { setEditingContract(null); setForm(emptyForm()); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus size={16} /> Yeni Sözleşme
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Aktif Sözleşme', value: stats.active,         color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Yenileme Yakın', value: stats.expiringSoon,   color: stats.expiringSoon > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          { label: 'İmza Bekliyor',  value: stats.unsigned,       color: stats.unsigned > 0 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          { label: 'Aktif Değer',    value: `₺${(stats.totalValue/1000).toFixed(0)}K`, color: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Toplam',         value: stats.total,          color: 'text-slate-300 bg-slate-800/40 border-slate-700/40' },
        ].map(s => (
          <div key={s.label} className={`premium-card rounded-2xl border p-4 ${s.color}`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Renewal warnings */}
      {stats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold">
          <Bell size={16} />
          {stats.expiringSoon} sözleşme yenileme süresine girdi — incelemeniz önerilen.
        </div>
      )}

      {/* Filters */}
      <div className="premium-card rounded-2xl border border-border/40 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="No, başlık, müşteri ara..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as ContractStatus | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.entries(STATUS_MAP) as [ContractStatus, typeof STATUS_MAP[ContractStatus]][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value as ContractType | 'tümü'); setPage(1) }}
          className="px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Türler</option>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{TYPE_MAP[t].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="premium-card rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-slate-900/40">
              <tr>
                {['No', 'Başlık', 'Tür', 'Diğer Taraf', 'Değer', 'Bitiş', 'İmza', 'Durum', ''].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paged.map(contract => {
                const StatusIcon = STATUS_MAP[contract.status].icon
                const days = daysUntil(contract.endDate)
                const isExpiringSoon = contract.status === 'yenileme_bekliyor'
                return (
                  <tr key={contract.id}
                    onClick={() => setSelected(s => s?.id === contract.id ? null : contract)}
                    className={`hover:bg-slate-800/20 cursor-pointer transition-colors ${isExpiringSoon ? 'border-l-2 border-l-amber-400' : ''}`}>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-primary">{contract.no}</span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="font-semibold truncate">{contract.title}</p>
                      {contract.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {contract.tags.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`text-xs font-bold ${TYPE_MAP[contract.type].color}`}>{TYPE_MAP[contract.type].label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-sm">{contract.buyer.name === MY_PARTY.name ? contract.seller.name : contract.buyer.name}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {contract.value > 0 ? <span className="font-black text-primary text-sm">₺{fmt(contract.value)}</span> : <span className="text-slate-500 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className={`text-xs font-mono ${days < 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {contract.endDate}
                        {days >= 0 && days <= 60 && <span className="ml-1">({days}g)</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className={`text-xs font-semibold ${SIG_MAP[contract.signatureStatus].color}`}>
                        {contract.signatureStatus === 'tamamlandı' ? '✓ Tam' : contract.signatureStatus === 'taraf_imzaladı' ? '½ Bizim' : contract.signatureStatus === 'karşı_taraf_imzaladı' ? '½ Karşı' : '✗'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[contract.status].color}`}>
                        <StatusIcon size={10} />
                        {STATUS_MAP[contract.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 hover:text-primary transition-colors">
                      <Eye size={14} />
                    </td>
                  </tr>
                )
              })}
              {paged.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">
                  <FileSignature className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                  <p className="font-semibold">Sözleşme bulunamadı</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-sm text-slate-400">
            <span>{filtered.length} sözleşme · Sayfa {page}/{totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Panel ────────────────────────────────────────────────────── */}
      {selected && (
        <div className="premium-card rounded-2xl border border-primary/30 p-6 space-y-5 shadow-xl shadow-primary/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono font-black text-primary">{selected.no}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_MAP[selected.status].color}`}>
                  {STATUS_MAP[selected.status].label}
                </span>
                <span className={`text-xs font-bold ${TYPE_MAP[selected.type].color}`}>{TYPE_MAP[selected.type].label}</span>
              </div>
              <h2 className="font-bold text-lg">{selected.title}</h2>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => { setEditingContract(selected); setForm({ ...selected }); setShowForm(true); setSelected(null) }}
                className="p-2 rounded-xl border border-border/40 hover:border-primary/30 text-slate-400 hover:text-primary transition-colors">
                <Edit2 size={15} />
              </button>
              <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-xl border border-border/40 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl border border-border/40 hover:bg-slate-800/40 text-slate-400"><X size={15} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="premium-card rounded-xl p-3 border border-border/40">
              <p className="text-xs text-slate-500 mb-1">Sözleşme Değeri</p>
              <p className="font-black text-primary text-lg">{selected.value > 0 ? `₺${fmt(selected.value)}` : '—'}</p>
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40">
              <p className="text-xs text-slate-500 mb-1">Süre</p>
              <p className="font-bold">{selected.startDate}</p>
              <p className="text-xs text-slate-500">→ {selected.endDate}</p>
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40">
              <p className="text-xs text-slate-500 mb-1">Ödeme Şartı</p>
              <p className="font-bold">{selected.paymentTerms}</p>
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40">
              <p className="text-xs text-slate-500 mb-1">Otomatik Yenileme</p>
              <p className={`font-bold ${selected.autoRenew ? 'text-emerald-400' : 'text-slate-400'}`}>
                {selected.autoRenew ? `Evet (${selected.renewNoticeDays}g bildirim)` : 'Hayır'}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="premium-card rounded-xl p-3 border border-border/40">
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Satıcı / Sağlayıcı</p>
              <p className="font-semibold text-sm">{selected.seller.name}</p>
              <p className="text-xs text-slate-500">{selected.seller.email}</p>
              {selected.seller.signedAt && <p className="text-xs text-emerald-400 mt-1">✓ İmzalandı: {selected.seller.signedAt}</p>}
            </div>
            <div className="premium-card rounded-xl p-3 border border-border/40">
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Alıcı / Müşteri</p>
              <p className="font-semibold text-sm">{selected.buyer.name}</p>
              <p className="text-xs text-slate-500">{selected.buyer.email}</p>
              {selected.buyer.signedAt && <p className="text-xs text-emerald-400 mt-1">✓ İmzalandı: {selected.buyer.signedAt}</p>}
            </div>
          </div>

          {/* Signature + links */}
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <p className="text-xs text-slate-500 mb-1.5">İmza Durumu</p>
              <div className="flex gap-2">
                {(Object.entries(SIG_MAP) as [SignatureStatus, typeof SIG_MAP[SignatureStatus]][]).map(([k, v]) => (
                  <button key={k} onClick={() => handleSignature(selected, k)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${selected.signatureStatus === k ? `${v.color} border-current/40 bg-current/10` : 'border-border/40 text-slate-500 hover:border-primary/30'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              {selected.quoteNo && (
                <Link href="/dashboard/teklifler" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/40 text-xs text-slate-400 hover:text-primary hover:border-primary/30 transition-colors">
                  <FileText size={12} /> {selected.quoteNo}
                </Link>
              )}
              {selected.invoiceNos && (
                <Link href="/dashboard/efatura" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/40 text-xs text-slate-400 hover:text-primary hover:border-primary/30 transition-colors">
                  <FileSignature size={12} /> {selected.invoiceNos}
                </Link>
              )}
            </div>
          </div>

          {/* Milestones */}
          {selected.milestones.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Kilometre Taşları</p>
              <div className="space-y-1.5">
                {selected.milestones.map(m => (
                  <div key={m.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs ${m.completed ? 'border-emerald-500/20 bg-emerald-950/20' : new Date(m.date) < new Date() ? 'border-red-500/20 bg-red-950/10' : 'border-border/40'}`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${m.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                      {m.completed && <CheckCheck size={9} className="text-white" />}
                    </span>
                    <span className="font-semibold flex-1">{m.label}</span>
                    <span className="text-slate-500 font-mono">{m.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status change */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Durumu Değiştir</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_MAP) as [ContractStatus, typeof STATUS_MAP[ContractStatus]][])
                .filter(([k]) => k !== selected.status)
                .map(([k, v]) => {
                  const VIcon = v.icon
                  return (
                    <button key={k} onClick={() => handleStatusChange(selected, k)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${v.color}`}>
                      <VIcon size={11} /> {v.label}
                    </button>
                  )
                })}
            </div>
          </div>

          {selected.notes && (
            <p className="text-xs text-slate-400 italic border-t border-border/40 pt-3">{selected.notes}</p>
          )}
        </div>
      )}

      {/* ── Add/Edit Form Modal ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingContract(null) }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="font-bold text-lg">{editingContract ? 'Sözleşmeyi Düzenle' : 'Yeni Sözleşme'}</h3>
              <button onClick={() => { setShowForm(false); setEditingContract(null) }} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Başlık *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Sözleşme başlığı..."
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tür</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ContractType }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{TYPE_MAP[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Durum</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContractStatus }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(Object.entries(STATUS_MAP) as [ContractStatus, typeof STATUS_MAP[ContractStatus]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Diğer Taraf *</label>
                  <input value={form.buyer.name} onChange={e => setForm(f => ({ ...f, buyer: { ...f.buyer, name: e.target.value } }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Taraf E-Posta</label>
                  <input value={form.buyer.email} onChange={e => setForm(f => ({ ...f, buyer: { ...f.buyer, email: e.target.value } }))}
                    type="email" className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
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
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Değer (₺)</label>
                  <input type="number" min={0} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Ödeme Şartı</label>
                  <select value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {PAYMENT_TERMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">İlgili Teklif No</label>
                  <input value={form.quoteNo} onChange={e => setForm(f => ({ ...f, quoteNo: e.target.value }))}
                    placeholder="TKF-2026-XXXX"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Oto. Yenileme</label>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => setForm(f => ({ ...f, autoRenew: !f.autoRenew }))}
                      className={`w-10 h-5.5 rounded-full border relative transition-all ${form.autoRenew ? 'bg-primary border-primary/50' : 'bg-slate-700 border-slate-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.autoRenew ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs text-slate-400">{form.autoRenew ? 'Evet' : 'Hayır'}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Notlar</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowForm(false); setEditingContract(null) }} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                <FileSignature size={15} /> {editingContract ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
