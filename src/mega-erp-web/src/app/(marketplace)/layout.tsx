import type { Metadata } from 'next'
import { MarketplaceNavbar } from '@/components/marketplace/MarketplaceNavbar'
import { MarketplaceFooter } from '@/components/marketplace/MarketplaceFooter'

export const metadata: Metadata = {
  title: 'Lonova Marketplace',
  description: 'Binlerce ürün, en uygun fiyatlarla.',
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
