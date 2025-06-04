/*
 * hathitrust1.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Base from './base.js';

'use strict';
  
export default class Hathitrust1 extends Base {
    constructor() {
        super();
        this.btnData = '/page/btnData1.html';
        this.stubUrl = '/js/stub1.js?tabid=' + this.tabid;
        this.PARAGRAPH = '.ocr_par';
        this.LINE = '.ocr_line';
        this.WORD = '.ocrx_word';
        this.COORDS = 'data-coords';
        this.DELIMITER = ' ';
        this.url = '';               // page image urls
        this.toohot = null;          // wait for server cooling
    }

    setup() {
        this.loadFont = this.loadFont1;
        this.loadScript(this.stubUrl);
    }

    async loadButtons(href) {
        console.log(`load buttons: ${href}`);
        const ayesha = document.getElementsByClassName('me-1')[1]?.textContent;
        if (ayesha == 'Ayesha') return;

        const btnurl = chrome.runtime.getURL(href);
        const resp = await fetch(btnurl);
        let html = await resp.text();
        const buttonid = this.tabid;
        html = html.replaceAll('${buttonid}', buttonid);
        const ac = fromId('controls')?.getElementsByClassName("border-top");
        ac[0]?.insertAdjacentHTML("afterend", html);
        fromId('iadbuttonid').addEventListener('click', this.iadDownload);
        fromId('iadscaleid').addEventListener('input', this.iadOnScale);
        fromId('iadtasksid').addEventListener('input', this.iadOnTasks);
    }

    configScales() {
        console.log('config scales');
        var s = fromId('iadscaleid');
        if (!s) return;

        let fc = s.firstChild;
        var n = 3;

        while (n > 0) {
            const o = document.createElement('option');
            const v = n * this.br.defaultImage.height;
            o.value = 'height=' + v;
            o.innerText = 'height: ' + v;
            if (n == 3) o.selected = true;
            s.insertBefore(o, fc);
            n--;
        }
    }

    updategTasks(tasks) {
        console.log('update tasks');
        var s = fromId('iadtasksid');
        if (!s) return;

        const options = s.options;

        for (let i = 0; i < options.length; i++) {
            if (options[i].value == tasks) {
                options[i].selected = true;
                return;
            }
        }
    }

    iadOnTasks(e) {
        console.log('on tasks');
        chrome.runtime.sendMessage({
            cmd: 'setting',
            name: 'tasks',
            value: Number(this.options[this.selectedIndex].value),
        });
    }

    getBookInfo() {
        let br = this.br;
        console.log('get book info');
        this.fileid = br.id.replace(/[^a-zA-Z0-9_]/g, '_');
        this.url = 'https://babel.hathitrust.org/cgi/imgsrv/image?id=' + br.id;
        this.url2 = 'https://babel.hathitrust.org/cgi/imgsrv/html?id=' + br.id;
        this.pagecount = br.totalSeq;
    }

    getMetadata() {
        if (this.info) return ;

        let br = this.br;
        console.log('get metadata');
        let info = {};
        if (br.metadata.title) info.Title = br.metadata.title;
        if (br.metadata.author) info.Author = br.metadata.author;
        if (br.metadata.publisher) info.Publisher = br.metadata.publisher;
        if (br.metadata.publicationDate) info.PublicationDate = br.metadata.publicationDate;
        info.Application = this.manifest.name;
        this.info = info;
    }

    getDownloadInfo() {
        console.log('get download info');
        this.scale = fromId('iadscaleid').value;
        this.tasks = parseInt(fromId('iadtasksid').value);
        this.filename = this.fileid + '_';
        this.filename += this.scale.indexOf('full') > -1 ? 'full' : this.scale.substring(7);
        this.filename += (this.alt || this.settings.range) ? `_${this.startp}_${this.endp}` : '';
        this.filename += this.ctrl ? '.zip' : '.pdf';
    }

    towait() {
        if (this.status == 1) {
            this.waitnotify();
            this.pause();
            this.waithot();
        }
    }

    waithot() {
        var waitlen = 61;

        this.toohot = setInterval(function() {
            if (--waitlen <= 0) {
                this.tocontinue();
            }
            else {
                this.waitprogressnotify(waitlen);
            }
        }, 1000);
    }

    async clean() {
        this.clearwaithot();
        await super.clean();
    }

    clearwaithot() {
        if (this.toohot) {
            clearInterval(this.toohot);
            this.toohot = null;
        }
    }

    tocontinue() {
        this.clearwaithot();

        if (this.status == 4) {
            this.continuenotify();
            this.resume();
        }
    }

    dispatch() {
        if (this.jobs.isEmpty) return;

        const job = this.jobs.deque();
        const pageindex = job.pageindex;
        const tri = job.tri;
        console.log(`chunk ${pageindex}`);
        var uri = this.url + `&seq=` + (pageindex + this.br.firstPageSeq) + '&' + this.scale;
        var uri2 = this.url2 + `&seq=` + (pageindex + this.br.firstPageSeq);
        this.syncfetch(pageindex, tri, uri, uri2);
    }

    async decodeImage(response) {
        return await response.arrayBuffer();
    }

    getMaxDim(xmldoc) {
        let maxwidth = 0, maxheight = 0;
        let tag = xmldoc.getElementsByTagName('div');

        if (tag != null && tag.length > 0) {
            let coords = tag[0].attributes[this.COORDS].value.split(this.DELIMITER);
            maxwidth = parseFloat(coords[2]);
            maxheight = parseFloat(coords[3]);
        }
        return { maxwidth, maxheight };
    }

    removeProgressIcon() {
        this.progressicon.classList.remove('fa-solid', 'fa-arrow-down');
    }

    addProgressIcon() {
        this.progressicon.classList.add('fa-solid', 'fa-arrow-down');
    }

    waitnotify() {
        console.log('wait');
        this.progress.textContent = getMessage('wait');
        this.status = 4;
    }

    waitprogressnotify(waitlen) {
        this.progress.textContent = getMessage('wait') + waitlen + 's';
    }

    continuenotify() {
        console.log('continue');
        this.progress.textContent = getMessage("downloading");
        this.status = 1;
    }
}

function fromId(id) {
    return document.getElementById(id);
}

function getMessage(messageName, substitutions) {
    return chrome.i18n.getMessage(messageName, substitutions);
}
