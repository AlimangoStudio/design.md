import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentStore, handleMcpMessage, newConnectionRecord } from '../server/mcp.mjs';

async function fixture(permissions = { read: true, create: true, edit: true, share: true }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'alimango-mcp-'));
  const store = new AgentStore(dir);
  await store.init();
  const token = 'a'.repeat(32);
  await store.write(newConnectionRecord(token, permissions));
  const call = message => handleMcpMessage({
    message, token, store, baseUrl: 'https://design.example.test',
    createPreview: async () => ({ preview_url: 'https://preview.example.test/p/1', expires_at: '2099-01-01T00:00:00.000Z' })
  });
  return { dir, store, token, call };
}

test('MCP initializes and exposes constrained design tools', async t => {
  const fx = await fixture();
  t.after(() => rm(fx.dir, { recursive: true, force: true }));
  const init = await fx.call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'test-client', version: '1' } } });
  assert.equal(init.result.serverInfo.name, 'alimango-design');
  const listed = await fx.call({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const names = listed.result.tools.map(tool => tool.name);
  assert.ok(names.includes('create_project'));
  assert.ok(names.includes('get_compatible_animations'));
  assert.ok(names.includes('validate_design'));
  assert.ok(!names.includes('set_css'));
});

test('agent can create a project and receives an editor handoff URL', async t => {
  const fx = await fixture();
  t.after(() => rm(fx.dir, { recursive: true, force: true }));
  const response = await fx.call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_project', arguments: { name: 'Cloud brainstorm', brief: 'Premium hotel landing page' } } });
  assert.equal(response.result.isError, false);
  const result = response.result.structuredContent;
  assert.equal(result.revision, 1);
  assert.match(result.editor_url, /^https:\/\/design\.example\.test\/import\/a{32}\//);
  assert.equal(result.project.aiBrief, 'Premium hotel landing page');
});

test('stale agent writes fail with REVISION_CONFLICT', async t => {
  const fx = await fixture();
  t.after(() => rm(fx.dir, { recursive: true, force: true }));
  const created = await fx.call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_project', arguments: { name: 'Revision test' } } });
  const projectId = created.result.structuredContent.project_id;
  const page = created.result.structuredContent.project.pages[0];
  const blockId = page.blockOrderByDevice.desktop[1];
  const first = await fx.call({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'add_block', arguments: { project_id: projectId, expected_revision: 1, name: 'Services' } } });
  assert.equal(first.result.structuredContent.revision, 2);
  const stale = await fx.call({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'add_component', arguments: { project_id: projectId, expected_revision: 1, block_id: blockId, device: 'desktop', section: 0, component: 'button' } } });
  assert.equal(stale.result.isError, true);
  assert.equal(stale.result.structuredContent.error, 'REVISION_CONFLICT');
  assert.equal(stale.result.structuredContent.current_revision, 2);
});

test('incompatible animation is rejected even when requested directly', async t => {
  const fx = await fixture();
  t.after(() => rm(fx.dir, { recursive: true, force: true }));
  const created = await fx.call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_project', arguments: { name: 'Motion test' } } });
  let state = created.result.structuredContent;
  const page = state.project.pages[0];
  const blockId = page.blockOrderByDevice.desktop[1];
  const added = await fx.call({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'add_component', arguments: { project_id: state.project_id, expected_revision: 1, block_id: blockId, device: 'desktop', section: 0, component: 'button' } } });
  state = added.result.structuredContent;
  const componentId = Object.values(state.project.components)[0].id;
  const bad = await fx.call({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'apply_animation', arguments: { project_id: state.project_id, expected_revision: 2, component_id: componentId, device: 'desktop', animation: 'dual-scramble', scope: 'current' } } });
  assert.equal(bad.result.isError, true);
  assert.equal(bad.result.structuredContent.error, 'INCOMPATIBLE_ANIMATION');
});
