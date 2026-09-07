/**
 * Alimango spatial editing primitives.
 *
 * First-party, dependency-free geometry/history core for the Design Platform.
 * Deliberately excludes rendering, networking, storage, package loading, and DOM access.
 */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const identityMatrix = () => [1, 0, 0, 1, 0, 0];

export function multiplyMatrix(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
  ];
}

export function invertMatrix(matrix) {
  const determinant = matrix[0] * matrix[3] - matrix[1] * matrix[2];
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;

  return [
    matrix[3] / determinant,
    -matrix[1] / determinant,
    -matrix[2] / determinant,
    matrix[0] / determinant,
    (matrix[2] * matrix[5] - matrix[3] * matrix[4]) / determinant,
    (matrix[1] * matrix[4] - matrix[0] * matrix[5]) / determinant
  ];
}

export function transformPoint(matrix, x, y) {
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5]
  };
}

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

export function normalizeTransform(input = {}) {
  return {
    x: finite(input.x, 0),
    y: finite(input.y, 0),
    width: clamp(finite(input.width, 160), 1, 100000),
    height: clamp(finite(input.height, 100), 1, 100000),
    rotation: finite(input.rotation, 0),
    scaleX: clamp(finite(input.scaleX, 1), -1000, 1000),
    scaleY: clamp(finite(input.scaleY, 1), -1000, 1000)
  };
}

export function matrixForTransform(input = {}) {
  const t = normalizeTransform(input);
  const angle = t.rotation * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const centerX = t.width / 2;
  const centerY = t.height / 2;
  const a = cosine * t.scaleX;
  const b = sine * t.scaleX;
  const c = -sine * t.scaleY;
  const d = cosine * t.scaleY;

  return [
    a,
    b,
    c,
    d,
    t.x + centerX - a * centerX - c * centerY,
    t.y + centerY - b * centerX - d * centerY
  ];
}

export function transformedBounds(input = {}) {
  const t = normalizeTransform(input);
  const matrix = matrixForTransform(t);
  const corners = [
    transformPoint(matrix, 0, 0),
    transformPoint(matrix, t.width, 0),
    transformPoint(matrix, t.width, t.height),
    transformPoint(matrix, 0, t.height)
  ];
  const xs = corners.map(point => point.x);
  const ys = corners.map(point => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);

  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function hitTestRect(input, worldX, worldY) {
  const t = normalizeTransform(input);
  const inverse = invertMatrix(matrixForTransform(t));
  if (!inverse) return false;
  const local = transformPoint(inverse, worldX, worldY);
  return local.x >= 0 && local.x <= t.width && local.y >= 0 && local.y <= t.height;
}

export function moveTransform(input, deltaX, deltaY, limits = null) {
  const t = normalizeTransform(input);
  const next = { ...t, x: t.x + finite(deltaX, 0), y: t.y + finite(deltaY, 0) };
  if (!limits) return next;

  const maxX = finite(limits.width, Infinity) - next.width;
  const maxY = finite(limits.height, Infinity) - next.height;
  next.x = clamp(next.x, finite(limits.x, 0), Number.isFinite(maxX) ? Math.max(finite(limits.x, 0), maxX) : Infinity);
  next.y = clamp(next.y, finite(limits.y, 0), Number.isFinite(maxY) ? Math.max(finite(limits.y, 0), maxY) : Infinity);
  return next;
}

export function resizeTransform(input, deltaWidth, deltaHeight, options = {}) {
  const t = normalizeTransform(input);
  const minWidth = clamp(finite(options.minWidth, 24), 1, 100000);
  const minHeight = clamp(finite(options.minHeight, 24), 1, 100000);
  let width = Math.max(minWidth, t.width + finite(deltaWidth, 0));
  let height = Math.max(minHeight, t.height + finite(deltaHeight, 0));

  if (options.lockAspectRatio) {
    const ratio = t.width / t.height;
    if (Math.abs(finite(deltaWidth, 0)) >= Math.abs(finite(deltaHeight, 0))) height = Math.max(minHeight, width / ratio);
    else width = Math.max(minWidth, height * ratio);
  }

  if (Number.isFinite(options.maxWidth)) width = Math.min(width, options.maxWidth);
  if (Number.isFinite(options.maxHeight)) height = Math.min(height, options.maxHeight);

  return { ...t, width, height };
}

export function rotateTransform(input, degrees) {
  const t = normalizeTransform(input);
  let rotation = (t.rotation + finite(degrees, 0)) % 360;
  if (rotation > 180) rotation -= 360;
  if (rotation <= -180) rotation += 360;
  return { ...t, rotation };
}

const cloneValue = value => globalThis.structuredClone
  ? globalThis.structuredClone(value)
  : JSON.parse(JSON.stringify(value));

export class SnapshotHistory {
  constructor(initialState, limit = 60) {
    this.limit = clamp(Math.trunc(finite(limit, 60)), 1, 200);
    this.undoStack = [];
    this.redoStack = [];
    this.current = cloneValue(initialState);
  }

  value() {
    return cloneValue(this.current);
  }

  commit(nextState) {
    const before = JSON.stringify(this.current);
    const after = JSON.stringify(nextState);
    if (before === after) return false;
    this.undoStack.push(cloneValue(this.current));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.current = cloneValue(nextState);
    this.redoStack = [];
    return true;
  }

  undo() {
    if (!this.undoStack.length) return null;
    this.redoStack.push(cloneValue(this.current));
    this.current = this.undoStack.pop();
    return this.value();
  }

  redo() {
    if (!this.redoStack.length) return null;
    this.undoStack.push(cloneValue(this.current));
    this.current = this.redoStack.pop();
    return this.value();
  }
}
