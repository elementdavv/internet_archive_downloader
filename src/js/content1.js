/*
 * content1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import StreamSaver from './utils/streamsaver.js';
import PDFDocument from './pdf/document.js';
import ZIPDocument from './zip/document.js';

export default function(){
    'use strict';

    const version = '0.5.2';                            // extension version
    const origin = 'https://archive.org';               // internet archive
    const sw = !window.showSaveFilePicker;              // is use service worker
    const ff = /Firefox/.test(navigator.userAgent);     // is firefox
    
    const buttonstring = `
<div class='topinblock button quality-btn'>
    <select id='iadqualityid' class='iadselect'>
        <option value='1' selected>★★★★</option>
    </select>
    <div class='iadlabel'>Quality</div>
</div>
<div class='topinblock download-btn'>
    <button class='button' type='button' onclick=window.postMessage({from:'iad',cmd:'begin',ctrl:event.ctrlKey||event.metaKey},'${origin}')>
        <div>
            <span class='iconochive-download'></span>
            <span class='icon-label' id='iadprogressid'></span>
        </div>
    </button>
</div>
`;

    var br = {};                // book reader
    var status = 0;             // 0:idle, 1:downloading, 2:completed, 3:failed
    var ctrl = false;           // ctrlKey

    window.onmessage = evt => {
        if (evt.origin != origin) return;
        if (evt.data.from != 'iad') return;

        const data = evt.data;
        console.log(`message: ${data.cmd}`);

        switch(data.cmd) {
            case 'init':
                br = JSON.parse(data.br); 
                init();
                break;
            case 'begin':
                if (status == 0) ctrl = data.ctrl;

                begin();
                break;
            default:
                break;
        }
    };

    function loadScript(href) {
        console.log(`load script: ${href}`);
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = chrome.runtime.getURL(href);
        document.head.appendChild(script);
    }

    function loadCss(href) {
        console.log(`load css: ${href}`);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL(href);
        document.head.appendChild(link);
    }

    function loadButton() {
        const ab = fromClass('action-buttons-section');

        if (ab.length == 0) return;

        console.log('load buttons');
        ab[0].insertAdjacentHTML("afterbegin", buttonstring);
    }

    function loadQuality() {
        var s = fromId('iadqualityid');

        if (!s) return;

        console.log('load qualities');
        const factors = br.reductionFactors;
        const star = "★★★★";
        var n = 0;
        var lastscale = 1;

        factors.forEach(f => {
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
        const title = fromClass('item-title');

        if (title.length > 0) {
            info.Title = title[0].innerText;
        }

        const meta = new Map();
        meta.set('by', 'Author');
        meta.set('Isbn', 'ISBN')
        meta.set('Language', 'Language')
        meta.set('Publisher', 'Publisher')
        meta.set('Publication date', 'Publication date')
        meta.set('Contributor', 'Contributor')
        const metadata = fromClass('metadata-definition');

        for (var i = 0; i < metadata.length; i++) {
            const metaname = metadata[i].children[0].innerText;

            if (meta.has(metaname)) {
                info[meta.get(metaname)] = metadata[i].children[1].innerText;
            }
        }

        info.Producer = 'Element Davv';
    }

    var progress = null;        // progress bar

    function getProgress() {
        console.log('get progress');
        progress = fromId('iadprogressid');
    }

    function init(){
        console.log('init begin');
        loadCss("/css/iad.css");
        loadButton();
        loadQuality();
        getBookInfo();
        getMetadata();
        getProgress();
        readynotify();
        console.log('init complete');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    if (sw) {
        var paused = -1;

        chrome.runtime.onMessage.addListener(message => {
            if (status != 1 || message.from != 'iad') return;

            console.log(message);

            if (message.cmd == 'pause') {
                paused = 0;
            }
            else if (message.cmd == 'resume') {
                resumeDownload(paused);
                paused = -1;
            }
            else if (message.cmd == 'cancel') {
                abort();
            }
        });
    }

    async function begin() {
        if (status == 1) {
            if (confirm(getMessage("confirmabort"))) {
                abort();
                if (sw) {
                    chrome.runtime.sendMessage({from: 'iad', cmd: 'abort'});
                }
            }
        }
        else if (status == 2 || status == 3) {
            readynotify();
        }
        else {
            getDownloadInfo();

            if (sw) {
                await chrome.runtime.sendMessage({
                    from: 'iad',
                    cmd: 'new',
                    fileid: filename
                });

                paused = -1;
            }

            console.log(`download ${filename} of scale ${quality} at ${new Date()}`);
            download();
        }
    };

    var filename = "";          // filename to save
    var quality = 1;            // page scale

    function getDownloadInfo() {
        filename = fileid + (ctrl ? '.zip' : '.pdf');
        quality = fromId('iadqualityid').value;
    }

    async function download() {
        console.log(`chunks: ${pagecount}`);

        try {
            if (sw) {
                createDocSW();
            }
            else {
                await createDoc();
            }

            beginDownload();
        } catch(e) {
            console.error(e);
            await abortdoc();

            // user cancel in saveas dialog
            if (e.name != 'AbortError') {
                alert(getMessage("alerterror", e.toString()));
            }
        };
    }

    var pageindex = 0;          // current page number
    var complete = 0;           // complete page count
    var ac = null;              // AbortController
    const FILELIMIT = 6;        // parallel download limit

    function beginDownload() {
        startnotify();
        pageindex = 0;
        complete = 0;
        ac = new AbortController();

        Array(FILELIMIT).fill().forEach(() => {
            if (pageindex < pagecount) {
                dispatch();  
            }
        });
    }

    function resumeDownload(n) {
        if (n > 0) {
            Array(n).fill().forEach(() => {
                if (pageindex < pagecount) {
                    dispatch();  
                }
            });
        }
    }

    function continueDownload() {
        if (++complete >= pagecount) {
            clear();
            completenotify();
        }
        else {
            updatenotify();

            if (sw && paused > -1) {
                paused++;
            }
            else {
                if (pageindex < pagecount) {
                    dispatch();
                }
            }
        }
    }

    function clear() {
        ac = null;
        doc.end();
    }

    function dispatch() {
        console.log(`chunk ${pageindex}`);
        let uri = data[pageindex].uri;
        uri += uri.indexOf("?") > -1 ? "&" : "?";
        uri += "scale=" + quality + "&rotate=0";
        syncfetch(pageindex, uri);
        pageindex++;
    }

    async function syncfetch(pageindex, uri) {
        try {
            const response = await fetch(uri, {
                method: "GET",
                credentials: "include",
                responseType: "arraybuffer",
                signal: ac.signal,
            });

            if (response.ok) {
                const buffer = await response.arrayBuffer();

                if (doc) {
                    const view = new DataView(buffer);
                    createPage(view, pageindex);
                    continueDownload();
                }
            }
            else {
                throw new Error(response.statusText);
            }
        }
        catch(e) {
            console.error(e);

            // other fetches were aborted by ac signal when an error occured in a fetch
            if (e.name != 'AbortError') {
                abort(e.toString());
            }
        }
    }

    async function abort(message) {
        failnotify();
        abortfetch();
        await abortdoc();

        if (message) alert(getMessage("alerterror", message));
    }

    function abortfetch() {
        ac.abort();
        ac = null;
    }

    async function abortdoc() {
        doc = null;

        if (writer) {
            await writer.abort();
            writer = null;
        }

        if (filehandle) {
            await filehandle.remove();
            filehandle = null;
        }
    }

    function createPage(view, pageindex) {
        console.log(`chunk ${pageindex} ready`);

        if (ctrl) {
            createZIPPage(view, pageindex);
        }
        else {
            createPDFPage(view, pageindex);
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
            pageindex
            , margin: 0
            , size: [width, height]
        });

        doc.image(view, 0, 0);
    }

    var filehandle = null;      // filesystemfilehandle
    var writer = null;          // file stream writer
    var doc = null;             // pdf document object

    async function createDoc() {
        if (ctrl) {
            await createZIPDoc();
        }
        else {
            await createPDFDoc();
        }
    }

    function createDocSW() {
        const writable = StreamSaver.createWriteStream(filename);
        // writer.write(uInt8)
        writer = writable.getWriter();

        if (ctrl) {
            createZIPDocSW();
        }
        else {
            createPDFDocSW();
        }
    }

    async function createZIPDoc() {
        const options = {
            startIn: 'downloads'
            , suggestedName: filename
            , types: [
                {
                    description: 'Zip archive'
                    , accept: {
                        'application/zip': ['.zip']
                    }
                }
            ]
        };

        filehandle = await showSaveFilePicker(options);
        const writable = await filehandle.createWritable();
        // writer.write(ArrayBuffer/TypedArray/DataView/Blob/String/StringLiteral)
        writer = await writable.getWriter();
        doc = new ZIPDocument(writer);
    }

    async function createPDFDoc() {
        const options = {
            startIn: 'downloads'
            , suggestedName: filename
            , types: [
                {
                    description: 'Portable Document Format (PDF)'
                    , accept: {
                        'application/pdf': ['.pdf']
                    }
                }
            ]
        };

        filehandle = await showSaveFilePicker(options);
        const writable = await filehandle.createWritable();
        // writer.write(ArrayBuffer/TypedArray/DataView/Blob/String/StringLiteral)
        writer = await writable.getWriter();

        doc = new PDFDocument(writer, {
            pagecount
            , info
        });
    }

    function createZIPDocSW() {
        doc = new ZIPDocument(writer);
    }

    function createPDFDocSW() {
        doc = new PDFDocument(writer, {
            pagecount
            , info
        });
    }

    var t = 0;                 // performance now

    function teststart() {
        t = performance.now();
    }

    function testend() {
        const ss = (performance.now() - t) / 1000;
        const m = ~~(ss / 60);
        const s = ~~(ss % 60);
        return [m, s];
    }

    function startnotify() {
        teststart();
        progress.classList.add('iadprogress');
        progress.textContent = getMessage("downloading");
        progress.style.width = '0%';
        status = 1;
    }

    function updatenotify() {
        progress.style.width = (pageindex / pagecount * 100) + '%';
    }

    function completenotify() {
        const [m, s] = testend();
        console.log(`download completed in ${m}m${s}s`);
        progress.classList.remove('iadprogress');
        progress.textContent = getMessage("complete");
        status = 2;
    }

    function failnotify() {
        progress.classList.remove('iadprogress');
        progress.textContent = getMessage("fail");
        status = 3;
    }

    function readynotify() {
        progress.textContent = getMessage("download");
        status = 0;
    }

    function fromId(id) {
        return document.getElementById(id);
    }

    function fromClass(cls) {
        return document.getElementsByClassName(cls);
    }

    function getMessage(messageName, substitutions) {
        return chrome.i18n.getMessage(messageName, substitutions);
    }

    if (sw) {
        StreamSaver.mitm = 'https://elementdavv.github.io/streamsaver.js/mitm.html?version=2.0.0';
    }

    // native TransformStream and WritableStream only work in firefox 113, use ponyfill instead
    if (ff) {
        StreamSaver.supportsTransferable = false;

        if (WebStreamPolyfill) {
            StreamSaver.WritableStream = WebStreamPolyfill.WritableStream;
        }
    }

    // start
    console.log(`Internet Archive Downloader ${version} in action`);
    loadScript("/js/stub.js");

};
