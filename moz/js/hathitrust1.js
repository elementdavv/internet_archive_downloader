/*
 * content1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import './utils/ponyfill.es6.js';
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
<div class='accordion-item null panel svelte-g6tm5k'>
    <h2 class='accordion-header' id='h1703477325693-198'>
        <button class='accordion-button svelte-g6tm5k collapsed' type='button' data-bs-toggle='collapse' data-bs-target='#c1703477325693-198' aria-expanded='false' aria-controls='c1703477325693-198'>
            <div class='d-flex gap-2 align-items-center me-1'><i class='fa-solid fa-hippo' slot='icon'></i>Ayesha</div>
        </button>
    </h2>
    <div id='c1703477325693-198' class='accordion-collapse collapse' aria-labelledby='h1703477325693-198' data-bs-parent='#controls' style>
        <div class='accordion-body'>
            <div class="d-flex gap-4 align-items-center">
            <fieldset class='mb-3'>
                <legend class='fs-5'>Quality</legend>
                <select id='iadscaleid' class='form-select' style='border:0;'>
                    <option value='size=full'>full size</option>
                </select>
            </fieldset>
            <fieldset class='mb-3'>
                <legend class='fs-5'>Tasks</legend>
                <select id='iadtasksid' class='form-select' style='border:0;'>
                    <option value='6' selected>6</option>
                    <option value='4'>4</option>
                    <option value='2'>2</option>
                    <option value='1'>1</option>
                </select>
            </fieldset>
            </div>
            <p class='mb-3'>
                <button type='button' class='btn btn-outline-dark' onclick=window.postMessage({extid:'${extid}',cmd:'begin',ctrl:event.ctrlKey||event.metaKey},'${origin}')>
                    <div>
                        <span class='fa-solid fa-arrow-down'></span>
                        <span style='display:block' id='iadprogressid'></span>
                    </div>
                </button>
            </p>
        </div>
    </div>
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
                br = JSON.parse(data.manifest); 
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
        const ac = fromId('controls')?.getElementsByClassName("border-top");

        if (ac.length == 0) return;

        console.log('load buttons');
        ac[0].insertAdjacentHTML("afterend", buttonstring);
    }

    function loadScales() {
        var s = fromId('iadscaleid');

        if (!s) return;

        console.log('load scales');
        var n = 3;

        while (n > 0) {
            const o = document.createElement('option');
            const v = n * br.defaultImage.height;
            o.value = 'height=' + v;
            o.innerText = 'high: ' + v;

            if (n == 3) o.selected = true;

            s.appendChild(o);
            n--;
        }
    }

    var fileid = '';            // book basename
    var url = '';               // page urls
    var pagecount = 0;          // page count

    function getBookInfo() {
        console.log('get book info');
        fileid = br.id.replace(/[^a-zA-Z0-9_]/g, '_');
        url = 'https://babel.hathitrust.org/cgi/imgsrv/image?id=' + br.id;
        pagecount = br.totalSeq;
    }

    var info = {};              // book metadata

    function getMetadata() {
        console.log('get metadata');
        if (br.metadata.title) info.Title = br.metadata.title;
        if (br.metadata.author) info.Author = br.metadata.author;
        if (br.metadata.publisher) info.Publisher = br.metadata.publisher;
        if (br.metadata.publicationDate) info.PublicationDate = br.metadata.publicationDate;
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
        window.hathitrust1iadinit = true;
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
        else if (status == 4) {
            tocontinue();
        }
        else {
            await clearwaitswfile();
            getDownloadInfo();
            console.log(`download ${filename} at ${new Date().toJSON().slice(0,19)}`);
            download();
        }
    };

    var filename = "";          // filename to save
    var scale = "";             // page scale
    var tasks = 6;              // parallel tasks

    function getDownloadInfo() {
        scale = fromId('iadscaleid').value;
        tasks = parseInt(fromId('iadtasksid').value);
        filename = fileid + '_' + (scale.indexOf('full') > -1 ? 'full' : scale.substring(7)) + (ctrl ? '.zip' : '.pdf');
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
    var waitInterval = null;    // wait for too many request
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
        waitInterval = null;
    }

    function getLeafs() {
        console.log(`chunk number: ${pagecount}`);
        startnotify();
        initleaf();

        Array(tasks).fill().forEach(() => {
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

    function towait() {
        if (status == 1) {
            waitnotify();
            pause();
            var waitlen = 61;

            waitInterval = setInterval(function() {
                if (--waitlen <= 0) {
                    tocontinue();
                }
                else {
                    waitprogressnotify(waitlen);
                }
            }, 1000);
        }
    }

    function tocontinue() {
        if (status == 4) {
            clearInterval(waitInterval);
            waitInterval = null;
            continuenotify();
            resume();
        }
    }

    async function nextLeaf() {
        if (++complete >= jobcount) {
            await clear();
            completenotify();
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
        var uri = url + `&seq=` + (pageindex + br.firstPageSeq) + '&' + scale;
        syncfetch(pageindex, tri, uri);
    }

    async function syncfetch(pageindex, tri, uri) {
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
                // unexpected aborted
                // gateway bad/timeout
                if (/fetch|abort|429|502|504/.test(message) && tri < TRYLIMIT) {
                    if (message.indexOf('429') > -1) {
                        towait();
                    }
                    else {
                        console.log(`trunk ${pageindex} failed, retry ${++tri}`)
                    }

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
        const name = fileid + '_' + pageindex.toString().padStart(4, '0');
        doc.image({view, name});
    }

    function createPDFPage(view, pageindex) {
        doc.image2(pageindex, view, 0, 0);
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
        status = 1;
    }

    function updatenotify() {
        progress.style.width = (complete / jobcount * 100) + '%';
    }

    function waitnotify() {
        console.log('wait');
        progress.textContent = getMessage('wait');
        status = 4;
    }

    function waitprogressnotify(waitlen) {
        progress.textContent = getMessage('wait') + waitlen + 's';
    }

    function continuenotify() {
        console.log('continue');
        progress.textContent = getMessage("downloading");
        status = 1;
    }

    function completenotify() {
        const [m, s] = testend();
        console.log(`download completed in ${m}m${s}s`);
        progress.classList.remove('iadprogress');
        progress.textContent = getMessage("complete");
        status = 2;
    }

    function failnotify() {
        console.log('failed');
        progress.classList.remove('iadprogress');
        progress.textContent = getMessage("fail");
        status = 3;
    }

    function readynotify() {
        console.log('ready');
        progress.textContent = getMessage("download");
        status = 0;
    }

    function fromId(id) {
        return document.getElementById(id);
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
        streamSaver.WritableStream = globalThis.WebStreamsPolyfill.WritableStream;
    }

    // start
    const manifest = chrome.runtime.getManifest();
    console.log(`${manifest.name} ${manifest.version} in action`);
    loadScript("/js/stub1.js");

};
