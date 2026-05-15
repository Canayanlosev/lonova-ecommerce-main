'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  TrendingUp, ShoppingBag, DollarSign, Package,
  AlertTriangle, BookOpen, Plus, ArrowRight, CheckCircle2,
  Clock, Warehouse
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ordersService } from '@/lib/services/orders.service';
import { productsService } from '@/lib/services/products.service';
import api from '@/lib/api';
import type { Order } from '@/types/api.types';
import { useAuthStore } from '@/store/auth.store';

interface DayStats { date: string; orders: number; revenue: number }
interface StockDto { productId: string; binId: string; quantity: number; minStockLevel: number; isLowStock: boolean }

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

function buildToday(orders: Order[]) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.orderDate?.slice(0, 10) === todayISO);
  return {
    count: todayOrders.length,
    revenue: todayOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0),
    pending: orders.filter(o => o.status === 'Pending').length,
    readyToShip: orders.filter(o => o.status === 'Paid').length,
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [chartData, setChartData] = useState<DayStats[]>([]);
  const [lowStock, setLowStock] = useState<StockDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertTab, setAlertTab] = useState<'stock' | 'accounting'>('stock');

  useEffect(() => {
    Promise.all([
      ordersService.getAll().catch(() => [] as Order[]),
      productsService.getAll().catch(() => []),
      api.get('/api/wms/stock').then(r => r.data as StockDto[]).catch(() => [] as StockDto[]),
    ]).then(([ord, prods, stock]) => {
      setOrders(ord);
      setProductCount(prods.length);
      setChartData(buildLast7Days(ord));
      setLowStock(stock.filter(s => s.isLowStock));
    }).finally(() => setLoading(false));
  }, []);

  const today = useMemo(() => buildToday(orders), [orders]);
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const recentOrders = [...orders]
    .sort((a, b) => (b.orderDate ?? '').localeCompare(a.orderDate ?? ''))
    .slice(0, 5);

  const bookedCount = orders.filter(o =>
    o.status === 'Paid' || o.status === 'Delivered' || o.status === 'Shipped'
  ).length;
  const unbookedCount = bookedCount; // conservative: show all completed as "may need booking"

  const firstName = user?.firstName ?? 'İyi';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">Komuta Merkezi</h1>
        <p className="text-slate-500">
          Günaydın, <span className="font-semibold text-foreground">{firstName}</span>. İşte bugünün özeti.
        </p>
      </div>

      {/* Bugün Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/orders"
          className="premium-card p-4 flex items-center gap-4 border-l-4 border-blue-500 hover:border-blue-400 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
            <ShoppingBag className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Bugünün Siparişleri</p>
            {loading
              ? <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-foreground">
                  {today.count}
                  <span className="text-sm font-normal text-slate-400 ml-1.5">
                    ₺{today.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                </p>
            }
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/orders"
          className="premium-card p-4 flex items-center gap-4 border-l-4 border-amber-500 hover:border-amber-400 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Bekleyen İşlem</p>
            {loading
              ? <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-amber-400">{today.pending}</p>
            }
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-amber-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/orders"
          className="premium-card p-4 flex items-center gap-4 border-l-4 border-emerald-500 hover:border-emerald-400 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Kargoya Hazır</p>
            {loading
              ? <div className="h-6 w-16 bg-slate-700/60 rounded animate-pulse mt-1" />
              : <p className="text-xl font-black text-emerald-400">{today.readyToShip}</p>
            }
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 ml-auto shrink-0 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* Hızlı Aksiyon Bar */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/ecommerce/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Yeni Ürün Ekle
        </Link>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface hover:border-blue-500/50 transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> Siparişleri Gör
        </Link>
        <Link
          href="/dashboard/accounting"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface hover:border-blue-500/50 transition-all"
        >
          <BookOpen className="w-4 h-4" /> Muhasebe Aktar
          {unbookedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unbookedCount > 99 ? '99+' : unbookedCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/wms"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-surface hover:border-amber-500/50 transition-all"
        >
          <Warehouse className="w-4 h-4" /> Stok Durumu
          {lowStock.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {lowStock.length}
            </span>
          )}
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Gelir"
          value={`₺${totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
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
          color="text-blue-500"
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

      {/* Charts + Alert Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart — 2 cols */}
        <Card className="lg:col-span-2 min-h-[360px]">
          <CardHeader>
            <CardTitle>Son 7 Gün — Sipariş & Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' }}
                    formatter={(val, name) =>
                      name === 'revenue'
                        ? [`₺${Number(val).toLocaleString('tr-TR')}`, 'Gelir']
                        : [String(val), 'Sipariş']
                    }
                  />
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fill="url(#colorOrders)" name="orders" />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" name="revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Alert Widget — 1 col */}
        <Card className="min-h-[360px]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-background">
              <button
                onClick={() => setAlertTab('stock')}
                className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${alertTab === 'stock' ? 'bg-surface text-foreground shadow-sm' : 'text-slate-500 hover:text-foreground'}`}
              >
                Düşük Stok {lowStock.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">{lowStock.length}</span>}
              </button>
              <button
                onClick={() => setAlertTab('accounting')}
                className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${alertTab === 'accounting' ? 'bg-surface text-foreground shadow-sm' : 'text-slate-500 hover:text-foreground'}`}
              >
                Muhasebe {unbookedCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px]">{unbookedCount}</span>}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {alertTab === 'stock' ? (
              loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />)}
                </div>
              ) : lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground">Stok durumu normal</p>
                  <p className="text-xs text-slate-500">Kritik stok seviyesinde ürün yok</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {lowStock.map((s, i) => (
                    <Link key={i} href="/dashboard/wms" className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors group">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">Ürün #{s.productId.slice(0, 8)}</p>
                        <p className="text-xs text-amber-400">{s.quantity} / min {s.minStockLevel} adet</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-amber-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              )
            ) : (
              loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />)}
                </div>
              ) : unbookedCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-semibold text-foreground">Muhasebe güncel</p>
                  <p className="text-xs text-slate-500">Tüm siparişler muhasebeleştirildi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-sm font-bold text-foreground">{unbookedCount} sipariş</p>
                    <p className="text-xs text-slate-400 mt-0.5">muhasebeleştirilmemiş olabilir</p>
                  </div>
                  <Link
                    href="/dashboard/accounting"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
                  >
                    <BookOpen className="w-4 h-4" /> Muhasebe'ye Git
                  </Link>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Son Siparişler */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Son Siparişler</CardTitle>
            <Link href="/dashboard/orders" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-medium">
              Tümünü gör <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <ShoppingBag className="w-10 h-10 text-slate-600" />
              <p>Henüz sipariş yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">
                        {order.orderNumber ?? `#${order.id?.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      order.status === 'Delivered' ? 'bg-emerald-500/15 text-emerald-400' :
                      order.status === 'Shipped'   ? 'bg-blue-500/15 text-blue-400' :
                      order.status === 'Cancelled' ? 'bg-red-500/15 text-red-400' :
                      order.status === 'Paid'      ? 'bg-purple-500/15 text-purple-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>{order.status}</span>
                    <p className="font-bold text-sm text-emerald-400">
                      ₺{(order.totalAmount ?? 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
            ? <div className="h-8 w-24 bg-slate-800/60 rounded-lg animate-pulse mt-1" />
            : <h4 className="text-2xl font-black">{value}</h4>
          }
          <p className="text-xs mt-1 text-slate-400">{sub}</p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/60 ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
