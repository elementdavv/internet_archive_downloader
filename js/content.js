/*
 * content.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */
(function(){
    'use strict';

    var pagecount = 0;          // page number of the book
    var tobecomplete = 0;       // page number to be downloaded
    var fileid = "";            // base filename of the book
    var url = "";               // url template for page url
    const holder = "{index}";   // place holder of the template

    (async() => {
        console.log(new Date());
    
        const brpageimage = document.getElementsByClassName("BRpageimage");
        const src = brpageimage[brpageimage.length -1].src;
        console.log("src:" + src);

        if (src.indexOf("BookReaderImages.php") == -1) {
            alert("Make sure you have logged in and borrowed the book.");
        }
        else {
            const brcurrentpage = document.getElementsByClassName("BRcurrentpage");
            const pagecontent = brcurrentpage[0].textContent;
            pagecount = parseInt(pagecontent.split(" ")[2]);
            tobecomplete = pagecount;
            console.log("pagecount:" + pagecount);

            parseSrc(src);

            const response = await chrome.runtime.sendMessage({fileid: fileid});
            if (response.fileid == fileid) {
                // fetch from background
                // chrome.runtime.sendMessage({
                //     pagecount: pagecount
                //     , src: src
                // });

                // fetch from here
                download();
            }
        }
    })();

    function parseSrc(src) {
        const srcsp = src.split("&");
        fileid = srcsp[2].substring(3)
        const src1sp = srcsp[1].split("/");
        const src11 = src1sp[src1sp.length - 1];
        const index = src11.lastIndexOf(".");
        var name = src11;
        if (index > -1) {
            name = src11.substring(0, index - 4);
        }

        url = name + holder;
        if (index > -1) {
            url += src11.substring(index);
        }
        if (src1sp.length > 1) {
            var src1 = "";
            for (var j = 0; j < src1sp.length - 1; j++) {
                src1 += src1sp[j] + "/";
            }
            url = src1 + url;
        }
        url = srcsp[0] + "&" + url + "&" + srcsp[2] + "&" + srcsp[3] + "&" + srcsp[4];
    }

    var stop = false;           // if stop immediately
    var i = 0;                  // current downloading number
    var fileset = new Set();    // downloading file set
    var complete = 0;           // sucessful download number
    const MAXNUMBER = 5;        // parallel download limit

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // console.log(message);
        if (message.state === undefined) return;
        const index = message.index;
        fileset.delete(index);
        if (message.state == "complete") {
            if (++complete == tobecomplete) {
                console.log("Download complete: " + complete);
                alert("Download complete: " + complete + " pages downloaded.");
            }
            else {
                download();
            }
        }
        else {
            tobecomplete--;
            console.log("failed: " + index);
            const r = confirm("Page " + index + " download failed. Would you like to continue or stop. Press OK to continue.");
            if (!r) stop = true;
        }
    });

    function download() {
        while (i < pagecount && fileset.size < MAXNUMBER) {
            if (stop) break;
            i++;
            var s = i.toString().padStart(4, "0");
            fileset.add(s);
            const newurl = url.replace(holder, s);
            const filename = fileid + "_" + s + ".jpg";
            syncfetch(newurl, filename);
        }
    }

    async function syncfetch(newurl, filename) {
        const response = await fetch(newurl, {
            "method": "GET",
            "credentials": "include",
        });
        const blob = await response.blob();
        var a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

})();
