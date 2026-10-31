# @lp-labs/json-pointer

Strict [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) token parsing, formatting, reading, and updating of JSON-like values. Updates are immutable by default.

```ts
import { getPointer, setPointer } from "@lp-labs/json-pointer";

const original = { users: [{ name: "Ada" }] };
const name = getPointer<string>(original, "/users/0/name");
const updated = setPointer(original, "/users/0/name", "Grace");
```

## API

- `JsonPrimitive` is `string | number | boolean | null`; `JsonValue` recursively represents JSON data.
- `PointerOptions` has `immutable?: boolean`, default `true`. Immutable changes copy only traversed arrays/objects; untouched branches retain references. With `false`, the existing container is modified in place.
- `JsonPointerError(message: string)` extends `Error` and is thrown for invalid pointer syntax, unsafe property names, invalid array indices, unsupported traversal, root removal, or a missing removal target.
- `parsePointer(pointer: string): string[]` decodes a pointer. The empty string identifies the root; otherwise input begins with `/`. Decoding accepts only `~0` and `~1`; empty path tokens are retained.
- `formatPointer(tokens: readonly string[]): string` encodes tokens into an RFC 6901 pointer; empty tokens produce `/`. It rejects unsafe token names as well.
- `getPointer<T = unknown>(document, pointer: string | readonly string[]): T | undefined` returns the root for `""`, reads own properties only, and returns `undefined` when an object key is absent. Array tokens must be canonical non-negative decimal indices and in bounds; `-`, leading zeros, and missing array indices are invalid.
- `setPointer<T>(document, pointer, value, options?): T` replaces the selected value; `""` replaces the root. Missing object nodes on the path are created as plain objects. Arrays support replacement at an existing index and append with `-` only at the final token; gaps and append during traversal are invalid. It will not traverse scalar values.
- `removePointer<T>(document, pointer, options?): T` removes an existing object member or array element (array elements shift left). Removing the document root is rejected.

Tokens `__proto__`, `prototype`, and `constructor` are always rejected, including when a token-array path is supplied. Traversal accepts arrays and plain or null-prototype records; class instances and other exotic objects are not supported. Setting an object member stores the supplied value without deep cloning it. This is a JSON Pointer utility, not a JSON Patch operation engine: array set replaces rather than inserts. Errors are explicit rather than silently coercing indices.

## Compatibility and references

Targets ES2022, has no runtime dependencies, and performs no environment-specific work at import time. See [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901).

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
