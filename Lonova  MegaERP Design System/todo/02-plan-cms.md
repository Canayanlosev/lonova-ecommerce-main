# CMS ve SaaS Sayfa Yönetimi Modülü

Strapi/Payload yeteneklerini barındıracak dinamik yapı.

## Yapılacaklar Listesi

- [ ] `MegaERP.Modules.CMS.Core` projesi
  - [ ] `DynamicContentType` sınıfı (Kullanıcının kendi tablo/model tanımını yapabilmesi için)
  - [ ] `DynamicContent` sınıfı (İçerisinde JSONB tipinde `Data` kolonu barındıracak)
  - [ ] `Page` sınıfı (Slug, Title, SEO alanları)
- [ ] `MegaERP.Modules.CMS.Infrastructure` projesi
  - [ ] `CMSDbContext` oluşturulması (PostgreSQL)
  - [ ] EF Core Entity yapılandırmaları
- [ ] `MegaERP.Modules.CMS.Api` projesi
  - [ ] `/api/cms/content-types` (Schema builder endpointleri)
  - [ ] `/api/cms/contents/{type}` (Dinamik içerik CRUD - Strapi benzeri)
  - [ ] `/api/cms/pages` (Sayfa yönetimi)
