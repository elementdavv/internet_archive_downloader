/*
   PDFSecurity - represents PDF security settings
   By Yang Liu <hi@zesik.com>
 */

import { MD5 } from '../crypto-es/md5.js';

class PDFSecurity {
  static generateFileID(info = {}) {
    let infoStr = `${info.CreationDate.getTime()}\n`;

    for (let key in info) {
      // eslint-disable-next-line no-prototype-builtins
      if (!info.hasOwnProperty(key)) {
        continue;
      }
      infoStr += `${key}: ${info[key].valueOf()}\n`;
    }

    return wordArrayToView(MD5(infoStr));
  }

}

function wordArrayToView(wordArray) {
  const byteArray = [];
  for (let i = 0; i < wordArray.sigBytes; i++) {
    byteArray.push(
      (wordArray.words[Math.floor(i / 4)] >> (8 * (3 - (i % 4)))) & 0xff
    );
  }
  return new Uint8Array(byteArray);
}

export default PDFSecurity;
