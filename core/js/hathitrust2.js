/*
 * hathitrust2.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Hathitrust1 from './hathitrust1.js';
import Lang from './utils/lang.js';
import * as fontkit from './fontkit/index.js';
import EmbeddedFont from './pdf/font/embedded.js';

'use strict';
  
export default class Hathitrust2 extends Hathitrust1 {
    constructor() {
        super();
    }

    setup() {
        this.Lang = Lang;
        this.fontkit = fontkit ;
        this.EmbeddedFont = EmbeddedFont ;
        this.loadFont = this.loadFont2;
        this.loadScript(this.stubUrl);
    }

    configButtons() {
        super.configButtons();
        this.configLanguages();
    }

    async configLanguages() {
        console.log('config languages');
        var l = fromId('iadlangid');
        if (!l) return;

        const code = await Lang.detectLanguage(this.br.metadata.title);
        const entries = Object.entries(Lang.LANGUAGE_CODES);

        for (const [key, value] of entries) {
            if (value == 'en') continue;
            const o = document.createElement('option');
            o.value = value;
            o.innerText = key;
            if ( value == code ) o.selected = true;
            l.appendChild(o);
        }
        const o = document.createElement('option');
        o.value = '(unknown)';
        o.innerText = '(other)';
        l.appendChild(o);
        let lp = fromId('iadlangparent');
        if (lp) lp.style.display = '';
    }

    getDownloadInfo() {
        super.getDownloadInfo();
        this.lang = fromId('iadlangid').value;
    }
}

function fromId(id) {
    return document.getElementById(id);
}
