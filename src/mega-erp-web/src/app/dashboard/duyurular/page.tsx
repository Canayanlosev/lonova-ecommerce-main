"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Megaphone, Plus, Pin, PinOff, Bell, AlertTriangle, Info, CheckCircle,
  PartyPopper, X, Edit2, Trash2, Save, Search, Eye, EyeOff, Filter,
  Calendar, Users, Tag, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type AnnouncementType = "bilgi" | "uyarı" | "acil" | "başarı" | "etkinlik";
type AnnouncementStatus = "aktif" | "taslak" | "sona_erdi";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  pinned: boolean;
  departments: string[];
  author: string;
  createdAt: string;
  expiresAt: string | null;
  readBy: string[];
  viewCount: number;
  attachmentName: string | null;
}

interface AnnouncementForm {
  title: string;
  content: string;
  type: AnnouncementType;
  departments: string[];
  expiresAt: string;
  attachmentName: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "bilgi", label: "Bilgi", icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "uyarı", label: "Uyarı", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "acil", label: "Acil", icon: Bell, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { value: "başarı", label: "Başarı", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "etkinlik", label: "Etkinlik", icon: PartyPopper, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
];

const DEPARTMENTS = ["Tüm Ekip", "Satış", "Depo & Lojistik", "Muhasebe", "İnsan Kaynakları", "Teknoloji", "Pazarlama", "Yönetim"];

const STORAGE_KEY = "ic-duyurular";
const CURRENT_USER = "Mevcut Kullanıcı";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ── Demo Data ─────────────────────────────────────────────────────────────────

function seedAnnouncements(): Announcement[] {
  const now = new Date();
  const dayAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const dayLater = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  return [
    {
      id: "a1", title: "🚀 Mayıs Ayı Satış Rekoru Kırıldı!", type: "başarı", status: "aktif",
      content: "Ekip olarak bu ay toplam ₺1.2M satış gerçekleştirdik! Bu, şirket tarihimizin en yüksek aylık satış rakamı. Tüm ekibe sonsuz teşekkürler. Kutlama toplantısı Cuma saat 17:00'de konferans salonunda.",
      pinned: true, departments: ["Tüm Ekip"], author: "Genel Müdür",
      createdAt: dayAgo(1), expiresAt: dayLater(7), readBy: [], viewCount: 47, attachmentName: null,
    },
    {
      id: "a2", title: "⚠️ Sistem Bakımı — Pazar 02:00-06:00", type: "uyarı", status: "aktif",
      content: "Bu pazar sabahı 02:00-06:00 saatleri arasında planlı sistem bakımı yapılacaktır. Bu süre zarfında ERP, e-ticaret ve muhasebe modülleri erişime kapalı olacaktır. Lütfen acil işlemlerinizi önceden tamamlayın.",
      pinned: true, departments: ["Tüm Ekip"], author: "Teknoloji Ekibi",
      createdAt: dayAgo(2), expiresAt: dayLater(5), readBy: [CURRENT_USER], viewCount: 62, attachmentName: null,
    },
    {
      id: "a3", title: "Yeni Depo Prosedürleri — Temmuz'dan İtibaren", type: "bilgi", status: "aktif",
      content: "1 Temmuz'dan itibaren depo operasyonlarında yeni prosedürler uygulamaya girecektir. Stok çıkışlarında çift onay sistemi, giriş kamerası zorunluluğu ve haftalık sayım rutini devreye alınacak. Detaylı prosedür el kitabı ektedir.",
      pinned: false, departments: ["Depo & Lojistik", "Muhasebe"], author: "Operasyon Müdürü",
      createdAt: dayAgo(5), expiresAt: null, readBy: [], viewCount: 28, attachmentName: "depo-prosedur-2026.pdf",
    },
    {
      id: "a4", title: "🎉 Yılın Çalışanı Ödülü — Tebrikler Zeynep!", type: "etkinlik", status: "aktif",
      content: "Bu çeyreğin 'Yılın Çalışanı' ödülü Satış ekibimizden Zeynep Kara'ya verildi. Zeynep, son 3 ayda hedefini %115 oranında aşarak tüm şirkete ilham verdi. Ödül töreni öğle yemeğinde gerçekleşecek.",
      pinned: false, departments: ["Tüm Ekip"], author: "İnsan Kaynakları",
      createdAt: dayAgo(3), expiresAt: null, readBy: [CURRENT_USER], viewCount: 89, attachmentName: null,
    },
    {
      id: "a5", title: "🚨 VPN Güvenlik Uyarısı", type: "acil", status: "aktif",
      content: "BT ekibimiz son günlerde şüpheli giriş denemelerini tespit etti. Tüm çalışanlar HEMEN şifrelerini değiştirmeli ve iki faktörlü doğrulamayı etkinleştirmelidir. Şüpheli aktivite fark ederseniz anında IT@canayanweb.com adresine bildirin.",
      pinned: false, departments: ["Tüm Ekip"], author: "BT Güvenlik",
      createdAt: dayAgo(0), expiresAt: dayLater(14), readBy: [], viewCount: 134, attachmentName: null,
    },
    {
      id: "a6", title: "Personel Yönetmeliği Güncellendi", type: "bilgi", status: "taslak",
      content: "2026 yılı personel yönetmeliği güncellemeleri tamamlandı. İzin politikası, uzaktan çalışma koşulları ve performans değerlendirme kriterleri yenilendi. Onaydan sonra yayınlanacak.",
      pinned: false, departments: ["Tüm Ekip"], author: "İnsan Kaynakları",
      createdAt: dayAgo(7), expiresAt: null, readBy: [], viewCount: 0, attachmentName: null,
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DuyurularPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState<AnnouncementType | "tümü">("tümü");
  const [filterDept, setFilterDept] = useState("Tüm Ekip");
  const [filterStatus, setFilterStatus] = useState<AnnouncementStatus | "tümü">("tümü");
  const [form, setForm] = useState<AnnouncementForm>({
    title: "", content: "", type: "bilgi", departments: ["Tüm Ekip"], expiresAt: "", attachmentName: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setAnnouncements(raw ? JSON.parse(raw) : seedAnnouncements());
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedAnnouncements()));
    } catch {
      setAnnouncements(seedAnnouncements());
    }
  }, []);

  const save = useCallback((updated: Announcement[]) => {
    setAnnouncements(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // Auto-expire check
  useEffect(() => {
    const now = new Date().toISOString();
    const updated = announcements.map(a =>
      a.status === "aktif" && a.expiresAt && a.expiresAt < now
        ? { ...a, status: "sona_erdi" as AnnouncementStatus }
        : a
    );
    if (updated.some((a, i) => a.status !== announcements[i]?.status)) save(updated);
  }, [announcements, save]);

  const stats = useMemo(() => ({
    total: announcements.filter(a => a.status === "aktif").length,
    unread: announcements.filter(a => a.status === "aktif" && !a.readBy.includes(CURRENT_USER)).length,
    pinned: announcements.filter(a => a.pinned && a.status === "aktif").length,
    drafts: announcements.filter(a => a.status === "taslak").length,
  }), [announcements]);

  const filtered = useMemo(() => {
    return announcements
      .filter(a => {
        if (filterStatus !== "tümü" && a.status !== filterStatus) return false;
        if (filterType !== "tümü" && a.type !== filterType) return false;
        if (filterDept !== "Tüm Ekip" && !a.departments.includes(filterDept) && !a.departments.includes("Tüm Ekip")) return false;
        if (searchQ && !a.title.toLowerCase().includes(searchQ.toLowerCase()) && !a.content.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.type === "acil" && b.type !== "acil") return -1;
        if (a.type !== "acil" && b.type === "acil") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, filterStatus, filterType, filterDept, searchQ]);

  function openNew() {
    setEditId(null);
    setForm({ title: "", content: "", type: "bilgi", departments: ["Tüm Ekip"], expiresAt: "", attachmentName: "" });
    setShowModal(true);
  }

  function openEdit(a: Announcement) {
    setEditId(a.id);
    setForm({
      title: a.title, content: a.content, type: a.type,
      departments: a.departments,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : "",
      attachmentName: a.attachmentName ?? "",
    });
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.title.trim()) { toast.error("Başlık gerekli"); return; }
    if (!form.content.trim()) { toast.error("İçerik gerekli"); return; }

    if (editId) {
      save(announcements.map(a => a.id === editId ? {
        ...a, title: form.title, content: form.content, type: form.type,
        departments: form.departments, expiresAt: form.expiresAt || null,
        attachmentName: form.attachmentName || null,
      } : a));
      toast.success("Duyuru güncellendi");
    } else {
      const newA: Announcement = {
        id: uid(), title: form.title, content: form.content, type: form.type,
        status: "aktif", pinned: false, departments: form.departments, author: "Siz",
        createdAt: new Date().toISOString(), expiresAt: form.expiresAt || null,
        readBy: [CURRENT_USER], viewCount: 1, attachmentName: form.attachmentName || null,
      };
      save([newA, ...announcements]);
      toast.success("Duyuru yayınlandı");
    }
    setShowModal(false);
  }

  function togglePin(id: string) {
    save(announcements.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  }

  function markRead(id: string) {
    save(announcements.map(a => a.id === id
      ? { ...a, readBy: [...new Set([...a.readBy, CURRENT_USER])], viewCount: a.viewCount + 1 }
      : a));
  }

  function publishDraft(id: string) {
    save(announcements.map(a => a.id === id ? { ...a, status: "aktif" as AnnouncementStatus } : a));
    toast.success("Duyuru yayınlandı");
  }

  function handleDelete(id: string) {
    save(announcements.filter(a => a.id !== id));
    toast.success("Silindi");
  }

  function toggleDept(dept: string) {
    if (dept === "Tüm Ekip") {
      setForm(f => ({ ...f, departments: ["Tüm Ekip"] }));
    } else {
      setForm(f => {
        const current = f.departments.filter(d => d !== "Tüm Ekip");
        if (current.includes(dept)) {
          const next = current.filter(d => d !== dept);
          return { ...f, departments: next.length > 0 ? next : ["Tüm Ekip"] };
        }
        return { ...f, departments: [...current, dept] };
      });
    }
  }

  function typeInfo(type: AnnouncementType) {
    return ANNOUNCEMENT_TYPES.find(t => t.value === type)!;
  }

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Az önce";
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return new Date(iso).toLocaleDateString("tr-TR");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">İç Duyurular</h1>
          <p className="text-slate-400 text-sm mt-1">Ekip geneli duyurular, uyarılar ve etkinlik bildirimleri</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors w-fit">
          <Plus className="w-4 h-4" />
          Duyuru Yayınla
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Aktif Duyuru</span>
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary">{stats.total}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Okunmamış</span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{stats.unread}</p>
          {stats.unread > 0 && <p className="text-xs text-amber-400/60 mt-1">Okunmayı bekliyor</p>}
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Sabitlenmiş</span>
            <Pin className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{stats.pinned}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Taslak</span>
            <EyeOff className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-300">{stats.drafts}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Duyuru ara..."
            className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Türler</option>
          {ANNOUNCEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="taslak">Taslak</option>
          <option value="sona_erdi">Sona Erdi</option>
        </select>
      </div>

      {/* Announcements */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-500">Duyuru bulunamadı</p>
          </div>
        ) : filtered.map(a => {
          const info = typeInfo(a.type);
          const TypeIcon = info.icon;
          const isRead = a.readBy.includes(CURRENT_USER);
          const isExpanded = expandedId === a.id;

          return (
            <motion.div
              key={a.id}
              layout
              className={`premium-card overflow-hidden border ${a.type === "acil" ? "border-red-500/30" : "border-border/40"} ${!isRead ? "border-l-4 border-l-primary" : ""}`}
            >
              <div
                className="p-5 cursor-pointer hover:bg-slate-800/10 transition-colors"
                onClick={() => {
                  setExpandedId(isExpanded ? null : a.id);
                  if (!isRead) markRead(a.id);
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${info.bg}`}>
                    <TypeIcon className={`w-4.5 h-4.5 ${info.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {a.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400">
                          <Pin className="w-3 h-3" /> SABİTLENDİ
                        </span>
                      )}
                      {!isRead && a.status === "aktif" && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${info.bg} ${info.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {info.label}
                      </span>
                      {a.status === "taslak" && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-500/20 text-slate-400">Taslak</span>
                      )}
                      {a.status === "sona_erdi" && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400">Sona Erdi</span>
                      )}
                    </div>
                    <h3 className={`font-bold text-sm sm:text-base ${!isRead ? "text-foreground" : "text-slate-300"}`}>{a.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>{a.author}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {relativeTime(a.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {a.viewCount}
                      </span>
                      {a.departments.map(d => (
                        <span key={d} className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {d}
                        </span>
                      ))}
                      {a.expiresAt && new Date(a.expiresAt) > new Date() && (
                        <span className="flex items-center gap-1 text-amber-400/70">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.expiresAt).toLocaleDateString("tr-TR")} sona erer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {a.status === "taslak" && (
                      <button onClick={() => publishDraft(a.id)}
                        className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        Yayınla
                      </button>
                    )}
                    <button onClick={() => togglePin(a.id)}
                      className={`p-1.5 rounded-lg transition-colors ${a.pinned ? "text-blue-400 hover:bg-blue-500/10" : "text-slate-500 hover:bg-slate-800/40"}`}>
                      {a.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/40 px-5 py-4">
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                      {a.attachmentName && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-border/40 text-xs text-slate-400 hover:text-foreground cursor-pointer transition-colors">
                          <Tag className="w-3.5 h-3.5" />
                          {a.attachmentName}
                        </div>
                      )}
                      {!isRead && (
                        <button onClick={() => markRead(a.id)}
                          className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Okundu işaretle
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
                <h2 className="text-base font-bold">{editId ? "Duyuruyu Düzenle" : "Yeni Duyuru"}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Duyuru Türü</label>
                  <div className="flex flex-wrap gap-2">
                    {ANNOUNCEMENT_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${form.type === t.value ? `${t.bg} ${t.color} border-current` : "border-border/50 text-slate-400 hover:border-border"}`}>
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Başlık</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Duyuru başlığı..."
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">İçerik</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Duyuru detayları..."
                    rows={5}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none" />
                </div>
                {/* Departments */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Hedef Departmanlar</label>
                  <div className="flex flex-wrap gap-2">
                    {DEPARTMENTS.map(d => (
                      <button key={d} onClick={() => toggleDept(d)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${form.departments.includes(d) ? "bg-primary/15 border-primary/30 text-primary" : "border-border/50 text-slate-400 hover:border-border"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Son Geçerlilik</label>
                    <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ek Dosya Adı</label>
                    <input value={form.attachmentName} onChange={e => setForm(f => ({ ...f, attachmentName: e.target.value }))}
                      placeholder="dosya.pdf"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-background">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={handleSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" />
                  {editId ? "Güncelle" : "Yayınla"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
