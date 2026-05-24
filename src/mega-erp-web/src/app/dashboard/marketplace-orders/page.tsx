'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Truck, CheckCircle, Clock, XCircle, Package,
  RefreshCw, X, AlertCircle, Search, ChevronDown, Download, ExternalLink
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
  Pending:    { label: 'Beklemede',     color: 'bg-yellow-500/15 text-yellow-400',  icon: <Clock className="w-3.5 h-3.5" /> },
  Processing: { label: 'İşleniyor',     color: 'bg-primary/15 text-primary',      icon: <Clock className="w-3.5 h-3.5" /> },
  Confirmed:  { label: 'Onaylandı',     color: 'bg-secondary/15 text-secondary',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Shipped:    { label: 'Kargoda',       color: 'bg-cyan-500/15 text-cyan-400',      icon: <Truck className="w-3.5 h-3.5" /> },
  Delivered:  { label: 'Teslim Edildi', color: 'bg-green-500/15 text-green-400',    icon: <CheckCircle className="w-3.5 h-3.5" /> },
  Cancelled:  { label: 'İptal',         color: 'bg-red-500/15 text-red-400',        icon: <XCircle className="w-3.5 h-3.5" /> },
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

  const filtered = search
    ? orders.filter(o =>
        o.id.startsWith(search.toLowerCase()) ||
        o.recipientName.toLowerCase().includes(search.toLowerCase()) ||
        o.city.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  const totalPages = Math.ceil(total / PAGE_SIZE)

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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sipariş no, alıcı adı, şehir..."
            className="w-full bg-slate-800 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-primary"
          />
        </div>
        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="appearance-none bg-slate-800 border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
              <tr className="border-b border-border text-xs text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Sipariş</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tarih</th>
                <th className="text-left px-4 py-3 font-medium">Alıcı</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Ürün</th>
                <th className="text-left px-4 py-3 font-medium">Durum</th>
                <th className="text-right px-4 py-3 font-medium">Tutar</th>
                <th className="text-right px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-700 rounded w-full" /></td>
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
                    <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-400">{o.id.slice(0, 8).toUpperCase()}</span>
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
                        <p className="text-sm text-foreground font-medium truncate max-w-32">{o.recipientName}</p>
                        <p className="text-xs text-slate-500">{o.city}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                        {o.itemCount} ürün
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${st.color}`}>
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Detay"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {canShip && (
                            <button
                              onClick={() => { setShipModal(o); setTrackingNo(''); setCarrier(CARRIERS[0]); setShipError('') }}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Truck className="w-3.5 h-3.5" /> Kargoya Ver
                            </button>
                          )}
                          {canDeliver && (
                            <button
                              onClick={() => handleDeliver(o.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/30 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {isActioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Teslim Edildi
                            </button>
                          )}
                          {hasRefund && (
                            <button
                              onClick={() => handleRefund(o.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-600/30 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
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
          <div className="p-4 border-t border-border flex items-center justify-between text-sm text-slate-400">
            <span>{total} sipariş</span>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Önceki
              </button>
              <span className="px-3 py-1.5 text-foreground">{page} / {totalPages}</span>
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

      {/* Ship Modal */}
      {shipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShipModal(null)}>
          <div className="premium-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">Kargoya Ver</h3>
                <p className="text-xs text-slate-400 mt-0.5">#{shipModal.id.slice(0, 8).toUpperCase()} — {shipModal.recipientName}</p>
              </div>
              <button onClick={() => setShipModal(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Kargo Firması</label>
                <div className="relative">
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full appearance-none bg-slate-800 border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Takip Numarası</label>
                <input
                  type="text"
                  value={trackingNo}
                  onChange={e => setTrackingNo(e.target.value)}
                  placeholder="Örn: 123456789"
                  className="w-full bg-slate-800 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-primary"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleShip()}
                />
              </div>
            </div>

            {shipError && <p className="text-xs text-red-400 mt-3">{shipError}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShipModal(null)} className="flex-1 px-4 py-2.5 text-sm border border-border rounded-xl hover:bg-slate-800 transition-colors">
                İptal
              </button>
              <button
                onClick={handleShip}
                disabled={shipping}
                className="flex-1 px-4 py-2.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
