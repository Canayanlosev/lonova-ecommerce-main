'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Layers, ChevronRight, Grid3X3, Search } from 'lucide-react'
import { marketplaceService, type CatalogCategory } from '@/lib/services/marketplace.service'

const CATEGORY_EMOJIS: Record<string, string> = {
  elektronik: '💻', moda: '👗', giyim: '👔', 'ev-yasam': '🏠', 'ev-dekorasyon': '🪑',
  spor: '⚽', kitap: '📚', 'kitap-muzik': '🎵', kozmetik: '💄', guzellik: '✨',
  oyuncak: '🎮', otomotiv: '🚗', bahce: '🌱', mutfak: '🍳', anne: '👶',
  teknoloji: '📱', bilgisayar: '🖥️', telefon: '📱', saat: '⌚', takı: '💎',
}

function getEmoji(slug: string): string {
  const key = Object.keys(CATEGORY_EMOJIS).find(k => slug.includes(k))
  return key ? CATEGORY_EMOJIS[key] : '🛍️'
}

function CategoryCard({ cat }: { cat: CatalogCategory }) {
  const emoji = getEmoji(cat.slug)
  return (
    <Link
      href={`/kategori/${cat.slug}`}
      className="premium-card p-5 group hover:border-primary/40 transition-all hover:scale-[1.02]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{emoji}</div>
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
      {cat.children?.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">{cat.children.length} alt kategori</p>
      )}
      {/* Sub-category pills */}
      {cat.children?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {cat.children.slice(0, 3).map(sub => (
            <span key={sub.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {sub.name}
            </span>
          ))}
          {cat.children.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
              +{cat.children.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

function CategorySkeleton() {
  return (
    <div className="premium-card p-5 animate-pulse">
      <div className="w-8 h-8 bg-slate-700 rounded mb-3" />
      <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-700 rounded w-1/3" />
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    marketplaceService.getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.children?.some(sub => sub.name.toLowerCase().includes(search.toLowerCase()))
      )
    : categories

  const totalSubCount = categories.reduce((s, c) => s + (c.children?.length ?? 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Tüm Kategoriler</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Tüm Kategoriler</h1>
          </div>
          {!loading && (
            <p className="text-sm text-slate-400">
              {categories.length} ana kategori · {totalSubCount} alt kategori
            </p>
          )}
        </div>
        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kategori ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {/* Category grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <CategorySkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">{search ? `"${search}" için kategori bulunamadı` : 'Kategori bulunamadı'}</p>
          {search && (
            <button onClick={() => setSearch('')} className="text-sm text-primary hover:underline mt-2">
              Aramayı temizle
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(cat => <CategoryCard key={cat.id} cat={cat} />)}
          </div>

          {/* Sub-category detail sections */}
          {!search && categories.filter(c => c.children?.length > 0).length > 0 && (
            <div className="mt-12 space-y-8">
              <h2 className="text-lg font-bold text-foreground">Detaylı Kategori Listesi</h2>
              {categories.filter(c => c.children?.length > 0).map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      href={`/kategori/${cat.slug}`}
                      className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <span>{getEmoji(cat.slug)}</span>
                      {cat.name}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link href={`/kategori/${cat.slug}`} className="text-xs text-primary hover:underline">
                      Tümünü gör
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.children.map(sub => (
                      <Link
                        key={sub.id}
                        href={`/kategori/${cat.slug}/${sub.slug}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-slate-400 hover:text-primary hover:border-primary/50 transition-all"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
