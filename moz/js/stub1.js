/*
 * stub.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(() => {
    var step = 0;
    const STEPLIMIT = 8;
    const origin = location.origin;
    const extid = document.currentScript.src.match(/[\-0-9a-z]+/g)[1];

    const getManifest = () => {
        const manifest = {};
        manifest.id = window.manifest.id;
        manifest.metadata = window.manifest.metadata;// author, title, publisher, publicationDate
        manifest.firstPageSeq = window.manifest.firstPageSeq;
        manifest.totalSeq = window.manifest.totalSeq;
        manifest.defaultImage = window.manifest.defaultImage;
        return JSON.stringify(manifest);
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
                window.postMessage({extid, cmd: 'init', manifest: getManifest()}, origin);
            }
        }
    }

    var intervalid = setInterval(check, 1000);

})();
