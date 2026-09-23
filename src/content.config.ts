import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_SLUGS } from './consts';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// consts.ts içindeki CATEGORIES listesinden bir slug (örn. 'yazilim')
			category: z.enum(CATEGORY_SLUGS),
			// Serbest etiketler (örn. ['astro', 'cloudflare'])
			tags: z.array(z.string()).default([]),
			// true ise yazı yayına alınmaz; sadece `npm run dev` ile yerelde görünür
			draft: z.boolean().default(false),
			// İsteğe bağlı SEO ayarları (boş bırakılırsa başlık/açıklama kullanılır)
			seo: z
				.object({
					title: z.string().optional(),
					description: z.string().optional(),
					canonical: z.url().optional(),
					noindex: z.boolean().default(false),
				})
				.optional(),
		}),
});

export const collections = { blog };
