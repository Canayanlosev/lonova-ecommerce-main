"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Tag, Plus, X, Save, Edit2, Trash2, Search, Download, Copy,
  ChevronRight, ChevronDown, Package, TrendingDown, Users, Eye,
  Check, ToggleLeft, ToggleRight, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type ListType = "standart" | "toptan" | "kurumsal" | "vip" | "özel";

interface PriceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  basePrice: number;
  customPrice: number;
  discountPct: number; // calculated
}

interface PriceList {
  id: string;
  name: string;
  type: ListType;
  description: string;
  currency: "TRY" | "USD" | "EUR";
  active: boolean;
  validFrom: string;
  validTo: string | null;
  customerGroups: string[];
  items: PriceItem[];
  createdAt: string;
}

interface ListForm {
  name: string;
  type: ListType;
  description: string;
  currency: "TRY" | "USD" | "EUR";
  validFrom: string;
  validTo: string;
  customerGroups: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LIST_TYPE_LABELS: Record<ListType, string> = {
  standart: "Standart", toptan: "Toptan", kurumsal: "Kurumsal", vip: "VIP", özel: "Özel"
};
const LIST_TYPE_COLORS: Record<ListType, string> = {
  standart: "bg-slate-500/15 text-slate-300",
  toptan: "bg-blue-500/15 text-blue-400",
  kurumsal: "bg-purple-500/15 text-purple-400",
  vip: "bg-amber-500/15 text-amber-400",
  özel: "bg-emerald-500/15 text-emerald-400",
};

const CUSTOMER_GROUPS = ["Tüm Müşteriler", "Bireysel", "Bayiler", "Kurumsal", "Distribütörler", "İhracat"];

const STORAGE_KEY = "fiyat-listeleri";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number, currency = "TRY") => {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";
  return sym + n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_PRODUCTS = [
  { id: "p1", name: "Laptop Pro 15\"", sku: "LP-001", category: "Bilgisayar", basePrice: 45000 },
  { id: "p2", name: "Kablosuz Mouse", sku: "KM-002", category: "Aksesuar", basePrice: 450 },
  { id: "p3", name: "Mekanik Klavye", sku: "MK-003", category: "Aksesuar", basePrice: 1200 },
  { id: "p4", name: "USB-C Hub 7 Port", sku: "UH-004", category: "Aksesuar", basePrice: 650 },
  { id: "p5", name: "Monitör 27\" 4K", sku: "MN-005", category: "Ekran", basePrice: 18500 },
  { id: "p6", name: "Webcam 1080p", sku: "WC-006", category: "Kamera", basePrice: 1800 },
  { id: "p7", name: "Kulaklık Bluetooth", sku: "KB-007", category: "Ses", basePrice: 2400 },
  { id: "p8", name: "Telefon Tutucu", sku: "TT-008", category: "Aksesuar", basePrice: 120 },
];

function makeItems(discountPct: number): PriceItem[] {
  return DEMO_PRODUCTS.map(p => {
    const customPrice = parseFloat((p.basePrice * (1 - discountPct / 100)).toFixed(2));
    return {
      id: uid(), productId: p.id, productName: p.name, sku: p.sku,
      category: p.category, basePrice: p.basePrice, customPrice, discountPct,
    };
  });
}

function seedLists(): PriceList[] {
  return [
    {
      id: "l1", name: "Standart Fiyat Listesi", type: "standart", currency: "TRY",
      description: "Tüm müşteriler için varsayılan perakende fiyatları",
      active: true, validFrom: "2026-01-01", validTo: null,
      customerGroups: ["Tüm Müşteriler"],
      items: makeItems(0),
      createdAt: "2026-01-01",
    },
    {
      id: "l2", name: "Bayi Fiyat Listesi", type: "toptan", currency: "TRY",
      description: "Bayi ve distribütörler için %15 indirimli fiyatlar",
      active: true, validFrom: "2026-01-01", validTo: null,
      customerGroups: ["Bayiler", "Distribütörler"],
      items: makeItems(15),
      createdAt: "2026-01-05",
    },
    {
      id: "l3", name: "Kurumsal Fiyat Listesi", type: "kurumsal", currency: "TRY",
      description: "Kurumsal müşteriler için %20 indirimli fiyatlar",
      active: true, validFrom: "2026-02-01", validTo: "2026-12-31",
      customerGroups: ["Kurumsal"],
      items: makeItems(20),
      createdAt: "2026-02-01",
    },
    {
      id: "l4", name: "VIP Müşteri Fiyatları", type: "vip", currency: "TRY",
      description: "Stratejik ortaklar için özel %30 indirimli fiyatlar",
      active: true, validFrom: "2026-01-01", validTo: null,
      customerGroups: ["Distribütörler"],
      items: makeItems(30),
      createdAt: "2026-01-10",
    },
    {
      id: "l5", name: "İhracat Fiyat Listesi", type: "özel", currency: "USD",
      description: "İhracat müşterileri için USD bazlı fiyatlar",
      active: false, validFrom: "2026-03-01", validTo: null,
      customerGroups: ["İhracat"],
      items: DEMO_PRODUCTS.map(p => ({
        id: uid(), productId: p.id, productName: p.name, sku: p.sku, category: p.category,
        basePrice: p.basePrice, customPrice: parseFloat((p.basePrice / 34).toFixed(2)), discountPct: 0,
      })),
      createdAt: "2026-03-01",
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FiyatListesiPage() {
  const toast = useToast();
  const [lists, setLists] = useState<PriceList[]>([]);
  const [activePriceListId, setActivePriceListId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState<ListType | "tümü">("tümü");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [form, setForm] = useState<ListForm>({
    name: "", type: "standart", description: "", currency: "TRY",
    validFrom: new Date().toISOString().slice(0, 10), validTo: "",
    customerGroups: ["Tüm Müşteriler"],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded: PriceList[] = raw ? JSON.parse(raw) : seedLists();
      setLists(loaded);
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    } catch {
      setLists(seedLists());
    }
  }, []);

  const save = useCallback((updated: PriceList[]) => {
    setLists(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const activeList = useMemo(() => lists.find(l => l.id === activePriceListId), [lists, activePriceListId]);

  const stats = useMemo(() => ({
    total: lists.length,
    active: lists.filter(l => l.active).length,
    expired: lists.filter(l => l.validTo && l.validTo < new Date().toISOString().slice(0, 10)).length,
  }), [lists]);

  const filteredLists = useMemo(() => lists.filter(l => {
    if (filterType !== "tümü" && l.type !== filterType) return false;
    if (searchQ && !l.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [lists, filterType, searchQ]);

  function openNew() {
    setEditId(null);
    setForm({ name: "", type: "standart", description: "", currency: "TRY", validFrom: new Date().toISOString().slice(0, 10), validTo: "", customerGroups: ["Tüm Müşteriler"] });
    setShowModal(true);
  }

  function openEdit(list: PriceList) {
    setEditId(list.id);
    setForm({ name: list.name, type: list.type, description: list.description, currency: list.currency, validFrom: list.validFrom, validTo: list.validTo ?? "", customerGroups: list.customerGroups });
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Liste adı gerekli"); return; }
    if (editId) {
      save(lists.map(l => l.id === editId ? { ...l, ...form, validTo: form.validTo || null } : l));
      toast.success("Fiyat listesi güncellendi");
    } else {
      const newList: PriceList = {
        id: uid(), ...form, validTo: form.validTo || null,
        active: true, createdAt: new Date().toISOString().slice(0, 10),
        items: makeItems(0),
      };
      save([...lists, newList]);
      toast.success("Fiyat listesi oluşturuldu");
      setActivePriceListId(newList.id);
    }
    setShowModal(false);
  }

  function toggleActive(id: string) {
    save(lists.map(l => l.id === id ? { ...l, active: !l.active } : l));
  }

  function duplicateList(list: PriceList) {
    const dupe: PriceList = { ...list, id: uid(), name: `${list.name} (Kopya)`, createdAt: new Date().toISOString().slice(0, 10), active: false, items: list.items.map(i => ({ ...i, id: uid() })) };
    save([...lists, dupe]);
    toast.success("Liste kopyalandı");
  }

  function saveItemPrice(listId: string, itemId: string, priceStr: string) {
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) return;
    save(lists.map(l => l.id === listId ? {
      ...l,
      items: l.items.map(item => {
        if (item.id !== itemId) return item;
        const discountPct = item.basePrice > 0 ? parseFloat(((1 - price / item.basePrice) * 100).toFixed(1)) : 0;
        return { ...item, customPrice: price, discountPct: Math.max(0, discountPct) };
      })
    } : l));
    setEditingItemId(null);
  }

  function applyBulkDiscount(listId: string, pct: number) {
    save(lists.map(l => l.id === listId ? {
      ...l,
      items: l.items.map(item => {
        const customPrice = parseFloat((item.basePrice * (1 - pct / 100)).toFixed(2));
        return { ...item, customPrice, discountPct: pct };
      })
    } : l));
    toast.success(`%${pct} toplu indirim uygulandı`);
  }

  function exportCSV(list: PriceList) {
    const header = "SKU,Ürün,Kategori,Liste Fiyatı,Özel Fiyat,İndirim %";
    const rows = list.items.map(i =>
      [i.sku, `"${i.productName}"`, i.category, i.basePrice, i.customPrice, i.discountPct].join(",")
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${list.name.replace(/\s/g, "_")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  function toggleGroup(dept: string) {
    if (dept === "Tüm Müşteriler") {
      setForm(f => ({ ...f, customerGroups: ["Tüm Müşteriler"] }));
    } else {
      setForm(f => {
        const current = f.customerGroups.filter(d => d !== "Tüm Müşteriler");
        if (current.includes(dept)) {
          const next = current.filter(d => d !== dept);
          return { ...f, customerGroups: next.length > 0 ? next : ["Tüm Müşteriler"] };
        }
        return { ...f, customerGroups: [...current, dept] };
      });
    }
  }

  // ── Price List Detail View ──────────────────────────────────────────────────

  if (activeList) {
    const [bulkDiscount, setBulkDiscount] = useState("");

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActivePriceListId(null)}
            className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
            ← Geri
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black">{activeList.name}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${LIST_TYPE_COLORS[activeList.type]}`}>
                {LIST_TYPE_LABELS[activeList.type]}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${activeList.active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                {activeList.active ? "Aktif" : "Pasif"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activeList.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <input type="number" value={bulkDiscount} onChange={e => setBulkDiscount(e.target.value)}
                placeholder="%"
                className="w-16 text-center bg-slate-800/60 border border-border/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-primary/60" />
              <button onClick={() => { const pct = parseFloat(bulkDiscount); if (!isNaN(pct) && pct >= 0 && pct <= 100) { applyBulkDiscount(activeList.id, pct); setBulkDiscount(""); } else toast.error("Geçerli bir oran girin"); }}
                className="px-3 py-1.5 bg-primary/15 text-primary rounded-xl text-xs font-bold hover:bg-primary/25 transition-colors">
                Toplu İndir
              </button>
            </div>
            <button onClick={() => exportCSV(activeList)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Ürün</th>
                  <th className="text-left px-4 py-3 font-semibold">Kategori</th>
                  <th className="text-right px-4 py-3 font-semibold">Liste Fiyatı</th>
                  <th className="text-center px-4 py-3 font-semibold w-36">Özel Fiyat</th>
                  <th className="text-right px-4 py-3 font-semibold">İndirim</th>
                  <th className="text-right px-4 py-3 font-semibold">Tasarruf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {activeList.items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.category}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400 line-through">{fmt(item.basePrice, activeList.currency)}</td>
                    <td className="px-4 py-3 text-center">
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input type="number" value={editingPrice} onChange={e => setEditingPrice(e.target.value)}
                            autoFocus
                            className="w-28 text-center bg-slate-700/60 border border-primary/40 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none" />
                          <button onClick={() => saveItemPrice(activeList.id, item.id, editingPrice)}
                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingItemId(null)}
                            className="p-1 rounded text-slate-400 hover:bg-slate-800/40">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingItemId(item.id); setEditingPrice(String(item.customPrice)); }}
                          className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                        >
                          {fmt(item.customPrice, activeList.currency)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.discountPct > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold">
                          <TrendingDown className="w-3 h-3" />
                          -%{item.discountPct}
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                      {item.discountPct > 0 ? fmt(item.basePrice - item.customPrice, activeList.currency) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Lists View ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Fiyat Listeleri</h1>
          <p className="text-slate-400 text-sm mt-1">B2B müşteri segmentlerine göre özel fiyat listeleri</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors w-fit">
          <Plus className="w-4 h-4" />
          Yeni Liste
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam Liste</span>
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary">{stats.total}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Aktif</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{stats.active}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Süresi Dolmuş</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">{stats.expired}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Liste ara..."
            className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Türler</option>
          {(Object.keys(LIST_TYPE_LABELS) as ListType[]).map(t => (
            <option key={t} value={t}>{LIST_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredLists.map(list => {
          const avgDiscount = list.items.length > 0
            ? Math.round(list.items.reduce((s, i) => s + i.discountPct, 0) / list.items.length)
            : 0;
          const isExpired = list.validTo && list.validTo < new Date().toISOString().slice(0, 10);

          return (
            <div key={list.id} className={`premium-card p-5 flex flex-col gap-4 hover:border-primary/20 transition-colors ${isExpired ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${LIST_TYPE_COLORS[list.type]}`}>
                      {LIST_TYPE_LABELS[list.type]}
                    </span>
                    {isExpired && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400">Süresi Doldu</span>}
                  </div>
                  <h3 className="font-bold text-sm leading-tight">{list.name}</h3>
                  {list.description && <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{list.description}</p>}
                </div>
                <button onClick={() => toggleActive(list.id)} className="shrink-0">
                  {list.active
                    ? <ToggleRight className="w-6 h-6 text-emerald-400 hover:text-emerald-300 transition-colors" />
                    : <ToggleLeft className="w-6 h-6 text-slate-500 hover:text-slate-400 transition-colors" />
                  }
                </button>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                  <p className="text-slate-500">Ürün</p>
                  <p className="font-bold text-foreground">{list.items.length}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                  <p className="text-slate-500">Ort. İndirim</p>
                  <p className={`font-bold ${avgDiscount > 0 ? "text-red-400" : "text-slate-400"}`}>
                    {avgDiscount > 0 ? `-%${avgDiscount}` : "—"}
                  </p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-2 text-center">
                  <p className="text-slate-500">Para</p>
                  <p className="font-bold text-slate-300">{list.currency}</p>
                </div>
              </div>

              {/* Customer groups */}
              <div className="flex flex-wrap gap-1">
                {list.customerGroups.map(g => (
                  <span key={g} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-700/60 text-[10px] text-slate-400">
                    <Users className="w-2.5 h-2.5" />
                    {g}
                  </span>
                ))}
              </div>

              {/* Validity */}
              <div className="text-xs text-slate-500">
                <span>{new Date(list.validFrom).toLocaleDateString("tr-TR")}</span>
                {list.validTo && <span> — {new Date(list.validTo).toLocaleDateString("tr-TR")}</span>}
                {!list.validTo && <span> — Süresiz</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <button onClick={() => setActivePriceListId(list.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  Fiyatları Gör
                </button>
                <button onClick={() => exportCSV(list)}
                  className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors text-slate-400">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => duplicateList(list)}
                  className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors text-slate-400">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openEdit(list)}
                  className="p-2 rounded-xl border border-border/60 hover:bg-blue-500/10 text-blue-400 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { save(lists.filter(l => l.id !== list.id)); toast.success("Silindi"); }}
                  className="p-2 rounded-xl border border-border/60 hover:bg-red-500/10 text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {filteredLists.length === 0 && (
          <div className="col-span-full premium-card p-12 text-center">
            <Tag className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-500">Fiyat listesi bulunamadı</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
                <h2 className="text-base font-bold">{editId ? "Listeyi Düzenle" : "Yeni Fiyat Listesi"}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Liste Adı</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ör. Bayi Fiyat Listesi Q3"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Liste Türü</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ListType }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {(Object.keys(LIST_TYPE_LABELS) as ListType[]).map(t => (
                        <option key={t} value={t}>{LIST_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Para Birimi</label>
                    <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as "TRY" | "USD" | "EUR" }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Geçerlilik Başlangıcı</label>
                    <input type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Geçerlilik Bitişi</label>
                    <input type="date" value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Hedef Müşteri Grupları</label>
                  <div className="flex flex-wrap gap-2">
                    {CUSTOMER_GROUPS.map(g => (
                      <button key={g} onClick={() => toggleGroup(g)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${form.customerGroups.includes(g) ? "bg-primary/15 border-primary/30 text-primary" : "border-border/50 text-slate-400 hover:border-border"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={handleSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" />
                  {editId ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
