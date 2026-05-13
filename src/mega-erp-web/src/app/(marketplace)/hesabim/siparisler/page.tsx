'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, ArrowRight, CreditCard, Banknote, Truck, MapPin,
  ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, LogOut
} from 'lucide-react'
import { marketplaceService, BuyerOrderDto } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: 'Beklemede',    color: 'text-yellow-400', icon: <Clock className="w-4 h-4" /> },
  Processing:{ label: 'İşleniyor',    color: 'text-blue-400',   icon: <Clock className="w-4 h-4" /> },
  Confirmed: { label: 'Onaylandı',    color: 'text-green-400',  icon: <CheckCircle className="w-4 h-4" /> },
  Shipped:   { label: 'Kargoda',      color: 'text-cyan-400',   icon: <Truck className="w-4 h-4" /> },
  Delivered: { label: 'Teslim Edildi',color: 'text-green-500',  icon: <CheckCircle className="w-4 h-4" /> },
  Cancelled: { label: 'İptal',        color: 'text-red-400',    icon: <XCircle className="w-4 h-4" /> },
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  Pending:  { label: 'Ödeme Bekleniyor', color: 'text-yellow-400' },
  Paid:     { label: 'Ödendi',           color: 'text-green-400' },
  Failed:   { label: 'Ödeme Başarısız',  color: 'text-red-400' },
  Refunded: { label: 'İade Edildi',      color: 'text-orange-400' },
}

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
  Card:           <CreditCard className="w-4 h-4" />,
  BankTransfer:   <Banknote className="w-4 h-4" />,
  CashOnDelivery: <Truck className="w-4 h-4" />,
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Card:           'Kredi/Banka Kartı',
  BankTransfer:   'Havale/EFT',
  CashOnDelivery: 'Kapıda Ödeme',
}

function OrderCard({ order }: { order: BuyerOrderDto }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-slate-400', icon: null }
  const payStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? { label: order.paymentStatus, color: 'text-slate-400' }
  const createdDate = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="premium-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex items-center gap-1 text-sm font-semibold ${status.color}`}>
                {status.icon} {status.label}
              </span>
              <span className="text-slate-600">·</span>
              <span className={`text-xs ${payStatus.color}`}>{payStatus.label}</span>
            </div>
            <p className="text-xs text-slate-500">
              Sipariş no: <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
              <span className="mx-2">·</span>
              {createdDate}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-primary">
              {order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            {order.installmentCount > 1 && (
              <p className="text-xs text-slate-400">
                {order.installmentCount}×{order.installmentAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            )}
          </div>
        </div>

        {/* Quick product preview */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {order.items.slice(0, 4).map((item, i) => (
            <div key={i} className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden relative shrink-0">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          {order.items.length > 4 && (
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
              <span className="text-xs text-slate-400">+{order.items.length - 4}</span>
            </div>
          )}
          <p className="text-xs text-slate-400 self-center ml-1">
            {order.items.reduce((s, i) => s + i.quantity, 0)} ürün
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-primary flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Gizle</> : <><ChevronDown className="w-3 h-3" /> Detayları Göster</>}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 space-y-5">
          {/* Items */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Ürünler</h4>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden relative shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.productName}</p>
                    {item.variantName && <p className="text-xs text-slate-500">{item.variantName}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{item.quantity}×</p>
                    <p className="text-sm font-medium text-foreground">
                      {item.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Payment info */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ödeme</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  {PAYMENT_METHOD_ICONS[order.paymentMethod]}
                  <span>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
                </div>
                {order.cardBrand && order.cardLastFour && (
                  <p className="text-slate-400 text-xs ml-6">
                    {order.cardBrand} •••• {order.cardLastFour}
                  </p>
                )}
                {order.installmentCount > 1 && (
                  <p className="text-slate-400 text-xs ml-6">
                    {order.installmentCount} taksit × {order.installmentAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                )}
              </div>
            </div>

            {/* Delivery address */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Teslimat Adresi
              </h4>
              <div className="text-sm text-foreground space-y-0.5">
                <p className="font-medium">{order.recipientName}</p>
                <p className="text-slate-400 text-xs">{order.phone}</p>
                <p className="text-slate-400 text-xs">{order.addressLine}</p>
                <p className="text-slate-400 text-xs">
                  {order.district && `${order.district}, `}{order.city}
                  {order.postalCode && ` ${order.postalCode}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuyerOrdersPage() {
  const { isAuthenticated, buyer, logout } = useBuyerAuthStore()
  const router = useRouter()
  const [orders, setOrders] = useState<BuyerOrderDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/alici-auth/giris')
      return
    }
    marketplaceService.getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hesabım</h1>
          <p className="text-slate-400 text-sm mt-1">
            {buyer?.firstName} {buyer?.lastName}
          </p>
        </div>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="text-sm text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" /> Çıkış
        </button>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" /> Siparişlerim
      </h2>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="premium-card p-4 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="premium-card p-10 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-2">Henüz sipariş yok</h3>
          <p className="text-sm text-slate-400 mb-6">Alışverişe başlayın ve siparişlerinizi burada takip edin.</p>
          <Link href="/" className="premium-button inline-flex items-center gap-2">
            Alışverişe Başla <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
