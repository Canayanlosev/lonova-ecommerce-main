'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Landmark, Plus, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  TrendingUp, TrendingDown, Download, Edit2, Trash2, Search,
  ChevronLeft, ChevronRight, DollarSign, Eye, EyeOff,
  CreditCard, Wallet, Building2, CheckCircle2, AlertCircle,
  RefreshCw, BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type Currency = 'TRY' | 'USD' | 'EUR'
type AccountType = 'vadesiz' | 'vadeli' | 'kredi_karti' | 'kasa'
type TxType = 'gelir' | 'gider' | 'transfer'

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNo: string
  iban: string
  type: AccountType
  currency: Currency
  openingBalance: number
  color: string
  createdAt: string
  isActive: boolean
}

interface Transaction {
  id: string
  accountId: string
  date: string           // YYYY-MM-DD
  description: string
  category: string
  type: TxType
  amount: number
  toAccountId: string    // for transfers
  reference: string
  reconciled: boolean
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_ACCOUNTS = 'banka-hesaplari'
const LS_TX       = 'banka-islemler'

const ACCOUNT_TYPES: Record<AccountType, string> = {
  vadesiz:     'Vadesiz Hesap',
  vadeli:      'Vadeli Hesap',
  kredi_karti: 'Kredi Kartı',
  kasa:        'Kasa',
}

const TX_CATEGORIES = [
  'Satış Geliri', 'Kira Geliri', 'Diğer Gelir',
  'Tedarikçi Ödemesi', 'Kira Gideri', 'Maaş',
  'Fatura & Abonelik', 'Vergi', 'Reklam & Pazarlama',
  'Kargo & Lojistik', 'Ofis Giderleri', 'Diğer Gider', 'Transfer',
]

const BANKS = [
  'Ziraat Bankası', 'İş Bankası', 'Garanti BBVA', 'Akbank',
  'Yapı Kredi', 'Halkbank', 'VakıfBank', 'Denizbank',
  'QNB Finansbank', 'TEB', 'İNG Bank', 'Diğer',
]

const ACCOUNT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

const CURRENCY_SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' }

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const fmt = (n: number, currency: Currency = 'TRY') =>
  `${CURRENCY_SYMBOL[currency]}${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const todayISO = () => new Date().toISOString().slice(0, 10)

// ─── Demo Seed ────────────────────────────────────────────────────────────────

function buildDemo(): { accounts: BankAccount[]; transactions: Transaction[] } {
  const acc1: BankAccount = { id: 'acc1', bankName: 'Ziraat Bankası', accountName: 'Ana İşletme Hesabı', accountNo: '123456789', iban: 'TR12 0001 0012 3456 7890 0000 01', type: 'vadesiz', currency: 'TRY', openingBalance: 150000, color: '#10b981', createdAt: new Date(Date.now() - 365 * 86400000).toISOString(), isActive: true }
  const acc2: BankAccount = { id: 'acc2', bankName: 'Garanti BBVA', accountName: 'Operasyonel Hesap', accountNo: '987654321', iban: 'TR34 0006 2001 1234 5678 9000 02', type: 'vadesiz', currency: 'TRY', openingBalance: 50000, color: '#6366f1', createdAt: new Date(Date.now() - 180 * 86400000).toISOString(), isActive: true }
  const acc3: BankAccount = { id: 'acc3', bankName: 'İş Bankası', accountName: 'Döviz Hesabı', accountNo: '555444333', iban: 'TR99 0006 4000 0011 2233 4455 66', type: 'vadesiz', currency: 'USD', openingBalance: 8000, color: '#f59e0b', createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), isActive: true }
  const acc4: BankAccount = { id: 'acc4', bankName: '', accountName: 'Kasa', accountNo: '', iban: '', type: 'kasa', currency: 'TRY', openingBalance: 5000, color: '#ec4899', createdAt: new Date(Date.now() - 365 * 86400000).toISOString(), isActive: true }

  const now = Date.now()
  const d = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString().slice(0, 10)

  const txs: Transaction[] = [
    { id: uid(), accountId: 'acc1', date: d(1),  description: 'Sipariş #29401 tahsilatı', category: 'Satış Geliri',       type: 'gelir',    amount: 4850,   toAccountId: '', reference: 'ORD-29401', reconciled: true,  createdAt: new Date(now - 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(1),  description: 'Kargo bedeli — Aras Kargo', category: 'Kargo & Lojistik',  type: 'gider',    amount: 320,    toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(2),  description: 'Güneş Tekstil ödemesi',    category: 'Satış Geliri',       type: 'gelir',    amount: 18500,  toAccountId: '', reference: 'TKF-2026-0003', reconciled: true,  createdAt: new Date(now - 2 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(3),  description: 'Tedarikçi faturası',       category: 'Tedarikçi Ödemesi',  type: 'gider',    amount: 9200,   toAccountId: '', reference: 'PO-2026-0001', reconciled: true,  createdAt: new Date(now - 3 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(5),  description: 'Maaş ödemeleri — Mayıs',  category: 'Maaş',               type: 'gider',    amount: 45000,  toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 5 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(5),  description: 'Google Ads',               category: 'Reklam & Pazarlama', type: 'gider',    amount: 2500,   toAccountId: '', reference: '', reconciled: false, createdAt: new Date(now - 5 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(7),  description: 'Online satış tahsilatı',   category: 'Satış Geliri',       type: 'gelir',    amount: 12300,  toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 7 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(8),  description: 'Kira gideri — Haziran',   category: 'Kira Gideri',        type: 'gider',    amount: 8500,   toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 8 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc1', date: d(10), description: 'Operasyonel hesaba transfer', category: 'Transfer',        type: 'transfer', amount: 20000,  toAccountId: 'acc2', reference: '', reconciled: true, createdAt: new Date(now - 10 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc2', date: d(10), description: 'Ana hesaptan transfer',    category: 'Transfer',           type: 'transfer', amount: 20000,  toAccountId: 'acc1', reference: '', reconciled: true, createdAt: new Date(now - 10 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc2', date: d(2),  description: 'Fatura ödemeleri — Mayıs', category: 'Fatura & Abonelik', type: 'gider',    amount: 1850,   toAccountId: '', reference: '', reconciled: false, createdAt: new Date(now - 2 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc2', date: d(4),  description: 'Danışmanlık geliri',       category: 'Diğer Gelir',        type: 'gelir',    amount: 7500,   toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 4 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc3', date: d(6),  description: 'USD ihracat ödemesi',      category: 'Satış Geliri',       type: 'gelir',    amount: 2500,   toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 6 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc3', date: d(9),  description: 'Yazılım lisansı USD',      category: 'Fatura & Abonelik',  type: 'gider',    amount: 299,    toAccountId: '', reference: '', reconciled: false, createdAt: new Date(now - 9 * 86400000).toISOString() },
    { id: uid(), accountId: 'acc4', date: d(1),  description: 'Günlük kasa girişi',       category: 'Satış Geliri',       type: 'gelir',    amount: 1200,   toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 86400000).toISOString() },
    { id: uid(), accountId: 'acc4', date: d(2),  description: 'Küçük ofis gideri',        category: 'Ofis Giderleri',     type: 'gider',    amount: 450,    toAccountId: '', reference: '', reconciled: true,  createdAt: new Date(now - 2 * 86400000).toISOString() },
  ]

  return { accounts: [acc1, acc2, acc3, acc4], transactions: txs }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BankaPage() {
  const toast = useToast()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'tümü'>('tümü')
  const [showBalances, setShowBalances] = useState(true)
  const [showTxForm, setShowTxForm] = useState(false)
  const [showAccForm, setShowAccForm] = useState(false)
  const [editingAcc, setEditingAcc] = useState<BankAccount | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<TxType | 'tümü'>('tümü')
  const [txPage, setTxPage] = useState(1)
  const TX_PAGE_SIZE = 15

  // New transaction form
  const emptyTx = (): Omit<Transaction, 'id' | 'createdAt'> => ({
    accountId: accounts[0]?.id ?? '',
    date: todayISO(),
    description: '',
    category: 'Satış Geliri',
    type: 'gelir',
    amount: 0,
    toAccountId: '',
    reference: '',
    reconciled: false,
  })
  const [txForm, setTxForm] = useState(emptyTx())

  // Account form
  const emptyAcc = (): Omit<BankAccount, 'id' | 'createdAt'> => ({
    bankName: BANKS[0], accountName: '', accountNo: '', iban: '',
    type: 'vadesiz', currency: 'TRY', openingBalance: 0,
    color: ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length] ?? ACCOUNT_COLORS[0],
    isActive: true,
  })
  const [accForm, setAccForm] = useState(emptyAcc())

  useEffect(() => {
    try {
      const rawA = localStorage.getItem(LS_ACCOUNTS)
      const rawT = localStorage.getItem(LS_TX)
      if (rawA && rawT) {
        setAccounts(JSON.parse(rawA))
        setTransactions(JSON.parse(rawT))
      } else {
        const { accounts: a, transactions: t } = buildDemo()
        setAccounts(a); setTransactions(t)
        localStorage.setItem(LS_ACCOUNTS, JSON.stringify(a))
        localStorage.setItem(LS_TX, JSON.stringify(t))
      }
    } catch {
      const { accounts: a, transactions: t } = buildDemo()
      setAccounts(a); setTransactions(t)
    }
  }, [])

  const saveAccounts = useCallback((a: BankAccount[]) => {
    setAccounts(a)
    localStorage.setItem(LS_ACCOUNTS, JSON.stringify(a))
  }, [])

  const saveTx = useCallback((t: Transaction[]) => {
    setTransactions(t)
    localStorage.setItem(LS_TX, JSON.stringify(t))
  }, [])

  // Compute balance per account
  const balanceMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acc of accounts) {
      const txs = transactions.filter(t => t.accountId === acc.id)
      const inflow = txs.filter(t => t.type === 'gelir').reduce((s, t) => s + t.amount, 0)
      const outflow = txs.filter(t => t.type === 'gider').reduce((s, t) => s + t.amount, 0)
      map[acc.id] = acc.openingBalance + inflow - outflow
    }
    return map
  }, [accounts, transactions])

  // Filtered transactions
  const filteredTx = useMemo(() => {
    let list = transactions
    if (selectedAccountId !== 'tümü') list = list.filter(t => t.accountId === selectedAccountId)
    if (filterType !== 'tümü') list = list.filter(t => t.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q))
    }
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, selectedAccountId, filterType, search])

  const totalPages = Math.max(1, Math.ceil(filteredTx.length / TX_PAGE_SIZE))
  const pagedTx = filteredTx.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE)

  // Monthly cash flow chart (last 6 months)
  const cashFlowData = useMemo(() => {
    const months: { label: string; key: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('tr-TR', { month: 'short' }),
      })
    }
    const accTxs = selectedAccountId !== 'tümü'
      ? transactions.filter(t => t.accountId === selectedAccountId)
      : transactions
    return months.map(m => {
      const monthTxs = accTxs.filter(t => t.date.startsWith(m.key))
      const gelir = monthTxs.filter(t => t.type === 'gelir').reduce((s, t) => s + t.amount, 0)
      const gider = monthTxs.filter(t => t.type === 'gider').reduce((s, t) => s + t.amount, 0)
      return { label: m.label, gelir: Math.round(gelir), gider: Math.round(gider), net: Math.round(gelir - gider) }
    })
  }, [transactions, selectedAccountId])

  // Summary stats
  const stats = useMemo(() => {
    const accTxs = selectedAccountId !== 'tümü'
      ? transactions.filter(t => t.accountId === selectedAccountId)
      : transactions
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthTxs = accTxs.filter(t => t.date.startsWith(thisMonth))
    const gelir = monthTxs.filter(t => t.type === 'gelir').reduce((s, t) => s + t.amount, 0)
    const gider = monthTxs.filter(t => t.type === 'gider').reduce((s, t) => s + t.amount, 0)
    const unreconciled = accTxs.filter(t => !t.reconciled).length
    const totalBalance = selectedAccountId !== 'tümü'
      ? balanceMap[selectedAccountId] ?? 0
      : accounts.filter(a => a.currency === 'TRY').reduce((s, a) => s + (balanceMap[a.id] ?? 0), 0)
    return { gelir, gider, net: gelir - gider, unreconciled, totalBalance }
  }, [transactions, accounts, selectedAccountId, balanceMap])

  const handleAddTx = () => {
    if (!txForm.accountId || !txForm.description.trim() || txForm.amount <= 0) {
      toast.error('Hesap, açıklama ve tutar zorunludur')
      return
    }
    const tx: Transaction = { id: uid(), ...txForm, createdAt: new Date().toISOString() }
    saveTx([tx, ...transactions])
    setShowTxForm(false)
    setTxForm(emptyTx())
    toast.success('İşlem eklendi')
  }

  const handleToggleReconcile = (tx: Transaction) => {
    saveTx(transactions.map(t => t.id === tx.id ? { ...t, reconciled: !t.reconciled } : t))
  }

  const handleDeleteTx = (id: string) => {
    saveTx(transactions.filter(t => t.id !== id))
    toast.success('İşlem silindi')
  }

  const handleSaveAcc = () => {
    if (!accForm.accountName.trim()) { toast.error('Hesap adı zorunludur'); return }
    if (editingAcc) {
      saveAccounts(accounts.map(a => a.id === editingAcc.id ? { ...a, ...accForm } : a))
      toast.success('Hesap güncellendi')
    } else {
      const acc: BankAccount = { id: uid(), ...accForm, createdAt: new Date().toISOString() }
      saveAccounts([...accounts, acc])
      toast.success('Hesap eklendi')
    }
    setShowAccForm(false); setEditingAcc(null); setAccForm(emptyAcc())
  }

  const handleDeleteAcc = (id: string) => {
    if (transactions.some(t => t.accountId === id)) { toast.error('Bu hesaba ait işlemler var, önce silin'); return }
    saveAccounts(accounts.filter(a => a.id !== id))
    if (selectedAccountId === id) setSelectedAccountId('tümü')
    toast.success('Hesap silindi')
  }

  const handleExport = () => {
    const accMap: Record<string, string> = {}
    for (const a of accounts) accMap[a.id] = `${a.bankName} — ${a.accountName}`
    const header = ['Tarih', 'Hesap', 'Açıklama', 'Kategori', 'Tür', 'Tutar', 'Referans', 'Mutabakat']
    const rows = filteredTx.map(t => [
      t.date, accMap[t.accountId] ?? t.accountId, t.description, t.category,
      t.type === 'gelir' ? 'Gelir' : t.type === 'gider' ? 'Gider' : 'Transfer',
      t.type === 'gider' ? `-${t.amount}` : t.amount,
      t.reference, t.reconciled ? 'Evet' : 'Hayır',
    ])
    const csv = [header, ...rows].map(r => r.join('\t')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/tab-separated-values' })); a.download = 'banka-islemler.csv'; a.click()
    toast.success('CSV indirildi')
  }

  const selectedAcc = selectedAccountId !== 'tümü' ? accounts.find(a => a.id === selectedAccountId) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Banka Hesapları</h1>
          <p className="text-slate-400 text-sm font-semibold">Nakit akışı ve hesap bakiyelerini takip edin</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground hover:border-primary/40 transition-all text-sm">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => setShowBalances(b => !b)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-slate-400 hover:text-foreground transition-all text-sm">
            {showBalances ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button onClick={() => { setTxForm(emptyTx()); setShowTxForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
            <Plus size={16} /> İşlem Ekle
          </button>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map(acc => {
          const balance = balanceMap[acc.id] ?? 0
          const isSelected = selectedAccountId === acc.id
          return (
            <button key={acc.id}
              onClick={() => setSelectedAccountId(isSelected ? 'tümü' : acc.id)}
              className={`premium-card rounded-2xl p-5 border text-left transition-all hover:shadow-lg group ${isSelected ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/40 hover:border-border/70'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg"
                  style={{ backgroundColor: acc.color }}>
                  {acc.type === 'kasa' ? <Wallet size={18} /> : <Landmark size={18} />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); setEditingAcc(acc); setAccForm({ bankName: acc.bankName, accountName: acc.accountName, accountNo: acc.accountNo, iban: acc.iban, type: acc.type, currency: acc.currency, openingBalance: acc.openingBalance, color: acc.color, isActive: acc.isActive }); setShowAccForm(true) }}
                    className="p-1 rounded-lg hover:bg-slate-700/40 text-slate-400 hover:text-white">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteAcc(acc.id) }}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-semibold truncate">{acc.bankName || ACCOUNT_TYPES[acc.type]}</p>
              <p className="text-sm font-bold truncate">{acc.accountName}</p>
              <p className="text-xl font-black mt-2" style={{ color: acc.color }}>
                {showBalances ? fmt(balance, acc.currency) : '••••••'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{ACCOUNT_TYPES[acc.type]} · {acc.currency}</p>
              {acc.iban && <p className="text-[10px] text-slate-600 mt-1 font-mono truncate">{acc.iban}</p>}
            </button>
          )
        })}
        <button onClick={() => { setEditingAcc(null); setAccForm(emptyAcc()); setShowAccForm(true) }}
          className="premium-card rounded-2xl p-5 border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-primary min-h-[140px]">
          <Plus size={24} />
          <span className="text-sm font-semibold">Hesap Ekle</span>
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: selectedAcc ? `${selectedAcc.accountName} Bakiyesi` : 'Toplam TL Bakiye', value: showBalances ? fmt(stats.totalBalance) : '••••', color: 'text-primary bg-primary/10 border-primary/20' },
          { label: 'Bu Ay Gelir',  value: showBalances ? fmt(stats.gelir) : '••••', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Bu Ay Gider',  value: showBalances ? fmt(stats.gider) : '••••', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
          { label: 'Net Nakit Akışı', value: showBalances ? fmt(Math.abs(stats.net)) : '••••', color: stats.net >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20' },
        ].map(s => (
          <div key={s.label} className={`premium-card rounded-2xl border p-4 ${s.color}`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cash flow chart */}
      <div className="premium-card rounded-2xl border border-border/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold">Nakit Akışı — Son 6 Ay</p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Gelir</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Gider</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Net</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cashFlowData} barGap={4}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
              tickFormatter={v => `₺${(Number(v) / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
              formatter={(v) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']}
            />
            <Bar dataKey="gelir" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Bar dataKey="gider" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Bar dataKey="net" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction list */}
      <div className="premium-card rounded-2xl border border-border/40 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border/40">
          <p className="font-bold">
            {selectedAcc ? `${selectedAcc.accountName} — İşlemler` : 'Tüm İşlemler'}
            <span className="text-slate-500 font-normal text-sm ml-2">({filteredTx.length})</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setTxPage(1) }}
                placeholder="Ara..."
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <select value={filterType} onChange={e => { setFilterType(e.target.value as TxType | 'tümü'); setTxPage(1) }}
              className="px-2.5 py-1.5 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
              <option value="tümü">Tümü</option>
              <option value="gelir">Gelir</option>
              <option value="gider">Gider</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-slate-900/30">
              <tr>
                {['Tarih', 'Açıklama', 'Kategori', 'Hesap', 'Tutar', 'Mut.', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {pagedTx.map(tx => {
                const acc = accounts.find(a => a.id === tx.accountId)
                return (
                  <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <p className="font-semibold truncate">{tx.description}</p>
                      {tx.reference && <p className="text-xs text-slate-500">{tx.reference}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 hidden md:table-cell">{tx.category}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {acc && (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                          {acc.accountName}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`font-bold text-sm flex items-center gap-1 ${tx.type === 'gelir' ? 'text-emerald-400' : tx.type === 'gider' ? 'text-red-400' : 'text-blue-400'}`}>
                        {tx.type === 'gelir' ? <ArrowDownLeft size={14} /> : tx.type === 'gider' ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}
                        {fmt(tx.amount, acc?.currency ?? 'TRY')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleToggleReconcile(tx)} title={tx.reconciled ? 'Mutabakat kaldır' : 'Mutabakatı onayla'}
                        className={`transition-colors ${tx.reconciled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'}`}>
                        <CheckCircle2 size={16} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleDeleteTx(tx.id)} className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pagedTx.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">İşlem bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-sm text-slate-400">
            <span>{filteredTx.length} işlem · Sayfa {txPage}/{totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setTxPage(p => Math.min(totalPages, p + 1))} disabled={txPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-800/40 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Unreconciled banner */}
        {stats.unreconciled > 0 && (
          <div className="mx-5 mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <AlertCircle size={14} />
            {stats.unreconciled} mutabakatı yapılmamış işlem var
          </div>
        )}
      </div>

      {/* ── Add Transaction Modal ──────────────────────────────────────────── */}
      {showTxForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTxForm(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">Yeni İşlem</h3>
              <button onClick={() => setShowTxForm(false)} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['gelir', 'gider', 'transfer'] as TxType[]).map(t => (
                  <button key={t} onClick={() => setTxForm(f => ({ ...f, type: t, category: t === 'gelir' ? 'Satış Geliri' : t === 'transfer' ? 'Transfer' : 'Tedarikçi Ödemesi' }))}
                    className={`py-2 rounded-xl text-sm font-bold border transition-colors capitalize ${txForm.type === t
                      ? t === 'gelir' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : t === 'gider' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                      : 'border-border/40 text-slate-400 hover:border-primary/30'}`}>
                    {t === 'gelir' ? 'Gelir' : t === 'gider' ? 'Gider' : 'Transfer'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Hesap</label>
                <select value={txForm.accountId} onChange={e => setTxForm(f => ({ ...f, accountId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName ? `${a.bankName} — ` : ''}{a.accountName}</option>)}
                </select>
              </div>
              {txForm.type === 'transfer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Hedef Hesap</label>
                  <select value={txForm.toAccountId} onChange={e => setTxForm(f => ({ ...f, toAccountId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    <option value="">Seç...</option>
                    {accounts.filter(a => a.id !== txForm.accountId).map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tarih</label>
                  <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tutar</label>
                  <input type="number" min={0} step="0.01" value={txForm.amount || ''} onChange={e => setTxForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Açıklama *</label>
                <input value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="İşlem açıklaması..."
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Kategori</label>
                  <select value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {TX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Referans</label>
                  <input value={txForm.reference} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="Fatura / sipariş no"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowTxForm(false)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
                <button onClick={handleAddTx} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Plus size={15} /> Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Account Modal ─────────────────────────────────────── */}
      {showAccForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAccForm(false); setEditingAcc(null) }} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg">{editingAcc ? 'Hesabı Düzenle' : 'Yeni Hesap'}</h3>
              <button onClick={() => { setShowAccForm(false); setEditingAcc(null) }} className="p-2 rounded-lg hover:bg-slate-800/40"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Hesap Adı *</label>
                <input value={accForm.accountName} onChange={e => setAccForm(f => ({ ...f, accountName: e.target.value }))}
                  placeholder="ör. Ana İşletme Hesabı"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Banka</label>
                  <select value={accForm.bankName} onChange={e => setAccForm(f => ({ ...f, bankName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Tür</label>
                  <select value={accForm.type} onChange={e => setAccForm(f => ({ ...f, type: e.target.value as AccountType }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(Object.entries(ACCOUNT_TYPES) as [AccountType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Para Birimi</label>
                  <select value={accForm.currency} onChange={e => setAccForm(f => ({ ...f, currency: e.target.value as Currency }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50">
                    {(['TRY', 'USD', 'EUR'] as Currency[]).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Başlangıç Bakiyesi</label>
                  <input type="number" value={accForm.openingBalance} onChange={e => setAccForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">IBAN</label>
                <input value={accForm.iban} onChange={e => setAccForm(f => ({ ...f, iban: e.target.value }))}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm font-mono focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Renk</label>
                <div className="flex gap-2">
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setAccForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${accForm.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowAccForm(false); setEditingAcc(null) }} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">İptal</button>
                <button onClick={handleSaveAcc} className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {editingAcc ? 'Güncelle' : <><Plus size={15} /> Ekle</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
