"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, AlertCircle, Search, Download } from "lucide-react";
import { ordersService } from "@/lib/services/orders.service";
import type { Order } from "@/types/api.types";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  Placed: { label: "Alındı", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  Paid: { label: "Ödendi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Shipped: { label: "Kargoda", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  Delivered: { label: "Teslim Edildi", className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  Cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    ordersService.getAll()
      .then(setOrders)
      .catch(() => setError("Siparişler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) =>
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const paidCount = orders.filter(o => o.status === 'Paid').length;

  const handleExportCsv = () => {
    const rows = [
      ['Sipariş ID', 'Sipariş No', 'Tarih', 'Durum', 'Toplam (₺)'],
      ...filtered.map(o => [
        o.id.slice(0, 8).toUpperCase(),
        o.orderNumber ?? '',
        new Date(o.orderDate).toLocaleDateString('tr-TR'),
        statusConfig[o.status]?.label ?? o.status,
        o.totalAmount.toFixed(2),
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siparisler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Siparişler</h1>
          <p className="text-slate-500">B2B sipariş geçmişi</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 rounded-xl transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> CSV İndir
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Toplam Sipariş</p>
          <p className="text-2xl font-black">{orders.length}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Beklemede</p>
          <p className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{pendingCount}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Ödendi</p>
          <p className="text-2xl font-black text-emerald-400">{paidCount}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Toplam Gelir</p>
          <p className="text-lg font-black text-indigo-400">₺{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Sipariş Listesi</CardTitle>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Sipariş no ara..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">Tümü</option>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Sipariş</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Tarih</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Toplam</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                    : filtered.length === 0
                    ? (
                      <tr><td colSpan={5}>
                        <EmptyState icon={<Package />} title="Sipariş bulunamadı" description="Filtrelerinize uyan sipariş yok." />
                      </td></tr>
                    )
                    : filtered.map((o) => {
                      const status = statusConfig[o.status] ?? { label: o.status, className: "bg-slate-100 text-slate-600" };
                      return (
                        <tr key={o.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-mono text-xs text-slate-400">{o.id.slice(0, 8).toUpperCase()}</p>
                              {o.orderNumber && <p className="text-xs font-semibold">{o.orderNumber}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell text-xs">
                            {new Date(o.orderDate).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">₺{o.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/orders/${o.id}`} className="text-indigo-500 hover:underline text-xs">Görüntüle</Link>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
