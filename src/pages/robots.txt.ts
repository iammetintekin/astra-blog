import type { APIRoute } from 'astro';

// Arama motorlarına siteyi tarayabileceklerini ve site haritasının yerini söyler.
export const GET: APIRoute = ({ site }) =>
	new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
