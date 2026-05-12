'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Store, Loader2 } from 'lucide-react'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import axios from 'axios'

const publicApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' })

export default function BuyerLoginPage() {
  const router = useRouter()
  const { login } = useBuyerAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email ve şifre zorunludur.'); return }
    setLoading(true)
    try {
      const { data } = await publicApi.post('/api/marketplace/auth/login', { email, password })
      login(data.token, { id: data.userId, email: data.email, firstName: data.firstName, lastName: data.lastName })
      router.push('/hesabim/siparisler')
    } catch {
      setError('Giriş başarısız. Email veya şifrenizi kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="premium-card p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-foreground">Lonova</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Alıcı Girişi</h1>
            <p className="text-sm text-slate-400 mt-1">Marketplace hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email adresiniz"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifreniz"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full premium-button flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Hesabınız yok mu?{' '}
            <Link href="/alici-auth/kayit" className="text-primary hover:underline">Kayıt Ol</Link>
          </p>
          <p className="text-center text-xs text-slate-500 mt-2">
            Firma girişi için{' '}
            <Link href="/auth/login" className="text-primary hover:underline">buraya tıklayın</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
