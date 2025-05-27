/*
 * contents.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(() => {
    if (window.internetarchivedownloaderinit === true) {
        return;
    }

    if (typeof window.internetarchivedownloader === 'undefined' ) {
        const url = location.origin.indexOf('archive.org') > -1
                ? 'js/archive.js'
                : 'js/hathitrust.js';
        const src = chrome.runtime.getURL(url);
        import(src).then( Contents => {
            window.internetarchivedownloader = new Contents.default();
            window.internetarchivedownloader.setup();
        });
    }
    else
        window.internetarchivedownloader.setup();

})();
