/*
PDFImage - embeds images in PDF documents
By Devon Govett
*/

import JPEG from './image/jpeg.js';

class PDFImage {
  static open(src, label) {
    let data;
    if (ArrayBuffer.isView(src)) {
      if (!(src instanceof DataView)) {
        data = new DataView(src.buffer);
      }
      else 
        data = src;
    } else {
      let match;
      if ((match = /^data:.+;base64,(.*)$/.exec(src))) {
        data = this.base64ToDataView(match[1]);
      }
    }

    if (data.getUint16(0) === 0xffd8) {
      return new JPEG(data, label);
    } else {
      throw new Error('Unknown image format');
    }
  }

  static view2Str(view) {
    const result = String.fromCharCode.apply(null, new Uint8Array(view.buffer)).toString();
    return result;
  }

  static base64ToDataView(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    var bytes = new DataView(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }
}

export default PDFImage;
