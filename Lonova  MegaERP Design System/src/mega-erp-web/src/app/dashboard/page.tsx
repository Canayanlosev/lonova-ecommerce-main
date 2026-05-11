import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">Genel Bakış</h1>
        <p className="text-slate-500">MegaERP sistemindeki son durum ve istatistikler.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Toplam Satış" value="₺124,500" change="+12%" icon={<DollarSign />} color="text-emerald-500" />
        <StatCard title="Aktif Kullanıcılar" value="1,240" change="+5%" icon={<Users />} color="text-indigo-500" />
        <StatCard title="Yeni Siparişler" value="45" change="+18%" icon={<ShoppingBag />} color="text-orange-500" />
        <StatCard title="Büyüme" value="%24" change="+2%" icon={<TrendingUp />} color="text-purple-500" />
      </div>

      {/* Charts Section Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Satış Grafiği</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-slate-400">Grafik yükleniyor...</p>
          </CardContent>
        </Card>
        
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Son İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Sipariş #ORD-{20260 + i}</p>
                      <p className="text-xs text-slate-500">2 dakika önce</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-emerald-500">+₺1,200</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon, color }: { title: string, value: string, change: string, icon: React.ReactNode, color: string }) {
  return (
    <Card className="hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-black">{value}</h4>
          <p className={`text-xs font-bold mt-1 ${color}`}>{change} <span className="text-slate-400 font-normal ml-1">geçen aya göre</span></p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
