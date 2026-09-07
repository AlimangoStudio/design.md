import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_IDS, isAnimationCompatible } from '../public/js/library.js';
import { makeProject, currentPage, addComponent, setBlockLayout, moveComponent, updateComponentContent, setComponentAnimation, validateProject } from '../public/js/model.js';

function blockOne(project) {
  const page = currentPage(project);
  return page.blocks[page.blockOrderByDevice.desktop[1]];
}

test('new project has the expected plain-English page skeleton', () => {
  const project = makeProject('Test');
  const page = currentPage(project);
  const names = page.blockOrderByDevice.desktop.map(id => page.blocks[id].name);
  assert.deepEqual(names, ['Header', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Footer']);
  for (const device of DEVICE_IDS) assert.deepEqual(page.blockOrderByDevice[device], page.blockOrderByDevice.desktop);
  assert.equal(validateProject(project), true);
});

test('new component is shared across every device', () => {
  const project = makeProject('Test');
  const block = blockOne(project);
  const component = addComponent(project, block.id, 'desktop', 0, 'button');
  for (const device of DEVICE_IDS) assert.equal(block.layouts[device].slots[0].includes(component.id), true);
});

test('layout and placement can diverge per device while content remains shared', () => {
  const project = makeProject('Test');
  const block = blockOne(project);
  const component = addComponent(project, block.id, 'desktop', 0, 'button');
  setBlockLayout(project, block.id, 'mobile', 'half');
  moveComponent(project, component.id, block.id, 'mobile', 1);
  assert.equal(block.layouts.mobile.slots[1].includes(component.id), true);
  assert.equal(block.layouts.desktop.slots[0].includes(component.id), true);
  updateComponentContent(project, component.id, { label: 'Shared label' });
  assert.equal(project.components[component.id].content.label, 'Shared label');
});

test('animation compatibility is enforced by the library', () => {
  assert.equal(isAnimationCompatible('button', 'hover-lift'), true);
  assert.equal(isAnimationCompatible('button', 'dual-scramble'), false);
  assert.equal(isAnimationCompatible('heading', 'dual-scramble'), true);
});

test('animation can be shared or device-specific', () => {
  const project = makeProject('Test');
  const block = blockOne(project);
  const component = addComponent(project, block.id, 'desktop', 0, 'button');
  setComponentAnimation(project, component.id, 'desktop', 'hover-lift', 'all');
  for (const device of DEVICE_IDS) assert.equal(project.components[component.id].animationByDevice[device], 'hover-lift');
  setComponentAnimation(project, component.id, 'mobile', 'magnetic', 'current');
  assert.equal(project.components[component.id].animationByDevice.mobile, 'magnetic');
  assert.equal(project.components[component.id].animationByDevice.desktop, 'hover-lift');
});
