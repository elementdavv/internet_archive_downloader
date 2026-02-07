/*
PDFDocument - represents an entire PDF document
created By Devon Govett
edited by Element Davv
*/

import PDFObject from './object.js';
import PDFReference from './reference.js';
import PDFPage from './page.js';
import PDFSecurity from './security.js';
import ColorMixin from './mixins/color.js';
import VectorMixin from './mixins/vector.js';
import FontsMixin from './mixins/fonts.js';
import TextMixin from './mixins/text.js';
import ImagesMixin from './mixins/images.js';
import TBuf from '../utils/tbuf.js';

class PDFDocument {
  constructor(writer, options = {}) {
    this.writer = writer;
    this.options = options;
    this.error = null;

    // PDF version
    switch (options.pdfVersion) {
      case '1.4':
        this.version = 1.4;
        break;
      case '1.5':
        this.version = 1.5;
        break;
      case '1.6':
        this.version = 1.6;
        break;
      case '1.7':
      case '1.7ext3':
        this.version = 1.7;
        break;
      default:
        this.version = 1.3;
        break;
    }

    // Whether streams should be compressed
    this.compress = false;

    this._pageBuffer = [];

    // The PDF object store
    this._offsets = [];
    this._waiting = 0;
    this._ended = false;
    this._offset = 0;
    const Pages = this.ref({
      Type: 'Pages',
      Count: 0,
      Kids: Array.from({length: options.pagecount}, (v, i) => i)
    });

    this._root = this.ref({
      Type: 'Catalog',
      Pages,
    });

    if (this.options.lang) {
      this._root.data.Lang = new String(this.options.lang);
      const rtlLangs = [ 'ar', 'he', 'fa', ];            // arabic, hebrew, persian
      this.rtl = rtlLangs.includes(this.options.lang);
    }

    // The current page
    this.page = null;

    this.initColor();
    this.initVector();
    this.initFonts(options.fontdata, options.font);
    this.initText();
    this.initImages();

    // Initialize the metadata
    this.info = {
      Producer: 'PDFKit',
      Creator: 'PDFKit',
      CreationDate: new Date(),
    };

    if (this.options.info) {
      for (let key in this.options.info) {
        const val = this.options.info[key];
        this.info[key] = val;
      }
    }

    // Generate file ID
    this._id = PDFSecurity.generateFileID(this.info);

    // Write the header
    // PDF version
    this._write(`%PDF-${this.version}`);

    // 4 binary chars, as recommended by the spec
    this._write('%\xFF\xFF\xFF\xFF');

  }

  addPage(options) {
    if (options == null) {
      ({ options } = this);
    }

    // end the current page if needed
    if (!this.options.bufferPages) {
      this.flushPages();
    }

    // create a page object
    this.page = new PDFPage(this, options);
    this._pageBuffer.push(this.page);

    // add the page to the object store
    const pages = this._root.data.Pages.data;
    pages.Kids[options.pageindex] = this.page.dictionary;
    pages.Count++;

    // reset x and y coordinates
    this.x = this.page.margins.left;
    this.y = this.page.margins.top;

    // flip PDF coordinate system so that the origin is in
    // the top left rather than the bottom left
    this._ctm = [1, 0, 0, 1, 0, 0];
    this.transform(1, 0, 0, -1, 0, this.page.height);

    return this;
  }

  flushPages() {
    // this local variable exists so we're future-proof against
    // reentrant calls to flushPages.
    const pages = this._pageBuffer;
    this._pageBuffer = [];
    for (let page of pages) {
      page.end();
    }
  }

  ref(data) {
    const ref = new PDFReference(this, this._offsets.length + 1, data);
    this._offsets.push(null); // placeholder for this object's offset once it is finalized
    this._waiting++;
    return ref;
  }

  _write(data) {
    if (!this.error) this.writer.write(TBuf.convert(data)).catch(e=>this.error=e);
    return (this._offset += (data.byteLength ? data.byteLength : data.length));
  }

  addContent(data) {
    this.page.write(data);
    return this;
  }

  _refEnd(ref) {
    this._offsets[ref.id - 1] = ref.offset;
    if (--this._waiting === 0 && this._ended) {
      this._finalize();
      this._ended = false;
    }
  }

  end() {
    this.flushPages();

    this._info = this.ref();
    for (let key in this.info) {
      let val = this.info[key];
      if (typeof val === 'string') {
        val = new String(val);
      }

      let entry = this.ref(val);
      entry.end();

      this._info.data[key] = entry;
    }

    this._info.end();

    for (let name in this._fontFamilies) {
      const font = this._fontFamilies[name];
      font.finalize();
    }

    this._root.end();
    this._root.data.Pages.end();

    if (this._waiting === 0) {
      this._finalize();
    } else {
      this._ended = true;
    }
  }

  _finalize() {
    // generate xref
    const xRefOffset = this._offset;
    this._write('xref');
    this._write(`0 ${this._offsets.length + 1}`);
    this._write('0000000000 65535 f ');

    for (let offset of this._offsets) {
      offset = `0000000000${offset}`.slice(-10);
      this._write(offset + ' 00000 n ');
    }

    // trailer
    const trailer = {
      Size: this._offsets.length + 1,
      Root: this._root,
      Info: this._info,
      ID: [this._id, this._id],
    };

    this._write('trailer');
    this._write(PDFObject.convert(trailer));

    this._write('startxref');
    this._write(`${xRefOffset}`);
    this._write('%%EOF');

    // end the stream
    // this.writer.close();
  }

  toString() {
    return '[object PDFDocument]';
  }
}

const mixin = (methods) => {
  Object.assign(PDFDocument.prototype, methods);
};

mixin(ColorMixin);
mixin(VectorMixin);
mixin(FontsMixin);
mixin(TextMixin);
mixin(ImagesMixin);

export default PDFDocument;
