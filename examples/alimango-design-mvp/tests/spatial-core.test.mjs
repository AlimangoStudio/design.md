import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hitTestRect,
  invertMatrix,
  matrixForTransform,
  moveTransform,
  multiplyMatrix,
  resizeTransform,
  rotateTransform,
  SnapshotHistory,
  transformPoint,
  transformedBounds
} from '../public/js/spatial-core.js';

test('matrix inversion round-trips a transformed point', () => {
  const matrix = matrixForTransform({ x: 120, y: 80, width: 200, height: 100, rotation: 27, scaleX: 1.2, scaleY: .8 });
  const inverse = invertMatrix(matrix);
  assert.ok(inverse);
  const world = transformPoint(matrix, 30, 40);
  const local = transformPoint(inverse, world.x, world.y);
  assert.ok(Math.abs(local.x - 30) < 1e-9);
  assert.ok(Math.abs(local.y - 40) < 1e-9);
  const identity = multiplyMatrix(matrix, inverse);
  assert.ok(Math.abs(identity[0] - 1) < 1e-9);
  assert.ok(Math.abs(identity[3] - 1) < 1e-9);
});

test('bounds and hit testing account for rotation', () => {
  const item = { x: 10, y: 20, width: 100, height: 40, rotation: 90 };
  const bounds = transformedBounds(item);
  assert.ok(Math.abs(bounds.width - 40) < 1e-9);
  assert.ok(Math.abs(bounds.height - 100) < 1e-9);
  assert.equal(hitTestRect(item, 60, 40), true);
  assert.equal(hitTestRect(item, -200, -200), false);
});

test('move and resize stay bounded and respect minimums', () => {
  const moved = moveTransform({ x: 50, y: 50, width: 100, height: 80 }, 500, -100, { width: 320, height: 240 });
  assert.equal(moved.x, 220);
  assert.equal(moved.y, 0);
  const resized = resizeTransform({ width: 100, height: 50 }, -500, -500, { minWidth: 32, minHeight: 24 });
  assert.equal(resized.width, 32);
  assert.equal(resized.height, 24);
});

test('rotation normalizes to a compact range', () => {
  assert.equal(rotateTransform({ rotation: 170 }, 30).rotation, -160);
});

test('snapshot history is bounded and supports undo/redo', () => {
  const history = new SnapshotHistory({ x: 0 }, 2);
  assert.equal(history.commit({ x: 1 }), true);
  assert.equal(history.commit({ x: 2 }), true);
  assert.equal(history.commit({ x: 3 }), true);
  assert.deepEqual(history.undo(), { x: 2 });
  assert.deepEqual(history.undo(), { x: 1 });
  assert.equal(history.undo(), null);
  assert.deepEqual(history.redo(), { x: 2 });
});
