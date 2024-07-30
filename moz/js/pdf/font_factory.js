/*
 * font_factory.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import StandardFont from './font/standard.js';

class PDFFontFactory {
  static open(document, src, family, id, fontdata) {
    let font;

    if (typeof src === 'string') {
      return new StandardFont(document, src, id, fontdata);
    }

    if (font == null) {
      throw new Error('Not a supported font format or standard PDF font.');
    }
  }
}

export default PDFFontFactory;
