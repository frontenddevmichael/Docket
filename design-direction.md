# Design Direction — AI QA Testing Tool

## The thesis

This tool exists in the world of inspection: clipboards, inspection tags, quality-control stamps, redlined documents, the quiet satisfaction of a checklist fully ticked. The design should feel like the digital version of a meticulous inspector's workspace — calm, exact, unhurried, trustworthy. Not a SaaS dashboard. Not a chat app. A precision instrument.

The signature element: **the inspection stamp.** Every pass/fail mark behaves like a rubber stamp hitting paper — decisive, slightly imperfect at the edges, permanent-feeling. This is the one place the product allows itself a flourish, and it directly encodes what a tester actually does: they inspect, then they stamp a verdict.

---

## Color tokens

A single neutral scale (cool graphite, not warm, not cold-blue — inspection-room lighting, not tech-startup dark mode) plus one reserved signal color.

| Token | Hex | Use |
|---|---|---|
| `--surface-canvas` | `#F7F7F6` | App background |
| `--surface-card` | `#FFFFFF` | Cards, panels, table rows |
| `--surface-sunken` | `#EEEEEC` | Input fields, code blocks, sunken areas |
| `--border-hairline` | `#DEDEDA` | Default borders, table dividers |
| `--border-strong` | `#C6C6C0` | Focus rings (paired with signal), emphasized dividers |
| `--ink-primary` | `#1C1C1A` | Primary text, headings |
| `--ink-secondary` | `#5C5C56` | Body text, descriptions |
| `--ink-muted` | `#8C8C84` | Captions, timestamps, placeholder text |
| `--ink-inverse` | `#F7F7F6` | Text on dark/filled surfaces |
| `--fill-primary` | `#1C1C1A` | Primary buttons, active states |
| **`--signal-amber`** | **`#C77D25`** | Reserved exclusively for: fail / blocked / needs-attention states, gap-detection flags, and the primary CTA button |
| `--signal-amber-soft` | `#F3E4D0` | Background tint for amber-flagged rows/cards |

**Why amber, not red/green:** red-green is the reflexive default (and fails colorblind testers). Amber reads as "inspect this" — a single, semantically honest signal borrowed from hazard tags and inspection stickers, the actual vernacular this product lives in. Pass is communicated by the *absence* of amber plus a clean checkmark glyph in `--ink-primary`; fail/blocked get the amber treatment plus an X or flag glyph. Color and shape always travel together — never color alone.

Do not introduce a second accent color anywhere. If a future feature seems to need one (e.g. gap-detection severity levels), express severity through amber's tint scale (`--signal-amber-soft` → full `--signal-amber` → a darkened `#9C5F16` for critical) rather than a new hue.

---

## Typography

- **Display / headings:** [Fragment Mono](https://www.fontshare.com/fonts/fragment-mono) or Söhne Kraftig at large sizes for section titles — a display face with just enough character to feel chosen, not default. Used sparingly, headings only.
- **Body / UI:** Inter or IBM Plex Sans, weights 400/500/600. This carries 90% of the interface — test case text, buttons, labels.
- **Data / utility:** IBM Plex Mono or JetBrains Mono — for anything that is *evidence*: API endpoints, PRD line references, code snippets, timestamps, test case IDs. The monospace face is doing real semantic work here: it marks "this is a fact from the source material," distinct from prose the tool generated.

**Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 40 (px), used consistently. Body defaults to 14px in dense views (test case tables), 16px in the report view where it reads more like a document.

---

## Layout concept

```
┌─────────────────────────────────────────────┐
│  ≡ Session name          [Generate] [Report] │  ← quiet top bar, no logo chrome
├───────────┬─────────────────────────────────┤
│           │  ┌───────────────────────────┐  │
│  Input    │  │ ✓  Login rejects short pw  │  │  ← test case row:
│  Screen   │  │    PRD §2.3 · 3 steps      │  │    glyph + title + source tag
│  + PRD    │  ├───────────────────────────┤  │
│  (pinned  │  │ ⚑  Password reset expiry   │  │  ← amber flag = needs attention
│  left,    │  │    PRD §4.1 · 2 steps      │  │
│  always   │  ├───────────────────────────┤  │
│  visible) │  │ ○  Remember-me checkbox    │  │  ← not yet run
│           │  └───────────────────────────┘  │
└───────────┴─────────────────────────────────┘
```

The input (screenshot + PRD excerpt) stays pinned in a left rail throughout the working session — the tester should never lose sight of *what they're testing against* while editing or executing cases. This is a deliberate structural choice, not decoration: it encodes the product's actual thesis (grounding in the source material) directly into the layout.

Report view breaks this pattern intentionally — full width, no rail, generous margins — because it's a different mode: presenting, not working.

---

## The stamp interaction (signature element)

When a tester marks a test case Pass or Fail:
- A small stamp graphic animates in at the row's right edge — a rough-edged circular or rectangular mark (like a rubber ink stamp), not a smooth icon fade.
- Pass: `--ink-primary` outline stamp with a check.
- Fail/Blocked: `--signal-amber` filled stamp with an X or flag.
- Duration: ~180ms, slight overshoot on scale (stamps land with a touch of force, not a gentle fade) — this is the one place a little personality in motion is earned.

This single interaction is what should make the product feel distinctive in a screen recording or demo — everything else stays quiet so this reads as intentional, not gimmicky.

---

## States and details to lock in Stitch

- **Empty state (no test cases yet):** an illustration-free, text-led invitation — "Upload a screen and its requirements to generate your first test cases" — with the input rail already visible and ready, not a generic blank page.
- **Generation loading state:** replace a spinner with sequential status text — "Reading the screen…" → "Cross-referencing PRD…" → "Drafting test cases…" — each shown ~800ms–1.2s, building trust that real reasoning is happening.
- **Status glyphs:** ✓ pass, ⚑ fail/needs-attention, ○ not run, ⊘ blocked — always paired with the amber/neutral color, never color-only.
- **Focus states:** visible keyboard focus ring using `--border-strong`, 2px, on every interactive element — this is a professional tool used for hours at a time; keyboard navigation matters.
- **Density:** test case list defaults to compact rows (~40px height); report view uses relaxed spacing (~64px between sections) — same design system, two deliberately different densities for two different jobs.
- **Radius:** small, consistent corner radius (6px) on cards and buttons — enough to feel soft and modern, not sharp/brutalist, not bubbly/consumer.
- **Shadows:** one subtle elevation level only (`0 1px 2px rgba(28,28,26,0.06)`) for cards resting on canvas — no multi-layer drop shadows.
- **Motion elsewhere:** 150ms ease-out for hovers, row updates, panel transitions. Respect `prefers-reduced-motion` — disable the stamp overshoot and use a simple fade instead when set.

---

## What to explicitly avoid

- No terracotta/warm-cream palette, no near-black-with-neon-accent — both are the current AI-generated-design defaults and would undercut the "distinctive, professional" goal.
- No red/green status colors.
- No decorative gradients, no glassmorphism, no illustrated mascots.
- No numbered-step markers unless something is a genuine sequence (test case *steps* qualify; sections of the UI generally don't).

---

## Marketing page (expressive storefront)

The marketing landing page is the one place the product permits itself to be **expressive and energetic** — it's the storefront, not the workshop. Once a user signs in, everything reverts to the restrained "precision instrument" tone below. These decisions apply to the marketing page only.

### Staggered section reveals

Each major section (hero, how-it-works, features, testimonials, FAQ, CTA) enters with a coordinated scroll-triggered animation:
- Sections slide upward (~40–60px) and fade in as they cross the viewport threshold
- Within each section, children (feature cards, how-it-works steps, FAQ items) **cascade** one by one with a ~100ms stagger delay
- Duration: 600–800ms per item, eased (cubic-bezier with slight overshoot)
- Respects `prefers-reduced-motion` — falls back to a single short fade

### Parallax / depth layers

Background and foreground elements move at different scroll speeds to create depth:
- Subtle ambient decorative layer behind content (geometric lines, faint grid marks)
- Content layer scrolls at normal speed
- A "depth" layer (the inspection-stamp watermark or graphite-tinted abstract shapes) drifts slower

### Micro-interactions

- **Stat counter animation**: Numbers (testimonials, report counts, etc.) animate from 0 to their final value when scrolled into view, ~1.2s count-up with an ease-out curve
- **Hover tilt on feature cards**: Cards tilt slightly (~2–3°) toward the cursor on hover, with a soft shadow lift — implemented via the existing `TiltedCard` react-bits component pattern
- **Button press / ripple**: CTA buttons get a 0.97x scale-down on mousedown (90ms) and return on release; optional ink-ripple overlay expanding from click point

---

## Auth screens (inspection/stamp identity)

Sign-in, sign-up, forgot-password, and reset-password screens follow the same badge-in metaphor as the rest of the product, but with a darker, more focused presentation.

### Layout & theme
- Centered card on a `--surface-canvas` background (or optionally a slightly darker `#1C1C1A` full-canvas for a more dramatic entry)
- Card body: `--surface-card` with `--border-hairline` stroke
- Form fields: `--surface-sunken` inputs with `--ink-secondary` labels
- Primary CTA button: `--fill-primary` background with `--ink-inverse` text, or `--signal-amber` for the submit action (consistent with the single accent rule)

### Interactive doodle
- The existing bottom-left decorative SVG becomes reactive to form state:
  - Default: subtle slow drift / breathing motion
  - On focus: the doodle shifts attention — lines animate toward the focused field
  - On typing: gentle ripple or pulse through the doodle geometry
  - On success/error: the doodle resolves to a stamp mark (check or X) or dissolves momentarily

### SSO / OAuth
- Google and GitHub sign-in buttons sit below the email/password form, separated by a hairline divider with "or" label
- Buttons use the same height and corner radius as the primary CTA, but with a `--surface-card` background and `--border-hairline` stroke

### Keep the 4-screen flow
- SignIn, SignUp, ForgotPassword, ResetPassword remain separate routes — no tabbed unification

---

## Report view (stamp-enhanced, AI commentary)

### Generation trigger
- Remains manual (user clicks "Generate Report") — but the button gains the "stamping" interaction: it depresses on click, and the report enters with a stamp-kernel animation
- Add a progress indicator during generation (sequential status lines, matching the "Reading the screen…" pattern from above)

### New report elements

**Execution summary graph** (top of report, above the summary):
- A donut chart or horizontal bar showing pass / fail / blocked / not-run proportions
- Uses `--ink-primary` (pass), `--signal-amber` (fail/blocked), `--border-hairline` (not-run)
- Optional: a timeline sparkline showing pass rate over time if session data includes time-series runs

**Inspection stamp (hero element)**:
- Large stamp mark at the very top of the report — the "verdict"
- Three states: **PASS** (clean `--ink-primary` outline stamp with ✓), **CONDITIONAL PASS** (amber outline with a flag or delta symbol), **FAIL** (filled `--signal-amber` stamp with ✗)
- Animation: stamp descends onto the page with a 180ms scale-overshoot, same as the test-case-level stamp (the signature interaction scaled up)

**AI-generated commentary** (per section, not just a single free-text field):
- Each major section (Requirements Coverage, Critical Failures, Not Executed, Timeline) gets a short AI-written analysis paragraph
- User can still edit any AI-generated commentary inline (same UX as the current commentary field)
- The final "Commentary" section at the bottom collects all edits and allows adding a free-form closing note

### Section order (post-addition)
1. Inspection stamp (verdict)
2. Execution summary graph
3. Summary
4. Generation Quality
5. Requirements Coverage (with AI commentary)
6. Critical Failures (with AI commentary)
7. Not Executed (with AI commentary)
8. Timeline (with AI commentary)
9. All Test Cases
10. Commentary (collated AI text + user edits + closing note)
