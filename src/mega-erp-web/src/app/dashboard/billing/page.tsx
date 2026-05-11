"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Receipt, CheckCircle } from "lucide-react";
import { billingService } from "@/lib/services/billing.service";
import { useToast } from "@/store/ui.store";
import type { Invoice } from "@/types/api.types";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Draft: { label: "Taslak", className: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400" },
  Issued: { label: "Kesildi", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  Paid: { label: "Ödendi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export default function BillingPage() {
  const toast = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    billingService.getAll()
      .then(setInvoices)
      .catch(() => toast.error("Faturalar yüklenemedi."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (id: string) => {
    setMarking(id);
    try {
      await billingService.updateStatus(id, "Paid");
      toast.success("Fatura ödendi olarak işaretlendi.");
      load();
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Faturalar</h1>
        <p className="text-slate-500">Fatura yönetimi</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Fatura Listesi</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Fatura No</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Tarih</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Vade</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Tutar</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                  : invoices.length === 0
                  ? <tr><td colSpan={6}><EmptyState icon={<Receipt />} title="Fatura bulunamadı" /></td></tr>
                  : invoices.map((inv) => {
                    const status = statusConfig[inv.status] ?? { label: inv.status, className: "" };
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                          {new Date(inv.invoiceDate).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                          {new Date(inv.dueDate).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          ₺{inv.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.status === "Issued" && (
                              <button
                                onClick={() => markPaid(inv.id)}
                                disabled={marking === inv.id}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Ödendi Olarak İşaretle"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <Link href={`/dashboard/billing/${inv.id}`} className="text-indigo-500 hover:underline text-xs">Detay</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
