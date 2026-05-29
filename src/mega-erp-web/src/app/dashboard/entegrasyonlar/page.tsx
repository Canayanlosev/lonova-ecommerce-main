'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plug, X, Plus, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Settings2, Eye, EyeOff, Copy, ExternalLink,
  ShoppingBag, Truck, CreditCard, Zap, Globe, BarChart3,
  ArrowUpRight, Clock, Check, AlertTriangle, ChevronRight
} from 'lucide-react'
import { useToast } from '@/store/ui.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationCategory = 'marketplace' | 'kargo' | 'odeme' | 'muhasebe' | 'diger'
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'

interface IntegrationConfig {
  id: string
  apiKey: string
  apiSecret: string
  sellerId: string
  webhookUrl: string
  autoSync: boolean
  syncInterval: number  // minutes
}

interface IntegrationStats {
  monthlyOrders: number
  monthlyRevenue: number
  lastSyncAt: string
  syncErrors: number
  productCount: number
}

interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  status: IntegrationStatus
  config: IntegrationConfig
  stats: IntegrationStats
  connectedAt: string
  description: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'integrations-state'

interface IntegrationDef {
  id: string
  name: string
  category: IntegrationCategory
  description: string
  color: string
  bgColor: string
  logo: string       // emoji placeholder
  docsUrl: string
  fields: { key: keyof IntegrationConfig; label: string; placeholder: string; secret?: boolean }[]
}

const INTEGRATION_DEFS: IntegrationDef[] = [
  // Marketplaces
  { id: 'trendyol', name: 'Trendyol', category: 'marketplace', description: 'Türkiye\'nin en büyük e-ticaret platformu. Ürün, sipariş ve stok otomatik senkronizasyonu.', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30', logo: '🛍️', docsUrl: 'https://developers.trendyol.com', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'API anahtarınız', secret: false }, { key: 'apiSecret', label: 'API Secret', placeholder: '••••••••', secret: true }, { key: 'sellerId', label: 'Satıcı ID', placeholder: 'Trendyol satıcı ID\'niz' }] },
  { id: 'hepsiburada', name: 'HepsiBurada', category: 'marketplace', description: 'İkinci büyük marketplace. Otomatik sipariş çekme ve kargo entegrasyonu.', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30', logo: '🏪', docsUrl: 'https://developers.hepsiburada.com', fields: [{ key: 'apiKey', label: 'Merchant ID', placeholder: 'HB Merchant ID' }, { key: 'apiSecret', label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'n11', name: 'N11', category: 'marketplace', description: 'N11.com marketplace entegrasyonu. Ürün listeleme ve sipariş yönetimi.', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30', logo: '🔢', docsUrl: 'https://api.n11.com', fields: [{ key: 'apiKey', label: 'App Key', placeholder: 'N11 App Key' }, { key: 'apiSecret', label: 'App Secret', placeholder: '••••••••', secret: true }] },
  { id: 'gittigidiyor', name: 'GittiGidiyor', category: 'marketplace', description: 'eBay Türkiye platformu. Açık artırma ve sabit fiyatlı satış.', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30', logo: '🔨', docsUrl: 'https://dev.gittigidiyor.com', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'GG API Key' }, { key: 'apiSecret', label: 'API Secret', placeholder: '••••••••', secret: true }, { key: 'sellerId', label: 'Satıcı Adı', placeholder: 'Kullanıcı adınız' }] },
  { id: 'ciceksepeti', name: 'ÇiçekSepeti', category: 'marketplace', description: 'Çiçek ve hediye kategorilerinde lider platform.', color: 'text-pink-400', bgColor: 'bg-pink-500/10 border-pink-500/30', logo: '🌸', docsUrl: 'https://developers.ciceksepeti.com', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'CS API Key' }, { key: 'apiSecret', label: 'Token', placeholder: '••••••••', secret: true }] },
  { id: 'amazon', name: 'Amazon TR', category: 'marketplace', description: 'Amazon Türkiye seller central entegrasyonu (SP-API).', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30', logo: '📦', docsUrl: 'https://developer-docs.amazon.com', fields: [{ key: 'sellerId', label: 'Seller ID', placeholder: 'ATVPDKIKX0DER' }, { key: 'apiKey', label: 'LWA Client ID', placeholder: 'amzn1.application-oa2-...' }, { key: 'apiSecret', label: 'LWA Client Secret', placeholder: '••••••••', secret: true }] },
  // Kargo
  { id: 'aras', name: 'Aras Kargo', category: 'kargo', description: 'Otomatik kargo etiketi oluştur, takip numaralarını çek.', color: 'text-orange-300', bgColor: 'bg-orange-400/10 border-orange-400/30', logo: '🚚', docsUrl: 'https://www.araskargo.com.tr/api', fields: [{ key: 'apiKey', label: 'Kullanıcı Adı', placeholder: 'Aras kullanıcı adı' }, { key: 'apiSecret', label: 'Şifre', placeholder: '••••••••', secret: true }, { key: 'sellerId', label: 'Müşteri Kodu', placeholder: 'Müşteri kodunuz' }] },
  { id: 'yurtici', name: 'Yurtiçi Kargo', category: 'kargo', description: 'Yurtiçi Kargo API entegrasyonu. Toplu gönderici belgesi.', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30', logo: '📫', docsUrl: 'https://www.yurticikargo.com/api', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'YK API Key' }, { key: 'sellerId', label: 'Müşteri No', placeholder: 'Müşteri numaranız' }] },
  { id: 'mng', name: 'MNG Kargo', category: 'kargo', description: 'MNG Kargo entegrasyonu — e-ticaret gönderileri.', color: 'text-blue-300', bgColor: 'bg-blue-400/10 border-blue-400/30', logo: '✈️', docsUrl: 'https://www.mngkargo.com.tr/api', fields: [{ key: 'apiKey', label: 'Kullanıcı Adı', placeholder: 'MNG kullanıcı adı' }, { key: 'apiSecret', label: 'Şifre', placeholder: '••••••••', secret: true }] },
  // Ödeme
  { id: 'iyzico', name: 'İyzico', category: 'odeme', description: 'Sanal POS, taksit ve ödeme linkleri. API entegrasyonu.', color: 'text-violet-400', bgColor: 'bg-violet-500/10 border-violet-500/30', logo: '💳', docsUrl: 'https://dev.iyzipay.com', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'İyzico API Key' }, { key: 'apiSecret', label: 'Secret Key', placeholder: '••••••••', secret: true }] },
  { id: 'param', name: 'Param POS', category: 'odeme', description: 'PARAM sanal POS entegrasyonu. Türk bankaları taksit desteği.', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30', logo: '🏦', docsUrl: 'https://param.com.tr/api', fields: [{ key: 'apiKey', label: 'Client Code', placeholder: 'PARAM client kodu' }, { key: 'apiSecret', label: 'GUID', placeholder: '••••••••', secret: true }] },
  // Muhasebe
  { id: 'logo', name: 'Logo Tiger', category: 'muhasebe', description: 'Logo Tiger ERP entegrasyonu. Muhasebe kayıtları otomatik aktarım.', color: 'text-red-300', bgColor: 'bg-red-400/10 border-red-400/30', logo: '📊', docsUrl: 'https://logo.com.tr/api', fields: [{ key: 'apiKey', label: 'License Key', placeholder: 'Logo lisans anahtarı' }, { key: 'sellerId', label: 'Firma Kodu', placeholder: 'Logo firma kodu' }] },
  { id: 'mikro', name: 'Mikro Yazılım', category: 'muhasebe', description: 'Mikro Yazılım muhasebe programı entegrasyonu.', color: 'text-blue-300', bgColor: 'bg-blue-400/10 border-blue-400/30', logo: '🧮', docsUrl: 'https://mikro.com.tr/api', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'Mikro API anahtarı' }] },
  // Diğer
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'diger', description: 'WhatsApp Business API — sipariş bildirimleri ve müşteri iletişimi.', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30', logo: '💬', docsUrl: 'https://developers.facebook.com/docs/whatsapp', fields: [{ key: 'apiKey', label: 'Phone Number ID', placeholder: 'WA phone number ID' }, { key: 'apiSecret', label: 'Access Token', placeholder: '••••••••', secret: true }] },
  { id: 'google_analytics', name: 'Google Analytics', category: 'diger', description: 'GA4 entegrasyonu — mağaza ve sipariş dönüşüm takibi.', color: 'text-amber-300', bgColor: 'bg-amber-400/10 border-amber-400/30', logo: '📈', docsUrl: 'https://developers.google.com/analytics', fields: [{ key: 'apiKey', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' }, { key: 'apiSecret', label: 'API Secret', placeholder: '••••••••', secret: true }] },
]

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  marketplace: '🛒 Marketplace',
  kargo: '🚚 Kargo',
  odeme: '💳 Ödeme',
  muhasebe: '📊 Muhasebe',
  diger: '⚙️ Diğer',
}

const STATUS_MAP: Record<IntegrationStatus, { label: string; color: string; icon: React.ElementType }> = {
  connected:    { label: 'Bağlı',        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  disconnected: { label: 'Bağlı Değil', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',    icon: XCircle },
  error:        { label: 'Hata',         color: 'text-red-400 bg-red-500/10 border-red-500/30',           icon: AlertCircle },
  pending:      { label: 'Bekleniyor',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',     icon: Clock },
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// Build initial integration list (merge def with persisted state)
function buildInitial(saved: Record<string, Partial<Integration>>): Integration[] {
  return INTEGRATION_DEFS.map(def => {
    const s = saved[def.id] ?? {}
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      status: s.status ?? 'disconnected',
      description: def.description,
      config: s.config ?? { id: uid(), apiKey: '', apiSecret: '', sellerId: '', webhookUrl: '', autoSync: true, syncInterval: 30 },
      stats: s.stats ?? { monthlyOrders: 0, monthlyRevenue: 0, lastSyncAt: '', syncErrors: 0, productCount: 0 },
      connectedAt: s.connectedAt ?? '',
    }
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EntegrasyonlarPage() {
  const toast = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'tümü'>('tümü')
  const [configPanel, setConfigPanel] = useState<Integration | null>(null)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [configForm, setConfigForm] = useState<IntegrationConfig>({ id: '', apiKey: '', apiSecret: '', sellerId: '', webhookUrl: '', autoSync: true, syncInterval: 30 })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      const saved: Record<string, Partial<Integration>> = raw ? JSON.parse(raw) : {}
      // Demo: pre-connect Trendyol & Aras
      if (!raw) {
        saved.trendyol = {
          status: 'connected', connectedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          config: { id: uid(), apiKey: 'ty_api_key_demo', apiSecret: '••demo••', sellerId: '12345', webhookUrl: '', autoSync: true, syncInterval: 15 },
          stats: { monthlyOrders: 284, monthlyRevenue: 68500, lastSyncAt: new Date(Date.now() - 12 * 60000).toISOString(), syncErrors: 0, productCount: 142 },
        }
        saved.aras = {
          status: 'connected', connectedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
          config: { id: uid(), apiKey: 'aras_demo', apiSecret: '••demo••', sellerId: 'MC-88291', webhookUrl: '', autoSync: true, syncInterval: 60 },
          stats: { monthlyOrders: 198, monthlyRevenue: 0, lastSyncAt: new Date(Date.now() - 30 * 60000).toISOString(), syncErrors: 2, productCount: 0 },
        }
        saved.iyzico = {
          status: 'connected', connectedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          config: { id: uid(), apiKey: 'sandbox-key', apiSecret: '••demo••', sellerId: '', webhookUrl: 'https://canayan.web/api/webhooks/iyzico', autoSync: false, syncInterval: 0 },
          stats: { monthlyOrders: 310, monthlyRevenue: 84200, lastSyncAt: new Date(Date.now() - 5 * 60000).toISOString(), syncErrors: 0, productCount: 0 },
        }
        saved.hepsiburada = {
          status: 'error', connectedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          config: { id: uid(), apiKey: 'hb_demo', apiSecret: '••demo••', sellerId: '', webhookUrl: '', autoSync: true, syncInterval: 30 },
          stats: { monthlyOrders: 0, monthlyRevenue: 0, lastSyncAt: new Date(Date.now() - 2 * 86400000).toISOString(), syncErrors: 14, productCount: 80 },
        }
        localStorage.setItem(LS_KEY, JSON.stringify(saved))
      }
      setIntegrations(buildInitial(saved))
    } catch { setIntegrations(buildInitial({})) }
  }, [])

  const saveIntegrations = useCallback((updated: Integration[]) => {
    setIntegrations(updated)
    const map: Record<string, Partial<Integration>> = {}
    for (const i of updated) map[i.id] = { status: i.status, config: i.config, stats: i.stats, connectedAt: i.connectedAt }
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  }, [])

  const openConfig = (integ: Integration) => {
    setConfigPanel(integ)
    setConfigForm({ ...integ.config })
  }

  const handleConnect = (integ: Integration) => {
    if (!configForm.apiKey.trim()) { toast.error('API Key zorunludur'); return }
    const updated = integrations.map(i => i.id === integ.id ? {
      ...i, status: 'connected' as IntegrationStatus,
      config: configForm,
      connectedAt: i.connectedAt || new Date().toISOString(),
      stats: { ...i.stats, lastSyncAt: new Date().toISOString(), syncErrors: 0 },
    } : i)
    saveIntegrations(updated)
    setConfigPanel(null)
    toast.success(`${integ.name} bağlantısı kuruldu`)
  }

  const handleDisconnect = (integ: Integration) => {
    const updated = integrations.map(i => i.id === integ.id ? {
      ...i, status: 'disconnected' as IntegrationStatus,
      config: { ...i.config, apiKey: '', apiSecret: '' },
      connectedAt: '',
    } : i)
    saveIntegrations(updated)
    setConfigPanel(null)
    toast.success(`${integ.name} bağlantısı kesildi`)
  }

  const handleSync = (integ: Integration) => {
    setSyncing(s => ({ ...s, [integ.id]: true }))
    setTimeout(() => {
      const updated = integrations.map(i => i.id === integ.id ? {
        ...i, stats: { ...i.stats, lastSyncAt: new Date().toISOString(), syncErrors: 0 },
        status: 'connected' as IntegrationStatus,
      } : i)
      saveIntegrations(updated)
      setSyncing(s => ({ ...s, [integ.id]: false }))
      toast.success(`${integ.name} senkronize edildi`)
    }, 1800)
  }

  const toggleSecret = (key: string) => setShowSecrets(s => ({ ...s, [key]: !s[key] }))

  const filtered = integrations.filter(i => selectedCategory === 'tümü' || i.category === selectedCategory)
  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const errorCount = integrations.filter(i => i.status === 'error').length

  const def = configPanel ? INTEGRATION_DEFS.find(d => d.id === configPanel.id) : null

  const categories: (IntegrationCategory | 'tümü')[] = ['tümü', 'marketplace', 'kargo', 'odeme', 'muhasebe', 'diger']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Entegrasyonlar</h1>
          <p className="text-slate-400 text-sm font-semibold">Marketplace, kargo, ödeme ve muhasebe bağlantılarınızı yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${connectedCount > 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-400 border-border/40'}`}>
            <CheckCircle2 size={15} /> {connectedCount} aktif
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-red-400 bg-red-500/10 border-red-500/30 text-sm font-bold">
              <AlertTriangle size={15} /> {errorCount} hata
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorCount} entegrasyonda bağlantı hatası var. Lütfen API bilgilerinizi güncelleyin.</span>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${selectedCategory === cat ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border/40 text-slate-400 hover:border-primary/30 hover:text-slate-200'}`}>
            {cat === 'tümü' ? '🔌 Tümü' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(integ => {
          const d = INTEGRATION_DEFS.find(x => x.id === integ.id)!
          const StatusIcon = STATUS_MAP[integ.status].icon
          const isConnected = integ.status === 'connected'
          const isError = integ.status === 'error'
          return (
            <div key={integ.id} className={`premium-card rounded-2xl border p-5 transition-all hover:shadow-lg ${isError ? 'border-red-500/30' : isConnected ? 'border-emerald-500/20' : 'border-border/40'}`}>
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl ${d.bgColor}`}>
                    {d.logo}
                  </div>
                  <div>
                    <p className="font-bold text-base">{integ.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_MAP[integ.status].color}`}>
                      <StatusIcon size={9} />
                      {STATUS_MAP[integ.status].label}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">{integ.description}</p>

              {/* Stats (connected only) */}
              {isConnected && integ.stats.lastSyncAt && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {integ.stats.monthlyOrders > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-black text-foreground">{integ.stats.monthlyOrders}</p>
                      <p className="text-[10px] text-slate-500">Bu ay sipariş</p>
                    </div>
                  )}
                  {integ.stats.monthlyRevenue > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-black text-emerald-400">₺{(integ.stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                      <p className="text-[10px] text-slate-500">Gelir</p>
                    </div>
                  )}
                  {integ.stats.productCount > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-black text-foreground">{integ.stats.productCount}</p>
                      <p className="text-[10px] text-slate-500">Ürün</p>
                    </div>
                  )}
                </div>
              )}

              {isConnected && integ.stats.lastSyncAt && (
                <p className="text-[10px] text-slate-600 mb-3 flex items-center gap-1">
                  <Clock size={9} />
                  Son senkronizasyon: {new Date(integ.stats.lastSyncAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {isError && integ.stats.syncErrors > 0 && (
                <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {integ.stats.syncErrors} senkronizasyon hatası
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isConnected && (
                  <button onClick={() => handleSync(integ)} disabled={syncing[integ.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/40 text-xs font-semibold text-slate-400 hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50">
                    <RefreshCw size={13} className={syncing[integ.id] ? 'animate-spin' : ''} />
                    Senkronize
                  </button>
                )}
                <button onClick={() => openConfig(integ)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isConnected || isError
                    ? 'border border-primary/30 bg-primary/8 text-primary hover:bg-primary/15'
                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                  }`}>
                  {isConnected ? <><Settings2 size={13} /> Ayarlar</> : isError ? <><AlertCircle size={13} /> Düzelt</> : <><Plus size={13} /> Bağlan</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Config Panel ─────────────────────────────────────────────────────── */}
      {configPanel && def && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfigPanel(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl ${def.bgColor}`}>
                  {def.logo}
                </div>
                <div>
                  <h3 className="font-bold">{def.name}</h3>
                  <p className="text-xs text-slate-400">{CATEGORY_LABELS[def.category]}</p>
                </div>
              </div>
              <button onClick={() => setConfigPanel(null)} className="p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${STATUS_MAP[configPanel.status].color}`}>
                {(() => { const Icon = STATUS_MAP[configPanel.status].icon; return <Icon size={14} /> })()}
                {STATUS_MAP[configPanel.status].label}
                {configPanel.connectedAt && (
                  <span className="ml-auto text-[10px] font-normal text-slate-500">
                    {new Date(configPanel.connectedAt).toLocaleDateString('tr-TR')} tarihinden beri
                  </span>
                )}
              </div>

              {/* Fields */}
              {def.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                      value={configForm[field.key] as string}
                      onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 pr-9 bg-slate-900/60 border border-border/40 rounded-xl text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {field.secret && (
                      <button onClick={() => toggleSecret(field.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Auto sync */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-slate-900/30">
                <div>
                  <p className="text-sm font-semibold">Otomatik Senkronizasyon</p>
                  <p className="text-xs text-slate-500">Her {configForm.syncInterval} dakikada bir güncelle</p>
                </div>
                <button onClick={() => setConfigForm(f => ({ ...f, autoSync: !f.autoSync }))}
                  className={`w-11 h-6 rounded-full border transition-all relative ${configForm.autoSync ? 'bg-primary border-primary/50' : 'bg-slate-700 border-slate-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${configForm.autoSync ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Webhook URL (opsiyonel)</label>
                <div className="relative">
                  <input value={configForm.webhookUrl} onChange={e => setConfigForm(f => ({ ...f, webhookUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-900/60 border border-border/40 rounded-xl text-sm font-mono focus:outline-none focus:border-primary/50" />
                </div>
              </div>

              {/* Docs link */}
              <a href={def.docsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary transition-colors">
                <ExternalLink size={12} />
                API dokümantasyonu
              </a>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-2">
                {configPanel.status === 'connected' && (
                  <button onClick={() => handleDisconnect(configPanel)}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    Bağlantıyı Kes
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button onClick={() => setConfigPanel(null)} className="px-4 py-2 rounded-xl border border-border/60 text-sm text-slate-400">
                    İptal
                  </button>
                  <button onClick={() => handleConnect(configPanel)}
                    className="flex items-center gap-2 px-5 py-2 bg-primary rounded-xl text-white text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
                    <Check size={15} />
                    {configPanel.status === 'connected' ? 'Güncelle' : 'Bağlan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
