'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Users, Building2, CalendarDays, Check, X, Plus, Trash2, Edit2,
  AlertCircle, AlertTriangle, DollarSign, Mail, Phone, RefreshCw, FileSpreadsheet, Download, Info,
  ChevronLeft, ChevronRight, Gift, Award
} from 'lucide-react'
import { hrService } from '@/lib/services/hr.service'
import { useToast } from '@/store/ui.store'
import type { Employee, Department, LeaveRequest } from '@/types/api.types'

type Tab = 'employees' | 'departments' | 'leave' | 'bordro'

// ─── Turkish Payroll Calculation (2024 approximate rates) ──────────────────
// SGK İşçi: %14 SSK + %1 İşsizlik = %15
// Gelir Vergisi: Cumulative progressive brackets (monthly matrah)
// Damga Vergisi: %0.759 of gross
// SGK İşveren: %15.5 SSK + %2.5 İşsizlik = %18

const SGK_ISCII = 0.15
const SGK_ISVEREN = 0.18
const DAMGA = 0.00759

const GV_BRACKETS: { limit: number; rate: number }[] = [
  { limit: 110_000 / 12, rate: 0.15 },   // ~9,167 ₺/ay
  { limit: 230_000 / 12, rate: 0.20 },   // ~19,167 ₺/ay
  { limit: 870_000 / 12, rate: 0.27 },   // ~72,500 ₺/ay
  { limit: 3_000_000 / 12, rate: 0.35 }, // ~250,000 ₺/ay
  { limit: Infinity, rate: 0.40 },
]

function hesaplaGelirVergisi(matrah: number): number {
  let vergi = 0
  let prev = 0
  for (const b of GV_BRACKETS) {
    if (matrah <= prev) break
    const dilim = Math.min(matrah, b.limit) - prev
    vergi += dilim * b.rate
    prev = b.limit
    if (matrah <= b.limit) break
  }
  return vergi
}

interface BordroRow {
  id: string
  ad: string
  departman: string
  brut: number
  sgkIscii: number
  gelirVergisi: number
  damgaVergisi: number
  toplamKesinti: number
  net: number
  sgkIsveren: number
  toplamMaliyet: number
}

interface EmployeeForm {
  firstName: string; lastName: string; email: string; phone: string
  hireDate: string; salary: string; departmentId: string
}
const EMPTY_EMP: EmployeeForm = { firstName: '', lastName: '', email: '', phone: '', hireDate: '', salary: '', departmentId: '' }

interface DeptForm { name: string; description: string }
const EMPTY_DEPT: DeptForm = { name: '', description: '' }

function getServiceYears(hireDate: string): number {
  const hire = new Date(hireDate)
  const today = new Date()
  let years = today.getFullYear() - hire.getFullYear()
  if (today.getMonth() < hire.getMonth() ||
    (today.getMonth() === hire.getMonth() && today.getDate() < hire.getDate())) years--
  return Math.max(0, years)
}

const LEAVE_STATUS: Record<string, { label: string; cls: string }> = {
  Pending:  { label: 'Bekliyor',    cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  Approved: { label: 'Onaylandı',   cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Rejected: { label: 'Reddedildi',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all'

export default function HRPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Employee modal
  const [empModal, setEmpModal] = useState(false)
  const [editEmpId, setEditEmpId] = useState<string | null>(null)
  const [empForm, setEmpForm] = useState<EmployeeForm>(EMPTY_EMP)
  const [empSaving, setEmpSaving] = useState(false)
  const [empError, setEmpError] = useState('')

  // Department modal
  const [deptModal, setDeptModal] = useState(false)
  const [editDeptId, setEditDeptId] = useState<string | null>(null)
  const [deptForm, setDeptForm] = useState<DeptForm>(EMPTY_DEPT)
  const [deptSaving, setDeptSaving] = useState(false)
  const [deptError, setDeptError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [emps, depts, leaves] = await Promise.all([
        hrService.getEmployees(),
        hrService.getDepartments(),
        hrService.getLeaveRequests(),
      ])
      setEmployees(emps)
      setDepartments(depts)
      setLeaveRequests(leaves)
    } catch {
      toast.error('Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Leave ────────────────────────────────────────────────────────────────
  const updateLeave = async (id: string, status: string) => {
    try {
      await hrService.updateLeaveStatus(id, status)
      toast.success(status === 'Approved' ? 'İzin onaylandı.' : 'İzin reddedildi.')
      load()
    } catch {
      toast.error('İşlem başarısız.')
    }
  }

  // ─── Employees ────────────────────────────────────────────────────────────
  const openCreateEmployee = () => { setEditEmpId(null); setEmpForm(EMPTY_EMP); setEmpError(''); setEmpModal(true) }
  const openEditEmployee = (e: Employee) => {
    setEditEmpId(e.id)
    setEmpForm({ firstName: e.firstName, lastName: e.lastName, email: e.email,
      phone: e.phone, hireDate: e.hireDate.slice(0, 10),
      salary: String(e.salary), departmentId: e.departmentId ?? '' })
    setEmpError('')
    setEmpModal(true)
  }

  const handleSaveEmployee = async () => {
    if (!empForm.firstName.trim() || !empForm.lastName.trim() || !empForm.email.trim()) {
      setEmpError('Ad, soyad ve e-posta zorunludur.'); return
    }
    setEmpSaving(true); setEmpError('')
    const payload = {
      firstName: empForm.firstName.trim(), lastName: empForm.lastName.trim(),
      email: empForm.email.trim(), phone: empForm.phone.trim(),
      hireDate: empForm.hireDate || new Date().toISOString().slice(0, 10),
      salary: Number(empForm.salary) || 0,
      departmentId: empForm.departmentId || undefined,
    }
    try {
      if (editEmpId) {
        await hrService.updateEmployee(editEmpId, payload)
        toast.success('Çalışan güncellendi.')
      } else {
        await hrService.createEmployee(payload as Omit<Employee, 'id' | 'departmentName'>)
        toast.success('Çalışan oluşturuldu.')
      }
      setEmpModal(false)
      load()
    } catch {
      setEmpError('İşlem başarısız.')
    } finally {
      setEmpSaving(false)
    }
  }

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`"${name}" çalışanını silmek istediğinize emin misiniz?`)) return
    try {
      await hrService.deleteEmployee(id)
      toast.success(`${name} silindi.`)
      load()
    } catch {
      toast.error('Çalışan silinemedi.')
    }
  }

  // ─── Departments ──────────────────────────────────────────────────────────
  const openCreateDept = () => { setEditDeptId(null); setDeptForm(EMPTY_DEPT); setDeptError(''); setDeptModal(true) }
  const openEditDept = (d: Department) => {
    setEditDeptId(d.id)
    setDeptForm({ name: d.name, description: d.description ?? '' })
    setDeptError('')
    setDeptModal(true)
  }

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) { setDeptError('Departman adı zorunludur.'); return }
    setDeptSaving(true); setDeptError('')
    const payload = { name: deptForm.name.trim(), description: deptForm.description.trim() || undefined }
    try {
      if (editDeptId) {
        await hrService.updateDepartment(editDeptId, payload)
        toast.success('Departman güncellendi.')
      } else {
        await hrService.createDepartment(payload)
        toast.success('Departman oluşturuldu.')
      }
      setDeptModal(false)
      load()
    } catch {
      setDeptError('İşlem başarısız.')
    } finally {
      setDeptSaving(false)
    }
  }

  const handleDeleteDept = async (id: string, name: string) => {
    if (!confirm(`"${name}" departmanını silmek istediğinize emin misiniz?`)) return
    try {
      await hrService.deleteDepartment(id)
      toast.success(`${name} silindi.`)
      load()
    } catch {
      toast.error('Departman silinemedi.')
    }
  }

  // ─── Derived stats ────────────────────────────────────────────────────────
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0)
  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'Pending').length

  // ─── Work anniversaries (next 30 days, completing ≥1 year) ────────────────
  const anniversaries = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return employees.map(e => {
      const hire = new Date(e.hireDate)
      const thisYear = new Date(today.getFullYear(), hire.getMonth(), hire.getDate())
      const annivDate = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, hire.getMonth(), hire.getDate())
      const daysUntil = Math.round((annivDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const yearsCompleting = annivDate.getFullYear() - hire.getFullYear()
      return { employee: e, daysUntil, yearsCompleting }
    }).filter(a => a.daysUntil <= 30 && a.yearsCompleting >= 1).sort((a, b) => a.daysUntil - b.daysUntil)
  }, [employees])

  // ─── Leave Calendar ───────────────────────────────────────────────────────
  const [calendarDate, setCalendarDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const todayISO = new Date().toISOString().slice(0, 10)

  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const startOffset = (firstDow + 6) % 7 // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ day: number | null; dateStr: string; pending: number; approved: number; rejected: number }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateStr: '', pending: 0, approved: 0, rejected: 0 })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayLeaves = leaveRequests.filter(r => dateStr >= r.startDate.slice(0, 10) && dateStr <= r.endDate.slice(0, 10))
      cells.push({
        day: d, dateStr,
        pending: dayLeaves.filter(r => r.status === 'Pending').length,
        approved: dayLeaves.filter(r => r.status === 'Approved').length,
        rejected: dayLeaves.filter(r => r.status === 'Rejected').length,
      })
    }
    return cells
  }, [calendarDate, leaveRequests])

  // ─── Leave balance per employee (Türk İş Kanunu Md. 53) ─────────────────────
  const leaveBalances = useMemo(() => {
    const thisYear = new Date().getFullYear()
    return employees.map(e => {
      const years = getServiceYears(e.hireDate)
      // Entitlement: <1yr no right, 1-5yr: 14 days, 5-15yr: 20 days, 15+yr: 26 days
      const entitlement = years < 1 ? 0 : years < 5 ? 14 : years < 15 ? 20 : 26
      const usedDays = leaveRequests
        .filter(r =>
          r.employeeId === e.id &&
          r.status === 'Approved' &&
          new Date(r.startDate).getFullYear() === thisYear
        )
        .reduce((s, r) => {
          const start = new Date(r.startDate)
          const end = new Date(r.endDate)
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
          return s + Math.max(0, days)
        }, 0)
      const remaining = Math.max(0, entitlement - usedDays)
      const pct = entitlement > 0 ? Math.round((usedDays / entitlement) * 100) : 0
      return { employee: e, entitlement, usedDays, remaining, pct, years }
    }).sort((a, b) => a.remaining - b.remaining)
  }, [employees, leaveRequests])

  const lowBalanceCount = leaveBalances.filter(b => b.remaining <= 3 && b.entitlement > 0).length

  // ─── Kıdem Tazminatı (Severance pay — Türk İş Kanunu Md. 14) ────────────────
  // 2025 kıdem tazminatı tavanı (H1): ₺47,085.30 (her yıl için 30 günlük brüt maaş, tavan ile sınırlı)
  const KIDEM_TAVANI = 47_085.30
  const kidemRows = useMemo(() => {
    return employees.map(e => {
      const years = getServiceYears(e.hireDate)
      if (years < 1) return { employee: e, years, kidemTazminati: 0, eligible: false }
      const gunlukBrut = e.salary / 30
      const yillikHak = Math.min(gunlukBrut * 30, KIDEM_TAVANI)
      const toplamKidem = Math.round(yillikHak * years)
      return { employee: e, years, kidemTazminati: toplamKidem, eligible: true }
    }).sort((a, b) => b.kidemTazminati - a.kidemTazminati)
  }, [employees])

  const toplamKidem = kidemRows.reduce((s, r) => s + r.kidemTazminati, 0)

  // ─── Payroll computation ───────────────────────────────────────────────────
  const bordroRows: BordroRow[] = employees.map(e => {
    const brut = e.salary
    const sgkIscii = Math.round(brut * SGK_ISCII)
    const matrah = brut - sgkIscii
    const gelirVergisi = Math.round(hesaplaGelirVergisi(matrah))
    const damgaVergisi = Math.round(brut * DAMGA)
    const toplamKesinti = sgkIscii + gelirVergisi + damgaVergisi
    const net = brut - toplamKesinti
    const sgkIsveren = Math.round(brut * SGK_ISVEREN)
    const toplamMaliyet = brut + sgkIsveren
    return {
      id: e.id,
      ad: `${e.firstName} ${e.lastName}`,
      departman: e.departmentName ?? '—',
      brut, sgkIscii, gelirVergisi, damgaVergisi, toplamKesinti, net, sgkIsveren, toplamMaliyet,
    }
  })

  const bordroToplam = bordroRows.reduce(
    (acc, r) => ({
      brut: acc.brut + r.brut,
      net: acc.net + r.net,
      sgkIscii: acc.sgkIscii + r.sgkIscii,
      toplamMaliyet: acc.toplamMaliyet + r.toplamMaliyet,
    }),
    { brut: 0, net: 0, sgkIscii: 0, toplamMaliyet: 0 }
  )

  const handleExportBordro = () => {
    const ay = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    const header = ['Ad Soyad', 'Departman', 'Brüt Maaş', 'SGK İşçi (%15)', 'Gelir Vergisi', 'Damga Vergisi', 'Toplam Kesinti', 'Net Maaş', 'SGK İşveren (%18)', 'Toplam İşveren Maliyeti']
    const rows = bordroRows.map(r => [
      r.ad, r.departman, r.brut, r.sgkIscii, r.gelirVergisi, r.damgaVergisi, r.toplamKesinti, r.net, r.sgkIsveren, r.toplamMaliyet
    ])
    const csv = [header, ...rows].map(row => row.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Bordro-${ay}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'employees',   label: 'Çalışanlar',      icon: Users,            badge: employees.length },
    { id: 'departments', label: 'Departmanlar',     icon: Building2,        badge: departments.length },
    { id: 'leave',       label: 'İzin Talepleri',   icon: CalendarDays,     badge: pendingLeaveCount },
    { id: 'bordro',      label: 'Bordro',            icon: FileSpreadsheet },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Users className="w-8 h-8 text-primary" /> İK Yönetimi
          </h1>
          <p className="text-slate-400 text-sm font-semibold">Çalışanlar, departman yapısı, izinler ve bordro süreçleri</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl border border-border bg-slate-950/20 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Çalışan', value: employees.length, icon: Users, color: 'bg-primary/10 text-primary border border-primary/20' },
          { label: 'Departman',      value: departments.length, icon: Building2, color: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
          { label: 'Bekleyen İzin',  value: pendingLeaveCount, icon: CalendarDays, color: pendingLeaveCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-950/40 text-slate-400 border border-border/80' },
          { label: 'Aylık Bordro',   value: `₺${totalPayroll.toLocaleString('tr-TR')}`, icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', isText: true },
        ].map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="premium-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
              <p className={`font-black text-foreground mt-1 ${isText ? 'text-sm font-mono' : 'text-2xl'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Anniversary banner — only when upcoming anniversaries exist */}
      {!loading && anniversaries.length > 0 && (
        <div className="premium-card p-5 border-l-4 border-violet-500/70 animate-fade-in">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Gift className="w-5 h-5 text-violet-400 shrink-0" />
            <h3 className="text-sm font-bold text-foreground">Yaklaşan İşe Giriş Yıl Dönümleri</h3>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold border border-violet-500/20 ml-1">
              {anniversaries.length} kişi
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {anniversaries.map(({ employee: e, daysUntil, yearsCompleting }) => (
              <div key={e.id} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-violet-500/5 border border-violet-500/15 hover:border-violet-500/35 transition-all group cursor-default">
                <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-xs font-black text-violet-400 shrink-0 border border-violet-500/20">
                  {e.firstName[0]}{e.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground leading-tight truncate">{e.firstName} {e.lastName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-tight mt-0.5 flex items-center gap-1">
                    {daysUntil === 0
                      ? <span className="text-violet-400 font-bold">🎉 Bugün!</span>
                      : <span>{daysUntil} gün sonra</span>}
                    <span className="text-slate-600">·</span>
                    <Award className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span className="text-amber-400 font-bold">{yearsCompleting}. yıl</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-950/20 dark:bg-slate-900/60 border border-border/80 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              tab === t.id ? 'bg-surface text-primary border border-border/40 shadow-sm' : 'text-slate-405 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                tab === t.id ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-950/40 text-slate-400 border-border/80'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Employees Tab ═══════════════════════════════════════════════════ */}
      {tab === 'employees' && (
        <div className="premium-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-slate-900/40">
            <p className="text-sm font-bold text-foreground">
              {employees.length} <span className="text-slate-500 font-semibold">çalışan kayıtlı</span>
            </p>
            <button
              onClick={openCreateEmployee}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5"
            >
              <Plus className="w-4.5 h-4.5" /> Çalışan Ekle
            </button>
          </div>
          {loading ? (
            <div className="divide-y divide-border/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4.5">
                  <div className="w-9 h-9 rounded-full bg-slate-850 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-850 rounded w-32 animate-pulse" />
                    <div className="h-3 bg-slate-850 rounded w-48 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-14 h-14 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-semibold">Henüz çalışan eklenmedi.</p>
              <button
                onClick={openCreateEmployee}
                className="mt-4 text-sm font-bold text-primary hover:text-primary/95 hover:underline transition-all"
              >
                İlk çalışanı ekleyin
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-950/20">
                    <th className="text-left px-6 py-4.5 font-bold">Çalışan</th>
                    <th className="text-left px-6 py-4.5 font-bold hidden md:table-cell">İletişim</th>
                    <th className="text-left px-6 py-4.5 font-bold hidden lg:table-cell">Departman</th>
                    <th className="text-left px-6 py-4.5 font-bold hidden sm:table-cell">İşe Başlama</th>
                    <th className="text-right px-6 py-4.5 font-bold">Maaş</th>
                    <th className="text-right px-6 py-4.5 font-bold">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {employees.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/30 border-b border-border/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <span className="text-xs font-bold text-primary">
                              {e.firstName[0]}{e.lastName[0]}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => openEditEmployee(e)}>
                              {e.firstName} {e.lastName}
                            </span>
                            {getServiceYears(e.hireDate) > 0 && (
                              <p className="text-[10px] text-slate-500 font-semibold leading-tight mt-0.5 flex items-center gap-1">
                                <Award className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                {getServiceYears(e.hireDate)} yıl kıdem
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-405 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />{e.email}
                          </div>
                          {e.phone && (
                            <div className="flex items-center gap-1.5 text-slate-405 text-xs">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />{e.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 hidden lg:table-cell text-xs font-semibold">
                        {e.departmentName || <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-semibold hidden sm:table-cell font-mono">
                        {new Date(e.hireDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400 text-sm font-mono">
                        ₺{e.salary.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditEmployee(e)}
                            className="p-2 rounded-xl border border-border bg-slate-950/20 hover:bg-slate-800 text-slate-405 hover:text-white transition-all"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(e.id, `${e.firstName} ${e.lastName}`)}
                            className="p-2 rounded-xl border border-red-500/10 bg-red-500/5 hover:border-red-500/20 text-slate-405 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Departments Tab ═══════════════════════════════════════════════════ */}
      {tab === 'departments' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openCreateDept}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5"
            >
              <Plus className="w-4.5 h-4.5" /> Departman Ekle
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="premium-card p-6 h-32 animate-pulse" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="premium-card p-16 text-center">
              <Building2 className="w-14 h-14 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-semibold">Henüz departman eklenmedi.</p>
              <button
                onClick={openCreateDept}
                className="mt-4 text-sm font-bold text-primary hover:text-primary/95 hover:underline transition-all"
              >
                İlk departmanı ekleyin
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((d) => {
                const empCount = employees.filter(e => e.departmentId === d.id).length
                return (
                  <div key={d.id} className="premium-card p-6 hover:-translate-y-0.5 transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditDept(d)}
                          className="p-2 rounded-xl border border-border bg-slate-950/20 hover:bg-slate-800 text-slate-405 hover:text-white transition-all"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(d.id, d.name)}
                          className="p-2 rounded-xl border border-red-500/10 bg-red-500/5 hover:border-red-500/20 text-slate-450 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="font-bold text-foreground text-base tracking-tight">{d.name}</p>
                    {d.description && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{d.description}</p>}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <p className="text-xs text-slate-450 font-bold">
                        <span className="text-foreground">{empCount}</span> çalışan aktif
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Leave Tab ══════════════════════════════════════════════════════ */}
      {tab === 'leave' && (
        <div className="space-y-6">

          {/* ── İzin Bakiyesi Özeti ── */}
          {lowBalanceCount > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <strong className="font-bold">{lowBalanceCount} çalışanın</strong> bu yıl kullanabileceği izin günü{' '}
                <strong className="font-bold">3 güne eşit veya daha az.</strong> Yıllık izin haklarının zamanında kullandırılması İş Kanunu Md. 53 gereğidir.
              </span>
            </div>
          )}

          {/* ── İzin Bakiyesi Tablosu ── */}
          {leaveBalances.length > 0 && (
            <div className="premium-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border/80 bg-slate-900/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-wider">İzin Bakiyeleri</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {new Date().getFullYear()} yılı · İş Kanunu Md. 53 hak tablosu
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-950/20">
                      <th className="text-left px-6 py-4 font-bold">Çalışan</th>
                      <th className="text-left px-6 py-4 font-bold hidden md:table-cell">Hizmet</th>
                      <th className="text-center px-4 py-4 font-bold">Hak</th>
                      <th className="text-center px-4 py-4 font-bold">Kullanılan</th>
                      <th className="text-center px-4 py-4 font-bold">Kalan</th>
                      <th className="text-left px-6 py-4 font-bold hidden lg:table-cell">Kullanım</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leaveBalances.map(({ employee: e, entitlement, usedDays, remaining, pct, years }) => {
                      const isLow = remaining <= 3 && entitlement > 0
                      const isVeryLow = remaining === 0 && entitlement > 0
                      return (
                        <tr
                          key={e.id}
                          className={`transition-colors ${
                            isVeryLow ? 'bg-red-500/5 hover:bg-red-500/8' :
                            isLow     ? 'bg-amber-500/5 hover:bg-amber-500/8' :
                                        'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15 shrink-0">
                                <span className="text-[10px] font-black text-primary">
                                  {e.firstName[0]}{e.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs">{e.firstName} {e.lastName}</p>
                                <p className="text-[10px] text-slate-500 font-semibold">{e.departmentName ?? '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="text-xs font-semibold text-slate-400 font-mono">{years} yıl</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs font-black text-foreground font-mono">
                              {entitlement > 0 ? `${entitlement}g` : <span className="text-slate-600">—</span>}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs font-bold text-slate-400 font-mono">{usedDays}g</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-xs font-black font-mono ${
                              isVeryLow ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {entitlement > 0 ? `${remaining}g` : <span className="text-slate-600 font-semibold">Hak yok</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            {entitlement > 0 ? (
                              <div className="flex items-center gap-2.5 min-w-[120px]">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-8 text-right font-mono shrink-0">
                                  {pct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Leave Calendar ── */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4.5">
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                {calendarDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} İzin Takvimi
              </h3>
              <div className="flex items-center gap-1.5 bg-slate-950/40 p-0.5 border border-border/80 rounded-xl">
                <button
                  onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { const n = new Date(); n.setDate(1); setCalendarDate(n) }}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-450 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Bugün
                </button>
                <button
                  onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-500 py-1 uppercase tracking-wider hidden sm:block">{d}</div>
              ))}
              {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-500 py-1 uppercase tracking-wider sm:hidden">{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarGrid.map((cell, i) => {
                const isToday = cell.dateStr === todayISO
                const hasLeaves = cell.day && (cell.pending + cell.approved + cell.rejected) > 0
                return (
                  <div
                    key={i}
                    className={`min-h-[50px] p-2 rounded-xl flex flex-col items-center justify-between border border-border/30 transition-all ${
                      cell.day ? (hasLeaves ? 'bg-slate-900/60 border-primary/20 hover:bg-slate-900' : 'hover:bg-slate-800/30') : 'border-transparent'
                    } ${isToday ? 'ring-2 ring-primary/80 border-transparent bg-primary/5' : ''}`}
                  >
                    {cell.day && (
                      <>
                        <span className={`text-xs font-bold leading-none ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                          {cell.day}
                        </span>
                        <div className="flex gap-1 flex-wrap justify-center mt-1.5">
                          {cell.approved > 0 && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400/20" title={`${cell.approved} Onaylı`} />}
                          {cell.pending > 0 && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-400/20" title={`${cell.pending} Bekleyen`} />}
                          {cell.rejected > 0 && <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-400/20" title={`${cell.rejected} Red`} />}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4.5 mt-4 pt-4 border-t border-border/80">
              {[['bg-emerald-500', 'Onaylı İzin'], ['bg-amber-500', 'Bekleyen Talep'], ['bg-red-500', 'Reddedilen']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                  <div className={`w-2.5 h-2.5 rounded-full ${c}`} />{l}
                </div>
              ))}
            </div>
          </div>

          {/* ── Leave Table ── */}
          <div className="premium-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/80 bg-slate-900/40">
              <p className="text-sm font-bold text-foreground">{leaveRequests.length} talep <span className="text-slate-500 font-semibold">kayıtlı</span></p>
            </div>
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="p-16 text-center">
                <CalendarDays className="w-14 h-14 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-semibold">Henüz izin talebi bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-950/20">
                      <th className="text-left px-6 py-4.5 font-bold">Çalışan</th>
                      <th className="text-left px-6 py-4.5 font-bold hidden sm:table-cell">Tarih Aralığı</th>
                      <th className="text-left px-6 py-4.5 font-bold hidden lg:table-cell">Neden</th>
                      <th className="text-left px-6 py-4.5 font-bold">Durum</th>
                      <th className="text-right px-6 py-4.5 font-bold">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {leaveRequests.map((r) => {
                      const sc = LEAVE_STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-750 text-slate-350' }
                      return (
                        <tr key={r.id} className="hover:bg-slate-800/30 border-b border-border/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground">{r.employeeName}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs font-semibold hidden sm:table-cell font-mono">
                            {new Date(r.startDate).toLocaleDateString('tr-TR')} —{' '}
                            {new Date(r.endDate).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 text-slate-405 text-xs hidden lg:table-cell truncate max-w-[200px] leading-relaxed">
                            {r.reason || <span className="italic text-slate-600">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {r.status === 'Pending' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => updateLeave(r.id, 'Approved')}
                                  className="p-2 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/20 text-slate-450 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                  title="Onayla"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => updateLeave(r.id, 'Rejected')}
                                  className="p-2 rounded-xl border border-red-500/10 bg-red-500/5 hover:border-red-500/20 text-slate-450 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Reddet"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Bordro Tab ═════════════════════════════════════════════════════ */}
      {tab === 'bordro' && (
        <div className="space-y-6 animate-fade-in">
          {/* Info notice */}
          <div className="flex items-start gap-3 p-4.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs leading-relaxed">
            <Info className="w-4.5 h-4.5 mt-0.5 shrink-0" />
            <span>
              Bu hesaplamalar <strong className="font-bold">2024 SGK/vergi oranlarına göre yaklaşık</strong> değerlerdir.
              SGK İşçi %15 · SGK İşveren %18 · Gelir Vergisi kademeli · Damga Vergisi %0.759.
              Kesin tutarlar için mali müşavirinize danışın.
            </span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Toplam Brüt', value: bordroToplam.brut, color: 'text-primary bg-primary/10 border border-primary/20' },
              { label: 'Toplam Net',  value: bordroToplam.net,  color: 'text-emerald-450 bg-emerald-500/10 border border-emerald-500/20' },
              { label: 'SGK İşçi Kesintisi', value: bordroToplam.sgkIscii, color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
              { label: 'Toplam İşveren Maliyeti', value: bordroToplam.toplamMaliyet, color: 'text-violet-400 bg-violet-500/10 border border-violet-500/20' },
            ].map(({ label, value, color }) => (
              <div key={label} className="premium-card p-5 hover:-translate-y-0.5 transition-all duration-300">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-xs font-bold ${color}`}>
                  ₺
                </div>
                <p className="text-xs text-slate-505 font-bold mb-1 uppercase tracking-wider">{label}</p>
                <p className="font-black text-foreground text-xl font-mono">
                  {value.toLocaleString('tr-TR')}
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="premium-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/85 bg-slate-900/40">
              <p className="text-sm font-bold text-foreground">
                {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Bordro Detayı <span className="text-slate-500 font-semibold">— {employees.length} çalışan</span>
              </p>
              <button
                onClick={handleExportBordro}
                disabled={employees.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-slate-950/20 text-slate-405 hover:text-white hover:border-primary/45 transition-all text-xs font-bold disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" /> CSV İndir
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="p-16 text-center">
                <FileSpreadsheet className="w-14 h-14 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-semibold">Bordro hesaplamak için çalışan ekleyin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-slate-400 font-black text-[10px] uppercase tracking-wider bg-slate-950/20">
                      <th className="text-left px-6 py-4.5 font-bold">Çalışan</th>
                      <th className="text-right px-6 py-4.5 font-bold">Brüt Maaş</th>
                      <th className="text-right px-6 py-4.5 font-bold hidden md:table-cell">SGK İşçi (%15)</th>
                      <th className="text-right px-6 py-4.5 font-bold hidden lg:table-cell">Gelir Vergisi</th>
                      <th className="text-right px-6 py-4.5 font-bold hidden lg:table-cell">Damga Vergisi</th>
                      <th className="text-right px-6 py-4.5 font-bold">Net Maaş</th>
                      <th className="text-right px-6 py-4.5 font-bold hidden md:table-cell">SGK İşveren (%18)</th>
                      <th className="text-right px-6 py-4.5 font-bold">Toplam Maliyet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {bordroRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 border-b border-border/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-foreground text-sm">{r.ad}</p>
                            <p className="text-slate-500 font-semibold mt-0.5">{r.departman}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground font-mono">
                          ₺{r.brut.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right text-amber-500 font-bold hidden md:table-cell font-mono">
                          −₺{r.sgkIscii.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right text-amber-500 font-bold hidden lg:table-cell font-mono">
                          −₺{r.gelirVergisi.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right text-amber-500 font-bold hidden lg:table-cell font-mono">
                          −₺{r.damgaVergisi.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-400 text-sm font-mono">
                          ₺{r.net.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right text-violet-400 font-bold hidden md:table-cell font-mono">
                          +₺{r.sgkIsveren.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground font-mono">
                          ₺{r.toplamMaliyet.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-slate-950/40">
                      <td className="px-6 py-4.5 font-black text-foreground text-sm">TOPLAM</td>
                      <td className="px-6 py-4.5 text-right font-black text-foreground font-mono text-sm">
                        ₺{bordroToplam.brut.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4.5 text-right text-amber-500 font-black hidden md:table-cell font-mono text-sm">
                        −₺{bordroRows.reduce((s, r) => s + r.sgkIscii, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4.5 text-right text-amber-500 font-black hidden lg:table-cell font-mono text-sm">
                        −₺{bordroRows.reduce((s, r) => s + r.gelirVergisi, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4.5 text-right text-amber-500 font-black hidden lg:table-cell font-mono text-sm">
                        −₺{bordroRows.reduce((s, r) => s + r.damgaVergisi, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4.5 text-right font-black text-emerald-400 font-mono text-base">
                        ₺{bordroToplam.net.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4.5 text-right text-violet-400 font-black hidden md:table-cell font-mono text-sm">
                        +₺{bordroRows.reduce((s, r) => s + r.sgkIsveren, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4.5 text-right font-black text-foreground font-mono text-sm">
                        ₺{bordroToplam.toplamMaliyet.toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Kıdem Tazminatı ── */}
          {employees.length > 0 && (
            <div className="premium-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border/80 bg-slate-900/40 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-wider">Kıdem Tazminatı Karşılığı</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    İş Kanunu Md. 14 · 2025 tavanı ₺{KIDEM_TAVANI.toLocaleString('tr-TR')} · 1+ yıl hizmet şartı
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Toplam Yükümlülük</p>
                  <p className="text-lg font-black text-red-400 font-mono">₺{toplamKidem.toLocaleString('tr-TR')}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-950/20">
                      <th className="text-left px-6 py-4 font-bold">Çalışan</th>
                      <th className="text-center px-4 py-4 font-bold hidden md:table-cell">Hizmet Yılı</th>
                      <th className="text-right px-6 py-4 font-bold">Brüt Maaş</th>
                      <th className="text-right px-6 py-4 font-bold">Kıdem Tazminatı</th>
                      <th className="text-center px-4 py-4 font-bold hidden lg:table-cell">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {kidemRows.map(({ employee: e, years, kidemTazminati, eligible }) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-foreground">{e.firstName} {e.lastName}</p>
                          <p className="text-slate-500 text-[10px] font-semibold">{e.departmentName ?? '—'}</p>
                        </td>
                        <td className="px-4 py-4 text-center hidden md:table-cell">
                          <span className="text-slate-400 font-mono font-semibold">{years}y</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">
                          ₺{e.salary.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-black font-mono ${eligible ? 'text-foreground' : 'text-slate-600'}`}>
                            {eligible ? `₺${kidemTazminati.toLocaleString('tr-TR')}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          {eligible ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Hak kazandı
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-500 border border-border/60">
                              1 yıl dolmadı
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-slate-950/40">
                      <td colSpan={3} className="px-6 py-4 font-black text-foreground text-xs">TOPLAM YÜKÜMLÜLÜK</td>
                      <td className="px-6 py-4 text-right font-black text-red-400 font-mono text-sm">
                        ₺{toplamKidem.toLocaleString('tr-TR')}
                      </td>
                      <td className="hidden lg:table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-border/40 bg-slate-950/10">
                <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                  * Hesaplamalar yaklaşık değerdir. Gerçek kıdem tazminatı; tam kısmi yıllar, fazla mesai, ikramiye ve diğer yan ödemeler dahil edildiğinde değişebilir. Mali müşavirinize danışınız.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Employee Modal ══════════════════════════════════════════════════ */}
      {empModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-border/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-border/80 bg-slate-950/20">
              <h2 className="text-base font-bold text-foreground">{editEmpId ? 'Çalışan Düzenle' : 'Yeni Çalışan'}</h2>
              <button
                onClick={() => setEmpModal(false)}
                className="p-1.5 rounded-xl border border-border bg-slate-950/20 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {empError && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />{empError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Ad *</label>
                  <input value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} placeholder="Ad" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Soyad *</label>
                  <input value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} placeholder="Soyad" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">E-posta *</label>
                <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="ornek@firma.com" />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Telefon</label>
                  <input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">İşe Başlama</label>
                  <input type="date" value={empForm.hireDate} onChange={e => setEmpForm(f => ({ ...f, hireDate: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Maaş (₺)</label>
                  <input type="number" value={empForm.salary} onChange={e => setEmpForm(f => ({ ...f, salary: e.target.value }))} className={inputCls} placeholder="0" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Departman</label>
                  <select value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))}
                    className={inputCls}>
                    <option value="">— Seçiniz —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4.5 border-t border-border bg-slate-950/20">
              <button onClick={() => setEmpModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">İptal</button>
              <button onClick={handleSaveEmployee} disabled={empSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30">
                {empSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editEmpId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Department Modal ════════════════════════════════════════════════ */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-border/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-border/80 bg-slate-950/20">
              <h2 className="text-base font-bold text-foreground">{editDeptId ? 'Departman Düzenle' : 'Yeni Departman'}</h2>
              <button
                onClick={() => setDeptModal(false)}
                className="p-1.5 rounded-xl border border-border bg-slate-950/20 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {deptError && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />{deptError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Departman Adı *</label>
                <input
                  value={deptForm.name}
                  onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Örn: Satış, Muhasebe..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveDept()}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Açıklama</label>
                <textarea
                  value={deptForm.description}
                  onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Departman hakkında kısa açıklama (opsiyonel)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4.5 border-t border-border bg-slate-950/20">
              <button onClick={() => setDeptModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">İptal</button>
              <button onClick={handleSaveDept} disabled={deptSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30">
                {deptSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editDeptId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
