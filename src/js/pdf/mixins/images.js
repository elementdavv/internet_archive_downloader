/*
 * images.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import PDFImage from '../pdfimage.js';

export default {
  initImages() {
    this._imageRegistry = {};
    return (this._imageCount = 0);
  },

  image(src, text, x, y, options = {}) {
    let image, left, left1;
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    x = (left = x != null ? x : options.x) != null ? left : this.x;
    y = (left1 = y != null ? y : options.y) != null ? left1 : this.y;

    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      if (src.width && src.height) {
        image = src;
      } else {
        image = this.openImage(src);
      }
    }

    if (!image.obj) {
      image.embed(this);
    }

    if (this.page.xobjects[image.label] == null) {
      this.page.xobjects[image.label] = image.obj;
    }

    let w = options.width || image.width;
    let h = options.height || image.height;

    this.save();
    this.transform(w, 0, 0, -h, x, y + h);
    this.addContent(`/${image.label} Do`);
    this.restore();

    if (text == null || text == '') return this;

    this.opacity(0.0);
    const xmldoc = new DOMParser().parseFromString(text, 'text/xml');
    var xmlobject = xmldoc.getElementsByTagName('OBJECT');

    if (xmlobject == null) {
        return this;
    }

    const maxwidth = parseFloat(xmlobject[0].attributes['width'].value);
    const maxheight = parseFloat(xmlobject[0].attributes['height'].value);
    const xratio = w / maxwidth;
    const yratio = h / maxheight;

    // all paragraph in a page
    const pars= xmldoc.querySelectorAll('PARAGRAPH');
    var plh, words, coords, fontsize, lines, ly, wy, wx;

    pars.forEach((par) => {
        // line high in a paragraph
        plh = [];
        words = par.querySelectorAll('WORD');

        words.forEach((word) => {
            coords = word.attributes['coords'].value.split(',');
            plh.push(parseFloat(coords[1]) - parseFloat(coords[3]));
        });

        plh.sort((a, b) => a - b);
        // shared fontsize in a paragraph
        fontsize = plh[Math.floor(0.85 * plh.length)] * yratio;
        this.fontSize(fontsize);
        lines = par.querySelectorAll('LINE');

        lines.forEach((line) => {
            // y position in a line
            ly = [];
            words = line.querySelectorAll('WORD');

            words.forEach((word) => {
                coords = word.attributes['coords'].value.split(',');
                ly.push(parseFloat(coords[3]));
            });

            ly.sort((a, b) => a - b);
            // shared y position in a line
            wy = ly[Math.floor(0.15 * ly.length)] * yratio - fontsize * 0.15;

            words.forEach((word) => {
                coords = word.attributes['coords'].value.split(',');
                wx = parseFloat(coords[0]) * xratio;
                this.text(word.textContent, wx, wy);
            });
        });
    });

    return this;
  },

  image2(pageindex, src, text, x, y, options = {}) {
    let image, left, left1;
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    x = (left = x != null ? x : options.x) != null ? left : this.x;
    y = (left1 = y != null ? y : options.y) != null ? left1 : this.y;

    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      if (src.width && src.height) {
        image = src;
      } else {
        image = this.openImage(src);
      }
    }

    this.addPage({
        pageindex
        , margin: 0
        , size: [image.width, image.height]
    });

    if (!image.obj) {
      image.embed(this);
    }

    if (this.page.xobjects[image.label] == null) {
      this.page.xobjects[image.label] = image.obj;
    }

    let w = options.width || image.width;
    let h = options.height || image.height;

    this.save();
    this.transform(w, 0, 0, -h, x, y + h);
    this.addContent(`/${image.label} Do`);
    this.restore();

    if (text == null || text == '') return this;

    this.opacity(0.0);
    const xmldoc = new DOMParser().parseFromString(text, 'text/xml');
    var divcoords = xmldoc.getElementsByTagName('div')[0].attributes['data-coords'];

    if (divcoords == null) {
        return this;
    }

    divcoords = divcoords.value.split(' ');
    const maxwidth = parseFloat(divcoords[2]);
    const maxheight = parseFloat(divcoords[3]);
    const xratio = w / maxwidth;
    const yratio = h / maxheight;

    // all paragraph in a page
    const pars= xmldoc.querySelectorAll('.ocr_par');
    var plh, words, coords, fontsize, lines, ly, wy, wx;

    pars.forEach((par) => {
        // line high in a paragraph
        plh = [];
        words = par.querySelectorAll('.ocrx_word');

        words.forEach((word) => {
            coords = word.attributes['data-coords'].value.split(' ');
            plh.push(parseFloat(coords[3]) - parseFloat(coords[1]));
        });

        plh.sort((a, b) => a - b);
        // shared fontsize in a paragraph
        fontsize = plh[Math.floor(0.85 * plh.length)] * yratio;
        this.fontSize(fontsize);
        lines = par.querySelectorAll('.ocr_line');

        lines.forEach((line) => {
            // y position in a line
            ly = [];
            words = line.querySelectorAll('.ocrx_word');

            words.forEach((word) => {
                coords = word.attributes['data-coords'].value.split(' ');
                ly.push(parseFloat(coords[1]));
            });

            ly.sort((a, b) => a - b);
            // shared y position in a line
            wy = ly[Math.floor(0.15 * ly.length)] * yratio - fontsize * 0.15;

            words.forEach((word) => {
                coords = word.attributes['data-coords'].value.split(' ');
                wx = parseFloat(coords[0]) * xratio;
                this.text(word.textContent, wx, wy);
            });
        });
    });

    return this;
  },

  openImage(src) {
    let image;
    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      image = PDFImage.open(src, `I${++this._imageCount}`);
      if (typeof src === 'string') {
        this._imageRegistry[src] = image;
      }
    }

    return image;
  }
};
