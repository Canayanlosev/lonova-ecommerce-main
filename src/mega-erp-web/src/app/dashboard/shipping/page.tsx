"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Truck, Package, CheckCircle2, RotateCcw, Clock, Search,
  Settings, Plus, Trash2, Edit2, Check, X, RefreshCw, Download,
  MapPin
} from "lucide-react";
import { shippingService } from "@/lib/services/shipping.service";
import { useToast } from "@/store/ui.store";
import type { Shipment, ShippingMethod } from "@/types/api.types";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Pending:   { label: "Beklemede",       color: "bg-amber-500/15 text-amber-400" },
  Shipped:   { label: "Gönderildi",      color: "bg-primary/15 text-primary" },
  InTransit: { label: "Yolda",           color: "bg-secondary/15 text-secondary" },
  Delivered: { label: "Teslim Edildi",   color: "bg-emerald-500/15 text-emerald-400" },
  Returned:  { label: "İade",            color: "bg-red-500/15 text-red-400" },
};

const EMPTY_METHOD = { name: '', carrier: '', baseCost: 0 }

export default function ShippingPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'shipments' | 'methods'>('shipments')

  // Shipments state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('')

  // Methods state
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [showMethodForm, setShowMethodForm] = useState(false)
  const [methodForm, setMethodForm] = useState(EMPTY_METHOD)
  const [editMethodId, setEditMethodId] = useState<string | null>(null)
  const [methodSaving, setMethodSaving] = useState(false)

  const loadShipments = async () => {
    setLoading(true);
    try {
      const data = await shippingService.getShipments()
      setShipments(data);
    } catch {
      toast.error("Kargolar yüklenemedi.")
    } finally {
      setLoading(false);
    }
  }

  const loadMethods = async () => {
    setMethodsLoading(true)
    try {
      const data = await shippingService.getMethods()
      setMethods(data)
    } catch {
      // ignore — methods may not exist yet
    } finally {
      setMethodsLoading(false)
    }
  }

  useEffect(() => {
    loadShipments()
    loadMethods()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await shippingService.updateShipmentStatus(id, status);
      setShipments((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      toast.success("Kargo durumu güncellendi.");
    } catch {
      toast.error("Durum güncellenemedi.");
    } finally {
      setUpdating(null);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'Pending').length,
    inTransit: shipments.filter(s => s.status === 'Shipped' || s.status === 'InTransit').length,
    delivered: shipments.filter(s => s.status === 'Delivered').length,
    returned: shipments.filter(s => s.status === 'Returned').length,
  }), [shipments])

  // Filtered shipments
  const filtered = useMemo(() => {
    if (!search.trim()) return shipments
    const q = search.toLowerCase()
    return shipments.filter(s =>
      s.trackingNumber?.toLowerCase().includes(q) ||
      s.orderId?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    )
  }, [shipments, search])

  // CSV export
  const handleExport = () => {
    const rows = [
      ['Takip No', 'Sipariş ID', 'Durum', 'Gönderim Tarihi', 'Tahmini Teslimat'],
      ...filtered.map(s => [
        s.trackingNumber,
        s.orderId,
        STATUS_CONFIG[s.status]?.label ?? s.status,
        s.shippedDate ? new Date(s.shippedDate).toLocaleDateString('tr-TR') : '',
        s.estimatedDeliveryDate ? new Date(s.estimatedDeliveryDate).toLocaleDateString('tr-TR') : '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `kargolar_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // Methods CRUD
  const handleSaveMethod = async () => {
    if (!methodForm.name.trim() || !methodForm.carrier.trim()) {
      toast.error('Ad ve kargo firması zorunludur.')
      return
    }
    setMethodSaving(true)
    try {
      if (editMethodId) {
        await shippingService.updateMethod(editMethodId, { ...methodForm, isActive: true })
      } else {
        await shippingService.createMethod(methodForm)
      }
      await loadMethods()
      setShowMethodForm(false)
      setEditMethodId(null)
      setMethodForm(EMPTY_METHOD)
      toast.success(editMethodId ? 'Yöntem güncellendi.' : 'Yöntem eklendi.')
    } catch {
      toast.error('Kaydedilemedi.')
    } finally {
      setMethodSaving(false)
    }
  }

  const handleDeleteMethod = async (id: string) => {
    if (!confirm('Bu kargo yöntemini silmek istediğinize emin misiniz?')) return
    try {
      await shippingService.deleteMethod(id)
      setMethods(prev => prev.filter(m => m.id !== id))
      toast.success('Silindi.')
    } catch {
      toast.error('Silinemedi.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Kargo Yönetimi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gönderi durumları ve kargo yöntemleri</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadShipments}
            className="p-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-surface transition-all"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-surface text-sm transition-all"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Package className="w-4 h-4 text-slate-400" />} label="Toplam Kargo" value={stats.total} color="bg-slate-800" />
        <StatCard icon={<Clock className="w-4 h-4 text-amber-400" />} label="Beklemede" value={stats.pending} color="bg-amber-500/10" />
        <StatCard icon={<MapPin className="w-4 h-4 text-secondary" />} label="Yolda" value={stats.inTransit} color="bg-secondary/10" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} label="Teslim Edildi" value={stats.delivered} color="bg-emerald-500/10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl w-fit">
        <button
          onClick={() => setTab('shipments')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'shipments' ? 'bg-surface text-foreground shadow-sm' : 'text-slate-400 hover:text-foreground'
          }`}
        >
          <Truck className="w-4 h-4" /> Kargolar
          {stats.pending > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
              {stats.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('methods')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'methods' ? 'bg-surface text-foreground shadow-sm' : 'text-slate-400 hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" /> Kargo Yöntemleri
        </button>
      </div>

      {tab === 'shipments' && (
        <div className="premium-card overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Takip no veya sipariş ID ara..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-medium">Takip No</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Sipariş</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Gönderim</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tahmini Teslimat</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-right px-4 py-3 font-medium">Güncelle</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">
                        {search ? 'Arama sonucu bulunamadı.' : 'Henüz kargo kaydı yok.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const sc = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-slate-700 text-slate-300' }
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {s.trackingNumber || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400 hidden md:table-cell">
                          #{s.orderId?.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                          {s.shippedDate ? new Date(s.shippedDate).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                          {s.estimatedDeliveryDate ? new Date(s.estimatedDeliveryDate).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={s.status}
                            disabled={updating === s.id}
                            onChange={(e) => updateStatus(s.id, e.target.value)}
                            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary/25 transition-all disabled:opacity-50"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-xs text-slate-500">
              {filtered.length} kargo gösteriliyor
              {stats.returned > 0 && (
                <span className="ml-3 text-red-400">
                  <RotateCcw className="w-3 h-3 inline mr-1" />{stats.returned} iade
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'methods' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowMethodForm(true); setEditMethodId(null); setMethodForm(EMPTY_METHOD) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Yeni Yöntem Ekle
            </button>
          </div>

          {showMethodForm && (
            <div className="premium-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{editMethodId ? 'Yöntemi Düzenle' : 'Yeni Kargo Yöntemi'}</h3>
                <button onClick={() => { setShowMethodForm(false); setEditMethodId(null) }} className="text-slate-400 hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Yöntem Adı *</label>
                  <input
                    type="text"
                    value={methodForm.name}
                    onChange={e => setMethodForm({ ...methodForm, name: e.target.value })}
                    placeholder="Standart Kargo"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Kargo Firması *</label>
                  <input
                    type="text"
                    value={methodForm.carrier}
                    onChange={e => setMethodForm({ ...methodForm, carrier: e.target.value })}
                    placeholder="Yurtiçi Kargo"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Temel Ücret (₺)</label>
                  <input
                    type="number"
                    value={methodForm.baseCost}
                    onChange={e => setMethodForm({ ...methodForm, baseCost: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSaveMethod}
                  disabled={methodSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {methodSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editMethodId ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  onClick={() => { setShowMethodForm(false); setEditMethodId(null) }}
                  className="px-5 py-2 rounded-xl border border-border text-slate-400 hover:text-foreground text-sm transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {methodsLoading ? (
            <div className="premium-card p-8 text-center text-slate-400 animate-pulse">Yükleniyor...</div>
          ) : methods.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <Settings className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz kargo yöntemi tanımlı değil</p>
            </div>
          ) : (
            <div className="premium-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">Yöntem</th>
                    <th className="text-left px-4 py-3 font-medium">Kargo Firması</th>
                    <th className="text-left px-4 py-3 font-medium">Ücret</th>
                    <th className="text-left px-4 py-3 font-medium">Durum</th>
                    <th className="text-right px-4 py-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {methods.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3 text-slate-400">{m.carrier}</td>
                      <td className="px-4 py-3 text-foreground">
                        {m.baseCost > 0
                          ? m.baseCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
                          : <span className="text-emerald-400 text-xs font-semibold">Ücretsiz</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          m.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {m.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditMethodId(m.id); setMethodForm({ name: m.name, carrier: m.carrier, baseCost: m.baseCost }); setShowMethodForm(true) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-700 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMethod(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="premium-card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}
