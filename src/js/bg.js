/*
 * bg.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(() => {
    'use strict';

    const host = 'archive.org';
    const origin = 'https://archive.org';
    const detail = 'https://archive.org/details';
    var dnr = !!chrome.declarativeNetRequest;

    chrome.action.onClicked.addListener(tab => {
        if (!dnr) {
            alert(chrome.i18n.getMessage('unsupported'));
            return;
        }

        if (tab.url.indexOf(detail) > -1) {
            injectjs(tab.id);
        }
        else if (tab.url.indexOf(origin) == -1) {
            chrome.tabs.create({url: origin});
        }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (!dnr) return;

        if (changeInfo.status == 'complete' && tab.url.indexOf(detail) > -1) {
            injectjs(tabId);
        }
    });

    function injectjs(tabId) {
        chrome.scripting.executeScript({
            files: ['js/content.js']
            , target: {tabId}
        });
    }

    var fileidtab = new Map();              // fileid to tabid map 
    var downloadidtab = new Map();          // downloadid to tabid map

    // when new/abort download from extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.from != 'iad') return;

        console.log('iad message received:');
        console.log(message);
        
        // each time when user initiate a download
        if (message.cmd == 'new') {
            const fileid = message.fileid;
            const tabid = sender.tab.id;
            fileidtab.set(fileid, tabid);
            console.log('fileid added: ' + fileid);
            console.log(fileidtab);
            sendResponse({fileid});
        }
        else if (message.cmd == 'abort') {
            // if user abort in save as dialog before actual download complete
            // at this moment, the download created event has not triggered
            // note: before user takes decision in save as dialog, actual download has already begin
            var found = 0;

            fileidtab.forEach((tabid, fileid, map) => {
                if (tabid == sender.tab.id) {
                    found = fileid;
                }
            });

            if (found != 0) {
                fileidtab.delete(found);
                console.log('fileid removed:' + found);
                console.log(fileidtab);
            }

            // if user interrupt during download
            found = 0;

            downloadidtab.forEach((tabid, downloadid, map) => {
                if (tabid == sender.tab.id) {
                    found = downloadid;
                    chrome.downloads.cancel(downloadid);
                    console.log('download aborted:' + downloadid);
                    sendResponse({fileid: 0});      // download canceled
                }
            });

            if (found != 0) {
                downloadidtab.delete(found);
                console.log('download removed: ' + found);
                console.log(downloadidtab);
            }
        }
    });

    // when user confirm in save as dialog
    chrome.downloads.onCreated.addListener(downloadItem => {
        if (fileidtab.size == 0) return;

        console.log('iad download created:')
        console.log(downloadItem);
        var fileurl = downloadItem.url;
        var found = 0;

        fileidtab.forEach((tabid, fileid, map) => {
            if (fileurl.indexOf(fileid) > -1) {
                found = fileid;
                downloadidtab.set(downloadItem.id, tabid);
                console.log('download added: ' + downloadItem.id);
                console.log(downloadidtab);
            }
        });

        if (found != 0) {
            fileidtab.delete(found);
            console.log('fileid removed: ' + found);
            console.log(fileidtab);
        }
    });

    // when download paused/resume/canceled/error/complete from browser
    chrome.downloads.onChanged.addListener(downloadDelta => {
        if (!downloadidtab.has(downloadDelta.id)) return;

        console.log('iad download change:')
        console.log(downloadDelta);
        const downloadid = downloadDelta.id;
        const tabid = downloadidtab.get(downloadid);

        if (downloadDelta.paused != undefined && downloadDelta.paused.current == true) {
            chrome.tabs.sendMessage(tabid, {
                from: 'iad'
                , cmd:'pause'
            });
        }
        else if (downloadDelta.paused != undefined && downloadDelta.paused.current == false) {
            chrome.tabs.sendMessage(tabid, {
                from: 'iad'
                , cmd:'resume'
            });
        }
        else if (downloadDelta.error != undefined) {
            downloadidtab.delete(downloadid);
            if (downloadDelta.error.current == 'USER_CANCELED') {
                chrome.tabs.sendMessage(tabid, {
                    from: 'iad'
                    , cmd: 'cancel'
                });
            }
            else {
                chrome.downloads.cancel(downloadid);
                console.log('download removed: ' + downloadid);
                console.log(downloadidtab);

            }
        }
        else if (downloadDelta.state !== undefined && downloadDelta.state.current == 'complete') {
            downloadidtab.delete(downloadid);
            console.log('download removed: ' + downloadid);
            console.log(downloadidtab);
        }
    });

    const getOption = () => {
        return  {
            removeRuleIds: [1]
            , addRules: [
                {
                    id: 1
                    , priority: 1
                    , condition: {
                        urlFilter: '*'
                        , initiatorDomains: [host]
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
        chrome.declarativeNetRequest.updateSessionRules(getOption());
        console.log('cors ok.');
    }

})();
