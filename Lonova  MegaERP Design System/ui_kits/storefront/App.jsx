/* eslint-disable */
const App = () => {
  const [route, setRoute] = React.useState({ name: 'home' });
  const [cart, setCart] = React.useState([
    { product: PRODUCTS[0], qty: 1 },
    { product: PRODUCTS[3], qty: 2 },
  ]);
  const [cartOpen, setCartOpen] = React.useState(false);

  const addToCart = (product, qty = 1) => {
    setCart(c => {
      const i = c.findIndex(x => x.product.id === product.id);
      if (i >= 0) { const n = c.slice(); n[i] = { ...n[i], qty: n[i].qty + qty }; return n; }
      return [...c, { product, qty }];
    });
    setCartOpen(true);
  };
  const setQty = (idx, qty) => setCart(c => c.map((x, i) => i === idx ? { ...x, qty } : x));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cartCount={cart.reduce((s, i) => s + i.qty, 0)} onCartClick={() => setCartOpen(true)} onHome={() => setRoute({ name: 'home' })} />
      {route.name === 'home' && (<>
        <Hero onShop={() => document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })} />
        <CategoryStrip />
        <ValueProps />
        <div id="grid"><ProductGrid onSelect={(p) => setRoute({ name: 'pdp', product: p })} /></div>
        <Footer />
      </>)}
      {route.name === 'pdp' && <PDP product={route.product} onBack={() => setRoute({ name: 'home' })} onAdd={addToCart} />}
      {route.name === 'checkout' && <Checkout items={cart} onBack={() => setRoute({ name: 'home' })} onComplete={() => setRoute({ name: 'done' })} />}
      {route.name === 'done' && (
        <section className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500 mx-auto flex items-center justify-center mb-6"><I.Check size={32} className="text-white" /></div>
          <h1 className="text-4xl font-black tracking-tight mb-3">Siparişin alındı!</h1>
          <p className="text-slate-500 mb-8">Sipariş numaran <span className="font-bold text-slate-900">#LNV-20266</span>. E-postana onay gönderdik.</p>
          <Button size="lg" onClick={() => { setCart([]); setRoute({ name: 'home' }); }}>Alışverişe Devam</Button>
        </section>
      )}
      <Cart open={cartOpen} items={cart} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setRoute({ name: 'checkout' }); }} onChange={setQty} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
