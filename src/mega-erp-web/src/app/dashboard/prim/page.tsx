"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy, TrendingUp, DollarSign, Users, Plus, Edit2, Trash2, X, Save,
  ChevronDown, ChevronUp, Star, Medal, Award, Target, CheckCircle, Clock,
  Download, Filter, BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type CommissionTier = { minSales: number; rate: number }; // minSales = aylık ciro, rate = %

interface SalesRep {
  id: string;
  name: string;
  role: string;
  region: string;
  monthlyTarget: number;
  tiers: CommissionTier[];
  active: boolean;
}

type PayoutStatus = "beklemede" | "onaylandi" | "odendi";

interface CommissionRecord {
  id: string;
  repId: string;
  year: number;
  month: number;
  actualSales: number;
  commissionEarned: number;
  bonusAmount: number;
  notes: string;
  payoutStatus: PayoutStatus;
  paidAt: string | null;
}

interface RepForm {
  name: string;
  role: string;
  region: string;
  monthlyTarget: string;
  tierRates: string; // "0:2,500000:3,1000000:5" comma-sep
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS_FULL = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  beklemede: "Beklemede", onaylandi: "Onaylandı", odendi: "Ödendi"
};
const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  beklemede: "bg-amber-500/15 text-amber-400",
  onaylandi: "bg-blue-500/15 text-blue-400",
  odendi: "bg-emerald-500/15 text-emerald-400",
};

const STORAGE_REPS = "prim-satiscilar";
const STORAGE_RECORDS = "prim-kayitlar";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number) => "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtShort = (n: number) => n >= 1_000_000 ? "₺" + (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? "₺" + (n / 1_000).toFixed(0) + "K" : fmt(n);

function calcCommission(sales: number, tiers: CommissionTier[]): number {
  if (!tiers.length) return 0;
  const sorted = [...tiers].sort((a, b) => b.minSales - a.minSales);
  const tier = sorted.find(t => sales >= t.minSales) ?? sorted[sorted.length - 1];
  return sales * (tier.rate / 100);
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_REPS: SalesRep[] = [
  {
    id: "rep1", name: "Ahmet Yılmaz", role: "Kıdemli Satış Temsilcisi", region: "İstanbul",
    monthlyTarget: 500_000,
    tiers: [{ minSales: 0, rate: 2 }, { minSales: 300_000, rate: 3 }, { minSales: 500_000, rate: 4.5 }],
    active: true,
  },
  {
    id: "rep2", name: "Zeynep Kara", role: "Satış Temsilcisi", region: "Ankara",
    monthlyTarget: 350_000,
    tiers: [{ minSales: 0, rate: 2 }, { minSales: 250_000, rate: 3.5 }],
    active: true,
  },
  {
    id: "rep3", name: "Murat Demir", role: "B2B Satış Uzmanı", region: "İzmir",
    monthlyTarget: 600_000,
    tiers: [{ minSales: 0, rate: 1.5 }, { minSales: 400_000, rate: 2.5 }, { minSales: 600_000, rate: 3.5 }],
    active: true,
  },
  {
    id: "rep4", name: "Selin Çelik", role: "Satış Temsilcisi", region: "Bursa",
    monthlyTarget: 300_000,
    tiers: [{ minSales: 0, rate: 2.5 }, { minSales: 300_000, rate: 4 }],
    active: true,
  },
];

function seedRecords(reps: SalesRep[]): CommissionRecord[] {
  const records: CommissionRecord[] = [];
  const currentYear = new Date().getFullYear();
  const salesMultipliers = [
    [0.85, 1.05, 0.92, 1.12, 1.08, 0.95],  // rep1
    [0.90, 0.98, 1.05, 0.88, 1.15, 1.02],  // rep2
    [0.78, 0.95, 1.10, 0.97, 1.20, 1.05],  // rep3
    [1.05, 0.92, 0.88, 1.15, 0.97, 1.12],  // rep4
  ];
  reps.forEach((rep, ri) => {
    for (let m = 1; m <= 6; m++) {
      const mult = salesMultipliers[ri]?.[m - 1] ?? 1;
      const actualSales = Math.round(rep.monthlyTarget * mult);
      const commissionEarned = Math.round(calcCommission(actualSales, rep.tiers));
      const targetHit = actualSales >= rep.monthlyTarget;
      records.push({
        id: uid(),
        repId: rep.id,
        year: currentYear,
        month: m,
        actualSales,
        commissionEarned,
        bonusAmount: targetHit ? Math.round(commissionEarned * 0.1) : 0,
        notes: targetHit ? "Hedef aşıldı" : "",
        payoutStatus: m <= 4 ? "odendi" : m === 5 ? "onaylandi" : "beklemede",
        paidAt: m <= 4 ? `${currentYear}-0${m}-28` : null,
      });
    }
  });
  return records;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PrimPage() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [reps, setReps] = useState<SalesRep[]>([]);
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedRepId, setSelectedRepId] = useState<string>("all");
  const [tab, setTab] = useState<"overview" | "records" | "leaderboard">("overview");
  const [showRepModal, setShowRepModal] = useState(false);
  const [editRepId, setEditRepId] = useState<string | null>(null);
  const [repForm, setRepForm] = useState<RepForm>({ name: "", role: "", region: "", monthlyTarget: "", tierRates: "0:2,500000:3" });

  // Load
  useEffect(() => {
    try {
      const rawReps = localStorage.getItem(STORAGE_REPS);
      const rawRec = localStorage.getItem(STORAGE_RECORDS);
      const loadedReps: SalesRep[] = rawReps ? JSON.parse(rawReps) : DEMO_REPS;
      const loadedRec: CommissionRecord[] = rawRec ? JSON.parse(rawRec) : seedRecords(DEMO_REPS);
      if (!rawReps) localStorage.setItem(STORAGE_REPS, JSON.stringify(DEMO_REPS));
      if (!rawRec) localStorage.setItem(STORAGE_RECORDS, JSON.stringify(loadedRec));
      setReps(loadedReps);
      setRecords(loadedRec);
    } catch {
      setReps(DEMO_REPS);
      setRecords(seedRecords(DEMO_REPS));
    }
  }, []);

  const saveReps = useCallback((r: SalesRep[]) => {
    setReps(r); localStorage.setItem(STORAGE_REPS, JSON.stringify(r));
  }, []);
  const saveRecords = useCallback((r: CommissionRecord[]) => {
    setRecords(r); localStorage.setItem(STORAGE_RECORDS, JSON.stringify(r));
  }, []);

  // Stats for selected period
  const periodRecords = useMemo(() =>
    records.filter(r => r.year === selectedYear && r.month === selectedMonth),
    [records, selectedYear, selectedMonth]);

  const repMap = useMemo(() => {
    const m: Record<string, SalesRep> = {};
    reps.forEach(r => { m[r.id] = r; });
    return m;
  }, [reps]);

  const periodStats = useMemo(() => {
    const activeReps = reps.filter(r => r.active).length;
    const totalSales = periodRecords.reduce((s, r) => s + r.actualSales, 0);
    const totalCommission = periodRecords.reduce((s, r) => s + r.commissionEarned + r.bonusAmount, 0);
    const totalPending = periodRecords.filter(r => r.payoutStatus === "beklemede").reduce((s, r) => s + r.commissionEarned + r.bonusAmount, 0);
    const targetHitCount = periodRecords.filter(r => {
      const rep = repMap[r.repId];
      return rep && r.actualSales >= rep.monthlyTarget;
    }).length;
    return { activeReps, totalSales, totalCommission, totalPending, targetHitCount };
  }, [periodRecords, reps, repMap]);

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    return MONTHS_SHORT.slice(0, 6).map((label, idx) => {
      const m = idx + 1;
      const mRec = records.filter(r => r.year === selectedYear && r.month === m);
      return {
        name: label,
        "Toplam Satış": mRec.reduce((s, r) => s + r.actualSales, 0),
        "Komisyon": mRec.reduce((s, r) => s + r.commissionEarned + r.bonusAmount, 0),
      };
    });
  }, [records, selectedYear]);

  // Leaderboard — year-to-date
  const leaderboard = useMemo(() => {
    return reps.filter(r => r.active).map(rep => {
      const repRecs = records.filter(r => r.repId === rep.id && r.year === selectedYear);
      const totalSales = repRecs.reduce((s, r) => s + r.actualSales, 0);
      const totalComm = repRecs.reduce((s, r) => s + r.commissionEarned + r.bonusAmount, 0);
      const monthsHit = repRecs.filter(r => r.actualSales >= rep.monthlyTarget).length;
      const avgAchievement = repRecs.length > 0
        ? Math.round(repRecs.reduce((s, r) => s + (r.actualSales / rep.monthlyTarget) * 100, 0) / repRecs.length)
        : 0;
      return { rep, totalSales, totalComm, monthsHit, avgAchievement };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [reps, records, selectedYear]);

  function openNewRep() {
    setEditRepId(null);
    setRepForm({ name: "", role: "Satış Temsilcisi", region: "İstanbul", monthlyTarget: "300000", tierRates: "0:2,300000:3,500000:4" });
    setShowRepModal(true);
  }

  function openEditRep(rep: SalesRep) {
    setEditRepId(rep.id);
    setRepForm({
      name: rep.name, role: rep.role, region: rep.region,
      monthlyTarget: String(rep.monthlyTarget),
      tierRates: rep.tiers.map(t => `${t.minSales}:${t.rate}`).join(","),
    });
    setShowRepModal(true);
  }

  function handleSaveRep() {
    if (!repForm.name.trim()) { toast.error("Ad gerekli"); return; }
    const target = parseFloat(repForm.monthlyTarget) || 0;
    const tiers: CommissionTier[] = repForm.tierRates.split(",").map(s => {
      const [min, rate] = s.split(":").map(Number);
      return { minSales: min || 0, rate: rate || 0 };
    }).filter(t => t.rate > 0);

    if (editRepId) {
      saveReps(reps.map(r => r.id === editRepId
        ? { ...r, name: repForm.name, role: repForm.role, region: repForm.region, monthlyTarget: target, tiers }
        : r));
      toast.success("Temsilci güncellendi");
    } else {
      const newRep: SalesRep = { id: uid(), name: repForm.name, role: repForm.role, region: repForm.region, monthlyTarget: target, tiers, active: true };
      saveReps([...reps, newRep]);
      toast.success("Temsilci eklendi");
    }
    setShowRepModal(false);
  }

  function togglePayoutStatus(record: CommissionRecord) {
    const next: PayoutStatus = record.payoutStatus === "beklemede" ? "onaylandi" : record.payoutStatus === "onaylandi" ? "odendi" : "beklemede";
    saveRecords(records.map(r => r.id === record.id ? { ...r, payoutStatus: next, paidAt: next === "odendi" ? new Date().toISOString().slice(0, 10) : null } : r));
    toast.success(`Durum: ${PAYOUT_STATUS_LABELS[next]}`);
  }

  function exportCSV() {
    const header = "Temsilci,Ay,Yıl,Satış,Komisyon,Bonus,Toplam,Durum";
    const rows = records
      .filter(r => r.year === selectedYear)
      .map(r => [
        repMap[r.repId]?.name ?? r.repId,
        MONTHS_FULL[r.month - 1], r.year,
        r.actualSales, r.commissionEarned, r.bonusAmount,
        r.commissionEarned + r.bonusAmount,
        PAYOUT_STATUS_LABELS[r.payoutStatus]
      ].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `prim-${selectedYear}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  const RANK_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];
  const RANK_ICONS = [Trophy, Medal, Award];

  const filteredPeriodRecords = useMemo(() =>
    periodRecords.filter(r => selectedRepId === "all" || r.repId === selectedRepId),
    [periodRecords, selectedRepId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Prim & Komisyon</h1>
          <p className="text-slate-400 text-sm mt-1">Satış temsilcisi performans takibi ve komisyon hesaplama</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl border border-border/50 px-1">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:text-primary transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold px-2">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:text-primary transition-colors">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
            {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={openNewRep}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Temsilci Ekle
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam Satış</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{fmtShort(periodStats.totalSales)}</p>
          <p className="text-xs text-slate-500 mt-1">{MONTHS_FULL[selectedMonth - 1]} {selectedYear}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Komisyon Toplam</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{fmtShort(periodStats.totalCommission)}</p>
          <p className="text-xs text-slate-500 mt-1">Kazanılan prim</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bekleyen Ödeme</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{fmtShort(periodStats.totalPending)}</p>
          <p className="text-xs text-slate-500 mt-1">Onay bekliyor</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Hedef İsabeti</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-400">
            {periodStats.activeReps > 0 ? Math.round((periodStats.targetHitCount / periodRecords.length) * 100) : 0}%
          </p>
          <p className="text-xs text-slate-500 mt-1">{periodStats.targetHitCount}/{periodRecords.length} temsilci</p>
        </div>
      </div>

      {/* Chart */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-bold mb-4">Aylık Satış & Komisyon ({selectedYear})</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtShort(Number(v))} />
            <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="Toplam Satış" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Komisyon" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border/60 overflow-hidden w-fit">
        {(["overview", "records", "leaderboard"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold transition-colors ${tab === t ? "bg-primary text-white" : "text-slate-400 hover:text-foreground"}`}>
            {t === "overview" ? "Temsilciler" : t === "records" ? "Komisyon Kayıtları" : "Liderlik Tablosu"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Temsilci</th>
                  <th className="text-left px-4 py-3 font-semibold">Bölge</th>
                  <th className="text-right px-4 py-3 font-semibold">Aylık Hedef</th>
                  <th className="text-right px-4 py-3 font-semibold">Komisyon Kademeleri</th>
                  <th className="text-right px-4 py-3 font-semibold">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {reps.map(rep => (
                  <tr key={rep.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {rep.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{rep.name}</p>
                          <p className="text-xs text-slate-400">{rep.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{rep.region}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{fmt(rep.monthlyTarget)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {rep.tiers.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                            {t.minSales > 0 ? `${fmtShort(t.minSales)}+` : "Baz"}: %{t.rate}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${rep.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {rep.active ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {rep.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditRep(rep)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { saveReps(reps.filter(r => r.id !== rep.id)); toast.success("Silindi"); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Records Tab */}
      {tab === "records" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={selectedRepId} onChange={e => setSelectedRepId(e.target.value)}
              className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
              <option value="all">Tüm Temsilciler</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-semibold">Temsilci</th>
                    <th className="text-right px-4 py-3 font-semibold">Satış</th>
                    <th className="text-right px-4 py-3 font-semibold">Hedef</th>
                    <th className="text-right px-4 py-3 font-semibold">Başarım</th>
                    <th className="text-right px-4 py-3 font-semibold">Komisyon</th>
                    <th className="text-right px-4 py-3 font-semibold">Bonus</th>
                    <th className="text-right px-4 py-3 font-semibold">Toplam</th>
                    <th className="text-right px-4 py-3 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredPeriodRecords.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-500">Bu dönem için kayıt bulunamadı</td></tr>
                  ) : filteredPeriodRecords.map(rec => {
                    const rep = repMap[rec.repId];
                    if (!rep) return null;
                    const achievement = Math.round((rec.actualSales / rep.monthlyTarget) * 100);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {rep.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="font-medium">{rep.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(rec.actualSales)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">{fmt(rep.monthlyTarget)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${achievement >= 100 ? "text-emerald-400" : achievement >= 80 ? "text-amber-400" : "text-red-400"}`}>
                            %{achievement}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-blue-400">{fmt(rec.commissionEarned)}</td>
                        <td className="px-4 py-3 text-right font-mono text-purple-400">
                          {rec.bonusAmount > 0 ? fmt(rec.bonusAmount) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{fmt(rec.commissionEarned + rec.bonusAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => togglePayoutStatus(rec)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${PAYOUT_STATUS_COLORS[rec.payoutStatus]}`}>
                            {PAYOUT_STATUS_LABELS[rec.payoutStatus]}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {tab === "leaderboard" && (
        <div className="space-y-3">
          {leaderboard.map((entry, idx) => {
            const RankIcon = RANK_ICONS[idx] ?? Star;
            const rankColor = RANK_COLORS[idx] ?? "text-slate-400";
            return (
              <div key={entry.rep.id} className="premium-card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center ${rankColor}`}>
                  <RankIcon className="w-6 h-6" />
                </div>
                <div className="w-8 text-center">
                  <span className={`text-lg font-black ${rankColor}`}>#{idx + 1}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {entry.rep.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{entry.rep.name}</p>
                  <p className="text-xs text-slate-400">{entry.rep.role} · {entry.rep.region}</p>
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Toplam Satış</p>
                    <p className="font-bold text-emerald-400">{fmtShort(entry.totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Komisyon</p>
                    <p className="font-bold text-blue-400">{fmtShort(entry.totalComm)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ort. Başarım</p>
                    <p className={`font-bold ${entry.avgAchievement >= 100 ? "text-emerald-400" : entry.avgAchievement >= 80 ? "text-amber-400" : "text-red-400"}`}>
                      %{entry.avgAchievement}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-center">
                  <p className="text-slate-500">Hedef İsabeti</p>
                  <p className="font-bold text-purple-400">{entry.monthsHit}/{records.filter(r => r.repId === entry.rep.id && r.year === selectedYear).length} ay</p>
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <div className="premium-card p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p>Henüz temsilci eklenmemiş</p>
            </div>
          )}
        </div>
      )}

      {/* Rep Modal */}
      <AnimatePresence>
        {showRepModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowRepModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold">{editRepId ? "Temsilci Düzenle" : "Yeni Temsilci"}</h2>
                <button onClick={() => setShowRepModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ad Soyad</label>
                  <input value={repForm.name} onChange={e => setRepForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ahmet Yılmaz"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Unvan</label>
                    <input value={repForm.role} onChange={e => setRepForm(f => ({ ...f, role: e.target.value }))}
                      placeholder="Satış Temsilcisi"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bölge</label>
                    <input value={repForm.region} onChange={e => setRepForm(f => ({ ...f, region: e.target.value }))}
                      placeholder="İstanbul"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Aylık Satış Hedefi (₺)</label>
                  <input type="number" value={repForm.monthlyTarget} onChange={e => setRepForm(f => ({ ...f, monthlyTarget: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Komisyon Kademeleri <span className="text-slate-500">(format: min_ciro:oran%, virgülle ayır)</span>
                  </label>
                  <input value={repForm.tierRates} onChange={e => setRepForm(f => ({ ...f, tierRates: e.target.value }))}
                    placeholder="0:2,300000:3,500000:4.5"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60 font-mono" />
                  <p className="text-xs text-slate-500 mt-1">Örn: 0:2 = baz %2, 300000:3 = ₺300K üzeri %3</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowRepModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={handleSaveRep}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" />
                  {editRepId ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
