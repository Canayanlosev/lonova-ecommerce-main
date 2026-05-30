"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw, Plus, X, Save, Edit2, Trash2, Search, Download,
  TrendingUp, TrendingDown, Users, DollarSign, Calendar, AlertCircle,
  CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Filter, BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type SubStatus = "aktif" | "iptal" | "beklemede" | "sona_erdi" | "ücretsiz";
type BillingCycle = "aylık" | "üç_aylık" | "yıllık";
type PlanTier = "starter" | "basic" | "pro" | "enterprise" | "özel";

interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planTier: PlanTier;
  planName: string;
  billingCycle: BillingCycle;
  monthlyValue: number; // normalized to monthly
  status: SubStatus;
  startDate: string;
  nextBillingDate: string;
  cancelledAt: string | null;
  autoRenew: boolean;
  notes: string;
  trialEndsAt: string | null;
}

interface SubForm {
  customerName: string;
  customerEmail: string;
  planTier: PlanTier;
  planName: string;
  billingCycle: BillingCycle;
  monthlyValue: string;
  status: SubStatus;
  startDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  notes: string;
  trialEndsAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SubStatus, string> = {
  aktif: "Aktif", iptal: "İptal", beklemede: "Beklemede", sona_erdi: "Sona Erdi", ücretsiz: "Ücretsiz"
};
const STATUS_COLORS: Record<SubStatus, string> = {
  aktif: "bg-emerald-500/15 text-emerald-400",
  iptal: "bg-red-500/15 text-red-400",
  beklemede: "bg-amber-500/15 text-amber-400",
  sona_erdi: "bg-slate-500/15 text-slate-400",
  ücretsiz: "bg-blue-500/15 text-blue-400",
};
const STATUS_ICONS: Record<SubStatus, React.ElementType> = {
  aktif: CheckCircle, iptal: XCircle, beklemede: Clock, sona_erdi: AlertCircle, ücretsiz: Users
};

const PLAN_COLORS: Record<PlanTier, string> = {
  starter: "text-slate-400", basic: "text-blue-400", pro: "text-primary",
  enterprise: "text-purple-400", özel: "text-amber-400"
};

const CYCLE_MULTIPLIER: Record<BillingCycle, number> = {
  aylık: 1, üç_aylık: 3, yıllık: 12
};

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const STORAGE_KEY = "abonelikler";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number) => "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtShort = (n: number) => n >= 1_000_000 ? "₺" + (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? "₺" + (n / 1_000).toFixed(1) + "K" : fmt(n);

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

function seedSubscriptions(): Subscription[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: uid(), customerId: "c1", customerName: "Yıldız Tekstil A.Ş.", customerEmail: "muhasebe@yildiz.com",
      planTier: "enterprise", planName: "Enterprise Plan", billingCycle: "yıllık",
      monthlyValue: 1499, status: "aktif",
      startDate: "2026-01-01", nextBillingDate: "2027-01-01", cancelledAt: null, autoRenew: true,
      notes: "3 yıllık anlaşma kapsamında %10 indirimli", trialEndsAt: null,
    },
    {
      id: uid(), customerId: "c2", customerName: "Demir Gıda Ltd.", customerEmail: "ceo@demirgida.com",
      planTier: "pro", planName: "Pro Plan", billingCycle: "aylık",
      monthlyValue: 799, status: "aktif",
      startDate: "2026-03-15", nextBillingDate: addMonths(today, 1), cancelledAt: null, autoRenew: true,
      notes: "", trialEndsAt: null,
    },
    {
      id: uid(), customerId: "c3", customerName: "Güneş Yapı Malzemeleri", customerEmail: "info@gunesyapi.com",
      planTier: "basic", planName: "Basic Plan", billingCycle: "üç_aylık",
      monthlyValue: 299, status: "aktif",
      startDate: "2026-02-01", nextBillingDate: addMonths(today, 0), cancelledAt: null, autoRenew: false,
      notes: "Otomatik yenileme kapalı — ilişki yöneticisi arayacak", trialEndsAt: null,
    },
    {
      id: uid(), customerId: "c4", customerName: "Akın Lojistik", customerEmail: "billing@akin.com.tr",
      planTier: "pro", planName: "Pro Plan", billingCycle: "yıllık",
      monthlyValue: 799, status: "aktif",
      startDate: "2025-12-01", nextBillingDate: addMonths(today, 6), cancelledAt: null, autoRenew: true,
      notes: "", trialEndsAt: null,
    },
    {
      id: uid(), customerId: "c5", customerName: "Çelik Mobilya San.", customerEmail: "contact@celikmobilya.com",
      planTier: "starter", planName: "Starter Plan", billingCycle: "aylık",
      monthlyValue: 99, status: "ücretsiz",
      startDate: "2026-05-01", nextBillingDate: addMonths(today, 0), cancelledAt: null, autoRenew: false,
      notes: "", trialEndsAt: addMonths(today, 5),
    },
    {
      id: uid(), customerId: "c6", customerName: "Mercan Elektronik", customerEmail: "it@mercan.com",
      planTier: "basic", planName: "Basic Plan", billingCycle: "aylık",
      monthlyValue: 299, status: "iptal",
      startDate: "2025-08-01", nextBillingDate: "2026-04-30", cancelledAt: "2026-04-15", autoRenew: false,
      notes: "Bütçe kısıtlaması nedeniyle iptal", trialEndsAt: null,
    },
    {
      id: uid(), customerId: "c7", customerName: "Başak Enerji A.Ş.", customerEmail: "ops@basak.com",
      planTier: "enterprise", planName: "Enterprise Plan", billingCycle: "yıllık",
      monthlyValue: 1499, status: "beklemede",
      startDate: "2026-05-20", nextBillingDate: "2027-05-20", cancelledAt: null, autoRenew: true,
      notes: "Ödeme onayı bekleniyor", trialEndsAt: null,
    },
    {
      id: uid(), customerId: "c8", customerName: "Parlak Ambalaj Ltd.", customerEmail: "muhasebe@parlak.com",
      planTier: "özel", planName: "Özel Plan (50 Kullanıcı)", billingCycle: "yıllık",
      monthlyValue: 2500, status: "aktif",
      startDate: "2026-01-15", nextBillingDate: "2027-01-15", cancelledAt: null, autoRenew: true,
      notes: "Özel SLA dahil — priority destek", trialEndsAt: null,
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AboneliklerPage() {
  const toast = useToast();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<SubStatus | "tümü">("tümü");
  const [filterCycle, setFilterCycle] = useState<BillingCycle | "tümü">("tümü");
  const [sortBy, setSortBy] = useState<"value" | "date" | "name">("value");
  const [form, setForm] = useState<SubForm>({
    customerName: "", customerEmail: "", planTier: "pro", planName: "Pro Plan",
    billingCycle: "aylık", monthlyValue: "799", status: "aktif",
    startDate: new Date().toISOString().slice(0, 10),
    nextBillingDate: addMonths(new Date().toISOString().slice(0, 10), 1),
    autoRenew: true, notes: "", trialEndsAt: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setSubs(raw ? JSON.parse(raw) : seedSubscriptions());
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSubscriptions()));
    } catch {
      setSubs(seedSubscriptions());
    }
  }, []);

  const save = useCallback((updated: Subscription[]) => {
    setSubs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // MRR / ARR
  const metrics = useMemo(() => {
    const active = subs.filter(s => s.status === "aktif");
    const mrr = active.reduce((sum, s) => sum + s.monthlyValue, 0);
    const arr = mrr * 12;
    const churnedThisMonth = subs.filter(s => s.status === "iptal" && s.cancelledAt && s.cancelledAt.slice(0, 7) === new Date().toISOString().slice(0, 7));
    const churnMRR = churnedThisMonth.reduce((sum, s) => sum + s.monthlyValue, 0);
    const totalActive = active.length;
    const pendingRenewal = subs.filter(s => {
      if (s.status !== "aktif") return false;
      const daysUntil = (new Date(s.nextBillingDate).getTime() - Date.now()) / 86400000;
      return daysUntil >= 0 && daysUntil <= 30;
    }).length;
    const trials = subs.filter(s => s.status === "ücretsiz").length;
    return { mrr, arr, totalActive, churnMRR, pendingRenewal, trials };
  }, [subs]);

  // Monthly MRR chart (last 6 months trend — simulated)
  const mrrChart = useMemo(() => {
    const base = metrics.mrr;
    return MONTHS_SHORT.slice(0, 6).map((label, i) => ({
      name: label,
      "MRR": Math.round(base * (0.7 + i * 0.06 + (i === 4 ? 0 : Math.random() * 0.05))),
    }));
  }, [metrics.mrr]);

  const filtered = useMemo(() => {
    return subs
      .filter(s => {
        if (filterStatus !== "tümü" && s.status !== filterStatus) return false;
        if (filterCycle !== "tümü" && s.billingCycle !== filterCycle) return false;
        if (searchQ && !s.customerName.toLowerCase().includes(searchQ.toLowerCase()) &&
          !s.planName.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "value") return b.monthlyValue - a.monthlyValue;
        if (sortBy === "date") return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
        return a.customerName.localeCompare(b.customerName, "tr");
      });
  }, [subs, filterStatus, filterCycle, searchQ, sortBy]);

  function openNew() {
    setEditId(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({ customerName: "", customerEmail: "", planTier: "pro", planName: "Pro Plan", billingCycle: "aylık", monthlyValue: "799", status: "aktif", startDate: today, nextBillingDate: addMonths(today, 1), autoRenew: true, notes: "", trialEndsAt: "" });
    setShowModal(true);
  }

  function openEdit(s: Subscription) {
    setEditId(s.id);
    setForm({ customerName: s.customerName, customerEmail: s.customerEmail, planTier: s.planTier, planName: s.planName, billingCycle: s.billingCycle, monthlyValue: String(s.monthlyValue), status: s.status, startDate: s.startDate, nextBillingDate: s.nextBillingDate, autoRenew: s.autoRenew, notes: s.notes, trialEndsAt: s.trialEndsAt ?? "" });
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.customerName.trim()) { toast.error("Müşteri adı gerekli"); return; }
    const mv = parseFloat(form.monthlyValue) || 0;
    if (editId) {
      save(subs.map(s => s.id === editId ? { ...s, ...form, monthlyValue: mv, trialEndsAt: form.trialEndsAt || null, cancelledAt: form.status === "iptal" ? (subs.find(x => x.id === editId)?.cancelledAt ?? new Date().toISOString().slice(0, 10)) : null } : s));
      toast.success("Abonelik güncellendi");
    } else {
      save([{ id: uid(), customerId: uid(), ...form, monthlyValue: mv, trialEndsAt: form.trialEndsAt || null, cancelledAt: null }, ...subs]);
      toast.success("Abonelik eklendi");
    }
    setShowModal(false);
  }

  function cancelSub(id: string) {
    save(subs.map(s => s.id === id ? { ...s, status: "iptal" as SubStatus, cancelledAt: new Date().toISOString().slice(0, 10), autoRenew: false } : s));
    toast.success("Abonelik iptal edildi");
  }

  function renewSub(id: string) {
    const sub = subs.find(s => s.id === id);
    if (!sub) return;
    const mult = CYCLE_MULTIPLIER[sub.billingCycle];
    save(subs.map(s => s.id === id ? { ...s, status: "aktif" as SubStatus, nextBillingDate: addMonths(s.nextBillingDate, mult), cancelledAt: null } : s));
    toast.success("Abonelik yenilendi");
  }

  function exportCSV() {
    const header = "Müşteri,Email,Plan,Döngü,Aylık Değer,Durum,Başlangıç,Sonraki Fatura";
    const rows = subs.map(s => [
      `"${s.customerName}"`, s.customerEmail, s.planName,
      s.billingCycle, s.monthlyValue, STATUS_LABELS[s.status], s.startDate, s.nextBillingDate
    ].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "abonelikler.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Abonelik Yönetimi</h1>
          <p className="text-slate-400 text-sm mt-1">MRR takibi, yenileme planlaması ve müşteri abonelik yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Abonelik Ekle
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="premium-card p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">MRR</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{fmtShort(metrics.mrr)}</p>
          <p className="text-xs text-slate-500 mt-1">Aylık tekrar gelir</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">ARR</span>
            <BarChart2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{fmtShort(metrics.arr)}</p>
          <p className="text-xs text-slate-500 mt-1">Yıllık tekrar gelir</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Aktif</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary">{metrics.totalActive}</p>
          <p className="text-xs text-slate-500 mt-1">{metrics.trials} deneme</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Yenileme</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{metrics.pendingRenewal}</p>
          <p className="text-xs text-slate-500 mt-1">30 gün içinde</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Churn MRR</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">{fmtShort(metrics.churnMRR)}</p>
          <p className="text-xs text-slate-500 mt-1">Bu ay iptal</p>
        </div>
      </div>

      {/* MRR Chart */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-bold mb-4">MRR Trendi (Son 6 Ay)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={mrrChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtShort(Number(v))} />
            <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
            <Line dataKey="MRR" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Müşteri veya plan ara..."
            className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.keys(STATUS_LABELS) as SubStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={filterCycle} onChange={e => setFilterCycle(e.target.value as typeof filterCycle)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Döngüler</option>
          <option value="aylık">Aylık</option>
          <option value="üç_aylık">3 Aylık</option>
          <option value="yıllık">Yıllık</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="value">Değere Göre</option>
          <option value="date">Yenileme Tarihine Göre</option>
          <option value="name">İsme Göre</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-slate-500">
                <th className="text-left px-4 py-3 font-semibold">Müşteri</th>
                <th className="text-left px-4 py-3 font-semibold">Plan</th>
                <th className="text-right px-4 py-3 font-semibold">Aylık Değer</th>
                <th className="text-center px-4 py-3 font-semibold">Döngü</th>
                <th className="text-center px-4 py-3 font-semibold">Durum</th>
                <th className="text-right px-4 py-3 font-semibold">Sonraki Fatura</th>
                <th className="text-center px-4 py-3 font-semibold">Otomatik</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">Abonelik bulunamadı</td></tr>
              ) : filtered.map(sub => {
                const StatusIcon = STATUS_ICONS[sub.status];
                const daysUntil = Math.ceil((new Date(sub.nextBillingDate).getTime() - Date.now()) / 86400000);
                const isUrgent = daysUntil >= 0 && daysUntil <= 7 && sub.status === "aktif";
                const isTrial = sub.status === "ücretsiz" && sub.trialEndsAt;

                return (
                  <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                          {sub.customerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-xs sm:text-sm">{sub.customerName}</p>
                          <p className="text-xs text-slate-500">{sub.customerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-bold uppercase ${PLAN_COLORS[sub.planTier]}`}>{sub.planTier}</p>
                      <p className="text-xs text-slate-400">{sub.planName}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{fmt(sub.monthlyValue)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-700/60 text-xs font-bold text-slate-300">
                        {sub.billingCycle === "üç_aylık" ? "3 Aylık" : sub.billingCycle === "aylık" ? "Aylık" : "Yıllık"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[sub.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_LABELS[sub.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sub.status === "iptal" ? (
                        <span className="text-xs text-slate-500">—</span>
                      ) : (
                        <div>
                          <p className={`text-xs font-bold ${isUrgent ? "text-amber-400" : ""}`}>
                            {new Date(sub.nextBillingDate).toLocaleDateString("tr-TR")}
                          </p>
                          {isTrial && sub.trialEndsAt && (
                            <p className="text-[10px] text-blue-400">
                              Deneme: {new Date(sub.trialEndsAt).toLocaleDateString("tr-TR")}
                            </p>
                          )}
                          {daysUntil >= 0 && daysUntil <= 30 && sub.status === "aktif" && (
                            <p className={`text-[10px] ${daysUntil <= 7 ? "text-amber-400" : "text-slate-500"}`}>
                              {daysUntil} gün
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${sub.autoRenew ? "text-emerald-400" : "text-slate-500"}`}>
                        {sub.autoRenew ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {sub.status === "iptal" && (
                          <button onClick={() => renewSub(sub.id)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors" title="Yenile">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {sub.status === "aktif" && (
                          <button onClick={() => cancelSub(sub.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="İptal Et">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(sub)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { save(subs.filter(s => s.id !== sub.id)); toast.success("Silindi"); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
                <h2 className="text-base font-bold">{editId ? "Abonelik Düzenle" : "Yeni Abonelik"}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Müşteri Adı</label>
                    <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                      placeholder="Firma Adı"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <input type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                      placeholder="billing@firma.com"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Plan Kademesi</label>
                    <select value={form.planTier} onChange={e => setForm(f => ({ ...f, planTier: e.target.value as PlanTier }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {(["starter", "basic", "pro", "enterprise", "özel"] as PlanTier[]).map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Plan Adı</label>
                    <input value={form.planName} onChange={e => setForm(f => ({ ...f, planName: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fatura Döngüsü</label>
                    <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value as BillingCycle }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      <option value="aylık">Aylık</option>
                      <option value="üç_aylık">3 Aylık</option>
                      <option value="yıllık">Yıllık</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Aylık Değer (₺)</label>
                    <input type="number" value={form.monthlyValue} onChange={e => setForm(f => ({ ...f, monthlyValue: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Başlangıç Tarihi</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sonraki Fatura</label>
                    <input type="date" value={form.nextBillingDate} onChange={e => setForm(f => ({ ...f, nextBillingDate: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Durum</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SubStatus }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {(Object.keys(STATUS_LABELS) as SubStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Deneme Bitiş</label>
                    <input type="date" value={form.trialEndsAt} onChange={e => setForm(f => ({ ...f, trialEndsAt: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="autoRenew" checked={form.autoRenew} onChange={e => setForm(f => ({ ...f, autoRenew: e.target.checked }))}
                    className="w-4 h-4 accent-primary" />
                  <label htmlFor="autoRenew" className="text-sm text-slate-300">Otomatik yenileme aktif</label>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notlar</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={handleSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" />
                  {editId ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
