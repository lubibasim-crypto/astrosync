/* ============================================================
   ASTROSYNC — default site content (single source of truth)
   The admin panel edits this structure and saves it to the
   backend (and localStorage). When the site is opened as a
   plain file with no server, these defaults are used directly.

   Rich-text convention for headings:
     *word*  -> teal gradient highlight
     \n      -> line break
   ============================================================ */
window.ASTRO_DEFAULT_CONTENT = {
  meta: { version: 1 },

  brand: { name: "ASTROSYNC", accent: "SYNC" },

  // Full site theme. teal/deep/navy/mint are the shared brand palette; dark/light
  // hold the surface + text colours for each mode (drives every page's UI).
  theme: {
    teal: "#2ABFB0", deep: "#1B7A6E", navy: "#1A1F3C", mint: "#E0F4F2",
    dark:  { bg: "#0B1124", bg2: "#0E1730", surface: "#14203C", raised: "#1B2A4A", border: "#27395E", text: "#EAF6F4", muted: "#93B2B4", onBrand: "#06231F" },
    light: { bg: "#EEF8F8", bg2: "#FFFFFF", surface: "#FFFFFF", raised: "#E0F4F2", border: "#CDE7E4", text: "#0F1623", muted: "#5A7470", onBrand: "#FFFFFF" }
  },

  fonts: { display: "Sora", body: "Inter" },

  // Global type scale — multipliers applied site-wide (1 = default).
  type: { baseScale: 1, headingScale: 1 },

  // Logo: "mark" = bundled SVG mark + wordmark; "image" = uploaded file.
  logo: { type: "mark", src: "", height: 34, position: "left", showName: true },

  hero: {
    badge: "Houston's Premier Affordable Agency",
    title: "Grow *Faster.*\nSpend *Smarter.*\nDominate Local.",
    lead: "AstroSync blends Houston-based strategy with a world-class Pakistan execution team — delivering full-service social media marketing at prices local businesses can actually afford.",
    ctaPrimary: { label: "Get Your Free Audit", href: "contact.html" },
    ctaSecondary: { label: "Explore Services", href: "services.html" },
    stats: [
      { value: "3×", label: "Avg Engagement Lift" },
      { value: "60%", label: "Below Agency Rates" },
      { value: "48h", label: "Campaign Launch" }
    ],
    sphere: ["instagram", "tiktok", "facebook", "youtube", "linkedin", "x"]
  },

  ticker: [
    "Social Media Management", "Paid Advertising", "Content Creation", "Local SEO",
    "Brand Strategy", "Email Marketing", "Influencer Outreach", "Analytics & Reporting"
  ],

  why: {
    eyebrow: "Why AstroSync",
    title: "The Under-Dogs With\n*Agency-Level Firepower*",
    sub: "Houston's local market has been ignored by big agencies chasing Fortune 500 contracts. We built AstroSync for the businesses they left behind — with zero compromise on quality.",
    cards: [
      { icon: "🇺🇸", title: "Houston-Based Strategy", text: "Our US team lives in the Houston market, knows your customers, and keeps your brand voice authentic. Strategy calls are in your time zone, always." },
      { icon: "⚡", title: "Pakistan Execution Team", text: "Our Pakistan creatives and analysts work around the clock — campaigns build while you sleep. One team, two hemispheres, 24-hour turnaround." },
      { icon: "💰", title: "60% Below Market", text: "Premium local agencies charge $5K–$15K/mo. We deliver the same quality for a fraction — thanks to our dual-team model." },
      { icon: "📈", title: "ROI-First Approach", text: "We don't chase vanity metrics. Every campaign is built around leads, foot traffic, and revenue, with transparent monthly reports." }
    ]
  },

  services: {
    eyebrow: "What We Do",
    title: "Full-Stack *Digital Marketing*\nUnder One Roof",
    sub: "From building your Instagram presence to running hyper-local Facebook ads — we cover every channel that matters for Houston businesses.",
    items: [
      { tag: "Most Popular", title: "Social Media Management", text: "Platform strategy, daily posting, community management, and growth across Instagram, Facebook, TikTok, and LinkedIn.", cta: "Get Started", ctaHref: "contact.html" },
      { tag: "High ROI", title: "Paid Social & Search Ads", text: "Data-driven Meta and Google campaigns geo-targeted to Houston ZIP codes. We manage creative, copy, and bidding to maximize local ROAS.", cta: "Get Started", ctaHref: "contact.html" },
      { tag: "Viral-Ready", title: "Content Creation", text: "Reels, carousels, graphics, and short-form video — produced in brand, on schedule, optimized for platform algorithms.", cta: "Get Started", ctaHref: "contact.html" },
      { tag: "Long-Term", title: "Local SEO & Google Business", text: "Rank #1 when Houston customers search for your category. Full GMB optimization, review strategy, and local citation building.", cta: "Get Started", ctaHref: "contact.html" },
      { tag: "High LTV", title: "Email & SMS Campaigns", text: "Automated nurture sequences, promotional blasts, and re-engagement flows. Turn one-time visitors into loyal repeat customers.", cta: "Get Started", ctaHref: "contact.html" },
      { tag: "Foundation", title: "Brand Identity & Strategy", text: "Logo, color systems, voice guides, and competitive positioning so your brand stands out before you spend a dollar on ads.", cta: "Get Started", ctaHref: "contact.html" }
    ]
  },

  process: {
    eyebrow: "How It Works",
    title: "From *Zero to Launch*\nin 48 Hours",
    sub: "A proven 4-step system refined across dozens of Houston businesses — restaurants, real estate, retail, and more.",
    steps: [
      { title: "Free Audit Call", text: "We dig into your social presence, competitors, and growth gaps — at no cost, no commitment." },
      { title: "Custom Strategy", text: "Our Houston team builds a channel-specific plan tailored to your audience, budget, and 90-day goals." },
      { title: "Launch & Execute", text: "Pakistan creatives build the assets, US team approves and publishes. Live within 48 hours of sign-off." },
      { title: "Optimize & Scale", text: "Weekly data reviews, monthly strategy calls, and constant A/B testing to compound your returns." }
    ]
  },

  results: {
    eyebrow: "Proven Results",
    title: "Numbers That *Actually Matter*",
    sub: "Real outcomes from real Houston businesses — no inflated vanity metrics, just growth you can take to the bank.",
    items: [
      { ctx: "Houston Restaurant Group", stat: "+312%", text: "Instagram reach in 90 days through a consistent Reels strategy and targeted Meta ads — on a lean $600/mo ad spend." },
      { ctx: "Local Home Services Brand", stat: "4.2×", text: "Return on ad spend from a Google Local Service Ads + Facebook retargeting combo. Booked out 8 weeks ahead." },
      { ctx: "Boutique Retail Store", stat: "18K", text: "New organic followers in 60 days using a viral UGC campaign that cost less than one traditional print ad." },
      { ctx: "Medical Practice", stat: "−62%", text: "Cost-per-lead reduction vs. their previous agency — same budget, same market, completely different results." }
    ]
  },

  pricing: {
    eyebrow: "Transparent Pricing",
    title: "Premium Service.\n*Honest Prices.*",
    sub: "No hidden fees, no surprise invoices. Just the work that grows your business — billed monthly, cancel anytime.",
    note: "Ad spend is billed separately and paid directly to the platforms. All plans are month-to-month — no long contracts.",
    plans: [
      { name: "Starter", price: "$499", per: "/ month — perfect for launch", featured: false, features: ["2 social platforms managed", "12 posts per month", "Basic community management", "Monthly analytics report", "Google Business setup", "Email support"] },
      { name: "Growth", price: "$999", per: "/ month — for serious growth", featured: true, popular: "Most Popular", features: ["4 social platforms managed", "24 posts + 8 Stories/Reels", "Full community management", "Meta or Google Ads management", "Bi-weekly strategy calls", "SEO & GMB optimization", "Priority Slack support"] },
      { name: "Scale", price: "$1,799", per: "/ month — full-service domination", featured: false, features: ["All platforms + TikTok", "Unlimited content creation", "Multi-channel paid ads", "Email + SMS automation", "Weekly strategy & data calls", "Influencer outreach", "Dedicated account manager", "Custom reporting dashboard"] }
    ]
  },

  // Drag-and-drop quote calculator (Pricing page). Prices are per-unit, in
  // the chosen currency. `recommended` quantities power the "Suggested starter
  // package", which the front-end always tops up to at least `minQuote`.
  // Fully editable in the admin "Quote Calculator" panel.
  calculator: {
    eyebrow: "Build Your Package",
    title: "Build Your *Custom Quote*",
    sub: "Drag the services you need into your quote, set the quantities, and watch your estimate update live. No hidden fees — just the work that grows your business.",
    currency: "$",
    minQuote: 600,
    minNote: "Our minimum engagement is $600 — it's what lets our dual-team model deliver results worth talking about. Add a few more services (or nudge your quantities up) to get there.",
    emptyNote: "Drag a service over here, or tap “+ Add” — then set your quantities.",
    ctaLabel: "Request This Quote",
    ctaHref: "contact.html",
    suggestLabel: "✦ Suggest a starter package",
    services: [
      { icon: "🎬", name: "1 Instagram Reel",          desc: "Editing, captions, audio and on-brand text — built for the algorithm.", price: 60, unit: "per reel",     recommended: 5 },
      { icon: "🖼️", name: "1 Graphic Post",             desc: "Static, fully branded feed design.",                                   price: 25, unit: "per post",     recommended: 4 },
      { icon: "🎠", name: "1 Carousel Post",            desc: "5–10 branded, swipeable slides.",                                      price: 15, unit: "per carousel", recommended: 2 },
      { icon: "🔍", name: "Profile analysis",           desc: "Deep dive: followers, engagement and growth audit.",                   price: 65, unit: "one-time",     recommended: 1 },
      { icon: "🔗", name: "Linktree / bio link setup",  desc: "Designed bio link with tracked UTMs.",                                 price: 25, unit: "one-time",     recommended: 0 },
      { icon: "💬", name: "Instagram Community Hub",     desc: "Broadcast channel / close-friends setup.",                             price: 25, unit: "setup",        recommended: 0 },
      { icon: "✍️", name: "SEO caption copy",            desc: "Keyword-optimised reel + post captions.",                              price: 20, unit: "per caption",  recommended: 3 },
      { icon: "#️⃣", name: "Hashtag research",            desc: "Niche, ranked hashtag set refreshed monthly.",                         price: 15, unit: "per month",    recommended: 1 },
      { icon: "📊", name: "Month-end report",           desc: "Reach, engagement, growth and insights.",                              price: 50, unit: "per month",    recommended: 1 }
    ]
  },

  testimonials: {
    eyebrow: "Client Stories",
    title: "Houston Businesses\n*Love AstroSync*",
    items: [
      { quote: "We tried two other agencies and got nothing. AstroSync had us ranking on Google and posting fire content within the first week. The price made us skeptical — now we just wish we found them sooner.", initials: "MR", name: "Marco R.", role: "Owner, Fuego Taqueria — Houston Heights" },
      { quote: "I'm a one-person real estate team. AstroSync makes me look like I have a full marketing department. My leads from Instagram doubled in 6 weeks. The Growth plan is genuinely the best value in the city.", initials: "TL", name: "Traci L.", role: "Realtor, Keller Williams — Sugar Land" },
      { quote: "The dual-team model actually works. US team understands our local vibe, Pakistan team keeps costs low and turnaround insane. It's like having 10 people on payroll for the price of a part-time hire.", initials: "SK", name: "Sam K.", role: "CEO, Apex Auto Detail — Katy, TX" }
    ]
  },

  faq: {
    eyebrow: "Questions",
    title: "Frequently *Asked*",
    items: [
      { q: "Is there a setup fee or long-term contract?", a: "No setup fees and no long-term contracts. Every plan is month-to-month — stay because the results are working, not because you're locked in." },
      { q: "Is ad spend included in the price?", a: "No — management fees and ad spend are separate. You pay platforms like Meta and Google directly, so you keep full ownership and transparency over every dollar." },
      { q: "How fast will I see results?", a: "Content and posting start within 48 hours of sign-off. Paid campaigns typically show early signal in 2–3 weeks, with compounding organic growth over 60–90 days." },
      { q: "Can I upgrade or downgrade later?", a: "Anytime. Most clients start on Growth and scale up as results come in. Changes take effect on your next billing cycle." },
      { q: "What makes you cheaper than other agencies?", a: "Our dual-team model: Houston strategy plus a Pakistan execution team. Same quality, far leaner cost structure — savings we pass straight to you." }
    ]
  },

  about: {
    eyebrow: "Who We Are",
    title: "The Under-Dogs With *Agency-Level Firepower*",
    lead: "Houston's local market has been ignored by big agencies chasing Fortune 500 contracts. We built AstroSync for the businesses they left behind — with zero compromise on quality.",
    teamEyebrow: "The Model",
    teamTitle: "One Team, *Two Hemispheres*",
    teamSub: "The dual-team model is our unfair advantage — local insight where it matters, lean execution where it counts.",
    teams: [
      { flag: "🇺🇸", title: "Houston, Texas", text: "Strategy, account management, and client relationships. Same time zone, same market knowledge as your customers. This is where your brand voice and 90-day game plan are built." },
      { flag: "🇵🇰", title: "Rawalpindi, Pakistan", text: "Creative production, content, ad builds, and analytics. A full-stack execution team working around the clock so your campaigns ship fast — and your budget goes further." }
    ],
    valuesEyebrow: "What Drives Us",
    valuesTitle: "Our *Operating Principles*",
    values: [
      { title: "Underdog energy", text: "The big agencies ignored your market. We're hungry to prove they were wrong." },
      { title: "Honesty over hype", text: "No vanity metrics, no surprise invoices. We report on what actually grows your business." },
      { title: "Speed as a feature", text: "Campaigns live within 48 hours of sign-off. Momentum compounds — so we never let it stall." },
      { title: "Local first", text: "We win when Houston wins. Every strategy is built for the neighborhoods you actually serve." }
    ]
  },

  contact: {
    eyebrow: "Let's Talk",
    title: "Ready to *Ignite* Your Growth?",
    lead: "Book a free 30-minute audit call. No fluff, no sales pressure — just an honest look at where you are and exactly what it would take to grow.",
    infos: [
      { icon: "📍", title: "Houston, TX 🇺🇸", sub: "Strategy & Account Management" },
      { icon: "📍", title: "Rawalpindi, PK 🇵🇰", sub: "Creative & Execution Team" },
      { icon: "✉️", title: "hello@astrosync.agency", sub: "Response within 24 hours" },
      { icon: "📞", title: "(832) 555-0190", sub: "Mon–Fri, 9am–6pm CT" }
    ]
  },

  // Resources / blog. Each post has a block-based body (Medium-style) and a
  // funnel CTA. Fully editable in the admin "Resources" panel.
  blog: {
    eyebrow: "Resources",
    title: "Insights & *Playbooks*",
    sub: "Strategies, breakdowns, and behind-the-scenes from the AstroSync team — built to help Houston businesses grow.",
    recommendedTitle: "Keep Reading",
    ctaHeading: "Ready to put this to work?",
    // Default funnel CTA used when a post doesn't set its own.
    defaultCta: { type: "calculator", label: "Build your custom package", href: "pricing.html" },
    posts: [
      {
        slug: "instagram-reels-that-convert",
        title: "5 Instagram Reels That Actually Convert (Not Just Rack Up Views)",
        excerpt: "Views are vanity. Here's the reel framework we use to turn scrollers into Houston customers.",
        category: "Content Strategy", author: "AstroSync Team", date: "2026-06-02", read: "6 min read", cover: "",
        cta: { type: "calculator", label: "Price out your reel package", href: "pricing.html" },
        blocks: [
          { type: "paragraph", text: "Everybody wants viral. Almost nobody wants the boring part: a reel that books a table, fills a calendar, or sells a service. After producing hundreds of reels for Houston businesses, we've found five formats that consistently move revenue — not just the view counter." },
          { type: "heading", text: "1. The “Problem → Proof” hook" },
          { type: "paragraph", text: "Open with the exact problem your customer is Googling at 11pm. Then show — don't tell — the result. The first 1.5 seconds decide whether the algorithm keeps pushing you." },
          { type: "quote", text: "If your first frame could be a stock photo, you've already lost the scroll.", cite: "AstroSync creative team" },
          { type: "heading", text: "2. Behind-the-counter authenticity" },
          { type: "paragraph", text: "Polished is forgettable. Real is shareable. A 20-second clip of your team doing the work out-performs a $2,000 ad shoot more often than you'd think." },
          { type: "image", src: "assets/mark.svg", caption: "On-brand, consistent visuals beat one-off perfection." }
        ]
      },
      {
        slug: "why-600-minimum",
        title: "Why Our Minimum Is $600 — And Why That's Good For You",
        excerpt: "Cheap marketing is the most expensive marketing there is. Here's the math behind our minimum engagement.",
        category: "Pricing", author: "AstroSync Team", date: "2026-05-26", read: "4 min read", cover: "",
        cta: { type: "contact", label: "Get a free audit", href: "contact.html" },
        blocks: [
          { type: "paragraph", text: "We get asked all the time: “Can you just do a couple of posts for $100?” We can — but we won't, and here's the honest reason why." },
          { type: "heading", text: "Results need a floor" },
          { type: "paragraph", text: "Below a certain volume, social media simply doesn't compound. A handful of disconnected posts is a cost. A consistent, strategic cadence is an investment. The $600 minimum is the smallest package where our dual-team model can actually produce momentum." },
          { type: "quote", text: "We'd rather do great work for fewer clients than mediocre work for everyone.", cite: "AstroSync" }
        ]
      },
      {
        slug: "local-seo-houston",
        title: "The Houston Local SEO Checklist We Run For Every New Client",
        excerpt: "Eleven things that get you found when your neighbors search — most of them free.",
        category: "Local SEO", author: "AstroSync Team", date: "2026-05-18", read: "7 min read", cover: "",
        cta: { type: "calculator", label: "Build your growth package", href: "pricing.html" },
        blocks: [
          { type: "paragraph", text: "Ranking in the Houston map pack isn't luck. It's a checklist. Here's the exact one we run in the first week of every engagement." },
          { type: "heading", text: "Start with Google Business Profile" },
          { type: "paragraph", text: "Claim it, complete every field, choose precise categories, and post weekly. This single asset out-earns most paid campaigns for local intent." }
        ]
      }
    ]
  },

  cta: {
    title: "Houston's Under-Dog Agency\nIs Now Open for Business.",
    text: "Don't let national agencies keep ignoring your market. AstroSync is built for businesses like yours — and we're hungry to prove it.",
    button: "Start Growing Today",
    href: "contact.html"
  },

  footer: {
    tagline: "Social media marketing built for Houston's local businesses. Premium strategy, honest prices — powered by two continents.",
    email: "hello@astrosync.agency",
    phone: "(832) 555-0190",
    locations: [
      { label: "Houston, TX 🇺🇸", sub: "Strategy & Account Management" },
      { label: "Rawalpindi, PK 🇵🇰", sub: "Creative & Execution" }
    ],
    // Footer map "picture": mapQuery (an address or place) drives a clickable Google
    // Maps card. mapLabel is the caption on it. mapUrl optionally overrides where a
    // click goes (leave blank to auto-link to Google Maps for the query).
    mapQuery: "Houston, TX",
    mapLabel: "Houston, TX 🇺🇸",
    mapUrl: "",
    copyright: "© 2026 AstroSync Agency. Houston, TX & Rawalpindi, PK."
  },

  // Floating "build your package" button shown on every page (admin-editable).
  floatingCta: { enabled: true, label: "Build Your Package", href: "pricing.html" },

  socials: [
    { network: "instagram", href: "#" },
    { network: "facebook", href: "#" },
    { network: "tiktok", href: "#" },
    { network: "linkedin", href: "#" }
  ],

  // Per-page CTA bands (the home one also lives in `cta` above for back-compat).
  ctas: {
    home: { title: "Houston's Under-Dog Agency\nIs Now Open for Business.", text: "Don't let national agencies keep ignoring your market. AstroSync is built for businesses like yours — and we're hungry to prove it.", button: "Start Growing Today", href: "contact.html" },
    services: { title: "Not Sure Which Service\nYou Need?", text: "Book a free 30-minute audit and we'll map out exactly what would move the needle for your business.", button: "Book My Free Audit", href: "contact.html" },
    about: { title: "Let's Build Something\nWorth Talking About.", text: "Meet the team behind the work. Book a free audit and see exactly how the dual-team model would work for you.", button: "Get In Touch", href: "contact.html" },
    pricing: { title: "Pick a Plan or\nLet's Build a Custom One.", text: "Not sure which tier fits? Book a free audit and we'll recommend the right plan for your goals and budget.", button: "Book My Free Audit", href: "contact.html" },
    work: { title: "Your Business Could Be\nThe Next Case Study.", text: "Book a free audit and we'll show you exactly where the growth is hiding in your market.", button: "Start Growing Today", href: "contact.html" }
  },

  // Page layouts — ordered, editable section instances (Shopify-style).
  // type = section renderer; hidden = skip render; opt = per-placement options.
  sections: {
    home: [
      { id: "home-hero", type: "hero" },
      { id: "home-ticker", type: "ticker" },
      { id: "home-why", type: "why", opt: { head: true } },
      { id: "home-services", type: "services", opt: { variant: "teaser", limit: 3, head: true, cta: { label: "View All Services", href: "services.html" } } },
      { id: "home-results", type: "results", opt: { cols: 4, head: true, center: true, cta: { label: "See Our Work", href: "work.html" } } },
      { id: "home-testimonials", type: "testimonials", opt: { limit: 3, head: true } },
      { id: "home-cta", type: "cta", opt: { ref: "home" } }
    ],
    services: [
      { id: "services-header", type: "pageHeader", opt: { ref: "services" } },
      { id: "services-grid", type: "services", opt: { variant: "full", topPad: 60 } },
      { id: "services-process", type: "process", opt: { head: true } },
      { id: "services-calc", type: "calculator" },
      { id: "services-cta", type: "cta", opt: { ref: "services" } }
    ],
    about: [
      { id: "about-header", type: "pageHeader", opt: { ref: "about" } },
      { id: "about-why", type: "why", opt: { topPad: 60 } },
      { id: "about-teams", type: "teams", opt: { head: true } },
      { id: "about-values", type: "values", opt: { head: true } },
      { id: "about-cta", type: "cta", opt: { ref: "about" } }
    ],
    pricing: [
      { id: "pricing-header", type: "pageHeader", opt: { ref: "pricing" } },
      { id: "pricing-grid", type: "pricing", opt: { topPad: 60 } },
      { id: "pricing-calc", type: "calculator" },
      { id: "pricing-faq", type: "faq", opt: { head: true, center: true } },
      { id: "pricing-cta", type: "cta", opt: { ref: "pricing" } }
    ],
    work: [
      { id: "work-header", type: "pageHeader", opt: { ref: "work" } },
      { id: "work-results", type: "results", opt: { cols: 2, topPad: 60 } },
      { id: "work-testimonials", type: "testimonials", opt: { head: true } },
      { id: "work-cta", type: "cta", opt: { ref: "work" } }
    ],
    contact: [
      { id: "contact-header", type: "pageHeader", opt: { ref: "contact" } },
      { id: "contact-body", type: "contact", opt: { topPad: 60 } }
    ],
    resources: [
      { id: "resources-header", type: "pageHeader", opt: { ref: "resources" } },
      { id: "resources-list", type: "blogList", opt: { topPad: 60 } }
    ],
    blog: [
      { id: "blog-post", type: "blogPost" }
    ]
  }
};

// Page-header content sources by ref (eyebrow / title / sub paths).
window.ASTRO_PAGEHEAD = {
  services: { eyebrow: "services.eyebrow", title: "services.title", sub: "services.sub" },
  about:    { eyebrow: "about.eyebrow",    title: "about.title",    sub: "about.lead" },
  pricing:  { eyebrow: "pricing.eyebrow",  title: "pricing.title",  sub: "pricing.sub" },
  work:     { eyebrow: "results.eyebrow",  title: "results.title",  sub: "results.sub" },
  contact:  { eyebrow: "contact.eyebrow",  title: "contact.title",  sub: "contact.lead" },
  resources:{ eyebrow: "blog.eyebrow",     title: "blog.title",     sub: "blog.sub" }
};

// Catalog of section types that can be added in the admin Layout panel.
window.ASTRO_SECTION_TYPES = [
  { type: "hero", label: "Hero (home banner)" },
  { type: "ticker", label: "Scrolling ticker" },
  { type: "pageHeader", label: "Page header" },
  { type: "why", label: "Why-us cards" },
  { type: "services", label: "Services grid" },
  { type: "process", label: "Process steps" },
  { type: "results", label: "Results / case stats" },
  { type: "testimonials", label: "Testimonials" },
  { type: "pricing", label: "Pricing plans" },
  { type: "calculator", label: "Quote calculator" },
  { type: "faq", label: "FAQ" },
  { type: "blogList", label: "Blog / resources list" },
  { type: "blogPost", label: "Blog post (single)" },
  { type: "teams", label: "Teams (dual-team)" },
  { type: "values", label: "Values list" },
  { type: "contact", label: "Contact form + info" },
  { type: "cta", label: "CTA band" }
];
