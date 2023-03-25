/*
 * bg.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */
(async function(){
    'use strict';

    chrome.action.onClicked.addListener(tab => {
        const newUrl = "https://archive.org";
        chrome.tabs.create({ url: newUrl })
    });

    const url = "https://archive.org/details";

    chrome.tabs.onUpdated.addListener((tabid, changeinfo, tab) => {
        if (changeinfo.status == 'complete' && tab.url.indexOf(url) == 0) {
            chrome.scripting.executeScript({
                files: ['js/content.js']
                , target: {tabId: tab.id}
            });
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
