"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ordersService } from "@/lib/services/orders.service";
import { useToast } from "@/store/ui.store";
import type { Order } from "@/types/api.types";
import {
  ArrowLeft, XCircle, CheckCircle2, Truck, Package, Clock,
  ShoppingBag, RefreshCw, Printer, User, CalendarDays, TrendingUp, ChevronRight
} from "lucide-react";
import Link from "next/link";

const STATUS_FLOW: { key: string; label: string; icon: React.ReactNode; cls: string }[] = [
  { key: 'Pending',   label: 'Beklemede',     icon: <Clock className="w-4 h-4" />,        cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { key: 'Placed',    label: 'Alındı',        icon: <ShoppingBag className="w-4 h-4" />,  cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { key: 'Paid',      label: 'Ödendi',        icon: <CheckCircle2 className="w-4 h-4" />, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { key: 'Shipped',   label: 'Kargoda',       icon: <Truck className="w-4 h-4" />,        cls: 'bg-primary/10 text-primary border-primary/20' },
  { key: 'Delivered', label: 'Teslim Edildi', icon: <CheckCircle2 className="w-4 h-4" />, cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { key: 'Cancelled', label: 'İptal',         icon: <XCircle className="w-4 h-4" />,      cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
]

const STATUS_TRANSITIONS: Record<string, string[]> = {
  Pending:   ['Placed', 'Cancelled'],
  Placed:    ['Paid', 'Cancelled'],
  Paid:      ['Shipped', 'Cancelled'],
  Shipped:   ['Delivered'],
  Delivered: [],
  Cancelled: [],
}

const STATUS_LABELS: Record<string, string> = {
  Placed: 'Alındı Olarak İşaretle', Paid: 'Ödendi Olarak İşaretle',
  Shipped: 'Kargoya Verildi', Delivered: 'Teslim Edildi', Cancelled: 'İptal Et'
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = () =>
    ordersService.getById(id).then(setOrder).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load() }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    if (newStatus === 'Cancelled' && !confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return;
    setUpdating(true);
    try {
      if (newStatus === 'Cancelled') {
        await ordersService.cancel(id);
      } else {
        await ordersService.updateStatus(id, newStatus);
      }
      toast.success(`Sipariş durumu "${STATUS_FLOW.find(s => s.key === newStatus)?.label ?? newStatus}" olarak güncellendi.`);
      await load();
    } catch {
      toast.error('Durum güncellenemedi.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-slate-800 rounded-xl animate-pulse" />
        <div className="premium-card p-6 h-40 animate-pulse" />
        <div className="premium-card p-6 h-64 animate-pulse" />
      </div>
    );
  }

  if (!order) return (
    <div className="max-w-4xl mx-auto">
      <div className="premium-card p-12 text-center border border-red-500/20">
        <p className="text-red-400 font-semibold">Sipariş bulunamadı.</p>
        <Link href="/dashboard/orders" className="text-primary text-xs font-bold mt-3 hover:underline inline-block">
          ← Siparişlere Dön
        </Link>
      </div>
    </div>
  );

  const statusConfig = STATUS_FLOW.find(s => s.key === order.status);
  const statusCls = statusConfig?.cls ?? 'bg-slate-700/40 text-slate-300 border-transparent';
  const transitions = STATUS_TRANSITIONS[order.status] ?? [];
  const currentStatusIdx = STATUS_FLOW.filter(s => s.key !== 'Cancelled').findIndex(s => s.key === order.status);
  const progressSteps = STATUS_FLOW.filter(s => s.key !== 'Cancelled');

  const subtotal = order.items?.reduce((s, i) => s + i.lineTotal, 0) ?? order.totalAmount;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders">
            <button className="p-2 rounded-xl hover:bg-slate-800 border border-border/60 transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Sipariş Detayı</h1>
            <p className="text-slate-500 font-mono text-sm">
              {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/80 text-slate-400 hover:text-foreground text-xs font-bold transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Yazdır
          </button>
          <button
            onClick={() => { setLoading(true); load() }}
            disabled={loading}
            className="p-2 rounded-xl border border-border/80 text-slate-400 hover:text-foreground transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Pipeline (horizontal stepper) */}
      {order.status !== 'Cancelled' && (
        <div className="premium-card p-5 border border-border/80 bg-slate-900/40 print:hidden">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {progressSteps.map((step, i) => {
              const isPast = i < currentStatusIdx
              const isCurrent = i === currentStatusIdx
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isCurrent ? step.cls + ' border' :
                    isPast     ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                 'bg-slate-800/40 text-slate-500 border-transparent'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < progressSteps.length - 1 && (
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isPast || isCurrent ? 'text-emerald-500' : 'text-slate-600'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <Package className="w-4 h-4" />, label: 'Durum',
            value: statusConfig?.label ?? order.status,
            bg: statusCls, isStatus: true
          },
          {
            icon: <CalendarDays className="w-4 h-4 text-slate-400" />, label: 'Sipariş Tarihi',
            value: new Date(order.orderDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            bg: '', isStatus: false
          },
          {
            icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, label: 'Toplam Tutar',
            value: `₺${order.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
            bg: '', isStatus: false
          },
          {
            icon: <ShoppingBag className="w-4 h-4 text-primary" />, label: 'Kalem Sayısı',
            value: `${order.items?.length ?? 0} ürün`,
            bg: '', isStatus: false
          },
        ].map(({ icon, label, value, bg, isStatus }) => (
          <div key={label} className="premium-card p-4 border border-border/80 bg-slate-900/40">
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{label}</p>
            </div>
            {isStatus ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${bg}`}>
                {statusConfig?.icon} {value}
              </span>
            ) : (
              <p className="text-sm font-black text-foreground">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Order items */}
      <div className="premium-card overflow-hidden border border-border/80 bg-slate-900/40">
        <div className="px-6 py-4 border-b border-border/80 bg-slate-950/20">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Sipariş Kalemleri
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-950/10">
                <th className="text-left px-6 py-4">Ürün</th>
                <th className="text-center px-4 py-4">Adet</th>
                <th className="text-right px-4 py-4">Birim Fiyat</th>
                <th className="text-right px-6 py-4">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {order.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Package className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="font-bold text-foreground text-xs">{item.productName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/60 text-foreground text-xs font-black font-mono border border-border/60">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-400 text-xs font-mono font-semibold">
                    ₺{item.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-foreground font-mono">
                    ₺{item.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border/80 bg-slate-950/30">
                <td colSpan={3} className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Toplam</td>
                <td className="px-6 py-4 text-right font-black text-emerald-400 font-mono text-base">
                  ₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      {(transitions.length > 0) && (
        <div className="premium-card p-5 border border-border/80 bg-slate-900/40 print:hidden">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Sipariş İşlemleri</p>
          <div className="flex flex-wrap gap-3">
            {transitions.filter(t => t !== 'Cancelled').map(nextStatus => {
              const sc = STATUS_FLOW.find(s => s.key === nextStatus)!
              return (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={updating}
                  className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 hover:-translate-y-0.5 ${sc.cls}`}
                >
                  {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : sc.icon}
                  {STATUS_LABELS[nextStatus] ?? sc.label}
                </button>
              )
            })}
            {transitions.includes('Cancelled') && (
              <button
                onClick={() => handleStatusChange('Cancelled')}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all disabled:opacity-50 ml-auto"
              >
                <XCircle className="w-3.5 h-3.5" />
                {STATUS_LABELS['Cancelled']}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between pt-2 print:hidden">
        <Link href="/dashboard/orders" className="flex items-center gap-2 text-xs text-slate-400 hover:text-foreground transition-colors font-bold">
          <ArrowLeft className="w-3.5 h-3.5" /> Siparişlere Dön
        </Link>
        <Link href={`/dashboard/billing`} className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-bold">
          Faturaları Gör →
        </Link>
      </div>
    </div>
  );
}
