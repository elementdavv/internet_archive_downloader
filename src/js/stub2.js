/*
 * stub2.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Stub from './stub.js';

'use strict';

export default class Stub2 extends Stub {
    constructor() {
        super();
        const src = import.meta.url;
        this.tabid = src.substr(src.indexOf('=') + 1);
    }

    getBr = () => {
        const br = {};
        br.id = window.manifest.id;
        br.metadata = window.manifest.metadata;// author, title, publisher, publicationDate
        br.firstPageSeq = window.manifest.firstPageSeq;
        br.totalSeq = window.manifest.totalSeq;
        br.defaultImage = window.manifest.defaultImage;
        br.swInNavigator = navigator.serviceWorker != null;
        return JSON.stringify(br);
    }

    getBookStatus = () => {
        let r = 2;

        if (!window.manifest) {
            console.log(`no book info, wait ${this.step}`);
            r = 0;
        }
        else if (!window.manifest.allowSinglePageDownload) {
            console.log('downloads not available, quit');
            r = 1;
        }
        else {
            console.log('done');
        }
        return r;
    }

    static {
        Stub.instance = new Stub2();
        Stub.instance.start();
    }
}
