import { ProductForm } from "@/components/products/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Yeni Ürün</h1>
        <p className="text-slate-500">Kataloğa yeni bir ürün ekleyin</p>
      </div>
      <ProductForm />
    </div>
  );
}
