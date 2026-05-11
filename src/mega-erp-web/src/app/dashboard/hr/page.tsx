"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Building2, CalendarDays, Check, X, Plus, Loader2 } from "lucide-react";
import { hrService } from "@/lib/services/hr.service";
import { useToast } from "@/store/ui.store";
import type { Employee, Department, LeaveRequest } from "@/types/api.types";

type Tab = "employees" | "departments" | "leave";

export default function HRPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

  const updateLeave = async (id: string, status: string) => {
    try {
      await hrService.updateLeaveStatus(id, status);
      toast.success(status === "Approved" ? "İzin onaylandı." : "İzin reddedildi.");
      load();
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const tabs = [
    { id: "employees" as Tab, label: "Çalışanlar", icon: Users },
    { id: "departments" as Tab, label: "Departmanlar", icon: Building2 },
    { id: "leave" as Tab, label: "İzin Talepleri", icon: CalendarDays },
  ];

  const leaveStatusStyle: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    Rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">İK Yönetimi</h1>
        <p className="text-slate-500">Çalışan ve departman yönetimi</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "employees" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Çalışanlar ({employees.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Ad Soyad</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">E-posta</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Departman</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Maaş</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : employees.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<Users />} title="Çalışan bulunamadı" /></td></tr>
                    : employees.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{e.firstName} {e.lastName}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{e.email}</td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{e.departmentName || "-"}</td>
                        <td className="px-4 py-3 text-right font-bold">₺{e.salary.toLocaleString("tr-TR")}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "departments" && (
        <Card>
          <CardHeader><CardTitle>Departmanlar ({departments.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : departments.length === 0 ? (
              <EmptyState icon={<Building2 />} title="Departman bulunamadı" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((d) => (
                  <div key={d.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/30 transition-colors">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
                      <Building2 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="font-semibold">{d.name}</p>
                    {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                    : leaveRequests.length === 0
                    ? <tr><td colSpan={4}><EmptyState icon={<CalendarDays />} title="İzin talebi bulunamadı" /></td></tr>
                    : leaveRequests.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                          {new Date(r.startDate).toLocaleDateString("tr-TR")} — {new Date(r.endDate).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${leaveStatusStyle[r.status] ?? ""}`}>
                            {r.status === "Pending" ? "Bekliyor" : r.status === "Approved" ? "Onaylandı" : "Reddedildi"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "Pending" && (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => updateLeave(r.id, "Approved")} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                <Check size={14} />
                              </button>
                              <button onClick={() => updateLeave(r.id, "Rejected")} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors">
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
    </div>
  );
}
