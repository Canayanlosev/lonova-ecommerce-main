'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { marketplaceService } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

const AVATAR_COLORS = [
  { id: 'violet', bg: 'bg-violet-600', hex: '#7c3aed' },
  { id: 'blue', bg: 'bg-blue-600', hex: '#2563eb' },
  { id: 'emerald', bg: 'bg-emerald-600', hex: '#059669' },
  { id: 'amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { id: 'rose', bg: 'bg-rose-600', hex: '#e11d48' },
  { id: 'cyan', bg: 'bg-cyan-600', hex: '#0891b2' },
  { id: 'orange', bg: 'bg-orange-500', hex: '#f97316' },
  { id: 'pink', bg: 'bg-pink-600', hex: '#db2777' },
]
const AVATAR_COLOR_KEY = 'buyer-avatar-color'

export default function ProfilPage() {
  const router = useRouter()
  const { isAuthenticated, buyer } = useBuyerAuthStore()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [avatarColorId, setAvatarColorId] = useState('violet')

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_COLOR_KEY)
    if (saved && AVATAR_COLORS.find(c => c.id === saved)) setAvatarColorId(saved)
  }, [])

  const handleAvatarColor = (id: string) => {
    setAvatarColorId(id)
    localStorage.setItem(AVATAR_COLOR_KEY, id)
  }

  const selectedColor = AVATAR_COLORS.find(c => c.id === avatarColorId) ?? AVATAR_COLORS[0]

  useEffect(() => {
    if (!isAuthenticated) { router.push('/alici-auth/giris'); return }
  }, [isAuthenticated, router])

  useEffect(() => {
    marketplaceService.getProfile().then((p) => {
      setForm({ firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone ?? '' })
    }).catch(() => {
      if (buyer) {
        setForm({ firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email, phone: '' })
      }
    }).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!form.firstName.trim()) { setError('Ad zorunludur.'); return }
    if (!form.email.trim()) { setError('E-posta zorunludur.'); return }

    setSaving(true)
    try {
      await marketplaceService.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data
      setError(typeof msg === 'string' ? msg : 'Profil güncellenemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <AccountTabs
        header={
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hesabım</h1>
            <p className="text-slate-400 text-sm mt-1">Profil bilgileri</p>
          </div>
        }
      />

      <div className="max-w-md">
        <div className="premium-card p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 mb-6 pb-6 border-b border-border">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg transition-all duration-300"
              style={{ backgroundColor: selectedColor.hex }}
            >
              {form.firstName?.[0]?.toUpperCase() ?? '?'}{form.lastName?.[0]?.toUpperCase() ?? ''}
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{form.firstName} {form.lastName}</p>
              <p className="text-xs text-slate-400">{form.email}</p>
            </div>
            {/* Color picker */}
            <div>
              <p className="text-xs text-slate-400 text-center mb-2">Avatar Rengi</p>
              <div className="flex gap-2">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAvatarColor(c.id)}
                    className={`w-7 h-7 rounded-full transition-all ${c.bg} ${
                      avatarColorId === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                    }`}
                    title={c.id}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="font-semibold text-foreground">Profil Bilgilerini Güncelle</h2>
            <p className="text-xs text-slate-400">Ad, soyad, e-posta ve telefon</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-800 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Ad *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Soyad</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">E-posta *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xx xxx xx xx"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Profil başarıyla güncellendi.
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Kaydediliyor...</>
                ) : (
                  <><Check className="w-4 h-4" /> Değişiklikleri Kaydet</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
