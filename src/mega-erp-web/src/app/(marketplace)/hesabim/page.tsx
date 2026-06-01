'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Package, Heart, MapPin, Lock, ChevronRight,
  ShoppingBag, Star, Settings, LogOut, TrendingUp
} from 'lucide-react'
import { marketplaceService, type BuyerOrderDto } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

const STATUS_COLORS: Record<string, string> = {
  Delivered: 'text-emerald-400 bg-emerald-500/10',
  Shipped:   'text-blue-400 bg-blue-500/10',
  Processing:'text-violet-400 bg-violet-500/10',
  Confirmed: 'text-cyan-400 bg-cyan-500/10',
  Cancelled: 'text-red-400 bg-red-500/10',
  Pending:   'text-amber-400 bg-amber-500/10',
}
const STATUS_TR: Record<string, string> = {
  Delivered: 'Teslim Edildi', Shipped: 'Kargoda',
  Processing: 'İşleniyor', Confirmed: 'Onaylandı',
  Cancelled: 'İptal', Pending: 'Beklemede',
}

export default function HesabimPage() {
  const router = useRouter()
  const { isAuthenticated, buyer, logout } = useBuyerAuthStore()
  const wishlistCount = useWishlistStore(s => s.count())

  const [orders, setOrders] = useState<BuyerOrderDto[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { router.push('/alici-auth/giris'); return }
    marketplaceService.getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadingOrders(false))
  }, [isAuthenticated, router])

  if (!buyer) return null

  const initials = `${buyer.firstName?.[0] ?? ''}${buyer.lastName?.[0] ?? ''}`.toUpperCase()
  const recentOrders = [...orders].slice(0, 3)
  const totalSpent = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount ?? 0), 0)
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length
  const thisMonthISO = new Date().toISOString().slice(0, 7)
  const thisMonthSpent = orders
    .filter(o => o.status !== 'Cancelled' && o.createdAt?.slice(0, 7) === thisMonthISO)
    .reduce((s, o) => s + (o.totalAmount ?? 0), 0)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wider">Hesabım</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1.5">Hoş geldiniz, {buyer.firstName}</p>
        </div>
      </div>

      <AccountTabs />

      {/* Profile card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="premium-card p-6 md:col-span-1 flex flex-col items-center text-center gap-4 bg-slate-900/60 border border-border/80 relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/30 transition-transform hover:rotate-3 duration-300">
            {initials}
          </div>
          <div>
            <p className="font-extrabold text-foreground text-base tracking-tight">{buyer.firstName} {buyer.lastName}</p>
            <p className="text-slate-500 text-xs font-medium mt-0.5">{buyer.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
          </button>
        </div>

        {/* Quick stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <Link href="/hesabim/siparisler" className="premium-card p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 bg-slate-900/60 border border-border/80 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="p-2 rounded-xl bg-blue-500/10 mb-2 text-blue-400 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {loadingOrders ? '—' : orders.length}
            </p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1">Toplam Sipariş</p>
          </Link>
          <Link href="/hesabim/siparisler" className="premium-card p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 bg-slate-900/60 border border-border/80 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="p-2 rounded-xl bg-amber-500/10 mb-2 text-amber-400 group-hover:scale-110 transition-transform">
              <Star className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {loadingOrders ? '—' : deliveredCount}
            </p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1">Teslim Edildi</p>
          </Link>
          <Link href="/hesabim/favoriler" className="premium-card p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 bg-slate-900/60 border border-border/80 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="p-2 rounded-xl bg-pink-500/10 mb-2 text-pink-400 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">{wishlistCount}</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1">Favoriler</p>
          </Link>
          <div className="premium-card p-4 flex flex-col items-center justify-center text-center bg-slate-900/60 border border-border/80">
            <div className="p-2 rounded-xl bg-emerald-500/10 mb-2 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-lg font-black text-emerald-400 font-mono">
              {loadingOrders ? '—' : `₺${totalSpent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
            </p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1">Toplam Harcama</p>
            {!loadingOrders && thisMonthSpent > 0 && (
              <p className="text-[9px] text-slate-500 font-bold font-mono mt-1">
                Bu ay: ₺{thisMonthSpent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { href: '/hesabim/profil', icon: Settings, color: 'text-primary bg-primary/10 hover:bg-primary/20', title: 'Profil Bilgileri', desc: 'Ad, e-posta, telefon güncelle' },
          { href: '/hesabim/adresler', icon: MapPin, color: 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20', title: 'Adres Defteri', desc: 'Teslimat adreslerini yönet' },
          { href: '/hesabim/favoriler', icon: Heart, color: 'text-pink-400 bg-pink-500/10 hover:bg-pink-500/20', title: 'Favoriler', desc: `${wishlistCount} kaydedilmiş ürün` },
          { href: '/hesabim/sifre', icon: Lock, color: 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20', title: 'Şifre Değiştir', desc: 'Hesap güvenliğini güncelle' },
        ].map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} href={href}
            className="premium-card p-4 flex items-center gap-4 hover:border-primary/50 bg-slate-900/60 border border-border/80 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 group-hover:text-primary transition-all duration-300 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Son Siparişler</h2>
          <Link href="/hesabim/siparisler" className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1">
            Tümünü gör <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {loadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-805/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="premium-card p-8 text-center bg-slate-900/60 border border-border/80">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Henüz siparişiniz yok.</p>
            <Link href="/" className="inline-flex mt-4 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="premium-card p-4 flex items-center gap-4 bg-slate-900/60 border border-border/80 hover:border-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-foreground font-mono uppercase tracking-wider">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    {new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}
                    {order.items?.length ?? 0} ürün
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-foreground font-mono">
                    ₺{order.totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </p>
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg mt-1 ${STATUS_COLORS[order.status] ?? 'bg-slate-700 text-slate-300'}`}>
                    {STATUS_TR[order.status] ?? order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
