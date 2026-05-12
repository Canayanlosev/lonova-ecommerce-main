'use client'

import { useEffect, useState } from 'react'
import { Warehouse, Package, TrendingDown, Plus, ArrowDown, ArrowUp, RefreshCw, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { EmptyState } from '@/components/ui/EmptyState'

interface WarehouseDto { id: string; name: string; address?: string; isActive: boolean }
interface StockDto { productId: string; binId: string; quantity: number; minStockLevel: number; isLowStock: boolean }
interface StockMovementForm { movementType: string; productId: string; fromBinId: string; toBinId: string; quantity: number; note: string }

const EMPTY_MOVE: StockMovementForm = { movementType: 'In', productId: '', fromBinId: '', toBinId: '', quantity: 1, note: '' }

export default function WMSPage() {
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [stock, setStock] = useState<StockDto[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'warehouses' | 'stock' | 'movements'>('warehouses')
  const [showMoveForm, setShowMoveForm] = useState(false)
  const [moveForm, setMoveForm] = useState<StockMovementForm>(EMPTY_MOVE)
  const [saving, setSaving] = useState(false)
  const [newWarehouseName, setNewWarehouseName] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/wms/warehouses').then((r) => setWarehouses(r.data)),
      api.get('/api/wms/stock').then((r) => setStock(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleAddWarehouse = async () => {
    if (!newWarehouseName) return
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

  const TABS = [
    { key: 'warehouses', label: 'Depolar', icon: Warehouse },
    { key: 'stock', label: 'Stok Durumu', icon: Package },
    { key: 'movements', label: 'Stok Hareketi', icon: RefreshCw },
  ] as const

  const lowStockCount = stock.filter((s) => s.isLowStock).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Depo Yönetimi (WMS)</h1>
          <p className="text-sm text-slate-400 mt-1">Depolar, stok ve hareketler</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Toplam Depo', value: warehouses.length, icon: Warehouse, color: 'text-primary' },
          { label: 'Toplam SKU', value: stock.length, icon: Package, color: 'text-blue-400' },
          { label: 'Düşük Stok', value: lowStockCount, icon: TrendingDown, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="premium-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
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
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-primary text-white' : 'text-slate-400 hover:text-foreground'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : tab === 'warehouses' ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input value={newWarehouseName} onChange={(e) => setNewWarehouseName(e.target.value)} placeholder="Yeni depo adı..."
              className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={handleAddWarehouse} className="premium-button flex items-center gap-2"><Plus className="w-4 h-4" /> Ekle</button>
          </div>
          {warehouses.length === 0 ? (
            <EmptyState icon={<Warehouse className="w-8 h-8" />} title="Henüz depo yok" description="İlk deponuzu ekleyin." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((w) => (
                <div key={w.id} className="premium-card p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Warehouse className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">{w.name}</span>
                  </div>
                  {w.address && <p className="text-sm text-slate-400">{w.address}</p>}
                  <span className={`text-xs mt-2 inline-block ${w.isActive ? 'text-green-400' : 'text-slate-400'}`}>
                    {w.isActive ? '● Aktif' : '○ Pasif'}
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
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Ürün ID</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Miktar</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Min Seviye</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Durum</th>
                </tr></thead>
                <tbody>{stock.map((s, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{s.productId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-foreground font-semibold">{s.quantity}</td>
                    <td className="px-4 py-3 text-slate-400">{s.minStockLevel}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.isLowStock ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'}`}>
                        {s.isLowStock ? 'Düşük Stok' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}</tbody>
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
                  <select value={moveForm.movementType} onChange={(e) => setMoveForm((f) => ({ ...f, movementType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="In">Giriş</option>
                    <option value="Out">Çıkış</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Loss">Kayıp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ürün ID</label>
                  <input value={moveForm.productId} onChange={(e) => setMoveForm((f) => ({ ...f, productId: e.target.value }))} placeholder="UUID"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Miktar</label>
                  <input type="number" value={moveForm.quantity} onChange={(e) => setMoveForm((f) => ({ ...f, quantity: Number(e.target.value) }))} min={1}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Not</label>
                  <input value={moveForm.note} onChange={(e) => setMoveForm((f) => ({ ...f, note: e.target.value }))} placeholder="Açıklama (isteğe bağlı)"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleMove} disabled={saving} className="premium-button flex items-center gap-2 disabled:opacity-60">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Kaydet
                </button>
                <button onClick={() => setShowMoveForm(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-surface">İptal</button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
