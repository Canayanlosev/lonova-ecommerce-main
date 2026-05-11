"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { billingService } from "@/lib/services/billing.service";
import { useToast } from "@/store/ui.store";
import type { Invoice } from "@/types/api.types";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Draft: { label: "Taslak", className: "bg-slate-100 text-slate-600" },
  Issued: { label: "Kesildi", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  Paid: { label: "Ödendi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    billingService.getById(id).then(setInvoice).finally(() => setLoading(false));
  }, [id]);

  const markPaid = async () => {
    setMarking(true);
    try {
      await billingService.updateStatus(id, "Paid");
      toast.success("Fatura ödendi olarak işaretlendi.");
      router.push("/dashboard/billing");
    } catch {
      toast.error("İşlem başarısız.");
      setMarking(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!invoice) return <p className="text-red-500">Fatura bulunamadı.</p>;

  const status = statusConfig[invoice.status] ?? { label: invoice.status, className: "" };
  const subtotal = invoice.totalAmount - invoice.totalTax;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/billing">
          <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={20} /></button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{invoice.invoiceNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
            <span className="text-slate-500 text-sm">{new Date(invoice.invoiceDate).toLocaleDateString("tr-TR")}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Fatura Kalemleri</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Açıklama</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Adet</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Birim Fiyat</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">KDV %</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">₺{item.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{(item.taxRate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right font-bold">₺{item.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ara Toplam</span>
              <span>₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">KDV</span>
              <span>₺{invoice.totalTax.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Genel Toplam</span>
              <span>₺{invoice.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.status === "Issued" && (
        <div className="flex justify-end">
          <Button onClick={markPaid} disabled={marking} className="flex items-center gap-2">
            <CheckCircle size={16} />
            {marking ? "İşleniyor..." : "Ödendi Olarak İşaretle"}
          </Button>
        </div>
      )}
    </div>
  );
}
