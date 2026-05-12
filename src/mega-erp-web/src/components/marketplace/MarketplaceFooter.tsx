import Link from 'next/link'
import { Store } from 'lucide-react'

export function MarketplaceFooter() {
  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">Lonova</span>
            </Link>
            <p className="text-sm text-slate-400">
              Binlerce ürün, güvenilir satıcılar ve hızlı teslimat.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Alışveriş</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/kategori" className="hover:text-primary transition-colors">Kategoriler</Link></li>
              <li><Link href="/kampanyalar" className="hover:text-primary transition-colors">Kampanyalar</Link></li>
              <li><Link href="/yeni-urunler" className="hover:text-primary transition-colors">Yeni Ürünler</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Hesabım</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/alici-auth/giris" className="hover:text-primary transition-colors">Giriş Yap</Link></li>
              <li><Link href="/alici-auth/kayit" className="hover:text-primary transition-colors">Kayıt Ol</Link></li>
              <li><Link href="/hesabim/siparisler" className="hover:text-primary transition-colors">Siparişlerim</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Firmalar</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Firma Paneli</Link></li>
              <li><Link href="/auth/register" className="hover:text-primary transition-colors">Mağaza Aç</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Lonova Marketplace. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  )
}
