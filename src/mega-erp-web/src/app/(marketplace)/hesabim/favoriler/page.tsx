'use client'

import { useEffect, useState } from 'react'
import { Heart, Package, Trash2, ShoppingCart, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useWishlistStore } from '@/store/wishlist.store'
import { marketplaceService, MarketplaceProduct } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

export default function FavorilerPage() {
  const { items, remove, clear } = useWishlistStore()
  const setCart = useBuyerCartStore((s) => s.setCart)
  const router = useRouter()
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addingAll, setAddingAll] = useState(false)
  const [addedAllCount, setAddedAllCount] = useState(0)

  useEffect(() => {
    if (items.length === 0) {
      setLoading(false)
      setProducts([])
      return
    }
    setLoading(true)
    Promise.all(items.map((id) => marketplaceService.getProduct(id).catch(() => null)))
      .then((results) => {
        setProducts(results.filter(Boolean) as MarketplaceProduct[])
      })
      .finally(() => setLoading(false))
  }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = async (productId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
    if (!token) {
      router.push('/alici-auth/giris')
      return
    }
    setAddingId(productId)
    try {
      const cart = await marketplaceService.addToCart(productId)
      setCart(cart)
    } catch {
      router.push('/alici-auth/giris')
    } finally {
      setAddingId(null)
    }
  }

  const handleAddAllToCart = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
    if (!token) { router.push('/alici-auth/giris'); return }
    setAddingAll(true)
    let count = 0
    let lastCart = null
    for (const product of products) {
      const allStocks = product.variants.map(v => v.stockQuantity)
      const isOutOfStock = allStocks.length > 0 && allStocks.every(q => q === 0)
      if (isOutOfStock) continue
      try {
        lastCart = await marketplaceService.addToCart(product.id)
        count++
      } catch { /* continue */ }
    }
    if (lastCart) setCart(lastCart)
    setAddedAllCount(count)
    setAddingAll(false)
    setTimeout(() => setAddedAllCount(0), 3000)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AccountTabs
        header={
          <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-wider">Hesabım</h1>
              <p className="text-slate-400 text-xs font-semibold mt-1.5">
                {items.length > 0 ? `${items.length} ürün favorilendi` : 'Favori listesi'}
              </p>
            </div>
            {products.length > 0 && (
              <div className="flex items-center gap-2">
                {addedAllCount > 0 && (
                  <span className="text-xs text-emerald-400 font-bold">{addedAllCount} ürün sepete eklendi!</span>
                )}
                <button
                  onClick={handleAddAllToCart}
                  disabled={addingAll}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 disabled:opacity-60"
                >
                  <ShoppingBag className={`w-3.5 h-3.5 ${addingAll ? 'animate-bounce' : ''}`} />
                  {addingAll ? 'Ekleniyor...' : 'Tümünü Sepete Ekle'}
                </button>
                <button
                  onClick={() => { if (confirm('Tüm favoriler silinecek. Emin misiniz?')) clear() }}
                  className="px-4 py-2.5 rounded-xl border border-border/80 text-xs text-red-400 hover:text-white hover:bg-red-500/10 font-bold transition-all"
                >
                  Tümünü Temizle
                </button>
              </div>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: Math.min(items.length || 4, 8) }).map((_, i) => (
            <div key={i} className="premium-card overflow-hidden bg-slate-900/60 border border-border/80 animate-pulse">
              <div className="aspect-square bg-slate-950/60" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-950/60 rounded w-1/2" />
                <div className="h-4 bg-slate-950/60 rounded w-3/4" />
                <div className="h-3 bg-slate-950/60 rounded w-full" />
                <div className="h-6 bg-slate-950/60 rounded w-1/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-slate-900/60 border border-border/80 rounded-2xl p-6 mt-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-950/40 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Favori listeniz boş</h2>
          <p className="text-slate-400 text-sm font-semibold mb-6 max-w-sm mx-auto">
            Beğendiğiniz ürünleri kalp ikonuna tıklayarak favorilerinize ekleyebilirsiniz.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
          {products.map((product) => {
            const variantPrices = product.variants.map((v) => v.price)
            const price = variantPrices.length > 0 ? Math.min(...variantPrices) : product.basePrice
            const allStocks = product.variants.map((v) => v.stockQuantity)
            const isOutOfStock = allStocks.length > 0 && allStocks.every((q) => q === 0)
            const isAdding = addingId === product.id

            return (
              <div key={product.id} className="bg-slate-900/60 border border-border/80 rounded-2xl overflow-hidden group relative transition-all duration-300 hover:border-slate-700 hover:-translate-y-0.5 shadow-sm">
                <Link href={`/urun/${product.id}`} className="block">
                  <div className="aspect-square bg-gradient-to-br from-slate-950 to-slate-900 relative overflow-hidden border-b border-border/40">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className={`object-cover group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'opacity-50' : ''}`}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-600" />
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-10">
                        <span className="px-3 py-1 rounded-xl bg-slate-900/90 text-slate-400 text-[10px] font-black uppercase tracking-wider border border-border/40">
                          Tükendi
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] text-primary font-black uppercase tracking-wider mb-1 truncate">{product.categoryName}</p>
                    <h3 className="text-xs font-bold text-foreground line-clamp-2 min-h-[32px] mb-3 group-hover:text-primary transition-colors leading-relaxed">
                      {product.name}
                    </h3>
                    <span className="text-base font-extrabold text-primary font-mono">
                      {price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </div>
                </Link>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={isAdding || isOutOfStock}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className={`w-3.5 h-3.5 ${isAdding ? 'animate-spin' : ''}`} />
                    {isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle'}
                  </button>
                  <button
                    onClick={() => remove(product.id)}
                    className="p-2.5 rounded-xl text-slate-450 hover:text-red-405 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                    title="Favorilerden çıkar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
