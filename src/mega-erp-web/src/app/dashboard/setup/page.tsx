'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Package, Warehouse, CreditCard, Layout,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Check
} from 'lucide-react'
import api from '@/lib/api'
import { productsService } from '@/lib/services/products.service'
import type { Category } from '@/types/api.types'

const STEPS = [
  { id: 1, label: 'İşletme Bilgileri', icon: Building2, desc: 'Firma bilgilerinizi girin' },
  { id: 2, label: 'İlk Ürün', icon: Package, desc: 'Kataloğa ilk ürününüzü ekleyin' },
  { id: 3, label: 'Stok Girişi', icon: Warehouse, desc: 'Başlangıç stoğunuzu tanımlayın' },
  { id: 4, label: 'Hesaplar', icon: CreditCard, desc: 'Muhasebe hesaplarını kontrol edin' },
  { id: 5, label: 'Storefront', icon: Layout, desc: 'Kendi sitenizi özelleştirin' },
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('setup-step') ?? 1)
    }
    return 1
  })
  const [done, setDone] = useState(false)

  const advance = (next: number) => {
    localStorage.setItem('setup-step', String(next))
    setStep(next)
  }

  const complete = () => {
    localStorage.setItem('setup-complete', 'true')
    localStorage.removeItem('setup-step')
    setDone(true)
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <h2 className="text-3xl font-black text-foreground mb-3">Kurulum tamamlandı! 🎉</h2>
        <p className="text-slate-400 mb-8 max-w-sm">
          Mağazanız hazır. Artık ürün satmaya, siparişleri yönetmeye ve muhasebenizi takip etmeye başlayabilirsiniz.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-sm shadow-blue-500/20"
        >
          Komuta Merkezi'ne Git <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Kurulum Rehberi</h1>
        <p className="text-slate-500 mt-1">Mağazanızı {STEPS.length} adımda kurun.</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex justify-between">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex flex-col items-center gap-1 ${s.id <= step ? 'text-blue-400' : 'text-slate-600'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                s.id < step ? 'bg-blue-500 border-blue-500 text-white' :
                s.id === step ? 'border-blue-500 text-blue-400' :
                'border-border text-slate-600'
              }`}>
                {s.id < step ? <Check className="w-3.5 h-3.5" /> : s.id}
              </div>
              <span className="text-[10px] font-medium hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && <Step1 onNext={() => advance(2)} />}
          {step === 2 && <Step2 onNext={() => advance(3)} onSkip={() => advance(3)} />}
          {step === 3 && <Step3 onNext={() => advance(4)} onSkip={() => advance(4)} />}
          {step === 4 && <Step4 onNext={() => advance(5)} />}
          {step === 5 && <Step5 onComplete={complete} />}
        </motion.div>
      </AnimatePresence>

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={() => advance(step - 1)}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Geri
        </button>
      )}
    </div>
  )
}

/* ── STEP 1: İşletme Bilgileri ── */
function Step1({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState(() => {
    if (typeof window === 'undefined') return { name: '', taxNo: '', phone: '', city: '' }
    try { return JSON.parse(localStorage.getItem('setup-business-info') ?? '{}') } catch { return {} }
  })

  const handleNext = () => {
    localStorage.setItem('setup-business-info', JSON.stringify(form))
    onNext()
  }

  const ok = form.name?.trim()

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">İşletme Bilgileri</h2>
          <p className="text-xs text-slate-400">Firma bilgilerinizi kaydedin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">İşletme Adı <span className="text-red-400">*</span></label>
          <input
            value={form.name ?? ''}
            onChange={e => setForm((f: typeof form) => ({ ...f, name: e.target.value }))}
            placeholder="Örn: Ahmet Usta Bakkaliyesi"
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Vergi No</label>
          <input
            value={form.taxNo ?? ''}
            onChange={e => setForm((f: typeof form) => ({ ...f, taxNo: e.target.value }))}
            placeholder="1234567890"
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Telefon</label>
          <input
            value={form.phone ?? ''}
            onChange={e => setForm((f: typeof form) => ({ ...f, phone: e.target.value }))}
            placeholder="0532 000 00 00"
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Şehir</label>
          <input
            value={form.city ?? ''}
            onChange={e => setForm((f: typeof form) => ({ ...f, city: e.target.value }))}
            placeholder="İstanbul"
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!ok}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
      >
        Devam Et <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ── STEP 2: İlk Ürün ── */
function Step2({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [hasProducts, setHasProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', basePrice: '', sku: '', categoryId: '' })

  useEffect(() => {
    Promise.all([
      api.get<Category[]>('/api/catalog/categories').then(r => r.data).catch(() => []),
      productsService.getAll().catch(() => []),
    ]).then(([cats, prods]) => {
      setCategories(cats)
      setHasProducts(prods.length > 0)
    })
  }, [])

  const handleSave = async () => {
    if (!form.name || !form.basePrice) return
    setSaving(true)
    try {
      await api.post('/api/ecommerce/products', {
        name: form.name,
        basePrice: Number(form.basePrice),
        sku: form.sku || `SKU-${Date.now()}`,
        categoryId: form.categoryId || undefined,
      })
      onNext()
    } catch { } finally { setSaving(false) }
  }

  if (hasProducts) {
    return (
      <div className="premium-card p-6 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="font-bold text-foreground">Ürünler zaten mevcut</h2>
        <p className="text-sm text-slate-400">Kataloğunuzda ürün var, bu adımı atlayabilirsiniz.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onNext} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all">
            Devam Et
          </button>
          <button onClick={onSkip} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-slate-400 hover:text-foreground hover:bg-surface transition-all">
            Atla
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Package className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">İlk Ürününüzü Ekleyin</h2>
          <p className="text-xs text-slate-400">Kataloğa bir ürün girin</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ürün Adı <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Örn: Organik Zeytinyağı 1L"
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Fiyat (₺) <span className="text-red-400">*</span></label>
            <input type="number" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
              placeholder="0.00" min={0} step={0.01}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">SKU</label>
            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              placeholder="Otomatik oluşturulur"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all" />
          </div>
        </div>
        {categories.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Kategori</label>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all">
              <option value="">Kategori seçin (isteğe bağlı)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !form.name || !form.basePrice}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Ürünü Ekle & Devam Et <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onSkip} className="px-4 py-3 rounded-xl text-sm font-medium border border-border text-slate-400 hover:text-foreground hover:bg-surface transition-all">
          Atla
        </button>
      </div>
    </div>
  )
}

/* ── STEP 3: Stok Girişi ── */
function Step3({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ productId: '', quantity: '10' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    productsService.getAll().catch(() => []).then(prods => setProducts(prods.map(p => ({ id: p.id, name: p.name }))))
  }, [])

  const handleSave = async () => {
    if (!form.productId || !form.quantity) return
    setSaving(true)
    try {
      await api.post('/api/wms/stock-movements', {
        movementType: 'In',
        productId: form.productId,
        quantity: Number(form.quantity),
        note: 'Başlangıç stoğu (kurulum)',
        fromBinId: '',
        toBinId: '',
      })
      onNext()
    } catch { } finally { setSaving(false) }
  }

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Warehouse className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">Başlangıç Stoğu</h2>
          <p className="text-xs text-slate-400">Ürün için mevcut stok miktarını girin</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ürün</label>
          {products.length > 0 ? (
            <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all">
              <option value="">Ürün seçin...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <p className="text-sm text-slate-500 p-3 rounded-xl bg-surface border border-border">
              Henüz ürün yok. Önce ürün eklemeniz gerekiyor.
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block font-medium">Başlangıç Miktarı</label>
          <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            placeholder="10" min={1}
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !form.productId || !form.quantity}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Stoğu Kaydet & Devam Et <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onSkip} className="px-4 py-3 rounded-xl text-sm font-medium border border-border text-slate-400 hover:text-foreground hover:bg-surface transition-all">
          Atla
        </button>
      </div>
    </div>
  )
}

/* ── STEP 4: Muhasebe Hesapları ── */
function Step4({ onNext }: { onNext: () => void }) {
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [newAccount, setNewAccount] = useState({ name: '', code: '', type: 'Asset' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/accounting/accounts').then(r => setAccounts(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const hasKasa = accounts.some(a => a.code === '100' || a.code === '102')

  const handleCreate = async () => {
    if (!newAccount.name || !newAccount.code) return
    setSaving(true)
    try {
      await api.post('/api/accounting/accounts', newAccount)
      const r = await api.get('/api/accounting/accounts')
      setAccounts(r.data)
      setNewAccount({ name: '', code: '', type: 'Asset' })
    } catch { } finally { setSaving(false) }
  }

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">Muhasebe Hesapları</h2>
          <p className="text-xs text-slate-400">Temel hesaplarınızı kontrol edin</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        </div>
      ) : (
        <>
          {hasKasa ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Hesaplar hazır</p>
                <p className="text-xs text-slate-400">Kasa/banka hesaplarınız tanımlı.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-400 bg-amber-500/8 border border-amber-500/20 p-3 rounded-xl">
                Kasa (100) veya banka (102) hesabı bulunamadı. Temel bir hesap oluşturun.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <input value={newAccount.code} onChange={e => setNewAccount(a => ({ ...a, code: e.target.value }))}
                  placeholder="100" className="px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all" />
                <input value={newAccount.name} onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))}
                  placeholder="Kasa" className="px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/50 transition-all" />
                <button onClick={handleCreate} disabled={saving}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ekle'}
                </button>
              </div>
            </div>
          )}

          {accounts.length > 0 && (
            <div className="text-xs text-slate-500">
              {accounts.length} hesap mevcut
              {accounts.slice(0, 3).map(a => ` · ${a.code} ${a.name}`).join('')}
              {accounts.length > 3 && ` · +${accounts.length - 3} daha`}
            </div>
          )}
        </>
      )}

      <button onClick={onNext}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all">
        Devam Et <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ── STEP 5: Storefront ── */
function Step5({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="premium-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Layout className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">Storefront Özelleştirme</h2>
          <p className="text-xs text-slate-400">Kendi markalı mağazanızı oluşturun</p>
        </div>
      </div>

      {/* Preview card */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold">M</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Mağazanız</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1,2,3].map(i => (
              <div key={i} className="aspect-square rounded-lg bg-surface border border-border/50" />
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">
        Site Builder ile özel sayfalar, hero bölümleri ve ürün listelerini sürükle-bırak yöntemiyle düzenleyebilirsiniz. Kendi alan adınızı ekleyebilirsiniz.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard/site-builder"
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
        >
          <Layout className="w-4 h-4" /> Site Builder'ı Aç
        </Link>
        <button
          onClick={onComplete}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface transition-all"
        >
          Sonra Yap → Tamamla
        </button>
      </div>
    </div>
  )
}
