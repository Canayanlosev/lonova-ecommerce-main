"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen, Plus, X, Save, Edit2, Trash2, Search, Download,
  CheckCircle, Clock, AlertTriangle, Users, Award, TrendingUp,
  Calendar, ArrowLeft, Filter, Play, GraduationCap, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type TrainingType = "dahili" | "harici" | "online" | "sertifika" | "oryantasyon";
type TrainingStatus = "planlandi" | "devam_ediyor" | "tamamlandi" | "iptal";
type EnrollStatus = "kayitli" | "devam_ediyor" | "tamamladi" | "basarisiz" | "iptal";

interface Enrollment {
  id: string;
  employeeName: string;
  department: string;
  status: EnrollStatus;
  score: number | null; // 0-100
  completedAt: string | null;
  certExpiresAt: string | null;
  notes: string;
}

interface Training {
  id: string;
  title: string;
  type: TrainingType;
  description: string;
  provider: string;
  instructor: string;
  status: TrainingStatus;
  startDate: string;
  endDate: string;
  durationHours: number;
  maxCapacity: number;
  budget: number;
  spent: number;
  isMandatory: boolean;
  certificationName: string | null;
  certValidityMonths: number | null;
  enrollments: Enrollment[];
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TrainingType, string> = {
  dahili: "Dahili", harici: "Harici", online: "Online", sertifika: "Sertifika", oryantasyon: "Oryantasyon"
};
const TYPE_COLORS: Record<TrainingType, string> = {
  dahili: "bg-blue-500/15 text-blue-400",
  harici: "bg-purple-500/15 text-purple-400",
  online: "bg-cyan-500/15 text-cyan-400",
  sertifika: "bg-amber-500/15 text-amber-400",
  oryantasyon: "bg-emerald-500/15 text-emerald-400",
};
const STATUS_LABELS: Record<TrainingStatus, string> = {
  planlandi: "Planlandı", devam_ediyor: "Devam Ediyor", tamamlandi: "Tamamlandı", iptal: "İptal"
};
const STATUS_COLORS: Record<TrainingStatus, string> = {
  planlandi: "bg-slate-500/15 text-slate-300",
  devam_ediyor: "bg-amber-500/15 text-amber-400",
  tamamlandi: "bg-emerald-500/15 text-emerald-400",
  iptal: "bg-red-500/15 text-red-400",
};
const ENROLL_STATUS_LABELS: Record<EnrollStatus, string> = {
  kayitli: "Kayıtlı", devam_ediyor: "Devam Ediyor", tamamladi: "Tamamladı", basarisiz: "Başarısız", iptal: "İptal"
};
const ENROLL_STATUS_COLORS: Record<EnrollStatus, string> = {
  kayitli: "bg-blue-500/15 text-blue-400",
  devam_ediyor: "bg-amber-500/15 text-amber-400",
  tamamladi: "bg-emerald-500/15 text-emerald-400",
  basarisiz: "bg-red-500/15 text-red-400",
  iptal: "bg-slate-500/15 text-slate-400",
};

const STORAGE_KEY = "egitim-yonetimi";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number) => "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0 });
const addMonths = (dateStr: string, n: number) => {
  const d = new Date(dateStr); d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

// ── Demo Data ─────────────────────────────────────────────────────────────────

function seedTrainings(): Training[] {
  const today = new Date().toISOString().slice(0, 10);

  const employees = [
    { name: "Zeynep Kara", dept: "Satış" },
    { name: "Murat Demir", dept: "Lojistik" },
    { name: "Burak Aslan", dept: "Teknoloji" },
    { name: "Elif Taş", dept: "Pazarlama" },
    { name: "Ahmet Yılmaz", dept: "Yönetim" },
    { name: "Selin Çelik", dept: "İK" },
  ];

  function makeEnrollments(statuses: EnrollStatus[], scores: (number | null)[]): Enrollment[] {
    return employees.slice(0, statuses.length).map((e, i) => ({
      id: uid(), employeeName: e.name, department: e.dept,
      status: statuses[i], score: scores[i],
      completedAt: statuses[i] === "tamamladi" ? addMonths(today, -1) : null,
      certExpiresAt: statuses[i] === "tamamladi" && scores[i] && scores[i]! >= 70 ? addMonths(today, 24) : null,
      notes: "",
    }));
  }

  return [
    {
      id: "t1", title: "İş Güvenliği ve OSGB Eğitimi", type: "sertifika",
      description: "Yasal zorunlu iş güvenliği temel eğitimi. Tüm personel için yıllık zorunludur.",
      provider: "OSGB Türkiye", instructor: "Dr. Kemal Aydın",
      status: "tamamlandi", isMandatory: true,
      startDate: "2026-03-01", endDate: "2026-03-01", durationHours: 8,
      maxCapacity: 20, budget: 6000, spent: 5800,
      certificationName: "İş Güvenliği Temel Sertifikası",
      certValidityMonths: 12,
      enrollments: makeEnrollments(["tamamladi", "tamamladi", "tamamladi", "tamamladi", "tamamladi", "tamamladi"], [88, 92, 78, 85, 95, 82]),
      createdAt: "2026-02-15",
    },
    {
      id: "t2", title: "Advanced React & Next.js Workshop", type: "harici",
      description: "React 19 ve Next.js 16 ile modern frontend geliştirme teknikleri",
      provider: "Frontend Masters TR", instructor: "Yiğit Duman",
      status: "devam_ediyor", isMandatory: false,
      startDate: "2026-05-20", endDate: addMonths(today, 1), durationHours: 24,
      maxCapacity: 5, budget: 15000, spent: 12000,
      certificationName: "React 19 Specialist",
      certValidityMonths: null,
      enrollments: makeEnrollments(["devam_ediyor", "devam_ediyor", "kayitli"], [null, null, null]),
      createdAt: "2026-04-10",
    },
    {
      id: "t3", title: "Satış Teknikleri ve Müzakere", type: "dahili",
      description: "B2B satış metodolojisi, müzakere taktikleri ve CRM kullanımı",
      provider: "İç Eğitim", instructor: "Ahmet Yılmaz",
      status: "tamamlandi", isMandatory: false,
      startDate: "2026-04-15", endDate: "2026-04-17", durationHours: 16,
      maxCapacity: 10, budget: 3000, spent: 2400,
      certificationName: null, certValidityMonths: null,
      enrollments: makeEnrollments(["tamamladi", "tamamladi", "tamamladi"], [91, 76, 88]),
      createdAt: "2026-04-01",
    },
    {
      id: "t4", title: "KVKK & GDPR Uyumluluk Eğitimi", type: "online",
      description: "Kişisel veri koruma kanunu, GDPR uyumluluk gereklilikleri ve pratik uygulamalar",
      provider: "Udemy Business", instructor: "Online Kurs",
      status: "devam_ediyor", isMandatory: true,
      startDate: "2026-05-01", endDate: addMonths(today, 2), durationHours: 6,
      maxCapacity: 50, budget: 4500, spent: 1200,
      certificationName: "KVKK Uyumluluk Sertifikası",
      certValidityMonths: 24,
      enrollments: makeEnrollments(["tamamladi", "devam_ediyor", "devam_ediyor", "devam_ediyor", "kayitli", "devam_ediyor"], [84, null, null, null, null, null]),
      createdAt: "2026-04-20",
    },
    {
      id: "t5", title: "Yeni Personel Oryantasyon Programı", type: "oryantasyon",
      description: "Şirket kültürü, süreçler, sistemler ve ilk 30 gün rehberi",
      provider: "İK Birimi", instructor: "Selin Çelik",
      status: "planlandi", isMandatory: true,
      startDate: addMonths(today, 1), endDate: addMonths(today, 1), durationHours: 8,
      maxCapacity: 5, budget: 1500, spent: 0,
      certificationName: null, certValidityMonths: null,
      enrollments: [],
      createdAt: today,
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function EgitimPage() {
  const toast = useToast();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TrainingStatus | "tümü">("tümü");
  const [filterType, setFilterType] = useState<TrainingType | "tümü">("tümü");
  const [searchQ, setSearchQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newEnrollName, setNewEnrollName] = useState("");
  const [newEnrollDept, setNewEnrollDept] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setTrainings(raw ? JSON.parse(raw) : seedTrainings());
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTrainings()));
    } catch {
      setTrainings(seedTrainings());
    }
  }, []);

  const save = useCallback((updated: Training[]) => {
    setTrainings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const active = useMemo(() => trainings.find(t => t.id === activeId), [trainings, activeId]);

  const stats = useMemo(() => {
    const allEnroll = trainings.flatMap(t => t.enrollments);
    const completed = allEnroll.filter(e => e.status === "tamamladi");
    const certValid = allEnroll.filter(e => e.certExpiresAt && e.certExpiresAt > new Date().toISOString().slice(0, 10));
    const expiringSoon = allEnroll.filter(e => {
      if (!e.certExpiresAt) return false;
      const daysLeft = (new Date(e.certExpiresAt).getTime() - Date.now()) / 86400000;
      return daysLeft >= 0 && daysLeft <= 30;
    });
    const totalBudget = trainings.reduce((s, t) => s + t.budget, 0);
    const totalSpent = trainings.reduce((s, t) => s + t.spent, 0);
    return { totalTrainings: trainings.length, totalEnroll: allEnroll.length, completed: completed.length, certValid: certValid.length, expiringSoon: expiringSoon.length, totalBudget, totalSpent };
  }, [trainings]);

  // Department completion chart
  const deptChart = useMemo(() => {
    const depts: Record<string, { total: number; done: number }> = {};
    trainings.flatMap(t => t.enrollments).forEach(e => {
      if (!depts[e.department]) depts[e.department] = { total: 0, done: 0 };
      depts[e.department].total++;
      if (e.status === "tamamladi") depts[e.department].done++;
    });
    return Object.entries(depts).map(([name, d]) => ({
      name, rate: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0
    }));
  }, [trainings]);

  const filtered = useMemo(() => trainings.filter(t => {
    if (filterStatus !== "tümü" && t.status !== filterStatus) return false;
    if (filterType !== "tümü" && t.type !== filterType) return false;
    if (searchQ && !t.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [trainings, filterStatus, filterType, searchQ]);

  function addEnrollment(trainingId: string) {
    if (!newEnrollName.trim()) { toast.error("Ad gerekli"); return; }
    save(trainings.map(t => t.id !== trainingId ? t : {
      ...t, enrollments: [...t.enrollments, {
        id: uid(), employeeName: newEnrollName, department: newEnrollDept,
        status: "kayitli", score: null, completedAt: null, certExpiresAt: null, notes: "",
      }]
    }));
    setNewEnrollName(""); setNewEnrollDept("");
    toast.success("Kayıt yapıldı");
  }

  function updateEnrollStatus(trainingId: string, enrollId: string, status: EnrollStatus, score?: number) {
    save(trainings.map(t => t.id !== trainingId ? t : {
      ...t, enrollments: t.enrollments.map(e => e.id !== enrollId ? e : {
        ...e, status,
        score: score ?? e.score,
        completedAt: status === "tamamladi" ? new Date().toISOString().slice(0, 10) : null,
        certExpiresAt: status === "tamamladi" && (score ?? e.score ?? 0) >= 70 && t.certValidityMonths
          ? addMonths(new Date().toISOString().slice(0, 10), t.certValidityMonths) : e.certExpiresAt,
      })
    }));
  }

  function exportCSV() {
    const header = "Eğitim,Tür,Çalışan,Departman,Durum,Puan,Tamamlanma,Sertifika Bitiş";
    const rows = trainings.flatMap(t => t.enrollments.map(e =>
      [t.title, t.type, e.employeeName, e.department, ENROLL_STATUS_LABELS[e.status], e.score ?? "—", e.completedAt ?? "—", e.certExpiresAt ?? "—"].join(",")
    ));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "egitim-raporu.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  // ── Detail View ────────────────────────────────────────────────────────────

  if (active) {
    const completionRate = active.enrollments.length > 0
      ? Math.round(active.enrollments.filter(e => e.status === "tamamladi").length / active.enrollments.length * 100)
      : 0;
    const avgScore = active.enrollments.filter(e => e.score !== null).length > 0
      ? (active.enrollments.filter(e => e.score !== null).reduce((s, e) => s + (e.score ?? 0), 0) / active.enrollments.filter(e => e.score !== null).length).toFixed(1)
      : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveId(null)}
            className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-black">{active.title}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${TYPE_COLORS[active.type]}`}>{TYPE_LABELS[active.type]}</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[active.status]}`}>{STATUS_LABELS[active.status]}</span>
              {active.isMandatory && <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400">ZORUNLU</span>}
            </div>
            <p className="text-xs text-slate-400">{active.provider} · {active.instructor} · {active.durationHours}s</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="premium-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Kayıt</p>
            <p className="text-2xl font-black">{active.enrollments.length}/{active.maxCapacity}</p>
          </div>
          <div className="premium-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Tamamlama</p>
            <p className={`text-2xl font-black ${completionRate === 100 ? "text-emerald-400" : "text-primary"}`}>%{completionRate}</p>
          </div>
          <div className="premium-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Ort. Puan</p>
            <p className="text-2xl font-black text-amber-400">{avgScore ?? "—"}</p>
          </div>
          <div className="premium-card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Bütçe Kul.</p>
            <p className={`text-xl font-black ${active.spent > active.budget ? "text-red-400" : "text-emerald-400"}`}>
              {fmt(active.spent)}/{fmt(active.budget)}
            </p>
          </div>
        </div>

        {/* Enrollments */}
        <div className="premium-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h3 className="text-sm font-bold">Katılımcılar</h3>
            {active.status !== "tamamlandi" && active.status !== "iptal" && (
              <div className="flex items-center gap-2">
                <input value={newEnrollName} onChange={e => setNewEnrollName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="bg-slate-800/60 border border-border/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-primary/60 w-32" />
                <input value={newEnrollDept} onChange={e => setNewEnrollDept(e.target.value)}
                  placeholder="Departman"
                  className="bg-slate-800/60 border border-border/60 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-primary/60 w-28" />
                <button onClick={() => addEnrollment(active.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
                  <Plus className="w-3 h-3" /> Kayıt
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-slate-500">
                  <th className="text-left px-4 py-3 font-semibold">Çalışan</th>
                  <th className="text-center px-4 py-3 font-semibold">Durum</th>
                  <th className="text-center px-4 py-3 font-semibold">Puan</th>
                  <th className="text-center px-4 py-3 font-semibold">Tamamlanma</th>
                  {active.certificationName && <th className="text-center px-4 py-3 font-semibold">Sertifika Bitiş</th>}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {active.enrollments.map(e => {
                  const certExpiring = e.certExpiresAt && (new Date(e.certExpiresAt).getTime() - Date.now()) / 86400000 <= 30;
                  return (
                    <tr key={e.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {e.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-xs">{e.employeeName}</p>
                            <p className="text-[10px] text-slate-500">{e.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select value={e.status}
                          onChange={ev => updateEnrollStatus(active.id, e.id, ev.target.value as EnrollStatus)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer border-0 focus:outline-none ${ENROLL_STATUS_COLORS[e.status]}`}>
                          {(Object.keys(ENROLL_STATUS_LABELS) as EnrollStatus[]).map(s => (
                            <option key={s} value={s} className="bg-background text-foreground">{ENROLL_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.status === "tamamladi" || e.status === "basarisiz" ? (
                          <input type="number" min="0" max="100" defaultValue={e.score ?? ""}
                            onBlur={ev => updateEnrollStatus(active.id, e.id, e.status, Number(ev.target.value))}
                            className="w-14 text-center bg-slate-800/60 border border-border/60 rounded-lg px-1 py-0.5 text-xs focus:outline-none" />
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">
                        {e.completedAt ? new Date(e.completedAt).toLocaleDateString("tr-TR") : "—"}
                      </td>
                      {active.certificationName && (
                        <td className="px-4 py-3 text-center">
                          {e.certExpiresAt ? (
                            <span className={`text-xs font-bold ${certExpiring ? "text-amber-400" : "text-emerald-400"}`}>
                              {new Date(e.certExpiresAt).toLocaleDateString("tr-TR")}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <button onClick={() => save(trainings.map(t => t.id !== active.id ? t : { ...t, enrollments: t.enrollments.filter(en => en.id !== e.id) }))}
                          className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {active.enrollments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500 text-sm">Henüz kayıtlı yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Eğitim & Sertifikasyon</h1>
          <p className="text-slate-400 text-sm mt-1">Personel eğitim programları, sertifika takibi ve tamamlama oranları</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Eğitim Ekle
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam Eğitim</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary">{stats.totalTrainings}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Kayıt</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{stats.totalEnroll}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Tamamlayan</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{stats.completed}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Geçerli Sertifika</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{stats.certValid}</p>
          {stats.expiringSoon > 0 && <p className="text-xs text-red-400 mt-1">{stats.expiringSoon} sona eriyor</p>}
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bütçe</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-sm font-black text-purple-400">{fmt(stats.totalSpent)}</p>
          <p className="text-xs text-slate-500 mt-1">/{fmt(stats.totalBudget)}</p>
        </div>
      </div>

      {/* Dept Completion Chart */}
      {deptChart.length > 0 && (
        <div className="premium-card p-5">
          <h3 className="text-sm font-bold mb-4">Departman Bazlı Tamamlama Oranı</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deptChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `%${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={80} />
              <Tooltip formatter={(v) => `%${v}`} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="rate" name="Tamamlama %" radius={[0, 3, 3, 0]}>
                {deptChart.map((entry, i) => (
                  <Cell key={i} fill={entry.rate >= 80 ? "#22c55e" : entry.rate >= 50 ? "#eab308" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Eğitim ara..."
            className="w-full bg-slate-800/60 border border-border/60 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Türler</option>
          {(Object.keys(TYPE_LABELS) as TrainingType[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.keys(STATUS_LABELS) as TrainingStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Trainings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(t => {
          const completionRate = t.enrollments.length > 0
            ? Math.round(t.enrollments.filter(e => e.status === "tamamladi").length / t.enrollments.length * 100)
            : 0;
          return (
            <div key={t.id}
              onClick={() => setActiveId(t.id)}
              className="premium-card p-5 cursor-pointer hover:border-primary/20 transition-colors flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${TYPE_COLORS[t.type]}`}>
                      {TYPE_LABELS[t.type]}
                    </span>
                    {t.isMandatory && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400">ZORUNLU</span>}
                    {t.certificationName && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400"><Award className="w-2.5 h-2.5" />SERTİFİKA</span>}
                  </div>
                  <h3 className="font-bold text-sm">{t.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t.provider}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(t.startDate).toLocaleDateString("tr-TR")}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.durationHours}s</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.enrollments.length}/{t.maxCapacity}</span>
              </div>
              {t.enrollments.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Tamamlama</span>
                    <span className={`font-bold ${completionRate === 100 ? "text-emerald-400" : "text-primary"}`}>%{completionRate}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${completionRate === 100 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{fmt(t.spent)}/{fmt(t.budget)}</span>
                {t.certificationName && <span className="text-amber-400 truncate max-w-[60%] text-right">{t.certificationName}</span>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full premium-card p-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-500">Eğitim bulunamadı</p>
          </div>
        )}
      </div>

      {/* Modal (simplified) */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold">Yeni Eğitim Programı</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <EgitimForm
                onSave={(data) => {
                  save([{ id: uid(), ...data, enrollments: [], createdAt: new Date().toISOString().slice(0, 10) }, ...trainings]);
                  toast.success("Eğitim oluşturuldu");
                  setShowModal(false);
                }}
                onCancel={() => setShowModal(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Inline Form Component ──────────────────────────────────────────────────────

function EgitimForm({ onSave, onCancel }: { onSave: (data: Omit<Training, "id" | "enrollments" | "createdAt">) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "", type: "dahili" as TrainingType, description: "", provider: "", instructor: "",
    status: "planlandi" as TrainingStatus, startDate: today, endDate: today,
    durationHours: "8", maxCapacity: "20", budget: "0", spent: "0",
    isMandatory: false, certificationName: "", certValidityMonths: "",
  });

  return (
    <div className="space-y-3">
      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Eğitim adı *"
        className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as TrainingType }))}
          className="bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
          {(Object.keys(TYPE_LABELS) as TrainingType[]).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
          placeholder="Sağlayıcı"
          className="bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
          className="bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        <input type="number" value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))}
          placeholder="Süre (saat)"
          className="bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
          placeholder="Bütçe ₺"
          className="bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
        <input value={form.certificationName} onChange={e => setForm(f => ({ ...f, certificationName: e.target.value }))}
          placeholder="Sertifika adı (isteğe bağlı)"
          className="bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="mandatory" checked={form.isMandatory} onChange={e => setForm(f => ({ ...f, isMandatory: e.target.checked }))}
          className="w-4 h-4 accent-primary" />
        <label htmlFor="mandatory" className="text-sm text-slate-300">Zorunlu Eğitim</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
          İptal
        </button>
        <button onClick={() => {
          if (!form.title.trim()) return;
          onSave({
            title: form.title, type: form.type, description: form.description,
            provider: form.provider, instructor: form.instructor,
            status: form.status, startDate: form.startDate, endDate: form.endDate || form.startDate,
            durationHours: parseFloat(form.durationHours) || 8,
            maxCapacity: parseInt(form.maxCapacity) || 20,
            budget: parseFloat(form.budget) || 0, spent: 0,
            isMandatory: form.isMandatory,
            certificationName: form.certificationName || null,
            certValidityMonths: form.certValidityMonths ? parseInt(form.certValidityMonths) : null,
          });
        }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4" />
          Oluştur
        </button>
      </div>
    </div>
  );
}
