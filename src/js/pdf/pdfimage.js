/*
PDFImage - embeds images in PDF documents
By Devon Govett
*/

import JPEG from './image/jpeg.js';
import PNGImage from './image/png.js';
import TBuf from '../utils/tbuf.js';

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
      const match = /^data:.+?;base64,(.*)$/.exec(src);
      if (match) {
        data = new DataView(TBuf.base64ToBuffer(match[1]));
      }
      else {
        throw new Error('no image data');
      }
    }

    if (data.getUint16(0) === 0xffd8) {
      return new JPEG(data, label);
    } else if (data.getUint16(0) === 0x8950 && data.getUint16(2) === 0x4e47) {
      return new PNGImage(data, label);
    } else {
      throw new Error('Unknown image format.');
    }
  }
}

export default PDFImage;
