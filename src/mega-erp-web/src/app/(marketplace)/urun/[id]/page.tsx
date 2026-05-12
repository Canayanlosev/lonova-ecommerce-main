'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ShoppingCart, Star, Package } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct, type MarketplaceVariant } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<MarketplaceProduct | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<MarketplaceVariant | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description')
  const [adding, setAdding] = useState(false)
  const setCart = useBuyerCartStore((s) => s.setCart)

  useEffect(() => {
    if (!id) return
    marketplaceService.getProduct(id)
      .then((p) => {
        setProduct(p)
        if (p.variants.length > 0) setSelectedVariant(p.variants[0])
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-800 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-700 rounded w-3/4" />
            <div className="h-5 bg-slate-700 rounded w-1/2" />
            <div className="h-10 bg-slate-700 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const price = selectedVariant ? selectedVariant.price : product.basePrice
  const stock = selectedVariant ? selectedVariant.stockQuantity : 99
  const inStock = stock > 0

  const handleAddToCart = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
    if (!token) {
      router.push('/alici-auth/giris')
      return
    }
    if (!product) return
    setAdding(true)
    try {
      const cart = await marketplaceService.addToCart(product.id, selectedVariant?.id)
      setCart(cart)
    } catch {
      router.push('/alici-auth/giris')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/kategori" className="hover:text-primary transition-colors">{product.categoryName ?? 'Kategori'}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium truncate max-w-48">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        {/* Product image */}
        <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl overflow-hidden relative">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-24 h-24 text-slate-500" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-primary font-medium mb-1">{product.categoryName}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-sm text-slate-400 mt-1">SKU: {selectedVariant?.sku ?? product.sku}</p>
          </div>

          {/* Rating placeholder */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
              ))}
            </div>
            <span className="text-sm text-slate-400">4.0 (24 değerlendirme)</span>
          </div>

          {/* Price */}
          <div>
            <p className="text-3xl font-bold text-primary">
              {price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            <p className={`text-sm mt-1 ${inStock ? 'text-green-400' : 'text-red-400'}`}>
              {inStock ? `Stokta var (${stock} adet)` : 'Stokta yok'}
            </p>
          </div>

          {/* Variant selector */}
          {product.variants.length > 1 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Varyant seçin:</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border text-foreground hover:border-primary'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              className="flex-1 premium-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className={`w-4 h-4 ${adding ? 'animate-bounce' : ''}`} />
              {adding ? 'Ekleniyor...' : inStock ? 'Sepete Ekle' : 'Stokta Yok'}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Satın almak için <Link href="/auth/login" className="text-primary hover:underline">giriş yapmanız</Link> gerekebilir.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="premium-card overflow-hidden">
        <div className="flex border-b border-border">
          {(['description', 'specs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-400 hover:text-foreground'
              }`}
            >
              {tab === 'description' ? 'Açıklama' : 'Teknik Özellikler'}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'description' ? (
            <p className="text-sm text-slate-300 leading-relaxed">
              {product.description ?? 'Bu ürün için açıklama henüz eklenmemiş.'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400 w-32 shrink-0">SKU</span>
                <span className="text-foreground">{product.sku}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400 w-32 shrink-0">Kategori</span>
                <span className="text-foreground">{product.categoryName}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400 w-32 shrink-0">Varyant sayısı</span>
                <span className="text-foreground">{product.variants.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
