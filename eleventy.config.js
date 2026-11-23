import * as sass from "sass";
import path from "node:path";

export default function (eleventyConfig) {
  // kramdown-like markdown: raw HTML allowed, smart quotes/dashes (typographer)
  eleventyConfig.amendLibrary("md", (md) => md.set({ html: true, typographer: true }));

  // Jekyll-compatible includes: {% include x.html a=b %} + `include.a`
  eleventyConfig.setLiquidOptions({ jekyllInclude: true });

  // Filters Jekyll provided that the templates use
  eleventyConfig.addFilter("number_of_words", (s) => String(s).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length);
  eleventyConfig.addFilter("xml_escape", (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"));
  eleventyConfig.addFilter("date_to_rfc822", (d) => new Date(d).toUTCString());

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

  for (const g of ["README.md", "LICENSE*", "_sass/**", ".claude/**"]) eleventyConfig.ignores.add(g);

  eleventyConfig.setServerOptions({ port: 4000 });

  return {
    dir: { input: ".", includes: "_includes", layouts: "_layouts", data: "_data", output: "_site" },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
  };
}
