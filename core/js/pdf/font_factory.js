import StandardFont from './font/standard.js';

class PDFFontFactory {
  static open(document, src, family, id, fontdata) {
    let font;
    if (StandardFont.isStandardFont(src)) {
      return new StandardFont(document, src, id, fontdata);
    }

    let that = window.internetarchivedownloader ;
    let fontkit = that.fontkit;
    let EmbeddedFont = that.EmbeddedFont;

    if (!fontkit || !EmbeddedFont) {
      throw new Error('Not a supported font format or standard PDF font.');
    }

    fontkit.setDefaultLanguage(src);

    if (fontdata instanceof Uint8Array) {
        font = fontkit.create(fontdata, family);
    // in firefox, the first condition failed
    } else if (fontdata instanceof ArrayBuffer
            || Object.prototype.toString.call(fontdata) === '[object ArrayBuffer]') {
        font = fontkit.create(new Uint8Array(fontdata), family);
    }

    if (font == null) {
      throw new Error('Not a supported font format or standard PDF font.');
    }

    return new EmbeddedFont(document, font, id);
  }
}

export default PDFFontFactory;
