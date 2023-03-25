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
        const html = 
            "<div class='topinblock share-button'> \
                <button class='button' type='button' onclick=window.postMessage({from:'iad',cmd:'begin'},'*')> \
                    <div> \
                        <span class='iconochive-download'></span> \
                        <span class='icon-label' id='iadprogressid'>" + download + "</span> \
                    </div> \
                </button> \
            </div>";
        ab1.insertAdjacentHTML("afterbegin", html);
    }

    var src = "";

    function findSrc() {
        src = "";
        const brpageimage = document.getElementsByClassName("BRpageimage");
        if (brpageimage.length == 0) { return 0; }
        src = brpageimage[brpageimage.length -1].src;
        if (src.indexOf("BookReaderImages") == -1) { return 1; }
        return 2;
    }

    var step = 0;
    const MAXSTEP = 5;

    function check() {
        const st = findSrc();
        if (st == 0) {
            if (++step == MAXSTEP) {
                clearInterval(intervalid)
                intervalid = null;
            }
        }
        else {
            clearInterval(intervalid);
            intervalid = null;
            if (st == 2) addbtn();
        }
    }

    var intervalid = setInterval(check, 1000);

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    var status = 0;             // 0:idle, 1:downloading, 2:completed, 3:failed
    var pagecount = 0;          // page number of the book

    async function begin() {
        if (status == 1) 
            return;
        if (status == 2 || status == 3) {
            progress().textContent = chrome.i18n.getMessage("download");
            status = 0;
            return;
        }

        if (findSrc() != 2) return;

        console.log(`archive.org PDF Books Downloader: ${new Date()}`);

        const brcurrentpage = document.getElementsByClassName("BRcurrentpage");
        if (brcurrentpage.length == 0) {
            alert(chrome.i18n.getMessage("pagenotfounderror"))
        }
        else {
            const pagerange = brcurrentpage[0].textContent;
            pagecount = parseInt(pagerange.split(" ")[2]);
            console.log("pagecount:" + pagecount);
            parseSrc();
            download();
        }
    };

    const holder = "{index}";   // place holder of the template
    var fileid = "";            // base filename of the book
    var filename = "";          // download filename
    var url = "";               // url template for page url

    /* src example: 
    * :https://ia800406.us.archive.org/BookReader/BookReaderImages.php
    * ?zip=/32/items/isbn_0809463962/isbn_0809463962_jp2.zip
    * &file=isbn_0809463962_jp2/isbn_0809463962_0001.jp2
    * &id=isbn_0809463962
    * &scale=8
    * &rotate=0
    */
    function parseSrc() {
        console.log("src:" + src);
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
        url = srcsp[0] + "&" + url + "&" + srcsp[2] + "&" + srcsp[3] + "&" + srcsp[4];
    }

    var writer = null;          // file stream writer
    var doc = null;             // pdf document object
    var fileset = null;         // downloading file set
    var pageindex = 0;          // current downloading number
    var stop = false;           // whether to stop immediately
    var complete = 0;           // sucessful download number
    var err = [];               // err message
    const MAXNUMBER = 5;        // parallel download limit

    async function download() {
        writer = null;
        doc = null;
        fileset = new Set();
        pageindex = 0;
        stop = false;
        complete = 0;
        err = [];
        console.log(`there are ${pagecount} chunks in all.`)
        try {
            await createDoc();
        } catch(e) {
            if (writer) {
                writer.close();
                writer = null;
            }
            doc = null;
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
        while (!stop && pageindex < pagecount && fileset.size < MAXNUMBER) {
            pageindex++;
            fileset.add(pageindex);
            console.log(`chunk ${pageindex}`);
            syncfetch(pageindex);
        }
    }

    async function syncfetch(pageindex) {
        var s = pageindex.toString().padStart(4, "0");
        const newurl = url.replace(holder, s);
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
            else throw response;
        }
        catch(e) {
            fileset.delete(pageindex);
            stop = true;
            console.log(e);
            adderr(e);
            if (fileset.size == 0) {
                if (writer) {
                    writer.close();
                    writer = null;
                }
                doc = null;
                if (err.length > 0) {
                    alert(chrome.i18n.getMessage("alerterror", err.join('.\n')));
                }
                failnotify();
            }
        };
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
        if (++complete == pagecount) {
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
            const filehandle = await showSaveFilePicker(options);
            const writable = await filehandle.createWritable();
            writer = await writable.getWriter();
            doc = new PDFDocument(writer, {
                pagecount: pagecount
                , info: { 
                    Title: filename,
                    Author: 'Element Davv',
                    Homepage: 'https://github.com/elementdavv/internet_archive_downloader',
                } 
            });
        }
    }

    function startnotify() {
        progress().classList.add('iadprogress');
        progress().textContent = chrome.i18n.getMessage("downloading");
        progress().style.width = "0%";
        status = 1;
    }

    function updatenotify() {
        progress().style.width = (pageindex / pagecount * 100) + '%';
    }

    function completenotify() {
        progress().classList.remove('iadprogress');
        progress().textContent = chrome.i18n.getMessage("complete");
        status = 2;
    }

    function failnotify() {
        progress().classList.remove('iadprogress');
        progress().textContent = chrome.i18n.getMessage("fail");
        status = 3;
    }

    function progress() {
        return document.getElementById('iadprogressid');
    }

};
