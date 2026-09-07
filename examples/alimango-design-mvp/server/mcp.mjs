import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  makeProject,
  currentPage,
  addBlock,
  renameBlock,
  setBlockLayout,
  moveBlock,
  addComponent,
  moveComponent,
  removeComponent,
  updateComponentContent,
  setComponentAnimation,
  validateProject,
  touchProject
} from '../public/js/model.js';
import { exportFiles } from '../public/js/generators.js';
import {
  COMPONENTS,
  BLOCK_LAYOUTS,
  DEVICES,
  ANIMATIONS,
  animationsForComponent,
  isAnimationCompatible
} from '../public/js/library.js';

const clone = value => structuredClone(value);
const now = () => new Date().toISOString();

export const MCP_PROTOCOL_VERSION = '2025-06-18';

export const MCP_TOOLS = [
  tool('create_project', 'Create a new editable Alimango design project from a brief.', {
    name: stringProp('Project name'),
    brief: stringProp('Optional structured or plain-English project brief')
  }, ['name']),
  tool('list_projects', 'List projects this AI connection is explicitly allowed to access.', {}),
  tool('get_project', 'Read the full semantic Alimango design document and current revision.', {
    project_id: stringProp('Project ID')
  }, ['project_id']),
  tool('update_branding', 'Update project branding. Only supplied fields are changed.', {
    project_id: stringProp('Project ID'),
    expected_revision: numberProp('Revision returned by the previous read'),
    primary: stringProp('Primary hex color'), accent: stringProp('Accent hex color'),
    background: stringProp('Background hex color'), surface: stringProp('Surface hex color'),
    text: stringProp('Text hex color'), muted: stringProp('Muted text hex color'),
    heading_font: stringProp('Heading font stack'), body_font: stringProp('Body font stack')
  }, ['project_id', 'expected_revision']),
  tool('list_library', 'List available components, block layouts, devices and governed animations.', {}),
  tool('add_block', 'Add a block before the footer on every device.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), name: stringProp('Plain-English block name')
  }, ['project_id', 'expected_revision', 'name']),
  tool('rename_block', 'Rename a block.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), block_id: stringProp('Block ID'), name: stringProp('New name')
  }, ['project_id', 'expected_revision', 'block_id', 'name']),
  tool('set_block_layout', 'Choose a simple section split for one device only.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), block_id: stringProp('Block ID'),
    device: enumProp(['desktop', 'laptop', 'tablet', 'mobile']), layout: enumProp(BLOCK_LAYOUTS.map(item => item.id))
  }, ['project_id', 'expected_revision', 'block_id', 'device', 'layout']),
  tool('move_block', 'Move a block up or down on one device only.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), block_id: stringProp('Block ID'),
    device: enumProp(['desktop', 'laptop', 'tablet', 'mobile']), direction: enumProp(['up', 'down'])
  }, ['project_id', 'expected_revision', 'block_id', 'device', 'direction']),
  tool('add_component', 'Add a governed component. New component identity/content propagates to every device initially.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), block_id: stringProp('Block ID'),
    device: enumProp(['desktop', 'laptop', 'tablet', 'mobile']), section: numberProp('Zero-based section index'),
    component: enumProp(COMPONENTS.map(item => item.id))
  }, ['project_id', 'expected_revision', 'block_id', 'device', 'section', 'component']),
  tool('update_component', 'Update shared component content. Content changes are visible on every device.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), component_id: stringProp('Component ID'),
    content: { type: 'object', description: 'Fields to merge into component content', additionalProperties: true }
  }, ['project_id', 'expected_revision', 'component_id', 'content']),
  tool('move_component', 'Move an existing component on one device without changing its placement on other devices.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), component_id: stringProp('Component ID'),
    block_id: stringProp('Target block ID'), device: enumProp(['desktop', 'laptop', 'tablet', 'mobile']), section: numberProp('Zero-based target section')
  }, ['project_id', 'expected_revision', 'component_id', 'block_id', 'device', 'section']),
  tool('remove_component', 'Remove a component from the project.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), component_id: stringProp('Component ID')
  }, ['project_id', 'expected_revision', 'component_id']),
  tool('get_compatible_animations', 'Return only recommended and allowed animations for a component.', {
    project_id: stringProp('Project ID'), component_id: stringProp('Component ID')
  }, ['project_id', 'component_id']),
  tool('apply_animation', 'Apply a governed compatible animation. Incompatible pairings are rejected.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), component_id: stringProp('Component ID'),
    device: enumProp(['desktop', 'laptop', 'tablet', 'mobile']), animation: stringProp('Animation ID'), scope: enumProp(['all', 'current'])
  }, ['project_id', 'expected_revision', 'component_id', 'device', 'animation']),
  tool('bind_api', 'Bind a Form component to an API endpoint and HTTP method.', {
    project_id: stringProp('Project ID'), expected_revision: numberProp('Current revision'), component_id: stringProp('Form component ID'),
    endpoint: stringProp('API endpoint path'), method: enumProp(['POST', 'PUT', 'PATCH'])
  }, ['project_id', 'expected_revision', 'component_id', 'endpoint', 'method']),
  tool('validate_design', 'Validate semantic integrity and return design-quality warnings before handoff.', {
    project_id: stringProp('Project ID')
  }, ['project_id']),
  tool('create_preview', 'Create an expiring read-only client preview URL when share permission is enabled.', {
    project_id: stringProp('Project ID')
  }, ['project_id']),
  tool('export_project', 'Return a target-specific handoff file map when export permission is enabled.', {
    project_id: stringProp('Project ID'), target: enumProp(['html', 'react', 'vue', 'react-native', 'android'])
  }, ['project_id', 'target'])
];

function tool(name, description, properties, required = []) {
  return { name, description, inputSchema: { type: 'object', properties, required, additionalProperties: false } };
}
function stringProp(description) { return { type: 'string', description }; }
function numberProp(description) { return { type: 'integer', minimum: 0, description }; }
function enumProp(values) { return { type: 'string', enum: values }; }

export class AgentStore {
  constructor(directory) { this.directory = directory; }
  async init() { await fs.mkdir(this.directory, { recursive: true }); }
  file(token) { return path.join(this.directory, `${token}.json`); }
  async read(token) {
    if (!/^[a-f0-9]{32}$/.test(token)) return null;
    try { return JSON.parse(await fs.readFile(this.file(token), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async write(record) {
    await this.init();
    await fs.writeFile(this.file(record.token), JSON.stringify(record, null, 2));
    return record;
  }
  async remove(token) { await fs.unlink(this.file(token)).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

export function newConnectionRecord(token, permissions = {}) {
  return {
    version: 1,
    token,
    createdAt: now(),
    updatedAt: now(),
    lastSeenAt: null,
    permissions: {
      read: permissions.read !== false,
      create: permissions.create !== false,
      edit: permissions.edit !== false,
      share: permissions.share === true,
      export: permissions.export === true
    },
    clients: [],
    projects: {}
  };
}

export function projectEnvelope(project, revision = 1, source = 'human') {
  return { project: clone(project), revision, source, updatedAt: now() };
}

export async function handleMcpMessage({ message, token, store, baseUrl, createPreview }) {
  const record = await store.read(token);
  if (!record) return rpcError(message?.id ?? null, -32001, 'AI connection is invalid or has been revoked.');

  if (message?.method === 'initialize') {
    record.lastSeenAt = now();
    const client = message.params?.clientInfo;
    if (client?.name) {
      const key = `${client.name}:${client.version || ''}`;
      const existing = record.clients.find(item => item.key === key);
      if (existing) existing.lastSeenAt = now();
      else record.clients.push({ key, name: client.name, version: client.version || '', firstSeenAt: now(), lastSeenAt: now() });
      record.clients = record.clients.slice(-10);
    }
    await store.write(record);
    return rpcResult(message.id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: 'alimango-design', version: '0.1.0' },
      instructions: 'Brainstorm in your AI client, then create or edit semantic Alimango projects. Use plain-English Blocks and Sections; always validate before handoff.'
    });
  }
  if (message?.method === 'notifications/initialized') return null;
  if (message?.method === 'ping') return rpcResult(message.id, {});
  if (message?.method === 'tools/list') return rpcResult(message.id, { tools: MCP_TOOLS });
  if (message?.method === 'resources/list') {
    requirePermission(record, 'read');
    return rpcResult(message.id, { resources: Object.values(record.projects).map(entry => ({ uri: `alimango://project/${entry.project.id}`, name: entry.project.name, mimeType: 'application/json', description: `Editable Alimango project, revision ${entry.revision}` })) });
  }
  if (message?.method === 'resources/read') {
    requirePermission(record, 'read');
    const match = String(message.params?.uri || '').match(/^alimango:\/\/project\/(.+)$/);
    const entry = match ? record.projects[match[1]] : null;
    if (!entry) return rpcError(message.id, -32004, 'Project not found or not authorized.');
    return rpcResult(message.id, { contents: [{ uri: message.params.uri, mimeType: 'application/json', text: JSON.stringify({ revision: entry.revision, project: entry.project }, null, 2) }] });
  }
  if (message?.method === 'tools/call') {
    try {
      const result = await callTool({ record, name: message.params?.name, args: message.params?.arguments || {}, baseUrl, createPreview });
      record.updatedAt = now();
      await store.write(record);
      return rpcResult(message.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
    } catch (error) {
      const payload = { error: error.code || 'TOOL_ERROR', message: error.message, ...(error.details || {}) };
      return rpcResult(message.id, { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload, isError: true });
    }
  }
  return rpcError(message?.id ?? null, -32601, 'Method not found.');
}

async function callTool({ record, name, args, baseUrl, createPreview }) {
  if (name === 'list_library') {
    requirePermission(record, 'read');
    return {
      hierarchy: ['Project', 'Page', 'Block', 'Section', 'Component', 'Animation'],
      devices: DEVICES,
      block_layouts: BLOCK_LAYOUTS,
      components: COMPONENTS.map(({ id, label, group, recommended, allowed }) => ({ id, label, group, recommended_animations: recommended, allowed_animations: allowed })),
      animations: ANIMATIONS
    };
  }
  if (name === 'create_project') {
    requirePermission(record, 'create');
    const project = makeProject(args.name || 'Untitled project');
    project.aiBrief = typeof args.brief === 'string' ? args.brief.slice(0, 20000) : '';
    const entry = projectEnvelope(project, 1, 'agent');
    record.projects[project.id] = entry;
    return projectResult(entry, record.token, baseUrl);
  }
  if (name === 'list_projects') {
    requirePermission(record, 'read');
    return { projects: Object.values(record.projects).map(entry => ({ id: entry.project.id, name: entry.project.name, revision: entry.revision, updated_at: entry.updatedAt, editor_url: editorUrl(baseUrl, record.token, entry.project.id) })) };
  }

  const entry = record.projects[args.project_id];
  if (!entry) throw toolError('PROJECT_NOT_FOUND', 'Project not found or not authorized for this connection.');

  if (name === 'get_project') {
    requirePermission(record, 'read');
    return projectResult(entry, record.token, baseUrl);
  }
  if (name === 'get_compatible_animations') {
    requirePermission(record, 'read');
    const component = entry.project.components[args.component_id];
    if (!component) throw toolError('COMPONENT_NOT_FOUND', 'Component not found.');
    return { component_id: component.id, component_type: component.type, ...animationsForComponent(component.type) };
  }
  if (name === 'validate_design') {
    requirePermission(record, 'read');
    return validateDesign(entry.project, entry.revision);
  }
  if (name === 'create_preview') {
    requirePermission(record, 'share');
    const result = await createPreview(entry.project);
    return { project_id: entry.project.id, revision: entry.revision, ...result };
  }
  if (name === 'export_project') {
    requirePermission(record, 'export');
    return { project_id: entry.project.id, revision: entry.revision, target: args.target, files: exportFiles(entry.project, args.target) };
  }

  requirePermission(record, 'edit');
  assertRevision(entry, args.expected_revision);
  const project = entry.project;
  const page = currentPage(project);

  if (name === 'update_branding') {
    const map = { primary: 'primary', accent: 'accent', background: 'background', surface: 'surface', text: 'text', muted: 'muted' };
    for (const [arg, key] of Object.entries(map)) if (args[arg] !== undefined) project.branding.colors[key] = String(args[arg]);
    if (args.heading_font !== undefined) project.branding.headingFont = String(args.heading_font);
    if (args.body_font !== undefined) project.branding.bodyFont = String(args.body_font);
    touchProject(project);
  } else if (name === 'add_block') {
    addBlock(project, args.name);
  } else if (name === 'rename_block') {
    if (!page.blocks[args.block_id]) throw toolError('BLOCK_NOT_FOUND', 'Block not found.');
    renameBlock(project, args.block_id, args.name);
  } else if (name === 'set_block_layout') {
    if (!page.blocks[args.block_id]) throw toolError('BLOCK_NOT_FOUND', 'Block not found.');
    setBlockLayout(project, args.block_id, args.device, args.layout);
  } else if (name === 'move_block') {
    if (!page.blocks[args.block_id]) throw toolError('BLOCK_NOT_FOUND', 'Block not found.');
    moveBlock(project, args.block_id, args.device, args.direction === 'up' ? -1 : 1);
  } else if (name === 'add_component') {
    const component = addComponent(project, args.block_id, args.device, Number(args.section || 0), args.component);
    if (!component) throw toolError('ADD_COMPONENT_FAILED', 'Component or block is invalid.');
  } else if (name === 'update_component') {
    if (!project.components[args.component_id]) throw toolError('COMPONENT_NOT_FOUND', 'Component not found.');
    updateComponentContent(project, args.component_id, args.content || {});
  } else if (name === 'move_component') {
    if (!moveComponent(project, args.component_id, args.block_id, args.device, Number(args.section || 0))) throw toolError('MOVE_COMPONENT_FAILED', 'Component or target block is invalid.');
  } else if (name === 'remove_component') {
    if (!project.components[args.component_id]) throw toolError('COMPONENT_NOT_FOUND', 'Component not found.');
    removeComponent(project, args.component_id);
  } else if (name === 'apply_animation') {
    const component = project.components[args.component_id];
    if (!component) throw toolError('COMPONENT_NOT_FOUND', 'Component not found.');
    if (!isAnimationCompatible(component.type, args.animation)) throw toolError('INCOMPATIBLE_ANIMATION', `Animation ${args.animation} is not approved for ${component.type}.`, { compatible: animationsForComponent(component.type) });
    setComponentAnimation(project, component.id, args.device, args.animation, args.scope || 'all');
  } else if (name === 'bind_api') {
    const component = project.components[args.component_id];
    if (!component || component.type !== 'form') throw toolError('FORM_REQUIRED', 'bind_api requires a Form component.');
    updateComponentContent(project, component.id, { endpoint: args.endpoint, method: args.method });
  } else {
    throw toolError('UNKNOWN_TOOL', `Unknown tool: ${name}`);
  }

  validateProject(project);
  entry.revision += 1;
  entry.updatedAt = now();
  entry.source = 'agent';
  return projectResult(entry, record.token, baseUrl);
}

export function validateDesign(project, revision = 0) {
  const warnings = [];
  const errors = [];
  try { validateProject(project); } catch (error) { errors.push(error.message); }
  for (const component of Object.values(project.components || {})) {
    for (const [device, animation] of Object.entries(component.animationByDevice || {})) {
      if (animation && !isAnimationCompatible(component.type, animation)) errors.push(`${component.id}: ${animation} is not compatible with ${component.type} on ${device}.`);
    }
    if (component.type === 'form' && !component.content?.endpoint) warnings.push(`${component.id}: form has no API endpoint.`);
    if (component.type === 'image' && !component.content?.alt) warnings.push(`${component.id}: image needs alt text.`);
  }
  const page = currentPage(project);
  for (const device of ['desktop', 'laptop', 'tablet', 'mobile']) {
    const order = page.blockOrderByDevice?.[device] || [];
    if (!order.length) errors.push(`${device}: no blocks.`);
    if (device === 'mobile') {
      for (const blockId of order) {
        const block = page.blocks[blockId];
        if (block?.layouts?.mobile?.slots?.length > 2) warnings.push(`${block.name}: three-column mobile layout may need designer review.`);
      }
    }
  }
  return { status: errors.length ? 'FAIL' : warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS', revision, errors, warnings };
}

function projectResult(entry, token, baseUrl) {
  return {
    project_id: entry.project.id,
    name: entry.project.name,
    revision: entry.revision,
    project: entry.project,
    editor_url: editorUrl(baseUrl, token, entry.project.id)
  };
}
function editorUrl(baseUrl, token, projectId) { return `${String(baseUrl).replace(/\/$/, '')}/import/${token}/${encodeURIComponent(projectId)}`; }
function assertRevision(entry, expected) {
  if (Number(expected) !== Number(entry.revision)) throw toolError('REVISION_CONFLICT', `Project changed since revision ${expected}. Read it again before editing.`, { expected_revision: Number(expected), current_revision: entry.revision });
}
function requirePermission(record, permission) {
  if (!record.permissions?.[permission]) throw toolError('PERMISSION_DENIED', `${permission} permission is disabled in Alimango Settings.`);
}
function toolError(code, message, details = {}) { const error = new Error(message); error.code = code; error.details = details; return error; }
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message, data) { return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } }; }
