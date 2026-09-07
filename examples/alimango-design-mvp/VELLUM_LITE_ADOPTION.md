# Vellum-lite adoption record

## Parent review

This change is stacked on **AlimangoStudio/design.md#1** (`alimango-design-mvp`). It must not be merged independently of that parent review.

## Donor reviewed

- Repository: `wieslawsoltes/Vellum`
- Reviewed upstream `main` tree: `2f569049253edc34c5d11ce31ba16d7ba349df85`
- License: MIT
- Relevant reference areas: serializable document geometry, affine transforms, bounds/hit testing, bounded undo/redo.

## What was adopted

Only the small interaction primitives required for an Alimango-owned spatial editing core were reimplemented as first-party code:

- affine transform composition/inversion;
- local/world point conversion;
- rotated bounds and rectangle hit testing;
- bounded move/resize/rotation helpers;
- bounded snapshot undo/redo.

No Vellum application, renderer, UI, assets, build scripts, test fixtures, Python tooling, package metadata, or deployment workflow is vendored or required at runtime.

## Dependency and network boundary

`public/js/spatial-core.js` has:

- no package import;
- no CDN/remote asset;
- no `fetch`, XHR, WebSocket or EventSource;
- no dynamic import or executable expression;
- no process/child-process execution;
- no DOM, persistence or renderer authority.

The Design MVP remains zero-runtime-dependency.

## Pre-PR security review

A supply-chain/malware-oriented static review was performed before opening the PR:

- donor search found no `child_process` or WebSocket use;
- no runtime `fetch()` path was identified in the reviewed Vellum editor source;
- authored production module was checked for `eval`, Function construction, remote/network APIs, dynamic import, process execution and HTTP/CDN references: no matches;
- no upstream binary, sample media, generated artifact or install script is included.

This is a source-level review, not a claim that a source scan replaces host antivirus or the repository's governed adversarial review.

## Validation

The authored module was executed with Node's built-in test runner before PR creation: **5 passed / 0 failed**.

Required before merge: rerun the Design parent exact-HEAD tests plus the normal governance/security/adversarial review after the parent PR converges.
