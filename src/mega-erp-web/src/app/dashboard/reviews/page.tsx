'use client'

import { useEffect, useState } from 'react'
import { Star, Trash2, Search, AlertCircle, MessageSquare, Package, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

interface AdminReview {
  id: string
  productId: string
  productName: string
  buyerUserId: string
  buyerName: string
  rating: number
  comment?: string
  createdAt: string
  isVerifiedPurchase: boolean
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
        />
      ))}
    </div>
  )
}

export default function ReviewsDashboardPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [minRating, setMinRating] = useState<number | ''>('')
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const load = async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) })
      if (minRating) params.set('minRating', String(minRating))
      const { data } = await api.get(`/api/marketplace/admin/reviews?${params}`)
      setReviews(data.items ?? [])
      setTotalCount(data.totalCount ?? 0)
      setPage(p)
    } catch {
      setError('Yorumlar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [minRating])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    try {
      await api.delete(`/api/marketplace/admin/reviews/${id}`)
      setReviews(prev => prev.filter(r => r.id !== id))
      setTotalCount(prev => prev - 1)
    } catch {
      alert('Yorum silinemedi.')
    }
  }

  const filtered = reviews.filter(r =>
    !search ||
    r.productName.toLowerCase().includes(search.toLowerCase()) ||
    r.buyerName.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Ürün Yorumları</h1>
          <p className="text-slate-500">Doğrulanmış alıcı yorumlarını yönetin</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-semibold">{totalCount} Yorum</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Ürün, kullanıcı veya yorum ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <select
          value={minRating}
          onChange={e => setMinRating(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 rounded-xl border border-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Tüm Puanlar</option>
          <option value="5">★★★★★ (5)</option>
          <option value="4">★★★★☆ (4+)</option>
          <option value="3">★★★☆☆ (3+)</option>
          <option value="2">★★☆☆☆ (2+)</option>
          <option value="1">★☆☆☆☆ (1+)</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => load(page)} className="ml-auto underline text-xs">Tekrar Dene</button>
        </div>
      )}

      {/* Reviews table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Ürün</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Puan</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Yorum</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Tarih</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-4 bg-slate-700/40 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
                        <MessageSquare className="w-10 h-10 text-slate-600" />
                        <p>Yorum bulunamadı</p>
                      </div>
                    </td>
                  </tr>
                )
                : filtered.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[120px] lg:max-w-[200px]">
                          {r.productName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {r.buyerName}
                        {r.isVerifiedPurchase && (
                          <span title="Doğrulanmış Alıcı">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StarDisplay rating={r.rating} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                      <span className="text-xs truncate max-w-[200px] block">
                        {r.comment ?? <span className="italic text-slate-600">Yorum yok</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                      {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Yorumu sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-slate-400">{totalCount} yorum, sayfa {page}/{totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-surface transition-colors"
              >
                ← Önceki
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-surface transition-colors"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
