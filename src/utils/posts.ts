import { type CollectionEntry, getCollection } from 'astro:content';
import { CATEGORIES, type CategorySlug } from '../consts';

export type Post = CollectionEntry<'blog'>;

/** Yayındaki yazılar, en yeniden eskiye. Taslaklar sadece geliştirme modunda görünür. */
export async function getPosts(): Promise<Post[]> {
	const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function countByCategory(posts: Post[]): Record<CategorySlug, number> {
	const counts = Object.fromEntries(CATEGORIES.map((c) => [c.slug, 0])) as Record<CategorySlug, number>;
	for (const post of posts) counts[post.data.category]++;
	return counts;
}

const TR_CHARS: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

/** "Yapay Zekâ" -> "yapay-zeka" */
export function slugify(text: string): string {
	return text
		.toLocaleLowerCase('tr-TR')
		.replace(/[çğıöşü]/g, (ch) => TR_CHARS[ch])
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function getTags(posts: Post[]) {
	const tags = new Map<string, { name: string; count: number }>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			const slug = slugify(tag);
			const entry = tags.get(slug);
			if (entry) entry.count++;
			else tags.set(slug, { name: tag, count: 1 });
		}
	}
	return [...tags.entries()]
		.map(([slug, t]) => ({ slug, ...t }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'));
}
