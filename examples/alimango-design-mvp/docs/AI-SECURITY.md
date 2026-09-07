# Security and revisions

Remote project writes are revision-checked. An agent must provide the revision it last read. A stale write receives `REVISION_CONFLICT` instead of silently overwriting newer human changes.

The MVP uses a revocable capability URL to make first-user testing easy. Before broad production use, replace this with authenticated accounts and OAuth 2.1 / PKCE, durable project storage, audit logs, explicit connection revocation, server-side rate limits and secret redaction from request logs.
