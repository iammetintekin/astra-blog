// Site ayarları ve kategoriler src/data/ altındaki JSON dosyalarından gelir:
//   - src/data/site.json        → site adı, yazar bilgisi, sosyal linkler, Google/SEO ayarları
//   - src/data/categories.json  → kategoriler
// En kolayı bunları yazı editöründen düzenlemek: `npm run yaz`

import categories from './data/categories.json';
import site from './data/site.json';

export const SITE_TITLE = site.title;
export const SITE_DESCRIPTION = site.description;
export const AUTHOR = site.author;
export const SEO = site.seo;

const email = site.social.email.trim();

// href boş olan linkler sitede gösterilmez.
export const SOCIAL_LINKS: { name: string; href: string; icon: 'github' | 'linkedin' | 'x' | 'mail' | 'rss' }[] = [
	{ name: 'GitHub', href: site.social.github, icon: 'github' },
	{ name: 'LinkedIn', href: site.social.linkedin, icon: 'linkedin' },
	{ name: 'X', href: site.social.x, icon: 'x' },
	{ name: 'E-posta', href: email && !email.startsWith('mailto:') ? `mailto:${email}` : email, icon: 'mail' },
	{ name: 'RSS', href: '/rss.xml', icon: 'rss' },
];

export type Category = { slug: string; name: string; description: string };
export type CategorySlug = string;

// Yazılarda `category:` alanına buradaki `slug` değeri yazılır. Sayfa adresi /kategori/<slug>/ olur.
export const CATEGORIES: Category[] = categories;

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export function getCategory(slug: string): Category {
	const category = CATEGORIES.find((c) => c.slug === slug);
	if (!category) throw new Error(`Bilinmeyen kategori: ${slug}`);
	return category;
}
