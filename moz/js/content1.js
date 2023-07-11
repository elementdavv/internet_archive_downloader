/*
 * content1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import WebStreamPolyfill from './utils/ponyfill.es6.js';
import StreamSaver from './utils/streamsaver.js';
import PDFDocument from './pdf/document.js';
import ZIPDocument from './zip/document.js';

export default function(){
    'use strict';

    var br = {};                // book reader
    var status = 0;             // 0:idle, 1:downloading, 2:completed, 3:failed
    var ctrl = false;           // ctrlKey

    window.onmessage = evt => {
        console.log(`message: ${evt.data.from} ${evt.data.cmd}`);
        const dt = evt.data;
        if (dt.from != 'iad') return;
        if (dt.cmd == 'init') {
            br = JSON.parse(dt.content); 
            if (br.bookId) init();
        }
        else if (dt.cmd == 'begin') {
            if (status == 0) ctrl = dt.ctrl;
            begin();
        }
    };

    function loadScript(href) {
        console.log(`load ${href}`);
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = chrome.runtime.getURL(href);
        document.head.appendChild(script);
    }

    function loadCss(href) {
        console.log(`load ${href}`);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL(href);
        document.head.appendChild(link);
    }

    function loadButton() {
        const ab = document.getElementsByClassName('action-buttons-section');
        if (ab.length == 0) {
            console.log("warn: no action buttons section");
            return;
        }
        console.log('load buttons');
        loadCss("/css/iad.css");
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
                <button class='button' type='button' onclick=window.postMessage({from:'iad',cmd:'begin',ctrl:event.ctrlKey||event.metaKey},'*')> \
                    <div> \
                        <span class='iconochive-download'></span> \
                        <span class='icon-label' id='iadprogressid'>" + download + "</span> \
                    </div> \
                </button> \
            </div> \
            ";
        ab1.insertAdjacentHTML("afterbegin", html);
    }

    function loadQuality() {
        var s = document.getElementById('iadqualityid');
        if (!s) return;
        console.log('load qualities');
        const factors = br.reductionFactors;
        const star = "★★★★";
        var n = 0;
        var lastscale = 1;
        factors.forEach((f, i) => {
            const scale = Math.pow(2, Math.floor(Math.log2(Math.max(1, f.reduce))));
            if (scale > lastscale) {
                if (n < 3) {
                    var o = document.createElement('option');
                    o.value = scale;
                    o.innerText = star.substring(++n);
                    s.appendChild(o);
                }
                lastscale = scale;
            }
        });
    }

    var fileid = "";            // book basename
    var data = [];              // page urls
    var pagecount = 0;          // page count

    function getBookInfo() {
        console.log('get book info');
        fileid = br.bookId;
        data = br.data;
        pagecount = data.length;
    }

    var info = {};              // book metadata

    function getMetadata() {
        console.log('get metadata');
        const title = document.getElementsByClassName('item-title');
        if (title.length > 0) {
            info.Title = title[0].innerText;
        }
        const meta = new Map();
        meta.set('by', 'Author');
        meta.set('Isbn', 'ISBN')
        meta.set('Language', 'Language')
        meta.set('Publisher', 'Publisher')
        meta.set('Publication date', 'Date')
        meta.set('Contributor', 'Contributor')
        const metadata = document.getElementsByClassName('metadata-definition');
        for (var i = 0; i < metadata.length; i++) {
            const metaname = metadata[i].children[0].innerText;
            if (meta.has(metaname)) {
                info[meta.get(metaname)] = metadata[i].children[1].innerText;
            }
        }
        info.Producer = 'Element Davv';
    }

    function init(){
        console.log('init begin');
        loadButton();
        loadQuality();
        getBookInfo();
        getMetadata();
        console.log('init complete');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    var browsercancel = false;          // canceled from browser download list

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log(message);
        if (message.from != 'iad') return;
        if (message.cmd == 'error') {
            if (stop) return;
            stop = true;
            browsercancel = true;
            console.log("process error: " + message.error);
            if (message.error != 'USER_CANCELED') {
                adderr(message.error);
            }
        }
    });

    var stop = false;           // stop indicator
    var filename = "";          // download filename

    async function begin() {
        if (status == 1) {
            if (stop) {
                alert(chrome.i18n.getMessage("cleanup"));
            }
            else if (confirm(chrome.i18n.getMessage("confirmstop"))) {
                stop = true;
                console.log("the user stoped a process.");
            }
            return;
        }
        if (status == 2 || status == 3) {
            readynotify();
            return;
        }

        getDownloadInfo();
        const response = await chrome.runtime.sendMessage({
            from: 'iad',
            cmd: 'download',
            fileid: filename
        });
        if (response.fileid == filename) {
            console.log(`download ${filename} of quality ${quality} at ${new Date()}`);
            await download();
        }
    };

    var quality = 1;            // scale

    function getDownloadInfo() {
        filename = fileid + (ctrl ? '.zip' : '.pdf');
        quality = document.getElementById('iadqualityid').value;
    }

    var writer = null;          // file stream writer
    var doc = null;             // pdf document object
    var fileset = null;         // downloading file set
    var pageindex = 0;          // current page number
    var complete = 0;           // completed count
    var err = [];               // error messages
    const FILELIMIT = 5;        // parallel download limit

    async function download() {
        console.log(`chunks: ${pagecount}`);
        writer = null;
        doc = null;
        fileset = new Set();
        pageindex = 0;
        complete = 0;
        err = [];
        stop = false;
        browsercancel = false;
        try {
            createDoc();
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
        var uri = data[pageindex - 1].uri;
        uri += uri.indexOf("?") > -1 ? "&" : "?";
        uri += "scale=" + quality + "&rotate=0";
        // const uri = "https://expertphotography.b-cdn.net/wp-content/uploads/2011/06/NYEBrody-Beach-020111-2002.jpg";
        try {
            const response = await fetch(uri, {
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
            if (!browsercancel) {
                const response = await chrome.runtime.sendMessage({
                    from: 'iad',
                    cmd: 'cancel',
                });
            }
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
            await writer.abort();
            writer = null;
        }
    }

    function adderr(e) {
        var ef = false;
        const es = e.toString ? e.toString() : e;
        err.forEach((item, index) => {
            if (item == es)
                ef = true;
        });
        if (!ef) err.push(es);
    }

    async function createPage(view, pageindex) {
        fileset.delete(pageindex);
        var state = doc.getstate();
        if (state) {
            stop = true;
            if (state.toString) state = state.toString();
            if (state.indexOf('abort') == -1) {
                adderr(state);
            }
        }
        if (stop) {
            await giveup();
            return;
        }

        if (ctrl) {
            createZIPPage(view, pageindex);
        }
        else {
            createPDFPage(view, pageindex);
        }
        if (++complete == pagecount) {
            doc.end();
            completenotify();
        }
        else {
            updatenotify();
            continueDownload();
        }
    }

    function createZIPPage(view, pageindex) {
        const name = fileid + '_' + pageindex.toString().padStart(4, '0') + '.jpg';
        doc.image({view, name});
    }

    const JPEG_WIDTH = 165;
    const JPEG_HEIGHT = 163;

    function createPDFPage(view, pageindex) {
        const width = view.getUint16(JPEG_WIDTH);
        const height = view.getUint16(JPEG_HEIGHT);
        doc.addPage({
            pageindex: pageindex - 1
            , margin: 0
            , size: [width, height]
        });
        doc.image(view, 0, 0);
    }

    function createDoc() {
        if (doc) return;
        const writable = StreamSaver.createWriteStream(filename);
        // writer.write(uInt8)
        writer = writable.getWriter();
        if (ctrl) {
            createZIPDoc();
        }
        else {
            createPDFDoc();
        }
    }

    function createZIPDoc() {
        doc = new ZIPDocument(writer);
    }

    function createPDFDoc() {
        doc = new PDFDocument(writer, {
            pagecount: pagecount
            , info: info
        });
    }

    var t = 0;                 // performance now

    function startnotify() {
        t = performance.now();
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
        const ss = (performance.now() - t) / 1000;
        const m = ~~(ss / 60);
        const s = ~~(ss % 60);
        console.log(`download completed in ${m}m${s}s`);
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

    // native TransformStream and WritableStream only work in version 113, use ponyfill instead
    StreamSaver.WritableStream = WebStreamPolyfill.WritableStream;
    StreamSaver.mitm = 'https://elementdavv.github.io/streamsaver.js/mitm.html?version=2.0.0';

    // start
    console.log('Internet Archive Downloader v0.5.1 in action');
    loadScript("/js/stub.js");
};
