'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Package, Heart, MapPin, Lock, ChevronRight,
  ShoppingBag, Star, Settings, LogOut
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

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hesabım</h1>
          <p className="text-slate-400 text-sm mt-1">Hoş geldiniz, {buyer.firstName}</p>
        </div>
      </div>

      <AccountTabs />

      {/* Profile card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="premium-card p-6 md:col-span-1 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/30">
            {initials}
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">{buyer.firstName} {buyer.lastName}</p>
            <p className="text-slate-400 text-sm">{buyer.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
          </button>
        </div>

        {/* Quick stats */}
        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          <Link href="/hesabim/siparisler" className="premium-card p-4 flex flex-col items-center justify-center text-center hover:border-primary/40 transition-all group">
            <ShoppingBag className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black text-foreground">
              {loadingOrders ? '—' : orders.length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Sipariş</p>
          </Link>
          <Link href="/hesabim/favoriler" className="premium-card p-4 flex flex-col items-center justify-center text-center hover:border-primary/40 transition-all group">
            <Heart className="w-6 h-6 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black text-foreground">{wishlistCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Favori</p>
          </Link>
          <div className="premium-card p-4 flex flex-col items-center justify-center text-center">
            <Star className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-2xl font-black text-foreground">
              {loadingOrders ? '—' : orders.filter(o => o.status === 'Delivered').length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Teslim</p>
          </div>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { href: '/hesabim/profil', icon: Settings, color: 'text-indigo-400 bg-indigo-500/10', title: 'Profil Bilgileri', desc: 'Ad, e-posta, telefon güncelle' },
          { href: '/hesabim/adresler', icon: MapPin, color: 'text-cyan-400 bg-cyan-500/10', title: 'Adres Defteri', desc: 'Teslimat adreslerini yönet' },
          { href: '/hesabim/favoriler', icon: Heart, color: 'text-pink-400 bg-pink-500/10', title: 'Favoriler', desc: `${wishlistCount} kaydedilmiş ürün` },
          { href: '/hesabim/sifre', icon: Lock, color: 'text-amber-400 bg-amber-500/10', title: 'Şifre Değiştir', desc: 'Hesap güvenliğini güncelle' },
        ].map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} href={href}
            className="premium-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-slate-400 truncate">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Son Siparişler</h2>
          <Link href="/hesabim/siparisler" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            Tümünü gör <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {loadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="premium-card p-8 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Henüz siparişiniz yok.</p>
            <Link href="/" className="inline-flex mt-4 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="premium-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground font-mono">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}
                    {order.items?.length ?? 0} ürün
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">
                    ₺{order.totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-700 text-slate-300'}`}>
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
