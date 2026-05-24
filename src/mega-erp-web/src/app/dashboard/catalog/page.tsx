'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  LayoutGrid, Plus, Edit2, Trash2, ChevronRight, ChevronDown,
  FolderOpen, Folder, RefreshCw, Check, X, AlertCircle, Globe
} from 'lucide-react'
import api from '@/lib/api'

interface CatalogCategoryDto {
  id: string
  name: string
  slug: string
  parentId?: string | null
  level: number
  iconUrl?: string | null
  isActive: boolean
  children: CatalogCategoryDto[]
}

interface CatalogNode extends CatalogCategoryDto {
  _expanded: boolean
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  parentId: null as string | null,
  iconUrl: '',
  isActive: true,
}

/** Convert name to slug */
function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Flatten tree to array */
function flatten(nodes: CatalogCategoryDto[]): CatalogCategoryDto[] {
  return nodes.flatMap(n => [n, ...flatten(n.children ?? [])])
}

export default function CatalogPage() {
  const [tree, setTree] = useState<CatalogCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<CatalogCategoryDto[]>('/api/catalog/categories')
      setTree(data)
      // Auto-expand first level
      const rootIds = data.map(n => n.id)
      setExpanded(new Set(rootIds))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const allFlat = useMemo(() => flatten(tree), [tree])
  const stats = useMemo(() => ({
    total: allFlat.length,
    roots: tree.length,
    active: allFlat.filter(c => c.isActive).length,
    maxDepth: Math.max(0, ...allFlat.map(c => c.level)),
  }), [allFlat, tree])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreate = (parentId?: string) => {
    setEditId(null)
    setForm({ ...EMPTY_FORM, parentId: parentId ?? null })
    setError('')
    setShowForm(true)
  }

  const openEdit = (cat: CatalogCategoryDto) => {
    setEditId(cat.id)
    setForm({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ?? null,
      iconUrl: cat.iconUrl ?? '',
      isActive: cat.isActive,
    })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Kategori adı zorunludur.'); return }
    if (!form.slug.trim()) { setError('Slug zorunludur.'); return }
    if (!/^[a-z0-9-]+$/.test(form.slug)) { setError('Slug yalnızca küçük harf, rakam ve tire içerebilir.'); return }

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        parentId: form.parentId || null,
        iconUrl: form.iconUrl?.trim() || null,
        attributeSchemaJson: null,
        ...(editId ? { isActive: form.isActive } : {}),
      }
      if (editId) {
        await api.put(`/api/catalog/categories/${editId}`, { ...body, isActive: form.isActive })
      } else {
        await api.post('/api/catalog/categories', body)
      }
      setShowForm(false)
      setEditId(null)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string | { message?: string } } })?.response?.data
      if (typeof msg === 'string') setError(msg)
      else setError('Kategori kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: CatalogCategoryDto) => {
    if (cat.children?.length) {
      alert('Alt kategorisi olan bir kategori silinemez. Önce alt kategorileri silin.')
      return
    }
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) return
    try {
      await api.delete(`/api/catalog/categories/${cat.id}`)
      await load()
    } catch {
      alert('Kategori silinemedi.')
    }
  }

  const handleToggleActive = async (cat: CatalogCategoryDto) => {
    await api.put(`/api/catalog/categories/${cat.id}`, {
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ?? null,
      iconUrl: cat.iconUrl ?? null,
      attributeSchemaJson: null,
      isActive: !cat.isActive,
    })
    await load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" /> Katalog Kategorileri
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Mağaza ön yüzündeki kategori ağacını yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-surface transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Yeni Kök Kategori
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Kategori', value: stats.total, color: 'text-primary' },
          { label: 'Kök Kategori', value: stats.roots, color: 'text-secondary' },
          { label: 'Aktif', value: stats.active, color: 'text-emerald-400' },
          { label: 'Maks. Derinlik', value: stats.maxDepth, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="premium-card p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-0.5`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              {editId ? 'Kategori Düzenle' : 'Yeni Kategori Oluştur'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Kategori Adı *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  setForm(f => ({
                    ...f,
                    name,
                    // Auto-generate slug on create only
                    ...(editId ? {} : { slug: toSlug(name) }),
                  }))
                }}
                placeholder="Elektronik"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="elektronik"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono"
              />
              {form.slug && (
                <p className="text-xs text-slate-500 mt-1">/kategori/{form.slug}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Üst Kategori</label>
              <select
                value={form.parentId ?? ''}
                onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value || null }))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">— Kök kategori (üst yok) —</option>
                {allFlat
                  .filter(c => c.id !== editId && c.level < 2) // max 3 levels
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {'  '.repeat(c.level)}{c.level > 0 ? '└ ' : ''}{c.name}
                    </option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">İkon URL (isteğe bağlı)</label>
              <input
                type="url"
                value={form.iconUrl}
                onChange={(e) => setForm(f => ({ ...f, iconUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            {editId && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-foreground font-medium">Aktif</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editId ? 'Güncelle' : 'Oluştur'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null) }}
                  className="px-5 py-2 rounded-xl border border-border text-slate-400 hover:text-foreground text-sm transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Category tree */}
      <div className="premium-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">{stats.total} kategori</p>
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(new Set(allFlat.map(c => c.id)))}
              className="text-xs text-slate-400 hover:text-foreground transition-colors"
            >
              Tümünü Aç
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={() => setExpanded(new Set())}
              className="text-xs text-slate-400 hover:text-foreground transition-colors"
            >
              Tümünü Kapat
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" style={{ marginLeft: (i % 3) * 24 }} />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="p-16 text-center">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">Henüz katalog kategorisi yok</p>
            <button
              onClick={() => openCreate()}
              className="text-sm text-primary hover:underline"
            >
              İlk kategoriyi oluştur
            </button>
          </div>
        ) : (
          <div className="py-2">
            <CategoryTree
              nodes={tree}
              expanded={expanded}
              onToggle={toggleExpand}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onAddChild={openCreate}
              depth={0}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryTree({
  nodes, expanded, onToggle, onEdit, onDelete, onToggleActive, onAddChild, depth
}: {
  nodes: CatalogCategoryDto[]
  expanded: Set<string>
  onToggle: (id: string) => void
  onEdit: (cat: CatalogCategoryDto) => void
  onDelete: (cat: CatalogCategoryDto) => void
  onToggleActive: (cat: CatalogCategoryDto) => void
  onAddChild: (parentId: string) => void
  depth: number
}) {
  return (
    <>
      {nodes.map((cat) => {
        const hasChildren = (cat.children?.length ?? 0) > 0
        const isExp = expanded.has(cat.id)
        return (
          <div key={cat.id}>
            <div
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/30 transition-colors group"
              style={{ paddingLeft: `${16 + depth * 24}px` }}
            >
              {/* Expand/collapse */}
              <button
                onClick={() => hasChildren && onToggle(cat.id)}
                className={`w-5 h-5 flex items-center justify-center shrink-0 ${hasChildren ? 'text-slate-400 hover:text-foreground' : 'text-transparent'}`}
              >
                {hasChildren ? (
                  isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : null}
              </button>

              {/* Icon */}
              <span className="shrink-0 text-primary">
                {hasChildren && isExp ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              </span>

              {/* Name + slug */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${cat.isActive ? 'text-foreground' : 'text-slate-500'}`}>
                  {cat.name}
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:block">/{cat.slug}</span>
                {!cat.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">Pasif</span>
                )}
                {hasChildren && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 shrink-0">
                    {cat.children.length} alt
                  </span>
                )}
              </div>

              {/* Actions — visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {depth < 2 && (
                  <button
                    onClick={() => onAddChild(cat.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                    title="Alt kategori ekle"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onEdit(cat)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-700 transition-all"
                  title="Düzenle"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onToggleActive(cat)}
                  className={`p-1.5 rounded-lg transition-all text-xs font-bold ${
                    cat.isActive ? 'text-emerald-400 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                  title={cat.isActive ? 'Pasife Al' : 'Aktife Al'}
                >
                  {cat.isActive ? '✓' : '○'}
                </button>
                <button
                  onClick={() => onDelete(cat)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Children */}
            {hasChildren && isExp && (
              <CategoryTree
                nodes={cat.children}
                expanded={expanded}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                onAddChild={onAddChild}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}
    </>
  )
}
