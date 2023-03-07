/*
 * bg.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */
(function(){
    'use strict';

    var tabid = 0;
    var fileid = "";            // base filename of the book
    var filemap = new Map();    // downloadid to page number map

    chrome.downloads.onCreated.addListener(item => {
        // console.log(item);
        if (fileid == "") return;
        if (item.filename !== undefined) {
            getfile(item);
        }
    });

    chrome.downloads.onChanged.addListener(delta => {
        // console.log(delta);
        if (fileid == "") return;
        if (delta.filename !== undefined) {
            getfile(delta);
        }
        else if (delta.state !== undefined) {
            const index = filemap.get(delta.id);
            if (index !== undefined) {
                const state = delta.state.current;
                if (state != 'in_progress') {
                    filemap.delete(delta.id);
                    chrome.tabs.sendMessage(tabid, {
                        index: index,
                        state: state
                    });
                }
            }
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // console.log(message);
        if (message.fileid !== undefined) {
            tabid = sender.tab.id;
            fileid = message.fileid;
            sendResponse({fileid: fileid});
        }
        // else if (message.pagecount !== undefined) {
        //     const complete = download(message);
        // }
    });

    function getfile(item){
        var filepath = item.filename;
        if (filepath.current !== undefined) {
            filepath = filepath.current;
        }
        var exist = filepath.indexOf(fileid);
        if (exist > -1) {
            exist += fileid.length + 1;
            const index = filepath.substring(exist, exist + 4);
            filemap.set(item.id, index);
        }
    }

// fetch from here
    // function download({src, pagecount}) {
    //     var srcsp = src.split("&");
    //     var src1sp = srcsp[1].split("/");
    //     var src11 = src1sp[src1sp.length - 1];
    //     var index = src11.lastIndexOf(".");
    //     var name = src11;
    //     if (index > -1) {
    //         name = src11.substring(0, index - 4);
    //     }
    //
    //     var i = 1;
    //     for (; i <= pagecount; i++) {
    //
    //         if (i == 1) break;
    //
    //         var s = i.toString().padStart(4, "0");
    //         var url = name + s;
    //         if (index > -1) {
    //             url += src11.substring(index);
    //         }
    //         if (src1sp.length > 1) {
    //             var src1 = "";
    //             for (var j = 0; j < src1sp.length - 1; j++) {
    //                 src1 += src1sp[j] + "/";
    //             }
    //             url = src1 + url;
    //         }
    //         url = srcsp[0] + "&" + url + "&" + srcsp[2] + "&" + srcsp[3] + "&" + srcsp[4];
    //
    //         syncfetch(url, srcsp[2], s);
    //     }
    //
    //     return i;
    // }
    //
    // async function syncfetch(url, srcsp2, s) {
    //     const bloburl = await toDataUrl(url);
    //     const file = srcsp2.substring(3) + "_" + s + ".jpg";
    //     chrome.downloads.download({
    //         url: bloburl,
    //         filename: file
    //     });
    // }
    //
    // const toDataUrl = url => fetch(url, {
    //     "method": "GET",
    //     // in background script, credentials does not work, not the same as in content script. Though in content script CORS extension is required.
    //     "credentials": "include",
    // })
    // .then(response => response.blob())
    // .then(blobToDataUrl);
    //
    // const blobToDataUrl = blob => new Promise((resolve, reject) => {
    //     const reader = new FileReader();
    //     reader.onloadend = () => resolve(reader.result);
    //     reader.onerror = reject;
    //     reader.readAsDataURL(blob);
    // });

})();
