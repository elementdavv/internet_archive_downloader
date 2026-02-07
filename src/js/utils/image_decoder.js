/*
 * image_decoder.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

class ImageDecoder {
    static async decodeArchiveImage(response) {
        var imageBuffer = await response.arrayBuffer();
        const obfuscationHeader = response.headers.get("X-Obfuscate");

        if (obfuscationHeader) {
            const counter = obfuscationHeader.split("|")[1];
            const aesKey = response.url.replace(/https?:\/\/.*?\//, "/");
            const decryptedBuffer = await this.decrypt(imageBuffer.slice(0, 1024), aesKey, counter);
            const decryptedImageBuffer = new Uint8Array(imageBuffer);
            decryptedImageBuffer.set(new Uint8Array(decryptedBuffer), 0);
            imageBuffer = decryptedImageBuffer.buffer;
        }
        return imageBuffer;
    }

    static async decrypt(buffer, aesKey, counter) {
        const aesKeyArr = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(aesKey));
        const key = await crypto.subtle.importKey("raw", aesKeyArr.slice(0, 16), "AES-CTR", false, ["decrypt"]);
        return await crypto.subtle.decrypt(
            {
                name: "AES-CTR",
                length: 64,
                counter: new Uint8Array(atob(counter).split("").map(char => char.charCodeAt(0))),
            },
            key,
            buffer,
        );
    }
}

export default ImageDecoder;
