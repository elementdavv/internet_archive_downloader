/*
 * stub.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

(() => {
    var step = 0;
    const STEPLIMIT = 8;
    const src = document.currentScript.src;
    const tabid = src.substr(src.indexOf('=') + 1);

    const getBr = () => {
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

    const getBookStatus = () => {
        let r = 2;

        // for collection, mediatype not exist
        const mediatype = document.querySelector("meta[property='mediatype']");

        if (!mediatype || mediatype.content != "texts") {
            console.log('media not book, quit');
            r = 1;
        }
        else if (!window.br) {
            console.log(`no book info, wait ${step}`);
            r = 0;
        }
        else if (!window.br.protected) {
            ;
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

    const check = () => {
        const st = getBookStatus();

        if (st == 0) {
            if (++step == STEPLIMIT) {
                console.log('wait timeout, quit');
                clearInterval(intervalid);
                intervalid = null;
            }
        }
        else {
            clearInterval(intervalid);
            intervalid = null;

            if (st == 2) {
                window.postMessage({ tabid, cmd: 'init', br: getBr() });
            }
        }
    }

    var intervalid = setInterval(check, 1000);

})();
