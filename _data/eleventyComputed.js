// Jekyll parity: `permalink: /foo` is written as foo.html and served at /foo (Netlify pretty URLs).
// Eleventy would otherwise reject it; so we append .html and strip it again with the `pretty_url` filter.
export default {
  permalink: (data) => {
    const p = data.permalink;
    if (p === false) return false;
    if (typeof p === "string" && p !== "") {
      return p.endsWith("/") || /\.[A-Za-z0-9]+$/.test(p) ? p : p + ".html";
    }
    // No permalink: reproduce Eleventy's default output path.
    const { filePathStem: stem, outputFileExtension: ext } = data.page;
    if (ext !== "html") return `${stem}.${ext}`;
    return stem.endsWith("/index") ? `${stem}.html` : `${stem}/index.html`;
  },
};
