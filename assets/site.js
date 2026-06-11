/* ============================================================
   ASTROSYNC — shared, data-driven site script
   - Loads content from the backend API, falling back to
     localStorage, then to bundled defaults (works offline).
   - Applies the (admin-editable) brand colors.
   - Injects nav + footer, renders every section from content,
     builds the 3D revolving social sphere, and wires all UI.
   ============================================================ */
(function () {
  "use strict";

  var THEME_KEY = "astrosync-theme";
  var CONTENT_KEY = "astrosync-content";
  var MARK = "assets/mark.svg";

  /* ---------- Social icons (inline SVG, offline) ---------- */
  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3l.4-3H14V4.2c0-.9.3-1.4 1.5-1.4H17V.2C16.7.1 15.6 0 14.4 0 11.9 0 10.3 1.5 10.3 4.2V6H7.5v3h2.8v9H14z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2c.3 2.3 1.6 3.7 3.8 3.9v2.6c-1.3.1-2.5-.3-3.8-1v6.1c0 4-2.9 6.6-6.4 6-3-.5-4.9-3.4-4.3-6.5.5-2.7 3-4.6 5.9-4.2v2.8c-.4-.1-.9-.2-1.4-.1-1.2.2-2 1.2-1.9 2.4.1 1.2 1.1 2 2.4 1.9 1.3-.1 2.1-1.1 2.1-2.6V2z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5c-.3-1.1-1.1-1.9-2.2-2.2C18.8 4.8 12 4.8 12 4.8s-6.8 0-8.8.5C2.1 5.6 1.3 6.4 1 7.5.5 9.5.5 12 .5 12s0 2.5.5 4.5c.3 1.1 1.1 1.9 2.2 2.2 2 .5 8.8.5 8.8.5s6.8 0 8.8-.5c1.1-.3 1.9-1.1 2.2-2.2.5-2 .5-4.5.5-4.5s0-2.5-.5-4.5zM9.8 15.5v-7l5.7 3.5z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.5 8h4V24h-4zM8 8h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4 0 4.8 2.6 4.8 6v10h-4v-8.9c0-2.1 0-4.8-3-4.8s-3.4 2.3-3.4 4.6V24H8z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2h3.3l-7.2 8.2L23 22h-6.7l-5.2-6.8L5.1 22H1.8l7.7-8.8L1 2h6.8l4.7 6.2zm-1.2 18h1.8L7.1 3.9H5.2z"/></svg>'
  };
  function iconSvg(name) { return ICONS[name] || ICONS.instagram; }
  var PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  /* ---------- Helpers ---------- */
  function deepMerge(base, over) {
    if (Array.isArray(over)) return over.slice();
    if (over && typeof over === "object") {
      var out = {};
      var keys = Object.keys(base || {}).concat(Object.keys(over));
      keys.forEach(function (k) {
        if (out.hasOwnProperty(k)) return;
        var b = base ? base[k] : undefined;
        var o = over[k];
        out[k] = (o === undefined) ? b
               : (o && typeof o === "object") ? deepMerge(b || (Array.isArray(o) ? [] : {}), o)
               : o;
      });
      return out;
    }
    return over;
  }
  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return (o == null) ? o : o[k]; }, obj);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // rich text: *highlight* -> gradient span, \n -> <br>
  function rich(s) {
    return esc(s).replace(/\n/g, "<br>").replace(/\*([^*]+)\*/g, '<span class="grad-text">$1</span>');
  }
  function parseNum(str) {
    var m = String(str).match(/^([^\d.+\-]*[+\-−$]?)\s*([\d.,]+)(.*)$/);
    if (!m) return null;
    var num = parseFloat(m[2].replace(/,/g, ""));
    if (isNaN(num)) return null;
    return { prefix: m[1] || "", num: num, suffix: m[3] || "", dec: (m[2].indexOf(".") >= 0) ? 1 : 0 };
  }
  function countSpan(value) {
    var p = parseNum(value);
    if (!p) return esc(value);
    return '<span class="countup" data-prefix="' + esc(p.prefix) + '" data-suffix="' + esc(p.suffix) +
           '" data-target="' + p.num + '" data-dec="' + p.dec + '">' + esc(value) + '</span>';
  }

  /* ---------- Content loading ---------- */
  var DEFAULTS = window.ASTRO_DEFAULT_CONTENT || {};
  function cached() {
    try { var s = localStorage.getItem(CONTENT_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function loadContent() {
    return new Promise(function (resolve) {
      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var done = false;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 1500);
      fetch("api/content", ctrl ? { signal: ctrl.signal } : undefined)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
          done = true; clearTimeout(timer);
          try { localStorage.setItem(CONTENT_KEY, JSON.stringify(data)); } catch (e) {}
          resolve(deepMerge(DEFAULTS, data));
        })
        .catch(function () {
          if (done) return; clearTimeout(timer);
          var c = cached();
          resolve(c ? deepMerge(DEFAULTS, c) : DEFAULTS);
        });
    });
  }

  /* ---------- Theme (dark/light) ---------- */
  function getTheme() { try { return localStorage.getItem(THEME_KEY) || "dark"; } catch (e) { return "dark"; } }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.textContent = t === "dark" ? "☀" : "☾";
      b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
  }
  function toggleTheme() {
    var n = getTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, n); } catch (e) {}
    applyTheme(n);
  }

  /* ---------- Fonts (admin editable) ---------- */
  var SERIF_FONTS = { "Fraunces": 1 };
  function fontStack(name) {
    return "'" + name + "', " + (SERIF_FONTS[name] ? "Georgia, 'Times New Roman', serif" : "ui-sans-serif, system-ui, -apple-system, sans-serif");
  }
  function applyFonts(f) {
    if (!f) return;
    var root = document.documentElement;
    if (f.display) root.style.setProperty("--font-display", fontStack(f.display));
    if (f.body) root.style.setProperty("--font-body", fontStack(f.body));
  }

  /* ---------- Global type scale (admin editable) ---------- */
  function applyTypeScale(t) {
    if (!t) return;
    var root = document.documentElement;
    if (t.baseScale) root.style.setProperty("--type-base-scale", t.baseScale);
    if (t.headingScale) root.style.setProperty("--type-heading-scale", t.headingScale);
  }

  /* ---------- Brand colors + full theme (admin editable) ---------- */
  // Maps the editable per-mode keys to their CSS custom properties.
  var THEME_VAR_MAP = {
    bg: "--bg", bg2: "--bg-2", surface: "--surface", raised: "--surface-raised",
    border: "--border", text: "--text", muted: "--text-muted", onBrand: "--on-brand"
  };
  function applyColors(theme) {
    if (!theme) return;
    var root = document.documentElement;
    // Shared brand palette — applies in both modes (gradients derive from these).
    if (theme.teal) root.style.setProperty("--brand-teal", theme.teal);
    if (theme.deep) root.style.setProperty("--brand-deep", theme.deep);
    if (theme.navy) root.style.setProperty("--brand-navy", theme.navy);
    if (theme.mint) root.style.setProperty("--brand-mint", theme.mint);
    // Per-mode surface/text palette. Injected as a stylesheet so the dark/light
    // toggle keeps working — each mode's variables override the defaults in site.css.
    var modes = [["dark", ':root, [data-theme="dark"]', theme.dark], ["light", '[data-theme="light"]', theme.light]];
    var css = "";
    modes.forEach(function (m) {
      var vals = m[2]; if (!vals) return;
      var decls = "";
      for (var k in THEME_VAR_MAP) {
        if (Object.prototype.hasOwnProperty.call(THEME_VAR_MAP, k) && vals[k]) decls += THEME_VAR_MAP[k] + ":" + vals[k] + ";";
      }
      if (decls) css += m[1] + "{" + decls + "}";
    });
    var styleEl = document.getElementById("astro-theme-vars");
    if (!css) { if (styleEl) styleEl.textContent = ""; return; }
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "astro-theme-vars";
      document.head.appendChild(styleEl); // appended last → wins over site.css defaults
    }
    styleEl.textContent = css;
  }

  /* ---------- Nav links ---------- */
  var LINKS = [
    { page: "home", href: "index.html", label: "Home" },
    { page: "services", href: "services.html", label: "Services" },
    { page: "work", href: "work.html", label: "Work" },
    { page: "pricing", href: "pricing.html", label: "Pricing" },
    { page: "resources", href: "resources.html", label: "Resources" },
    { page: "about", href: "about.html", label: "About" }
  ];

  function brandHTML(C) {
    var name = (C.brand && C.brand.name) || "ASTROSYNC";
    var accent = (C.brand && C.brand.accent) || "";
    var lg = C.logo || {};
    var h = (+lg.height) || 34;
    var html = esc(name);
    if (accent && name.indexOf(accent) >= 0) {
      html = esc(name.replace(accent, "")) + '<span class="grad-text">' + esc(accent) + "</span>";
    }
    var img = (lg.type === "image" && lg.src)
      ? '<img class="brand-mark brand-logo-img" src="' + esc(lg.src) + '" alt="' + esc(name) + '" style="height:' + h + 'px;width:auto">'
      : '<img class="brand-mark" src="' + MARK + '" alt="" style="height:' + h + 'px;width:auto">';
    var nameEl = (lg.showName === false) ? "" : '<span class="brand-name">' + html + "</span>";
    return img + nameEl;
  }

  function buildNav(C, current) {
    var nav = document.createElement("nav");
    nav.className = "site-nav"; nav.setAttribute("aria-label", "Primary");
    var links = LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.page === current ? ' class="active"' : "") + ">" + l.label + "</a>";
    }).join("");
    var pos = (C.logo && C.logo.position) || "left";
    nav.innerHTML =
      '<div class="container nav-inner logo-' + pos + '">' +
        '<a class="brand" href="index.html" aria-label="AstroSync home">' + brandHTML(C) + "</a>" +
        '<div class="nav-links">' + links + "</div>" +
        '<div class="nav-actions">' +
          '<button class="theme-toggle" type="button">☀</button>' +
          '<a class="btn btn-primary desktop-cta" href="contact.html">Let\'s Talk <span class="arr">→</span></a>' +
          '<button class="hamburger" type="button" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
        "</div>" +
      "</div>";

    var drawer = document.createElement("div");
    drawer.className = "drawer";
    var dl = LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.page === current ? ' class="active"' : "") + ">" + l.label + "</a>";
    }).join("");
    drawer.innerHTML =
      '<div class="drawer-backdrop"></div>' +
      '<div class="drawer-panel" role="menu">' +
        '<button class="drawer-close" type="button" aria-label="Close menu">✕</button>' + dl +
        '<a class="btn btn-primary" href="contact.html">Let\'s Talk <span class="arr">→</span></a>' +
      "</div>";

    document.body.insertBefore(drawer, document.body.firstChild);
    document.body.insertBefore(nav, document.body.firstChild);
    return { nav: nav, drawer: drawer };
  }

  function buildFooter(C) {
    var f = document.createElement("footer");
    f.className = "site-footer";
    var socials = (C.socials || []).map(function (s) {
      return '<a href="' + esc(s.href || "#") + '" aria-label="' + esc(s.network) + '">' + iconSvg(s.network) + "</a>";
    }).join("");
    var locs = ((C.footer && C.footer.locations) || []).map(function (l) {
      return '<div class="loc" style="margin-bottom:.9rem"><b>' + esc(l.label) + "</b>" + esc(l.sub) + "</div>";
    }).join("");
    // Footer map: a clickable Google-Maps "picture" driven by an editable address.
    // Uses the key-free output=embed map; the iframe is non-interactive so the whole
    // card acts as one link that opens Google Maps in a new tab.
    var mapQuery = get(C, "footer.mapQuery");
    var mapUrl = get(C, "footer.mapUrl");
    var mapLabel = get(C, "footer.mapLabel") || "View on Google Maps";
    var mapLink = "";
    if (mapQuery != null && String(mapQuery).trim() !== "") {
      var q = encodeURIComponent(String(mapQuery).trim());
      var embed = "https://www.google.com/maps?q=" + q + "&z=14&output=embed";
      var link = (mapUrl != null && mapUrl !== "") ? mapUrl : ("https://www.google.com/maps/search/?api=1&query=" + q);
      mapLink =
        '<a class="footer-map-card" href="' + esc(link) + '" target="_blank" rel="noopener" aria-label="' + esc(mapLabel) + ' — open in Google Maps">' +
          '<iframe class="footer-map-frame" src="' + esc(embed) + '" loading="lazy" tabindex="-1" title="' + esc(mapLabel) + '" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '<span class="footer-map-bar">' + PIN_SVG + '<span class="fm-label">' + esc(mapLabel) + '</span><span class="fm-open">Open in Maps →</span></span>' +
        "</a>";
    } else if (mapUrl != null && mapUrl !== "") {
      mapLink = '<a class="footer-map" href="' + esc(mapUrl) + '" target="_blank" rel="noopener">' + PIN_SVG + "<span>" + esc(mapLabel) + "</span></a>";
    }
    f.innerHTML =
      '<div class="container"><div class="footer-top">' +
        "<div>" +
          '<a class="brand" href="index.html">' + brandHTML(C) + "</a>" +
          '<p class="footer-tag">' + esc(get(C, "footer.tagline")) + "</p>" +
          '<div class="socials">' + socials + "</div>" +
        "</div>" +
        '<div class="footer-col"><h4>Services</h4><ul>' +
          '<li><a href="services.html">Social Media</a></li>' +
          '<li><a href="services.html">Paid Advertising</a></li>' +
          '<li><a href="services.html">Content Creation</a></li>' +
          '<li><a href="services.html">Local SEO</a></li>' +
          '<li><a href="services.html">Email & SMS</a></li>' +
        "</ul></div>" +
        '<div class="footer-col"><h4>Company</h4><ul>' +
          '<li><a href="about.html">About Us</a></li>' +
          '<li><a href="work.html">Case Studies</a></li>' +
          '<li><a href="pricing.html">Pricing</a></li>' +
          '<li><a href="resources.html">Resources</a></li>' +
          '<li><a href="contact.html">Contact</a></li>' +
        "</ul></div>" +
        '<div class="footer-col"><h4>Locations</h4>' + locs +
          '<p style="margin-top:1rem">' + esc(get(C, "footer.email")) + "<br>" + esc(get(C, "footer.phone")) + "</p>" +
          mapLink +
        "</div>" +
      "</div>" +
      '<div class="footer-bottom"><p>' + esc(get(C, "footer.copyright")) +
        '</p><div class="footer-links"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></div></div>' +
      "</div>";
    document.body.appendChild(f);
  }

  /* ---------- Floating "build your package" CTA (all pages) ---------- */
  function buildFloatingCta(C) {
    var f = C.floatingCta || {};
    if (f.enabled === false) return;
    var a = document.createElement("a");
    a.className = "floating-cta";
    a.href = f.href || "pricing.html";
    a.setAttribute("aria-label", f.label || "Build your package");
    a.innerHTML = '<span class="fc-ico" aria-hidden="true">✦</span><span class="fc-label">' + esc(f.label || "Build Your Package") + "</span>";
    document.body.appendChild(a);
  }

  /* ---------- Custom dot + trailing-ring cursor ---------- */
  function buildCursor() {
    if (!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)) return; // mouse only
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ring = document.createElement("div"); ring.className = "cursor-ring";
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    document.body.appendChild(ring); document.body.appendChild(dot);
    document.documentElement.classList.add("has-cursor");
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, shown = false;
    var HOVER = "a,button,input,textarea,select,label,[role=button],.calc-card,.faq-q,.drag-handle,.calc-handle";
    function show() { if (!shown) { shown = true; dot.classList.add("on"); ring.classList.add("on"); } }
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      if (reduce) ring.style.transform = "translate(" + mx + "px," + my + "px)";
      show();
    }, { passive: true });
    if (!reduce) (function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = "translate(" + rx + "px," + ry + "px)"; requestAnimationFrame(loop); })();
    document.addEventListener("mouseover", function (e) { if (e.target.closest && e.target.closest(HOVER)) document.documentElement.classList.add("cursor-hover"); });
    document.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest(HOVER)) document.documentElement.classList.remove("cursor-hover"); });
    document.addEventListener("mousedown", function () { document.documentElement.classList.add("cursor-down"); });
    document.addEventListener("mouseup", function () { document.documentElement.classList.remove("cursor-down"); });
    document.documentElement.addEventListener("mouseleave", function () { dot.classList.remove("on"); ring.classList.remove("on"); shown = false; });
  }

  /* ---------- 3D social sphere ---------- */
  function buildSphere(C, el) {
    var nets = (C.hero && C.hero.sphere) || ["instagram", "tiktok", "facebook", "youtube", "linkedin", "x"];
    var n = nets.length, R = 175;
    var items = nets.map(function (net, i) {
      var a = Math.round((360 / n) * i);
      var y = Math.round(Math.sin(i * 1.7) * 55); // vary latitude
      return '<div class="orbit-item" style="--a:' + a + 'deg;--r:' + R + 'px;--y:' + y + 'px">' +
               '<div class="orbit-badge" style="--a:' + a + 'deg">' +
                 '<div class="social-badge" style="color:var(--brand-teal)">' + iconSvg(net) + "</div>" +
               "</div></div>";
    }).join("");
    el.innerHTML =
      '<div class="sphere">' +
        '<div class="sphere-ring"></div><div class="sphere-ring b"></div>' +
        '<div class="sphere-core"><img src="' + MARK + '" alt="AstroSync"></div>' +
        '<div class="orbit">' + items + "</div>" +
      "</div>";
  }

  /* ---------- Section renderers ---------- */
  var RENDER = {
    ticker: function (C) {
      var items = (C.ticker || []).map(function (t) {
        return '<span class="ticker-item"><b>✦</b>' + esc(t) + "</span>";
      });
      return '<div class="ticker-track">' + items.concat(items).join("") + "</div>";
    },
    herostats: function (C) {
      return (get(C, "hero.stats") || []).map(function (s, i) {
        return '<div class="stat reveal d' + (i + 1) + '"><div class="num">' + countSpan(s.value) +
               '</div><div class="label">' + esc(s.label) + "</div></div>";
      }).join("");
    },
    why: function (C) {
      return (get(C, "why.cards") || []).map(function (c, i) {
        return '<div class="card reveal' + (i ? " d" + i : "") + '"><div class="icon">' + esc(c.icon) +
               "</div><h3>" + esc(c.title) + "</h3><p>" + esc(c.text) + "</p></div>";
      }).join("");
    },
    services: function (C, opt) {
      var items = get(C, "services.items") || [];
      if (opt.limit) items = items.slice(0, +opt.limit);
      var isTeaser = opt.variant === "teaser";
      return items.map(function (s, i) {
        var num = ("0" + (i + 1)).slice(-2);
        var tag = (!isTeaser && s.tag) ? '<span class="tag">' + esc(s.tag) + "</span>" : "";
        // Teaser cards (home) stay a uniform "ENTER" funnel to the services page;
        // full cards (services page) use each card's editable CTA label + link.
        var enter = isTeaser ? "ENTER" : esc(s.cta || "Get Started");
        var href = isTeaser ? "services.html" : (s.ctaHref || "contact.html");
        return '<a class="card svc-card reveal' + (i % 3 ? " d" + (i % 3) : "") + '" href="' + esc(href) + '">' + tag +
               '<div class="svc-num">' + num + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) +
               '</p><span class="svc-enter">' + enter + " <span>→</span></span></a>";
      }).join("");
    },
    process: function (C) {
      return (get(C, "process.steps") || []).map(function (s, i) {
        return '<div class="step reveal' + (i ? " d" + i : "") + '"><div class="n">' + ("0" + (i + 1)).slice(-2) +
               "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
      }).join("");
    },
    results: function (C, opt) {
      return (get(C, "results.items") || []).map(function (r, i) {
        return '<div class="card stat-card reveal' + (i % 4 ? " d" + (i % 4) : "") + '"><div class="ctx">' + esc(r.ctx) +
               '</div><div class="big">' + countSpan(r.stat) + '</div><p style="margin-top:.8rem">' + esc(r.text) + "</p></div>";
      }).join("");
    },
    pricing: function (C) {
      return (get(C, "pricing.plans") || []).map(function (p, i) {
        var feats = (p.features || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
        var pop = p.popular ? '<span class="badge-pop">' + esc(p.popular) + "</span>" : "";
        var price = esc(p.price).replace(/^(\D*)/, function (m) { return m ? "<sup>" + m + "</sup>" : ""; });
        return '<div class="card price-card' + (p.featured ? " featured" : "") + " reveal" + (i ? " d" + i : "") + '">' + pop +
               '<div class="plan-name">' + esc(p.name) + '</div><div class="price">' + price +
               '</div><div class="per">' + esc(p.per) + '</div><ul class="feat-list">' + feats + "</ul>" +
               '<a class="btn ' + (p.featured ? "btn-primary" : "btn-outline") + '" href="contact.html">Get Started <span class="arr">→</span></a></div>';
      }).join("");
    },
    testimonials: function (C, opt) {
      var items = get(C, "testimonials.items") || [];
      if (opt.limit) items = items.slice(0, +opt.limit);
      return items.map(testimonialCard).join("");
    },
    faq: function (C) {
      return (get(C, "faq.items") || []).map(function (f, i) {
        return '<div class="faq-item reveal' + (i % 3 ? " d" + (i % 3) : "") +
               '"><button class="faq-q" type="button">' + esc(f.q) + '<span class="pm">+</span></button>' +
               '<div class="faq-a"><p>' + esc(f.a) + "</p></div></div>";
      }).join("");
    },
    teams: function (C) {
      return (get(C, "about.teams") || []).map(function (t, i) {
        return '<div class="team-card reveal' + (i ? " d" + i : "") + '"><div class="flag">' + esc(t.flag) +
               "</div><h3>" + esc(t.title) + '</h3><p style="color:var(--text-muted)">' + esc(t.text) + "</p></div>";
      }).join("");
    },
    values: function (C) {
      return (get(C, "about.values") || []).map(function (v, i) {
        return '<div class="value-row reveal' + (i ? " d" + i : "") + '"><div class="vn">' + ("0" + (i + 1)).slice(-2) +
               '</div><div><h3 style="font-size:1.2rem;margin-bottom:.3rem">' + esc(v.title) +
               '</h3><p style="color:var(--text-muted)">' + esc(v.text) + "</p></div></div>";
      }).join("");
    },
    contactInfos: function (C) {
      return (get(C, "contact.infos") || []).map(function (info, i) {
        return '<div class="info-row reveal' + (i ? " d" + i : "") + '"><div class="ico">' + esc(info.icon) +
               "</div><div><b>" + esc(info.title) + "</b><span>" + esc(info.sub) + "</span></div></div>";
      }).join("");
    }
  };

  /* ---------- Page-level section templates (Shopify-style layout) ---------- */
  var CONTACT_FORM =
    '<form class="form reveal d1" id="auditForm" novalidate>' +
      '<h3 style="font-size:1.4rem;margin-bottom:1.4rem">Get Your Free Audit</h3>' +
      '<div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden"><label>Website<input type="text" id="website" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="form-row">' +
        '<div class="field"><label for="fname">First Name</label><input type="text" id="fname" name="fname" placeholder="Marco" autocomplete="given-name" required></div>' +
        '<div class="field"><label for="lname">Last Name</label><input type="text" id="lname" name="lname" placeholder="Rodriguez" autocomplete="family-name"></div>' +
      "</div>" +
      '<div class="field"><label for="email">Business Email</label><input type="email" id="email" name="email" placeholder="marco@mybusiness.com" autocomplete="email" required></div>' +
      '<div class="field"><label for="business">Business Name</label><input type="text" id="business" name="business" placeholder="Fuego Taqueria"></div>' +
      '<div class="field"><label for="service">What Do You Need?</label>' +
        '<select id="service" name="service"><option value="">Select a service…</option>' +
        '<option>Social Media Management</option><option>Paid Advertising (Meta/Google)</option>' +
        '<option>Content Creation</option><option>Local SEO</option>' +
        '<option>Full-Service Growth Package</option><option>Not sure — I need advice</option></select>' +
      "</div>" +
      '<div class="field"><label for="budget">Monthly Budget</label>' +
        '<select id="budget" name="budget"><option value="">Select a range…</option>' +
        '<option>Under $500/mo</option><option>$500 – $1,000/mo</option>' +
        '<option>$1,000 – $2,500/mo</option><option>$2,500+/mo</option></select>' +
      "</div>" +
      '<div class="field"><label for="message">Tell Us About Your Business</label><textarea id="message" name="message" placeholder="What industry are you in, who are your customers, what\'s your biggest marketing challenge?"></textarea></div>' +
      '<button class="btn btn-submit btn-lg" type="submit">Book My Free Audit <span class="arr">→</span></button>' +
      '<p style="color:var(--text-muted);font-size:.78rem;margin-top:.9rem;text-align:center">No spam, ever. We reply within 24 hours.</p>' +
    "</form>";

  function headBlock(C, eb, ti, su, center) {
    var e = eb ? get(C, eb) : null, t = ti ? get(C, ti) : null, s = su ? get(C, su) : null;
    var h = '<div class="section-head' + (center ? " center" : "") + ' reveal">';
    if (e != null && e !== "") h += '<span class="eyebrow">' + esc(e) + "</span>";
    if (t != null) h += '<h2 class="section-title">' + rich(t) + "</h2>";
    if (s != null && s !== "") h += '<p class="section-sub">' + esc(s) + "</p>";
    return h + "</div>";
  }
  function sectionWrap(inner, extraCls) {
    return '<section class="section' + (extraCls ? " " + extraCls : "") + '"><div class="container">' + inner + "</div></section>";
  }
  function linkBtn(opt) {
    if (!opt || !opt.cta) return "";
    return '<div style="text-align:center;margin-top:2.4rem" class="reveal"><a class="btn btn-outline" href="' +
      esc(opt.cta.href) + '">' + esc(opt.cta.label) + ' <span class="arr">→</span></a></div>';
  }
  function ctaData(C, ref) {
    return (C.ctas && C.ctas[ref]) || (ref === "home" ? C.cta : null) || C.cta || {};
  }
  // Turn a video URL (YouTube / Vimeo / direct file) into embeddable markup.
  function videoEmbed(url, cls) {
    url = String(url || "").trim();
    if (!url) return "";
    cls = cls || "video-embed";
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    var src = yt ? ("https://www.youtube.com/embed/" + yt[1]) : (vm ? ("https://player.vimeo.com/video/" + vm[1]) : "");
    if (src) return '<div class="' + cls + '"><iframe src="' + esc(src) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    if (/\.(mp4|webm|ogg|ogv|mov)(\?|#|$)/i.test(url)) return '<div class="' + cls + '"><video src="' + esc(url) + '" controls preload="metadata"></video></div>';
    return '<a class="' + cls + ' video-link" href="' + esc(url) + '" target="_blank" rel="noopener">▶ Watch video</a>';
  }
  // True when a URL points at a directly-playable video file (vs a YouTube/Vimeo page).
  function isVideoFile(url) {
    return /\.(mp4|webm|ogg|ogv|mov)(\?|#|$)/i.test(url || "") || /^data:video\//i.test(url || "");
  }
  // One testimonial rendered as a quote card (used for non-video testimonials).
  function testimonialCard(t, i) {
    var media = t.video ? videoEmbed(t.video, "tm-media")
              : (t.media ? '<div class="tm-media"><img src="' + esc(t.media) + '" alt="' + esc((t.name || "") + " example") + '" loading="lazy"></div>' : "");
    var cap = (media && t.caption) ? '<p class="tm-cap">' + esc(t.caption) + "</p>" : "";
    return '<div class="card quote-card reveal' + (i % 3 ? " d" + (i % 3) : "") + '">' + media + cap +
           '<div class="stars">★★★★★</div>' +
           "<blockquote>" + esc(t.quote) + '</blockquote><div class="who"><div class="avatar">' + esc(t.initials) +
           '</div><div><div class="name">' + esc(t.name) + '</div><div class="role">' + esc(t.role) + "</div></div></div></div>";
  }
  // One card on the orbit arc (uses the reel-frame styling for the inner content).
  function orbitCard(t, i) {
    var src = String(t.video || "");
    var fileLike = isVideoFile(src);
    var media = fileLike
      ? '<video class="reel-video" src="' + esc(src) + '" playsinline muted loop preload="metadata"></video>'
      : videoEmbed(src, "reel-embed");
    var name = esc(t.name || ""), role = esc(t.role || ""), initials = esc(t.initials || "");
    var quote = esc(t.quote || t.caption || "");
    var who = (name || initials)
      ? '<div class="reel-who">' + (initials ? '<span class="reel-avatar">' + initials + "</span>" : "") +
        '<span class="reel-id"><b>' + name + "</b>" + (role ? "<span>" + role + "</span>" : "") + "</span></div>"
      : "";
    var caption = quote ? '<p class="reel-quote">' + quote + "</p>" : "";
    var sound = fileLike ? '<button class="reel-sound" type="button" aria-label="Toggle sound"></button>' : "";
    var playIco = fileLike ? '<span class="reel-play" aria-hidden="true">▶</span>' : "";
    return '<article class="orbit-card" data-i="' + i + '">' +
             '<div class="reel-frame">' + media + sound +
               '<span class="reel-tag">▶ Reel</span>' + playIco +
               '<div class="reel-grad"></div>' +
               '<div class="reel-meta">' + caption + who + "</div>" +
             "</div></article>";
  }
  // Orbit arc carousel — cards fanned along a circle. The section pins to the
  // viewport and vertical scroll scrubs the wheel so each card sweeps to the
  // upright front position, then the page continues (wired by wireOrbit()).
  function orbitCarousel(C, reels, headHtml) {
    var n = reels.length;
    var cards = reels.map(orbitCard).join("");
    var dots = reels.map(function (t, i) {
      return '<button class="orbit-dot" type="button" aria-label="Testimonial ' + (i + 1) + '"></button>';
    }).join("");
    // Extra scroll distance per card (beyond the one-viewport pin) so the scrub feels natural.
    var trackH = "calc(100vh + " + ((n - 1) * 62) + "vh)";
    return '<section class="section orbit-section">' +
             '<div class="orbit-track" data-orbit data-n="' + n + '" style="height:' + trackH + '">' +
               '<div class="orbit-pin"><div class="container orbit-inner">' +
                 (headHtml || "") +
                 '<div class="orbit-stage" tabindex="0" aria-roledescription="carousel">' +
                   '<div class="orbit-floor" aria-hidden="true"></div>' + cards +
                 "</div>" +
                 '<div class="orbit-foot"><div class="orbit-dots">' + dots + "</div>" +
                   '<span class="orbit-hint">Scroll to explore</span></div>' +
               "</div></div>" +
             "</div>" +
           "</section>";
  }
  // Resolve a blog post's funnel CTA (falls back to blog.defaultCta).
  function postCta(C, p) {
    var d = get(C, "blog.defaultCta") || {}, c = (p && p.cta) || {};
    var type = c.type || d.type || "calculator";
    var label = c.label || d.label || (type === "contact" ? "Get a free audit" : "Build your custom package");
    var href = c.href || d.href || (type === "contact" ? "contact.html" : "pricing.html");
    return { type: type, label: label, href: href };
  }
  // A single blog post card (used in the list + "recommended" rail).
  function blogCard(p) {
    var cover = (p.cover)
      ? '<div class="blog-cover"><img src="' + esc(p.cover) + '" alt="" loading="lazy"></div>'
      : '<div class="blog-cover blog-cover-ph"><span>' + esc(p.category || "AstroSync") + "</span></div>";
    var meta = [p.date, p.read].filter(Boolean).map(esc).join(" · ");
    return '<a class="card blog-card" href="blog.html?slug=' + encodeURIComponent(p.slug || "") + '">' + cover +
      '<div class="blog-card-body">' +
        (p.category ? '<span class="blog-cat">' + esc(p.category) + "</span>" : "") +
        "<h3>" + esc(p.title) + "</h3><p>" + esc(p.excerpt) + "</p>" +
        '<div class="blog-meta">' + meta + "</div>" +
      "</div></a>";
  }
  // One content block within a blog post body.
  function renderBlock(b) {
    if (!b || !b.type) return "";
    if (b.type === "heading") return '<h2 class="post-h">' + esc(b.text) + "</h2>";
    if (b.type === "quote") return '<blockquote class="post-quote">' + esc(b.text) + (b.cite ? "<cite>— " + esc(b.cite) + "</cite>" : "") + "</blockquote>";
    if (b.type === "image") return b.src ? '<figure class="post-figure"><img src="' + esc(b.src) + '" alt="' + esc(b.caption || "") + '" loading="lazy">' + (b.caption ? "<figcaption>" + esc(b.caption) + "</figcaption>" : "") + "</figure>" : "";
    if (b.type === "video") return b.url ? '<figure class="post-figure">' + videoEmbed(b.url, "post-video") + (b.caption ? "<figcaption>" + esc(b.caption) + "</figcaption>" : "") + "</figure>" : "";
    return '<p class="post-p">' + esc(b.text).replace(/\n/g, "<br>") + "</p>";
  }
  // One draggable service card in the calculator catalog.
  function calcCard(s, i, cur) {
    return '<article class="calc-card" draggable="true" data-svc="' + i + '">' +
      '<span class="calc-card-ico" aria-hidden="true">' + esc(s.icon || "✦") + "</span>" +
      '<div class="calc-card-main">' +
        "<h4>" + esc(s.name) + "</h4>" +
        "<p>" + esc(s.desc) + "</p>" +
        '<div class="calc-card-foot">' +
          '<span class="calc-price">' + esc(cur) + esc(s.price) + " <small>" + esc(s.unit) + "</small></span>" +
          '<button type="button" class="calc-add" data-svc="' + i + '" aria-label="Add ' + esc(s.name) + ' to quote">+ Add</button>' +
        "</div>" +
      "</div>" +
    "</article>";
  }

  var SECTIONS = {
    hero: function (C) {
      return '<header class="hero"><div class="container"><div class="hero-grid"><div>' +
        '<div class="badge reveal"><span>' + esc(get(C, "hero.badge")) + "</span></div>" +
        '<h1 class="reveal d1">' + rich(get(C, "hero.title")) + "</h1>" +
        '<p class="lead reveal d2">' + esc(get(C, "hero.lead")) + "</p>" +
        '<div class="hero-ctas reveal d3">' +
          '<a class="btn btn-primary btn-lg" href="' + esc(get(C, "hero.ctaPrimary.href")) + '"><span>' + esc(get(C, "hero.ctaPrimary.label")) + '</span> <span class="arr">→</span></a>' +
          '<a class="btn btn-outline btn-lg" href="' + esc(get(C, "hero.ctaSecondary.href")) + '"><span>' + esc(get(C, "hero.ctaSecondary.label")) + "</span></a>" +
        "</div>" +
        '<div class="hero-stats">' + RENDER.herostats(C) + "</div>" +
        "</div>" +
        '<div class="sphere-stage reveal d2" id="sphere" aria-hidden="true"></div>' +
        "</div></div></header>";
    },
    ticker: function (C) {
      return '<div class="ticker" aria-hidden="true">' + RENDER.ticker(C) + "</div>";
    },
    pageHeader: function (C, opt) {
      var r = (window.ASTRO_PAGEHEAD || {})[(opt && opt.ref)] || {};
      var e = r.eyebrow ? get(C, r.eyebrow) : null, t = r.title ? get(C, r.title) : null, s = r.sub ? get(C, r.sub) : null;
      return '<header class="page-header"><div class="container">' +
        (e != null ? '<span class="eyebrow reveal">' + esc(e) + "</span>" : "") +
        (t != null ? '<h1 class="reveal d1">' + rich(t) + "</h1>" : "") +
        (s != null ? '<p class="reveal d2">' + esc(s) + "</p>" : "") +
        "</div></header>";
    },
    why: function (C, opt) {
      var head = (opt && opt.head) ? headBlock(C, "why.eyebrow", "why.title", "why.sub") : "";
      return sectionWrap(head + '<div class="grid g-4">' + RENDER.why(C) + "</div>");
    },
    services: function (C, opt) {
      opt = opt || {};
      var head = opt.head ? headBlock(C, "services.eyebrow", "services.title", null) : "";
      return sectionWrap(head + '<div class="grid g-3">' +
        RENDER.services(C, { limit: opt.limit, variant: opt.variant || "full" }) + "</div>" + linkBtn(opt));
    },
    process: function (C, opt) {
      var head = (opt && opt.head) ? headBlock(C, "process.eyebrow", "process.title", "process.sub") : "";
      return sectionWrap(head + '<div class="steps">' + RENDER.process(C) + "</div>");
    },
    results: function (C, opt) {
      opt = opt || {};
      var head = opt.head ? headBlock(C, "results.eyebrow", "results.title", null, opt.center) : "";
      var cols = (+opt.cols === 2) ? "g-2" : "g-4";
      return sectionWrap(head + '<div class="grid ' + cols + '">' + RENDER.results(C) + "</div>" + linkBtn(opt));
    },
    testimonials: function (C, opt) {
      opt = opt || {};
      var head = opt.head ? headBlock(C, "testimonials.eyebrow", "testimonials.title", null) : "";
      var items = get(C, "testimonials.items") || [];
      if (opt.limit) items = items.slice(0, +opt.limit);
      var reels = items.filter(function (t) { return t && t.video; });
      var cards = items.filter(function (t) { return t && !t.video; });
      var cardsHtml = cards.length ? '<div class="grid g-3">' + cards.map(testimonialCard).join("") + "</div>" : "";
      if (reels.length) {
        // Pinned orbit carries the section head inside its sticky area; any text-only
        // testimonials follow as a normal grid below.
        return orbitCarousel(C, reels, head) + (cardsHtml ? sectionWrap(cardsHtml) : "");
      }
      return sectionWrap(head + cardsHtml);
    },
    pricing: function (C) {
      var note = get(C, "pricing.note");
      var noteHtml = (note != null && note !== "") ? '<p class="center reveal" style="color:var(--text-muted);font-size:.9rem;margin-top:2rem">' + esc(note) + "</p>" : "";
      return sectionWrap('<div class="grid g-3">' + RENDER.pricing(C) + "</div>" + noteHtml);
    },
    faq: function (C, opt) {
      var head = (opt && opt.head) ? headBlock(C, "faq.eyebrow", "faq.title", null, opt && opt.center) : "";
      return sectionWrap(head + '<div class="faq">' + RENDER.faq(C) + "</div>");
    },
    teams: function (C, opt) {
      var head = (opt && opt.head) ? headBlock(C, "about.teamEyebrow", "about.teamTitle", "about.teamSub") : "";
      return sectionWrap(head + '<div class="split">' + RENDER.teams(C) + "</div>");
    },
    values: function (C, opt) {
      var head = (opt && opt.head) ? headBlock(C, "about.valuesEyebrow", "about.valuesTitle", null) : "";
      return sectionWrap(head + '<div style="max-width:840px">' + RENDER.values(C) + "</div>");
    },
    contact: function (C) {
      return sectionWrap('<div class="contact-grid"><div>' +
        '<h2 class="reveal" style="font-size:1.6rem;margin-bottom:1.4rem">Talk to a Houston strategist</h2>' +
        "<div>" + RENDER.contactInfos(C) + "</div></div>" + CONTACT_FORM + "</div>");
    },
    cta: function (C, opt) {
      var c = ctaData(C, opt && opt.ref);
      return '<section class="section cta-band"><div class="container"><div class="cta-inner reveal">' +
        "<h2>" + rich(c.title) + "</h2><p>" + esc(c.text) + "</p>" +
        '<a class="btn btn-white btn-lg" href="' + esc(c.href || "contact.html") + '"><span>' + esc(c.button) + '</span> <span class="arr">→</span></a>' +
        "</div></div></section>";
    },
    blogList: function (C, opt) {
      opt = opt || {};
      var posts = get(C, "blog.posts") || [];
      if (opt.limit) posts = posts.slice(0, +opt.limit);
      var head = opt.head ? headBlock(C, "blog.eyebrow", "blog.title", "blog.sub", opt.center) : "";
      var cards = posts.map(blogCard).join("");
      return sectionWrap(head + '<div class="blog-grid">' + (cards || '<p class="section-sub">No articles published yet.</p>') + "</div>" + linkBtn(opt));
    },
    blogPost: function (C) {
      var posts = get(C, "blog.posts") || [];
      var slug = null;
      try { slug = new URLSearchParams(location.search).get("slug"); } catch (e) {}
      var p = (slug ? posts.filter(function (x) { return x.slug === slug; })[0] : null) || posts[0];
      if (!p) return sectionWrap('<p class="section-sub">No article found. <a href="resources.html">Back to Resources</a>.</p>');
      var meta = [p.author, p.date, p.read].filter(Boolean).map(esc).join(" · ");
      var cover = p.cover ? '<div class="post-cover"><img src="' + esc(p.cover) + '" alt=""></div>' : "";
      var body = (p.blocks || []).map(renderBlock).join("");
      var cta = postCta(C, p);
      var ctaBand = '<div class="post-cta reveal"><h3>' + esc(get(C, "blog.ctaHeading") || "Ready to put this to work?") + "</h3>" +
        '<a class="btn btn-primary btn-lg" href="' + esc(cta.href) + '"><span>' + esc(cta.label) + '</span> <span class="arr">→</span></a></div>';
      var others = posts.filter(function (x) { return x.slug !== p.slug; }).slice(0, 3);
      var rec = others.length
        ? '<div class="post-recommended"><h2 class="section-title" style="font-size:1.9rem;margin-bottom:1.6rem">' + esc(get(C, "blog.recommendedTitle") || "Keep Reading") +
          '</h2><div class="blog-grid">' + others.map(blogCard).join("") + "</div></div>" : "";
      return '<article class="section post"><div class="container post-narrow">' +
          '<a class="post-back" href="resources.html">← All Resources</a>' +
          (p.category ? '<span class="blog-cat">' + esc(p.category) + "</span>" : "") +
          '<h1 class="post-title">' + rich(p.title) + "</h1>" +
          '<div class="post-byline">' + meta + "</div>" + cover +
          '<div class="post-body">' + body + "</div>" + ctaBand +
        "</div>" + (rec ? '<div class="container">' + rec + "</div>" : "") + "</article>";
    },
    calculator: function (C) {
      var cfg = C.calculator || {};
      var cur = cfg.currency || "$";
      var head = headBlock(C, "calculator.eyebrow", "calculator.title", "calculator.sub", true);
      var cards = (cfg.services || []).map(function (s, i) { return calcCard(s, i, cur); }).join("");
      return sectionWrap(head +
        '<div class="calc" data-min="' + (+cfg.minQuote || 0) + '" data-cur="' + esc(cur) + '">' +
          '<div class="calc-grid">' +
            '<div class="calc-catalog reveal">' +
              '<div class="calc-col-head"><h3>Services</h3><span>Drag a card into your quote — or tap +</span></div>' +
              '<div class="calc-cards" id="calcCatalog">' + cards + "</div>" +
            "</div>" +
            '<div class="calc-quote reveal d1">' +
              '<div class="calc-col-head"><h3>Your Quotation</h3><button type="button" class="calc-clear" id="calcClear">Clear all</button></div>' +
              '<div class="calc-drop" id="calcDrop" aria-live="polite"></div>' +
              '<div class="calc-summary">' +
                '<p class="calc-note" id="calcNote"></p>' +
                '<div class="calc-total-row"><span>Estimated total</span><span class="calc-total" id="calcTotal">' + esc(cur) + "0</span></div>" +
                '<button class="btn btn-primary btn-lg calc-cta" type="button" id="calcCta"><span>' + esc(cfg.ctaLabel || "Request This Quote") + '</span> <span class="arr">→</span></button>' +
                '<button class="calc-suggest" type="button" id="calcSuggest">' + esc(cfg.suggestLabel || "✦ Suggest a starter package") + "</button>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>", "calc-section");
    }
  };

  function renderPage(C, page) {
    var mount = document.getElementById("page");
    if (!mount) return renderAll(C); // legacy fallback for un-migrated pages
    var layout = (C.sections && C.sections[page]) || (DEFAULTS.sections && DEFAULTS.sections[page]) || [];
    mount.innerHTML = layout
      .filter(function (s) { return s && !s.hidden && SECTIONS[s.type]; })
      .map(function (s) { return SECTIONS[s.type](C, s.opt || {}); })
      .join("");
    var sp = document.getElementById("sphere");
    if (sp) buildSphere(C, sp);
  }

  function renderAll(C) {
    // simple text + rich bindings
    document.querySelectorAll("[data-bind]").forEach(function (el) {
      var v = get(C, el.getAttribute("data-bind"));
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-rich]").forEach(function (el) {
      var v = get(C, el.getAttribute("data-rich"));
      if (v != null) el.innerHTML = rich(v);
    });
    document.querySelectorAll("[data-attr]").forEach(function (el) {
      // format "href:hero.ctaPrimary.href|text:hero.ctaPrimary.label"
      el.getAttribute("data-attr").split("|").forEach(function (pair) {
        var kv = pair.split(":"); var target = kv[0]; var v = get(C, kv[1]);
        if (v == null) return;
        if (target === "text") el.textContent = v; else el.setAttribute(target, v);
      });
    });
    // list sections
    document.querySelectorAll("[data-list]").forEach(function (el) {
      var name = el.getAttribute("data-list");
      if (RENDER[name]) el.innerHTML = RENDER[name](C, { limit: el.getAttribute("data-limit"), variant: el.getAttribute("data-variant") });
    });
    // sphere
    var sp = document.getElementById("sphere");
    if (sp) buildSphere(C, sp);
  }

  /* ---------- Interactions ---------- */
  function wireNav(refs) {
    var nav = refs.nav, drawer = refs.drawer;
    function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 20); }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    document.querySelectorAll(".theme-toggle").forEach(function (b) { b.addEventListener("click", toggleTheme); });
    applyTheme(getTheme());
    var ham = nav.querySelector(".hamburger"), closeBtn = drawer.querySelector(".drawer-close"), backdrop = drawer.querySelector(".drawer-backdrop");
    function open() { drawer.classList.add("open"); ham.classList.add("open"); ham.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; }
    function close() { drawer.classList.remove("open"); ham.classList.remove("open"); ham.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }
    ham.addEventListener("click", open); closeBtn.addEventListener("click", close); backdrop.addEventListener("click", close);
    drawer.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function wireReveals() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var obs = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { obs.observe(e); });
  }
  function wireCounters() {
    var nums = document.querySelectorAll(".countup");
    if (!nums.length) return;
    function animate(el) {
      var target = parseFloat(el.getAttribute("data-target")), dec = +el.getAttribute("data-dec");
      var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "", start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / 1400, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + (target * e).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(frame); else el.textContent = pre + target.toFixed(dec) + suf;
      }
      requestAnimationFrame(frame);
    }
    if (!("IntersectionObserver" in window)) { nums.forEach(animate); return; }
    var obs = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { obs.observe(n); });
  }
  function wireFAQ() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q"), a = item.querySelector(".faq-a");
      q.addEventListener("click", function () {
        var open = item.classList.toggle("open");
        a.style.maxHeight = open ? a.scrollHeight + "px" : "0px";
      });
    });
  }
  // Orbit testimonial carousel: cards fan along a circular arc inside a pinned
  // section; vertical scroll scrubs the wheel so each card sweeps to the upright
  // front position, then the page continues.
  function wireOrbit() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll("[data-orbit]").forEach(function (root) {
      var stage = root.querySelector(".orbit-stage");
      var cards = stage ? Array.prototype.slice.call(stage.querySelectorAll(".orbit-card")) : [];
      if (!cards.length) return;
      var dots = Array.prototype.slice.call(root.querySelectorAll(".orbit-dot"));
      var n = cards.length;
      var STEP = 25;          // degrees between adjacent cards
      var WINDOW = 76;        // cards beyond this angle from front are hidden
      var wantSound = true, unlocked = false, visible = true, frontIdx = 0;
      function soundOn() { return wantSound && unlocked; }

      function geom() {
        var w = stage.clientWidth, h = stage.clientHeight;
        var r = Math.min(440, Math.max(220, w * 0.5));
        return { cx: w / 2, cy: h * 0.40 + r, r: r };
      }

      function layout(rotation) {
        var g = geom();
        var bestIdx = 0, bestA = 1e9;
        cards.forEach(function (card, i) {
          var a = (i - (n - 1) / 2) * STEP - rotation;        // degrees from front
          a = ((a + 180) % 360 + 360) % 360 - 180;            // normalise
          var aa = Math.abs(a), rad = a * Math.PI / 180;
          if (aa > WINDOW) { card.style.display = "none"; card.classList.remove("is-front"); var hv = card.querySelector("video"); if (hv) hv.pause(); return; }
          card.style.display = "";
          var x = g.cx + g.r * Math.sin(rad);
          var y = g.cy - g.r * Math.cos(rad);
          var scale = 0.46 + 0.54 * Math.cos(rad);
          var op = Math.max(0, Math.min(1, (Math.cos(rad) - 0.02) / 0.5));
          card.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%) rotate(" + a.toFixed(2) + "deg) scale(" + scale.toFixed(3) + ")";
          card.style.opacity = op.toFixed(3);
          card.style.zIndex = String(1000 - Math.round(aa * 5));
          if (aa < bestA) { bestA = aa; bestIdx = i; }
        });
        frontIdx = bestIdx;
        cards.forEach(function (card, i) {
          var isFront = i === frontIdx;                       // the single closest card is always "front"
          card.classList.toggle("is-front", isFront);
          var v = card.querySelector("video");
          if (v) {
            v.muted = !(soundOn() && isFront);
            if (isFront && visible && !card.classList.contains("is-paused")) {
              var p = v.play();
              if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); });
            } else { v.pause(); }
          }
          var s = card.querySelector(".reel-sound");
          if (s) s.textContent = (isFront && soundOn()) ? "🔊" : "🔇";
        });
        dots.forEach(function (d, i) { d.classList.toggle("on", i === frontIdx); });
      }

      // Pinned scrub: the inner pin stays fixed while the tall track scrolls by.
      // Map how far we've scrolled into the track to the rotation range so each
      // card sweeps across the front exactly once.
      function rotationFromScroll() {
        var rect = root.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        visible = rect.bottom > 0 && rect.top < vh;
        var max = rect.height - vh;                            // scroll distance during the pin
        var p = max > 0 ? (-rect.top) / max : 0.5;
        p = Math.max(0, Math.min(1, p));
        return (p - 0.5) * (n - 1) * STEP;
      }
      function rot() { return reduce ? 0 : rotationFromScroll(); }

      // Browsers block sound until a user gesture; unmute the front card on the first.
      function unlock() {
        if (unlocked) return;
        unlocked = true; layout(rot());
        document.removeEventListener("pointerdown", unlock);
        document.removeEventListener("keydown", unlock);
        document.removeEventListener("touchstart", unlock);
      }
      document.addEventListener("pointerdown", unlock);
      document.addEventListener("keydown", unlock);
      document.addEventListener("touchstart", unlock, { passive: true });

      cards.forEach(function (card) {
        var sound = card.querySelector(".reel-sound");
        if (sound) sound.addEventListener("click", function (e) { e.stopPropagation(); unlocked = true; wantSound = !wantSound; layout(rot()); });
        card.addEventListener("click", function (e) {
          if (e.target.closest(".reel-sound")) return;
          if (!card.classList.contains("is-front")) return;   // only the front card toggles playback
          var v = card.querySelector("video"); if (!v) return;
          if (v.paused) { card.classList.remove("is-paused"); v.play().catch(function () {}); }
          else { card.classList.add("is-paused"); v.pause(); }
        });
      });

      if (reduce) {
        // Reduced-motion: no pinning/scrub — release the track and show a static fan.
        root.classList.add("orbit-static");
        root.style.height = "auto";
        layout(0);
      } else {
        var ticking = false;
        var update = function () { layout(rotationFromScroll()); ticking = false; };
        var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        update();   // place cards instantly, then enable transitions for scroll motion
      }
      requestAnimationFrame(function () { root.classList.add("orbit-ready"); });
    });
  }
  function wireForm() {
    var form = document.getElementById("auditForm");
    if (!form) return;
    var pendingQuote = null; // structured quote carried over from the calculator
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (f) {
        var g = f.closest(".field");
        if (!f.value.trim()) { if (g) g.classList.add("invalid"); ok = false; } else if (g) g.classList.remove("invalid");
      });
      if (!ok) return;
      var btn = form.querySelector(".btn-submit");
      function val(id) { var el = form.querySelector("#" + id); return el ? el.value : ""; }
      var payload = {
        fname: val("fname"), lname: val("lname"), email: val("email"), business: val("business"),
        service: val("service"), budget: val("budget"), message: val("message"), website: val("website"),
        quote: pendingQuote
      };
      var orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = "Sending…";
      fetch("api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function () {
          btn.innerHTML = "✦ Sent! We'll be in touch within 24 hours.";
          form.querySelectorAll("input, select, textarea").forEach(function (el) { el.disabled = true; });
        })
        .catch(function () {
          btn.disabled = false; btn.innerHTML = orig;
          var em = (window.ASTRO_CONTENT_EMAIL) || "us";
          alert("Sorry — your message couldn't be sent right now. Please email " + em + " directly, or try again.");
        });
    });
    // Attach a quote built on the calculator (carried via sessionStorage).
    try {
      var quoted = sessionStorage.getItem("astrosync-quote");
      sessionStorage.removeItem("astrosync-quote");
      var qd = quoted ? JSON.parse(quoted) : null;
      if (qd && qd.items && qd.items.length) {
        pendingQuote = qd;
        renderAttachedQuote(form, qd, function () { pendingQuote = null; });
        var svc = form.querySelector("#service");
        if (svc && !svc.value) {
          for (var oi = 0; oi < svc.options.length; oi++) {
            if (/growth|full/i.test(svc.options[oi].text)) { svc.value = svc.options[oi].value; break; }
          }
        }
      }
    } catch (e) {}
    form.addEventListener("input", function (e) { var g = e.target.closest(".field"); if (g) g.classList.remove("invalid"); });
  }

  // Render the "your quote" summary card at the top of the contact form.
  function renderAttachedQuote(form, qd, onRemove) {
    var cur = qd.currency || "$";
    function fmt(n) { return cur + Math.round(n).toLocaleString(); }
    var items = qd.items.map(function (it) {
      return '<li><span>' + esc(it.qty + " × " + it.name) + "</span><span>" + fmt(it.total) + "</span></li>";
    }).join("");
    var box = document.createElement("div");
    box.className = "quote-attached reveal";
    box.innerHTML =
      '<div class="qa-head"><b>✦ Your quote is attached</b>' +
        '<button type="button" class="qa-remove" aria-label="Remove attached quote">Remove</button></div>' +
      '<ul class="qa-items">' + items + "</ul>" +
      '<div class="qa-total"><span>Estimated total</span><b>' + fmt(qd.total) + "</b></div>" +
      '<p class="qa-note">This breakdown is sent with your enquiry — add anything else in the message below.</p>';
    box.querySelector(".qa-remove").addEventListener("click", function () {
      box.parentNode && box.parentNode.removeChild(box);
      if (onRemove) onRemove();
    });
    form.insertBefore(box, form.firstChild);
  }

  /* ---------- Quote calculator (Pricing page) ---------- */
  function wireCalculator(C) {
    var root = document.querySelector(".calc");
    var drop = document.getElementById("calcDrop");
    if (!root || !drop) return;
    var cfg = C.calculator || {};
    var svcs = cfg.services || [];
    var cur = cfg.currency || "$";
    var min = +root.getAttribute("data-min") || 0;
    var catalog = document.getElementById("calcCatalog");
    var noteEl = document.getElementById("calcNote");
    var totalEl = document.getElementById("calcTotal");
    var ctaEl = document.getElementById("calcCta");
    var suggestEl = document.getElementById("calcSuggest");
    var clearEl = document.getElementById("calcClear");

    var state = [];            // [{ svc: <index>, qty: <n> }]
    var drag = null;           // { type: "add"|"move", svc?, from? }

    function price(i) { return +(svcs[i] && svcs[i].price) || 0; }
    function fmt(n) { return cur + Math.round(n).toLocaleString(); }
    function total() { return state.reduce(function (t, x) { return t + price(x.svc) * x.qty; }, 0); }
    function findLine(i) { for (var k = 0; k < state.length; k++) if (state[k].svc === i) return k; return -1; }

    function add(i, qty) {
      var k = findLine(i);
      if (k >= 0) state[k].qty += (qty || 1);
      else state.push({ svc: i, qty: qty || 1 });
      render();
    }
    function setQty(k, q) {
      q = Math.round(q);
      if (!q || q < 1) state.splice(k, 1); else state[k].qty = q;
      render();
    }

    function recommended() {
      var st = [];
      svcs.forEach(function (s, i) {
        var q = Math.max(0, Math.round(+s.recommended || 0));
        if (q > 0) st.push({ svc: i, qty: q });
      });
      if (!st.length && svcs.length) st.push({ svc: 0, qty: 1 });
      // Top up (round-robin) until the bundle clears the minimum.
      var guard = 0, ptr = 0;
      function tot() { return st.reduce(function (t, x) { return t + price(x.svc) * x.qty; }, 0); }
      while (tot() < min && st.length && guard++ < 4000) { st[ptr % st.length].qty++; ptr++; }
      return st;
    }

    function summaryData() {
      return {
        currency: cur,
        total: total(),
        items: state.map(function (x) {
          var s = svcs[x.svc];
          return { name: s.name, unit: s.unit || "", price: price(x.svc), qty: x.qty, total: price(x.svc) * x.qty };
        })
      };
    }

    function lineHTML(x, k) {
      var s = svcs[x.svc];
      return '<div class="calc-line" data-k="' + k + '" data-svc="' + x.svc + '">' +
        '<span class="calc-handle" title="Drag to reorder" aria-hidden="true">⠿</span>' +
        '<div class="calc-line-info"><b>' + esc(s.name) + "</b><span>" + fmt(price(x.svc)) + " " + esc(s.unit || "") + "</span></div>" +
        '<div class="calc-qty">' +
          '<button type="button" data-act="dec" aria-label="Decrease">−</button>' +
          '<input type="number" min="1" value="' + x.qty + '" aria-label="' + esc(s.name) + ' quantity">' +
          '<button type="button" data-act="inc" aria-label="Increase">+</button>' +
        "</div>" +
        '<span class="calc-line-total">' + fmt(price(x.svc) * x.qty) + "</span>" +
        '<button type="button" class="calc-remove" data-act="rm" aria-label="Remove">✕</button>' +
      "</div>";
    }

    function render() {
      // catalog: mark which services are already in the quote
      if (catalog) {
        catalog.querySelectorAll(".calc-card").forEach(function (card) {
          card.classList.toggle("in-quote", findLine(+card.getAttribute("data-svc")) >= 0);
        });
      }
      if (!state.length) {
        drop.innerHTML = '<div class="calc-empty">' + esc(cfg.emptyNote || "Add a service to start your quote.") + "</div>";
      } else {
        drop.innerHTML = state.map(lineHTML).join("");
      }
      wireLineDnD();
      var t = total();
      totalEl.textContent = fmt(t);
      var below = t < min;
      if (!state.length) {
        noteEl.className = "calc-note";
        noteEl.textContent = cfg.emptyNote || "";
      } else if (below) {
        noteEl.className = "calc-note warn";
        noteEl.textContent = (cfg.minNote || ("Minimum is " + fmt(min) + ".")) + " (Add " + fmt(min - t) + " more.)";
      } else {
        noteEl.className = "calc-note ok";
        noteEl.textContent = "✓ You're above the " + fmt(min) + " minimum — ready when you are.";
      }
      ctaEl.disabled = below || !state.length;
      root.classList.toggle("is-below", below || !state.length);
    }

    /* drag a catalog card → drop into the quote */
    if (catalog) {
      catalog.addEventListener("dragstart", function (e) {
        var card = e.target.closest(".calc-card"); if (!card) return;
        drag = { type: "add", svc: +card.getAttribute("data-svc") };
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "copy";
        try { e.dataTransfer.setData("text/plain", "add"); } catch (x) {}
      });
      catalog.addEventListener("dragend", function () {
        catalog.querySelectorAll(".dragging").forEach(function (c) { c.classList.remove("dragging"); });
        drag = null;
      });
      catalog.addEventListener("click", function (e) {
        var b = e.target.closest(".calc-add"); if (!b) return;
        add(+b.getAttribute("data-svc"), 1);
      });
    }

    drop.addEventListener("dragover", function (e) {
      if (!drag) return;
      e.preventDefault();
      drop.classList.add("drag-over");
      e.dataTransfer.dropEffect = drag.type === "add" ? "copy" : "move";
    });
    drop.addEventListener("dragleave", function (e) {
      if (e.target === drop) drop.classList.remove("drag-over");
    });
    drop.addEventListener("drop", function (e) {
      drop.classList.remove("drag-over");
      if (drag && drag.type === "add") { e.preventDefault(); add(drag.svc, 1); }
      drag = null;
    });

    /* quote line controls (delegated) */
    drop.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]"); if (!b) return;
      var line = b.closest(".calc-line"); var k = +line.getAttribute("data-k");
      var act = b.getAttribute("data-act");
      if (act === "inc") setQty(k, state[k].qty + 1);
      else if (act === "dec") setQty(k, state[k].qty - 1);
      else if (act === "rm") setQty(k, 0);
    });
    drop.addEventListener("change", function (e) {
      if (e.target.tagName !== "INPUT") return;
      var line = e.target.closest(".calc-line"); var k = +line.getAttribute("data-k");
      setQty(k, parseInt(e.target.value, 10) || 0);
    });

    /* reorder quote lines by dragging the handle */
    function wireLineDnD() {
      var from = null;
      drop.querySelectorAll(".calc-line").forEach(function (line) {
        var k = +line.getAttribute("data-k");
        var handle = line.querySelector(".calc-handle");
        if (handle) {
          handle.setAttribute("draggable", "true");
          handle.addEventListener("dragstart", function (e) {
            from = k; line.classList.add("dragging"); e.dataTransfer.effectAllowed = "move";
            try { e.dataTransfer.setData("text/plain", "move"); } catch (x) {}
          });
          handle.addEventListener("dragend", function () { from = null; line.classList.remove("dragging"); });
        }
        line.addEventListener("dragover", function (e) { if (from === null) return; e.preventDefault(); line.classList.add("drop-target"); });
        line.addEventListener("dragleave", function () { line.classList.remove("drop-target"); });
        line.addEventListener("drop", function (e) {
          if (from === null) return;
          e.preventDefault(); e.stopPropagation(); line.classList.remove("drop-target");
          if (from !== k) { var it = state.splice(from, 1)[0]; state.splice(k, 0, it); render(); }
          from = null;
        });
      });
    }

    if (suggestEl) suggestEl.addEventListener("click", function () { state = recommended(); render(); });
    if (clearEl) clearEl.addEventListener("click", function () { state = []; render(); });
    if (ctaEl) ctaEl.addEventListener("click", function () {
      if (ctaEl.disabled) return;
      try { sessionStorage.setItem("astrosync-quote", JSON.stringify(summaryData())); } catch (e) {}
      window.location.href = cfg.ctaHref || "contact.html";
    });

    render();
  }

  function wireTransitions() {
    var internal = /\.html($|#|\?)/;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.indexOf("#") === 0 || !internal.test(href) || a.target === "_blank") return;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      e.preventDefault();
      document.body.classList.add("leaving");
      setTimeout(function () { window.location.href = href; }, 300);
    });
  }

  /* ---------- Logo intro (liquid-dot wordmark reveal) ---------- */
  // A brand splash that plays once per session: an accent dot pops in, stretches
  // into a pill that sweeps across to reveal the wordmark, then settles as a
  // trailing dot. Built from theme CSS variables, so it follows the admin palette.
  function playIntro(C) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var seen = false;
    try { seen = sessionStorage.getItem("astro_intro_done") === "1"; } catch (e) {}
    if (reduce || seen) return;
    try { sessionStorage.setItem("astro_intro_done", "1"); } catch (e) {}

    var name = (C.brand && C.brand.name) || "ASTROSYNC";
    var accent = (C.brand && C.brand.accent) || "";
    var head = name, tail = "";
    var at = accent ? name.indexOf(accent) : -1;
    if (at >= 0) { head = name.slice(0, at); tail = accent; }
    var textHtml = esc(head) + (tail ? '<span class="grad-text">' + esc(tail) + "</span>" : "");

    var ov = document.createElement("div");
    ov.className = "logo-intro";
    ov.setAttribute("role", "img");
    ov.setAttribute("aria-label", name);
    ov.innerHTML = '<div class="li-mark"><span class="li-text">' + textHtml + '</span><span class="li-sweep"></span></div>';
    document.body.appendChild(ov);
    document.body.classList.add("intro-active");

    var closed = false;
    function done() {
      if (closed) return; closed = true;
      ov.classList.add("li-out");
      setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        document.body.classList.remove("intro-active");
      }, 650);
    }
    var t = setTimeout(done, 2300);            // play through, then dissolve
    ov.addEventListener("click", function () { clearTimeout(t); done(); }); // tap to skip
  }

  /* ---------- Init ---------- */
  function init(C) {
    applyColors(C.theme);
    applyFonts(C.fonts);
    applyTypeScale(C.type);
    window.ASTRO_CONTENT_EMAIL = (C.footer && C.footer.email) || "us directly";
    var current = document.body.getAttribute("data-page") || "home";
    var refs = buildNav(C, current);
    renderPage(C, current);
    buildFooter(C);
    buildFloatingCta(C);
    buildCursor();
    wireNav(refs);
    wireReveals();
    wireCounters();
    wireFAQ();
    wireOrbit();
    wireForm();
    wireCalculator(C);
    wireTransitions();
    playIntro(C);
    requestAnimationFrame(function () { document.body.classList.add("loaded"); });
  }

  function boot() { loadContent().then(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
