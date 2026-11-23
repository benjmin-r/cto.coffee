## Static site builder research for cto.coffee
### Site profile
- Jekyll, about 100 files: 17 episodes, 4 articles, ~15 pages
- 5 layouts, 4 includes, all Liquid; 2 RSS feeds (one with iTunes tags); SCSS (pixyll); Netlify `_redirects`
- No plugins, no kramdown-specific syntax

### Definitions of simplicity (ranked for this site)
1. Port effort: how much of the existing templates survives unchanged
2. Concept count: what you must learn to maintain it (collections, data cascade, ...)
3. Moving parts: dependencies, build config, framework runtime
4. Output model: plain HTML out, no client JS or hydration required
5. Stability: age of the API, breaking-change history, release cadence

### Candidates
| Tool | Liquid templates as is | Stability | Concepts | Verdict |
|---|---|---|---|---|
| Eleventy 3.1.8 (stable; 4.0 in alpha) | Yes, built in (LiquidJS) | v1 2022, v2 2023, v3 Oct 2024 (ESM only); releases ongoing | few: layouts, data cascade, collections | Best fit |
| Astro 7 | No, rewrite in `.astro` | frequent majors | components, content collections, islands | Overkill for 20 pages |
| Hexo 8 | No (EJS/Nunjucks) | alive, blog-centric | themes, scaffolds | Smaller community, blog assumptions |
| Metalsmith 2.7 | Via plugins | very stable, slow releases | plugin pipeline | Everything is assembled by hand |
| Lume | Yes, but Deno | 0.x npm package is stale | | Not JS/Node |
| VitePress | No | | | Docs-oriented |

### Recommendation: Eleventy 3
- Liquid is built in, so layouts and includes port almost verbatim (`jekyllInclude: true` supports `include.x`)
- Netlify needs only `netlify.toml` (`npm run build`, publish `_site`)
- The model is the same as Jekyll's: files in, files out, front matter, layouts
- Risks: v3 is ESM-only; the 4.0 alpha will bring more breaking changes (all small so far); smaller team than Astro

### Port result (this branch)
Builds 53 files in ~0.6s. Both feeds validate as XML. Pages render in headless Chromium with no local 4xx.

Changes needed to the templates:
- `site.categories.X` becomes `collections.X`
- `post.title`, `post.summary` etc. become `post.data.*` (only in `post-list.html` and the feeds)
- `page.title`, `page.summary` become `title`, `summary` (Eleventy has no `page.title`)
- `page.categories` becomes a `section` value set in `_posts.11tydata.json`
- `permalink: /foo` becomes `/foo/` (Eleventy needs a trailing slash or an extension). Netlify redirects `/foo` to `/foo/`.
- `_config.yml` becomes `_data/site.json`
- Three filters added in `eleventy.config.js`: `number_of_words`, `xml_escape`, `date_to_rfc822`
- `feed.xml` and `writing-feed.xml` need an explicit `permalink` plus the `xml` template format
- `site.time` becomes `"now"`
- markdown-it is configured with `html` and `typographer` to match kramdown's raw HTML and smart quotes

### Known differences to verify before cutover
- kramdown vs markdown-it edge cases (none seen in the current content)
- Canonical URLs for the former `.html` pages now end in `/`
- Jekyll baseline could not be built here (Ruby version mismatch), so no byte-diff was done
- The full-text article feed was only structure-checked

### AI-driven Chrome loop
- `npm start` serves at http://localhost:4000 with live reload (`eleventy --serve`)
- Any browser tool (Playwright, Claude in Chrome) can drive it
- Build output is plain static HTML, so DOM and screenshot checks are deterministic
