/* eslint-disable */
const Header = ({ cartCount = 0, onCartClick, onHome, tenant = { name: 'lonova', accent: '#a855f7' } }) => (
  <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
      <div className="flex items-center gap-10">
        <button onClick={onHome} className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 48 48"><defs><linearGradient id="lgX" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6366f1"/><stop offset="1" stopColor={tenant.accent}/></linearGradient></defs><circle cx="24" cy="24" r="20" fill="none" stroke="url(#lgX)" strokeWidth="5"/><circle cx="24" cy="24" r="7" fill="url(#lgX)"/></svg>
          <span className="text-xl font-black tracking-tighter text-slate-900">{tenant.name}<span style={{ color: tenant.accent }}>.</span></span>
        </button>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {['Yeni Gelenler', 'Kadın', 'Erkek', 'Ev & Yaşam', 'Outlet'].map(l => (
            <a key={l} className="hover:text-slate-900 cursor-pointer">{l}</a>
          ))}
        </nav>
      </div>
      <div className="flex-1 max-w-md hidden lg:block">
        <div className="relative">
          <I.Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Ürün, marka veya kategori ara…" className="w-full bg-slate-100 border-0 rounded-full pl-11 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <IconBtn label="Hesap"><I.Users size={20} /></IconBtn>
        <IconBtn label="Favoriler"><I.Heart size={20} /></IconBtn>
        <IconBtn label="Sepet" count={cartCount} onClick={onCartClick}><I.Cart size={20} /></IconBtn>
      </div>
    </div>
  </header>
);

Object.assign(window, { Header });
