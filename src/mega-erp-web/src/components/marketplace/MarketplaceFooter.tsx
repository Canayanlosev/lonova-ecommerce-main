import Link from 'next/link'

export function MarketplaceFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/35 transition-shadow">
                <span className="text-white font-black text-base">C</span>
              </div>
              <span className="font-black text-xl tracking-tight">
                <span className="text-foreground">Canayan</span><span className="text-blue-500">Web</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Türkiye'nin kurumsal ticaret ve yönetim platformu. Hızlı, güvenli ve ölçeklenebilir.
            </p>
          </div>

          {/* Alışveriş */}
          <div>
            <h4 className="font-bold text-foreground mb-4 text-sm tracking-wide uppercase text-xs text-slate-500">Alışveriş</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/kategori" className="hover:text-blue-400 transition-colors">Kategoriler</Link></li>
              <li><Link href="/kampanyalar" className="hover:text-blue-400 transition-colors">Kampanyalar</Link></li>
              <li><Link href="/yeni-urunler" className="hover:text-blue-400 transition-colors">Yeni Ürünler</Link></li>
              <li><Link href="/sepet" className="hover:text-blue-400 transition-colors">Sepetim</Link></li>
            </ul>
          </div>

          {/* Hesabım */}
          <div>
            <h4 className="font-bold text-foreground mb-4 text-sm tracking-wide uppercase text-xs text-slate-500">Hesabım</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/alici-auth/giris" className="hover:text-blue-400 transition-colors">Giriş Yap</Link></li>
              <li><Link href="/alici-auth/kayit" className="hover:text-blue-400 transition-colors">Kayıt Ol</Link></li>
              <li><Link href="/hesabim/siparisler" className="hover:text-blue-400 transition-colors">Siparişlerim</Link></li>
            </ul>
          </div>

          {/* Firmalar */}
          <div>
            <h4 className="font-bold text-foreground mb-4 text-sm tracking-wide uppercase text-xs text-slate-500">Firmalar</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link href="/dashboard" className="hover:text-blue-400 transition-colors">Firma Paneli</Link></li>
              <li><Link href="/auth/register" className="hover:text-blue-400 transition-colors">Mağaza Aç</Link></li>
              <li><Link href="/dashboard/accounting" className="hover:text-blue-400 transition-colors">Muhasebe</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {year} CanayanWeb. Tüm hakları saklıdır.</span>
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
