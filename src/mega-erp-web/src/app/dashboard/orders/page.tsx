"use client";

import React, { useEffect, useState, useMemo } from "react";

import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package, AlertCircle, Search, Download, CheckSquare, Square, Layers, Loader2, TrendingUp, Clock, CheckCircle2, XCircle, Plus, X, Trash2 } from "lucide-react";
import { ordersService } from "@/lib/services/orders.service";
import type { CreateOrderLine } from "@/lib/services/orders.service";
import { productsService } from "@/lib/services/products.service";
import type { Order, Product } from "@/types/api.types";
import Link from "next/link";
import { useToast } from "@/store/ui.store";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending:   { label: "Beklemede",     className: "bg-amber-500/10 text-amber-450 border border-amber-500/20" },
  Placed:    { label: "Alındı",        className: "bg-cyan-500/10 text-cyan-455 border border-cyan-500/20" },
  Paid:      { label: "Ödendi",        className: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" },
  Shipped:   { label: "Kargoda",       className: "bg-primary/10 text-primary border border-primary/20" },
  Delivered: { label: "Teslim Edildi", className: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" },
  Cancelled: { label: "İptal",         className: "bg-red-500/10 text-red-450 border border-red-500/20" },
};

const EMPTY_LINE: CreateOrderLine = { productId: '', quantity: 1, unitPrice: 0 }

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Shipped");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  // New order form
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [createLines, setCreateLines] = useState<CreateOrderLine[]>([{ ...EMPTY_LINE }]);
  const [createNotes, setCreateNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    ordersService.getAll()
      .then(setOrders)
      .catch(() => setError("Siparişler yüklenemedi."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const openCreate = async () => {
    setShowCreate(true);
    setCreateLines([{ ...EMPTY_LINE }]);
    setCreateNotes('');
    if (products.length === 0 && !productsLoading) {
      setProductsLoading(true);
      productsService.getAll()
        .then(setProducts)
        .catch(() => {})
        .finally(() => setProductsLoading(false));
    }
  };

  const addLine = () => setCreateLines(prev => [...prev, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => setCreateLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof CreateOrderLine, value: string | number) => {
    setCreateLines(prev => prev.map((l, idx) => idx !== i ? l : { ...l, [field]: value }));
  };
  const selectProduct = (i: number, productId: string) => {
    const p = products.find(p => p.id === productId);
    setCreateLines(prev => prev.map((l, idx) =>
      idx !== i ? l : { ...l, productId, unitPrice: p?.basePrice ?? 0 }
    ));
  };

  const createTotal = createLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const handleCreateOrder = async () => {
    const validLines = createLines.filter(l => l.productId && l.quantity > 0);
    if (validLines.length === 0) { toast.error('En az bir ürün satırı ekleyin.'); return; }
    setCreateLoading(true);
    try {
      await ordersService.create(validLines, createNotes || undefined);
      toast.success('Sipariş oluşturuldu.');
      setShowCreate(false);
      loadOrders();
    } catch {
      toast.error('Sipariş oluşturulamadı.');
    } finally {
      setCreateLoading(false);
    }
  };

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
  const cancelledCount = orders.filter(o => o.status === 'Cancelled').length;
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayCount = orders.filter(o => o.orderDate?.slice(0, 10) === todayISO).length;

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
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Siparişler</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">B2B sipariş geçmişi ve işlem durumları</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-all shadow-md shadow-primary/20 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Yeni Sipariş
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-border/80 hover:bg-emerald-500/10 hover:text-emerald-455 transition-all shadow-md shadow-emerald-500/5 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> CSV İndir
          </button>
        </div>
      </div>

      {/* Create Order Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="premium-card p-6 border border-primary/25 bg-slate-900/60 backdrop-blur-md space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Yeni B2B Sipariş Oluştur
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Ürün Satırları</label>
                <button
                  onClick={addLine}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" /> Satır Ekle
                </button>
              </div>

              {productsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold p-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ürünler yükleniyor…
                </div>
              ) : (
                <div className="space-y-2.5">
                  {createLines.map((line, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_110px_36px] gap-2.5 items-end">
                      <div>
                        {i === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ürün</label>}
                        <select
                          value={line.productId}
                          onChange={e => selectProduct(i, e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all cursor-pointer font-semibold"
                        >
                          <option value="">Ürün seçin…</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {i === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Adet</label>}
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                      </div>
                      <div>
                        {i === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Birim Fiyat ₺</label>}
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.unitPrice}
                          onChange={e => updateLine(i, 'unitPrice', Number(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                        />
                      </div>
                      <button
                        onClick={() => removeLine(i)}
                        disabled={createLines.length === 1}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 bg-slate-950/20 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Not (isteğe bağlı)</label>
              <input
                value={createNotes}
                onChange={e => setCreateNotes(e.target.value)}
                placeholder="Sipariş notu, müşteri referansı…"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/40 border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              />
            </div>

            {/* Total + Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam:</span>
                <span className="text-lg font-black text-foreground font-mono">
                  ₺{createTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateOrder}
                  disabled={createLoading || productsLoading}
                  className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Siparişi Oluştur
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl border border-border/80 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Toplam Sipariş', value: orders.length, icon: Package, color: 'bg-primary/10 text-primary border border-primary/20' },
          { label: 'Bugün',          value: todayCount,    icon: Clock,    color: todayCount > 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-950/40 text-slate-500 border border-border/80' },
          { label: 'Beklemede',      value: pendingCount,  icon: AlertCircle, color: pendingCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-950/40 text-slate-500 border border-border/80' },
          { label: 'Ödendi',         value: paidCount,     icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
          { label: 'İptal',          value: cancelledCount, icon: XCircle, color: cancelledCount > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-950/40 text-slate-500 border border-border/80' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="premium-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
              <p className="text-2xl font-black text-foreground mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue callout */}
      <div className="premium-card p-4 flex items-center gap-4 border-emerald-500/15 bg-emerald-500/3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Gelir (İptal Hariç)</p>
          <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
            ₺{totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="premium-card p-6 border border-border/80 bg-slate-900/40">
        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-primary">{selected.size} sipariş seçildi</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="appearance-none px-3 py-1.5 rounded-lg bg-slate-950 border border-border text-foreground text-xs font-bold focus:outline-none"
            >
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-opacity disabled:opacity-60"
            >
              {bulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
              Durumu Güncelle
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-200 font-bold ml-auto">
              Seçimi Temizle
            </button>
          </div>
        )}
        {bulkMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs font-bold">
            {bulkMsg}
          </div>
        )}

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Sipariş Listesi</h3>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Sipariş no ara..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950/20 border border-border/80 text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950/20 border border-border/80 text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/25"
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
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-450 text-xs font-bold">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-slate-400">
                    <th className="px-3 py-3 w-8">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-primary transition-colors">
                        {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Sipariş</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Tarih</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Durum</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Toplam</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                    : filtered.length === 0
                    ? (
                      <tr><td colSpan={6}>
                        <EmptyState icon={<Package />} title="Sipariş bulunamadı" description="Filtrelerinize uyan sipariş yok." />
                      </td></tr>
                    )
                    : filtered.map((o) => {
                      const status = statusConfig[o.status] ?? { label: o.status, className: "bg-slate-750/40 text-slate-300 border border-transparent" };
                      const isSelected = selected.has(o.id);
                      return (
                        <tr key={o.id} className={`hover:bg-slate-800/10 border-b border-border/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-3 w-8">
                            <button onClick={() => toggleOne(o.id)} className="text-slate-400 hover:text-primary transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{o.id.slice(0, 8).toUpperCase()}</span>
                              {o.orderNumber && <p className="text-xs font-bold text-foreground mt-0.5">{o.orderNumber}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell text-xs font-semibold">
                            {new Date(o.orderDate).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-405 font-mono">₺{o.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/orders/${o.id}`} className="text-primary hover:text-primary/95 text-xs font-bold hover:underline transition-colors">Görüntüle</Link>
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
