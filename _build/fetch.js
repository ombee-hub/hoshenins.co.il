// Downloads every relevant page listed in the site's sitemaps into <outDir>/pages/*.html
const fs = require("fs");
const path = require("path");
const out = process.argv[2];
const pagesDir = path.join(out, "pages");
fs.mkdirSync(pagesDir, { recursive: true });

const SKIP = /\/(blog-grid|pricing|team-details|faqs|portfolio-grid|team-member|gallery|home-7-one-page|service|portfolio|elementor-\d+)[^/]*\/?$/;
const UA = { headers: { "User-Agent": "Mozilla/5.0" } };

(async () => {
  const urls = [];
  for (const t of ["page", "service", "portfolio", "post"]) {
    const xml = await (await fetch(`https://hoshenins.co.il/${t}-sitemap.xml`, UA)).text();
    for (const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)) {
      const u = m[1];
      const dec = decodeURIComponent(u);
      if (dec === "https://hoshenins.co.il/") continue;
      const last = dec.replace(/\/$/, "").split("/").pop();
      if (/^(service|portfolio)$/.test(last) || /^(blog-grid|pricing|team-details|faqs|portfolio-grid|team-member|gallery|home-7-one-page|elementor-\d+)/.test(last)) continue;
      urls.push({ type: t, url: u, slug: last });
    }
  }
  const manifest = [];
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < urls.length) {
      const item = urls[i++];
      try {
        const html = await (await fetch(item.url, UA)).text();
        const file = `${item.type}-${manifest.length + Math.random().toString(36).slice(2, 7)}.html`;
        fs.writeFileSync(path.join(pagesDir, file), html);
        manifest.push({ ...item, file });
      } catch (e) { console.error("FAIL", item.slug, e.message); }
    }
  }));
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 1));
  console.log("fetched", manifest.length, "of", urls.length);
})();
