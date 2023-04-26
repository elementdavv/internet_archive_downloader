/*
 * content1.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import PDFDocument from './pdf/document.js';

export default function(){
    'use strict';

    window.addEventListener("message", event => {
        const data = event.data;
        if (data.from == 'iad' && data.cmd == 'begin') {
            begin();
        }
    });

    function loadcss(href) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL(href);
        document.head.appendChild(link);
    }

    function addbtn() {
        const ab = document.getElementsByClassName('action-buttons-section');
        loadcss("/css/iad.css");
        const ab1 = ab[0];
        const download = chrome.i18n.getMessage('download');
        const html = " \
            <div class='topinblock button quality-btn'> \
                <select id='iadqualityid' class='iadselect'> \
                    <option value='1' selected>★★★★</option> \
                </select> \
                <div class='iadlabel'>Quality</div> \
            </div> \
            <div class='topinblock download-btn'> \
                <button class='button' type='button' onclick=window.postMessage({from:'iad',cmd:'begin'},'*')> \
                    <div> \
                        <span class='iconochive-download'></span> \
                        <span class='icon-label' id='iadprogressid'>" + download + "</span> \
                    </div> \
                </button> \
            </div> \
            ";
        ab1.insertAdjacentHTML("afterbegin", html);
    }

    function addquality() {
        const ind = src.indexOf('scale=');
        if (ind == -1) return;
        const q = parseInt(src.substr(ind + 6, 1));
        if (q > 1) {
            var s = document.getElementById('iadqualityid');
            const star = "★★★★";
            var n = 0;
            for (var i = 2; i <= q; i <<= 1) {
                var o = document.createElement('option');
                o.value = i;
                o.innerText = star.substring(++n);
                s.appendChild(o);
            }
        }
    }

    var src = "";               // page src
    var pagecount = 0;          // page number of the book

    function findSrc() {
        if (document.querySelector("meta[property='mediatype']").content != "texts") return 1;
        src = "";
        const brpageimage = document.getElementsByClassName("BRpageimage");
        if (brpageimage.length == 0) {
            console.log("iad: waiting ...");
            return 0;
        }
        src = brpageimage[brpageimage.length -1].src;
        if (src.indexOf("BookReaderImages") == -1) {
            console.log('iad: book not available');
            return 1;
        }
        else if (document.getElementsByTagName("ia-book-actions").length == 0) {
            console.log('iad: book always available');
            return 1;
        }
        else {
            console.log('iad: done');
            parseSrc();
            getPageCount();
            return 2;
        }
    }

    var step = 0;
    const STEPLIMIT = 8;

    function check() {
        const st = findSrc();
        if (st == 0) {
            if (++step == STEPLIMIT) {
                clearInterval(intervalid)
                intervalid = null;
            }
        }
        else {
            clearInterval(intervalid);
            intervalid = null;
            if (st == 2) {
                addbtn();
                addquality();
            }
        }
    }

    var intervalid = setInterval(check, 1000);

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    var status = 0;             // 0:idle, 1:downloading, 2:completed, 3:failed
    var stop = false;           // whether to stop process

    async function begin() {
        if (status == 1) {
            if (confirm(chrome.i18n.getMessage("confirmstop"))) {
                stop = true;
                console.log("the user stoped a process.");
            }
            return;
        }
        if (status == 2 || status == 3) {
            readynotify();
            return;
        }

        console.log(`archive.org PDF Books Downloader: ${new Date()}`);
        getQuality();
        getMetadata();
        if (pagecount > 0) {
            await download();
        }
        else {
            alert(chrome.i18n.getMessage("pagenotfounderror"));
        }
    };

    function getPageCount() {
        const brcurrentpage = document.getElementsByClassName("BRcurrentpage");
        if (brcurrentpage.length > 0) {
            const pagerange = brcurrentpage[0].textContent;
            pagecount = parseInt(pagerange.split(" ")[2]);
            console.log(`pagecount: ${pagecount}`);
        }
    }

    const holder = "{index}";   // place holder of the template
    var fileid = "";            // base filename of the book
    var filename = "";          // download filename
    var url = "";               // url template for page url
    var pagebegin = 0;          // page begin number

    /* src example:
    * :https://ia800406.us.archive.org/BookReader/BookReaderImages.php
    * ?zip=/32/items/isbn_0809463962/isbn_0809463962_jp2.zip
    * &file=isbn_0809463962_jp2/isbn_0809463962_0001.jp2
    * &id=isbn_0809463962
    * &scale=8
    * &rotate=0
    */
    function parseSrc() {
        console.log(`src: ${src}`);
        const srcsp = src.split("&");
        fileid = srcsp[2].substring(3)
        filename = `${fileid}.pdf`;
        const src1sp = srcsp[1].split("/");
        const src11 = src1sp[src1sp.length - 1];
        const index = src11.lastIndexOf(".");
        var name = src11;
        if (index > -1) {
            name = src11.substring(0, index - 4);
        }
        pagebegin = parseInt(src11.substr(index - 4, 4));
        if (pagebegin > 1) pagebegin = 1;
        console.log(`pagebegin: ${pagebegin}`);

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
        // srcsp[3]
        url = `${srcsp[0]}&${url}&${srcsp[2]}&scale=__SCALE__&${srcsp[4]}`;
    }

    function getQuality() {
        const scale = document.getElementById('iadqualityid').value;
        console.log(`scale: ${scale}`);
        url = url.replace('__SCALE__', scale);
    }

    var info = {};
    function getMetadata() {
        info.Producer = 'Element Davv';
        const title = document.getElementsByClassName('item-title');
        if (title.length > 0) {
            info.Title = title[0].innerText;
        }
        const meta = new Map();
        meta.set('by', 'Author');
        meta.set('Publication date', 'Publication date')
        meta.set('Topics', 'Subject')
        meta.set('Publisher', 'Publisher')
        meta.set('Contributer', 'Contributer')
        meta.set('Language', 'Language')
        meta.set('Isbn', 'ISBN')
        meta.set('Pages', 'Pages')
        const metadata = document.getElementsByClassName('metadata-definition');
        for (var i = 0; i < metadata.length; i++) {
            const metaname = metadata[i].children[0].innerText;
            if (meta.has(metaname)) {
                info[meta.get(metaname)] = metadata[i].children[1].innerText;
            }
        }
    }

    var filehandle = null;      // filesystemfilehandle
    var writer = null;          // file stream writer
    var doc = null;             // pdf document object
    var fileset = null;         // downloading file set
    var pageindex = 0;          // current downloading number
    var complete = 0;           // sucessful download number
    var err = [];               // err message
    const FILELIMIT = 5;        // parallel download limit

    async function download() {
        filehandle = null;
        writer = null;
        doc = null;
        fileset = new Set();
        pageindex = 0;
        stop = false;
        complete = 0;
        err = [];
        console.log(`there are ${pagecount} chunks at all.`)
        try {
            await createDoc();
        } catch(e) {
            await clean();
            console.log(e);
            if (e.code != 20) {
                alert(chrome.i18n.getMessage("alerterror", e.toString()));
            }
            return;
        };
        startnotify();
        continueDownload();
    }

    function continueDownload() {
        while (!stop && pageindex < pagecount && fileset.size < FILELIMIT) {
            pageindex++;
            fileset.add(pageindex);
            console.log(`chunk ${pageindex}`);
            syncfetch(pageindex);
        }
    }

    async function syncfetch(pageindex) {
        const pageno = pageindex - 1 + pagebegin;
        var s = pageno.toString().padStart(4, "0");
        const newurl = url.replace(holder, s);
        // const newurl = "https://expertphotography.b-cdn.net/wp-content/uploads/2011/06/NYEBrody-Beach-020111-2002.jpg";
        try {
            const response = await fetch(newurl, {
                "method": "GET",
                "credentials": "include",
                "responseType": "arraybuffer",
            });
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                console.log(`chunk ${pageindex} ready`);
                const view = new DataView(buffer);
                await createPage(view, pageindex);
            }
            else {
                throw new Error(chrome.i18n.getMessage("fetchfail", [pageindex, response.status]));
            }
        }
        catch(e) {
            fileset.delete(pageindex);
            stop = true;
            console.log(e);
            adderr(e);
            await giveup();
        };
    }

    async function giveup() {
        if (fileset.size == 0) {
            await clean();
            if (err.length > 0) {
                alert(chrome.i18n.getMessage("alerterror", err.join('.\n')));
            }
            failnotify();
        }
    }

    async function clean() {
        doc = null;
        if (writer) {
            await writer.close();
            writer = null;
        }
        if (filehandle) {
            await filehandle.remove();
            filehandle = null;
        }
    }

    function adderr(e) {
        var exi = false;
        err.forEach((item, index) => {
            if (item == e.toString())
                exi = true;
        });
        if (!exi) err.push(e.toString());
    }

    async function createPage(view, pageindex) {
        const width = view.getUint16(165);
        const height = view.getUint16(163)
        doc.addPage({
            pageindex: pageindex - 1
            , margin: 0
            , size: [width, height]
        });
        doc.image(view, 0, 0);
        fileset.delete(pageindex);
        if (stop) {
            await giveup();
        }
        else if (++complete == pagecount) {
            doc.end();
            completenotify();
            console.log("download completed.")
        }
        else {
            updatenotify();
            continueDownload();
        }
    }

    async function createDoc() {
        if (doc == null) {
            const options = {
                startIn: 'downloads'
                , suggestedName: filename
                , types: [
                    {
                        description: 'PDF document'
                        , accept: {
                            'application/pdf': ['.pdf']
                        }
                    }
                ]
            };
            filehandle = await showSaveFilePicker(options);
            const writable = await filehandle.createWritable();
            writer = await writable.getWriter();
            doc = new PDFDocument(writer, {
                pagecount: pagecount
                , info: info
            });
        }
    }

    function startnotify() {
        const p = progress();
        p.classList.add('iadprogress');
        p.textContent = chrome.i18n.getMessage("downloading");
        p.style.width = '0%';
        status = 1;
    }

    function updatenotify() {
        progress().style.width = (pageindex / pagecount * 100) + '%';
    }

    function completenotify() {
        const p = progress();
        p.classList.remove('iadprogress');
        p.textContent = chrome.i18n.getMessage("complete");
        status = 2;
    }

    function failnotify() {
        const p = progress();
        p.classList.remove('iadprogress');
        p.textContent = chrome.i18n.getMessage("fail");
        status = 3;
    }

    function readynotify() {
        progress().textContent = chrome.i18n.getMessage("download");
        status = 0;
    }

    function progress() {
        return document.getElementById('iadprogressid');
    }

};
