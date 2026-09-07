const SETTINGS_KEY = 'alimango-design-settings-v1';
const PROJECTS_KEY = 'alimango-design-projects-v1';
const defaultSettings = () => ({
  profile: { name: '', email: '' }, appearance: 'system',
  ai: { onboardingSeen: false, externalAccessEnabled: false, token: '', mcpUrl: '',
    permissions: { read: true, create: true, edit: true, share: false, export: false },
    clients: [], projectAccess: {} }
});
const loadSettings = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const d = defaultSettings();
    return { ...d, ...raw, profile: { ...d.profile, ...(raw.profile || {}) }, ai: { ...d.ai, ...(raw.ai || {}), permissions: { ...d.ai.permissions, ...(raw.ai?.permissions || {}) }, clients: Array.isArray(raw.ai?.clients) ? raw.ai.clients : [], projectAccess: { ...(raw.ai?.projectAccess || {}) } } };
  } catch { return defaultSettings(); }
};
let settings = loadSettings();
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
const projects = () => { try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '{}'); } catch { return {}; } };
const writeProjects = value => localStorage.setItem(PROJECTS_KEY, JSON.stringify(value));
const currentProjectId = () => decodeURIComponent(location.pathname.match(/^\/editor\/([^/]+)$/)?.[1] || '');
const toast = message => {
  let el = document.querySelector('#ai-toast');
  if (!el) { el = document.createElement('div'); el.id = 'ai-toast'; el.className = 'ai-toast'; document.body.append(el); }
  el.textContent = message; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
};

async function ensureConnection() {
  if (settings.ai.token && settings.ai.mcpUrl) return;
  const response = await fetch('/api/agent-connections', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ permissions: settings.ai.permissions }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not create AI connection.');
  settings.ai.externalAccessEnabled = true; settings.ai.token = data.token; settings.ai.mcpUrl = data.mcp_url;
  settings.ai.permissions = data.permissions; settings.ai.clients = data.clients || []; saveSettings();
}
async function refreshConnection() {
  if (!settings.ai.token) return;
  const response = await fetch(`/api/agent-connections/${settings.ai.token}`);
  if (!response.ok) return;
  const data = await response.json(); settings.ai.mcpUrl = data.mcp_url; settings.ai.permissions = data.permissions; settings.ai.clients = data.clients || []; saveSettings();
}
async function revokeConnection() {
  if (settings.ai.token) await fetch(`/api/agent-connections/${settings.ai.token}`, { method: 'DELETE' }).catch(() => {});
  settings.ai.externalAccessEnabled = false; settings.ai.token = ''; settings.ai.mcpUrl = ''; settings.ai.clients = []; settings.ai.projectAccess = {}; saveSettings(); renderSettings('ai');
}
async function setProjectAccess(id, enabled) {
  const all = projects(), project = all[id]; if (!project) return;
  if (enabled) {
    await ensureConnection();
    const access = settings.ai.projectAccess[id] || {};
    settings.ai.projectAccess[id] = { enabled: true, remoteRevision: access.remoteRevision || 0 }; saveSettings();
    await syncProject(project); toast(`${project.name} is available to connected AI.`);
  } else {
    if (settings.ai.token) await fetch(`/api/agent-connections/${settings.ai.token}/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    delete settings.ai.projectAccess[id]; saveSettings(); toast(`${project.name} is no longer shared.`);
  }
  renderSettings('ai');
}
async function syncProject(project) {
  const access = settings.ai.projectAccess[project.id]; if (!access?.enabled || !settings.ai.token) return;
  const response = await fetch(`/api/agent-connections/${settings.ai.token}/projects/${encodeURIComponent(project.id)}`, { method: 'PUT', headers: {'content-type':'application/json'}, body: JSON.stringify({ project, expected_revision: access.remoteRevision || 0 }) });
  const data = await response.json();
  if (response.status === 409) { access.conflict = true; access.currentRemoteRevision = data.current_revision; saveSettings(); throw new Error(`AI sync paused: remote revision ${data.current_revision} is newer.`); }
  if (!response.ok) throw new Error(data.error || 'Could not sync project.');
  access.remoteRevision = data.revision; access.conflict = false; delete access.currentRemoteRevision; saveSettings();
}
const syncTimers = new Map();
function queueSharedProjects(serialized) {
  let all; try { all = JSON.parse(serialized); } catch { return; }
  for (const [id, access] of Object.entries(settings.ai.projectAccess)) {
    if (!access?.enabled || !all[id]) continue;
    clearTimeout(syncTimers.get(id));
    syncTimers.set(id, setTimeout(() => syncProject(all[id]).catch(error => toast(error.message)), 250));
  }
}
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  originalSetItem.call(this, key, value);
  if (this === localStorage && key === PROJECTS_KEY) queueSharedProjects(value);
};

async function importFromAgentLink() {
  const match = location.pathname.match(/^\/import\/([a-f0-9]{32})\/([^/]+)$/); if (!match) return false;
  document.body.innerHTML = '<div class="ai-importing">Opening AI-created project in Alimango…</div>';
  try {
    const token = match[1], id = decodeURIComponent(match[2]);
    const response = await fetch(`/api/agent-connections/${token}/projects/${encodeURIComponent(id)}`); const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Project could not be opened.');
    const all = projects(); all[data.project.id] = data.project; writeProjects(all);
    settings.ai.externalAccessEnabled = true; settings.ai.token = token; settings.ai.mcpUrl = `${location.origin}/mcp/${token}`; settings.ai.onboardingSeen = true;
    settings.ai.projectAccess[data.project.id] = { enabled: true, remoteRevision: data.revision }; saveSettings();
    location.replace(`/editor/${encodeURIComponent(data.project.id)}`);
  } catch (error) { document.body.innerHTML = `<div class="ai-importing"><strong>Could not open project</strong><p>${esc(error.message)}</p><a href="/">Back to projects</a></div>`; }
  return true;
}

function addSettingsLaunchers() {
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.querySelector('#ai-settings-launch')) {
    const button = document.createElement('button'); button.id='ai-settings-launch'; button.className='quiet-button'; button.textContent='⚙ Settings'; button.addEventListener('click', () => renderSettings('profile'));
    const exportButton = [...topbar.querySelectorAll('button')].find(b => b.textContent.trim()==='Export'); topbar.insertBefore(button, exportButton || null);
  }
  const home = document.querySelector('.home-head');
  if (home && !document.querySelector('#ai-home-settings')) {
    const button = document.createElement('button'); button.id='ai-home-settings'; button.className='ai-home-settings'; button.textContent='⚙ Settings'; button.addEventListener('click', () => renderSettings('profile'));
    const create = [...home.querySelectorAll('button')].find(b => b.textContent.includes('Create project')); home.insertBefore(button, create || null);
  }
}
function maybeOnboard() {
  if (settings.ai.onboardingSeen || !currentProjectId() || document.querySelector('#ai-onboarding')) return;
  const wrap = document.createElement('div'); wrap.id='ai-onboarding'; wrap.className='ai-overlay';
  wrap.innerHTML = `<div class="ai-modal"><span class="ai-eyebrow">Optional</span><h2>Brainstorm there. Design here.</h2><p>Connect ChatGPT or Claude, plan in the cloud, then send an editable project into Alimango for visual finishing.</p><div class="ai-provider-grid"><button data-provider="chatgpt"><strong>ChatGPT</strong><span>Connect and create Alimango projects from conversations.</span></button><button data-provider="claude"><strong>Claude</strong><span>Connect and continue designs from Claude.</span></button></div><div class="ai-actions"><button class="secondary" data-dismiss>Not now</button></div><small>AI stays in Settings and is off until you explicitly enable it.</small></div>`;
  document.body.append(wrap);
  wrap.querySelector('[data-dismiss]').onclick = () => { settings.ai.onboardingSeen=true; saveSettings(); wrap.remove(); };
  wrap.querySelectorAll('[data-provider]').forEach(b => b.onclick = async () => { settings.ai.onboardingSeen=true; saveSettings(); await ensureConnection(); wrap.remove(); showGuide(b.dataset.provider); });
}

function renderSettings(tab='profile') {
  document.querySelector('#ai-settings-overlay')?.remove();
  const wrap = document.createElement('div'); wrap.id='ai-settings-overlay'; wrap.className='ai-settings-overlay';
  const tabs = [['profile','Profile'],['appearance','Appearance'],['ai','AI'],['projects','Projects'],['export','Export'],['privacy','Privacy & Security']];
  wrap.innerHTML = `<section class="ai-settings-shell"><aside><div class="ai-settings-head"><strong>Settings</strong><button data-close>×</button></div>${tabs.map(([id,label])=>`<button class="ai-tab ${id===tab?'active':''}" data-tab="${id}">${label}</button>`).join('')}</aside><main>${settingsContent(tab)}</main></section>`;
  document.body.append(wrap);
  wrap.querySelector('[data-close]').onclick=()=>wrap.remove();
  wrap.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderSettings(b.dataset.tab));
  bindSettingsActions(wrap, tab);
  if (tab==='ai') refreshConnection().then(()=>{}).catch(()=>{});
}
function settingsContent(tab) {
  if (tab==='profile') return `<div class="ai-section"><span class="ai-eyebrow">Account</span><h2>Profile</h2><p>Basic information for this browser profile.</p><label>Name<input id="ai-name" value="${esc(settings.profile.name)}"></label><label>Email<input id="ai-email" value="${esc(settings.profile.email)}"></label><button class="primary" data-save-profile>Save profile</button></div>`;
  if (tab==='appearance') return `<div class="ai-section"><span class="ai-eyebrow">Interface</span><h2>Appearance</h2><p>Theme preference is stored locally for this MVP.</p><div class="ai-choice-grid">${['system','dark','light'].map(v=>`<button data-appearance="${v}" class="${settings.appearance===v?'active':''}"><strong>${v[0].toUpperCase()+v.slice(1)}</strong><span>${v==='system'?'Follow this device':`Use ${v} interface`}</span></button>`).join('')}</div></div>`;
  if (tab==='ai') return aiContent();
  if (tab==='projects') return `<div class="ai-section"><span class="ai-eyebrow">Workspace</span><h2>Projects</h2><p>${Object.keys(projects()).length} projects saved in this browser.</p><div class="ai-card"><strong>Project storage</strong><p>Local autosave remains the MVP source of truth. Only projects explicitly shared in Settings → AI are synchronized for remote agent work.</p></div></div>`;
  if (tab==='export') return `<div class="ai-section"><span class="ai-eyebrow">Handoff</span><h2>Export</h2><p>Exports keep <code>alimango-design.json</code> as the editable semantic source of truth.</p><div class="ai-card"><strong>Targets</strong><p>HTML · React · Vue · React Native · Android / Jetpack Compose</p></div></div>`;
  return `<div class="ai-section"><span class="ai-eyebrow">Control</span><h2>Privacy & Security</h2><p>AI is off by default. Existing projects are not shared until explicitly enabled.</p><div class="ai-card"><strong>Revision protection</strong><p>Stale agent writes are rejected with REVISION_CONFLICT rather than overwriting newer human changes.</p></div><div class="ai-card"><strong>MVP authentication</strong><p>The test build uses a revocable capability URL. Broad production release should replace it with account authentication and OAuth 2.1/PKCE.</p></div></div>`;
}
function aiContent() {
  const connected = Boolean(settings.ai.externalAccessEnabled && settings.ai.token && settings.ai.mcpUrl), all = Object.values(projects()).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="ai-section"><span class="ai-eyebrow">Optional</span><h2>AI</h2><p>Brainstorm in ChatGPT or Claude, then move the editable design into Alimango. AI never appears in the main editor menu.</p><div class="ai-card ai-status"><div><strong>${connected?'External agent access is on':'External agent access is off'}</strong><p>${connected?'Your private MCP connection is ready.':'Nothing can access projects until you enable it.'}</p></div><button class="${connected?'secondary':'primary'}" data-toggle-ai>${connected?'Disconnect':'Enable AI connection'}</button></div>${connected?`<label>Alimango connection address<div class="ai-copy"><input id="ai-mcp-url" readonly value="${esc(settings.ai.mcpUrl)}"><button data-copy>Copy</button></div></label><div class="ai-provider-grid compact"><button data-guide="chatgpt"><strong>Connect ChatGPT</strong><span>Guided brainstorming → Alimango setup.</span></button><button data-guide="claude"><strong>Connect Claude</strong><span>Guided custom connector/MCP setup.</span></button></div><h3>Permissions</h3><div class="ai-list">${permission('read','Read shared projects')}${permission('create','Create new projects')}${permission('edit','Edit shared projects')}${permission('share','Create client preview links')}${permission('export','Request export handoff')}</div><h3>Existing project access</h3><p class="muted">Default is ask per project.</p><div class="ai-list">${all.map(p=>{const a=settings.ai.projectAccess[p.id];return `<label class="ai-row"><span><strong>${esc(p.name)}</strong><small>${a?.enabled?`Shared · remote revision ${a.remoteRevision||0}${a.conflict?' · conflict':''}`:'Not shared'}</small></span><input type="checkbox" data-project-access="${p.id}" ${a?.enabled?'checked':''}></label>`}).join('')||'<p class="muted">No projects yet.</p>'}</div><div class="ai-actions"><button class="secondary" data-refresh>Refresh projects from AI</button><a href="/guide.html" target="_blank" rel="noopener">Open full guide ↗</a></div>${settings.ai.clients.length?`<h3>Recently connected</h3>${settings.ai.clients.map(c=>`<div class="ai-row"><span><strong>${esc(c.name)}</strong><small>${esc(c.version||'')} · ${new Date(c.lastSeenAt).toLocaleString()}</small></span></div>`).join('')}`:''}`:''}</div>`;
}
const permission=(key,label)=>`<label class="ai-row"><span>${label}</span><input type="checkbox" data-permission="${key}" ${settings.ai.permissions[key]?'checked':''}></label>`;
function bindSettingsActions(wrap, tab) {
  wrap.querySelector('[data-save-profile]')?.addEventListener('click',()=>{settings.profile.name=wrap.querySelector('#ai-name').value;settings.profile.email=wrap.querySelector('#ai-email').value;saveSettings();toast('Profile saved.');});
  wrap.querySelectorAll('[data-appearance]').forEach(b=>b.onclick=()=>{settings.appearance=b.dataset.appearance;saveSettings();renderSettings('appearance');});
  wrap.querySelector('[data-toggle-ai]')?.addEventListener('click',async()=>{try{if(settings.ai.externalAccessEnabled)await revokeConnection();else{await ensureConnection();renderSettings('ai');}}catch(e){toast(e.message)}});
  wrap.querySelector('[data-copy]')?.addEventListener('click',()=>navigator.clipboard?.writeText(settings.ai.mcpUrl).then(()=>toast('Connection address copied.')));
  wrap.querySelectorAll('[data-guide]').forEach(b=>b.onclick=()=>showGuide(b.dataset.guide));
  wrap.querySelectorAll('[data-permission]').forEach(input=>input.onchange=async()=>{settings.ai.permissions[input.dataset.permission]=input.checked;saveSettings();if(settings.ai.token){const r=await fetch(`/api/agent-connections/${settings.ai.token}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({permissions:settings.ai.permissions})});if(!r.ok)toast('Could not update permissions.');}});
  wrap.querySelectorAll('[data-project-access]').forEach(input=>input.onchange=()=>setProjectAccess(input.dataset.projectAccess,input.checked).catch(e=>toast(e.message)));
  wrap.querySelector('[data-refresh]')?.addEventListener('click',()=>refreshAgentProjects().catch(e=>toast(e.message)));
}
async function refreshAgentProjects() {
  await ensureConnection(); const response=await fetch(`/api/agent-connections/${settings.ai.token}/projects`), data=await response.json(); if(!response.ok)throw new Error(data.error||'Could not refresh projects.');
  const all=projects(); let imported=0, updated=0;
  for(const entry of data.projects||[]){const local=all[entry.project.id], access=settings.ai.projectAccess[entry.project.id];if(!local){all[entry.project.id]=entry.project;settings.ai.projectAccess[entry.project.id]={enabled:true,remoteRevision:entry.revision};imported++;}else if((access?.remoteRevision||0)<entry.revision){all[entry.project.id]=entry.project;settings.ai.projectAccess[entry.project.id]={enabled:true,remoteRevision:entry.revision};updated++;}}
  writeProjects(all); saveSettings(); toast(`${imported} new project${imported===1?'':'s'} imported; ${updated} updated.`); if(imported||updated)setTimeout(()=>location.reload(),500);
}
function showGuide(provider) {
  document.querySelector('#ai-guide-overlay')?.remove(); const label=provider==='claude'?'Claude':'ChatGPT', anchor=provider==='claude'?'claude':'chatgpt'; const wrap=document.createElement('div');wrap.id='ai-guide-overlay';wrap.className='ai-overlay';wrap.innerHTML=`<div class="ai-modal guide"><span class="ai-eyebrow">Settings → AI</span><h2>Connect ${label}</h2><ol><li><strong>Enable external agent access</strong><span>Alimango creates a private MCP connection.</span></li><li><strong>Add Alimango Design in ${label}</strong><span>Use the connection address below in the provider's current custom connector/MCP setup.</span></li><li><strong>Choose project access</strong><span>Existing projects stay private until enabled individually.</span></li><li><strong>Try it</strong><span>Brainstorm first, then say “Create this as an editable project in Alimango Design.”</span></li></ol><label>Connection address<div class="ai-copy"><input readonly value="${esc(settings.ai.mcpUrl)}"><button data-copy>Copy</button></div></label><div class="ai-actions"><a href="/guide.html#${anchor}" target="_blank">Full ${label} guide ↗</a><button class="primary" data-done>Done</button></div></div>`;document.body.append(wrap);wrap.querySelector('[data-done]').onclick=()=>wrap.remove();wrap.querySelector('[data-copy]').onclick=()=>navigator.clipboard?.writeText(settings.ai.mcpUrl).then(()=>toast('Connection address copied.'));
}

const observer=new MutationObserver(()=>{addSettingsLaunchers();maybeOnboard();}); observer.observe(document.documentElement,{childList:true,subtree:true});
if (!await importFromAgentLink()) { addSettingsLaunchers(); setTimeout(maybeOnboard,250); }
