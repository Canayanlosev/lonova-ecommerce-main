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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mağazalarım</h1>
          <p className="text-sm text-slate-400 mt-1">Her tenant birden fazla mağaza yönetebilir.</p>
        </div>
        <button onClick={openCreate} className="premium-button flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Mağaza
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">{editingId ? 'Mağazayı Düzenle' : 'Yeni Mağaza'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['name', 'slug', 'logoUrl'] as const).map((field) => (
              <div key={field}>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">
                  {field === 'name' ? 'Mağaza Adı' : field === 'slug' ? 'Slug (URL)' : 'Logo URL'}
                </label>
                <input
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-foreground">Aktif</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="premium-button flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Kaydet' : 'Oluştur'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-surface transition-all">İptal</button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="premium-card p-6 animate-pulse">
              <div className="h-5 bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState icon={<Store className="w-8 h-8" />} title="Henüz mağaza yok" description="İlk mağazanızı oluşturun." action={{ label: 'Mağaza Oluştur', onClick: openCreate }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-400/10 text-green-400' : 'bg-slate-400/10 text-slate-400'}`}>
                  {s.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{s.name}</h3>
              <p className="text-sm text-slate-400 mb-4">/{s.slug}</p>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:border-primary transition-all">
                  <Pencil className="w-3 h-3" /> Düzenle
                </button>
                <button onClick={() => handleDelete(s.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-red-400 hover:border-red-400 transition-all">
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
