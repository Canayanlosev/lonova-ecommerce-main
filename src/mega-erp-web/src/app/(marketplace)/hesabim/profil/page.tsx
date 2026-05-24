'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { marketplaceService } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

export default function ProfilPage() {
  const router = useRouter()
  const { isAuthenticated, buyer } = useBuyerAuthStore()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthenticated) {
    router.push('/alici-auth/giris')
    return null
  }

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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
              {form.firstName?.[0]?.toUpperCase() ?? '?'}{form.lastName?.[0]?.toUpperCase() ?? ''}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Profil Bilgilerini Güncelle</h2>
              <p className="text-xs text-slate-400">Ad, soyad, e-posta ve telefon</p>
            </div>
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
