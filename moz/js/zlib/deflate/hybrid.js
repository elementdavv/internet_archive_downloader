// Safari が typeof Uint8Array === 'object' になるため、
// 未定義か否かで Typed Array の使用を決定する

/** @const {boolean} use typed array flag. */
const USE_TYPEDARRAY =
  (typeof Uint8Array !== 'undefined') &&
  (typeof Uint16Array !== 'undefined') &&
  (typeof Uint32Array !== 'undefined') &&
  (typeof DataView !== 'undefined');

export default USE_TYPEDARRAY;
