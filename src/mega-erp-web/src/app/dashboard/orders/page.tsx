"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, AlertCircle } from "lucide-react";
import { ordersService } from "@/lib/services/orders.service";
import type { Order } from "@/types/api.types";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  Placed: { label: "Alındı", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  Paid: { label: "Ödendi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Shipped: { label: "Kargoda", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  Cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    ordersService.getAll()
      .then(setOrders)
      .catch(() => setError("Siparişler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Siparişler</h1>
        <p className="text-slate-500">Tüm sipariş geçmişiniz</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Sipariş Listesi</CardTitle>
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
                        <EmptyState icon={<Package />} title="Sipariş bulunamadı" description="Henüz siparişiniz yok." />
                      </td></tr>
                    )
                    : filtered.map((o) => {
                      const status = statusConfig[o.status] ?? { label: o.status, className: "bg-slate-100 text-slate-600" };
                      return (
                        <tr key={o.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                            {new Date(o.orderDate).toLocaleDateString("tr-TR")}
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
