import PDFImage from '../pdfimage.js';

export default {
  initImages() {
    this._imageRegistry = {};
    return (this._imageCount = 0);
  },

  image(src, x, y, options = {}) {
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
