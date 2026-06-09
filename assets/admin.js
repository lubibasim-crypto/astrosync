/* ============================================================
   ASTROSYNC — Admin panel logic
   Schema-driven editor over the same content model the site uses.
   Saves to the Python backend (PUT /api/content); also supports
   JSON export/import. Auth token kept in sessionStorage.
   ============================================================ */
(function () {
  "use strict";

  var TOKEN_KEY = "astrosync-admin-token";
  var DEFAULTS = window.ASTRO_DEFAULT_CONTENT || {};
  var data = clone(DEFAULTS);

  // Bundled, self-hosted fonts available to choose from (must match @font-face names in fonts.css)
  var ALL_FONTS = ["Space Grotesk", "Syne", "Sora", "Fraunces", "Manrope", "Plus Jakarta Sans", "Inter", "DM Sans"];

  // Pages that have an editable layout / CTA band.
  var PAGES = [["home", "Home"], ["services", "Services"], ["about", "About"], ["pricing", "Pricing"], ["work", "Work"], ["resources", "Resources"], ["contact", "Contact"]];
  var CTA_PAGES = PAGES.filter(function (p) { return p[0] !== "contact"; });
  var ctaFields = [];
  CTA_PAGES.forEach(function (pg) {
    ctaFields.push({ p: "ctas." + pg[0] + ".title", l: pg[1] + " — title", t: "area" });
    ctaFields.push({ p: "ctas." + pg[0] + ".text", l: pg[1] + " — text", t: "area" });
    ctaFields.push({ p: "ctas." + pg[0] + ".button", l: pg[1] + " — button label" });
    ctaFields.push({ p: "ctas." + pg[0] + ".href", l: pg[1] + " — button link" });
  });

  /* ---------- schema ---------- */
  var SCHEMA = [
    { id: "brand", title: "Brand", intro: "Your agency name as shown in the nav and footer.",
      fields: [
        { p: "brand.name", l: "Brand name" },
        { p: "brand.accent", l: "Accent text (the part of the name shown in teal)" }
      ] },

    { id: "theme", title: "Brand Colors", intro: "These drive the whole site palette. Changes apply live across every page.",
      colors: [
        { p: "theme.teal", l: "Teal (primary)" },
        { p: "theme.deep", l: "Deep Teal" },
        { p: "theme.navy", l: "Navy (dark base)" },
        { p: "theme.mint", l: "Mint (light accent)" }
      ] },

    { id: "layout", title: "Layout", custom: "layout",
      intro: "Drag to reorder sections, hide them with the eye, or remove them. Add new sections from the menu at the bottom. Pick a page with the tabs." },

    { id: "submissions", title: "Submissions", custom: "submissions",
      intro: "Enquiries sent through your live contact form. Newest first. Use Export CSV to download them all." },

    { id: "logo", title: "Logo", intro: "Upload your own logo image or use the bundled mark. Control where it sits in the nav and how big it is.",
      fields: [
        { p: "logo.type", l: "Logo style", t: "select", opts: ["mark", "image"], optLabels: { mark: "Bundled mark + name", image: "Uploaded image" } },
        { p: "logo.src", l: "Logo image (PNG, SVG, JPG — max 3MB)", t: "upload" },
        { p: "logo.height", l: "Logo height", t: "range", min: 20, max: 80, step: 1, unit: "px" },
        { p: "logo.position", l: "Placement in nav bar", t: "select", opts: ["left", "center", "right"] },
        { p: "logo.showName", l: "Show brand name text next to the logo", t: "bool" }
      ] },

    { id: "typography", title: "Typography", intro: "Choose the fonts and overall sizing. All fonts are bundled and work offline — changes apply across the whole site after you Save.",
      fields: [
        { p: "fonts.display", l: "Display font (headings & logo)", t: "select", opts: ALL_FONTS },
        { p: "fonts.body", l: "Body font (paragraphs & UI)", t: "select", opts: ALL_FONTS },
        { p: "type.baseScale", l: "Overall text size", t: "range", min: 0.85, max: 1.3, step: 0.01, unit: "×" },
        { p: "type.headingScale", l: "Heading size", t: "range", min: 0.8, max: 1.5, step: 0.01, unit: "×" }
      ] },

    { id: "hero", title: "Hero", intro: "The homepage hero. Use *word* for a teal highlight and a new line for a line break in the title.",
      fields: [
        { p: "hero.badge", l: "Badge text" },
        { p: "hero.title", l: "Title", t: "area" },
        { p: "hero.lead", l: "Lead paragraph", t: "area" },
        { p: "hero.ctaPrimary.label", l: "Primary button — label" },
        { p: "hero.ctaPrimary.href", l: "Primary button — link" },
        { p: "hero.ctaSecondary.label", l: "Secondary button — label" },
        { p: "hero.ctaSecondary.href", l: "Secondary button — link" }
      ],
      lists: [
        { p: "hero.stats", l: "Hero stats", item: [{ k: "value", l: "Value (e.g. 3×, 60%)" }, { k: "label", l: "Label" }] },
        { p: "hero.sphere", l: "Sphere icons", simple: true, intro: "Allowed: instagram, tiktok, facebook, youtube, linkedin, x" }
      ] },

    { id: "ticker", title: "Ticker", intro: "The scrolling marquee under the hero.",
      lists: [{ p: "ticker", l: "Ticker items", simple: true }] },

    { id: "why", title: "Why Us", fields: [
        { p: "why.eyebrow", l: "Eyebrow" }, { p: "why.title", l: "Title", t: "area" }, { p: "why.sub", l: "Subtitle", t: "area" }
      ], lists: [{ p: "why.cards", l: "Cards", item: [{ k: "icon", l: "Icon (emoji)" }, { k: "title", l: "Title" }, { k: "text", l: "Text", t: "area" }] }] },

    { id: "services", title: "Services", fields: [
        { p: "services.eyebrow", l: "Eyebrow" }, { p: "services.title", l: "Title", t: "area" }, { p: "services.sub", l: "Subtitle", t: "area" }
      ], lists: [{ p: "services.items", l: "Service cards", item: [{ k: "tag", l: "Tag" }, { k: "title", l: "Title" }, { k: "text", l: "Text", t: "area" }] }] },

    { id: "process", title: "Process", fields: [
        { p: "process.eyebrow", l: "Eyebrow" }, { p: "process.title", l: "Title", t: "area" }, { p: "process.sub", l: "Subtitle", t: "area" }
      ], lists: [{ p: "process.steps", l: "Steps", item: [{ k: "title", l: "Title" }, { k: "text", l: "Text", t: "area" }] }] },

    { id: "results", title: "Results", fields: [
        { p: "results.eyebrow", l: "Eyebrow" }, { p: "results.title", l: "Title", t: "area" }, { p: "results.sub", l: "Subtitle", t: "area" }
      ], lists: [{ p: "results.items", l: "Case-study stats", item: [{ k: "ctx", l: "Client / context" }, { k: "stat", l: "Headline stat (e.g. +312%)" }, { k: "text", l: "Text", t: "area" }] }] },

    { id: "pricing", title: "Pricing", fields: [
        { p: "pricing.eyebrow", l: "Eyebrow" }, { p: "pricing.title", l: "Title", t: "area" }, { p: "pricing.sub", l: "Subtitle", t: "area" }, { p: "pricing.note", l: "Footnote", t: "area" }
      ], lists: [{ p: "pricing.plans", l: "Plans", item: [
          { k: "name", l: "Plan name" }, { k: "price", l: "Price (e.g. $999)" }, { k: "per", l: "Per / caption" },
          { k: "featured", l: "Highlighted plan?", t: "bool" }, { k: "popular", l: "Badge text (optional)" },
          { k: "features", l: "Features (one per line)", t: "lines" }
        ] }] },

    { id: "calculator", title: "Quote Calculator",
      intro: "The drag-and-drop quote builder on the Pricing page. Set the copy, the minimum quote, and your service menu. Prices are per-unit; the 'recommended' quantities drive the Suggested Starter Package, which the calculator always tops up to at least your minimum. Drag the ⠿ handle to reorder services.",
      fields: [
        { p: "calculator.eyebrow", l: "Eyebrow" },
        { p: "calculator.title", l: "Title", t: "area" },
        { p: "calculator.sub", l: "Subtitle", t: "area" },
        { p: "calculator.currency", l: "Currency symbol (e.g. $)" },
        { p: "calculator.minQuote", l: "Minimum quote total", t: "range", min: 0, max: 2000, step: 25, unit: "" },
        { p: "calculator.minNote", l: "Below-minimum note", t: "area" },
        { p: "calculator.emptyNote", l: "Empty-quote hint", t: "area" },
        { p: "calculator.suggestLabel", l: "Suggest-package button label" },
        { p: "calculator.ctaLabel", l: "Request button — label" },
        { p: "calculator.ctaHref", l: "Request button — link" }
      ],
      lists: [{ p: "calculator.services", l: "Calculator services", item: [
          { k: "icon", l: "Icon (emoji)" },
          { k: "name", l: "Service name" },
          { k: "desc", l: "Short description", t: "area" },
          { k: "price", l: "Price (number only, e.g. 60)" },
          { k: "unit", l: "Unit label (e.g. per reel)" },
          { k: "recommended", l: "Recommended qty (for starter package)" }
        ] }] },

    { id: "testimonials", title: "Testimonials", fields: [
        { p: "testimonials.eyebrow", l: "Eyebrow" }, { p: "testimonials.title", l: "Title", t: "area" }
      ], lists: [{ p: "testimonials.items", l: "Quotes", item: [
          { k: "quote", l: "Quote", t: "area" }, { k: "initials", l: "Initials" }, { k: "name", l: "Name" }, { k: "role", l: "Role / company" },
          { k: "media", l: "Reel/photo example (image upload)", t: "upload" },
          { k: "video", l: "…or a video URL (YouTube / Vimeo / MP4) — used instead of the image" },
          { k: "caption", l: "Explain this example", t: "area" }
        ] }] },

    { id: "faq", title: "FAQ", fields: [
        { p: "faq.eyebrow", l: "Eyebrow" }, { p: "faq.title", l: "Title", t: "area" }
      ], lists: [{ p: "faq.items", l: "Questions", item: [{ k: "q", l: "Question" }, { k: "a", l: "Answer", t: "area" }] }] },

    { id: "about", title: "About", fields: [
        { p: "about.eyebrow", l: "Eyebrow" }, { p: "about.title", l: "Title", t: "area" }, { p: "about.lead", l: "Lead", t: "area" },
        { p: "about.teamEyebrow", l: "Team eyebrow" }, { p: "about.teamTitle", l: "Team title", t: "area" }, { p: "about.teamSub", l: "Team subtitle", t: "area" },
        { p: "about.valuesEyebrow", l: "Values eyebrow" }, { p: "about.valuesTitle", l: "Values title", t: "area" }
      ], lists: [
        { p: "about.teams", l: "Teams", item: [{ k: "flag", l: "Flag (emoji)" }, { k: "title", l: "Title" }, { k: "text", l: "Text", t: "area" }] },
        { p: "about.values", l: "Values", item: [{ k: "title", l: "Title" }, { k: "text", l: "Text", t: "area" }] }
      ] },

    { id: "contact", title: "Contact", fields: [
        { p: "contact.eyebrow", l: "Eyebrow" }, { p: "contact.title", l: "Title", t: "area" }, { p: "contact.lead", l: "Lead", t: "area" }
      ], lists: [{ p: "contact.infos", l: "Contact info rows", item: [{ k: "icon", l: "Icon (emoji)" }, { k: "title", l: "Title" }, { k: "sub", l: "Subtitle" }] }] },

    { id: "ctas", title: "CTA Bands", intro: "The call-to-action band near the bottom of each page. Use *word* for a teal highlight and a new line for a line break.",
      fields: ctaFields },

    { id: "floatingCta", title: "Floating Button",
      intro: "The floating “build your package” button shown on every page — a constant nudge into your quote funnel.",
      fields: [
        { p: "floatingCta.enabled", l: "Show the floating button", t: "bool" },
        { p: "floatingCta.label", l: "Button label" },
        { p: "floatingCta.href", l: "Button link (e.g. pricing.html)" }
      ] },

    { id: "blog", title: "Resources", custom: "blog",
      intro: "Your blog / resources. Add articles with a Medium-style body — text, headings, images, videos and quotes. Each article ends with a funnel CTA that turns readers into leads. Drag the ⠿ handle to reorder articles and blocks." },

    { id: "footer", title: "Footer", fields: [
        { p: "footer.tagline", l: "Tagline", t: "area" }, { p: "footer.email", l: "Email" }, { p: "footer.phone", l: "Phone" },
        { p: "footer.mapLabel", l: "Map link label" }, { p: "footer.mapUrl", l: "Map link URL (Google Maps, etc.)" },
        { p: "footer.copyright", l: "Copyright line" }
      ], lists: [
        { p: "footer.locations", l: "Locations", item: [{ k: "label", l: "Label" }, { k: "sub", l: "Subtitle" }] },
        { p: "socials", l: "Social links", item: [{ k: "network", l: "Network (instagram/facebook/tiktok/youtube/linkedin/x)" }, { k: "href", l: "URL" }] }
      ] }
  ];

  /* ---------- utils ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function $(sel) { return document.querySelector(sel); }
  function getPath(o, p) { return p.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) {
    var keys = p.split("."), last = keys.pop();
    var t = keys.reduce(function (a, k) { if (a[k] == null || typeof a[k] !== "object") a[k] = {}; return a[k]; }, o);
    t[last] = v;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(msg, isErr) {
    var t = $("#toast"); t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
    setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------- API ---------- */
  function api(method, path, body, auth) {
    var opt = { method: method, headers: {} };
    if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    if (auth) { var tk = sessionStorage.getItem(TOKEN_KEY); if (tk) opt.headers["Authorization"] = "Bearer " + tk; }
    return fetch(path, opt);
  }
  // Upload an image (data URL) to the backend; resolves to the stored path.
  function uploadImage(name, dataUrl) {
    return new Promise(function (resolve, reject) {
      api("POST", "api/upload", { name: name, dataUrl: dataUrl }, true).then(function (r) {
        if (r.status === 401) { reject("Session expired — log in again."); return; }
        return r.json().then(function (j) {
          if (r.ok && j.src) resolve(j.src); else reject(j.error || "Upload failed.");
        });
      }).catch(function () { reject(null); });
    });
  }

  /* ---------- drag-and-drop reordering (handle-based) ---------- */
  function enableDnD(container, arr, refresh) {
    var from = null;
    var rows = container.querySelectorAll(":scope > [data-di]");
    rows.forEach(function (row) {
      var idx = +row.getAttribute("data-di");
      var handle = row.querySelector(".drag-handle");
      if (handle) {
        handle.setAttribute("draggable", "true");
        handle.addEventListener("dragstart", function (e) { from = idx; row.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", ""); } catch (x) {} });
        handle.addEventListener("dragend", function () { from = null; row.classList.remove("dragging"); });
      }
      row.addEventListener("dragover", function (e) { if (from === null) return; e.preventDefault(); row.classList.add("drop-target"); });
      row.addEventListener("dragleave", function () { row.classList.remove("drop-target"); });
      row.addEventListener("drop", function (e) {
        if (from === null) return;
        e.preventDefault(); row.classList.remove("drop-target");
        var to = idx;
        if (from !== to) { var it = arr.splice(from, 1)[0]; arr.splice(to, 0, it); refresh(); }
      });
    });
  }

  /* ---------- field builders ---------- */
  function textField(label, value, onInput, area) {
    var f = el("div", "field");
    f.appendChild(el("label", null, esc(label)));
    var input = area ? el("textarea") : el("input");
    if (!area) input.type = "text";
    input.value = value == null ? "" : value;
    input.addEventListener("input", function () { onInput(input.value); });
    f.appendChild(input);
    return f;
  }
  function selectField(label, value, opts, onInput, labels) {
    var f = el("div", "field");
    f.appendChild(el("label", null, esc(label)));
    var sel = el("select");
    opts.forEach(function (o) { var op = el("option"); op.value = o; op.textContent = (labels && labels[o]) || o; if (o === value) op.selected = true; sel.appendChild(op); });
    sel.addEventListener("change", function () { onInput(sel.value); });
    f.appendChild(sel);
    return f;
  }
  function rangeField(label, value, min, max, step, unit, onInput) {
    var f = el("div", "field");
    var lab = el("label", null, esc(label));
    var badge = el("span", "range-val");
    function fmt(v) { return (step < 1 ? (+v).toFixed(2) : v) + (unit || ""); }
    f.appendChild(lab);
    var row = el("div", "range-row");
    var input = el("input"); input.type = "range"; input.min = min; input.max = max; input.step = step;
    input.value = (value == null ? min : value);
    badge.textContent = fmt(input.value);
    input.addEventListener("input", function () { badge.textContent = fmt(input.value); onInput(parseFloat(input.value)); });
    row.appendChild(input); row.appendChild(badge);
    f.appendChild(row);
    return f;
  }
  function uploadField(label, value, onUploaded) {
    var f = el("div", "field");
    f.appendChild(el("label", null, esc(label)));
    var box = el("div", "upload-box");
    var preview = el("div", "upload-preview");
    function paint() {
      preview.innerHTML = value ? '<img src="' + esc(value) + '" alt="logo preview">' : '<span class="upload-empty">No image uploaded</span>';
    }
    paint();
    var controls = el("div", "upload-controls");
    var pick = el("button", "btn-mini", "Choose image…"); pick.type = "button";
    var clear = el("button", "btn-mini ghost", "Remove"); clear.type = "button";
    var file = el("input"); file.type = "file"; file.accept = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif"; file.className = "hidden";
    pick.addEventListener("click", function () { file.click(); });
    clear.addEventListener("click", function () { value = ""; onUploaded(""); paint(); });
    file.addEventListener("change", function () {
      var fl = file.files[0]; if (!fl) return;
      if (fl.size > 3 * 1024 * 1024) { toast("Image too large (max 3MB).", true); file.value = ""; return; }
      var fr = new FileReader();
      fr.onload = function () {
        uploadImage(fl.name, fr.result).then(function (src) {
          value = src; onUploaded(src); paint(); toast("Logo uploaded. Save to apply.");
        }).catch(function (msg) {
          // Offline / no server: fall back to embedding the data URL directly.
          value = fr.result; onUploaded(fr.result); paint();
          toast(msg || "No server — embedded image locally. Use Export to keep it.", true);
        });
        file.value = "";
      };
      fr.readAsDataURL(fl);
    });
    controls.appendChild(pick); controls.appendChild(clear);
    box.appendChild(preview); box.appendChild(controls); box.appendChild(file);
    f.appendChild(box);
    return f;
  }
  // Live typography preview (rendered inside the Typography panel)
  function applyPreview() {
    var h = document.getElementById("fp-h"), b = document.getElementById("fp-b");
    if (h) h.style.fontFamily = "'" + (getPath(data, "fonts.display") || "Syne") + "', sans-serif";
    if (b) b.style.fontFamily = "'" + (getPath(data, "fonts.body") || "DM Sans") + "', sans-serif";
  }
  function boolField(label, value, onInput) {
    var f = el("div", "field");
    var wrap = el("label", "checkbox");
    var cb = el("input"); cb.type = "checkbox"; cb.checked = !!value;
    cb.addEventListener("change", function () { onInput(cb.checked); });
    wrap.appendChild(cb); wrap.appendChild(document.createTextNode(" " + label));
    f.appendChild(wrap);
    return f;
  }
  function linesField(label, arr, onInput) {
    return textField(label, (arr || []).join("\n"), function (v) {
      onInput(v.split("\n").map(function (x) { return x.trim(); }).filter(Boolean));
    }, true);
  }

  function colorBlock(c) {
    var wrap = el("div", "color-field");
    wrap.appendChild(el("label", null, esc(c.l)));
    var row = el("div", "row");
    var swatch = el("input"); swatch.type = "color"; swatch.value = normHex(getPath(data, c.p));
    var hex = el("input"); hex.type = "text"; hex.value = getPath(data, c.p) || "";
    swatch.addEventListener("input", function () { hex.value = swatch.value; setPath(data, c.p, swatch.value); });
    hex.addEventListener("input", function () { setPath(data, c.p, hex.value); if (/^#([0-9a-f]{3}){1,2}$/i.test(hex.value)) swatch.value = hex.value; });
    row.appendChild(swatch); row.appendChild(hex); wrap.appendChild(row);
    return wrap;
  }
  function normHex(v) { return (/^#([0-9a-f]{3}){1,2}$/i.test(v || "")) ? v : "#000000"; }

  /* ---------- list editor ---------- */
  function listEditor(spec) {
    var container = el("div");
    container.appendChild(el("div", "section-label", esc(spec.l)));
    if (spec.intro) container.appendChild(el("p", "panel-intro", esc(spec.intro)));
    var listEl = el("div", "list");
    container.appendChild(listEl);

    function arr() { var a = getPath(data, spec.p); if (!Array.isArray(a)) { a = []; setPath(data, spec.p, a); } return a; }

    function renderList() {
      listEl.innerHTML = "";
      var a = arr();
      a.forEach(function (item, idx) {
        listEl.appendChild(spec.simple ? simpleRow(a, idx, renderList) : itemCard(spec, a, idx, renderList));
      });
      var add = el("button", "add-btn", "+ Add " + spec.l.replace(/s$/, ""));
      add.type = "button";
      add.addEventListener("click", function () {
        if (spec.simple) a.push("");
        else { var o = {}; spec.item.forEach(function (it) { o[it.k] = it.t === "lines" ? [] : it.t === "bool" ? false : ""; }); a.push(o); }
        renderList();
      });
      listEl.appendChild(add);
      enableDnD(listEl, a, renderList);
    }
    renderList();
    return container;
  }

  function simpleRow(a, idx, refresh) {
    var row = el("div", "simple-row");
    row.setAttribute("data-di", idx);
    row.appendChild(el("span", "drag-handle", "⠿"));
    var input = el("input"); input.type = "text"; input.value = a[idx];
    input.addEventListener("input", function () { a[idx] = input.value; });
    var del = el("button", "icon-btn del", "✕"); del.type = "button";
    del.addEventListener("click", function () { a.splice(idx, 1); refresh(); });
    row.appendChild(input); row.appendChild(del);
    return row;
  }

  function itemCard(spec, a, idx, refresh) {
    var card = el("div", "list-item");
    card.setAttribute("data-di", idx);
    var head = el("div", "list-item-head");
    head.appendChild(el("span", "drag-handle", "⠿"));
    head.appendChild(el("span", "tag", "#" + (idx + 1)));
    var up = el("button", "icon-btn", "↑"); up.type = "button";
    var down = el("button", "icon-btn", "↓"); down.type = "button";
    var del = el("button", "icon-btn del", "✕"); del.type = "button";
    up.addEventListener("click", function () { if (idx > 0) { var t = a[idx - 1]; a[idx - 1] = a[idx]; a[idx] = t; refresh(); } });
    down.addEventListener("click", function () { if (idx < a.length - 1) { var t = a[idx + 1]; a[idx + 1] = a[idx]; a[idx] = t; refresh(); } });
    del.addEventListener("click", function () { a.splice(idx, 1); refresh(); });
    head.appendChild(up); head.appendChild(down); head.appendChild(del);
    card.appendChild(head);

    spec.item.forEach(function (it) {
      var cur = a[idx][it.k];
      if (it.t === "bool") card.appendChild(boolField(it.l, cur, function (v) { a[idx][it.k] = v; }));
      else if (it.t === "lines") card.appendChild(linesField(it.l, cur, function (v) { a[idx][it.k] = v; }));
      else if (it.t === "upload") card.appendChild(uploadField(it.l, cur, function (v) { a[idx][it.k] = v; }));
      else if (it.t === "select") card.appendChild(selectField(it.l, cur, it.opts, function (v) { a[idx][it.k] = v; }, it.optLabels));
      else card.appendChild(textField(it.l, cur, function (v) { a[idx][it.k] = v; }, it.t === "area"));
    });
    return card;
  }

  /* ---------- layout (section) editor ---------- */
  function ensureSections() {
    if (!data.sections || typeof data.sections !== "object") data.sections = clone(DEFAULTS.sections || {});
    PAGES.forEach(function (pg) {
      if (!Array.isArray(data.sections[pg[0]])) data.sections[pg[0]] = clone((DEFAULTS.sections && DEFAULTS.sections[pg[0]]) || []);
    });
  }
  function typeLabel(t) {
    var f = (window.ASTRO_SECTION_TYPES || []).filter(function (x) { return x.type === t; })[0];
    return f ? f.label : t;
  }
  var layoutPage = "home";
  function layoutEditor() {
    ensureSections();
    var wrap = el("div", "layout-editor");
    var tabs = el("div", "page-tabs");
    PAGES.forEach(function (pg) {
      var b = el("button", "page-tab" + (pg[0] === layoutPage ? " active" : ""), esc(pg[1])); b.type = "button";
      b.addEventListener("click", function () { layoutPage = pg[0]; redraw(); });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    var listEl = el("div", "layout-list"); wrap.appendChild(listEl);
    var addBar = el("div", "layout-add"); wrap.appendChild(addBar);

    function arr() { ensureSections(); return data.sections[layoutPage]; }
    function redraw() {
      tabs.querySelectorAll(".page-tab").forEach(function (b, i) { b.classList.toggle("active", PAGES[i][0] === layoutPage); });
      renderList();
    }
    function renderList() {
      var a = arr(); listEl.innerHTML = "";
      a.forEach(function (sec, idx) {
        var row = el("div", "layout-row" + (sec.hidden ? " is-hidden" : ""));
        row.setAttribute("data-di", idx);
        row.appendChild(el("span", "drag-handle", "⠿"));
        row.appendChild(el("span", "layout-name", esc(typeLabel(sec.type))));
        row.appendChild(el("span", "layout-spacer"));
        var eye = el("button", "icon-btn", sec.hidden ? "🚫" : "👁"); eye.type = "button";
        eye.title = sec.hidden ? "Hidden — click to show" : "Visible — click to hide";
        eye.addEventListener("click", function () { sec.hidden = !sec.hidden; renderList(); });
        var del = el("button", "icon-btn del", "✕"); del.type = "button"; del.title = "Remove section";
        del.addEventListener("click", function () { a.splice(idx, 1); renderList(); });
        row.appendChild(eye); row.appendChild(del);
        listEl.appendChild(row);
      });
      enableDnD(listEl, a, renderList);
      renderAddBar();
    }
    function renderAddBar() {
      addBar.innerHTML = "";
      var sel = el("select", "layout-add-select");
      (window.ASTRO_SECTION_TYPES || []).forEach(function (st) {
        var op = el("option"); op.value = st.type; op.textContent = st.label; sel.appendChild(op);
      });
      var add = el("button", "add-btn", "+ Add section"); add.type = "button";
      add.addEventListener("click", function () {
        var t = sel.value;
        arr().push({ id: t + "-" + Date.now(), type: t, opt: {} });
        renderList();
      });
      addBar.appendChild(sel); addBar.appendChild(add);
    }
    redraw();
    return wrap;
  }

  /* ---------- submissions inbox ---------- */
  function submissionsEditor() {
    var wrap = el("div", "subs-editor");
    var bar = el("div", "subs-bar");
    var refresh = el("button", "btn-mini", "↻ Refresh"); refresh.type = "button";
    var exportBtn = el("button", "btn-mini", "Export CSV"); exportBtn.type = "button";
    var count = el("span", "subs-count", "");
    bar.appendChild(refresh); bar.appendChild(exportBtn); bar.appendChild(count);
    wrap.appendChild(bar);
    var listEl = el("div", "subs-list"); wrap.appendChild(listEl);
    var current = [];

    function fmtDate(ts) { try { return new Date(ts * 1000).toLocaleString(); } catch (e) { return ""; } }
    function metaRow(card, label, v) { if (!v) return; card.appendChild(el("div", "sub-meta", "<b>" + esc(label) + ":</b> " + esc(v))); }
    function money(cur, n) { return esc(cur) + Math.round(+n || 0).toLocaleString(); }
    function quoteBlock(q) {
      var cur = q.currency || "$";
      var rows = q.items.map(function (it) {
        return '<li><span>' + esc(it.qty + " × " + it.name) + "</span><span>" + money(cur, it.total) + "</span></li>";
      }).join("");
      return el("div", "sub-quote",
        '<div class="sub-quote-h">Requested quote</div><ul class="sub-quote-list">' + rows +
        '</ul><div class="sub-quote-total"><span>Total</span><b>' + money(cur, q.total) + "</b></div>");
    }
    function quoteSummary(q) {
      if (!q || !q.items || !q.items.length) return "";
      var cur = q.currency || "$";
      return q.items.map(function (it) { return it.qty + "x " + it.name; }).join("; ") +
        " | Total " + cur + Math.round(+q.total || 0);
    }
    function row(s) {
      var card = el("div", "sub-card");
      var head = el("div", "sub-head");
      var nm = ((s.fname || "") + " " + (s.lname || "")).trim() || "(no name)";
      head.appendChild(el("span", "sub-name", esc(nm)));
      head.appendChild(el("span", "sub-date", esc(fmtDate(s.ts))));
      var del = el("button", "icon-btn del", "✕"); del.type = "button"; del.title = "Delete submission";
      del.addEventListener("click", function () { if (confirm("Delete this submission permanently?")) doDelete(s.id); });
      head.appendChild(del);
      card.appendChild(head);
      metaRow(card, "Email", s.email); metaRow(card, "Business", s.business);
      metaRow(card, "Service", s.service); metaRow(card, "Budget", s.budget);
      if (s.message) { var m = el("div", "sub-msg"); m.textContent = s.message; card.appendChild(m); }
      if (s.quote && s.quote.items && s.quote.items.length) card.appendChild(quoteBlock(s.quote));
      if (s.email) { var a = el("a", "sub-reply"); a.href = "mailto:" + encodeURIComponent(s.email); a.textContent = "✉ Reply by email"; card.appendChild(a); }
      return card;
    }
    function render() {
      listEl.innerHTML = "";
      if (!current.length) { listEl.appendChild(el("p", "panel-intro", "No submissions yet.")); count.textContent = ""; return; }
      count.textContent = current.length + " submission" + (current.length > 1 ? "s" : "");
      current.slice().reverse().forEach(function (s) { listEl.appendChild(row(s)); });
    }
    function load() {
      listEl.innerHTML = ""; listEl.appendChild(el("p", "panel-intro", "Loading…"));
      api("GET", "api/submissions", null, true).then(function (r) {
        if (r.status === 401) { requireLogin(); return null; }
        return r.ok ? r.json() : null;
      }).then(function (j) { current = (j && j.submissions) || []; render(); })
        .catch(function () { listEl.innerHTML = ""; listEl.appendChild(el("p", "panel-intro", "Couldn't load submissions (is the server running?).")); });
    }
    function doDelete(id) {
      api("POST", "api/submission-delete", { id: id }, true).then(function (r) {
        if (r.ok) { current = current.filter(function (s) { return s.id !== id; }); render(); toast("Deleted."); }
        else toast("Delete failed.", true);
      }).catch(function () { toast("Delete failed.", true); });
    }
    function exportCsv() {
      if (!current.length) { toast("Nothing to export.", true); return; }
      var cols = ["fname", "lname", "email", "business", "service", "budget", "message"];
      function q(v) { v = v == null ? "" : String(v); return '"' + v.replace(/"/g, '""') + '"'; }
      var header = ["date", "first name", "last name", "email", "business", "service", "budget", "message", "quote"].map(q).join(",");
      var rows = current.slice().reverse().map(function (s) {
        return [q(fmtDate(s.ts))].concat(cols.map(function (c) { return q(s[c]); })).concat([q(quoteSummary(s.quote))]).join(",");
      });
      var blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
      var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "submissions.csv"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
    refresh.addEventListener("click", load);
    exportBtn.addEventListener("click", exportCsv);
    load();
    return wrap;
  }

  /* ---------- blog / resources editor ---------- */
  var CTA_TYPES = ["calculator", "contact", "link"];
  var CTA_TYPE_LABELS = { calculator: "Open the quote calculator", contact: "Open the contact form", link: "Custom link" };
  var BLOCK_TYPES = ["paragraph", "heading", "image", "video", "quote"];
  var BLOCK_LABELS = { paragraph: "Paragraph", heading: "Heading", image: "Image", video: "Video", quote: "Quote" };

  function ensureBlog() {
    if (!data.blog || typeof data.blog !== "object") data.blog = clone(DEFAULTS.blog || {});
    if (!Array.isArray(data.blog.posts)) data.blog.posts = [];
    if (!data.blog.defaultCta) data.blog.defaultCta = { type: "calculator", label: "", href: "" };
  }

  function blogEditor() {
    ensureBlog();
    var openSet = (typeof WeakSet !== "undefined") ? new WeakSet() : null; // expanded posts (not serialized)
    function isOpen(p) { return openSet ? openSet.has(p) : !!p.__open; }
    function toggle(p) { if (openSet) { openSet.has(p) ? openSet.delete(p) : openSet.add(p); } else { p.__open = !p.__open; } }

    var wrap = el("div", "blog-editor");

    var meta = el("div");
    [
      { p: "blog.eyebrow", l: "Eyebrow" },
      { p: "blog.title", l: "Page title (use *teal* highlight)", t: "area" },
      { p: "blog.sub", l: "Page subtitle", t: "area" },
      { p: "blog.recommendedTitle", l: "“Keep reading” heading" },
      { p: "blog.ctaHeading", l: "Article CTA heading" }
    ].forEach(function (f) {
      meta.appendChild(textField(f.l, getPath(data, f.p), function (v) { setPath(data, f.p, v); }, f.t === "area"));
    });
    wrap.appendChild(meta);

    wrap.appendChild(el("div", "section-label", "Articles"));
    var listEl = el("div", "blog-list"); wrap.appendChild(listEl);
    var addBar = el("div", "layout-add"); wrap.appendChild(addBar);

    function posts() { ensureBlog(); return data.blog.posts; }

    function render() {
      var a = posts(); listEl.innerHTML = "";
      a.forEach(function (post, idx) { listEl.appendChild(postCard(a, idx)); });
      enableDnD(listEl, a, render);
      addBar.innerHTML = "";
      var add = el("button", "add-btn", "+ Add article"); add.type = "button";
      add.addEventListener("click", function () {
        posts().push({ slug: "new-post-" + Date.now(), title: "Untitled article", excerpt: "", category: "", author: "AstroSync Team", date: "", read: "", cover: "", cta: { type: "calculator", label: "", href: "" }, blocks: [{ type: "paragraph", text: "" }] });
        render();
      });
      addBar.appendChild(add);
    }

    function postCard(a, idx) {
      var post = a[idx];
      var card = el("div", "list-item blog-post-item");
      card.setAttribute("data-di", idx);
      var head = el("div", "list-item-head");
      head.appendChild(el("span", "drag-handle", "⠿"));
      head.appendChild(el("span", "tag", "#" + (idx + 1) + " · " + esc(post.title || "Untitled")));
      var collapse = el("button", "icon-btn", isOpen(post) ? "▾" : "▸"); collapse.type = "button"; collapse.title = "Expand / collapse";
      collapse.addEventListener("click", function () { toggle(post); render(); });
      var del = el("button", "icon-btn del", "✕"); del.type = "button"; del.title = "Delete article";
      del.addEventListener("click", function () { if (confirm("Delete this article?")) { a.splice(idx, 1); render(); } });
      head.appendChild(collapse); head.appendChild(del);
      card.appendChild(head);
      if (!isOpen(post)) return card;

      card.appendChild(textField("Title (use *teal* highlight)", post.title, function (v) { post.title = v; }));
      card.appendChild(textField("Slug (URL id, e.g. my-post)", post.slug, function (v) { post.slug = v; }));
      card.appendChild(textField("Excerpt (shown on the card)", post.excerpt, function (v) { post.excerpt = v; }, true));
      var g = el("div", "grid2");
      g.appendChild(textField("Category", post.category, function (v) { post.category = v; }));
      g.appendChild(textField("Author", post.author, function (v) { post.author = v; }));
      g.appendChild(textField("Date (e.g. 2026-06-02)", post.date, function (v) { post.date = v; }));
      g.appendChild(textField("Read time (e.g. 5 min read)", post.read, function (v) { post.read = v; }));
      card.appendChild(g);
      card.appendChild(uploadField("Cover image", post.cover, function (v) { post.cover = v; }));

      card.appendChild(el("div", "section-label", "Funnel CTA (under the article)"));
      if (!post.cta) post.cta = { type: "calculator", label: "", href: "" };
      card.appendChild(selectField("CTA action", post.cta.type, CTA_TYPES, function (v) { post.cta.type = v; }, CTA_TYPE_LABELS));
      card.appendChild(textField("CTA label (optional)", post.cta.label, function (v) { post.cta.label = v; }));
      card.appendChild(textField("CTA link (only for Custom link; otherwise auto)", post.cta.href, function (v) { post.cta.href = v; }));

      card.appendChild(el("div", "section-label", "Article body"));
      if (!Array.isArray(post.blocks)) post.blocks = [];
      var blocksEl = el("div", "blocks-list"); card.appendChild(blocksEl);
      renderBlocks(post, blocksEl);
      var bAddBar = el("div", "layout-add");
      var bSel = el("select", "layout-add-select");
      BLOCK_TYPES.forEach(function (t) { var op = el("option"); op.value = t; op.textContent = BLOCK_LABELS[t]; bSel.appendChild(op); });
      var bAdd = el("button", "add-btn", "+ Add block"); bAdd.type = "button";
      bAdd.addEventListener("click", function () {
        var t = bSel.value, blk;
        if (t === "image") blk = { type: "image", src: "", caption: "" };
        else if (t === "video") blk = { type: "video", url: "", caption: "" };
        else if (t === "quote") blk = { type: "quote", text: "", cite: "" };
        else blk = { type: t, text: "" };
        post.blocks.push(blk); renderBlocks(post, blocksEl);
      });
      bAddBar.appendChild(bSel); bAddBar.appendChild(bAdd);
      card.appendChild(bAddBar);
      return card;
    }

    function renderBlocks(post, blocksEl) {
      blocksEl.innerHTML = "";
      post.blocks.forEach(function (blk, bi) {
        var row = el("div", "block-item");
        row.setAttribute("data-di", bi);
        var bhead = el("div", "list-item-head");
        bhead.appendChild(el("span", "drag-handle", "⠿"));
        bhead.appendChild(el("span", "tag", BLOCK_LABELS[blk.type] || blk.type));
        var bdel = el("button", "icon-btn del", "✕"); bdel.type = "button";
        bdel.addEventListener("click", function () { post.blocks.splice(bi, 1); renderBlocks(post, blocksEl); });
        bhead.appendChild(bdel);
        row.appendChild(bhead);
        if (blk.type === "image") {
          row.appendChild(uploadField("Image", blk.src, function (v) { blk.src = v; }));
          row.appendChild(textField("Caption", blk.caption, function (v) { blk.caption = v; }));
        } else if (blk.type === "video") {
          row.appendChild(textField("Video URL (YouTube / Vimeo / MP4)", blk.url, function (v) { blk.url = v; }));
          row.appendChild(textField("Caption", blk.caption, function (v) { blk.caption = v; }));
        } else if (blk.type === "quote") {
          row.appendChild(textField("Quote", blk.text, function (v) { blk.text = v; }, true));
          row.appendChild(textField("Attribution", blk.cite, function (v) { blk.cite = v; }));
        } else if (blk.type === "heading") {
          row.appendChild(textField("Heading text", blk.text, function (v) { blk.text = v; }));
        } else {
          row.appendChild(textField("Paragraph", blk.text, function (v) { blk.text = v; }, true));
        }
        blocksEl.appendChild(row);
      });
      enableDnD(blocksEl, post.blocks, function () { renderBlocks(post, blocksEl); });
    }

    render();
    return wrap;
  }

  /* ---------- panels ---------- */
  function buildPanels() {
    var nav = $("#navList"); nav.innerHTML = "";
    var panels = $("#panels"); panels.innerHTML = "";
    SCHEMA.forEach(function (sec, i) {
      var navBtn = el("button", "nav-item" + (i === 0 ? " active" : ""), esc(sec.title));
      navBtn.type = "button";
      navBtn.addEventListener("click", function () { showPanel(sec.id); });
      navBtn.setAttribute("data-panel", sec.id);
      nav.appendChild(navBtn);

      var panel = el("div", "panel" + (i === 0 ? " active" : ""));
      panel.id = "panel-" + sec.id;
      if (sec.intro) panel.appendChild(el("p", "panel-intro", esc(sec.intro)));
      if (sec.custom === "layout") { panel.appendChild(layoutEditor()); panels.appendChild(panel); return; }
      if (sec.custom === "submissions") { panel.appendChild(submissionsEditor()); panels.appendChild(panel); return; }
      if (sec.custom === "blog") { panel.appendChild(blogEditor()); panels.appendChild(panel); return; }
      var isTypo = sec.id === "typography";
      (sec.fields || []).forEach(function (fld) {
        var onIn = function (v) { setPath(data, fld.p, v); if (isTypo) applyPreview(); };
        if (fld.t === "select") panel.appendChild(selectField(fld.l, getPath(data, fld.p), fld.opts, onIn, fld.optLabels));
        else if (fld.t === "range") panel.appendChild(rangeField(fld.l, getPath(data, fld.p), fld.min, fld.max, fld.step, fld.unit, onIn));
        else if (fld.t === "upload") panel.appendChild(uploadField(fld.l, getPath(data, fld.p), onIn));
        else if (fld.t === "bool") panel.appendChild(boolField(fld.l, getPath(data, fld.p), onIn));
        else panel.appendChild(textField(fld.l, getPath(data, fld.p), onIn, fld.t === "area"));
      });
      if (isTypo) {
        panel.appendChild(el("div", "font-preview",
          "<div class='fp-label'>Live preview</div>" +
          "<div id='fp-h' class='fp-h'>Grow Faster. Spend Smarter.</div>" +
          "<div id='fp-b' class='fp-b'>AstroSync blends Houston-based strategy with a world-class execution team — full-service social media marketing at honest prices. 0123456789</div>"));
        applyPreview();
      }
      if (sec.colors) { var cg = el("div", "colors"); sec.colors.forEach(function (c) { cg.appendChild(colorBlock(c)); }); panel.appendChild(cg); }
      (sec.lists || []).forEach(function (ls) { panel.appendChild(listEditor(ls)); });
      panels.appendChild(panel);
    });
  }

  function showPanel(id) {
    SCHEMA.forEach(function (sec) {
      $("#panel-" + sec.id).classList.toggle("active", sec.id === id);
      var b = document.querySelector('.nav-item[data-panel="' + sec.id + '"]');
      if (b) b.classList.toggle("active", sec.id === id);
      if (sec.id === id) $("#panelTitle").textContent = sec.title;
    });
    window.scrollTo(0, 0);
  }

  /* ---------- save / export / import ---------- */
  function setStatus(msg, kind) { var s = $("#saveStatus"); s.textContent = msg; s.className = "save-status" + (kind ? " " + kind : ""); }

  function save() {
    setStatus("Saving…");
    api("PUT", "api/content", data, true).then(function (r) {
      if (r.status === 401) { setStatus("Session expired", "err"); requireLogin(); return; }
      if (!r.ok) throw new Error("HTTP " + r.status);
      try { localStorage.setItem("astrosync-content", JSON.stringify(data)); } catch (e) {}
      setStatus("Saved ✓", "ok"); toast("Saved. Reload the site to see changes.");
    }).catch(function () {
      // No server (file mode): persist to localStorage so this browser still reflects edits.
      try { localStorage.setItem("astrosync-content", JSON.stringify(data)); setStatus("Saved locally", "ok"); toast("No server — saved to this browser only. Use Export to keep changes.", true); }
      catch (e) { setStatus("Save failed", "err"); toast("Save failed.", true); }
    });
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "content.json"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Exported content.json — drop it in /data to deploy.");
  }
  function importJson(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try { data = JSON.parse(fr.result); buildPanels(); toast("Imported. Review, then Save."); }
      catch (e) { toast("Invalid JSON file.", true); }
    };
    fr.readAsText(file);
  }

  /* ---------- auth flow ---------- */
  function requireLogin() { $("#app").classList.add("hidden"); $("#login").classList.remove("hidden"); $("#pw").focus(); }
  function enterApp() {
    $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
    api("GET", "api/content").then(function (r) {
      $("#connBadge").style.color = "#37c89a"; $("#connBadge").textContent = "● server connected";
      return r.ok ? r.json() : null;
    }).then(function (loaded) {
      if (loaded) data = mergeDefaults(loaded);
      buildPanels();
    }).catch(function () {
      $("#connBadge").style.color = "#e8a23a"; $("#connBadge").textContent = "● offline (export to save)";
      var ls = null; try { ls = JSON.parse(localStorage.getItem("astrosync-content")); } catch (e) {}
      data = ls ? mergeDefaults(ls) : clone(DEFAULTS);
      buildPanels();
    });
  }
  function mergeDefaults(loaded) {
    // shallow-ensure all top-level keys exist so the editor never has gaps
    var out = clone(DEFAULTS);
    Object.keys(loaded || {}).forEach(function (k) { out[k] = loaded[k]; });
    return out;
  }

  /* ---------- init ---------- */
  function init() {
    $("#loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = $("#pw").value;
      $("#loginErr").textContent = "";
      api("POST", "api/login", { password: pw }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j.token) { sessionStorage.setItem(TOKEN_KEY, res.j.token); enterApp(); }
          else $("#loginErr").textContent = res.j.error || "Wrong password.";
        })
        .catch(function () {
          // No backend running — allow local (export-only) editing.
          $("#loginErr").textContent = "No server detected — opening in offline (export-only) mode.";
          setTimeout(enterApp, 700);
        });
    });
    $("#logoutBtn").addEventListener("click", function () { sessionStorage.removeItem(TOKEN_KEY); requireLogin(); });
    $("#saveBtn").addEventListener("click", save);
    $("#exportBtn").addEventListener("click", exportJson);
    $("#resetBtn").addEventListener("click", function () { if (confirm("Reset all content back to the built-in defaults? Unsaved edits will be lost.")) { data = clone(DEFAULTS); buildPanels(); toast("Reset to defaults. Save to keep."); } });
    $("#importBtn").addEventListener("click", function () { $("#importFile").click(); });
    $("#importFile").addEventListener("change", function (e) { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ""; });

    if (sessionStorage.getItem(TOKEN_KEY)) enterApp(); else requireLogin();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
