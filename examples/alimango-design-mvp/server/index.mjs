import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const publicDir = path.join(root, 'public');
const shareDir = path.join(here, 'data', 'shares');
const port = Number(process.env.PORT || 4173);
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const maxBodyBytes = 6 * 1024 * 1024;

await fs.mkdir(shareDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(value));
}

async function bodyJson(req) {
  return await new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function validProject(project) {
  return project && typeof project === 'object' && project.version === 1 &&
    typeof project.id === 'string' && typeof project.name === 'string' &&
    project.branding && Array.isArray(project.pages) && project.pages.length > 0 &&
    project.components && typeof project.components === 'object';
}

async function createShare(req, res) {
  const body = await bodyJson(req);
  if (!validProject(body.project)) return json(res, 400, { error: 'Invalid project document.' });
  const token = crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + sevenDays).toISOString();
  const record = { version: 1, token, createdAt: new Date().toISOString(), expiresAt, project: body.project };
  await fs.writeFile(path.join(shareDir, `${token}.json`), JSON.stringify(record), { flag: 'wx' });
  json(res, 201, { token, expiresAt });
}

async function getShare(token, res) {
  if (!/^[a-f0-9]{16}$/.test(token)) return json(res, 404, { error: 'Preview not found.' });
  const file = path.join(shareDir, `${token}.json`);
  try {
    const record = JSON.parse(await fs.readFile(file, 'utf8'));
    if (Date.parse(record.expiresAt) <= Date.now()) {
      await fs.unlink(file).catch(() => {});
      return json(res, 410, { error: 'This preview has expired.' });
    }
    return json(res, 200, { project: record.project, expiresAt: record.expiresAt });
  } catch (error) {
    if (error.code === 'ENOENT') return json(res, 404, { error: 'Preview not found.' });
    throw error;
  }
}

async function serveFile(req, res, pathname) {
  let requested = pathname === '/' ? '/index.html' : pathname;
  let candidate = path.resolve(publicDir, `.${decodeURIComponent(requested)}`);
  if (!candidate.startsWith(publicDir + path.sep) && candidate !== path.join(publicDir, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }

  try {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) candidate = path.join(candidate, 'index.html');
    const data = await fs.readFile(candidate);
    const ext = path.extname(candidate).toLowerCase();
    res.writeHead(200, {
      'content-type': mime[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin'
    });
    return res.end(data);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const index = await fs.readFile(path.join(publicDir, 'index.html'));
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin'
    });
    res.end(index);
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/shares' && req.method === 'POST') return await createShare(req, res);
    const match = url.pathname.match(/^\/api\/shares\/([a-f0-9]{16})$/);
    if (match && req.method === 'GET') return await getShare(match[1], res);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found.' });
    return await serveFile(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, error.status || 500, { error: error.message || 'Server error.' });
    else res.end();
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Alimango Design MVP running on http://localhost:${port}`);
});
