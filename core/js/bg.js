/*
 * bg.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

(() => {
    chrome.runtime.onConnect.addListener( port => {
        if (port.name == 'iadpop') {
            console.log(port.name + ' connect');
            const key = 'settings';
            let settings = {};
            let pending = false;

            loadSettings( key ).then( r => {
                settings = r;

                if (pending) {
                    pending = false;
                    port.postMessage({ settings });
                }
            });
            let changed = false;

            port.onDisconnect.addListener( p => {
                const e = p.error || chrome.runtime.lastError;

                if (e) {
                    console.log(`disconnected by error: ${e.message}`);
                }
                else {
                    console.log(p.name + ' disconnect');
                }

                if (changed) {
                    saveData( key, settings );
                    broadcast( settings );
                }
            });

            port.onMessage.addListener( (message, sender, sendResponse) => {
                console.log( `receive ${message.cmd}` );
                console.log( message );

                if (message.cmd == key) {
                    if (settings.quality) {
                        port.postMessage({ settings });
                    }
                    else {
                        pending = true;
                    }
                }
                else if (message.cmd == 'setting') {
                    settings[message.name] = message.value;
                    changed = true;
                }
            });
        }
    });

    function broadcast(settings, tabid = null) {
        console.log( 'broadcast settings' );
        const detail = 'https://archive.org/details/*';
        const detail2 = 'https://babel.hathitrust.org/cgi/pt?id=*';
        const cmd =  'settings';
        const query = {url: [detail, detail2]};

        chrome.tabs.query(query, tabs => {
            tabs.forEach( tab => {
                if (tab.id != tabid){
                    chrome.tabs.sendMessage(tab.id, { cmd, settings });
                }
            })
        });
    }

    async function loadSettings(key) {
        const r = await loadData( key );
        return  Object.keys(r).length == 0  ? defs : r;
    }

    const defs = {
        quality: 1,
        default_quality: 1,
        tasks: 6,
        default_tasks: 6,
        format: false,
        range: false,
        embed: true,
        progress: false,
        retry: 3,
        default_retry: 3,
        retern: true,
        notify: true,
    };

    var t = 0;

    chrome.tabs.onUpdated.addListener( (tabId, changeInfo, tab) => {
        if (changeInfo.status == 'complete') {
            const t1 = performance.now();

            if (t1 - t > 1000) {
                showButtons(tab);
            }
            else {
                console.log('unexpected tab complete event');
            }
            t = t1;
        }
    });

    async function showButtons(tab) {
        const detail = 'https://archive.org/details/';
        const detail2 = 'https://babel.hathitrust.org/cgi/pt?id=';
        const jsc = '/js/contents.js';

        if (tab.url.indexOf(detail) > -1) {
            const dnr = await loadDnr();

            if (dnr == 1) {
                injectjs(tab.id, jsc);
            }
            else {
                console.log('Internet Archive Downloader unsupported.');
            }
        }
        else if (tab.url.indexOf(detail2) > -1) {
            injectjs(tab.id, jsc);
        }
    }

    function injectjs(tabId, js) {
        chrome.scripting.executeScript({
            files: [js]
            , target: {tabId}
        });
    }

    // when new/abort download from extension
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (sender.id != chrome.runtime.id) return;

        console.log(`message received: ${message.cmd}`);
        console.log(message);
        var fileidtab = await loadFileidtab();
        const tabid = sender.tab?.id;
        const key = 'settings';
        let settings;

        switch(message.cmd) {
            case 'new':
                const fileid = message.fileid;
                fileidtab.set(fileid, tabid);
                saveFileidtab(fileidtab);
                console.log(`fileid added: ${fileid}`);
                console.log(fileidtab);
                break;
            case 'abort':
                var found = 0;

                // if download hasn't begin
                fileidtab.forEach((tid, fileid) => {
                    if (parseInt(tid) == tabid) {
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

                downloadidtab.forEach((tid, downloadid) => {
                    if (parseInt(tid) == tabid) {
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
            case 'settings':
                const cmd = key;
                settings = await loadSettings( key );
                chrome.tabs.sendMessage(tabid, { cmd, settings });
                break;
            case 'setting':
                settings = await loadSettings( key );
                settings[message.name] = message.value;
                saveData( key, settings );
                broadcast( settings, tabid );
                break;
            case 'notify':
                chrome.notifications.create(message.options);
                break;
            case 'showButtons':
                showButtons(message.tab);
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

        if (downloadDelta.paused != undefined && downloadDelta.paused.current == true) {
            chrome.tabs.sendMessage(tabid, {
                cmd:'pause'
            });
        }
        else if (downloadDelta.paused != undefined && downloadDelta.paused.current == false) {
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
        else if (downloadDelta.state !== undefined && downloadDelta.state.current == 'complete') {
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

    function saveData(key, value) {
        console.log( `save ${key}` );
        console.log(value);
        chrome.storage.session.set({ [key]: value });
    }

    async function loadData(key) {
        console.log( `load ${key}` );
        const r = await chrome.storage.session.get({ [key]: {} });
        console.log( r[key] );
        return r[key];
    }

})();
