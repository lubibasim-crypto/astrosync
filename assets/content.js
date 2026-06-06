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

  theme: { teal: "#2ABFB0", deep: "#1B7A6E", navy: "#1A1F3C", mint: "#E0F4F2" },

  fonts: { display: "Sora", body: "Inter" },

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
      { tag: "Most Popular", title: "Social Media Management", text: "Platform strategy, daily posting, community management, and growth across Instagram, Facebook, TikTok, and LinkedIn." },
      { tag: "High ROI", title: "Paid Social & Search Ads", text: "Data-driven Meta and Google campaigns geo-targeted to Houston ZIP codes. We manage creative, copy, and bidding to maximize local ROAS." },
      { tag: "Viral-Ready", title: "Content Creation", text: "Reels, carousels, graphics, and short-form video — produced in brand, on schedule, optimized for platform algorithms." },
      { tag: "Long-Term", title: "Local SEO & Google Business", text: "Rank #1 when Houston customers search for your category. Full GMB optimization, review strategy, and local citation building." },
      { tag: "High LTV", title: "Email & SMS Campaigns", text: "Automated nurture sequences, promotional blasts, and re-engagement flows. Turn one-time visitors into loyal repeat customers." },
      { tag: "Foundation", title: "Brand Identity & Strategy", text: "Logo, color systems, voice guides, and competitive positioning so your brand stands out before you spend a dollar on ads." }
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
      { title: "Honesty over hype", text: "No vanity metrics, no surprise invoices. We report on what actually grows your business." },
      { title: "Speed as a feature", text: "Campaigns live within 48 hours of sign-off. Momentum compounds — so we never let it stall." },
      { title: "Local first", text: "We win when Houston wins. Every strategy is built for the neighborhoods you actually serve." },
      { title: "Underdog energy", text: "The big agencies ignored your market. We're hungry to prove they were wrong." }
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
    copyright: "© 2026 AstroSync Agency. Houston, TX & Rawalpindi, PK."
  },

  socials: [
    { network: "instagram", href: "#" },
    { network: "facebook", href: "#" },
    { network: "tiktok", href: "#" },
    { network: "linkedin", href: "#" }
  ]
};
