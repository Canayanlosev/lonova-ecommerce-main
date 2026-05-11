/* eslint-disable */
const PRODUCTS = [
  ['PRD-4421', 'Wireless Earbuds Pro',      'Elektronik',    1899, 142, 'active'],
  ['PRD-4422', 'Vintage Leather Wallet',    'Aksesuar',      649,  87,  'active'],
  ['PRD-4423', 'Aroma Diffuser · Ceramic',  'Ev & Yaşam',    389,  23,  'low'],
  ['PRD-4424', 'Linen Throw Blanket',       'Ev & Yaşam',    1190, 56,  'active'],
  ['PRD-4425', 'Cold Brew Coffee Maker',    'Mutfak',        890,  0,   'oos'],
  ['PRD-4426', 'Merino Wool Beanie',        'Giyim',         320,  104, 'active'],
  ['PRD-4427', 'Smart Desk Lamp',           'Elektronik',    1450, 31,  'active'],
];

const stockBadge = (qty, status) => {
  if (status === 'oos') return <Badge tone="danger">Stokta Yok</Badge>;
  if (status === 'low') return <Badge tone="warning">Az ({qty})</Badge>;
  return <Badge tone="success">{qty} adet</Badge>;
};

const ProductTable = () => (
  <Card className="!p-0 overflow-hidden">
    <div className="flex items-center justify-between p-6 border-b border-slate-800">
      <div>
        <h3 className="text-xl font-bold text-white">Ürünler</h3>
        <p className="text-xs text-slate-500 mt-0.5">7 ürün · Acme Co. mağazası</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <I.Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
          <input placeholder="Ara…" className="bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 w-56" />
        </div>
        <Button variant="ghost" size="sm"><I.Filter size={16} />Filtre</Button>
        <Button size="sm"><I.Plus size={16} />Yeni Ürün</Button>
      </div>
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
          <th className="px-6 py-3 font-semibold">SKU</th>
          <th className="px-6 py-3 font-semibold">Ürün</th>
          <th className="px-6 py-3 font-semibold">Kategori</th>
          <th className="px-6 py-3 font-semibold text-right">Fiyat</th>
          <th className="px-6 py-3 font-semibold">Stok</th>
          <th className="px-6 py-3 font-semibold"></th>
        </tr>
      </thead>
      <tbody>
        {PRODUCTS.map(([sku, name, cat, price, qty, status]) => (
          <tr key={sku} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
            <td className="px-6 py-4 font-mono text-xs text-slate-400">{sku}</td>
            <td className="px-6 py-4 font-medium text-white">{name}</td>
            <td className="px-6 py-4 text-slate-400">{cat}</td>
            <td className="px-6 py-4 text-right font-mono text-white">₺{price.toLocaleString('tr-TR')}</td>
            <td className="px-6 py-4">{stockBadge(qty, status)}</td>
            <td className="px-6 py-4 text-right"><button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><I.More size={16} /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

const ProductsScreen = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-white">E-Commerce</h1>
      <p className="text-slate-500">Ürün, varyant ve kategori yönetimi.</p>
    </div>
    <ProductTable />
  </div>
);

Object.assign(window, { ProductTable, ProductsScreen });
