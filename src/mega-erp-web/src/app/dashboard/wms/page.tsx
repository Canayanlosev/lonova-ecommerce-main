'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Warehouse, Package, TrendingDown, Plus, RefreshCw,
  Loader2, AlertTriangle, ExternalLink
} from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { productsService } from '@/lib/services/products.service'
import { EmptyState } from '@/components/ui/EmptyState'

interface WarehouseDto { id: string; name: string; address?: string; isActive: boolean }
interface StockDto { productId: string; binId: string; quantity: number; minStockLevel: number; isLowStock: boolean }
interface StockMovementForm { movementType: string; productId: string; fromBinId: string; toBinId: string; quantity: number; note: string }

const EMPTY_MOVE: StockMovementForm = { movementType: 'In', productId: '', fromBinId: '', toBinId: '', quantity: 1, note: '' }

export default function WMSPage() {
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [stock, setStock] = useState<StockDto[]>([])
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'warehouses' | 'stock' | 'movements'>('warehouses')
  const [showMoveForm, setShowMoveForm] = useState(false)
  const [moveForm, setMoveForm] = useState<StockMovementForm>(EMPTY_MOVE)
  const [saving, setSaving] = useState(false)
  const [newWarehouseName, setNewWarehouseName] = useState('')
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null)
  const [editMinValue, setEditMinValue] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/wms/warehouses').then((r) => r.data as WarehouseDto[]),
      api.get('/api/wms/stock').then((r) => r.data as StockDto[]),
      productsService.getAll().catch(() => []),
    ]).then(([wh, st, prods]) => {
      setWarehouses(wh)
      setStock(st)
      const map: Record<string, string> = {}
      prods.forEach(p => { map[p.id] = p.name })
      setProductNames(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const lowStockItems = useMemo(() => stock.filter(s => s.isLowStock), [stock])

  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) return
    await api.post('/api/wms/warehouses', { name: newWarehouseName })
    const r = await api.get('/api/wms/warehouses')
    setWarehouses(r.data)
    setNewWarehouseName('')
  }

  const handleMove = async () => {
    setSaving(true)
    try {
      await api.post('/api/wms/stock-movements', { ...moveForm, quantity: Number(moveForm.quantity) })
      setShowMoveForm(false)
      const r = await api.get('/api/wms/stock')
      setStock(r.data)
    } catch { } finally { setSaving(false) }
  }

  const handleSaveMinStock = async (productId: string) => {
    const val = Number(editMinValue)
    if (isNaN(val) || val < 0) return
    try {
      await api.patch(`/api/wms/stock/${productId}/min-level`, { minStockLevel: val })
      setStock(prev => prev.map(s => s.productId === productId ? { ...s, minStockLevel: val } : s))
    } catch { }
    setEditingMinStock(null)
  }

  const resolveProductName = (productId: string) =>
    productNames[productId] ?? `#${productId.slice(0, 8)}…`

  const TABS = [
    { key: 'warehouses', label: 'Depolar', icon: Warehouse },
    { key: 'stock', label: 'Stok Durumu', icon: Package },
    { key: 'movements', label: 'Stok Hareketi', icon: RefreshCw },
  ] as const

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Depo Yönetimi (WMS)</h1>
        <p className="text-slate-500">Depolar, stok seviyeleri ve hareketler</p>
      </div>

      {/* Kritik stok alert banner */}
      {!loading && lowStockItems.length > 0 && (
        <div className="flex items-start sm:items-center gap-3 p-4 rounded-xl bg-amber-500/8 border border-amber-500/25 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold">
              {lowStockItems.length} ürün kritik stok seviyesinde.{' '}
            </span>
            <button
              onClick={() => setTab('stock')}
              className="text-sm underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              Stok Durumu'nu görüntüle
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Toplam Depo', value: warehouses.length, icon: Warehouse, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Toplam SKU', value: stock.length, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Düşük Stok', value: lowStockItems.length, icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="premium-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit border border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-400 hover:text-foreground'
            }`}>
            <Icon className="w-4 h-4" /> {label}
            {key === 'stock' && lowStockItems.length > 0 && tab !== 'stock' && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {lowStockItems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : tab === 'warehouses' ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              value={newWarehouseName}
              onChange={(e) => setNewWarehouseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWarehouse()}
              placeholder="Yeni depo adı..."
              className="flex-1 px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all"
            />
            <button onClick={handleAddWarehouse} className="premium-button flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
          {warehouses.length === 0 ? (
            <EmptyState icon={<Warehouse className="w-8 h-8" />} title="Henüz depo yok" description="İlk deponuzu ekleyin." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((w) => (
                <div key={w.id} className="premium-card p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Warehouse className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="font-semibold text-foreground">{w.name}</span>
                  </div>
                  {w.address && <p className="text-sm text-slate-400 mt-1">{w.address}</p>}
                  <span className={`text-xs mt-3 inline-flex items-center gap-1 font-medium ${w.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${w.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {w.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : tab === 'stock' ? (
        <div>
          {stock.length === 0 ? (
            <EmptyState icon={<Package className="w-8 h-8" />} title="Stok kaydı yok" description="Stok hareketi oluşturduktan sonra burada görünecek." />
          ) : (
            <div className="premium-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Ürün</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Miktar</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Min Seviye</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Durum</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((s, i) => (
                    <tr key={i} className={`border-b border-border/40 transition-colors ${s.isLowStock ? 'bg-amber-500/4 hover:bg-amber-500/8' : 'hover:bg-surface/50'}`}>
                      <td className="px-4 py-3 font-medium">
                        {resolveProductName(s.productId)}
                      </td>
                      <td className={`px-4 py-3 font-bold ${s.isLowStock ? 'text-amber-400' : 'text-foreground'}`}>
                        {s.quantity}
                      </td>
                      <td className="px-4 py-3">
                        {editingMinStock === s.productId ? (
                          <input
                            type="number"
                            value={editMinValue}
                            onChange={e => setEditMinValue(e.target.value)}
                            onBlur={() => handleSaveMinStock(s.productId)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveMinStock(s.productId)}
                            className="w-20 px-2 py-1 rounded-lg bg-background border border-blue-500/50 text-foreground text-sm focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingMinStock(s.productId); setEditMinValue(String(s.minStockLevel)) }}
                            className="text-slate-400 hover:text-foreground transition-colors cursor-text"
                            title="Düzenlemek için tıkla"
                          >
                            {s.minStockLevel}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.isLowStock ? 'bg-amber-400/15 text-amber-400' : 'bg-emerald-400/15 text-emerald-400'}`}>
                          {s.isLowStock ? 'Düşük Stok' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.isLowStock && (
                          <Link
                            href="/dashboard/ecommerce"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                          >
                            Ürünü Gör <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : (
        <div className="space-y-4">
          <button onClick={() => setShowMoveForm(true)} className="premium-button flex items-center gap-2">
            <Plus className="w-4 h-4" /> Stok Hareketi Ekle
          </button>
          {showMoveForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Stok Hareketi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Hareket Tipi</label>
                  <select
                    value={moveForm.movementType}
                    onChange={(e) => setMoveForm((f) => ({ ...f, movementType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50"
                  >
                    <option value="In">Giriş</option>
                    <option value="Out">Çıkış</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Loss">Kayıp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ürün</label>
                  {Object.keys(productNames).length > 0 ? (
                    <select
                      value={moveForm.productId}
                      onChange={(e) => setMoveForm((f) => ({ ...f, productId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50"
                    >
                      <option value="">Ürün seçin...</option>
                      {Object.entries(productNames).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={moveForm.productId}
                      onChange={(e) => setMoveForm((f) => ({ ...f, productId: e.target.value }))}
                      placeholder="Ürün UUID"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Miktar</label>
                  <input
                    type="number"
                    value={moveForm.quantity}
                    onChange={(e) => setMoveForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                    min={1}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Not</label>
                  <input
                    value={moveForm.note}
                    onChange={(e) => setMoveForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Açıklama (isteğe bağlı)"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleMove} disabled={saving} className="premium-button flex items-center gap-2 disabled:opacity-60">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Kaydet
                </button>
                <button onClick={() => setShowMoveForm(false)} className="px-4 py-2 rounded-xl border border-border text-foreground text-sm hover:bg-surface transition-colors">
                  İptal
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
