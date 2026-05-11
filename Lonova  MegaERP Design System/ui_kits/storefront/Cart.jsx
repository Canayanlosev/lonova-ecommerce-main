/* eslint-disable */
const Cart = ({ open, items, onClose, onCheckout, onChange }) => {
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  return (
    <>
      <div className={cx('fixed inset-0 bg-slate-900/40 z-50 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={onClose} />
      <aside className={cx('fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300', open ? 'translate-x-0' : 'translate-x-full')}>
        <header className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">Sepetiniz</h2>
            <p className="text-xs text-slate-500 mt-0.5">{items.length} ürün</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"><I.X size={18} /></button>
        </header>
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {items.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <I.Cart size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Sepetiniz boş.</p>
            </div>
          ) : items.map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0"><ProductImage id={item.product.id} label={item.product.name} className="h-full" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.product.brand}</p>
                <p className="font-semibold text-sm text-slate-900 truncate">{item.product.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-full px-1">
                    <button onClick={() => onChange?.(i, Math.max(1, item.qty - 1))} className="w-6 h-6 text-xs">−</button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => onChange?.(i, item.qty + 1)} className="w-6 h-6 text-xs">+</button>
                  </div>
                  <span className="font-bold text-sm">₺{(item.product.price * item.qty).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <footer className="border-t border-slate-200 p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ara toplam</span>
              <span className="font-bold">₺{subtotal.toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Kargo</span>
              <span className="font-bold text-emerald-600">Ücretsiz</span>
            </div>
            <div className="flex justify-between text-base pt-3 border-t border-slate-200">
              <span className="font-bold">Toplam</span>
              <span className="font-black">₺{subtotal.toLocaleString('tr-TR')}</span>
            </div>
            <Button size="lg" className="w-full" onClick={onCheckout}>Ödemeye Geç <I.ArrowRight size={16} /></Button>
          </footer>
        )}
      </aside>
    </>
  );
};

Object.assign(window, { Cart });
