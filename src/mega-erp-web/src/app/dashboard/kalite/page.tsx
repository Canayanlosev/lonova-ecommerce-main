"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck, Plus, X, Search, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Clock, BarChart2,
  Download, Filter, RefreshCw, ClipboardList, Wrench,
  TrendingUp, TrendingDown, Star, Edit2, Trash2
} from "lucide-react";
import { useToast } from "@/store/ui.store";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend
} from "recharts";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0 }).format(n);
const fmtCur = (n: number) => "₺" + new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("tr-TR");

// ─── Types ────────────────────────────────────────────────────────────────────

type QCStatus = "beklemede" | "devam_ediyor" | "geçti" | "başarısız" | "koşullu_geçti";
type QCSeverity = "kritik" | "majör" | "minör" | "gözlem";
type WorkOrderStatus = "açık" | "devam_ediyor" | "tamamlandı" | "iptal";
type WorkOrderType = "bakım" | "onarım" | "üretim" | "kalibrasyon" | "temizlik" | "kurulum";
type Priority = "düşük" | "orta" | "yüksek" | "kritik";

interface DefectItem {
  id: string;
  code: string;
  description: string;
  severity: QCSeverity;
  quantity: number;
  location: string;
  photo?: string;
}

interface QCInspection {
  id: string;
  productName: string;
  batchNo: string;
  inspector: string;
  status: QCStatus;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defects: DefectItem[];
  score: number; // 0-100
  notes: string;
  createdAt: string;
  completedAt?: string;
}

interface WorkOrder {
  id: string;
  code: string;
  title: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: Priority;
  assignedTo: string;
  department: string;
  asset: string;
  description: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  estimatedHours: number;
  actualHours: number;
  estimatedCost: number;
  actualCost: number;
  checklistItems: { id: string; task: string; done: boolean }[];
  notes: string;
  createdAt: string;
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_INSPECTIONS: QCInspection[] = [
  {
    id: "qc001", productName: "Erkek Pamuklu T-Shirt", batchNo: "BATCH-2026-001",
    inspector: "Mehmet Yılmaz", status: "geçti", inspectedQty: 500, passedQty: 488, failedQty: 12,
    defects: [
      { id: "d1", code: "DEF-001", description: "Dikiş kayması", severity: "minör", quantity: 8, location: "Yaka bölgesi" },
      { id: "d2", code: "DEF-002", description: "Renk tutarsızlığı", severity: "majör", quantity: 4, location: "Gövde" }
    ],
    score: 97.6, notes: "Genel kalite yüksek. Minör defektler tolere edilebilir.", createdAt: "2026-05-20T08:00:00Z", completedAt: "2026-05-20T11:30:00Z"
  },
  {
    id: "qc002", productName: "Bayan Elbise - Çiçekli", batchNo: "BATCH-2026-002",
    inspector: "Ayşe Kaya", status: "başarısız", inspectedQty: 200, passedQty: 130, failedQty: 70,
    defects: [
      { id: "d3", code: "DEF-003", description: "Baskı hatalı", severity: "majör", quantity: 40, location: "Ön panel" },
      { id: "d4", code: "DEF-004", description: "Fermuar arızalı", severity: "kritik", quantity: 30, location: "Sırt" }
    ],
    score: 65.0, notes: "Kritik fermuar sorunu nedeniyle parti iade edildi.", createdAt: "2026-05-22T09:00:00Z", completedAt: "2026-05-22T14:00:00Z"
  },
  {
    id: "qc003", productName: "Çocuk Spor Ayakkabı", batchNo: "BATCH-2026-003",
    inspector: "Ali Demir", status: "devam_ediyor", inspectedQty: 150, passedQty: 120, failedQty: 5,
    defects: [
      { id: "d5", code: "DEF-005", description: "Taban yapışması zayıf", severity: "majör", quantity: 5, location: "Taban" }
    ],
    score: 80.0, notes: "Muayene devam ediyor.", createdAt: "2026-05-28T10:00:00Z"
  },
  {
    id: "qc004", productName: "Deri Cüzdan", batchNo: "BATCH-2026-004",
    inspector: "Fatma Şahin", status: "koşullu_geçti", inspectedQty: 300, passedQty: 285, failedQty: 15,
    defects: [
      { id: "d6", code: "DEF-006", description: "Cilt çizikleri", severity: "minör", quantity: 15, location: "Dış yüzey" }
    ],
    score: 95.0, notes: "İndirimli satış için onay verildi.", createdAt: "2026-05-25T08:00:00Z", completedAt: "2026-05-25T12:00:00Z"
  },
  {
    id: "qc005", productName: "Bebek Tulumu", batchNo: "BATCH-2026-005",
    inspector: "Mehmet Yılmaz", status: "beklemede", inspectedQty: 400, passedQty: 0, failedQty: 0,
    defects: [], score: 0, notes: "Muayene bekleniyor.", createdAt: "2026-05-30T09:00:00Z"
  }
];

const SEED_WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo001", code: "WO-2026-001", title: "Dikiş Makinası Bakımı", type: "bakım",
    status: "tamamlandı", priority: "yüksek", assignedTo: "Hasan Demir", department: "Üretim",
    asset: "Pfaff 2170 Dikiş Makinası", description: "Aylık periyodik bakım ve yağlama işlemi",
    plannedStart: "2026-05-15", plannedEnd: "2026-05-15",
    actualStart: "2026-05-15", actualEnd: "2026-05-15",
    estimatedHours: 3, actualHours: 2.5, estimatedCost: 500, actualCost: 420,
    checklistItems: [
      { id: "c1", task: "Yağ kontrolü", done: true },
      { id: "c2", task: "İğne değişimi", done: true },
      { id: "c3", task: "Gerilim ayarı", done: true },
      { id: "c4", task: "Test dikişi", done: true }
    ],
    notes: "Sorunsuz tamamlandı.", createdAt: "2026-05-10T08:00:00Z"
  },
  {
    id: "wo002", code: "WO-2026-002", title: "Kesim Makinası Bıçak Değişimi", type: "onarım",
    status: "devam_ediyor", priority: "kritik", assignedTo: "Ali Kaya", department: "Üretim",
    asset: "Gerber Kesim Makinası", description: "Aşınmış bıçakların acil değişimi",
    plannedStart: "2026-05-28", plannedEnd: "2026-05-29",
    actualStart: "2026-05-28",
    estimatedHours: 6, actualHours: 4, estimatedCost: 2500, actualCost: 1800,
    checklistItems: [
      { id: "c5", task: "Eski bıçakları çıkar", done: true },
      { id: "c6", task: "Yeni bıçak montajı", done: true },
      { id: "c7", task: "Kalibrasyon", done: false },
      { id: "c8", task: "Güvenlik testi", done: false }
    ],
    notes: "Kalibrasyona geçildi.", createdAt: "2026-05-27T14:00:00Z"
  },
  {
    id: "wo003", code: "WO-2026-003", title: "Boya Fırını Kalibrasyon", type: "kalibrasyon",
    status: "açık", priority: "orta", assignedTo: "Yusuf Öztürk", department: "Boyahane",
    asset: "Endüstriyel Boya Fırını #2", description: "Sıcaklık sensörü kalibrasyonu",
    plannedStart: "2026-06-02", plannedEnd: "2026-06-02",
    estimatedHours: 4, actualHours: 0, estimatedCost: 800, actualCost: 0,
    checklistItems: [
      { id: "c9", task: "Sensör söküm", done: false },
      { id: "c10", task: "Referans ölçüm", done: false },
      { id: "c11", task: "Ayar", done: false },
      { id: "c12", task: "Sertifika", done: false }
    ],
    notes: "", createdAt: "2026-05-28T10:00:00Z"
  },
  {
    id: "wo004", code: "WO-2026-004", title: "Depo Genel Temizlik", type: "temizlik",
    status: "açık", priority: "düşük", assignedTo: "Zeynep Arslan", department: "Depo",
    asset: "Depo A Bölümü", description: "Haftalık rutin depo temizliği",
    plannedStart: "2026-06-01", plannedEnd: "2026-06-01",
    estimatedHours: 8, actualHours: 0, estimatedCost: 200, actualCost: 0,
    checklistItems: [
      { id: "c13", task: "Raf silme", done: false },
      { id: "c14", task: "Zemin temizliği", done: false },
      { id: "c15", task: "Havalandırma", done: false }
    ],
    notes: "", createdAt: "2026-05-29T08:00:00Z"
  }
];

// ─── Status Config ──────────────────────────────────────────────────────────

const QC_STATUS_CFG: Record<QCStatus, { label: string; color: string; icon: React.ReactNode }> = {
  beklemede: { label: "Beklemede", color: "bg-slate-100 text-slate-700", icon: <Clock size={12} /> },
  devam_ediyor: { label: "Devam Ediyor", color: "bg-blue-100 text-blue-700", icon: <RefreshCw size={12} /> },
  geçti: { label: "Geçti ✓", color: "bg-green-100 text-green-700", icon: <CheckCircle2 size={12} /> },
  başarısız: { label: "Başarısız", color: "bg-red-100 text-red-700", icon: <XCircle size={12} /> },
  koşullu_geçti: { label: "Koşullu Geçti", color: "bg-amber-100 text-amber-700", icon: <AlertCircle size={12} /> }
};

const WO_STATUS_CFG: Record<WorkOrderStatus, { label: string; color: string }> = {
  açık: { label: "Açık", color: "bg-slate-100 text-slate-700" },
  devam_ediyor: { label: "Devam Ediyor", color: "bg-blue-100 text-blue-700" },
  tamamlandı: { label: "Tamamlandı", color: "bg-green-100 text-green-700" },
  iptal: { label: "İptal", color: "bg-red-100 text-red-700" }
};

const WO_TYPE_CFG: Record<WorkOrderType, { label: string; color: string }> = {
  bakım: { label: "Bakım", color: "bg-cyan-100 text-cyan-700" },
  onarım: { label: "Onarım", color: "bg-orange-100 text-orange-700" },
  üretim: { label: "Üretim", color: "bg-violet-100 text-violet-700" },
  kalibrasyon: { label: "Kalibrasyon", color: "bg-indigo-100 text-indigo-700" },
  temizlik: { label: "Temizlik", color: "bg-teal-100 text-teal-700" },
  kurulum: { label: "Kurulum", color: "bg-pink-100 text-pink-700" }
};

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  düşük: { label: "Düşük", color: "bg-slate-100 text-slate-600" },
  orta: { label: "Orta", color: "bg-yellow-100 text-yellow-700" },
  yüksek: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" }
};

const SEVERITY_CFG: Record<QCSeverity, { label: string; color: string }> = {
  gözlem: { label: "Gözlem", color: "bg-slate-100 text-slate-600" },
  minör: { label: "Minör", color: "bg-yellow-100 text-yellow-700" },
  majör: { label: "Majör", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" }
};

const WO_STATUS_NEXT: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  açık: "devam_ediyor", devam_ediyor: "tamamlandı", tamamlandı: null, iptal: null
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function KalitePage() {
  const toast = useToast();
  const [tab, setTab] = useState<"qc" | "workorders">("qc");

  // QC State
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [qcSearch, setQcSearch] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState<QCStatus | "tümü">("tümü");
  const [selectedQC, setSelectedQC] = useState<QCInspection | null>(null);
  const [showQCForm, setShowQCForm] = useState(false);

  // Work Order State
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [woSearch, setWoSearch] = useState("");
  const [woStatusFilter, setWoStatusFilter] = useState<WorkOrderStatus | "tümü">("tümü");
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [showWOForm, setShowWOForm] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const qi = localStorage.getItem("kalite-muayene");
      setInspections(qi ? JSON.parse(qi) : SEED_INSPECTIONS);
      if (!qi) localStorage.setItem("kalite-muayene", JSON.stringify(SEED_INSPECTIONS));

      const wo = localStorage.getItem("is-emirleri");
      setWorkOrders(wo ? JSON.parse(wo) : SEED_WORK_ORDERS);
      if (!wo) localStorage.setItem("is-emirleri", JSON.stringify(SEED_WORK_ORDERS));
    } catch {
      setInspections(SEED_INSPECTIONS);
      setWorkOrders(SEED_WORK_ORDERS);
    }
  }, []);

  const saveInspections = useCallback((data: QCInspection[]) => {
    setInspections(data);
    localStorage.setItem("kalite-muayene", JSON.stringify(data));
  }, []);

  const saveWorkOrders = useCallback((data: WorkOrder[]) => {
    setWorkOrders(data);
    localStorage.setItem("is-emirleri", JSON.stringify(data));
  }, []);

  // ─── QC Stats ────────────────────────────────────────────────────────────
  const qcStats = useMemo(() => {
    const completed = inspections.filter(i => i.status === "geçti" || i.status === "başarısız" || i.status === "koşullu_geçti");
    const passed = inspections.filter(i => i.status === "geçti" || i.status === "koşullu_geçti");
    const failed = inspections.filter(i => i.status === "başarısız");
    const totalInspected = inspections.reduce((s, i) => s + i.inspectedQty, 0);
    const totalPassed = inspections.reduce((s, i) => s + i.passedQty, 0);
    const passRate = totalInspected > 0 ? (totalPassed / totalInspected) * 100 : 0;
    const avgScore = completed.length > 0 ? completed.reduce((s, i) => s + i.score, 0) / completed.length : 0;
    return { total: inspections.length, passed: passed.length, failed: failed.length, passRate, avgScore, totalInspected };
  }, [inspections]);

  // ─── Work Order Stats ─────────────────────────────────────────────────────
  const woStats = useMemo(() => {
    const open = workOrders.filter(w => w.status === "açık").length;
    const inProgress = workOrders.filter(w => w.status === "devam_ediyor").length;
    const done = workOrders.filter(w => w.status === "tamamlandı").length;
    const totalCost = workOrders.reduce((s, w) => s + w.actualCost, 0);
    const overBudget = workOrders.filter(w => w.actualCost > w.estimatedCost).length;
    const efficiency = workOrders.filter(w => w.status === "tamamlandı").length > 0
      ? workOrders.filter(w => w.status === "tamamlandı" && w.actualHours <= w.estimatedHours).length /
        workOrders.filter(w => w.status === "tamamlandı").length * 100
      : 0;
    return { open, inProgress, done, totalCost, overBudget, efficiency };
  }, [workOrders]);

  // ─── Chart Data ───────────────────────────────────────────────────────────
  const qcChartData = useMemo(() => {
    const byProduct: Record<string, { geçti: number; başarısız: number; koşullu: number }> = {};
    inspections.forEach(i => {
      const key = i.productName.split(" ").slice(0, 2).join(" ");
      if (!byProduct[key]) byProduct[key] = { geçti: 0, başarısız: 0, koşullu: 0 };
      if (i.status === "geçti") byProduct[key].geçti++;
      else if (i.status === "başarısız") byProduct[key].başarısız++;
      else if (i.status === "koşullu_geçti") byProduct[key].koşullu++;
    });
    return Object.entries(byProduct).map(([name, v]) => ({ name, ...v }));
  }, [inspections]);

  const woTypeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    workOrders.forEach(w => { counts[w.type] = (counts[w.type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({ name: WO_TYPE_CFG[type as WorkOrderType].label, count }));
  }, [workOrders]);

  // ─── Filtered Lists ───────────────────────────────────────────────────────
  const filteredQC = useMemo(() => inspections.filter(i => {
    const matchSearch = i.productName.toLowerCase().includes(qcSearch.toLowerCase()) ||
      i.batchNo.toLowerCase().includes(qcSearch.toLowerCase()) ||
      i.inspector.toLowerCase().includes(qcSearch.toLowerCase());
    const matchStatus = qcStatusFilter === "tümü" || i.status === qcStatusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [inspections, qcSearch, qcStatusFilter]);

  const filteredWO = useMemo(() => workOrders.filter(w => {
    const matchSearch = w.title.toLowerCase().includes(woSearch.toLowerCase()) ||
      w.code.toLowerCase().includes(woSearch.toLowerCase()) ||
      w.assignedTo.toLowerCase().includes(woSearch.toLowerCase()) ||
      w.asset.toLowerCase().includes(woSearch.toLowerCase());
    const matchStatus = woStatusFilter === "tümü" || w.status === woStatusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    const pOrder: Record<Priority, number> = { kritik: 0, yüksek: 1, orta: 2, düşük: 3 };
    return pOrder[a.priority] - pOrder[b.priority];
  }), [workOrders, woSearch, woStatusFilter]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const advanceWOStatus = useCallback((id: string) => {
    const wo = workOrders.find(w => w.id === id);
    if (!wo) return;
    const next = WO_STATUS_NEXT[wo.status];
    if (!next) return;
    const updated = workOrders.map(w => w.id === id ? {
      ...w, status: next,
      actualStart: next === "devam_ediyor" ? new Date().toISOString().slice(0, 10) : w.actualStart,
      actualEnd: next === "tamamlandı" ? new Date().toISOString().slice(0, 10) : w.actualEnd
    } : w);
    saveWorkOrders(updated);
    if (selectedWO?.id === id) setSelectedWO(updated.find(w => w.id === id) || null);
    toast.success(`İş emri "${next}" durumuna güncellendi`);
  }, [workOrders, saveWorkOrders, selectedWO, toast]);

  const toggleChecklistItem = useCallback((woId: string, itemId: string) => {
    const updated = workOrders.map(w => w.id === woId ? {
      ...w, checklistItems: w.checklistItems.map(c => c.id === itemId ? { ...c, done: !c.done } : c)
    } : w);
    saveWorkOrders(updated);
    setSelectedWO(prev => prev?.id === woId ? updated.find(w => w.id === woId) || null : prev);
  }, [workOrders, saveWorkOrders]);

  const deleteQC = useCallback((id: string) => {
    saveInspections(inspections.filter(i => i.id !== id));
    if (selectedQC?.id === id) setSelectedQC(null);
    toast.success("Muayene kaydı silindi");
  }, [inspections, saveInspections, selectedQC, toast]);

  const deleteWO = useCallback((id: string) => {
    saveWorkOrders(workOrders.filter(w => w.id !== id));
    if (selectedWO?.id === id) setSelectedWO(null);
    toast.success("İş emri silindi");
  }, [workOrders, saveWorkOrders, selectedWO, toast]);

  const exportWOCSV = useCallback(() => {
    const header = "Kod,Başlık,Tip,Durum,Öncelik,Atanan,Departman,Varlık,Plan Başlangıç,Plan Bitiş,Tahmini Süre(h),Gerçek Süre(h),Tahmini Maliyet,Gerçek Maliyet\n";
    const rows = workOrders.map(w =>
      [w.code, w.title, w.type, w.status, w.priority, w.assignedTo, w.department, w.asset,
        w.plannedStart, w.plannedEnd, w.estimatedHours, w.actualHours,
        w.estimatedCost, w.actualCost].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "is_emirleri.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV indirildi");
  }, [workOrders, toast]);

  // ─── QC Form ─────────────────────────────────────────────────────────────

  const [newQC, setNewQC] = useState({
    productName: "", batchNo: "", inspector: "", inspectedQty: 100,
    passedQty: 95, notes: "", status: "devam_ediyor" as QCStatus
  });

  const submitQC = () => {
    if (!newQC.productName || !newQC.inspector) {
      toast.error("Ürün adı ve denetçi zorunludur");
      return;
    }
    const failedQty = newQC.inspectedQty - newQC.passedQty;
    const score = newQC.inspectedQty > 0 ? (newQC.passedQty / newQC.inspectedQty) * 100 : 0;
    const item: QCInspection = {
      id: uid(), ...newQC, failedQty, score, defects: [],
      createdAt: new Date().toISOString(),
      completedAt: newQC.status !== "devam_ediyor" && newQC.status !== "beklemede" ? new Date().toISOString() : undefined
    };
    saveInspections([item, ...inspections]);
    setShowQCForm(false);
    setNewQC({ productName: "", batchNo: "", inspector: "", inspectedQty: 100, passedQty: 95, notes: "", status: "devam_ediyor" });
    toast.success("Muayene kaydı eklendi");
  };

  // ─── Work Order Form ──────────────────────────────────────────────────────

  const [newWO, setNewWO] = useState({
    title: "", type: "bakım" as WorkOrderType, priority: "orta" as Priority,
    assignedTo: "", department: "", asset: "", description: "",
    plannedStart: new Date().toISOString().slice(0, 10),
    plannedEnd: new Date().toISOString().slice(0, 10),
    estimatedHours: 4, estimatedCost: 500
  });

  const submitWO = () => {
    if (!newWO.title || !newWO.assignedTo) {
      toast.error("Başlık ve atanan kişi zorunludur");
      return;
    }
    const woCount = workOrders.length + 1;
    const item: WorkOrder = {
      id: uid(),
      code: `WO-2026-${String(woCount).padStart(3, "0")}`,
      status: "açık", actualHours: 0, actualCost: 0, notes: "",
      checklistItems: [], createdAt: new Date().toISOString(), ...newWO
    };
    saveWorkOrders([item, ...workOrders]);
    setShowWOForm(false);
    setNewWO({ title: "", type: "bakım", priority: "orta", assignedTo: "", department: "", asset: "", description: "", plannedStart: new Date().toISOString().slice(0, 10), plannedEnd: new Date().toISOString().slice(0, 10), estimatedHours: 4, estimatedCost: 500 });
    toast.success("İş emri oluşturuldu");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <ShieldCheck size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kalite & İş Emirleri</h1>
            <p className="text-sm text-foreground/60">Kalite muayenesi ve bakım/onarım iş emirleri</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportWOCSV} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-background/80 transition-colors">
            <Download size={14} /> CSV
          </button>
          {tab === "qc" ? (
            <button onClick={() => setShowQCForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus size={16} /> Muayene Ekle
            </button>
          ) : (
            <button onClick={() => setShowWOForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus size={16} /> İş Emri Oluştur
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-background border border-border rounded-xl w-fit">
        {([
          { key: "qc", label: "Kalite Muayenesi", icon: ShieldCheck },
          { key: "workorders", label: "İş Emirleri", icon: Wrench }
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-primary text-white shadow-sm" : "text-foreground/60 hover:text-foreground"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ─── QC Tab ─────────────────────────────────────────────────────── */}
      {tab === "qc" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Toplam Muayene", value: fmt(qcStats.total), icon: ClipboardList, color: "text-blue-500" },
              { label: "Geçti", value: fmt(qcStats.passed), icon: CheckCircle2, color: "text-green-500" },
              { label: "Başarısız", value: fmt(qcStats.failed), icon: XCircle, color: "text-red-500" },
              { label: "Geçiş Oranı", value: `%${qcStats.passRate.toFixed(1)}`, icon: TrendingUp, color: "text-emerald-500" }
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="premium-card p-4">
                <div className="flex items-center gap-3">
                  <Icon size={20} className={color} />
                  <div>
                    <p className="text-xs text-foreground/60">{label}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {qcChartData.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold mb-4 text-foreground">Ürün Bazında Muayene Sonuçları</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={qcChartData} barSize={20}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="geçti" name="Geçti" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="başarısız" name="Başarısız" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="koşullu" name="Koşullu" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input value={qcSearch} onChange={e => setQcSearch(e.target.value)} placeholder="Ürün, parti no, denetçi..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={qcStatusFilter} onChange={e => setQcStatusFilter(e.target.value as QCStatus | "tümü")}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
              <option value="tümü">Tüm Durumlar</option>
              {(Object.keys(QC_STATUS_CFG) as QCStatus[]).map(s => (
                <option key={s} value={s}>{QC_STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Table + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 premium-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background/60 border-b border-border">
                  <tr>
                    {["Ürün / Parti", "Denetçi", "Miktar", "Puan", "Durum", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQC.map(i => {
                    const cfg = QC_STATUS_CFG[i.status];
                    return (
                      <tr key={i.id} onClick={() => setSelectedQC(selectedQC?.id === i.id ? null : i)}
                        className={`border-b border-border/50 hover:bg-background/40 cursor-pointer transition-colors ${selectedQC?.id === i.id ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{i.productName}</p>
                          <p className="text-xs text-foreground/50">{i.batchNo}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground/70">{i.inspector}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{fmt(i.passedQty)}/{fmt(i.inspectedQty)}</p>
                          <p className="text-xs text-red-500">{i.failedQty > 0 ? `${i.failedQty} hatalı` : ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star size={12} className={i.score >= 80 ? "text-yellow-500" : "text-red-400"} />
                            <span className={`font-medium ${i.score >= 80 ? "text-foreground" : "text-red-500"}`}>{i.score.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={e => { e.stopPropagation(); deleteQC(i.id); }}
                            className="p-1 hover:text-red-500 transition-colors text-foreground/40">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredQC.length === 0 && (
                <div className="text-center py-12 text-foreground/40">
                  <ShieldCheck size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Muayene kaydı bulunamadı</p>
                </div>
              )}
            </div>

            {/* QC Detail */}
            <AnimatePresence>
              {selectedQC && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="premium-card p-5 space-y-4 self-start">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground">{selectedQC.productName}</h3>
                    <button onClick={() => setSelectedQC(null)} className="p-1 hover:text-red-500 transition-colors text-foreground/40">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-foreground/60">Parti No</span><span className="font-medium">{selectedQC.batchNo}</span></div>
                    <div className="flex justify-between"><span className="text-foreground/60">Denetçi</span><span>{selectedQC.inspector}</span></div>
                    <div className="flex justify-between"><span className="text-foreground/60">Tarih</span><span>{fmtDate(selectedQC.createdAt)}</span></div>
                    <div className="flex justify-between"><span className="text-foreground/60">Kontrol Edilen</span><span>{fmt(selectedQC.inspectedQty)} adet</span></div>
                    <div className="flex justify-between"><span className="text-foreground/60">Geçen</span><span className="text-green-600 font-medium">{fmt(selectedQC.passedQty)}</span></div>
                    <div className="flex justify-between"><span className="text-foreground/60">Hatalı</span><span className="text-red-500 font-medium">{fmt(selectedQC.failedQty)}</span></div>
                    <div className="flex justify-between"><span className="text-foreground/60">Kalite Puanı</span><span className="font-bold">{selectedQC.score.toFixed(1)}/100</span></div>
                  </div>
                  {/* Score bar */}
                  <div>
                    <div className="w-full bg-border/50 rounded-full h-2">
                      <div className={`h-2 rounded-full ${selectedQC.score >= 90 ? "bg-green-500" : selectedQC.score >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${selectedQC.score}%` }} />
                    </div>
                  </div>
                  {selectedQC.defects.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/60 mb-2">HATA DETAYLARI</p>
                      <div className="space-y-2">
                        {selectedQC.defects.map(d => {
                          const sev = SEVERITY_CFG[d.severity];
                          return (
                            <div key={d.id} className="p-2 border border-border/50 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-mono text-foreground/50">{d.code}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${sev.color}`}>{sev.label}</span>
                              </div>
                              <p className="text-sm text-foreground">{d.description}</p>
                              <p className="text-xs text-foreground/50">{d.location} • {d.quantity} adet</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedQC.notes && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-xs text-foreground/60">{selectedQC.notes}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ─── Work Orders Tab ─────────────────────────────────────────────── */}
      {tab === "workorders" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Açık", value: fmt(woStats.open), icon: AlertCircle, color: "text-amber-500" },
              { label: "Devam Ediyor", value: fmt(woStats.inProgress), icon: RefreshCw, color: "text-blue-500" },
              { label: "Tamamlandı", value: fmt(woStats.done), icon: CheckCircle2, color: "text-green-500" },
              { label: "Toplam Maliyet", value: fmtCur(woStats.totalCost), icon: TrendingDown, color: "text-violet-500" }
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="premium-card p-4">
                <div className="flex items-center gap-3">
                  <Icon size={20} className={color} />
                  <div>
                    <p className="text-xs text-foreground/60">{label}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {woTypeChartData.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold mb-4 text-foreground">İş Emri Tip Dağılımı</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={woTypeChartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Bar dataKey="count" name="Adet" radius={[4, 4, 0, 0]}>
                    {woTypeChartData.map((_, idx) => (
                      <Cell key={idx} fill={["#3b82f6","#f59e0b","#8b5cf6","#06b6d4","#10b981","#ec4899"][idx % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input value={woSearch} onChange={e => setWoSearch(e.target.value)} placeholder="Başlık, kod, kişi, varlık..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={woStatusFilter} onChange={e => setWoStatusFilter(e.target.value as WorkOrderStatus | "tümü")}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
              <option value="tümü">Tüm Durumlar</option>
              {(Object.keys(WO_STATUS_CFG) as WorkOrderStatus[]).map(s => (
                <option key={s} value={s}>{WO_STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* WO List + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              {filteredWO.map(wo => {
                const statusCfg = WO_STATUS_CFG[wo.status];
                const typeCfg = WO_TYPE_CFG[wo.type];
                const prioCfg = PRIORITY_CFG[wo.priority];
                const checkDone = wo.checklistItems.filter(c => c.done).length;
                const checkTotal = wo.checklistItems.length;
                const progress = checkTotal > 0 ? (checkDone / checkTotal) * 100 : 0;
                const overBudget = wo.actualCost > wo.estimatedCost;

                return (
                  <div key={wo.id} onClick={() => setSelectedWO(selectedWO?.id === wo.id ? null : wo)}
                    className={`premium-card p-4 cursor-pointer hover:border-primary/30 transition-all ${selectedWO?.id === wo.id ? "border-primary/40 bg-primary/3" : ""} ${wo.priority === "kritik" ? "border-l-4 border-l-red-500" : wo.priority === "yüksek" ? "border-l-4 border-l-orange-500" : ""}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-foreground/50">{wo.code}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${typeCfg.color}`}>{typeCfg.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${prioCfg.color}`}>{prioCfg.label}</span>
                        </div>
                        <p className="font-semibold text-foreground">{wo.title}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">{wo.asset} • {wo.assignedTo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                        {WO_STATUS_NEXT[wo.status] && (
                          <button onClick={e => { e.stopPropagation(); advanceWOStatus(wo.id); }}
                            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium">
                            İlerlet →
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); deleteWO(wo.id); }}
                          className="p-1 hover:text-red-500 transition-colors text-foreground/30">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-foreground/50">
                      <span>{wo.plannedStart} → {wo.plannedEnd}</span>
                      <span>{wo.estimatedHours}h tahmin</span>
                      {overBudget && <span className="text-red-500 font-medium">Bütçe aşıldı!</span>}
                    </div>
                    {checkTotal > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-foreground/50 mb-1">
                          <span>Kontrol listesi</span><span>{checkDone}/{checkTotal}</span>
                        </div>
                        <div className="w-full bg-border/50 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredWO.length === 0 && (
                <div className="premium-card text-center py-12 text-foreground/40">
                  <Wrench size={32} className="mx-auto mb-2 opacity-30" />
                  <p>İş emri bulunamadı</p>
                </div>
              )}
            </div>

            {/* WO Detail */}
            <AnimatePresence>
              {selectedWO && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="premium-card p-5 space-y-4 self-start">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono text-foreground/50">{selectedWO.code}</p>
                      <h3 className="font-semibold text-foreground">{selectedWO.title}</h3>
                    </div>
                    <button onClick={() => setSelectedWO(null)} className="p-1 hover:text-red-500 transition-colors text-foreground/40"><X size={14} /></button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Varlık", value: selectedWO.asset },
                      { label: "Atanan", value: selectedWO.assignedTo },
                      { label: "Departman", value: selectedWO.department },
                      { label: "Plan", value: `${selectedWO.plannedStart} → ${selectedWO.plannedEnd}` },
                      { label: "Tahmini Süre", value: `${selectedWO.estimatedHours}h` },
                      { label: "Gerçek Süre", value: `${selectedWO.actualHours}h` },
                      { label: "Tahmini Maliyet", value: fmtCur(selectedWO.estimatedCost) },
                      { label: "Gerçek Maliyet", value: fmtCur(selectedWO.actualCost) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-foreground/60">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  {selectedWO.description && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-xs text-foreground/70">{selectedWO.description}</p>
                    </div>
                  )}
                  {selectedWO.checklistItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/60 mb-2">KONTROL LİSTESİ</p>
                      <div className="space-y-1">
                        {selectedWO.checklistItems.map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-background/50 px-2 py-1 rounded-lg transition-colors"
                            onClick={() => toggleChecklistItem(selectedWO.id, c.id)}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${c.done ? "bg-green-500 border-green-500" : "border-border"}`}>
                              {c.done && <CheckCircle2 size={10} className="text-white" />}
                            </div>
                            <span className={`text-sm ${c.done ? "line-through text-foreground/40" : "text-foreground"}`}>{c.task}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ─── QC Form Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQCForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-background border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Yeni Muayene Kaydı</h2>
                <button onClick={() => setShowQCForm(false)} className="p-1 hover:text-red-500 transition-colors"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <input value={newQC.productName} onChange={e => setNewQC(p => ({ ...p, productName: e.target.value }))}
                  placeholder="Ürün adı *" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={newQC.batchNo} onChange={e => setNewQC(p => ({ ...p, batchNo: e.target.value }))}
                    placeholder="Parti no" className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  <input value={newQC.inspector} onChange={e => setNewQC(p => ({ ...p, inspector: e.target.value }))}
                    placeholder="Denetçi adı *" className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Kontrol Edilen</label>
                    <input type="number" value={newQC.inspectedQty} onChange={e => setNewQC(p => ({ ...p, inspectedQty: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Geçen</label>
                    <input type="number" value={newQC.passedQty} onChange={e => setNewQC(p => ({ ...p, passedQty: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  </div>
                </div>
                <select value={newQC.status} onChange={e => setNewQC(p => ({ ...p, status: e.target.value as QCStatus }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
                  {(Object.keys(QC_STATUS_CFG) as QCStatus[]).map(s => (
                    <option key={s} value={s}>{QC_STATUS_CFG[s].label}</option>
                  ))}
                </select>
                <textarea value={newQC.notes} onChange={e => setNewQC(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notlar..." rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowQCForm(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-background/80 transition-colors">İptal</button>
                <button onClick={submitQC} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Kaydet</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── WO Form Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWOForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-background border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Yeni İş Emri</h2>
                <button onClick={() => setShowWOForm(false)} className="p-1 hover:text-red-500 transition-colors"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <input value={newWO.title} onChange={e => setNewWO(p => ({ ...p, title: e.target.value }))}
                  placeholder="İş emri başlığı *" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={newWO.type} onChange={e => setNewWO(p => ({ ...p, type: e.target.value as WorkOrderType }))}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
                    {(Object.keys(WO_TYPE_CFG) as WorkOrderType[]).map(t => (
                      <option key={t} value={t}>{WO_TYPE_CFG[t].label}</option>
                    ))}
                  </select>
                  <select value={newWO.priority} onChange={e => setNewWO(p => ({ ...p, priority: e.target.value as Priority }))}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none">
                    {(Object.keys(PRIORITY_CFG) as Priority[]).map(p => (
                      <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newWO.assignedTo} onChange={e => setNewWO(p => ({ ...p, assignedTo: e.target.value }))}
                    placeholder="Atanan kişi *" className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  <input value={newWO.department} onChange={e => setNewWO(p => ({ ...p, department: e.target.value }))}
                    placeholder="Departman" className="px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                </div>
                <input value={newWO.asset} onChange={e => setNewWO(p => ({ ...p, asset: e.target.value }))}
                  placeholder="Varlık / Ekipman" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Planlanan Başlangıç</label>
                    <input type="date" value={newWO.plannedStart} onChange={e => setNewWO(p => ({ ...p, plannedStart: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Planlanan Bitiş</label>
                    <input type="date" value={newWO.plannedEnd} onChange={e => setNewWO(p => ({ ...p, plannedEnd: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Tahmini Süre (saat)</label>
                    <input type="number" value={newWO.estimatedHours} onChange={e => setNewWO(p => ({ ...p, estimatedHours: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Tahmini Maliyet (₺)</label>
                    <input type="number" value={newWO.estimatedCost} onChange={e => setNewWO(p => ({ ...p, estimatedCost: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none" />
                  </div>
                </div>
                <textarea value={newWO.description} onChange={e => setNewWO(p => ({ ...p, description: e.target.value }))}
                  placeholder="Açıklama..." rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowWOForm(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-background/80 transition-colors">İptal</button>
                <button onClick={submitWO} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Oluştur</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
