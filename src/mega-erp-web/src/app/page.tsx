import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LayoutDashboard, ShoppingCart, Users, CreditCard, Package, Truck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#06080f] text-slate-900 dark:text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-16 px-6 lg:px-12 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-slate-500 bg-clip-text text-transparent">
          MegaERP <span className="text-indigo-500">V1</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          Modern, modüler ve devasa ölçeklenebilir kurumsal backend gücünü, 
          premium kullanıcı deneyimi ile birleştiren yeni nesil ERP ekosistemi.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" className="shadow-2xl shadow-indigo-500/40">
            Hemen Başlayın
          </Button>
          <Button size="lg" variant="ghost">
            Dokümantasyon
          </Button>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ModuleCard 
            icon={<LayoutDashboard className="w-6 h-6" />}
            title="IAM & Auth"
            description="Tenant bazlı yetkilendirme ve çok kiracılı kimlik yönetimi."
          />
          <ModuleCard 
            icon={<ShoppingCart className="w-6 h-6" />}
            title="E-Commerce"
            description="Ürün, varyant ve kategori yönetimi ile tam entegre ticaret."
          />
          <ModuleCard 
            icon={<CreditCard className="w-6 h-6" />}
            title="Billing & Accounting"
            description="Fatura yönetimi ve çift taraflı muhasebe kayıtları."
          />
          <ModuleCard 
            icon={<Users className="w-6 h-6" />}
            title="HR Management"
            description="Personel, departman ve izin süreçlerinin dijital takibi."
          />
          <ModuleCard 
            icon={<Truck className="w-6 h-6" />}
            title="Shipping & Logistics"
            description="Kargo takibi ve sevkiyat yöntemlerinin yönetimi."
          />
          <ModuleCard 
            icon={<Package className="w-6 h-6" />}
            title="Inventory Control"
            description="Depo bazlı stok hareketleri ve envanter yönetimi."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
        <p>&copy; 2026 MegaERP Ecosystem. "Odoo'nun Babası" Mimari Yapı.</p>
      </footer>
    </main>
  );
}

function ModuleCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="group">
      <CardHeader>
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {description}
      </CardContent>
    </Card>
  );
}
