import type { Metadata } from 'next'
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar'
import { MarketplaceFooter } from '@/components/marketplace/MarketplaceFooter'

export const metadata: Metadata = {
  title: 'CanayanWeb | Kurumsal Ticaret Platformu',
  description: 'Binlerce ürün, güvenilir satıcılar ve kurumsal çözümler.',
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceNavbar />
      <main className="flex-1">{children}</main>
      <MarketplaceFooter />
    </div>
  )
}
