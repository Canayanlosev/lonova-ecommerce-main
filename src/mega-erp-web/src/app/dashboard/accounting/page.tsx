"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard, BookOpen, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { ordersService } from "@/lib/services/orders.service";
import { useToast } from "@/store/ui.store";
import type { AccountingAccount, JournalEntry } from "@/types/api.types";

type Tab = "accounts" | "journal";

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Muhasebe</h1>
        <p className="text-slate-500">Hesaplar ve yevmiye kayıtları</p>
      </div>

      {/* Tab bar + import button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          {([["accounts", "Hesaplar", CreditCard], ["journal", "Yevmiye", BookOpen]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${tab === id ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Icon size={16} />{label}
            </button>
          ))}
        </div>

        {tab === "journal" && (
          <button
            onClick={handleImportSalesOrders}
            disabled={importing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-sm shadow-blue-500/20"
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
        <Card>
          <CardHeader><CardTitle>Hesap Planı ({accounts.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Kod</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Hesap Adı</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Tür</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : accounts.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<CreditCard />} title="Hesap bulunamadı" /></td></tr>
                    : accounts.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-blue-400">{a.code}</td>
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
          </CardContent>
        </Card>
      )}

      {tab === "journal" && (
        <Card>
          <CardHeader>
            <CardTitle>Yevmiye Kayıtları ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Tarih</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Açıklama</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Borç</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Alacak</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : entries.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<BookOpen />} title="Yevmiye kaydı bulunamadı" description='Satış siparişlerini aktarmak için "Satış Siparişlerini Aktar" butonuna basın.' /></td></tr>
                    : entries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate">
                            {e.description.replace(/\[ORDER:[^\]]+\]\s*/, '')}
                          </p>
                          {e.description.includes('[ORDER:') && (
                            <span className="text-xs text-blue-400/70">otomatik aktarım</span>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
