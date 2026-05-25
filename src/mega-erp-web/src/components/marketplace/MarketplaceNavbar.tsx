'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Search, ShoppingCart, User, Menu, X, LogOut, ChevronDown, Heart, Grid3X3, Clock, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { marketplaceService, type CatalogCategory } from '@/lib/services/marketplace.service'

/** Single nav item that shows dropdown with sub-categories on hover */
function CategoryNavItem({ cat, basePath }: { cat: CatalogCategory; basePath: string }) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const href = `${basePath}/${cat.slug}`

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(true)
  }
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 120)
  }

  if (!cat.children || cat.children.length === 0) {
    return (
      <Link
        href={href}
        className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-foreground hover:bg-background transition-all"
      >
        {cat.name}
      </Link>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={href}
        className={`flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
          open ? 'text-primary bg-primary/5' : 'text-slate-400 hover:text-foreground hover:bg-background'
        }`}
      >
        {cat.name}
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Link>

      {open && (
        <div className="absolute top-full left-0 pt-1 z-50">
          <div className="bg-surface/90 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl py-2 min-w-[180px]">
            {cat.children.map((sub) => (
              <Link
                key={sub.id}
                href={`${href}/${sub.slug}`}
                className="flex items-center px-4 py-2 text-sm text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MarketplaceNavbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [allCatsOpen, setAllCatsOpen] = useState(false)
  const allCatsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const itemCount = useBuyerCartStore((s) => s.itemCount)
  const wishlistCount = useWishlistStore((s) => s.count())
  const { isAuthenticated, buyer, logout } = useBuyerAuthStore()

  // Fetch categories once
  useEffect(() => {
    marketplaceService.getCategories().then(setCategories).catch(() => { /* silent — static fallback omitted */ })
  }, [])

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent-searches')
      if (saved) setRecentSearches(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // Close "Tüm Kategoriler" panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (allCatsRef.current && !allCatsRef.current.contains(e.target as Node)) {
        setAllCatsOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const saveSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
    setRecentSearches(updated)
    try { localStorage.setItem('recent-searches', JSON.stringify(updated)) } catch { /* ignore */ }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      saveSearch(searchQuery.trim())
      setSearchFocused(false)
      router.push(`/ara?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const runRecentSearch = (q: string) => {
    setSearchQuery(q)
    saveSearch(q)
    setSearchFocused(false)
    router.push(`/ara?q=${encodeURIComponent(q)}`)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try { localStorage.removeItem('recent-searches') } catch { /* ignore */ }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Show at most 6 top-level categories in the nav bar; rest go into "Tüm Kategoriler"
  const navCats = categories.slice(0, 6)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-xl">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <span className="text-white font-black text-base leading-none">C</span>
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block">
              <span className="text-foreground">Canayan</span><span className="text-primary">Web</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Ürün, marka veya kategori ara..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all placeholder:text-slate-500"
              />
              {/* Recent searches dropdown */}
              {searchFocused && !searchQuery && recentSearches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs text-slate-500 font-medium">Son Aramalar</span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Temizle
                    </button>
                  </div>
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => runRecentSearch(q)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 transition-colors text-left"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAuthenticated && buyer ? (
              <>
                <Link
                  href="/hesabim"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
                >
                  <User className="w-4 h-4" />
                  {buyer.firstName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/alici-auth/giris"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-background border border-transparent hover:border-border transition-all"
              >
                <User className="w-4 h-4" />
                Giriş Yap
              </Link>
            )}
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-sm shadow-primary/20 transition-all"
            >
              Firma Paneli
            </Link>
            <ThemeSwitcher />
            <Link href="/hesabim/favoriler" className="relative p-2 rounded-lg hover:bg-background transition-all" title="Favorilerim">
              <Heart className="w-5 h-5 text-foreground" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
            <Link href="/sepet" className="relative p-2 rounded-lg hover:bg-background transition-all">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-background transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Category nav */}
        <nav className="hidden sm:flex items-center gap-1 h-10">
          {/* "Tüm Kategoriler" mega button */}
          <div ref={allCatsRef} className="relative">
            <button
              onClick={() => setAllCatsOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                allCatsOpen ? 'text-primary bg-primary/5' : 'text-foreground hover:text-primary hover:bg-background'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Tüm Kategoriler
              <ChevronDown className={`w-3 h-3 transition-transform ${allCatsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mega dropdown */}
            {allCatsOpen && categories.length > 0 && (
              <div className="absolute top-full left-0 pt-2 z-50">
                <div className="bg-surface/90 backdrop-blur-xl border border-border/85 rounded-2xl shadow-2xl shadow-black/30 p-5 w-[640px]">
                  <div className="grid grid-cols-3 gap-4">
                    {categories.map((cat) => (
                      <div key={cat.id}>
                        <Link
                          href={`/kategori/${cat.slug}`}
                          onClick={() => setAllCatsOpen(false)}
                          className="block text-sm font-semibold text-foreground hover:text-primary transition-colors mb-1.5"
                        >
                          {cat.name}
                        </Link>
                        {cat.children?.slice(0, 4).map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/kategori/${cat.slug}/${sub.slug}`}
                            onClick={() => setAllCatsOpen(false)}
                            className="block text-xs text-slate-400 hover:text-primary hover:bg-primary/5 py-1 px-2 rounded-lg transition-colors"
                          >
                            {sub.name}
                          </Link>
                        ))}
                        {(cat.children?.length ?? 0) > 4 && (
                          <Link
                            href={`/kategori/${cat.slug}`}
                            onClick={() => setAllCatsOpen(false)}
                            className="block text-xs text-primary hover:underline pt-0.5 pl-2"
                          >
                            +{(cat.children?.length ?? 0) - 4} daha
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Separator */}
          {navCats.length > 0 && <div className="h-4 w-px bg-border mx-1" />}

          {/* Top-level categories with sub-category dropdowns */}
          {navCats.map((cat) => (
            <CategoryNavItem key={cat.id} cat={cat} basePath="/kategori" />
          ))}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-surface px-4 py-4 space-y-1">
          {isAuthenticated && buyer ? (
            <>
              <Link
                href="/hesabim"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-background transition-all"
                onClick={() => setMobileOpen(false)}
              >
                <User className="w-4 h-4" /> {buyer.firstName} {buyer.lastName}
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" /> Çıkış Yap
              </button>
            </>
          ) : (
            <Link
              href="/alici-auth/giris"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-background transition-all"
              onClick={() => setMobileOpen(false)}
            >
              <User className="w-4 h-4" /> Giriş Yap
            </Link>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-all"
            onClick={() => setMobileOpen(false)}
          >
            Firma Paneli
          </Link>
          <div className="pt-2 border-t border-border mt-2">
            <p className="text-xs text-slate-500 px-3 pb-2 font-medium uppercase tracking-wide">Kategoriler</p>
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <Link
                    href={`/kategori/${cat.slug}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-foreground hover:bg-background transition-all font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {cat.name}
                  </Link>
                  {cat.children?.slice(0, 3).map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/kategori/${cat.slug}/${sub.slug}`}
                      className="block pl-6 pr-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-foreground hover:bg-background transition-all"
                      onClick={() => setMobileOpen(false)}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
