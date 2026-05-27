'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Bell, Shield, Key, Palette, Globe, Save, Check,
  Eye, EyeOff, Copy, RefreshCw, Loader2, AlertTriangle,
  Mail, Phone, MapPin, FileText, Upload, Zap, Smartphone,
  ToggleLeft, ToggleRight, ChevronRight, User
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/store/ui.store'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'isletme' | 'bildirimler' | 'guvenlik' | 'api' | 'platform'

interface BusinessProfile {
  name: string
  taxNo: string
  phone: string
  city: string
  address: string
  email: string
  logoUrl: string
  website: string
}

interface NotifPrefs {
  newOrder: boolean
  lowStock: boolean
  newReview: boolean
  paymentReceived: boolean
  shippingUpdate: boolean
  leaveRequest: boolean
  monthlyReport: boolean
}

const BUSINESS_KEY = 'settings-business-profile'
const NOTIF_KEY = 'settings-notif-prefs'

const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'isletme',     label: 'İşletme Profili',    icon: Building2, desc: 'Firma bilgileri ve logo' },
  { id: 'bildirimler', label: 'Bildirimler',         icon: Bell,      desc: 'Uyarı tercihleri' },
  { id: 'guvenlik',    label: 'Güvenlik',             icon: Shield,    desc: 'Şifre & oturum' },
  { id: 'api',         label: 'API Erişimi',          icon: Key,       desc: 'API anahtarları' },
  { id: 'platform',    label: 'Platform',             icon: Palette,   desc: 'Görünüm & dil' },
]

const DEFAULT_NOTIF: NotifPrefs = {
  newOrder: true,
  lowStock: true,
  newReview: false,
  paymentReceived: true,
  shippingUpdate: false,
  leaveRequest: true,
  monthlyReport: true,
}

const DEFAULT_BUSINESS: BusinessProfile = {
  name: '', taxNo: '', phone: '', city: '', address: '',
  email: '', logoUrl: '', website: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 ${
        enabled ? 'bg-primary' : 'bg-slate-700'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
    </button>
  )
}

function InputField({
  label, value, onChange, placeholder, icon: Icon, type = 'text', hint
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon?: React.ElementType
  type?: string
  hint?: string
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1.5 block font-medium">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-2.5 rounded-xl bg-background border border-border text-foreground text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all
            ${Icon ? 'pl-9 pr-4' : 'px-4'}`}
        />
      </div>
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AyarlarPage() {
  const { user } = useAuthStore()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('isletme')

  // Business profile
  const [business, setBusiness] = useState<BusinessProfile>(DEFAULT_BUSINESS)
  const [bizSaving, setBizSaving] = useState(false)
  const [bizSaved, setBizSaved] = useState(false)

  // Notification prefs
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIF)
  const [notifSaved, setNotifSaved] = useState(false)

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  // API key
  const [apiKey, setApiKey] = useState('ck_live_••••••••••••••••••••••••••••••••')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyReal] = useState(() => {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('settings-api-key')
    if (stored) return stored
    const generated = 'ck_live_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('settings-api-key', generated)
    return generated
  })
  const [apiCopied, setApiCopied] = useState(false)
  const [apiRotating, setApiRotating] = useState(false)

  // Platform
  const [language, setLanguage] = useState('tr')
  const [timezone, setTimezone] = useState('Europe/Istanbul')
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY')
  const [platformSaved, setPlatformSaved] = useState(false)

  // Load saved data
  useEffect(() => {
    try {
      const biz = localStorage.getItem(BUSINESS_KEY)
      if (biz) setBusiness(JSON.parse(biz))

      const notif = localStorage.getItem(NOTIF_KEY)
      if (notif) setNotifs(JSON.parse(notif))

      // Load onboarding data as fallback
      const onboard = localStorage.getItem('setup-business-info')
      if (onboard && !biz) {
        const data = JSON.parse(onboard)
        setBusiness(prev => ({
          ...prev,
          name: data.name ?? '',
          taxNo: data.taxNo ?? '',
          phone: data.phone ?? '',
          city: data.city ?? '',
        }))
      }
    } catch {}
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const saveBusiness = useCallback(async () => {
    setBizSaving(true)
    await new Promise(r => setTimeout(r, 600))
    localStorage.setItem(BUSINESS_KEY, JSON.stringify(business))
    // Also update onboarding data
    localStorage.setItem('setup-business-info', JSON.stringify({
      name: business.name, taxNo: business.taxNo, phone: business.phone, city: business.city
    }))
    setBizSaving(false)
    setBizSaved(true)
    toast.success('İşletme profili güncellendi')
    setTimeout(() => setBizSaved(false), 2500)
  }, [business, toast])

  const saveNotifs = useCallback(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs))
    setNotifSaved(true)
    toast.success('Bildirim tercihleri kaydedildi')
    setTimeout(() => setNotifSaved(false), 2500)
  }, [notifs, toast])

  const toggleNotif = (key: keyof NotifPrefs) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const changePassword = async () => {
    setPwError('')
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Tüm alanlar zorunludur.')
      return
    }
    if (newPw.length < 8) {
      setPwError('Yeni şifre en az 8 karakter olmalıdır.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Yeni şifreler eşleşmiyor.')
      return
    }
    setPwSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setPwSaving(false)
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    toast.success('Şifre başarıyla değiştirildi')
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKeyReal).catch(() => {})
    setApiCopied(true)
    setTimeout(() => setApiCopied(false), 2000)
  }

  const rotateApiKey = async () => {
    setApiRotating(true)
    await new Promise(r => setTimeout(r, 1000))
    const newKey = 'ck_live_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('settings-api-key', newKey)
    setApiKey(newKey)
    setApiRotating(false)
    toast.success('API anahtarı yenilendi')
  }

  const displayedApiKey = apiKeyVisible
    ? apiKeyReal
    : apiKeyReal.slice(0, 10) + '•'.repeat(20) + apiKeyReal.slice(-4)

  const savePlatform = () => {
    localStorage.setItem('settings-platform', JSON.stringify({ language, timezone, dateFormat }))
    setPlatformSaved(true)
    toast.success('Platform ayarları kaydedildi')
    setTimeout(() => setPlatformSaved(false), 2500)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('settings-platform')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.language) setLanguage(data.language)
        if (data.timezone) setTimezone(data.timezone)
        if (data.dateFormat) setDateFormat(data.dateFormat)
      }
    } catch {}
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Ayarlar</h1>
        <p className="text-slate-400 text-sm mt-1">Platform ve hesap tercihlerinizi yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar nav */}
        <nav className="space-y-1.5">
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group ${
                tab === t.id
                  ? 'bg-primary/10 border border-primary/20 text-primary'
                  : 'hover:bg-slate-800/30 border border-transparent text-slate-400 hover:text-foreground'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                tab === t.id ? 'bg-primary/15' : 'bg-slate-800/60 group-hover:bg-slate-700/60'
              }`}>
                <t.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{t.label}</p>
                <p className="text-[10px] text-slate-500 truncate">{t.desc}</p>
              </div>
              {tab === t.id && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── İŞLETME PROFİLİ ────────────────────────────────────────────── */}
            {tab === 'isletme' && (
              <div className="premium-card p-6 space-y-6 border border-border/80 bg-slate-900/40">
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">İşletme Profili</h2>
                    <p className="text-xs text-slate-400">Faturalarda ve mağazanızda görünür</p>
                  </div>
                </div>

                {/* Logo preview */}
                {business.logoUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-border/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={business.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/5 border border-border/40" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Logo önizleme</p>
                      <p className="text-[10px] text-slate-500">URL geçerli görünüyor</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <InputField
                      label="İşletme Adı *"
                      value={business.name}
                      onChange={v => setBusiness(p => ({ ...p, name: v }))}
                      placeholder="Örn: Ahmet Usta Bakkaliyesi"
                      icon={Building2}
                    />
                  </div>
                  <InputField
                    label="Vergi Numarası"
                    value={business.taxNo}
                    onChange={v => setBusiness(p => ({ ...p, taxNo: v }))}
                    placeholder="1234567890"
                    icon={FileText}
                  />
                  <InputField
                    label="Telefon"
                    value={business.phone}
                    onChange={v => setBusiness(p => ({ ...p, phone: v }))}
                    placeholder="0532 000 00 00"
                    icon={Phone}
                  />
                  <InputField
                    label="E-posta"
                    value={business.email}
                    onChange={v => setBusiness(p => ({ ...p, email: v }))}
                    placeholder="firma@ornek.com"
                    icon={Mail}
                    type="email"
                  />
                  <InputField
                    label="Şehir"
                    value={business.city}
                    onChange={v => setBusiness(p => ({ ...p, city: v }))}
                    placeholder="İstanbul"
                    icon={MapPin}
                  />
                  <div className="sm:col-span-2">
                    <InputField
                      label="Adres"
                      value={business.address}
                      onChange={v => setBusiness(p => ({ ...p, address: v }))}
                      placeholder="Mahalle, Sokak, No, İlçe"
                      icon={MapPin}
                    />
                  </div>
                  <InputField
                    label="Web Sitesi"
                    value={business.website}
                    onChange={v => setBusiness(p => ({ ...p, website: v }))}
                    placeholder="https://siteniz.com"
                    icon={Globe}
                  />
                  <InputField
                    label="Logo URL"
                    value={business.logoUrl}
                    onChange={v => setBusiness(p => ({ ...p, logoUrl: v }))}
                    placeholder="https://siteniz.com/logo.png"
                    icon={Upload}
                    hint="Logo URL'si girin, önizleme yukarıda görünür"
                  />
                </div>

                <button
                  onClick={saveBusiness}
                  disabled={bizSaving || !business.name.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-sm shadow-primary/20"
                >
                  {bizSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor…</>
                  ) : bizSaved ? (
                    <><Check className="w-4 h-4" /> Kaydedildi!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Kaydet</>
                  )}
                </button>
              </div>
            )}

            {/* ── BİLDİRİMLER ────────────────────────────────────────────────── */}
            {tab === 'bildirimler' && (
              <div className="premium-card p-6 space-y-6 border border-border/80 bg-slate-900/40">
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Bildirim Tercihleri</h2>
                    <p className="text-xs text-slate-400">Hangi olaylar için uyarı almak istediğinizi seçin</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {([
                    { key: 'newOrder',        label: 'Yeni Sipariş',           desc: 'Her yeni B2B veya marketplace siparişinde',   icon: <Zap className="w-4 h-4 text-primary" /> },
                    { key: 'lowStock',        label: 'Düşük Stok Uyarısı',     desc: 'Bir ürün minimum stok seviyesine düştüğünde',  icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
                    { key: 'paymentReceived', label: 'Ödeme Alındı',           desc: 'Sipariş ödemesi onaylandığında',              icon: <Save className="w-4 h-4 text-emerald-400" /> },
                    { key: 'newReview',       label: 'Yeni Yorum',             desc: 'Müşteri ürüne yorum bıraktığında',             icon: <User className="w-4 h-4 text-violet-400" /> },
                    { key: 'shippingUpdate',  label: 'Kargo Güncellemesi',     desc: 'Kargo durumu değiştiğinde',                   icon: <Smartphone className="w-4 h-4 text-cyan-400" /> },
                    { key: 'leaveRequest',    label: 'İzin Talebi',            desc: 'Çalışan izin talebi oluşturduğunda',          icon: <User className="w-4 h-4 text-rose-400" /> },
                    { key: 'monthlyReport',   label: 'Aylık Rapor',            desc: 'Her ayın sonunda özet rapor',                  icon: <FileText className="w-4 h-4 text-slate-400" /> },
                  ] as { key: keyof NotifPrefs; label: string; desc: string; icon: React.ReactNode }[]).map(item => (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                        notifs[item.key]
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-slate-800/20 border-border/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.label}</p>
                          <p className="text-[10px] text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                      <Toggle
                        enabled={notifs[item.key]}
                        onToggle={() => toggleNotif(item.key)}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={saveNotifs}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-sm shadow-primary/20"
                >
                  {notifSaved ? (
                    <><Check className="w-4 h-4" /> Kaydedildi!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Tercihleri Kaydet</>
                  )}
                </button>
              </div>
            )}

            {/* ── GÜVENLİK ───────────────────────────────────────────────────── */}
            {tab === 'guvenlik' && (
              <div className="space-y-4">
                {/* Current session info */}
                <div className="premium-card p-5 border border-border/80 bg-slate-900/40">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground">Aktif Oturum</h2>
                      <p className="text-xs text-slate-400">Şu anda giriş yapılmış hesap</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm font-black text-primary">
                      {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{user?.email}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-bold">Aktif</span>
                    </div>
                  </div>
                </div>

                {/* Password change */}
                <div className="premium-card p-6 border border-border/80 bg-slate-900/40 space-y-5">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Key className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Şifre Değiştir</h3>
                      <p className="text-[10px] text-slate-400">Son değişiklikten bu yana güçlü bir şifre kullanın</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-medium">Mevcut Şifre</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPw}
                          onChange={e => setCurrentPw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                        />
                        <button
                          onClick={() => setShowCurrent(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                        >
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-medium">Yeni Şifre</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="En az 8 karakter"
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                        />
                        <button
                          onClick={() => setShowNew(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Password strength */}
                      {newPw && (
                        <div className="mt-1.5 space-y-1">
                          <div className="h-1 rounded-full overflow-hidden bg-slate-800">
                            <div className={`h-full rounded-full transition-all duration-300 ${
                              newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? 'w-full bg-emerald-500' :
                              newPw.length >= 8 ? 'w-2/3 bg-amber-500' :
                              'w-1/3 bg-red-500'
                            }`} />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw)
                              ? '💪 Güçlü şifre'
                              : newPw.length >= 8
                              ? '⚠️ Orta güç — büyük harf ve rakam ekleyin'
                              : '🔴 Zayıf — en az 8 karakter gerekli'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-medium">Yeni Şifre (Tekrar)</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Yeni şifrenizi tekrar girin"
                        className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                      />
                    </div>

                    {pwError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-xs text-red-400 font-medium">{pwError}</p>
                      </div>
                    )}

                    <button
                      onClick={changePassword}
                      disabled={pwSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
                    >
                      {pwSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Değiştiriliyor…</>
                      ) : (
                        <><Shield className="w-4 h-4" /> Şifreyi Değiştir</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── API ERİŞİMİ ────────────────────────────────────────────────── */}
            {tab === 'api' && (
              <div className="space-y-4">
                <div className="premium-card p-6 border border-border/80 bg-slate-900/40 space-y-5">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Key className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground">API Anahtarı</h2>
                      <p className="text-xs text-slate-400">Dış entegrasyonlar ve otomasyon için kullanın</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Canlı API Anahtarı</p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-400 font-bold">Aktif</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-foreground bg-slate-900/60 px-3 py-2 rounded-lg border border-border/40 overflow-hidden text-ellipsis whitespace-nowrap">
                        {displayedApiKey}
                      </code>
                      <button
                        onClick={() => setApiKeyVisible(p => !p)}
                        className="p-2 rounded-lg border border-border/60 hover:bg-slate-800/40 text-slate-400 hover:text-foreground transition-all"
                        title={apiKeyVisible ? 'Gizle' : 'Göster'}
                      >
                        {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={copyApiKey}
                        className="p-2 rounded-lg border border-border/60 hover:bg-slate-800/40 text-slate-400 hover:text-foreground transition-all"
                        title="Kopyala"
                      >
                        {apiCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/80 font-medium">
                      API anahtarınızı asla herkese açık ortamlarda (GitHub, frontend kodu, vb.) paylaşmayın.
                      Anahtar sızdıysa hemen yenileyin.
                    </p>
                  </div>

                  <button
                    onClick={rotateApiKey}
                    disabled={apiRotating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {apiRotating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Yenileniyor…</>
                    ) : (
                      <><RefreshCw className="w-4 h-4" /> Anahtarı Yenile</>
                    )}
                  </button>
                </div>

                {/* Webhook placeholder */}
                <div className="premium-card p-6 border border-border/80 bg-slate-900/40 space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Webhook URL</h3>
                      <p className="text-[10px] text-slate-400">Olayları dış sistemlere iletmek için</p>
                    </div>
                  </div>
                  <InputField
                    label="Webhook URL"
                    value=""
                    onChange={() => {}}
                    placeholder="https://sizin-sisteminiz.com/webhook"
                    icon={Globe}
                    hint="Yeni sipariş, stok uyarısı ve ödeme olaylarını alacak endpoint"
                  />
                  <div className="flex flex-wrap gap-2">
                    {['sipariş.oluşturuldu', 'ödeme.alındı', 'stok.kritik', 'kargo.güncellendi'].map(ev => (
                      <span key={ev} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/60 border border-border/40 text-slate-400 font-mono">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PLATFORM ───────────────────────────────────────────────────── */}
            {tab === 'platform' && (
              <div className="premium-card p-6 border border-border/80 bg-slate-900/40 space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Platform Tercihleri</h2>
                    <p className="text-xs text-slate-400">Dil, saat dilimi ve görünüm ayarları</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Language */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Dil</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                    >
                      <option value="tr">🇹🇷 Türkçe</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Saat Dilimi</label>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                    >
                      <option value="Europe/Istanbul">Türkiye (UTC+3)</option>
                      <option value="Europe/London">Londra (UTC+0)</option>
                      <option value="Europe/Berlin">Berlin (UTC+1/+2)</option>
                      <option value="America/New_York">New York (UTC-5/-4)</option>
                    </select>
                  </div>

                  {/* Date format */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tarih Formatı</label>
                    <select
                      value={dateFormat}
                      onChange={e => setDateFormat(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                    >
                      <option value="DD.MM.YYYY">27.05.2026 (TR)</option>
                      <option value="MM/DD/YYYY">05/27/2026 (US)</option>
                      <option value="YYYY-MM-DD">2026-05-27 (ISO)</option>
                    </select>
                  </div>

                  {/* Currency (display only) */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block font-medium">Para Birimi</label>
                    <div className="px-4 py-2.5 rounded-xl bg-slate-900/60 border border-border/50 text-slate-400 text-sm flex items-center gap-2">
                      <span className="font-bold text-foreground">₺ Türk Lirası (TRY)</span>
                      <span className="ml-auto text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">Sabit</span>
                    </div>
                  </div>
                </div>

                {/* Theme info */}
                <div className="p-4 rounded-xl bg-slate-800/20 border border-border/40 flex items-center gap-3">
                  <Palette className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-400">
                    Tema değiştirmek için sağ üstteki <strong className="text-foreground">🌙 / ☀️</strong> butonunu kullanın.
                  </p>
                </div>

                <button
                  onClick={savePlatform}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-sm shadow-primary/20"
                >
                  {platformSaved ? (
                    <><Check className="w-4 h-4" /> Kaydedildi!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Ayarları Kaydet</>
                  )}
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
