/* eslint-disable */
const PRODUCTS = [
  { id: 'p-001', name: 'Wireless Earbuds Pro',   brand: 'Acme Audio',  price: 1899, was: 2299, rating: 4.8, tag: 'BESTSELLER', tone: 'rose' },
  { id: 'p-002', name: 'Vintage Leather Wallet', brand: 'Hidekraft',   price: 649,  was: null, rating: 4.6, tag: null,         tone: null },
  { id: 'p-003', name: 'Ceramic Aroma Diffuser', brand: 'Nordic Home', price: 389,  was: null, rating: 4.9, tag: 'YENİ',       tone: 'emerald' },
  { id: 'p-004', name: 'Linen Throw Blanket',    brand: 'Loom Studio', price: 1190, was: 1450, rating: 4.7, tag: '-18%',       tone: 'indigo' },
  { id: 'p-005', name: 'Cold Brew Coffee Maker', brand: 'Brew & Co',   price: 890,  was: null, rating: 4.5, tag: null,         tone: null },
  { id: 'p-006', name: 'Merino Wool Beanie',     brand: 'Highland',    price: 320,  was: null, rating: 4.8, tag: null,         tone: null },
  { id: 'p-007', name: 'Smart Desk Lamp',        brand: 'Lumen',       price: 1450, was: null, rating: 4.6, tag: 'YENİ',       tone: 'emerald' },
  { id: 'p-008', name: 'Canvas Tote Bag',        brand: 'Daily',       price: 240,  was: null, rating: 4.7, tag: null,         tone: null },
];

const Stars = ({ value }) => (
  <div className="flex items-center gap-1 text-amber-500">
    <I.Star size={12} className="fill-current" />
    <span className="text-xs font-bold text-slate-900">{value.toFixed(1)}</span>
  </div>
);

const ProductCard = ({ product, onClick }) => (
  <div onClick={() => onClick?.(product)} className="group text-left cursor-pointer">
    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3">
      <ProductImage id={product.id} label={product.name} className="h-full group-hover:scale-105 transition-transform duration-500" />
      {product.tag && (
        <div className="absolute top-3 left-3"><Pill tone={product.tone}>{product.tag}</Pill></div>
      )}
      <span role="button" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-slate-700 hover:text-rose-500 transition-colors" onClick={(e) => e.stopPropagation()}>
        <I.Heart size={16} />
      </span>
    </div>
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{product.brand}</p>
    <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1.5">{product.name}</h3>
    <div className="flex items-center gap-3">
      <span className="font-black text-slate-900">₺{product.price.toLocaleString('tr-TR')}</span>
      {product.was && <span className="text-xs text-slate-400 line-through">₺{product.was.toLocaleString('tr-TR')}</span>}
      <span className="ml-auto"><Stars value={product.rating} /></span>
    </div>
  </div>
);

const ProductGrid = ({ onSelect }) => (
  <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Bu Hafta Öne Çıkanlar</h2>
        <p className="text-sm text-slate-500 mt-0.5">Editör seçkisi · 8 ürün</p>
      </div>
      <a className="text-sm font-semibold text-indigo-600 hover:underline cursor-pointer">Tümü →</a>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
      {PRODUCTS.map(p => <ProductCard key={p.id} product={p} onClick={onSelect} />)}
    </div>
  </section>
);

const ValueProps = () => (
  <section className="bg-slate-50 border-y border-slate-200">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
      {[
        ['Aynı gün kargo',     'Saat 16:00\'ya kadar verilen siparişler', <I.Truck size={22} />],
        ['Ücretsiz iade',      '14 gün içinde kolay iade',                <I.ArrowLeft size={22} />],
        ['Güvenli ödeme',      'iyzico ve 3D Secure',                     <I.Lock size={22} />],
        ['200+ marka',         'Türkiye\'nin butik vitrini',              <I.Star size={22} />],
      ].map(([title, sub, icon]) => (
        <div key={title} className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 shrink-0">{icon}</div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

Object.assign(window, { PRODUCTS, Stars, ProductCard, ProductGrid, ValueProps });
