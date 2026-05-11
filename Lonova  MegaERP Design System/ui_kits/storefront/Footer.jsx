/* eslint-disable */
const Footer = () => (
  <footer className="bg-slate-900 text-white mt-16">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-4 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <svg width="28" height="28" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#a855f7" strokeWidth="5"/><circle cx="24" cy="24" r="7" fill="#a855f7"/></svg>
          <span className="text-xl font-black tracking-tighter">lonova<span className="text-purple-400">.</span></span>
        </div>
        <p className="text-sm text-slate-400 max-w-xs">Türkiye'nin butik markaları için multitenant alışveriş platformu.</p>
      </div>
      {[
        ['Alışveriş', ['Yeni Gelenler', 'Kadın', 'Erkek', 'Ev & Yaşam', 'Outlet']],
        ['Yardım',    ['İade & Değişim', 'Kargo Takibi', 'Sıkça Sorulanlar', 'İletişim']],
        ['Kurumsal',  ['Hakkımızda', 'Mağaza Aç', 'Kariyer', 'Basın']],
      ].map(([title, links]) => (
        <div key={title}>
          <h4 className="font-bold text-sm mb-4">{title}</h4>
          <ul className="space-y-2.5 text-sm text-slate-400">
            {links.map(l => <li key={l}><a className="hover:text-white cursor-pointer">{l}</a></li>)}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between text-xs text-slate-500">
        <span>© 2026 Lonova. Powered by MegaERP.</span>
        <div className="flex gap-5"><a className="hover:text-white cursor-pointer">KVKK</a><a className="hover:text-white cursor-pointer">Çerez Politikası</a><a className="hover:text-white cursor-pointer">Şartlar</a></div>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Footer });
