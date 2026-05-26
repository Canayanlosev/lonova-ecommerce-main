'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Star, Package, Heart, Check, Flame, Eye, X, ArrowRight } from 'lucide-react'
import type { MarketplaceProduct } from '@/lib/services/marketplace.service'
import { marketplaceService } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProductCardProps {
  product: MarketplaceProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const setCart = useBuyerCartStore((s) => s.setCart)
  const { toggle, has } = useWishlistStore()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [quickView, setQuickView] = useState(false)
  const isWishlisted = has(product.id)

  const variantPrices = product.variants.map(v => v.price)
  const price = variantPrices.length > 0 ? Math.min(...variantPrices) : product.basePrice
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : product.basePrice
  const discountPercent = product.basePrice > 0 && minVariantPrice < product.basePrice
    ? Math.round((1 - minVariantPrice / product.basePrice) * 100)
    : 0
  const allStocks = product.variants.map(v => v.stockQuantity)
  const isOutOfStock = allStocks.length > 0 && allStocks.every(q => q === 0)
  const minStock = allStocks.length > 0 ? Math.min(...allStocks.filter(q => q > 0)) : null
  const isLowStock = !isOutOfStock && minStock !== null && minStock <= 5
  const isPopular = product.reviewCount >= 10 && (product.averageRating ?? 0) >= 4.5

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
    if (!token) {
      router.push('/alici-auth/giris')
      return
    }
    setAdding(true)
    try {
      const cart = await marketplaceService.addToCart(product.id)
      setCart(cart)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      router.push('/alici-auth/giris')
    } finally {
      setAdding(false)
    }
  }

  return (
    <React.Fragment>
      <Link href={`/urun/${product.id}`} className="premium-card block overflow-hidden group">
        {/* Product image */}
        <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-700 relative overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className={`object-cover group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'opacity-50' : ''}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-500" />
            </div>
          )}
          {/* Favori butonu */}
          <button
            onClick={(e) => { e.preventDefault(); toggle(product.id) }}
            className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isWishlisted
                ? 'bg-red-500 shadow-lg shadow-red-500/40'
                : 'bg-black/40 hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100'
            }`}
            title={isWishlisted ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          >
            <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? 'text-white fill-white' : 'text-white'}`} />
          </button>

          {/* Quick View button — center bottom on hover */}
          <button
            onClick={(e) => { e.preventDefault(); setQuickView(true) }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-xs font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
          >
            <Eye className="w-3.5 h-3.5" /> Hızlı Önizleme
          </button>

          {/* İndirim badge */}
          {discountPercent > 0 && !isOutOfStock && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-lg z-10 shadow-sm">
              %{discountPercent} İndirim
            </span>
          )}
          {/* Popüler badge — only when no discount badge */}
          {isPopular && discountPercent === 0 && !isOutOfStock && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-lg z-10 shadow-sm">
              <Flame className="w-2.5 h-2.5" /> Popüler
            </span>
          )}
          {/* Düşük stok badge */}
          {isLowStock && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-amber-500/90 text-white text-[10px] font-semibold rounded-lg z-10 shadow-sm">
              Son {minStock} adet
            </span>
          )}
          {/* Tükendi overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/65 flex items-center justify-center z-10">
              <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-white text-xs font-bold border border-slate-700">
                Tükendi
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <p className="text-xs text-primary font-medium mb-1 truncate">{product.categoryName}</p>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-3 h-3 ${s <= Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
            ))}
            {product.reviewCount > 0
              ? <span className="text-xs text-slate-400 ml-1">({product.reviewCount})</span>
              : <span className="text-xs text-slate-600 ml-1">Yorum yok</span>}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </span>
            <button
              onClick={handleAddToCart}
              disabled={adding || isOutOfStock}
              title={isOutOfStock ? 'Stokta yok' : added ? 'Sepete eklendi!' : 'Sepete ekle'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group/btn disabled:opacity-40 disabled:cursor-not-allowed ${
                added ? 'bg-emerald-500 scale-110' : 'bg-primary/10 hover:bg-primary'
              }`}
            >
              {added
                ? <Check className="w-4 h-4 text-white" />
                : <ShoppingCart className={`w-4 h-4 text-primary group-hover/btn:text-white transition-colors ${adding ? 'animate-bounce' : ''}`} />
              }
            </button>
          </div>
        </div>
      </Link>

      {/* Quick View Modal */}
      {quickView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setQuickView(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative premium-card w-full max-w-lg overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setQuickView(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-slate-800/80 text-slate-400 hover:text-foreground flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row gap-0">
              {/* Image */}
              <div className="relative w-full sm:w-48 aspect-square sm:aspect-auto sm:h-auto shrink-0 bg-gradient-to-br from-slate-800 to-slate-700">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-600" />
                  </div>
                )}
                {discountPercent > 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-lg shadow-sm">
                    %{discountPercent} İndirim
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-5 space-y-3 min-w-0">
                <div>
                  <p className="text-xs text-primary font-medium mb-1">{product.categoryName}</p>
                  <h3 className="text-base font-bold text-foreground leading-snug">{product.name}</h3>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(product.averageRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                    ))}
                  </div>
                  {product.reviewCount > 0 && (
                    <span className="text-xs text-slate-400">{product.averageRating.toFixed(1)} ({product.reviewCount} yorum)</span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-primary">
                    {price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-sm text-slate-500 line-through">
                      {product.basePrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  )}
                </div>

                {/* Variants count */}
                {product.variants.length > 1 && (
                  <p className="text-xs text-slate-400">{product.variants.length} farklı seçenek mevcut</p>
                )}

                {/* Stock status */}
                {isOutOfStock ? (
                  <span className="inline-block text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-lg font-semibold">Stokta Yok</span>
                ) : isLowStock ? (
                  <span className="inline-block text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg font-semibold">Son {minStock} adet</span>
                ) : (
                  <span className="inline-block text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg font-semibold">Stokta</span>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAddToCart}
                    disabled={adding || isOutOfStock}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      added ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {added ? <Check className="w-4 h-4" /> : <ShoppingCart className={`w-4 h-4 ${adding ? 'animate-bounce' : ''}`} />}
                    {added ? 'Eklendi!' : isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle'}
                  </button>
                  <Link
                    href={`/urun/${product.id}`}
                    onClick={() => setQuickView(false)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm text-slate-400 hover:text-foreground hover:border-primary/50 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
