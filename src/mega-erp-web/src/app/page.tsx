'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight, Zap, ShieldCheck, Truck, TrendingUp,
  Users, Package, BarChart3, CheckCircle2, Flame, Star, Tag,
  Coffee, AlertTriangle, BookOpen, Clock, History, X as CloseIcon, Bell, Send
} from 'lucide-react'
import { marketplaceService, type MarketplaceProduct, type CatalogCategory } from '@/lib/services/marketplace.service'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar'
import { MarketplaceFooter } from '@/components/marketplace/MarketplaceFooter'

type RecentItem = { id: string; name: string; imageUrl?: string; basePrice: number }

function ProductSkeleton() {
  return (
    <div className="premium-card overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-800/60 rounded-t-xl" />
      <div className="p-4 space-y-2.5">
        <div className="h-3 bg-slate-700/60 rounded w-1/3" />
        <div className="h-4 bg-slate-700/60 rounded w-full" />
        <div className="h-4 bg-slate-700/60 rounded w-2/3" />
        <div className="h-5 bg-slate-700/60 rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}

const TRUST_BADGES = [
  { icon: Truck, label: 'Hızlı Teslimat', desc: '2-3 iş günü garantisi' },
  { icon: ShieldCheck, label: 'Güvenli Ödeme', desc: '256-bit SSL şifreleme' },
  { icon: Zap, label: 'Kolay İade', desc: '30 gün iade hakkı' },
]

const DAY_IN_LIFE = [
  { time: '08:00', icon: Coffee, title: 'Sabah başlıyorsun', desc: 'Dashboard\'da bugünün siparişlerini, bekleyen işlemleri ve stok uyarılarını bir bakışta görürsün.' },
  { time: '09:30', icon: Package, title: 'Sipariş paketlendi', desc: 'Kargo entegrasyonu ile tek tıkla etiket hazırla, durumu otomatik güncellenir.' },
  { time: '11:00', icon: AlertTriangle, title: 'Stok uyarısı geldi', desc: 'Bir ürün kritik seviyeye düştü — sistem seni uyarır, ürün otomatik kapanır, satış kaybı yaşamazsın.' },
  { time: '17:00', icon: BookOpen, title: 'Muhasebe otomatik', desc: 'Günün satışları tek tıkla yevmiyeye aktarılır. Elle veri girişi yok, hata yok.' },
  { time: 'Maaş Günü', icon: Users, title: 'Bordro hazır', desc: 'İK modülünden çalışan maaşlarını görüntüle, bordro hesapla — ayrı programa gerek yok.' },
]

const PLATFORM_FEATURES = [
  { icon: BarChart3, label: 'Anlık Analitik', desc: 'Satış, sipariş ve gelir verilerini gerçek zamanlı takip et.', href: '/dashboard' },
  { icon: Package, label: 'Stok Yönetimi', desc: 'Çok depolu WMS entegrasyonu ile tam stok kontrolü.', href: '/dashboard/wms' },
  { icon: Users, label: 'Muhasebe', desc: 'Siparişler otomatik muhasebeleşir — elle giriş bitti.', href: '/dashboard/accounting' },
  { icon: TrendingUp, label: 'İK & Bordro', desc: 'Çalışan yönetimi, izin takibi ve bordro tek ekranda.', href: '/dashboard/hr' },
]

const STATS = [
  { value: '12K+', label: 'Aktif KOBİ' },
  { value: '850K+', label: 'Kayıtlı Ürün' },
  { value: '2.4M+', label: 'Tamamlanan Sipariş' },
  { value: '99.9%', label: 'Sistem Uptime' },
]

const CATEGORY_ICONS: Record<string, string> = {
  elektronik: '💻', giyim: '👕', 'ev-yasam': '🏠',
  spor: '⚽', kitap: '📚', kozmetik: '💄',
  moda: '👗', 'kitap-muzik': '🎵',
}

const FALLBACK_CATEGORIES = [
  { name: 'Elektronik', slug: 'elektronik' },
  { name: 'Moda', slug: 'moda' },
  { name: 'Ev & Yaşam', slug: 'ev-yasam' },
  { name: 'Spor', slug: 'spor' },
  { name: 'Kitap & Müzik', slug: 'kitap-muzik' },
  { name: 'Kozmetik', slug: 'kozmetik' },
]

const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } }

const PROMO_KEY = 'promo-bar-dismissed-v1'

export default function HomePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [recentlyViewed, setRecentlyViewed] = useState<RecentItem[]>([])
  const [showPromo, setShowPromo] = useState(false)
  const [activeProductTab, setActiveProductTab] = useState<'featured' | 'top_rated' | 'cheapest'>('featured')
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterState, setNewsletterState] = useState<'idle' | 'success'>('idle')

  const displayedProducts = useMemo(() => {
    if (activeProductTab === 'top_rated') {
      return [...products].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    }
    if (activeProductTab === 'cheapest') {
      return [...products].sort((a, b) => {
        const aPrice = a.variants.length > 0 ? Math.min(...a.variants.map(v => v.price)) : a.basePrice
        const bPrice = b.variants.length > 0 ? Math.min(...b.variants.map(v => v.price)) : b.basePrice
        return aPrice - bPrice
      })
    }
    return products // featured = default API order
  }, [products, activeProductTab])

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

    try {
      const saved: RecentItem[] = JSON.parse(localStorage.getItem('recently-viewed') ?? '[]')
      setRecentlyViewed(saved.slice(0, 6))
    } catch {
      // ignore
    }

    // Show promo bar if not dismissed
    if (!localStorage.getItem(PROMO_KEY)) setShowPromo(true)
  }, [])

  const dismissPromo = () => {
    setShowPromo(false)
    localStorage.setItem(PROMO_KEY, '1')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Promo / Announcement Bar */}
      {showPromo && (
        <div className="relative bg-gradient-to-r from-primary/90 to-secondary/90 text-white text-center py-2 px-4 text-xs font-semibold">
          <span>🎉 Mayıs kampanyası: İlk 3 ay komisyonsuz satış! </span>
          <Link href="/auth/register" className="underline font-bold hover:no-underline ml-1">
            Ücretsiz mağaza aç →
          </Link>
          <button
            onClick={dismissPromo}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Kapat"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <MarketplaceNavbar />

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-[hsl(226_45%_5%)] py-24 px-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_hsl(var(--primary)_/_0.15),_transparent)]" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--secondary)_/_0.08),_transparent)]" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-semibold mb-6 tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Türkiye'nin KOBİ için Tek Platformu
              </motion.div>

              <motion.h1
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="text-5xl sm:text-7xl font-black text-white mb-4 leading-[1.05] tracking-tight"
              >
                Esnafın tüm işi{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  tek ekranda
                </span>
              </motion.h1>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.14 }}
                className="text-lg text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed"
              >
                Sabah siparişleri gör. Stok bitmeden uyar. Maaş günü bordro hazırla.
                Hepsi <span className="text-white font-semibold">Canayan</span><span className="text-primary font-semibold">Web</span>'de.
              </motion.p>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
              >
                <Link
                  href="/auth/register"
                  className="premium-button inline-flex items-center justify-center gap-2 text-sm px-7 py-3"
                >
                  Ücretsiz Mağaza Aç <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/kategori"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/8 hover:border-white/25 transition-all text-sm font-semibold"
                >
                  Alışverişe Bak
                </Link>
              </motion.div>

              {/* Mikro badge'ler */}
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="flex items-center justify-center gap-5 flex-wrap"
              >
                {['Komisyon yok', 'Kurulum ücretsiz', '7/24 destek'].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-slate-300 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.5 }}
              className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/8"
            >
              {STATS.map(({ value, label }) => (
                <div key={label} className="bg-white/[0.03] px-6 py-5 text-center hover:bg-white/[0.06] transition-colors">
                  <p className="text-2xl sm:text-3xl font-black text-white mb-1">{value}</p>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── TRUST BADGES ── */}
        <section className="border-b border-border bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {TRUST_BADGES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 py-3 sm:py-0 sm:px-6 first:pl-0 last:pr-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ESNAFIN BİR GÜNÜ ── */}
        <section className="py-16 px-4 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Gerçek Senaryo</p>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">Esnafın bir günü</h2>
              <p className="text-slate-400 mt-3 text-sm max-w-lg mx-auto">
                Sabahtan akşama, mağazadan muhasebeye — tüm işin CanayanWeb'de.
              </p>
            </div>

            <div className="relative">
              {/* Dikey çizgi */}
              <div className="absolute left-[28px] sm:left-1/2 top-0 bottom-0 w-px bg-border hidden sm:block" />

              <div className="space-y-6">
                {DAY_IN_LIFE.map(({ time, icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={time}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className={`flex items-start gap-4 sm:w-[calc(50%-2rem)] ${i % 2 === 0 ? 'sm:mr-auto sm:pr-8' : 'sm:ml-auto sm:pl-8'}`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="premium-card p-4 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">{time}</span>
                        <h3 className="font-bold text-sm text-foreground">{title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PLATFORM FEATURES ── */}
        <section className="py-14 px-4 border-b border-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Platform Özellikleri</p>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">Tek platformda her şey</h2>
              <p className="text-slate-400 mt-3 text-sm max-w-md mx-auto">
                Satıştan muhasebeye, depodan İK'ya — tüm iş süreçlerin CanayanWeb'de.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLATFORM_FEATURES.map(({ icon: Icon, label, desc, href }) => (
                <Link key={label} href={href} className="premium-card p-6 group block">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1.5">{label}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold group-hover:gap-2 transition-all">
                    Demo Gör <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
          {/* ── CATEGORIES ── */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Kategoriler</h2>
              <Link href="/kategori" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium">
                Tümü <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="premium-card p-4 flex flex-col items-center gap-2 animate-pulse">
                      <div className="w-10 h-10 bg-slate-800/60 rounded-xl" />
                      <div className="h-3 bg-slate-800/60 rounded w-2/3" />
                    </div>
                  ))
                : (categories.length > 0 ? categories : FALLBACK_CATEGORIES).map((cat) => (
                    <Link
                      key={cat.slug ?? cat.name}
                      href={`/kategori/${cat.slug ?? cat.name.toLowerCase()}`}
                      className="premium-card p-4 flex flex-col items-center gap-2.5 text-center group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                        {CATEGORY_ICONS[cat.slug ?? ''] ?? '🛍️'}
                      </span>
                      <span className="text-xs font-semibold text-foreground leading-tight">{cat.name}</span>
                    </Link>
                  ))
              }
            </div>
          </section>

          {/* ── PRODUCTS ── */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Platformumuzdaki Ürünler</h2>
                <p className="text-xs text-slate-500 mt-0.5">Satıcılarımızın listelediği ürünler</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/auth/register" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10">
                  Siz de satın <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/kategori" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-medium">
                  Tümünü gör <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Product tabs */}
            {!loading && products.length > 0 && (
              <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                {([
                  { key: 'featured', label: 'Öne Çıkanlar', icon: Flame },
                  { key: 'top_rated', label: 'En Yüksek Puan', icon: Star },
                  { key: 'cheapest', label: 'En Uygun Fiyat', icon: Tag },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveProductTab(key)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeProductTab === key
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-surface border border-border text-slate-400 hover:text-foreground hover:border-primary/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-border">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-base font-semibold text-slate-400">Henüz ürün eklenmemiş</p>
                <p className="text-sm text-slate-500 mt-1">Ürünler eklendiğinde burada görünecek.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedProducts.map((p, i) => (
                  <motion.div
                    key={`${activeProductTab}-${p.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* ── SON BAKTIKLARIN ── */}
          {recentlyViewed.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Son Baktıklarınız</h2>
                </div>
                <button
                  onClick={() => { try { localStorage.removeItem('recently-viewed') } catch { /* */ } setRecentlyViewed([]) }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Temizle
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {recentlyViewed.map((item) => (
                  <Link
                    key={item.id}
                    href={`/urun/${item.id}`}
                    className="flex-shrink-0 w-36 premium-card overflow-hidden group"
                  >
                    <div className="relative w-full aspect-square bg-slate-800/60">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="144px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-foreground font-medium leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-xs font-bold text-primary mt-1">
                        ₺{item.basePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── NEWSLETTER ── */}
          <section className="premium-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-foreground mb-1">Fırsatlardan haberdar olun</h3>
                <p className="text-sm text-slate-400">
                  Kampanyalar, yeni ürünler ve platform güncellemelerini e-posta ile alın.
                </p>
              </div>
              {newsletterState === 'success' ? (
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Kaydedildi!
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newsletterEmail.trim()) setNewsletterState('success')
                  }}
                  className="flex gap-2 w-full sm:w-auto"
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    placeholder="e-posta@adresiniz.com"
                    required
                    className="flex-1 sm:w-56 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Abone Ol
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* ── CTA BANNER ── */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-secondary p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1),_transparent)]" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  Hemen mağazanızı açın
                </h3>
                <p className="text-white/80 text-sm max-w-sm">
                  Dakikalar içinde kurulum yapın, ilk ürününüzü listeleyin ve satmaya başlayın.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  {['Kurulum ücretsiz', 'Komisyon yok', '7/24 destek'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-white/80 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white/90" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/auth/register"
                className="shrink-0 inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/95 shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                Ücretsiz Başla <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  )
}
