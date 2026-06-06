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

  /* ---------- Brand colors (admin editable) ---------- */
  function applyColors(theme) {
    if (!theme) return;
    var root = document.documentElement;
    if (theme.teal) root.style.setProperty("--brand-teal", theme.teal);
    if (theme.deep) root.style.setProperty("--brand-deep", theme.deep);
    if (theme.navy) root.style.setProperty("--brand-navy", theme.navy);
    if (theme.mint) root.style.setProperty("--brand-mint", theme.mint);
  }

  /* ---------- Nav links ---------- */
  var LINKS = [
    { page: "home", href: "index.html", label: "Home" },
    { page: "services", href: "services.html", label: "Services" },
    { page: "work", href: "work.html", label: "Work" },
    { page: "pricing", href: "pricing.html", label: "Pricing" },
    { page: "about", href: "about.html", label: "About" }
  ];

  function brandHTML(C) {
    var name = (C.brand && C.brand.name) || "ASTROSYNC";
    var accent = (C.brand && C.brand.accent) || "";
    var html = esc(name);
    if (accent && name.indexOf(accent) >= 0) {
      html = esc(name.replace(accent, "")) + '<span class="grad-text">' + esc(accent) + "</span>";
    }
    return '<img class="brand-mark" src="' + MARK + '" alt="">' +
           '<span class="brand-name">' + html + "</span>";
  }

  function buildNav(C, current) {
    var nav = document.createElement("nav");
    nav.className = "site-nav"; nav.setAttribute("aria-label", "Primary");
    var links = LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.page === current ? ' class="active"' : "") + ">" + l.label + "</a>";
    }).join("");
    nav.innerHTML =
      '<div class="container nav-inner">' +
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
          '<li><a href="contact.html">Contact</a></li>' +
        "</ul></div>" +
        '<div class="footer-col"><h4>Locations</h4>' + locs +
          '<p style="margin-top:1rem">' + esc(get(C, "footer.email")) + "<br>" + esc(get(C, "footer.phone")) + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="footer-bottom"><p>' + esc(get(C, "footer.copyright")) +
        '</p><div class="footer-links"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></div></div>' +
      "</div>";
    document.body.appendChild(f);
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
      return items.map(function (s, i) {
        var num = ("0" + (i + 1)).slice(-2);
        var tag = (opt.variant !== "teaser" && s.tag) ? '<span class="tag">' + esc(s.tag) + "</span>" : "";
        var enter = opt.variant === "teaser" ? "ENTER" : "GET STARTED";
        return '<a class="card svc-card reveal' + (i % 3 ? " d" + (i % 3) : "") + '" href="' +
               (opt.variant === "teaser" ? "services.html" : "contact.html") + '">' + tag +
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
      return items.map(function (t, i) {
        return '<div class="card quote-card reveal' + (i % 3 ? " d" + (i % 3) : "") + '"><div class="stars">★★★★★</div>' +
               "<blockquote>" + esc(t.quote) + '</blockquote><div class="who"><div class="avatar">' + esc(t.initials) +
               '</div><div><div class="name">' + esc(t.name) + '</div><div class="role">' + esc(t.role) + "</div></div></div></div>";
      }).join("");
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
  function wireForm() {
    var form = document.getElementById("auditForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (f) {
        var g = f.closest(".field");
        if (!f.value.trim()) { if (g) g.classList.add("invalid"); ok = false; } else if (g) g.classList.remove("invalid");
      });
      if (!ok) return;
      var btn = form.querySelector(".btn-submit");
      btn.innerHTML = "✦ Sent! We'll be in touch within 24 hours.";
      btn.disabled = true;
      form.querySelectorAll("input, select, textarea").forEach(function (el) { el.disabled = true; });
    });
    form.addEventListener("input", function (e) { var g = e.target.closest(".field"); if (g) g.classList.remove("invalid"); });
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

  /* ---------- Init ---------- */
  function init(C) {
    applyColors(C.theme);
    var current = document.body.getAttribute("data-page") || "home";
    var refs = buildNav(C, current);
    renderAll(C);
    buildFooter(C);
    wireNav(refs);
    wireReveals();
    wireCounters();
    wireFAQ();
    wireForm();
    wireTransitions();
    requestAnimationFrame(function () { document.body.classList.add("loaded"); });
  }

  function boot() { loadContent().then(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
