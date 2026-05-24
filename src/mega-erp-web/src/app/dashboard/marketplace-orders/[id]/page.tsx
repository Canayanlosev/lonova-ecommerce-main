'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Package, MapPin, CreditCard, Truck, CheckCircle,
  XCircle, Clock, RefreshCw, Send, AlertTriangle, Printer
} from 'lucide-react'
import api from '@/lib/api'

interface OrderItem {
  productId: string
  variantId?: string
  productName: string
  variantName?: string
  imageUrl?: string
  unitPrice: number
  quantity: number
}

interface AdminOrderDetail {
  id: string
  buyerUserId: string
  totalAmount: number
  status: string
  paymentStatus: string
  paymentMethod: string
  installmentCount: number
  installmentAmount: number
  cardLastFour?: string
  cardBrand?: string
  recipientName: string
  phone: string
  city: string
  district: string
  addressLine: string
  postalCode: string
  createdAt: string
  items: OrderItem[]
  cancelledAt?: string
  cancelReason?: string
  refundStatus?: string
  trackingNumber?: string
  carrierName?: string
  buyerNote?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:    { label: 'Beklemede',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',  icon: <Clock className="w-4 h-4" /> },
  Processing: { label: 'İşleniyor',    color: 'text-primary bg-primary/10 border-primary/30',     icon: <Clock className="w-4 h-4" /> },
  Confirmed:  { label: 'Onaylandı',    color: 'text-secondary bg-secondary/10 border-secondary/30', icon: <CheckCircle className="w-4 h-4" /> },
  Shipped:    { label: 'Kargoda',      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',     icon: <Truck className="w-4 h-4" /> },
  Delivered:  { label: 'Teslim Edildi', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle className="w-4 h-4" /> },
  Cancelled:  { label: 'İptal Edildi', color: 'text-red-400 bg-red-500/10 border-red-500/30',        icon: <XCircle className="w-4 h-4" /> },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Card: 'Kredi/Banka Kartı',
  BankTransfer: 'Havale/EFT',
  CashOnDelivery: 'Kapıda Ödeme',
}

const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'DHL', 'UPS', 'FedEx']

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })

export default function MarketplaceOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Ship modal
  const [showShipForm, setShowShipForm] = useState(false)
  const [trackingNo, setTrackingNo] = useState('')
  const [carrier, setCarrier] = useState(CARRIERS[0])
  const [shipping, setShipping] = useState(false)
  const [shipError, setShipError] = useState('')

  // Action loading
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get<AdminOrderDetail>(`/api/marketplace/admin/orders/${id}`)
      setOrder(data)
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleShip = async () => {
    if (!order) return
    if (!trackingNo.trim()) { setShipError('Takip numarası giriniz.'); return }
    setShipping(true)
    setShipError('')
    try {
      await api.put(`/api/marketplace/admin/orders/${order.id}/ship`, {
        trackingNumber: trackingNo.trim(),
        carrierName: carrier,
      })
      setShowShipForm(false)
      setTrackingNo('')
      await load()
    } catch {
      setShipError('Kargo bilgisi kaydedilemedi.')
    } finally {
      setShipping(false)
    }
  }

  const handleDeliver = async () => {
    if (!order) return
    setActionLoading(true)
    try {
      await api.put(`/api/marketplace/admin/orders/${order.id}/deliver`, {})
      await load()
    } catch { /* ignore */ }
    finally { setActionLoading(false) }
  }

  const handleRefund = async () => {
    if (!order || !confirm('Bu iade talebini onaylamak istediğinize emin misiniz?')) return
    setActionLoading(true)
    try {
      await api.put(`/api/marketplace/admin/orders/${order.id}/refund`, {})
      await load()
    } catch { /* ignore */ }
    finally { setActionLoading(false) }
  }

  const handlePrint = () => {
    if (!order) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Sipariş #${order.id.slice(0,8).toUpperCase()}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:20px auto;padding:20px;color:#111}
    h1{color:#2563eb}table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}
    .status{display:inline-block;padding:4px 10px;border-radius:9999px;font-weight:bold;background:#dbeafe;color:#1d4ed8}
    .total{font-size:1.2em;font-weight:bold;color:#1d4ed8}
    @media print{button{display:none}}</style></head><body>
    <h1>CanayanWeb — Sipariş Detayı</h1>
    <p><strong>Sipariş No:</strong> #${order.id.slice(0,8).toUpperCase()}</p>
    <p><strong>Tarih:</strong> ${new Date(order.createdAt).toLocaleString('tr-TR')}</p>
    <p><strong>Durum:</strong> <span class="status">${STATUS_CONFIG[order.status]?.label ?? order.status}</span></p>
    <h2>Alıcı Bilgileri</h2>
    <p>${order.recipientName} · ${order.phone}</p>
    <p>${order.addressLine}, ${order.district} / ${order.city} ${order.postalCode}</p>
    ${order.trackingNumber ? `<h2>Kargo</h2><p>${order.carrierName ?? ''} · ${order.trackingNumber}</p>` : ''}
    <h2>Ürünler</h2>
    <table><thead><tr><th>Ürün</th><th>Varyant</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th></tr></thead><tbody>
    ${order.items.map(i => `<tr><td>${i.productName}</td><td>${i.variantName ?? '—'}</td><td>${i.quantity}</td><td>${fmt(i.unitPrice)}</td><td>${fmt(i.unitPrice * i.quantity)}</td></tr>`).join('')}
    </tbody></table>
    <p class="total">Genel Toplam: ${fmt(order.totalAmount)}</p>
    <script>window.onload=()=>window.print()</script></body></html>`)
    win.document.close()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800 rounded-lg animate-pulse w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1,2,3].map(i => <div key={i} className="premium-card h-32 animate-pulse" />)}
          </div>
          <div className="premium-card h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="text-center py-20">
        <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Sipariş bulunamadı</p>
        <Link href="/dashboard/marketplace-orders" className="text-primary hover:underline text-sm mt-2 block">
          ← Siparişlere Dön
        </Link>
      </div>
    )
  }

  const sc = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'text-slate-400 bg-slate-700 border-slate-600', icon: null }
  const lineTotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/marketplace-orders')}
            className="p-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-surface transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Sipariş #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {new Date(order.createdAt).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-slate-400 hover:text-foreground text-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Yazdır
          </button>
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${sc.color}`}>
            {sc.icon} {sc.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — items + actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="premium-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Sipariş Kalemleri</h2>
              <span className="text-xs text-slate-500 ml-auto">{order.items.length} ürün</span>
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.productName} className="w-14 h-14 rounded-lg object-cover bg-slate-800 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.productName}</p>
                    {item.variantName && (
                      <p className="text-xs text-slate-400 mt-0.5">{item.variantName}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">{item.quantity} adet × {fmt(item.unitPrice)}</p>
                  </div>
                  <p className="font-semibold text-foreground shrink-0">{fmt(item.unitPrice * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-slate-800/40 flex items-center justify-between">
              <span className="text-sm text-slate-400">Ürünler Toplamı</span>
              <span className="font-semibold text-foreground">{fmt(lineTotal)}</span>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Genel Toplam</span>
              <span className="text-lg font-black text-primary">{fmt(order.totalAmount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="premium-card p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> İşlemler
            </h2>
            <div className="flex flex-wrap gap-3">
              {/* Ship */}
              {(order.status === 'Pending' || order.status === 'Processing' || order.status === 'Confirmed') && !showShipForm && (
                <button
                  onClick={() => setShowShipForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
                >
                  <Truck className="w-4 h-4" /> Kargoya Ver
                </button>
              )}
              {/* Deliver */}
              {order.status === 'Shipped' && (
                <button
                  onClick={handleDeliver}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Teslim Edildi
                </button>
              )}
              {/* Refund */}
              {order.refundStatus === 'Requested' && (
                <button
                  onClick={handleRefund}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  İadeyi Onayla
                </button>
              )}
            </div>

            {/* Ship form */}
            {showShipForm && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Kargo Bilgilerini Gir</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Takip Numarası *</label>
                    <input
                      type="text"
                      value={trackingNo}
                      onChange={e => setTrackingNo(e.target.value)}
                      placeholder="YK1234567890"
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kargo Firması</label>
                    <select
                      value={carrier}
                      onChange={e => setCarrier(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                {shipError && <p className="text-red-400 text-xs mb-3">{shipError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleShip}
                    disabled={shipping}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {shipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    Gönder
                  </button>
                  <button
                    onClick={() => { setShowShipForm(false); setShipError('') }}
                    className="px-4 py-2 rounded-xl border border-border text-slate-400 hover:text-foreground text-sm"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Buyer Note */}
          {order.buyerNote && (
            <div className="premium-card p-5">
              <h2 className="font-semibold text-foreground mb-2 text-sm">Alıcı Notu</h2>
              <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg px-4 py-3 italic">"{order.buyerNote}"</p>
            </div>
          )}

          {/* Cancel info */}
          {order.status === 'Cancelled' && (
            <div className="premium-card p-5 border-l-4 border-red-500">
              <h2 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> İptal Bilgisi
              </h2>
              {order.cancelledAt && <p className="text-xs text-slate-400">{new Date(order.cancelledAt).toLocaleString('tr-TR')}</p>}
              {order.cancelReason && <p className="text-sm text-slate-300 mt-1">Sebep: {order.cancelReason}</p>}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Delivery address */}
          <div className="premium-card p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" /> Teslimat Adresi
            </h2>
            <p className="font-semibold text-foreground">{order.recipientName}</p>
            <p className="text-sm text-slate-400 mt-0.5">{order.phone}</p>
            <p className="text-sm text-slate-300 mt-2">{order.addressLine}</p>
            <p className="text-sm text-slate-400">{order.district} / {order.city}</p>
            {order.postalCode && <p className="text-sm text-slate-500 mt-0.5">{order.postalCode}</p>}
          </div>

          {/* Payment */}
          <div className="premium-card p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-primary" /> Ödeme Bilgileri
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Yöntem</span>
                <span className="text-foreground">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ödeme Durumu</span>
                <span className={order.paymentStatus === 'Paid' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {order.paymentStatus === 'Paid' ? 'Ödendi' : order.paymentStatus === 'Refunded' ? 'İade Edildi' : 'Bekliyor'}
                </span>
              </div>
              {order.cardLastFour && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Kart</span>
                  <span className="text-foreground font-mono">{order.cardBrand} *{order.cardLastFour}</span>
                </div>
              )}
              {order.installmentCount > 1 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Taksit</span>
                  <span className="text-foreground">{order.installmentCount}×{fmt(order.installmentAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-semibold text-foreground">Toplam</span>
                <span className="font-bold text-primary">{fmt(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="premium-card p-5">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-cyan-400" /> Kargo Takibi
              </h2>
              <p className="text-sm text-slate-400">{order.carrierName}</p>
              <p className="font-mono text-primary font-semibold mt-1">{order.trackingNumber}</p>
            </div>
          )}

          {/* Refund */}
          {order.refundStatus && (
            <div className={`premium-card p-5 border-l-4 ${order.refundStatus === 'Refunded' ? 'border-emerald-500' : 'border-orange-500'}`}>
              <h2 className="font-semibold text-foreground mb-1 text-sm">İade Durumu</h2>
              <span className={`text-sm font-semibold ${order.refundStatus === 'Refunded' ? 'text-emerald-400' : 'text-orange-400'}`}>
                {order.refundStatus === 'Refunded' ? 'İade Tamamlandı' : 'İade Talep Edildi'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
