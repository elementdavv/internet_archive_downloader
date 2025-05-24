import StandardFont from './font/standard.js';

class PDFFontFactory {
  static open(document, src, family, id, fontdata) {
    let font;
    if (StandardFont.isStandardFont(src)) {
      return new StandardFont(document, src, id, fontdata);
    }

    if (font == null) {
      throw new Error('Not a supported font format or standard PDF font.');
    }
  }
}

export default PDFFontFactory;
