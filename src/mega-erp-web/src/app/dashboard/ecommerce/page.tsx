"use client";

import React, { useEffect, useState } from "react";

import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Package, Search, PencilLine, Trash2, Plus, AlertCircle, Eye, EyeOff, CheckSquare, Square, X, Copy, Percent, DollarSign, Filter } from "lucide-react";
import { productsService } from "@/lib/services/products.service";
import { useToast } from "@/store/ui.store";
import type { Product, Category } from "@/types/api.types";
import Link from "next/link";
import Image from "next/image";

export default function EcommercePage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Bulk price modal
  const [priceModal, setPriceModal] = useState(false);
  const [priceType, setPriceType] = useState<'Percent' | 'Fixed'>('Percent');
  const [priceValue, setPriceValue] = useState('');
  const [priceApplying, setPriceApplying] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, cats] = await Promise.all([
        productsService.getAll(),
        productsService.getCategories().catch(() => [] as Category[]),
      ]);
      setProducts(data);
      setCategories(cats);
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

  const handleClone = async (id: string, name: string) => {
    try {
      const cloned = await productsService.clone(id);
      toast.success(`"${name}" kopyalandı → "${cloned.name}"`);
      load();
    } catch {
      toast.error('Ürün kopyalanamadı.');
    }
  };

  const handleBulkPrice = async () => {
    const val = parseFloat(priceValue);
    if (isNaN(val)) { toast.error('Geçerli bir değer giriniz.'); return; }
    if (selectedIds.size === 0) { toast.error('Ürün seçiniz.'); return; }
    setPriceApplying(true);
    try {
      const result = await productsService.bulkPrice([...selectedIds], priceType, val);
      toast.success(`${result.updated} ürünün fiyatı güncellendi.`);
      setPriceModal(false);
      setPriceValue('');
      setSelectedIds(new Set());
      load();
    } catch {
      toast.error('Fiyat güncellenemedi.');
    } finally {
      setPriceApplying(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.categoryId === categoryFilter;
    const matchVisibility =
      visibilityFilter === 'all' ? true :
      visibilityFilter === 'published' ? p.isPublishedToMarketplace !== false :
      p.isPublishedToMarketplace === false;
    return matchSearch && matchCategory && matchVisibility;
  });

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

      <div className="premium-card p-6">
        <div className="mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Ürün Listesi
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {loading ? '' : `${filtered.length} / ${products.length} ürün`}
                </span>
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ad veya SKU ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-transparent outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                />
              </div>
            </div>
            {/* Filters row */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setSelectedIds(new Set()); }}
                className="px-3 py-1.5 rounded-lg border border-border bg-transparent text-xs outline-none focus:ring-2 focus:ring-primary/50 text-slate-400"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {/* Visibility filter */}
              <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                {(['all', 'published', 'hidden'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setVisibilityFilter(v); setSelectedIds(new Set()); }}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      visibilityFilter === v
                        ? 'bg-primary/15 text-primary'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {v === 'all' ? 'Tümü' : v === 'published' ? '● Yayında' : '○ Gizli'}
                  </button>
                ))}
              </div>
              {/* Clear filters */}
              {(categoryFilter || visibilityFilter !== 'all' || search) && (
                <button
                  onClick={() => { setCategoryFilter(''); setVisibilityFilter('all'); setSearch(''); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={12} /> Temizle
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
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
                <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-primary/10 border border-primary/20 rounded-xl">
                  <span className="text-sm font-semibold text-primary">{selectedIds.size} ürün seçili</span>
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
                    <button
                      onClick={() => setPriceModal(true)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                    >
                      <Percent size={13} /> Fiyat Güncelle
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg hover:bg-slate-800/20 text-slate-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 w-10">
                        <button onClick={toggleSelectAll} className="text-slate-400 hover:text-foreground transition-colors">
                          {filtered.length > 0 && selectedIds.size === filtered.length
                            ? <CheckSquare size={16} className="text-primary" />
                            : <Square size={16} />
                          }
                        </button>
                      </th>
                      <th className="w-10 px-2 py-3 hidden sm:table-cell" />
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
                          <td colSpan={7}>
                            <EmptyState icon={<Package />} title="Ürün bulunamadı" description="Henüz ürün eklenmemiş veya arama sonucu boş." />
                          </td>
                        </tr>
                      )
                      : filtered.map((p) => (
                        <tr key={p.id} className={`border-b border-border hover:bg-slate-800/20 transition-colors ${selectedIds.has(p.id) ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-3">
                            <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-primary transition-colors">
                              {selectedIds.has(p.id)
                                ? <CheckSquare size={16} className="text-primary" />
                                : <Square size={16} />
                              }
                            </button>
                          </td>
                          <td className="px-2 py-2 hidden sm:table-cell">
                            <div className="w-9 h-9 rounded-lg bg-slate-800/60 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.imageUrl ? (
                                <Image
                                  src={p.imageUrl}
                                  alt={p.name}
                                  width={36}
                                  height={36}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/ecommerce/${p.id}`} className="font-semibold hover:text-primary transition-colors">
                                {p.name}
                              </Link>
                              {p.isPublishedToMarketplace === false && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-medium">Gizli</span>
                              )}
                            </div>
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
                                    ? 'hover:bg-slate-800/20 text-green-500'
                                    : 'hover:bg-slate-800/20 text-slate-400'
                                }`}
                              >
                                {p.isPublishedToMarketplace !== false
                                  ? <Eye size={16} />
                                  : <EyeOff size={16} />}
                              </button>
                              <button
                                onClick={() => handleClone(p.id, p.name)}
                                title="Kopyala"
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors"
                              >
                                <Copy size={15} />
                              </button>
                              <Link href={`/dashboard/ecommerce/${p.id}/edit`}>
                                <button className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                                  <PencilLine size={16} />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
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
        </div>
      </div>

      {/* Bulk Price Modal */}
      {priceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-background rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">Toplu Fiyat Güncelle</h2>
              <button onClick={() => setPriceModal(false)} className="p-1.5 rounded-lg hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-400">{selectedIds.size} ürünün fiyatı güncellenecek.</p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Güncelleme Tipi</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPriceType('Percent')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${priceType === 'Percent' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-slate-500'}`}
                  >
                    <Percent size={14} /> Yüzde (%)
                  </button>
                  <button
                    onClick={() => setPriceType('Fixed')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${priceType === 'Fixed' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-slate-500'}`}
                  >
                    <DollarSign size={14} /> Sabit (₺)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {priceType === 'Percent' ? 'Yüzde Değişim (+ artır, - azalt)' : 'Sabit Değişim (₺)'}
                </label>
                <input
                  type="number"
                  value={priceValue}
                  onChange={e => setPriceValue(e.target.value)}
                  placeholder={priceType === 'Percent' ? 'Örn: -10 (%10 indirim), 5 (%5 artış)' : 'Örn: -50 (50₺ indirim), 100 (100₺ artış)'}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleBulkPrice()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setPriceModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-foreground">İptal</button>
              <button
                onClick={handleBulkPrice}
                disabled={priceApplying || !priceValue}
                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {priceApplying ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Percent size={14} />}
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
