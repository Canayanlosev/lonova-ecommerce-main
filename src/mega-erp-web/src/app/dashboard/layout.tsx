"use client";

import React from "react";
import {
  LayoutDashboard, ShoppingCart, Users, CreditCard,
  Package, Truck, Settings, LogOut, Bell, Menu, X, Receipt
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { useBasketStore } from "@/store/basket.store";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "E-Commerce", href: "/dashboard/ecommerce" },
  { icon: Package, label: "Siparişler", href: "/dashboard/orders" },
  { icon: Receipt, label: "Faturalar", href: "/dashboard/billing" },
  { icon: Users, label: "İK Yönetimi", href: "/dashboard/hr" },
  { icon: Truck, label: "Kargo", href: "/dashboard/shipping" },
  { icon: CreditCard, label: "Muhasebe", href: "/dashboard/accounting" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const itemCount = useBasketStore((s) => s.itemCount);

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
          <h2 className="text-2xl font-black tracking-tighter text-indigo-500">MegaERP</h2>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              icon={<item.icon />}
              label={item.label}
              href={item.href}
              active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
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
                <h2 className="text-2xl font-black tracking-tighter text-indigo-500">MegaERP</h2>
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
              <ShoppingCart className="w-5 h-5 text-indigo-500" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{fullName}</p>
                <p className="text-xs text-slate-500">Yönetici</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-sm">
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
  icon, label, href, active, onClick
}: {
  icon: React.ReactNode; label: string; href: string; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
        ${active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        }`}
    >
      <span className={`${active ? "text-white" : "text-slate-400 group-hover:text-indigo-500"} transition-colors`}>
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
      </span>
      {label}
    </Link>
  );
}
