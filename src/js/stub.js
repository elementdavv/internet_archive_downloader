/*
 * stub.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
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
        if (document.querySelector("meta[property='mediatype']").content != "texts") {
            console.log('media not book, quit');
            return 1;
        }
        if (!window.br) {
            console.log('no book info, wait ' + step);
            return 0;
        }
        if (!window.br.protected) {
            console.log('book always available, quit');
            return 1;
        }
        if (!window.br.options.lendingInfo.loanId) {
            console.log('book not borrowed yet, quit');
            return 1;
        }
        console.log('done');
        return 2;
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
            var br = '{}';
            if (st == 2) { br = getBr(); }
            window.postMessage({from: 'iad', cmd: 'init', content: br}, '*');
        }
    }

    var intervalid = setInterval(check, 1000);
})();
