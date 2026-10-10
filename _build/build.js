// Builds the redesigned inner pages of hoshenins.co.il from the downloaded WordPress pages.
// usage: node build.js <srcDir with manifest.json + pages/> <web dir>
const fs = require("fs");
const OUT = []; // [file, html] written after image names are known
const writePage = (file, html) => OUT.push([file, html.replace(/צור קשר/g, "יצירת קשר")]);
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

const SRC = process.argv[2];
const WEB = process.argv[3];
const IMG_DIR = path.join(WEB, "img");
fs.mkdirSync(IMG_DIR, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
const HOST = "https://hoshenins.co.il";
const VER = Date.now().toString(36); // cache-busting for css/js

// ---------- page registry ----------
const NAMES = {
  page: {
    "רשימת-שמאי-הסדר": ["appraisers.html", "service"],
    "רשימת-מוסכי-הסדר": ["garages.html", "service"],
    "רשימת-רופאי-הסדר": ["doctors.html", "service"],
    "טפסים": ["forms.html", "service"],
    "מכתבי-לקוחות": ["testimonials.html", "about"],
    "ביטוח-אחריות-מקצועית": ["professional-liability.html", "pro"],
    "פוליסות-ביטוח": ["insurance.html", "ins"],
    "פתרונות-פיננסים": ["finance.html", "fin"],
    "צור-קשר": ["contact.html", "contact"],
    "תרומה-לקהילה": ["community.html", "about"],
    "מהתקשורת-כתבות-ופרסומים": ["media.html", "about"],
    "מחירון-תעריפי-ביטוח": ["rates.html", "service"],
    "גילוי-נאות": ["disclosure.html", "service"],
    "מדיניות-פרטיות-לאתר-האינטרנט": ["privacy.html", "service"],
    "אמנת-שירות-לקוחות": ["service-charter.html", "service"],
    "פרופיל-החברה": ["about.html", "about"],
    "צוות-מקצועי": ["team.html", "about"],
    "דף-נחיתה-ביטוח-מקצועי-לחברי-איגוד-המתכ": ["planners-association.html", "pro"],
  },
  service: {
    "פתרונות-לפרישה": ["pension.html", "fin"],
    "ביטוח-עסק": ["business-insurance.html", "ins"],
    "שירותים-פיננסיים-והשקעות-בנדלן": ["investments.html", "fin"],
    "ביטוח-מקצועי-למהנדסים": ["engineers.html", "pro"],
    "ביטוח-מקצועית-למפקחי-בנייה": ["construction-supervisors.html", "pro"],
    "ביטוח-אחריות-מקצועית-למעצבי-פנים": ["interior-designers.html", "pro"],
    "ביטוח-אחריות-מקצועית-קבלנים-וחברות-בנ": ["contractors.html", "pro"],
    "ביטוח-אחריות-מקצועית-להי-טק": ["hitech.html", "pro"],
    "ביטוח-אחריות-מקצועית-למאמני-כושר": ["fitness-trainers.html", "pro"],
    "אחריות-מקצועית-לקוסמטיקאית": ["cosmetologists.html", "pro"],
    "ביטוח-רכב": ["car-insurance.html", "ins"],
    "ביטוח-דירה": ["home-insurance.html", "ins"],
    "ביטוח-בריאות": ["health-insurance.html", "ins"],
    "ביטוח-חיים": ["life-insurance.html", "ins"],
    "ביטוח-אחריות-מקצועית-לאדריכלים": ["architects.html", "pro"],
    "תכניות-חיסכון": ["savings.html", "fin"],
  },
};
// extra old URLs (menus, English slugs) that point at the same pages
const ALIASES = {
  "/המלצות": "testimonials.html", "/מהתקשורת": "media.html", "/פיננסים": "finance.html",
  "/service/business-insurance": "business-insurance.html", "/service/car-insurance": "car-insurance.html",
  "/service/health-insurance": "health-insurance.html", "/service/home-insurance-2": "home-insurance.html",
  "/service/life-insurance": "life-insurance.html", "/service/marriage-insurance": "life-insurance.html",
  "": "index.html",
};
const GROUPS = {
  pro: { name: "אחריות מקצועית", href: "professional-liability.html" },
  ins: { name: "ביטוח", href: "insurance.html" },
  fin: { name: "פיננסים", href: "finance.html" },
  about: { name: "אודות", href: "about.html" },
  service: { name: "שירות לקוחות", href: "contact.html" },
  contact: { name: "יצירת קשר", href: "contact.html" },
  stories: { name: "מהתקשורת", href: "media.html" },
  letters: { name: "המלצות", href: "testimonials.html" },
  articles: { name: "מאמרים", href: "articles.html" },
};
const CASES = ["ביטוח-נכס", "ביטוח-אחריות-מקצועית-להיי-טק", "ביטוח-למהנדסים", "ביטוח-למשרד-אדריכלים"];
const WIDE = new Set(["testimonials.html", "community.html", "media.html", "team.html", "about.html", "appraisers.html", "garages.html", "doctors.html", "forms.html"]);

const norm = u => {
  try { u = decodeURIComponent(u); } catch (e) {}
  return u.replace(/^https?:\/\/(www\.)?hoshenins\.co\.il/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
};
const pages = [];
const urlMap = { ...ALIASES };
let nLetter = 0, nStory = 0, nArticle = 0;
for (const m of manifest) {
  const slug = decodeURIComponent(m.slug);
  let file, group;
  if (NAMES[m.type] && NAMES[m.type][slug]) [file, group] = NAMES[m.type][slug];
  else if (m.type === "portfolio") {
    if (slug.startsWith("מכתב-תודה")) { file = `letter-${String(++nLetter).padStart(2, "0")}.html`; group = "letters"; }
    else { file = `story-${String(++nStory).padStart(2, "0")}.html`; group = CASES.includes(slug) ? "cases" : "stories"; }
  } else if (m.type === "post") { file = `article-${String(++nArticle).padStart(2, "0")}.html`; group = "articles"; }
  else { console.warn("unmapped", m.type, slug); continue; }
  pages.push({ ...m, srcFile: m.file, slug, file, group });
  urlMap[norm(m.url)] = file;
}
GROUPS.cases = { name: "סיפורי לקוחות", href: "index.html#stories" };

const mapLink = href => {
  if (!href) return href;
  href = href.trim().replace(/&amp;/g, "&");
  if (/^(mailto:|tel:|#|javascript:)/i.test(href)) return href.startsWith("javascript") ? "#" : href;
  if (!/hoshenins\.co\.il/.test(href) && /^https?:/.test(href)) return href;
  if (/wp-content\/uploads\/.+\.(pdf|docx?|xlsx?)$/i.test(href)) return href; // keep documents on the old host
  const hash = (href.match(/#.*$/) || [""])[0];
  const key = norm(href);
  if (key in urlMap) return urlMap[key] + (hash && hash !== "#contact" ? hash : "");
  if (/^\/(portfolio-category|category|tag)\//.test(key)) return "media.html";
  return href.startsWith("http") ? href : HOST + href;
};

// ---------- images ----------
// Images get readable names: the original English file name when it has one (e.g. "menora"),
// otherwise where they are used ("team-3", "testimonial-2", "engineers-1").
// While pages are built each image is referenced by a token; tokens become real names at the end.
const SKIP_IMG = new Set(["f859cb463146"]); // old "חושן איתך בכל רגע" logo banner – not wanted
const images = new Map(); // remote url -> { hash, ext, kind }
let CTX = "image"; // base name of the page being converted
const hashOf = src => crypto.createHash("md5").update(src).digest("hex").slice(0, 12);
const localImg = (src, kind) => {
  if (!src || src.startsWith("data:")) return null;
  if (src.startsWith("//")) src = "https:" + src;
  if (!/^https?:/.test(src)) src = HOST + (src.startsWith("/") ? "" : "/") + src;
  if (/dummy\.png|placeholder|\/plugins\//.test(src)) return null;
  const hash = hashOf(src);
  if (SKIP_IMG.has(hash)) return null;
  if (!images.has(src)) {
    const ext = (src.match(/\.(jpe?g|png|webp|gif|svg)(\?|$)/i) || [, "jpg"])[1].toLowerCase().replace("jpeg", "jpg");
    images.set(src, { hash, ext, kind: kind || CTX });
  }
  return `img/__IMG_${hash}__`;
};
const englishName = src => {
  let b = decodeURIComponent(src.split("/").pop()).replace(/\.[a-z]+$/i, "").replace(/-\d+x\d+$/, "");
  b = b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!/^[a-z][a-z0-9-]{2,30}$/.test(b) || (b.match(/[a-z]/g) || []).length < 3) return "";
  if (/^(img|dsc|image|screenshot|whatsapp|photo|untitled|design|copy|logo-\d)/.test(b) || /^[0-9a-f]{8,}$/.test(b)) return "";
  return b;
};
const INSURERS = { fwnix: "phoenix", arel: "harel", achshara: "hachshara", migdal: "migdal", shomera: "shomera", menora: "menora", clal: "clal", ayalon: "ayalon", altshuler: "altshuler-shaham", lapidot: "yelin-lapidot", yalin: "yelin-lapidot", psagot: "psagot" };
// decide final names once every page has been converted
function nameImages(outputs) {
  const used = new Set(), counters = {};
  const all = outputs.join("\n");
  for (const [src, im] of images) {
    const isUsed = all.includes(`__IMG_${im.hash}__`);
    // insurer logos are named after the company; everything else after the page/section it appears in
    let base = "";
    const e = englishName(src).replace(/\d+$/, "");
    if (im.kind === "insurer" || INSURERS[e]) {
      base = "insurer-" + (INSURERS[e] || e || "logo");
    } else { counters[im.kind] = (counters[im.kind] || 0) + 1; base = `${im.kind}-${counters[im.kind]}`; }
    if (!isUsed) base = "unused-" + base;
    let name = base, n = 2;
    while (used.has(name)) name = `${base}-${n++}`;
    used.add(name);
    im.name = `${name}.${im.ext}`;
    im.used = isUsed;
  }
}
const resolveImgs = html => html.replace(/img\/__IMG_([0-9a-f]{12})__/g, (_, h) => {
  for (const im of images.values()) if (im.hash === h) return "img/" + im.name;
  return _;
});
async function fetchImages() {
  let ok = 0, fail = 0, renamed = 0, kept = 0;
  const todo = [];
  // names from the previous build, so re-runs rename files instead of downloading them again
  const MAP_FILE = path.join(WEB, "_build", "img-names.json");
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); } catch (e) {}
  const pending = [];
  for (const [src, im] of images) {
    const target = path.join(IMG_DIR, im.name);
    const before = [prev[im.hash], `${im.hash}.${im.ext}`, `${im.hash}.jpeg`].filter(Boolean).map(n => path.join(IMG_DIR, n)).find(f => f !== target && fs.existsSync(f));
    if (before) { const tmp = target + ".tmp"; fs.renameSync(before, tmp); pending.push([tmp, target]); renamed++; continue; }
    if (fs.existsSync(target)) { kept++; continue; }
    if (im.used) todo.push([src, target]);
  }
  for (const [tmp, target] of pending) fs.renameSync(tmp, target); // two-step so swapped names never collide
  fs.writeFileSync(MAP_FILE, JSON.stringify(Object.fromEntries([...images.values()].map(im => [im.hash, im.name])), null, 1));
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < todo.length) {
      const [src, target] = todo[i++];
      try {
        const url = src.replace(/[^\x00-\x7F]/g, ch => encodeURIComponent(ch));
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok || !/image/.test(res.headers.get("content-type") || "")) throw new Error(res.status);
        fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
        ok++;
      } catch (e) { fail++; console.warn("img fail", src, e.message); }
    }
  }));
  for (const h of SKIP_IMG) for (const ext of ["jpg", "png"]) { const f = path.join(IMG_DIR, `${h}.${ext}`); if (fs.existsSync(f)) fs.unlinkSync(f); }
  console.log(`images: ${renamed} renamed, ${ok} downloaded, ${kept} already named, ${fail} failed`);
}

// ---------- html helpers ----------
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const txt = s => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const ALLOWED = new Set(["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "br", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "iframe", "video", "source", "figure", "figcaption", "u"]);
const RENAME = { h1: "h2", h5: "h4", h6: "h4", b: "strong", i: "em" };

function clean(html) {
  const $ = cheerio.load(`<div id="x">${html}</div>`, null, false);
  const root = $("#x");
  root.find("script,style,noscript,form,svg,button,input,select,textarea,link,meta").remove();
  root.find("i").each((_, e) => { if (!txt($(e).text())) $(e).remove(); });
  // deepest first so unwrapping keeps children intact
  root.find("*").get().reverse().forEach(el => {
    const $el = $(el);
    let tag = el.tagName.toLowerCase();
    if (RENAME[tag]) { el.tagName = RENAME[tag]; tag = RENAME[tag]; }
    if (!ALLOWED.has(tag)) { $el.replaceWith($el.contents()); return; }
    const keep = {};
    if (tag === "a") {
      keep.href = mapLink($el.attr("href"));
      if (/^https?:/.test(keep.href || "")) { keep.target = "_blank"; keep.rel = "noopener"; }
    }
    if (tag === "img") {
      const src = localImg($el.attr("data-src") || $el.attr("data-lazy-src") || $el.attr("src"));
      if (!src) { $el.remove(); return; }
      keep.src = src; keep.alt = txt($el.attr("alt")).replace(/^(עיצוב ללא שם.*|תמונה של WhatsApp.*|\d+_.*|צילום מסך.*|IMG.*)$/i, ""); keep.loading = "lazy";
    }
    if (tag === "iframe") {
      const src = $el.attr("src") || $el.attr("data-src") || "";
      if (!/youtube|youtu\.be|facebook|vimeo|google\.com\/maps/.test(src)) { $el.remove(); return; }
      keep.src = src; keep.loading = "lazy"; keep.allowfullscreen = ""; keep.title = $el.attr("title") || "וידאו";
    }
    if (tag === "video" || tag === "source") {
      const src = $el.attr("src");
      if (src) keep.src = src.startsWith("http") ? src : HOST + src;
      if (tag === "video") { keep.controls = ""; keep.preload = "metadata"; }
      if (tag === "source" && $el.attr("type")) keep.type = $el.attr("type");
    }
    if (tag === "td" || tag === "th") { if ($el.attr("colspan")) keep.colspan = $el.attr("colspan"); if ($el.attr("rowspan")) keep.rowspan = $el.attr("rowspan"); }
    el.attribs = keep;
  });
  // tidy: empty paragraphs and stray <br>s
  root.find("p").each((_, p) => { const $p = $(p); if (!txt($p.text()) && !$p.find("img,iframe,video").length) $p.remove(); });
  let out = root.html().replace(/&nbsp;/g, " ").replace(/(<br\s*\/?>\s*){3,}/g, "<br><br>");
  out = out.replace(/<p>\s*(<br\s*\/?>\s*)+/g, "<p>").replace(/(<br\s*\/?>\s*)+<\/p>/g, "</p>");
  // bare text (no block wrapper) becomes a paragraph
  if (txt(out) && !/^\s*<(p|h\d|ul|ol|table|figure|img|blockquote|iframe|video)/.test(out)) out = `<p>${out.trim()}</p>`;
  return out.trim();
}

// ---------- widget conversion ----------
function convert($, root, page) {
  const blocks = [];
  const meta = { kicker: "", lead: "" };
  const titleNorm = txt(page.title).replace(/[^֐-׿a-z0-9]/gi, "");

  // whole sections that only exist to hold the old contact form or map
  const skipSections = new Set();
  root.find('[data-widget_type^="form."],[data-widget_type^="google_maps."]').each((_, w) => {
    const sec = $(w).closest(".elementor-top-section").get(0);
    if (sec) skipSections.add(sec);
  });

  const widgets = root.find("[data-widget_type]");
  if (!widgets.length) {
    const html = clean(root.html() || "");
    if (html) blocks.push({ k: "html", html });
    return { blocks, meta };
  }

  widgets.each((_, w) => {
    const $w = $(w);
    const type = $w.attr("data-widget_type").split(".")[0];
    const sec = $w.closest(".elementor-top-section").get(0);
    if (sec && skipSections.has(sec)) return;

    switch (type) {
      case "ct_heading": case "heading": {
        const $t = $w.find("h1,h2,h3,h4,h5,h6").first();
        const title = txt($t.text());
        const $c = $w.clone(); $c.find("h1,h2,h3,h4,h5,h6").remove();
        let sub = txt($c.text());
        if (!/[֐-׿]/.test(sub)) sub = ""; // leftover English theme labels ("About us")
        if (!title && !sub) break;
        if (title.replace(/[^֐-׿a-z0-9]/gi, "") === titleNorm) { if (sub && !meta.lead) meta.lead = sub; break; }
        // the opening heading usually restates the page title – promote it to the hero
        if (!blocks.length && !meta.h1) {
          const words = s => new Set(s.split(/[\s\-–]+/).filter(w => w.length > 2));
          const a = words(title), b = words(page.title);
          if ([...a].filter(w => b.has(w)).length >= 2) { meta.h1 = title; if (sub) meta.lead = sub; break; }
        }
        blocks.push({ k: "heading", title, sub });
        break;
      }
      case "animated-headline": {
        const items = $w.find(".elementor-headline-dynamic-text, .elementor-headline-plain-text").map((_, s) => txt($(s).text())).get().filter(Boolean);
        if (items.length) blocks.push({ k: "pills", items });
        break;
      }
      case "ct_text_editor": case "text-editor": {
        const html = clean($w.find(".ct-text-editor, .elementor-text-editor, .elementor-widget-container").first().html() || $w.html());
        if (html) blocks.push({ k: "html", html });
        break;
      }
      case "ct_fancy_box": case "icon-box": {
        const title = txt($w.find(".item--title, .elementor-icon-box-title").first().text());
        const text = txt($w.find(".item--description, .elementor-icon-box-description").first().text());
        if (title || text) blocks.push({ k: "feature", title, text });
        break;
      }
      case "ct_list": {
        const items = $w.find(".ct-list-desc, .ct-list-content").map((_, e) => txt($(e).text())).get().filter(Boolean);
        if (items.length) blocks.push({ k: "list", items });
        break;
      }
      case "icon-list": {
        const items = $w.find(".elementor-icon-list-text").map((_, e) => txt($(e).text())).get().filter(Boolean);
        if (items.length) blocks.push({ k: "list", items });
        break;
      }
      case "image": case "ct_image": case "ct_banner": case "ct_image_animate": {
        $w.find("img").each((_, img) => {
          const src = localImg($(img).attr("data-src") || $(img).attr("src"));
          if (src) blocks.push({ k: "image", src, alt: txt($(img).attr("alt")).replace(/^(עיצוב ללא שם.*|ללא שם.*|\d+.*)$/, "") });
        });
        break;
      }
      case "video": {
        const v = $w.find("video").attr("src");
        const yt = ($w.attr("data-settings") || "").match(/"youtube_url":"([^"]+)"/);
        if (v) blocks.push({ k: "video", src: v });
        else if (yt) blocks.push({ k: "html", html: `<iframe src="${esc(yt[1].replace(/\\\//g, "/").replace("watch?v=", "embed/"))}" loading="lazy" allowfullscreen title="וידאו"></iframe>` });
        break;
      }
      case "ct_accordion": {
        const items = $w.find(".ct-accordion-item").map((_, it) => ({
          q: txt($(it).find(".ct-ac-title-text").text()),
          a: clean($(it).find(".ct-ac-content").html() || ""),
        })).get().filter(x => x.q);
        if (items.length) blocks.push({ k: "faq", items });
        break;
      }
      case "ct_tabs": {
        const titles = $w.find(".ct-tab-title").map((_, e) => txt($(e).text())).get();
        $w.find(".ct-tab-content").each((i, c) => {
          if (titles[i]) blocks.push({ k: "heading", title: titles[i], sub: "", level: 3 });
          blocks.push({ k: "html", html: clean($(c).html() || "") });
        });
        break;
      }
      case "ct_testimonial_carousel": {
        const items = $w.find(".item--inner").map((_, it) => ({
          quote: txt($(it).find(".item--description").text()),
          name: txt($(it).find(".item--title").text()),
          role: txt($(it).find(".item--position").text()),
          img: localImg($(it).find(".item--image img").attr("src"), "testimonial"),
        })).get().filter(x => x.quote);
        if (items.length) blocks.push({ k: "testimonials", items });
        break;
      }
      case "ct_team_grid": {
        const items = $w.find(".grid-item").map((_, it) => ({
          name: txt($(it).find(".item--title").text()),
          role: txt($(it).find(".item--position").text()),
          bio: clean($(it).find(".item--description").html() || ""),
          img: localImg($(it).find(".item--image img").attr("src"), "team"),
          mail: $(it).find('a[href^="mailto:"]').attr("href") || "",
        })).get().filter(x => x.name);
        if (items.length) blocks.push({ k: "team", items });
        break;
      }
      case "ct_portfolio_carousel": case "ct_service_grid": {
        const items = $w.find(".carousel-item, .grid-item").map((_, it) => {
          const $a = $(it).find(".item--title a").first();
          return {
            title: txt($a.text() || $(it).find(".item--title").text()),
            href: mapLink($a.attr("href") || $(it).find("a").attr("href")),
            img: localImg($(it).find("img").attr("src"), (mapLink($a.attr("href") || "").match(/^([a-z0-9-]+).html$/) || [, CTX])[1]),
            text: txt($(it).find(".item--content").text()),
          };
        }).get().filter(x => x.title);
        if (items.length) blocks.push({ k: "tiles", items });
        break;
      }
      case "ct_showcase": {
        const $a = $w.find("a").first();
        const img = localImg($w.find("img").attr("src"), "insurer");
        if ($a.length) blocks.push({ k: "link-card", title: txt($a.text()), href: mapLink($a.attr("href")), img });
        break;
      }
      case "ct_client_carousel": {
        const imgs = $w.find("img").map((_, i) => localImg($(i).attr("src"), "insurer")).get().filter(Boolean);
        if (imgs.length) blocks.push({ k: "logos", imgs });
        break;
      }
      case "ct_button": case "button": {
        const $a = $w.find("a").first();
        const href = $a.attr("href") || "";
        const label = txt($a.text());
        if (!label || !href || /^#/.test(href) || /יצירת קשר|לשיחה עם סוכן|הצעת מחיר|התקשרו/.test(label)) break;
        blocks.push({ k: "button", label, href: mapLink(href) });
        break;
      }
      case "ct_portfolio_details": {
        const items = $w.find("li").map((_, li) => {
          const label = txt($(li).find("label").text()).replace(/^Category:?$/i, "תחום").replace(/^Client:?$/i, "לקוח").replace(/:$/, "");
          return { label, value: txt($(li).find("span").text()) };
        }).get().filter(x => x.value);
        if (items.length) blocks.push({ k: "details", items });
        break;
      }
      default: break; // icons, dividers, anchors, maps, forms, social, menus
    }
  });
  return { blocks, meta };
}

// ---------- block rendering ----------
function render(blocks) {
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    // collapse runs of the same card type into one grid
    const run = k => { const items = [b]; while (blocks[i + 1] && blocks[i + 1].k === k) items.push(blocks[++i]); return items; };
    switch (b.k) {
      case "heading":
        out.push(`${b.sub ? `<p class="kicker">${esc(b.sub)}</p>` : ""}<h${b.level || 2}>${esc(b.title)}</h${b.level || 2}>`);
        break;
      case "html": out.push(b.html); break;
      case "pills": out.push(`<ul class="pills">${b.items.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`); break;
      case "feature":
        out.push(`<div class="feat-grid">${run("feature").map(f => `<div class="feat"><span class="feat__icon" aria-hidden="true"></span>${f.title ? `<h3>${esc(f.title)}</h3>` : ""}${f.text ? `<p>${esc(f.text)}</p>` : ""}</div>`).join("")}</div>`);
        break;
      case "list": out.push(`<ul class="checklist">${b.items.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`); break;
      case "image": {
        const imgs = run("image");
        out.push(imgs.length > 1
          ? `<div class="gallery">${imgs.map(m => `<img src="${m.src}" alt="${esc(m.alt)}" loading="lazy">`).join("")}</div>`
          : `<figure class="fig"><img src="${b.src}" alt="${esc(b.alt)}" loading="lazy"></figure>`);
        break;
      }
      case "video": out.push(`<video controls preload="metadata" src="${esc(b.src.startsWith("http") ? b.src : HOST + b.src)}"></video>`); break;
      case "faq":
        out.push(`<div class="faq">${b.items.map(x => `<details><summary>${esc(x.q)}</summary><div class="faq__a">${x.a}</div></details>`).join("")}</div>`);
        break;
      case "testimonials":
        out.push(`<div class="testi-grid">${b.items.slice(0, 3).map(t => `<figure class="testi"><blockquote>${esc(t.quote)}</blockquote><figcaption>${t.img ? `<img src="${t.img}" alt="" loading="lazy">` : ""}<span><b>${esc(t.name)}</b>${t.role ? `<small>${esc(t.role)}</small>` : ""}</span></figcaption></figure>`).join("")}</div>`);
        break;
      case "team": {
        // the same image repeated on several people is the logo placeholder, not a portrait
        const seen = {};
        b.items.forEach(t => { if (t.img) seen[t.img] = (seen[t.img] || 0) + 1; });
        const hasPhoto = t => t.img && seen[t.img] === 1;
        const card = t => `<article class="member">${hasPhoto(t) ? `<img src="${t.img}" alt="${esc(t.name)}" loading="lazy">` : ""}<div class="member__body"><h3>${esc(t.name)}</h3>${t.role ? `<p class="member__role">${esc(t.role)}</p>` : ""}${t.bio ? `<details><summary>קראו עוד</summary><div>${t.bio}</div></details>` : ""}${t.mail ? `<a class="member__mail" href="${esc(t.mail)}">${esc(t.mail.replace("mailto:", ""))}</a>` : ""}</div></article>`;
        const mini = t => `<article class="member member--mini"><span class="member__initials" aria-hidden="true">${esc(t.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(""))}</span><div><h3>${esc(t.name)}</h3>${t.role ? `<p class="member__role">${esc(t.role)}</p>` : ""}${t.mail ? `<a class="member__mail" href="${esc(t.mail)}">${esc(t.mail.replace("mailto:", ""))}</a>` : ""}</div></article>`;
        const lead = b.items.filter(hasPhoto), rest = b.items.filter(t => !hasPhoto(t));
        if (lead.length) out.push(`<div class="team-grid">${lead.map(card).join("")}</div>`);
        if (rest.length) out.push(`${lead.length ? "<h3>צוות הסוכנות</h3>" : ""}<div class="team-mini">${rest.map(mini).join("")}</div>`);
        break;
      }
      case "tiles":
        out.push(`<div class="tiles">${b.items.map(t => `<a class="tile" href="${esc(t.href)}">${t.img ? `<img src="${t.img}" alt="" loading="lazy">` : ""}<span class="tile__body"><h3>${esc(t.title)}</h3>${t.text ? `<p>${esc(t.text)}</p>` : ""}<span class="link-arrow">לקריאה</span></span></a>`).join("")}</div>`);
        break;
      case "link-card": {
        const items = run("link-card");
        out.push(`<div class="link-cards">${items.map(c => `<a class="link-card" href="${esc(c.href)}"${/^https?:/.test(c.href) ? ' target="_blank" rel="noopener"' : ""}>${c.img ? `<img src="${c.img}" alt="" loading="lazy">` : ""}<span>${esc(c.title)}</span></a>`).join("")}</div>`);
        break;
      }
      case "logos": out.push(`<div class="logo-row">${b.imgs.map(s => `<img src="${s}" alt="" loading="lazy">`).join("")}</div>`); break;
      case "button": {
        const btns = run("button");
        out.push(`<p class="btn-row">${btns.map(x => `<a class="btn btn--ghost" href="${esc(x.href)}"${/^https?:/.test(x.href) ? ' target="_blank" rel="noopener"' : ""}>${esc(x.label)}</a>`).join("")}</p>`);
        break;
      }
      case "details": out.push(`<dl class="details">${b.items.map(d => `<div><dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd></div>`).join("")}</dl>`); break;
    }
  }
  return out.join("\n");
}

// ---------- template ----------
const indexHtml = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
const between = (s, a, b) => s.slice(s.indexOf(a) + a.length, s.indexOf(b));
const rewriteLinks = html => html.replace(/href="(https?:\/\/(?:www\.)?hoshenins\.co\.il[^"]*)"/g, (_, u) => `href="${mapLink(u)}"`);
const HEADER = rewriteLinks(between(indexHtml, "<!--HEADER-->", "<!--/HEADER-->"));
const FOOTER = rewriteLinks(between(indexHtml, "<!--FOOTER-->", "<!--/FOOTER-->"));

const QUOTE_FORM = `<form class="form form--compact" id="quoteForm" novalidate>
        <h3>קבלו הצעת מחיר</h3>
        <p class="form__sub">השאירו פרטים ונחזור אליכם עם הצעה משתלמת.</p>
        <div class="field"><label for="f-name">שם מלא</label><input id="f-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="f-phone">טלפון</label><input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required pattern="0[0-9\\-\\s]{8,11}"></div>
        <div class="field"><label for="f-email">אימייל <small>(לא חובה)</small></label><input id="f-email" name="email" type="email" autocomplete="email"></div>
        <input type="hidden" name="topic" value="%TOPIC%">
        <label class="consent"><input type="checkbox" name="consent" required> <span>מאשר/ת לצוות חושן ביטוח ופיננסים לפנות אליי במייל או בטלפון</span></label>
        <button class="btn btn--primary btn--block" type="submit">שלחו – ונחזור אליכם</button>
        <p class="form__msg" role="status" aria-live="polite"></p>
      </form>`;

function relatedLinks(page) {
  const same = pages.filter(p => p.group === page.group && p.group !== "letters" && p.group !== "stories");
  if (same.length < 2 || same.length > 20) return "";
  return `<div class="aside__box aside__box--links"><h3>${esc(GROUPS[page.group].name)}</h3><ul class="aside__links">${same.map(p => `<li><a href="${p.file}"${p.file === page.file ? ' aria-current="page"' : ""}>${esc(p.title)}</a></li>`).join("")}</ul></div>`;
}

function pageHtml(page, body, meta) {
  const g = GROUPS[page.group];
  const wide = WIDE.has(page.file) || page.group === "letters";
  const desc = meta.desc || meta.lead || `${page.title} – חושן ביטוח ופיננסים, מומחים בביטוח אחריות מקצועית מאז 1994.`;
  const aside = `<aside class="aside" aria-label="יצירת קשר">
      <div class="aside__box" id="quote">
      ${QUOTE_FORM.replace("%TOPIC%", esc(page.title))}
      </div>
      <div class="aside__box aside__box--call"><p>מעדיפים לדבר?</p><a class="aside__phone" href="tel:097668365">09-7668365</a><a class="btn btn--wa btn--block" href="https://wa.me/97297668365" target="_blank" rel="noopener">כתבו לנו בוואטסאפ</a></div>
      ${relatedLinks(page)}
    </aside>`;
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>(function(){var d=document.documentElement;function fit(){var w=window.innerWidth;d.style.zoom=w>1600?Math.min(w/1600,2.2).toFixed(3):"";}fit();window.addEventListener("resize",fit);})();</script>
<title>${esc(page.title)} | חושן ביטוח ופיננסים</title>
<meta name="description" content="${esc(desc.slice(0, 160))}">
<meta name="theme-color" content="#144f72">
<link rel="icon" href="img/icon-square.png">
<meta property="og:title" content="${esc(page.title)} | חושן ביטוח ופיננסים">
<meta property="og:description" content="${esc(desc.slice(0, 200))}">
<meta property="og:image" content="${meta.ogImage || "img/logo.png"}">
<meta property="og:locale" content="he_IL">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css?v=${VER}">
<link rel="stylesheet" href="a11y.css?v=${VER}">
<script src="a11y.js?v=${VER}"></script>
</head>
<body class="inner">
${HEADER}
<main id="main">
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="פירורי לחם"><a href="index.html">ראשי</a>${g ? `<span><a href="${g.href}">${esc(g.name)}</a></span>` : ""}<span aria-current="page">${esc(page.title)}</span></nav>
    ${meta.kicker ? `<p class="eyebrow">${esc(meta.kicker)}</p>` : ""}
    <h1>${esc(meta.h1 || page.title)}</h1>
    ${meta.lead ? `<p>${esc(meta.lead)}</p>` : ""}
  </div>
</section>
<section class="page">
  <div class="wrap ${wide ? "page__wide" : "page__in"}">
    <article class="prose">
${body}
    </article>
    ${wide ? "" : aside}
  </div>
  <div class="wrap">
    <div class="cta-band"${wide ? ' id="quote"' : ""}>
      <div><h2>רוצים גב חזק לעסק ולבית?</h2><p>שיחה אחת עם המומחים של חושן – והצעה מותאמת אישית בדרך אליכם.</p></div>
      <div class="cta-band__actions"><a class="btn btn--lg" href="tel:097668365">התקשרו 09-7668365</a><a class="btn btn--lg btn--outline-light" href="https://wa.me/97297668365" target="_blank" rel="noopener">וואטסאפ</a></div>
    </div>
  </div>
</section>
</main>
${FOOTER}
<script src="script.js?v=${VER}"></script>
</body>
</html>
`;
}

// ---------- extra listing pages generated from the content ----------
function listingTiles(list) {
  return `<div class="tiles">${list.map(p => `<a class="tile" href="${p.file}">${p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy">` : ""}<span class="tile__body"><h3>${esc(p.title)}</h3>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}<span class="link-arrow">לקריאה</span></span></a>`).join("")}</div>`;
}

// ---------- main ----------
(async () => {
  const built = [];
  for (const page of pages) {
    const $ = cheerio.load(fs.readFileSync(path.join(SRC, "pages", page.srcFile), "utf8"));
    page.title = txt($("title").text()).replace(/\s*[-–|]\s*ביטוח אחריות מקצועית לאדריכלים.*$/, "").replace(/\s*[-–|]\s*חושן.*$/, "") || page.slug.replace(/-/g, " ");
    const ogImg = $('meta[property="og:image"]').attr("content");
    const ogDesc = txt($('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content"));
    CTX = page.file.replace(/.html$/, "");
    page.thumb = ogImg ? localImg(ogImg) : null;
    let root = $("[data-elementor-type=wp-page],[data-elementor-type=wp-post]").first();
    if (!root.length) root = $("article .entry-content").first();
    if (!root.length) root = $("#main");
    page._root = { $, root, ogDesc };
  }
  for (const page of pages) {
    const { $, root, ogDesc } = page._root;
    CTX = page.file.replace(/.html$/, "");
    const { blocks, meta } = convert($, root, page);
    // classic posts/stories: lead with the featured image if the body has none
    if (["stories", "cases", "letters", "articles"].includes(page.group) && page.thumb && !blocks.some(b => b.k === "image" || /<img/.test(b.html || ""))) blocks.unshift({ k: "image", src: page.thumb, alt: page.title });
    meta.desc = ogDesc && !/^ביטוח אחריות מקצועית לאדריכלים/.test(ogDesc) ? ogDesc : "";
    meta.ogImage = page.thumb;
    page.excerpt = txt((blocks.find(b => b.k === "html") || {}).html?.replace(/<[^>]+>/g, " ")).slice(0, 110);
    if (page.excerpt.length === 110) page.excerpt += "…";
    page._out = { blocks, meta };
  }
  // add our own listing for letters to the testimonials page and the article index
  const letters = pages.filter(p => p.group === "letters");
  const articles = pages.filter(p => p.group === "articles");
  for (const page of pages) {
    let { blocks, meta } = page._out;
    let body = render(blocks);
    if (page.file === "testimonials.html") body = body.replace(/<div class="tiles">[\s\S]*?<\/div>(?=\n|$)/, "") + `\n<h2>מכתבי תודה מלקוחות</h2>\n${listingTiles(letters)}`;
    if (!txt(body.replace(/<[^>]+>/g, " ")) && !/<img|<video|<iframe/.test(body)) body = `<p>התוכן של עמוד זה יעודכן בקרוב. לפרטים נוספים צרו קשר: <a href="tel:097668365">09-7668365</a>.</p>`;
    writePage(page.file, pageHtml(page, body, meta));
    built.push(page.file);
  }
  // article index
  const artPage = { file: "articles.html", group: "about", title: "מאמרים וטיפים" };
  writePage("articles.html", pageHtml({ ...artPage, group: "articles" }, `<p>מאמרים מקצועיים של צוות חושן על ביטוח אחריות מקצועית, ביטוח לעסקים בתחום הבנייה ועוד.</p>\n${listingTiles(articles)}`, { lead: "ידע מקצועי שיעזור לכם לבחור את הכיסוי הנכון" }));
  WIDE.add("articles.html");
  built.push("articles.html");

  // accessibility statement (same structure as the studio's other sites)
  const today = new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  const a11yBody = `<p class="kicker">עודכן לאחרונה: ${today}</p>
<p>חושן ביטוח ופיננסים רואה חשיבות רבה במתן שירות שוויוני לכלל הלקוחות והגולשים, ובשיפור השירות לאנשים עם מוגבלות. השקענו מאמצים כדי שהאתר יהיה נוח, ידידותי וזמין לכל אדם, ככל הניתן.</p>
<h2>רמת הנגישות באתר</h2>
<p>האתר הותאם בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ובהתאם להנחיות התקן הישראלי ת"י 5568, המבוסס על הנחיות WCAG 2.0 ברמה AA של ארגון W3C, ככל שהדבר ניתן.</p>
<h2>מה עשינו באתר</h2>
<ul>
<li>מבנה עמודים עקבי, עם כותרות היררכיות ואזורי ניווט מסומנים.</li>
<li>אפשרות ניווט מלאה באמצעות המקלדת (Tab, Enter, Esc ומקשי החיצים בלשוניות), וקישור "דילוג לתוכן" בתחילת כל עמוד.</li>
<li>סימון ברור של הרכיב שנמצא בפוקוס.</li>
<li>טקסט חלופי לתמונות בעלות משמעות.</li>
<li>ניגודיות צבעים גבוהה בין הטקסט לרקע.</li>
<li>התאמה לתצוגה במגוון מסכים ומכשירים, כולל טלפונים ניידים.</li>
<li>כיבוד הגדרת "הפחתת תנועה" של מערכת ההפעלה, ואפשרות לעצור את קרוסלת הלוגואים.</li>
<li>טפסים עם תוויות ברורות והודעות שגיאה מוקראות.</li>
</ul>
<h2>תפריט הנגישות</h2>
<p>בכל עמודי האתר זמין תפריט נגישות, הנפתח באמצעות הכפתור בפינת המסך. התפריט מאפשר:</p>
<ul>
<li>הגברת ניגודיות</li><li>הדגשת קישורים</li><li>הגדלת טקסט (שלוש דרגות)</li><li>ריווח טקסט</li><li>ביטול הנפשות ותנועה</li><li>הסתרת תמונות</li><li>גופן ידידותי לדיסלקציה</li><li>סמן עכבר גדול</li><li>הצגת תיאורים (טקסט חלופי) במעבר עכבר ובפוקוס</li><li>הגדלת גובה שורה</li><li>יישור טקסט</li><li>שינוי רוויית צבעים</li><li>איפוס כל ההגדרות, העברת התפריט לצד השני של המסך והגדלת התפריט עצמו</li>
</ul>
<p>ההגדרות נשמרות בדפדפן שלכם ונשארות פעילות במעבר בין עמודי האתר.</p>
<h2>הסתייגויות</h2>
<p>למרות מאמצינו להנגיש את כלל רכיבי האתר, ייתכן שיתגלו חלקים שטרם הונגשו במלואם. בין היתר:</p>
<ul>
<li>חלק מהכתבות ומכתבי התודה מוצגים כתמונה סרוקה, ולכן הטקסט שבתוכם אינו קריא לקוראי מסך.</li>
<li>טפסי ההצעה של חברות הביטוח הם קובצי PDF של החברות עצמן, ונגישותם תלויה בהן.</li>
<li>סרטוני הווידאו אינם כוללים כתוביות.</li>
<li>קישורים לאתרי חברות הביטוח מובילים לאתרים חיצוניים שאינם בשליטתנו.</li>
</ul>
<p>אנו ממשיכים לפעול לשיפור נגישות האתר.</p>
<h2>נתקלתם בבעיה? דברו איתנו</h2>
<p>אם נתקלתם בקושי בגלישה באתר או ברכיב שאינו נגיש, נשמח שתעדכנו אותנו ונפעל לתקן זאת בהקדם. כדי שנוכל לטפל בפנייה, נא לציין את העמוד שבו נתקלתם בבעיה, תיאור הבעיה, ואת סוג הדפדפן וטכנולוגיה מסייעת (אם נעשה בה שימוש).</p>
<p><strong>פרטי רכז הנגישות:</strong></p>
<ul>
<li>שם: גיא קפלן</li>
<li>דוא"ל: <a href="mailto:Guyk@hoshenins.co.il">Guyk@hoshenins.co.il</a></li>
<li>טלפון: <a href="tel:097668365" dir="ltr">09-7668365</a></li>
<li>כתובת: התע״ש 13, כפר סבא</li>
</ul>`;
  writePage("accessibility.html", pageHtml({ file: "accessibility.html", group: "service", title: "הצהרת נגישות" }, a11yBody, { lead: "האתר נבנה כך שיהיה נוח ונגיש לכל אדם" }));
  built.push("accessibility.html");

  // homepage: point old-site links to the new local pages
  fs.writeFileSync(path.join(WEB, "index.html"), rewriteLinks(indexHtml).replace(/(href|src)="(styles\.css|a11y\.css|a11y\.js|script\.js|cookies\.js)(\?v=[^"]*)?"/g, (_, a, f) => `${a}="${f}?v=${VER}"`));

  nameImages(OUT.map(o => o[1]));
  for (const [file, html] of OUT) fs.writeFileSync(path.join(WEB, file), resolveImgs(html));
  await fetchImages();
  fs.writeFileSync(path.join(SRC, "built.json"), JSON.stringify(pages.map(p => ({ file: p.file, group: p.group, title: p.title, url: decodeURIComponent(p.url) })), null, 1));
  console.log("pages written:", built.length);
})();
