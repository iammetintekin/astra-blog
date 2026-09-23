#!/usr/bin/env node
/**
 * Yerel yazı editörü
 * -------------------
 * Çalıştır:  npm run yaz
 *
 * - http://localhost:4322 adresinde editörü açar
 * - Arka planda sitenin önizlemesini (astro dev, http://localhost:4321) başlatır
 * - Yazıları  src/content/blog/<adres>.md  olarak kaydeder
 * - Görselleri  src/assets/blog/<adres>/  klasörüne yükler
 * - Site ayarlarını  src/data/site.json , kategorileri  src/data/categories.json  dosyasına yazar
 *
 * Seçenekler:  --no-open (tarayıcıyı açma)   --no-site (astro dev'i başlatma)
 * Sadece bu bilgisayardan erişilebilir (127.0.0.1), internete açılmaz.
 */
import { exec, execFile, spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let yaml;
try {
	yaml = await import('js-yaml');
} catch {
	console.error('\n  "js-yaml" bulunamadı. Önce proje klasöründe şunu çalıştır:  npm install\n');
	process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const ASSETS_DIR = path.join(ROOT, 'src', 'assets');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const PORT = Number(process.env.EDITOR_PORT) || 4322;
const HOST = '127.0.0.1';
const args = new Set(process.argv.slice(2));

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.svg': 'image/svg+xml',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg']);
const MAX_UPLOAD = 25 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TR = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

// ---------------------------------------------------------------- yardımcılar

class UserError extends Error {}
const fail = (msg) => {
	throw new UserError(msg);
};

function slugify(text) {
	return String(text)
		.toLocaleLowerCase('tr-TR')
		.replace(/[çğıöşü]/g, (ch) => TR[ch])
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

async function readJSON(name) {
	return JSON.parse(await fs.readFile(path.join(DATA_DIR, name), 'utf8'));
}
async function writeJSON(name, data) {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.writeFile(path.join(DATA_DIR, name), JSON.stringify(data, null, '\t') + '\n', 'utf8');
}

function readBody(req, limit = 2 * 1024 * 1024) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on('data', (c) => {
			size += c.length;
			if (size > limit) {
				reject(new UserError(`Dosya çok büyük (en fazla ${Math.round(limit / 1024 / 1024)} MB).`));
				req.destroy();
			} else chunks.push(c);
		});
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}

function sendJSON(res, data, status = 200) {
	res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
	res.end(JSON.stringify(data));
}

function sendFile(res, file) {
	if (!existsSync(file)) {
		res.writeHead(404).end('Bulunamadı');
		return;
	}
	res.writeHead(200, {
		'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
		'Cache-Control': 'no-store',
	});
	createReadStream(file).pipe(res);
}

/** Yalnızca belirtilen klasörün içindeki bir yolu kabul et (../ ile dışarı çıkılamaz). */
function inside(base, rel) {
	const full = path.resolve(base, rel);
	if (!full.startsWith(base + path.sep)) fail('Geçersiz dosya yolu.');
	return full;
}

function safePostFile(name) {
	const file = path.basename(String(name || ''));
	if (!/^[\w.-]+\.mdx?$/i.test(file)) fail('Geçersiz yazı dosyası.');
	return file;
}

function run(cmd, cmdArgs) {
	return new Promise((resolve) =>
		execFile(cmd, cmdArgs, { cwd: ROOT, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) =>
			resolve({ ok: !err, out: `${stdout || ''}${stderr || ''}`.trim(), notFound: err?.code === 'ENOENT' }),
		),
	);
}

async function siteUrl() {
	try {
		const cfg = await fs.readFile(path.join(ROOT, 'astro.config.mjs'), 'utf8');
		return cfg.match(/site:\s*['"]([^'"]+)['"]/)?.[1] || '';
	} catch {
		return '';
	}
}

// ---------------------------------------------------------------- yazılar

function splitFrontmatter(src) {
	const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
	if (!m) return { data: {}, body: src };
	return { data: yaml.load(m[1]) ?? {}, body: m[2].replace(/^(?:\r?\n)+/, '') };
}

function toDateString(v) {
	if (!v) return '';
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	const s = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	const d = new Date(s);
	if (Number.isNaN(d.valueOf())) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parsePost(file, src) {
	const { data, body } = splitFrontmatter(src);
	const seo = data.seo && typeof data.seo === 'object' ? data.seo : {};
	return {
		file,
		ext: path.extname(file).toLowerCase(),
		slug: file.replace(/\.mdx?$/i, ''),
		title: str(data.title),
		description: str(data.description),
		pubDate: toDateString(data.pubDate),
		updatedDate: toDateString(data.updatedDate),
		heroImage: str(data.heroImage),
		category: str(data.category),
		tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t).trim()).filter(Boolean) : [],
		draft: data.draft === true,
		seo: {
			title: str(seo.title),
			description: str(seo.description),
			canonical: str(seo.canonical),
			noindex: seo.noindex === true,
		},
		body,
	};
}

async function listPosts() {
	await fs.mkdir(BLOG_DIR, { recursive: true });
	const files = (await fs.readdir(BLOG_DIR)).filter((f) => /\.mdx?$/i.test(f));
	const posts = [];
	for (const file of files) {
		try {
			const { body, ...post } = parsePost(file, await fs.readFile(path.join(BLOG_DIR, file), 'utf8'));
			post.words = (body.match(/\S+/g) || []).length;
			posts.push(post);
		} catch (e) {
			posts.push({ file, slug: file.replace(/\.mdx?$/i, ''), title: file, tags: [], error: e.message });
		}
	}
	return posts.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || '') || a.title.localeCompare(b.title, 'tr'));
}

function buildMarkdown(p) {
	const fm = { title: p.title, description: p.description, pubDate: p.pubDate };
	if (p.updatedDate) fm.updatedDate = p.updatedDate;
	if (p.heroImage) fm.heroImage = p.heroImage;
	fm.category = p.category;
	fm.tags = p.tags;
	fm.draft = p.draft;
	const seo = {};
	if (p.seo.title) seo.title = p.seo.title;
	if (p.seo.description) seo.description = p.seo.description;
	if (p.seo.canonical) seo.canonical = p.seo.canonical;
	if (p.seo.noindex) seo.noindex = true;
	if (Object.keys(seo).length) fm.seo = seo;
	const front = yaml.dump(fm, { lineWidth: -1, quotingType: "'" });
	const body = p.body.replace(/\r\n/g, '\n').replace(/^\s*\n/, '').replace(/\s*$/, '\n');
	return `---\n${front}---\n\n${body}`;
}

async function cleanPost(input) {
	const categories = await readJSON('categories.json');
	const seo = input.seo || {};
	const p = {
		originalFile: input.originalFile ? safePostFile(input.originalFile) : null,
		assetSlug: str(input.assetSlug),
		ext: input.ext === '.mdx' ? '.mdx' : '.md',
		slug: slugify(str(input.slug) || str(input.title)),
		title: str(input.title),
		description: str(input.description),
		pubDate: str(input.pubDate),
		updatedDate: str(input.updatedDate),
		heroImage: str(input.heroImage),
		category: str(input.category),
		tags: [...new Set((Array.isArray(input.tags) ? input.tags : []).map((t) => str(String(t))).filter(Boolean))],
		draft: input.draft === true,
		seo: {
			title: str(seo.title),
			description: str(seo.description),
			canonical: str(seo.canonical),
			noindex: seo.noindex === true,
		},
		body: typeof input.body === 'string' ? input.body : '',
	};
	if (!p.title) fail('Başlık boş olamaz.');
	if (!p.slug || !SLUG_RE.test(p.slug)) fail('Geçerli bir adres (slug) gir.');
	if (!p.description) fail('Açıklama boş olamaz.');
	if (!DATE_RE.test(p.pubDate)) fail('Yayın tarihi geçersiz.');
	if (p.updatedDate && !DATE_RE.test(p.updatedDate)) fail('Güncellenme tarihi geçersiz.');
	if (!categories.some((c) => c.slug === p.category)) fail('Bir kategori seç.');
	if (p.seo.canonical && !/^https?:\/\/\S+$/.test(p.seo.canonical)) fail('Canonical URL http:// veya https:// ile başlamalı.');
	return p;
}

async function savePost(input) {
	const p = await cleanPost(input);
	const file = p.slug + p.ext;
	const target = path.join(BLOG_DIR, file);
	if (p.originalFile !== file && existsSync(target)) fail(`"${p.slug}" adresiyle başka bir yazı zaten var. Adresi değiştir.`);

	// Adres değiştiyse yazının görsel klasörünü de taşı ve yolları güncelle
	if (p.assetSlug && p.assetSlug !== p.slug && SLUG_RE.test(p.assetSlug)) {
		const from = path.join(ASSETS_DIR, 'blog', p.assetSlug);
		const to = path.join(ASSETS_DIR, 'blog', p.slug);
		if (existsSync(from)) {
			if (existsSync(to)) fail(`src/assets/blog/${p.slug} klasörü zaten var; görseller taşınamadı.`);
			await fs.rename(from, to);
			const a = `assets/blog/${p.assetSlug}/`;
			const b = `assets/blog/${p.slug}/`;
			p.body = p.body.split(a).join(b);
			p.heroImage = p.heroImage.split(a).join(b);
		}
	}

	await fs.mkdir(BLOG_DIR, { recursive: true });
	await fs.writeFile(target, buildMarkdown(p), 'utf8');
	if (p.originalFile && p.originalFile !== file) await fs.rm(path.join(BLOG_DIR, p.originalFile), { force: true });
	return parsePost(file, await fs.readFile(target, 'utf8'));
}

async function uploadImage(req, url) {
	const slug = str(url.searchParams.get('slug'));
	if (!SLUG_RE.test(slug)) fail('Görsel yüklemek için önce yazıya bir başlık/adres ver.');
	const original = path.basename(str(url.searchParams.get('name')) || 'gorsel.png');
	const ext = path.extname(original).toLowerCase();
	if (!IMAGE_EXT.has(ext)) fail('Sadece görsel yüklenebilir: jpg, png, webp, gif, avif, svg.');
	const base = slugify(path.basename(original, path.extname(original))) || 'gorsel';
	const dir = path.join(ASSETS_DIR, 'blog', slug);
	await fs.mkdir(dir, { recursive: true });
	let name = base + ext;
	for (let i = 2; existsSync(path.join(dir, name)); i++) name = `${base}-${i}${ext}`;
	const data = await readBody(req, MAX_UPLOAD);
	if (!data.length) fail('Dosya boş.');
	await fs.writeFile(path.join(dir, name), data);
	return { name, path: `../../assets/blog/${slug}/${name}`, url: `/files/blog/${slug}/${name}`, size: data.length };
}

// ---------------------------------------------------------------- ayarlar

function cleanSite(s = {}) {
	const code = (v) => {
		const value = str(v);
		return value.match(/content=["']([^"']+)["']/)?.[1] ?? value;
	};
	const out = {
		title: str(s.title),
		description: str(s.description),
		author: { name: str(s.author?.name), role: str(s.author?.role), bio: str(s.author?.bio) },
		social: {
			github: str(s.social?.github),
			linkedin: str(s.social?.linkedin),
			x: str(s.social?.x),
			email: str(s.social?.email),
		},
		seo: {
			googleSiteVerification: code(s.seo?.googleSiteVerification),
			bingSiteVerification: code(s.seo?.bingSiteVerification),
			googleAnalyticsId: str(s.seo?.googleAnalyticsId).toUpperCase(),
		},
	};
	if (!out.title) fail('Site adı boş olamaz.');
	if (!out.author.name) fail('Yazar adı boş olamaz.');
	for (const [key, label] of [['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['x', 'X']]) {
		if (out.social[key] && !/^https?:\/\/\S+$/.test(out.social[key])) fail(`${label} adresi https:// ile başlamalı.`);
	}
	if (out.social.email && !/^(mailto:)?[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.social.email)) fail('E-posta adresi geçersiz.');
	if (out.seo.googleAnalyticsId && !/^G-[A-Z0-9]+$/.test(out.seo.googleAnalyticsId))
		fail('Google Analytics ölçüm kimliği G-XXXXXXXXXX biçiminde olmalı.');
	return out;
}

async function cleanCategories(list) {
	if (!Array.isArray(list) || list.length === 0) fail('En az bir kategori olmalı.');
	const seen = new Set();
	const out = list.map((c) => ({ slug: str(c?.slug), name: str(c?.name), description: str(c?.description) }));
	for (const c of out) {
		if (!c.name) fail('Kategori adı boş olamaz.');
		if (!SLUG_RE.test(c.slug)) fail(`"${c.name}" için geçerli bir adres (slug) gir.`);
		if (seen.has(c.slug)) fail(`"${c.slug}" adresi iki kez kullanılmış.`);
		seen.add(c.slug);
	}
	for (const post of await listPosts()) {
		if (post.category && !seen.has(post.category))
			fail(`"${post.category}" kategorisinde yazı var ("${post.title}"); bu kategori silinemez.`);
	}
	return out;
}

// ---------------------------------------------------------------- git

async function gitStatus() {
	const r = await run('git', ['status', '--porcelain', '--untracked-files=all']);
	if (r.notFound) fail('git bulunamadı. Git kurulu ve PATH içinde olmalı.');
	if (!r.ok) fail(r.out || 'git status çalışmadı.');
	const branch = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
	const ahead = await run('git', ['rev-list', '--count', '@{u}..HEAD']);
	return {
		files: r.out ? r.out.split('\n').map((l) => l.trimEnd()).filter(Boolean) : [],
		branch: branch.ok ? branch.out : '',
		ahead: ahead.ok ? Number(ahead.out) || 0 : 0,
	};
}

async function publish(message) {
	const msg = str(message) || 'İçerik güncellemesi';
	const log = [];
	const step = async (cmdArgs) => {
		const r = await run('git', cmdArgs);
		log.push(`$ git ${cmdArgs.join(' ')}\n${r.out}`.trim());
		return r;
	};
	let r = await step(['add', '-A']);
	if (!r.ok) return { ok: false, log: log.join('\n\n') };
	const staged = await run('git', ['diff', '--cached', '--quiet']);
	if (!staged.ok) {
		r = await step(['commit', '-m', msg]);
		if (!r.ok) return { ok: false, log: log.join('\n\n') };
	}
	r = await step(['push']);
	return { ok: r.ok, log: log.join('\n\n') };
}

// ---------------------------------------------------------------- site önizleme (astro dev)

let devUrl = '';
let devProc = null;
function startAstroDev() {
	const bin = path.join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
	if (!existsSync(bin)) {
		console.log('  (astro bulunamadı, site önizlemesi başlatılmadı — npm install çalıştır)');
		return;
	}
	devProc = spawn(process.execPath, [bin, 'dev'], { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' } });
	const onData = (chunk) => {
		const text = chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
		const m = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
		if (m && !devUrl) {
			devUrl = m[0].replace('127.0.0.1', 'localhost');
			console.log(`  Site önizleme:  ${devUrl}`);
		}
		if (/error/i.test(text)) process.stdout.write(`  [astro] ${text}`);
	};
	devProc.stdout.on('data', onData);
	devProc.stderr.on('data', onData);
	devProc.on('exit', (code) => {
		devProc = null;
		if (code === 0) {
			// Astro bazı ortamlarda sunucuyu arka plana alıp kendisi çıkar; sunucu çalışmaya devam eder.
			devBackgrounded = true;
			return;
		}
		console.log(`  [astro] önizleme sunucusu kapandı (kod ${code})`);
		devUrl = '';
	});
}
let devBackgrounded = false;
const shutdown = () => {
	devProc?.kill();
	if (devBackgrounded) {
		spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'dev', 'stop'], {
			cwd: ROOT,
			stdio: 'ignore',
		});
	}
	process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ---------------------------------------------------------------- HTTP

const server = http.createServer(async (req, res) => {
	// Sadece bu bilgisayardan gelen istekler (DNS rebinding'e karşı Host kontrolü)
	const host = (req.headers.host || '').split(':')[0];
	if (host !== 'localhost' && host !== '127.0.0.1') {
		res.writeHead(403).end('Yasak');
		return;
	}
	const origin = req.headers.origin;
	if (req.method !== 'GET' && origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
		res.writeHead(403).end('Yasak');
		return;
	}

	const url = new URL(req.url, `http://${req.headers.host}`);
	const route = `${req.method} ${url.pathname}`;
	try {
		switch (route) {
			case 'GET /':
			case 'GET /index.html':
				return sendFile(res, path.join(__dirname, 'index.html'));
			case 'GET /vendor/marked.js':
				return sendFile(res, path.join(ROOT, 'node_modules', 'marked', 'lib', 'marked.esm.js'));
			case 'GET /api/state': {
				const [posts, categories, site, url_] = await Promise.all([
					listPosts(),
					readJSON('categories.json'),
					readJSON('site.json'),
					siteUrl(),
				]);
				return sendJSON(res, { posts, categories, site, siteUrl: url_, devUrl });
			}
			case 'GET /api/post': {
				const file = safePostFile(url.searchParams.get('file'));
				const full = path.join(BLOG_DIR, file);
				if (!existsSync(full)) fail('Yazı bulunamadı.');
				return sendJSON(res, parsePost(file, await fs.readFile(full, 'utf8')));
			}
			case 'POST /api/post':
				return sendJSON(res, await savePost(JSON.parse((await readBody(req)).toString('utf8'))));
			case 'DELETE /api/post': {
				const file = safePostFile(url.searchParams.get('file'));
				await fs.rm(path.join(BLOG_DIR, file), { force: true });
				return sendJSON(res, { ok: true });
			}
			case 'POST /api/upload':
				return sendJSON(res, await uploadImage(req, url));
			case 'POST /api/site': {
				const site = cleanSite(JSON.parse((await readBody(req)).toString('utf8')));
				await writeJSON('site.json', site);
				return sendJSON(res, site);
			}
			case 'POST /api/categories': {
				const cats = await cleanCategories(JSON.parse((await readBody(req)).toString('utf8')));
				await writeJSON('categories.json', cats);
				return sendJSON(res, cats);
			}
			case 'GET /api/git-status':
				return sendJSON(res, await gitStatus());
			case 'POST /api/publish': {
				const { message } = JSON.parse((await readBody(req)).toString('utf8'));
				return sendJSON(res, await publish(message));
			}
		}
		if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
			return sendFile(res, inside(ASSETS_DIR, decodeURIComponent(url.pathname.slice('/files/'.length))));
		}
		res.writeHead(404).end('Bulunamadı');
	} catch (e) {
		if (!(e instanceof UserError) && !(e instanceof SyntaxError)) console.error(e);
		if (!res.headersSent) sendJSON(res, { error: e.message }, e instanceof UserError ? 400 : 500);
	}
});

server.on('error', (e) => {
	if (e.code === 'EADDRINUSE') {
		console.error(`\n  ${PORT} portu kullanımda. Editör zaten açık olabilir: http://localhost:${PORT}\n`);
		process.exit(1);
	}
	throw e;
});

server.listen(PORT, HOST, () => {
	const editorUrl = `http://localhost:${PORT}`;
	console.log(`\n  ✍️  Yazı editörü:  ${editorUrl}`);
	console.log('  Kapatmak için:   Ctrl+C\n');
	if (!args.has('--no-site')) startAstroDev();
	if (!args.has('--no-open')) {
		const opener =
			process.platform === 'win32'
				? `start "" "${editorUrl}"`
				: process.platform === 'darwin'
					? `open "${editorUrl}"`
					: `xdg-open "${editorUrl}"`;
		exec(opener, () => {});
	}
});
