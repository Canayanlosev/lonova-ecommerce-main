/* eslint-disable */
// Workspace chrome — Sidebar, Header, UserChip.

const Sidebar = ({ active = 'dashboard', onNav }) => {
  const items = [
    ['dashboard', 'Dashboard', <I.Dashboard size={20} />],
    ['ecommerce', 'E-Commerce', <I.Cart size={20} />],
    ['accounting', 'Accounting', <I.Credit size={20} />],
    ['hr',        'HR Management', <I.Users size={20} />],
    ['inventory', 'Inventory', <I.Package size={20} />],
    ['shipping',  'Shipping', <I.Truck size={20} />],
  ];
  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl hidden lg:flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-black tracking-tighter text-indigo-500">MegaERP</h2>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {items.map(([key, label, icon]) => (
          <NavItem
            key={key}
            icon={icon}
            label={label}
            active={key === active}
            onClick={() => onNav?.(key)}
          />
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-1">
        <NavItem icon={<I.Settings size={20} />} label="Ayarlar" />
        <NavItem icon={<I.LogOut size={20} />} label="Çıkış Yap" tone="red" onClick={() => onNav?.('logout')} />
      </div>
    </aside>
  );
};

const NavItem = ({ icon, label, active = false, tone, onClick }) => (
  <a
    onClick={onClick}
    className={cx(
      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer',
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
        : 'text-slate-500 hover:bg-slate-800 hover:text-white'
    )}
  >
    <span
      className={cx(
        'transition-colors',
        active ? 'text-white'
          : tone === 'red' ? 'text-red-500'
          : 'text-slate-400 group-hover:text-indigo-400'
      )}
    >
      {icon}
    </span>
    {label}
  </a>
);

const Header = ({ title = 'Yönetim Paneli', user = { name: 'Can Ayan', role: 'Administrator', initials: 'CA' } }) => (
  <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 shrink-0">
    <h3 className="font-semibold text-slate-500">{title}</h3>
    <div className="flex items-center gap-4">
      <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
        <I.Bell size={20} className="text-slate-400" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
      </button>
      <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
        <div className="text-right">
          <p className="text-sm font-bold text-white">{user.name}</p>
          <p className="text-xs text-slate-500">{user.role}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">
          {user.initials}
        </div>
      </div>
    </div>
  </header>
);

Object.assign(window, { Sidebar, NavItem, Header });
