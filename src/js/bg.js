/*
 * bg.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

(() => {
    chrome.runtime.onConnect.addListener(port => {
        if (port.name == 'iadpop') {
            console.log(port.name + ' connect');
            let settings = {}, pending = false, changed = false;

            loadSettings().then(r => {
                settings = r;

                if (pending) {
                    pending = false;
                    port.postMessage({ settings });
                }
            });

            port.onDisconnect.addListener(p => {
                const e = p.error || chrome.runtime.lastError;

                if (e) {
                    console.log(`disconnected by error: ${e.message}`);
                }
                else {
                    console.log(p.name + ' disconnect');
                }

                if (changed) {
                    saveSettings(settings);
                    broadcast(settings);
                }
            });

            port.onMessage.addListener((message, sender, sendResponse) => {
                console.log(`receive ${message.cmd}`);
                console.log(message);

                if (message.cmd == 'settings') {
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
        console.log('broadcast settings');
        const detail = 'https://archive.org/details/*';
        const detail2 = 'https://babel.hathitrust.org/cgi/pt?id=*';
        const cmd = 'settings';
        const query = { url: [detail, detail2] };

        chrome.tabs.query(query, tabs => {
            tabs.forEach(tab => {
                if (tab.id != tabid) {
                    chrome.tabs.sendMessage(tab.id, { cmd, settings });
                }
            })
        });
    }

    var t = 0;

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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

    function showButtons(tab) {
        const detail = 'https://archive.org/details/';
        const detail2 = 'https://babel.hathitrust.org/cgi/pt?id=';
        const jsc = '/js/contents.js';

        if (tab.url.indexOf(detail) > -1) {
            if (dnr == 1) {
                injectjs(tab.id, jsc);
            }
            else {
                console.log('unsupport');
            }
        }
        else if (tab.url.indexOf(detail2) > -1) {
            injectjs(tab.id, jsc);
        }
    }

    function injectjs(tabId, js) {
        chrome.scripting.executeScript({
            files: [js],
            target: { tabId },
        });
    }

    // when new/abort download from extension
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (sender.id != chrome.runtime.id) return;

        console.log(`message received: ${message.cmd}`);
        console.log(message);
        const tabid = sender.tab?.id;
        let settings, fileidtab;

        switch (message.cmd) {
            case 'new':
                fileidtab = await loadFileidtab();
                const fileid = message.fileid;
                fileidtab.set(fileid, tabid);
                saveFileidtab(fileidtab);
                console.log(`fileid added: ${fileid}`);
                break;
            case 'abort':
                fileidtab = await loadFileidtab();
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
                }
                break;
            case 'settings':
                const cmd = 'settings';
                settings = await loadSettings();
                chrome.tabs.sendMessage(tabid, { cmd, settings });
                break;
            case 'setting':
                settings = await loadSettings();
                settings[message.name] = message.value;
                saveSettings(settings);
                broadcast(settings, tabid);
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
        if (downloadItem.startTime < startTime) return;

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

                chrome.tabs.sendMessage(tabid, {
                    cmd: 'create'
                });
            }
        });

        if (found != 0) {
            fileidtab.delete(found);
            saveFileidtab(fileidtab);
            console.log(`fileid removed: ${found}`);
        }
    });

    // when download paused/resume/canceled/error/complete from browser
    chrome.downloads.onChanged.addListener(async downloadDelta => {
        var downloadidtab = await loadDownloadidtab();
        const downloadid = '' + downloadDelta.id;
        if (!downloadidtab.has(downloadid)) return;

        console.log('download change:')
        console.log(downloadDelta);
        const tabid = parseInt(downloadidtab.get(downloadid));

        if (downloadDelta.paused != undefined && downloadDelta.paused.current == true) {
            chrome.tabs.sendMessage(tabid, {
                cmd: 'pause'
            });
        }
        else if (downloadDelta.paused != undefined && downloadDelta.paused.current == false) {
            chrome.tabs.sendMessage(tabid, {
                cmd: 'resume'
            });
        }
        else if (downloadDelta.error != undefined) {
            downloadidtab.delete(downloadid);
            saveDownloadidtab(downloadidtab);
            console.log(`downloadid removed: ${downloadid}`);

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
        }
    });

    const getOption = () => {
        const domain = 'archive.org';
        const origin = 'https://archive.org';
        const ruleid = 6984;

        return {
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

    function updateDnr() {
        if (chrome.declarativeNetRequest) {
            chrome.declarativeNetRequest.updateDynamicRules(getOption())
                .then(() => saveDnr())
                .catch(e => console.error(e));
        }
    }

    // dnr
    function saveDnr() {
        saveData('dnr', 1);
    }

    async function loadDnr() {
        return await loadData('dnr', 0)
    }

    // fileid to tabid map
    function saveFileidtab(fileidtab) {
        saveSessData('fileidtab', fileidtab);
    }

    async function loadFileidtab() {
        return await loadSessData('fileidtab', new Map());
    }

    // downloadid to tabid map
    function saveDownloadidtab(downloadidtab) {
        saveSessData('downloadidtab', downloadidtab);
    }

    async function loadDownloadidtab() {
        return await loadSessData('downloadidtab', new Map());
    }

    // settings
    function saveSettings(settings) {
        saveData('settings', settings);
    }

    async function loadSettings() {
        return await loadData('settings', defs);
    }

    function saveSessData(key, value) {
        console.log(`save ${key}`);
        console.log(value);

        if (value instanceof Map) {
            value = Object.fromEntries(value);
        }
        chrome.storage.session.set({ [key]: value });
    }

    async function loadSessData(key, defvalue = {}) {
        console.log(`load ${key}`);
        let r = await chrome.storage.session.get({ [key]: defvalue });
        r = r[key];

        if (defvalue instanceof Map) {
            r = new Map(Object.entries(r));
        }
        console.log(r);
        return r;
    }

    function saveData(key, value) {
        console.log(`save ${key}`);
        console.log(value);
        chrome.storage.local.set({ [key]: value });

    }

    async function loadData(key, defvalue = {}) {
        console.log(`load ${key}`);
        let r = await chrome.storage.local.get({ [key]: defvalue });
        r = r[key];
        console.log(r);
        return r;
    }

    async function start() {
        startTime = new Date().toJSON();
        console.log(`start bg: ${startTime}`);
        dnr = await loadDnr();

        if (dnr == 0) {
            updateDnr();

            setTimeout(async () => {
                dnr = await loadDnr();
            }, 2e3);
        }
    }

    const defs = {
        quality: 1,
        default_quality: 1,
        tasks: 10,
        default_tasks: 10,
        format: false,
        range: false,
        embed: true,
        progress: false,
        retry: 3,
        default_retry: 3,
        retern: true,
        notify: true,
    };

    var startTime;
    var dnr;
    start();
})();
