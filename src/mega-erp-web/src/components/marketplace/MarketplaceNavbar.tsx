'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, ShoppingCart, User, Menu, X, LogOut, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

const CATEGORIES = [
  { label: 'Elektronik', slug: 'elektronik' },
  { label: 'Moda', slug: 'moda' },
  { label: 'Ev & Yaşam', slug: 'ev-yasam' },
  { label: 'Spor', slug: 'spor' },
  { label: 'Kitap & Müzik', slug: 'kitap-muzik' },
  { label: 'Kozmetik', slug: 'kozmetik' },
]

export function MarketplaceNavbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const itemCount = useBuyerCartStore((s) => s.itemCount)
  const { isAuthenticated, buyer, logout } = useBuyerAuthStore()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/ara?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-xl">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <span className="text-white font-black text-base leading-none">C</span>
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block">
              <span className="text-foreground">Canayan</span><span className="text-blue-500">Web</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün, marka veya kategori ara..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all placeholder:text-slate-500"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAuthenticated && buyer ? (
              <>
                <Link
                  href="/hesabim/siparisler"
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
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-blue-500/20 transition-all"
            >
              Firma Paneli
            </Link>
            <Link href="/sepet" className="relative p-2 rounded-lg hover:bg-background transition-all">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
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
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/kategori/${cat.slug}`}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-foreground hover:bg-background transition-all"
            >
              {cat.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-surface px-4 py-4 space-y-1">
          {isAuthenticated && buyer ? (
            <>
              <Link
                href="/hesabim/siparisler"
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
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-blue-400 hover:bg-blue-500/10 transition-all"
            onClick={() => setMobileOpen(false)}
          >
            Firma Paneli
          </Link>
          <div className="pt-2 border-t border-border mt-2 grid grid-cols-2 gap-1">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/kategori/${cat.slug}`}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-foreground hover:bg-background transition-all"
                onClick={() => setMobileOpen(false)}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
