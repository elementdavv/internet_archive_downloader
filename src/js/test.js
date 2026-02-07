/*
 * test.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

(async () => {
    const mediatype = document.querySelector("meta[property='mediatype']");

    if (!mediatype) {
        const href = window.location.href;

        if (href.indexOf('lending') == -1) {
            var uri = href.indexOf("?") > -1 ? "&" : "?";
            uri = href + uri + 'and%5B%5D=lending%3A"is_lendable"';
            window.location.href = uri;
        }
    }

})();
