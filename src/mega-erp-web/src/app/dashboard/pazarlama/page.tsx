'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Megaphone, Plus, Send, Users, Crown, Star, TrendingUp,
  Clock, CheckCircle2, X, Mail, MessageSquare, Smartphone,
  BarChart2, Eye, MousePointer, Trash2, Edit2, Copy,
  AlertTriangle, ChevronDown, Sparkles, Target
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────────

type ChannelType = 'sms' | 'email' | 'push'
type SegmentType = 'tümü' | 'vip' | 'sadık' | 'yeni' | 'pasif'
type CampaignStatus = 'taslak' | 'gönderildi' | 'planlandı'

interface Campaign {
  id: string
  name: string
  channel: ChannelType
  segment: SegmentType
  subject: string         // email subject or SMS title
  body: string
  status: CampaignStatus
  scheduledAt: string     // ISO or '' for immediate
  sentAt: string          // ISO when sent
  recipientCount: number
  // Simulated engagement
  openRate: number        // 0-100 (%)
  clickRate: number       // 0-100 (%)
  createdAt: string
}

const CAMPAIGNS_KEY = 'marketing-campaigns'

const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  sms:   { label: 'SMS',        icon: Smartphone,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  email: { label: 'E-posta',    icon: Mail,            color: 'text-primary',     bg: 'bg-primary/10' },
  push:  { label: 'Bildirim',   icon: MessageSquare,   color: 'text-violet-400',  bg: 'bg-violet-500/10' },
}

const SEGMENT_CONFIG: Record<SegmentType, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  tümü:  { label: 'Tüm Müşteriler', icon: Users,      color: 'text-foreground',  desc: 'Tüm aktif müşteriler' },
  vip:   { label: 'VIP',            icon: Crown,       color: 'text-amber-400',   desc: '3+ sipariş, en yüksek harcama' },
  sadık: { label: 'Sadık',          icon: Star,        color: 'text-primary',     desc: '2+ sipariş, geri dönen müşteriler' },
  yeni:  { label: 'Yeni',           icon: TrendingUp,  color: 'text-emerald-400', desc: 'İlk 30 gün içinde kayıt' },
  pasif: { label: 'Pasif',          icon: Clock,       color: 'text-red-400',     desc: '90+ gün sipariş vermedi' },
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; cls: string }> = {
  taslak:     { label: 'Taslak',      cls: 'bg-slate-800 text-slate-400 border-border/80' },
  gönderildi: { label: 'Gönderildi',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  planlandı:  { label: 'Planlandı',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

const MESSAGE_TEMPLATES: Record<ChannelType, { name: string; subject: string; body: string }[]> = {
  sms: [
    { name: 'Özel İndirim', subject: 'Özel İndirim', body: 'Merhaba {isim}! Sadece size özel %20 indirim kodu: OZEL20. Bugün sona eriyor. 🛒' },
    { name: 'Yeni Ürün', subject: 'Yeni Ürün', body: 'Merhaba {isim}! Yeni ürünlerimiz geldi. Hemen inceleyin: {link}' },
    { name: 'Sepet Hatırlatma', subject: 'Sepet', body: 'Merhaba {isim}! Sepetinizdeki ürünler hâlâ sizi bekliyor. Tamamlamak için tıklayın: {link}' },
  ],
  email: [
    { name: 'Aylık Bülten', subject: 'Bu Ay En Çok Satanlar 🛍️', body: 'Merhaba {isim},\n\nBu ay en çok satan ürünlerimizi sizin için derledik...\n\n✅ Ürün 1\n✅ Ürün 2\n✅ Ürün 3\n\nGörmek için tıklayın: {link}\n\nİyi alışverişler!' },
    { name: 'Doğum Günü', subject: '🎂 Doğum Gününüz Kutlu Olsun!', body: 'Sevgili {isim},\n\nDoğum gününüzü kutlamak istiyoruz! Size özel %15 indirim kodunuz: DOGUMGUNU15\n\nKullanmak için: {link}' },
    { name: 'Sipariş Teşekkür', subject: 'Siparişiniz İçin Teşekkürler 🙏', body: 'Merhaba {isim},\n\nSiparişiniz için teşekkürler! Kargonuz en kısa sürede yola çıkacak.\n\nSipariş takibi: {link}' },
  ],
  push: [
    { name: 'Flash Sale', subject: '⚡ Flaş İndirim!', body: '2 saat boyunca tüm ürünlerde %30 indirim! Hemen alın.' },
    { name: 'Stok Uyarısı', subject: '🔥 Son Birkaç Ürün!', body: 'Sepetinizdeki ürün tükenmek üzere. Kaçırmayın!' },
  ],
}

function generateId() {
  return `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Simulated recipient counts per segment (would be API-driven in production)
function estimateRecipients(segment: SegmentType, total = 142): number {
  const ratios: Record<SegmentType, number> = {
    tümü:  1.0, vip: 0.08, sadık: 0.35, yeni: 0.22, pasif: 0.18,
  }
  return Math.round(total * ratios[segment])
}

// Simulate open/click rates based on channel + segment
function simulateRates(channel: ChannelType, segment: SegmentType): { openRate: number; clickRate: number } {
  const baseOpen: Record<ChannelType, number> = { sms: 85, email: 28, push: 55 }
  const segBonus: Record<SegmentType, number> = { vip: 12, sadık: 6, yeni: 4, tümü: 0, pasif: -8 }
  const openRate = Math.min(95, Math.max(5, baseOpen[channel] + segBonus[segment] + Math.round(Math.random() * 8 - 4)))
  const clickRate = Math.round(openRate * (channel === 'email' ? 0.18 : channel === 'push' ? 0.25 : 0.12) + Math.random() * 3)
  return { openRate, clickRate }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PazarlamaPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'kampanyalar' | 'şablonlar'>('kampanyalar')

  const [form, setForm] = useState({
    name: '',
    channel: 'email' as ChannelType,
    segment: 'tümü' as SegmentType,
    subject: '',
    body: '',
    scheduledAt: '',
  })

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CAMPAIGNS_KEY)
      if (raw) setCampaigns(JSON.parse(raw) as Campaign[])
    } catch {}
  }, [])

  const save = useCallback((next: Campaign[]) => {
    setCampaigns(next)
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(next))
  }, [])

  const openCreate = () => {
    setForm({ name: '', channel: 'email', segment: 'tümü', subject: '', body: '', scheduledAt: '' })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (c: Campaign) => {
    setForm({ name: c.name, channel: c.channel, segment: c.segment, subject: c.subject, body: c.body, scheduledAt: c.scheduledAt })
    setEditId(c.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.body.trim()) return
    if (editId) {
      save(campaigns.map(c => c.id === editId
        ? { ...c, name: form.name, channel: form.channel, segment: form.segment, subject: form.subject, body: form.body, scheduledAt: form.scheduledAt }
        : c
      ))
    } else {
      const camp: Campaign = {
        id: generateId(), name: form.name, channel: form.channel, segment: form.segment,
        subject: form.subject, body: form.body,
        status: form.scheduledAt ? 'planlandı' : 'taslak',
        scheduledAt: form.scheduledAt, sentAt: '', createdAt: new Date().toISOString(),
        recipientCount: estimateRecipients(form.segment), openRate: 0, clickRate: 0,
      }
      save([camp, ...campaigns])
    }
    setShowForm(false)
    setEditId(null)
  }

  const handleSend = async (id: string) => {
    setSending(id)
    await new Promise(r => setTimeout(r, 1200)) // simulate sending
    const c = campaigns.find(c => c.id === id)
    if (!c) { setSending(null); return }
    const rates = simulateRates(c.channel, c.segment)
    save(campaigns.map(camp => camp.id === id
      ? { ...camp, status: 'gönderildi', sentAt: new Date().toISOString(), ...rates }
      : camp
    ))
    setSending(null)
  }

  const handleDelete = (id: string) => {
    save(campaigns.filter(c => c.id !== id))
  }

  const handleDuplicate = (c: Campaign) => {
    const dup: Campaign = { ...c, id: generateId(), name: `${c.name} (Kopya)`, status: 'taslak', sentAt: '', openRate: 0, clickRate: 0, createdAt: new Date().toISOString() }
    save([dup, ...campaigns])
  }

  const applyTemplate = (t: { subject: string; body: string }) => {
    setForm(f => ({ ...f, subject: t.subject, body: t.body }))
  }

  // Stats
  const stats = useMemo(() => {
    const sent = campaigns.filter(c => c.status === 'gönderildi')
    const totalRecipients = sent.reduce((s, c) => s + c.recipientCount, 0)
    const avgOpen = sent.length > 0 ? Math.round(sent.reduce((s, c) => s + c.openRate, 0) / sent.length) : 0
    const avgClick = sent.length > 0 ? Math.round(sent.reduce((s, c) => s + c.clickRate, 0) / sent.length) : 0
    return { total: campaigns.length, sent: sent.length, totalRecipients, avgOpen, avgClick, drafts: campaigns.filter(c => c.status === 'taslak').length }
  }, [campaigns])

  const estimatedRecipients = useMemo(() => estimateRecipients(form.segment), [form.segment])
  const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-600'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-primary" /> Pazarlama
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Müşteri segmentlerine SMS, e-posta ve bildirim kampanyaları</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all hover:-translate-y-0.5 shadow-md shadow-primary/20 w-fit"
        >
          <Plus className="w-4 h-4" /> Yeni Kampanya
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Kampanya', value: stats.total, icon: Megaphone, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Gönderildi', value: stats.sent, icon: Send, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Taslak', value: stats.drafts, icon: Edit2, color: 'text-slate-400', bg: 'bg-slate-800/60' },
          { label: 'Toplam Alıcı', value: stats.totalRecipients.toLocaleString('tr-TR'), icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Ort. Açılma', value: `%${stats.avgOpen}`, icon: Eye, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="premium-card p-4 flex items-center gap-3 border border-border/80 bg-slate-900/40">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-black ${color} leading-none`}>{value}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wide mt-0.5 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/40 border border-border/80 rounded-xl w-fit">
        {(['kampanyalar', 'şablonlar'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
              activeTab === t ? 'bg-slate-800 text-foreground border border-border/60 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'kampanyalar' ? '📋 Kampanyalar' : '✨ Şablonlar'}
          </button>
        ))}
      </div>

      {/* ── Campaigns tab ── */}
      {activeTab === 'kampanyalar' && (
        <>
          {campaigns.length === 0 ? (
            <div className="premium-card p-16 text-center border border-border/80">
              <Megaphone className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">Henüz kampanya oluşturulmadı.</p>
              <p className="text-slate-600 text-xs mt-1 font-semibold">İlk kampanyanızı oluşturun ve müşterilerinize ulaşın.</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-xs font-bold mx-auto">
                <Plus className="w-3.5 h-3.5" /> İlk Kampanyayı Oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => {
                const chCfg = CHANNEL_CONFIG[c.channel]
                const segCfg = SEGMENT_CONFIG[c.segment]
                const stCfg = STATUS_CONFIG[c.status]
                const ChIcon = chCfg.icon
                const SegIcon = segCfg.icon
                const isSent = c.status === 'gönderildi'
                const isSending = sending === c.id

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="premium-card p-5 border border-border/70 bg-slate-900/40 hover:border-slate-700/80 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Channel icon */}
                        <div className={`w-10 h-10 rounded-xl ${chCfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <ChIcon className={`w-5 h-5 ${chCfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-foreground text-sm">{c.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${stCfg.cls}`}>
                              {stCfg.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border bg-transparent border-border/60 ${chCfg.color}`}>
                              {chCfg.label}
                            </span>
                          </div>
                          {c.subject && (
                            <p className="text-xs text-slate-400 font-semibold mt-0.5 truncate">{c.subject}</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{c.body}</p>

                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${segCfg.color}`}>
                              <SegIcon className="w-3 h-3" />
                              {segCfg.label}
                              <span className="text-slate-500 font-semibold">({c.recipientCount} kişi)</span>
                            </span>
                            {c.sentAt && (
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {new Date(c.sentAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {c.scheduledAt && c.status === 'planlandı' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                                <Clock className="w-3 h-3" />
                                {new Date(c.scheduledAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {/* Engagement stats if sent */}
                          {isSent && (
                            <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-border/40">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3 h-3 text-slate-500" />
                                <span className="text-xs font-black text-foreground">%{c.openRate}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">açılma</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MousePointer className="w-3 h-3 text-slate-500" />
                                <span className="text-xs font-black text-foreground">%{c.clickRate}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">tıklama</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-slate-500" />
                                <span className="text-xs font-black text-foreground">
                                  {Math.round(c.recipientCount * c.openRate / 100)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">açtı</span>
                              </div>
                              {/* Mini bar chart */}
                              <div className="flex-1 max-w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-auto">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${c.openRate}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isSent && (
                          <button
                            onClick={() => handleSend(c.id)}
                            disabled={!!sending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all text-xs font-bold disabled:opacity-50"
                          >
                            {isSending ? (
                              <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            {isSending ? 'Gönderiliyor…' : 'Gönder'}
                          </button>
                        )}
                        <button onClick={() => openEdit(c)} className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Düzenle">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDuplicate(c)} className="p-2 rounded-xl text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" aria-label="Kopyala">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label="Sil">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Templates tab ── */}
      {activeTab === 'şablonlar' && (
        <div className="space-y-6">
          <div className="premium-card p-4 border border-primary/15 bg-primary/3 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 font-semibold">
              Hazır şablonlardan birini seçin, kişiselleştirin ve hemen gönderin. <span className="text-primary font-bold">{'{ isim }'}</span> gibi değişkenler otomatik doldurulur.
            </p>
          </div>
          {(Object.entries(MESSAGE_TEMPLATES) as [ChannelType, typeof MESSAGE_TEMPLATES[ChannelType]][]).map(([channel, templates]) => {
            const chCfg = CHANNEL_CONFIG[channel]
            const ChIcon = chCfg.icon
            return (
              <div key={channel}>
                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  <ChIcon className={`w-3.5 h-3.5 ${chCfg.color}`} />
                  {chCfg.label} Şablonları
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map(t => (
                    <div key={t.name} className="premium-card p-4 border border-border/70 bg-slate-900/40 hover:border-slate-700/80 transition-all space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-foreground">{t.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${chCfg.bg} border-transparent ${chCfg.color}`}>
                          {chCfg.label}
                        </span>
                      </div>
                      {t.subject && (
                        <p className="text-[10px] text-slate-500 font-semibold">Konu: {t.subject}</p>
                      )}
                      <p className="text-[10px] text-slate-400 line-clamp-3 whitespace-pre-line font-medium">{t.body}</p>
                      <button
                        onClick={() => {
                          setForm(f => ({ ...f, channel, subject: t.subject, body: t.body, name: t.name }))
                          setEditId(null)
                          setShowForm(true)
                          setActiveTab('kampanyalar')
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-[10px] font-bold border border-primary/20"
                      >
                        <Copy className="w-3 h-3" /> Bu Şablonu Kullan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              key="camp-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            />
            <motion.div
              key="camp-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <div
                className="bg-slate-900 border border-border/80 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-6"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-foreground text-sm flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    {editId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Campaign name */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Kampanya Adı *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="örn: Mayıs İndirim Kampanyası" autoFocus className={inputCls} />
                </div>

                {/* Channel + Segment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Kanal</label>
                    <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as ChannelType }))} className={inputCls + ' cursor-pointer'}>
                      {(Object.entries(CHANNEL_CONFIG) as [ChannelType, typeof CHANNEL_CONFIG[ChannelType]][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Hedef Segment</label>
                    <select value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value as SegmentType }))} className={inputCls + ' cursor-pointer'}>
                      {(Object.entries(SEGMENT_CONFIG) as [SegmentType, typeof SEGMENT_CONFIG[SegmentType]][]).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Segment info */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/30 border border-border/50">
                  <Target className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <p className="text-[10px] text-slate-400 font-semibold flex-1">
                    {SEGMENT_CONFIG[form.segment].desc}
                  </p>
                  <span className="text-xs font-black text-foreground">~{estimatedRecipients} kişi</span>
                </div>

                {/* Subject (for email) */}
                {form.channel === 'email' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Konu Başlığı</label>
                    <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="E-posta konu satırı" className={inputCls} />
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                    Mesaj İçeriği *
                    <span className="ml-2 text-slate-600 normal-case font-semibold">{'Değişkenler: {isim} {link}'}</span>
                  </label>
                  <textarea
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder={form.channel === 'sms' ? 'SMS mesajınız (160 karakter)…' : form.channel === 'push' ? 'Bildirim metni…' : 'E-posta içeriği…'}
                    rows={5}
                    maxLength={form.channel === 'sms' ? 160 : 2000}
                    className={inputCls + ' resize-none'}
                  />
                  {form.channel === 'sms' && (
                    <p className="text-[10px] text-slate-500 font-semibold text-right mt-1">{form.body.length}/160</p>
                  )}
                </div>

                {/* Quick templates */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Hızlı Şablon</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {MESSAGE_TEMPLATES[form.channel].map(t => (
                      <button
                        key={t.name}
                        onClick={() => applyTemplate(t)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-border/60 text-slate-400 hover:text-foreground hover:border-primary/30 transition-all"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                    <Clock className="w-3 h-3 inline mr-1" />Zamanlama (isteğe bağlı)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className={inputCls + ' cursor-pointer'}
                  />
                  <p className="text-[10px] text-slate-600 font-semibold mt-1">Boş bırakırsanız taslak olarak kaydedilir.</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border/80 text-slate-400 hover:text-white text-xs font-bold transition-colors">
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.name.trim() || !form.body.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md shadow-primary/20"
                  >
                    {editId ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
