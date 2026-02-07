import PDFObject from '../object.js';

const { number } = PDFObject;

export default {
  initVector() {
    this._ctm = [1, 0, 0, 1, 0, 0]; // current transformation matrix
    this._ctmStack = [];
  },

  save() {
    this._ctmStack.push(this._ctm.slice());
    // TODO: save/restore colorspace and styles so not setting it unnessesarily all the time?
    return this.addContent('q');
  },

  restore() {
    this._ctm = this._ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    return this.addContent('Q');
  },

  transform(m11, m12, m21, m22, dx, dy) {
    // keep track of the current transformation matrix
    if (
      m11 === 1 &&
      m12 === 0 &&
      m21 === 0 &&
      m22 === 1 &&
      dx === 0 &&
      dy === 0
    ) {
      // Ignore identity transforms
      return this;
    }
    const m = this._ctm;
    const [m0, m1, m2, m3, m4, m5] = m;
    m[0] = m0 * m11 + m2 * m12;
    m[1] = m1 * m11 + m3 * m12;
    m[2] = m0 * m21 + m2 * m22;
    m[3] = m1 * m21 + m3 * m22;
    m[4] = m0 * dx + m2 * dy + m4;
    m[5] = m1 * dx + m3 * dy + m5;

    const values = [m11, m12, m21, m22, dx, dy].map((v) => number(v)).join(' ');
    return this.addContent(`${values} cm`);
  },
};
