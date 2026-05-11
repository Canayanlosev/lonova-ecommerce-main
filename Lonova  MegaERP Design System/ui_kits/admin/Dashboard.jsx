/* eslint-disable */
const StatCard = ({ title, value, change, icon, tone = 'emerald' }) => {
  const toneFg = { emerald: 'text-emerald-400', indigo: 'text-indigo-400', orange: 'text-orange-400', purple: 'text-purple-400', red: 'text-red-400' }[tone];
  return (
    <Card className="hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h4 className="text-2xl font-black text-white tracking-tight">{value}</h4>
          <p className={cx('text-xs font-bold mt-1', toneFg)}>{change} <span className="text-slate-500 font-normal ml-1">geçen aya göre</span></p>
        </div>
        <IconChip tone={tone} size="md" className="!bg-slate-800">{icon}</IconChip>
      </div>
    </Card>
  );
};

const RecentTransactions = () => (
  <Card>
    <CardHeader><CardTitle>Son İşlemler</CardTitle></CardHeader>
    <CardContent>
      <div className="space-y-5">
        {[
          ['ORD-20261', '+₺1,200', '2 dakika önce'],
          ['ORD-20262', '+₺860',   '12 dakika önce'],
          ['ORD-20263', '+₺2,450', '38 dakika önce'],
          ['ORD-20264', '+₺320',   '1 saat önce'],
          ['ORD-20265', '+₺1,890', '2 saat önce'],
        ].map(([id, amt, when]) => (
          <div key={id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><I.Bag size={18} className="text-indigo-400" /></div>
              <div>
                <p className="font-bold text-sm text-white">Sipariş #{id}</p>
                <p className="text-xs text-slate-500">{when}</p>
              </div>
            </div>
            <p className="font-bold text-sm text-emerald-400">{amt}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const ChartPlaceholder = () => (
  <Card>
    <CardHeader><CardTitle>Satış Grafiği</CardTitle></CardHeader>
    <div className="h-[260px] relative">
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M0,150 C40,120 60,140 100,110 C140,80 160,100 200,70 C240,50 260,80 300,60 C340,45 360,55 400,40 L400,200 L0,200 Z" fill="url(#chartFill)"/>
        <path d="M0,150 C40,120 60,140 100,110 C140,80 160,100 200,70 C240,50 260,80 300,60 C340,45 360,55 400,40" fill="none" stroke="#6366f1" strokeWidth="2.5"/>
      </svg>
      <div className="absolute bottom-3 left-6 right-6 flex justify-between text-xs text-slate-500 font-mono">
        <span>Oca</span><span>Şub</span><span>Mar</span><span>Nis</span><span>May</span><span>Haz</span>
      </div>
    </div>
  </Card>
);

const DashboardOverview = () => (
  <div className="space-y-8 animate-fade-in">
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-black tracking-tight text-white">Genel Bakış</h1>
      <p className="text-slate-500">MegaERP sistemindeki son durum ve istatistikler.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Toplam Satış" value="₺124,500" change="+12%" icon={<I.Dollar size={22} />} tone="emerald" />
      <StatCard title="Aktif Kullanıcılar" value="1,240" change="+5%" icon={<I.Users size={22} />} tone="indigo" />
      <StatCard title="Yeni Siparişler" value="45" change="+18%" icon={<I.Bag size={22} />} tone="orange" />
      <StatCard title="Büyüme" value="%24" change="+2%" icon={<I.Trending size={22} />} tone="purple" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <ChartPlaceholder />
      <RecentTransactions />
    </div>
  </div>
);

Object.assign(window, { StatCard, RecentTransactions, ChartPlaceholder, DashboardOverview });
