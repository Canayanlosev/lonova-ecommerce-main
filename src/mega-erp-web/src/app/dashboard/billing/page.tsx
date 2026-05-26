'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Receipt, CheckCircle, RefreshCw, FileText, Clock, XCircle,
  Download, Filter, Printer, X as CloseIcon, Calculator, ChevronDown, ChevronUp
} from 'lucide-react'
import { billingService } from '@/lib/services/billing.service'
import { useToast } from '@/store/ui.store'
import type { Invoice } from '@/types/api.types'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Draft:     { label: 'Taslak',  cls: 'bg-slate-800 text-slate-400 border border-border/80' },
  Issued:    { label: 'Kesildi', cls: 'bg-primary/10 text-primary border border-primary/20' },
  Paid:      { label: 'Ödendi',  cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Cancelled: { label: 'İptal',   cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

type StatusFilter = 'all' | 'Draft' | 'Issued' | 'Paid' | 'Cancelled'

export default function BillingPage() {
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [printInv, setPrintInv] = useState<Invoice | null>(null)
  const [kdvExpanded, setKdvExpanded] = useState(false)

  const load = () => {
    setLoading(true)
    billingService.getAll()
      .then(setInvoices)
      .catch(() => toast.error('Faturalar yüklenemedi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const markPaid = async (id: string) => {
    setMarking(id)
    try {
      await billingService.updateStatus(id, 'Paid')
      toast.success('Fatura ödendi olarak işaretlendi.')
      load()
    } catch {
      toast.error('İşlem başarısız.')
    } finally {
      setMarking(null)
    }
  }

  // Stats
  const stats = useMemo(() => ({
    total:     invoices.length,
    issued:    invoices.filter(i => i.status === 'Issued').length,
    paid:      invoices.filter(i => i.status === 'Paid').length,
    totalPaid: invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.totalAmount, 0),
    pending:   invoices.filter(i => i.status === 'Issued').reduce((s, i) => s + i.totalAmount, 0),
  }), [invoices])

  // KDV Summary
  const kdvStats = useMemo(() => {
    const now = new Date()
    const thisMonthISO = now.toISOString().slice(0, 7)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthISO = lm.toISOString().slice(0, 7)

    const paid = invoices.filter(i => i.status === 'Paid')
    const issued = invoices.filter(i => i.status === 'Issued')

    const thisMonthTax = paid.filter(i => i.invoiceDate.slice(0, 7) === thisMonthISO)
      .reduce((s, i) => s + i.totalTax, 0)
    const lastMonthTax = paid.filter(i => i.invoiceDate.slice(0, 7) === lastMonthISO)
      .reduce((s, i) => s + i.totalTax, 0)
    const pendingTax = issued.reduce((s, i) => s + i.totalTax, 0)
    const totalTax = paid.reduce((s, i) => s + i.totalTax, 0)
    const totalNet = paid.reduce((s, i) => s + (i.totalAmount - i.totalTax), 0)

    // Monthly breakdown (last 6 months)
    const monthlyMap: Record<string, { net: number; tax: number }> = {}
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
      const key = d.toISOString().slice(0, 7)
      monthlyMap[key] = { net: 0, tax: 0 }
    }
    for (const inv of paid) {
      const key = inv.invoiceDate.slice(0, 7)
      if (monthlyMap[key]) {
        monthlyMap[key].net += inv.totalAmount - inv.totalTax
        monthlyMap[key].tax += inv.totalTax
      }
    }
    const monthly = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }))

    return { thisMonthTax, lastMonthTax, pendingTax, totalTax, totalNet, monthly }
  }, [invoices])

  const filtered = useMemo(() =>
    statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter),
    [invoices, statusFilter])

  // CSV export
  const handleExport = () => {
    const rows = [
      ['Fatura No', 'Tarih', 'Vade', 'Tutar', 'Vergi', 'Durum'],
      ...filtered.map(i => [
        i.invoiceNumber,
        new Date(i.invoiceDate).toLocaleDateString('tr-TR'),
        new Date(i.dueDate).toLocaleDateString('tr-TR'),
        i.totalAmount.toFixed(2),
        i.totalTax.toFixed(2),
        STATUS_CONFIG[i.status]?.label ?? i.status,
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `faturalar_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Fatura Yönetimi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {invoices.length} fatura · {stats.issued > 0 && (
              <span className="text-amber-400">
                {stats.issued} ödeme bekliyor (₺{stats.pending.toLocaleString('tr-TR', { maximumFractionDigits: 0 })})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all" title="Yenile">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-slate-800 text-sm transition-all">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Fatura', value: stats.total,     icon: FileText,   color: 'bg-slate-800 text-slate-400' },
          { label: 'Bekleyen',      value: stats.issued,    icon: Clock,      color: 'bg-amber-500/10 text-amber-400' },
          { label: 'Ödenen',        value: stats.paid,      icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'İptal',         value: invoices.filter(i => i.status === 'Cancelled').length, icon: XCircle, color: 'bg-red-500/10 text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="premium-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Paid revenue callout */}
      {stats.totalPaid > 0 && (
        <div className="premium-card p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                ₺{stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} tahsil edildi
              </p>
              <p className="text-xs text-slate-400">{stats.paid} fatura ödendi</p>
            </div>
          </div>
        </div>
      )}

      {/* KDV Özeti */}
      {!loading && invoices.some(i => i.totalTax > 0) && (
        <div className="premium-card overflow-hidden">
          <button
            onClick={() => setKdvExpanded(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-900/40 border-b border-border/80 hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Calculator className="w-4.5 h-4.5 text-amber-400" />
              <span className="text-sm font-bold text-foreground">KDV Özeti</span>
              <span className="text-xs text-slate-400 font-semibold">
                Bu ay: <span className="text-amber-400 font-black">₺{kdvStats.thisMonthTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </span>
              {kdvStats.pendingTax > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                  ₺{kdvStats.pendingTax.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} bekliyor
                </span>
              )}
            </div>
            {kdvExpanded
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {kdvExpanded && (
            <div className="p-5 space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Bu Ay KDV',    value: kdvStats.thisMonthTax, color: 'text-amber-400' },
                  { label: 'Geçen Ay KDV', value: kdvStats.lastMonthTax, color: 'text-slate-400' },
                  { label: 'Bekleyen KDV', value: kdvStats.pendingTax,   color: kdvStats.pendingTax > 0 ? 'text-orange-400' : 'text-emerald-400' },
                  { label: 'Toplam KDV',   value: kdvStats.totalTax,     color: 'text-primary' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="premium-card p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-lg font-black font-mono ${color}`}>
                      ₺{value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Monthly breakdown */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Son 6 Ay KDV Dağılımı</p>
                <div className="space-y-2">
                  {kdvStats.monthly.map(({ month, net, tax }) => {
                    const total = net + tax
                    const taxPct = total > 0 ? Math.round((tax / total) * 100) : 0
                    const monthLabel = new Date(month + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-semibold w-28 shrink-0 truncate">{monthLabel}</span>
                        <div className="flex-1 h-5 rounded-full bg-slate-800/60 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary/60 to-primary flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: total > 0 ? `${Math.min(100, (total / Math.max(...kdvStats.monthly.map(m => m.net + m.tax), 1)) * 100)}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs font-mono text-amber-400 w-24 text-right shrink-0">
                          ₺{tax.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} KDV
                        </span>
                        <span className="text-[10px] text-slate-500 w-10 text-right shrink-0">%{taxPct}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-slate-600 mt-3">
                  * Yalnızca &quot;Ödendi&quot; durumundaki faturalar dahildir. Resmi KDV beyannamesi için mali müşavirinize danışın.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="premium-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border overflow-x-auto bg-slate-950/20 dark:bg-slate-900/40 p-1">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex rounded-lg border border-border/80 p-0.5 bg-background text-xs">
            {(['all', 'Issued', 'Paid', 'Draft', 'Cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === s
                    ? 'bg-surface text-primary border border-border/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'all' ? `Tümü (${invoices.length})` : `${STATUS_CONFIG[s]?.label} (${invoices.filter(i => i.status === s).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-4 bg-slate-800 rounded animate-pulse flex-1" />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              {statusFilter === 'all' ? 'Henüz fatura bulunamadı.' : 'Bu filtrede fatura yok.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-slate-400">
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Fatura No</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Tarih</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Vade</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Tutar</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Vergi</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Durum</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => {
                  const sc = STATUS_CONFIG[inv.status] ?? { label: inv.status, cls: 'bg-slate-700 text-slate-300' }
                  const isPastDue = inv.status === 'Issued' && new Date(inv.dueDate) < new Date()
                  return (
                    <tr key={inv.id} className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                        {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell">
                        <span className={isPastDue ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                          {new Date(inv.dueDate).toLocaleDateString('tr-TR')}
                          {isPastDue && ' (gecikti)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        ₺{inv.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs hidden lg:table-cell">
                        ₺{inv.totalTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === 'Issued' && (
                            <button
                              onClick={() => markPaid(inv.id)}
                              disabled={marking === inv.id}
                              className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                              title="Ödendi Olarak İşaretle"
                            >
                              {marking === inv.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => setPrintInv(inv)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all"
                            title="Yazdır / Önizle"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/dashboard/billing/${inv.id}`}
                            className="inline-flex items-center justify-center text-xs text-primary font-semibold hover:text-primary/80 hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg"
                          >
                            Detay
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-slate-500 flex items-center justify-between">
            <span>{filtered.length} fatura</span>
            <span>
              Toplam:{' '}
              <span className="font-bold text-foreground">
                ₺{filtered.reduce((s, i) => s + i.totalAmount, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>

      {/* Print / Preview Modal */}

      {printInv && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:bg-transparent" onClick={() => setPrintInv(null)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl border border-border"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header (hidden in print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden">
              <h3 className="font-bold text-foreground">Fatura Önizleme</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Printer className="w-4 h-4" /> Yazdır
                </button>
                <button onClick={() => setPrintInv(null)} className="p-2 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Invoice content */}
            <div className="p-8 text-slate-800 dark:text-slate-100">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-2xl font-black mb-1">
                    <span className="text-slate-800 dark:text-white">Canayan</span>
                    <span className="text-primary">Web</span>
                  </div>
                  <p className="text-sm text-slate-500">CanayanWeb KOBİ Platform</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-foreground">FATURA</p>
                  <p className="font-mono text-primary font-semibold mt-1">{printInv.invoiceNumber}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${STATUS_CONFIG[printInv.status]?.cls ?? ''}`}>
                    {STATUS_CONFIG[printInv.status]?.label ?? printInv.status}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-1 font-medium uppercase tracking-wide">Fatura Tarihi</p>
                  <p className="font-semibold">{new Date(printInv.invoiceDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1 font-medium uppercase tracking-wide">Vade Tarihi</p>
                  <p className={`font-semibold ${printInv.status === 'Issued' && new Date(printInv.dueDate) < new Date() ? 'text-red-500' : ''}`}>
                    {new Date(printInv.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Items table */}
              {printInv.items && printInv.items.length > 0 ? (
                <table className="w-full text-sm border border-slate-200 dark:border-border rounded-xl overflow-hidden mb-6">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Açıklama</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Adet</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Birim Fiyat</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">KDV %</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printInv.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200 dark:border-border">
                        <td className="px-4 py-2.5">{item.description}</td>
                        <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right">₺{item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 text-right">%{item.taxRate}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">₺{item.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-4 text-center text-sm text-slate-400 mb-6">Kalem bilgisi yok</div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Ara Toplam</span>
                    <span>₺{(printInv.totalAmount - printInv.totalTax).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>KDV</span>
                    <span>₺{printInv.totalTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-border pt-2">
                    <span>Toplam</span>
                    <span className="text-primary">₺{printInv.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-border text-xs text-slate-400 text-center">
                Bu fatura CanayanWeb KOBİ Platformu tarafından oluşturulmuştur.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
