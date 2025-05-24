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
    this._imageCount = 0;
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

    if (text == null || text == '' || text.indexOf('OBJECT') == -1) return this;

    this.opacity(0.0);
    const xmldoc = new DOMParser().parseFromString(text, 'text/xml');
    var xmlobject = xmldoc.getElementsByTagName('OBJECT');

    if (xmlobject == null || xmlobject.length == 0) {
        return this;
    }

    const maxwidth = parseFloat(xmlobject[0].attributes['width'].value);
    const maxheight = parseFloat(xmlobject[0].attributes['height'].value);
    const xratio = w / maxwidth;
    const yratio = h / maxheight;

    const baseline = 'alphabetic';
    const lineBinds = this.getAllLineBinds(xmldoc, xratio);
    let l = 0;

    const pars = xmldoc.querySelectorAll('PARAGRAPH');
    pars.forEach( par => {
        const fs = this.getFs(par, yratio);
        if (!fs) return;

        const lines = par.querySelectorAll('LINE');
        lines.forEach( line => {
            const wy = this.getLineY(line, yratio, fs);
            if (!wy) return;

            const {overlaps, percent} = this.getOverLaps(fs, line, lineBinds[l++], xratio);
            this.fontSize(Math.floor(fs * percent));
            let word = line.firstElementChild;
            while (word) {
                // calculate word position x
                const coords = word.attributes['coords'].value.split(',');
                let wx = parseFloat(coords[0]) * xratio;
                const lineWidth = parseFloat(coords[2]) * xratio - wx;      // named by font context
                wx += overlaps.shift();
                this.text(this.correctString(word.textContent), wx, wy, { baseline, lineWidth, width : true, align: this.getAlign(), });
                word = word.nextElementSibling;
            };
        });
    });
    return this;
  },

    getOverLaps(fs, line, bs, xratio) {
        let loopcount = 0, percent = 1;
        while (true) {
            let res = this.loopOverLaps(fs * percent, line, bs, xratio);
            percent *= res.percent;
            if (res.percent >= 0.95 || ++loopcount >= 3) {
                return {overlaps: res.overlaps, percent};
            }
        }
    },

    // calculate word overlap in a line, text direction accounted
    loopOverLaps(fs, line, bs, xratio) {
        let {l, r} = bs;
        let overlaps = [], percent = 1;
        let lap = 0, lfree = 0, nx = 0;
        let p1 = this.rtl ? 2 : 0;
        this.fontSize(Math.floor(fs));
        let word = line.firstElementChild;
        while (word) {
            let wx = nx;
            if (wx == 0)
                wx = parseFloat(word.attributes['coords'].value.split(',')[p1]) * xratio;
            if (!word.previousElementSibling) {
                lfree = this.rtl ? wx - r : wx - l;
                overlaps.push(lap);
            }
            const wos = this.widthOfString(word.textContent);
            const nw = word.nextElementSibling;
            if (nw) {
                nx = parseFloat(nw.attributes['coords'].value.split(',')[p1]) * xratio;
                lap += this.rtl ? wx - wos - nx : wx + wos - nx;
                if (!this.rtl && lap < 0) lap = 0;
                if (this.rtl && lap > 0) lap = 0;
                overlaps.push(lap);
            }
            else {
                lap += this.rtl ? wx - wos - l : wx + wos - r;
                if ((!this.rtl && lap > 0) || (this.rtl && lap < 0)) {
                    const afree = lfree - lap;
                    let offs = 0;
                    if ((!this.rtl && afree >= 0) || (this.rtl && afree <= 0)) {
                        offs = lap;
                    }
                    else {
                        offs = lfree;
                        percent = (r - l) / (r - l + Math.abs(afree));
                    }
                    if (Math.abs(offs) > 0.1)
                        overlaps = overlaps.map(x => x - offs);
                }
            }
            word = nw;
        };
        return {overlaps, percent};
    },

    // calculate line position y
    getLineY(line, yratio, fs) {
        const words = line.querySelectorAll('WORD');
        if (words.length == 0) return null;
        const lys = [];
        words.forEach((word) => {
            const coords = word.attributes['coords'].value.split(',');
            const wb = parseFloat(coords[1]);
            lys.push(wb);
        });
        lys.sort((a, b) => a - b);
        let wy = lys[Math.floor(0.15 * lys.length)] * yratio - fs * 0.1;
        wy = Math.floor(wy);
        return wy;
    },

    // calculate paragraph fontsize
    getFs(par, yratio) {
        const words = par.querySelectorAll('WORD');
        if (words.length == 0) return null;
        let whs = [];
        words.forEach((word) => {
            const coords = word.attributes['coords'].value.split(',');
            const wh = parseFloat(coords[1]) - parseFloat(coords[3]);
            whs.push(wh);
        });
        this.rmOddValue(whs);
        whs.sort((a, b) => a - b);
        const fs = whs[Math.floor(0.85 * whs.length)] * yratio * this.fontSizeProportion();
        return fs;
    },

    // calculate all line x bingding
    getAllLineBinds(xmldoc, xratio) {
        const lbox = this.getAllLineBox(xmldoc);
        const lbs = new Array(lbox.length);
        let i = 0;
        const lines = xmldoc.querySelectorAll('LINE');
        for (let m = 0; m < lines.length; m++) {
            const line = lines[m];
            if (line.childElementCount > 0) {
                const box = lbox[i];
                let bs = this.getLineBind(lbs, i, box.x1, box.x2);
                let j = i, n = m;
                let line2 = lines[++n];
                while (line2) {
                    if (line2.childElementCount > 0) {
                        const box2 = lbox[++j];
                        if (!this.boxCompatible(box, box2)) {
                            let bs2 = this.getLineBind(lbs, j, box2.x1, box2.x2);
                            this.fitBind(box, box2, bs, bs2);
                            lbs[j] = bs2;
                        }
                    }
                    line2 = lines[++n];
                }
                lbs[i] = bs;
                i++;
            }
        };
        for (let j = 0; j < lbs.length; j++) {
            let bs = lbs[j];
            bs.l *= xratio;
            bs.r *= xratio;
            lbs[j] = bs;
        }
        return lbs;
    },

    // resolve binding conflict of two lines
    fitBind(box, box2, bs, bs2) {
        if (box.x2 < box2.x1) {
            const mid = (box.x2 + box2.x1) / 2;
            if (bs.r > mid) bs.r = mid;
            if (bs2.l < mid) bs2.l = mid;
        }
        else if (box.x1 > box2.x2) {
            const mid = (box.x1 + box2.x2) / 2;
            if (bs.l < mid) bs.l = mid;
            if (bs2.r > mid) bs2.r = mid;
        }
        else if (box.x2 > box2.x1 && box.x2 < box2.x2 && box.x1 < box2.x1) {
            bs.r = box.x2;
            bs2.l = box2.x1;
        }
        else if (box.x1 > box2.x1 && box.x1 < box2.x2 && box.x2 > box2.x2) {
            bs.l = box.x1;
            bs2.r = box2.x2;
        }
    },

    boxCompatible(b1, b2) {
        return b1.y1 < b2.y2 || b1.y2 > b2.y1;
    },

    // retrieve line binding, set default value if not exist
    // l, r: default value
    getLineBind(lbs, i, l, r) {
        let bs = lbs[i];
        if (!bs) {
            bs = {l, r};
            lbs[i] = bs;
        }
        return bs;
    },

    // calculate all line box
    getAllLineBox(xmldoc) {
        const lines = xmldoc.querySelectorAll('LINE');
        const lbox = [];
        lines.forEach( line => {
            const box = this.getLineBox(line);
            if (box) {
                lbox.push(box);
            }
        });
        return lbox;
    },

    // calculate line box
    getLineBox(line) {
        const words = line.querySelectorAll('WORD');
        if (words.length == 0) return null;
        let x1 = Number.MAX_VALUE, y1 = Number.MAX_VALUE, x2 = 0, y2 = 0;
        words.forEach( word => {
            const coords = word.attributes['coords'].value.split(',');
            x1 = Math.min(x1, parseFloat(coords[0]));
            y1 = Math.min(y1, parseFloat(coords[1]));
            x2 = Math.max(x2, parseFloat(coords[2]));
            y2 = Math.max(y2, parseFloat(coords[3]));
        });
        return {x1, y1, x2, y2};
    },

    // adjust forsize according to ascender & descender
    fontSizeProportion() {
        this.fontSize(1);
        return 1 / this.currentLineHeight();
    },

    // remove one abnormal value in a array if exist
    rmOddValue(arr) {
        if (arr.ength < 3) return;
        const sum = arr.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        for (let i = 0; i < arr.length; i++) {
            const x = arr[i];
            const aver = (sum - x) / (arr.length - 1);
            if (x >= aver * 1.5) {
                arr.splice(i, 1);
                return;
            }
        }
    },

    // handle text direction
    correctString(str) {
        return this.rtl ? this.rtl2ltr(str) : str;
    },

    // numbers should not be reversed
    rtl2ltr(str) {
        const arr = str.split(/([\d.]+)/g);         // split out numbers
        for (let i = 0; i < arr.length; i++) {
            let ar = arr[i];
            if (!(/^[\d.]+$/.test(ar))) {
                arr[i] = this.reverseChars(ar);
            }
        }
        return arr.reverse().join('');
    },

    // str should not include numbers
    // parenthes should be replaced
    reverseChars(str) {
        const marks = {
            '(': ')',
            ')': '(',
            '[': ']',
            ']': '[',
            '{': '}',
            '}': '{',
        };
        const arr = Array.from(str);
        for (let i = 0; i < arr.length; i++) {
            if (marks[arr[i]]) {
                arr[i] = marks[arr[i]];
            }
        }
        return arr.reverse().join('');
    },

    getAlign() {
        return this.rtl ? 'right' : 'left';
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
  },
};
