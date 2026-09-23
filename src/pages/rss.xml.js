import rss from '@astrojs/rss';
import { getCategory, SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPosts } from '../utils/posts';

export async function GET(context) {
	const posts = await getPosts();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			categories: [getCategory(post.data.category).name, ...post.data.tags],
			link: `/blog/${post.id}/`,
		})),
	});
}
