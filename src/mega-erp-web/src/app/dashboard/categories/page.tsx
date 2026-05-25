'use client'

import { useEffect, useState } from 'react'
import { Plus, PencilLine, Trash2, AlertCircle, Folder, FolderOpen, ChevronRight, X, Check } from 'lucide-react'
import { categoriesService } from '@/lib/services/categories.service'
import { useToast } from '@/store/ui.store'
import type { Category, CreateCategoryRequest } from '@/types/api.types'

interface CategoryNode extends Category {
  children: CategoryNode[]
}

function buildTree(cats: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []
  for (const c of cats) map.set(c.id, { ...c, children: [] })
  for (const c of cats) {
    const node = map.get(c.id)!
    if (c.parentCategoryId) {
      const parent = map.get(c.parentCategoryId)
      if (parent) parent.children.push(node)
      else roots.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

interface FormState {
  name: string
  description: string
  parentCategoryId: string
}

const emptyForm: FormState = { name: '', description: '', parentCategoryId: '' }

function CategoryRow({
  node, depth, allCategories, onEdit, onDelete,
}: {
  node: CategoryNode
  depth: number
  allCategories: Category[]
  onEdit: (cat: Category) => void
  onDelete: (cat: Category) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  return (
    <>
      <tr className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-primary transition-colors shrink-0">
                {open ? <FolderOpen size={16} className="text-amber-400" /> : <Folder size={16} className="text-amber-500" />}
              </button>
            ) : (
              <span className="w-4 shrink-0">
                {depth > 0 && <ChevronRight size={14} className="text-slate-600" />}
              </span>
            )}
            <span className="font-semibold text-sm text-foreground">{node.name}</span>
            {hasChildren && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full font-bold">
                {node.children.length}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">
          {node.description || <span className="text-slate-600 italic text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell font-mono font-semibold">
          {allCategories.find(c => c.id === node.parentCategoryId)?.name ?? (node.parentCategoryId ? '...' : <span className="text-slate-600">—</span>)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onEdit(node)}
              className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-primary/10 text-primary transition-colors"
              title="Düzenle"
            >
              <PencilLine size={15} />
            </button>
            <button
              onClick={() => onDelete(node)}
              className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-red-500/10 text-red-500 transition-colors"
              title="Sil"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>
      {open && node.children.map(child => (
        <CategoryRow
          key={child.id}
          node={child}
          depth={depth + 1}
          allCategories={allCategories}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

export default function CategoriesPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await categoriesService.getAll()
      setCategories(data)
    } catch {
      setError('Kategoriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditId(cat.id)
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      parentCategoryId: cat.parentCategoryId ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?\nBu kategoriye bağlı ürünler etkilenebilir.`)) return
    try {
      await categoriesService.delete(cat.id)
      toast.success(`"${cat.name}" silindi.`)
      load()
    } catch {
      toast.error('Kategori silinemedi.')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Kategori adı zorunludur.'); return }
    setSaving(true)
    setFormError('')
    const req: CreateCategoryRequest = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      parentCategoryId: form.parentCategoryId || null,
    }
    try {
      if (editId) {
        await categoriesService.update(editId, req)
        toast.success('Kategori güncellendi.')
      } else {
        await categoriesService.create(req)
        toast.success('Kategori oluşturuldu.')
      }
      setShowModal(false)
      load()
    } catch {
      setFormError('İşlem başarısız. Lütfen tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  const tree = buildTree(categories)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Kategoriler</h1>
          <p className="text-slate-500">Ürün kategorilerini yönetin</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={16} /> Yeni Kategori
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Toplam Kategori</p>
          <p className="text-2xl font-black">{categories.length}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Ana Kategori</p>
          <p className="text-2xl font-black text-amber-400">{tree.length}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Alt Kategori</p>
          <p className="text-2xl font-black text-primary">{categories.filter(c => c.parentCategoryId).length}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Derinlik</p>
          <p className="text-2xl font-black text-emerald-400">
            {tree.some(c => c.children.length > 0) ? '2+' : '1'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={load} className="ml-auto underline text-xs">Tekrar Dene</button>
        </div>
      )}

      {/* Category tree table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Kategori</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Açıklama</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Üst Kategori</th>
                <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded animate-pulse" style={{ width: `${60 + i * 5}%` }} />
                    </td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
                      <Folder className="w-10 h-10 text-slate-600 animate-pulse" />
                      <p className="font-medium">Henüz kategori yok</p>
                      <button onClick={openCreate} className="text-primary hover:underline text-sm font-semibold">
                        İlk kategoriyi oluştur
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tree.map(node => (
                  <CategoryRow
                    key={node.id}
                    node={node}
                    depth={0}
                    allCategories={categories}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-border/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-950/20">
              <h2 className="text-base font-bold text-foreground">{editId ? 'Kategori Düzenle' : 'Yeni Kategori'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Kategori Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Elektronik, Giyim..."
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-slate-950/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-foreground"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Kategori hakkında kısa açıklama (opsiyonel)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-slate-950/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all resize-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Üst Kategori</label>
                <select
                  value={form.parentCategoryId}
                  onChange={e => setForm(f => ({ ...f, parentCategoryId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-slate-950/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all text-foreground font-semibold cursor-pointer"
                >
                  <option value="">— Ana Kategori (üst yok) —</option>
                  {categories
                    .filter(c => c.id !== editId) // prevent self-parent
                    .filter(c => !c.parentCategoryId) // only top-level as parent options
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-slate-950/20">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-primary/20"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                {editId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
