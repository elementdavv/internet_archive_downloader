/*
 * base.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import './utils/streamsaver.js';
import Queue from './utils/queue.js';
import TBuf from './utils/tbuf.js';
import PDFDocument from './pdf/document.js';
import ZIPDocument from './zip/document.js';

'use strict';

const sw = !window.showSaveFilePicker;                  // is using service worker
const ff = /Firefox/.test(navigator.userAgent);         // is firefox

export default class Base {
    constructor() {
        this.manifest = chrome.runtime.getManifest();
        this.tabid = `${(new Date()).getTime()}-${Math.ceil(Math.random() * 1e3)}`.toString();
        this.cssData = '/css/iad.css';
        this.ponyfill = './utils/ponyfill-writablestream.es6.js';
        this.enFont = '/js/pdf/font/data/Georgia.afm';
        this.mitm = 'https://elementdavv.github.io/streamsaver.js/mitm.html?version=2.0.0';
        this.settings = {};

        this.br = {};               // book reader
        this.status = 0;            // 0:idle, 1:downloading, 2:completed, 3:failed, 4:server complain waiting
        this.ctrl = false;          // ctrlKey
        this.alt = false;           // altKey

        this.lang = null;           // language code
        this.font = null;           // fontname
        this.fontdata = null;       // font data stream

        this.fileid = '';           // book basename
        this.url2 = '';             // page text urls
        this.pagecount = 0;         // page count

        this.info = null;           // book metadata

        this.progress = null;       // progress bar
        this.progressicon = null;   // progress icon

        this.swaitcreate = false;   // wait for sw file creation

        this.startp = 1;            // start page: one based
        this.endp = 100;            // end page, inclusive
        this.realcount = 0;         // real page count selected

        this.scale = '';            // page scale
        this.filename = "";         // filename to save

        this.swto = null;           // service worker ready timeout

        this.pdfOptions = null;     // pdf creation options

        this.jobs = null;           // jobs
        this.jobcount = 0;          // job count
        this.complete = 0;          // page count completed
        this.paused = 0;            // paused count
        this.recover = 0;           // recover file
        this.ac = null;             // AbortController
        this.content = [];          // book content for zip document
        this.tasks = 10;            // parallel task number
        this.trylimit = 3;          // retry limit for each leaf

        this.filehandle = null;     // filesystemfilehandle
        this.writer = null;         // file stream writer
        this.doc = null;            // pdf/zip document object

        window.addEventListener('message', this.onmessage);

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (sender.id != chrome.runtime.id) return;
            if (!window.internetarchivedownloaderinit) return;

            console.log(`message from browser: ${message.cmd}`);

            if (message.cmd == 'settings') {
                this.updateSettings(message.settings);
            }
            else if (sw) {
                if (this.status != 1 && this.swaitcreate == false) return;

                switch (message.cmd) {
                    case 'create':
                        this.created();
                        break;
                    case 'pause':
                        this.pause();
                        break;
                    case 'resume':
                        this.resume();
                        break;
                    case 'cancel':
                        this.abort();
                        break;
                    default:
                        break;
                }
            }
            sendResponse({});
        });
        if (sw) {
            streamSaver.mitm = this.mitm;
        }
        if (ff) {
            import(this.ponyfill).then(() => {
                // native TransformStream and WritableStream only work in firefox 113, use ponyfill instead
                streamSaver.supportsTransferable = false;
                streamSaver.WritableStream = globalThis.WebStreamsPolyfill.WritableStream;
            });
        }
        console.log(`\n${this.manifest.name} ${this.manifest.version} in action`);
        console.log(navigator.userAgent);
        console.log(`isBrave: ${navigator.brave && typeof navigator.brave.isBrave == 'function' ? true : false}`);
    }

    onmessage(evt) {
        let that = window.internetarchivedownloader;
        const edata = evt.data;
        if (edata.tabid != that.tabid) return;
        console.log(`message from window: ${edata.cmd}`);

        switch (edata.cmd) {
            case 'init':
                that.br = JSON.parse(edata.br);
                // in firefox, service worker is not visible to content script, so test it from web page
                if (sw) streamSaver.testSw(that.br.swInNavigator);
                that.init();
                break;
            default:
                break;
        }
    }

    loadScript(href) {
        const scripts = document.querySelectorAll('script');

        for (let script of scripts) {
            if (script.src.indexOf(href) > -1) {
                window.postMessage({ tabid: this.tabid, cmd: 'restart' });
                return;
            }
        }
        console.log(`load script: ${href}`);
        var script = document.createElement('script');
        script.type = 'module';
        script.src = toUrl(href);
        document.head.appendChild(script);
    }

    loadCss(href) {
        console.log(`load css: ${href}`);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = toUrl(href);
        document.head.appendChild(link);
    }

    iadDownload(e) {
        let that = window.internetarchivedownloader;
        that.ctrl = false;
        that.alt = false;

        if (that.status == 0) {
            that.ctrl = e.ctrlKey || e.metaKey || that.settings.format;
            that.alt = e.altKey;
        }
        that.begin();
    }

    iadOnScale(e) {
        console.log('on scale');
        sendMessage({
            cmd: 'setting',
            name: 'quality',
            value: this.selectedIndex + 1,
        });
    }

    async loadFont1() {
        if (this.font) return;

        console.log('load font data');
        this.font = 'Times-Roman';
        const fonturl = toUrl(this.enFont);
        const response = await fetch(fonturl);
        this.fontdata = await response.text();
        console.log('    default font data loaded');
    }

    async loadFont2() {
        if (this.font) return;

        console.log('load font data');
        let langs = [];

        if (this.lang) {
            langs.push(this.lang);
        }
        else {
            langs = await this.Lang.getLangs(this.info);
            this.lang = langs[0];
        }
        let fonturl = this.Lang.getFontUrl(langs);

        if (!fonturl) {
            await this.postLoadFont(null);
            return;
        }
        let base64 = await chrome.storage.local.get({ [fonturl]: null });

        if (base64[fonturl]) {
            await this.postLoadFont(base64[fonturl]);
        }
        else {
            let fname = fonturl.substr(fonturl.lastIndexOf('/') + 1);
            console.log('    download font: ' + fname);
            const response = await fetch(fonturl, { responseType: 'arraybuffer' });

            if (response.ok) {
                console.log('    download complete');
                const buffer = await response.arrayBuffer();

                TBuf.bufferToBase64(buffer).then(base64 => {
                    chrome.storage.local.set({ [fonturl]: base64 });
                });
                await this.postLoadFont(buffer);
            }
            else {
                console.log('    download fail, fallback to default font');
                await this.postLoadFont(null);
            }
        }
    }

    async postLoadFont(base64) {
        if (!base64) {
            this.font = 'Times-Roman';
            const fonturl = toUrl(this.enFont);
            const response = await fetch(fonturl);
            this.fontdata = await response.text();
            console.log('    default font data loaded');
        }
        else {
            this.font = this.lang;
            if (typeof base64 == 'string') {
                this.fontdata = await TBuf.base64ToBuffer(base64);
            }
            else {
                this.fontdata = base64;
            }
            console.log('    font data loaded');
        }
        if (this.lang == '(unknown)') this.lang = null;
    }

    configButtons() {
        this.configScales();
    }

    getProgress() {
        console.log('get progress');
        this.progress = fromId('iadprogressid');
        this.progressicon = fromId('iadprogressicon');
    }

    getSettings() {
        sendMessage({ cmd: 'settings' });
    }

    async init() {
        console.log('init begin');
        this.loadCss(this.cssData);
        await this.loadButtons(this.btnData);
        this.configButtons();
        this.getBookInfo();
        this.getProgress();
        this.readynotify();
        this.getSettings();
        window.internetarchivedownloaderinit = true;
        console.log('init complete');
    }

    updateSettings(settings) {
        this.settings = settings;
        this.trylimit = settings.retry;
        this.updateButtons(settings);

        if (settings.range) {
            this.endp = this.startp + settings.range - 1;            // end page, inclusive
            if (this.endp > this.pagecount) this.endp = this.pagecount;
        }
    }

    updateButtons(settings) {
        this.updategScales(settings.quality);
        this.updategTasks(settings.tasks);
    }

    updategScales(quality) {
        console.log('update scales');
        var s = fromId('iadscaleid');
        if (!s) return;

        const options = s.options;
        if (quality > options.length) quality -= options.length;
        options[quality - 1].selected = true;
    }

    async begin() {
        let status = this.status;

        if (status == 1) {
            this.pause();
            // before confirm dislog returns, onmessage waits.
            const cf = confirm(getMessage("confirmabort"));

            if (cf) {
                this.abort({ sync: sw });
            }
            else {
                this.resume();
            }
        }
        else if (status == 2 || status == 3) {
            this.readynotify();
        }
        else if (status == 4) {
            this.tocontinue();
        }
        else {
            console.log('message from user: download');
            if (this.getSelPages()) {
                await this.clean();
                this.getDownloadInfo();

                if (!this.ctrl) {
                    this.getMetadata();
                    await this.loadFont();
                }
                this.download();
            }
            else {
                console.log('    download canceled');
            }
        }
    }

    getSelPages() {
        let startp = this.startp, endp = this.endp, pagecount = this.pagecount;
        console.log('get selected page range');

        if (this.alt) {
            const inputpages = prompt(getMessage("promptpage"), `${startp}-${endp}`);
            if (inputpages == null) return false;

            // valid page range: 1-99999
            const pagea = inputpages.split(/^([0-9]{0,5})[,-]{1}([0-9]{0,5})$/);

            if (pagea.length != 4) {
                console.log('    bad range');
                alert(getMessage("invalidinput"));
                return false;
            }
            const p1 = Number(pagea[1]);
            const p2 = Number(pagea[2]);
            startp = Math.max(p1, 1);
            endp = (p2 == 0 || p2 > pagecount) ? pagecount : p2;
        }
        else if (!this.settings.range) {
            startp = 1;
            endp = pagecount;
        }
        this.startp = Math.min(startp, endp);
        this.endp = Math.max(startp, endp);
        this.realcount = this.endp - this.startp + 1;
        console.log(`    pages ${this.startp} - ${this.endp} selected`);
        return true;
    }

    async download() {
        console.log(`download ${this.filename} at ${new Date().toJSON()}`);
        await this.getFile();

        if (this.doc) {
            if (sw) {
                this.waitswfile();

                if (streamSaver.swready) {
                    const message = 'sw ready';
                    console.log(message);
                }
                else {
                    this.waitsw();
                }
            }
            else {
                this.getLeafs();
            }
        }
    }

    // wait for file create event
    waitswfile() {
        this.swaitcreate = true;
    }

    // before begin, clear unclean state
    async clean() {
        await this.clearwaitswfile();
    }

    async clearwaitswfile() {
        if (this.swaitcreate) {
            this.swaitcreate = false;
            const message = 'clear last waitswfile';
            console.log(message);
            await this.abortdoc({ sync: sw });
        }
    }

    // wait and test if service worker is available
    waitsw() {
        this.swto = setTimeout(() => {
            this.swto = null;

            if (streamSaver.swready) {
                const message = 'sw ready';
                console.log(message);
            }
            else {
                this.swaitcreate = false;
                const message = 'File download was blocked';
                console.log(message);
                this.abortdoc({ sync: sw, message });
            }
        }, 3e3);
    }

    // no longer waiting for service worker
    clearwaitsw() {
        if (this.swto) {
            clearTimeout(this.swto);
            this.swto = null;
        }
    }

    // file created, continuing download
    created() {
        if (this.swaitcreate) {
            this.swaitcreate = false;
            this.clearwaitsw();
            this.getLeafs();
        }
    }

    async getFile() {
        if (!this.ctrl) {
            this.pdfOptions = {
                pagecount: this.realcount,
                info: this.info,
                lang: this.lang,
                font: this.font,
                fontdata: this.fontdata,
            };
        }
        try {
            if (sw) {
                console.log('notify browser: new');
                await sendMessage({ cmd: 'new', fileid: this.filename });
                this.createWriterSw();
            }
            else {
                await this.createWriter();
            }
            this.createDoc();
        } catch (e) {
            // error from showSaveFilePicker
            const message = e.toString();
            console.log(e);

            // SecurityError: Failed to execute 'showSaveFilePicker' on 'Window': Must be handling a user gesture to show a file picker.
            if (e.code == 18) {
                this.writer = null;
                this.filehandle = null;
            }
            // DOMException: The user aborted a request.
            // streamSaver will always create temporary file
            if (e.code != 20) {
                this.abortdoc({ sync: sw, message });
            }
        };
    }

    initleaf() {
        this.jobs = new Queue();

        Array(this.realcount).fill().forEach((_, i) => {
            this.jobs.enque({ pageindex: i + this.startp - 1, tri: 0 });
        });
        this.jobcount = this.realcount;
        this.complete = 0;
        this.paused = 0;
        this.recover = 0;
        this.ac = new AbortController();

        if (this.settings.embed) {
            this.content = Array.from({ length: this.realcount }, (v, i) => '');
        }
    }

    getLeafs() {
        console.log(`chunk number: ${this.realcount}`);
        this.startnotify();
        this.initleaf();

        Array(this.tasks).fill().forEach(() => {
            this.dispatch();
        });
    }

    pause() {
        console.log('paused')
        this.paused++;
    }

    resume() {
        console.log('resume');

        if (--this.paused == 0) {
            if (this.recover > 0) {
                Array(this.recover).fill().forEach(() => {
                    this.dispatch();
                });
            }
            this.recover = 0;
        }
    }

    async nextLeaf() {
        if (++this.complete >= this.jobcount) {
            await this.clear();
            this.completenotify();

            if (this.endp != this.pagecount) {
                this.startp += this.realcount;
                this.endp += this.realcount;
                if (this.endp > this.pagecount) this.endp = this.pagecount;
            }
            else {
                this.startp = 1;
                this.endp = this.settings.range || 100;
                this.returnBook();
            }
        }
        else {
            this.updatenotify();

            if (this.paused > 0) {
                this.recover++;
            }
            else {
                this.dispatch();
            }
        }
    }

    async clear() {
        if (this.ctrl) {
            this.createZIPText();
        }
        this.ac = null;
        this.doc.end();
        await this.writer.ready;
        await this.writer.close();
    }

    async syncfetch(pageindex, tri, uri, uri2, width = null, height = null) {
        try {
            const fetchImage = fetch(uri, {
                method: "GET",
                credentials: "include",
                responseType: "arraybuffer",
                signal: this.ac.signal,
            }).then(resp => {
                if (!resp.ok) throw new Error(`Image ${resp.status}`);
                return resp;
            });

            let fetchText = null;
            if (this.settings.embed) {
                fetchText = fetch(uri2, {
                    method: "GET",
                    credentials: "include",
                    signal: this.ac.signal,
                }).then(async resp => {
                    if (!resp.ok) {
                        if (resp.status === 403) {
                            console.warn(`OCR layer (uri2) for page ${pageindex} is forbidden (403). Skipping OCR for this page.`);
                            return null;
                        }
                        throw new Error(`Text ${resp.status}`);
                    }
                    return resp.text();
                }).catch(err => {
                    if (err.message && err.message.includes("403")) return null;
                    return null; // Swallowing non-fatal OCR errors
                });
            }

            const [response, text] = await Promise.all([fetchImage, fetchText]);

            const buffer = await this.decodeImage(response);
            const view = new DataView(buffer);

            this.createPage(view, text, pageindex, width, height);
            this.nextLeaf();
        }
        catch (e) {
            if (this.ac && !this.ac.signal.aborted) {
                const message = e.toString();
                console.log(e);

                if (/fetch|abort|429|502|504|Image|Text/.test(message) && tri < this.trylimit) {
                    if (message.indexOf('429') > -1) {
                        this.towait();
                    }
                    else {
                        console.log(`trunk ${pageindex} failed, retry ${++tri} times`);
                    }
                    this.jobs.enque({ pageindex, tri });
                    this.jobcount++;
                    this.nextLeaf();
                }
                else {
                    this.abort({ sync: sw, message });
                }
            }
        }
    }

    async abort(extra) {
        this.failnotify();
        this.abortLeaf();
        await this.abortdoc(extra);
    }

    abortLeaf() {
        if (this.ac) {
            console.log('abort uncomplete tasks');
            this.ac.abort();
            this.ac = null;
        }
    }

    async abortdoc(extra) {
        if (extra?.sync) {
            console.log('notify browser: abort');
            await sendMessage({ cmd: 'abort' });
        }
        this.doc = null;

        if (this.writer?.abort) {
            await this.writer.abort().catch(e => {
                console.log(`${e} when abort writer`);
            }).finally(this.writer = null);
        }
        if (this.filehandle?.remove) {
            // Brave may throw error
            await this.filehandle.remove().catch(e => {
                console.log(`${e} when remove filehandle`);
            }).finally(this.filehandle = null);
        }
        if (extra?.message) {
            alert(getMessage("alerterror", extra.message));
        }
    }

    createPage(view, text, pageindex, width, height) {
        console.log(`chunk ${pageindex} ready`);

        if (this.ctrl) {
            this.createZIPPage(view, text, pageindex);
        }
        else {
            this.createPDFPage(view, text, pageindex, width, height);
        }
    }

    createZIPPage(view, text, pageindex) {
        if (this.settings.embed) {
            this.content[pageindex - this.startp + 1] = text;
        }
        pageindex++;
        const name = this.fileid + '_' + pageindex.toString().padStart(4, '0');
        this.doc.image({ view, name });
    }

    createZIPText() {
        if (!this.settings.embed) return;

        const uint8 = new TextEncoder().encode(this.getContent());
        const view = new DataView(uint8.buffer);
        const name = this.fileid + '.txt';
        this.doc.image({ view, name });
    }

    createPDFPage(view, text, pageindex, width, height) {
        pageindex -= this.startp - 1;
        const options = {
            pageindex,
            x: 0,
            y: 0,
            width,
            height,
        };
        this.doc.image(view, text, options);
    }

    async createWriter() {
        let options;

        if (this.ctrl) {
            options = this.pickOptions('Zip archive', { 'application/zip': ['.zip'] });
        }
        else {
            options = this.pickOptions('Portable Document Format (PDF)', { 'application/pdf': ['.pdf'] });
        }
        this.filehandle = await showSaveFilePicker(options);
        const writable = await this.filehandle.createWritable();
        // writer.write(ArrayBuffer/TypedArray/DataView/Blob/String/StringLiteral)
        this.writer = await writable.getWriter();
    }

    pickOptions(description, accept) {
        return {
            startIn: 'downloads',
            suggestedName: this.filename,
            types: [{
                description,
                accept,
            }],
        };
    }

    createWriterSw() {
        const writable = streamSaver.createWriteStream(this.filename);
        // writer.write(uInt8)
        this.writer = writable.getWriter();
    }

    createDoc() {
        if (this.ctrl) {
            this.doc = new ZIPDocument(this.writer);
        }
        else {
            this.doc = new PDFDocument(this.writer, this.pdfOptions);
        }
    }

    getContent() {
        let result = '', xmldoc, pars, page, lines, words, l;

        this.content.forEach((text) => {
            xmldoc = new DOMParser().parseFromString(text, 'text/xml');
            pars = xmldoc.querySelectorAll(this.PARAGRAPH);
            page = '';

            pars.forEach((par) => {
                lines = par.querySelectorAll(this.LINE);

                lines.forEach((line) => {
                    words = line.querySelectorAll(this.WORD);
                    l = '';

                    words.forEach((word) => {
                        if (l != '') l += ' ';
                        l += word.textContent;
                    });
                    page += l + '\n';
                });
                page += '\n';
            });
            if (result != '') result += '\n';
            result += page;
        });
        return result;
    }

    notifyTray() {
        if (!this.settings.notify) return;

        console.log('notify tray.');

        const options = {
            type: 'basic',
            title: this.manifest.name,
            iconUrl: toUrl(this.manifest.icons['128']),
            message: `${this.filename}\x0dDownload complete.`,
        };
        const cmd = 'notify';
        sendMessage({ cmd, options });
    }

    startnotify() {
        console.log('start');
        teststart();
        this.progress.classList.add('iadprogress');
        this.progress.textContent = getMessage("downloading");
        const percent = '0%';
        this.progress.style.width = percent;

        if (this.settings.progress) {
            this.removeProgressIcon();
            this.progressicon.textContent = percent;
        }
        this.refreshTip();
        this.status = 1;
    }

    updatenotify() {
        const percent = Math.round(this.complete / this.jobcount * 100) + '%';
        this.progress.style.width = percent;

        if (this.settings.progress) {
            this.progressicon.textContent = percent;
        }
    }

    completenotify() {
        this.notifyTray();
        const [m, s] = testend();
        console.log(`download completed in ${m}m${s}s`);
        this.progress.classList.remove('iadprogress');
        this.progress.textContent = getMessage("complete");

        if (this.settings.progress) {
            this.addProgressIcon();
            this.progressicon.textContent = '';
        }
        this.refreshTip();
        this.status = 2;
    }

    failnotify() {
        console.log('failed');
        this.progress.classList.remove('iadprogress');
        this.progress.textContent = getMessage("fail");

        if (this.settings.progress) {
            this.addProgressIcon();
            this.progressicon.textContent = '';
        }
        this.refreshTip();
        this.status = 3;
    }

    readynotify() {
        console.log('ready');
        this.progress.textContent = getMessage("download");
        this.refreshTip();
        this.status = 0;
    }

    towait() { }
    tocontinue() { }
    returnBook() { }
    refreshTip() { }
}  // class

function fromId(id) {
    return document.getElementById(id);
}

function getMessage(messageName, substitutions) {
    return chrome.i18n.getMessage(messageName, substitutions);
}

function sendMessage(options) {
    chrome.runtime.sendMessage(options);
}

function toUrl(href) {
    return chrome.runtime.getURL(href);
}

var t = 0;

function teststart() {
    t = performance.now();
}

function testend() {
    const ss = (performance.now() - t) / 1000;
    const m = ~~(ss / 60);
    const s = ~~(ss % 60);
    return [m, s];
}
