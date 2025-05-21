/*
 * hathitrust.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(async () => {
    if (window.hathitrust1iadinit === true) {
        return;
    }

    if (typeof window.hathitrust1iad === 'undefined' ) {
        const src = chrome.runtime.getURL('js/hathitrust1.js');
        window.hathitrust1iad = await import(src);
    }

    window.hathitrust1iad.default();

})();
