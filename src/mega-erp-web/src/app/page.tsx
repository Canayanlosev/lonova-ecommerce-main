'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, ShieldCheck, Truck } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct, type CatalogCategory } from '@/lib/services/marketplace.service'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar'
import { MarketplaceFooter } from '@/components/marketplace/MarketplaceFooter'

function ProductSkeleton() {
  return (
    <div className="premium-card overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-800" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-slate-700 rounded w-1/3" />
        <div className="h-4 bg-slate-700 rounded w-full" />
        <div className="h-4 bg-slate-700 rounded w-3/4" />
        <div className="h-5 bg-slate-700 rounded w-1/2 mt-2" />
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: Truck, label: 'Hızlı Teslimat', desc: '2-3 iş günü' },
  { icon: ShieldCheck, label: 'Güvenli Alışveriş', desc: '256-bit SSL şifreleme' },
  { icon: Zap, label: 'Kolay İade', desc: '30 gün iade garantisi' },
]

const CATEGORY_ICONS: Record<string, string> = {
  elektronik: '💻', giyim: '👕', 'ev-yasam': '🏠',
  spor: '⚽', kitap: '📚', kozmetik: '💄',
}

export default function MarketplaceHomePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      marketplaceService.getProducts({ pageSize: 8 }),
      marketplaceService.getCategories(),
    ])
      .then(([productsRes, cats]) => {
        setProducts(productsRes.items)
        setCategories(cats.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl font-bold text-white mb-6"
            >
              Her Şey <span className="text-primary">Lonova'da</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-300 mb-8 max-w-xl mx-auto"
            >
              Binlerce ürün, güvenilir satıcılar ve hızlı teslimat — tek adreste.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link href="/kategori" className="premium-button inline-flex items-center gap-2">
                Alışverişe Başla <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/auth/register" className="px-6 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all inline-flex items-center gap-2">
                Mağaza Aç
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Feature badges */}
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
          {/* Categories */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-6">Kategoriler</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="premium-card p-4 flex flex-col items-center gap-2 animate-pulse">
                      <div className="w-10 h-10 bg-slate-700 rounded-xl" />
                      <div className="h-3 bg-slate-700 rounded w-3/4" />
                    </div>
                  ))
                : categories.length > 0
                ? categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/kategori/${cat.slug}`}
                      className="premium-card p-4 flex flex-col items-center gap-2 text-center cursor-pointer"
                    >
                      <span className="text-2xl">{CATEGORY_ICONS[cat.slug] ?? '🛍️'}</span>
                      <span className="text-xs font-medium text-foreground">{cat.name}</span>
                    </Link>
                  ))
                : ['Elektronik', 'Giyim', 'Ev & Yaşam', 'Spor', 'Kitap', 'Kozmetik'].map((name) => (
                    <div key={name} className="premium-card p-4 flex flex-col items-center gap-2 text-center">
                      <span className="text-2xl">🛍️</span>
                      <span className="text-xs font-medium text-foreground">{name}</span>
                    </div>
                  ))}
            </div>
          </section>

          {/* Featured products */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Öne Çıkan Ürünler</h2>
              <Link href="/kategori" className="text-sm text-primary hover:underline flex items-center gap-1">
                Tümünü gör <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg">Henüz ürün eklenmemiş.</p>
                <p className="text-sm mt-1">Ürünler eklendiğinde burada görünecek.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  )
}
