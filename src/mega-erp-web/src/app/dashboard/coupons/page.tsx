'use client'

import { useEffect, useState, useMemo } from 'react'
import { Tag, Plus, Trash2, Edit2, Check, X, RefreshCw, Copy, CheckCheck, Zap, BarChart3, Clock, Sparkles } from 'lucide-react'
import api from '@/lib/api'

interface CouponDto {
  id: string
  code: string
  discountType: 'Percent' | 'Fixed'
  discountValue: number
  minimumOrderAmount: number
  maxUses: number
  usedCount: number
  expiresAt?: string | null
  isActive: boolean
}

const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

const EMPTY_FORM = {
  code: '',
  discountType: 'Percent' as 'Percent' | 'Fixed',
  discountValue: 10,
  minimumOrderAmount: 0,
  maxUses: 0,
  expiresAt: '',
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/marketplace/admin/coupons')
      setCoupons(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.code.trim()) { setError('Kupon kodu zorunludur.'); return }
    if (form.discountValue <= 0) { setError('İndirim değeri 0\'dan büyük olmalıdır.'); return }

    setSaving(true)
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minimumOrderAmount: Number(form.minimumOrderAmount),
        maxUses: Number(form.maxUses),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }
      if (editId) {
        await api.put(`/api/marketplace/admin/coupons/${editId}`, body)
      } else {
        await api.post('/api/marketplace/admin/coupons', body)
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data
      setError(typeof msg === 'string' ? msg : 'Kupon kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (c: CouponDto) => {
    setEditId(c.id)
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minimumOrderAmount: c.minimumOrderAmount,
      maxUses: c.maxUses,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    })
    setError('')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return
    await api.delete(`/api/marketplace/admin/coupons/${id}`)
    await load()
  }

  const handleToggle = async (c: CouponDto) => {
    await api.put(`/api/marketplace/admin/coupons/${c.id}`, { isActive: !c.isActive })
    await load()
  }

  const isExpired = (expiresAt?: string | null) =>
    expiresAt ? new Date(expiresAt) < new Date() : false

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = coupons.filter(c => c.isActive && !isExpired(c.expiresAt)).length
    const expired = coupons.filter(c => isExpired(c.expiresAt)).length
    const totalUses = coupons.reduce((s, c) => s + c.usedCount, 0)
    const almostFull = coupons.filter(c => c.maxUses > 0 && c.usedCount / c.maxUses >= 0.9 && !isExpired(c.expiresAt)).length
    return { active, expired, totalUses, almostFull }
  }, [coupons])

  // ── Random code generator ─────────────────────────────────────────────────
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setForm(prev => ({ ...prev, code }))
  }

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" /> Kupon Yönetimi
          </h1>
          <p className="text-slate-400 text-sm mt-1">{coupons.length} kupon tanımlı</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); setError('') }}
            className="premium-button flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Yeni Kupon
          </button>
        </div>
      </div>

      {/* Stats banner */}
      {!loading && coupons.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Tag className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Aktif Kupon</p>
              <p className="text-xl font-black text-foreground">{stats.active}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Toplam Kullanım</p>
              <p className="text-xl font-black text-foreground">{stats.totalUses}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Süresi Dolan</p>
              <p className="text-xl font-black text-foreground">{stats.expired}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stats.almostFull > 0 ? 'bg-amber-500/15' : 'bg-slate-700/50'}`}>
              <Sparkles className={`w-4.5 h-4.5 ${stats.almostFull > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Dolmak Üzere</p>
              <p className={`text-xl font-black ${stats.almostFull > 0 ? 'text-amber-400' : 'text-foreground'}`}>{stats.almostFull}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">{editId ? 'Kuponu Düzenle' : 'Yeni Kupon Oluştur'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-slate-400 hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Kupon Kodu *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="YAZA20"
                  disabled={!!editId}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50 font-mono"
                />
                {!editId && (
                  <button
                    type="button"
                    onClick={generateCode}
                    title="Rastgele kod üret"
                    className="px-2.5 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors shrink-0"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">İndirim Tipi</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as 'Percent' | 'Fixed' })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="Percent">Yüzde (%)</option>
                <option value="Fixed">Sabit Tutar (₺)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                İndirim Değeri {form.discountType === 'Percent' ? '(%)' : '(₺)'}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                min={0.01}
                max={form.discountType === 'Percent' ? 100 : undefined}
                step={0.01}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Min. Sepet Tutarı (₺)</label>
              <input
                type="number"
                value={form.minimumOrderAmount}
                onChange={(e) => setForm({ ...form, minimumOrderAmount: Number(e.target.value) })}
                min={0}
                step={0.01}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Max. Kullanım (0 = sınırsız)</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                min={0}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Son Kullanma Tarihi</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="premium-button flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editId ? 'Güncelle' : 'Oluştur'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null) }}
                  className="px-5 py-2 rounded-xl border border-border text-slate-400 hover:text-foreground hover:bg-surface text-sm transition-all"
                >
                  İptal
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table */}
      <div className="premium-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Henüz kupon tanımlı değil</p>
            <button
              onClick={() => { setShowForm(true); setError('') }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              İlk kuponu oluştur
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-slate-400">
                  <th className="px-4 py-3 text-left">Kod</th>
                  <th className="px-4 py-3 text-left">İndirim</th>
                  <th className="px-4 py-3 text-left">Min. Tutar</th>
                  <th className="px-4 py-3 text-left">Kullanım</th>
                  <th className="px-4 py-3 text-left">Son Tarih</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => {
                  const expired = isExpired(c.expiresAt)
                  const usagePct = c.maxUses > 0 ? Math.min(100, (c.usedCount / c.maxUses) * 100) : null
                  const isCopied = copiedId === c.id
                  return (
                    <tr key={c.id} className={`hover:bg-slate-800/30 transition-colors ${!c.isActive || expired ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleCopy(c.code, c.id)}
                            className="p-1 rounded text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Kopyala"
                          >
                            {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {c.discountType === 'Percent'
                          ? `%${c.discountValue}`
                          : fmt(c.discountValue)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.minimumOrderAmount > 0 ? fmt(c.minimumOrderAmount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className="text-slate-400 text-xs">
                            {c.usedCount}{c.maxUses > 0 ? ` / ${c.maxUses}` : ' / ∞'}
                          </span>
                          {usagePct !== null && (
                            <div className="w-24 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.expiresAt
                          ? <span className={expired ? 'text-red-400' : ''}>{new Date(c.expiresAt).toLocaleDateString('tr-TR')}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(c)}
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                            c.isActive && !expired
                              ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400'
                              : 'bg-red-500/10 text-red-400 hover:bg-green-500/10 hover:text-green-400'
                          }`}
                        >
                          {expired ? 'Süresi Doldu' : c.isActive ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-700 transition-all"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
