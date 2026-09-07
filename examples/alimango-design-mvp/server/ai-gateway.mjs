import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AgentStore, handleMcpMessage, newConnectionRecord, projectEnvelope } from './mcp.mjs';

const maxBodyBytes = 6 * 1024 * 1024;
const sevenDays = 7 * 24 * 60 * 60 * 1000;

export async function createAiGateway({ dataDir, shareDir }) {
  const store = new AgentStore(dataDir);
  await store.init();
  await fs.mkdir(shareDir, { recursive: true });

  return async function aiGateway(req, res, url, baseUrl) {
    if (url.pathname === '/api/agent-connections' && req.method === 'POST') {
      const body = await bodyJson(req);
      const token = crypto.randomBytes(16).toString('hex');
      const record = newConnectionRecord(token, body.permissions || {});
      await store.write(record);
      reply(res, 201, summary(record, baseUrl));
      return true;
    }

    const connection = url.pathname.match(/^\/api\/agent-connections\/([a-f0-9]{32})$/);
    if (connection) {
      const token = connection[1];
      if (req.method === 'GET') {
        const record = await store.read(token);
        if (!record) return handled(reply(res, 404, { error: 'AI connection not found.' }));
        return handled(reply(res, 200, summary(record, baseUrl)));
      }
      if (req.method === 'PATCH') {
        const record = await store.read(token);
        if (!record) return handled(reply(res, 404, { error: 'AI connection not found.' }));
        const body = await bodyJson(req);
        for (const key of ['read', 'create', 'edit', 'share', 'export']) if (body.permissions?.[key] !== undefined) record.permissions[key] = Boolean(body.permissions[key]);
        record.updatedAt = new Date().toISOString();
        await store.write(record);
        return handled(reply(res, 200, summary(record, baseUrl)));
      }
      if (req.method === 'DELETE') {
        await store.remove(token);
        return handled(reply(res, 200, { revoked: true }));
      }
    }

    const projectList = url.pathname.match(/^\/api\/agent-connections\/([a-f0-9]{32})\/projects$/);
    if (projectList && req.method === 'GET') {
      const record = await store.read(projectList[1]);
      if (!record) return handled(reply(res, 404, { error: 'AI connection not found.' }));
      return handled(reply(res, 200, { projects: Object.values(record.projects).map(entry => ({ revision: entry.revision, project: entry.project, updatedAt: entry.updatedAt })) }));
    }

    const project = url.pathname.match(/^\/api\/agent-connections\/([a-f0-9]{32})\/projects\/([^/]+)$/);
    if (project) {
      const token = project[1], projectId = decodeURIComponent(project[2]);
      const record = await store.read(token);
      if (!record) return handled(reply(res, 404, { error: 'AI connection not found.' }));
      if (req.method === 'GET') {
        const entry = record.projects[projectId];
        if (!entry) return handled(reply(res, 404, { error: 'Project not found or not authorized.' }));
        return handled(reply(res, 200, { revision: entry.revision, project: entry.project, updatedAt: entry.updatedAt }));
      }
      if (req.method === 'PUT') {
        const body = await bodyJson(req);
        if (!validProject(body.project) || body.project.id !== projectId) return handled(reply(res, 400, { error: 'Invalid project document.' }));
        const existing = record.projects[projectId];
        if (existing && Number(body.expected_revision) !== Number(existing.revision)) return handled(reply(res, 409, { error: 'REVISION_CONFLICT', current_revision: existing.revision, project: existing.project }));
        const revision = existing ? existing.revision + 1 : 1;
        record.projects[projectId] = projectEnvelope(body.project, revision, 'human');
        await store.write(record);
        return handled(reply(res, existing ? 200 : 201, { revision, project: body.project }));
      }
      if (req.method === 'DELETE') {
        delete record.projects[projectId];
        await store.write(record);
        return handled(reply(res, 200, { removed: true, project_id: projectId }));
      }
    }

    const mcp = url.pathname.match(/^\/mcp\/([a-f0-9]{32})$/);
    if (mcp) {
      if (req.method !== 'POST') return handled(reply(res, 405, { error: 'Use MCP Streamable HTTP POST.' }, { allow: 'POST' }));
      const message = await bodyJson(req);
      const response = await handleMcpMessage({
        message,
        token: mcp[1],
        store,
        baseUrl,
        createPreview: async projectDoc => {
          const result = await createShareRecord(projectDoc, shareDir);
          return { preview_url: `${baseUrl}/preview/${result.token}`, expires_at: result.expiresAt };
        }
      });
      if (response === null) {
        res.writeHead(202, { 'cache-control': 'no-store' }); res.end(); return true;
      }
      reply(res, 200, response, { 'mcp-protocol-version': '2025-06-18' });
      return true;
    }
    return false;
  };
}

function handled() { return true; }
function reply(res, status, value, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  res.end(JSON.stringify(value));
}
function summary(record, baseUrl) {
  return { enabled: true, token: record.token, mcp_url: `${baseUrl}/mcp/${record.token}`, permissions: record.permissions, clients: record.clients || [], projects: Object.values(record.projects || {}).map(entry => ({ id: entry.project.id, name: entry.project.name, revision: entry.revision, updatedAt: entry.updatedAt })) };
}
function validProject(project) {
  return project && project.version === 1 && typeof project.id === 'string' && typeof project.name === 'string' && project.branding && Array.isArray(project.pages) && project.pages.length > 0 && project.components && typeof project.components === 'object';
}
async function createShareRecord(project, shareDir) {
  if (!validProject(project)) throw Object.assign(new Error('Invalid project document.'), { status: 400 });
  const token = crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + sevenDays).toISOString();
  await fs.writeFile(path.join(shareDir, `${token}.json`), JSON.stringify({ version: 1, token, createdAt: new Date().toISOString(), expiresAt, project }), { flag: 'wx' });
  return { token, expiresAt };
}
async function bodyJson(req) {
  return await new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', chunk => { size += chunk.length; if (size > maxBodyBytes) { reject(Object.assign(new Error('Request is too large.'), { status: 413 })); req.destroy(); return; } chunks.push(chunk); });
    req.on('end', () => { try { const text = Buffer.concat(chunks).toString('utf8'); resolve(text ? JSON.parse(text) : {}); } catch { reject(Object.assign(new Error('Invalid JSON.'), { status: 400 })); } });
    req.on('error', reject);
  });
}
