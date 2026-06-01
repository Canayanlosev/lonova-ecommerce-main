'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Layout, Trash2, Eye, Globe, FileText, Loader2, RefreshCw, AlertTriangle, Store } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/store/ui.store'

interface SitePage { id: string; storeId: string; slug: string; title: string; isPublished: boolean; blocks: PageBlock[] }
interface PageBlock { id: string; blockType: string; order: number; contentJson: string }
interface EcomStore { id: string; name: string; slug: string; isActive: boolean }

const BLOCK_TYPES = ['Hero', 'ProductGrid', 'About', 'FAQ', 'Contact', 'Custom']

const BLOCK_META: Record<string, { emoji: string; label: string; description: string; template: Record<string, unknown> }> = {
  Hero: {
    emoji: '🦸',
    label: 'Hero',
    description: 'Sayfa başlık bölümü, büyük başlık ve CTA butonu',
    template: { heading: 'Mağazanıza Hoş Geldiniz', subheading: 'En iyi ürünleri en uygun fiyata keşfedin', ctaText: 'Alışverişe Başla', ctaHref: '/kategori', bgColor: '#0f172a' },
  },
  ProductGrid: {
    emoji: '🛍️',
    label: 'Ürün Grid',
    description: 'Seçili ürünleri kart grid olarak gösterir',
    template: { title: 'Öne Çıkan Ürünler', categoryId: '', limit: 8, columns: 4 },
  },
  About: {
    emoji: 'ℹ️',
    label: 'Hakkımızda',
    description: 'Firma tanıtım metni ve görsel',
    template: { title: 'Hakkımızda', body: 'Firmamız hakkında kısa bir tanıtım metni buraya gelecek.', imageUrl: '' },
  },
  FAQ: {
    emoji: '❓',
    label: 'SSS',
    description: 'Sıkça sorulan sorular accordion',
    template: { title: 'Sıkça Sorulan Sorular', items: [{ q: 'Kargo süreniz nedir?', a: 'Siparişleriniz 1-3 iş günü içinde kargoya verilir.' }, { q: 'İade politikanız nedir?', a: '14 gün içinde iade kabul ediyoruz.' }] },
  },
  Contact: {
    emoji: '📧',
    label: 'İletişim',
    description: 'İletişim bilgileri ve form',
    template: { title: 'Bize Ulaşın', email: 'info@firma.com', phone: '+90 555 000 00 00', address: 'İstanbul, Türkiye' },
  },
  Custom: {
    emoji: '✨',
    label: 'Özel',
    description: 'Serbest HTML/JSON içerik bloğu',
    template: { html: '<p>Özel içerik buraya gelir.</p>' },
  },
}

export default function SiteBuilderPage() {
  const toast = useToast()
  const [pages, setPages] = useState<SitePage[]>([])
  const [stores, setStores] = useState<EcomStore[]>([])
  const [selectedPage, setSelectedPage] = useState<SitePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPage, setNewPage] = useState({ storeId: '', slug: '', title: '' })
  const [saving, setSaving] = useState(false)
  const [creatingStore, setCreatingStore] = useState(false)
  const [addingBlock, setAddingBlock] = useState(false)
  const [newBlock, setNewBlock] = useState(() => ({
    blockType: 'Hero',
    order: 0,
    contentJson: JSON.stringify(BLOCK_META['Hero'].template, null, 2),
  }))

  const fetchPages = () => {
    api.get('/api/site-builder/pages').then((r) => {
      setPages(r.data)
      if (selectedPage) {
        const updated = r.data.find((p: SitePage) => p.id === selectedPage.id)
        if (updated) setSelectedPage(updated)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const fetchStores = () => {
    api.get('/api/ecommerce/stores').then((r) => {
      const list: EcomStore[] = r.data ?? []
      setStores(list)
      if (list.length > 0 && !newPage.storeId) {
        setNewPage(p => ({ ...p, storeId: list[0].id }))
      }
    }).catch(() => {})
  }

  const handleCreateDefaultStore = async () => {
    setCreatingStore(true)
    try {
      const res = await api.post('/api/ecommerce/stores', { name: 'Ana Mağaza', slug: 'ana-magaza', isActive: true })
      const created: EcomStore = res.data
      setStores([created])
      setNewPage(p => ({ ...p, storeId: created.id }))
      toast.success('Ana Mağaza oluşturuldu')
    } catch {
      toast.error('Mağaza oluşturulamadı')
    } finally {
      setCreatingStore(false)
    }
  }

  useEffect(() => {
    fetchStores()
    fetchPages()
  }, [])

  const handleCreatePage = async () => {
    if (!newPage.storeId) { toast.error('Önce bir mağaza seçin'); return }
    if (!newPage.title.trim()) { toast.error('Sayfa başlığı zorunludur'); return }
    if (!newPage.slug.trim()) { toast.error('Slug zorunludur'); return }
    setSaving(true)
    try {
      await api.post('/api/site-builder/pages', newPage)
      setShowNewPage(false)
      setNewPage(p => ({ storeId: p.storeId, slug: '', title: '' }))
      fetchPages()
      toast.success('Sayfa oluşturuldu')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { title?: string } } })?.response?.data?.title ?? 'Sayfa oluşturulamadı'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const handleDeletePage = async (id: string) => {
    if (!confirm('Bu sayfa silinecek. Emin misiniz?')) return
    await api.delete(`/api/site-builder/pages/${id}`)
    if (selectedPage?.id === id) setSelectedPage(null)
    fetchPages()
  }

  const handlePublish = async (page: SitePage) => {
    await api.put(`/api/site-builder/pages/${page.id}`, { slug: page.slug, title: page.title, isPublished: !page.isPublished })
    fetchPages()
  }

  const handleAddBlock = async () => {
    if (!selectedPage) return
    setSaving(true)
    try {
      await api.post(`/api/site-builder/pages/${selectedPage.id}/blocks`, newBlock)
      setAddingBlock(false)
      const defaultType = 'Hero'
      setNewBlock({ blockType: defaultType, order: selectedPage.blocks.length, contentJson: JSON.stringify(BLOCK_META[defaultType].template, null, 2) })
      fetchPages()
    } catch { } finally { setSaving(false) }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!selectedPage) return
    await api.delete(`/api/site-builder/pages/${selectedPage.id}/blocks/${blockId}`)
    fetchPages()
  }

  // Stats
  const stats = useMemo(() => ({
    total: pages.length,
    published: pages.filter(p => p.isPublished).length,
    draft: pages.filter(p => !p.isPublished).length,
    totalBlocks: pages.reduce((s, p) => s + p.blocks.length, 0),
  }), [pages])

  const applyTemplate = (blockType: string) => {
    const tmpl = BLOCK_META[blockType]?.template ?? {}
    setNewBlock(b => ({ ...b, blockType, contentJson: JSON.stringify(tmpl, null, 2) }))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Layout className="w-8 h-8 text-primary" /> Site Builder
          </h1>
          <p className="text-slate-400 text-sm font-semibold mt-0.5">Mağaza sayfalarını blok tabanlı olarak oluşturun</p>
        </div>
        <button onClick={() => setShowNewPage(true)} className="premium-button flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Sayfa
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Sayfa',    value: stats.total,       color: 'bg-primary/10 text-primary border border-primary/20' },
            { label: 'Yayında',         value: stats.published,   color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
            { label: 'Taslak',          value: stats.draft,       color: 'bg-slate-800/60 text-slate-400 border border-border/80' },
            { label: 'Toplam Blok',     value: stats.totalBlocks, color: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
          ].map(({ label, value, color }) => (
            <div key={label} className="premium-card p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${color}`}>#</div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-xl font-black text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewPage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Yeni Sayfa Oluştur</h2>

          {/* No stores warning */}
          {stores.length === 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300 flex-1">Henüz mağaza yok. Sayfa oluşturmak için önce bir mağaza gerekli.</p>
              <button onClick={handleCreateDefaultStore} disabled={creatingStore}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 disabled:opacity-60 transition-colors shrink-0">
                {creatingStore ? <Loader2 size={12} className="animate-spin" /> : <Store size={12} />}
                Ana Mağaza Oluştur
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Sayfa Başlığı</label>
              <input value={newPage.title} onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))}
                placeholder="Örn: Ana Sayfa"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Slug (URL)</label>
              <input value={newPage.slug} onChange={e => setNewPage(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="Örn: anasayfa"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Mağaza</label>
              {stores.length > 0 ? (
                <select value={newPage.storeId} onChange={e => setNewPage(p => ({ ...p, storeId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <input disabled placeholder="Önce mağaza oluşturun"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-slate-500 text-sm opacity-50 cursor-not-allowed" />
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreatePage} disabled={saving || stores.length === 0} className="premium-button flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Oluştur
            </button>
            <button onClick={() => setShowNewPage(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-surface">İptal</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Page list */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Sayfalar</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="premium-card p-4 animate-pulse"><div className="h-4 bg-slate-700 rounded w-3/4" /></div>
            ))}</div>
          ) : pages.length === 0 ? (
            <EmptyState icon={<FileText className="w-8 h-8" />} title="Sayfa yok" description="İlk sayfanızı oluşturun." action={{ label: 'Sayfa Ekle', onClick: () => setShowNewPage(true) }} />
          ) : (
            pages.map((page) => (
              <div key={page.id}
                onClick={() => setSelectedPage(page)}
                className={`premium-card p-4 cursor-pointer transition-all ${
                  selectedPage?.id === page.id 
                    ? 'border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5 bg-slate-900/30' 
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-foreground text-sm">{page.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    page.isPublished 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {page.isPublished ? 'Yayında' : 'Taslak'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400">/{page.slug}</p>
                <p className="text-xs text-slate-500 mt-1">{page.blocks.length} blok</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); handlePublish(page) }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border hover:border-primary hover:text-primary transition-all flex items-center gap-1.5 font-medium"
                  >
                    <Globe className="w-3 h-3" /> {page.isPublished ? 'Yayından Al' : 'Yayınla'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id) }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border text-slate-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Block editor */}
        <div className="lg:col-span-2">
          {selectedPage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">{selectedPage.title} — Bloklar</h2>
                <button onClick={() => { setAddingBlock(true); setNewBlock({ blockType: 'Hero', order: selectedPage.blocks.length, contentJson: JSON.stringify(BLOCK_META['Hero'].template, null, 2) }) }} className="premium-button text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Blok Ekle
                </button>
              </div>

              {addingBlock && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-5 space-y-4 border-primary/20">
                  <h3 className="text-sm font-bold text-foreground">Yeni Blok Ekle</h3>
                  {/* Block type cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {BLOCK_TYPES.map((t) => {
                      const meta = BLOCK_META[t]
                      return (
                        <button
                          key={t}
                          onClick={() => applyTemplate(t)}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                            newBlock.blockType === t
                              ? 'border-primary bg-primary/10 text-foreground shadow-sm shadow-primary/10'
                              : 'border-border bg-slate-950/20 hover:border-slate-600 text-slate-400 hover:text-foreground'
                          }`}
                        >
                          <span className="text-lg leading-none">{meta.emoji}</span>
                          <span className="text-xs font-bold leading-tight">{meta.label}</span>
                          <span className="text-[10px] text-slate-500 leading-tight line-clamp-2">{meta.description}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="text-xs font-bold text-slate-400 mb-1 block uppercase tracking-wider">Sıra</label>
                      <input type="number" value={newBlock.order} onChange={(e) => setNewBlock((b) => ({ ...b, order: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">İçerik (JSON)</label>
                        <button
                          onClick={() => applyTemplate(newBlock.blockType)}
                          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-bold transition-colors"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Şablonu Sıfırla
                        </button>
                      </div>
                      <textarea value={newBlock.contentJson} onChange={(e) => setNewBlock((b) => ({ ...b, contentJson: e.target.value }))} rows={5}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddBlock} disabled={saving} className="premium-button text-sm flex items-center gap-1.5 disabled:opacity-60">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Blok Ekle
                    </button>
                    <button onClick={() => setAddingBlock(false)} className="px-3 py-1.5 rounded-lg border border-border text-foreground text-sm hover:bg-surface transition-colors">İptal</button>
                  </div>
                </motion.div>
              )}

              {selectedPage.blocks.length === 0 ? (
                <div className="premium-card p-12 text-center">
                  <Layout className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Bu sayfada henüz blok yok. Blok ekleyin.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...selectedPage.blocks].sort((a, b) => a.order - b.order).map((block) => {
                    const meta = BLOCK_META[block.blockType]
                    let preview = ''
                    try {
                      const parsed = JSON.parse(block.contentJson)
                      preview = parsed.heading ?? parsed.title ?? parsed.html ?? ''
                    } catch { preview = block.contentJson }
                    return (
                      <motion.div key={block.id} layout className="premium-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
                        <span className="text-xl shrink-0">{meta?.emoji ?? '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground text-sm">{meta?.label ?? block.blockType}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500 border border-border/60 font-mono">#{block.order}</span>
                          </div>
                          {preview && <p className="text-xs text-slate-400 truncate mt-0.5">{String(preview).slice(0, 80)}</p>}
                        </div>
                        <button onClick={() => handleDeleteBlock(block.id)}
                          className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {selectedPage.isPublished && (
                <div className="premium-card p-4 flex items-center gap-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-sm text-slate-400">Önizleme URL:</span>
                  <code className="text-xs text-primary">
                    {`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/site-builder/render/[storeSlug]/${selectedPage.slug}`}
                  </code>
                </div>
              )}
            </div>
          ) : (
            <div className="premium-card p-12 text-center h-full flex flex-col items-center justify-center">
              <Layout className="w-12 h-12 text-slate-500 mb-4" />
              <p className="text-slate-400">Sol panelden bir sayfa seçin veya yeni sayfa oluşturun.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
