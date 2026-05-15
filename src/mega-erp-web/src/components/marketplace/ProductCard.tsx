'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Star, Package } from 'lucide-react'
import type { MarketplaceProduct } from '@/lib/services/marketplace.service'
import { marketplaceService } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProductCardProps {
  product: MarketplaceProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const setCart = useBuyerCartStore((s) => s.setCart)
  const [adding, setAdding] = useState(false)

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
    } catch {
      router.push('/alici-auth/giris')
    } finally {
      setAdding(false)
    }
  }

  return (
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
        {/* İndirim badge */}
        {discountPercent > 0 && !isOutOfStock && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-lg z-10 shadow-sm">
            %{discountPercent} İndirim
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
            title={isOutOfStock ? 'Stokta yok' : 'Sepete ekle'}
            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary flex items-center justify-center transition-colors group/btn disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className={`w-4 h-4 text-primary group-hover/btn:text-white transition-colors ${adding ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </Link>
  )
}
