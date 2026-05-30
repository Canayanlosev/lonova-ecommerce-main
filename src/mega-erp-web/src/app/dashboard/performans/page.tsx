"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Star, Plus, X, Save, Edit2, Users, TrendingUp, Award,
  ChevronDown, ChevronUp, ArrowLeft, BarChart2, Check,
  Target, CheckCircle, AlertCircle, Clock, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/store/ui.store";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

type ReviewStatus = "taslak" | "devam_ediyor" | "tamamlandı" | "onaylandı";
type ReviewCycle = "çeyreklik" | "yıllık" | "deneme_sonu" | "özel";
type RatingLevel = 1 | 2 | 3 | 4 | 5;

interface KPIScore {
  category: string;
  score: RatingLevel;
  weight: number; // 0-100, sum=100
  notes: string;
}

interface GoalItem {
  id: string;
  title: string;
  target: string;
  actual: string;
  achieved: boolean;
}

interface Review {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  reviewerId: string;
  reviewerName: string;
  cycle: ReviewCycle;
  period: string; // "2026 Q1"
  status: ReviewStatus;
  kpiScores: KPIScore[];
  goals: GoalItem[];
  overallScore: number; // calculated
  strengths: string;
  improvements: string;
  reviewerComments: string;
  selfScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReviewStatus, string> = {
  taslak: "Taslak", devam_ediyor: "Devam Ediyor", tamamlandı: "Tamamlandı", onaylandı: "Onaylandı"
};
const STATUS_COLORS: Record<ReviewStatus, string> = {
  taslak: "bg-slate-500/15 text-slate-300",
  devam_ediyor: "bg-amber-500/15 text-amber-400",
  tamamlandı: "bg-blue-500/15 text-blue-400",
  onaylandı: "bg-emerald-500/15 text-emerald-400",
};

const RATING_LABELS: Record<RatingLevel, string> = {
  1: "Yetersiz", 2: "Gelişmeli", 3: "Beklenilen", 4: "Üstün", 5: "Mükemmel"
};
const RATING_COLORS: Record<RatingLevel, string> = {
  1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#6366f1"
};

const DEFAULT_KPIS: Omit<KPIScore, "notes">[] = [
  { category: "İş Kalitesi", score: 3, weight: 25 },
  { category: "İşbirliği & İletişim", score: 3, weight: 20 },
  { category: "Hedef Başarımı", score: 3, weight: 25 },
  { category: "Girişimcilik & Yenilik", score: 3, weight: 15 },
  { category: "Liderlik & Sahiplenme", score: 3, weight: 15 },
];

const STORAGE_KEY = "calisan-performans";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function calcOverallScore(kpis: KPIScore[]): number {
  const totalWeight = kpis.reduce((s, k) => s + k.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = kpis.reduce((s, k) => s + k.score * k.weight, 0);
  return parseFloat((weighted / totalWeight).toFixed(2));
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

function seedReviews(): Review[] {
  function makeKPIs(scores: RatingLevel[]): KPIScore[] {
    return DEFAULT_KPIS.map((k, i) => ({ ...k, score: scores[i] ?? 3, notes: "" }));
  }

  const goals1: GoalItem[] = [
    { id: uid(), title: "Satış hedefi ₺500K/ay", target: "₺500.000", actual: "₺547.000", achieved: true },
    { id: uid(), title: "Müşteri memnuniyet skoru", target: "4.5/5", actual: "4.7/5", achieved: true },
    { id: uid(), title: "3 yeni kurumsal müşteri kazan", target: "3 müşteri", actual: "4 müşteri", achieved: true },
  ];
  const goals2: GoalItem[] = [
    { id: uid(), title: "Kargo hata oranını %1'in altına düşür", target: "<%1", actual: "%0.8", achieved: true },
    { id: uid(), title: "Sevkiyat süresi 24 saate indirmek", target: "24 saat", actual: "22 saat", achieved: true },
    { id: uid(), title: "WMS süreçlerini belgelemek", target: "Tam döküman", actual: "%60 tamamlandı", achieved: false },
  ];
  const goals3: GoalItem[] = [
    { id: uid(), title: "React öğrenme kursu tamamlama", target: "Sertifika", actual: "Tamamlandı", achieved: true },
    { id: uid(), title: "Sprint velocity artırımı", target: "+20%", actual: "+15%", achieved: false },
    { id: uid(), title: "Code review katılım oranı", target: "%90", actual: "%95", achieved: true },
  ];

  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "r1", employeeId: "e1", employeeName: "Zeynep Kara", employeeRole: "Satış Temsilcisi",
      department: "Satış", reviewerId: "m1", reviewerName: "Ahmet Yılmaz",
      cycle: "çeyreklik", period: "2026 Q1", status: "onaylandı",
      kpiScores: makeKPIs([5, 4, 5, 4, 3]),
      goals: goals1, overallScore: calcOverallScore(makeKPIs([5, 4, 5, 4, 3])),
      strengths: "Satış konusundaki tutkusu ve müşteri ilişkileri çok güçlü. Hedef aşımı tutarlı.",
      improvements: "Proje dokümantasyonu ve raporlama süreçlerini güçlendirebilir.",
      reviewerComments: "Zeynep bu çeyrekte tüm beklentilerin üzerinde performans gösterdi. Bir üst pozisyon için hazır.",
      selfScore: 4.2,
      createdAt: "2026-04-01", completedAt: "2026-04-10",
    },
    {
      id: "r2", employeeId: "e2", employeeName: "Murat Demir", employeeRole: "Depo Sorumlusu",
      department: "Lojistik", reviewerId: "m2", reviewerName: "Selin Çelik",
      cycle: "çeyreklik", period: "2026 Q1", status: "tamamlandı",
      kpiScores: makeKPIs([4, 3, 3, 2, 3]),
      goals: goals2, overallScore: calcOverallScore(makeKPIs([4, 3, 3, 2, 3])),
      strengths: "Operasyonel tutarlılığı ve hata oranını düşürmedeki başarısı dikkat çekici.",
      improvements: "Dokümantasyon alışkanlığı geliştirilmeli. Proaktif iletişim artırılabilir.",
      reviewerComments: "Genel performans beklenilene uygun. Süreç belgeleme konusunda destek verilecek.",
      selfScore: 3.5,
      createdAt: "2026-04-01", completedAt: "2026-04-15",
    },
    {
      id: "r3", employeeId: "e3", employeeName: "Burak Aslan", employeeRole: "Frontend Geliştirici",
      department: "Teknoloji", reviewerId: "m3", reviewerName: "Ahmet Yılmaz",
      cycle: "çeyreklik", period: "2026 Q1", status: "devam_ediyor",
      kpiScores: makeKPIs([4, 4, 3, 5, 4]),
      goals: goals3, overallScore: calcOverallScore(makeKPIs([4, 4, 3, 5, 4])),
      strengths: "Teknik yetkinliği çok yüksek. Yeni teknolojileri hızlı adapte ediyor.",
      improvements: "Sprint velocity hedefini yakalaması için önceliklendirme pratiği gerekli.",
      reviewerComments: "",
      selfScore: null,
      createdAt: "2026-04-20", completedAt: null,
    },
    {
      id: "r4", employeeId: "e4", employeeName: "Elif Taş", employeeRole: "Pazarlama Uzmanı",
      department: "Pazarlama", reviewerId: "m1", reviewerName: "Ahmet Yılmaz",
      cycle: "yıllık", period: "2025 Yıllık", status: "onaylandı",
      kpiScores: makeKPIs([3, 5, 4, 4, 3]),
      goals: [
        { id: uid(), title: "Marka bilinirlik artışı", target: "+30%", actual: "+38%", achieved: true },
        { id: uid(), title: "Email kampanya açılma oranı", target: "%25", actual: "%31", achieved: true },
        { id: uid(), title: "Sosyal medya takipçi büyümesi", target: "+5K", actual: "+7.2K", achieved: true },
      ],
      overallScore: calcOverallScore(makeKPIs([3, 5, 4, 4, 3])),
      strengths: "Yaratıcılığı ve kampanya yönetimi becerisi olağanüstü. Ekip içi iletişimi mükemmel.",
      improvements: "Analitik raporlama konusunda daha sistematik olabilir.",
      reviewerComments: "2025'in en başarılı performanslarından biri. Mükemmel yıl.",
      selfScore: 4.0,
      createdAt: "2026-01-15", completedAt: "2026-01-25",
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PerformansPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | "tümü">("tümü");
  const [filterDept, setFilterDept] = useState("Tümü");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ employeeName: "", employeeRole: "", department: "", reviewerName: "", cycle: "çeyreklik" as ReviewCycle, period: "2026 Q2" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setReviews(raw ? JSON.parse(raw) : seedReviews());
      if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedReviews()));
    } catch {
      setReviews(seedReviews());
    }
  }, []);

  const save = useCallback((updated: Review[]) => {
    setReviews(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const activeReview = useMemo(() => reviews.find(r => r.id === activeReviewId), [reviews, activeReviewId]);

  const departments = useMemo(() => {
    const depts = new Set(reviews.map(r => r.department));
    return ["Tümü", ...Array.from(depts)];
  }, [reviews]);

  const stats = useMemo(() => {
    const completed = reviews.filter(r => r.status === "tamamlandı" || r.status === "onaylandı");
    const avgScore = completed.length > 0
      ? parseFloat((completed.reduce((s, r) => s + r.overallScore, 0) / completed.length).toFixed(2))
      : 0;
    const topPerformer = completed.length > 0 ? completed.reduce((best, r) => r.overallScore > best.overallScore ? r : best) : null;
    return {
      total: reviews.length, completed: completed.length, pending: reviews.filter(r => r.status === "taslak" || r.status === "devam_ediyor").length, avgScore, topPerformer,
    };
  }, [reviews]);

  const filtered = useMemo(() => reviews.filter(r => {
    if (filterStatus !== "tümü" && r.status !== filterStatus) return false;
    if (filterDept !== "Tümü" && r.department !== filterDept) return false;
    return true;
  }), [reviews, filterStatus, filterDept]);

  // Score distribution chart
  const scoreDistribution = useMemo(() => {
    return [1, 2, 3, 4, 5].map(score => ({
      name: RATING_LABELS[score as RatingLevel],
      count: reviews.filter(r => {
        const s = Math.round(r.overallScore);
        return s === score;
      }).length,
      fill: RATING_COLORS[score as RatingLevel],
    }));
  }, [reviews]);

  function createReview() {
    if (!newForm.employeeName.trim()) { toast.error("Çalışan adı gerekli"); return; }
    const newReview: Review = {
      id: uid(), employeeId: uid(), employeeName: newForm.employeeName,
      employeeRole: newForm.employeeRole, department: newForm.department,
      reviewerId: uid(), reviewerName: newForm.reviewerName,
      cycle: newForm.cycle, period: newForm.period,
      status: "taslak", kpiScores: DEFAULT_KPIS.map(k => ({ ...k, notes: "" })),
      goals: [], overallScore: 3,
      strengths: "", improvements: "", reviewerComments: "", selfScore: null,
      createdAt: new Date().toISOString().slice(0, 10), completedAt: null,
    };
    save([newReview, ...reviews]);
    setActiveReviewId(newReview.id);
    toast.success("Değerlendirme oluşturuldu");
    setShowNewModal(false);
  }

  function updateKPI(reviewId: string, idx: number, score: RatingLevel) {
    save(reviews.map(r => {
      if (r.id !== reviewId) return r;
      const newKPIs = r.kpiScores.map((k, i) => i === idx ? { ...k, score } : k);
      return { ...r, kpiScores: newKPIs, overallScore: calcOverallScore(newKPIs) };
    }));
  }

  function updateField(reviewId: string, field: keyof Review, value: string | number | null) {
    save(reviews.map(r => r.id === reviewId ? { ...r, [field]: value } : r));
  }

  function addGoal(reviewId: string) {
    save(reviews.map(r => r.id === reviewId ? {
      ...r, goals: [...r.goals, { id: uid(), title: "Yeni hedef", target: "", actual: "", achieved: false }]
    } : r));
  }

  function updateGoal(reviewId: string, goalId: string, field: keyof GoalItem, value: string | boolean) {
    save(reviews.map(r => r.id !== reviewId ? r : {
      ...r, goals: r.goals.map(g => g.id === goalId ? { ...g, [field]: value } : g)
    }));
  }

  function advanceStatus(reviewId: string) {
    const r = reviews.find(x => x.id === reviewId);
    if (!r) return;
    const next: ReviewStatus = r.status === "taslak" ? "devam_ediyor" : r.status === "devam_ediyor" ? "tamamlandı" : "onaylandı";
    save(reviews.map(x => x.id === reviewId ? { ...x, status: next, completedAt: next === "tamamlandı" ? new Date().toISOString().slice(0, 10) : x.completedAt } : x));
    toast.success(`Durum: ${STATUS_LABELS[next]}`);
  }

  function exportCSV() {
    const header = "Çalışan,Rol,Departman,Dönem,Döngü,Puan,Durum,Değerlendiren";
    const rows = reviews.map(r => [
      `"${r.employeeName}"`, `"${r.employeeRole}"`, r.department, r.period, r.cycle, r.overallScore, STATUS_LABELS[r.status], `"${r.reviewerName}"`
    ].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "performans-degerlendirme.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }

  // ── Detail View ────────────────────────────────────────────────────────────

  if (activeReview) {
    const radarData = activeReview.kpiScores.map(k => ({ subject: k.category, score: k.score, fullMark: 5 }));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveReviewId(null)}
            className="p-2 rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-black">{activeReview.employeeName}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLORS[activeReview.status]}`}>
                {STATUS_LABELS[activeReview.status]}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activeReview.employeeRole} · {activeReview.department} · {activeReview.period}</p>
          </div>
          {activeReview.status !== "onaylandı" && (
            <button onClick={() => advanceStatus(activeReview.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
              <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
              {activeReview.status === "taslak" ? "Başlat" : activeReview.status === "devam_ediyor" ? "Tamamla" : "Onayla"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KPI Scores */}
          <div className="lg:col-span-2 space-y-5">
            <div className="premium-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">KPI Değerlendirmesi</h3>
                <div className="text-center">
                  <span className="text-2xl font-black text-primary">{activeReview.overallScore}</span>
                  <span className="text-slate-500 text-sm">/5</span>
                </div>
              </div>
              <div className="space-y-4">
                {activeReview.kpiScores.map((kpi, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{kpi.category}</span>
                      <span className="text-xs text-slate-500">Ağırlık: %{kpi.weight}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {([1, 2, 3, 4, 5] as RatingLevel[]).map(score => (
                        <button key={score} onClick={() => updateKPI(activeReview.id, idx, score)}
                          disabled={activeReview.status === "onaylandı"}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border disabled:cursor-not-allowed ${kpi.score === score
                            ? `border-transparent text-white`
                            : "border-border/50 text-slate-500 hover:border-border"
                            }`}
                          style={kpi.score === score ? { backgroundColor: RATING_COLORS[score] } : {}}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{RATING_LABELS[kpi.score as RatingLevel]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="premium-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Hedefler</h3>
                {activeReview.status !== "onaylandı" && (
                  <button onClick={() => addGoal(activeReview.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/15 text-primary rounded-lg text-xs font-bold hover:bg-primary/25 transition-colors">
                    <Plus className="w-3 h-3" /> Ekle
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {activeReview.goals.map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
                    <button onClick={() => updateGoal(activeReview.id, goal.id, "achieved", !goal.achieved)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${goal.achieved ? "bg-emerald-500 border-emerald-500" : "border-slate-600"}`}>
                      {goal.achieved && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                      <input defaultValue={goal.title} onBlur={e => updateGoal(activeReview.id, goal.id, "title", e.target.value)}
                        className="col-span-1 bg-transparent border-b border-border/40 focus:outline-none focus:border-primary/60 pb-0.5" />
                      <input defaultValue={goal.target} placeholder="Hedef" onBlur={e => updateGoal(activeReview.id, goal.id, "target", e.target.value)}
                        className="bg-transparent border-b border-border/40 focus:outline-none focus:border-primary/60 pb-0.5 text-slate-400" />
                      <input defaultValue={goal.actual} placeholder="Gerçekleşen" onBlur={e => updateGoal(activeReview.id, goal.id, "actual", e.target.value)}
                        className={`bg-transparent border-b border-border/40 focus:outline-none focus:border-primary/60 pb-0.5 ${goal.achieved ? "text-emerald-400" : "text-amber-400"}`} />
                    </div>
                  </div>
                ))}
                {activeReview.goals.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Henüz hedef eklenmemiş</p>
                )}
              </div>
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="premium-card p-4">
                <h3 className="text-xs font-bold text-slate-400 mb-2">Güçlü Yanlar</h3>
                <textarea
                  defaultValue={activeReview.strengths}
                  onBlur={e => updateField(activeReview.id, "strengths", e.target.value)}
                  disabled={activeReview.status === "onaylandı"}
                  rows={4}
                  className="w-full bg-transparent text-sm text-slate-300 focus:outline-none resize-none disabled:opacity-70"
                  placeholder="Çalışanın güçlü yönlerini yazın..."
                />
              </div>
              <div className="premium-card p-4">
                <h3 className="text-xs font-bold text-slate-400 mb-2">Gelişim Alanları</h3>
                <textarea
                  defaultValue={activeReview.improvements}
                  onBlur={e => updateField(activeReview.id, "improvements", e.target.value)}
                  disabled={activeReview.status === "onaylandı"}
                  rows={4}
                  className="w-full bg-transparent text-sm text-slate-300 focus:outline-none resize-none disabled:opacity-70"
                  placeholder="Gelişim fırsatlarını yazın..."
                />
              </div>
            </div>
            <div className="premium-card p-4">
              <h3 className="text-xs font-bold text-slate-400 mb-2">Yönetici Yorumu</h3>
              <textarea
                defaultValue={activeReview.reviewerComments}
                onBlur={e => updateField(activeReview.id, "reviewerComments", e.target.value)}
                disabled={activeReview.status === "onaylandı"}
                rows={3}
                className="w-full bg-transparent text-sm text-slate-300 focus:outline-none resize-none disabled:opacity-70"
                placeholder="Genel değerlendirme notunuzu yazın..."
              />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Radar chart */}
            <div className="premium-card p-4">
              <h3 className="text-xs font-bold text-slate-400 mb-3">Yetkinlik Profili</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.2)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score summary */}
            <div className="premium-card p-4">
              <h3 className="text-xs font-bold text-slate-400 mb-3">Özet Puan</h3>
              <div className="text-center mb-3">
                <span className="text-4xl font-black text-primary">{activeReview.overallScore}</span>
                <span className="text-slate-500 text-lg">/5</span>
                <p className="text-xs text-slate-400 mt-1">{RATING_LABELS[Math.round(activeReview.overallScore) as RatingLevel]}</p>
              </div>
              {activeReview.selfScore !== null && (
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-border/40 pt-3">
                  <span>Öz Değerlendirme</span>
                  <span className="font-bold text-foreground">{activeReview.selfScore}/5</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="premium-card p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Değerlendiren</span>
                <span className="font-medium">{activeReview.reviewerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Döngü</span>
                <span className="font-medium capitalize">{activeReview.cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Başlangıç</span>
                <span className="font-medium">{new Date(activeReview.createdAt).toLocaleDateString("tr-TR")}</span>
              </div>
              {activeReview.completedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tamamlandı</span>
                  <span className="font-medium text-emerald-400">{new Date(activeReview.completedAt).toLocaleDateString("tr-TR")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Hedef Başarım</span>
                <span className="font-medium">
                  {activeReview.goals.length > 0
                    ? `${activeReview.goals.filter(g => g.achieved).length}/${activeReview.goals.length}`
                    : "—"}
                </span>
              </div>
            </div>
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
          <h1 className="text-2xl font-black">Performans Değerlendirme</h1>
          <p className="text-slate-400 text-sm mt-1">Çalışan yetkinlik değerlendirmesi, hedef takibi ve puan analizi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-slate-800/40 hover:bg-slate-700/40 transition-colors">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Değerlendirme Ekle
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Toplam</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary">{stats.total}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Ort. Puan</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{stats.avgScore}</p>
          <p className="text-xs text-slate-500 mt-1">/5</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Bekleyen</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-black text-red-400">{stats.pending}</p>
        </div>
        <div className="premium-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Yıldız</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-sm font-black text-yellow-400 truncate">{stats.topPerformer?.employeeName ?? "—"}</p>
          {stats.topPerformer && <p className="text-xs text-slate-500 mt-0.5">{stats.topPerformer.overallScore}/5</p>}
        </div>
      </div>

      {/* Score Distribution */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-bold mb-4">Puan Dağılımı</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={scoreDistribution} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" name="Kişi" radius={[3, 3, 0, 0]}>
              {scoreDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="tümü">Tüm Durumlar</option>
          {(Object.keys(STATUS_LABELS) as ReviewStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="bg-slate-800/60 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Reviews Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-slate-500">
                <th className="text-left px-4 py-3 font-semibold">Çalışan</th>
                <th className="text-left px-4 py-3 font-semibold">Dönem</th>
                <th className="text-center px-4 py-3 font-semibold">Puan</th>
                <th className="text-center px-4 py-3 font-semibold">KPI</th>
                <th className="text-center px-4 py-3 font-semibold">Hedefler</th>
                <th className="text-center px-4 py-3 font-semibold">Durum</th>
                <th className="text-left px-4 py-3 font-semibold">Değerlendiren</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map(review => (
                <tr key={review.id} className="hover:bg-slate-800/20 transition-colors cursor-pointer" onClick={() => setActiveReviewId(review.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {review.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold">{review.employeeName}</p>
                        <p className="text-xs text-slate-400">{review.employeeRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{review.period}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-black" style={{ color: RATING_COLORS[Math.round(review.overallScore) as RatingLevel] }}>
                      {review.overallScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(review.overallScore) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {review.goals.length > 0
                      ? <span className={review.goals.filter(g => g.achieved).length === review.goals.length ? "text-emerald-400" : "text-slate-400"}>
                        {review.goals.filter(g => g.achieved).length}/{review.goals.length}
                      </span>
                      : <span className="text-slate-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_COLORS[review.status]}`}>
                      {STATUS_LABELS[review.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{review.reviewerName}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { save(reviews.filter(r => r.id !== review.id)); toast.success("Silindi"); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Modal */}
      <AnimatePresence>
        {showNewModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-51 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold">Yeni Değerlendirme</h2>
                <button onClick={() => setShowNewModal(false)} className="p-1 rounded-lg hover:bg-slate-800/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Çalışan Adı</label>
                    <input value={newForm.employeeName} onChange={e => setNewForm(f => ({ ...f, employeeName: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Rol / Unvan</label>
                    <input value={newForm.employeeRole} onChange={e => setNewForm(f => ({ ...f, employeeRole: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Departman</label>
                    <input value={newForm.department} onChange={e => setNewForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Değerlendiren</label>
                    <input value={newForm.reviewerName} onChange={e => setNewForm(f => ({ ...f, reviewerName: e.target.value }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Döngü</label>
                    <select value={newForm.cycle} onChange={e => setNewForm(f => ({ ...f, cycle: e.target.value as ReviewCycle }))}
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60">
                      <option value="çeyreklik">Çeyreklik</option>
                      <option value="yıllık">Yıllık</option>
                      <option value="deneme_sonu">Deneme Sonu</option>
                      <option value="özel">Özel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dönem</label>
                    <input value={newForm.period} onChange={e => setNewForm(f => ({ ...f, period: e.target.value }))}
                      placeholder="2026 Q2"
                      className="w-full bg-slate-800/60 border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-border/60 hover:bg-slate-800/40 transition-colors">
                  İptal
                </button>
                <button onClick={createReview}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  Oluştur
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
