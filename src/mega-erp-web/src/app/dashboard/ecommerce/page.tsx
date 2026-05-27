"use client";

import React, { useEffect, useState } from "react";

import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Package, Search, PencilLine, Trash2, Plus, AlertCircle, Eye, EyeOff, CheckSquare, Square, X, Copy, Percent, DollarSign, Filter, Upload, Download, FileText, CheckCircle2, Loader2 } from "lucide-react";
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

  // CSV Import
  const [csvModal, setCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState<Array<{ name: string; sku: string; basePrice: number; categoryId: string; description: string; imageUrl: string; status: 'pending' | 'ok' | 'error'; error?: string }>>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvDone, setCsvDone] = useState(false);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV dosyası boş veya geçersiz.'); return; }
      // Skip header line; expected columns: name;sku;basePrice;categoryId;description;imageUrl
      const parsed = lines.slice(1).map(line => {
        const parts = line.split(/[;,]/).map(p => p.trim().replace(/^"|"$/g, ''));
        const [name = '', sku = '', priceRaw = '0', categoryId = '', description = '', imageUrl = ''] = parts;
        const basePrice = parseFloat(priceRaw.replace(',', '.')) || 0;
        return { name, sku, basePrice, categoryId, description, imageUrl, status: 'pending' as const };
      }).filter(r => r.name && r.sku);
      setCsvRows(parsed);
      setCsvDone(false);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    const api = (await import('@/lib/api')).default;
    const updated = [...csvRows];
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (r.status === 'ok') continue;
      try {
        await api.post('/api/ecommerce/products', {
          name: r.name,
          sku: r.sku,
          basePrice: r.basePrice,
          categoryId: r.categoryId || undefined,
          description: r.description || undefined,
          imageUrl: r.imageUrl || undefined,
        });
        updated[i] = { ...r, status: 'ok' };
      } catch {
        updated[i] = { ...r, status: 'error', error: 'API hatası' };
      }
      setCsvRows([...updated]);
    }
    setCsvImporting(false);
    setCsvDone(true);
    const successCount = updated.filter(r => r.status === 'ok').length;
    toast.success(`${successCount} ürün içe aktarıldı.`);
    if (successCount > 0) load();
  };

  const handleDownloadTemplate = () => {
    const csv = `name;sku;basePrice;categoryId;description;imageUrl
Örnek Ürün;SKU-001;99.90;;Ürün açıklaması;https://
Başka Ürün;SKU-002;149.90;;;`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'urun-import-sablonu.csv'; a.click();
    URL.revokeObjectURL(url);
  };
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

  const handleExportCsv = () => {
    const rows = [
      ['name', 'sku', 'basePrice', 'categoryId', 'description', 'imageUrl'],
      ...filtered.map(p => [
        p.name,
        p.sku,
        String(p.basePrice),
        p.categoryId ?? '',
        p.description ?? '',
        p.imageUrl ?? '',
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `urunler-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
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

  // ── Product stats ─────────────────────────────────────────────────────────
  const productStats = React.useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.isPublishedToMarketplace !== false).length,
    hidden: products.filter(p => p.isPublishedToMarketplace === false).length,
  }), [products])

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={products.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-slate-950/20 text-slate-400 hover:text-white hover:border-primary/45 transition-all text-xs font-bold disabled:opacity-40"
          >
            <Download size={14} /> CSV Dışa Aktar
          </button>
          <button
            onClick={() => { setCsvRows([]); setCsvDone(false); setCsvModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-slate-950/20 text-slate-400 hover:text-white hover:border-primary/45 transition-all text-xs font-bold"
          >
            <Upload size={14} /> CSV İçe Aktar
          </button>
          <Link href="/dashboard/ecommerce/new">
            <Button className="flex items-center gap-2">
              <Plus size={16} /> Yeni Ürün
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Package size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Toplam Ürün</p>
              <p className="text-xl font-black text-foreground">{productStats.total}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Eye size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Yayında</p>
              <p className="text-xl font-black text-emerald-400">{productStats.published}</p>
            </div>
          </div>
          <div className="premium-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center shrink-0">
              <EyeOff size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Gizli</p>
              <p className="text-xl font-black text-foreground">{productStats.hidden}</p>
            </div>
          </div>
        </div>
      )}

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
                className="px-3 py-1.5 rounded-lg border border-border bg-slate-900/40 text-xs outline-none focus:ring-2 focus:ring-primary/50 text-slate-400 font-semibold"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {/* Visibility filter */}
              <div className="flex rounded-lg border border-border/80 bg-slate-950/20 dark:bg-slate-900/60 p-0.5 text-xs">
                {(['all', 'published', 'hidden'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setVisibilityFilter(v); setSelectedIds(new Set()); }}
                    className={`px-3 py-1 rounded-md font-semibold transition-all duration-200 ${
                      visibilityFilter === v
                        ? 'bg-surface text-primary border border-border/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
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
                <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <span className="text-sm font-semibold text-primary">{selectedIds.size} ürün seçili</span>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => handleBulkVisibility(true)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50 font-semibold"
                    >
                      <Eye size={13} /> Yayınla
                    </button>
                    <button
                      onClick={() => handleBulkVisibility(false)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-colors disabled:opacity-50 font-semibold"
                    >
                      <EyeOff size={13} /> Gizle
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 font-semibold"
                    >
                      <Trash2 size={13} /> {bulkLoading ? 'Siliniyor...' : 'Sil'}
                    </button>
                    <button
                      onClick={() => setPriceModal(true)}
                      disabled={bulkLoading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 font-semibold"
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
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">SKU</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Ürün Adı</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Kategori</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Fiyat</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">İşlemler</th>
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
                        <tr key={p.id} className={`border-b border-border hover:bg-primary/5 hover:border-primary/10 transition-colors ${selectedIds.has(p.id) ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                          <td className="px-3 py-3">
                            <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-primary transition-colors">
                              {selectedIds.has(p.id)
                                ? <CheckSquare size={16} className="text-primary" />
                                : <Square size={16} />
                              }
                            </button>
                          </td>
                          <td className="px-2 py-2 hidden sm:table-cell">
                            <div className="w-9 h-9 rounded-lg bg-slate-950/20 dark:bg-slate-900/60 border border-border/40 overflow-hidden shrink-0 flex items-center justify-center">
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
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.sku}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/ecommerce/${p.id}`} className="font-semibold hover:text-primary transition-colors text-foreground">
                                {p.name}
                              </Link>
                              {p.isPublishedToMarketplace === false && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-border/50 font-semibold">Gizli</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 hidden md:table-cell font-medium">{p.category?.name || "-"}</td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">₺{p.basePrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleVisibility(p.id)}
                                title={p.isPublishedToMarketplace !== false ? 'Marketplace\'ten gizle' : 'Marketplace\'te yayınla'}
                                className={`p-1.5 rounded-lg border border-transparent hover:border-border transition-colors ${
                                  p.isPublishedToMarketplace !== false
                                    ? 'hover:bg-slate-800/20 text-emerald-500'
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
                                className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-amber-500/10 text-amber-500 transition-colors"
                              >
                                <Copy size={15} />
                              </button>
                              <Link href={`/dashboard/ecommerce/${p.id}/edit`}>
                                <button className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-primary/10 text-primary transition-colors">
                                  <PencilLine size={16} />
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-red-500/10 text-red-500 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/80">
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
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${priceType === 'Percent' ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border/60 text-slate-500 hover:bg-slate-950/15'}`}
                  >
                    <Percent size={14} /> Yüzde (%)
                  </button>
                  <button
                    onClick={() => setPriceType('Fixed')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${priceType === 'Fixed' ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border/60 text-slate-500 hover:bg-slate-950/15'}`}
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
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-slate-950/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={e => e.key === 'Enter' && handleBulkPrice()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setPriceModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-foreground">İptal</button>
              <button
                onClick={handleBulkPrice}
                disabled={priceApplying || !priceValue}
                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all"
              >
                {priceApplying ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Percent size={14} />}
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-border/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-slate-950/20 shrink-0">
              <div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" /> CSV Ürün İçe Aktar
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Sütunlar: name;sku;basePrice;categoryId;description;imageUrl
                </p>
              </div>
              <button onClick={() => setCsvModal(false)} className="p-1.5 rounded-xl border border-border text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Format help */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary leading-relaxed">
                <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <strong className="font-bold">CSV Formatı:</strong> İlk satır başlık (atlanır).
                  Sütunlar: <code className="bg-slate-800 px-1 rounded font-mono">name;sku;basePrice;categoryId;description;imageUrl</code>
                  <br />
                  <strong className="font-bold">Not:</strong> categoryId boş bırakılabilir. Ondalık için nokta kullanın (99.90).
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-primary hover:bg-primary/90 text-white text-xs font-bold cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" /> CSV Dosyası Seç
                  <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="hidden" />
                </label>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 text-slate-400 hover:text-white text-xs font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Şablon İndir
                </button>
              </div>

              {/* Preview table */}
              {csvRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    {csvRows.length} Ürün Önizleme
                  </p>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-xl border border-border/80">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-950/40 text-[10px] text-slate-400 font-black uppercase">
                        <tr>
                          <th className="text-left px-3 py-2">Ad</th>
                          <th className="text-left px-3 py-2">SKU</th>
                          <th className="text-right px-3 py-2">Fiyat</th>
                          <th className="text-center px-3 py-2">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {csvRows.map((r, i) => (
                          <tr key={i} className={r.status === 'ok' ? 'bg-emerald-500/5' : r.status === 'error' ? 'bg-red-500/5' : ''}>
                            <td className="px-3 py-2 font-semibold text-foreground truncate max-w-[160px]">{r.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{r.sku}</td>
                            <td className="px-3 py-2 text-right font-mono">₺{r.basePrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              {r.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />}
                              {r.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />}
                              {r.status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-600 mx-auto" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {csvDone && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      İçe aktarma tamamlandı. {csvRows.filter(r => r.status === 'ok').length} ürün eklendi
                      {csvRows.filter(r => r.status === 'error').length > 0 && `, ${csvRows.filter(r => r.status === 'error').length} hata`}.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/80 shrink-0">
              <button onClick={() => setCsvModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-foreground transition-colors">
                {csvDone ? 'Kapat' : 'İptal'}
              </button>
              {csvRows.length > 0 && !csvDone && (
                <button
                  onClick={handleCsvImport}
                  disabled={csvImporting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all disabled:opacity-60"
                >
                  {csvImporting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aktarılıyor…</>
                    : <><Upload className="w-3.5 h-3.5" /> {csvRows.length} Ürün Aktar</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
