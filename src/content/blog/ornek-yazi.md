---
title: 'Yeni yazı şablonu'
description: 'Yeni bir yazı eklerken bu dosyayı kopyalayıp başlayabilirsin.'
pubDate: '2026-09-23'
# heroImage: '../../assets/gorselin.jpg'   # İsteğe bağlı kapak görseli
category: 'yazilim' # src/data/categories.json içindeki kategorilerden biri
tags: ['astro', 'rehber'] # İsteğe bağlı, serbest etiketler
draft: true # Yayına almak için false yap ya da bu satırı sil
---

Bu dosya bir **şablon**.

En kolay yol yazı editörü: terminalde `npm run yaz` çalıştır, tarayıcıda açılan editörden yaz, görselleri sürükle-bırak ekle, **Kaydet** ve **Yayınla**'ya bas.

Elle yazmak istersen:

1. Bu dosyayı `src/content/blog/` içinde kopyala ve adını değiştir (örn. `docker-ile-baslangic.md`). Dosya adı yazının adresi olur: `/blog/docker-ile-baslangic/`.
2. Üstteki alanları (başlık, açıklama, tarih, kategori, etiketler) doldur.
3. `draft: true` satırını sil ya da `false` yap.
4. `git commit` + `git push` — Cloudflare siteyi otomatik günceller.

## Alt başlık

Normal Markdown yazabilirsin: listeler, [linkler](https://astro.build), kod blokları vs.

```js
console.log('Merhaba dünya');
```
