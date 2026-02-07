import PDFFontFactory from '../font_factory.js';

export default {
  initFonts(fontdata, defaultFont = 'Helvetica') {
    // Lookup table for embedded fonts
    this._fontFamilies = {};
    this._fontCount = 0;

    // Font state
    this._fontSize = 12;
    this._font = null;

    // Set the default font
    if (defaultFont) {
      this.font(fontdata, defaultFont);
    }
  },

  font(fontdata, src, family, size) {
    let cacheKey, font;
    if (typeof family === 'number') {
      size = family;
      family = null;
    }

    cacheKey = family || src;

    if (size != null) {
      this.fontSize(size);
    }

    // fast path: check if the font is already in the PDF
    if ((font = this._fontFamilies[cacheKey])) {
      this._font = font;
      return this;
    }

    // load the font
    const id = `F${++this._fontCount}`;
    this._font = PDFFontFactory.open(this, src, family, id, fontdata);

    // check for existing font familes with the same name already in the PDF
    // useful if the font was passed as a buffer
    if ((font = this._fontFamilies[this._font.name])) {
      this._font = font;
      return this;
    }

    // save the font for reuse later
    if (cacheKey) {
      this._fontFamilies[cacheKey] = this._font;
    }

    if (this._font.name) {
      this._fontFamilies[this._font.name] = this._font;
    }

    return this;
  },

  fontSize(_fontSize) {
    this._fontSize = _fontSize;
    return this;
  },

  currentLineHeight(includeGap) {
    return this._font.lineHeight(this._fontSize, includeGap);
  },

};
