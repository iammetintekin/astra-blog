# metintekin.com

Astro ile yapılmış kişisel sitem. Cloudflare üzerinde yayında; `main` dalına push edince otomatik güncellenir.

## Komutlar

| Komut             | Ne yapar                                        |
| :---------------- | :---------------------------------------------- |
| `npm install`     | Bağımlılıkları kurar                            |
| `npm run dev`     | Yerel sunucu: `http://localhost:4321` (taslaklar da görünür) |
| `npm run build`   | Siteyi `./dist/` klasörüne üretir              |
| `npm run preview` | Üretilen siteyi yerelde önizler                 |

## Yeni yazı eklemek

1. `src/content/blog/ornek-yazi.md` dosyasını kopyala, adını değiştir (dosya adı = adres: `/blog/dosya-adi/`).
2. Üstteki alanları doldur:

   ```yaml
   ---
   title: 'Başlık'
   description: 'Kısa açıklama (liste ve Google sonuçlarında görünür)'
   pubDate: '2026-09-23'
   heroImage: '../../assets/kapak.jpg' # isteğe bağlı
   category: 'yazilim'                 # zorunlu, aşağıdaki listeden
   tags: ['astro', 'cloudflare']       # isteğe bağlı
   draft: false                        # true ise yayına çıkmaz
   ---
   ```

3. `npm run dev` ile kontrol et, sonra commit + push.

## Kategoriler, isim, sosyal linkler

Hepsi tek dosyada: `src/consts.ts`

- **Kategori eklemek/değiştirmek:** `CATEGORIES` listesine `{ slug, name, description }` ekle. Sayfası otomatik oluşur: `/kategori/<slug>/`.
- **Sosyal linkler:** `SOCIAL_LINKS` içindeki boş `href` değerlerini doldur (boş olanlar gizlenir).
- **İsim / unvan / kısa tanıtım:** `AUTHOR`.

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
| `/rss.xml`           | RSS beslemesi                               |
