'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, SlidersHorizontal, Layers, Star } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct, type CatalogCategory } from '@/lib/services/marketplace.service'
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

/** Find a CatalogCategory by slug anywhere in the tree */
function findCategoryBySlug(tree: CatalogCategory[], slug: string): CatalogCategory | null {
  for (const cat of tree) {
    if (cat.slug === slug) return cat
    const found = findCategoryBySlug(cat.children, slug)
    if (found) return found
  }
  return null
}

function CategoryPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const slugParts = Array.isArray(params.slug) ? params.slug : [params.slug as string]
  const categorySlug = slugParts[slugParts.length - 1]

  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const [subCategories, setSubCategories] = useState<CatalogCategory[]>([])
  const [minRating, setMinRating] = useState(0)
  const [inStockOnly, setInStockOnly] = useState(false)

  const sort = (searchParams.get('sort') as 'newest' | 'price_asc' | 'price_desc' | 'name') ?? 'newest'
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = 20

  const displayedProducts = useMemo(() => {
    let list = [...products]
    if (minRating > 0) list = list.filter(p => (p.averageRating ?? 0) >= minRating)
    if (inStockOnly) list = list.filter(p =>
      p.variants.length === 0 || p.variants.some(v => v.stockQuantity > 0)
    )
    return list
  }, [products, minRating, inStockOnly])

  // Resolve slug → category name, then load products
  useEffect(() => {
    const resolve = async () => {
      setLoading(true)
      try {
        const tree = await marketplaceService.getCategories()
        const found = findCategoryBySlug(tree, categorySlug)
        const name = found?.name ?? null
        setCategoryName(name)
        setSubCategories(found?.children ?? [])

        const res = await marketplaceService.getProducts({
          categoryName: name ?? undefined,
          sort,
          minPrice,
          maxPrice,
          page,
          pageSize,
        })
        setProducts(res.items)
        setTotalCount(res.totalCount)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    resolve()
  }, [categorySlug, sort, minPrice, maxPrice, page])

  const updateParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString())
    if (value === null) p.delete(key)
    else p.set(key, value)
    p.set('page', '1')
    router.push(`?${p.toString()}`)
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const displayName = categoryName ?? slugParts[slugParts.length - 1]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-400 mb-6 flex-wrap">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/ara" className="hover:text-primary transition-colors">Kategoriler</Link>
        {slugParts.slice(0, -1).map((slug, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <Link href={`/kategori/${slugParts.slice(0, i + 1).join('/')}`} className="hover:text-primary transition-colors capitalize">
              {slug.replace(/-/g, ' ')}
            </Link>
          </span>
        ))}
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{displayName}</span>
      </nav>

      {/* Category header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
        {!loading && (
          <p className="text-sm text-slate-400 mt-1">{totalCount} ürün</p>
        )}
      </div>

      {/* Sub-categories */}
      {subCategories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {subCategories.map(sub => (
            <Link
              key={sub.id}
              href={`/kategori/${slugParts.join('/')}/${sub.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-slate-400 hover:text-primary hover:border-primary transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="premium-card p-4 space-y-6 sticky top-24">
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
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Fiyat Aralığı (₺)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  defaultValue={minPrice}
                  onBlur={(e) => updateParam('minPrice', e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  placeholder="Max"
                  defaultValue={maxPrice}
                  onBlur={(e) => updateParam('maxPrice', e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Rating filter */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Minimum Puan</p>
              <div className="space-y-1">
                {[0, 4, 3, 2, 1].map(r => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                      minRating === r ? 'bg-primary/10 text-primary font-medium' : 'text-slate-400 hover:bg-surface'
                    }`}
                  >
                    {r === 0 ? (
                      'Tümü'
                    ) : (
                      <>
                        {Array.from({ length: r }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-xs">ve üzeri</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* In Stock filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-sm text-foreground">Sadece Stokta Olanlar</span>
              </label>
            </div>

            {/* Clear filters */}
            {(minPrice !== undefined || maxPrice !== undefined || minRating > 0 || inStockOnly) && (
              <button
                onClick={() => {
                  const p = new URLSearchParams()
                  if (sort !== 'newest') p.set('sort', sort)
                  router.push(`?${p.toString()}`)
                  setMinRating(0)
                  setInStockOnly(false)
                }}
                className="w-full text-xs text-red-400 hover:underline text-left"
              >
                Tüm filtreleri temizle
              </button>
            )}
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Layers className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-lg font-medium">
                {products.length > 0 ? 'Filtrelerinize uyan ürün bulunamadı.' : 'Bu kategoride ürün bulunamadı.'}
              </p>
              {products.length > 0 ? (
                <button onClick={() => { setMinRating(0); setInStockOnly(false) }} className="text-primary hover:underline text-sm mt-2">
                  Filtreleri temizle
                </button>
              ) : (
                <Link href="/ara" className="text-primary hover:underline text-sm mt-2 block">
                  Tüm ürünleri ara →
                </Link>
              )}
            </div>
          ) : (
            <>
              {(minRating > 0 || inStockOnly) && (
                <p className="text-xs text-slate-400 mb-3">
                  {displayedProducts.length} ürün gösteriliyor
                  {products.length !== displayedProducts.length && ` (${products.length} toplam, ${products.length - displayedProducts.length} filtrelendi)`}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
              {page > 1 && (
                <button onClick={() => updateParam('page', String(page - 1))}
                  className="px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground hover:border-primary transition-colors">
                  ← Önceki
                </button>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
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
              {page < totalPages && (
                <button onClick={() => updateParam('page', String(page + 1))}
                  className="px-3 py-2 rounded-lg text-sm bg-surface border border-border text-foreground hover:border-primary transition-colors">
                  Sonraki →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Yükleniyor...</div>}>
      <CategoryPageContent />
    </Suspense>
  )
}
