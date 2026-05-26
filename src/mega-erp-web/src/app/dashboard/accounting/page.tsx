"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";

import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard, BookOpen, RefreshCw, CheckCircle2, AlertTriangle, TrendingUp, Plus, X, Check, Target, Edit3 } from "lucide-react";
import api from "@/lib/api";
import { ordersService } from "@/lib/services/orders.service";
import { useToast } from "@/store/ui.store";
import type { AccountingAccount, JournalEntry } from "@/types/api.types";

type Tab = "accounts" | "journal" | "rapor" | "bütçe";

const BOOKED_STATUSES = ['Paid', 'Shipped', 'Delivered'];

export default function AccountingPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [unbookedCount, setUnbookedCount] = useState(0);

  // Expense entry modal
  const [expenseModal, setExpenseModal] = useState(false)
  const [expForm, setExpForm] = useState({ date: '', description: '', amount: '', accountId: '' })
  const [expSaving, setExpSaving] = useState(false)
  const [expError, setExpError] = useState('')

  // Budget tracking
  const BUDGET_KEY = 'accounting-budgets'
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) ?? '{}')
      setBudgets(saved)
    } catch { /* */ }
  }, [])

  const saveBudget = (category: string, value: number) => {
    const next = { ...budgets, [category]: value }
    setBudgets(next)
    try { localStorage.setItem(BUDGET_KEY, JSON.stringify(next)) } catch { /* */ }
    setEditingBudget(null)
  }

  const GIDER_KATEGORILER = [
    'Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet', 'Telefon',
    'Pazarlama & Reklam', 'Nakliye & Kargo', 'Ofis Malzemeleri',
    'Bakım & Onarım', 'Sigorta', 'Vergi & SGK', 'Personel Maaşı',
    'Diğer Gider',
  ]

  const loadData = async () => {
    try {
      const [accs, ents] = await Promise.all([
        api.get<AccountingAccount[]>("/api/accounting/accounts").then((r) => r.data),
        api.get<JournalEntry[]>("/api/accounting/journal-entries").then((r) => r.data),
      ]);
      setAccounts(accs);
      setEntries(ents);
      // compute unbooked count
      const orders = await ordersService.getAll().catch(() => []);
      const completed = orders.filter(o => BOOKED_STATUSES.includes(o.status));
      const bookedIds = new Set(
        ents
          .map(e => e.description.match(/\[ORDER:([^\]]+)\]/)?.[1])
          .filter(Boolean)
      );
      setUnbookedCount(completed.filter(o => !bookedIds.has(o.id)).length);
    } catch {
      toast.error("Muhasebe verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleImportSalesOrders = async () => {
    setImporting(true);
    try {
      const orders = await ordersService.getAll();
      const completed = orders.filter(o => BOOKED_STATUSES.includes(o.status));

      const bookedIds = new Set(
        entries
          .map(e => e.description.match(/\[ORDER:([^\]]+)\]/)?.[1])
          .filter(Boolean)
      );

      const toBook = completed.filter(o => !bookedIds.has(o.id));

      if (toBook.length === 0) {
        toast.error("Aktarılacak yeni sipariş yok — tümü zaten muhasebeleştirilmiş.");
        return;
      }

      // find the 600 (Yurt İçi Satışlar) account, fallback to first
      const salesAccount = accounts.find(a => a.code === '600') ?? accounts[0];

      let imported = 0;
      for (const order of toBook) {
        await api.post("/api/accounting/journal-entries", {
          date: order.orderDate,
          description: `[ORDER:${order.id}] Satış Geliri — ${order.orderNumber ?? '#' + order.id.slice(0, 8)}`,
          debit: order.totalAmount,
          credit: 0,
          accountingAccountId: salesAccount?.id,
        });
        imported++;
      }

      toast.success(`${imported} sipariş başarıyla muhasebeleştirildi.`);
      setLoading(true);
      await loadData();
    } catch {
      toast.error("Aktarım sırasında hata oluştu.");
    } finally {
      setImporting(false);
    }
  };

  // ─── Expense entry ────────────────────────────────────────────────────────
  const openExpenseModal = () => {
    setExpForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', accountId: '' })
    setExpError('')
    setExpenseModal(true)
  }

  const handleSaveExpense = async () => {
    if (!expForm.description.trim()) { setExpError('Açıklama zorunludur.'); return }
    const amount = Number(expForm.amount)
    if (!amount || amount <= 0) { setExpError('Geçerli bir tutar giriniz.'); return }
    setExpSaving(true); setExpError('')
    try {
      await api.post('/api/accounting/journal-entries', {
        date: expForm.date || new Date().toISOString().slice(0, 10),
        description: expForm.description.trim(),
        debit: 0,
        credit: amount,
        accountingAccountId: expForm.accountId || null,
      })
      toast.success('Gider kaydedildi.')
      setExpenseModal(false)
      setLoading(true)
      await loadData()
    } catch {
      setExpError('Gider kaydedilemedi.')
    } finally {
      setExpSaving(false)
    }
  }

  // ─── Spending per category (this month) ────────────────────────────────────
  const currentMonthISO = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of entries) {
      if (!e.credit || e.credit <= 0) continue
      if (e.date.slice(0, 7) !== currentMonthISO) continue
      const matched = GIDER_KATEGORILER.find(k => e.description.includes(k))
      const key = matched ?? 'Diğer Gider'
      map[key] = (map[key] ?? 0) + e.credit
    }
    return map
  }, [entries, currentMonthISO])

  // ─── Pie data for Bütçe tab ────────────────────────────────────────────────
  const PIE_COLORS = ['#6366f1','#22d3ee','#f97316','#ef4444','#a855f7','#10b981','#f59e0b','#ec4899','#84cc16','#06b6d4','#8b5cf6','#14b8a6','#fb923c','#e11d48']
  const pieData = useMemo(() =>
    Object.entries(spendingByCategory)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value })),
    [spendingByCategory])

  // ─── P&L computation ──────────────────────────────────────────────────────
  const totalGelir = useMemo(() => entries.reduce((s, e) => s + (e.debit || 0), 0), [entries])
  const totalGider = useMemo(() => entries.reduce((s, e) => s + (e.credit || 0), 0), [entries])
  const netKar = totalGelir - totalGider

  const monthlyPL = useMemo(() => {
    const map: Record<string, { gelir: number; gider: number }> = {}
    for (const e of entries) {
      const m = e.date.slice(0, 7) // 'YYYY-MM'
      if (!map[m]) map[m] = { gelir: 0, gider: 0 }
      map[m].gelir += e.debit || 0
      map[m].gider += e.credit || 0
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, vals]) => ({
        ay: new Date(month + '-01').toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        Gelir: Math.round(vals.gelir),
        Gider: Math.round(vals.gider),
        net: Math.round(vals.gelir - vals.gider),
      }))
  }, [entries])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/30">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Muhasebe</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">Hesap planı, yevmiye kayıtları, finansal raporlar ve aylık bütçe takibi</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadData(); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-slate-950/20 text-slate-400 hover:text-white hover:border-primary/45 transition-all text-xs font-bold w-fit disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Tab bar + import button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/40 border border-border/80 rounded-xl w-fit">
          {([["accounts", "Hesaplar", CreditCard], ["journal", "Yevmiye", BookOpen], ["rapor", "Kâr-Zarar", TrendingUp], ["bütçe", "Bütçe Takibi", Target]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200
                ${tab === id
                  ? "bg-slate-800 text-foreground border border-border/70 shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                  : "text-slate-400 hover:text-white hover:bg-slate-850/50"}`}
            >
              <Icon size={14} className="shrink-0" />
              {label}
              {id === "journal" && unbookedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {tab === "journal" && (
          <div className="flex items-center gap-3">
            <button
              onClick={openExpenseModal}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl border border-border bg-slate-950/20 text-slate-300 hover:text-white hover:border-primary/45 transition-all text-xs font-bold"
            >
              <Plus className="w-4 h-4 text-primary" /> Gider Ekle
            </button>
            <button
              onClick={handleImportSalesOrders}
              disabled={importing || loading}
              className="premium-button inline-flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 text-xs font-bold px-4.5 py-2.5 rounded-xl text-white bg-primary transition-all duration-300 disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Aktarılıyor…' : 'Satış Siparişlerini Aktar'}
            </button>
          </div>
        )}
      </div>

      {/* Journal: unbooked banner */}
      {tab === "journal" && !loading && (
        <div className={`flex items-center gap-3 p-4.5 rounded-xl border leading-relaxed transition-all duration-300 ${
          unbookedCount === 0
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
        }`}>
          {unbookedCount === 0
            ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-450" />
            : <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          }
          <span className="text-xs font-semibold">
            {unbookedCount === 0
              ? 'Tüm siparişler muhasebeleştirildi.'
              : `${unbookedCount} tamamlanan sipariş henüz muhasebeleştirilmemiş. "Satış Siparişlerini Aktar" butonuna basarak aktarabilirsiniz.`
            }
          </span>
        </div>
      )}

      {tab === "accounts" && (
        <div className="premium-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40">
            <h3 className="text-sm font-bold text-foreground">Hesap Planı <span className="text-slate-505 font-semibold">— {accounts.length} kayıt</span></h3>
          </div>
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-slate-400 font-black text-[10px] uppercase tracking-wider bg-slate-950/20">
                    <th className="text-left px-6 py-4.5 font-bold">Kod</th>
                    <th className="text-left px-6 py-4.5 font-bold">Hesap Adı</th>
                    <th className="text-left px-6 py-4.5 font-bold hidden sm:table-cell">Tür</th>
                    <th className="text-right px-6 py-4.5 font-bold">Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : accounts.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<CreditCard className="w-10 h-10 text-slate-600" />} title="Hesap bulunamadı" /></td></tr>
                    : accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/30 border-b border-border/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-black font-mono">
                            {a.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground text-sm">{a.name}</td>
                        <td className="px-6 py-4 text-slate-400 font-semibold hidden sm:table-cell">{a.type}</td>
                        <td className={`px-6 py-4 text-right font-black text-sm font-mono ${a.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          ₺{a.balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ P&L Report Tab ══════════════════════════════════════════════════ */}
      {tab === "rapor" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Toplam Gelir (Borç)', value: totalGelir, color: 'text-emerald-450 bg-emerald-500/10 border border-emerald-500/20', sign: '+' },
              { label: 'Toplam Gider (Alacak)', value: totalGider, color: 'text-red-400 bg-red-500/10 border border-red-500/20', sign: '−' },
              {
                label: netKar >= 0 ? 'Net Kâr' : 'Net Zarar',
                value: Math.abs(netKar),
                color: netKar >= 0 ? 'text-primary bg-primary/10 border border-primary/20' : 'text-red-400 bg-red-500/10 border border-red-500/20',
                sign: netKar >= 0 ? '+' : '−',
              },
            ].map(({ label, value, color, sign }) => (
              <div key={label} className="premium-card p-5 hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-xs text-slate-505 font-bold mb-2 uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-black font-mono ${color.split(' ')[0]}`}>
                  {sign}₺{value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>

          {/* Monthly bar chart */}
          {loading ? (
            <div className="premium-card p-6 h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : monthlyPL.length === 0 ? (
            <div className="premium-card p-16 text-center">
              <TrendingUp className="w-14 h-14 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-semibold">Yevmiye kaydı eklendikten sonra grafik burada görünür.</p>
            </div>
          ) : (
            <div className="premium-card p-6">
              <h3 className="text-sm font-bold text-foreground mb-5">Aylık Gelir / Gider Karşılaştırması</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPL} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="ay" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px' }}
                      labelStyle={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}
                      formatter={(val) => `₺${Number(val).toLocaleString('tr-TR')}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 10 }} />
                    <Bar dataKey="Gelir" fill="var(--color-primary, #6366f1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly breakdown table */}
          {monthlyPL.length > 0 && (
            <div className="premium-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40">
                <h3 className="text-sm font-bold text-foreground">Aylık Döküm</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-slate-400 font-black text-[10px] uppercase tracking-wider bg-slate-950/20">
                      <th className="text-left px-6 py-4.5 font-bold">Ay</th>
                      <th className="text-right px-6 py-4.5 font-bold text-emerald-450">Gelir</th>
                      <th className="text-right px-6 py-4.5 font-bold text-red-400">Gider</th>
                      <th className="text-right px-6 py-4.5 font-bold">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[...monthlyPL].reverse().map((row) => (
                      <tr key={row.ay} className="hover:bg-slate-800/30 border-b border-border/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground text-sm">{row.ay}</td>
                        <td className="px-6 py-4 text-right text-emerald-450 font-bold text-sm font-mono">
                          ₺{row.Gelir.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right text-red-400 font-bold text-sm font-mono">
                          {row.Gider > 0 ? `₺${row.Gider.toLocaleString('tr-TR')}` : '—'}
                        </td>
                        <td className={`px-6 py-4 text-right font-black text-sm font-mono ${row.net >= 0 ? 'text-primary' : 'text-red-450'}`}>
                          {row.net >= 0 ? '+' : '−'}₺{Math.abs(row.net).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "journal" && (
        <div className="premium-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40">
            <h3 className="text-sm font-bold text-foreground">Yevmiye Kayıtları <span className="text-slate-505 font-semibold">— {entries.length} kayıt</span></h3>
          </div>
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-slate-400 font-black text-[10px] uppercase tracking-wider bg-slate-950/20">
                    <th className="text-left px-6 py-4.5 font-bold">Tarih</th>
                    <th className="text-left px-6 py-4.5 font-bold">Açıklama</th>
                    <th className="text-right px-6 py-4.5 font-bold">Borç</th>
                    <th className="text-right px-6 py-4.5 font-bold">Alacak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : entries.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<BookOpen className="w-10 h-10 text-slate-600" />} title="Yevmiye kaydı bulunamadı" description='Satış siparişlerini aktarmak için "Satış Siparişlerini Aktar" butonuna basın.' /></td></tr>
                    : entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 border-b border-border/30 transition-colors">
                        <td className="px-6 py-4 text-[11px] text-slate-400 font-bold whitespace-nowrap font-mono">
                          {new Date(e.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="truncate font-bold text-foreground text-sm">
                            {e.description.replace(/\[ORDER:[^\]]+\]\s*/, '')}
                          </p>
                          {e.description.includes('[ORDER:') && (
                            <span className="inline-block mt-1.5 text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">otomatik aktarım</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-450 font-black text-sm whitespace-nowrap font-mono">
                          {e.debit > 0 ? `₺${e.debit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-red-450 font-black text-sm whitespace-nowrap font-mono">
                          {e.credit > 0 ? `₺${e.credit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Bütçe Takibi Tab ═══════════════════════════════════════════════ */}
      {tab === "bütçe" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Aylık Bütçe Karşılaştırması
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Edit3 className="w-3.5 h-3.5" /> Bütçeyi düzenlemek için limitlerin üzerine tıklayın
            </div>
          </div>

          {/* Budget info banner */}
          <div className="flex items-start gap-3 p-4.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs leading-relaxed">
            <Target className="w-4.5 h-4.5 mt-0.5 shrink-0" />
            <div>
              Gider kategorileri için aylık bütçe belirleyin. Gerçek harcamalar yevmiye kayıtlarından otomatik hesaplanır.
              Bütçeler yerel tarayıcı hafızanızda (bu cihaza özel) saklanır.
            </div>
          </div>

          {/* Spending breakdown PieChart */}
          {pieData.length > 0 && (
            <div className="premium-card p-6">
              <h3 className="text-sm font-bold text-foreground mb-5">Bu Ay Harcanan Bütçe Dağılımı</h3>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div style={{ width: 200, height: 200, flexShrink: 0 }} className="relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2.5}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px' }}
                        labelStyle={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}
                        formatter={(val) => [`₺${Number(val).toLocaleString('tr-TR')}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {pieData.slice(0, 8).map((item, i) => {
                    const tot = pieData.reduce((s, d) => s + d.value, 0)
                    const pct = tot > 0 ? Math.round((item.value / tot) * 100) : 0
                    return (
                      <div key={item.name} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/20 border border-border/30 hover:border-border/60 transition-colors">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-slate-400 truncate flex-1 font-semibold">{item.name}</span>
                        <span className="text-xs font-bold text-foreground font-mono">₺{item.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] text-slate-500 w-7 text-right font-bold">%{pct}</span>
                      </div>
                    )
                  })}
                  {pieData.length > 8 && (
                    <p className="text-xs text-slate-500 pl-4 col-span-full font-semibold">+{pieData.length - 8} kategori daha mevcut</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Category budget rows */}
          <div className="premium-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/85 bg-slate-900/40">
              <div className="grid grid-cols-5 text-[10px] text-slate-450 font-black uppercase tracking-wider">
                <span className="col-span-2">Kategori</span>
                <span className="text-right">Bu Ay Harcama</span>
                <span className="text-right">Bütçe</span>
                <span className="text-right">Durum</span>
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {GIDER_KATEGORILER.map(cat => {
                const spent = spendingByCategory[cat] ?? 0
                const budget = budgets[cat] ?? 0
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
                const isOver = budget > 0 && spent > budget
                const isWarning = budget > 0 && pct >= 80 && !isOver
                const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-primary'
                const isEditing = editingBudget === cat

                return (
                  <div key={cat} className="px-6 py-4 hover:bg-slate-800/10 transition-colors">
                    <div className="grid grid-cols-5 items-center gap-3 mb-2">
                      <span className="col-span-2 text-sm font-bold text-foreground">{cat}</span>
                      <span className={`text-right text-sm font-bold font-mono ${spent > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {spent > 0 ? `₺${spent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '—'}
                      </span>
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={budgetInput}
                              onChange={e => setBudgetInput(e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-primary/50 text-xs text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/45 font-mono font-bold"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveBudget(cat, Number(budgetInput))
                                if (e.key === 'Escape') setEditingBudget(null)
                              }}
                            />
                            <button onClick={() => saveBudget(cat, Number(budgetInput))} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingBudget(null)} className="p-1 text-slate-400 hover:bg-slate-850 rounded-lg">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingBudget(cat); setBudgetInput(String(budget || '')) }}
                            className="flex items-center justify-end gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group font-bold font-mono ml-auto"
                          >
                            {budget > 0 ? `₺${budget.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : 'Belirle'}
                            <Edit3 className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        {budget > 0 ? (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            isOver ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                          }`}>
                            {isOver ? `%${Math.round(pct)} AŞILDI` : `%${Math.round(pct)}`}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 font-semibold">—</span>
                        )}
                      </div>
                    </div>
                    {budget > 0 && (
                      <div className="w-full bg-slate-950/60 rounded-full h-1.5 border border-border/10 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Month total */}
          {Object.keys(spendingByCategory).length > 0 && (
            <div className="premium-card p-6 flex items-center justify-between bg-slate-900/40">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bu Ay Toplam Gider</p>
                <p className="text-2xl font-black text-red-450 font-mono">
                  ₺{Object.values(spendingByCategory).reduce((s, v) => s + v, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              {Object.values(budgets).some(b => b > 0) && (
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Toplam Bütçe Limiti</p>
                  <p className="text-2xl font-black text-foreground font-mono">
                    ₺{Object.values(budgets).reduce((s, v) => s + (v || 0), 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Expense Modal ═══════════════════════════════════════════════════ */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-border/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-950/20">
              <h2 className="text-sm font-bold text-foreground">Gider Kaydı Ekle</h2>
              <button onClick={() => setExpenseModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {expError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-450 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{expError}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Tarih</label>
                <input
                  type="date"
                  value={expForm.date}
                  onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-slate-950/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/45 transition-all font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Gider Kategorisi / Açıklama *</label>
                <input
                  type="text"
                  list="gider-cats"
                  value={expForm.description}
                  onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Kira, Elektrik, Malzeme..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-slate-950/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/45 transition-all placeholder:text-slate-600 font-semibold"
                />
                <datalist id="gider-cats">
                  {GIDER_KATEGORILER.map(k => <option key={k} value={k} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Tutar (₺) *</label>
                <input
                  type="number"
                  value={expForm.amount}
                  onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-slate-950/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/45 transition-all font-mono font-bold"
                />
              </div>
              {accounts.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1.5 uppercase tracking-wider">Hesap (opsiyonel)</label>
                  <select
                    value={expForm.accountId}
                    onChange={e => setExpForm(f => ({ ...f, accountId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-slate-950/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/45 transition-all font-bold cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">— Hesap seçin —</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} className="bg-slate-900">{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-slate-950/20">
              <button onClick={() => setExpenseModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">İptal</button>
              <button
                onClick={handleSaveExpense}
                disabled={expSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-500/90 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-md shadow-red-500/20 hover:shadow-red-500/30"
              >
                {expSaving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Gider Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
