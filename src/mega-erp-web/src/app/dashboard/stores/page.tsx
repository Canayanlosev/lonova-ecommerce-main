'use client'

import { useEffect, useState } from 'react'
import { Plus, Store, Pencil, Trash2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
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

  const fetchStores = () => {
    api.get('/api/ecommerce/stores').then((r) => setStores(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchStores() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (s: StoreDto) => { setForm({ name: s.name, slug: s.slug, logoUrl: s.logoUrl ?? '', isActive: s.isActive }); setEditingId(s.id); setShowForm(true) }

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Mağazalarım</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Her tenant birden fazla mağaza yönetebilir.</p>
        </div>
        <button onClick={openCreate} className="premium-button flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Yeni Mağaza
        </button>
      </div>

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
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-5 border border-border/80 bg-slate-900/40 hover:-translate-y-0.5 hover:border-slate-700/80 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 border uppercase tracking-wider rounded-full font-black ${
                    s.isActive 
                      ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                      : 'bg-slate-500/10 text-slate-450 border-slate-500/20'
                  }`}>
                    {s.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-sm tracking-tight">{s.name}</h3>
                <p className="text-xs font-mono text-slate-405 mt-1 mb-5">/{s.slug}</p>
              </div>
              <div className="flex gap-2 border-t border-border/40 pt-4 mt-2">
                <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border border-border/80 text-foreground hover:border-primary hover:text-primary transition-all font-bold">
                  <Pencil className="w-3 h-3" /> Düzenle
                </button>
                <button onClick={() => handleDelete(s.id)} className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border border-border/80 text-slate-450 hover:text-red-405 hover:border-red-500/20 hover:bg-red-500/5 transition-all font-bold">
                  <Trash2 className="w-3 h-3" /> Sil
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
