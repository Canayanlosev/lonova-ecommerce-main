"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FolderOpen, Plus, X, Save, Edit2, Trash2, Search, Download,
  CheckCircle, Clock, AlertTriangle, Pause, XCircle, Users,
  DollarSign, Calendar, BarChart2, ArrowLeft, ChevronDown,
  ChevronUp, Target, Flag, Circle, CheckSquare, Plus as PlusIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type ProjectStatus = "taslak" | "aktif" | "beklemede" | "tamamlandı" | "iptal";
type Priority = "düşük" | "orta" | "yüksek" | "kritik";

interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number; // 0-100
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  owner: string;
  team: string[];
  tags: string[];
  milestones: Milestone[];
  createdAt: string;
}

interface ProjectForm {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  progress: string;
  budget: string;
  spent: string;
  startDate: string;
  endDate: string;
  owner: string;
  team: string;
  tags: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProjectStatus, string> = {
  taslak: "Taslak", aktif: "Aktif", beklemede: "Beklemede", tamamlandı: "Tamamlandı", iptal: "İptal"
};
const STATUS_COLORS: Record<ProjectStatus, string> = {
  taslak: "bg-slate-500/15 text-slate-300",
  aktif: "bg-emerald-500/15 text-emerald-400",
  beklemede: "bg-amber-500/15 text-amber-400",
  tamamlandı: "bg-blue-500/15 text-blue-400",
  iptal: "bg-red-500/15 text-red-400",
};
const STATUS_ICONS: Record<ProjectStatus, React.ElementType> = {
  taslak: Circle, aktif: CheckCircle, beklemede: Pause, tamamlandı: CheckSquare, iptal: XCircle
};

const PRIORITY_COLORS: Record<Priority, string> = {
  düşük: "text-slate-400", orta: "text-blue-400", yüksek: "text-amber-400", kritik: "text-red-400"
};
const PRIORITY_BG: Record<Priority, string> = {
  düşük: "bg-slate-500/10", orta: "bg-blue-500/10", yüksek: "bg-amber-500/10", kritik: "bg-red-500/10"
};

const STORAGE_KEY = "proje-takibi";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number) => "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0 });
const fmtShort = (n: number) => n >= 1_000_000 ? "₺" + (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? "₺" + (n / 1_000).toFixed(0) + "K" : fmt(n);

function addDays(iso: string, days: number) {
  const d = new Date(iso); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

function seedProjects(): Project[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "p1", name: "CanayanWeb ERP v2.0 Geçişi", description: "Mevcut sistemi yeni modüler mimariye taşıma projesi",
      status: "aktif", priority: "kritik", progress: 65,
      budget: 250000, spent: 162000,
      startDate: "2026-01-15", endDate: addDays(today, 45),
      owner: "Ahmet Y.", team: ["Zeynep K.", "Murat D.", "Selin Ç.", "Burak A."],
      tags: ["teknoloji", "altyapı"],
      milestones: [
        { id: uid(), title: "Mimari Tasarım Onayı", dueDate: "2026-02-01", completed: true, completedAt: "2026-01-30" },
        { id: uid(), title: "Backend API Geliştirme", dueDate: "2026-04-01", completed: true, completedAt: "2026-03-28" },
        { id: uid(), title: "Frontend Entegrasyonu", dueDate: addDays(today, 15), completed: false, completedAt: null },
        { id: uid(), title: "UAT Testleri", dueDate: addDays(today, 35), completed: false, completedAt: null },
        { id: uid(), title: "Canlı Geçiş", dueDate: addDays(today, 45), completed: false, completedAt: null },
      ],
      createdAt: "2026-01-10",
    },
    {
      id: "p2", name: "İstanbul Depo Genişletme", description: "Kapasite yetersizliği nedeniyle ek depo alanı kiralama ve kurulum",
      status: "aktif", priority: "yüksek", progress: 40,
      budget: 180000, spent: 72000,
      startDate: "2026-03-01", endDate: addDays(today, 60),
      owner: "Selin Ç.", team: ["Murat D.", "Ali R."],
      tags: ["lojistik", "altyapı"],
      milestones: [
        { id: uid(), title: "Alan Araştırması", dueDate: "2026-03-15", completed: true, completedAt: "2026-03-14" },
        { id: uid(), title: "Kira Sözleşmesi", dueDate: "2026-04-01", completed: true, completedAt: "2026-03-30" },
        { id: uid(), title: "Raf Sistemi Montajı", dueDate: addDays(today, 30), completed: false, completedAt: null },
        { id: uid(), title: "WMS Entegrasyonu", dueDate: addDays(today, 55), completed: false, completedAt: null },
      ],
      createdAt: "2026-02-20",
    },
    {
      id: "p3", name: "Dijital Pazarlama Kampanyası Q2", description: "Google Ads, Meta ve influencer kampanyaları koordinasyonu",
      status: "tamamlandı", priority: "orta", progress: 100,
      budget: 85000, spent: 78500,
      startDate: "2026-04-01", endDate: "2026-05-31",
      owner: "Zeynep K.", team: ["Burak A.", "Elif T."],
      tags: ["pazarlama", "büyüme"],
      milestones: [
        { id: uid(), title: "Strateji Hazırlığı", dueDate: "2026-04-07", completed: true, completedAt: "2026-04-06" },
        { id: uid(), title: "Kampanya Lansmanı", dueDate: "2026-04-15", completed: true, completedAt: "2026-04-15" },
        { id: uid(), title: "Midterm Optimizasyon", dueDate: "2026-05-01", completed: true, completedAt: "2026-04-30" },
        { id: uid(), title: "Sonuç Raporu", dueDate: "2026-05-31", completed: true, completedAt: "2026-05-28" },
      ],
      createdAt: "2026-03-25",
    },
    {
      id: "p4", name: "ISO 9001 Sertifikasyon Süreci", description: "Kalite yönetim sistemi kurulumu ve dış denetim hazırlığı",
      status: "beklemede", priority: "yüksek", progress: 25,
      budget: 45000, spent: 11200,
      startDate: "2026-05-01", endDate: addDays(today, 120),
      owner: "Murat D.", team: ["Ahmet Y.", "Selin Ç."],
      tags: ["kalite", "sertifikasyon"],
      milestones: [
        { id: uid(), title: "Gap Analizi", dueDate: "2026-05-15", completed: true, completedAt: "2026-05-14" },
        { id: uid(), title: "Prosedür Dokümantasyonu", dueDate: addDays(today, 30), completed: false, completedAt: null },
        { id: uid(), title: "İç Denetim", dueDate: addDays(today, 75), completed: false, completedAt: null },
        { id: uid(), title: "Dış Denetim", dueDate: addDays(today, 115), completed: false, completedAt: null },
      ],
      createdAt: "2026-04-20",
    },
    {
      id: "p5", name: "Müşteri Portalı Geliştirme", description: "B2B müşterilerin sipariş, fatura ve tekliflerini görebileceği self-servis portal",
      status: "taslak", priority: "orta", progress: 5,
      budget: 120000, spent: 5000,
      startDate: addDays(today, 14), endDate: addDays(today, 120),
      owner: "Burak A.", team: ["Ahmet Y.", "Zeynep K."],
      tags: ["teknoloji", "müşteri"],
      milestones: [
        { id: uid(), title: "Gereksinim Analizi", dueDate: addDays(today, 21), completed: false, completedAt: null },
        { id: uid(), title: "Prototip Onayı", dueDate: addDays(today, 45), completed: false, completedAt: null },
        { id: uid(), title: "Beta Sürümü", dueDate: addDays(today, 90), completed: false, completedAt: null },
      ],
      createdAt: today,
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProjelerPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "tümü">("tümü");
  const [filterPriority, setFilterPriority] = useState<Priority | "tümü">("tümü");
  const [newMilestone, setNewMilestone] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [form, setForm] = useState<ProjectForm>({
    name: "", description: "", status: "taslak", priority: "orta",
    progress: "0", budget: "", spent: "0",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: addDays(new Date().toISOString().slice(0, 10), 90),
    owner: "", team: "", tags: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setProjects(raw ? JSON.parse(raw) : seedProjects());
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProjects()));
    } catch {
      setProjects(seedProjects());
    }
  }, []);

  const save = useCallback((updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const stats = useMemo(() => {
    const active = projects.filter(p => p.status === "aktif").length;
    const completed = projects.filter(p => p.status === "tamamlandı").length;
    const overBudget = projects.filter(p => p.spent > p.budget).length;
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
    const overdueProjects = projects.filter(p => {
      if (p.status === "tamamlandı" || p.status === "iptal") return false;
      return p.endDate < new Date().toISOString().slice(0, 10);
    }).length;
    return { active, completed, overBudget, totalBudget, totalSpent, overdueProjects };
  }, [projects]);

  const filtered = useMemo(() => projects.filter(p => {
    if (filterStatus !== "tümü" && p.status !== filterStatus) return false;
    if (filterPriority !== "tümü" && p.priority !== filterPriority) return false;
    if (searchQ && !p.name.toLowerCase().includes(searchQ.toLowerCase()) && !p.tags.join(" ").includes(searchQ.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const order: Record<Priority, number> = { kritik: 0, yüksek: 1, orta: 2, düşük: 3 };
    return order[a.priority] - order[b.priority];
  }), [projects, filterStatus, filterPriority, searchQ]);

  function openNew() {
    setEditId(null);
    setForm({ name: "", description: "", status: "taslak", priority: "orta", progress: "0", budget: "", spent: "0", startDate: new Date().toISOString().slice(0, 10), endDate: addDays(new Date().toISOString().slice(0, 10), 90), owner: "", team: "", tags: "" });
    setShowModal(true);
  }

  function openEdit(p: Project) {
    setEditId(p.id);
    setForm({ name: p.name, description: p.description, status: p.status, priority: p.priority, progress: String(p.progress), budget: String(p.budget), spent: String(p.spent), startDate: p.startDate, endDate: p.endDate, owner: p.owner, team: p.team.join(", "), tags: p.tags.join(", ") });
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Proje adı gerekli"); return; }
    const data = { name: form.name, description: form.description, status: form.status, priority: form.priority, progress: parseInt(form.progress) || 0, budget: parseFloat(form.budget) || 0, spent: parseFloat(form.spent) || 0, startDate: form.startDate, endDate: form.endDate, owner: form.owner, team: form.team.split(",").map(s => s.trim()).filter(Boolean), tags: form.tags.split(",").map(s => s.trim()).filter(Boolean) };
    if (editId) {
      save(projects.map(p => p.id === editId ? { ...p, ...data } : p));
      toast.success("Proje güncellendi");
    } else {
      save([{ id: uid(), ...data, milestones: [], createdAt: new Date().toISOString().slice(0, 10) }, ...projects]);
      toast.success("Proje oluşturuldu");
    }
    setShowModal(false);
  }

  function toggleMilestone(projectId: string, milestoneId: string) {
    save(projects.map(p => p.id === projectId ? {
      ...p,
      milestones: p.milestones.map(m => m.id === milestoneId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString().slice(0, 10) : null }
        : m
      )
    } : p));
  }

  function addMilestone(projectId: string) {
    if (!newMilestone.trim()) return;
    save(projects.map(p => p.id === projectId ? {
      ...p,
      milestones: [...p.milestones, { id: uid(), title: newMilestone, dueDate: newMilestoneDate || addDays(new Date().toISOString().slice(0, 10), 30), completed: false, completedAt: null }]
    } : p));
    setNewMilestone("");
    setNewMilestoneDate("");
    toast.success("Milestone eklendi");
  }

  function deleteMilestone(projectId: string, milestoneId: string) {
    save(projects.map(p => p.id === projectId ? { ...p, milestones: p.milestones.filter(m => m.id !== milestoneId) } : p));
  }

  function updateProgress(projectId: string, value: number) {
    save(projects.map(p => p.id === projectId ? { ...p, progress: value } : p));
  }

  // ── Detail View ────────────────────────────────────────────────────────────

  if (activeProject) {
    const StatusIcon = STATUS_ICONS[activeProject.status];
    const milestonesDone = activeProject.milestones.filter(m => m.completed).length;
    const overBudget = activeProject.spent > activeProject.budget;
    const daysLeft = Math.ceil((new Date(activeProject.endDate).getTime() - Date.now()) / 86400000);
    const isOverdue = daysLeft < 0 && activeProject.status !== "tamamlandı" && activeProject.status !== "iptal";

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveProjectId(null)}
            className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-black">{activeProject.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[activeProject.status]}`}>
                <StatusIcon className="w-3 h-3" />
                {STATUS_LABELS[activeProject.status]}
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${PRIORITY_BG[activeProject.priority]} ${PRIORITY_COLORS[activeProject.priority]}`}>
                <Flag className="w-3 h-3 inline mr-1" />
                {activeProject.priority.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activeProject.description}</p>
          </div>
          <button onClick={() => openEdit(activeProject)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border/60 rounded-xl text-xs hover:bg-slate-800/40 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
            Düzenle
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Progress + Milestones */}
          <div className="lg:col-span-2 space-y-5">
            {/* Progress */}
            <div className="premium-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">İlerleme</h3>
                <span className="text-lg font-black text-primary">%{activeProject.progress}</span>
              </div>
              <input type="range" min="0" max="100" value={activeProject.progress}
                onChange={e => updateProgress(activeProject.id, Number(e.target.value))}
                className="w-full accent-primary cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{new Date(activeProject.startDate).toLocaleDateString("tr-TR")}</span>
                <span className={isOverdue ? "text-red-400" : daysLeft <= 7 ? "text-amber-400" : ""}>
                  {isOverdue ? `${Math.abs(daysLeft)} gün gecikti!` : `${daysLeft} gün kaldı`}
                </span>
                <span>{new Date(activeProject.endDate).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>

            {/* Milestones */}
            <div className="premium-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Kilometre Taşları</h3>
                <span className="text-xs text-slate-400">{milestonesDone}/{activeProject.milestones.length} tamamlandı</span>
              </div>
              <div className="space-y-2">
                {activeProject.milestones.map((m, idx) => {
                  const isLate = !m.completed && m.dueDate < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={m.id} className="flex items-center gap-3 group">
                      <button onClick={() => toggleMilestone(activeProject.id, m.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${m.completed ? "bg-emerald-500 border-emerald-500" : isLate ? "border-red-400 hover:border-red-300" : "border-slate-600 hover:border-primary"}`}>
                        {m.completed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${m.completed ? "line-through text-slate-500" : ""}`}>{m.title}</p>
                      </div>
                      <span className={`text-xs shrink-0 ${m.completed ? "text-emerald-400" : isLate ? "text-red-400" : "text-slate-500"}`}>
                        {m.completed && m.completedAt ? new Date(m.completedAt).toLocaleDateString("tr-TR") : new Date(m.dueDate).toLocaleDateString("tr-TR")}
                      </span>
                      <button onClick={() => deleteMilestone(activeProject.id, m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-400 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {/* Add milestone */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                    placeholder="Yeni milestone ekle..."
                    className="flex-1 bg-slate-800/40 border border-border/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary/60"
                    onKeyDown={e => e.key === "Enter" && addMilestone(activeProject.id)} />
                  <input type="date" value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)}
                    className="bg-slate-800/40 border border-border/50 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-primary/60 w-32" />
                  <button onClick={() => addMilestone(activeProject.id)}
                    className="p-1.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors">
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sidebar info */}
          <div className="space-y-4">
            {/* Budget */}
            <div className="premium-card p-4">
              <h3 className="text-xs font-bold text-slate-400 mb-3">Bütçe</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Toplam Bütçe</span>
                  <span className="font-bold">{fmt(activeProject.budget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Harcanan</span>
                  <span className={`font-bold ${overBudget ? "text-red-400" : "text-emerald-400"}`}>{fmt(activeProject.spent)}</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, activeProject.budget > 0 ? (activeProject.spent / activeProject.budget) * 100 : 0)}%` }} />
                </div>
                <p className={`text-xs ${overBudget ? "text-red-400" : "text-emerald-400"}`}>
                  {overBudget ? `${fmt(activeProject.spent - activeProject.budget)} bütçe aşımı` : `${fmt(activeProject.budget - activeProject.spent)} kaldı`}
                </p>
              </div>
            </div>

            {/* Team */}
            <div className="premium-card p-4">
              <h3 className="text-xs font-bold text-slate-400 mb-3">Ekip</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {activeProject.owner.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{activeProject.owner}</p>
                    <p className="text-[10px] text-slate-500">Proje Sahibi</p>
                  </div>
                </div>
                {activeProject.team.map(member => (
                  <div key={member} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-400">
                      {member.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <p className="text-xs">{member}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {activeProject.tags.length > 0 && (
              <div className="premium-card p-4">
                <h3 className="text-xs font-bold text-slate-400 mb-3">Etiketler</h3>
                <div className="flex flex-wrap gap-1.5">
                  {activeProject.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Projects List ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Proje Takibi</h1>
          <p className="text-slate-400 text-sm mt-1">İşletme projelerini, ekipleri ve bütçeleri tek yerden yönetin</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors w-fit">
          <Plus className="w-4 h-4" />
          Yeni Proje
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Aktif Proje</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{stats.active}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam Bütçe</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{fmtShort(stats.totalBudget)}</p>
          <p className="text-xs text-slate-500 mt-1">Harcanan: {fmtShort(stats.totalSpent)}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bütçe Aşımı</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{stats.overBudget}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Geciken</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">{stats.overdueProjects}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Proje veya etiket ara..."
            className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as typeof filterPriority)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Öncelikler</option>
          <option value="kritik">Kritik</option>
          <option value="yüksek">Yüksek</option>
          <option value="orta">Orta</option>
          <option value="düşük">Düşük</option>
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(project => {
          const StatusIcon = STATUS_ICONS[project.status];
          const milestonesDone = project.milestones.filter(m => m.completed).length;
          const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);
          const isOverdue = daysLeft < 0 && project.status !== "tamamlandı" && project.status !== "iptal";
          const overBudget = project.spent > project.budget;

          return (
            <div key={project.id}
              className="premium-card p-5 flex flex-col gap-4 cursor-pointer hover:border-primary/25 transition-colors"
              onClick={() => setActiveProjectId(project.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_COLORS[project.status]}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {STATUS_LABELS[project.status]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${PRIORITY_BG[project.priority]} ${PRIORITY_COLORS[project.priority]}`}>
                      {project.priority}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400">GECİKTİ</span>
                    )}
                    {overBudget && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400">BÜTÇE AŞIMI</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm">{project.name}</h3>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">İlerleme</span>
                  <span className={`font-bold ${project.progress === 100 ? "text-emerald-400" : "text-primary"}`}>%{project.progress}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${project.progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="text-slate-500">Bütçe</p>
                  <p className="font-bold">{fmtShort(project.budget)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Milestone</p>
                  <p className="font-bold">{milestonesDone}/{project.milestones.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">{isOverdue ? "Gecikme" : "Kalan"}</p>
                  <p className={`font-bold ${isOverdue ? "text-red-400" : daysLeft <= 7 ? "text-amber-400" : ""}`}>
                    {Math.abs(daysLeft)}g
                  </p>
                </div>
              </div>

              {/* Team + Tags */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[project.owner, ...project.team].slice(0, 4).map((member, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary">
                      {member.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                  ))}
                  {(project.team.length + 1) > 4 && (
                    <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-background flex items-center justify-center text-[10px] font-bold text-slate-400">
                      +{project.team.length + 1 - 4}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {project.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full premium-card p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-500">Proje bulunamadı</p>
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
                <h2 className="text-base font-bold">{editId ? "Projeyi Düzenle" : "Yeni Proje"}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Proje Adı</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ör. ERP Geçişi Q3"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Durum</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Öncelik</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      <option value="düşük">Düşük</option>
                      <option value="orta">Orta</option>
                      <option value="yüksek">Yüksek</option>
                      <option value="kritik">Kritik</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bütçe (₺)</label>
                    <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Harcanan (₺)</label>
                    <input type="number" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Başlangıç</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bitiş</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Proje Sahibi</label>
                  <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="Ad Soyad"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ekip <span className="text-slate-500">(virgülle ayır)</span></label>
                  <input value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                    placeholder="Zeynep K., Murat D."
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Etiketler <span className="text-slate-500">(virgülle ayır)</span></label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="teknoloji, pazarlama"
                    className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
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
