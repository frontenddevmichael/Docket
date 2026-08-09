# Docket — Product Requirements Document

## 1. Overview

**Product name:** Docket

**One-line description:** Docket takes a screen, its requirements, and (eventually) its code, and turns them into a reviewed, executed, and reported set of test cases — grounded in what was actually asked for, not generic guesswork.

**The problem:** Writing test cases by hand is slow, repetitive, and inconsistent between testers. Existing AI test-generation tools produce plausible-looking test cases, but few actually check whether the generated tests reflect the real requirements — and almost none flag when the built product has quietly drifted from the spec. Testers end up doing the same judgment work by hand that the tool should be catching.

**The idea, in plain terms:** A tester uploads a screen (or a link to one) along with the relevant requirements document. Docket reads both, and produces a set of editable test cases that are visibly tied to specific requirements — not vague boilerplate. The tester reviews, edits, and manually runs through them, marking each pass or fail with evidence. Docket assembles the results into a clean, editable report the tester can hand off to whoever needs to see it.

**Who it's for:** Individual QA testers and small QA teams — people who currently write test cases by hand, or who find existing enterprise test-management tools too heavy, too expensive, or too generic for how they actually work.

**Why now / why us:** The people building this include an experienced software tester whose real day-to-day frustrations are shaping every decision — what a "good" test case looks like, what a report should actually communicate, where existing tools fall short. That judgment is the product's real advantage; the AI is the delivery mechanism, not the differentiator by itself.

---

## 2. Goals for the first release

Docket's first release exists to answer one question honestly: **do real testers find AI-generated test cases from a screen and its requirements genuinely useful, or do they feel like something to be rewritten from scratch?**

Everything in this phase is designed to produce a clear answer to that question with a small group of real users (the plan targets an initial pilot of roughly 100 users), not to be a complete product yet.

**What success looks like for this phase:**
- Generated test cases are kept largely as-is, or lightly edited — not thrown out and rewritten
- Testers complete real test sessions (input → generate → edit → execute → report) rather than abandoning partway through
- Testers voluntarily describe the tool as saving them time, in their own words

---

## 3. What is being built — first release

### 3.1 Input
- A tester can upload a screenshot of a web or mobile screen, or paste a live web page link (Docket captures a screenshot from it automatically)
- A tester can paste in or upload the relevant requirements text for that screen (a PRD excerpt, user story, or similar)
- These two inputs are attached together as one "test session"

### 3.2 Test case generation
- Docket analyzes the screen (identifying visible elements, states, and possible actions) and cross-references it against the requirements text provided
- It produces a list of structured test cases covering expected behavior, unexpected/incorrect input, and edge cases
- Each generated test case is visibly linked back to the specific requirement or screen element that produced it, so the tester can see *why* it exists
- Generation happens as a single action — no multi-step setup

### 3.3 Test case review and editing
- Every generated test case can be edited, reordered, duplicated, or deleted
- New test cases can be added manually alongside generated ones
- Multiple test cases can be selected and acted on at once

### 3.4 Manual execution
- Each test case can be marked Pass, Fail, Blocked, or Not Yet Run
- Evidence can be attached to any result — a screenshot or a written note
- Docket automatically records who ran each test and when
- A visible progress indicator shows how much of the session has been executed

### 3.5 Reporting
- A report can be generated at any point, summarizing pass/fail/blocked counts and percentages
- The report shows requirements coverage — which parts of the input requirements have a linked, executed test case
- Failed test cases appear with their attached evidence
- The report is fully editable — a tester can reorder it, add their own commentary, and remove anything irrelevant before sharing it
- Reports can be exported or shared as a clean, presentable document

### 3.6 Accounts and history
- Simple account creation and login, so work is saved between visits
- A history of past test sessions (input, generated cases, execution results, and reports), so nothing is lost

### 3.7 Behind the scenes (not visible to the tester, but essential)
- A lightweight feedback signal on every generated test case — whether it was kept as-is, edited, or deleted — used internally to judge and improve generation quality
- Basic usage tracking (sessions started, test cases generated versus kept, time to first execution) to understand real usage patterns
- Reasonable limits on how much a single account can generate, to keep the service sustainable during the pilot

### 3.8 Look and feel
Docket should feel like a precision instrument for inspection work — calm, exact, and professional, not a flashy consumer app. A restrained, mostly monochrome visual style, with a single reserved color used only to flag failed or blocked results and the main call-to-action, is core to how the product should feel to use. A dedicated design direction document exists separately and should be treated as the visual source of truth.

---

## 4. What is explicitly not in the first release

Leaving these out is a deliberate choice, not an oversight — each is a real feature planned for later, once the core experience above is proven to work.

- **Automated test execution.** Tests are run manually by a person for now; nothing runs or scripts itself yet.
- **API testing as an input type.** The first release focuses on one input type (screens) done well, rather than three done thinly.
- **Reading source code.** No code upload or repository connection yet.
- **Comparing requirements against the built product to detect gaps.** This is planned as a major later feature but needs the simpler generation loop proven first.
- **Team accounts.** No multiple users per workspace, no roles, no assigning work to teammates yet — single-user accounts only.
- **Deep integrations** with tools like Jira, GitHub, or similar — not in this phase.

---

## 5. Future builds — the roadmap beyond the first release

These are grouped into three milestones. Each milestone should only begin once the previous one has been validated with real users — the order below is a plan, not a guarantee, and real feedback from each stage may change what comes next.

### Milestone A — Full input coverage
The goal here is to let Docket accept everything it was originally envisioned to handle, one piece at a time:

- **Add the second screen-based input type** (mobile app screens, if the first release focused on web, or vice versa) — this reuses the same underlying approach as the first release, just applied to a second kind of screen.
- **Add API testing as an input type** — accepting an API description (such as a specification file, or a plainly described set of endpoints) and generating test cases around expected responses, invalid input, authentication, and similar concerns. This is a different kind of input from screens, and is treated as its own addition.
- **Add source code as an optional input**, starting with a simple upload of a compressed project folder. This is used to make generated test cases more accurate and to lay the groundwork for the gap-detection feature below — not to generate developer-style unit tests, which is a different (and already well-served) problem outside Docket's focus.

### Milestone B — The key differentiator: gap detection
Once requirements, screens, and code can all be provided, Docket's most distinctive planned feature becomes possible:

- **Comparing requirements, the screen, and the code against each other**, and surfacing where they disagree — a requirement with no matching feature built, a feature in the product with no matching requirement, or a rule that's implemented differently than specified.
- This is expected to need real iteration once built — distinguishing a genuine gap from a false alarm is a judgment call that will need real usage and refinement before it can be trusted the way the rest of the tool is.
- The report gains a dedicated section for this: which requirements are covered, and where mismatches were found — turning the report into something useful to a wider audience than just QA (e.g. a product manager checking whether a feature was actually built as specified).

### Milestone C — Working as a team
Once the core tool is proven valuable to individual testers, it expands to support more than one person working together:

- **Shared workspaces** that multiple people can join by invitation.
- **Two roles to start:** someone who manages the workspace and inputs, and someone who executes assigned test cases.
- **Assigning specific test cases or full sessions** to a specific person on the team.
- **A read-only sharing option**, so a manager or teammate outside the testing team can view current results and the report without needing full access — a lightweight way to get cross-team visibility without building a heavier approval/review system too early.
- **Basic activity history**, so it's clear who did what and when.
- **A live connection to GitHub**, replacing the simple folder upload from Milestone A with the ability to connect a repository directly, ideally scoped to a specific change (a pull request) so Docket receives both the code and the developer's own explanation of what changed and why.

### Beyond Milestone C
Further along, and intentionally left open rather than pre-planned in detail, is a layer of polish and depth that should be driven by what real users ask for once the above is in place — deeper integrations with tools teams already use, more refined permissions, notifications, and anything else that repeated real-world use surfaces as genuinely needed.

---

## 6. Explicit non-goals

To keep the product's identity clear as it grows:

- Docket is not trying to become a developer-facing unit-testing tool. Reading code is in service of QA-level test cases and requirement comparison, not writing tests for a codebase's internal functions.
- Docket is not trying to automate test execution in this phase of its life. The manual execution and evidence-capture experience should stay excellent and central, not be treated as a placeholder for automation to come.
- Docket is not trying to match the full breadth of large, established enterprise test-management platforms feature-for-feature. Its intended edge is being sharper, simpler, and more accurate for individual testers and small teams — not broader.

---

## 7. Known risks and open questions

- **Generation quality is not guaranteed by good planning alone.** Whether the AI reliably produces test cases a real tester finds genuinely useful — rather than technically correct but generic — can only be answered by real usage and iteration, not by design work.
- **The gap-detection feature (Milestone B) is the single biggest source of uncertainty in this whole roadmap.** It's also the product's best differentiator. Both things are true at once, and it deserves the most careful testing and the most willingness to revise before being trusted as a headline feature.
- **The competitive landscape is real and active.** Established test-management tools are actively adding AI generation features of their own. Docket's advantage needs to stay sharp: grounded accuracy, a genuinely useful editable report, and a simpler experience for the users existing tools serve least well — not breadth of features.
- **What "code" means to the eventual user (a whole repository, a specific change, a single file) materially changes how much work Milestone A actually is** — this should be confirmed with real early users rather than assumed.

---

## 8. Appendix — technical stack

The rest of this document is intentionally non-technical. This appendix records the actual tools and frameworks chosen to build Docket, for reference alongside the product requirements above.

### Foundation
- **Backend and database: Supabase.** Chosen for its relational (Postgres) structure, which suits Docket's data naturally — a test case links to a requirement, an execution result, and a report. Also provides built-in authentication (extendable to GitHub OAuth for later milestones), row-level security (the mechanism that will enforce team/workspace data isolation in Milestone C), and file storage for screenshots and evidence.
- **Frontend: Next.js (React).** File-based routing maps directly onto the screen list in this document. Server-side API routes are used to make LLM calls, keeping API keys off the browser.
- **Styling and components: Tailwind CSS with shadcn/ui.** Unstyled-by-default components take the monochrome token system from the design direction directly, rather than fighting a pre-opinionated visual style.
- **Language: TypeScript**, for type safety across a codebase substantially written by an AI coding agent.
- **Hosting: Vercel** (frontend) and **Supabase's own hosting** (backend) — both have workable free tiers suitable for an initial pilot.

### Supporting tools — needed from the first release
- **Vercel AI SDK** — standardizes LLM calls, streaming responses (used for the sequential generation-loading state), and structured output (getting reliable, well-formed test cases back from the model).
- **React Hook Form + Zod** — form handling across every input screen, and validation of the LLM's output against the test case schema before it's stored.
- **TanStack Query (React Query)** — data fetching, caching, and sync between the frontend and Supabase; what makes marking a test case pass/fail feel instant.
- **dnd-kit** — drag-and-drop reordering of test cases.
- **Playwright** (server-side) — captures a screenshot when a tester provides a live URL instead of an upload; later reused for the gap-detection milestone, since it can navigate and inspect a live page, not just screenshot it.
- **Supabase's built-in email**, for account verification and password resets.

### Supporting tools — added once real users are on the platform
- **PostHog** — product analytics; directly serves the usage-instrumentation and feedback-signal requirements described in section 3.7.
- **Sentry** — error monitoring in production.
- **Upstash Redis** — lightweight rate limiting, supporting the per-user generation limits described in section 3.7.

### Tools needed specifically for later milestones
- **JSZip** — unpacking compressed code folders (Milestone A, code ingestion).
- **Octokit** (GitHub's official API client) — GitHub OAuth and pulling pull requests/diffs (Milestone C).
- **Stripe** — only if and when Docket introduces paid plans; integrates cleanly with Supabase when needed.

### Deliberately not used
- A heavy global state manager (e.g. Redux) — TanStack Query and React's built-in state are sufficient for Docket's needs.
- A separate backend framework (e.g. Express, FastAPI) — Next.js's own API routes handle everything Docket needs server-side, without the added deployment complexity of a second service.

### One schema decision to make from day one
Even though team workspaces are a Milestone C feature, every core table (sessions, test cases, executions, reports) should include a workspace identifier from the very first release, defaulting to one workspace per user. This costs very little to do now and avoids a painful data migration later — Supabase's row-level security model is also built around exactly this pattern.

## 9. Summary

Docket's first release proves one thing: that a tester handed a screen and its requirements gets back a set of test cases worth keeping, not rewriting. Everything after that — more input types, comparing requirements against the real product, working as a team — is built in service of that same core promise, expanded carefully and only once each prior step has earned it.
