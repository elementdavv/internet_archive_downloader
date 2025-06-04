/*
 * stub1.js
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
        br.id = window.manifest.id;
        br.metadata = window.manifest.metadata;// author, title, publisher, publicationDate
        br.firstPageSeq = window.manifest.firstPageSeq;
        br.totalSeq = window.manifest.totalSeq;
        br.defaultImage = window.manifest.defaultImage;
        br.swInNavigator = navigator.serviceWorker != null;
        return JSON.stringify(br);
    }

    const getBookStatus = () => {
        let r = 2;

        if (!window.manifest) {
            console.log(`no book info, wait ${step}`);
            r = 0;
        }
        else if (!window.manifest.allowSinglePageDownload) {
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
