# Agent apply instructions — no PR

This artifact is intentionally a **standalone new application patch**. Do not put it in PAPPS, Alimango One, Marketing, Tower, or the governance repository.

## Goal

Create a new repository and URL for the Alimango Design Platform MVP, then copy/apply this source exactly as a starting point.

## Required behavior before deployment

1. Keep the app separate from all existing Alimango/Pilar repositories.
2. Do not rename user-facing concepts to Figma terminology.
3. User-facing hierarchy must remain: Project → Page → Block → Section → Component → Animation.
4. Preserve project-level Branding.
5. Preserve Desktop/Laptop/Tablet/Mobile workspaces.
6. Content/component identity is shared across screens; layout is device-specific.
7. A new component is propagated to all device workspaces initially.
8. Moving/rearranging a component affects only the active device.
9. Animation choices must remain compatibility-constrained.
10. Do not expose arbitrary animation-to-component pairing in the normal UI.
11. Temporary preview links must not expose editor controls.
12. Handoff ZIP must always include `alimango-design.json`.
13. Keep AI optional and only under Settings; no AI item belongs in the main editor menu.
14. Existing projects must stay private until explicitly shared with the AI connection.
15. Preserve revision checks for remote writes and the governed animation compatibility gate.
16. Run tests before deploy.

## Local validation

```bash
node --check server/index.mjs
node --check server/ai-gateway.mjs
node --check server/mcp.mjs
node --check public/js/ai-settings.js
node --check public/js/app.js
node --check public/js/model.js
node --check public/js/library.js
node --check public/js/generators.js
node --check public/js/zip.js
node --test tests/*.test.mjs
node server/index.mjs
```

Then verify manually:

- create project;
- change branding and reload;
- split Block 1 on Desktop;
- add a Heading and Button;
- switch to Mobile and confirm both components exist;
- move Button to a different Mobile section;
- return to Desktop and confirm Desktop arrangement did not change;
- edit button label and confirm the label changes on every screen;
- select Button → Animations and confirm only button-compatible animations appear;
- apply Hover Lift;
- create a temporary preview URL and open it in a separate browser/private window;
- download HTML handoff ZIP;
- repeat export for React, Vue, React Native and Android;
- confirm the first-project AI prompt can be dismissed and does not reappear;
- open Settings → AI, enable a connection, verify ChatGPT/Claude guided setup, and confirm existing projects default to not shared;
- create a project through MCP and open its returned editor URL;
- verify a stale remote write returns `REVISION_CONFLICT`;
- verify an incompatible animation request returns `INCOMPATIBLE_ANIMATION`;
- revoke the AI connection and confirm the old MCP address no longer works.

## Production deployment notes

The included Node server is intentionally minimal for MVP testing. Before public-scale use:

- move share records to durable database/object storage;
- rate-limit share creation and reads;
- set body/request limits at reverse proxy too;
- add account/auth ownership before persistent cloud projects;
- add explicit share revocation;
- add CSP and deployment-specific security headers;
- store uploaded brand/media assets separately instead of large data URLs;
- define retention policy for temporary previews.

Do **not** expand into collaboration, advanced vector drawing, an embedded AI chat panel, or broader autonomous generation before collecting first-user feedback unless required to fix a blocker. The optional external ChatGPT/Claude connection and governed MCP handoff in this MVP are intentional scope.
