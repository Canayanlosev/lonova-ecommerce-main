'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Star, Trash2, Search, AlertCircle, MessageSquare, Package, CheckCircle, Reply, Loader2, X, TrendingUp, Award, ThumbsUp } from 'lucide-react'
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
  sellerReply?: string
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySaving, setReplySaving] = useState(false)

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

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return
    setReplySaving(true)
    try {
      await api.post(`/api/marketplace/admin/reviews/${id}/reply`, { reply: replyText.trim() })
      setReviews(prev => prev.map(r => r.id === id ? { ...r, sellerReply: replyText.trim() } : r))
      setReplyingTo(null)
      setReplyText('')
    } catch {
      alert('Yanıt gönderilemedi.')
    } finally {
      setReplySaving(false)
    }
  }

  const filtered = reviews.filter(r =>
    !search ||
    r.productName.toLowerCase().includes(search.toLowerCase()) ||
    r.buyerName.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(totalCount / pageSize)

  // ── Stats computed from loaded reviews (not filtered) ──────────────────────
  const stats = useMemo(() => {
    if (reviews.length === 0) return null
    const sum = reviews.reduce((s, r) => s + r.rating, 0)
    const avg = sum / reviews.length
    const dist = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
    }))
    const verifiedCount = reviews.filter(r => r.isVerifiedPurchase).length
    const withReplyCount = reviews.filter(r => r.sellerReply).length
    return { avg, dist, verifiedCount, withReplyCount }
  }, [reviews])

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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-slate-950/20 dark:bg-slate-900/40 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-all"
          />
        </div>
        <select
          value={minRating}
          onChange={e => setMinRating(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 rounded-xl border border-border bg-slate-950/20 dark:bg-slate-900/40 text-sm outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer font-semibold"
        >
          <option value="">Tüm Puanlar</option>
          <option value="5">★★★★★ (5)</option>
          <option value="4">★★★★☆ (4+)</option>
          <option value="3">★★★☆☆ (3+)</option>
          <option value="2">★★☆☆☆ (2+)</option>
          <option value="1">★☆☆☆☆ (1+)</option>
        </select>
      </div>

      {/* Stats summary */}
      {!loading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Average rating */}
          <div className="premium-card p-5 flex items-center gap-4 col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Ortalama Puan</p>
              <p className="text-2xl font-black text-foreground">{stats.avg.toFixed(1)}</p>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= Math.round(stats.avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                ))}
              </div>
            </div>
          </div>
          {/* Verified purchases */}
          <div className="premium-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Doğrulanmış</p>
              <p className="text-2xl font-black text-foreground">{stats.verifiedCount}</p>
              <p className="text-[11px] text-slate-500">{reviews.length > 0 ? Math.round((stats.verifiedCount / reviews.length) * 100) : 0}% oran</p>
            </div>
          </div>
          {/* Replied */}
          <div className="premium-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <ThumbsUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Yanıtlanan</p>
              <p className="text-2xl font-black text-foreground">{stats.withReplyCount}</p>
              <p className="text-[11px] text-slate-500">{reviews.length > 0 ? Math.round((stats.withReplyCount / reviews.length) * 100) : 0}% oran</p>
            </div>
          </div>
          {/* Distribution mini-bars */}
          <div className="premium-card p-5 col-span-2 lg:col-span-1">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Puan Dağılımı</p>
            <div className="space-y-1.5">
              {stats.dist.map(({ star, count }) => {
                const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 w-4 text-right font-medium">{star}</span>
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-slate-500 w-7 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => load(page)} className="ml-auto underline text-xs font-bold hover:text-white transition-all">Tekrar Dene</button>
        </div>
      )}

      {/* Reviews table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">Kullanıcı</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Puan</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Yorum</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Tarih</th>
                <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
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
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate max-w-[120px] lg:max-w-[200px]">
                            {r.productName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell font-semibold">
                        <div className="flex items-center gap-1.5">
                          {r.buyerName}
                          {r.isVerifiedPurchase && (
                            <span title="Doğrulanmış Alıcı" className="px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StarDisplay rating={r.rating} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                        <div>
                          <span className="text-xs truncate max-w-[200px] block">
                            {r.comment ?? <span className="italic text-slate-600">Yorum yok</span>}
                          </span>
                          {r.sellerReply && (
                            <div className="mt-1.5 flex items-start gap-1 text-[10px] text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg w-fit">
                              <Reply className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                              <span className="italic truncate max-w-[180px] font-semibold">{r.sellerReply}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell font-semibold">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setReplyingTo(replyingTo === r.id ? null : r.id); setReplyText(r.sellerReply ?? '') }}
                            className={`p-1.5 rounded-lg border border-transparent hover:border-border transition-colors ${r.sellerReply ? 'text-primary' : 'text-slate-400 hover:text-primary'} hover:bg-primary/10`}
                            title={r.sellerReply ? 'Yanıtı düzenle' : 'Yanıtla'}
                          >
                            <Reply size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Yorumu sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {replyingTo === r.id && (
                      <tr className="bg-primary/5">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Reply className="w-4 h-4 text-primary mt-2 shrink-0" />
                            <div className="flex-1 space-y-2">
                              <textarea
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Müşteriye yanıtınızı yazın..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl bg-slate-950/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none font-semibold placeholder-slate-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReply(r.id)}
                                  disabled={replySaving || !replyText.trim()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold transition-opacity disabled:opacity-60"
                                >
                                  {replySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Reply className="w-3 h-3" />}
                                  Yanıtı Kaydet
                                </button>
                                <button
                                  onClick={() => { setReplyingTo(null); setReplyText('') }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs text-slate-400 hover:text-foreground transition-colors font-semibold"
                                >
                                  <X className="w-3 h-3" /> İptal
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-slate-950/20 dark:bg-slate-900/40">
            <p className="text-xs text-slate-400 font-semibold">{totalCount} yorum, sayfa {page}/{totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-xl border border-border disabled:opacity-40 hover:bg-slate-800 transition-colors font-semibold"
              >
                ← Önceki
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-xl border border-border disabled:opacity-40 hover:bg-slate-800 transition-colors font-semibold"
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
