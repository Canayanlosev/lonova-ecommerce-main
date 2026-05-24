"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LogIn, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

const inputCls =
  "w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      login(data.token, {
        id: payload.sub,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "E-posta veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full -z-10" />

      <div className="w-full max-w-md premium-card p-8 shadow-2xl border-primary/10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/25">
              <span className="text-white font-black text-base">C</span>
            </div>
            <span className="font-black text-xl tracking-tight">
              <span className="text-foreground">Canayan</span><span className="text-primary">Web</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Firma Girişi</h2>
          <p className="text-slate-400 text-sm mt-1">Yönetim panelinize giriş yapın</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-foreground">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="canayan@megaerp.com"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-medium text-foreground">Şifre</label>
              <Link href="#" className="text-xs text-primary hover:underline">Şifremi Unuttum</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-6 text-lg mt-2" disabled={loading}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <span className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Giriş Yap</span>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Hesabınız yok mu?{" "}
          <Link href="/auth/register" className="text-primary font-semibold hover:underline">
            Kayıt Olun
          </Link>
        </div>
      </div>
    </div>
  );
}
