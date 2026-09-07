# Alimango Design Platform — MVP patch

A deliberately simple visual front-end design kit for graphic designers and other visual creatives who want to produce front-end work without learning code first.

This MVP is **not a Figma clone**. Its default vocabulary is:

**Project → Page → Block → Section → Component → Animation**

Technical implementation terms such as frame, div, flexbox, grid, constraint, instance, z-index, breakpoint and DOM are kept out of the normal editor.

## MVP thesis

The app tests two ideas with one system:

1. A talented visual designer can move into front-end product design through guided drag-and-drop composition rather than code.
2. AI/code generators can later consume the exact same semantic design document instead of inventing arbitrary UI from scratch.

## What is implemented

- Create separate design projects.
- Project-level **Branding** menu: logo, primary/accent/background/surface/text colors, heading font and body font.
- Four device workspaces: **Desktop, Laptop, Tablet, Mobile**.
- All devices begin with the same block/component set.
- Layout is independent per device after that: section split, component placement, block order, page effect and animation can differ without duplicating the underlying content.
- Default page skeleton: Header, Block 1, Block 2, Block 3, Block 4, Footer.
- Select any block and divide it visually into 1, 2 or 3 sections using plain layout thumbnails.
- Drag components into sections.
- Drag existing components between sections on the current device only.
- Component content stays shared across devices.
- Drag only **compatible animations** onto a selected component. The animation menu hides irrelevant choices and separates Recommended from Also works.
- Page scroll/effect presets at block level.
- Typography presets.
- Compare all device layouts.
- Local autosave.
- Temporary client preview URLs through the included zero-dependency Node server (7-day expiry by default).
- Downloadable handoff ZIP containing the semantic design document, branding tokens, static preview and a target-specific scaffold.
- Initial export targets: HTML, React, Vue, React Native and Android/Jetpack Compose.
- Forms carry simple API endpoint/method metadata and export an OpenAPI handoff stub.
- Optional **Settings → AI** connection for ChatGPT/Claude; AI stays out of the main editor menu.
- One-time guided connection onboarding with an immediate **Not now** path.
- Remote MCP design tools that create/read/edit the same semantic project while enforcing permissions, per-project access, revision conflicts and component-animation compatibility.
- Agent-created projects return an editor handoff URL so brainstorming can happen in the cloud and finishing can happen visually in Alimango.
- GitBook-style AI connection guide at `/guide.html` plus Markdown sources under `docs/`.

## Run

Requires Node 20+ and no npm packages.

```bash
node server/index.mjs
```

Open:

```text
http://localhost:4173
```

Tests:

```bash
node --test tests/*.test.mjs
```

## Optional AI connection

The customer-facing workflow is **Brainstorm there. Design here.** AI is off by default, is promoted only during onboarding, and permanently lives under **Settings → AI** rather than the editor's main design menu. Existing projects are not exposed automatically; the user explicitly enables each project and controls read/create/edit/share/export permissions.

The MVP exposes a constrained remote MCP endpoint for compatible clients such as ChatGPT and Claude. Agents operate on semantic Blocks, Sections, Components and governed Animations instead of arbitrary CSS or canvas coordinates. Existing-project mutations require `expected_revision`, so a stale agent cannot silently overwrite newer human finishing work. See `AI_MCP.md`, `AI_MCP_ACCEPTANCE.md` and `docs/SUMMARY.md`.

## Architecture choice

The MVP is intentionally clean-room and dependency-free, but its internal architecture is informed by the repositories reviewed for this product:

- **Vellum**: local-first document ownership, per-gesture transactions/history direction, flat/painter-ordered scene concepts, component/tokens orientation, local persistence and touch-camera direction.
- **Forma**: selective geometry/interchange/rendering ideas to borrow later where Vellum-style primitives are insufficient.
- **OpenSourceUI**: seed taxonomy for production component categories such as buttons, forms, navigation, inputs, galleries, docks and feedback components.
- **Amicro**: seed taxonomy for motion patterns such as reveal, stagger, hover/magnetic, tilt and card motion.
- **m3e-canvas**: interaction reference for simple browser-based component assembly and AI/code handoff.

No upstream source code is copied into this MVP patch. This keeps the first test build small and allows a later governed import of selected MIT-licensed modules after the interaction model is validated.

## Why not wire Vellum directly on day one?

The first test is about the product interaction model, not vector-editor fidelity. Vellum and Forma both expose professional editor concepts that this audience should not have to learn. The MVP therefore validates the Alimango semantic model and UI first. If designer tests validate the flow, the next engineering step is to replace specific editor mechanics with selected Vellum core modules while preserving this UI and document schema.

## Design document model

Content identity is shared; device composition is not.

```text
Project
└── Page
    ├── shared components/content
    └── device layouts
        ├── Desktop
        ├── Laptop
        ├── Tablet
        └── Mobile
```

A component can be moved from the left section to the right section on Mobile without moving it on Desktop. Editing the button label updates the same button across every screen.

## First user test

Give each graphic designer the same task with almost no tutorial:

> Create a landing page for a fictional business. It needs a header, hero, services/features, CTA, FAQ and footer. Add animation where it improves the design. Make Desktop, Tablet and Mobile look good.

Observe:

- time to first component placed;
- first point of confusion;
- whether they discover block splitting naturally;
- whether they understand shared content vs per-screen arrangement;
- whether animation compatibility feels helpful or restrictive;
- whether they can finish without help;
- quality of the actual final output;
- whether they would deliver the result to a client;
- what they try to do that the tool does not yet support.

Do not optimize the MVP from opinions alone. Save the finished designs and inspect the output.
