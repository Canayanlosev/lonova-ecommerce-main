"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Truck, Package } from "lucide-react";
import { shippingService } from "@/lib/services/shipping.service";
import { useToast } from "@/store/ui.store";
import type { Shipment } from "@/types/api.types";

const statusConfig: Record<string, { label: string; className: string }> = {
  Pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  Shipped: { label: "Gönderildi", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  InTransit: { label: "Yolda", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  Delivered: { label: "Teslim Edildi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  Returned: { label: "İade", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export default function ShippingPage() {
  const toast = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    shippingService.getShipments()
      .then(setShipments)
      .catch(() => toast.error("Kargolar yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await shippingService.updateShipmentStatus(id, status);
      setShipments((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      toast.success("Kargo durumu güncellendi.");
    } catch {
      toast.error("Durum güncellenemedi.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Kargo Takibi</h1>
        <p className="text-slate-500">Gönderi durumlarını yönetin</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Kargolar ({shipments.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Takip No</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Tahmini Teslimat</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Güncelle</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                  : shipments.length === 0
                  ? <tr><td colSpan={4}><EmptyState icon={<Truck />} title="Kargo bulunamadı" /></td></tr>
                  : shipments.map((s) => {
                    const status = statusConfig[s.status] ?? { label: s.status, className: "" };
                    return (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="px-4 py-3 font-mono text-xs">{s.trackingNumber}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                          {s.estimatedDeliveryDate ? new Date(s.estimatedDeliveryDate).toLocaleDateString("tr-TR") : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={s.status}
                            disabled={updating === s.id}
                            onChange={(e) => updateStatus(s.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {Object.entries(statusConfig).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
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
