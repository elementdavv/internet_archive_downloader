/*
 * tbuf.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

const TBuf = {};

    let STR_APPLY_UIA_OK = true;

    try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }

    // Table with utf8 lengths (calculated by first byte of sequence)
    // Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
    // because max possible codepoint is 0x10ffff
    const _utf8len = new Uint8Array(256);
    for (let q = 0; q < 256; q++) {
        _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
    }
    _utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


    TBuf.str2Buffer = (str) => {
        if (typeof TextEncoder === 'function' && TextEncoder.prototype.encode) {
            return (new TextEncoder().encode(str)).buffer;
        }

        let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

        // count binary size
        for (m_pos = 0; m_pos < str_len; m_pos++) {
            c = str.charCodeAt(m_pos);
            if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
                c2 = str.charCodeAt(m_pos + 1);
                if ((c2 & 0xfc00) === 0xdc00) {
                    c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                    m_pos++;
                }
            }
            buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
        }

        // allocate buffer
        buf = new Uint8Array(buf_len);

        // convert
        for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
            c = str.charCodeAt(m_pos);
            if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
                c2 = str.charCodeAt(m_pos + 1);
                if ((c2 & 0xfc00) === 0xdc00) {
                    c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                    m_pos++;
                }
            }
            if (c < 0x80) {
                /* one byte */
                buf[i++] = c;
            } else if (c < 0x800) {
                /* two bytes */
                buf[i++] = 0xC0 | (c >>> 6);
                buf[i++] = 0x80 | (c & 0x3f);
            } else if (c < 0x10000) {
                /* three bytes */
                buf[i++] = 0xE0 | (c >>> 12);
                buf[i++] = 0x80 | (c >>> 6 & 0x3f);
                buf[i++] = 0x80 | (c & 0x3f);
            } else {
                /* four bytes */
                buf[i++] = 0xf0 | (c >>> 18);
                buf[i++] = 0x80 | (c >>> 12 & 0x3f);
                buf[i++] = 0x80 | (c >>> 6 & 0x3f);
                buf[i++] = 0x80 | (c & 0x3f);
            }
        }
        return buf.buffer;
    }

    // Helper
    // buf: byte array
    const buf2binstring = (buf, len) => {
        // On Chrome, the arguments in a function call that are allowed is `65534`.
        // If the length of the buffer is smaller than that, we can use this optimization,
        // otherwise we will take a slower path.
        if (len < 65534) {
            if (buf.subarray && STR_APPLY_UIA_OK) {
                return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
            }
        }

        let result = '';
        for (let i = 0; i < len; i++) {
            result += String.fromCharCode(buf[i]);
        }
        return result;
    }

    // convert array to string
    TBuf.dataView2Str = (view, max) => {
        const len = max || view.byteLength;

        if (typeof TextDecoder === 'function' && TextDecoder.prototype.decode) {
            return new TextDecoder().decode(new Uint8Array(view.buffer, 0, len));
        }

        let i, out;

        // Reserve max possible length (2 words per char)
        // NB: by unknown reasons, Array is significantly faster for
        //     String.fromCharCode.apply than Uint16Array.
        const utf16buf = new Array(len * 2);

        for (out = 0, i = 0; i < len;) {
            let c = view.getUint8(i++);
            // quick process ascii
            if (c < 0x80) { utf16buf[out++] = c; continue; }

            let c_len = _utf8len[c];
            // skip 5 & 6 byte codes
            if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

            // apply mask on first byte
            c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
            // join the rest
            while (c_len > 1 && i < len) {
                c = (c << 6) | (view.getUint8(i++) & 0x3f);
                c_len--;
            }

            // terminated by end of string?
            if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

            if (c < 0x10000) {
                utf16buf[out++] = c;
            } else {
                c -= 0x10000;
                utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
                utf16buf[out++] = 0xdc00 | (c & 0x3ff);
            }
        }
        return buf2binstring(utf16buf, out);
    }


    TBuf.dataView2Hex = (view) => {
        const result = [...new Uint8Array(view.buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
        return result;
    }

    TBuf.concatDataView = (arrays) => {
        let totalLength = 0;
        for (let arr of arrays) {
            totalLength += arr.byteLength;
        }
        let result = new Uint8Array(totalLength);
        let offset = 0;
        for (let arr of arrays) {
            result.set(new Uint8Array(arr.buffer, 0, arr.byteLength), offset);
            offset += arr.byteLength;
        }
        return new DataView(result.buffer);
    }

    // data to Uint8Array
    TBuf.convert = (chunk) => {
        if (Object.prototype.toString.call(chunk) !== '[object Uint8Array]') {
            if (chunk instanceof String || typeof chunk == 'string') {
                chunk = new TextEncoder().encode(chunk + '\n');
            }
            else {
                chunk = new Uint8Array(chunk.buffer);
            }
        }

        return chunk;
    }

    // Base64 to ArrayBuffer
    TBuf.base64ToBuffer = async (base64) => {
        // var dataUrl = "data:application/octet-binary;base64," + base64;
        var dataUrl = base64;
        const response = await fetch(dataUrl);
        return response.arrayBuffer();
    }

    // ArrayBuffer or Uint8Array to Base64
    TBuf.bufferToBase64 = async (buffer) => {
        // use a FileReader to generate a base64 data URI:
        const base64url = await new Promise(r => {
            const reader = new FileReader();
            reader.onload = () => r(reader.result);
            reader.readAsDataURL(new Blob([buffer]));
        });
        // remove the `data:...;base64,` part from the start
        // return base64url.substring(base64url.indexOf(',') + 1);
        return base64url;
    }

export default TBuf;
