/*
 * pdfimage.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import JPEG from './image/jpeg.js';
import PNGImage from './image/png.js';

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
    } else if (data.getUint16(0) === 0x8950 && data.getUint16(2) === 0x4e47) {
      return new PNGImage(data, label);
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
