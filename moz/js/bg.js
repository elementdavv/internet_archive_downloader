/*
 * bg.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

(function(){
    'use strict';

    chrome.action.onClicked.addListener(tab => {
        const url = "https://archive.org";
        chrome.tabs.create({ url: url })
    });

    chrome.tabs.onUpdated.addListener((tabid, changeinfo, tab) => {
        const url = "https://archive.org/details";
        if (changeinfo.status == 'complete' && tab.url.indexOf(url) == 0) {
            chrome.scripting.executeScript({
                files: ['js/content.js']
                , target: {tabId: tabid}
            });
        }
    });

    var fileidtab = new Map();              // fileid to tabid map 
    var downloadidtab = new Map();          // downloadid to tabid map

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('message received:');
        console.log(message);
        if (message.from != 'iad') return;
        
        // each time when user initiate a download
        if (message.cmd == 'download') {
            const fileid = message.fileid;
            const tabid = sender.tab.id;
            fileidtab.set(fileid, tabid);
            console.log('fileid added: ' + fileid);
            console.log(fileidtab);
            sendResponse({fileid: fileid});
        }
        else if (message.cmd == 'cancel') {
            // if user cancel in save as dialog before actual download complete
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
                    console.log('download canceled:' + downloadid);
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
        console.log('download created:')
        console.log(downloadItem);
        var fileurl = downloadItem.url;
        var found = 0;

        fileidtab.forEach((tabid, fileid, map) => {
            var exist = fileurl.indexOf(fileid);
            if (exist > -1) {
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

    chrome.downloads.onChanged.addListener(downloadDelta => {
        console.log('download change:')
        console.log(downloadDelta);
        const downloadid = downloadDelta.id;
        if (!downloadidtab.has(downloadid)) return;
        const tabid = downloadidtab.get(downloadid);

        // when error occured, mostly user cancel from browser download list
        if (downloadDelta.error != undefined) {
            downloadidtab.delete(downloadid);
            chrome.tabs.sendMessage(tabid, {
                from: 'iad',
                cmd:'error',
                error: downloadDelta.error.current
            });
        }

        // when download complete
        else if (downloadDelta.state !== undefined) {
            const state = downloadDelta.state.current;
            if (state == 'complete') {
                downloadidtab.delete(downloadid);
                console.log('download removed: ' + downloadid);
                console.log(downloadidtab);
            }
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
                        , initiatorDomains: ['archive.org']
                    }
                    , action: {
                        type: 'modifyHeaders'
                        , responseHeaders: [
                            {
                                header: 'Access-Control-Allow-Origin'
                                , operation: 'set'
                                , value: 'https://archive.org'
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
    chrome.declarativeNetRequest.updateSessionRules(getOption());

})();
