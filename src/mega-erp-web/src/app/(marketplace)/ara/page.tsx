'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct, type CatalogCategory } from '@/lib/services/marketplace.service'
import { ProductCard } from '@/components/marketplace/ProductCard'

const SORT_OPTIONS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'En Düşük Fiyat' },
  { value: 'price_desc', label: 'En Yüksek Fiyat' },
  { value: 'name', label: 'İsme Göre (A-Z)' },
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') ?? ''

  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CatalogCategory[]>([])

  // Filters
  const [sort, setSort] = useState<string>('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  // Search input state (debounced)
  const [inputValue, setInputValue] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showFilters, setShowFilters] = useState(false)

  const fetch = useCallback(async (query: string, p = 1) => {
    setLoading(true)
    try {
      const res = await marketplaceService.getProducts({
        search: query || undefined,
        sort: sort as 'newest' | 'price_asc' | 'price_desc' | 'name',
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        categoryId,
        page: p,
        pageSize: PAGE_SIZE,
      })
      if (p === 1) {
        setProducts(res.items)
      } else {
        setProducts((prev) => [...prev, ...res.items])
      }
      setTotalCount(res.totalCount)
    } finally {
      setLoading(false)
    }
  }, [sort, minPrice, maxPrice, categoryId])

  // Load categories once
  useEffect(() => {
    marketplaceService.getCategories().then((cats) => setCategories(cats)).catch(() => {})
  }, [])

  // Fetch on filter/sort/query change
  useEffect(() => {
    setPage(1)
    fetch(q, 1)
  }, [q, sort, categoryId, fetch])

  // Debounce search input → update URL
  const handleSearchInput = (val: string) => {
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (val) params.set('q', val)
      router.push(`/ara?${params}`)
    }, 400)
  }

  const handleApplyFilters = () => {
    setPage(1)
    fetch(q, 1)
    setShowFilters(false)
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetch(q, next)
  }

  const hasMore = products.length < totalCount

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Ürün, marka veya kategori ara..."
          className="w-full bg-slate-800 border border-border rounded-2xl pl-12 pr-12 py-3.5 text-foreground placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
        />
        {inputValue && (
          <button
            onClick={() => handleSearchInput('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          {q ? (
            <p className="text-sm text-slate-400">
              <span className="text-foreground font-semibold">&ldquo;{q}&rdquo;</span> için{' '}
              <span className="text-primary font-semibold">{totalCount}</span> sonuç
            </p>
          ) : (
            <p className="text-sm text-slate-400">{totalCount} ürün</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${
              showFilters ? 'border-primary text-primary bg-primary/10' : 'border-border text-slate-400 hover:border-primary hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtreler
          </button>
          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-slate-800 border border-border rounded-xl pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="premium-card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Price range */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Fiyat Aralığı (₺)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full bg-slate-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
              <span className="text-slate-500">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full bg-slate-800 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Kategori</p>
            <div className="relative">
              <select
                value={categoryId ?? ''}
                onChange={(e) => setCategoryId(e.target.value || undefined)}
                className="w-full appearance-none bg-slate-800 border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Tümü</option>
                {flattenCategories(categories).map((c) => (
                  <option key={c.id} value={c.id}>{c.indent}{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 premium-button text-sm py-2"
            >
              Uygula
            </button>
            <button
              onClick={() => {
                setMinPrice('')
                setMaxPrice('')
                setCategoryId(undefined)
                setSort('newest')
                setShowFilters(false)
              }}
              className="px-3 py-2 text-sm text-slate-400 hover:text-red-400 border border-border rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Results grid */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="premium-card overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-700" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-700 rounded w-1/2" />
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {q ? `"${q}" için sonuç bulunamadı` : 'Ürün bulunamadı'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {q ? 'Farklı anahtar kelimeler veya filtreleri deneyin.' : 'Filtrelerinizi gevşetin veya başka bir kategori seçin.'}
          </p>
          {(minPrice || maxPrice || categoryId) && (
            <button
              onClick={() => { setMinPrice(''); setMaxPrice(''); setCategoryId(undefined); }}
              className="text-sm text-primary hover:underline"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="premium-button px-8 disabled:opacity-60"
              >
                {loading ? 'Yükleniyor...' : `Daha Fazla Göster (${totalCount - products.length} kaldı)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function flattenCategories(cats: CatalogCategory[], depth = 0): { id: string; name: string; indent: string }[] {
  const result: { id: string; name: string; indent: string }[] = []
  for (const c of cats) {
    result.push({ id: c.id, name: c.name, indent: depth > 0 ? '  '.repeat(depth) + '└ ' : '' })
    if (c.children?.length) result.push(...flattenCategories(c.children, depth + 1))
  }
  return result
}
