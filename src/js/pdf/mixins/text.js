import PDFObject from '../object.js';

const { number } = PDFObject;

export default {
  initText() {
    this._line = this._line.bind(this);
    // Current coordinates
    this.x = 0;
    this.y = 0;
    this._lineGap = 0;
  },

  _text(text, x, y, options, lineCallback) {
    options = this._initOptions(x, y, options);

    // Convert text to a string
    text = text == null ? '' : `${text}`;

    // if the wordSpacing option is specified, remove multiple consecutive spaces
    if (options.wordSpacing) {
      text = text.replace(/\s{2,}/g, ' ');
    }

    lineCallback(text, options);
    return this;
  },

  text(text, x, y, options) {
    return this._text(text, x, y, options, this._line);
  },

  widthOfString(string, options = {}) {
    const horizontalScaling = options.horizontalScaling || 100;
    return (
      ((this._font.widthOfString(string, this._fontSize, options.features) +
        (options.characterSpacing || 0) * (string.length - 1)) *
        horizontalScaling) /
      100
    );
  },

  _initOptions(x = {}, y, options = {}) {
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    // clone options object
    const result = Object.assign({}, options);

    // Update the current position
    if (x != null) {
      this.x = x;
    }
    if (y != null) {
      this.y = y;
    }

    return result;
  },

  _line(text, options = {}, wrapper) {
    this._fragment(text, this.x, this.y, options);
    const lineGap = options.lineGap || this._lineGap || 0;

    if (!wrapper) {
      this.x += this.widthOfString(text, options);
    } else {
      this.y += this.currentLineHeight(true) + lineGap;
    }
  },

  _fragment(text, x, y, options) {
    let dy, encoded, i, positions, textWidth, words;
    text = `${text}`.replace(/\n/g, '');
    if (text.length === 0) {
      return;
    }

    // handle options
    const align = options.align || 'left';
    let wordSpacing = options.wordSpacing || 0;
    const characterSpacing = options.characterSpacing || 0;
    const horizontalScaling = options.horizontalScaling || 100;

    // text alignments
    if (options.width) {
      switch (align) {
        case 'right':
          textWidth = this.widthOfString(text.replace(/\s+$/, ''), options);
          x += options.lineWidth - textWidth;
          break;

        case 'center':
          x += options.lineWidth / 2 - options.textWidth / 2;
          break;

        case 'justify':
          // calculate the word spacing value
          words = text.trim().split(/\s+/);
          textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
          var spaceWidth = this.widthOfString(' ') + characterSpacing;
          wordSpacing = Math.max(
            0,
            (options.lineWidth - textWidth) / Math.max(1, words.length - 1) -
              spaceWidth,
          );
          break;
      }
    }

    // text baseline alignments based on http://wiki.apache.org/xmlgraphics-fop/LineLayout/AlignmentHandling
    if (typeof options.baseline === 'number') {
      dy = -options.baseline;
    } else {
      switch (options.baseline) {
        case 'svg-middle':
          dy = 0.5 * this._font.xHeight;
          break;
        case 'middle':
        case 'svg-central':
          dy = 0.5 * (this._font.descender + this._font.ascender);
          break;
        case 'bottom':
        case 'ideographic':
          dy = this._font.descender;
          break;
        case 'alphabetic':
          dy = 0;
          break;
        case 'mathematical':
          dy = 0.5 * this._font.ascender;
          break;
        case 'hanging':
          dy = 0.8 * this._font.ascender;
          break;
        case 'top':
          dy = this._font.ascender;
          break;
        default:
          dy = this._font.ascender;
      }
      dy = (dy / 1000) * this._fontSize;
    }

    // calculate the actual rendered width of the string after word and character spacing
    const renderedWidth =
      options.textWidth +
      wordSpacing * (options.wordCount - 1) +
      characterSpacing * (text.length - 1);

    // create link annotations if the link option is given
    if (options.link != null) {
      this.link(x, y, renderedWidth, this.currentLineHeight(), options.link);
    }
    if (options.goTo != null) {
      this.goTo(x, y, renderedWidth, this.currentLineHeight(), options.goTo);
    }
    if (options.destination != null) {
      this.addNamedDestination(options.destination, 'XYZ', x, y, null);
    }

    // create underline
    if (options.underline) {
      this.save();
      if (!options.stroke) {
        this.strokeColor(...(this._fillColor || []));
      }

      const lineWidth =
        this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.lineWidth(lineWidth);

      let lineY = y + this.currentLineHeight() - lineWidth;
      this.moveTo(x, lineY);
      this.lineTo(x + renderedWidth, lineY);
      this.stroke();
      this.restore();
    }

    // create strikethrough line
    if (options.strike) {
      this.save();
      if (!options.stroke) {
        this.strokeColor(...(this._fillColor || []));
      }

      const lineWidth =
        this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.lineWidth(lineWidth);

      let lineY = y + this.currentLineHeight() / 2;
      this.moveTo(x, lineY);
      this.lineTo(x + renderedWidth, lineY);
      this.stroke();
      this.restore();
    }

    this.save();

    // oblique (angle in degrees or boolean)
    if (options.oblique) {
      let skew;
      if (typeof options.oblique === 'number') {
        skew = -Math.tan((options.oblique * Math.PI) / 180);
      } else {
        skew = -0.25;
      }
      this.transform(1, 0, 0, 1, x, y);
      this.transform(1, 0, skew, 1, -skew * dy, 0);
      this.transform(1, 0, 0, 1, -x, -y);
    }

    // flip coordinate system
    this.transform(1, 0, 0, -1, 0, this.page.height);
    y = this.page.height - y - dy;

    // add current font to page if necessary
    if (this.page.fonts[this._font.id] == null) {
      this.page.fonts[this._font.id] = this._font.ref();
    }

    // begin the text object
    this.addContent('BT');

    // text position
    this.addContent(`1 0 0 1 ${number(x)} ${number(y)} Tm`);

    // font and font size
    this.addContent(`/${this._font.id} ${number(this._fontSize)} Tf`);

    // rendering mode
    const mode = options.fill && options.stroke ? 2 : options.stroke ? 1 : 0;
    if (mode) {
      this.addContent(`${mode} Tr`);
    }

    // Character spacing
    if (characterSpacing) {
      this.addContent(`${number(characterSpacing)} Tc`);
    }

    // Horizontal scaling
    if (horizontalScaling !== 100) {
      this.addContent(`${horizontalScaling} Tz`);
    }

    // Add the actual text
    // If we have a word spacing value, we need to encode each word separately
    // since the normal Tw operator only works on character code 32, which isn't
    // used for embedded fonts.
    if (wordSpacing) {
      words = text.trim().split(/\s+/);
      wordSpacing += this.widthOfString(' ') + characterSpacing;
      wordSpacing *= 1000 / this._fontSize;

      encoded = [];
      positions = [];
      for (let word of words) {
        const [encodedWord, positionsWord] = this._font.encode(
          word,
          options.features,
        );
        encoded = encoded.concat(encodedWord);
        positions = positions.concat(positionsWord);

        // add the word spacing to the end of the word
        // clone object because of cache
        const space = {};
        const object = positions[positions.length - 1];
        for (let key in object) {
          const val = object[key];
          space[key] = val;
        }
        space.xAdvance += wordSpacing;
        positions[positions.length - 1] = space;
      }
    } else {
      [encoded, positions] = this._font.encode(text, options.features);
    }

    const scale = this._fontSize / 1000;
    const commands = [];
    let last = 0;
    let hadOffset = false;

    // Adds a segment of text to the TJ command buffer
    const addSegment = (cur) => {
      if (last < cur) {
        const hex = encoded.slice(last, cur).join('');
        const advance =
          positions[cur - 1].xAdvance - positions[cur - 1].advanceWidth;
        commands.push(`<${hex}> ${number(-advance)}`);
      }

      last = cur;
    };

    // Flushes the current TJ commands to the output stream
    const flush = (i) => {
      addSegment(i);

      if (commands.length > 0) {
        this.addContent(`[${commands.join(' ')}] TJ`);
        commands.length = 0;
      }
    };

    for (i = 0; i < positions.length; i++) {
      // If we have an x or y offset, we have to break out of the current TJ command
      // so we can move the text position.
      const pos = positions[i];
      if (pos.xOffset || pos.yOffset) {
        // Flush the current buffer
        flush(i);

        // Move the text position and flush just the current character
        this.addContent(
          `1 0 0 1 ${number(x + pos.xOffset * scale)} ${number(
            y + pos.yOffset * scale,
          )} Tm`,
        );
        flush(i + 1);

        hadOffset = true;
      } else {
        // If the last character had an offset, reset the text position
        if (hadOffset) {
          this.addContent(`1 0 0 1 ${number(x)} ${number(y)} Tm`);
          hadOffset = false;
        }

        // Group segments that don't have any advance adjustments
        if (pos.xAdvance - pos.advanceWidth !== 0) {
          addSegment(i + 1);
        }
      }

      x += pos.xAdvance * scale;
    }

    // Flush any remaining commands
    flush(i);

    // end the text object
    this.addContent('ET');

    // restore flipped coordinate system
    this.restore();
  },
};
