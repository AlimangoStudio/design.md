import { DEVICE_IDS, BLOCK_LAYOUTS, componentDefinition, layoutDefinition } from './library.js';

export const uid = (prefix = 'id') => `${prefix}_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

const now = () => new Date().toISOString();
const clone = value => structuredClone(value);

function deviceMap(factory) {
  return Object.fromEntries(DEVICE_IDS.map(device => [device, factory(device)]));
}

function makeLayout(template = 'one') {
  const count = layoutDefinition(template).columns.length;
  return { template, slots: Array.from({ length: count }, () => []) };
}

function makeBlock(name, kind = 'content') {
  return {
    id: uid('block'),
    name,
    kind,
    layouts: deviceMap(() => makeLayout('one')),
    pageEffectByDevice: deviceMap(() => 'none'),
    style: { background: 'surface', spacing: 'comfortable' }
  };
}

export function makeProject(name = 'Untitled project') {
  const blocks = [
    makeBlock('Header', 'header'),
    makeBlock('Block 1'),
    makeBlock('Block 2'),
    makeBlock('Block 3'),
    makeBlock('Block 4'),
    makeBlock('Footer', 'footer')
  ];
  const blockMap = Object.fromEntries(blocks.map(block => [block.id, block]));
  const blockIds = blocks.map(block => block.id);
  const page = {
    id: uid('page'),
    name: 'Home',
    blocks: blockMap,
    blockOrderByDevice: deviceMap(() => [...blockIds])
  };
  return {
    version: 1,
    id: uid('project'),
    name: name.trim() || 'Untitled project',
    createdAt: now(),
    updatedAt: now(),
    branding: {
      logo: '',
      colors: {
        primary: '#7c5ce7',
        accent: '#b89cff',
        background: '#ffffff',
        surface: '#f6f3ff',
        text: '#1f1d29',
        muted: '#6f6b7c'
      },
      headingFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
      bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif'
    },
    pages: [page],
    pageId: page.id,
    components: {}
  };
}

export function currentPage(project) {
  return project.pages.find(page => page.id === project.pageId) || project.pages[0];
}

export function touchProject(project) {
  project.updatedAt = now();
  return project;
}

export function addBlock(project, name) {
  const page = currentPage(project);
  const block = makeBlock(name || `Block ${Object.keys(page.blocks).length - 1}`);
  page.blocks[block.id] = block;
  for (const device of DEVICE_IDS) page.blockOrderByDevice[device].splice(-1, 0, block.id);
  return touchProject(project), block;
}

export function renameBlock(project, blockId, name) {
  const block = currentPage(project).blocks[blockId];
  if (!block) return;
  block.name = (name || '').trim() || block.name;
  touchProject(project);
}

export function setBlockLayout(project, blockId, device, template) {
  const block = currentPage(project).blocks[blockId];
  if (!block || !DEVICE_IDS.includes(device) || !BLOCK_LAYOUTS.some(item => item.id === template)) return;
  const existing = block.layouts[device].slots.flat();
  const next = makeLayout(template);
  existing.forEach((componentId, index) => next.slots[Math.min(index, next.slots.length - 1)].push(componentId));
  block.layouts[device] = next;
  touchProject(project);
}

export function setBlockEffect(project, blockId, device, effectId) {
  const block = currentPage(project).blocks[blockId];
  if (!block || !DEVICE_IDS.includes(device)) return;
  block.pageEffectByDevice[device] = effectId;
  touchProject(project);
}

export function moveBlock(project, blockId, device, delta) {
  const page = currentPage(project);
  const order = page.blockOrderByDevice[device];
  const index = order.indexOf(blockId);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= order.length) return;
  [order[index], order[next]] = [order[next], order[index]];
  touchProject(project);
}

export function removeBlock(project, blockId) {
  const page = currentPage(project);
  const block = page.blocks[blockId];
  if (!block || block.kind === 'header' || block.kind === 'footer') return false;
  const ids = new Set(DEVICE_IDS.flatMap(device => block.layouts[device].slots.flat()));
  delete page.blocks[blockId];
  for (const device of DEVICE_IDS) page.blockOrderByDevice[device] = page.blockOrderByDevice[device].filter(id => id !== blockId);
  for (const componentId of ids) {
    const stillUsed = Object.values(page.blocks).some(other => DEVICE_IDS.some(device => other.layouts[device].slots.some(slot => slot.includes(componentId))));
    if (!stillUsed) delete project.components[componentId];
  }
  touchProject(project);
  return true;
}

export function addComponent(project, blockId, device, slotIndex, type) {
  const page = currentPage(project);
  const block = page.blocks[blockId];
  const definition = componentDefinition(type);
  if (!block || !definition) return null;
  const component = {
    id: uid('component'),
    type,
    content: clone(definition.defaults),
    style: { variant: 'default' },
    animationByDevice: deviceMap(() => null)
  };
  project.components[component.id] = component;

  for (const target of DEVICE_IDS) {
    const slots = block.layouts[target].slots;
    const index = Math.max(0, Math.min(slotIndex, slots.length - 1));
    slots[index].push(component.id);
  }
  touchProject(project);
  return component;
}

export function moveComponent(project, componentId, blockId, device, targetSlot) {
  const page = currentPage(project);
  const block = page.blocks[blockId];
  if (!block || !project.components[componentId]) return false;
  for (const pageBlock of Object.values(page.blocks)) {
    for (const slot of pageBlock.layouts[device].slots) {
      const index = slot.indexOf(componentId);
      if (index >= 0) slot.splice(index, 1);
    }
  }
  const slots = block.layouts[device].slots;
  slots[Math.max(0, Math.min(targetSlot, slots.length - 1))].push(componentId);
  touchProject(project);
  return true;
}

export function removeComponent(project, componentId) {
  const page = currentPage(project);
  for (const block of Object.values(page.blocks)) {
    for (const device of DEVICE_IDS) {
      block.layouts[device].slots = block.layouts[device].slots.map(slot => slot.filter(id => id !== componentId));
    }
  }
  delete project.components[componentId];
  touchProject(project);
}

export function updateComponentContent(project, componentId, patch) {
  const component = project.components[componentId];
  if (!component) return;
  component.content = { ...component.content, ...patch };
  touchProject(project);
}

export function setComponentAnimation(project, componentId, device, animationId, scope = 'all') {
  const component = project.components[componentId];
  if (!component) return;
  if (scope === 'all') {
    for (const id of DEVICE_IDS) component.animationByDevice[id] = animationId || null;
  } else {
    component.animationByDevice[device] = animationId || null;
  }
  touchProject(project);
}

export function setTypography(project, preset) {
  project.branding.headingFont = preset.heading;
  project.branding.bodyFont = preset.body;
  touchProject(project);
}

export function validateProject(project) {
  if (!project || project.version !== 1) throw new Error('Unsupported project document.');
  if (!Array.isArray(project.pages) || !project.pages.length) throw new Error('Project needs at least one page.');
  if (!project.branding || !project.components) throw new Error('Project is incomplete.');
  const ids = new Set(Object.keys(project.components));
  for (const page of project.pages) {
    for (const block of Object.values(page.blocks || {})) {
      for (const device of DEVICE_IDS) {
        const layout = block.layouts?.[device];
        if (!layout || !Array.isArray(layout.slots)) throw new Error(`Missing ${device} block layout.`);
        for (const componentId of layout.slots.flat()) if (!ids.has(componentId)) throw new Error('Block references a missing component.');
      }
    }
  }
  return true;
}
