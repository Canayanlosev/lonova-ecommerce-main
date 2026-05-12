'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, ShoppingCart, User, Menu, X, Store, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

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
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:block">Lonova</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün, marka veya kategori ara..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && buyer ? (
              <>
                <Link
                  href="/hesabim/siparisler"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground hover:bg-surface border border-transparent hover:border-border transition-all"
                >
                  <User className="w-4 h-4" />
                  {buyer.firstName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <Link
                href="/alici-auth/giris"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground hover:bg-surface hover:border border-border transition-all"
              >
                <User className="w-4 h-4" />
                Giriş Yap
              </Link>
            )}
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
            >
              Firma Paneli
            </Link>
            <Link href="/sepet" className="relative p-2 rounded-lg hover:bg-surface transition-all">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-surface transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Category nav */}
        <nav className="hidden sm:flex items-center gap-6 h-10 text-sm text-slate-400">
          <Link href="/kategori/elektronik" className="hover:text-primary transition-colors">Elektronik</Link>
          <Link href="/kategori/moda" className="hover:text-primary transition-colors">Moda</Link>
          <Link href="/kategori/ev-yasam" className="hover:text-primary transition-colors">Ev & Yaşam</Link>
          <Link href="/kategori/spor" className="hover:text-primary transition-colors">Spor</Link>
          <Link href="/kategori/kitap-muzik" className="hover:text-primary transition-colors">Kitap & Müzik</Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-surface px-4 py-4 space-y-3">
          {isAuthenticated && buyer ? (
            <>
              <Link href="/hesabim/siparisler" className="flex items-center gap-2 text-sm text-foreground">
                <User className="w-4 h-4" /> {buyer.firstName} {buyer.lastName}
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-400">
                <LogOut className="w-4 h-4" /> Çıkış Yap
              </button>
            </>
          ) : (
            <Link href="/alici-auth/giris" className="flex items-center gap-2 text-sm text-foreground">
              <User className="w-4 h-4" /> Giriş Yap
            </Link>
          )}
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-foreground">
            <Store className="w-4 h-4" /> Firma Paneli
          </Link>
        </div>
      )}
    </header>
  )
}
