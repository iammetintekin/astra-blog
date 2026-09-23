// Sitenin tüm genel ayarları burada. İsim, tanıtım, sosyal linkler ve
// kategorileri değiştirmek için sadece bu dosyayı düzenlemen yeterli.

export const SITE_TITLE = 'Metin Tekin';
export const SITE_DESCRIPTION = 'Yazılım, teknoloji ve hayata dair notlarım.';

export const AUTHOR = {
	name: 'Metin Tekin',
	role: 'Yazılım Geliştirici',
	bio: 'Burada yazılım, teknoloji ve kariyer üzerine öğrendiklerimi, denediklerimi ve kişisel notlarımı paylaşıyorum.',
};

// href boş bırakılan linkler sitede gösterilmez.
export const SOCIAL_LINKS: { name: string; href: string; icon: 'github' | 'linkedin' | 'x' | 'mail' | 'rss' }[] = [
	{ name: 'GitHub', href: 'https://github.com/iammetintekin', icon: 'github' },
	{ name: 'LinkedIn', href: '', icon: 'linkedin' }, // örn. https://www.linkedin.com/in/kullanici-adin
	{ name: 'X', href: '', icon: 'x' }, // örn. https://x.com/kullanici-adin
	{ name: 'E-posta', href: '', icon: 'mail' }, // örn. mailto:ad@alanadi.com
	{ name: 'RSS', href: '/rss.xml', icon: 'rss' },
];

// Kategoriler. Yeni kategori eklemek için listeye bir satır ekle;
// yazılarda `category:` alanına buradaki `slug` değerini yazarsın.
// Sayfa adresi /kategori/<slug>/ olur.
export const CATEGORIES = [
	{ slug: 'yazilim', name: 'Yazılım', description: 'Kod, mimari, araçlar ve teknik notlar.' },
	{ slug: 'teknoloji', name: 'Teknoloji', description: 'Yeni ürünler, trendler ve teknoloji üzerine düşünceler.' },
	{ slug: 'kariyer', name: 'Kariyer', description: 'Çalışma hayatı, üretkenlik ve öğrenme.' },
	{ slug: 'kisisel', name: 'Kişisel', description: 'Kitaplar, seyahatler ve hayata dair yazılar.' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function getCategory(slug: string): Category {
	const category = CATEGORIES.find((c) => c.slug === slug);
	if (!category) throw new Error(`Bilinmeyen kategori: ${slug}`);
	return category;
}
