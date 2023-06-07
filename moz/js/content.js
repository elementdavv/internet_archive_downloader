/*
 * content.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(async () => {
    if (typeof window.content1iad === 'undefined' ) {
        const src = chrome.runtime.getURL('js/content1.js');
        window.content1iad = await import(src);
        window.content1iad.default();
    }
})();
