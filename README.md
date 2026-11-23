# Source of the [cto.coffee](https://cto.coffee) website

Static site built with [Eleventy](https://www.11ty.dev) (Liquid templates, Markdown content), deployed on Netlify.
Design based on [pixyll](https://github.com/johno/pixyll)

### Develop

```
npm ci
npm start          # dev server with live reload, http://localhost:4000
npm run build      # build into _site
npm run preview    # serve _site like Netlify does (clean URLs), after a build
npm test           # post-build checks against _site
npm run ci         # build + checks (what Netlify and GitHub Actions run)
```

Content lives in `episodes/_posts`, `writing/_posts`, and the Markdown pages; layouts in `_layouts`, includes in `_includes`,
site-wide settings in `_data/site.json`, build config in `eleventy.config.js`.

### Checks before deploy

`tests/site.test.js` runs after every build, in Netlify (build command) and in GitHub Actions. It verifies that all URLs live
today (`tests/expected-urls.json`) are still served, internal links and `#anchors` resolve, both RSS feeds are valid for podcast
apps, the contact form is detectable by Netlify Forms, titles/canonicals are set, and no template leftovers are published.
A failing check fails the Netlify build, so the previous version stays live.

### License

All code in this repository is covered by the MIT License, as described in [LICENSE.txt](LICENSE.txt)

All content (such as text and audio files) in this repository are Copyright Benjamin Reitzammer, and released under
[Creative Commons Attribution Share Alike 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (CC-BY-SA-4.0), as
described in [LICENSE-CONTENT](LICENSE-CONTENT.txt).
