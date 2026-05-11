"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ordersService } from "@/lib/services/orders.service";
import { useToast } from "@/store/ui.store";
import type { Order } from "@/types/api.types";
import { ArrowLeft, XCircle } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  Placed: { label: "Alındı", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  Paid: { label: "Ödendi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Cancelled: { label: "İptal", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    ordersService.getById(id).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm("Bu siparişi iptal etmek istediğinize emin misiniz?")) return;
    setCancelling(true);
    try {
      await ordersService.cancel(id);
      toast.success("Sipariş iptal edildi.");
      router.push("/dashboard/orders");
    } catch {
      toast.error("Sipariş iptal edilemedi.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="space-y-4 animate-fade-in"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!order) return <p className="text-red-500">Sipariş bulunamadı.</p>;

  const status = statusConfig[order.status] ?? { label: order.status, className: "bg-slate-100 text-slate-600" };
  const canCancel = order.status === "Pending" || order.status === "Placed";

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders">
          <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Sipariş Detayı</h1>
          <p className="text-slate-500 font-mono text-sm">{id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-slate-500 mb-1">Durum</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
            </div>
            <div><p className="text-xs text-slate-500 mb-1">Sipariş Tarihi</p>
              <p className="font-semibold text-sm">{new Date(order.orderDate).toLocaleDateString("tr-TR")}</p>
            </div>
            <div><p className="text-xs text-slate-500 mb-1">Toplam</p>
              <p className="font-bold text-sm">₺{order.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div><p className="text-xs text-slate-500 mb-1">Kalem Sayısı</p>
              <p className="font-semibold text-sm">{order.items?.length ?? 0} ürün</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sipariş Kalemleri</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Ürün</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Adet</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Birim Fiyat</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">₺{item.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-bold">₺{item.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canCancel && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={cancelling} className="flex items-center gap-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <XCircle size={16} />
            {cancelling ? "İptal ediliyor..." : "Siparişi İptal Et"}
          </Button>
        </div>
      )}
    </div>
  );
}
