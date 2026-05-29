"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, CreditCard,
  Package, Truck, Settings, LogOut, Bell, Menu, X, Receipt,
  Store, Warehouse, Layout, CheckSquare, BarChart2, ShoppingBag, Tag, Star, Layers, Globe,
  AlertTriangle, ShoppingBag as OrderIcon, Search, Zap, ArrowRight, Command, FileBarChart, UserCheck,
  ListTodo, Megaphone, RotateCcw, FileText, TrendingDown, Calendar, LifeBuoy, GitMerge, Landmark, Plug, Target
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useBasketStore } from "@/store/basket.store";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import api from "@/lib/api";

interface Notification {
  id: string
  type: 'order' | 'stock'
  title: string
  body: string
  href: string
  time: string
  read: boolean
}

function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    try {
      const [ordersRes, wmsRes] = await Promise.allSettled([
        api.get('/api/marketplace/admin/orders?pageSize=50&page=1'),
        api.get('/api/wms/stock'),
      ])

      const notes: Notification[] = []

      if (ordersRes.status === 'fulfilled') {
        const orders: Array<{ id: string; status: string; recipientName: string; totalAmount: number; createdAt: string }> =
          ordersRes.value.data?.items ?? ordersRes.value.data ?? []
        const pending = orders.filter((o) => o.status === 'Pending')
        for (const o of pending.slice(0, 5)) {
          notes.push({
            id: `order-${o.id}`,
            type: 'order',
            title: 'Yeni Sipariş',
            body: `${o.recipientName} — ₺${Number(o.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
            href: '/dashboard/marketplace-orders',
            time: new Date(o.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            read: false,
          })
        }
      }

      if (wmsRes.status === 'fulfilled') {
        const stock: Array<{ productId: string; isLowStock: boolean; quantity: number; minStockLevel: number }> =
          wmsRes.value.data ?? []
        const lowStock = stock.filter((s) => s.isLowStock)
        for (const s of lowStock.slice(0, 3)) {
          notes.push({
            id: `stock-${s.productId}`,
            type: 'stock',
            title: 'Düşük Stok Uyarısı',
            body: `Stok: ${s.quantity} / Min: ${s.minStockLevel}`,
            href: '/dashboard/wms',
            time: 'Şimdi',
            read: false,
          })
        }
      }

      setNotifications(notes)
    } catch {
      // silent — notifications are best-effort
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => { load() }, [])

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, loaded, markAllRead }
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "E-Commerce", href: "/dashboard/ecommerce" },
  { icon: Package, label: "Siparişler", href: "/dashboard/orders" },
  { icon: Receipt, label: "Faturalar", href: "/dashboard/billing" },
  { icon: Users, label: "İK Yönetimi", href: "/dashboard/hr" },
  { icon: Truck, label: "Kargo", href: "/dashboard/shipping" },
  { icon: CreditCard, label: "Muhasebe", href: "/dashboard/accounting" },
  { icon: Store, label: "Mağazalar", href: "/dashboard/stores" },
  { icon: Warehouse, label: "Depo (WMS)", href: "/dashboard/wms" },
  { icon: Layout, label: "Site Builder", href: "/dashboard/site-builder" },
  { icon: ShoppingBag, label: "Mağaza Siparişleri", href: "/dashboard/marketplace-orders" },
  { icon: BarChart2, label: "Analitik", href: "/dashboard/analytics" },
  { icon: FileBarChart, label: "Raporlar", href: "/dashboard/raporlar" },
  { icon: UserCheck, label: "Müşteriler", href: "/dashboard/musteriler" },
  { icon: Bell, label: "Uyarı Merkezi", href: "/dashboard/bildirimler" },
  { icon: Layers, label: "Kategoriler", href: "/dashboard/categories" },
  { icon: Globe, label: "Katalog", href: "/dashboard/catalog" },
  { icon: Tag, label: "Kuponlar", href: "/dashboard/coupons" },
  { icon: Star, label: "Yorumlar", href: "/dashboard/reviews" },
  { icon: ListTodo, label: "Görevler", href: "/dashboard/gorevler" },
  { icon: Megaphone, label: "Pazarlama", href: "/dashboard/pazarlama" },
  { icon: CheckSquare, label: "Kurulum Rehberi", href: "/dashboard/setup", badge: true },
  { icon: Truck, label: "Tedarik & Satın Alma", href: "/dashboard/tedarik" },
  { icon: RotateCcw, label: "İade Yönetimi", href: "/dashboard/iadeler" },
  { icon: FileText, label: "Teklifler", href: "/dashboard/teklifler" },
  { icon: TrendingDown, label: "Gider Takibi", href: "/dashboard/giderler" },
  { icon: Calendar, label: "Takvim", href: "/dashboard/takvim" },
  { icon: LifeBuoy, label: "Destek Talepleri", href: "/dashboard/destek" },
  { icon: GitMerge, label: "Satış Hattı", href: "/dashboard/pipeline" },
  { icon: Landmark, label: "Banka Hesapları", href: "/dashboard/banka" },
  { icon: Plug, label: "Entegrasyonlar", href: "/dashboard/entegrasyonlar" },
  { icon: Target, label: "KPI & Hedefler", href: "/dashboard/hedefler" },
  { icon: Settings, label: "Ayarlar", href: "/dashboard/ayarlar" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const itemCount = useBasketStore((s) => s.itemCount);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // Close bell panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cmd+K / Ctrl+K opens command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
        setCmdSearch('')
      }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (cmdOpen) setTimeout(() => cmdInputRef.current?.focus(), 50)
  }, [cmdOpen])

  // Command palette items
  const CMD_ITEMS = useMemo(() => [
    { label: 'Dashboard', desc: 'Komuta Merkezi', href: '/dashboard', icon: LayoutDashboard, group: 'Sayfalar' },
    { label: 'Ürünler', desc: 'E-commerce ürün listesi', href: '/dashboard/ecommerce', icon: Package, group: 'Sayfalar' },
    { label: 'Yeni Ürün', desc: 'Hızlıca ürün ekle', href: '/dashboard/ecommerce/new', icon: Zap, group: 'Hızlı Aksiyon' },
    { label: 'Siparişler', desc: 'B2B sipariş yönetimi', href: '/dashboard/orders', icon: ShoppingCart, group: 'Sayfalar' },
    { label: 'Mağaza Siparişleri', desc: 'Marketplace sipariş yönetimi', href: '/dashboard/marketplace-orders', icon: Store, group: 'Sayfalar' },
    { label: 'Muhasebe', desc: 'Yevmiye ve hesap planı', href: '/dashboard/accounting', icon: CreditCard, group: 'Sayfalar' },
    { label: 'WMS / Depo', desc: 'Stok ve depo yönetimi', href: '/dashboard/wms', icon: Warehouse, group: 'Sayfalar' },
    { label: 'İK Yönetimi', desc: 'Çalışanlar ve izinler', href: '/dashboard/hr', icon: Users, group: 'Sayfalar' },
    { label: 'Kargo', desc: 'Sevkiyat takibi', href: '/dashboard/shipping', icon: Truck, group: 'Sayfalar' },
    { label: 'Faturalar', desc: 'Fatura yönetimi', href: '/dashboard/billing', icon: Receipt, group: 'Sayfalar' },
    { label: 'Analitik', desc: 'Satış ve gelir raporları', href: '/dashboard/analytics', icon: BarChart2, group: 'Sayfalar' },
    { label: 'Kuponlar', desc: 'İndirim kodu yönetimi', href: '/dashboard/coupons', icon: Tag, group: 'Sayfalar' },
    { label: 'Yorumlar', desc: 'Müşteri yorumları', href: '/dashboard/reviews', icon: Star, group: 'Sayfalar' },
    { label: 'Site Builder', desc: 'Mağaza sayfaları', href: '/dashboard/site-builder', icon: Layout, group: 'Sayfalar' },
    { label: 'Kategoriler', desc: 'Ürün kategorileri', href: '/dashboard/categories', icon: Layers, group: 'Sayfalar' },
    { label: 'Raporlar', desc: 'Çapraz modül finansal özet raporu', href: '/dashboard/raporlar', icon: FileBarChart, group: 'Sayfalar' },
    { label: 'Müşteriler', desc: 'CRM — müşteri analizi ve segmentasyon', href: '/dashboard/musteriler', icon: UserCheck, group: 'Sayfalar' },
    { label: 'Uyarı Merkezi', desc: 'Tüm modüllerin kritik uyarıları', href: '/dashboard/bildirimler', icon: Bell, group: 'Sayfalar' },
    { label: 'Görevler', desc: 'Günlük görevler ve hatırlatıcılar', href: '/dashboard/gorevler', icon: ListTodo, group: 'Sayfalar' },
    { label: 'Pazarlama', desc: 'SMS, e-posta ve bildirim kampanyaları', href: '/dashboard/pazarlama', icon: Megaphone, group: 'Sayfalar' },
    { label: 'Kurulum Rehberi', desc: '5 adımlı kurulum sihirbazı', href: '/dashboard/setup', icon: CheckSquare, group: 'Sayfalar' },
    { label: 'Tedarik & Satın Alma', desc: 'Tedarikçiler ve satın alma siparişleri', href: '/dashboard/tedarik', icon: Truck, group: 'Sayfalar' },
    { label: 'İade Yönetimi', desc: 'Müşteri iade taleplerini takip edin', href: '/dashboard/iadeler', icon: RotateCcw, group: 'Sayfalar' },
    { label: 'Teklifler', desc: 'B2B fiyat teklifi oluştur, yazdır, takip et', href: '/dashboard/teklifler', icon: FileText, group: 'Sayfalar' },
    { label: 'Gider Takibi', desc: 'İşletme giderlerini kategorilere göre izle', href: '/dashboard/giderler', icon: TrendingDown, group: 'Sayfalar' },
    { label: 'Takvim', desc: 'Tüm modülleri tek takvimde gör', href: '/dashboard/takvim', icon: Calendar, group: 'Sayfalar' },
    { label: 'Destek Talepleri', desc: 'Müşteri destek taleplerini yönet, önceliklendir, yanıtla', href: '/dashboard/destek', icon: LifeBuoy, group: 'Sayfalar' },
    { label: 'Satış Hattı', desc: 'Kanban pipeline — fırsatları aşama aşama takip et', href: '/dashboard/pipeline', icon: GitMerge, group: 'Sayfalar' },
    { label: 'Banka Hesapları', desc: 'Hesap bakiyeleri, nakit akışı ve mutabakat', href: '/dashboard/banka', icon: Landmark, group: 'Sayfalar' },
    { label: 'Entegrasyonlar', desc: 'Trendyol, HepsiBurada, kargo ve ödeme bağlantıları', href: '/dashboard/entegrasyonlar', icon: Plug, group: 'Sayfalar' },
    { label: 'KPI & Hedefler', desc: 'İşletme hedefleri ve KPI takibi', href: '/dashboard/hedefler', icon: Target, group: 'Sayfalar' },
    { label: 'Ayarlar', desc: 'İşletme profili, bildirimler, API anahtarı', href: '/dashboard/ayarlar', icon: Settings, group: 'Sayfalar' },
    { label: 'Marketplace\'e Git', desc: 'Alışveriş sayfasını aç', href: '/', icon: Globe, group: 'Dış Bağlantılar' },
  ], [])

  const filteredCmdItems = useMemo(() => {
    if (!cmdSearch.trim()) return CMD_ITEMS
    const q = cmdSearch.toLowerCase()
    return CMD_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    )
  }, [cmdSearch, CMD_ITEMS])

  const cmdGroups = useMemo(() => {
    const groups: Record<string, typeof CMD_ITEMS> = {}
    for (const item of filteredCmdItems) {
      if (!groups[item.group]) groups[item.group] = []
      groups[item.group].push(item)
    }
    return groups
  }, [filteredCmdItems])

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "??";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Kullanıcı";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-background/50 backdrop-blur-xl hidden lg:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-black text-sm">C</span>
              </div>
              <span className="text-xl font-black tracking-tight">
                <span className="text-white">Canayan</span><span className="text-primary">Web</span>
              </span>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              icon={<item.icon />}
              label={item.label}
              href={item.href}
              active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
              showDot={item.badge && typeof window !== 'undefined' && !localStorage.getItem('setup-complete')}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <NavItem icon={<Settings />} label="Ayarlar" href="#" active={false} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-border bg-background flex flex-col lg:hidden"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="text-white font-black text-sm">C</span>
                  </div>
                  <span className="text-xl font-black tracking-tight">
                    <span className="text-white">Canayan</span><span className="text-primary">Web</span>
                  </span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-slate-800/20">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    icon={<item.icon />}
                    label={item.label}
                    href={item.href}
                    active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                    onClick={() => setSidebarOpen(false)}
                    showDot={item.badge && typeof window !== 'undefined' && !localStorage.getItem('setup-complete')}
                  />
                ))}
              </nav>
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={20} />
                  Çıkış Yap
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg hover:bg-slate-800/20 transition-colors lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-slate-500 hidden sm:block">Yönetim Paneli</h3>
            {/* Cmd+K trigger */}
            <button
              onClick={() => { setCmdOpen(true); setCmdSearch('') }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-background/60 text-slate-400 text-xs hover:border-primary/40 hover:text-foreground transition-all group"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Ara veya git...</span>
              <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono border border-border/60 group-hover:border-primary/30 transition-colors">
                ⌘K
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Link
              href="/dashboard/basket"
              className="relative p-2 rounded-lg hover:bg-slate-800/20 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-primary" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <ThemeSwitcher />
            {/* Notification Bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => { setBellOpen(o => !o); if (!bellOpen) markAllRead(); }}
                className="relative p-2 rounded-lg hover:bg-slate-800/20 transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 z-50 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="text-sm font-bold">Bildirimler</span>
                      <button onClick={() => setBellOpen(false)} className="p-1 rounded hover:bg-slate-800/20">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-2 text-slate-400">
                          <Bell className="w-8 h-8 text-slate-600" />
                          <p className="text-xs">Bildirim yok</p>
                        </div>
                      ) : notifications.map(n => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setBellOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/20 transition-colors border-b border-border/50 last:border-0"
                        >
                          <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            n.type === 'order' ? 'bg-primary/15' : 'bg-amber-500/15'
                          }`}>
                            {n.type === 'order'
                              ? <OrderIcon className="w-3.5 h-3.5 text-primary" />
                              : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{n.title}</p>
                            <p className="text-xs text-slate-400 truncate">{n.body}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{n.time}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                      <Link href="/dashboard/marketplace-orders" onClick={() => setBellOpen(false)}
                        className="text-xs text-slate-500 hover:text-foreground transition-colors">
                        Siparişler →
                      </Link>
                      <Link href="/dashboard/bildirimler" onClick={() => setBellOpen(false)}
                        className="text-xs text-primary hover:text-primary/80 font-bold transition-colors">
                        Uyarı Merkezi →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{fullName}</p>
                <p className="text-xs text-slate-500">Yönetici</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white text-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-8 overflow-auto flex-1">
          {children}
        </div>
      </main>

      {/* ── Command Palette (Cmd+K) ─────────────────────────────────────────── */}
      <AnimatePresence>
        {cmdOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setCmdOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[61] w-full max-w-lg bg-background/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Search className="w-4 h-4 text-primary shrink-0" />
                <input
                  ref={cmdInputRef}
                  type="text"
                  value={cmdSearch}
                  onChange={e => setCmdSearch(e.target.value)}
                  placeholder="Ara veya sayfaya git..."
                  className="flex-1 bg-transparent text-foreground text-sm placeholder:text-slate-500 focus:outline-none"
                />
                <kbd className="text-[10px] text-slate-500 border border-border/60 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto py-2">
                {filteredCmdItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    Sonuç bulunamadı
                  </div>
                ) : (
                  Object.entries(cmdGroups).map(([group, items]) => (
                    <div key={group}>
                      <p className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group}</p>
                      {items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setCmdOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/8 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-border/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                            <item.icon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                            <p className="text-xs text-slate-500 truncate">{item.desc}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                        </Link>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border/60 flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><kbd className="font-mono border border-border/60 rounded px-1 py-0.5">↑↓</kbd> Gezin</span>
                <span className="flex items-center gap-1"><kbd className="font-mono border border-border/60 rounded px-1 py-0.5">↵</kbd> Seç</span>
                <span className="flex items-center gap-1"><kbd className="font-mono border border-border/60 rounded px-1 py-0.5">Esc</kbd> Kapat</span>
                <span className="ml-auto flex items-center gap-1">
                  <Command className="w-2.5 h-2.5" /><span>K ile aç</span>
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({
  icon, label, href, active, onClick, showDot
}: {
  icon: React.ReactNode; label: string; href: string; active: boolean; onClick?: () => void; showDot?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
        ${active
          ? "bg-primary text-white shadow-lg shadow-primary/30"
          : "text-slate-500 hover:bg-slate-800/20 "
        }`}
    >
      <span className={`${active ? "text-white" : "text-slate-400 group-hover:text-primary"} transition-colors`}>
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
      </span>
      {label}
      {showDot && (
        <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </Link>
  );
}
