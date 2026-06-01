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

  useEffect(() => {
    if (!isAuthenticated) { router.push('/alici-auth/giris'); return }
  }, [isAuthenticated, router])

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
            <h1 className="text-2xl font-black text-foreground uppercase tracking-wider">Hesabım</h1>
            <p className="text-slate-400 text-xs font-semibold mt-1.5">Adres defteri</p>
          </div>
        }
      />

      {/* Add new address button */}
      <div className="flex items-center justify-between mb-4 mt-6">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Kayıtlı Adresler</h2>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Yeni Adres
        </button>
      </div>

      {/* Address form */}
      {showForm && (
        <div className="bg-slate-900/65 border border-border/80 p-6 mb-6 shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{editId ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</h3>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">Adres Başlığı * (örn: Ev, İş)</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ev" className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">Ad Soyad *</label>
              <input type="text" value={form.recipientName} onChange={e => setForm({...form, recipientName: e.target.value})} placeholder="Ad Soyad" className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">Telefon *</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="05xx xxx xx xx" className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">Şehir *</label>
              <select value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all">
                <option value="" className="bg-slate-900 text-slate-400">Şehir seçin</option>
                {CITIES.map(c => <option key={c} value={c} className="bg-slate-900 text-foreground">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">İlçe</label>
              <input type="text" value={form.district} onChange={e => setForm({...form, district: e.target.value})} placeholder="İlçe" className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">Adres *</label>
              <textarea value={form.addressLine} onChange={e => setForm({...form, addressLine: e.target.value})} rows={2} placeholder="Sokak, bina no, daire..." className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505 resize-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider mb-1.5">Posta Kodu</label>
              <input type="text" value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})} placeholder="34000" maxLength={5} className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-505" />
            </div>
            <div className="sm:col-span-2">
              {error && <p className="text-xs text-red-405 font-bold mb-3">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all disabled:opacity-50 shadow-md shadow-primary/25">
                  {saving ? '...' : <><Check className="w-4 h-4" /> Kaydet</>}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="px-5 py-2.5 rounded-xl border border-border/80 text-slate-400 hover:text-white hover:bg-slate-800/40 text-xs font-bold transition-all">İptal</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="premium-card p-5 bg-slate-900/60 border border-border/80 animate-pulse h-32" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/60 border border-border/80 rounded-2xl p-6">
          <MapPin className="w-12 h-12 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold mb-4">Kayıtlı adresiniz yok.</p>
          <button onClick={() => setShowForm(true)} className="text-primary hover:underline text-xs font-bold">İlk adresinizi ekleyin</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={`premium-card p-5 space-y-2.5 bg-slate-900/60 border transition-all duration-300 hover:border-slate-700 ${a.isDefault ? 'border-primary/50 bg-gradient-to-br from-slate-900/70 to-primary/5 shadow-md shadow-primary/5' : 'border-border/80'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-foreground text-sm">{a.title}</span>
                  {a.isDefault && (
                    <span className="ml-2 text-[9px] bg-primary/20 text-primary rounded px-1.5 py-0.5 font-black uppercase tracking-wider">Varsayılan</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!a.isDefault && (
                    <button onClick={() => handleSetDefault(a.id)} className="p-1.5 rounded-lg text-slate-450 hover:text-yellow-405 hover:bg-yellow-500/10 transition-all" title="Varsayılan yap">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-slate-800 transition-all" title="Düzenle">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-slate-450 hover:text-red-405 hover:bg-red-500/10 transition-all" title="Sil">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-300">{a.recipientName} · {a.phone}</p>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{a.addressLine}{a.district ? `, ${a.district}` : ''}, {a.city}{a.postalCode ? ` ${a.postalCode}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
