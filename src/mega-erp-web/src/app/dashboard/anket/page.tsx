"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MessageSquare, Plus, X, Search, Star, ThumbsUp, ThumbsDown,
  TrendingUp, TrendingDown, Users, BarChart2, Download,
  CheckCircle2, Clock, Send, Trash2, ChevronDown, Eye,
  Smile, Meh, Frown, AlertCircle
} from "lucide-react";
import { useToast } from "@/store/ui.store";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, Legend
} from "recharts";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("tr-TR");

// ─── Types ──────────────────────────────────────────────────────────────────

type SurveyStatus = "taslak" | "aktif" | "tamamlandı" | "arşiv";
type SurveyType = "nps" | "memnuniyet" | "ürün" | "hizmet" | "genel";
type QuestionType = "nps" | "rating" | "text" | "yesno" | "choice";
type ResponseSentiment = "olumlu" | "nötr" | "olumsuz";

interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  choices?: string[];
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  respondent: string;
  email: string;
  answers: Record<string, string | number>;
  npsScore?: number; // 0-10
  overallRating?: number; // 1-5
  sentiment: ResponseSentiment;
  submittedAt: string;
  note: string;
}

interface Survey {
  id: string;
  title: string;
  type: SurveyType;
  status: SurveyStatus;
  description: string;
  questions: SurveyQuestion[];
  targetCount: number;
  responseCount: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_SURVEYS: Survey[] = [
  {
    id: "sv001", title: "Q2 2026 Müşteri Memnuniyeti", type: "memnuniyet", status: "aktif",
    description: "İkinci çeyrek müşteri memnuniyet ölçümü",
    questions: [
      { id: "q1", text: "Hizmetimizden genel memnuniyetiniz?", type: "rating", required: true },
      { id: "q2", text: "Platformumuzu başkasına önerir misiniz? (0-10)", type: "nps", required: true },
      { id: "q3", text: "En çok beğendiğiniz özellik nedir?", type: "text", required: false },
      { id: "q4", text: "Geliştirmemizi istediğiniz alan?", type: "choice", required: false, choices: ["Hız", "Tasarım", "Destek", "Fiyat", "Özellikler"] }
    ],
    targetCount: 200, responseCount: 143, startDate: "2026-05-01", endDate: "2026-05-31", createdAt: "2026-04-28T08:00:00Z"
  },
  {
    id: "sv002", title: "Yeni Ürün Değerlendirme", type: "ürün", status: "aktif",
    description: "Yeni çıkan ürün serimize ait geri bildirimler",
    questions: [
      { id: "q5", text: "Ürün kalitesini değerlendirin", type: "rating", required: true },
      { id: "q6", text: "Fiyat/kalite oranı nasıl?", type: "rating", required: true },
      { id: "q7", text: "Ürün hakkında yorumunuz", type: "text", required: false }
    ],
    targetCount: 100, responseCount: 67, startDate: "2026-05-10", createdAt: "2026-05-08T10:00:00Z"
  },
  {
    id: "sv003", title: "Kargo & Teslimat Deneyimi", type: "hizmet", status: "tamamlandı",
    description: "Kargo süreçleri hakkında müşteri görüşleri",
    questions: [
      { id: "q8", text: "Teslimat hızından memnun kaldınız mı?", type: "yesno", required: true },
      { id: "q9", text: "Ambalaj kalitesi", type: "rating", required: true },
      { id: "q10", text: "Kargo sürecini 0-10 arası puanlayın", type: "nps", required: true }
    ],
    targetCount: 150, responseCount: 150, startDate: "2026-04-01", endDate: "2026-04-30", createdAt: "2026-03-28T08:00:00Z"
  }
];

const SEED_RESPONSES: SurveyResponse[] = [
  { id: "r001", surveyId: "sv001", respondent: "Ahmet Yılmaz", email: "ahmet@example.com", answers: { q1: 5, q2: 9, q3: "Hızlı kargo", q4: "Hız" }, npsScore: 9, overallRating: 5, sentiment: "olumlu", submittedAt: "2026-05-05T10:00:00Z", note: "" },
  { id: "r002", surveyId: "sv001", respondent: "Fatma Kaya", email: "fatma@example.com", answers: { q1: 3, q2: 6, q3: "Kolay kullanım", q4: "Destek" }, npsScore: 6, overallRating: 3, sentiment: "nötr", submittedAt: "2026-05-06T11:00:00Z", note: "Destek geç cevap verdi" },
  { id: "r003", surveyId: "sv001", respondent: "Mehmet Demir", email: "mehmet@example.com", answers: { q1: 2, q2: 3, q3: "", q4: "Fiyat" }, npsScore: 3, overallRating: 2, sentiment: "olumsuz", submittedAt: "2026-05-07T09:00:00Z", note: "Fiyatlar çok yüksek" },
  { id: "r004", surveyId: "sv001", respondent: "Ayşe Şahin", email: "ayse@example.com", answers: { q1: 5, q2: 10, q3: "Her şey mükemmel", q4: "Özellikler" }, npsScore: 10, overallRating: 5, sentiment: "olumlu", submittedAt: "2026-05-08T14:00:00Z", note: "" },
  { id: "r005", surveyId: "sv001", respondent: "Can Öztürk", email: "can@example.com", answers: { q1: 4, q2: 8, q3: "Ürün çeşitliliği", q4: "Tasarım" }, npsScore: 8, overallRating: 4, sentiment: "olumlu", submittedAt: "2026-05-09T16:00:00Z", note: "" },
  { id: "r006", surveyId: "sv002", respondent: "Zeynep Arslan", email: "zeynep@example.com", answers: { q5: 5, q6: 4, q7: "Çok beğendim" }, npsScore: undefined, overallRating: 5, sentiment: "olumlu", submittedAt: "2026-05-12T10:00:00Z", note: "" },
  { id: "r007", surveyId: "sv002", respondent: "Berk Yıldız", email: "berk@example.com", answers: { q5: 3, q6: 2, q7: "Fiyat yüksek" }, npsScore: undefined, overallRating: 3, sentiment: "olumsuz", submittedAt: "2026-05-13T11:00:00Z", note: "" },
  { id: "r008", surveyId: "sv003", respondent: "Selin Çelik", email: "selin@example.com", answers: { q8: "Evet", q9: 5, q10: 9 }, npsScore: 9, overallRating: 5, sentiment: "olumlu", submittedAt: "2026-04-10T08:00:00Z", note: "" },
  { id: "r009", surveyId: "sv003", respondent: "Emre Koç", email: "emre@example.com", answers: { q8: "Hayır", q9: 2, q10: 4 }, npsScore: 4, overallRating: 2, sentiment: "olumsuz", submittedAt: "2026-04-15T09:00:00Z", note: "Gecikme yaşandı" }
];

// ─── Configs ─────────────────────────────────────────────────────────────────

const SURVEY_STATUS_CFG: Record<SurveyStatus, { label: string; color: string }> = {
  taslak: { label: "Taslak", color: "bg-slate-100 text-slate-600" },
  aktif: { label: "Aktif", color: "bg-green-100 text-green-700" },
  tamamlandı: { label: "Tamamlandı", color: "bg-blue-100 text-blue-700" },
  arşiv: { label: "Arşiv", color: "bg-gray-100 text-gray-500" }
};

const SURVEY_TYPE_CFG: Record<SurveyType, { label: string; color: string }> = {
  nps: { label: "NPS", color: "bg-violet-100 text-violet-700" },
  memnuniyet: { label: "Memnuniyet", color: "bg-blue-100 text-blue-700" },
  ürün: { label: "Ürün", color: "bg-emerald-100 text-emerald-700" },
  hizmet: { label: "Hizmet", color: "bg-cyan-100 text-cyan-700" },
  genel: { label: "Genel", color: "bg-slate-100 text-slate-600" }
};

const SENTIMENT_CFG: Record<ResponseSentiment, { label: string; color: string; icon: React.ReactNode }> = {
  olumlu: { label: "Olumlu", color: "text-green-500", icon: <Smile size={14} /> },
  nötr: { label: "Nötr", color: "text-amber-500", icon: <Meh size={14} /> },
  olumsuz: { label: "Olumsuz", color: "text-red-500", icon: <Frown size={14} /> }
};

// ─── NPS Helper ───────────────────────────────────────────────────────────────

function calcNPS(responses: SurveyResponse[]) {
  const npsResponses = responses.filter(r => r.npsScore !== undefined);
  if (npsResponses.length === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0, count: 0 };
  const promoters = npsResponses.filter(r => (r.npsScore ?? 0) >= 9).length;
  const detractors = npsResponses.filter(r => (r.npsScore ?? 0) <= 6).length;
  const passives = npsResponses.length - promoters - detractors;
  const score = Math.round(((promoters - detractors) / npsResponses.length) * 100);
  return { score, promoters, passives, detractors, count: npsResponses.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnketPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"surveys" | "responses" | "analytics">("surveys");

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [selectedSurveyFilter, setSelectedSurveyFilter] = useState<string>("tümü");
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<ResponseSentiment | "tümü">("tümü");
  const [showSurveyForm, setShowSurveyForm] = useState(false);

  useEffect(() => {
    try {
      const sv = localStorage.getItem("anketler");
      setSurveys(sv ? JSON.parse(sv) : SEED_SURVEYS);
      if (!sv) localStorage.setItem("anketler", JSON.stringify(SEED_SURVEYS));

      const rs = localStorage.getItem("anket-yanitlar");
      setResponses(rs ? JSON.parse(rs) : SEED_RESPONSES);
      if (!rs) localStorage.setItem("anket-yanitlar", JSON.stringify(SEED_RESPONSES));
    } catch {
      setSurveys(SEED_SURVEYS);
      setResponses(SEED_RESPONSES);
    }
  }, []);

  const saveSurveys = useCallback((data: Survey[]) => {
    setSurveys(data);
    localStorage.setItem("anketler", JSON.stringify(data));
  }, []);

  // ─── Stats ───────────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const totalResponses = responses.length;
    const nps = calcNPS(responses);
    const avgRating = responses.filter(r => r.overallRating).reduce((s, r) => s + (r.overallRating ?? 0), 0) /
      (responses.filter(r => r.overallRating).length || 1);
    const olumlu = responses.filter(r => r.sentiment === "olumlu").length;
    const olumsuz = responses.filter(r => r.sentiment === "olumsuz").length;
    return { totalResponses, nps, avgRating, olumlu, olumsuz };
  }, [responses]);

  // ─── Chart Data ──────────────────────────────────────────────────────────
  const sentimentChartData = useMemo(() => [
    { name: "Olumlu", value: responses.filter(r => r.sentiment === "olumlu").length, fill: "#22c55e" },
    { name: "Nötr", value: responses.filter(r => r.sentiment === "nötr").length, fill: "#f59e0b" },
    { name: "Olumsuz", value: responses.filter(r => r.sentiment === "olumsuz").length, fill: "#ef4444" }
  ], [responses]);

  const npsDistChartData = useMemo(() => {
    const counts = Array(11).fill(0);
    responses.forEach(r => { if (r.npsScore !== undefined) counts[r.npsScore]++; });
    return counts.map((v, i) => ({ score: String(i), count: v }));
  }, [responses]);

  const surveyCompletionData = useMemo(() =>
    surveys.map(s => ({
      name: s.title.split(" ").slice(0, 2).join(" "),
      completion: s.targetCount > 0 ? Math.round((s.responseCount / s.targetCount) * 100) : 0
    })), [surveys]);

  // ─── Filtered Data ────────────────────────────────────────────────────────
  const filteredResponses = useMemo(() => responses.filter(r => {
    const matchSurvey = selectedSurveyFilter === "tümü" || r.surveyId === selectedSurveyFilter;
    const matchSearch = r.respondent.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());
    const matchSentiment = sentimentFilter === "tümü" || r.sentiment === sentimentFilter;
    return matchSurvey && matchSearch && matchSentiment;
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [responses, selectedSurveyFilter, search, sentimentFilter]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const toggleSurveyStatus = useCallback((id: string) => {
    const updated = surveys.map(s => {
      if (s.id !== id) return s;
      const next: SurveyStatus = s.status === "aktif" ? "tamamlandı" : s.status === "taslak" ? "aktif" : s.status;
      return { ...s, status: next };
    });
    saveSurveys(updated);
    toast.success("Anket durumu güncellendi");
  }, [surveys, saveSurveys, toast]);

  const deleteSurvey = useCallback((id: string) => {
    saveSurveys(surveys.filter(s => s.id !== id));
    if (selectedSurvey?.id === id) setSelectedSurvey(null);
    toast.success("Anket silindi");
  }, [surveys, saveSurveys, selectedSurvey, toast]);

  const exportCSV = useCallback(() => {
    const header = "Katılımcı,Email,Anket,NPS,Genel Puan,Duygu,Tarih,Not\n";
    const rows = responses.map(r => {
      const sv = surveys.find(s => s.id === r.surveyId);
      return [r.respondent, r.email, sv?.title ?? "", r.npsScore ?? "", r.overallRating ?? "", r.sentiment, fmtDate(r.submittedAt), r.note].join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "anket_yanitlar.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }, [responses, surveys, toast]);

  // ─── Survey Form ──────────────────────────────────────────────────────────
  const [newSurvey, setNewSurvey] = useState({ title: "", type: "memnuniyet" as SurveyType, description: "", targetCount: 100 });

  const submitSurvey = () => {
    if (!newSurvey.title) { toast.error("Başlık zorunludur"); return; }
    const item: Survey = {
      id: uid(), ...newSurvey, status: "taslak",
      questions: [
        { id: uid(), text: "Genel memnuniyetinizi değerlendirin (0-10)", type: "nps", required: true },
        { id: uid(), text: "Görüşlerinizi paylaşır mısınız?", type: "text", required: false }
      ],
      responseCount: 0, startDate: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString()
    };
    saveSurveys([item, ...surveys]);
    setShowSurveyForm(false);
    setNewSurvey({ title: "", type: "memnuniyet", description: "", targetCount: 100 });
    toast.success("Anket oluşturuldu");
  };

  // ─── NPS Color Helper ─────────────────────────────────────────────────────
  const npsColor = (score: number) => score >= 50 ? "#22c55e" : score >= 0 ? "#f59e0b" : "#ef4444";
  const npsBarColor = (idx: number) => idx >= 9 ? "#22c55e" : idx >= 7 ? "#f59e0b" : "#ef4444";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <MessageSquare size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Müşteri Anketleri & NPS</h1>
            <p className="text-sm text-foreground/60">Müşteri memnuniyeti ve geri bildirim yönetimi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-background/80 transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => setShowSurveyForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} /> Yeni Anket
          </button>
        </div>
      </div>

      {/* Global NPS Banner */}
      <div className="premium-card p-5">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="text-center">
            <p className="text-xs text-foreground/60 mb-1">Net Promoter Score</p>
            <p className="text-5xl font-black" style={{ color: npsColor(globalStats.nps.score) }}>
              {globalStats.nps.score > 0 ? "+" : ""}{globalStats.nps.score}
            </p>
            <p className="text-xs text-foreground/40 mt-1">{globalStats.nps.count} yanıt</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{globalStats.nps.promoters}</p>
              <p className="text-xs text-green-600 font-medium">Destekçi</p>
              <p className="text-xs text-foreground/40">9-10 puan</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">{globalStats.nps.passives}</p>
              <p className="text-xs text-amber-600 font-medium">Pasif</p>
              <p className="text-xs text-foreground/40">7-8 puan</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-600">{globalStats.nps.detractors}</p>
              <p className="text-xs text-red-600 font-medium">Eleştirmen</p>
              <p className="text-xs text-foreground/40">0-6 puan</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-foreground/60 mb-1">Ort. Puan</p>
              <div className="flex items-center gap-1 justify-center">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                <p className="text-xl font-bold">{globalStats.avgRating.toFixed(1)}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-foreground/60 mb-1">Olumlu Oran</p>
              <p className="text-xl font-bold text-green-600">
                %{globalStats.totalResponses > 0 ? Math.round((globalStats.olumlu / globalStats.totalResponses) * 100) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-background border border-border rounded-xl w-fit">
        {([
          { key: "surveys", label: "Anketler", icon: MessageSquare },
          { key: "responses", label: "Yanıtlar", icon: Users },
          { key: "analytics", label: "Analitik", icon: BarChart2 }
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-primary text-white shadow-sm" : "text-foreground/60 hover:text-foreground"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Surveys Tab ─────────────────────────────────────────────────── */}
      {tab === "surveys" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {surveys.map(sv => {
              const statusCfg = SURVEY_STATUS_CFG[sv.status];
              const typeCfg = SURVEY_TYPE_CFG[sv.type];
              const completion = sv.targetCount > 0 ? Math.round((sv.responseCount / sv.targetCount) * 100) : 0;
              const svResponses = responses.filter(r => r.surveyId === sv.id);
              const svNPS = calcNPS(svResponses);

              return (
                <div key={sv.id} onClick={() => setSelectedSurvey(selectedSurvey?.id === sv.id ? null : sv)}
                  className={`premium-card p-5 cursor-pointer hover:border-primary/30 transition-all ${selectedSurvey?.id === sv.id ? "border-primary/40" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <h3 className="font-semibold text-foreground">{sv.title}</h3>
                      <p className="text-xs text-foreground/50 mt-0.5">{sv.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(sv.status === "taslak" || sv.status === "aktif") && (
                        <button onClick={e => { e.stopPropagation(); toggleSurveyStatus(sv.id); }}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium">
                          {sv.status === "taslak" ? "Yayınla" : "Bitir"}
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteSurvey(sv.id); }}
                        className="p-1 hover:text-red-500 transition-colors text-foreground/30">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-foreground/50 text-xs">Yanıt </span>
                      <span className="font-bold">{fmt(sv.responseCount)}</span>
                      <span className="text-foreground/40 text-xs">/{fmt(sv.targetCount)}</span>
                    </div>
                    {svNPS.count > 0 && (
                      <div>
                        <span className="text-foreground/50 text-xs">NPS </span>
                        <span className="font-bold" style={{ color: npsColor(svNPS.score) }}>
                          {svNPS.score > 0 ? "+" : ""}{svNPS.score}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-foreground/40">{sv.startDate}{sv.endDate ? ` → ${sv.endDate}` : ""}</div>
                    <div className="text-xs text-foreground/40">{sv.questions.length} soru</div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-foreground/40 mb-1">
                      <span>Tamamlanma</span><span>%{completion}</span>
                    </div>
                    <div className="w-full bg-border/50 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min(completion, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Survey Detail */}
          <AnimatePresence>
            {selectedSurvey && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="premium-card p-5 space-y-4 self-start">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{selectedSurvey.title}</h3>
                  <button onClick={() => setSelectedSurvey(null)} className="p-1 hover:text-red-500 transition-colors text-foreground/40"><X size={14} /></button>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground/60 mb-2">SORULAR</p>
                  <div className="space-y-2">
                    {selectedSurvey.questions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-2 p-2 bg-background/50 rounded-lg">
                        <span className="text-xs font-bold text-foreground/40 mt-0.5">{i + 1}.</span>
                        <div>
                          <p className="text-sm text-foreground">{q.text}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">{q.type}</span>
                            {q.required && <span className="text-xs text-red-500">*zorunlu</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {(() => {
                  const svResponses = responses.filter(r => r.surveyId === selectedSurvey.id);
                  const nps = calcNPS(svResponses);
                  return svResponses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/60 mb-2">ANALİZ ({svResponses.length} yanıt)</p>
                      <div className="space-y-2 text-sm">
                        {nps.count > 0 && <div className="flex justify-between"><span className="text-foreground/60">NPS</span><span className="font-bold" style={{ color: npsColor(nps.score) }}>{nps.score > 0 ? "+" : ""}{nps.score}</span></div>}
                        <div className="flex justify-between"><span className="text-foreground/60">Olumlu</span><span className="text-green-600">{svResponses.filter(r => r.sentiment === "olumlu").length}</span></div>
                        <div className="flex justify-between"><span className="text-foreground/60">Olumsuz</span><span className="text-red-500">{svResponses.filter(r => r.sentiment === "olumsuz").length}</span></div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Responses Tab ───────────────────────────────────────────────── */}
      {tab === "responses" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Katılımcı, email..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={selectedSurveyFilter} onChange={e => setSelectedSurveyFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
              <option value="tümü">Tüm Anketler</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <select value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value as ResponseSentiment | "tümü")}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
              <option value="tümü">Tüm Duygular</option>
              <option value="olumlu">Olumlu</option>
              <option value="nötr">Nötr</option>
              <option value="olumsuz">Olumsuz</option>
            </select>
          </div>

          <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/60 border-b border-border">
                <tr>
                  {["Katılımcı", "Anket", "NPS", "Puan", "Duygu", "Tarih", "Not"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map(r => {
                  const sv = surveys.find(s => s.id === r.surveyId);
                  const sentCfg = SENTIMENT_CFG[r.sentiment];
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.respondent}</p>
                        <p className="text-xs text-foreground/40">{r.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/60">{sv?.title ?? "—"}</td>
                      <td className="px-4 py-3">
                        {r.npsScore !== undefined ? (
                          <span className="font-bold text-foreground">{r.npsScore}/10</span>
                        ) : <span className="text-foreground/30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.overallRating ? (
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={12} className={i < (r.overallRating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-border"} />
                            ))}
                          </div>
                        ) : <span className="text-foreground/30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 ${sentCfg.color}`}>
                          {sentCfg.icon} <span className="text-xs">{sentCfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/50">{fmtDate(r.submittedAt)}</td>
                      <td className="px-4 py-3 text-xs text-foreground/60 max-w-[150px] truncate">{r.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredResponses.length === 0 && (
              <div className="text-center py-12 text-foreground/40">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p>Yanıt bulunamadı</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Analytics Tab ───────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* NPS Distribution */}
            <div className="md:col-span-2 premium-card p-5">
              <h3 className="text-sm font-semibold mb-4 text-foreground">NPS Puan Dağılımı</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={npsDistChartData} barSize={18}>
                  <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Bar dataKey="count" name="Yanıt" radius={[3, 3, 0, 0]}>
                    {npsDistChartData.map((_, i) => (
                      <Cell key={i} fill={npsBarColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sentiment Pie */}
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold mb-4 text-foreground">Duygu Analizi</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={sentimentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} %${((percent ?? 0) * 100).toFixed(0)}`} labelLine={false} fontSize={10}>
                    {sentimentChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Survey Completion */}
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Anket Tamamlanma Oranları (%)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={surveyCompletionData} barSize={32} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => `%${v}`} />
                <Bar dataKey="completion" name="Tamamlanma" radius={[0, 4, 4, 0]}>
                  {surveyCompletionData.map((entry, i) => (
                    <Cell key={i} fill={entry.completion >= 80 ? "#22c55e" : entry.completion >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "En İyi Performans",
                icon: <ThumbsUp size={16} className="text-green-500" />,
                content: responses.filter(r => r.sentiment === "olumlu").length + " olumlu yanıt",
                sub: "Toplam yanıtın %" + (responses.length > 0 ? Math.round((responses.filter(r => r.sentiment === "olumlu").length / responses.length) * 100) : 0) + "'si"
              },
              {
                title: "Dikkat Gerektiren",
                icon: <AlertCircle size={16} className="text-red-500" />,
                content: responses.filter(r => r.sentiment === "olumsuz").length + " olumsuz yanıt",
                sub: responses.filter(r => r.note).length + " yanıtta not bırakıldı"
              },
              {
                title: "Aktif Anketler",
                icon: <Send size={16} className="text-blue-500" />,
                content: surveys.filter(s => s.status === "aktif").length + " aktif anket",
                sub: surveys.reduce((s, sv) => s + sv.responseCount, 0) + " toplam yanıt"
              }
            ].map(({ title, icon, content, sub }) => (
              <div key={title} className="premium-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  {icon}
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{content}</p>
                <p className="text-xs text-foreground/50">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Survey Form Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSurveyForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Yeni Anket Oluştur</h2>
                <button onClick={() => setShowSurveyForm(false)} className="p-1 hover:text-red-500 transition-colors"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <input value={newSurvey.title} onChange={e => setNewSurvey(p => ({ ...p, title: e.target.value }))}
                  placeholder="Anket başlığı *" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={newSurvey.type} onChange={e => setNewSurvey(p => ({ ...p, type: e.target.value as SurveyType }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
                  {(Object.keys(SURVEY_TYPE_CFG) as SurveyType[]).map(t => (
                    <option key={t} value={t}>{SURVEY_TYPE_CFG[t].label}</option>
                  ))}
                </select>
                <textarea value={newSurvey.description} onChange={e => setNewSurvey(p => ({ ...p, description: e.target.value }))}
                  placeholder="Açıklama..." rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none resize-none" />
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Hedef Yanıt Sayısı</label>
                  <input type="number" value={newSurvey.targetCount} onChange={e => setNewSurvey(p => ({ ...p, targetCount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowSurveyForm(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-background/80 transition-colors">İptal</button>
                <button onClick={submitSurvey} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Oluştur</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
