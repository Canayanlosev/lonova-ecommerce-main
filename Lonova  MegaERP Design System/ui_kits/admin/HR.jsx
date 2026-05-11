/* eslint-disable */
const EMPLOYEES = [
  ['CA', 'Can Ayan',          'CTO',                'Yönetim',         'indigo'],
  ['ME', 'Mert Erdoğan',      'Backend Developer',  'Mühendislik',     'purple'],
  ['ZK', 'Zeynep Kaya',       'Product Designer',   'Tasarım',         'emerald'],
  ['AB', 'Ahmet Bilgin',      'Finance Lead',       'Muhasebe',        'orange'],
  ['ES', 'Elif Şahin',        'HR Specialist',      'İK',              'red'],
  ['BÖ', 'Burak Özer',        'Frontend Developer', 'Mühendislik',     'indigo'],
];

const LEAVES = [
  ['Zeynep Kaya', '12 May – 16 May', 'Yıllık İzin', 'pending'],
  ['Mert Erdoğan', '18 May – 19 May', 'Mazeret',     'approved'],
  ['Burak Özer',   '24 May – 28 May', 'Yıllık İzin', 'pending'],
];

const EmployeeList = () => (
  <Card>
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="text-xl font-bold text-white">Çalışanlar</h3>
        <p className="text-xs text-slate-500 mt-0.5">6 kişi · 4 departman</p>
      </div>
      <Button size="sm"><I.Plus size={16} />İşe Al</Button>
    </div>
    <div className="space-y-2">
      {EMPLOYEES.map(([initials, name, role, dept, tone]) => (
        <div key={name} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/60 transition-colors">
          <div className="flex items-center gap-3">
            <IconChip tone={tone} size="sm"><span className="text-sm font-bold">{initials}</span></IconChip>
            <div>
              <p className="font-semibold text-white text-sm">{name}</p>
              <p className="text-xs text-slate-500">{role} · {dept}</p>
            </div>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><I.More size={16} /></button>
        </div>
      ))}
    </div>
  </Card>
);

const LeaveRequestPanel = () => (
  <Card>
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="text-xl font-bold text-white">İzin Talepleri</h3>
        <p className="text-xs text-slate-500 mt-0.5">{LEAVES.filter(l => l[3] === 'pending').length} beklemede</p>
      </div>
      <Button variant="ghost" size="sm">Tümü</Button>
    </div>
    <div className="space-y-3">
      {LEAVES.map(([who, date, kind, status], i) => (
        <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-white text-sm">{who}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{date}</p>
            </div>
            {status === 'approved' ? <Badge tone="success">Onaylandı</Badge> : <Badge tone="warning">Bekliyor</Badge>}
          </div>
          <p className="text-xs text-slate-400 mb-3">{kind}</p>
          {status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" variant="primary" className="!py-1.5 flex-1"><I.Check size={14} />Onayla</Button>
              <Button size="sm" variant="danger" className="!py-1.5 flex-1"><I.X size={14} />Reddet</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  </Card>
);

const HRScreen = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-white">HR Management</h1>
      <p className="text-slate-500">Çalışanlar, departmanlar ve izin süreçleri.</p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2"><EmployeeList /></div>
      <div><LeaveRequestPanel /></div>
    </div>
  </div>
);

Object.assign(window, { EmployeeList, LeaveRequestPanel, HRScreen });
