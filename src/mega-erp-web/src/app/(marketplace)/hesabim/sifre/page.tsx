'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { marketplaceService } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

export default function SifreDegistirPage() {
  const router = useRouter()
  const { isAuthenticated } = useBuyerAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isAuthenticated) {
    router.push('/alici-auth/giris')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      await marketplaceService.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: string | { message?: string } } })?.response?.data
      if (typeof msg === 'string') setError(msg)
      else if (typeof msg === 'object' && msg?.message) setError(msg.message)
      else setError('Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <AccountTabs
        header={
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-wider">Hesabım</h1>
            <p className="text-slate-400 text-xs font-semibold mt-1.5">Güvenlik ayarları</p>
          </div>
        }
      />

      <div className="max-w-md mt-6">
        <div className="bg-slate-900/65 border border-border/80 p-6 shadow-xl rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Şifre Değiştir</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Hesabınızı güvende tutun</p>
            </div>
          </div>

          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-foreground mb-1">Şifre başarıyla değiştirildi!</p>
              <p className="text-sm text-slate-400 mb-4">Yeni şifreniz aktif edildi.</p>
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-primary hover:underline"
              >
                Tekrar değiştir
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current password */}
              <div>
                <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-white transition-all"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="En az 6 karakter"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-white transition-all"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-1.5 flex gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          newPassword.length >= level * 3
                            ? level <= 1 ? 'bg-red-500'
                              : level <= 2 ? 'bg-amber-500'
                              : level <= 3 ? 'bg-yellow-405'
                              : 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">
                  Yeni Şifre Tekrar
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505 ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500/50 focus:ring-red-500/25'
                      : 'border-border/80'
                  }`}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-405 font-bold mt-1.5">Şifreler eşleşmiyor</p>
                )}
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-405 text-xs font-bold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Değiştiriliyor...
                  </>
                ) : (
                  'Şifreyi Değiştir'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
