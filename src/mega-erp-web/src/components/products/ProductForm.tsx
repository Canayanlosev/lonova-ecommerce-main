"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { productsService } from "@/lib/services/products.service";
import type { Category, Product } from "@/types/api.types";
import { useRouter } from "next/navigation";
import { useToast } from "@/store/ui.store";

interface Props {
  product?: Product;
  isEdit?: boolean;
}

export function ProductForm({ product, isEdit }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    basePrice: product?.basePrice?.toString() || "",
    sku: product?.sku || "",
    categoryId: product?.categoryId || "",
  });

  useEffect(() => {
    productsService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Ürün adı zorunludur.");
    if (!form.sku.trim()) return setError("SKU zorunludur.");
    if (parseFloat(form.basePrice) <= 0) return setError("Fiyat 0'dan büyük olmalıdır.");
    if (!form.categoryId) return setError("Kategori seçilmelidir.");

    setLoading(true);
    try {
      if (isEdit && product) {
        await productsService.update(product.id, {
          name: form.name,
          description: form.description,
          basePrice: parseFloat(form.basePrice),
          categoryId: form.categoryId,
        });
        toast.success("Ürün güncellendi.");
      } else {
        await productsService.create({
          name: form.name,
          description: form.description,
          basePrice: parseFloat(form.basePrice),
          sku: form.sku,
          categoryId: form.categoryId,
        });
        toast.success("Ürün oluşturuldu.");
      }
      router.push("/dashboard/ecommerce");
    } catch {
      setError(isEdit ? "Ürün güncellenirken hata oluştu." : "Ürün oluşturulurken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm";

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Ürünü Düzenle" : "Yeni Ürün"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Ürün Adı *", field: "name", type: "text", placeholder: "Örn: Laptop Pro X" },
            { label: "SKU *", field: "sku", type: "text", placeholder: "Örn: LPT-001", disabled: isEdit },
            { label: "Baz Fiyat (₺) *", field: "basePrice", type: "number", placeholder: "0.00" },
          ].map((f, i) => (
            <motion.div
              key={f.field}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-1.5"
            >
              <label className="text-sm font-medium">{f.label}</label>
              <input
                type={f.type}
                step={f.type === "number" ? "0.01" : undefined}
                placeholder={f.placeholder}
                value={form[f.field as keyof typeof form]}
                onChange={set(f.field)}
                disabled={f.disabled}
                className={inputClass}
                required
              />
            </motion.div>
          ))}

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-1.5">
            <label className="text-sm font-medium">Kategori *</label>
            <select value={form.categoryId} onChange={set("categoryId")} className={inputClass} required>
              <option value="">Kategori seçin...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-1.5">
            <label className="text-sm font-medium">Açıklama</label>
            <textarea
              rows={3}
              placeholder="Ürün açıklaması..."
              value={form.description}
              onChange={set("description")}
              className={`${inputClass} resize-none`}
            />
          </motion.div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? "Güncelle" : "Oluştur"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>İptal</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
