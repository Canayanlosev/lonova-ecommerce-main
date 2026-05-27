'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Store, Pencil, Trash2, Loader2, Globe, ExternalLink, Power, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/lib/api'
import { EmptyState } from '@/components/ui/EmptyState'

interface StoreDto {
  id: string
  name: string
  slug: string
  logoUrl?: string
  isActive: boolean
}

interface StoreForm {
  name: string
  slug: string
  logoUrl: string
  isActive: boolean
}

const EMPTY_FORM: StoreForm = { name: '', slug: '', logoUrl: '', isActive: true }

export default function StoresPage() {
  const [stores, setStores] = useState<StoreDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchStores = () => {
    api.get('/api/ecommerce/stores').then((r) => setStores(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchStores() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (s: StoreDto) => {
    setForm({ name: s.name, slug: s.slug, logoUrl: s.logoUrl ?? '', isActive: s.isActive })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingId) await api.put(`/api/ecommerce/stores/${editingId}`, form)
      else await api.post('/api/ecommerce/stores', form)
      setShowForm(false)
      fetchStores()
    } catch { /* toast handled by interceptor */ }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu mağazayı silmek istediğinizden emin misiniz?')) return
    await api.delete(`/api/ecommerce/stores/${id}`)
    fetchStores()
  }

  const handleToggleActive = async (s: StoreDto) => {
    setTogglingId(s.id)
    try {
      await api.put(`/api/ecommerce/stores/${s.id}`, { ...s, isActive: !s.isActive })
      setStores(prev => prev.map(st => st.id === s.id ? { ...st, isActive: !s.isActive } : st))
    } catch { /* ignore */ }
    finally { setTogglingId(null) }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: stores.length,
    active: stores.filter(s => s.isActive).length,
    inactive: stores.filter(s => !s.isActive).length,
    withLogo: stores.filter(s => !!s.logoUrl).length,
  }), [stores])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Mağazalarım</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Her tenant birden fazla mağaza yönetebilir.</p>
        </div>
        <button onClick={openCreate} className="premium-button flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Yeni Mağaza
        </button>
      </div>

      {/* Stats */}
      {!loading && stores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Toplam</p>
              <p className="text-xl font-black text-foreground">{stats.total}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Power className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Aktif</p>
              <p className="text-xl font-black text-emerald-400">{stats.active}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
            <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center shrink-0">
              <Power className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Pasif</p>
              <p className="text-xl font-black text-foreground">{stats.inactive}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Logolu</p>
              <p className="text-xl font-black text-foreground">{stats.withLogo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6 border border-border/80 bg-slate-900/40 space-y-5">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wider">{editingId ? 'Mağazayı Düzenle' : 'Yeni Mağaza'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['name', 'slug', 'logoUrl'] as const).map((field) => (
              <div key={field}>
                <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-1.5">
                  {field === 'name' ? 'Mağaza Adı' : field === 'slug' ? 'Slug (URL)' : 'Logo URL'}
                </label>
                <input
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={field === 'slug' ? 'ornek-magaza' : field === 'logoUrl' ? 'https://...' : ''}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/20 border border-border/80 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 font-bold font-mono transition-all"
                />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-border bg-slate-950/40 text-primary focus:ring-primary/20 w-4 h-4"
              />
              <label htmlFor="isActive" className="text-xs text-foreground font-bold select-none">Aktif Mağaza</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="premium-button flex items-center gap-2 disabled:opacity-60 shadow-md shadow-primary/10">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Kaydet' : 'Oluştur'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-border/80 text-foreground text-xs font-bold hover:bg-slate-800/40 transition-all">İptal</button>
          </div>
        </motion.div>
      )}

      {/* Store grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="premium-card p-6 border border-border/80 bg-slate-900/40 animate-pulse">
              <div className="h-5 bg-slate-800 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState icon={<Store className="w-8 h-8" />} title="Henüz mağaza yok" description="İlk mağazanızı oluşturun." action={{ label: 'Mağaza Oluştur', onClick: openCreate }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`premium-card p-5 border bg-slate-900/40 hover:-translate-y-0.5 transition-all duration-300 shadow-sm flex flex-col justify-between ${
                s.isActive ? 'border-border/80 hover:border-slate-700/80' : 'border-slate-700/30 opacity-70'
              }`}
            >
              <div>
                {/* Logo & status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                    {s.logoUrl ? (
                      <Image
                        src={s.logoUrl}
                        alt={s.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={() => {}}
                      />
                    ) : (
                      <Store className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(s)}
                    disabled={togglingId === s.id}
                    title={s.isActive ? 'Pasife al' : 'Aktife al'}
                    className={`flex items-center gap-1 text-[9px] px-2 py-1 border rounded-full font-black uppercase tracking-wider transition-all ${
                      s.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20'
                    }`}
                  >
                    {togglingId === s.id
                      ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      : <Power className="w-2.5 h-2.5" />
                    }
                    {s.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                </div>

                {/* Name & URL */}
                <h3 className="font-bold text-foreground text-sm tracking-tight mb-1">{s.name}</h3>
                <div className="flex items-center gap-1.5 mb-4">
                  <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-400 truncate">/{s.slug}</span>
                  <a
                    href={`/kategori`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto shrink-0 text-slate-500 hover:text-primary transition-colors"
                    title="Marketplace'te görüntüle"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t border-border/40 pt-4 mt-2">
                <Link
                  href="/dashboard/ecommerce"
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border/80 text-slate-400 hover:text-primary hover:border-primary/30 transition-all font-bold"
                  title="Bu mağazanın ürünlerini görüntüle"
                >
                  <Package className="w-3 h-3" /> Ürünler
                </Link>
                <button
                  onClick={() => openEdit(s)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border/80 text-foreground hover:border-primary hover:text-primary transition-all font-bold"
                >
                  <Pencil className="w-3 h-3" /> Düzenle
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border/80 text-slate-450 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all font-bold ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
