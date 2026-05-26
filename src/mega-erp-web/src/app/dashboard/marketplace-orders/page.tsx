'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Truck, CheckCircle, Clock, XCircle, Package,
  RefreshCw, X, AlertCircle, Search, ChevronDown, Download, ExternalLink,
  TrendingUp, ShoppingBag
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

interface AdminOrder {
  id: string
  buyerUserId: string
  totalAmount: number
  status: string
  paymentStatus: string
  paymentMethod: string
  recipientName: string
  phone: string
  city: string
  district: string
  addressLine: string
  createdAt: string
  itemCount: number
  trackingNumber?: string
  carrierName?: string
  cancelReason?: string
  refundStatus?: string
}

interface AdminOrdersResponse {
  Items: AdminOrder[]
  TotalCount: number
  Page: number
  PageSize: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:    { label: 'Beklemede',     color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',  icon: <Clock className="w-3.5 h-3.5" /> },
  Processing: { label: 'İşleniyor',     color: 'bg-primary/10 text-primary border border-primary/20',      icon: <Clock className="w-3.5 h-3.5" /> },
  Confirmed:  { label: 'Onaylandı',     color: 'bg-secondary/10 text-secondary border border-secondary/20',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Shipped:    { label: 'Kargoda',       color: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',      icon: <Truck className="w-3.5 h-3.5" /> },
  Delivered:  { label: 'Teslim Edildi', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',    icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Cancelled:  { label: 'İptal',         color: 'bg-red-500/10 text-red-400 border border-red-500/20',        icon: <XCircle className="w-3.5 h-3.5" /> },
}

const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'DHL', 'UPS', 'FedEx', 'Trendyol Express']
const PAGE_SIZE = 20

export default function MarketplaceOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Detail side panel
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null)

  // Ship modal state
  const [shipModal, setShipModal] = useState<AdminOrder | null>(null)
  const [trackingNo, setTrackingNo] = useState('')
  const [carrier, setCarrier] = useState(CARRIERS[0])
  const [shipping, setShipping] = useState(false)
  const [shipError, setShipError] = useState('')

  // Action states
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async (p = 1, st = statusFilter) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
      if (st) params.set('status', st)
      const res = await api.get<AdminOrdersResponse>(`/api/marketplace/admin/orders?${params}`)
      setOrders(res.data.Items ?? [])
      setTotal(res.data.TotalCount ?? 0)
      setPage(p)
    } catch {
      setError('Siparişler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load(1, statusFilter) }, [statusFilter])

  const handleShip = async () => {
    if (!shipModal) return
    if (!trackingNo.trim()) { setShipError('Takip numarası giriniz.'); return }
    setShipping(true)
    setShipError('')
    try {
      await api.put(`/api/marketplace/admin/orders/${shipModal.id}/ship`, {
        trackingNumber: trackingNo.trim(),
        carrierName: carrier,
      })
      setShipModal(null)
      setTrackingNo('')
      await load(page)
    } catch {
      setShipError('Kargo bilgisi kaydedilemedi. Lütfen tekrar deneyin.')
    } finally {
      setShipping(false)
    }
  }

  const handleDeliver = async (orderId: string) => {
    setActionId(orderId)
    try {
      await api.put(`/api/marketplace/admin/orders/${orderId}/deliver`, {})
      await load(page)
    } catch { /* ignore */ }
    finally { setActionId(null) }
  }

  const handleRefund = async (orderId: string) => {
    setActionId(orderId)
    try {
      await api.put(`/api/marketplace/admin/orders/${orderId}/refund`, {})
      await load(page)
    } catch { /* ignore */ }
    finally { setActionId(null) }
  }

  const dateFilteredOrders = orders.filter(o => {
    if (dateFilter === 'all') return true
    const d = new Date(o.createdAt)
    const now = new Date()
    if (dateFilter === 'today') {
      return d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
      return d >= weekAgo
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
      return d >= monthAgo
    }
    return true
  })

  const filtered = search
    ? dateFilteredOrders.filter(o =>
        o.id.startsWith(search.toLowerCase()) ||
        o.recipientName.toLowerCase().includes(search.toLowerCase()) ||
        o.city.toLowerCase().includes(search.toLowerCase())
      )
    : dateFilteredOrders

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Page stats (computed from current loaded+filtered orders) ─────────────
  const pageStats = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10)
    return {
      todayCount: orders.filter(o => o.createdAt.slice(0, 10) === todayISO).length,
      pending: orders.filter(o => o.status === 'Pending').length,
      shipped: orders.filter(o => o.status === 'Shipped').length,
      delivered: orders.filter(o => o.status === 'Delivered').length,
      revenue: filtered.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    }
  }, [orders, filtered])

  const handleExportCsv = () => {
    const rows = [
      ['Sipariş ID', 'Alıcı', 'Şehir', 'Tutar (₺)', 'Durum', 'Ödeme', 'Ödeme Yöntemi', 'Ürün Adedi', 'Takip No', 'Tarih'],
      ...filtered.map(o => [
        o.id.slice(0, 8).toUpperCase(),
        o.recipientName,
        o.city,
        o.totalAmount.toFixed(2),
        STATUS_CONFIG[o.status]?.label ?? o.status,
        o.paymentStatus,
        o.paymentMethod,
        String(o.itemCount),
        o.trackingNumber ?? '',
        new Date(o.createdAt).toLocaleDateString('tr-TR'),
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `siparisler-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mağaza Siparişleri</h1>
          <p className="text-slate-400 text-sm mt-0.5">Marketplace'ten gelen alıcı siparişleri</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-600 rounded-xl transition-colors disabled:opacity-40"
            title="CSV olarak dışa aktar"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => load(page)} disabled={loading} className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="premium-card p-3 flex items-center gap-3">
            <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">Bugün</p>
              <p className="text-base font-black text-foreground">{pageStats.todayCount}</p>
            </div>
          </div>
          <div className="premium-card p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">Beklemede</p>
              <p className={`text-base font-black ${pageStats.pending > 0 ? 'text-amber-400' : 'text-foreground'}`}>{pageStats.pending}</p>
            </div>
          </div>
          <div className="premium-card p-3 flex items-center gap-3">
            <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">Kargoda</p>
              <p className="text-base font-black text-cyan-400">{pageStats.shipped}</p>
            </div>
          </div>
          <div className="premium-card p-3 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">Teslim</p>
              <p className="text-base font-black text-emerald-400">{pageStats.delivered}</p>
            </div>
          </div>
          <div className="premium-card p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
            <TrendingUp className="w-4 h-4 text-violet-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">Gelir (görüntü)</p>
              <p className="text-sm font-black text-violet-400">
                ₺{pageStats.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sipariş no, alıcı adı, şehir..."
            className="w-full bg-slate-950/20 dark:bg-slate-900/40 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
          />
        </div>
        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="appearance-none bg-slate-950/20 dark:bg-slate-900/40 border border-border rounded-xl pl-3 pr-9 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer font-semibold"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {/* Date filter */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl border border-border bg-background/40">
          {(['all', 'today', 'week', 'month'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                dateFilter === f ? 'bg-surface text-primary border border-border/40 shadow-sm' : 'text-slate-400 hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'Tümü' : f === 'today' ? 'Bugün' : f === 'week' ? 'Bu Hafta' : 'Bu Ay'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="premium-card p-4 border-l-4 border-red-500 flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Sipariş</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Alıcı</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Durum</th>
                <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Tutar</th>
                <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
                : filtered.length === 0
                ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center">
                    <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Sipariş bulunamadı.</p>
                  </td></tr>
                )
                : filtered.map(o => {
                  const st = STATUS_CONFIG[o.status] ?? { label: o.status, color: 'bg-slate-700 text-slate-300', icon: null }
                  const isActioning = actionId === o.id
                  const canShip = o.status === 'Processing' || o.status === 'Confirmed' || o.status === 'Pending'
                  const canDeliver = o.status === 'Shipped'
                  const hasRefund = o.refundStatus === 'Requested'

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-primary/5 hover:border-primary/10 transition-colors cursor-pointer"
                      onClick={(e) => { if ((e.target as HTMLElement).closest('button,a')) return; setDetailOrder(o) }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{o.id.slice(0, 8).toUpperCase()}</span>
                        {o.trackingNumber && (
                          <p className="text-xs text-cyan-400 font-mono mt-0.5">{o.carrierName}: {o.trackingNumber}</p>
                        )}
                        {o.refundStatus && (
                          <p className={`text-xs mt-0.5 ${o.refundStatus === 'Refunded' ? 'text-green-400' : 'text-orange-400'}`}>
                            İade: {o.refundStatus === 'Requested' ? 'Talep Edildi' : o.refundStatus === 'Refunded' ? 'Onaylandı' : o.refundStatus}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                        {new Date(o.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground font-semibold truncate max-w-32">{o.recipientName}</p>
                        <p className="text-xs text-slate-500">{o.city}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                        {o.itemCount} ürün
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {o.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/marketplace-orders/${o.id}`}
                            className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Detay"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {canShip && (
                            <button
                              onClick={() => { setShipModal(o); setTrackingNo(''); setCarrier(CARRIERS[0]); setShipError('') }}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary rounded-lg transition-colors whitespace-nowrap font-semibold"
                            >
                              <Truck className="w-3.5 h-3.5" /> Kargoya Ver
                            </button>
                          )}
                          {canDeliver && (
                            <button
                              onClick={() => handleDeliver(o.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap font-semibold"
                            >
                              {isActioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Teslim Edildi
                            </button>
                          )}
                          {hasRefund && (
                            <button
                              onClick={() => handleRefund(o.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 hover:border-orange-500 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap font-semibold"
                            >
                              {isActioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              İadeyi Onayla
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm text-slate-400 bg-slate-950/20 dark:bg-slate-900/40">
            <span className="font-semibold">{total} sipariş</span>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-xl border border-border hover:bg-slate-800 disabled:opacity-40 transition-colors font-semibold"
              >
                Önceki
              </button>
              <span className="px-3 py-1.5 text-foreground font-semibold">{page} / {totalPages}</span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Side Panel */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetailOrder(null)}>
          <div className="w-full max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <div>
                <h3 className="font-bold text-foreground">Sipariş Detayı</h3>
                <p className="text-xs text-slate-400 font-mono">#{detailOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 flex-1">
              {/* Status & date */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${STATUS_CONFIG[detailOrder.status]?.color ?? 'bg-slate-700 text-slate-300'}`}>
                  {STATUS_CONFIG[detailOrder.status]?.icon}
                  {STATUS_CONFIG[detailOrder.status]?.label ?? detailOrder.status}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(detailOrder.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Recipient */}
              <div className="premium-card p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Alıcı Bilgileri</p>
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-foreground">{detailOrder.recipientName}</p>
                  {detailOrder.phone && (
                    <a href={`tel:${detailOrder.phone}`} className="text-xs text-primary hover:underline font-mono">{detailOrder.phone}</a>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {detailOrder.addressLine}<br />
                  {detailOrder.district && `${detailOrder.district}, `}{detailOrder.city}
                </p>
              </div>

              {/* Payment */}
              <div className="premium-card p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ödeme</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Yöntem</span>
                  <span className="font-semibold text-foreground">{detailOrder.paymentMethod || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Durum</span>
                  <span className={`font-semibold ${detailOrder.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-400'}`}>{detailOrder.paymentStatus}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="text-slate-400">Toplam</span>
                  <span className="font-black text-foreground text-base">
                    {detailOrder.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="premium-card p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ürünler</p>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground font-semibold">{detailOrder.itemCount} ürün</span>
                </div>
              </div>

              {/* Tracking */}
              {detailOrder.trackingNumber && (
                <div className="premium-card p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kargo Takip</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Firma</span>
                    <span className="font-semibold text-foreground">{detailOrder.carrierName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Takip No</span>
                    <span className="font-mono text-cyan-400 text-xs">{detailOrder.trackingNumber}</span>
                  </div>
                </div>
              )}

              {/* Cancel reason */}
              {detailOrder.cancelReason && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-bold text-red-400 mb-1">İptal Nedeni</p>
                  <p className="text-xs text-slate-300">{detailOrder.cancelReason}</p>
                </div>
              )}

              {/* Refund status */}
              {detailOrder.refundStatus && (
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs font-bold text-orange-400 mb-1">İade Durumu</p>
                  <p className="text-xs text-slate-300">
                    {detailOrder.refundStatus === 'Requested' ? 'Talep Edildi' : detailOrder.refundStatus === 'Refunded' ? 'Onaylandı' : detailOrder.refundStatus}
                  </p>
                </div>
              )}
            </div>

            {/* Panel Footer actions */}
            <div className="px-6 py-4 border-t border-border bg-background sticky bottom-0">
              <div className="flex gap-2">
                {(detailOrder.status === 'Processing' || detailOrder.status === 'Confirmed' || detailOrder.status === 'Pending') && (
                  <button
                    onClick={() => { setShipModal(detailOrder); setDetailOrder(null); setTrackingNo(''); setCarrier(CARRIERS[0]); setShipError('') }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    <Truck className="w-4 h-4" /> Kargoya Ver
                  </button>
                )}
                {detailOrder.status === 'Shipped' && (
                  <button
                    onClick={() => { handleDeliver(detailOrder.id); setDetailOrder(null) }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Teslim Edildi
                  </button>
                )}
                <Link
                  href={`/dashboard/marketplace-orders/${detailOrder.id}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-slate-400 hover:text-foreground hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Tam Sayfa
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      {shipModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShipModal(null)}>
          <div className="premium-card p-6 w-full max-w-md border border-border/80 shadow-[0_0_50px_rgba(0,0,0,0.3)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Kargoya Ver</h3>
                <p className="text-xs text-slate-400 mt-0.5">#{shipModal.id.slice(0, 8).toUpperCase()} — {shipModal.recipientName}</p>
              </div>
              <button onClick={() => setShipModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Kargo Firması</label>
                <div className="relative">
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full appearance-none bg-slate-900/60 border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer font-semibold"
                  >
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Takip Numarası</label>
                <input
                  type="text"
                  value={trackingNo}
                  onChange={e => setTrackingNo(e.target.value)}
                  placeholder="Örn: 123456789"
                  className="w-full bg-slate-900/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleShip()}
                />
              </div>
            </div>

            {shipError && <p className="text-xs text-red-400 mt-3 font-semibold">{shipError}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShipModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold border border-border rounded-xl hover:bg-slate-800 transition-colors">
                İptal
              </button>
              <button
                onClick={handleShip}
                disabled={shipping}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {shipping ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor...</> : <><Truck className="w-3.5 h-3.5" /> Kargoya Ver</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
