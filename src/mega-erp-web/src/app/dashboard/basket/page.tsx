"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShoppingCart, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { basketService } from "@/lib/services/basket.service";
import { useBasketStore } from "@/store/basket.store";
import { useToast } from "@/store/ui.store";
import type { BasketItem } from "@/types/api.types";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BasketPage() {
  const router = useRouter();
  const toast = useToast();
  const { items, setItems } = useBasketStore();
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = async () => {
    try {
      const data = await basketService.get();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateQty = async (item: BasketItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      await remove(item.productId);
      return;
    }
    try {
      await basketService.updateItem(item.productId, newQty);
      await load();
    } catch {
      toast.error("Miktar güncellenemedi.");
    }
  };

  const remove = async (productId: string) => {
    try {
      await basketService.removeItem(productId);
      await load();
      toast.success("Ürün sepetten kaldırıldı.");
    } catch {
      toast.error("Ürün kaldırılamadı.");
    }
  };

  const checkout = async () => {
    setCheckingOut(true);
    try {
      const result = await basketService.checkout();
      setItems([]);
      toast.success("Siparişiniz alındı!");
      if (result.orderId) router.push(`/dashboard/orders/${result.orderId}`);
      else router.push("/dashboard/orders");
    } catch {
      toast.error("Ödeme işlemi başarısız.");
    } finally {
      setCheckingOut(false);
    }
  };

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Sepetim</h1>
        <p className="text-slate-500">Seçtiğiniz ürünler</p>
      </div>

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<ShoppingCart />}
              title="Sepetiniz boş"
              description="Ürün eklemek için alışverişe başlayın."
              action={{ label: "Ürünlere Git", onClick: () => router.push("/dashboard/ecommerce") }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="hover:translate-y-0">
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.productName}</p>
                      <p className="text-sm text-slate-500">₺{item.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateQty(item, -1)} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item, 1)} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => remove(item.productId)} className="ml-2 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Sipariş Özeti</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-500 truncate mr-4">{item.productName} x{item.quantity}</span>
                      <span className="font-medium flex-shrink-0">₺{(item.unitPrice * item.quantity).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between font-bold">
                  <span>Toplam</span>
                  <span>₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
                <Button className="w-full" onClick={checkout} disabled={checkingOut}>
                  {checkingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Ödemeye Geç
                </Button>
                <Link href="/dashboard/ecommerce" className="block text-center text-sm text-indigo-500 hover:underline">
                  Alışverişe Devam Et
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
