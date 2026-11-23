import * as sass from "sass";
import path from "node:path";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";

export default function (eleventyConfig) {
  // kramdown-like markdown: raw HTML allowed, smart quotes/dashes (typographer)
  // Heading ids use the GitHub-style slug that kramdown (GFM) produced, so old #anchors keep working.
  const slug = (s) => s.trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M} _-]/gu, "").replace(/ /g, "-");
  eleventyConfig.amendLibrary("md", (md) => md.set({ html: true, typographer: true, xhtmlOut: true }).use(markdownItAnchor, { slugify: slug, tabIndex: false }).use(markdownItFootnote).use((m) => {
    // kramdown always turned -- / --- into en / em dashes
    m.core.ruler.push("dashes", (st) => st.tokens.forEach((t) => t.type === "inline" && t.children.forEach((c) => { if (c.type === "text") c.content = c.content.replace(/---/g, "\u2014").replace(/--/g, "\u2013"); })));
    // kramdown footnote markup: no <hr>, div.footnotes > ol
    m.renderer.rules.footnote_block_open = () => '<div class="footnotes">\n<ol>\n';
    m.renderer.rules.footnote_block_close = () => "</ol>\n</div>\n";
    m.renderer.rules.footnote_caption = (t, i) => String(t[i].meta.id + 1); }));

  // kramdown rendered `<div>..</div> text` as a block followed by a paragraph; CommonMark swallows the text into the HTML block.
  eleventyConfig.addPreprocessor("transcript-paragraphs", "md", (data, content) =>
    data.page.inputPath.includes("/transcripts/")
      ? content.replace(/^(<div class="transcript-timestamp">.*?<\/div>)[^\S\n]*(.*)$\n?/gm, (_, div, rest) => (rest ? `${div}\n\n${rest}\n` : `${div}\n\n`))
      : content);

  // Jekyll-compatible includes: {% include x.html a=b %} + `include.a`
  eleventyConfig.setLiquidOptions({ jekyllInclude: true });

  // Filters Jekyll provided that the templates use
  eleventyConfig.addFilter("number_of_words", (s) => String(s).split(/\s+/).filter(Boolean).length);
  eleventyConfig.addFilter("xml_escape", (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"));
  eleventyConfig.addFilter("date_to_rfc822", (d) => (d === "now" ? new Date() : new Date(d)).toUTCString().replace("GMT", "+0000"));
  // Pages written as foo.html are served (and were published) as /foo
  eleventyConfig.addFilter("pretty_url", (u) => (u === "/404.html" ? u : String(u).replace(/\.html$/, "")));

  // Replaces site.categories.* (newest first, like Jekyll)
  for (const name of ["episodes", "writing"]) {
    eleventyConfig.addCollection(name, (api) =>
      api.getFilteredByTag(name).sort((a, b) => b.date - a.date));
  }

  // SCSS (replaces jekyll-sass): css/pixyll.scss -> css/pixyll.css
  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: async (input, inputPath) => {
      if (path.basename(inputPath).startsWith("_")) return;
      const { css } = sass.compileString(input, {
        loadPaths: ["_sass"],
        style: "compressed",
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "color-functions", "mixed-decls"],
      });
      return async () => css;
    },
  });

  // Process feed.xml / writing-feed.xml as Liquid templates
  eleventyConfig.addTemplateFormats("xml");
  eleventyConfig.addExtension("xml", { key: "liquid" });

  // Static files copied as-is (Netlify reads _redirects from the publish dir)
  eleventyConfig.addPassthroughCopy("static");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("_redirects");
  eleventyConfig.addPassthroughCopy("speaking/**/*.pdf");

  for (const g of ["README.md", "LICENSE*", "_sass/**", ".claude/**", "docs/**"]) eleventyConfig.ignores.add(g);

  eleventyConfig.setServerOptions({ port: 4000 });

  return {
    dir: { input: ".", includes: "_includes", layouts: "_layouts", data: "_data", output: "_site" },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}
