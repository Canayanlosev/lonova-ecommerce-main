"use client";

import React, { useEffect, useState, useMemo } from "react";

import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, AlertCircle, Search, Download, CheckSquare, Square, Layers, Loader2 } from "lucide-react";
import { ordersService } from "@/lib/services/orders.service";
import type { Order } from "@/types/api.types";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending:   { label: "Beklemede",     className: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  Placed:    { label: "Alındı",        className: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
  Paid:      { label: "Ödendi",        className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  Shipped:   { label: "Kargoda",       className: "bg-primary/10 text-primary border border-primary/20" },
  Delivered: { label: "Teslim Edildi", className: "bg-green-500/10 text-green-400 border border-green-500/20" },
  Cancelled: { label: "İptal",         className: "bg-red-500/10 text-red-400 border border-red-500/20" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Shipped");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  useEffect(() => {
    ordersService.getAll()
      .then(setOrders)
      .catch(() => setError("Siparişler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) =>
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.orderNumber ?? "").toLowerCase().includes(search.toLowerCase())
    ), [orders, filter, search]);

  const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const paidCount = orders.filter(o => o.status === 'Paid').length;

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selected.has(o.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const s = new Set(prev); filtered.forEach(o => s.delete(o.id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); filtered.forEach(o => s.add(o.id)); return s; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  };

  const handleBulkUpdate = async () => {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    setBulkMsg("");
    let ok = 0; let fail = 0;
    for (const id of selected) {
      try { await ordersService.updateStatus(id, bulkStatus); ok++; }
      catch { fail++; }
    }
    setOrders(prev => prev.map(o => selected.has(o.id) ? { ...o, status: bulkStatus } : o));
    setSelected(new Set());
    setBulkMsg(fail === 0 ? `${ok} sipariş güncellendi ✓` : `${ok} güncellendi, ${fail} başarısız`);
    setBulkUpdating(false);
    setTimeout(() => setBulkMsg(""), 4000);
  };

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
    const aElement = a;
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-border rounded-xl transition-all hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> CSV İndir
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="premium-card p-5">
          <p className="text-xs text-slate-500 mb-1">Toplam Sipariş</p>
          <p className="text-2xl font-black text-foreground">{orders.length}</p>
        </div>
        <div className="premium-card p-5">
          <p className="text-xs text-slate-500 mb-1">Beklemede</p>
          <p className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{pendingCount}</p>
        </div>
        <div className="premium-card p-5">
          <p className="text-xs text-slate-500 mb-1">Ödendi</p>
          <p className="text-2xl font-black text-emerald-400">{paidCount}</p>
        </div>
        <div className="premium-card p-5">
          <p className="text-xs text-slate-500 mb-1">Toplam Gelir</p>
          <p className="text-2xl font-black text-primary">₺{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="premium-card p-6">
        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/25">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">{selected.size} sipariş seçildi</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="px-2 py-1 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none"
            >
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold transition-opacity disabled:opacity-60"
            >
              {bulkUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
              Durumu Güncelle
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-200 ml-auto">
              Seçimi Temizle
            </button>
          </div>
        )}
        {bulkMsg && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {bulkMsg}
          </div>
        )}

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Sipariş Listesi</h3>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Sipariş no ara..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="all">Tümü</option>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          {error ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 w-8">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-primary transition-colors">
                        {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Sipariş</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Tarih</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Toplam</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                    : filtered.length === 0
                    ? (
                      <tr><td colSpan={6}>
                        <EmptyState icon={<Package />} title="Sipariş bulunamadı" description="Filtrelerinize uyan sipariş yok." />
                      </td></tr>
                    )
                    : filtered.map((o) => {
                      const status = statusConfig[o.status] ?? { label: o.status, className: "bg-slate-700/40 text-slate-300" };
                      const isSelected = selected.has(o.id);
                      return (
                        <tr key={o.id} className={`border-b border-border hover:bg-surface/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-3 w-8">
                            <button onClick={() => toggleOne(o.id)} className="text-slate-400 hover:text-primary transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
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
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold">₺{o.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/orders/${o.id}`} className="text-primary hover:underline text-xs font-semibold">Görüntüle</Link>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
