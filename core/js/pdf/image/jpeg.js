const MARKERS = [
  0xffc0, 0xffc1, 0xffc2, 0xffc3, 0xffc5, 0xffc6, 0xffc7, 0xffc8, 0xffc9,
  0xffca, 0xffcb, 0xffcc, 0xffcd, 0xffce, 0xffcf,
];

const COLOR_SPACE_MAP = {
  1: 'DeviceGray',
  3: 'DeviceRGB',
  4: 'DeviceCMYK',
};

class JPEG {
  constructor(data, label) {
    let marker;
    this.data = data;
    this.label = label;
    if (this.data.getUint16(0) !== 0xffd8) {
      throw 'SOI not found in JPEG';
    }

    let pos = 2;
    while (pos < this.data.byteLength) {
      marker = this.data.getUint16(pos);
      pos += 2;
      if (MARKERS.includes(marker)) {
        break;
      }
      pos += this.data.getUint16(pos);
    }

    if (!MARKERS.includes(marker)) {
      throw 'Invalid JPEG.';
    }
    pos += 2;

    this.bits = this.data.getUint8(pos++);
    this.height = this.data.getUint16(pos);
    pos += 2;

    this.width = this.data.getUint16(pos);
    pos += 2;

    const channels = this.data.getUint8(pos++);
    this.colorSpace = COLOR_SPACE_MAP[channels];

    this.obj = null;
  }

  embed(document) {
    if (this.obj) {
      return;
    }

    this.obj = document.ref({
      Type: 'XObject',
      Subtype: 'Image',
      BitsPerComponent: this.bits,
      Width: this.width,
      Height: this.height,
      ColorSpace: this.colorSpace,
      Filter: 'DCTDecode',
    });

    // add extra decode params for CMYK images. By swapping the
    // min and max values from the default, we invert the colors. See
    // section 4.8.4 of the spec.
    if (this.colorSpace === 'DeviceCMYK') {
      this.obj.data['Decode'] = [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0];
    }

    this.obj.end(this.data);

    // free memory
    return (this.data = null);
  }
}

export default JPEG;
