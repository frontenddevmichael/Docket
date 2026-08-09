# Marketing Page Redesign — Docket

## Goal

Replace the current AI-generated SaaS template landing page with a version built using react-bits components. Kill the generic signals (MagneticButton, framer-motion fadeUp stagger formula, gradient CTA, fabricated pricing, fake testimonials) while extending the tool's existing design language — calm, restrained, precision-instrument aesthetic from `design-direction.md`.

## Scope

One page: `client/src/pages/Marketing.tsx`. Remove the `Pricing` section entirely. Rewrite testimonials as aspirational placeholders. Replace 8 of the current components with react-bits equivalents.

## Page Structure

```
Nav (PillNav)
├── Hero (AnimatedContent + TiltedCard)
├── How it works (3 steps, Counter + AnimatedList)
├── Features (MagicBento)
├── Testimonials (Carousel)
├── FAQ (Folder)
├── CTA (GlassSurface + Beams)
└── Footer (unchanged)
```

## Section Details

### Nav
- Component: `PillNav` from react-bits
- Links inside pill: "Features", "FAQ"
- "Sign In" text link and "Get Started" button sit outside the pill, on the right
- Pill centers horizontally, background fades to `bg-surface/80 backdrop-blur-md` on scroll past 20px
- Mobile: same layout, "Get Started" becomes full-width below
- **No MagneticButton** — CTA button uses `active:scale-[0.97]` only
- Entrance: `AnimatedContent` fade-in on mount

### Hero
- Tagline: `AnimatedContent` wrapper — entrance from slightly below with a custom cubic-bezier ease-out. No stagger delays between words. Whole block moves together.
- Subtitle text: same `AnimatedContent`, slightly delayed behind tagline.
- CTA buttons:
  - Primary: "Start Free — No Credit Card", filled `bg-primary text-on-primary`
  - Secondary: "See how it works" text link with chevron, scrolls to `#features`
  - **No MagneticButton** on either.
- Product mockup: `TiltedCard` wrapping a simplified tool mockup — left rail + 3 test case rows. Subtle 3D tilt on mouse move (max 5°). No pass-rate card. No traffic-light dots bar.
- Copy is direct, not aspirational: "Tests from screens & specs in one click."

### How it works
- Replaces the current 4-column stats strip
- 3 horizontal steps with a subtle connecting line (rule + dots):

  1. **Upload** — "Upload a screenshot or paste a URL. Add your requirements text."
  2. **Generate** — "Docket cross-references both. A complete test matrix appears."
  3. **Execute & Report** — "Run each case, stamp pass or fail, export the report."

- Each step has: numbered circle (`bg-primary text-on-primary`), heading, short description, and a `Counter` displaying a relevant metric beneath (e.g. "4.2s avg generation", "96% kept as-is")
- **TODO: Replace Counter metric values with real data once available** — for now use plausible placeholders
- Entrance: `AnimatedList` with stagger interval 0.15s, alternating entry direction (even from right, odd from left). Custom cubic-bezier ease-out — no spring.
- Connecting line: horizontal rule between steps, with a dot at each step position.

### Features (MagicBento)
- Component: `MagicBento` from react-bits
- Asymmetric 2×3 grid:

  ```
  ┌──────────────────────┬──────────────────┐
  │ Screen → Cases       │ PRD → Matrix      │
  │ (tall, 2 rows)       │ (standard)        │
  ├──────────────────────┼──────────────────┤
  │ Live Execution       │ Workspace         │
  │ (standard)           │ Dashboard         │
  │                      │ (standard)        │
  ├──────────────────────┴──────────────────┤
  │ Drag & Organize ─── Export & Integrate   │
  │ (wide, 2 features side by side)         │
  └──────────────────────────────────────────┘
  ```

- Each tile: click/tap expands it inline to reveal more detail (paragraph + small visual)
- `MagicBento` handles expand/collapse animation natively
- Content copy from current `features` array, no changes needed
- No icon at top of tiles — text-only headers
- Tile styling: `bg-surface-container-lowest border border-outline-variant/30 rounded-lg`
- Entrance: `AnimatedList` with same stagger parameters as How it works

### Testimonials
- Component: `Carousel` from react-bits
- Single testimonial per slide, swipeable on mobile
- Dot indicators + arrow buttons on desktop
- Format per slide: quote, name, role
- **No star ratings** — reads as fabricated
- **No company names** — use generic roles: "QA Lead", "Engineering Manager"
- **TODO: Write 3-4 actual placeholder quotes** — not fabricated "amazing" testimonials, just plausible neutral statements from early users
- Auto-advances every 6s, pauses on hover
- Section background: `bg-surface-container-low`
- Entrance: `AnimatedList` for section heading, carousel content loads inline

### FAQ
- Component: `Folder` from react-bits
- Each question is a folder tab that opens with a folding animation to reveal the answer
- Only one folder open at a time
- Questions stay the same as current
- Styling: `bg-surface-container-lowest border border-outline-variant/30 rounded-lg`
- Background: `bg-background` (no container background, sits on the page canvas)

### CTA
- Heading: "A screen. Its requirements. One click." — font-heading, 28-32px
- No subtitle paragraph — just the heading and button
- Button: "Start Free — No Credit Card", `bg-primary text-on-primary`
- Background component: `GlassSurface` from react-bits — subtle glass refraction on hover/scroll
- Background under glass: `Beams` from react-bits — soft animated light beams, very subtle
- **No gradient card. No MagneticButton. No "Join thousands" copy.**
- Entrance: `AnimatedContent` fade-up on scroll

### Footer
- Unchanged from current implementation

## Animation System

Replace all hand-rolled framer-motion variants with react-bits components:

| Current | Replacement |
|---------|-------------|
| `motion.div` + `fadeUp` variants + `whileInView` + stagger | `AnimatedContent` (singular elements) / `AnimatedList` (lists with stagger) |
| `MagneticButton` spring + useMotionValue | Removed entirely — `active:scale-[0.97]` only |

Global animation parameters:
- Easing: custom cubic-bezier (not spring)
- Stagger interval: 0.15s (where AnimatedList is used)
- Stagger pattern: alternating direction (even items from right, odd from left)
- Respects `prefers-reduced-motion` — all animations become instant

## Dependencies to Add
- `reactbits` CLI or individual component files for: `AnimatedContent`, `AnimatedList`, `TiltedCard`, `Counter`, `MagicBento`, `Carousel`, `Folder`, `GlassSurface`, `Beams`, `PillNav`
- Sub-dependencies vary by component (check each component's docs before install)
- Remove unused: `framer-motion` can stay for the rest of the app but Marketing.tsx no longer imports it directly

## Removals
- Entire Pricing section (`#pricing` block and related tier data)
- `MagneticButton` component
- `SectionHeading` wrapper component (replaced by inline + AnimatedContent)
- `FaqItem` accordion component (replaced by react-bits Folder)
- Gradient utility classes from CTA section
- All `motion.div`, `motion.h1`, `motion.p`, `motion.button`, `motion.span` imports in Marketing.tsx
