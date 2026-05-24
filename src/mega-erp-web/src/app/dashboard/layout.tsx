"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Users, CreditCard,
  Package, Truck, Settings, LogOut, Bell, Menu, X, Receipt,
  Store, Warehouse, Layout, CheckSquare, BarChart2, ShoppingBag, Tag, Star, Layers, Globe,
  AlertTriangle, ShoppingBag as OrderIcon
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
  { icon: Layers, label: "Kategoriler", href: "/dashboard/categories" },
  { icon: Globe, label: "Katalog", href: "/dashboard/catalog" },
  { icon: Tag, label: "Kuponlar", href: "/dashboard/coupons" },
  { icon: Star, label: "Yorumlar", href: "/dashboard/reviews" },
  { icon: CheckSquare, label: "Kurulum Rehberi", href: "/dashboard/setup", badge: true },
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

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "??";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Kullanıcı";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#06080f]">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hidden lg:flex flex-col">
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

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <NavItem icon={<Settings />} label="Ayarlar" href="#" active={false} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
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
              className="fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:hidden"
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
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
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
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
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
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-slate-500 hidden sm:block">Yönetim Paneli</h3>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Link
              href="/dashboard/basket"
              className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                    className="absolute right-0 top-12 w-80 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-sm font-bold">Bildirimler</span>
                      <button onClick={() => setBellOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
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
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0"
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
                    {notifications.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800">
                        <Link href="/dashboard/marketplace-orders" onClick={() => setBellOpen(false)}
                          className="text-xs text-primary hover:underline">
                          Tüm siparişleri gör →
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
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
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
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
