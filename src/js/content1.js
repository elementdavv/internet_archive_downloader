/*
 * content1.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import PDFDocument from './pdf/document.js';

export default function(){
    'use strict';

    var br = {};                // book reader

    window.onmessage = evt => {
        console.log(`message: ${evt.data.from} ${evt.data.cmd}`);
        const dt = evt.data;
        if (dt.from != 'iad') return;
        if (dt.cmd == 'init') {
            br = JSON.parse(dt.content); 
            if (br.bookId) init();
        }
        else if (dt.cmd == 'begin') { begin(); }
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
    var filename = "";          // download filename
    var data = [];              // page urls
    var pagecount = 0;          // page count

    function getBookInfo() {
        console.log('get book info');
        fileid = br.bookId;
        filename = `${fileid}.pdf`;
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

    var status = 0;             // 0:idle, 1:downloading, 2:completed, 3:failed
    var stop = false;           // stop indicator

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
        console.log(`download ${filename} at ${new Date()}`);
        getQuality();
        await download();
    };

    var quality = 1;            // scale

    function getQuality() {
        quality = document.getElementById('iadqualityid').value;
        console.log(`quality: ${quality}`);
    }

    var filehandle = null;      // filesystemfilehandle
    var writer = null;          // file stream writer
    var doc = null;             // pdf document object
    var fileset = null;         // downloading file set
    var pageindex = 0;          // current page number
    var complete = 0;           // completed count
    var err = [];               // error messages
    const FILELIMIT = 5;        // parallel download limit

    async function download() {
        console.log(`chunks: ${pagecount}`);
        filehandle = null;
        writer = null;
        doc = null;
        fileset = new Set();
        pageindex = 0;
        complete = 0;
        err = [];
        stop = false;
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
        var ef = false;
        const es = e.toString();
        err.forEach((item, index) => {
            if (item == es)
                ef = true;
        });
        if (!ef) err.push(es);
    }

    const JPEG_WIDTH = 165;
    const JPEG_HEIGHT = 163;

    async function createPage(view, pageindex) {
        const width = view.getUint16(JPEG_WIDTH);
        const height = view.getUint16(JPEG_HEIGHT);
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
        }
        else {
            updatenotify();
            continueDownload();
        }
    }

    async function createDoc() {
        if (doc) return;
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

    console.log('Internet Archive Downloader in action');
    loadScript("/js/stub.js");
};
