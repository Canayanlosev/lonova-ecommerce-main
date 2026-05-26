import Link from 'next/link'
import { ShoppingBag, BarChart2, Warehouse, Users, CreditCard, Layout, Shield, Zap, HeartHandshake } from 'lucide-react'

const PLATFORM_FEATURES = [
  { icon: ShoppingBag, label: 'E-Commerce', href: '/dashboard/ecommerce' },
  { icon: BarChart2, label: 'Analitik', href: '/dashboard/analytics' },
  { icon: Warehouse, label: 'WMS Stok', href: '/dashboard/wms' },
  { icon: Users, label: 'İK Yönetimi', href: '/dashboard/hr' },
  { icon: CreditCard, label: 'Muhasebe', href: '/dashboard/accounting' },
  { icon: Layout, label: 'Site Builder', href: '/dashboard/site-builder' },
]

export function MarketplaceFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Trust badges row */}
        <div className="py-6 border-b border-border/50 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>SSL Güvenli Ödeme</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Anlık Stok Senkronizasyonu</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <HeartHandshake className="w-4 h-4 text-primary shrink-0" />
            <span>KOBİ'ye Özel Destek</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <BarChart2 className="w-4 h-4 text-violet-400 shrink-0" />
            <span>Gerçek Zamanlı Analitik</span>
          </div>
        </div>

        <div className="py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-primary/35 transition-shadow">
                  <span className="text-white font-black text-base">C</span>
                </div>
                <span className="font-black text-xl tracking-tight">
                  <span className="text-foreground">Canayan</span><span className="text-primary">Web</span>
                </span>
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-4">
                Türkiye'nin KOBİ için All-in-One platformu. E-ticaret, muhasebe, stok, İK ve site builder tek çatı altında.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Ücretsiz Başla
              </Link>
            </div>

            {/* Alışveriş */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Alışveriş</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/kategori" className="hover:text-primary transition-colors">Kategoriler</Link></li>
                <li><Link href="/ara" className="hover:text-primary transition-colors">Ürün Ara</Link></li>
                <li><Link href="/sepet" className="hover:text-primary transition-colors">Sepetim</Link></li>
                <li><Link href="/hesabim/siparisler" className="hover:text-primary transition-colors">Siparişlerim</Link></li>
                <li><Link href="/hesabim/favoriler" className="hover:text-primary transition-colors">Favorilerim</Link></li>
              </ul>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2.5">
                {PLATFORM_FEATURES.map(({ icon: Icon, label, href }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors group">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-600 group-hover:text-primary transition-colors" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Firmalar & Destek */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Firmalar</h4>
              <ul className="space-y-2.5 text-sm text-slate-400 mb-6">
                <li><Link href="/auth/register" className="hover:text-primary transition-colors">Mağaza Aç</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary transition-colors">Firma Paneli</Link></li>
                <li><Link href="/dashboard/setup" className="hover:text-primary transition-colors">Kurulum Rehberi</Link></li>
                <li><Link href="/dashboard/analytics" className="hover:text-primary transition-colors">Raporlar</Link></li>
              </ul>
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Hesap</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/alici-auth/giris" className="hover:text-primary transition-colors">Giriş Yap</Link></li>
                <li><Link href="/alici-auth/kayit" className="hover:text-primary transition-colors">Kayıt Ol</Link></li>
                <li><Link href="/hesabim/profil" className="hover:text-primary transition-colors">Profil</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {year} CanayanWeb.</span>
            <span className="text-slate-700">·</span>
            <span>KOBİ'ler için geliştirildi 🇹🇷</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-slate-300 transition-colors">Gizlilik Politikası</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">Kullanım Koşulları</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">KVKK</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
