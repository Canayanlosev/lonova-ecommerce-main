"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { productsService } from "@/lib/services/products.service";
import type { Product } from "@/types/api.types";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsService.getById(id).then(setProduct).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Ürünü Düzenle</h1>
        <p className="text-slate-500">Ürün bilgilerini güncelleyin</p>
      </div>
      {loading ? <SkeletonCard /> : product ? <ProductForm product={product} isEdit /> : <p className="text-red-500">Ürün bulunamadı.</p>}
    </div>
  );
}
