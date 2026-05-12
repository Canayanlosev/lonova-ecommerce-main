'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, ArrowRight } from 'lucide-react'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

export default function BuyerOrdersPage() {
  const { isAuthenticated, buyer, logout } = useBuyerAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push('/alici-auth/giris')
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hesabım</h1>
          <p className="text-slate-400 text-sm mt-1">
            Hoş geldin, {buyer?.firstName} {buyer?.lastName}
          </p>
        </div>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Çıkış Yap
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/hesabim/siparisler" className="premium-card p-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Siparişlerim</span>
          <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
        </Link>
      </div>

      <div className="premium-card p-8 text-center">
        <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Henüz sipariş yok</h2>
        <p className="text-sm text-slate-400 mb-6">Alışverişe başlayın ve siparişlerinizi burada takip edin.</p>
        <Link href="/" className="premium-button inline-flex items-center gap-2">
          Alışverişe Başla <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
