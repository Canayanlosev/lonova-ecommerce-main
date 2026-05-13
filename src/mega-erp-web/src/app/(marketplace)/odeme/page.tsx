'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, CreditCard, Banknote, Truck, ChevronRight, Check, Lock, AlertCircle } from 'lucide-react'
import {
  marketplaceService,
  type CheckoutAddress, type CheckoutCard,
  type InstallmentOption, type BuyerOrderDto
} from '@/lib/services/marketplace.service'
import { useBuyerCartStore } from '@/store/buyerCart.store'
import { useBuyerAuthStore } from '@/store/buyerAuth.store'

type Step = 'address' | 'payment' | 'confirm'
type PaymentMethod = 'Card' | 'BankTransfer' | 'CashOnDelivery'

// Format card number with spaces every 4 digits
function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function detectBrand(num: string): string {
  const n = num.replace(/\s/g, '')
  if (n.startsWith('4')) return 'Visa'
  if (/^5[1-5]/.test(n) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(n)) return 'Mastercard'
  if (n.startsWith('9792')) return 'Troy'
  return ''
}

const CITIES = [
  'Adana','Ankara','Antalya','Bursa','Denizli','Diyarbakır','Eskişehir','Gaziantep',
  'İstanbul','İzmir','Kayseri','Kocaeli','Konya','Malatya','Mersin','Sakarya',
  'Samsun','Tekirdağ','Trabzon',
]

export default function OdemePage() {
  const router = useRouter()
  const { items, total, clear } = useBuyerCartStore()
  const { isAuthenticated, buyer } = useBuyerAuthStore()

  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState<CheckoutAddress>({
    recipientName: buyer ? `${buyer.firstName} ${buyer.lastName}` : '',
    phone: '',
    city: '',
    district: '',
    addressLine: '',
    postalCode: '',
  })
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Card')
  const [card, setCard] = useState<CheckoutCard & { _raw: string }>({
    cardNumber: '', cardHolder: '', expiryMonth: '', expiryYear: '', cvv: '', installmentCount: 1, _raw: ''
  })
  const [installments, setInstallments] = useState<InstallmentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<BuyerOrderDto | null>(null)

  useEffect(() => {
    if (!isAuthenticated) router.push('/alici-auth/giris')
  }, [isAuthenticated, router])

  useEffect(() => {
    if (items.length === 0 && !order) router.push('/sepet')
  }, [items, order, router])

  const loadInstallments = useCallback(async () => {
    if (total <= 0) return
    try {
      const opts = await marketplaceService.getInstallments(total)
      setInstallments(opts)
    } catch { /* ignore */ }
  }, [total])

  useEffect(() => {
    if (step === 'payment' && payMethod === 'Card') loadInstallments()
  }, [step, payMethod, loadInstallments])

  const handleCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16)
    setCard((c) => ({ ...c, _raw: digits, cardNumber: formatCardNumber(digits) }))
  }

  const validateAddress = () => {
    if (!address.recipientName.trim()) return 'Ad Soyad zorunludur.'
    if (!address.phone.replace(/\D/g, '') || address.phone.replace(/\D/g, '').length < 10) return 'Geçerli bir telefon numarası girin.'
    if (!address.city) return 'Şehir seçin.'
    if (!address.addressLine.trim()) return 'Adres satırı zorunludur.'
    return null
  }

  const handleNextStep = () => {
    setError('')
    if (step === 'address') {
      const err = validateAddress()
      if (err) { setError(err); return }
      setStep('payment')
    } else if (step === 'payment') {
      setStep('confirm')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await marketplaceService.checkout({
        address,
        paymentMethod: payMethod,
        card: payMethod === 'Card' ? {
          cardNumber: card._raw,
          cardHolder: card.cardHolder,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          cvv: card.cvv,
          installmentCount: card.installmentCount,
        } : undefined,
      })

      if (!result.success) {
        setError(result.errorMessage ?? 'Ödeme başarısız.')
        setStep('payment')
        return
      }

      setOrder(result.order!)
      clear()
    } catch {
      setError('Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Siparişiniz Alındı!</h1>
        <p className="text-slate-400 mb-1">Sipariş No: <span className="text-primary font-mono">{order.id.slice(0, 8).toUpperCase()}</span></p>
        <p className="text-slate-400 mb-8 text-sm">
          {order.paymentMethod === 'CashOnDelivery'
            ? 'Kapıda ödeme ile sipariş oluşturuldu.'
            : order.paymentMethod === 'BankTransfer'
            ? 'Havale bilgileri e-posta adresinize gönderildi.'
            : `${order.cardBrand} **** ${order.cardLastFour} ile ödeme alındı.`}
        </p>

        <div className="premium-card p-6 text-left mb-6">
          <h3 className="font-semibold mb-3 text-foreground">Sipariş Özeti</h3>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
              <span className="text-slate-300">{item.productName}{item.variantName ? ` — ${item.variantName}` : ''} ×{item.quantity}</span>
              <span className="text-foreground">{(item.unitPrice * item.quantity).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-3">
            <span>Toplam</span>
            <span className="text-primary">{order.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
          </div>
          {order.installmentCount > 1 && (
            <p className="text-xs text-slate-400 mt-1 text-right">
              {order.installmentCount} × {order.installmentAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} taksit
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/hesabim/siparisler" className="premium-button">Siparişlerim</Link>
          <Link href="/" className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-surface transition-all">Alışverişe Devam</Link>
        </div>
      </div>
    )
  }

  const stepLabels: Step[] = ['address', 'payment', 'confirm']
  const stepIdx = stepLabels.indexOf(step)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Ödeme</h1>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { key: 'address', label: 'Adres', icon: MapPin },
          { key: 'payment', label: 'Ödeme', icon: CreditCard },
          { key: 'confirm', label: 'Onay', icon: Check },
        ].map(({ key, label, icon: Icon }, i) => (
          <div key={key} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${i <= stepIdx ? 'text-primary' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                i < stepIdx ? 'bg-primary border-primary text-white' :
                i === stepIdx ? 'border-primary text-primary' :
                'border-slate-600 text-slate-500'
              }`}>
                {i < stepIdx ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium hidden sm:block">{label}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-px ${i < stepIdx ? 'bg-primary' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Address */}
          {step === 'address' && (
            <div className="premium-card p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />Teslimat Adresi</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Ad Soyad *</label>
                  <input value={address.recipientName} onChange={(e) => setAddress({...address, recipientName: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Telefon *</label>
                  <input value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Posta Kodu</label>
                  <input value={address.postalCode} onChange={(e) => setAddress({...address, postalCode: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="34000" maxLength={5} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Şehir *</label>
                  <select value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Seçin</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">İlçe</label>
                  <input value={address.district} onChange={(e) => setAddress({...address, district: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="İlçe" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Açık Adres *</label>
                  <textarea value={address.addressLine} onChange={(e) => setAddress({...address, addressLine: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="Mahalle, sokak, kapı no, daire..." />
                </div>
              </div>
              <button onClick={handleNextStep} className="w-full premium-button flex items-center justify-center gap-2">
                Ödemeye Geç <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2 — Payment */}
          {step === 'payment' && (
            <div className="space-y-4">
              {/* Method selector */}
              <div className="premium-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Ödeme Yöntemi</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'Card', label: 'Kredi/Banka Kartı', icon: CreditCard, desc: 'Taksit imkanı' },
                    { key: 'BankTransfer', label: 'Havale / EFT', icon: Banknote, desc: '%2 indirim' },
                    { key: 'CashOnDelivery', label: 'Kapıda Ödeme', icon: Truck, desc: '+₺29.90 hizmet bedeli' },
                  ].map(({ key, label, icon: Icon, desc }) => (
                    <button key={key} onClick={() => setPayMethod(key as PaymentMethod)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        payMethod === key ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}>
                      <Icon className={`w-5 h-5 mb-2 ${payMethod === key ? 'text-primary' : 'text-slate-400'}`} />
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card form */}
              {payMethod === 'Card' && (
                <div className="premium-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Kart Bilgileri</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Lock className="w-3 h-3" /> 256-bit SSL
                    </div>
                  </div>

                  {/* Card preview */}
                  <div className="relative h-44 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-5 text-white overflow-hidden select-none">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_20%,white,transparent)]" />
                    <div className="text-xs mb-1 opacity-70">{detectBrand(card._raw) || 'Kart'}</div>
                    <div className="font-mono text-xl tracking-widest mt-3">
                      {card.cardNumber || '•••• •••• •••• ••••'}
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                      <div>
                        <div className="text-[10px] opacity-70">KART SAHİBİ</div>
                        <div className="text-sm font-medium uppercase">{card.cardHolder || 'AD SOYAD'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] opacity-70">SON KULLANMA</div>
                        <div className="text-sm font-mono">{card.expiryMonth || 'MM'}/{card.expiryYear || 'YY'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Kart Numarası</label>
                      <input value={card.cardNumber} onChange={(e) => handleCardNumber(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="0000 0000 0000 0000" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Kart Üzerindeki Ad</label>
                      <input value={card.cardHolder} onChange={(e) => setCard({...card, cardHolder: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="AD SOYAD" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Ay</label>
                        <select value={card.expiryMonth} onChange={(e) => setCard({...card, expiryMonth: e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">MM</option>
                          {Array.from({length: 12}, (_, i) => String(i+1).padStart(2,'0')).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Yıl</label>
                        <select value={card.expiryYear} onChange={(e) => setCard({...card, expiryYear: e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">YY</option>
                          {Array.from({length: 10}, (_, i) => String(new Date().getFullYear() + i).slice(-2)).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">CVV</label>
                        <input value={card.cvv} onChange={(e) => setCard({...card, cvv: e.target.value.replace(/\D/g,'').slice(0,4)})}
                          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="•••" type="password" maxLength={4} />
                      </div>
                    </div>
                  </div>

                  {/* Installment */}
                  {installments.length > 0 && (
                    <div>
                      <label className="text-xs text-slate-400 mb-2 block font-medium">Taksit Seçeneği</label>
                      <div className="space-y-2">
                        {installments.map((opt) => (
                          <label key={opt.count} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            card.installmentCount === opt.count ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                          }`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="installment" checked={card.installmentCount === opt.count}
                                onChange={() => setCard({...card, installmentCount: opt.count})} className="accent-primary" />
                              <span className="text-sm text-foreground">{opt.label}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                {opt.count === 1
                                  ? opt.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
                                  : `${opt.monthlyAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} / ay`}
                              </p>
                              {opt.count > 1 && (
                                <p className="text-xs text-slate-400">Toplam: {opt.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {payMethod === 'BankTransfer' && (
                <div className="premium-card p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" />Havale Bilgileri</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Banka', 'Lonova Bank A.Ş.'],
                      ['IBAN', 'TR00 0000 0000 0000 0000 0000 00'],
                      ['Hesap Adı', 'Lonova Ticaret A.Ş.'],
                      ['Açıklama', `Sipariş #${Date.now().toString().slice(-8)}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <span className="text-slate-400 w-28 shrink-0">{k}</span>
                        <span className="text-foreground font-mono text-xs sm:text-sm">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    Havale sonrası siparişiniz 1-2 iş günü içinde onaylanır. %2 indirim sepet tutarına uygulanır.
                  </p>
                </div>
              )}

              {payMethod === 'CashOnDelivery' && (
                <div className="premium-card p-6">
                  <p className="text-sm text-slate-300 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary shrink-0" />
                    Kapıda nakit ödeme. Teslimat sırasında +₺29.90 hizmet bedeli alınır.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('address')} className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-surface transition-all text-sm">
                  Geri
                </button>
                <button onClick={handleNextStep} className="flex-1 premium-button flex items-center justify-center gap-2">
                  Siparişi Onayla <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirm */}
          {step === 'confirm' && (
            <div className="premium-card p-6 space-y-5">
              <h2 className="text-lg font-semibold">Sipariş Onayı</h2>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Teslimat Adresi</p>
                <p className="text-sm text-foreground">{address.recipientName} · {address.phone}</p>
                <p className="text-sm text-slate-300">{address.addressLine}, {address.district} {address.city} {address.postalCode}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ödeme</p>
                {payMethod === 'Card' && (
                  <p className="text-sm text-foreground">
                    {detectBrand(card._raw) || 'Kart'} •••• {card._raw.slice(-4)}
                    {card.installmentCount > 1 && ` · ${card.installmentCount} Taksit`}
                  </p>
                )}
                {payMethod === 'BankTransfer' && <p className="text-sm text-foreground">Havale / EFT</p>}
                {payMethod === 'CashOnDelivery' && <p className="text-sm text-foreground">Kapıda Ödeme (+₺29.90)</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('payment')} className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-surface transition-all text-sm">
                  Geri
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 premium-button flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? 'İşleniyor...' : (
                    <><Lock className="w-4 h-4" /> Siparişi Tamamla</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="premium-card p-5 h-fit sticky top-24 space-y-3">
          <h3 className="font-semibold text-foreground">Sipariş ({items.length} ürün)</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="text-slate-300 truncate max-w-[60%]">
                  {item.productName}{item.variantName ? ` · ${item.variantName}` : ''} ×{item.quantity}
                </span>
                <span className="text-foreground shrink-0">{item.lineTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Ara toplam</span>
              <span>{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            {payMethod === 'CashOnDelivery' && (
              <div className="flex justify-between text-slate-400">
                <span>Kapıda ödeme</span>
                <span>+₺29,90</span>
              </div>
            )}
            {payMethod === 'BankTransfer' && (
              <div className="flex justify-between text-green-400">
                <span>Havale indirimi</span>
                <span>-{(total * 0.02).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
              </div>
            )}
            {payMethod === 'Card' && card.installmentCount > 1 && (() => {
              const opt = installments.find(o => o.count === card.installmentCount)
              if (!opt) return null
              return (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{card.installmentCount}×{opt.monthlyAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                  <span>Toplam: {opt.totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
              )
            })()}
            <div className="flex justify-between text-slate-400">
              <span>Kargo</span>
              <span className="text-green-400">Ücretsiz</span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
              <span>Toplam</span>
              <span className="text-primary">
                {(() => {
                  const opt = installments.find(o => o.count === card.installmentCount)
                  const extra = payMethod === 'CashOnDelivery' ? 29.90 : payMethod === 'BankTransfer' ? -(total * 0.02) : 0
                  const cardTotal = payMethod === 'Card' && opt ? opt.totalAmount : total
                  return (cardTotal + extra).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
