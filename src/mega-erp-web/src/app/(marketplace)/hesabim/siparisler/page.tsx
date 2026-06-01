'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package, ArrowRight, CreditCard, Banknote, Truck, MapPin,
  ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, LogOut,
  AlertTriangle, ExternalLink, RefreshCw, X, Star, User, Check
} from 'lucide-react'
import { marketplaceService, BuyerOrderDto, type BuyerOrderItemDto } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

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

const CANCEL_REASONS = [
  'Yanlış ürün seçtim',
  'Ürüne artık ihtiyacım yok',
  'Daha iyi fiyat buldum',
  'Teslimat süresi çok uzun',
  'Ödeme sorunu',
  'Diğer',
]

const REFUND_REASONS = [
  'Ürün hasarlı geldi',
  'Yanlış ürün geldi',
  'Ürün açıklamaya uymuyor',
  'Ürün istediğimden küçük/büyük',
  'Vazgeçtim',
  'Diğer',
]

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              i <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function OrderCard({ order, onUpdate }: { order: BuyerOrderDto; onUpdate: (updated: BuyerOrderDto) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Review state
  const [reviewItem, setReviewItem] = useState<BuyerOrderItemDto | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set())

  const handleSubmitReview = async () => {
    if (!reviewItem || reviewRating === 0) return
    setReviewLoading(true)
    setReviewError('')
    try {
      await marketplaceService.createReview(reviewItem.productId.toString(), reviewRating, reviewComment.trim() || undefined)
      setReviewedProducts(prev => new Set([...prev, reviewItem.productId.toString()]))
      setReviewItem(null)
      setReviewComment('')
      setReviewRating(5)
    } catch {
      setReviewError('Yorum gönderilirken hata oluştu. Daha önce yorum yazmış olabilirsiniz.')
    } finally {
      setReviewLoading(false)
    }
  }

  const status = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-slate-400', icon: null }
  const payStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? { label: order.paymentStatus, color: 'text-slate-400' }
  const createdDate = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  const canCancel = order.status === 'Pending' || order.status === 'Processing'
  const canRefund = (order.status === 'Delivered' || order.status === 'Shipped') && !order.refundStatus
  const hasTracking = order.status === 'Shipped' || order.status === 'Delivered'

  const handleCancel = async () => {
    if (!selectedReason) { setActionError('Lütfen bir iptal sebebi seçin.'); return }
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await marketplaceService.cancelOrder(order.id, selectedReason)
      onUpdate(updated)
      setCancelOpen(false)
      setSelectedReason('')
    } catch {
      setActionError('İptal işlemi başarısız oldu. Lütfen tekrar deneyin.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!selectedReason) { setActionError('Lütfen bir iade sebebi seçin.'); return }
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await marketplaceService.requestRefund(order.id, selectedReason)
      onUpdate(updated)
      setRefundOpen(false)
      setSelectedReason('')
    } catch {
      setActionError('İade talebi gönderilemedi. Lütfen tekrar deneyin.')
    } finally {
      setActionLoading(false)
    }
  }

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

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Gizle</> : <><ChevronDown className="w-3 h-3" /> Detayları Göster</>}
          </button>

          {canCancel && (
            <button
              onClick={() => { setCancelOpen(true); setActionError(''); setSelectedReason('') }}
              className="ml-auto text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Siparişi İptal Et
            </button>
          )}

          {canRefund && (
            <button
              onClick={() => { setRefundOpen(true); setActionError(''); setSelectedReason('') }}
              className="ml-auto text-xs text-orange-400 border border-orange-400/30 hover:bg-orange-400/10 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> İade Talebi
            </button>
          )}

          {order.refundStatus && (
            <span className={`ml-auto text-xs px-2 py-1 rounded-lg ${
              order.refundStatus === 'Refunded' ? 'bg-green-500/15 text-green-400' : 'bg-orange-500/15 text-orange-400'
            }`}>
              İade: {order.refundStatus === 'Requested' ? 'Talep Edildi' : order.refundStatus === 'Processing' ? 'İşleniyor' : 'Tamamlandı'}
            </span>
          )}
        </div>

        {/* Tracking info */}
        {hasTracking && order.trackingNumber && (
          <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-3">
            <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-300">{order.carrierName ?? 'Kargo'}</p>
              <p className="text-xs text-cyan-400 font-mono">{order.trackingNumber}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-500 ml-auto shrink-0" />
          </div>
        )}

        {/* Cancel reason display */}
        {order.status === 'Cancelled' && order.cancelReason && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">İptal sebebi: {order.cancelReason}</p>
          </div>
        )}
      </div>

      {/* Cancel dialog */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setCancelOpen(false)}>
          <div className="premium-card p-6 w-full max-w-md border border-border/80 bg-slate-900/95 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Siparişi İptal Et</h3>
              <button onClick={() => setCancelOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-semibold mb-5 leading-relaxed">Bu siparişi iptal etmek istediğinize emin misiniz? Lütfen iptal nedenini seçin.</p>
            
            <div className="mb-6">
              <label className="text-[10px] text-slate-455 font-black uppercase tracking-wider mb-2.5 block">İptal Sebebi</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CANCEL_REASONS.map(r => {
                  const isSelected = selectedReason === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedReason(r)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/40 text-red-405 shadow-md shadow-red-500/5'
                          : 'bg-slate-950/40 border-border/80 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>

            {actionError && <p className="text-xs text-red-405 mb-4 font-bold">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setCancelOpen(false)} className="flex-1 px-4 py-2.5 text-xs font-bold border border-border/80 rounded-xl hover:bg-slate-800/40 transition-colors">
                Vazgeç
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !selectedReason}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
              >
                {actionLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> İptal ediliyor...</> : 'Evet, İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund dialog */}
      {refundOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setRefundOpen(false)}>
          <div className="premium-card p-6 w-full max-w-md border border-border/80 bg-slate-900/95 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">İade Talebi Oluştur</h3>
              <button onClick={() => setRefundOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-semibold mb-5 leading-relaxed">İade talebiniz ekibimiz tarafından incelenerek en kısa sürede geri dönüş sağlanacaktır. Lütfen iade nedenini seçin.</p>
            
            <div className="mb-6">
              <label className="text-[10px] text-slate-455 font-black uppercase tracking-wider mb-2.5 block">İade Sebebi</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REFUND_REASONS.map(r => {
                  const isSelected = selectedReason === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedReason(r)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500/40 text-orange-405 shadow-md shadow-orange-500/5'
                          : 'bg-slate-950/40 border-border/80 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>

            {actionError && <p className="text-xs text-red-405 mb-4 font-bold">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setRefundOpen(false)} className="flex-1 px-4 py-2.5 text-xs font-bold border border-border/80 rounded-xl hover:bg-slate-800/40 transition-colors">
                Vazgeç
              </button>
              <button
                onClick={handleRefund}
                disabled={actionLoading || !selectedReason}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
              >
                {actionLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gönderiliyor...</> : 'İade Talep Et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setReviewItem(null)}>
          <div className="premium-card p-6 w-full max-w-md border border-border/80 bg-slate-900/95 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Ürün Değerlendirmesi</h3>
              <button onClick={() => setReviewItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-primary font-bold mb-5 truncate leading-relaxed">{reviewItem.productName}</p>
            <div className="mb-4">
              <label className="text-[10px] text-slate-455 font-black uppercase tracking-wider block mb-2">Puanınız</label>
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>
            <div className="mb-5">
              <label className="text-[10px] text-slate-455 font-black uppercase tracking-wider block mb-2">Yorumunuz <span className="text-slate-500 font-semibold">(opsiyonel)</span></label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Bu ürün hakkında ne düşünüyorsunuz?"
                className="w-full bg-slate-955/40 border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground placeholder-slate-505 focus:outline-none focus:ring-2 focus:ring-primary/25 font-semibold resize-none"
              />
              {reviewComment.length > 0 && (
                <p className="text-[10px] text-slate-500 font-bold font-mono text-right mt-1.5">{reviewComment.length} / 500</p>
              )}
            </div>
            {reviewError && <p className="text-xs text-red-405 mb-4 font-bold">{reviewError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setReviewItem(null)} className="flex-1 px-4 py-2.5 text-xs font-bold border border-border/80 rounded-xl hover:bg-slate-800/40 transition-colors">
                Vazgeç
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewLoading || reviewRating === 0}
                className="flex-1 px-4 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
              >
                {reviewLoading
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gönderiliyor...</>
                  : <><Star className="w-3.5 h-3.5 fill-black" /> Yorumu Gönder</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 space-y-5">
          {/* Order Status Timeline */}
          {order.status !== 'Cancelled' && (() => {
            const STATUS_ORDER = ['Pending', 'Processing', 'Confirmed', 'Shipped', 'Delivered']
            const currentIdx = STATUS_ORDER.indexOf(order.status)
            const TIMELINE = [
              { label: 'Sipariş\nAlındı' },
              { label: 'Ödeme\nOnaylandı' },
              { label: 'Hazır-\nlanıyor' },
              { label: 'Kargoya\nVerildi' },
              { label: 'Teslim\nEdildi' },
            ]
            return (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Sipariş Durumu</h4>
                <div className="flex items-start">
                  {TIMELINE.map((t, i) => {
                    const isDone = currentIdx >= i
                    const isActive = currentIdx === i
                    return (
                      <div key={i} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                            isDone && !isActive ? 'bg-emerald-500 border-emerald-500' :
                            isActive ? 'bg-primary border-primary' :
                            'bg-slate-900 border-border'
                          }`}>
                            {isDone && !isActive
                              ? <Check className="w-3.5 h-3.5 text-white" />
                              : isActive
                              ? <span className="w-2 h-2 rounded-full bg-white" />
                              : <span className="w-2 h-2 rounded-full bg-slate-700" />
                            }
                          </div>
                          <span className={`text-[9px] text-center leading-tight font-medium whitespace-pre-line ${
                            isDone ? 'text-emerald-400' : isActive ? 'text-primary' : 'text-slate-600'
                          }`}>{t.label}</span>
                        </div>
                        {i < TIMELINE.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mb-5 ${
                            currentIdx > i ? 'bg-emerald-500' : 'bg-border'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

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
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs text-slate-400">{item.quantity}×</p>
                    <p className="text-sm font-medium text-foreground">
                      {item.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                    {order.status === 'Delivered' && !reviewedProducts.has(item.productId.toString()) && (
                      <button
                        onClick={() => { setReviewItem(item); setReviewRating(5); setReviewComment(''); setReviewError('') }}
                        className="text-[10px] flex items-center gap-0.5 text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <Star className="w-3 h-3 fill-amber-400" /> Yorum Yaz
                      </button>
                    )}
                    {reviewedProducts.has(item.productId.toString()) && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Yorumlandı
                      </span>
                    )}
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

  const handleOrderUpdate = (updated: BuyerOrderDto) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
  }

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

      <AccountTabs />

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
            <OrderCard key={order.id} order={order} onUpdate={handleOrderUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
