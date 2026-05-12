'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct } from '@/lib/services/marketplace.service'
import { ProductCard } from '@/components/marketplace/ProductCard'

function ProductSkeleton() {
  return (
    <div className="premium-card overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-800" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-slate-700 rounded w-1/3" />
        <div className="h-4 bg-slate-700 rounded" />
        <div className="h-5 bg-slate-700 rounded w-1/2 mt-2" />
      </div>
    </div>
  )
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name', label: 'İsme Göre' },
]

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const slugParts = Array.isArray(params.slug) ? params.slug : [params.slug as string]
  const categorySlug = slugParts[slugParts.length - 1]

  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const sort = (searchParams.get('sort') as 'newest' | 'price_asc' | 'price_desc' | 'name') ?? 'newest'
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    marketplaceService.getProducts({ sort, minPrice, maxPrice, page, pageSize })
      .then((res) => {
        setProducts(res.items)
        setTotalCount(res.totalCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sort, minPrice, maxPrice, page])

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) params.delete(key)
    else params.set(key, value)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const breadcrumbs = ['Kategoriler', ...slugParts.map((s) => s.charAt(0).toUpperCase() + s.slice(1))]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <span className={i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>{crumb}</span>
          </span>
        ))}
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="premium-card p-4 space-y-6">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filtreler
            </div>

            {/* Sort */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Sıralama</p>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateParam('sort', opt.value)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      sort === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Fiyat Aralığı</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min ₺"
                  defaultValue={minPrice}
                  onBlur={(e) => updateParam('minPrice', e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  placeholder="Max ₺"
                  defaultValue={maxPrice}
                  onBlur={(e) => updateParam('maxPrice', e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              {loading ? 'Yükleniyor...' : `${totalCount} ürün bulundu`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-lg">Bu kategoride ürün bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => updateParam('page', String(p))}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === p ? 'bg-primary text-white' : 'bg-surface border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
