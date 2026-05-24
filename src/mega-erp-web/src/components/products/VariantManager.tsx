'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, RefreshCw, Layers, Palette } from 'lucide-react'
import { productsService, type CreateVariantRequest } from '@/lib/services/products.service'
import type { ProductVariant } from '@/types/api.types'

const VARIANT_TYPES = ['Beden', 'Numara', 'Renk', 'Depolama', 'Variant']

const EMPTY_FORM: CreateVariantRequest = {
  name: '',
  variantType: 'Beden',
  colorHex: null,
  sku: '',
  priceOverride: 0,
  stockQuantity: 0,
}

interface Props {
  productId: string
  baseSku: string
  basePrice: number
}

export function VariantManager({ productId, baseSku, basePrice }: Props) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateVariantRequest>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await productsService.getVariants(productId)
      setVariants(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [productId])

  const autoSku = (name: string) => {
    if (!name) return ''
    const suffix = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    return `${baseSku}-${suffix}`
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ ...EMPTY_FORM, priceOverride: basePrice })
    setError('')
    setShowForm(true)
  }

  const openEdit = (v: ProductVariant) => {
    setEditId(v.id)
    setForm({
      name: v.name,
      variantType: v.variantType,
      colorHex: v.colorHex ?? null,
      sku: v.sku,
      priceOverride: v.priceOverride,
      stockQuantity: v.stockQuantity,
    })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Varyant adı zorunludur.'); return }
    if (!form.sku.trim()) { setError('SKU zorunludur.'); return }
    if (form.priceOverride < 0) { setError('Fiyat negatif olamaz.'); return }
    if (form.stockQuantity < 0) { setError('Stok miktarı negatif olamaz.'); return }
    setError('')
    setSaving(true)
    try {
      if (editId) {
        await productsService.updateVariant(productId, editId, form)
      } else {
        await productsService.addVariant(productId, form)
      }
      setShowForm(false)
      setEditId(null)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data
      setError(typeof msg === 'string' ? msg : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (v: ProductVariant) => {
    if (!confirm(`"${v.name}" varyantını silmek istediğinize emin misiniz?`)) return
    try {
      await productsService.deleteVariant(productId, v.id)
      setVariants(prev => prev.filter(x => x.id !== v.id))
    } catch {
      alert('Silinemedi.')
    }
  }

  const grouped = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    const t = v.variantType || 'Variant'
    ;(acc[t] ??= []).push(v)
    return acc
  }, {})

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Varyantlar</h3>
          {variants.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{variants.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Varyant Ekle
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editId ? 'Varyantı Düzenle' : 'Yeni Varyant'}</p>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="text-slate-400 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Varyant Tipi</label>
              <select
                value={form.variantType}
                onChange={e => setForm(f => ({ ...f, variantType: e.target.value }))}
                className={inputCls}
              >
                {VARIANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Varyant Adı * {form.variantType === 'Renk' && <span className="text-slate-500">(Renk adı)</span>}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => {
                  const name = e.target.value
                  setForm(f => ({
                    ...f,
                    name,
                    sku: editId ? f.sku : autoSku(name),
                  }))
                }}
                placeholder={form.variantType === 'Beden' ? 'S, M, L, XL...' : form.variantType === 'Renk' ? 'Kırmızı, Mavi...' : form.variantType === 'Numara' ? '38, 39, 40...' : ''}
                className={inputCls}
              />
            </div>

            {form.variantType === 'Renk' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  <Palette className="w-3 h-3 inline mr-1" /> Renk Kodu
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.colorHex ?? '#000000'}
                    onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                    className="w-12 h-9 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                  />
                  <input
                    type="text"
                    value={form.colorHex ?? ''}
                    onChange={e => setForm(f => ({ ...f, colorHex: e.target.value || null }))}
                    placeholder="#FF0000"
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">SKU *</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))}
                placeholder={`${baseSku}-SM`}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Fiyat (₺) <span className="text-slate-500">0 = baz fiyat</span></label>
              <input
                type="number"
                value={form.priceOverride}
                onChange={e => setForm(f => ({ ...f, priceOverride: Number(e.target.value) }))}
                min={0}
                step={0.01}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Stok Miktarı</label>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={e => setForm(f => ({ ...f, stockQuantity: Number(e.target.value) }))}
                min={0}
                className={inputCls}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editId ? 'Güncelle' : 'Ekle'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null) }}
              className="px-4 py-2 rounded-lg border border-border text-slate-400 hover:text-foreground text-xs transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Variants list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-800/60 rounded-lg animate-pulse" />)}
        </div>
      ) : variants.length === 0 && !showForm ? (
        <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-border rounded-xl">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-700" />
          Henüz varyant yok. Beden, renk veya boyut ekleyin.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, vars]) => (
            <div key={type}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{type}</p>
              <div className="space-y-1.5">
                {vars.map(v => (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40 group hover:bg-slate-800/70 transition-colors">
                    {/* Color swatch */}
                    {v.colorHex && (
                      <div
                        className="w-5 h-5 rounded-full border border-slate-600 shrink-0"
                        style={{ backgroundColor: v.colorHex }}
                        title={v.colorHex}
                      />
                    )}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">{v.name}</span>
                      <span className="text-xs font-mono text-slate-500 hidden sm:inline">{v.sku}</span>
                      <span className="text-xs text-slate-400">
                        {v.priceOverride > 0 ? `₺${v.priceOverride.toLocaleString('tr-TR')}` : <span className="text-slate-500">Baz fiyat</span>}
                      </span>
                      <span className={`text-xs font-semibold ${v.stockQuantity <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {v.stockQuantity} adet
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-700 transition-all"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
