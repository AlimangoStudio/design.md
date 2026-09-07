import { DEVICES, DEVICE_IDS, layoutDefinition } from './library.js';
import { currentPage } from './model.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
const js = value => JSON.stringify(value);

function cssVars(project) {
  const b = project.branding;
  return `:root{--brand:${b.colors.primary};--accent:${b.colors.accent};--bg:${b.colors.background};--surface:${b.colors.surface};--text:${b.colors.text};--muted:${b.colors.muted};--heading:${JSON.stringify(b.headingFont)};--body:${JSON.stringify(b.bodyFont)};}`;
}

function componentHtml(component, project) {
  const c = component.content || {};
  switch (component.type) {
    case 'heading': return `<h1 class="c-heading">${esc(c.text)}</h1>`;
    case 'text': return `<p class="c-text">${esc(c.text)}</p>`;
    case 'button': return `<a class="c-button" href="${esc(c.href || '#')}">${esc(c.label)}</a>`;
    case 'image': return c.src ? `<img class="c-image" src="${esc(c.src)}" alt="${esc(c.alt)}">` : `<div class="c-image placeholder">Image</div>`;
    case 'card': return `<article class="c-card"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></article>`;
    case 'navigation': return `<nav class="c-nav">${project.branding.logo ? `<img src="${esc(project.branding.logo)}" alt="Logo">` : `<strong>${esc(project.name)}</strong>`}<div>${(c.links || []).map(link => `<a href="#">${esc(link)}</a>`).join('')}</div></nav>`;
    case 'form': return `<form class="c-form" data-endpoint="${esc(c.endpoint)}" data-method="${esc(c.method)}"><h3>${esc(c.title)}</h3><input placeholder="Name"><input type="email" placeholder="Email"><textarea placeholder="Message"></textarea><button type="button">${esc(c.button)}</button></form>`;
    case 'faq': return `<details class="c-faq"><summary>${esc(c.question)}</summary><p>${esc(c.answer)}</p></details>`;
    case 'stat': return `<div class="c-stat"><strong>${esc(c.value)}</strong><span>${esc(c.label)}</span></div>`;
    case 'badge': return `<span class="c-badge">${esc(c.text)}</span>`;
    case 'gallery': return `<div class="c-gallery"><h3>${esc(c.title)}</h3><div><span></span><span></span><span></span></div></div>`;
    case 'notice': return `<aside class="c-notice"><strong>${esc(c.title)}</strong><p>${esc(c.body)}</p></aside>`;
    default: return '';
  }
}

function blockHtml(project, page, block, device) {
  const layout = block.layouts[device];
  const definition = layoutDefinition(layout.template);
  const columns = definition.columns.join('fr ') + 'fr';
  return `<section class="design-block effect-${esc(block.pageEffectByDevice[device] || 'none')}" data-name="${esc(block.name)}"><div class="block-inner" style="grid-template-columns:${columns}">${layout.slots.map(slot => `<div class="design-section">${slot.map(id => componentHtml(project.components[id], project)).join('')}</div>`).join('')}</div></section>`;
}

export function responsivePreviewHtml(project) {
  const page = currentPage(project);
  const renderDevice = device => `<div class="device-layout device-${device}">${page.blockOrderByDevice[device].map(id => blockHtml(project, page, page.blocks[id], device)).join('')}</div>`;
  const body = DEVICE_IDS.map(renderDevice).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)}</title><style>${cssVars(project)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:var(--body)}h1,h2,h3{font-family:var(--heading)}.design-block{padding:48px 5vw}.block-inner{max-width:1200px;margin:auto;display:grid;gap:28px}.design-section{min-width:0}.c-heading{font-size:clamp(2.5rem,6vw,5.5rem);line-height:.95;margin:0 0 24px}.c-text{font-size:1.08rem;line-height:1.65;color:var(--muted);max-width:64ch}.c-button{display:inline-flex;padding:13px 20px;border-radius:999px;background:var(--brand);color:white;text-decoration:none;font-weight:700}.c-card,.c-notice,.c-form,.c-faq{background:var(--surface);border-radius:20px;padding:22px}.c-image{display:block;width:100%;min-height:260px;object-fit:cover;border-radius:22px;background:var(--surface)}.placeholder{display:grid;place-items:center;color:var(--muted)}.c-nav{display:flex;justify-content:space-between;align-items:center;gap:20px}.c-nav img{max-height:40px;max-width:140px}.c-nav div{display:flex;gap:20px}.c-nav a{color:inherit;text-decoration:none}.c-form{display:grid;gap:12px}.c-form input,.c-form textarea{font:inherit;padding:12px;border:1px solid #0002;border-radius:10px}.c-form button{padding:12px;border:0;border-radius:10px;background:var(--brand);color:#fff}.c-faq summary{font-weight:700}.c-stat{display:grid;gap:8px}.c-stat strong{font-size:3rem}.c-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:var(--surface)}.c-gallery>div{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.c-gallery span{aspect-ratio:4/3;border-radius:16px;background:var(--surface)}.device-layout{display:none}.device-desktop{display:block}@media(max-width:1300px){.device-desktop{display:none}.device-laptop{display:block}}@media(max-width:900px){.device-laptop{display:none}.device-tablet{display:block}}@media(max-width:560px){.device-tablet{display:none}.device-mobile{display:block}.design-block{padding:32px 20px}.block-inner{grid-template-columns:1fr!important}.c-nav div{display:none}}.effect-sticky{position:sticky;top:0}.effect-section-reveal{animation:rise .65s both}.effect-parallax{transform:translateZ(0)}@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
</style></head><body>${body}</body></html>`;
}

function openApi(project) {
  const forms = Object.values(project.components).filter(component => component.type === 'form');
  const paths = forms.map(component => {
    const endpoint = component.content.endpoint || '/api/contact';
    const method = String(component.content.method || 'POST').toLowerCase();
    return `  ${endpoint}:\n    ${method}:\n      summary: ${JSON.stringify(component.content.title || 'Form submission')}\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n      responses:\n        '200':\n          description: Success`;
  }).join('\n');
  return `openapi: 3.0.3\ninfo:\n  title: ${JSON.stringify(project.name + ' handoff')}\n  version: 0.1.0\npaths:\n${paths || '  {}'}\n`;
}

function reactScaffold(project) {
  return `import './styles.css';\n\nexport default function App(){\n  return (\n    <main>\n      <h1>${project.name.replace(/[{}<>]/g, '')}</h1>\n      <p>This scaffold ships with alimango-design.json. Use the semantic document to render the approved responsive layouts and components.</p>\n    </main>\n  );\n}\n`;
}

function vueScaffold(project) {
  return `<template>\n  <main>\n    <h1>${esc(project.name)}</h1>\n    <p>This scaffold ships with alimango-design.json. Render from the semantic document rather than recreating the design from screenshots.</p>\n  </main>\n</template>\n\n<script setup>\nimport './styles.css'\n</script>\n`;
}

function reactNativeScaffold(project) {
  return `import React from 'react';\nimport { SafeAreaView, ScrollView, Text, StyleSheet } from 'react-native';\n\nexport default function App(){\n  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><Text style={styles.title}>${project.name.replace(/[{}<>]/g, '')}</Text><Text>Use alimango-design.json to map the Mobile layout to production React Native components.</Text></ScrollView></SafeAreaView>;\n}\nconst styles=StyleSheet.create({safe:{flex:1},page:{padding:24,gap:16},title:{fontSize:36,fontWeight:'700'}});\n`;
}

function androidScaffold(project) {
  return `package app.alimango.generated\n\nimport android.os.Bundle\nimport androidx.activity.ComponentActivity\nimport androidx.activity.compose.setContent\nimport androidx.compose.foundation.layout.*\nimport androidx.compose.material3.*\nimport androidx.compose.runtime.Composable\nimport androidx.compose.ui.Modifier\nimport androidx.compose.ui.unit.dp\n\nclass MainActivity : ComponentActivity() {\n  override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(savedInstanceState)\n    setContent { GeneratedDesign() }\n  }\n}\n\n@Composable\nfun GeneratedDesign() {\n  Scaffold { padding ->\n    Column(Modifier.padding(padding).padding(24.dp)) {\n      Text(${js(project.name)}, style = MaterialTheme.typography.headlineLarge)\n      Text("Use alimango-design.json to map the Mobile layout to production Compose components.")\n    }\n  }\n}\n`;
}

export function exportFiles(project, target = 'html') {
  const designJson = JSON.stringify(project, null, 2);
  const preview = responsivePreviewHtml(project);
  const tokens = `${cssVars(project)}\n`;
  const files = {
    'alimango-design.json': designJson,
    'preview/index.html': preview,
    'design-tokens/tokens.css': tokens,
    'api-contracts/openapi.yaml': openApi(project),
    'README.md': `# ${project.name}\n\nGenerated from Alimango Design MVP. The semantic source of truth is \`alimango-design.json\`.\n\nTarget: ${target}\n\nDo not recreate the design from screenshots. Preserve shared component identity and device-specific layout overrides.\n`
  };

  if (target === 'html') files['code/index.html'] = preview;
  if (target === 'react') {
    files['code/src/App.jsx'] = reactScaffold(project);
    files['code/src/styles.css'] = tokens;
  }
  if (target === 'vue') {
    files['code/src/App.vue'] = vueScaffold(project);
    files['code/src/styles.css'] = tokens;
  }
  if (target === 'react-native') files['code/App.tsx'] = reactNativeScaffold(project);
  if (target === 'android') files['code/MainActivity.kt'] = androidScaffold(project);
  return files;
}
