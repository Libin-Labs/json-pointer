import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPointer,
  getPointer,
  JsonPointerError,
  parsePointer,
  removePointer,
  setPointer,
} from '../src/index.js';

test('parses, formats, and round-trips RFC 6901 escaping including empty tokens', () => {
  const tokens = ['', 'a/b', 'm~n', 'tilde~1slash'];
  const pointer = formatPointer(tokens);
  assert.equal(pointer, '//a~1b/m~0n/tilde~01slash');
  assert.deepEqual(parsePointer(pointer), tokens);
  assert.deepEqual(parsePointer(''), []);
  assert.deepEqual(parsePointer('/'), ['']);
});

test('rejects malformed pointers and prototype-related tokens', () => {
  for (const value of [
    'relative',
    '/bad~',
    '/bad~2',
    '/__proto__',
    '/a/constructor',
    '/prototype',
  ]) {
    assert.throws(() => parsePointer(value), JsonPointerError);
  }
  assert.throws(() => formatPointer(['constructor']), JsonPointerError);
  assert.throws(() => getPointer({}, ['__proto__']), JsonPointerError);
});

test('gets own properties only and handles array indexing strictly', () => {
  const document = { list: ['x', null], nested: Object.assign(Object.create(null), { ok: true }) };
  assert.equal(getPointer(document, '/list/0'), 'x');
  assert.equal(getPointer(document, '/nested/ok'), true);
  assert.equal(getPointer(document, '/missing'), undefined);
  assert.throws(() => getPointer(document, '/list/01'), JsonPointerError);
  assert.throws(() => getPointer(document, '/list/-'), JsonPointerError);
  assert.throws(() => getPointer(document, '/list/2'), JsonPointerError);
});

test('sets immutably by default and supports explicit in-place updates and creation', () => {
  const original = { nested: { value: 1 }, list: [1] };
  const updated = setPointer(original, '/nested/value', 2);
  assert.deepEqual(updated, { nested: { value: 2 }, list: [1] });
  assert.equal(original.nested.value, 1);
  assert.notEqual(updated, original);
  assert.notEqual(updated.nested, original.nested);
  assert.deepEqual(setPointer({}, '/new/deep/value', 7), { new: { deep: { value: 7 } } });
  assert.deepEqual(setPointer(original, '/list/-', 2), { nested: { value: 1 }, list: [1, 2] });
  setPointer(original, '/nested/value', 3, { immutable: false });
  assert.equal(original.nested.value, 3);
});

test('sets root and rejects invalid traversal, index, or unsafe raw tokens', () => {
  assert.deepEqual(setPointer({ a: 1 }, '', { b: 2 }), { b: 2 });
  assert.throws(() => setPointer({ a: 1 }, '/a/x', 2), JsonPointerError);
  assert.throws(() => setPointer([1], '/2', 2), JsonPointerError);
  assert.throws(() => setPointer({}, ['__proto__'], 3), JsonPointerError);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('removes object keys and array entries while respecting immutable policy', () => {
  const initial = { a: 1, list: [1, 2, 3] };
  const removed = removePointer(initial, '/list/1');
  assert.deepEqual(removed, { a: 1, list: [1, 3] });
  assert.deepEqual(initial.list, [1, 2, 3]);
  assert.deepEqual(removePointer(initial, '/a'), { list: [1, 2, 3] });
  removePointer(initial, '/list/0', { immutable: false });
  assert.deepEqual(initial.list, [2, 3]);
  assert.throws(() => removePointer(initial, ''), JsonPointerError);
  assert.throws(() => removePointer(initial, '/not-there'), JsonPointerError);
  assert.throws(() => removePointer(initial, '/list/9'), JsonPointerError);
});
