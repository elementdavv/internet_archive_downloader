/*
 * stub.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

export default class Stub {
    constructor() {
        this.step = 0;
        this.steplimit= 8;
        this.intervalid = null;
        window.addEventListener( 'message', this.onmessage );
    }

    check = () => {
        const st = this.getBookStatus();

        if (st == 0) {
            if (++this.step == this.steplimit) {
                console.log('wait timeout, quit');
                this.clear();
            }
        }
        else {
            this.clear();

            if (st == 2) {
                window.postMessage({
                    tabid: this.tabid,
                    cmd: 'init',
                    br: this.getBr(),
                });
            }
        }
    }

    start = () => {
        console.log('start stub');
        this.intervalid = setInterval( this.check, 1000 );
    }

    clear = () => {
        clearInterval(this.intervalid);
        this.intervalid = null;
    }

    onmessage = (e) => {
        const data = e.data;
        const that = Stub.instance;
        if (data.tabid != that.tabid) return;

        if (data.cmd == 'restart') {
            that.start();
        }
    };

    static instance;
}
