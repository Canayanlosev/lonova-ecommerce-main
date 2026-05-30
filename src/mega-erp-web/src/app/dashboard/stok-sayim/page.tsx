"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ClipboardList, Plus, Play, CheckCircle, X, AlertTriangle, Package,
  Edit2, Trash2, Search, Download, RefreshCw, Clock, ChevronRight,
  ArrowLeft, Filter, TrendingUp, TrendingDown, BarChart2, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type SessionStatus = "taslak" | "devam_ediyor" | "tamamlandi" | "iptal";

interface CountItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
  variance: number | null; // countedQty - systemQty
  notes: string;
  counted: boolean;
}

interface CountSession {
  id: string;
  title: string;
  description: string;
  location: string; // warehouse zone
  status: SessionStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  items: CountItem[];
  createdBy: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SessionStatus, string> = {
  taslak: "Taslak", devam_ediyor: "Devam Ediyor", tamamlandi: "Tamamlandı", iptal: "İptal"
};
const STATUS_COLORS: Record<SessionStatus, string> = {
  taslak: "bg-slate-500/15 text-slate-300",
  devam_ediyor: "bg-amber-500/15 text-amber-400",
  tamamlandi: "bg-emerald-500/15 text-emerald-400",
  iptal: "bg-red-500/15 text-red-400",
};

const LOCATIONS = ["Tüm Depo", "A Bölgesi", "B Bölgesi", "C Bölgesi", "Soğuk Oda", "Ara Depo"];

const STORAGE_KEY = "stok-sayim";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_PRODUCTS = [
  { id: "p1", name: "Laptop Pro 15\"", sku: "LP-001", location: "A Bölgesi", systemQty: 15 },
  { id: "p2", name: "Kablosuz Mouse", sku: "KM-002", location: "A Bölgesi", systemQty: 48 },
  { id: "p3", name: "Mekanik Klavye", sku: "MK-003", location: "A Bölgesi", systemQty: 32 },
  { id: "p4", name: "USB-C Hub 7 Port", sku: "UH-004", location: "B Bölgesi", systemQty: 24 },
  { id: "p5", name: "Monitör 27\" 4K", sku: "MN-005", location: "B Bölgesi", systemQty: 8 },
  { id: "p6", name: "Webcam 1080p", sku: "WC-006", location: "B Bölgesi", systemQty: 20 },
  { id: "p7", name: "Kulaklık Bluetooth", sku: "KB-007", location: "C Bölgesi", systemQty: 35 },
  { id: "p8", name: "Telefon Tutucu", sku: "TT-008", location: "C Bölgesi", systemQty: 60 },
  { id: "p9", name: "Şarj Cihazı 65W", sku: "SC-009", location: "C Bölgesi", systemQty: 42 },
  { id: "p10", name: "Laptop Çantası", sku: "LC-010", location: "Ara Depo", systemQty: 18 },
];

function makeItem(p: typeof DEMO_PRODUCTS[0], counted: boolean, variance?: number): CountItem {
  const countedQty = counted ? (variance !== undefined ? p.systemQty + variance : p.systemQty) : null;
  return {
    id: uid(), productId: p.id, productName: p.name, sku: p.sku,
    location: p.location, systemQty: p.systemQty,
    countedQty, variance: countedQty !== null ? countedQty - p.systemQty : null,
    notes: "", counted,
  };
}

function seedSessions(): CountSession[] {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  return [
    {
      id: "s1", title: "Mayıs 2026 Genel Sayım", description: "Aylık periyodik stok sayımı",
      location: "Tüm Depo", status: "tamamlandi",
      createdAt: weekAgo.toISOString(),
      startedAt: weekAgo.toISOString(),
      completedAt: dayAgo.toISOString(),
      createdBy: "Ahmet Y.",
      items: DEMO_PRODUCTS.map((p, i) => makeItem(p, true, [0, 0, -2, 0, 1, 0, -3, 0, 0, 2][i])),
    },
    {
      id: "s2", title: "A Bölgesi Spot Sayım", description: "Yüksek stok hareketi sonrası kontrol",
      location: "A Bölgesi", status: "devam_ediyor",
      createdAt: dayAgo.toISOString(),
      startedAt: dayAgo.toISOString(),
      completedAt: null,
      createdBy: "Selin K.",
      items: DEMO_PRODUCTS.filter(p => p.location === "A Bölgesi").map((p, i) => makeItem(p, i < 2, i === 1 ? -1 : undefined)),
    },
    {
      id: "s3", title: "B Bölgesi Sayım", description: "Taslak olarak oluşturuldu",
      location: "B Bölgesi", status: "taslak",
      createdAt: now.toISOString(),
      startedAt: null,
      completedAt: null,
      createdBy: "Murat D.",
      items: DEMO_PRODUCTS.filter(p => p.location === "B Bölgesi").map(p => makeItem(p, false)),
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function StokSayimPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<SessionStatus | "tümü">("tümü");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", description: "", location: "Tüm Depo" });
  const [countSearch, setCountSearch] = useState("");
  const [filterCounted, setFilterCounted] = useState<"tümü" | "sayildi" | "bekliyor">("tümü");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setSessions(raw ? JSON.parse(raw) : seedSessions());
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSessions()));
    } catch {
      setSessions(seedSessions());
    }
  }, []);

  const save = useCallback((updated: CountSession[]) => {
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);

  const filteredSessions = useMemo(() => sessions.filter(s => {
    if (filterStatus !== "tümü" && s.status !== filterStatus) return false;
    if (searchQ && !s.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [sessions, filterStatus, searchQ]);

  const sessionStats = useMemo(() => sessions.map(s => {
    const counted = s.items.filter(i => i.counted).length;
    const total = s.items.length;
    const variances = s.items.filter(i => i.variance !== null && i.variance !== 0);
    const totalVariance = variances.reduce((sum, i) => sum + Math.abs(i.variance ?? 0), 0);
    return { id: s.id, counted, total, variances: variances.length, totalVariance };
  }), [sessions]);

  function createSession() {
    if (!newForm.title.trim()) { toast.error("Sayım adı gerekli"); return; }
    const location = newForm.location;
    const products = location === "Tüm Depo"
      ? DEMO_PRODUCTS
      : DEMO_PRODUCTS.filter(p => p.location === location);
    const session: CountSession = {
      id: uid(), title: newForm.title, description: newForm.description,
      location, status: "taslak",
      createdAt: new Date().toISOString(), startedAt: null, completedAt: null,
      createdBy: "Kullanıcı",
      items: products.map(p => makeItem(p, false)),
    };
    save([session, ...sessions]);
    toast.success("Sayım oluşturuldu");
    setShowNewModal(false);
    setNewForm({ title: "", description: "", location: "Tüm Depo" });
  }

  function startSession(id: string) {
    save(sessions.map(s => s.id === id
      ? { ...s, status: "devam_ediyor" as SessionStatus, startedAt: new Date().toISOString() }
      : s));
    setActiveSessionId(id);
    toast.success("Sayım başlatıldı");
  }

  function completeSession(id: string) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const uncounted = session.items.filter(i => !i.counted).length;
    if (uncounted > 0) {
      toast.error(`${uncounted} ürün sayılmamış. Lütfen tümünü sayın.`);
      return;
    }
    save(sessions.map(s => s.id === id
      ? { ...s, status: "tamamlandi" as SessionStatus, completedAt: new Date().toISOString() }
      : s));
    setActiveSessionId(null);
    toast.success("Sayım tamamlandı!");
  }

  function updateItemCount(sessionId: string, itemId: string, qty: string) {
    const parsed = parseInt(qty);
    if (isNaN(parsed) || parsed < 0) return;
    save(sessions.map(s => s.id === sessionId ? {
      ...s,
      items: s.items.map(item => item.id === itemId
        ? { ...item, countedQty: parsed, variance: parsed - item.systemQty, counted: true }
        : item)
    } : s));
  }

  function updateItemNotes(sessionId: string, itemId: string, notes: string) {
    save(sessions.map(s => s.id === sessionId ? {
      ...s, items: s.items.map(item => item.id === itemId ? { ...item, notes } : item)
    } : s));
  }

  function exportVarianceReport(session: CountSession) {
    const header = "SKU,Ürün,Lokasyon,Sistem Stok,Sayılan,Fark,Notlar";
    const rows = session.items.map(i =>
      [i.sku, `"${i.productName}"`, i.location, i.systemQty,
        i.countedQty ?? "—", i.variance ?? "—", `"${i.notes}"`].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sayim-${session.id.slice(0, 6)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapor indirildi");
  }

  // ── Active Count View ──────────────────────────────────────────────────────

  if (activeSession) {
    const stats = sessionStats.find(s => s.id === activeSession.id)!;
    const progress = stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0;
    const filteredItems = activeSession.items.filter(item => {
      if (filterCounted === "sayildi" && !item.counted) return false;
      if (filterCounted === "bekliyor" && item.counted) return false;
      if (countSearch && !item.productName.toLowerCase().includes(countSearch.toLowerCase()) && !item.sku.toLowerCase().includes(countSearch.toLowerCase())) return false;
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveSessionId(null)}
            className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black">{activeSession.title}</h1>
            <p className="text-slate-400 text-sm">{activeSession.location} · {stats.counted}/{stats.total} sayıldı</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportVarianceReport(activeSession)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
              <Download className="w-4 h-4" />
              Rapor
            </button>
            {activeSession.status === "devam_ediyor" && (
              <button onClick={() => completeSession(activeSession.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-colors">
                <CheckCircle className="w-4 h-4" />
                Sayımı Tamamla
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">Sayım İlerlemesi</span>
            <span className="text-sm font-bold text-primary">%{progress}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
            />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span>{stats.counted} sayıldı</span>
            {stats.variances > 0 && (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.variances} fark bulundu
              </span>
            )}
            <span>{stats.total - stats.counted} bekliyor</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={countSearch} onChange={e => setCountSearch(e.target.value)}
              placeholder="Ürün adı veya SKU..."
              className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
          </div>
          <div className="flex rounded-xl border border-border/60 overflow-hidden">
            {(["tümü", "bekliyor", "sayildi"] as const).map(f => (
              <button key={f} onClick={() => setFilterCounted(f)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${filterCounted === f ? "bg-primary text-white" : "text-slate-400 hover:text-foreground"}`}>
                {f === "tümü" ? "Tümü" : f === "bekliyor" ? "Bekliyor" : "Sayıldı"}
              </button>
            ))}
          </div>
        </div>

        {/* Count Table */}
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Ürün</th>
                  <th className="text-left px-4 py-3 font-semibold">Lokasyon</th>
                  <th className="text-right px-4 py-3 font-semibold">Sistem</th>
                  <th className="text-center px-4 py-3 font-semibold w-32">Sayılan</th>
                  <th className="text-right px-4 py-3 font-semibold">Fark</th>
                  <th className="text-left px-4 py-3 font-semibold">Notlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredItems.map(item => {
                  const hasVariance = item.variance !== null && item.variance !== 0;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-800/20 transition-colors ${item.counted ? "" : "opacity-70"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${item.counted ? (hasVariance ? "bg-amber-400" : "bg-emerald-400") : "bg-slate-600"}`} />
                          <div>
                            <p className="font-medium text-xs sm:text-sm">{item.productName}</p>
                            <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{item.location}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{item.systemQty}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          placeholder="Sayım gir"
                          defaultValue={item.countedQty ?? ""}
                          onBlur={e => updateItemCount(activeSession.id, item.id, e.target.value)}
                          disabled={activeSession.status === "tamamlandi"}
                          className="w-28 text-center bg-slate-700/60 border border-border/60 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary/60 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.variance !== null ? (
                          <span className={`inline-flex items-center gap-0.5 font-bold text-sm ${item.variance > 0 ? "text-emerald-400" : item.variance < 0 ? "text-red-400" : "text-slate-400"}`}>
                            {item.variance > 0 ? <TrendingUp className="w-3 h-3" /> : item.variance < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {item.variance > 0 ? "+" : ""}{item.variance}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Not ekle..."
                          defaultValue={item.notes}
                          onBlur={e => updateItemNotes(activeSession.id, item.id, e.target.value)}
                          disabled={activeSession.status === "tamamlandi"}
                          className="w-full bg-transparent border-b border-border/40 text-xs text-slate-400 focus:outline-none focus:border-primary/60 disabled:opacity-50 py-1"
                        />
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Sessions List View ─────────────────────────────────────────────────────

  const totalStats = useMemo(() => ({
    total: sessions.length,
    active: sessions.filter(s => s.status === "devam_ediyor").length,
    completed: sessions.filter(s => s.status === "tamamlandi").length,
    totalVariances: sessionStats.reduce((sum, s) => sum + s.variances, 0),
  }), [sessions, sessionStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Stok Sayım</h1>
          <p className="text-slate-400 text-sm mt-1">Fiziksel stok sayım oturumları, fark analizi ve raporlama</p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors w-fit">
          <Plus className="w-4 h-4" />
          Yeni Sayım
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam Sayım</span>
            <ClipboardList className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{totalStats.total}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Aktif Sayım</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{totalStats.active}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Tamamlanan</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{totalStats.completed}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Tespit Edilen Fark</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">{totalStats.totalVariances}</p>
          <p className="text-xs text-slate-500 mt-1">Tüm sayımlarda</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Sayım adı ara..."
            className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.keys(STATUS_LABELS) as SessionStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-500">Sayım bulunamadı</p>
            <button onClick={() => setShowNewModal(true)}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
              Yeni Sayım Oluştur
            </button>
          </div>
        ) : filteredSessions.map(session => {
          const stats = sessionStats.find(s => s.id === session.id)!;
          const progress = stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0;
          return (
            <div key={session.id} className="premium-card p-5 hover:border-primary/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold">{session.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[session.status]}`}>
                      {STATUS_LABELS[session.status]}
                    </span>
                    {stats.variances > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        {stats.variances} fark
                      </span>
                    )}
                  </div>
                  {session.description && <p className="text-xs text-slate-400 mt-1">{session.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {session.location}
                    </span>
                    <span>{stats.total} ürün · {stats.counted} sayıldı</span>
                    <span>Oluşturan: {session.createdBy}</span>
                    {session.completedAt && (
                      <span className="text-emerald-400">
                        {new Date(session.completedAt).toLocaleDateString("tr-TR")} tamamlandı
                      </span>
                    )}
                  </div>
                  {session.status !== "taslak" && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden w-full max-w-xs">
                        <div
                          className={`h-full rounded-full ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {session.status === "taslak" && (
                    <button onClick={() => startSession(session.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors">
                      <Play className="w-3.5 h-3.5" />
                      Başlat
                    </button>
                  )}
                  {(session.status === "devam_ediyor" || session.status === "tamamlandi") && (
                    <button onClick={() => setActiveSessionId(session.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
                      {session.status === "devam_ediyor" ? "Devam Et" : "Görüntüle"}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {session.status === "tamamlandi" && (
                    <button onClick={() => exportVarianceReport(session)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl text-xs hover:bg-slate-800/40 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      Rapor
                    </button>
                  )}
                  <button
                    onClick={() => { save(sessions.filter(s => s.id !== session.id)); toast.success("Silindi"); }}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Session Modal */}
      <AnimatePresence>
        {showNewModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold">Yeni Stok Sayımı</h2>
                <button onClick={() => setShowNewModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Sayım Adı</label>
                  <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="ör. Haziran 2026 Genel Sayım"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
                  <input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="İsteğe bağlı"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Sayım Bölgesi</label>
                  <select value={newForm.location} onChange={e => setNewForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
                  <p className="font-semibold mb-1">Ürünler otomatik yüklenir</p>
                  <p className="text-blue-400/70">Seçilen bölgedeki tüm ürünler sayım listesine eklenir.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={createSession}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <ClipboardList className="w-4 h-4" />
                  Oluştur
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
