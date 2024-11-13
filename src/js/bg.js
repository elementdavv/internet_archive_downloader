/*
 * bg.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(() => {
    'use strict';

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        const detail = 'https://archive.org/details';
        const detail2 = 'https://babel.hathitrust.org/cgi/pt';
        const js = 'js/content.js';
        const js2 = 'js/hathitrust.js';

        if (changeInfo.status == 'complete') {
            if (tab.url.indexOf(detail) > -1) {
                const dnr = await loadDnr();

                if (dnr == 1) {
                    injectjs(tabId, js);
                }
            }
            else if (tab.url.indexOf(detail2) > -1) {
                injectjs(tabId, js2);
            }
        }
    });

    function injectjs(tabId, js) {
        chrome.scripting.executeScript({
            files: [js]
            , target: {tabId}
        });
    }

    // when new/abort download from extension
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (sender.id != chrome.runtime.id) return;

        console.log('message received:');
        console.log(message);
        var fileidtab = await loadFileidtab();

        switch(message.cmd) {
            case 'new':
                const fileid = message.fileid;
                const tabid = sender.tab.id;
                fileidtab.set(fileid, tabid);
                saveFileidtab(fileidtab);
                console.log(`fileid added: ${fileid}`);
                console.log(fileidtab);
                break;
            case 'abort':
                var found = 0;

                // if download hasn't begin
                fileidtab.forEach((tabid, fileid) => {
                    if (parseInt(tabid) == sender.tab.id) {
                        found = fileid;
                    }
                });

                if (found != 0) {
                    fileidtab.delete(found);
                    saveFileidtab(fileidtab);
                    console.log(`fileid removed: ${found}`);
                    console.log(fileidtab);
                }

                // if user interrupt during download
                found = 0;
                var downloadidtab = await loadDownloadidtab();

                downloadidtab.forEach((tabid, downloadid) => {
                    if (parseInt(tabid) == sender.tab.id) {
                        found = downloadid;
                        chrome.downloads.cancel(parseInt(downloadid));
                        console.log(`download aborted: ${downloadid}`);
                    }
                });

                if (found != 0) {
                    downloadidtab.delete(found);
                    saveDownloadidtab(downloadidtab);
                    console.log(`downloadid removed: ${found}`);
                    console.log(downloadidtab);
                }

                break;
            default:
                break;
        }

        sendResponse({});
    });

    // when user confirm in save as dialog/automatic confirm
    chrome.downloads.onCreated.addListener(async downloadItem => {
        var fileidtab = await loadFileidtab();

        if (fileidtab.size == 0) return;

        console.log('download created:')
        console.log(downloadItem);
        const downloadid = downloadItem.id;
        const fileurl = downloadItem.url;
        var downloadidtab = await loadDownloadidtab();
        var found = 0;

        fileidtab.forEach((tabid, fileid) => {
            if (fileurl.indexOf(fileid) > -1) {
                found = fileid;
                downloadidtab.set(downloadid, tabid);
                saveDownloadidtab(downloadidtab);
                console.log(`downloadid added: ${downloadid}`);
                console.log(downloadidtab);

                chrome.tabs.sendMessage(tabid, {
                    cmd:'create'
                });
            }
        });

        if (found != 0) {
            fileidtab.delete(found);
            saveFileidtab(fileidtab);
            console.log(`fileid removed: ${found}`);
            console.log(fileidtab);
        }
    });

    // when download paused/resume/canceled/error/complete from browser
    chrome.downloads.onChanged.addListener(async downloadDelta => {
        var downloadidtab = await loadDownloadidtab();

        if (!downloadidtab.has('' + downloadDelta.id)) return;

        console.log('download change:')
        console.log(downloadDelta);
        const downloadid = '' + downloadDelta.id;
        const tabid = parseInt(downloadidtab.get(downloadid));

        if (downloadDelta.paused != undefined
            && downloadDelta.paused.current == true) {
            chrome.tabs.sendMessage(tabid, {
                cmd:'pause'
            });
        }
        else if (downloadDelta.paused != undefined
            && downloadDelta.paused.current == false) {
            chrome.tabs.sendMessage(tabid, {
                cmd:'resume'
            });
        }
        else if (downloadDelta.error != undefined) {
            downloadidtab.delete(downloadid);
            saveDownloadidtab(downloadidtab);
            console.log(`downloadid removed: ${downloadid}`);
            console.log(downloadidtab);

            if (downloadDelta.error.current == 'USER_CANCELED') {
                chrome.tabs.sendMessage(tabid, {
                    cmd: 'cancel'
                });
            }
            else {
                chrome.downloads.cancel(parseInt(downloadid));
            }
        }
        else if (downloadDelta.state !== undefined
            && downloadDelta.state.current == 'complete') {
            downloadidtab.delete(downloadid);
            saveDownloadidtab(downloadidtab);
            console.log(`downloadid removed: ${downloadid}`);
            console.log(downloadidtab);
        }
    });

    const getOption = () => {
        const domain = 'archive.org';
        const origin = 'https://archive.org';
        const ruleid = 6984;

        return  {
            removeRuleIds: [ruleid]
            , addRules: [
                {
                    id: ruleid
                    , priority: 1
                    , condition: {
                        initiatorDomains: [domain]
                    }
                    , action: {
                        type: 'modifyHeaders'
                        , responseHeaders: [
                            {
                                header: 'Access-Control-Allow-Origin'
                                , operation: 'set'
                                , value: origin
                            }
                            , {
                                header: 'Access-Control-Allow-Credentials'
                                , operation: 'set'
                                , value: 'true'
                            }
                        ]
                    }
                }
            ]
        };
    }

    if (chrome.declarativeNetRequest) {
        chrome.declarativeNetRequest.updateSessionRules(getOption())
            .then(()=>saveDnr())
            .catch(e=>console.error(e));
    }

    // for Brave
    setTimeout(async () => {
        const dnr = await loadDnr();
        if (dnr == 0) {
            chrome.runtime.reload();
        }
    }, 2e3);

    // storage
    // dnr
    function saveDnr() {
        chrome.storage.session.set({ 'dnr': 1 });
    }

    async function loadDnr() {
        const r = await chrome.storage.session.get({ 'dnr': 0 });
        return parseInt(r.dnr);
    }

    // fileid to tabid map
    function saveFileidtab(fileidtab) {
        chrome.storage.session.set({'fileidtab': Object.fromEntries(fileidtab)});
    }

    async function loadFileidtab() {
        const r = await chrome.storage.session.get({'fileidtab': {}});
        return new Map(Object.entries(r.fileidtab));
    }

    // downloadid to tabid map
    function saveDownloadidtab(downloadidtab) {
        chrome.storage.session.set({'downloadidtab': Object.fromEntries(downloadidtab)});
    }

    async function loadDownloadidtab() {
        const r = await chrome.storage.session.get({'downloadidtab': {}});
        return new Map(Object.entries(r.downloadidtab));
    }

})();
