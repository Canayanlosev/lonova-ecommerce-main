'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ShoppingCart, Star, Package, Check } from 'lucide-react'
import { marketplaceService, type MarketplaceProduct, type MarketplaceVariant } from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'

// Group variants by type for multi-dimension selection
function groupVariants(variants: MarketplaceVariant[]) {
  return variants.reduce<Record<string, MarketplaceVariant[]>>((acc, v) => {
    const t = v.variantType || 'Variant'
    ;(acc[t] ??= []).push(v)
    return acc
  }, {})
}

// For multi-type variants, find the matching variant by selected values
function findVariant(variants: MarketplaceVariant[], selected: Record<string, string>): MarketplaceVariant | null {
  if (Object.keys(selected).length === 0) return null
  // simple: find variant whose name matches all selected values (e.g. "M" or "Siyah")
  return variants.find((v) =>
    Object.values(selected).some((val) => v.name === val)
  ) ?? null
}

interface VariantSelectorProps {
  type: string
  variants: MarketplaceVariant[]
  selected: string | undefined
  onSelect: (name: string) => void
}

function VariantSelector({ type, variants, selected, onSelect }: VariantSelectorProps) {
  const isColor = type === 'Renk'

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-2">
        {type}
        {selected && <span className="ml-2 text-slate-400 font-normal">{selected}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const outOfStock = v.stockQuantity === 0
          const isSelected = selected === v.name

          if (isColor && v.colorHex) {
            return (
              <button
                key={v.id}
                title={v.name}
                onClick={() => !outOfStock && onSelect(v.name)}
                disabled={outOfStock}
                className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                  isSelected ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:border-slate-400'
                } ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ backgroundColor: v.colorHex }}
              >
                {isSelected && (
                  <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                )}
                {outOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-full h-[2px] bg-red-400 rotate-45 block" />
                  </span>
                )}
              </button>
            )
          }

          // Size / number / storage buttons
          return (
            <button
              key={v.id}
              onClick={() => !outOfStock && onSelect(v.name)}
              disabled={outOfStock}
              className={`min-w-[44px] h-10 px-3 rounded-lg text-sm font-medium border transition-all relative ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : outOfStock
                  ? 'border-border text-slate-600 cursor-not-allowed line-through'
                  : 'border-border text-foreground hover:border-primary cursor-pointer'
              }`}
            >
              {v.name}
              {v.price !== undefined && v.price > 0 && !outOfStock && (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-primary text-white rounded px-0.5 leading-tight">
                  {v.price.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}₺
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<MarketplaceProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description')
  const [adding, setAdding] = useState(false)
  const [addedFeedback, setAddedFeedback] = useState(false)

  // selected[variantType] = variantName
  const [selected, setSelected] = useState<Record<string, string>>({})
  const setCart = useBuyerCartStore((s) => s.setCart)

  useEffect(() => {
    if (!id) return
    marketplaceService.getProduct(id)
      .then((p) => {
        setProduct(p)
        // Auto-select first in-stock variant per type
        const groups = groupVariants(p.variants)
        const autoSelect: Record<string, string> = {}
        for (const [type, variants] of Object.entries(groups)) {
          const first = variants.find((v) => v.stockQuantity > 0) ?? variants[0]
          if (first) autoSelect[type] = first.name
        }
        setSelected(autoSelect)
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

  const groups = groupVariants(product.variants)
  const hasVariants = product.variants.length > 0
  const allTypesSelected = Object.keys(groups).every((t) => selected[t])

  // Resolve active variant from selections
  let activeVariant: MarketplaceVariant | null = null
  if (hasVariants) {
    const selectedNames = Object.values(selected)
    // If single-type, direct lookup; multi-type uses first matching
    if (Object.keys(groups).length === 1) {
      const type = Object.keys(groups)[0]
      activeVariant = groups[type]?.find((v) => v.name === selected[type]) ?? null
    } else {
      activeVariant = findVariant(product.variants, selected)
    }
  }

  const price = activeVariant && activeVariant.price > 0 ? activeVariant.price : product.basePrice
  const stock = activeVariant ? activeVariant.stockQuantity : (hasVariants ? 0 : 99)
  const inStock = hasVariants ? (allTypesSelected ? stock > 0 : false) : true

  const handleSelect = (type: string, name: string) => {
    setSelected((prev) => ({ ...prev, [type]: name }))
  }

  const handleAddToCart = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buyer-token') : null
    if (!token) { router.push('/alici-auth/giris'); return }
    if (hasVariants && !allTypesSelected) return

    setAdding(true)
    try {
      const cart = await marketplaceService.addToCart(product.id, activeVariant?.id)
      setCart(cart)
      setAddedFeedback(true)
      setTimeout(() => setAddedFeedback(false), 2000)
    } catch {
      router.push('/alici-auth/giris')
    } finally {
      setAdding(false)
    }
  }

  const needsSelection = hasVariants && !allTypesSelected

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-400 mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="hover:text-primary transition-colors cursor-pointer">{product.categoryName ?? 'Kategori'}</span>
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
            <p className="text-sm text-slate-400 mt-1">SKU: {activeVariant?.sku ?? product.sku}</p>
          </div>

          {/* Rating */}
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
            {activeVariant && (
              <p className={`text-sm mt-1 ${activeVariant.stockQuantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {activeVariant.stockQuantity > 0
                  ? `Stokta var (${activeVariant.stockQuantity} adet)`
                  : 'Stokta yok'}
              </p>
            )}
            {!hasVariants && <p className="text-sm mt-1 text-green-400">Stokta var</p>}
          </div>

          {/* Variant selectors — grouped by type */}
          {Object.entries(groups).map(([type, variants]) => (
            <VariantSelector
              key={type}
              type={type}
              variants={variants}
              selected={selected[type]}
              onSelect={(name) => handleSelect(type, name)}
            />
          ))}

          {/* Add to cart */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock || adding || needsSelection}
              className="flex-1 premium-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addedFeedback ? (
                <><Check className="w-4 h-4" /> Sepete Eklendi!</>
              ) : adding ? (
                <><ShoppingCart className="w-4 h-4 animate-bounce" /> Ekleniyor...</>
              ) : needsSelection ? (
                <><ShoppingCart className="w-4 h-4" /> {Object.keys(groups).filter(t => !selected[t]).join(', ')} seçin</>
              ) : !inStock ? (
                <><ShoppingCart className="w-4 h-4" /> Stokta Yok</>
              ) : (
                <><ShoppingCart className="w-4 h-4" /> Sepete Ekle</>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Satın almak için <Link href="/alici-auth/giris" className="text-primary hover:underline">giriş yapmanız</Link> gerekebilir.
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
                <span className="text-foreground">{activeVariant?.sku ?? product.sku}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400 w-32 shrink-0">Kategori</span>
                <span className="text-foreground">{product.categoryName}</span>
              </div>
              {Object.entries(selected).map(([type, val]) => (
                <div key={type} className="flex gap-4 text-sm">
                  <span className="text-slate-400 w-32 shrink-0">{type}</span>
                  <span className="text-foreground">{val}</span>
                </div>
              ))}
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
