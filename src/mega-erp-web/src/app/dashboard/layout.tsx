import React from "react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  Package, 
  Truck, 
  Settings,
  LogOut,
  Bell
} from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#06080f]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl hidden lg:flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-black tracking-tighter text-indigo-500">MegaERP</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
          <NavItem icon={<ShoppingCart />} label="E-Commerce" />
          <NavItem icon={<CreditCard />} label="Accounting" />
          <NavItem icon={<Users />} label="HR Management" />
          <NavItem icon={<Package />} label="Inventory" />
          <NavItem icon={<Truck />} label="Shipping" />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <NavItem icon={<Settings />} label="Ayarlar" />
          <NavItem icon={<LogOut className="text-red-500" />} label="Çıkış Yap" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8">
          <h3 className="font-semibold text-slate-500">Yönetim Paneli</h3>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <p className="text-sm font-bold">Can Ayan</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">
                CA
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href="#" 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
        ${active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        }`}
    >
      <span className={`${active ? "text-white" : "text-slate-400 group-hover:text-indigo-500"} transition-colors`}>
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </span>
      {label}
    </Link>
  );
}
