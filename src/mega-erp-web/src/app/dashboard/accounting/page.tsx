"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard, BookOpen, RefreshCw, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { ordersService } from "@/lib/services/orders.service";
import { useToast } from "@/store/ui.store";
import type { AccountingAccount, JournalEntry } from "@/types/api.types";

type Tab = "accounts" | "journal" | "rapor";

const BOOKED_STATUSES = ['Paid', 'Shipped', 'Delivered'];

export default function AccountingPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [unbookedCount, setUnbookedCount] = useState(0);

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
      <div>
        <h1 className="text-3xl font-black tracking-tight">Muhasebe</h1>
        <p className="text-slate-500">Hesaplar ve yevmiye kayıtları</p>
      </div>

      {/* Tab bar + import button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 bg-slate-900/40 border border-border/80 rounded-xl w-fit">
          {([["accounts", "Hesaplar", CreditCard], ["journal", "Yevmiye", BookOpen], ["rapor", "Kâr-Zarar", TrendingUp]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${tab === id ? "bg-surface text-primary border border-border/40 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {tab === "journal" && (
          <button
            onClick={handleImportSalesOrders}
            disabled={importing || loading}
            className="premium-button inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
            {importing ? 'Aktarılıyor…' : 'Satış Siparişlerini Aktar'}
          </button>
        )}
      </div>

      {/* Journal: unbooked banner */}
      {tab === "journal" && !loading && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          unbookedCount === 0
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
        }`}>
          {unbookedCount === 0
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 shrink-0" />
          }
          <span className="text-sm font-medium">
            {unbookedCount === 0
              ? 'Tüm siparişler muhasebeleştirildi.'
              : `${unbookedCount} tamamlanan sipariş henüz muhasebeleştirilmemiş. "Satış Siparişlerini Aktar" butonuna basın.`
            }
          </span>
        </div>
      )}

      {tab === "accounts" && (
        <div className="premium-card p-6">
          <div className="mb-4"><h3 className="text-base font-bold text-foreground">Hesap Planı ({accounts.length})</h3></div>
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Kod</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Hesap Adı</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">Tür</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : accounts.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<CreditCard />} title="Hesap bulunamadı" /></td></tr>
                    : accounts.map((a) => (
                      <tr key={a.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{a.code}</td>
                        <td className="px-4 py-3 font-medium">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{a.type}</td>
                        <td className={`px-4 py-3 text-right font-bold ${a.balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
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
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Toplam Gelir (Borç)', value: totalGelir, color: 'text-emerald-400 bg-emerald-500/10', sign: '+' },
              { label: 'Toplam Gider (Alacak)', value: totalGider, color: 'text-red-400 bg-red-500/10', sign: '−' },
              {
                label: netKar >= 0 ? 'Net Kâr' : 'Net Zarar',
                value: Math.abs(netKar),
                color: netKar >= 0 ? 'text-primary bg-primary/10' : 'text-red-400 bg-red-500/10',
                sign: netKar >= 0 ? '+' : '−',
              },
            ].map(({ label, value, color, sign }) => (
              <div key={label} className="premium-card p-5">
                <p className="text-xs text-slate-500 mb-2">{label}</p>
                <p className={`text-2xl font-black ${color.split(' ')[0]}`}>
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
            <div className="premium-card p-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Yevmiye kaydı eklendikten sonra grafik burada görünür.</p>
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
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                      formatter={(val) => `₺${Number(val).toLocaleString('tr-TR')}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
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
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Aylık Döküm</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-slate-500">
                    <th className="text-left px-4 py-3 font-medium">Ay</th>
                    <th className="text-right px-4 py-3 font-medium text-emerald-400">Gelir</th>
                    <th className="text-right px-4 py-3 font-medium text-red-400">Gider</th>
                    <th className="text-right px-4 py-3 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...monthlyPL].reverse().map((row) => (
                    <tr key={row.ay} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{row.ay}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        ₺{row.Gelir.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {row.Gider > 0 ? `₺${row.Gider.toLocaleString('tr-TR')}` : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${row.net >= 0 ? 'text-primary' : 'text-red-400'}`}>
                        {row.net >= 0 ? '+' : '−'}₺{Math.abs(row.net).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "journal" && (
        <div className="premium-card p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground">Yevmiye Kayıtları ({entries.length})</h3>
          </div>
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Tarih</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Açıklama</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Borç</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">Alacak</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : entries.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<BookOpen />} title="Yevmiye kaydı bulunamadı" description='Satış siparişlerini aktarmak için "Satış Siparişlerini Aktar" butonuna basın.' /></td></tr>
                    : entries.map((e) => (
                      <tr key={e.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate font-medium">
                            {e.description.replace(/\[ORDER:[^\]]+\]\s*/, '')}
                          </p>
                          {e.description.includes('[ORDER:') && (
                            <span className="text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">otomatik aktarım</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-medium whitespace-nowrap">
                          {e.debit > 0 ? `₺${e.debit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400 font-medium whitespace-nowrap">
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
    </div>
  );
}
