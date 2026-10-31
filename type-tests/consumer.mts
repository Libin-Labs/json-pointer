import { getPointer, parsePointer, setPointer, type JsonValue } from '@lp-labs/json-pointer';

const value: JsonValue = { answer: 42 };
const path = parsePointer('/answer');
const next = setPointer(value, path, 43);
const answer: number | undefined = getPointer<number>(next, '/answer');
// @ts-expect-error Mutation policy is boolean.
setPointer(value, '/answer', 43, { immutable: 'yes' });
void answer;
