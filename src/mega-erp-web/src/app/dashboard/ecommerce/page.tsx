"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Package, Search, PencilLine, Trash2, Plus, AlertCircle, Eye, EyeOff, CheckSquare, Square, X } from "lucide-react";
import { productsService } from "@/lib/services/products.service";
import { useToast } from "@/store/ui.store";
import type { Product } from "@/types/api.types";
import Link from "next/link";

export default function EcommercePage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await productsService.getAll();
      setProducts(data);
    } catch {
      setError("Ürünler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleVisibility = async (id: string) => {
    try {
      const { data } = await import('@/lib/api').then(m => m.default.put(`/api/ecommerce/products/${id}/visibility`))
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isPublishedToMarketplace: data.isPublishedToMarketplace } : p))
    } catch {
      toast.error("Görünürlük güncellenemedi.")
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ürününü silmek istediğinize emin misiniz?`)) return;
    try {
      await productsService.delete(id);
      toast.success(`"${name}" silindi.`);
      load();
    } catch {
      toast.error("Ürün silinirken hata oluştu.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} ürünü silmek istediğinize emin misiniz?`)) return;
    setBulkLoading(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try { await productsService.delete(id); successCount++; } catch { /* continue */ }
    }
    toast.success(`${successCount} ürün silindi.`);
    setSelectedIds(new Set());
    load();
    setBulkLoading(false);
  };

  const handleBulkVisibility = async (publish: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const api = (await import('@/lib/api')).default;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const { data } = await api.put(`/api/ecommerce/products/${id}/visibility`);
        // Only count if result matches desired state
        if (data.isPublishedToMarketplace === publish) successCount++;
        // Toggle again if needed (backend is a toggle, not a set)
        else await api.put(`/api/ecommerce/products/${id}/visibility`);
      } catch { /* continue */ }
    }
    toast.success(`${selectedIds.size} ürün ${publish ? 'yayınlandı' : 'gizlendi'}.`);
    setSelectedIds(new Set());
    load();
    setBulkLoading(false);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Ürünler</h1>
          <p className="text-slate-500">Ürün kataloğunu yönetin</p>
        </div>
        <Link href="/dashboard/ecommerce/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} /> Yeni Ürün
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Ürün Listesi</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ad veya SKU ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={load} className="ml-auto underline text-xs">Tekrar Dene</button>
            </div>
          ) : (
            <>
              {/* Bulk Action Bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <span className="text-sm font-semibold text-indigo-400">{selectedIds.size} ürün seçili</span>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => handleBulkVisibility(true)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      <Eye size={13} /> Yayınla
                    </button>
                    <button
                      onClick={() => handleBulkVisibility(false)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition-colors disabled:opacity-50"
                    >
                      <EyeOff size={13} /> Gizle
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} /> {bulkLoading ? 'Siliniyor...' : 'Sil'}
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-3 w-10">
                        <button onClick={toggleSelectAll} className="text-slate-400 hover:text-foreground transition-colors">
                          {filtered.length > 0 && selectedIds.size === filtered.length
                            ? <CheckSquare size={16} className="text-indigo-500" />
                            : <Square size={16} />
                          }
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">SKU</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Ürün Adı</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Kategori</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-medium">Fiyat</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                      : filtered.length === 0
                      ? (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState icon={<Package />} title="Ürün bulunamadı" description="Henüz ürün eklenmemiş veya arama sonucu boş." />
                          </td>
                        </tr>
                      )
                      : filtered.map((p) => (
                        <tr key={p.id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.has(p.id) ? 'bg-indigo-500/5' : ''}`}>
                          <td className="px-3 py-3">
                            <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                              {selectedIds.has(p.id)
                                ? <CheckSquare size={16} className="text-indigo-500" />
                                : <Square size={16} />
                              }
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/ecommerce/${p.id}`} className="font-semibold hover:text-indigo-500 transition-colors">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{p.category?.name || "-"}</td>
                          <td className="px-4 py-3 text-right font-bold">₺{p.basePrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleVisibility(p.id)}
                                title={p.isPublishedToMarketplace !== false ? 'Marketplace\'ten gizle' : 'Marketplace\'te yayınla'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  p.isPublishedToMarketplace !== false
                                    ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-green-500'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'
                                }`}
                              >
                                {p.isPublishedToMarketplace !== false
                                  ? <Eye size={16} />
                                  : <EyeOff size={16} />}
                              </button>
                              <Link href={`/dashboard/ecommerce/${p.id}/edit`}>
                                <button className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-500 transition-colors">
                                  <PencilLine size={16} />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
