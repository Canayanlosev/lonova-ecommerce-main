"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Plus, Edit2, Trash2, X, Save,
  BarChart2, ChevronDown, ChevronUp, AlertCircle, CheckCircle,
  DollarSign, Target, PieChart, Download, RefreshCw, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type BudgetCategory = "gelir" | "cogs" | "personel" | "pazarlama" | "operasyon" | "kira" | "teknik" | "diger";
type BudgetType = "gelir" | "gider";

interface BudgetLine {
  id: string;
  year: number;
  month: number; // 1-12
  category: BudgetCategory;
  type: BudgetType;
  label: string;
  planned: number;
  actual: number;
  notes: string;
}

interface BudgetForm {
  category: BudgetCategory;
  type: BudgetType;
  label: string;
  planned: string;
  actual: string;
  notes: string;
  month: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_FULL = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const CATEGORIES: { value: BudgetCategory; label: string; type: BudgetType; color: string }[] = [
  { value: "gelir", label: "Satış Geliri", type: "gelir", color: "text-emerald-400" },
  { value: "cogs", label: "Satılan Mal Maliyeti", type: "gider", color: "text-red-400" },
  { value: "personel", label: "Personel Giderleri", type: "gider", color: "text-orange-400" },
  { value: "pazarlama", label: "Pazarlama & Reklam", type: "gider", color: "text-purple-400" },
  { value: "operasyon", label: "Operasyonel Giderler", type: "gider", color: "text-blue-400" },
  { value: "kira", label: "Kira & Faturalar", type: "gider", color: "text-cyan-400" },
  { value: "teknik", label: "Teknik & Yazılım", type: "gider", color: "text-indigo-400" },
  { value: "diger", label: "Diğer Giderler", type: "gider", color: "text-slate-400" },
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function fmt(n: number) {
  return "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return "₺" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "₺" + (n / 1_000).toFixed(0) + "K";
  return fmt(n);
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

function seedData(year: number): BudgetLine[] {
  const lines: BudgetLine[] = [];
  const monthlyRevenue = [85000, 92000, 110000, 125000, 130000, 118000, 95000, 102000, 128000, 142000, 160000, 185000];
  const actualRevMultiplier = [0.92, 1.05, 0.98, 1.12, 1.08, 0.95, 0.88, 1.02, 1.15, 1.10, 0.97, 1.20];

  for (let m = 1; m <= 12; m++) {
    const planned = monthlyRevenue[m - 1];
    const actual = m <= 5 ? Math.round(planned * actualRevMultiplier[m - 1]) : 0;
    lines.push({
      id: uid(), year, month: m, category: "gelir", type: "gelir",
      label: "Satış Geliri", planned, actual, notes: "",
    });
    // COGS ~35% of revenue
    lines.push({
      id: uid(), year, month: m, category: "cogs", type: "gider",
      label: "Satılan Mal Maliyeti",
      planned: Math.round(planned * 0.35),
      actual: actual > 0 ? Math.round(actual * 0.33) : 0,
      notes: "",
    });
    // Personel fixed ~25K
    lines.push({
      id: uid(), year, month: m, category: "personel", type: "gider",
      label: "Personel Maaşları",
      planned: 25000,
      actual: m <= 5 ? 25000 + (m % 2 === 0 ? 500 : 0) : 0,
      notes: "",
    });
    // Pazarlama ~8% revenue
    lines.push({
      id: uid(), year, month: m, category: "pazarlama", type: "gider",
      label: "Dijital Reklam",
      planned: Math.round(planned * 0.08),
      actual: actual > 0 ? Math.round(actual * 0.07) : 0,
      notes: "",
    });
    // Kira fixed
    lines.push({
      id: uid(), year, month: m, category: "kira", type: "gider",
      label: "Ofis & Depo Kirası",
      planned: 8500,
      actual: m <= 5 ? 8500 : 0,
      notes: "",
    });
    // Operasyon
    lines.push({
      id: uid(), year, month: m, category: "operasyon", type: "gider",
      label: "Kargo & Lojistik",
      planned: Math.round(planned * 0.04),
      actual: actual > 0 ? Math.round(actual * 0.045) : 0,
      notes: "",
    });
  }
  return lines;
}

const STORAGE_KEY = "butce-planlama";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BudgePage() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [viewMode, setViewMode] = useState<"monthly" | "category">("monthly");
  const [filterType, setFilterType] = useState<"tümü" | "gelir" | "gider">("tümü");
  const [filterMonth, setFilterMonth] = useState<number>(0); // 0 = all
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [form, setForm] = useState<BudgetForm>({
    category: "gelir", type: "gelir", label: "", planned: "", actual: "", notes: "", month: new Date().getMonth() + 1
  });

  // Load / seed
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all: BudgetLine[] = JSON.parse(raw);
        setLines(all);
      } else {
        const demo = seedData(currentYear);
        setLines(demo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      }
    } catch {
      const demo = seedData(currentYear);
      setLines(demo);
    }
  }, [currentYear]);

  const save = useCallback((updated: BudgetLine[]) => {
    setLines(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // Year lines
  const yearLines = useMemo(() => lines.filter(l => l.year === year), [lines, year]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    return MONTHS.map((label, idx) => {
      const m = idx + 1;
      const mLines = yearLines.filter(l => l.month === m);
      const plannedRevenue = mLines.filter(l => l.type === "gelir").reduce((s, l) => s + l.planned, 0);
      const actualRevenue = mLines.filter(l => l.type === "gelir").reduce((s, l) => s + l.actual, 0);
      const plannedExpense = mLines.filter(l => l.type === "gider").reduce((s, l) => s + l.planned, 0);
      const actualExpense = mLines.filter(l => l.type === "gider").reduce((s, l) => s + l.actual, 0);
      const plannedProfit = plannedRevenue - plannedExpense;
      const actualProfit = actualRevenue - actualExpense;
      return { month: m, label, plannedRevenue, actualRevenue, plannedExpense, actualExpense, plannedProfit, actualProfit };
    });
  }, [yearLines]);

  // Category summary
  const categorySummary = useMemo(() => {
    return CATEGORIES.map(cat => {
      const catLines = yearLines.filter(l => l.category === cat.value);
      const planned = catLines.reduce((s, l) => s + l.planned, 0);
      const actual = catLines.reduce((s, l) => s + l.actual, 0);
      const variance = actual - planned;
      const pct = planned > 0 ? ((variance / planned) * 100) : 0;
      return { ...cat, planned, actual, variance, pct };
    });
  }, [yearLines]);

  // Year totals
  const yearTotals = useMemo(() => {
    const plannedRevenue = yearLines.filter(l => l.type === "gelir").reduce((s, l) => s + l.planned, 0);
    const actualRevenue = yearLines.filter(l => l.type === "gelir").reduce((s, l) => s + l.actual, 0);
    const plannedExpense = yearLines.filter(l => l.type === "gider").reduce((s, l) => s + l.planned, 0);
    const actualExpense = yearLines.filter(l => l.type === "gider").reduce((s, l) => s + l.actual, 0);
    const plannedProfit = plannedRevenue - plannedExpense;
    const actualProfit = actualRevenue - actualExpense;
    const linesWithActual = yearLines.filter(l => l.actual > 0).length;
    const totalLines = yearLines.length;
    return { plannedRevenue, actualRevenue, plannedExpense, actualExpense, plannedProfit, actualProfit, linesWithActual, totalLines };
  }, [yearLines]);

  // Chart data
  const chartData = useMemo(() => monthlySummary.map(m => ({
    name: m.label,
    "Plan Gelir": m.plannedRevenue,
    "Gerçek Gelir": m.actualRevenue,
    "Plan Gider": m.plannedExpense,
    "Gerçek Gider": m.actualExpense,
  })), [monthlySummary]);

  const profitChartData = useMemo(() => monthlySummary.map(m => ({
    name: m.label,
    "Plan Kâr": m.plannedProfit,
    "Gerçek Kâr": m.actualProfit,
  })), [monthlySummary]);

  // Filtered lines for table
  const filteredLines = useMemo(() => {
    return yearLines.filter(l => {
      if (filterType !== "tümü" && l.type !== filterType) return false;
      if (filterMonth > 0 && l.month !== filterMonth) return false;
      return true;
    });
  }, [yearLines, filterType, filterMonth]);

  function openNew() {
    setEditId(null);
    setForm({ category: "gelir", type: "gelir", label: "", planned: "", actual: "", notes: "", month: new Date().getMonth() + 1 });
    setShowModal(true);
  }

  function openEdit(line: BudgetLine) {
    setEditId(line.id);
    setForm({
      category: line.category,
      type: line.type,
      label: line.label,
      planned: String(line.planned),
      actual: String(line.actual),
      notes: line.notes,
      month: line.month,
    });
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.label.trim()) { toast.error("Açıklama gerekli"); return; }
    const planned = parseFloat(form.planned) || 0;
    const actual = parseFloat(form.actual) || 0;

    if (editId) {
      const updated = lines.map(l => l.id === editId
        ? { ...l, category: form.category, type: form.type, label: form.label, planned, actual, notes: form.notes, month: form.month }
        : l
      );
      save(updated);
      toast.success("Bütçe kalemi güncellendi");
    } else {
      const newLine: BudgetLine = {
        id: uid(), year, month: form.month, category: form.category, type: form.type,
        label: form.label, planned, actual, notes: form.notes,
      };
      save([...lines, newLine]);
      toast.success("Bütçe kalemi eklendi");
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    save(lines.filter(l => l.id !== id));
    toast.success("Silindi");
  }

  function exportCSV() {
    const header = "Yıl,Ay,Kategori,Tür,Açıklama,Planlanan,Gerçekleşen,Varyans,Notlar";
    const rows = yearLines.map(l => {
      const variance = l.actual - l.planned;
      return [l.year, MONTHS_FULL[l.month - 1], CATEGORIES.find(c => c.value === l.category)?.label, l.type,
        l.label, l.planned, l.actual, variance, l.notes].join(",");
    });
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `butce-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  function addYearData() {
    const existing = lines.filter(l => l.year === year + 1);
    if (existing.length > 0) { toast.error(`${year + 1} bütçesi zaten var`); return; }
    const demo = seedData(year + 1);
    save([...lines, ...demo]);
    setYear(year + 1);
    toast.success(`${year + 1} bütçesi oluşturuldu`);
  }

  const catInfo = (category: BudgetCategory) => CATEGORIES.find(c => c.value === category)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Bütçe Takibi</h1>
          <p className="text-slate-400 text-sm mt-1">Yıllık gelir-gider planlaması, gerçekleşen vs hedef analizi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl border border-border/50 px-1">
            <button onClick={() => setYear(y => y - 1)} className="p-2 hover:text-primary transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold px-2">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-2 hover:text-primary transition-colors">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
            <Download className="w-4 h-4" />
            CSV
          </button>
          {yearLines.length === 0 && (
            <button onClick={() => { save([...lines, ...seedData(year)]); toast.success(`${year} bütçesi oluşturuldu`); }}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Demo Oluştur
            </button>
          )}
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Kalem Ekle
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Plan Gelir</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{fmtShort(yearTotals.plannedRevenue)}</p>
          {yearTotals.actualRevenue > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Gerçek: <span className={yearTotals.actualRevenue >= yearTotals.plannedRevenue ? "text-emerald-400" : "text-red-400"}>
                {fmtShort(yearTotals.actualRevenue)}
              </span>
            </p>
          )}
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Plan Gider</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">{fmtShort(yearTotals.plannedExpense)}</p>
          {yearTotals.actualExpense > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Gerçek: <span className={yearTotals.actualExpense <= yearTotals.plannedExpense ? "text-emerald-400" : "text-red-400"}>
                {fmtShort(yearTotals.actualExpense)}
              </span>
            </p>
          )}
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Plan Net Kâr</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <p className={`text-xl font-black ${yearTotals.plannedProfit >= 0 ? "text-blue-400" : "text-red-400"}`}>
            {fmtShort(Math.abs(yearTotals.plannedProfit))}
          </p>
          {yearTotals.actualProfit !== 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Gerçek: <span className={yearTotals.actualProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                {fmtShort(yearTotals.actualProfit)}
              </span>
            </p>
          )}
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Doluluk Oranı</span>
            <BarChart2 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-400">
            {yearTotals.totalLines > 0 ? Math.round((yearTotals.linesWithActual / yearTotals.totalLines) * 100) : 0}%
          </p>
          <p className="text-xs text-slate-400 mt-1">{yearTotals.linesWithActual}/{yearTotals.totalLines} kalem</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="premium-card p-5">
          <h3 className="text-sm font-bold mb-4">Aylık Gelir vs Gider</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtShort(Number(v))} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Plan Gelir" fill="#10b981" opacity={0.5} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gerçek Gelir" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Plan Gider" fill="#ef4444" opacity={0.5} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gerçek Gider" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="premium-card p-5">
          <h3 className="text-sm font-bold mb-4">Aylık Net Kâr Trendi</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={profitChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtShort(Number(v))} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="Plan Kâr" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line dataKey="Gerçek Kâr" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* View Mode Toggle + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-border/60 overflow-hidden">
          {(["monthly", "category"] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-4 py-2 text-xs font-bold transition-colors ${viewMode === v ? "bg-primary text-white" : "text-slate-400 hover:text-foreground"}`}>
              {v === "monthly" ? "Aylık Görünüm" : "Kategori Görünüm"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
            <option value="tümü">Tümü</option>
            <option value="gelir">Gelir</option>
            <option value="gider">Gider</option>
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
            className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
            <option value={0}>Tüm Aylar</option>
            {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Monthly View */}
      {viewMode === "monthly" && (
        <div className="space-y-3">
          {monthlySummary.map(m => {
            const mLines = filteredLines.filter(l => l.month === m.month);
            if (filterMonth > 0 && m.month !== filterMonth) return null;
            const isExpanded = expandedMonth === m.month;
            const revenueVariance = m.actualRevenue - m.plannedRevenue;
            const expenseVariance = m.actualExpense - m.plannedExpense;
            const hasData = m.plannedRevenue > 0 || m.plannedExpense > 0;
            if (!hasData) return null;

            return (
              <div key={m.month} className="premium-card overflow-hidden">
                <button
                  onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/20 transition-colors text-left"
                >
                  <div className="w-16 text-center">
                    <span className="text-sm font-black">{m.label}</span>
                  </div>
                  {/* Revenue */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Plan Gelir</span>
                      <p className="font-bold text-emerald-400">{fmtShort(m.plannedRevenue)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Gerçek Gelir</span>
                      <p className={`font-bold ${m.actualRevenue > 0 ? (revenueVariance >= 0 ? "text-emerald-400" : "text-red-400") : "text-slate-600"}`}>
                        {m.actualRevenue > 0 ? fmtShort(m.actualRevenue) : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Plan Gider</span>
                      <p className="font-bold text-red-400">{fmtShort(m.plannedExpense)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Net Kâr</span>
                      <p className={`font-bold ${m.plannedProfit >= 0 ? "text-blue-400" : "text-red-400"}`}>
                        {fmtShort(m.plannedProfit)}
                      </p>
                    </div>
                  </div>
                  {/* Variance badge */}
                  {m.actualRevenue > 0 && (
                    <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${revenueVariance >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {revenueVariance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {revenueVariance >= 0 ? "+" : ""}{fmtShort(revenueVariance)}
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/50 px-4 pb-4">
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500 text-left">
                                <th className="pb-2 font-semibold">Kategori</th>
                                <th className="pb-2 font-semibold text-right">Planlanan</th>
                                <th className="pb-2 font-semibold text-right">Gerçekleşen</th>
                                <th className="pb-2 font-semibold text-right">Varyans</th>
                                <th className="pb-2 font-semibold text-right">%</th>
                                <th className="pb-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {mLines.map(line => {
                                const variance = line.actual - line.planned;
                                const pct = line.planned > 0 ? ((variance / line.planned) * 100) : 0;
                                const isOverBudget = line.type === "gider" ? variance > 0 : variance < 0;
                                return (
                                  <tr key={line.id} className="hover:bg-slate-800/20">
                                    <td className="py-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${line.type === "gelir" ? "bg-emerald-400" : "bg-red-400"}`} />
                                        <span className="font-medium">{line.label}</span>
                                        <span className="text-slate-500">{catInfo(line.category).label}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 text-right font-mono">{fmt(line.planned)}</td>
                                    <td className="py-2 text-right font-mono">
                                      {line.actual > 0 ? fmt(line.actual) : <span className="text-slate-600">—</span>}
                                    </td>
                                    <td className={`py-2 text-right font-mono font-bold ${line.actual === 0 ? "text-slate-600" : isOverBudget ? "text-red-400" : "text-emerald-400"}`}>
                                      {line.actual === 0 ? "—" : (variance >= 0 ? "+" : "") + fmt(variance)}
                                    </td>
                                    <td className={`py-2 text-right ${line.actual === 0 ? "text-slate-600" : isOverBudget ? "text-red-400" : "text-emerald-400"}`}>
                                      {line.actual === 0 ? "—" : (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"}
                                    </td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openEdit(line); }}
                                          className="p-1 rounded hover:bg-blue-500/10 text-blue-400 transition-colors">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(line.id); }}
                                          className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors">
                                          <Trash2 className="w-3 h-3" />
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Category View */}
      {viewMode === "category" && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Kategori</th>
                  <th className="text-right px-4 py-3 font-semibold">Yıllık Plan</th>
                  <th className="text-right px-4 py-3 font-semibold">Gerçekleşen</th>
                  <th className="text-right px-4 py-3 font-semibold">Varyans</th>
                  <th className="text-right px-4 py-3 font-semibold">% Sapma</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {categorySummary
                  .filter(c => filterType === "tümü" || c.type === filterType)
                  .map(cat => {
                    const isOverBudget = cat.type === "gider" ? cat.variance > 0 : cat.variance < 0;
                    return (
                      <tr key={cat.value} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${cat.type === "gelir" ? "bg-emerald-400" : "bg-red-400"}`} />
                            <div>
                              <p className="font-semibold">{cat.label}</p>
                              <p className={`text-xs ${cat.color}`}>{cat.type === "gelir" ? "Gelir" : "Gider"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(cat.planned)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {cat.actual > 0 ? fmt(cat.actual) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${cat.actual === 0 ? "text-slate-600" : isOverBudget ? "text-red-400" : "text-emerald-400"}`}>
                          {cat.actual === 0 ? "—" : (cat.variance >= 0 ? "+" : "") + fmt(cat.variance)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {cat.actual > 0 ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${isOverBudget ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                              {isOverBudget ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              {cat.pct >= 0 ? "+" : ""}{cat.pct.toFixed(1)}%
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {/* Progress bar */}
                          {cat.planned > 0 && (
                            <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-400" : "bg-emerald-400"}`}
                                style={{ width: `${Math.min(100, cat.actual > 0 ? (cat.actual / cat.planned) * 100 : 0)}%` }}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold">{editId ? "Kalemi Düzenle" : "Bütçe Kalemi Ekle"}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ay</label>
                    <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tür</label>
                    <select value={form.type} onChange={e => {
                      const type = e.target.value as BudgetType;
                      setForm(f => ({ ...f, type, category: type === "gelir" ? "gelir" : "cogs" }));
                    }}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      <option value="gelir">Gelir</option>
                      <option value="gider">Gider</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as BudgetCategory }))}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                    {CATEGORIES.filter(c => c.type === form.type).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="ör. Dijital Reklam, Depo Kirası..."
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Planlanan (₺)</label>
                    <input type="number" value={form.planned} onChange={e => setForm(f => ({ ...f, planned: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gerçekleşen (₺)</label>
                    <input type="number" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notlar</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="İsteğe bağlı"
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
