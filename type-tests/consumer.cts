import jsonPointer = require('@lp-labs/json-pointer');

const tokens: string[] = jsonPointer.parsePointer('/name');
const value = jsonPointer.setPointer({ name: 'Ada' }, tokens, 'Grace');
void jsonPointer.getPointer<string>(value, '/name');
