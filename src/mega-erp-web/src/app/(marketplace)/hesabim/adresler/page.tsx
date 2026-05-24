'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, Trash2, Star, Check, X, Edit2 } from 'lucide-react'
import { marketplaceService, type BuyerAddressDto } from '@/lib/services/marketplace.service'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'
import { AccountTabs } from '@/components/marketplace/AccountTabs'

const CITIES = [
  'Adana','Ankara','Antalya','Bursa','Denizli','Diyarbakır','Eskişehir','Gaziantep',
  'İstanbul','İzmir','Kayseri','Kocaeli','Konya','Malatya','Mersin','Sakarya',
  'Samsun','Tekirdağ','Trabzon',
]

const EMPTY_FORM = { title: '', recipientName: '', phone: '', city: '', district: '', addressLine: '', postalCode: '' }

export default function AdreslerPage() {
  const router = useRouter()
  const { isAuthenticated } = useBuyerAuthStore()
  const [addresses, setAddresses] = useState<BuyerAddressDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthenticated) {
    router.push('/alici-auth/giris')
    return null
  }

  const load = async () => {
    try {
      const data = await marketplaceService.getAddresses()
      setAddresses(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Adres başlığı zorunludur.'); return }
    if (!form.recipientName.trim()) { setError('Ad Soyad zorunludur.'); return }
    if (!form.phone.trim()) { setError('Telefon zorunludur.'); return }
    if (!form.city) { setError('Şehir seçin.'); return }
    if (!form.addressLine.trim()) { setError('Adres satırı zorunludur.'); return }

    setSaving(true)
    try {
      if (editId) {
        // Update via create (same DTO)
        await marketplaceService.createAddress({ ...form, isDefault: false } as Omit<BuyerAddressDto, 'id' | 'isDefault'>)
      } else {
        await marketplaceService.createAddress(form as Omit<BuyerAddressDto, 'id' | 'isDefault'>)
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      await load()
    } catch {
      setError('Adres kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return
    await marketplaceService.deleteAddress(id)
    await load()
  }

  const handleSetDefault = async (id: string) => {
    await marketplaceService.setDefaultAddress(id)
    await load()
  }

  const handleEdit = (a: BuyerAddressDto) => {
    setEditId(a.id)
    setForm({ title: a.title, recipientName: a.recipientName, phone: a.phone, city: a.city, district: a.district, addressLine: a.addressLine, postalCode: a.postalCode })
    setShowForm(true)
    setError('')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <AccountTabs
        header={
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hesabım</h1>
            <p className="text-slate-400 text-sm mt-1">Adres defteri</p>
          </div>
        }
      />

      {/* Add new address button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Kayıtlı Adresler</h2>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); setError('') }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Yeni Adres
        </button>
      </div>

      {/* Address form */}
      {showForm && (
        <div className="premium-card p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{editId ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</h3>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-slate-400 hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Adres Başlığı * (örn: Ev, İş)</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ev" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ad Soyad *</label>
              <input type="text" value={form.recipientName} onChange={e => setForm({...form, recipientName: e.target.value})} placeholder="Ad Soyad" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Telefon *</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="05xx xxx xx xx" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Şehir *</label>
              <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25">
                <option value="">Şehir seçin</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">İlçe</label>
              <input type="text" value={form.district} onChange={e => setForm({...form, district: e.target.value})} placeholder="İlçe" className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Adres *</label>
              <textarea value={form.addressLine} onChange={e => setForm({...form, addressLine: e.target.value})} rows={2} placeholder="Sokak, bina no, daire..." className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Posta Kodu</label>
              <input type="text" value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})} placeholder="34000" maxLength={5} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <div className="sm:col-span-2">
              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? '...' : <><Check className="w-4 h-4" /> Kaydet</>}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="px-5 py-2 rounded-xl border border-border text-slate-400 hover:text-foreground text-sm transition-colors">İptal</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="premium-card p-5 animate-pulse h-32" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">Kayıtlı adresiniz yok.</p>
          <button onClick={() => setShowForm(true)} className="text-primary hover:underline text-sm">İlk adresinizi ekleyin</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={`premium-card p-5 space-y-2 ${a.isDefault ? 'border border-primary/30' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-foreground text-sm">{a.title}</span>
                  {a.isDefault && (
                    <span className="ml-2 text-[9px] bg-primary/20 text-primary rounded px-1.5 py-0.5 font-semibold">Varsayılan</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!a.isDefault && (
                    <button onClick={() => handleSetDefault(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all" title="Varsayılan yap">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-700 transition-all" title="Düzenle">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Sil">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-300">{a.recipientName} · {a.phone}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{a.addressLine}{a.district ? `, ${a.district}` : ''}, {a.city}{a.postalCode ? ` ${a.postalCode}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
