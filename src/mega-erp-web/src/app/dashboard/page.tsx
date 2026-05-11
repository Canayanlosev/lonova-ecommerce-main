'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, Users, ShoppingBag, DollarSign, Package } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ordersService } from '@/lib/services/orders.service';
import { productsService } from '@/lib/services/products.service';
import type { Order } from '@/types/api.types';

interface DayStats {
  date: string;
  orders: number;
  revenue: number;
}

function buildLast7Days(orders: Order[]): DayStats[] {
  const days: DayStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.orderDate?.slice(0, 10) === dateStr);
    days.push({
      date: label,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    });
  }
  return days;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [chartData, setChartData] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersService.getAll().catch(() => [] as Order[]),
      productsService.getAll().catch(() => []),
    ]).then(([ord, prods]) => {
      setOrders(ord);
      setProductCount(prods.length);
      setChartData(buildLast7Days(ord));
    }).finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const recentOrders = [...orders].sort((a, b) =>
    (b.orderDate ?? '').localeCompare(a.orderDate ?? '')
  ).slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">Genel Bakış</h1>
        <p className="text-slate-500">MegaERP sistemindeki son durum ve istatistikler.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Gelir"
          value={`₺${totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`}
          sub={`${orders.length} sipariş`}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Toplam Sipariş"
          value={String(orders.length)}
          sub="tüm zamanlar"
          icon={<ShoppingBag className="w-5 h-5" />}
          color="text-indigo-500"
          loading={loading}
        />
        <StatCard
          title="Ürün Sayısı"
          value={String(productCount)}
          sub="katalogda"
          icon={<Package className="w-5 h-5" />}
          color="text-orange-500"
          loading={loading}
        />
        <StatCard
          title="Son 7 Gün"
          value={String(chartData.reduce((s, d) => s + d.orders, 0))}
          sub="sipariş"
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-purple-500"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Son 7 Gün — Sipariş Grafiği</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                    formatter={(val, name) =>
                      name === 'revenue'
                        ? [`₺${Number(val).toLocaleString('tr-TR')}`, 'Gelir']
                        : [String(val), 'Sipariş']
                    }
                  />
                  <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} fill="url(#colorOrders)" name="orders" />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" name="revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Son Siparişler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-slate-400">
                Henüz sipariş yok
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{order.orderNumber ?? `#${order.id?.slice(0, 8)}`}</p>
                        <p className="text-xs text-slate-500">
                          {order.orderDate
                            ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-emerald-500">
                        ₺{(order.totalAmount ?? 0).toLocaleString('tr-TR')}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'Shipped'   ? 'bg-blue-100 text-blue-700' :
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title, value, sub, icon, color, loading
}: {
  title: string; value: string; sub: string; icon: React.ReactNode; color: string; loading: boolean;
}) {
  return (
    <Card className="hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {loading
            ? <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse mt-1" />
            : <h4 className="text-2xl font-black">{value}</h4>
          }
          <p className={`text-xs font-bold mt-1 ${color}`}>
            <span className="text-slate-400 font-normal">{sub}</span>
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
