/* eslint-disable */
const Checkout = ({ items, onBack, onComplete }) => {
  const [step, setStep] = React.useState(1);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  return (
    <section className="max-w-6xl mx-auto px-6 lg:px-10 py-8 animate-fade-in">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 mb-6"><I.ArrowLeft size={14} />Alışverişe dön</button>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-6">Ödeme</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">
          <Step n={1} title="Teslimat Adresi" open={step === 1} onOpen={() => setStep(1)} done={step > 1}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ad" value="Can" />
              <Field label="Soyad" value="Ayan" />
              <Field label="Telefon" value="+90 555 000 00 00" className="col-span-2" />
              <Field label="Adres" value="Karadeniz Mah. 1. Sokak No:5/3" className="col-span-2" />
              <Field label="Şehir" value="İstanbul" />
              <Field label="Posta Kodu" value="34000" />
            </div>
            <Button size="md" className="mt-4" onClick={() => setStep(2)}>Devam Et</Button>
          </Step>
          <Step n={2} title="Kargo Yöntemi" open={step === 2} onOpen={() => setStep(2)} done={step > 2}>
            <div className="space-y-2">
              {[['Standart kargo', '1-2 iş günü', 'Ücretsiz', true],['Express kargo', 'Yarın teslim', '₺49.90', false]].map(([n, d, p, sel]) => (
                <label key={n} className={cx('flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer', sel ? 'border-slate-900' : 'border-slate-200')}>
                  <div className={cx('w-4 h-4 rounded-full border-2', sel ? 'border-slate-900 bg-slate-900' : 'border-slate-300')} />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{n}</p>
                    <p className="text-xs text-slate-500">{d}</p>
                  </div>
                  <p className={cx('text-sm font-bold', p === 'Ücretsiz' ? 'text-emerald-600' : 'text-slate-900')}>{p}</p>
                </label>
              ))}
            </div>
            <Button size="md" className="mt-4" onClick={() => setStep(3)}>Devam Et</Button>
          </Step>
          <Step n={3} title="Ödeme" open={step === 3} onOpen={() => setStep(3)}>
            <div className="space-y-3">
              <Field label="Kart üzerindeki isim" value="CAN AYAN" />
              <Field label="Kart numarası" value="4242 4242 4242 4242" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Son kullanma" value="08/28" />
                <Field label="CVC" value="•••" />
              </div>
            </div>
            <Button size="lg" className="mt-4 w-full" variant="accent" onClick={onComplete}><I.Lock size={16} />₺{subtotal.toLocaleString('tr-TR')} Öde</Button>
            <p className="text-[11px] text-slate-500 text-center mt-3">iyzico üzerinden 256-bit SSL şifreli ödeme</p>
          </Step>
        </div>
        <aside className="bg-slate-50 rounded-2xl p-6 h-fit sticky top-24 space-y-4">
          <h3 className="font-bold text-sm tracking-tight">Sipariş Özeti</h3>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0"><ProductImage id={item.product.id} label={item.product.name} className="h-full" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-slate-900">{item.product.name}</p>
                  <p className="text-xs text-slate-500">× {item.qty}</p>
                </div>
                <p className="font-bold whitespace-nowrap">₺{(item.product.price * item.qty).toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500"><span>Ara toplam</span><span>₺{subtotal.toLocaleString('tr-TR')}</span></div>
            <div className="flex justify-between text-slate-500"><span>Kargo</span><span className="text-emerald-600">Ücretsiz</span></div>
            <div className="flex justify-between font-black text-base pt-2 border-t border-slate-200"><span>Toplam</span><span>₺{subtotal.toLocaleString('tr-TR')}</span></div>
          </div>
        </aside>
      </div>
    </section>
  );
};

const Step = ({ n, title, open, onOpen, done, children }) => (
  <div className={cx('rounded-2xl border bg-white transition-all', open ? 'border-slate-900' : 'border-slate-200')}>
    <button onClick={onOpen} className="w-full p-5 flex items-center gap-3 text-left">
      <div className={cx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black', done ? 'bg-emerald-500 text-white' : open ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>
        {done ? <I.Check size={14} /> : n}
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
    </button>
    {open && <div className="px-5 pb-5">{children}</div>}
  </div>
);

const Field = ({ label, value, className = '' }) => (
  <label className={cx('block', className)}>
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    <input defaultValue={value} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:bg-white focus:border-slate-900" />
  </label>
);

Object.assign(window, { Checkout, Step, Field });
