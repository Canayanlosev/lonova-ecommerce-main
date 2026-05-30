"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  DollarSign, Plus, X, Save, Trash2, Search, Download, TrendingUp,
  TrendingDown, AlertCircle, CheckCircle, Filter, BarChart2, ArrowLeft,
  Clock, Lock, Unlock, RefreshCw, ArrowUpRight, ArrowDownLeft, Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type TxType = "tahsilat" | "ödeme" | "transfer_giris" | "transfer_cikis" | "kasa_sayim" | "acilis";
type KasaStatus = "açık" | "kapalı";

interface Transaction {
  id: string;
  kasaId: string;
  type: TxType;
  amount: number;
  description: string;
  category: string;
  reference: string;
  operator: string;
  createdAt: string;
  balance: number; // running balance at this point
}

interface Kasa {
  id: string;
  name: string;
  location: string;
  currency: "TRY" | "USD" | "EUR";
  currentBalance: number;
  openingBalance: number;
  status: KasaStatus;
  openedAt: string | null;
  closedAt: string | null;
  operator: string;
  dailyLimit: number;
  notes: string;
}

interface TxForm {
  kasaId: string;
  type: TxType;
  amount: string;
  description: string;
  category: string;
  reference: string;
  operator: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<TxType, string> = {
  tahsilat: "Tahsilat", ödeme: "Ödeme", transfer_giris: "Transfer Giriş",
  transfer_cikis: "Transfer Çıkış", kasa_sayim: "Kasa Sayım", acilis: "Açılış"
};
const TX_SIGN: Record<TxType, number> = {
  tahsilat: 1, ödeme: -1, transfer_giris: 1, transfer_cikis: -1, kasa_sayim: 0, acilis: 1
};
const TX_COLORS: Record<TxType, string> = {
  tahsilat: "text-emerald-400", ödeme: "text-red-400",
  transfer_giris: "text-blue-400", transfer_cikis: "text-amber-400",
  kasa_sayim: "text-purple-400", acilis: "text-slate-400"
};
const TX_ICONS: Record<TxType, React.ElementType> = {
  tahsilat: ArrowDownLeft, ödeme: ArrowUpRight, transfer_giris: ArrowDownLeft,
  transfer_cikis: ArrowUpRight, kasa_sayim: RefreshCw, acilis: Unlock
};

const CATEGORIES = ["Satış", "Kira", "Personel", "Yemek & İçecek", "Kırtasiye", "Ulaşım", "Fatura", "Diğer"];
const STORAGE_KEY = "kasa-yonetimi";
const STORAGE_TX = "kasa-islemler";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number, cur = "TRY") => {
  const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : "₺";
  return sym + Math.abs(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ── Demo Data ─────────────────────────────────────────────────────────────────

function seedData(): { kasalar: Kasa[]; transactions: Transaction[] } {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const kasalar: Kasa[] = [
    {
      id: "k1", name: "Ana Kasa", location: "Genel Müdürlük — Kat 2",
      currency: "TRY", currentBalance: 8450, openingBalance: 5000,
      status: "açık", openedAt: `${today}T08:00:00.000Z`, closedAt: null,
      operator: "Zeynep K.", dailyLimit: 20000, notes: "",
    },
    {
      id: "k2", name: "Mağaza Kasası", location: "İstanbul Mağaza",
      currency: "TRY", currentBalance: 3200, openingBalance: 2000,
      status: "açık", openedAt: `${today}T09:00:00.000Z`, closedAt: null,
      operator: "Murat D.", dailyLimit: 10000, notes: "",
    },
    {
      id: "k3", name: "USD Kasa", location: "İhracat Departmanı",
      currency: "USD", currentBalance: 1250, openingBalance: 1000,
      status: "kapalı", openedAt: `${today}T08:30:00.000Z`, closedAt: `${today}T17:30:00.000Z`,
      operator: "Ahmet Y.", dailyLimit: 5000, notes: "İhracat ödemeleri için",
    },
  ];

  const txs: Transaction[] = [
    // Ana Kasa transactions
    { id: uid(), kasaId: "k1", type: "acilis", amount: 5000, description: "Günlük açılış bakiyesi", category: "Diğer", reference: "ACS-001", operator: "Zeynep K.", createdAt: `${today}T08:00:00.000Z`, balance: 5000 },
    { id: uid(), kasaId: "k1", type: "tahsilat", amount: 1200, description: "Yerel satış — Nakit", category: "Satış", reference: "SAT-1042", operator: "Zeynep K.", createdAt: `${today}T09:15:00.000Z`, balance: 6200 },
    { id: uid(), kasaId: "k1", type: "ödeme", amount: 350, description: "Kırtasiye alımı", category: "Kırtasiye", reference: "GDR-0081", operator: "Zeynep K.", createdAt: `${today}T10:30:00.000Z`, balance: 5850 },
    { id: uid(), kasaId: "k1", type: "tahsilat", amount: 2800, description: "Müşteri tahsilatı — Yıldız Tekstil", category: "Satış", reference: "TAH-0234", operator: "Zeynep K.", createdAt: `${today}T11:45:00.000Z`, balance: 8650 },
    { id: uid(), kasaId: "k1", type: "ödeme", amount: 200, description: "Kurye giderleri", category: "Ulaşım", reference: "GDR-0082", operator: "Zeynep K.", createdAt: `${today}T13:00:00.000Z`, balance: 8450 },
    // Mağaza Kasası
    { id: uid(), kasaId: "k2", type: "acilis", amount: 2000, description: "Günlük açılış", category: "Diğer", reference: "ACS-002", operator: "Murat D.", createdAt: `${today}T09:00:00.000Z`, balance: 2000 },
    { id: uid(), kasaId: "k2", type: "tahsilat", amount: 850, description: "Perakende satış", category: "Satış", reference: "SAT-0891", operator: "Murat D.", createdAt: `${today}T10:00:00.000Z`, balance: 2850 },
    { id: uid(), kasaId: "k2", type: "tahsilat", amount: 450, description: "Perakende satış", category: "Satış", reference: "SAT-0892", operator: "Murat D.", createdAt: `${today}T11:30:00.000Z`, balance: 3300 },
    { id: uid(), kasaId: "k2", type: "ödeme", amount: 100, description: "Çay & kahve masrafı", category: "Yemek & İçecek", reference: "GDR-0041", operator: "Murat D.", createdAt: `${today}T12:00:00.000Z`, balance: 3200 },
    // USD Kasa
    { id: uid(), kasaId: "k3", type: "acilis", amount: 1000, description: "USD kasa açılış", category: "Diğer", reference: "ACS-003", operator: "Ahmet Y.", createdAt: `${today}T08:30:00.000Z`, balance: 1000 },
    { id: uid(), kasaId: "k3", type: "tahsilat", amount: 500, description: "Export payment — ABC Corp", category: "Satış", reference: "EXP-0021", operator: "Ahmet Y.", createdAt: `${today}T10:00:00.000Z`, balance: 1500 },
    { id: uid(), kasaId: "k3", type: "ödeme", amount: 250, description: "Broker fee", category: "Diğer", reference: "GDR-0090", operator: "Ahmet Y.", createdAt: `${today}T14:00:00.000Z`, balance: 1250 },
  ];

  return { kasalar, transactions: txs };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function KasaPage() {
  const toast = useToast();
  const [kasalar, setKasalar] = useState<Kasa[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeKasaId, setActiveKasaId] = useState<string | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [filterType, setFilterType] = useState<TxType | "tümü">("tümü");
  const [txForm, setTxForm] = useState<TxForm>({
    kasaId: "", type: "tahsilat", amount: "", description: "", category: "Satış", reference: "", operator: "",
  });

  useEffect(() => {
    try {
      const rawK = localStorage.getItem(STORAGE_KEY);
      const rawT = localStorage.getItem(STORAGE_TX);
      if (rawK && rawT) {
        setKasalar(JSON.parse(rawK));
        setTransactions(JSON.parse(rawT));
      } else {
        const { kasalar: k, transactions: t } = seedData();
        setKasalar(k); setTransactions(t);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(k));
        localStorage.setItem(STORAGE_TX, JSON.stringify(t));
      }
    } catch {
      const { kasalar: k, transactions: t } = seedData();
      setKasalar(k); setTransactions(t);
    }
  }, []);

  const saveKasalar = useCallback((k: Kasa[]) => {
    setKasalar(k); localStorage.setItem(STORAGE_KEY, JSON.stringify(k));
  }, []);
  const saveTx = useCallback((t: Transaction[]) => {
    setTransactions(t); localStorage.setItem(STORAGE_TX, JSON.stringify(t));
  }, []);

  const activeKasa = useMemo(() => kasalar.find(k => k.id === activeKasaId), [kasalar, activeKasaId]);

  const totalStats = useMemo(() => {
    const openKasalar = kasalar.filter(k => k.status === "açık");
    const totalBalance = openKasalar.reduce((s, k) => s + k.currentBalance, 0);
    const todayTx = transactions.filter(t => t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10));
    const todayIn = todayTx.filter(t => TX_SIGN[t.type] > 0).reduce((s, t) => s + t.amount, 0);
    const todayOut = todayTx.filter(t => TX_SIGN[t.type] < 0).reduce((s, t) => s + t.amount, 0);
    return { totalBalance, openCount: openKasalar.length, todayIn, todayOut, todayTxCount: todayTx.length };
  }, [kasalar, transactions]);

  function openTxModal(kasaId: string, type: TxType = "tahsilat") {
    setTxForm({ kasaId, type, amount: "", description: "", category: "Satış", reference: "", operator: activeKasa?.operator ?? "" });
    setShowTxModal(true);
  }

  function submitTransaction() {
    const amount = parseFloat(txForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Geçerli tutar girin"); return; }
    if (!txForm.description.trim()) { toast.error("Açıklama gerekli"); return; }

    const kasa = kasalar.find(k => k.id === txForm.kasaId);
    if (!kasa) return;

    const sign = TX_SIGN[txForm.type];
    const newBalance = kasa.currentBalance + sign * amount;
    if (newBalance < 0 && sign < 0) { toast.error("Yetersiz kasa bakiyesi"); return; }

    const newTx: Transaction = {
      id: uid(), kasaId: txForm.kasaId, type: txForm.type,
      amount, description: txForm.description, category: txForm.category,
      reference: txForm.reference, operator: txForm.operator,
      createdAt: new Date().toISOString(), balance: newBalance,
    };

    saveTx([newTx, ...transactions]);
    saveKasalar(kasalar.map(k => k.id === txForm.kasaId ? { ...k, currentBalance: newBalance } : k));
    toast.success(`${TX_TYPE_LABELS[txForm.type]}: ${fmt(amount, kasa.currency)}`);
    setShowTxModal(false);
  }

  function toggleKasaStatus(id: string) {
    const kasa = kasalar.find(k => k.id === id);
    if (!kasa) return;
    const now = new Date().toISOString();
    if (kasa.status === "açık") {
      saveKasalar(kasalar.map(k => k.id === id ? { ...k, status: "kapalı" as KasaStatus, closedAt: now } : k));
      toast.success("Kasa kapatıldı");
    } else {
      saveKasalar(kasalar.map(k => k.id === id ? { ...k, status: "açık" as KasaStatus, openedAt: now, closedAt: null, openingBalance: k.currentBalance } : k));
      toast.success("Kasa açıldı");
    }
  }

  function exportCSV() {
    const header = "Kasa,Tür,Tutar,Açıklama,Kategori,Referans,Operator,Tarih,Bakiye";
    const rows = transactions.map(t => {
      const kasa = kasalar.find(k => k.id === t.kasaId);
      return [kasa?.name ?? t.kasaId, TX_TYPE_LABELS[t.type], t.amount, `"${t.description}"`, t.category, t.reference, t.operator, t.createdAt.slice(0, 16), t.balance].join(",");
    });
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "kasa-hareketleri.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  // ── Kasa Detail ────────────────────────────────────────────────────────────

  if (activeKasa) {
    const kasaTx = transactions.filter(t => t.kasaId === activeKasa.id)
      .filter(t => filterType === "tümü" || t.type === filterType)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const todayIn = kasaTx.filter(t => TX_SIGN[t.type] > 0 && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s, t) => s + t.amount, 0);
    const todayOut = kasaTx.filter(t => TX_SIGN[t.type] < 0 && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s, t) => s + t.amount, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveKasaId(null)}
            className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black">{activeKasa.name}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${activeKasa.status === "açık" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                {activeKasa.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activeKasa.location} · {activeKasa.operator} · {activeKasa.currency}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleKasaStatus(activeKasa.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeKasa.status === "açık" ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}>
              {activeKasa.status === "açık" ? <><Lock className="w-3.5 h-3.5" /> Kapat</> : <><Unlock className="w-3.5 h-3.5" /> Aç</>}
            </button>
            {activeKasa.status === "açık" && (
              <>
                <button onClick={() => openTxModal(activeKasa.id, "tahsilat")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Tahsilat
                </button>
                <button onClick={() => openTxModal(activeKasa.id, "ödeme")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-500 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Ödeme
                </button>
              </>
            )}
          </div>
        </div>

        {/* Balance strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="premium-card p-4 col-span-1">
            <p className="text-xs text-slate-400 mb-1">Mevcut Bakiye</p>
            <p className={`text-2xl font-black ${activeKasa.currentBalance > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(activeKasa.currentBalance, activeKasa.currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Açılış: {fmt(activeKasa.openingBalance, activeKasa.currency)}</p>
          </div>
          <div className="premium-card p-4">
            <p className="text-xs text-slate-400 mb-1">Bugün Giriş</p>
            <p className="text-xl font-black text-emerald-400">+{fmt(todayIn, activeKasa.currency)}</p>
          </div>
          <div className="premium-card p-4">
            <p className="text-xs text-slate-400 mb-1">Bugün Çıkış</p>
            <p className="text-xl font-black text-red-400">-{fmt(todayOut, activeKasa.currency)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
            <option value="tümü">Tüm İşlemler</option>
            {(Object.keys(TX_TYPE_LABELS) as TxType[]).map(t => (
              <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <button onClick={() => exportCSV()}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors ml-auto">
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>

        {/* Transactions */}
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Saat</th>
                  <th className="text-left px-4 py-3 font-semibold">Tür</th>
                  <th className="text-left px-4 py-3 font-semibold">Açıklama</th>
                  <th className="text-left px-4 py-3 font-semibold">Kategori</th>
                  <th className="text-right px-4 py-3 font-semibold">Tutar</th>
                  <th className="text-right px-4 py-3 font-semibold">Bakiye</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {kasaTx.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-500">İşlem bulunamadı</td></tr>
                ) : kasaTx.map(tx => {
                  const TxIcon = TX_ICONS[tx.type];
                  const isIncome = TX_SIGN[tx.type] > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(tx.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${TX_COLORS[tx.type]}`}>
                          <TxIcon className="w-3 h-3" />
                          {TX_TYPE_LABELS[tx.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{tx.description}</p>
                        {tx.reference && <p className="text-xs text-slate-500 font-mono">{tx.reference}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{tx.category}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isIncome ? "text-emerald-400" : TX_SIGN[tx.type] < 0 ? "text-red-400" : "text-slate-400"}`}>
                        {isIncome ? "+" : TX_SIGN[tx.type] < 0 ? "-" : ""}{fmt(tx.amount, activeKasa.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{fmt(tx.balance, activeKasa.currency)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => {
                          // Undo: reverse the transaction
                          saveTx(transactions.filter(t => t.id !== tx.id));
                          saveKasalar(kasalar.map(k => k.id === activeKasa.id ? { ...k, currentBalance: k.currentBalance - TX_SIGN[tx.type] * tx.amount } : k));
                          toast.success("İşlem silindi");
                        }} className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
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
    );
  }

  // ── Main View ──────────────────────────────────────────────────────────────

  // Hourly balance chart (today's last 6 hours)
  const hourlyChart = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const h = now.getHours() - 5 + i;
      const label = `${h.toString().padStart(2, "0")}:00`;
      const txInHour = transactions.filter(t => {
        const txH = new Date(t.createdAt).getHours();
        return txH === h && t.createdAt.slice(0, 10) === now.toISOString().slice(0, 10);
      });
      const inflow = txInHour.filter(t => TX_SIGN[t.type] > 0).reduce((s, t) => s + t.amount, 0);
      const outflow = txInHour.filter(t => TX_SIGN[t.type] < 0).reduce((s, t) => s + t.amount, 0);
      return { name: label, "Giriş": inflow, "Çıkış": outflow };
    });
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Kasa Yönetimi</h1>
          <p className="text-slate-400 text-sm mt-1">Çoklu kasa takibi, günlük hareket ve bakiye yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={() => openTxModal(kasalar[0]?.id ?? "", "tahsilat")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            İşlem Ekle
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam Bakiye</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary">₺{totalStats.totalBalance.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-500 mt-1">{totalStats.openCount} açık kasa</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bugün Tahsilat</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">+₺{totalStats.todayIn.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bugün Ödeme</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">-₺{totalStats.todayOut.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bugün İşlem</span>
            <BarChart2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{totalStats.todayTxCount}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-bold mb-4">Bugün Saatlik Nakit Akışı</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyChart} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₺${Number(v) >= 1000 ? (Number(v) / 1000).toFixed(0) + "K" : v}`} />
            <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="Giriş" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Çıkış" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kasalar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kasalar.map(kasa => {
          const kasaTx = transactions.filter(t => t.kasaId === kasa.id);
          const todayIn = kasaTx.filter(t => TX_SIGN[t.type] > 0 && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s, t) => s + t.amount, 0);
          const todayOut = kasaTx.filter(t => TX_SIGN[t.type] < 0 && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s, t) => s + t.amount, 0);
          const limitWarning = kasa.dailyLimit > 0 && kasa.currentBalance > kasa.dailyLimit * 0.9;

          return (
            <div key={kasa.id} className="premium-card p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{kasa.name}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${kasa.status === "açık" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {kasa.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{kasa.location}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleKasaStatus(kasa.id)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${kasa.status === "açık" ? "hover:bg-red-500/10 text-slate-400 hover:text-red-400" : "hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400"}`}>
                    {kasa.status === "açık" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setActiveKasaId(kasa.id)}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors">
                    <BarChart2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-0.5">Mevcut Bakiye ({kasa.currency})</p>
                <p className={`text-2xl font-black ${kasa.currentBalance > 0 ? "text-foreground" : "text-red-400"}`}>
                  {fmt(kasa.currentBalance, kasa.currency)}
                </p>
                {limitWarning && (
                  <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Günlük limite yaklaşıyor
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-500/5 rounded-xl p-2 text-center">
                  <p className="text-slate-500">Bugün Giriş</p>
                  <p className="font-bold text-emerald-400">+{fmt(todayIn, kasa.currency)}</p>
                </div>
                <div className="bg-red-500/5 rounded-xl p-2 text-center">
                  <p className="text-slate-500">Bugün Çıkış</p>
                  <p className="font-bold text-red-400">-{fmt(todayOut, kasa.currency)}</p>
                </div>
              </div>

              {kasa.status === "açık" && (
                <div className="flex gap-2">
                  <button onClick={() => openTxModal(kasa.id, "tahsilat")}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600/15 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-600/25 transition-colors">
                    <ArrowDownLeft className="w-3 h-3" /> Tahsilat
                  </button>
                  <button onClick={() => openTxModal(kasa.id, "ödeme")}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-600/15 text-red-400 rounded-xl text-xs font-bold hover:bg-red-600/25 transition-colors">
                    <ArrowUpRight className="w-3 h-3" /> Ödeme
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-500">Sorumlu: {kasa.operator}</p>
            </div>
          );
        })}
      </div>

      {/* Tx Modal */}
      <AnimatePresence>
        {showTxModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowTxModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold">Kasa İşlemi</h2>
                <button onClick={() => setShowTxModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kasa</label>
                    <select value={txForm.kasaId} onChange={e => setTxForm(f => ({ ...f, kasaId: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {kasalar.filter(k => k.status === "açık").map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">İşlem Türü</label>
                    <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value as TxType }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {(["tahsilat", "ödeme", "transfer_giris", "transfer_cikis"] as TxType[]).map(t => (
                        <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tutar</label>
                  <input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
                  <input value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="İşlem açıklaması"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kategori</label>
                    <select value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Referans No</label>
                    <input value={txForm.reference} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value }))}
                      placeholder="ör. SAT-0001"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={submitTransaction}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-bold transition-colors ${txForm.type === "tahsilat" || txForm.type === "transfer_giris" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
                  <Save className="w-4 h-4" />
                  Kaydet
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
