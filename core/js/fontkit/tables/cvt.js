import * as r from '../thirdparty/restructure/index.js';

// An array of predefined values accessible by instructions
export default new r.Struct({
  controlValues: new r.Array(r.int16)
});
