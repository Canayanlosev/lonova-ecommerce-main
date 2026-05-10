# MegaERP - Frontend Durum Takibi (State)

Bu dosya, projeye daha sonra geri dönüldüğünde frontend tarafında nerede kaldığımızı hatırlamak için oluşturulmuştur.

## 🟢 Neler Yaptık?
- Frontend projesi için henüz bir başlangıç yapılmadı, tamamen mimari tasarım aşamasındayız. Backend ile eş zamanlı veya peşinden gidecek şekilde konumlandırıldı.

## 🟡 Nerede Kaldık? (Sıradaki İşlem)
1. **Frontend Teknoloji Seçimi:** React/Next.js, Angular veya Vue.js arasında bir karar verilecek.
2. **Proje İskeletinin Kurulması:** Karar verilen teknoloji ile `/frontend` klasörü altına proje `npx` komutları ile oluşturulacak.
3. **Tema/UI Kütüphanesi Belirleme:** TailwindCSS, Material UI, Ant Design veya özel bir premium tasarım sistemi kurgulanacak.
4. **Entegrasyon:** Backend tarafında `IAM/Auth` ve `Tenant` kısımları ayağa kalktıktan sonra, Frontend'de ilk olarak Login/Register ve Admin Panel Dashboard iskeleti kodlanacak.

## 🔴 Genel Notlar
- Projenin büyüklüğü göz önüne alındığında, Frontend'in de modüler (Micro-frontend veya modüler component yapısı) olması tavsiye edilir.
- CMS, SaaS Admin Paneli ve E-Ticaret Arayüzleri birbirinden ayrı uygulamalar veya tek bir Monorepo içinde ayrı workspace'ler olarak kurgulanabilir.
