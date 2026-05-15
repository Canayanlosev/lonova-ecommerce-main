'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ShoppingCart, Star, Package, Check, Send, Trash2, ZoomIn, X } from 'lucide-react'
import {
  marketplaceService,
  type MarketplaceProduct,
  type MarketplaceVariant,
  type ProductReviewDto,
  type ProductReviewsResponse,
} from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

function groupVariants(variants: MarketplaceVariant[]) {
  return variants.reduce<Record<string, MarketplaceVariant[]>>((acc, v) => {
    const t = v.variantType || 'Variant'
    ;(acc[t] ??= []).push(v)
    return acc
  }, {})
}

function findVariant(variants: MarketplaceVariant[], selected: Record<string, string>): MarketplaceVariant | null {
  if (Object.keys(selected).length === 0) return null
  return variants.find((v) => Object.values(selected).some((val) => v.name === val)) ?? null
}

function StarRow({ rating, max = 5, size = 'md' }: { rating: number; max?: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <div className="flex">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
        />
      ))}
    </div>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`w-7 h-7 ${s <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  )
}

interface VariantSelectorProps {
  type: string
  variants: MarketplaceVariant[]
  selected: string | undefined
  onSelect: (name: string) => void
}

function VariantSelector({ type, variants, selected, onSelect }: VariantSelectorProps) {
  const isColor = type === 'Renk'
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">
        {type}
        {selected && <span className="ml-2 text-slate-400 font-normal">{selected}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const outOfStock = v.stockQuantity === 0
          const isSelected = selected === v.name
          if (isColor && v.colorHex) {
            return (
              <button
                key={v.id}
                title={v.name}
                onClick={() => !outOfStock && onSelect(v.name)}
                disabled={outOfStock}
                className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                  isSelected ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:border-slate-400'
                } ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ backgroundColor: v.colorHex }}
              >
                {isSelected && <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />}
                {outOfStock && <span className="absolute inset-0 flex items-center justify-center"><span className="w-full h-[2px] bg-red-400 rotate-45 block" /></span>}
              </button>
            )
          }
          return (
            <button
              key={v.id}
              onClick={() => !outOfStock && onSelect(v.name)}
              disabled={outOfStock}
              className={`min-w-[44px] h-10 px-3 rounded-lg text-sm font-medium border transition-all relative ${
                isSelected ? 'border-primary bg-primary/10 text-primary'
                  : outOfStock ? 'border-border text-slate-600 cursor-not-allowed line-through'
                  : 'border-border text-foreground hover:border-primary cursor-pointer'
              }`}
            >
              {v.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ReviewCard({ review, currentBuyerId, onDelete }: { review: ProductReviewDto; currentBuyerId?: string; onDelete: (id: string) => void }) {
  const date = new Date(review.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const initials = review.buyerName.slice(0, 2).toUpperCase()
  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-0">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-violet-600/30 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{review.buyerName}</span>
          <StarRow rating={review.rating} size="sm" />
          <span className="text-xs text-slate-500 ml-auto">{date}</span>
          {currentBuyerId === review.buyerUserId && (
            <button onClick={() => onDelete(review.id)} className="text-slate-600 hover:text-red-400 transition-colors ml-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {review.comment && <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>}
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { buyer } = useBuyerAuthStore()

  const [product, setProduct] = useState<MarketplaceProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description')
  const [adding, setAdding] = useState(false)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const setCart = useBuyerCartStore((s) => s.setCart)

  // Reviews state
  const [reviews, setReviews] = useState<ProductReviewsResponse | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    if (!id) return
    marketplaceService.getProduct(id)
      .then((p) => {
        setProduct(p)
        const groups = groupVariants(p.variants)
        const autoSelect: Record<string, string> = {}
        for (const [type, variants] of Object.entries(groups)) {
          const first = variants.find((v) => v.stockQuantity > 0) ?? variants[0]
          if (first) autoSelect[type] = first.name
        }
        setSelected(autoSelect)
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false))
  }, [id, router])

  const loadReviews = useCallback(async () => {
    if (!id) return
    setReviewsLoading(true)
    try {
      const data = await marketplaceService.getReviews(id)
      setReviews(data)
    } finally {
      setReviewsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (activeTab === 'reviews') loadReviews()
  }, [activeTab, loadReviews])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyer) { router.push('/alici-auth/giris'); return }
    setReviewError('')
    setSubmitting(true)
    try {
      await marketplaceService.createReview(id!, newRating, newComment.trim() || undefined)
      setNewComment('')
      setNewRating(5)
      await loadReviews()
      const updated = await marketplaceService.getProduct(id!)
      setProduct(updated)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data
      setReviewError(typeof msg === 'string' ? msg : 'Yorum gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!id) return
    await marketplaceService.deleteReview(id, reviewId)
    await loadReviews()
    const updated = await marketplaceService.getProduct(id)
    setProduct(updated)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-800 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-700 rounded w-3/4" />
            <div className="h-5 bg-slate-700 rounded w-1/2" />
            <div className="h-10 bg-slate-700 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }
  if (!product) return null

  const groups = groupVariants(product.variants)
  const hasVariants = product.variants.length > 0
  const allTypesSelected = Object.keys(groups).every((t) => selected[t])
  let activeVariant: MarketplaceVariant | null = null
  if (hasVariants) {
    if (Object.keys(groups).length === 1) {
      const type = Object.keys(groups)[0]
      activeVariant = groups[type]?.find((v) => v.name === selected[type]) ?? null
    } else {
      activeVariant = findVariant(product.variants, selected)
    }
  }
  const price = activeVariant && activeVariant.price > 0 ? activeVariant.price : product.basePrice
  const stock = activeVariant ? activeVariant.stockQuantity : (hasVariants ? 0 : 99)
  const inStock = hasVariants ? (allTypesSelected ? stock > 0 : false) : true
  const needsSelection = hasVariants && !allTypesSelected

  const alreadyReviewed = reviews?.items.some((r) => r.buyerUserId === buyer?.id)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-1 text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-400">{product.categoryName ?? 'Kategori'}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium truncate max-w-48">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        <div
          className={`aspect-square bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl overflow-hidden relative group/img ${product.imageUrl ? 'cursor-zoom-in' : ''}`}
          onClick={() => product.imageUrl && setZoomOpen(true)}
        >
          {product.imageUrl ? (
            <>
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover group-hover/img:scale-105 transition-transform duration-300" sizes="(max-width: 1024px) 100vw, 50vw" priority />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/0 group-hover/img:bg-white/20 flex items-center justify-center transition-all opacity-0 group-hover/img:opacity-100 backdrop-blur-sm">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-24 h-24 text-slate-500" />
            </div>
          )}
        </div>

        {/* Lightbox */}
        {zoomOpen && product.imageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setZoomOpen(false)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={() => setZoomOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="relative max-w-3xl max-h-[85vh] w-full h-full" onClick={e => e.stopPropagation()}>
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <p className="text-sm text-primary font-medium mb-1">{product.categoryName}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-sm text-slate-400 mt-1">SKU: {activeVariant?.sku ?? product.sku}</p>
          </div>

          {/* Real rating */}
          <button
            onClick={() => setActiveTab('reviews')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <StarRow rating={product.averageRating} />
            <span className="text-sm text-slate-400">
              {product.averageRating > 0
                ? `${product.averageRating} (${product.reviewCount} değerlendirme)`
                : 'Henüz değerlendirme yok'}
            </span>
          </button>

          <div>
            <p className="text-3xl font-bold text-primary">
              {price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            {activeVariant && (
              <p className={`text-sm mt-1 ${activeVariant.stockQuantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {activeVariant.stockQuantity > 0 ? `Stokta var (${activeVariant.stockQuantity} adet)` : 'Stokta yok'}
              </p>
            )}
            {!hasVariants && <p className="text-sm mt-1 text-green-400">Stokta var</p>}
          </div>

          {Object.entries(groups).map(([type, variants]) => (
            <VariantSelector
              key={type}
              type={type}
              variants={variants}
              selected={selected[type]}
              onSelect={(name) => setSelected((prev) => ({ ...prev, [type]: name }))}
            />
          ))}

          <div className="flex gap-3 pt-2">
            <button
              onClick={async () => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
                if (!token) { router.push('/alici-auth/giris'); return }
                if (hasVariants && !allTypesSelected) return
                setAdding(true)
                try {
                  const cart = await marketplaceService.addToCart(product.id, activeVariant?.id)
                  setCart(cart)
                  setAddedFeedback(true)
                  setTimeout(() => setAddedFeedback(false), 2000)
                } catch { router.push('/alici-auth/giris') }
                finally { setAdding(false) }
              }}
              disabled={!inStock || adding || needsSelection}
              className="flex-1 premium-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addedFeedback ? (<><Check className="w-4 h-4" /> Sepete Eklendi!</>)
                : adding ? (<><ShoppingCart className="w-4 h-4 animate-bounce" /> Ekleniyor...</>)
                : needsSelection ? (<><ShoppingCart className="w-4 h-4" /> {Object.keys(groups).filter(t => !selected[t]).join(', ')} seçin</>)
                : !inStock ? (<><ShoppingCart className="w-4 h-4" /> Stokta Yok</>)
                : (<><ShoppingCart className="w-4 h-4" /> Sepete Ekle</>)}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="premium-card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {(['description', 'specs', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-foreground'
              }`}
            >
              {tab === 'description' ? 'Açıklama'
                : tab === 'specs' ? 'Özellikler'
                : `Yorumlar${product.reviewCount > 0 ? ` (${product.reviewCount})` : ''}`}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'description' && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {product.description ?? 'Bu ürün için açıklama henüz eklenmemiş.'}
            </p>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-2">
              {[['SKU', activeVariant?.sku ?? product.sku], ['Kategori', product.categoryName ?? '—'],
                ...Object.entries(selected).map(([t, v]) => [t, v]),
                ['Varyant sayısı', String(product.variants.length)]
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4 text-sm">
                  <span className="text-slate-400 w-32 shrink-0">{k}</span>
                  <span className="text-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Average */}
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-foreground">{product.averageRating}</p>
                    <StarRow rating={product.averageRating} />
                    <p className="text-xs text-slate-400 mt-1">{product.reviewCount} yorum</p>
                  </div>
                </div>
              )}

              {/* Write review form */}
              {buyer && !alreadyReviewed && (
                <form onSubmit={handleSubmitReview} className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-border">
                  <p className="text-sm font-semibold text-foreground">Yorum Yaz</p>
                  <StarInput value={newRating} onChange={setNewRating} />
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ürün hakkında düşüncelerinizi paylaşın... (isteğe bağlı)"
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-slate-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-primary resize-none"
                  />
                  {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="premium-button text-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                  </button>
                </form>
              )}

              {!buyer && (
                <p className="text-sm text-slate-400 text-center py-4">
                  Yorum yazmak için{' '}
                  <Link href="/alici-auth/giris" className="text-primary hover:underline">giriş yapın</Link>.
                </p>
              )}

              {/* Review list */}
              {reviewsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-800 rounded" />)}
                </div>
              ) : reviews && reviews.items.length > 0 ? (
                <div>
                  {reviews.items.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      currentBuyerId={buyer?.id}
                      onDelete={handleDeleteReview}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Star className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">Henüz yorum yok. İlk yorumu siz yapın!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
