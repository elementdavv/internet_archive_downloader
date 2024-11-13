/*
 * popup/index.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(() => {
    'use strict';

    handleClick('id-archive', openUrl);
    handleClick('id-hathitrust', openUrl);
    handleClick('id-showbuttons', showButtons);
    handleClick('id-test', test);

    function handleClick(id, handler) {
        document.getElementById(id).addEventListener('click', handler, false);
    }

    function openUrl(e) {
        chrome.tabs.create({url: e.currentTarget.attributes.href.value});
        window.close();
    }

    const query = { active: true, currentWindow: true };
    const detail = 'https://archive.org/details';
    const search = 'https://archive.org/search';
    const detail2 = 'https://babel.hathitrust.org/cgi/pt';
    const js = 'js/content.js';
    const jst = 'js/test.js';
    const js2 = 'js/hathitrust.js';

    function showButtons() {
        console.log('show buttons');
        chrome.tabs.query(query, async tabs => {
            if (tabs.length == 0) return;
            var tab = tabs[0];

            if (tab.url.indexOf(detail) > -1) {
                const dnr = await loadDnr();
                if (dnr == 1)
                    injectjs(tab.id, js);
                else
                    console.log('Internet Archive unsupported');
            }
            else if (tab.url.indexOf(detail2) > -1)
                injectjs(tab.id, js2);
            else
                console.log('invalid location');
            window.close();
        });
    }

    function test() {
        console.log('test');
        chrome.tabs.query(query, tabs => {
            if (tabs.length == 0) return;
            var tab = tabs[0];
            if (tab.url.indexOf(detail) > -1 || tab.url.indexOf(search) > -1) {
                injectjs(tab.id, jst);
            }
            window.close();
        });
    }

    function injectjs(tabId, js) {
        chrome.scripting.executeScript({
            files: [js]
            , target: {tabId}
        });
    }

    async function loadDnr() {
        const r = await chrome.storage.session.get({ 'dnr': 0 });
        return parseInt(r.dnr);
    }

})();
