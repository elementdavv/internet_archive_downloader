/*
 * stub.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(() => {
    var step = 0;
    const STEPLIMIT = 8;

    const getBr = () => {
        const br = {};
        br.reductionFactors = window.br.reductionFactors;
        br.bookId = window.br.bookId;
        br.data = window.br.data.flat();
        return JSON.stringify(br);
    }

    const getBookStatus = () => {
        let r = 2;

        if (document.querySelector("meta[property='mediatype']").content != "texts") {
            console.log('media not book, quit');
            r = 1;
        }
        else if (!window.br) {
            console.log(`no book info, wait ${step}`);
            r = 0;
        }
        else if (!window.br.protected) {
            console.log('book always available, quit');
            r = 1;
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
                let br = getBr();
                let origin = 'https://archive.org';
                window.postMessage({from: 'iad', cmd: 'init', br}, origin);
            }
        }
    }

    var intervalid = setInterval(check, 1000);

})();
