# AI connection + MCP

AI is optional and intentionally absent from the main Alimango editor menu.

## Product behavior

- First project open may promote ChatGPT / Claude connection once.
- Permanent controls live under **Settings → AI**.
- AI access is off by default.
- Existing project access is off per project by default.
- Read / create / edit permissions are independent.
- Preview and export permissions default off.
- Designers can brainstorm in ChatGPT or Claude, then ask the agent to create an editable Alimango project and return its editor URL.
- Human edits and agent edits use the same semantic project format.
- Remote writes require the revision the agent last read; stale writes fail with `REVISION_CONFLICT`.

## MCP surface

The MCP server exposes constrained semantic design operations, not arbitrary CSS or canvas coordinates:

`create_project`, `list_projects`, `get_project`, `update_branding`, `list_library`, `add_block`, `rename_block`, `set_block_layout`, `move_block`, `add_component`, `update_component`, `move_component`, `remove_component`, `get_compatible_animations`, `apply_animation`, `bind_api`, `validate_design`, `create_preview`, `export_project`.

The same component/animation compatibility registry used by the visual editor is used by MCP. An agent cannot bypass the governed pairing by calling MCP directly.

## MVP authentication boundary

For controlled MVP testing the server creates a revocable capability URL. This is not the final public authentication design. Before broad release move to account identity + OAuth 2.1/PKCE, durable project storage, audit logging, rate limits, explicit connection revocation and proxy/access-log redaction for connection credentials.

## Guide

- Browser guide: `/guide.html`
- GitBook-style Markdown navigation: `docs/SUMMARY.md`
