/*
PDFReference - represents a reference to another object in the PDF object heirarchy
By Devon Govett
*/

import TBuf from '../utils/tbuf.js';
import PDFAbstractReference from './abstract_reference.js';
import PDFObject from './object.js';

class PDFReference extends PDFAbstractReference {
  constructor(document, id, data = {}) {
    super();
    this.document = document;
    this.id = id;
    this.data = data;
    this.gen = 0;
    this.compress = this.document.compress && !this.data.Filter;
    this.uncompressedLength = 0;
    this.buffer = [];
  }

  write(chunk) {
    if (ArrayBuffer.isView(chunk)) {
      if (!(chunk instanceof DataView)) {
        chunk = new DataView(chunk.buffer, 0, chunk.byteLength);
      }
    }
    else if (typeof chunk == 'string') {
      chunk = new DataView(TBuf.str2Buffer(chunk + '\n'));
    }
    else if (chunk instanceof Object) {
      chunk = new DataView(chunk);
    }
    else {
      console.log(chunk);
      alert("unkown chunk");
    }

    this.uncompressedLength += chunk.byteLength;
    if (this.data.Length == null) {
      this.data.Length = 0;
    }
    this.buffer.push(chunk);
    this.data.Length += chunk.byteLength;
  }

  end(chunk) {
    if (chunk) {
      this.write(chunk);
    }
    this.finalize();
  }

  finalize() {
    this.offset = this.document._offset;

    const encryptFn = this.document._security
      ? this.document._security.getEncryptFn(this.id, this.gen)
      : null;

    if (this.buffer.length) {
      this.buffer = TBuf.concatDataView(this.buffer);

      if (encryptFn) {
        this.buffer = encryptFn(this.buffer);
      }

      this.data.Length = this.buffer.byteLength;
    }

    this.document._write(`${this.id} ${this.gen} obj`);
    this.document._write(PDFObject.convert(this.data, encryptFn));

    if (this.buffer.byteLength) {
      this.document._write('stream');
      this.document._write(this.buffer);

      this.buffer = []; // free up memory
      this.document._write('\nendstream');
    }

    this.document._write('endobj');
    this.document._refEnd(this);
  }
  toString() {
    return `${this.id} ${this.gen} R`;
  }
}

export default PDFReference;
