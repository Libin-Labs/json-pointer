export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export interface PointerOptions {
  immutable?: boolean;
}

export class JsonPointerError extends Error {
  override name = 'JsonPointerError';
  constructor(message: string) {
    super(message);
  }
}

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

function assertSafe(tokens: readonly string[]): void {
  for (const token of tokens) {
    if (forbidden.has(token)) throw new JsonPointerError(`Unsafe pointer token: ${token}`);
  }
}

export function parsePointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/'))
    throw new JsonPointerError("A JSON Pointer must be empty or begin with '/'");
  const tokens = pointer
    .slice(1)
    .split('/')
    .map((raw) => {
      if (/~(?![01])/.test(raw))
        throw new JsonPointerError(`Invalid escape in pointer token: ${raw}`);
      return raw.replace(/~1/g, '/').replace(/~0/g, '~');
    });
  assertSafe(tokens);
  return tokens;
}

export function formatPointer(tokens: readonly string[]): string {
  assertSafe(tokens);
  return tokens.length === 0
    ? ''
    : `/${tokens.map((token) => token.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function arrayIndex(token: string, length: number, allowAppend = false): number {
  if (allowAppend && token === '-') return length;
  if (!/^(0|[1-9]\d*)$/.test(token)) throw new JsonPointerError(`Invalid array index: ${token}`);
  const index = Number(token);
  if (!Number.isSafeInteger(index) || index >= length)
    throw new JsonPointerError(`Array index out of bounds: ${token}`);
  return index;
}

export function getPointer<T = unknown>(
  document: unknown,
  pointer: string | readonly string[],
): T | undefined {
  const tokens = typeof pointer === 'string' ? parsePointer(pointer) : [...pointer];
  assertSafe(tokens);
  let current: unknown = document;
  for (const token of tokens) {
    if (Array.isArray(current)) current = current[arrayIndex(token, current.length)];
    else if (isRecord(current) && Object.hasOwn(current, token)) current = current[token];
    else return undefined;
  }
  return current as T;
}

export function setPointer<T>(
  document: T,
  pointer: string | readonly string[],
  value: unknown,
  options: PointerOptions = {},
): T {
  const tokens = typeof pointer === 'string' ? parsePointer(pointer) : [...pointer];
  assertSafe(tokens);
  if (tokens.length === 0) return value as T;
  const immutable = options.immutable ?? true;

  const update = (node: unknown, depth: number): unknown => {
    const token = tokens[depth]!;
    const last = depth === tokens.length - 1;
    if (Array.isArray(node)) {
      const index = arrayIndex(token, node.length, last);
      const copy = immutable ? node.slice() : node;
      if (last) {
        if (index === node.length) copy.push(value);
        else copy[index] = value;
      } else {
        if (index >= node.length) throw new JsonPointerError(`Array index out of bounds: ${token}`);
        copy[index] = update(node[index], depth + 1);
      }
      return copy;
    }
    if (node !== undefined && node !== null && !isRecord(node))
      throw new JsonPointerError(`Cannot traverse non-object at token: ${token}`);
    const source = node === undefined || node === null ? {} : node;
    const copy: Record<string, unknown> = immutable
      ? Object.getPrototypeOf(source) === null
        ? Object.assign(Object.create(null) as Record<string, unknown>, source)
        : { ...source }
      : source;
    if (last) copy[token] = value;
    else {
      if (!Object.hasOwn(source, token)) copy[token] = update(undefined, depth + 1);
      else copy[token] = update(source[token], depth + 1);
    }
    return copy;
  };
  return update(document, 0) as T;
}

export function removePointer<T>(
  document: T,
  pointer: string | readonly string[],
  options: PointerOptions = {},
): T {
  const tokens = typeof pointer === 'string' ? parsePointer(pointer) : [...pointer];
  assertSafe(tokens);
  if (tokens.length === 0)
    throw new JsonPointerError('Removing the document root is not supported');
  const immutable = options.immutable ?? true;

  const remove = (node: unknown, depth: number): unknown => {
    const token = tokens[depth]!;
    const last = depth === tokens.length - 1;
    if (Array.isArray(node)) {
      const index = arrayIndex(token, node.length);
      const copy = immutable ? node.slice() : node;
      if (last) copy.splice(index, 1);
      else copy[index] = remove(node[index], depth + 1);
      return copy;
    }
    if (!isRecord(node) || !Object.hasOwn(node, token))
      throw new JsonPointerError(`Pointer does not exist at token: ${token}`);
    const copy: Record<string, unknown> = immutable
      ? Object.getPrototypeOf(node) === null
        ? Object.assign(Object.create(null) as Record<string, unknown>, node)
        : { ...node }
      : node;
    if (last) delete copy[token];
    else copy[token] = remove(node[token], depth + 1);
    return copy;
  };
  return remove(document, 0) as T;
}
