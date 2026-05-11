/* eslint-disable */
const PDP = ({ product, onBack, onAdd }) => {
  const [size, setSize] = React.useState('M');
  const [color, setColor] = React.useState(0);
  const [qty, setQty] = React.useState(1);
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-8 animate-fade-in">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 mb-6"><I.ArrowLeft size={14} />Geri dön</button>
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-5 aspect-square rounded-3xl overflow-hidden">
            <ProductImage id={product.id} label={product.name} className="h-full" />
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className={cx('aspect-square rounded-xl overflow-hidden cursor-pointer', i === 1 ? 'ring-2 ring-slate-900' : 'opacity-70 hover:opacity-100')}>
              <ProductImage id={`${product.id}-${i}`} label="" className="h-full" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">{product.brand}</p>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <Stars value={product.rating} />
              <span className="text-xs text-slate-500">· 248 değerlendirme</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900">₺{product.price.toLocaleString('tr-TR')}</span>
            {product.was && <><span className="text-lg text-slate-400 line-through">₺{product.was.toLocaleString('tr-TR')}</span><Pill tone="rose">İNDİRİM</Pill></>}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">Doğal liflerden örülmüş, gün boyu konforlu. Yüksek kaliteli detaylar ve özel kesim — günlük kullanımdan özel günlere kadar.</p>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Renk</p>
            <div className="flex gap-2.5">
              {[['#0f172a','Siyah'],['#a855f7','Mor'],['#f97316','Turuncu'],['#10b981','Yeşil']].map(([c, n], i) => (
                <button key={n} onClick={() => setColor(i)} className={cx('w-10 h-10 rounded-full ring-offset-2 transition-all', color === i ? 'ring-2 ring-slate-900' : '')} style={{ background: c }} aria-label={n} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Beden</p>
              <a className="text-xs text-indigo-600 hover:underline cursor-pointer">Beden rehberi</a>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['XS','S','M','L','XL'].map(s => (
                <button key={s} onClick={() => setSize(s)} className={cx('h-11 min-w-[52px] px-4 rounded-xl border-2 text-sm font-bold transition-all', size === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400')}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 items-stretch pt-2">
            <div className="flex items-center border-2 border-slate-200 rounded-full px-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center text-slate-700">−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center text-slate-700">+</button>
            </div>
            <Button size="lg" className="flex-1" onClick={() => onAdd?.(product, qty)}><I.Cart size={16} />Sepete Ekle</Button>
            <button className="w-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:text-rose-500"><I.Heart size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600"><I.Truck size={16} className="text-emerald-600" />Yarın kargoda</div>
            <div className="flex items-center gap-2 text-xs text-slate-600"><I.ArrowLeft size={16} className="text-emerald-600" />14 gün iade</div>
          </div>
        </div>
      </div>
    </section>
  );
};

Object.assign(window, { PDP });
