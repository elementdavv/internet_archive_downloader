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
            console.log('browser unsupported');
        }
        // on old kiwi, tabs updated complete event not triggered, to work from here
        else if (tab.url.indexOf(detail) > -1) {
            injectjs(tab.id);
        }
        else if (tab.url.indexOf(origin) == -1) {
            chrome.tabs.create({url: origin});
        }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (dnr && changeInfo.status == 'complete' && tab.url.indexOf(detail) > -1) {
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
        if (sender.id != chrome.runtime.id) return;

        console.log('message received:');
        console.log(message);
        
        switch(message.cmd) {
            case 'new':
                const fileid = message.fileid;
                const tabid = sender.tab.id;
                fileidtab.set(fileid, tabid);
                console.log(`fileid added: ${fileid}`);
                console.log(fileidtab);
                break;
            case 'abort':
                // if user abort in save as dialog before actual download complete
                // at this moment, the download created event has not triggered
                // note: before user takes decision in save as dialog, actual download has already begin
                var found = 0;

                fileidtab.forEach((tabid, fileid) => {
                    if (tabid == sender.tab.id) {
                        found = fileid;
                    }
                });

                if (found != 0) {
                    fileidtab.delete(found);
                    console.log(`fileid removed: ${found}`);
                    console.log(fileidtab);
                }

                // if user interrupt during download
                found = 0;

                downloadidtab.forEach((tabid, downloadid) => {
                    if (tabid == sender.tab.id) {
                        found = downloadid;
                        chrome.downloads.cancel(downloadid);
                        console.log(`download aborted: ${downloadid}`);
                    }
                });

                if (found != 0) {
                    downloadidtab.delete(found);
                    console.log(`downloadid removed: ${found}`);
                    console.log(downloadidtab);
                }

                break;
            default:
                break;
        }

        sendResponse({});
    });

    // when user confirm in save as dialog
    chrome.downloads.onCreated.addListener(downloadItem => {
        if (fileidtab.size == 0) return;

        console.log('download created:')
        console.log(downloadItem);
        const downloadid = downloadItem.id;
        const fileurl = downloadItem.url;
        var found = 0;

        fileidtab.forEach((tabid, fileid) => {
            if (fileurl.indexOf(fileid) > -1) {
                found = fileid;
                downloadidtab.set(downloadid, tabid);
                console.log(`downloadid added: ${downloadid}`);
                console.log(downloadidtab);
            }
        });

        if (found != 0) {
            fileidtab.delete(found);
            console.log(`fileid removed: ${found}`);
            console.log(fileidtab);
        }
    });

    // when download paused/resume/canceled/error/complete from browser
    chrome.downloads.onChanged.addListener(downloadDelta => {
        if (!downloadidtab.has(downloadDelta.id)) return;

        console.log('download change:')
        console.log(downloadDelta);
        const downloadid = downloadDelta.id;
        const tabid = downloadidtab.get(downloadid);

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
            console.log(`downloadid removed: ${downloadid}`);
            console.log(downloadidtab);

            if (downloadDelta.error.current == 'USER_CANCELED') {
                chrome.tabs.sendMessage(tabid, {
                    cmd: 'cancel'
                });
            }
            else {
                chrome.downloads.cancel(downloadid);
            }
        }
        else if (downloadDelta.state !== undefined
            && downloadDelta.state.current == 'complete') {
            downloadidtab.delete(downloadid);
            console.log(`downloadid removed: ${downloadid}`);
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
        chrome.declarativeNetRequest.updateSessionRules(getOption())
        .then(console.log('cors ok.'))
        .catch(e=>console.error(e));
    }

})();
