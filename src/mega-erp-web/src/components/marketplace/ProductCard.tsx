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

  const price = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice

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
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-500" />
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
            disabled={adding}
            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary flex items-center justify-center transition-colors group/btn disabled:opacity-50"
          >
            <ShoppingCart className={`w-4 h-4 text-primary group-hover/btn:text-white transition-colors ${adding ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </Link>
  )
}
