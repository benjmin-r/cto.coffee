// Post-build checks. Run after `npm run build` (npm test).
// Netlify runs `npm run ci`, so a failing check stops the deploy and the last good version stays live.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const OUT = path.resolve("_site");
const expected = JSON.parse(fs.readFileSync("tests/expected-urls.json", "utf8"));

// Netlify "pretty URLs": /foo -> foo.html or foo/index.html
function resolveUrl(url) {
  // Netlify redirects /foo/ <-> /foo, so a trailing slash is tolerated
  const p = decodeURIComponent(url.split("#")[0].split("?")[0]).replace(/(.)\/$/, "$1");
  for (const c of [p, p + ".html", path.posix.join(p, "index.html")]) {
    const f = path.join(OUT, c);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
const read = (f) => fs.readFileSync(f, "utf8");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const htmlFiles = () => walk(OUT).filter((f) => f.endsWith(".html"));
// URL a page is served at: dir/index.html -> /dir/, foo.html -> /foo
const pageUrl = (f) => "/" + path.relative(OUT, f).replace(/index\.html$/, "").replace(/\.html$/, "");
const redirects = fs.existsSync(path.join(OUT, "_redirects"))
  ? read(path.join(OUT, "_redirects")).split("\n").map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2 && !p[0].startsWith("#"))
  : [];
const redirected = (url) => redirects.some(([from]) => from === url.replace(/\/$/, ""));
const mdFiles = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

test("every URL that is live today is still served (no URL regressions)", () => {
  assert.deepEqual(expected.urls.filter((u) => !resolveUrl(u)), []);
});

test("legacy redirects are kept in _redirects", () => {
  for (const [from, to] of Object.entries(expected.redirects)) {
    assert.ok(redirects.some((r) => r[0] === from && r[1] === to), `missing redirect ${from} -> ${to}`);
  }
});

test("no template leftovers or broken output in any page", () => {
  const bad = [];
  for (const f of htmlFiles()) {
    const html = read(f);
    for (const re of [/\{\{/, /\{%/, /Invalid Date/, /\[object Object\]/, /\bundefined\b/, /href=""/, /src=""/]) {
      if (re.test(html)) bad.push(`${pageUrl(f)} matches ${re}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("internal links, assets and #anchors resolve", () => {
  const broken = [];
  const idsCache = new Map();
  const ids = (file) => {
    if (!idsCache.has(file)) {
      const $ = cheerio.load(read(file));
      idsCache.set(file, new Set([...$("[id]").map((_, e) => $(e).attr("id")), ...$("a[name]").map((_, e) => $(e).attr("name"))]));
    }
    return idsCache.get(file);
  };
  for (const f of htmlFiles()) {
    const $ = cheerio.load(read(f));
    const base = pageUrl(f);
    $("a[href], link[href], img[src], script[src]").each((_, el) => {
      const ref = $(el).attr("href") ?? $(el).attr("src");
      if (!ref || /^(https?:|\/\/|mailto:|tel:|data:|javascript:)/.test(ref)) return;
      const [rawPath, frag] = ref.split("#");
      const target = rawPath === "" ? f : resolveUrl(rawPath.startsWith("/") ? rawPath : new URL(rawPath, "https://cto.coffee" + base).pathname);
      if (!target && !redirected(rawPath)) return broken.push(`${base}: ${ref}`);
      if (frag && target && target.endsWith(".html") && !ids(target).has(frag)) broken.push(`${base}: ${ref} (anchor)`);
    });
  }
  assert.deepEqual(broken, []);
});

test("every page has title, description, canonical and og tags", () => {
  const problems = [];
  for (const f of htmlFiles().filter((f) => !f.endsWith("404.html"))) {
    const $ = cheerio.load(read(f));
    const u = pageUrl(f);
    const canonical = $("link[rel=canonical]").attr("href");
    if (!$("title").text().trim()) problems.push(`${u}: empty title`);
    if (!$("meta[name=description]").attr("content")) problems.push(`${u}: no description`);
    if (canonical !== `https://cto.coffee${u}`) problems.push(`${u}: canonical ${canonical}`);
    if (!$('meta[property="og:title"]').attr("content")) problems.push(`${u}: no og:title`);
  }
  assert.deepEqual(problems, []);
});

test("page titles come from front matter", () => {
  const $ = cheerio.load(read(resolveUrl("/writing/1on1-structure")));
  assert.equal($("title").text(), "cto.coffee | On the Structure of One on Ones");
  assert.match(cheerio.load(read(resolveUrl("/")))("title").text(), /^cto\.coffee \| /);
});

test("home page lists 3 newest episodes and 3 newest articles, newest first", () => {
  const $ = cheerio.load(read(resolveUrl("/")));
  const rows = $(".posts .post.row");
  assert.equal(rows.length, 6);
  const titles = rows.map((_, r) => $(r).find(".post-title").text().trim()).get();
  assert.ok(titles.every(Boolean));
  assert.match(titles[0], /Season 2, Episode 1/);
  assert.match(titles[3], /Leadership as an Individual Contributor/);
});

test("episode pages: listen link, reading time, back link; transcripts link back", () => {
  const episodes = mdFiles("episodes/_posts");
  const index = cheerio.load(read(resolveUrl("/episodes")));
  assert.equal(index(".posts .post.row").length, episodes.length);
  for (const f of episodes) {
    const url = read(path.join("episodes/_posts", f)).match(/^permalink:\s*(\S+)/m)?.[1];
    assert.ok(url, `${f}: permalink`);
    const $ = cheerio.load(read(resolveUrl(url)));
    assert.match($('a[href*="files.cto.coffee/"]').attr("href") ?? "", /\.mp3$/, `${url}: mp3 link`);
    assert.match($(".post-meta").text(), /\d+ minute read/, `${url}: reading time`);
    assert.equal($(".jumpback a").attr("href"), "/episodes", `${url}: back link`);
  }
  for (const f of walk("episodes/transcripts")) {
    const m = read(f).match(/^permalink:\s*(\S+)[\s\S]*?^episode_permalink:\s*(\S+)/m);
    const $ = cheerio.load(read(resolveUrl(m[1])));
    assert.equal($(".jumpback a").attr("href"), m[2], `${m[1]}: back to episode`);
    assert.ok($(".transcript-timestamp").length > 5, `${m[1]}: transcript body`);
    assert.ok(resolveUrl(m[2]), `${m[2]} exists`);
  }
});

test("article pages: table of contents anchors and footnotes work", () => {
  const $ = cheerio.load(read(resolveUrl("/writing/1on1-structure")));
  assert.ok($('a[href="#prepare"]').length && $('a[name="prepare"]').length);
  assert.ok(cheerio.load(read(resolveUrl("/writing/1on1-purpose-goals")))(".footnotes li").length >= 1, "footnote rendered");
});

test("heading ids follow the kramdown/GitHub slugs (old #anchors keep working)", () => {
  assert.ok(cheerio.load(read(resolveUrl("/")))("#podcast-episodes-").length, "id for 'Podcast Episodes →'");
  assert.ok(cheerio.load(read(resolveUrl("/speaking")))("#how-do-agile--scrum-affect-quality---a-reality-check").length);
});

test("podcast feed is valid for podcast apps", () => {
  const $ = cheerio.load(read(path.join(OUT, "feed.xml")), { xmlMode: true });
  assert.equal($("rss > channel > item").length, mdFiles("episodes/_posts").length);
  for (const sel of ["title", "description", "link", "language", "itunes\\:author", "itunes\\:image", "itunes\\:category", "itunes\\:owner > itunes\\:email"]) {
    assert.ok($(`channel > ${sel}`).length, `channel ${sel}`);
  }
  const guids = new Set();
  $("item").each((_, it) => {
    const i = $(it);
    const t = i.children("title").text();
    assert.ok(t, "item title");
    assert.match(i.children("pubDate").text(), /^\w{3}, \d\d \w{3} \d{4} \d\d:\d\d:\d\d [+-]\d{4}$/, `${t}: pubDate`);
    const enc = i.children("enclosure");
    assert.match(enc.attr("url") ?? "", /^https?:\/\/.+\.mp3$/, `${t}: enclosure url`);
    assert.match(enc.attr("length") ?? "", /^\d+$/, `${t}: enclosure length`);
    assert.equal(enc.attr("type"), "audio/mp3");
    assert.match(i.children("itunes\\:duration").text(), /^(\d+:)?\d+:\d\d$/, `${t}: duration`);
    const g = i.children("guid").text();
    assert.ok(g.startsWith("https://cto.coffee/episodes/") && !guids.has(g), `${t}: guid ${g}`);
    guids.add(g);
    assert.ok(resolveUrl(new URL(g).pathname), `${g} is a real page`);
  });
  assert.match($("channel > pubDate").text(), /\+0000$/);
});

test("writing feed has all articles with full content", () => {
  const $ = cheerio.load(read(path.join(OUT, "writing-feed.xml")), { xmlMode: true });
  assert.equal($("item").length, mdFiles("writing/_posts").length);
  $("item").each((_, it) => {
    assert.ok($(it).children("description").text().length > 500, "full text in description");
    assert.ok(resolveUrl(new URL($(it).children("guid").text()).pathname));
  });
});

test("both feeds are advertised in <head> and in the nav", () => {
  const $ = cheerio.load(read(resolveUrl("/")));
  assert.equal($('link[type="application/rss+xml"]').length, 2);
  assert.ok($('nav a[href="/feed.xml"]').length && $('nav a[href="/writing-feed.xml"]').length);
});

test("contact form is detectable by Netlify Forms and posts to a real thanks page", () => {
  const $ = cheerio.load(read(resolveUrl("/contact")));
  const form = $("form[name=contact]");
  assert.equal(form.attr("data-netlify"), "true");
  assert.equal(form.attr("method")?.toUpperCase(), "POST");
  assert.ok(resolveUrl(form.attr("action")), "action target exists");
  assert.ok(form.find("input[type=submit]").parent().is("form"), "submit not wrapped in a stray <p>");
  assert.ok(form.find("[name=email]").length && form.find("[name=message]").length);
});

test("styles are compiled and assets referenced by CSS exist", () => {
  const css = read(path.join(OUT, "css/pixyll.css"));
  assert.ok(css.length > 15000);
  for (const sel of [".site-header", ".jumpback", ".footer", ".button-blue", ".transcript-timestamp"]) assert.ok(css.includes(sel), sel);
  for (const m of css.matchAll(/url\(["']?(\/[^"')]+)/g)) assert.ok(resolveUrl(m[1]), `css asset ${m[1]}`);
});

test("404 page, robots.txt and static assets are published", () => {
  assert.match(read(path.join(OUT, "404.html")), /404/);
  assert.match(read(path.join(OUT, "robots.txt")), /User-agent/i);
  assert.ok(fs.existsSync(path.join(OUT, "static/img/coffee-logo.svg")));
});

test("no source or config files are published", () => {
  const leaked = walk(OUT).map((f) => path.relative(OUT, f)).filter((f) => /^(node_modules|docs|tests|\.git|package|netlify\.toml|eleventy|_sass|_layouts|_includes|_data|README|LICENSE)/.test(f));
  assert.deepEqual(leaked, []);
});
