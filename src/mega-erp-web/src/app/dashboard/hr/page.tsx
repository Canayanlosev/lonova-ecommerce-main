'use client'

import { useEffect, useState } from 'react'
import {
  Users, Building2, CalendarDays, Check, X, Plus, Trash2, Edit2,
  AlertCircle, DollarSign, Mail, Phone, RefreshCw, FileSpreadsheet, Download, Info
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> İK Yönetimi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Çalışan ve departman yönetimi</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Çalışan', value: employees.length, icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Departman',      value: departments.length, icon: Building2, color: 'bg-primary/10 text-primary' },
          { label: 'Bekleyen İzin',  value: pendingLeaveCount, icon: CalendarDays, color: pendingLeaveCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400' },
          { label: 'Aylık Bordro',   value: `₺${totalPayroll.toLocaleString('tr-TR')}`, icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400', isText: true },
        ].map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="premium-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">{label}</p>
              <p className={`font-bold text-foreground ${isText ? 'text-sm' : 'text-xl'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-950/20 dark:bg-slate-900/60 border border-border/85 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t.id ? 'bg-surface text-primary border border-border/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                tab === t.id ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-800 text-slate-400 border-border/80'
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{employees.length} çalışan</p>
            <button
              onClick={openCreateEmployee}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Çalışan Ekle
            </button>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-800 rounded w-32 animate-pulse" />
                    <div className="h-3 bg-slate-800 rounded w-48 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz çalışan eklenmedi.</p>
              <button onClick={openCreateEmployee} className="mt-4 text-sm text-primary hover:underline">
                İlk çalışanı ekle
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-slate-400">
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Çalışan</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">İletişim</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Departman</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">İşe Başlama</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Maaş</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((e) => (
                    <tr key={e.id} className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <span className="text-xs font-bold text-primary">
                              {e.firstName[0]}{e.lastName[0]}
                            </span>
                          </div>
                          <span className="font-semibold text-foreground">{e.firstName} {e.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            <Mail className="w-3 h-3 text-slate-500" />{e.email}
                          </div>
                          {e.phone && (
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <Phone className="w-3 h-3 text-slate-500" />{e.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs">
                        {e.departmentName || <span className="italic text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                        {new Date(e.hireDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground text-sm">
                        ₺{e.salary.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditEmployee(e)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(e.id, `${e.firstName} ${e.lastName}`)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreateDept}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Departman Ekle
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="premium-card p-5 h-28 animate-pulse" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz departman eklenmedi.</p>
              <button onClick={openCreateDept} className="mt-4 text-sm text-primary hover:underline">
                İlk departmanı ekle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((d) => {
                const empCount = employees.filter(e => e.departmentId === d.id).length
                return (
                  <div key={d.id} className="premium-card p-5 hover:border-primary/50 transition-all duration-200 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditDept(d)}
                          className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(d.id, d.name)}
                          className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="font-bold text-foreground">{d.name}</p>
                    {d.description && <p className="text-xs text-slate-400 mt-1">{d.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">
                      <span className={`font-bold ${empCount > 0 ? 'text-primary' : 'text-slate-600'}`}>{empCount}</span>
                      {' '}çalışan
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Leave Tab ══════════════════════════════════════════════════════ */}
      {tab === 'leave' && (
        <div className="premium-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{leaveRequests.length} talep</p>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Henüz izin talebi bulunmuyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-slate-400">
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Çalışan</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">Tarih Aralığı</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">Neden</th>
                    <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Durum</th>
                    <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaveRequests.map((r) => {
                    const sc = LEAVE_STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-700 text-slate-300' }
                    return (
                      <tr key={r.id} className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{r.employeeName}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                          {new Date(r.startDate).toLocaleDateString('tr-TR')} —{' '}
                          {new Date(r.endDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell truncate max-w-[180px]">
                          {r.reason || <span className="italic text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === 'Pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => updateLeave(r.id, 'Approved')}
                                className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                title="Onayla"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateLeave(r.id, 'Rejected')}
                                className="p-1.5 rounded-lg border border-transparent hover:border-border text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
      )}

      {/* ═══ Bordro Tab ═════════════════════════════════════════════════════ */}
      {tab === 'bordro' && (
        <div className="space-y-5">
          {/* Info notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Bu hesaplamalar <strong>2024 SGK/vergi oranlarına göre yaklaşık</strong> değerlerdir.
              SGK İşçi %15 · SGK İşveren %18 · Gelir Vergisi kademeli · Damga Vergisi %0.759.
              Kesin tutarlar için mali müşavirinize danışın.
            </span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Brüt', value: bordroToplam.brut, color: 'text-primary bg-primary/10' },
              { label: 'Toplam Net',  value: bordroToplam.net,  color: 'text-emerald-400 bg-emerald-500/10' },
              { label: 'SGK İşçi Kesintisi', value: bordroToplam.sgkIscii, color: 'text-amber-400 bg-amber-500/10' },
              { label: 'Toplam İşveren Maliyeti', value: bordroToplam.toplamMaliyet, color: 'text-violet-400 bg-violet-500/10' },
            ].map(({ label, value, color }) => (
              <div key={label} className="premium-card p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-xs font-bold ${color}`}>
                  ₺
                </div>
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="font-black text-foreground text-lg">
                  {value.toLocaleString('tr-TR')}
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="premium-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} — {employees.length} çalışan
              </p>
              <button
                onClick={handleExportBordro}
                disabled={employees.length === 0}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-slate-400 hover:text-foreground hover:border-primary/40 transition-all text-xs font-medium disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" /> CSV İndir
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Bordro hesaplamak için çalışan ekleyin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">Çalışan</th>
                      <th className="text-right px-4 py-3 font-semibold">Brüt Maaş</th>
                      <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">SGK İşçi (%15)</th>
                      <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Gelir Vergisi</th>
                      <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Damga Vergisi</th>
                      <th className="text-right px-4 py-3 font-semibold">Net Maaş</th>
                      <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">SGK İşveren (%18)</th>
                      <th className="text-right px-4 py-3 font-semibold">Toplam Maliyet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bordroRows.map((r) => (
                      <tr key={r.id} className="hover:bg-primary/5 hover:border-primary/10 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{r.ad}</p>
                            <p className="text-slate-500">{r.departman}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          ₺{r.brut.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-medium hidden md:table-cell">
                          −₺{r.sgkIscii.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-medium hidden lg:table-cell">
                          −₺{r.gelirVergisi.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-medium hidden lg:table-cell">
                          −₺{r.damgaVergisi.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-400">
                          ₺{r.net.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right text-violet-400 font-medium hidden md:table-cell">
                          +₺{r.sgkIsveren.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          ₺{r.toplamMaliyet.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-slate-800/30">
                      <td className="px-4 py-3 font-bold text-foreground text-sm">TOPLAM</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        ₺{bordroToplam.brut.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-semibold hidden md:table-cell">
                        −₺{bordroRows.reduce((s, r) => s + r.sgkIscii, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-semibold hidden lg:table-cell">
                        −₺{bordroRows.reduce((s, r) => s + r.gelirVergisi, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400 font-semibold hidden lg:table-cell">
                        −₺{bordroRows.reduce((s, r) => s + r.damgaVergisi, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">
                        ₺{bordroToplam.net.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right text-violet-400 font-semibold hidden md:table-cell">
                        +₺{bordroRows.reduce((s, r) => s + r.sgkIsveren, 0).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-foreground">
                        ₺{bordroToplam.toplamMaliyet.toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Employee Modal ══════════════════════════════════════════════════ */}
      {empModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{editEmpId ? 'Çalışan Düzenle' : 'Yeni Çalışan'}</h2>
              <button onClick={() => setEmpModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {empError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />{empError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Ad *</label>
                  <input value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} placeholder="Ad" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Soyad *</label>
                  <input value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} placeholder="Soyad" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">E-posta *</label>
                <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="ornek@firma.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Telefon</label>
                  <input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">İşe Başlama</label>
                  <input type="date" value={empForm.hireDate} onChange={e => setEmpForm(f => ({ ...f, hireDate: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Maaş (₺)</label>
                  <input type="number" value={empForm.salary} onChange={e => setEmpForm(f => ({ ...f, salary: e.target.value }))} className={inputCls} placeholder="0" min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Departman</label>
                  <select value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))}
                    className={inputCls}>
                    <option value="">— Seçiniz —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setEmpModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-foreground transition-colors">İptal</button>
              <button onClick={handleSaveEmployee} disabled={empSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                {empSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editEmpId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Department Modal ════════════════════════════════════════════════ */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{editDeptId ? 'Departman Düzenle' : 'Yeni Departman'}</h2>
              <button onClick={() => setDeptModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {deptError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />{deptError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Departman Adı *</label>
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
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Açıklama</label>
                <textarea
                  value={deptForm.description}
                  onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Departman hakkında kısa açıklama (opsiyonel)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setDeptModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-foreground transition-colors">İptal</button>
              <button onClick={handleSaveDept} disabled={deptSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
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
