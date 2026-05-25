"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

import { motion } from "framer-motion";
import { Loader2, AlertCircle, Upload, X } from "lucide-react";
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
  const [imageType, setImageType] = useState<'file' | 'url'>('file');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(product?.imageUrl || "");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    productsService.getCategories().then(setCategories).catch(() => {});
    if (product?.imageUrl && !product.imageUrl.startsWith('http')) {
      setImageType('file');
    } else if (product?.imageUrl) {
      setImageType('url');
    }
  }, [product]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Yalnızca JPG, PNG ve WEBP formatları desteklenir.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Ürün adı zorunludur.");
    if (!form.sku.trim()) return setError("SKU zorunludur.");
    if (parseFloat(form.basePrice) <= 0) return setError("Fiyat 0'dan büyük olmalıdır.");
    if (!form.categoryId) return setError("Kategori seçilmelidir.");

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        basePrice: parseFloat(form.basePrice),
        sku: form.sku,
        categoryId: form.categoryId,
        imageUrl: imageType === 'url' ? imageUrl : (selectedFile ? undefined : imageUrl),
      };

      if (isEdit && product) {
        await productsService.update(product.id, payload);
        if (imageType === 'file' && selectedFile) {
          await productsService.uploadImage(product.id, selectedFile);
        }
        toast.success("Ürün güncellendi.");
      } else {
        const created = await productsService.create(payload);
        if (imageType === 'file' && selectedFile && created.id) {
          await productsService.uploadImage(created.id, selectedFile);
        }
        toast.success("Ürün oluşturuldu.");
      }
      router.push("/dashboard/ecommerce");
    } catch {
      setError(isEdit ? "Ürün güncellenirken hata oluştu." : "Ürün oluşturulurken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm";

  return (
    <form onSubmit={handleSubmit}>
      <div className="premium-card p-6">
        <div className="mb-4">
          <h3 className="text-base font-bold text-foreground">{isEdit ? "Ürünü Düzenle" : "Yeni Ürün"}</h3>
        </div>
        <div className="space-y-4">
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

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
            <label className="text-sm font-medium">Ürün Görseli</label>
            <div className="flex gap-1 p-1 bg-slate-800/30 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setImageType('file')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  imageType === 'file'
                    ? 'bg-slate-800 text-foreground shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Dosya Yükle
              </button>
              <button
                type="button"
                onClick={() => setImageType('url')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  imageType === 'url'
                    ? 'bg-slate-800 text-foreground shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                URL Gir
              </button>
            </div>

            {imageType === 'file' ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-slate-600'
                }`}
              >
                {previewUrl ? (
                  <div className="relative group w-40 h-40 rounded-xl overflow-hidden border border-border">
                    <img
                      src={previewUrl}
                      alt="Görsel önizleme"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                      title="Görseli kaldır"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto w-10 h-10 rounded-xl bg-slate-800/20 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-sm font-medium mb-1">
                      Dosyayı sürükleyin veya <label className="text-primary cursor-pointer hover:underline">seçin<input type="file" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" /></label>
                    </p>
                    <p className="text-xs text-slate-400">JPG, PNG veya WEBP (maks. 5MB)</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setPreviewUrl(e.target.value);
                  }}
                  className={inputClass}
                />
                {previewUrl && (
                  <div className="w-40 h-40 rounded-xl overflow-hidden border border-border">
                    <img
                      src={previewUrl}
                      alt="Görsel önizleme"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewUrl("")}
                    />
                  </div>
                )}
              </div>
            )}
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
        </div>
      </div>
    </form>
  );
}
