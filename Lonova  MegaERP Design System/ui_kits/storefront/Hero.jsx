/* eslint-disable */
const Hero = ({ onShop }) => (
  <section className="relative overflow-hidden border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-7">
        <Pill tone="indigo">YAZ 2026 · YENİ SEZON</Pill>
        <h1 className="text-5xl lg:text-7xl font-black tracking-[-0.04em] leading-[0.95] text-slate-900">
          Hafif kumaşlar.<br/>
          <span className="text-indigo-600">Cesur renkler.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-md leading-relaxed">
          200+ butik markadan özenle seçilmiş yeni sezon parçalar. Aynı gün kargo, ücretsiz iade.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="lg" onClick={onShop}>Koleksiyonu Keşfet <I.ArrowRight size={16} /></Button>
          <Button size="lg" variant="outline">Lookbook</Button>
        </div>
      </div>
      <div className="relative aspect-[4/5] rounded-3xl overflow-hidden">
        <ProductImage id="hero" label="L" className="absolute inset-0" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Öne çıkan</p>
            <p className="text-2xl font-black tracking-tight">Linen Throw · Sand</p>
          </div>
          <button className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-110 transition-transform"><I.ArrowRight size={18} /></button>
        </div>
      </div>
    </div>
  </section>
);

const CategoryStrip = () => {
  const cats = [
    ['Giyim', 'gid-1'], ['Aksesuar', 'gid-2'], ['Ev & Yaşam', 'gid-3'],
    ['Mutfak', 'gid-4'], ['Elektronik', 'gid-5'], ['Kozmetik', 'gid-6'],
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Kategoriler</h2>
        <a className="text-sm font-semibold text-indigo-600 hover:underline cursor-pointer">Tümü →</a>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {cats.map(([name, id]) => (
          <button key={id} className="group">
            <div className="aspect-square rounded-2xl overflow-hidden mb-2 group-hover:scale-[1.03] transition-transform">
              <ProductImage id={id} label={name} className="h-full" />
            </div>
            <p className="text-xs font-bold text-slate-900 text-center">{name}</p>
          </button>
        ))}
      </div>
    </section>
  );
};

Object.assign(window, { Hero, CategoryStrip });
