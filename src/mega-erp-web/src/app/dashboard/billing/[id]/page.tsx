"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { billingService } from "@/lib/services/billing.service";
import { useToast } from "@/store/ui.store";
import type { Invoice } from "@/types/api.types";
import { ArrowLeft, CheckCircle, Printer } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Draft: { label: "Taslak", className: "bg-slate-100 text-slate-600" },
  Issued: { label: "Kesildi", className: "bg-primary/15 text-primary" },
  Paid: { label: "Ödendi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

function handlePrint(invoice: Invoice) {
  const status = statusConfig[invoice.status]?.label ?? invoice.status;
  const subtotal = invoice.totalAmount - invoice.totalTax;

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Fatura ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #6366f1; }
    .brand { font-size: 22px; font-weight: 900; color: #6366f1; }
    .brand span { color: #1e293b; }
    .invoice-meta { text-align: right; }
    .invoice-no { font-size: 18px; font-weight: 700; color: #1e293b; }
    .invoice-date { font-size: 12px; color: #64748b; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #e0e7ff; color: #4f46e5; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    th:not(:first-child) { text-align: right; }
    td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    td:not(:first-child) { text-align: right; }
    .totals { width: 260px; margin-left: auto; margin-top: 16px; }
    .totals .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #475569; }
    .totals .grand { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; padding-top: 10px; margin-top: 10px; border-top: 2px solid #6366f1; color: #1e293b; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand"><span>Canayan</span>Web</div>
      <div style="font-size:12px;color:#64748b;margin-top:6px;">KOBİ All-in-One Platform</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-no">${invoice.invoiceNumber}</div>
      <div class="invoice-date">Fatura Tarihi: ${new Date(invoice.invoiceDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div>
      <div class="invoice-date">Vade Tarihi: ${new Date(invoice.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div>
      <div class="status-badge">${status}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Açıklama</th>
        <th>Adet</th>
        <th>Birim Fiyat</th>
        <th>KDV %</th>
        <th>Toplam</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">₺${item.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">${(item.taxRate * 100).toFixed(0)}%</td>
        <td style="text-align:right;font-weight:600">₺${item.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Ara Toplam</span><span>₺${subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span>KDV</span><span>₺${invoice.totalTax.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
    <div class="grand"><span>Genel Toplam</span><span>₺${invoice.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span></div>
  </div>

  <div class="footer">
    Bu fatura CanayanWeb platformu tarafından oluşturulmuştur. • www.canayanweb.com
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/billing">
            <button className="p-2 rounded-xl hover:bg-slate-800 transition-colors"><ArrowLeft size={20} /></button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
              <span className="text-slate-500 text-sm">{new Date(invoice.invoiceDate).toLocaleDateString("tr-TR")}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => handlePrint(invoice)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary border border-border hover:border-primary/80 rounded-xl transition-colors"
          title="Faturayı Yazdır / PDF olarak kaydet"
        >
          <Printer size={16} /> Yazdır
        </button>
      </div>

      <div className="premium-card p-6">
        <div className="mb-4"><h3 className="text-base font-bold text-foreground">Fatura Kalemleri</h3></div>
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Açıklama</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Adet</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Birim Fiyat</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">KDV %</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-border">
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
        </div>
      </div>

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
