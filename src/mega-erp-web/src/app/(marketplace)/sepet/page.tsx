'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, Tag, Check, X, Loader2, Truck, Star, Sparkles } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

export default function CartPage() {
  const router = useRouter()
  const { items, total, setCart, clear } = useBuyerCartStore()
  const { isAuthenticated } = useBuyerAuthStore()
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplying, setCouponApplying] = useState(false)
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount: number; message?: string } | null>(null)
  const [recommendations, setRecommendations] = useState<MarketplaceProduct[]>([])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/alici-auth/giris')
      return
    }
    marketplaceService.getCart()
      .then((cart) => {
        setCart(cart)
        // Fetch recommendations after cart loads
        const cartProductIds = new Set(cart.items.map(i => i.productId))
        marketplaceService.getProducts({ pageSize: 12 })
          .then(res => {
            const recs = res.items
              .filter(p => !cartProductIds.has(p.id))
              .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
              .slice(0, 6)
            setRecommendations(recs)
          })
          .catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated, router, setCart])

  const handleRemove = async (itemId: string) => {
    const cart = await marketplaceService.removeCartItem(itemId)
    setCart(cart)
  }

  const handleUpdate = async (itemId: string, qty: number) => {
    if (qty < 1) {
      await handleRemove(itemId)
      return
    }
    const cart = await marketplaceService.updateCartItem(itemId, qty)
    setCart(cart)
  }

  const handleCheckout = () => {
    router.push('/odeme')
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponApplying(true)
    setCouponResult(null)
    try {
      const res = await marketplaceService.validateCoupon(couponCode.trim(), total)
      setCouponResult({ valid: res.valid, discount: res.discountAmount, message: res.message })
    } catch {
      setCouponResult({ valid: false, discount: 0, message: 'Kupon doğrulanamadı.' })
    } finally {
      setCouponApplying(false)
    }
  }

  const couponDiscount = couponResult?.valid ? couponResult.discount : 0
  const finalTotal = Math.max(0, total - couponDiscount)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card p-4 flex gap-4">
              <div className="w-20 h-20 bg-slate-700 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Sepetiniz boş</h2>
        <p className="text-sm text-slate-400 mb-6">Alışverişe başlamak için ürün ekleyin.</p>
        <Link href="/" className="premium-button inline-flex items-center gap-2">
          Alışverişe Başla <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6" /> Sepetim
        <span className="text-sm font-normal text-slate-400">({items.length} ürün)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="premium-card p-4 flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden relative shrink-0">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.productName}</p>
                {item.variantName && <p className="text-xs text-slate-400">{item.variantName}</p>}
                <p className="text-sm font-bold text-primary mt-1">
                  {item.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={() => handleRemove(item.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleUpdate(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                  <button onClick={() => handleUpdate(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {item.lineTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
              </div>
            </div>
          ))}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Bunları da beğenebilirsiniz</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {recommendations.map((p) => {
                  const minPrice = p.variants.length > 0
                    ? Math.min(...p.variants.map(v => v.price))
                    : p.basePrice
                  return (
                    <Link
                      key={p.id}
                      href={`/urun/${p.id}`}
                      className="flex-shrink-0 w-36 premium-card overflow-hidden group"
                    >
                      <div className="relative w-full aspect-square bg-slate-800/60">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="144px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-foreground font-medium leading-tight line-clamp-2 mb-1">{p.name}</p>
                        {p.reviewCount > 0 && (
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            <span className="text-[10px] text-slate-400">{p.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                        <p className="text-xs font-bold text-primary">
                          {minPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="premium-card p-6 h-fit sticky top-24 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Sipariş Özeti</h2>

          {/* Free shipping progress */}
          {(() => {
            const threshold = 500
            const remaining = Math.max(0, threshold - total)
            const pct = Math.min(100, (total / threshold) * 100)
            return remaining > 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Truck className="w-3.5 h-3.5" /> Ücretsiz Kargo
                  </span>
                  <span className="text-amber-400 font-bold">
                    ₺{remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} kaldı
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  <span className="font-semibold text-amber-400">₺{remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>{' '}
                  daha ekle, kargo ücretsiz!
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                Ücretsiz kargo kazandınız! 🎉
              </div>
            )
          })()}

          {/* Coupon input */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-border/80 space-y-2.5">
            <p className="text-[10px] font-black text-slate-455 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" /> Kupon / İndirim Kodu
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                placeholder="KODU GİRİN"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-border/80 text-xs text-foreground uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all font-bold"
                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponApplying || !couponCode.trim()}
                className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all disabled:opacity-40 border border-primary/20 hover:border-transparent flex items-center justify-center shrink-0 shadow-sm"
              >
                {couponApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uygula'}
              </button>
            </div>
            {couponResult && (
              <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all ${
                couponResult.valid
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-405'
                  : 'bg-red-500/10 border-red-500/20 text-red-405'
              }`}>
                {couponResult.valid ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {couponResult.valid
                    ? `${couponResult.discount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} indirim uygulandı!`
                    : (couponResult.message ?? 'Geçersiz kupon kodu.')}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Ürünler ({items.reduce((s, i) => s + i.quantity, 0)} adet)</span>
              <span>{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Kupon İndirimi</span>
                <span>− {couponDiscount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Kargo</span>
              <span className="text-green-400">Ücretsiz</span>
            </div>
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
            <span>Toplam</span>
            <span className="text-primary text-lg">{finalTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full premium-button flex items-center justify-center gap-2"
          >
            Ödemeye Geç
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
