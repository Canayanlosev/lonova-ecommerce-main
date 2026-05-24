'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Receipt, CheckCircle, RefreshCw, FileText, Clock, XCircle,
  Download, Filter
} from 'lucide-react'
import { billingService } from '@/lib/services/billing.service'
import { useToast } from '@/store/ui.store'
import type { Invoice } from '@/types/api.types'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Draft:     { label: 'Taslak',  cls: 'bg-slate-700 text-slate-300' },
  Issued:    { label: 'Kesildi', cls: 'bg-indigo-500/15 text-indigo-400' },
  Paid:      { label: 'Ödendi',  cls: 'bg-emerald-500/15 text-emerald-400' },
  Cancelled: { label: 'İptal',   cls: 'bg-red-500/15 text-red-400' },
}

type StatusFilter = 'all' | 'Draft' | 'Issued' | 'Paid' | 'Cancelled'

export default function BillingPage() {
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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

      {/* Table */}
      <div className="premium-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {(['all', 'Issued', 'Paid', 'Draft', 'Cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-foreground hover:bg-slate-800'
              }`}
            >
              {s === 'all' ? `Tümü (${invoices.length})` : `${STATUS_CONFIG[s]?.label} (${invoices.filter(i => i.status === s).length})`}
            </button>
          ))}
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
                <tr className="border-b border-border text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-medium">Fatura No</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tarih</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Vade</th>
                  <th className="text-right px-4 py-3 font-medium">Tutar</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Vergi</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-right px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => {
                  const sc = STATUS_CONFIG[inv.status] ?? { label: inv.status, cls: 'bg-slate-700 text-slate-300' }
                  const isPastDue = inv.status === 'Issued' && new Date(inv.dueDate) < new Date()
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                              title="Ödendi Olarak İşaretle"
                            >
                              {marking === inv.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <Link
                            href={`/dashboard/billing/${inv.id}`}
                            className="text-xs text-primary hover:text-primary/80 hover:underline"
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
  )
}
