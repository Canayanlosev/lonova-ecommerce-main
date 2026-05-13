'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react'
import { marketplaceService } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

export default function CartPage() {
  const router = useRouter()
  const { items, total, setCart, clear } = useBuyerCartStore()
  const { isAuthenticated } = useBuyerAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/alici-auth/giris')
      return
    }
    marketplaceService.getCart()
      .then(setCart)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated, router, setCart])

  const handleRemove = async (itemId: string) => {
    const cart = await marketplaceService.removeCartItem(itemId)
    setCart(cart)
  }

  const handleUpdate = async (itemId: string, qty: number) => {
    if (qty < 1) {
      await handleRemove(itemId)
      return
    }
    const cart = await marketplaceService.updateCartItem(itemId, qty)
    setCart(cart)
  }

  const handleCheckout = () => {
    router.push('/odeme')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card p-4 flex gap-4">
              <div className="w-20 h-20 bg-slate-700 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Sepetiniz boş</h2>
        <p className="text-sm text-slate-400 mb-6">Alışverişe başlamak için ürün ekleyin.</p>
        <Link href="/" className="premium-button inline-flex items-center gap-2">
          Alışverişe Başla <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6" /> Sepetim
        <span className="text-sm font-normal text-slate-400">({items.length} ürün)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="premium-card p-4 flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden relative shrink-0">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.productName}</p>
                {item.variantName && <p className="text-xs text-slate-400">{item.variantName}</p>}
                <p className="text-sm font-bold text-primary mt-1">
                  {item.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={() => handleRemove(item.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleUpdate(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                  <button onClick={() => handleUpdate(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {item.lineTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="premium-card p-6 h-fit sticky top-24">
          <h2 className="text-lg font-bold text-foreground mb-4">Sipariş Özeti</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-slate-400">
              <span>Ürünler ({items.reduce((s, i) => s + i.quantity, 0)} adet)</span>
              <span>{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Kargo</span>
              <span className="text-green-400">Ücretsiz</span>
            </div>
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground mb-5">
            <span>Toplam</span>
            <span className="text-primary text-lg">{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full premium-button flex items-center justify-center gap-2"
          >
            Ödemeye Geç
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
