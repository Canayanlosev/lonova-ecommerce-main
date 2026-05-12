import Link from 'next/link'
import { ShoppingCart, Star } from 'lucide-react'
import type { MarketplaceProduct } from '@/lib/services/marketplace.service'

interface ProductCardProps {
  product: MarketplaceProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const price = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice

  return (
    <Link href={`/urun/${product.id}`} className="premium-card block overflow-hidden group">
      {/* Image placeholder */}
      <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
        <ShoppingCart className="w-10 h-10 text-slate-500" />
      </div>

      <div className="p-4">
        <p className="text-xs text-primary font-medium mb-1 truncate">{product.categoryName}</p>
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`w-3 h-3 ${s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
          ))}
          <span className="text-xs text-slate-400 ml-1">(24)</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </span>
          <button className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary flex items-center justify-center transition-colors group/btn">
            <ShoppingCart className="w-4 h-4 text-primary group-hover/btn:text-white transition-colors" />
          </button>
        </div>
      </div>
    </Link>
  )
}
