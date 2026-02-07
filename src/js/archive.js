/*
 * archive1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Base from './base.js';
import ImageDecoder from './utils/image_decoder.js';

'use strict';

export default class Archive1 extends Base {
    constructor() {
        super();
        this.btnData = '/page/btnData1.html';
        this.stubUrl = '/js/stub1.js?tabid=' + this.tabid;
        this.PAGE = 'OBJECT';
        this.PARAGRAPH = 'PARAGRAPH';
        this.LINE = 'LINE';
        this.WORD = 'WORD';
        this.COORDS = 'coords';
        this.REG_COORDS = /^[0-9]+(,[0-9]+){3,}$/;
        this.DELIMITER = ',';
        this.data = [];              // page image urls
    }

    setup() {
        this.loadFont = this.loadFont1;
        this.loadScript(this.stubUrl);
    }

    async loadButtons(href) {
        console.log(`Internet Archive Downloader: load buttons: ${href}`);
        const iadlabel = fromClass('iadlabel');
        if (iadlabel.length > 0) {
            console.log('Internet Archive Downloader: Buttons already loaded.');
            return;
        }

        const btnurl = chrome.runtime.getURL(href);
        const resp = await fetch(btnurl);
        const html = await resp.text();

        // Try multiple candidate selectors for the button container
        const selectors = [
            'action-buttons-section',
            'ia-item-actions',
            'ia-book-actions',
            'item-details-actions'
        ];

        let ab = [];
        for (const selector of selectors) {
            ab = fromClass(selector);
            if (ab.length > 0) {
                console.log(`Internet Archive Downloader: Found button container: ${selector}`);
                break;
            }
        }

        if (ab.length > 0) {
            ab[0].insertAdjacentHTML("afterbegin", html);
            fromId('iadbuttonid')?.addEventListener('click', this.iadDownload);
            fromId('iadscaleid')?.addEventListener('input', this.iadOnScale);
        } else {
            console.warn('Internet Archive Downloader: Could not find a suitable container to inject buttons. Searching generic action area...');
            // Last resort: search for any element containing "favorite" button as a hint
            const favoriteBtn = fromClass('iconochive-favorite');
            if (favoriteBtn.length > 0) {
                const container = favoriteBtn[0].parentElement;
                container?.insertAdjacentHTML("afterbegin", html);
                fromId('iadbuttonid')?.addEventListener('click', this.iadDownload);
                fromId('iadscaleid')?.addEventListener('input', this.iadOnScale);
            } else {
                console.error('Internet Archive Downloader: Failed to inject buttons (no container found).');
            }
        }
    }

    configScales() {
        console.log('config scales');
        var s = fromId('iadscaleid');
        if (!s) return;

        const factors = this.br.reductionFactors;
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

    updategTasks(tasks) {
        console.log('update tasks');
        this.tasks = tasks;
    }

    getBookInfo() {
        let br = this.br;
        console.log('get book info');
        this.fileid = br.bookId;
        this.data = br.data;
        this.url2 = `https://${br.server}/BookReader/BookReaderGetTextWrapper.php?path=${br.bookPath}_djvu.xml&mode=djvu_xml&page=`;
        this.pagecount = this.data.length;
    }

    getMetadata() {
        if (this.info) return;

        console.log('get metadata');
        let info = {};
        info.Title = this.br.bookTitle;
        const meta = new Map();
        meta.set('by', 'Author');
        meta.set('Publication date', 'PublicationDate')
        meta.set('Topics', 'Subject')
        meta.set('Publisher', 'Publisher')
        meta.set('Language', 'Language')
        meta.set('Isbn', 'ISBN')
        const metadata = fromClass('metadata-definition');

        for (var i = 0; i < metadata.length; i++) {
            const metaname = metadata[i].children[0].innerText;

            if (meta.has(metaname)) {
                info[meta.get(metaname)] = metadata[i].children[1].innerText;
            }
        }
        info.Application = this.manifest.name;
        this.info = info;
    }

    getDownloadInfo() {
        console.log('get download info');
        this.scale = fromId('iadscaleid').value;
        this.filename = this.fileid + '_';
        this.filename += this.scale;
        this.filename += (this.alt || this.settings.range) ? `_${this.startp}_${this.endp}` : '';
        this.filename += this.ctrl ? '.zip' : '.pdf';
    }

    dispatch() {
        if (this.jobs.isEmpty) return;

        let data = this.data;
        let scale = this.scale;
        const job = this.jobs.deque();
        const pageindex = job.pageindex;
        const tri = job.tri;
        console.log(`chunk ${pageindex}`);
        var uri = data[pageindex].uri;
        uri += uri.indexOf("?") > -1 ? "&" : "?";
        uri += `scale=${scale}&rotate=0`;
        var uri2 = this.url2 + pageindex.toString();
        const width = Math.ceil(data[pageindex].width / scale);
        const height = Math.ceil(data[pageindex].height / scale);
        this.syncfetch(pageindex, tri, uri, uri2, width, height);
    }

    async decodeImage(response) {
        return await ImageDecoder.decodeArchiveImage(response);
    }

    getMaxDim(xmldoc) {
        let maxwidth = null, maxheight = null;
        let tag = xmldoc.querySelector(this.PAGE);

        if (tag?.hasAttribute('width') && tag.hasAttribute('height')) {
            maxwidth = parseFloat(tag.attributes['width'].value);
            maxheight = parseFloat(tag.attributes['height'].value);
        }
        return { maxwidth, maxheight };
    }

    returnBook() {
        if (!this.br.protected || !this.settings.retern) return;

        console.log('return book.');
        const uri = 'https://archive.org/services/loans/loan';
        const formdata = new FormData();
        formdata.set('action', 'return_loan');
        formdata.set('identifier', this.fileid);

        fetch(uri, {
            method: "POST",
            credentials: "include",
            body: formdata,
        }).then(response => {
            if (response.ok) {
                console.log('reload web page.');
                location.reload();
            }
            else {
                throw new Error(response.status);
            }
        }).catch(e => console.log(e));
    }

    removeProgressIcon() {
        this.progressicon.classList.remove('iconochive-download');
    }

    addProgressIcon() {
        this.progressicon.classList.add('iconochive-download');
    }

    refreshTip() {
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
            catch (e) { }
        }, 500);
    }
}

function findInShadows(selector, root = document) {
    let found = root.querySelector(selector);
    if (found) return found;

    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
        if (el.shadowRoot) {
            found = findInShadows(selector, el.shadowRoot);
            if (found) return found;
        }
    }
    return null;
}

function findAllInShadows(selector, root = document, found = []) {
    const elements = root.querySelectorAll(selector);
    elements.forEach(el => found.push(el));

    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
        if (el.shadowRoot) {
            findAllInShadows(selector, el.shadowRoot, found);
        }
    }
    return found;
}

function fromId(id) {
    return findInShadows('#' + id);
}

function fromClass(cls) {
    return findAllInShadows('.' + cls);
}
