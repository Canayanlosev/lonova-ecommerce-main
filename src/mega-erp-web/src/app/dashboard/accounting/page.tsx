"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard, BookOpen } from "lucide-react";
import { billingService as _ } from "@/lib/services/billing.service";
import api from "@/lib/api";
import { useToast } from "@/store/ui.store";
import type { AccountingAccount, JournalEntry } from "@/types/api.types";

type Tab = "accounts" | "journal";

export default function AccountingPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [accs, ents] = await Promise.all([
          api.get<AccountingAccount[]>("/api/accounting/accounts").then((r) => r.data),
          api.get<JournalEntry[]>("/api/accounting/journal-entries").then((r) => r.data),
        ]);
        setAccounts(accs);
        setEntries(ents);
      } catch {
        toast.error("Muhasebe verileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Muhasebe</h1>
        <p className="text-slate-500">Hesaplar ve yevmiye kayıtları</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {([["accounts", "Hesaplar", CreditCard], ["journal", "Yevmiye", BookOpen]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === id ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

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
                      <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
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
          <CardHeader><CardTitle>Yevmiye Kayıtları ({entries.length})</CardTitle></CardHeader>
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
                    ? <tr><td colSpan={4}><EmptyState icon={<BookOpen />} title="Yevmiye kaydı bulunamadı" /></td></tr>
                    : entries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(e.date).toLocaleDateString("tr-TR")}</td>
                        <td className="px-4 py-3">{e.description}</td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-medium">
                          {e.debit > 0 ? `₺${e.debit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">
                          {e.credit > 0 ? `₺${e.credit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}
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
