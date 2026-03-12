/*
 * archive2.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

import Archive1 from './archive1.js';
import Lang from './utils/lang.js';
import * as fontkit from './fontkit/index.js';
import EmbeddedFont from './pdf/font/embedded.js';

'use strict';
  
export default class Archive2 extends Archive1 {
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
}
