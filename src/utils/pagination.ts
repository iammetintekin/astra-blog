import { POSTS_PER_PAGE } from '../consts';

export interface Page<T> {
	items: T[];
	/** 1'den başlayan mevcut sayfa */
	current: number;
	total: number;
	/** Listenin kök adresi, "/" ile biter (örn. "/blog/") */
	base: string;
	prev?: string;
	next?: string;
}

/** 1. sayfa kök adreste, diğerleri <kök>/sayfa/<n>/ adresinde */
export function pageUrl(base: string, n: number): string {
	return n <= 1 ? base : `${base}sayfa/${n}/`;
}

export function pageCount(itemCount: number): number {
	return Math.max(1, Math.ceil(itemCount / POSTS_PER_PAGE));
}

/** /sayfa/<n>/ olarak üretilecek sayfa numaraları (2, 3, …) */
export function extraPageNumbers(itemCount: number): number[] {
	return Array.from({ length: pageCount(itemCount) - 1 }, (_, i) => i + 2);
}

export function getPage<T>(items: T[], current: number, base: string): Page<T> {
	const total = pageCount(items.length);
	const start = (current - 1) * POSTS_PER_PAGE;
	return {
		items: items.slice(start, start + POSTS_PER_PAGE),
		current,
		total,
		base,
		prev: current > 1 ? pageUrl(base, current - 1) : undefined,
		next: current < total ? pageUrl(base, current + 1) : undefined,
	};
}
