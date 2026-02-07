/*
 * contents.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

(() => {
    if (window.internetarchivedownloaderinit === true) {
        return;
    }
    const isarchive = location.origin.indexOf('archive.org') > -1;

    if (isarchive) {
        const mediatype = document.querySelector("meta[property='mediatype'], meta[name='mediatype']");

        // filter out collection pages
        if (!mediatype || mediatype.content != "texts") {
            console.log("Internet Archive Downloader: Not a text item, skipping.");
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { });
            return;
        }
    }

    if (typeof window.internetarchivedownloader === 'undefined') {
        const url = isarchive ? 'js/archive.js' : 'js/hathitrust.js';
        const src = chrome.runtime.getURL(url);

        import(src).then(Contents => {
            window.internetarchivedownloader = new Contents.default();
            window.internetarchivedownloader.setup();
        });
    }
    else
        window.internetarchivedownloader.setup();

})();
