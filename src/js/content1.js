/*
 * content1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import './utils/streamsaver.js';
import PDFDocument from './pdf/document.js';
import ZIPDocument from './zip/document.js';
import Queue from './utils/queue.js';

export default function(){
    'use strict';

    const origin = location.origin;                                     // origin
    const extid = chrome.runtime.getURL('').match(/[\-0-9a-z]+/g)[1];   // extension host
    const sw = !window.showSaveFilePicker;                              // is use service worker
    const ff = /Firefox/.test(navigator.userAgent);                     // is firefox

    const buttonstring = `
<div class='topinblock button scale-btn'>
    <select id='iadscaleid' class='iadselect'>
        <option value='1' selected>★★★★</option>
    </select>
    <div class='iadlabel'>Quality</div>
</div>
<div class='topinblock download-btn'>
    <button class='button' type='button' onclick=window.postMessage({extid:'${extid}',cmd:'begin',ctrl:event.ctrlKey||event.metaKey},'${origin}')>
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
        if (evt.origin != origin || evt.data.extid != extid) return;

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

    function loadScales() {
        var s = fromId('iadscaleid');

        if (!s) return;

        console.log('load scales');
        const factors = br.reductionFactors;
        const star = "★★★★";
        var n = 0;
        var lastscale = 1;

        factors.forEach(f => {
            const scal = Math.pow(2, Math.floor(Math.log2(Math.max(1, f.reduce))));

            if (scal > lastscale) {
                if (n < 3) {
                    var o = document.createElement('option');
                    o.value = scal;
                    o.innerText = star.substring(++n);
                    s.appendChild(o);
                }

                lastscale = scal;
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
        loadScales();
        getBookInfo();
        getMetadata();
        getProgress();
        readynotify();
        console.log('init complete');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    var swaitcreate = false;    // wait for sw file created

    if (sw) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (sender.id != chrome.runtime.id || (status != 1 && swaitcreate == false)) return;

            console.log(message);

            switch(message.cmd) {
                case 'create':
                    created();
                    break;
                case 'pause':
                    pause();
                    break;
                case 'resume':
                    resume();
                    break;
                case 'cancel':
                    abort();
                    break;
                default:
                    break;
            }

            sendResponse({});
        });
    }

    async function begin() {
        if (status == 1) {
            pause();
            // before confirm dislog returns, onmessage waits.
            const cf = confirm(getMessage("confirmabort"));

            if (cf) {
                abort({sync: sw});
            }
            else {
                resume();
            }
        }
        else if (status == 2 || status == 3) {
            readynotify();
        }
        else {
            await clearwaitswfile();
            getDownloadInfo();
            console.log(`download ${filename} at ${new Date().toJSON().slice(0,19)}`);
            download();
        }
    };

    var filename = "";          // filename to save
    var scale = 1;              // page scale

    function getDownloadInfo() {
        scale = fromId('iadscaleid').value;
        filename = fileid + '_' + scale + (ctrl ? '.zip' : '.pdf');
    }

    async function download() {
        await getFile();

        if (doc) {
            if (sw) {
                waitswfile();

                if (streamSaver.swready) {
                    const message = 'sw ready';
                    console.log(message);
                }
                else {
                    waitsw();
                }
            }
            else {
                getLeafs();
            }
        }
    }

    // wait for file create event
    function waitswfile() {
        swaitcreate = true;
    }

    // before begin, clear unclean state
    async function clearwaitswfile() {
        if (swaitcreate) {
            swaitcreate = false;
            const message = 'clear last waitswfile';
            console.log(message);
            await abortdoc({sync: sw});
        }
    }

    var swto = null;            // service worker ready timeout

    // wait and test if service worker is available
    function waitsw() {
        swto = setTimeout(() => {
            swto = null;

            if (streamSaver.swready) {
                const message = 'sw ready';
                console.log(message);
            }
            else {
                swaitcreate = false;
                const message = 'File download was blocked';
                console.log(message);
                abortdoc({sync: sw, message});
            }
        }, 3e3);
    }

    function clearwaitsw() {
        if (swto) {
            clearTimeout(swto);
            swto = null;
        }
    }

    // file created, continuing download
    function created() {
        if (swaitcreate) {
            swaitcreate = false;
            clearwaitsw();
            getLeafs();
        }
    }

    async function getFile() {
        try {
            if (sw) {
                console.log('notify browser: new');
                await chrome.runtime.sendMessage({cmd: 'new', fileid: filename});
                createDocSW();
            }
            else {
                await createDoc();
            }
        } catch(e) {
            const message = e.toString();
            console.log(message);

            // user cancel in showSaveFilePicker
            // streamSaver will always create temporary file
            if (e.name != 'AbortError') {
                abortdoc({sync: sw, message});
            }
        };
    }

    var jobs= null;             // jobs
    var jobcount = 0;           // job count
    var complete = 0;           // complete page count
    var paused = 0;             // paused count
    var recover = 0;            // recover file
    var ac = null;              // AbortController
    const FILELIMIT = 6;        // parallel download limit
    const TRYLIMIT = 3;         // each leaf retry limit

    function initleaf() {
        jobs = new Queue();

        Array(pagecount).fill().forEach((_, i) => {
            jobs.enque({pageindex: i, tri: 0});
        });

        jobcount = pagecount;
        complete = 0;
        paused = 0;
        recover = 0;
        ac = new AbortController();
    }

    function getLeafs() {
        console.log(`chunk number: ${pagecount}`);
        startnotify();
        initleaf();

        Array(FILELIMIT).fill().forEach(() => {
            dispatch();
        });
    }

    function pause() {
        console.log('paused')
        paused++;
    }

    function resume() {
        console.log('resume');

        if (--paused == 0) {
            if (recover > 0) {
                Array(recover).fill().forEach(() => {
                    dispatch();
                });
            }

            recover = 0;
        }
    }

    async function nextLeaf() {
        if (++complete >= jobcount) {
            await clear();
            completenotify();
            returnBook();
        }
        else {
            updatenotify();

            if (paused > 0) {
                recover++;
            }
            else {
                dispatch();
            }
        }
    }

    async function clear() {
        ac = null;
        doc.end();
        await writer.ready;
        await writer.close();
    }

    function dispatch() {
        if (jobs.isEmpty) return;

        const job = jobs.deque();
        const pageindex = job.pageindex;
        const tri = job.tri;
        console.log(`chunk ${pageindex}`);
        var uri = data[pageindex].uri;
        uri += uri.indexOf("?") > -1 ? "&" : "?";
        uri += `scale=${scale}&rotate=0`;
        const width = Math.ceil(data[pageindex].width / scale);
        const height = Math.ceil(data[pageindex].height / scale);
        syncfetch(pageindex, tri, uri, width, height);
    }

    async function syncfetch(pageindex, tri, uri, width, height) {
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
                    createPage(view, pageindex, width, height);
                    nextLeaf();
                }
            }
            else {
                throw new Error(response.status);
            }
        }
        catch(e) {
            const message = e.toString();
            console.log(message);

            if (!ac.signal.aborted) {
                // chrome: failed to fetch
                // firefox: networkerror when fetch resource
                // and unexpected aborted
                if (/fetch|abort/.test(message) && ++tri < TRYLIMIT) {
                    console.log(`trunk ${pageindex} failed, retry ${tri}`)
                    jobs.enque({pageindex, tri});
                    jobcount++;
                    nextLeaf();
                }
                else {
                    abort({sync: sw, message});
                }
            }
        }
    }

    async function abort(extra) {
        failnotify();
        abortLeaf();
        await abortdoc(extra);
    }

    function abortLeaf() {
        ac.abort();
    }

    async function abortdoc(extra) {
        if (extra?.sync) {
            console.log('notify browser: abort');
            await chrome.runtime.sendMessage({cmd: 'abort'});
        }

        doc = null;

        if (writer?.abort) {
            await writer.abort().catch(e => {
                console.log(`${e} when abort writer`);
            }).finally(writer = null);
        }

        if (filehandle?.remove) {
            // Brave may throw error
            await filehandle.remove().catch(e => {
                console.log(`${e} when remove filehandle`);
            }).finally(filehandle = null);
        }

        if (extra?.message) {
            alert(getMessage("alerterror", extra.message));
        }
    }

    function createPage(view, pageindex, width, height) {
        console.log(`chunk ${pageindex} ready`);

        if (ctrl) {
            createZIPPage(view, pageindex);
        }
        else {
            createPDFPage(view, pageindex, width, height);
        }
    }

    function createZIPPage(view, pageindex) {
        const name = fileid + '_' + pageindex.toString().padStart(4, '0') + '.jpg';
        doc.image({view, name});
    }

    function createPDFPage(view, pageindex, width, height) {
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
        const writable = streamSaver.createWriteStream(filename);
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

    function returnBook() {
        console.log('return the book.');
        const uri = 'https://archive.org/services/loans/loan';
        const formdata = new FormData();
        formdata.set('action', 'return_loan');
        formdata.set('identifier', fileid);

        fetch(uri, {
            method: "POST",
            credentials: "include",
            body: formdata,
        }).then(response => {
            if (response.ok) {
                console.log('reload page.');
                location.reload();
            }
            else {
                throw new Error(response.status);
            }
        }).catch(e=>console.log(e));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    var t = 0;                  // performance now

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
        console.log('start');
        teststart();
        progress.classList.add('iadprogress');
        progress.textContent = getMessage("downloading");
        progress.style.width = '0%';
        refreshTip();
        status = 1;
    }

    function updatenotify() {
        progress.style.width = (complete / jobcount * 100) + '%';
    }

    function completenotify() {
        const [m, s] = testend();
        console.log(`download completed in ${m}m${s}s`);
        progress.classList.remove('iadprogress');
        progress.textContent = getMessage("complete");
        refreshTip();
        status = 2;
    }

    function failnotify() {
        console.log('failed');
        progress.classList.remove('iadprogress');
        progress.textContent = getMessage("fail");
        refreshTip();
        status = 3;
    }

    function readynotify() {
        console.log('ready');
        progress.textContent = getMessage("download");
        refreshTip();
        status = 0;
    }

    function refreshTip() {
        setTimeout(() => {
            try {
                var top = 0;
                var left = 0;
                const beforeWidth = 10;
                const beforeHeight = 5;

                const scale_btn = fromClass('scale-btn')[0];
                const sba = window.getComputedStyle(scale_btn, ':after');
                const sbaw = sba.getPropertyValue('width');
                const scaleAfterWidth = Number(sbaw.replace('px', ''));

                top = scale_btn.offsetHeight + 3;
                left = scale_btn.offsetLeft + (scale_btn.offsetWidth - beforeWidth) / 2;
                scale_btn.style.setProperty('--beforetop', `${top}px`);
                scale_btn.style.setProperty('--beforeleft', `${left}px`);
                top += beforeHeight;
                left = scale_btn.offsetLeft + (scale_btn.offsetWidth - scaleAfterWidth) / 2;
                scale_btn.style.setProperty('--aftertop', `${top}px`);
                scale_btn.style.setProperty('--afterleft', `${left}px`);

                const download_btn = fromClass('download-btn')[0].children[0];
                const dba = window.getComputedStyle(download_btn, ':after');
                const dbaw = dba.getPropertyValue('width');
                const downloadAfterWidth = Number(dbaw.replace('px', ''));

                top = download_btn.offsetHeight + 3;
                left = download_btn.offsetLeft + (download_btn.offsetWidth - beforeWidth) / 2;
                download_btn.style.setProperty('--beforetop', `${top}px`);
                download_btn.style.setProperty('--beforeleft', `${left}px`);
                top += beforeHeight;
                left = download_btn.offsetLeft + (download_btn.offsetWidth - downloadAfterWidth) / 2;
                download_btn.style.setProperty('--aftertop', `${top}px`);
                download_btn.style.setProperty('--afterleft', `${left}px`);
            }
            catch(e){}
        }, 500);
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
        streamSaver.mitm = 'https://elementdavv.github.io/streamsaver.js/mitm.html?version=2.0.0';
    }

    if (ff) {
        // native TransformStream and WritableStream only work in firefox 113, use ponyfill instead
        streamSaver.supportsTransferable = false;

        if (globalThis.WebStreamsPolyfill) {
            streamSaver.WritableStream = globalThis.WebStreamsPolyfill.WritableStream;
        }
    }

    // start
    const manifest = chrome.runtime.getManifest();
    console.log(`${manifest.name} ${manifest.version} in action`);
    loadScript("/js/stub.js");

};
