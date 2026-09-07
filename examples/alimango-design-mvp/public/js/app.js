import { DEVICES, DEVICE_IDS, COMPONENTS, BLOCK_LAYOUTS, PAGE_EFFECTS, TYPOGRAPHY_PRESETS, animationsForComponent, isAnimationCompatible, componentDefinition, animationDefinition, layoutDefinition } from './library.js';
import { makeProject, currentPage, touchProject, addBlock, renameBlock, setBlockLayout, setBlockEffect, moveBlock, removeBlock, addComponent, moveComponent, removeComponent, updateComponentContent, setComponentAnimation, setTypography, validateProject } from './model.js';
import { exportFiles } from './generators.js';
import { downloadZip } from './zip.js';

const root = document.querySelector('#app');
const storageKey = 'alimango-design-projects-v1';
const state = {
  projects: loadProjects(), project: null, activeDevice: 'desktop', leftTab: 'components',
  selectedBlockId: null, selectedComponentId: null, compare: false, animationScope: 'all', modal: null, toast: ''
};

function loadProjects() {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
}

function saveProjects() {
  if (state.project) {
    touchProject(state.project);
    state.projects[state.project.id] = state.project;
  }
  localStorage.setItem(storageKey, JSON.stringify(state.projects));
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
const device = id => DEVICES.find(item => item.id === id) || DEVICES[0];
const selectedComponent = () => state.project?.components?.[state.selectedComponentId] || null;
const selectedBlock = () => state.project ? currentPage(state.project).blocks[state.selectedBlockId] : null;

function toast(message) {
  state.toast = message;
  render();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { state.toast = ''; render(); }, 2200);
}

function navigate(path) {
  history.pushState({}, '', path);
  route();
}

window.addEventListener('popstate', route);

function route() {
  const preview = location.pathname.match(/^\/preview\/([a-f0-9]{16})$/);
  if (preview) return renderSharedPreview(preview[1]);
  const editor = location.pathname.match(/^\/editor\/([^/]+)$/);
  if (editor) {
    const project = state.projects[decodeURIComponent(editor[1])];
    if (project) {
      state.project = project;
      state.selectedBlockId ||= currentPage(project).blockOrderByDevice[state.activeDevice][1];
      return render();
    }
  }
  state.project = null;
  render();
}

function createProjectFlow() {
  state.modal = { type: 'create' };
  render();
  setTimeout(() => document.querySelector('#new-project-name')?.focus(), 0);
}

function createProjectFromModal() {
  const name = document.querySelector('#new-project-name')?.value || 'Untitled project';
  const project = makeProject(name);
  state.projects[project.id] = project;
  state.project = project;
  state.modal = null;
  saveProjects();
  navigate(`/editor/${encodeURIComponent(project.id)}`);
}

function brandStyle(project) {
  const b = project.branding;
  return `--project-primary:${b.colors.primary};--project-accent:${b.colors.accent};--project-bg:${b.colors.background};--project-surface:${b.colors.surface};--project-text:${b.colors.text};--project-muted:${b.colors.muted};--heading-font:${b.headingFont};--body-font:${b.bodyFont};`;
}

function topBar() {
  return `<header class="topbar">
    <button class="quiet-button" data-action="home" aria-label="Back to projects">←</button>
    <div class="brandmark"><span class="mark">A</span><span>alimango</span></div>
    <span class="crumb">/ ${esc(state.project.name)}</span><span class="save-dot">● Saved locally</span>
    <div class="top-spacer"></div>
    <div class="device-tabs">${DEVICES.map(item => `<button class="device-tab ${!state.compare && state.activeDevice === item.id ? 'active' : ''}" data-device="${item.id}">${item.icon} ${item.label}</button>`).join('')}</div>
    <button class="quiet-button ${state.compare ? 'active' : ''}" data-action="compare">Compare</button>
    <button class="quiet-button" data-action="share">Share</button>
    <button class="primary-button" data-action="export">Export</button>
  </header>`;
}

const menuItems = [
  ['branding', '◈', 'Branding'],
  ['components', '▦', 'Components'],
  ['typography', 'Aa', 'Typography'],
  ['animations', '✦', 'Animations'],
  ['effects', '↕', 'Page effects']
];

function leftPanel() {
  return `<aside class="side-panel left">
    <div class="side-title">Project</div>
    <div class="menu-list">${menuItems.map(([id, icon, label]) => `<button class="menu-button ${state.leftTab === id ? 'active' : ''}" data-left-tab="${id}"><span>${icon}</span>${label}</button>`).join('')}</div>
    <div class="panel-content">${leftContent()}</div>
  </aside>`;
}

function leftContent() {
  if (state.leftTab === 'branding') return brandingPanel();
  if (state.leftTab === 'components') return componentsPanel();
  if (state.leftTab === 'typography') return typographyPanel();
  if (state.leftTab === 'animations') return animationsPanel();
  if (state.leftTab === 'effects') return effectsPanel();
  return '';
}

function brandingPanel() {
  const b = state.project.branding;
  const colors = Object.entries(b.colors).map(([key, value]) => `<div class="field"><label>${key[0].toUpperCase() + key.slice(1)}</label><div class="color-row"><input data-brand-color-text="${key}" value="${esc(value)}"><input type="color" data-brand-color="${key}" value="${esc(value)}"></div></div>`).join('');
  return `<h2 class="panel-heading">Branding</h2><p class="panel-copy">Set the visual identity once. New components use it automatically.</p>
    <div class="brand-preview" style="${brandStyle(state.project)}">${b.logo ? `<img src="${b.logo}" alt="Logo" style="max-height:48px;max-width:160px">` : esc(state.project.name)}</div>
    <div class="field brand-logo-upload"><label>Logo</label>${b.logo ? `<img src="${b.logo}" alt="Current logo">` : ''}<input type="file" id="brand-logo" accept="image/png,image/jpeg,image/webp"></div>
    ${colors}
    <div class="field"><label>Heading font</label><input data-brand-font="headingFont" value="${esc(b.headingFont)}"></div>
    <div class="field"><label>Body font</label><input data-brand-font="bodyFont" value="${esc(b.bodyFont)}"></div>`;
}

function componentsPanel() {
  const groups = [...new Set(COMPONENTS.map(item => item.group))];
  return `<h2 class="panel-heading">Components</h2><p class="panel-copy">Drag a finished part into a section. Click also works after you select a block.</p>${groups.map(group => `<div class="group-title">${group}</div><div class="library-grid">${COMPONENTS.filter(item => item.group === group).map(item => `<button class="library-item" draggable="true" data-component-type="${item.id}"><span class="library-icon">${item.icon}</span><span class="library-label">${item.label}</span></button>`).join('')}</div>`).join('')}`;
}

function typographyPanel() {
  return `<h2 class="panel-heading">Typography</h2><p class="panel-copy">Apply a complete heading + body pairing to the project.</p>${TYPOGRAPHY_PRESETS.map(preset => `<button class="type-card" data-type-preset="${preset.id}"><strong style="font-family:${preset.heading}">${preset.label}</strong><span style="font-family:${preset.body}">Heading and body pairing</span></button>`).join('')}`;
}

function animationsPanel() {
  const component = selectedComponent();
  if (!component) return `<h2 class="panel-heading">Animations</h2><div class="empty-state"><div><strong>Select a component</strong><p class="panel-copy">Then we show only animations that suit it.</p></div></div>`;
  const { recommended, allowed } = animationsForComponent(component.type);
  const renderItems = list => list.map(item => `<button class="animation-item" draggable="true" data-animation="${item.id}"><strong>${item.label}</strong><span>${item.description}</span></button>`).join('');
  return `<h2 class="panel-heading">Animations for ${esc(componentDefinition(component.type)?.label || component.type)}</h2><p class="panel-copy">Drag one onto the selected component. Incompatible effects are not offered.</p><div class="scope-row"><input id="scope-current" type="checkbox" ${state.animationScope === 'current' ? 'checked' : ''}><label for="scope-current">This screen only</label></div><div class="group-title">Recommended</div>${renderItems(recommended)}<div class="group-title">Also works</div>${renderItems(allowed)}`;
}

function effectsPanel() {
  const block = selectedBlock();
  if (!block) return `<h2 class="panel-heading">Page effects</h2><div class="empty-state">Select a block first.</div>`;
  const current = block.pageEffectByDevice[state.activeDevice];
  return `<h2 class="panel-heading">Page effect</h2><p class="panel-copy">One restrained scroll behavior per block. This applies to ${device(state.activeDevice).label} only.</p>${PAGE_EFFECTS.map(effect => `<button class="effect-card ${current === effect.id ? 'active' : ''}" draggable="true" data-page-effect="${effect.id}"><strong>${effect.label}</strong><span>${effect.description}</span></button>`).join('')}`;
}

function rightPanel() {
  const component = selectedComponent();
  const block = selectedBlock();
  if (component) return `<aside class="side-panel right"><div class="inspector">${componentInspector(component)}</div></aside>`;
  if (block) return `<aside class="side-panel right"><div class="inspector">${blockInspector(block)}</div></aside>`;
  return `<aside class="side-panel right"><div class="inspector"><h3>Edit</h3><p class="hint">Click a block or component to edit it.</p></div></aside>`;
}

function blockInspector(block) {
  const layout = block.layouts[state.activeDevice];
  return `<h3>${esc(block.name)}</h3><p class="hint">Divide this block into sections. Layout changes affect ${device(state.activeDevice).label} only.</p>
    <div class="field"><label>Block name</label><input id="block-name" value="${esc(block.name)}"></div>
    <div class="group-title">Divide this block</div><div class="layout-grid">${BLOCK_LAYOUTS.map(item => `<button class="layout-option ${layout.template === item.id ? 'active' : ''}" data-layout="${item.id}">${item.preview}</button>`).join('')}</div>
    <div class="field"><label>Background</label><select id="block-background"><option value="surface" ${block.style.background === 'surface' ? 'selected' : ''}>Soft</option><option value="plain" ${block.style.background === 'plain' ? 'selected' : ''}>Plain</option></select></div>
    <div class="mini-actions"><button data-action="block-up">Move up</button><button data-action="block-down">Move down</button>${block.kind === 'content' ? '<button class="danger" data-action="delete-block">Delete block</button>' : ''}</div>`;
}

function inputFor(label, field, value, kind = 'input') {
  return `<div class="field"><label>${label}</label>${kind === 'textarea' ? `<textarea data-content-field="${field}">${esc(value)}</textarea>` : `<input data-content-field="${field}" value="${esc(value)}">`}</div>`;
}

function componentInspector(component) {
  const c = component.content || {};
  let fields = '';
  if (component.type === 'heading') fields = inputFor('Headline', 'text', c.text, 'textarea');
  if (component.type === 'text') fields = inputFor('Text', 'text', c.text, 'textarea');
  if (component.type === 'button') fields = inputFor('Button label', 'label', c.label) + inputFor('Link', 'href', c.href);
  if (component.type === 'image') fields = `<div class="field"><label>Image</label><input type="file" id="component-image" accept="image/png,image/jpeg,image/webp"></div>` + inputFor('Alt text', 'alt', c.alt);
  if (component.type === 'card') fields = inputFor('Title', 'title', c.title) + inputFor('Text', 'body', c.body, 'textarea');
  if (component.type === 'navigation') fields = inputFor('Links (comma separated)', 'linksText', (c.links || []).join(', '));
  if (component.type === 'form') fields = inputFor('Form title', 'title', c.title) + inputFor('Button', 'button', c.button) + inputFor('Send form to', 'endpoint', c.endpoint) + `<div class="field"><label>Method</label><select data-content-field="method"><option ${c.method === 'POST' ? 'selected' : ''}>POST</option><option ${c.method === 'PUT' ? 'selected' : ''}>PUT</option><option ${c.method === 'PATCH' ? 'selected' : ''}>PATCH</option></select></div>`;
  if (component.type === 'faq') fields = inputFor('Question', 'question', c.question) + inputFor('Answer', 'answer', c.answer, 'textarea');
  if (component.type === 'stat') fields = inputFor('Number', 'value', c.value) + inputFor('Label', 'label', c.label);
  if (component.type === 'badge') fields = inputFor('Text', 'text', c.text);
  if (component.type === 'gallery') fields = inputFor('Title', 'title', c.title);
  if (component.type === 'notice') fields = inputFor('Title', 'title', c.title) + inputFor('Text', 'body', c.body, 'textarea');
  const animation = component.animationByDevice[state.activeDevice];
  return `<h3>${esc(componentDefinition(component.type)?.label || component.type)}</h3><p class="hint">Content is shared across screens. Placement is not.</p>${fields}<div class="field"><label>Animation on ${device(state.activeDevice).label}</label><div>${animation ? `<span class="c-badge">${esc(animationDefinition(animation)?.label || animation)}</span>` : '<span class="hint">None</span>'}</div></div><div class="mini-actions"><button data-action="open-animations">Choose animation</button>${animation ? '<button data-action="clear-animation">Remove animation</button>' : ''}<button class="danger" data-action="delete-component">Delete component</button></div>`;
}

function renderComponent(component, deviceId, editable = true) {
  const c = component.content || {};
  let inner = '';
  if (component.type === 'heading') inner = `<h1 class="c-heading" data-scramble-text="${esc(c.text)}">${esc(c.text)}</h1>`;
  if (component.type === 'text') inner = `<p class="c-text">${esc(c.text)}</p>`;
  if (component.type === 'button') inner = `<button class="c-button">${esc(c.label)}</button>`;
  if (component.type === 'image') inner = `<div class="c-image">${c.src ? `<img src="${c.src}" alt="${esc(c.alt)}">` : '<span>Drop or choose an image</span>'}</div>`;
  if (component.type === 'card') inner = `<article class="c-card"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></article>`;
  if (component.type === 'navigation') inner = `<nav class="c-nav"><div class="logo">${state.project.branding.logo ? `<img src="${state.project.branding.logo}" alt="Logo">` : `<span>${esc(state.project.name)}</span>`}</div><div class="c-nav-links">${(c.links || []).map(link => `<span>${esc(link)}</span>`).join('')}</div></nav>`;
  if (component.type === 'form') inner = `<div class="c-form"><h3>${esc(c.title)}</h3><input placeholder="Name" disabled><input placeholder="Email" disabled><textarea placeholder="Message" disabled></textarea><button>${esc(c.button)}</button></div>`;
  if (component.type === 'faq') inner = `<details class="c-faq"><summary>${esc(c.question)}</summary><p>${esc(c.answer)}</p></details>`;
  if (component.type === 'stat') inner = `<div class="c-stat"><strong>${esc(c.value)}</strong><span>${esc(c.label)}</span></div>`;
  if (component.type === 'badge') inner = `<span class="c-badge">${esc(c.text)}</span>`;
  if (component.type === 'gallery') inner = `<div class="c-gallery"><h3>${esc(c.title)}</h3><div class="gallery-row"><span></span><span></span><span></span></div></div>`;
  if (component.type === 'notice') inner = `<aside class="c-notice"><strong>${esc(c.title)}</strong><p>${esc(c.body)}</p></aside>`;
  const animation = component.animationByDevice[deviceId];
  const animationClass = animation ? `anim-${animation}` : '';
  return `<div class="placed-component ${state.selectedComponentId === component.id && editable ? 'selected' : ''} ${animationClass}" ${editable ? `draggable="true" data-component-id="${component.id}"` : ''} data-animation-target="${animation || ''}"><span class="component-kind">${esc(componentDefinition(component.type)?.label || component.type)}</span>${inner}</div>`;
}

function renderBlock(block, deviceId, editable = true) {
  const layout = block.layouts[deviceId];
  const def = layoutDefinition(layout.template);
  const columns = def.columns.map(value => `${value}fr`).join(' ');
  const selected = editable && state.selectedBlockId === block.id && !state.selectedComponentId;
  const effect = block.pageEffectByDevice[deviceId] || 'none';
  return `<section class="page-block ${selected ? 'selected' : ''} effect-${effect}" data-block-id="${block.id}" ${editable ? 'data-editable-block="true"' : ''} style="--block-bg:${block.style.background === 'surface' ? 'var(--project-surface)' : 'transparent'}">${editable ? `<button class="block-tag" data-select-block="${block.id}">${esc(block.name)} · ${layout.slots.length} ${layout.slots.length === 1 ? 'section' : 'sections'}</button>` : ''}<div class="block-grid" style="grid-template-columns:${columns}">${layout.slots.map((slot, slotIndex) => `<div class="design-section ${slot.length ? '' : 'empty'}" ${editable ? `data-drop-block="${block.id}" data-slot="${slotIndex}"` : ''}>${slot.length ? slot.map(id => renderComponent(state.project.components[id], deviceId, editable)).join('') : '<span class="drop-hint">Drop components here</span>'}</div>`).join('')}</div></section>`;
}

function renderCanvas(deviceId, editable = true, compact = false) {
  const page = currentPage(state.project);
  const d = device(deviceId);
  const blocks = page.blockOrderByDevice[deviceId].map(id => renderBlock(page.blocks[id], deviceId, editable)).join('');
  return `${compact ? '' : `<div class="canvas-label" style="--preview-width:${deviceId === 'mobile' ? '390px' : deviceId === 'tablet' ? '650px' : deviceId === 'laptop' ? '900px' : '980px'}"><span>${d.label}</span><span>${d.width} × ${d.height}</span></div>`}<div class="device-card" data-device="${deviceId}" style="${brandStyle(state.project)}">${blocks}${editable ? '<div class="add-block"><button data-action="add-block">+ Add block</button></div>' : ''}</div>`;
}

function workspace() {
  if (state.compare) return `<main class="workspace"><div class="compare-grid">${DEVICES.map(item => `<div class="compare-item"><div class="compare-title">${item.label} · ${item.width} × ${item.height}</div>${renderCanvas(item.id, false, true)}</div>`).join('')}</div></main>`;
  return `<main class="workspace"><div class="canvas-wrap"><div style="width:100%;max-width:1100px">${renderCanvas(state.activeDevice, true)}</div></div></main>`;
}

function editorView() {
  return `<div class="app-shell">${topBar()}<div class="editor-body">${leftPanel()}${workspace()}${rightPanel()}</div>${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ''}${renderModal()}</div>`;
}

function homeView() {
  const projects = Object.values(state.projects).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return `<div class="project-home"><div class="home-head"><div class="brandmark"><span class="mark">A</span><span>alimango design</span></div><button class="primary-button" data-action="new-project">+ Create project</button></div><main class="home-main"><section class="home-hero"><div><h1>Front-end design for people who think visually.</h1><p>Build with finished components, guided motion and device-specific layouts. No code required to start.</p></div></section><div class="project-grid">${projects.length ? projects.map(project => `<button class="project-card" data-open-project="${project.id}"><div class="thumb"></div><strong>${esc(project.name)}</strong><span>Updated ${new Date(project.updatedAt).toLocaleString()}</span></button>`).join('') : `<button class="project-card" data-action="new-project"><div class="thumb"></div><strong>Create your first project</strong><span>Start with Header, four Blocks and Footer.</span></button>`}</div></main>${state.modal ? renderModal() : ''}</div>`;
}

function renderModal() {
  if (!state.modal) return '';
  if (state.modal.type === 'create') return `<div class="modal-backdrop"><div class="modal"><h2>Create project</h2><p>Branding and device layouts stay inside this project.</p><input id="new-project-name" placeholder="Project name" value="New front-end"><div class="modal-actions"><button class="quiet-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="confirm-create">Create</button></div></div></div>`;
  if (state.modal.type === 'share') return `<div class="modal-backdrop"><div class="modal"><h2>Client preview</h2><p>This preview expires ${new Date(state.modal.expiresAt).toLocaleString()}.</p><input id="share-url" readonly value="${esc(state.modal.url)}"><div class="modal-actions"><button class="quiet-button" data-action="copy-share">Copy link</button><button class="primary-button" data-action="close-modal">Done</button></div></div></div>`;
  if (state.modal.type === 'export') return `<div class="modal-backdrop"><div class="modal"><h2>Download handoff</h2><p>The ZIP always includes the semantic design file, responsive preview, brand tokens and API contract.</p><div class="field"><label>Code target</label><select id="export-target"><option value="html">HTML / CSS / JS</option><option value="react">React</option><option value="vue">Vue</option><option value="react-native">React Native</option><option value="android">Android / Jetpack Compose</option></select></div><div class="modal-actions"><button class="quiet-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="confirm-export">Download ZIP</button></div></div></div>`;
  if (state.modal.type === 'error') return `<div class="modal-backdrop"><div class="modal"><h2>Could not complete that</h2><p>${esc(state.modal.message)}</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">Close</button></div></div></div>`;
  return '';
}

function render() {
  if (!state.project) root.innerHTML = homeView();
  else root.innerHTML = editorView();
  bindEvents();
  if (state.project) replayScrambles();
}

async function renderSharedPreview(token) {
  root.innerHTML = `<div class="preview-shell"><div class="empty-state">Loading client preview…</div></div>`;
  try {
    const response = await fetch(`/api/shares/${token}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Preview could not be loaded.');
    state.project = data.project;
    validateProject(state.project);
    state.activeDevice = 'desktop';
    const draw = () => {
      root.innerHTML = `<div class="preview-shell"><div class="preview-bar"><strong>${esc(state.project.name)}</strong>${DEVICES.map(item => `<button class="${state.activeDevice === item.id ? 'active' : ''}" data-preview-device="${item.id}">${item.label}</button>`).join('')}<span>Expires ${new Date(data.expiresAt).toLocaleDateString()}</span></div><div class="preview-stage"><div style="width:100%;max-width:1100px">${renderCanvas(state.activeDevice, false)}</div></div></div>`;
      document.querySelectorAll('[data-preview-device]').forEach(button => button.addEventListener('click', () => { state.activeDevice = button.dataset.previewDevice; draw(); }));
      replayScrambles();
    };
    draw();
  } catch (error) {
    root.innerHTML = `<div class="preview-shell"><div class="empty-state"><div><h2>Preview unavailable</h2><p>${esc(error.message)}</p></div></div></div>`;
  }
}

function bindEvents() {
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', actionHandler));
  document.querySelectorAll('[data-open-project]').forEach(button => button.addEventListener('click', () => navigate(`/editor/${encodeURIComponent(button.dataset.openProject)}`)));
  document.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => { state.activeDevice = button.dataset.device; state.compare = false; state.selectedComponentId = null; saveProjects(); render(); }));
  document.querySelectorAll('[data-left-tab]').forEach(button => button.addEventListener('click', () => { state.leftTab = button.dataset.leftTab; render(); }));
  document.querySelectorAll('[data-select-block]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); state.selectedBlockId = button.dataset.selectBlock; state.selectedComponentId = null; render(); }));
  document.querySelectorAll('[data-editable-block]').forEach(block => block.addEventListener('click', event => { if (event.target.closest('.placed-component')) return; state.selectedBlockId = block.dataset.blockId; state.selectedComponentId = null; render(); }));
  document.querySelectorAll('[data-component-id]').forEach(component => {
    component.addEventListener('click', event => { event.stopPropagation(); state.selectedComponentId = component.dataset.componentId; const page = currentPage(state.project); state.selectedBlockId = Object.values(page.blocks).find(block => block.layouts[state.activeDevice].slots.some(slot => slot.includes(component.dataset.componentId)))?.id || state.selectedBlockId; render(); });
    component.addEventListener('dragstart', event => { event.dataTransfer.setData('application/x-alimango-existing-component', component.dataset.componentId); event.dataTransfer.effectAllowed = 'move'; });
    component.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('application/x-alimango-animation')) { event.preventDefault(); event.stopPropagation(); } });
    component.addEventListener('drop', event => { const animationId = event.dataTransfer.getData('application/x-alimango-animation'); if (!animationId) return; event.preventDefault(); event.stopPropagation(); applyAnimation(component.dataset.componentId, animationId); });
  });
  document.querySelectorAll('[data-drop-block]').forEach(section => {
    section.addEventListener('dragover', event => { if (event.dataTransfer.types.some(type => ['application/x-alimango-component','application/x-alimango-existing-component'].includes(type))) { event.preventDefault(); section.classList.add('drag-target'); } });
    section.addEventListener('dragleave', () => section.classList.remove('drag-target'));
    section.addEventListener('drop', event => { event.preventDefault(); section.classList.remove('drag-target'); const type = event.dataTransfer.getData('application/x-alimango-component'); const existing = event.dataTransfer.getData('application/x-alimango-existing-component'); const blockId = section.dataset.dropBlock; const slot = Number(section.dataset.slot); if (type) { const component = addComponent(state.project, blockId, state.activeDevice, slot, type); state.selectedBlockId = blockId; state.selectedComponentId = component?.id || null; saveProjects(); render(); toast('Added to every screen. Move it independently where needed.'); } else if (existing) { moveComponent(state.project, existing, blockId, state.activeDevice, slot); state.selectedBlockId = blockId; state.selectedComponentId = existing; saveProjects(); render(); } });
  });
  document.querySelectorAll('[data-component-type]').forEach(item => {
    item.addEventListener('dragstart', event => event.dataTransfer.setData('application/x-alimango-component', item.dataset.componentType));
    item.addEventListener('click', () => quickAddComponent(item.dataset.componentType));
  });
  document.querySelectorAll('[data-animation]').forEach(item => {
    item.addEventListener('dragstart', event => event.dataTransfer.setData('application/x-alimango-animation', item.dataset.animation));
    item.addEventListener('click', () => state.selectedComponentId && applyAnimation(state.selectedComponentId, item.dataset.animation));
  });
  document.querySelectorAll('[data-page-effect]').forEach(item => {
    item.addEventListener('click', () => { if (!state.selectedBlockId) return; setBlockEffect(state.project, state.selectedBlockId, state.activeDevice, item.dataset.pageEffect); saveProjects(); render(); });
    item.addEventListener('dragstart', event => event.dataTransfer.setData('application/x-alimango-page-effect', item.dataset.pageEffect));
  });
  document.querySelectorAll('[data-editable-block]').forEach(block => {
    block.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('application/x-alimango-page-effect')) { event.preventDefault(); block.classList.add('drag-target'); } });
    block.addEventListener('dragleave', () => block.classList.remove('drag-target'));
    block.addEventListener('drop', event => { const effect = event.dataTransfer.getData('application/x-alimango-page-effect'); if (!effect) return; event.preventDefault(); event.stopPropagation(); setBlockEffect(state.project, block.dataset.blockId, state.activeDevice, effect); state.selectedBlockId = block.dataset.blockId; saveProjects(); render(); });
  });
  document.querySelectorAll('[data-type-preset]').forEach(button => button.addEventListener('click', () => { const preset = TYPOGRAPHY_PRESETS.find(item => item.id === button.dataset.typePreset); if (preset) { setTypography(state.project, preset); saveProjects(); render(); toast(`${preset.label} typography applied.`); } }));
  document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => { setBlockLayout(state.project, state.selectedBlockId, state.activeDevice, button.dataset.layout); saveProjects(); render(); }));
  document.querySelectorAll('[data-content-field]').forEach(input => input.addEventListener('change', () => { const field = input.dataset.contentField; let value = input.value; if (field === 'linksText') { updateComponentContent(state.project, state.selectedComponentId, { links: value.split(',').map(item => item.trim()).filter(Boolean) }); } else updateComponentContent(state.project, state.selectedComponentId, { [field]: value }); saveProjects(); render(); }));
  document.querySelector('#block-name')?.addEventListener('change', event => { renameBlock(state.project, state.selectedBlockId, event.target.value); saveProjects(); render(); });
  document.querySelector('#block-background')?.addEventListener('change', event => { const block = selectedBlock(); if (block) { block.style.background = event.target.value; touchProject(state.project); saveProjects(); render(); } });
  document.querySelector('#scope-current')?.addEventListener('change', event => { state.animationScope = event.target.checked ? 'current' : 'all'; });
  document.querySelectorAll('[data-brand-color]').forEach(input => input.addEventListener('input', () => { state.project.branding.colors[input.dataset.brandColor] = input.value; saveProjects(); render(); }));
  document.querySelectorAll('[data-brand-color-text]').forEach(input => input.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(input.value)) { state.project.branding.colors[input.dataset.brandColorText] = input.value; saveProjects(); render(); } else toast('Use a 6-digit hex color, for example #7c5ce7.'); }));
  document.querySelectorAll('[data-brand-font]').forEach(input => input.addEventListener('change', () => { state.project.branding[input.dataset.brandFont] = input.value || state.project.branding[input.dataset.brandFont]; saveProjects(); render(); }));
  document.querySelector('#brand-logo')?.addEventListener('change', event => readImageFile(event.target.files?.[0], data => { state.project.branding.logo = data; saveProjects(); render(); }));
  document.querySelector('#component-image')?.addEventListener('change', event => readImageFile(event.target.files?.[0], data => { updateComponentContent(state.project, state.selectedComponentId, { src: data }); saveProjects(); render(); }));
  document.querySelector('#new-project-name')?.addEventListener('keydown', event => { if (event.key === 'Enter') createProjectFromModal(); });
}

function quickAddComponent(type) {
  const page = currentPage(state.project);
  const blockId = state.selectedBlockId || page.blockOrderByDevice[state.activeDevice][1];
  const block = page.blocks[blockId];
  const component = addComponent(state.project, blockId, state.activeDevice, 0, type);
  state.selectedBlockId = blockId;
  state.selectedComponentId = component.id;
  saveProjects(); render(); toast('Added to every screen.');
}

function applyAnimation(componentId, animationId) {
  const component = state.project.components[componentId];
  if (!component || !isAnimationCompatible(component.type, animationId)) return toast('That animation does not suit this component.');
  setComponentAnimation(state.project, componentId, state.activeDevice, animationId, state.animationScope);
  saveProjects(); render();
  toast(state.animationScope === 'all' ? 'Animation applied to all screens.' : `Animation applied to ${device(state.activeDevice).label}.`);
}

function readImageFile(file, done) {
  if (!file) return;
  if (file.size > 1024 * 1024) return toast('For the MVP, keep images under 1 MB.');
  const reader = new FileReader(); reader.onload = () => done(String(reader.result)); reader.readAsDataURL(file);
}

async function shareProject() {
  try {
    validateProject(state.project);
    const response = await fetch('/api/shares', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project: state.project }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not create preview.');
    state.modal = { type: 'share', url: `${location.origin}/preview/${data.token}`, expiresAt: data.expiresAt };
    render();
  } catch (error) { state.modal = { type: 'error', message: error.message }; render(); }
}

function confirmExport() {
  const target = document.querySelector('#export-target')?.value || 'html';
  validateProject(state.project);
  const files = exportFiles(state.project, target);
  const safe = state.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'alimango-design';
  downloadZip(`${safe}-${target}.zip`, files);
  state.modal = null;
  render();
  toast('Handoff ZIP downloaded.');
}

function actionHandler(event) {
  const action = event.currentTarget.dataset.action;
  if (action === 'home') { saveProjects(); navigate('/'); }
  if (action === 'new-project') createProjectFlow();
  if (action === 'close-modal') { state.modal = null; render(); }
  if (action === 'confirm-create') createProjectFromModal();
  if (action === 'compare') { state.compare = !state.compare; state.selectedComponentId = null; render(); }
  if (action === 'share') shareProject();
  if (action === 'export') { state.modal = { type: 'export' }; render(); }
  if (action === 'confirm-export') confirmExport();
  if (action === 'copy-share') { const input = document.querySelector('#share-url'); input?.select(); navigator.clipboard?.writeText(input?.value || '').then(() => toast('Preview link copied.')); }
  if (action === 'add-block') { const block = addBlock(state.project); state.selectedBlockId = block.id; state.selectedComponentId = null; saveProjects(); render(); }
  if (action === 'block-up') { moveBlock(state.project, state.selectedBlockId, state.activeDevice, -1); saveProjects(); render(); }
  if (action === 'block-down') { moveBlock(state.project, state.selectedBlockId, state.activeDevice, 1); saveProjects(); render(); }
  if (action === 'delete-block') { removeBlock(state.project, state.selectedBlockId); state.selectedBlockId = currentPage(state.project).blockOrderByDevice[state.activeDevice][1]; state.selectedComponentId = null; saveProjects(); render(); }
  if (action === 'open-animations') { state.leftTab = 'animations'; render(); }
  if (action === 'clear-animation') { setComponentAnimation(state.project, state.selectedComponentId, state.activeDevice, null, state.animationScope); saveProjects(); render(); }
  if (action === 'delete-component') { removeComponent(state.project, state.selectedComponentId); state.selectedComponentId = null; saveProjects(); render(); }
}

function replayScrambles() {
  document.querySelectorAll('[data-animation-target="dual-scramble"] [data-scramble-text]').forEach(element => {
    const target = element.dataset.scrambleText || element.textContent;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let frame = 0;
    const total = Math.min(26, Math.max(12, target.length));
    const timer = setInterval(() => {
      frame++;
      element.textContent = [...target].map((char, index) => {
        if (/\s/.test(char)) return char;
        const progress = frame / total;
        if (index / target.length < progress) return char;
        return alphabet[Math.floor(Math.random() * alphabet.length)];
      }).join('');
      if (frame >= total) { clearInterval(timer); element.textContent = target; }
    }, 34);
  });
}

route();
