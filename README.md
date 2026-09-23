# metintekin.com

Astro ile yapılmış kişisel sitem. Cloudflare üzerinde yayında; `main` dalına push edince otomatik güncellenir.

## ✍️ Yazı yazmak: `npm run yaz`

```sh
npm install      # ilk seferde bir kez
npm run yaz
```

Tarayıcıda **yazı editörü** açılır (`http://localhost:4322`), arka planda sitenin önizlemesi de başlar (`http://localhost:4321`).

- **Yazı** sekmesi: başlık, adres, kategori, tarih, etiketler, kapak görseli; Markdown editörü + canlı önizleme.
  Görselleri yazının içine **sürükle-bırak** veya **Ctrl+V** ile yapıştır.
- **SEO** paneli: SEO başlığı / meta açıklama, canonical, noindex; Google ve sosyal medya önizlemesi; kontrol listesi.
- **Kategoriler** sekmesi: kategori ekle/düzenle/sil.
- **Site & SEO ayarları**: isim, tanıtım, sosyal linkler, Google Search Console / Bing doğrulama, Google Analytics.
- **🚀 Yayınla**: değişiklikleri commit + push eder; Cloudflare 1-2 dakikada siteyi günceller.

Kapatmak için terminalde `Ctrl+C`. Editör sadece senin bilgisayarında çalışır, internete açılmaz.

### Editör dosyaları nereye yazar?

| Ne                 | Nereye                                  |
| :----------------- | :-------------------------------------- |
| Yazılar            | `src/content/blog/<adres>.md`           |
| Görseller          | `src/assets/blog/<adres>/`              |
| Site ayarları      | `src/data/site.json`                    |
| Kategoriler        | `src/data/categories.json`              |
| Editörün kendisi   | `tools/editor/` (sitede yayınlanmaz)    |

## Elle yazı eklemek

`src/content/blog/` içine bir `.md` dosyası:

```yaml
---
title: 'Başlık'
description: 'Kısa açıklama (liste ve Google sonuçlarında görünür)'
pubDate: '2026-09-23'
heroImage: '../../assets/blog/yazi-adresi/kapak.jpg' # isteğe bağlı
category: 'yazilim'                                  # zorunlu, categories.json'dan
tags: ['astro', 'cloudflare']                        # isteğe bağlı
draft: false                                         # true ise yayına çıkmaz
seo:                                                 # tamamen isteğe bağlı
  title: 'Google''da görünecek başlık'
  description: 'Google''da görünecek açıklama'
  noindex: false
---
```

## Komutlar

| Komut             | Ne yapar                                                    |
| :---------------- | :---------------------------------------------------------- |
| `npm run yaz`     | Yazı editörü + site önizlemesi                              |
| `npm run dev`     | Sadece site önizlemesi: `http://localhost:4321` (taslaklar da görünür) |
| `npm run build`   | Siteyi `./dist/` klasörüne üretir                           |
| `npm run preview` | Üretilen siteyi yerelde önizler                             |

## SEO'da otomatik olanlar

Her sayfada: canonical adres, meta açıklama, Open Graph + Twitter etiketleri (paylaşım kartı), JSON-LD yapılandırılmış veri
(ana sayfada `WebSite`, yazılarda `BlogPosting`), `robots.txt`, `sitemap-index.xml`, RSS (`/rss.xml`).
Taslaklar ve `noindex` işaretli yazılar arama motorlarına kapalıdır.

## Sayfalar

| Adres                | İçerik                                      |
| :------------------- | :------------------------------------------ |
| `/`                  | Tanıtım, kategoriler, son yazılar           |
| `/blog/`             | Tüm yazılar + kategori filtresi             |
| `/blog/<yazi>/`      | Yazı (kategori, etiketler, benzer yazılar)  |
| `/kategori/`         | Tüm kategoriler ve etiketler                |
| `/kategori/<slug>/`  | Bir kategorinin yazıları                    |
| `/etiket/<etiket>/`  | Bir etiketin yazıları                       |
| `/hakkimda/`         | Hakkımda sayfası (`src/pages/hakkimda.astro`) |
