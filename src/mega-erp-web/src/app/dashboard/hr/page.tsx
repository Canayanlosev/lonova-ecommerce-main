"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users, Building2, CalendarDays, Check, X, Plus, Trash2, PencilLine,
  AlertCircle, DollarSign, Mail, Phone
} from "lucide-react";
import { hrService } from "@/lib/services/hr.service";
import { useToast } from "@/store/ui.store";
import type { Employee, Department, LeaveRequest } from "@/types/api.types";

type Tab = "employees" | "departments" | "leave";

interface EmployeeForm {
  firstName: string; lastName: string; email: string; phone: string
  hireDate: string; salary: string; departmentId: string
}
const emptyEmployee: EmployeeForm = { firstName: '', lastName: '', email: '', phone: '', hireDate: '', salary: '', departmentId: '' }

interface DeptForm { name: string; description: string }
const emptyDept: DeptForm = { name: '', description: '' }

const leaveStatusStyle: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};

export default function HRPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Employee modal
  const [empModal, setEmpModal] = useState(false);
  const [editEmpId, setEditEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState<EmployeeForm>(emptyEmployee);
  const [empSaving, setEmpSaving] = useState(false);
  const [empError, setEmpError] = useState('');

  // Department modal
  const [deptModal, setDeptModal] = useState(false);
  const [editDeptId, setEditDeptId] = useState<string | null>(null);
  const [deptForm, setDeptForm] = useState<DeptForm>(emptyDept);
  const [deptSaving, setDeptSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, depts, leaves] = await Promise.all([
        hrService.getEmployees(),
        hrService.getDepartments(),
        hrService.getLeaveRequests(),
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setLeaveRequests(leaves);
    } catch {
      toast.error("Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Leave ───────────────────────────────────────────────────────────────
  const updateLeave = async (id: string, status: string) => {
    try {
      await hrService.updateLeaveStatus(id, status);
      toast.success(status === "Approved" ? "İzin onaylandı." : "İzin reddedildi.");
      load();
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  // ─── Employees ───────────────────────────────────────────────────────────
  const openCreateEmployee = () => {
    setEditEmpId(null);
    setEmpForm(emptyEmployee);
    setEmpError('');
    setEmpModal(true);
  };

  const openEditEmployee = (e: Employee) => {
    setEditEmpId(e.id);
    setEmpForm({
      firstName: e.firstName, lastName: e.lastName, email: e.email,
      phone: e.phone, hireDate: e.hireDate.slice(0, 10),
      salary: String(e.salary), departmentId: e.departmentId ?? '',
    });
    setEmpError('');
    setEmpModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!empForm.firstName.trim() || !empForm.lastName.trim() || !empForm.email.trim()) {
      setEmpError('Ad, soyad ve e-posta zorunludur.'); return;
    }
    setEmpSaving(true); setEmpError('');
    const payload = {
      firstName: empForm.firstName.trim(),
      lastName: empForm.lastName.trim(),
      email: empForm.email.trim(),
      phone: empForm.phone.trim(),
      hireDate: empForm.hireDate || new Date().toISOString().slice(0, 10),
      salary: Number(empForm.salary) || 0,
      departmentId: empForm.departmentId || undefined,
    };
    try {
      if (editEmpId) {
        await hrService.updateEmployee(editEmpId, payload);
        toast.success('Çalışan güncellendi.');
      } else {
        await hrService.createEmployee(payload as Omit<Employee, 'id' | 'departmentName'>);
        toast.success('Çalışan oluşturuldu.');
      }
      setEmpModal(false);
      load();
    } catch {
      setEmpError('İşlem başarısız.');
    } finally {
      setEmpSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`"${name}" çalışanını silmek istediğinize emin misiniz?`)) return;
    try {
      await hrService.deleteEmployee(id);
      toast.success(`${name} silindi.`);
      load();
    } catch {
      toast.error('Çalışan silinemedi.');
    }
  };

  // ─── Departments ─────────────────────────────────────────────────────────
  const openCreateDept = () => {
    setEditDeptId(null);
    setDeptForm(emptyDept);
    setDeptModal(true);
  };

  const openEditDept = (d: Department) => {
    setEditDeptId(d.id);
    setDeptForm({ name: d.name, description: d.description ?? '' });
    setDeptModal(true);
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) { toast.error('Departman adı zorunludur.'); return; }
    setDeptSaving(true);
    try {
      if (editDeptId) {
        await hrService.createDepartment({ name: deptForm.name, description: deptForm.description || undefined });
        toast.success('Departman güncellendi.');
      } else {
        await hrService.createDepartment({ name: deptForm.name, description: deptForm.description || undefined });
        toast.success('Departman oluşturuldu.');
      }
      setDeptModal(false);
      load();
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!confirm(`"${name}" departmanını silmek istediğinize emin misiniz?`)) return;
    try {
      await hrService.deleteDepartment(id);
      toast.success(`${name} silindi.`);
      load();
    } catch {
      toast.error('Departman silinemedi.');
    }
  };

  const tabs = [
    { id: "employees" as Tab, label: "Çalışanlar", icon: Users, count: employees.length },
    { id: "departments" as Tab, label: "Departmanlar", icon: Building2, count: departments.length },
    { id: "leave" as Tab, label: "İzin Talepleri", icon: CalendarDays, count: leaveRequests.filter(r => r.status === 'Pending').length },
  ];

  // ─── Summary stats ────────────────────────────────────────────────────────
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);
  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">İK Yönetimi</h1>
          <p className="text-slate-500">Çalışan ve departman yönetimi</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Toplam Çalışan</p>
          <p className="text-2xl font-black">{employees.length}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Departman</p>
          <p className="text-2xl font-black text-indigo-400">{departments.length}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Bekleyen İzin</p>
          <p className={`text-2xl font-black ${pendingLeaveCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{pendingLeaveCount}</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-xs text-slate-500 mb-1">Aylık Bordro</p>
          <p className="text-xl font-black text-emerald-400">
            ₺{totalPayroll.toLocaleString('tr-TR')}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <t.icon size={16} />
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Employees Tab ═══════════════════════════════════════════════════ */}
      {tab === "employees" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Çalışanlar</CardTitle>
              <button
                onClick={openCreateEmployee}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={14} /> Çalışan Ekle
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Ad Soyad</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">E-posta / Telefon</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Departman</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Maaş</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                    : employees.length === 0
                    ? <tr><td colSpan={5}><EmptyState icon={<Users />} title="Çalışan bulunamadı" description="Yeni çalışan eklemek için butona tıklayın." /></td></tr>
                    : employees.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-indigo-400">
                                {e.firstName[0]}{e.lastName[0]}
                              </span>
                            </div>
                            <span className="font-medium">{e.firstName} {e.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <Mail className="w-3 h-3" />{e.email}
                            </div>
                            {e.phone && (
                              <div className="flex items-center gap-1 text-slate-500 text-xs">
                                <Phone className="w-3 h-3" />{e.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-sm">
                          {e.departmentName || <span className="text-slate-600 italic text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            ₺{e.salary.toLocaleString("tr-TR")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditEmployee(e)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-500 transition-colors"
                              title="Düzenle"
                            >
                              <PencilLine size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(e.id, `${e.firstName} ${e.lastName}`)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Departments Tab ════════════════════════════════════════════════ */}
      {tab === "departments" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Departmanlar</CardTitle>
              <button
                onClick={openCreateDept}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={14} /> Departman Ekle
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : departments.length === 0 ? (
              <EmptyState icon={<Building2 />} title="Departman bulunamadı" description="Departman eklemek için butona tıklayın." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((d) => {
                  const empCount = employees.filter(e => e.departmentId === d.id).length;
                  return (
                    <div key={d.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/30 transition-colors group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditDept(d)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-500">
                            <PencilLine size={13} />
                          </button>
                          <button onClick={() => handleDeleteDept(d.id, d.name)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="font-semibold">{d.name}</p>
                      {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
                      <p className="text-xs text-slate-400 mt-2">{empCount} çalışan</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Leave Tab ══════════════════════════════════════════════════════ */}
      {tab === "leave" && (
        <Card>
          <CardHeader><CardTitle>İzin Talepleri ({leaveRequests.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Çalışan</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Tarih Aralığı</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Neden</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                    : leaveRequests.length === 0
                    ? <tr><td colSpan={5}><EmptyState icon={<CalendarDays />} title="İzin talebi bulunamadı" /></td></tr>
                    : leaveRequests.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                          {new Date(r.startDate).toLocaleDateString("tr-TR")} — {new Date(r.endDate).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell truncate max-w-[180px]">
                          {r.reason || <span className="italic text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${leaveStatusStyle[r.status] ?? ""}`}>
                            {r.status === "Pending" ? "Bekliyor" : r.status === "Approved" ? "Onaylandı" : "Reddedildi"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "Pending" && (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => updateLeave(r.id, "Approved")} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Onayla">
                                <Check size={14} />
                              </button>
                              <button onClick={() => updateLeave(r.id, "Rejected")} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors" title="Reddet">
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Employee Modal ══════════════════════════════════════════════════ */}
      {empModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold">{editEmpId ? 'Çalışan Düzenle' : 'Yeni Çalışan'}</h2>
              <button onClick={() => setEmpModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {empError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />{empError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ad *</label>
                  <input value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Ad" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Soyad *</label>
                  <input value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Soyad" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-posta *</label>
                <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="e-posta@ornek.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Telefon</label>
                  <input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="05xx xxx xx xx" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">İşe Başlama</label>
                  <input type="date" value={empForm.hireDate} onChange={e => setEmpForm(f => ({ ...f, hireDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Maaş (₺)</label>
                  <input type="number" value={empForm.salary} onChange={e => setEmpForm(f => ({ ...f, salary: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Departman</label>
                  <select value={empForm.departmentId} onChange={e => setEmpForm(f => ({ ...f, departmentId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="">— Seçiniz —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setEmpModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-foreground">İptal</button>
              <button onClick={handleSaveEmployee} disabled={empSaving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                {empSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />}
                {editEmpId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Department Modal ════════════════════════════════════════════════ */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold">{editDeptId ? 'Departman Düzenle' : 'Yeni Departman'}</h2>
              <button onClick={() => setDeptModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Departman Adı *</label>
                <input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Örn: Satış, Muhasebe..." autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveDept()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Açıklama</label>
                <textarea value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  placeholder="Departman hakkında kısa açıklama (opsiyonel)" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setDeptModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-foreground">İptal</button>
              <button onClick={handleSaveDept} disabled={deptSaving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                {deptSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />}
                {editDeptId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
