"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserPlus, Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth.service";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Ad ve soyad zorunludur.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("Şifre en az 8 karakter, bir büyük harf ve bir rakam içermelidir.");
      return;
    }

    setLoading(true);
    try {
      await authService.register(form);
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Kayıt sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#06080f] px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full -z-10" />

      <Card className="w-full max-w-md shadow-2xl border-indigo-500/10">
        <CardHeader className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
              <span className="text-white font-black text-base">C</span>
            </div>
            <span className="font-black text-xl tracking-tight">
              <span className="text-foreground">Canayan</span><span className="text-blue-500">Web</span>
            </span>
          </div>
          <CardTitle className="text-3xl tracking-tight">Firma Kaydı</CardTitle>
          <p className="text-slate-500 dark:text-slate-400 text-sm">CanayanWeb'e ücretsiz katılın</p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
              <p className="text-center font-semibold">Hesabınız oluşturuldu! Giriş sayfasına yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">Ad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Can"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                      value={form.firstName}
                      onChange={set("firstName")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">Soyad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ayan"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                      value={form.lastName}
                      onChange={set("lastName")}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="ornek@megaerp.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Min. 8 karakter, büyük harf, rakam"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full py-6 text-lg mt-2" disabled={loading}>
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Kayıt Ol"}
              </Button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center text-sm text-slate-500">
              Zaten hesabınız var mı?{" "}
              <Link href="/auth/login" className="text-indigo-500 font-semibold hover:underline">
                Giriş Yapın
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
