/*
 * archive1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Base from './base.js';

'use strict';
  
export default class Archive1 extends Base {
    constructor() {
        super();
        this.service = 1;
        this.data = [];              // page image urls
    }

    setup() {
        this.loadFont = this.loadFont1;
        this.loadScript("/js/stub.js?tabid=" + this.tabid);
    }

    async loadButtons(href) {
        console.log(`load buttons: ${href}`);
        const iadlabel = document.getElementsByClassName('iadlabel');
        if (iadlabel.length > 0) return;

        const btnurl = chrome.runtime.getURL(href);
        const resp = await fetch(btnurl);
        const html = await resp.text();
        const ab = fromClass('action-buttons-section');
        ab[0]?.insertAdjacentHTML("afterbegin", html);
        fromId('iadbuttonid').addEventListener('click', this.iadDownload);
    }

    configButtons() {
        this.configScales();
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

    getBookInfo() {
        let br = this.br;
        console.log('get book info');
        this.fileid = br.bookId;
        this.data = br.data;
        this.url2 = `https://${br.server}/BookReader/BookReaderGetTextWrapper.php?path=${br.bookPath}_djvu.xml&mode=djvu_xml&page=`;
        this.pagecount = this.data.length;
    }

    getMetadata() {
        if (this.info) return false;

        console.log('get metadata');
        this.info = {};
        this.info.Title = this.br.bookTitle;
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
                this.info[meta.get(metaname)] = metadata[i].children[1].innerText;
            }
        }
        this.info.Application = chrome.runtime.getManifest().name;
        return true;
    }

    getDownloadInfo() {
        console.log('get download info');
        this.scale = fromId('iadscaleid').value;
        this.filename = this.fileid + '_';
        this.filename += this.scale;
        this.filename += this.alt ? `_${this.startp}_${this.endp}` : '';
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

    returnBook() {
        if (!this.br.protected) return;

        console.log('return the book.');
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
                console.log('reload page.');
                location.reload();
            }
            else {
                throw new Error(response.status);
            }
        }).catch(e=>console.log(e));
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
            catch(e){}
        }, 500);
    }
}

function fromId(id) {
    return document.getElementById(id);
}

function fromClass(cls) {
    return document.getElementsByClassName(cls);
}
