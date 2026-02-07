/*
 * stub1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Stub from './stub.js';

'use strict';

export default class Stub1 extends Stub {
    constructor() {
        super();
        const src = import.meta.url;
        this.tabid = src.substr(src.indexOf('=') + 1);
    }

    getBr = () => {
        const br = {};
        br.reductionFactors = window.br.reductionFactors;
        br.bookId = window.br.bookId;
        br.bookTitle = window.br.bookTitle;
        br.bookPath = window.br.bookPath;
        br.server = window.br.server;
        br.data = window.br.data.flat();
        br.protected = window.br.protected;
        br.swInNavigator = navigator.serviceWorker != null;
        return JSON.stringify(br);
    }

    getBookStatus = () => {
        let r = 2;

        if (!window.br) {
            console.log(`no book info, wait ${this.step}`);
            r = 0;
        }
        else if (!window.br.protected) {
            console.log('done');
        }
        else if (!window.br.options.lendingInfo.loanId) {
            console.log('book not borrowed yet, quit');
            r = 1;
        }
        else {
            console.log('done');
        }
        return r;
    }

    static {
        Stub.instance = new Stub1();
        Stub.instance.start();
    }
}
