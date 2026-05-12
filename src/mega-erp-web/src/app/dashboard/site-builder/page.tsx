'use client'

import { useEffect, useState } from 'react'
import { Plus, Layout, Pencil, Trash2, Eye, Globe, FileText, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { EmptyState } from '@/components/ui/EmptyState'

interface SitePage { id: string; storeId: string; slug: string; title: string; isPublished: boolean; blocks: PageBlock[] }
interface PageBlock { id: string; blockType: string; order: number; contentJson: string }

const BLOCK_TYPES = ['Hero', 'ProductGrid', 'About', 'FAQ', 'Contact', 'Custom']

export default function SiteBuilderPage() {
  const [pages, setPages] = useState<SitePage[]>([])
  const [selectedPage, setSelectedPage] = useState<SitePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPage, setNewPage] = useState({ storeId: '', slug: '', title: '' })
  const [saving, setSaving] = useState(false)
  const [addingBlock, setAddingBlock] = useState(false)
  const [newBlock, setNewBlock] = useState({ blockType: 'Hero', order: 0, contentJson: '{}' })

  const fetchPages = () => {
    api.get('/api/site-builder/pages').then((r) => {
      setPages(r.data)
      if (selectedPage) {
        const updated = r.data.find((p: SitePage) => p.id === selectedPage.id)
        if (updated) setSelectedPage(updated)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPages() }, [])

  const handleCreatePage = async () => {
    setSaving(true)
    try {
      await api.post('/api/site-builder/pages', newPage)
      setShowNewPage(false)
      setNewPage({ storeId: '', slug: '', title: '' })
      fetchPages()
    } catch { } finally { setSaving(false) }
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
      setNewBlock({ blockType: 'Hero', order: selectedPage.blocks.length, contentJson: '{}' })
      fetchPages()
    } catch { } finally { setSaving(false) }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!selectedPage) return
    await api.delete(`/api/site-builder/pages/${selectedPage.id}/blocks/${blockId}`)
    fetchPages()
  }

  const BLOCK_ICONS: Record<string, string> = {
    Hero: '🦸', ProductGrid: '🛍️', About: 'ℹ️', FAQ: '❓', Contact: '📧', Custom: '✨',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Site Builder</h1>
          <p className="text-sm text-slate-400 mt-1">Mağaza sayfalarını blok tabanlı olarak oluşturun</p>
        </div>
        <button onClick={() => setShowNewPage(true)} className="premium-button flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Sayfa
        </button>
      </div>

      {showNewPage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Yeni Sayfa Oluştur</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([['title', 'Sayfa Başlığı'], ['slug', 'Slug (URL)'], ['storeId', 'Mağaza ID']] as const).map(([field, label]) => (
              <div key={field}>
                <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                <input value={newPage[field]} onChange={(e) => setNewPage((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreatePage} disabled={saving} className="premium-button flex items-center gap-2 disabled:opacity-60">
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
                className={`premium-card p-4 cursor-pointer transition-all ${selectedPage?.id === page.id ? 'border-primary' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground text-sm">{page.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${page.isPublished ? 'bg-green-400/10 text-green-400' : 'bg-slate-400/10 text-slate-400'}`}>
                    {page.isPublished ? 'Yayında' : 'Taslak'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">/{page.slug}</p>
                <p className="text-xs text-slate-500 mt-1">{page.blocks.length} blok</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); handlePublish(page) }}
                    className="text-xs px-2 py-1 rounded border border-border hover:border-primary transition-all flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {page.isPublished ? 'Yayından Al' : 'Yayınla'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id) }}
                    className="text-xs px-2 py-1 rounded border border-border text-red-400 hover:border-red-400 transition-all flex items-center gap-1">
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
                <button onClick={() => setAddingBlock(true)} className="premium-button text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Blok Ekle
                </button>
              </div>

              {addingBlock && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Blok Tipi</label>
                      <select value={newBlock.blockType} onChange={(e) => setNewBlock((b) => ({ ...b, blockType: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        {BLOCK_TYPES.map((t) => <option key={t} value={t}>{BLOCK_ICONS[t]} {t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Sıra</label>
                      <input type="number" value={newBlock.order} onChange={(e) => setNewBlock((b) => ({ ...b, order: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">İçerik (JSON)</label>
                    <textarea value={newBlock.contentJson} onChange={(e) => setNewBlock((b) => ({ ...b, contentJson: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddBlock} disabled={saving} className="premium-button text-sm flex items-center gap-1.5 disabled:opacity-60">
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Ekle
                    </button>
                    <button onClick={() => setAddingBlock(false)} className="px-3 py-1.5 rounded-lg border border-border text-foreground text-sm hover:bg-surface">İptal</button>
                  </div>
                </motion.div>
              )}

              {selectedPage.blocks.length === 0 ? (
                <div className="premium-card p-12 text-center">
                  <Layout className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Bu sayfada henüz blok yok. Blok ekleyin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...selectedPage.blocks].sort((a, b) => a.order - b.order).map((block) => (
                    <motion.div key={block.id} layout className="premium-card p-4 flex items-center gap-4">
                      <span className="text-2xl">{BLOCK_ICONS[block.blockType] ?? '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{block.blockType}</p>
                        <p className="text-xs text-slate-400 truncate font-mono">{block.contentJson}</p>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">#{block.order}</span>
                      <button onClick={() => handleDeleteBlock(block.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
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
