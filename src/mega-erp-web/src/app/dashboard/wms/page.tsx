'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Warehouse, Package, TrendingDown, Plus, RefreshCw,
  Loader2, AlertTriangle, ExternalLink, Truck,
  ShoppingBag, Check, X, Edit2, Trash2, ChevronDown, ChevronUp, DollarSign
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/lib/api'
import { productsService } from '@/lib/services/products.service'
import { EmptyState } from '@/components/ui/EmptyState'

// ── DTOs ─────────────────────────────────────────────────────────────────────

interface WarehouseDto { id: string; name: string; address?: string; isActive: boolean }
interface BinDto { id: string; warehouseId: string; code: string }
interface StockDto { productId: string; binId: string; quantity: number; minStockLevel: number; isLowStock: boolean }
interface StockMovementForm { movementType: string; productId: string; fromBinId: string; toBinId: string; quantity: number; note: string }
interface StockMovementDto {
  id: string
  productId: string
  movementType: string
  quantity: number
  note?: string
  createdAt: string
  fromBinId?: string
  toBinId?: string
}

interface SupplierDto {
  id: string; name: string
  contactEmail?: string; contactPhone?: string
  address?: string; isActive: boolean
}
interface SupplierForm { name: string; contactEmail: string; contactPhone: string; address: string }
const EMPTY_SUPPLIER: SupplierForm = { name: '', contactEmail: '', contactPhone: '', address: '' }

interface POItem { productId: string; orderedQuantity: number; receivedQuantity: number; unitPrice: number }
interface PurchaseOrderDto {
  id: string; supplierId: string; supplierName?: string
  status: string; orderDate: string; expectedDate?: string; notes?: string
  items: POItem[]
}
interface POForm {
  supplierId: string
  expectedDate: string
  notes: string
  lines: Array<{ productId: string; quantity: number; unitPrice: number }>
}
const EMPTY_PO: POForm = { supplierId: '', expectedDate: '', notes: '', lines: [{ productId: '', quantity: 1, unitPrice: 0 }] }

const EMPTY_MOVE: StockMovementForm = { movementType: 'In', productId: '', fromBinId: '', toBinId: '', quantity: 1, note: '' }

const PO_STATUS: Record<string, { label: string; cls: string }> = {
  Pending:   { label: 'Beklemede', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  Confirmed: { label: 'Onaylandı', cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  Received:  { label: 'Teslim Alındı', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Cancelled: { label: 'İptal', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all'

// ── Component ─────────────────────────────────────────────────────────────────

export default function WMSPage() {
  // ─ Core data ──
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([])
  const [bins, setBins] = useState<BinDto[]>([])
  const [stock, setStock] = useState<StockDto[]>([])
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [productPrices, setProductPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'warehouses' | 'stock' | 'movements' | 'suppliers' | 'purchase-orders'>('warehouses')

  // ─ Warehouse ──
  const [newWarehouseName, setNewWarehouseName] = useState('')

  // ─ Stock edit ──
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null)
  const [editMinValue, setEditMinValue] = useState('')

  // ─ Quick stock adjust ──
  const [quickAdjusting, setQuickAdjusting] = useState<Record<string, boolean>>({})

  // ─ Movement ──
  const [showMoveForm, setShowMoveForm] = useState(false)
  const [moveForm, setMoveForm] = useState<StockMovementForm>(EMPTY_MOVE)
  const [saving, setSaving] = useState(false)
  const [movements, setMovements] = useState<StockMovementDto[]>([])
  const [movementsLoaded, setMovementsLoaded] = useState(false)
  const [movementsLoading, setMovementsLoading] = useState(false)

  // ─ Suppliers ──
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [suppliersLoaded, setSuppliersLoaded] = useState(false)
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(EMPTY_SUPPLIER)
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [supplierError, setSupplierError] = useState('')

  // ─ Purchase Orders ──
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDto[]>([])
  const [poLoaded, setPoLoaded] = useState(false)
  const [showPOForm, setShowPOForm] = useState(false)
  const [poForm, setPoForm] = useState<POForm>(EMPTY_PO)
  const [poSaving, setPoSaving] = useState(false)
  const [poError, setPoError] = useState('')
  const [expandedPO, setExpandedPO] = useState<string | null>(null)
  const [receivingPO, setReceivingPO] = useState<string | null>(null)
  const [receiveBinId, setReceiveBinId] = useState('')

  // ─ Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/api/wms/warehouses').then(r => r.data as WarehouseDto[]),
      api.get('/api/wms/stock').then(r => r.data as StockDto[]),
      productsService.getAll().catch(() => []),
    ]).then(([wh, st, prods]) => {
      setWarehouses(wh)
      setStock(st)
      const map: Record<string, string> = {}
      const priceMap: Record<string, number> = {}
      prods.forEach(p => { map[p.id] = p.name; priceMap[p.id] = p.basePrice ?? 0 })
      setProductNames(map)
      setProductPrices(priceMap)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // ─ Lazy-load suppliers when tab opened ──────────────────────────────────
  useEffect(() => {
    if ((tab === 'suppliers' || tab === 'purchase-orders') && !suppliersLoaded) {
      api.get('/api/wms/suppliers').then(r => {
        setSuppliers(r.data as SupplierDto[])
        setSuppliersLoaded(true)
      }).catch(() => setSuppliersLoaded(true))
    }
  }, [tab, suppliersLoaded])

  // ─ Lazy-load movements when tab opened ──────────────────────────────────
  useEffect(() => {
    if (tab === 'movements' && !movementsLoaded) {
      setMovementsLoading(true)
      api.get('/api/wms/stock-movements').then(r => {
        setMovements(r.data as StockMovementDto[])
        setMovementsLoaded(true)
      }).catch(() => setMovementsLoaded(true)).finally(() => setMovementsLoading(false))
    }
  }, [tab, movementsLoaded])

  // ─ Lazy-load POs when tab opened ────────────────────────────────────────
  const loadPOs = async () => {
    try {
      const r = await api.get('/api/wms/purchase-orders')
      setPurchaseOrders(r.data as PurchaseOrderDto[])
      setPoLoaded(true)
    } catch { setPoLoaded(true) }
  }

  useEffect(() => {
    if (tab === 'purchase-orders' && !poLoaded) {
      loadPOs()
    }
  }, [tab, poLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─ Computed ──────────────────────────────────────────────────────────────
  const lowStockItems = useMemo(() => stock.filter(s => s.isLowStock), [stock])
  const totalStockValue = useMemo(
    () => stock.reduce((s, item) => s + (productPrices[item.productId] ?? 0) * item.quantity, 0),
    [stock, productPrices]
  )
  const resolveProductName = (id: string) => productNames[id] ?? `#${id.slice(0, 8)}…`

  // ─ Warehouse handlers ─────────────────────────────────────────────────────
  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) return
    await api.post('/api/wms/warehouses', { name: newWarehouseName })
    const r = await api.get('/api/wms/warehouses')
    setWarehouses(r.data)
    setNewWarehouseName('')
  }

  // ─ Quick stock adjust ────────────────────────────────────────────────────
  const handleQuickAdjust = async (productId: string, delta: number) => {
    if (quickAdjusting[productId]) return
    setQuickAdjusting(prev => ({ ...prev, [productId]: true }))
    try {
      await api.post('/api/wms/stock-movements', {
        movementType: delta > 0 ? 'In' : 'Out',
        productId,
        quantity: Math.abs(delta),
        note: `Hızlı düzeltme (${delta > 0 ? '+' : ''}${delta})`,
      })
      setStock(prev => prev.map(s =>
        s.productId === productId
          ? { ...s, quantity: s.quantity + delta, isLowStock: (s.quantity + delta) <= s.minStockLevel }
          : s
      ))
    } catch { /* */ } finally {
      setQuickAdjusting(prev => { const { [productId]: _, ...rest } = prev; return rest })
    }
  }

  // ─ Min stock edit ─────────────────────────────────────────────────────────
  const handleSaveMinStock = async (productId: string) => {
    const val = Number(editMinValue)
    if (isNaN(val) || val < 0) return
    try {
      await api.patch(`/api/wms/stock/${productId}/min-level`, { minStockLevel: val })
      setStock(prev => prev.map(s => s.productId === productId ? { ...s, minStockLevel: val } : s))
    } catch { }
    setEditingMinStock(null)
  }

  // ─ Stock movement ─────────────────────────────────────────────────────────
  const handleMove = async () => {
    setSaving(true)
    try {
      await api.post('/api/wms/stock-movements', { ...moveForm, quantity: Number(moveForm.quantity) })
      setShowMoveForm(false)
      setMoveForm(EMPTY_MOVE)
      const [stockRes, movRes] = await Promise.allSettled([
        api.get('/api/wms/stock'),
        api.get('/api/wms/stock-movements'),
      ])
      if (stockRes.status === 'fulfilled') setStock(stockRes.value.data)
      if (movRes.status === 'fulfilled') setMovements(movRes.value.data as StockMovementDto[])
    } catch { } finally { setSaving(false) }
  }

  // ─ Supplier handlers ──────────────────────────────────────────────────────
  const openCreateSupplier = () => {
    setEditSupplierId(null)
    setSupplierForm(EMPTY_SUPPLIER)
    setSupplierError('')
    setShowSupplierForm(true)
  }

  const openEditSupplier = (s: SupplierDto) => {
    setEditSupplierId(s.id)
    setSupplierForm({
      name: s.name,
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      address: s.address ?? '',
    })
    setSupplierError('')
    setShowSupplierForm(true)
  }

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) { setSupplierError('Tedarikçi adı zorunludur.'); return }
    setSupplierSaving(true)
    setSupplierError('')
    try {
      const payload = {
        name: supplierForm.name.trim(),
        contactEmail: supplierForm.contactEmail.trim() || undefined,
        contactPhone: supplierForm.contactPhone.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
      }
      if (editSupplierId) {
        await api.put(`/api/wms/suppliers/${editSupplierId}`, payload)
        setSuppliers(prev => prev.map(s => s.id === editSupplierId ? { ...s, ...payload, isActive: s.isActive } : s))
      } else {
        const r = await api.post('/api/wms/suppliers', payload)
        setSuppliers(prev => [...prev, r.data as SupplierDto])
      }
      setShowSupplierForm(false)
      setEditSupplierId(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data
      setSupplierError(typeof msg === 'string' ? msg : 'Kaydedilemedi.')
    } finally {
      setSupplierSaving(false)
    }
  }

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`"${name}" tedarikçisini silmek istediğinize emin misiniz?`)) return
    try {
      await api.delete(`/api/wms/suppliers/${id}`)
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch { alert('Silinemedi.') }
  }

  // ─ PO handlers ────────────────────────────────────────────────────────────
  const handleCreatePO = async () => {
    if (!poForm.supplierId) { setPoError('Tedarikçi seçiniz.'); return }
    const validLines = poForm.lines.filter(l => l.productId && l.quantity > 0)
    if (validLines.length === 0) { setPoError('En az bir geçerli satır gereklidir.'); return }

    setPoSaving(true)
    setPoError('')
    try {
      const r = await api.post('/api/wms/purchase-orders', {
        supplierId: poForm.supplierId,
        expectedDate: poForm.expectedDate || null,
        notes: poForm.notes || null,
        items: validLines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
      })
      setPurchaseOrders(prev => [r.data as PurchaseOrderDto, ...prev])
      setShowPOForm(false)
      setPoForm(EMPTY_PO)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data
      setPoError(typeof msg === 'string' ? msg : 'Satın alma siparişi oluşturulamadı.')
    } finally {
      setPoSaving(false)
    }
  }

  const handleReceivePO = async (id: string) => {
    try {
      await api.put(`/api/wms/purchase-orders/${id}/receive`, {
        toBinId: receiveBinId || null,
      })
      setReceivingPO(null)
      setReceiveBinId('')
      await loadPOs()
      // Refresh stock
      const r = await api.get('/api/wms/stock')
      setStock(r.data)
    } catch { alert('Teslim alma başarısız.') }
  }

  const addPOLine = () =>
    setPoForm(f => ({ ...f, lines: [...f.lines, { productId: '', quantity: 1, unitPrice: 0 }] }))

  const removePOLine = (i: number) =>
    setPoForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))

  const updatePOLine = (i: number, field: string, value: string | number) =>
    setPoForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }))

  // ─ TABS config ────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'warehouses' as const, label: 'Depolar', icon: Warehouse },
    { key: 'stock' as const, label: 'Stok', icon: Package },
    { key: 'movements' as const, label: 'Hareket', icon: RefreshCw },
    { key: 'suppliers' as const, label: 'Tedarikçiler', icon: Truck },
    { key: 'purchase-orders' as const, label: 'Satın Alma', icon: ShoppingBag },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Depo Yönetimi (WMS)</h1>
        <p className="text-slate-500">Depolar, stok, tedarikçiler ve satın alma</p>
      </div>

      {/* Low-stock alert banner */}
      {!loading && lowStockItems.length > 0 && (
        <div className="flex items-start sm:items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0 text-amber-400 animate-pulse" />
          <div className="flex-1 min-w-0 font-semibold text-sm">
            <span>{lowStockItems.length} ürün kritik stok seviyesinde.{' '}</span>
            <button
              onClick={() => setTab('stock')}
              className="underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              Stok Durumu'nu görüntüle
            </button>
            <span className="text-amber-400/70"> · </span>
            <button
              onClick={() => { setTab('purchase-orders'); setShowPOForm(true) }}
              className="underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              Satın alma siparişi oluştur
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {([
          { label: 'Toplam Depo', value: warehouses.length, icon: Warehouse, color: 'text-primary', border: 'border-primary/20', bg: 'bg-primary/5' },
          { label: 'Toplam SKU', value: stock.length, icon: Package, color: 'text-secondary', border: 'border-secondary/20', bg: 'bg-secondary/5' },
          { label: 'Düşük Stok', value: lowStockItems.length, icon: TrendingDown, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
          { label: 'Tedarikçi', value: suppliersLoaded ? suppliers.length : '—', icon: Truck, color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5' },
          {
            label: 'Stok Değeri',
            value: totalStockValue > 0 ? `₺${totalStockValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '—',
            icon: DollarSign, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5',
          },
        ] as const).map(({ label, value, icon: Icon, color, border, bg }) => (
          <div key={label} className="premium-card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} ${border} border flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-black text-foreground ${String(value).length > 8 ? 'text-base' : 'text-2xl'}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 p-1 bg-slate-900/40 border border-border/80 rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
              ${tab === key ? 'bg-slate-800 text-primary border border-border/50 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-850/50'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'stock' && lowStockItems.length > 0 && tab !== 'stock' && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                {lowStockItems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>

      ) : tab === 'warehouses' ? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              value={newWarehouseName}
              onChange={e => setNewWarehouseName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWarehouse()}
              placeholder="Yeni depo adı..."
              className={inputCls + ' flex-1'}
            />
            <button onClick={handleAddWarehouse} className="premium-button flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
          {warehouses.length === 0 ? (
            <EmptyState icon={<Warehouse className="w-8 h-8" />} title="Henüz depo yok" description="İlk deponuzu ekleyin." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map(w => (
                <div key={w.id} className="premium-card p-5 hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center transition-colors group-hover:bg-primary/15">
                      <Warehouse className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-foreground">{w.name}</span>
                  </div>
                  {w.address && <p className="text-xs text-slate-400 mt-1.5">{w.address}</p>}
                  <span className={`text-xs mt-3.5 inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full ${w.isActive ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-slate-400/10 text-slate-400 border border-slate-400/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${w.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
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
                  <tr className="border-b border-border text-xs text-slate-400">
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Ürün</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Miktar</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Min Seviye</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Durum</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stock.map((s, i) => (
                    <tr key={i} className={`transition-colors ${s.isLowStock ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-primary/5'}`}>
                      <td className="px-4 py-3 font-semibold text-foreground">{resolveProductName(s.productId)}</td>
                      <td className={`px-4 py-3 font-black ${s.isLowStock ? 'text-amber-400' : 'text-foreground'}`}>{s.quantity}</td>
                      <td className="px-4 py-3">
                        {editingMinStock === s.productId ? (
                          <input
                            type="number"
                            value={editMinValue}
                            onChange={e => setEditMinValue(e.target.value)}
                            onBlur={() => handleSaveMinStock(s.productId)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveMinStock(s.productId)}
                            className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-primary/50 text-foreground text-sm font-semibold focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingMinStock(s.productId); setEditMinValue(String(s.minStockLevel)) }}
                            className="text-slate-400 hover:text-white font-semibold transition-colors cursor-text border-b border-dashed border-slate-600 hover:border-white"
                            title="Düzenlemek için tıkla"
                          >
                            {s.minStockLevel}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${s.isLowStock ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {s.isLowStock ? 'Düşük Stok' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Quick adjust */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickAdjust(s.productId, -5)}
                              disabled={!!quickAdjusting[s.productId] || s.quantity < 1}
                              title="Stoktan 5 çıkar"
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 text-xs font-bold transition-colors"
                            >−5</button>
                            <button
                              onClick={() => handleQuickAdjust(s.productId, 5)}
                              disabled={!!quickAdjusting[s.productId]}
                              title="Stoğa 5 ekle"
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 text-xs font-bold transition-colors"
                            >+5</button>
                          </div>
                          {/* Low-stock specific actions */}
                          {s.isLowStock && (
                            <>
                              <Link
                                href="/dashboard/ecommerce"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline transition-colors font-bold"
                              >
                                Ürün <ExternalLink className="w-3 h-3" />
                              </Link>
                              <button
                                onClick={() => {
                                  setTab('purchase-orders')
                                  setShowPOForm(true)
                                  setPoForm(f => ({
                                    ...f,
                                    lines: [{ productId: s.productId, quantity: s.minStockLevel * 2, unitPrice: 0 }]
                                  }))
                                }}
                                className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors underline underline-offset-2"
                              >
                                Sipariş Et
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : tab === 'movements' ? (
        <div className="space-y-4">
          <button onClick={() => setShowMoveForm(true)} className="premium-button flex items-center gap-2">
            <Plus className="w-4 h-4" /> Stok Hareketi Ekle
          </button>
          {showMoveForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6 border border-border/80 space-y-4 bg-slate-900/60 backdrop-blur-md">
              <h3 className="text-base font-bold text-foreground">Stok Hareketi Ekle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Hareket Tipi</label>
                  <select value={moveForm.movementType} onChange={e => setMoveForm(f => ({ ...f, movementType: e.target.value }))} className={inputCls + ' cursor-pointer'}>
                    <option value="In">Giriş</option>
                    <option value="Out">Çıkış</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Loss">Kayıp</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Ürün</label>
                  {Object.keys(productNames).length > 0 ? (
                    <select value={moveForm.productId} onChange={e => setMoveForm(f => ({ ...f, productId: e.target.value }))} className={inputCls + ' cursor-pointer'}>
                      <option value="">Ürün seçin...</option>
                      {Object.entries(productNames).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={moveForm.productId} onChange={e => setMoveForm(f => ({ ...f, productId: e.target.value }))} placeholder="Ürün UUID" className={inputCls} />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Miktar</label>
                  <input type="number" value={moveForm.quantity} onChange={e => setMoveForm(f => ({ ...f, quantity: Number(e.target.value) }))} min={1} className={inputCls + ' font-mono'} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Not</label>
                  <input value={moveForm.note} onChange={e => setMoveForm(f => ({ ...f, note: e.target.value }))} placeholder="Açıklama (isteğe bağlı)" className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleMove} disabled={saving} className="premium-button flex items-center gap-2 disabled:opacity-60">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Kaydet
                </button>
                <button onClick={() => setShowMoveForm(false)} className="px-4 py-2 rounded-xl border border-border text-slate-400 hover:text-white text-sm font-semibold transition-colors">İptal</button>
              </div>
            </motion.div>
          )}

          {/* Movement History */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Hareket Geçmişi</h3>
              {movementsLoaded && (
                <button
                  onClick={() => { setMovementsLoaded(false) }}
                  className="p-1.5 rounded-lg border border-border bg-slate-950/20 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
            {movementsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : movements.length === 0 ? (
              <EmptyState icon={<RefreshCw />} title="Henüz hareket yok" description="Stok hareketi eklendiğinde burada görünecek." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-slate-400">
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Tarih</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Ürün</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Tip</th>
                      <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Miktar</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.slice(0, 50).map(m => {
                      const typeConfig: Record<string, { label: string; cls: string; sign: string }> = {
                        In:       { label: 'Giriş',    cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', sign: '+' },
                        Out:      { label: 'Çıkış',    cls: 'bg-red-500/10 text-red-400 border border-red-500/20',         sign: '−' },
                        Transfer: { label: 'Transfer', cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',        sign: '↔' },
                        Loss:     { label: 'Kayıp',    cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',      sign: '!' },
                      }
                      const tc = typeConfig[m.movementType] ?? { label: m.movementType, cls: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', sign: '' }
                      return (
                        <tr key={m.id} className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-450 font-semibold whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {resolveProductName(m.productId)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tc.cls}`}>{tc.label}</span>
                          </td>
                          <td className={`px-4 py-3 text-right font-black text-sm ${
                            m.movementType === 'In' ? 'text-emerald-450' : m.movementType === 'Out' || m.movementType === 'Loss' ? 'text-red-450' : 'text-foreground'
                          }`}>
                            {tc.sign}{m.quantity}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 font-semibold hidden sm:table-cell max-w-xs truncate">{m.note ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {movements.length > 50 && (
                  <p className="text-xs text-slate-500 text-center mt-3 font-semibold">Son 50 hareket gösteriliyor</p>
                )}
              </div>
            )}
          </div>
        </div>

      ) : tab === 'suppliers' ? (
        /* ── Suppliers Tab ──────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400 font-semibold">{suppliers.length} tedarikçi kayıtlı</p>
            <button
              onClick={openCreateSupplier}
              className="premium-button flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tedarikçi Ekle
            </button>
          </div>

          {/* Supplier form */}
          <AnimatePresence>
            {showSupplierForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="premium-card p-5 border border-primary/20 space-y-4 bg-slate-900/60 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm">
                    {editSupplierId ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi'}
                  </h3>
                  <button onClick={() => { setShowSupplierForm(false); setEditSupplierId(null) }} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Firma Adı *</label>
                    <input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} placeholder="Tedarikçi firma adı" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">E-posta</label>
                    <input type="email" value={supplierForm.contactEmail} onChange={e => setSupplierForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="firma@ornek.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Telefon</label>
                    <input value={supplierForm.contactPhone} onChange={e => setSupplierForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Adres</label>
                    <input value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} placeholder="Firma adresi" className={inputCls} />
                  </div>
                </div>
                {supplierError && <p className="text-red-400 text-xs font-semibold">{supplierError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveSupplier} disabled={supplierSaving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-md shadow-primary/20">
                    {supplierSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {editSupplierId ? 'Güncelle' : 'Ekle'}
                  </button>
                  <button onClick={() => { setShowSupplierForm(false); setEditSupplierId(null) }} className="px-4 py-2 rounded-xl border border-border text-slate-400 hover:text-white text-xs font-semibold transition-colors">İptal</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supplier list */}
          {!suppliersLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : suppliers.length === 0 ? (
            <EmptyState icon={<Truck className="w-8 h-8" />} title="Henüz tedarikçi yok" description="İlk tedarikçinizi ekleyin." />
          ) : (
            <div className="premium-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-slate-400">
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Firma</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">E-posta</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Telefon</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                            <Truck className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{s.name}</p>
                            {s.address && <p className="text-xs text-slate-400 font-semibold truncate max-w-[200px]">{s.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-semibold text-xs hidden md:table-cell">{s.contactEmail ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400 font-semibold text-xs hidden sm:table-cell">{s.contactPhone ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditSupplier(s)}
                            className="p-2 rounded-xl text-slate-405 hover:text-white bg-slate-950/20 hover:bg-slate-800 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id, s.name)}
                            className="p-2 rounded-xl text-slate-405 hover:text-red-400 bg-slate-950/20 hover:bg-red-500/10 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : (
        /* ── Purchase Orders Tab ────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400 font-semibold">{purchaseOrders.length} satın alma siparişi</p>
            <button onClick={() => { setShowPOForm(true); setPoError('') }} className="premium-button flex items-center gap-2">
              <Plus className="w-4 h-4" /> Yeni Sipariş
            </button>
          </div>

          {/* PO Create Form */}
          <AnimatePresence>
            {showPOForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="premium-card p-5 border border-primary/20 space-y-5 bg-slate-900/60 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm">Yeni Satın Alma Siparişi</h3>
                  <button onClick={() => { setShowPOForm(false); setPoForm(EMPTY_PO) }} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Tedarikçi *</label>
                    <select value={poForm.supplierId} onChange={e => setPoForm(f => ({ ...f, supplierId: e.target.value }))} className={inputCls + ' cursor-pointer font-semibold'}>
                      <option value="">Seçiniz...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Beklenen Teslim Tarihi</label>
                    <input type="date" value={poForm.expectedDate} onChange={e => setPoForm(f => ({ ...f, expectedDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Not</label>
                    <input value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} placeholder="İsteğe bağlı not" className={inputCls} />
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-450 uppercase tracking-wide">Ürün Satırları</label>
                    <button onClick={addPOLine} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-bold">
                      <Plus className="w-3 h-3" /> Satır Ekle
                    </button>
                  </div>
                  <div className="space-y-3">
                    {poForm.lines.map((line, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2.5 items-end">
                        <div>
                          {i === 0 && <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Ürün</label>}
                          <select value={line.productId} onChange={e => updatePOLine(i, 'productId', e.target.value)} className={inputCls + ' cursor-pointer'}>
                            <option value="">Ürün...</option>
                            {Object.entries(productNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                          </select>
                        </div>
                        <div>
                          {i === 0 && <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Miktar</label>}
                          <input type="number" min={1} value={line.quantity} onChange={e => updatePOLine(i, 'quantity', Number(e.target.value))} className={inputCls + ' font-mono'} />
                        </div>
                        <div>
                          {i === 0 && <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Birim Fiyat ₺</label>}
                          <input type="number" min={0} step={0.01} value={line.unitPrice} onChange={e => updatePOLine(i, 'unitPrice', Number(e.target.value))} className={inputCls + ' font-mono'} />
                        </div>
                        <button
                          onClick={() => removePOLine(i)}
                          disabled={poForm.lines.length === 1}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 bg-slate-950/20 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-end gap-2 text-sm border-t border-border pt-4">
                  <span className="text-slate-400 font-semibold">Toplam:</span>
                  <span className="font-black text-foreground text-lg font-mono">
                    ₺{poForm.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {poError && <p className="text-red-400 text-xs font-semibold">{poError}</p>}

                <div className="flex gap-2">
                  <button onClick={handleCreatePO} disabled={poSaving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-md shadow-primary/20">
                    {poSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Sipariş Oluştur
                  </button>
                  <button onClick={() => { setShowPOForm(false); setPoForm(EMPTY_PO) }} className="px-4 py-2.5 rounded-xl border border-border text-slate-400 hover:text-white text-xs font-semibold transition-colors">İptal</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PO List */}
          {!poLoaded ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : purchaseOrders.length === 0 && !showPOForm ? (
            <EmptyState icon={<ShoppingBag className="w-8 h-8" />} title="Satın alma siparişi yok" description="Tedarikçilerden ürün sipariş etmek için yeni sipariş oluşturun." />
          ) : (
            <div className="space-y-3">
              {purchaseOrders.map(po => {
                const sc = PO_STATUS[po.status] ?? { label: po.status, cls: 'bg-slate-700/10 text-slate-350 border border-slate-700/20' }
                const isExpanded = expandedPO === po.id
                const totalCost = po.items.reduce((s, i) => s + i.orderedQuantity * i.unitPrice, 0)
                const canReceive = po.status === 'Pending' || po.status === 'Confirmed'

                return (
                  <div key={po.id} className="premium-card overflow-hidden p-0">
                    <div
                      className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => setExpandedPO(isExpanded ? null : po.id)}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3.5 flex-wrap">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${sc.cls}`}>{sc.label}</span>
                        <span className="text-sm font-bold text-foreground truncate">{po.supplierName ?? '—'}</span>
                        <span className="text-xs text-slate-400 font-semibold">{new Date(po.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {po.expectedDate && (
                          <span className="text-xs text-slate-400 font-semibold">→ {new Date(po.expectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                        )}
                        <span className="text-xs font-black text-foreground ml-auto font-mono">
                          ₺{totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} · {po.items.length} kalem
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border px-5 py-4 bg-slate-950/20 space-y-4">
                        {/* Items table */}
                        <div className="overflow-hidden border border-border/60 rounded-xl">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-900/60 border-b border-border text-slate-400">
                                <th className="text-left px-4 py-2 font-semibold uppercase tracking-wider">Ürün</th>
                                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider">Sipariş</th>
                                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider">Alınan</th>
                                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider">Birim ₺</th>
                                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider">Toplam</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {po.items.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-900/20">
                                  <td className="px-4 py-2 font-semibold text-foreground">{resolveProductName(item.productId)}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-foreground">{item.orderedQuantity}</td>
                                  <td className="px-4 py-2 text-right font-bold text-emerald-450">{item.receivedQuantity}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-slate-405 font-mono">₺{item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-2 text-right font-black text-foreground font-mono">₺{(item.orderedQuantity * item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {po.notes && (
                          <p className="text-xs text-slate-400 font-semibold italic bg-slate-950/40 p-2.5 rounded-xl border border-border">{po.notes}</p>
                        )}

                        {/* Receive action */}
                        {canReceive && (
                          receivingPO === po.id ? (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                              <div className="flex-1 space-y-2">
                                <p className="text-xs font-bold text-emerald-400">Teslim Alma Onayı</p>
                                <p className="text-xs text-slate-455 font-semibold">Tüm sipariş satırları stoğa aktarılacak. Depo raf veya bölme no (opsiyonel):</p>
                                <input
                                  value={receiveBinId}
                                  onChange={e => setReceiveBinId(e.target.value)}
                                  placeholder="Örn: BIN-A1 (boş kalabilir)"
                                  className={inputCls + ' max-w-xs'}
                                />
                              </div>
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => handleReceivePO(po.id)}
                                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/10"
                                >
                                  <Check className="w-3.5 h-3.5" /> Onayla
                                </button>
                                <button
                                  onClick={() => setReceivingPO(null)}
                                  className="px-4 py-2 rounded-xl border border-border text-slate-400 text-xs font-semibold hover:text-white transition-colors"
                                >
                                  İptal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReceivingPO(po.id)}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Teslim Al (Stoğa Ekle)
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

