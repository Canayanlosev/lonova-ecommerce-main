/* eslint-disable */
const App = () => {
  const [route, setRoute] = React.useState('login');
  const [section, setSection] = React.useState('dashboard');

  if (route === 'login') {
    return <LoginCard onLogin={() => setRoute('app')} />;
  }

  const screens = {
    dashboard: <DashboardOverview />,
    ecommerce: <ProductsScreen />,
    hr: <HRScreen />,
    accounting: <Placeholder name="Accounting" />,
    inventory:  <Placeholder name="Inventory" />,
    shipping:   <Placeholder name="Shipping" />,
  };

  return (
    <div className="flex min-h-screen bg-[#06080f] relative overflow-hidden">
      <HeroGlow className="!top-[-200px]" />
      <Sidebar active={section} onNav={(k) => { if (k === 'logout') setRoute('login'); else setSection(k); }} />
      <main className="flex-1 flex flex-col relative">
        <Header title={titleFor(section)} />
        <div className="p-8 overflow-auto flex-1">{screens[section]}</div>
      </main>
    </div>
  );
};

const titleFor = (s) => ({ dashboard: 'Yönetim Paneli', ecommerce: 'E-Commerce', hr: 'HR Management', accounting: 'Accounting', inventory: 'Inventory', shipping: 'Shipping' })[s];

const Placeholder = ({ name }) => (
  <div className="animate-fade-in">
    <h1 className="text-3xl font-black tracking-tight text-white mb-1">{name}</h1>
    <p className="text-slate-500 mb-6">Bu modül yakında. Şu an iskelet aşamasında.</p>
    <Card className="min-h-[400px] flex items-center justify-center border-2 border-dashed !border-slate-800">
      <div className="text-center text-slate-500">
        <I.Building size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">İçerik yükleniyor…</p>
      </div>
    </Card>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
