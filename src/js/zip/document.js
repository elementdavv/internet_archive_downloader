/*
 * document.js for ZIP
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import TBuf from '../utils/tbuf.js';

class ZIPDocument {
    constructor(writer) {
        this.writer = writer;
        this.files = Object.create(null);
        this.filenames = [];
        this.encoder = new TextEncoder();
        this.offset = 0;
        this.error = null;

        // use to trigger download event in streamsaver
        var code = getDataHelper(8);
        code.view.setUint32(0, 0x504b0304);
        code.view.setUint32(4, 0x14000808);
        this.write(code.array);
        this.first = true;
    }

    /**
     * add file to zip
*    * params: name, directory, lastModified, comment, view 
     */
    image(fileLike) {
        let name = fileLike.name.trim();
        const data = fileLike.view;

        if (fileLike.directory) {
            if (!name.endsWith('/')) name += '/';
        }
        else {
            var ext = '';

            if (data.getUint16(0) === 0xffd8) {
                ext = '.jpg';
            } else if (data.getUint16(0) === 0x8950 && data.getUint16(2) === 0x4e47) {
                ext = '.png';
            }
            name += ext;
        }

        if (this.files[name]) throw new Error('File already exists.');

        const nameBuf = this.encoder.encode(name);
        this.filenames.push(name);

        const zipObject = this.files[name] = {
            date: new Date(typeof fileLike.lastModified === 'undefined' ? Date.now() : fileLike.lastModified),
            level: 0,
            directory: !!fileLike.directory,
            nameBuf,
            comment: this.encoder.encode(fileLike.comment || ''),
            compressedLength: 0,
            uncompressedLength: 0,
        };
        this.writeHeader(zipObject);
        this.writerImage(zipObject, fileLike.view);
        this.writeFooter(zipObject);
    }

    writeHeader(zipObject) {
        var header = getDataHelper(26);
        var data = getDataHelper(30 + zipObject.nameBuf.length);
        var date = zipObject.date;
        zipObject.offset = this.offset;
        zipObject.header = header;

        if (zipObject.level !== 0 && !zipObject.directory) {
            header.view.setUint16(4, 0x0800);
        }
        header.view.setUint32(0, 0x14000808);
        header.view.setUint16(6, (((date.getHours() << 6) | date.getMinutes()) << 5) | date.getSeconds() / 2, true);
        header.view.setUint16(8, ((((date.getFullYear() - 1980) << 4) | (date.getMonth() + 1)) << 5) | date.getDate(), true);
        header.view.setUint16(22, zipObject.nameBuf.length, true);
        data.view.setUint32(0, 0x504b0304);
        data.array.set(header.array, 4);
        data.array.set(zipObject.nameBuf, 30);
        this.offset += data.array.length;

        if (this.first) {
            this.first = false;
            this.write(new Uint8Array(data.array.buffer, 8));
        }
        else {
            this.write(data.array);
        }
    }

    writerImage(zipObject, view) {
        if (zipObject.directory) return;

        zipObject.crc = new Crc32();
        zipObject.crc.append(view);
        zipObject.uncompressedLength += view.byteLength;
        zipObject.compressedLength += view.byteLength;
        this.write(view);
    }

    writeFooter(zipObject) {
        var footer = getDataHelper(16);
        footer.view.setUint32(0, 0x504b0708);

        if (zipObject.crc) {
            zipObject.header.view.setUint32(10, zipObject.crc.get(), true);
            zipObject.header.view.setUint32(14, zipObject.compressedLength, true);
            zipObject.header.view.setUint32(18, zipObject.uncompressedLength, true);
            footer.view.setUint32(4, zipObject.crc.get(), true);
            footer.view.setUint32(8, zipObject.compressedLength, true);
            footer.view.setUint32(12, zipObject.uncompressedLength, true);
        }
        this.write(footer.array);
        this.offset += zipObject.compressedLength + 16;
    }

    write(data) {
        if (!this.error) this.writer.write(TBuf.convert(data)).catch(e=>this.error=e);
    }

    end() {
        var length = 0;
        var index = 0;
        var indexFilename, file;

        for (indexFilename = 0; indexFilename < this.filenames.length; indexFilename++) {
            file = this.files[this.filenames[indexFilename]];
            length += 46 + file.nameBuf.length + file.comment.length
        }
        const data = getDataHelper(length + 22);

        for (indexFilename = 0; indexFilename < this.filenames.length; indexFilename++) {
            file = this.files[this.filenames[indexFilename]];
            data.view.setUint32(index, 0x504b0102);
            data.view.setUint16(index + 4, 0x1400);
            data.array.set(file.header.array, index + 6);
            data.view.setUint16(index + 32, file.comment.length, true);
            if (file.directory) {
                data.view.setUint8(index + 38, 0x10);
            }
            data.view.setUint32(index + 42, file.offset, true);
            data.array.set(file.nameBuf, index + 46);
            data.array.set(file.comment, index + 46 + file.nameBuf.length);
            index += 46 + file.nameBuf.length + file.comment.length;
        }
        data.view.setUint32(index, 0x504b0506);
        data.view.setUint16(index + 8, this.filenames.length, true);
        data.view.setUint16(index + 10, this.filenames.length, true);
        data.view.setUint32(index + 12, length, true);
        data.view.setUint32(index + 16, this.offset, true);
        this.write(data.array);
        // this.writer.close();
    }

    toString() {
        return '[object ZIPDocument]';
    }
}

class Crc32 {
    constructor () {
        this.crc = -1;
    }

    append (data) {
        var crc = this.crc | 0; var table = this.table;

        for (var offset = 0, len = data.byteLength | 0; offset < len; offset++) {
            crc = (crc >>> 8) ^ table[(crc ^ data.getInt8(offset)) & 0xFF];
        }
        this.crc = crc;
    }

    get () {
        return ~this.crc;
    }
}

Crc32.prototype.table = (() => {
    var i; var j; var t; var table = [];

    for (i = 0; i < 256; i++) {
        t = i;
        for (j = 0; j < 8; j++) {
            t = (t & 1) ? (t >>> 1) ^ 0xEDB88320 : t >>> 1;
        }
        table[i] = t;
    }
    return table;
})()

const getDataHelper = byteLength => {
    var uint8 = new Uint8Array(byteLength);

    return {
        array: uint8,
        view: new DataView(uint8.buffer)
    }
}

export default ZIPDocument;
