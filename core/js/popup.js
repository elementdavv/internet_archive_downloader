/*
 * popup.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

(() => {
    function handleClick(id, handler) {
        document.getElementById(id).addEventListener( 'click', handler );
    }

    function handleInput(id, handler) {
        document.getElementById(id).addEventListener( 'input', handler );
    }

    function openUrl(e) {
        chrome.tabs.create({url: e.currentTarget.attributes.href.value});
        window.close();
    }

    function showButtons() {
        console.log('show buttons');
        const query = { active: true, currentWindow: true };

        chrome.tabs.query(query, async tabs => {
            if (tabs.length == 0) return;
            var tab = tabs[0];
            const detail = 'https://archive.org/details';
            const detail2 = 'https://babel.hathitrust.org/cgi/pt';
            const jsc = '/js/contents.js';

            if (tab.url.indexOf(detail) > -1) {
                const dnr = await loadDnr();

                if (dnr == 1) {
                    injectjs(tab.id, jsc);
                }
                else {
                    console.log('Internet Archive Downloader unsupported.');
                }
            }
            else if (tab.url.indexOf(detail2) > -1) {
                injectjs(tab.id, jsc);
            }
            else {
                console.log('invalid location');
            }
            window.close();
        });
    }

    function test() {
        console.log('test');
        const query = { active: true, currentWindow: true };

        chrome.tabs.query(query, tabs => {
            if (tabs.length == 0) return;
            var tab = tabs[0];
            const detail = 'https://archive.org/details';
            const search = 'https://archive.org/search';
            const jst = '/js/test.js';

            if (tab.url.indexOf(detail) > -1 || tab.url.indexOf(search) > -1) {
                injectjs(tab.id, jst);
            }
            window.close();
        });
    }

    function injectjs(tabId, js) {
        chrome.scripting.executeScript({
            files: [js]
            , target: {tabId}
        });
    }

    async function loadDnr() {
        const r = await chrome.storage.session.get({ 'dnr': 0 });
        return parseInt(r.dnr);
    }

    function onDefault(e) {
        const name = e.currentTarget.attributes.name.value;
        const value = defs[name];
        const cmd = 'setting';
        port.postMessage({ cmd, name, value });
        fromId(`id-${name}-value`).innerText = value ;
        fromId(`id-${name}-slider`).value = value - ((name == 'tasks' && value == 6) ? 1 : 0);
    }

    function onSlider(e) {
        const name = e.currentTarget.attributes.name.value;
        let value = Number(this.value);
        if (name == 'tasks' && value == 5) value++;
        const cmd = 'setting';
        port.postMessage({ cmd, name, value });
        fromId(`id-${name}-value`).innerText = value;
    }

    function onSwitch(e) {
        const name = e.currentTarget.attributes.name.value;
        let value = this.checked ;
        const cmd = 'setting';

        if (name != 'range') {
            port.postMessage({ cmd, name, value });
        }
        else {
            if (this.checked) {
                value = Number(fromId(`id-${name}-slider`).value);
            }
            port.postMessage({ cmd, name, value });
            const display = this.checked ? '' : 'none';
            fromId(`id-${name}-value`).style.display = display;
            fromId(`id-${name}-tr`).style.display = display;
        }
    }

    function fromId(id) {
        return document.getElementById(id);
    }

    function init() {
        handleClick('id-archive', openUrl);
        handleClick('id-hathitrust', openUrl);
        handleClick('id-showbuttons', showButtons);
        handleClick('id-test', test);
        handleClick('id-help', openUrl);
        handleClick('id-quality-default', onDefault);
        handleClick('id-tasks-default', onDefault);
        handleClick('id-retry-default', onDefault);
        handleInput('id-quality-slider', onSlider);
        handleInput('id-tasks-slider', onSlider);
        handleInput('id-range-slider', onSlider);
        handleInput('id-retry-slider', onSlider);
        handleInput('id-format', onSwitch);
        handleInput('id-progress', onSwitch);
        handleInput('id-range', onSwitch);
        handleInput('id-embed', onSwitch);
        handleInput('id-retern', onSwitch);
        handleInput('id-notify', onSwitch);

        port = chrome.runtime.connect({ name: 'iadpop'});

        port.onDisconnect.addListener( p => {
            const e = p.error || chrome.runtime.lastError;

            if (e) {
                console.log(`disconnected by error: ${e.message}`);
                port = chrome.runtime.connect({ name: 'iadpop'});
            }
            else {
                console.log(p.name + ' disconnect');
            }
        });

        port.onMessage.addListener( (message, p) => {
            console.log( 'receive settings' );
            console.log( message );
            let settings = message.settings;

            for (const [name, value] of Object.entries(settings)) {
                switch(name) {
                case 'quality':
                case 'tasks':
                case 'retry':
                    fromId(`id-${name}-value`).innerText = value ;
                    fromId(`id-${name}-slider`).value = value ;
                    break;
                case 'format':
                case 'embed':
                case 'progress':
                case 'retern':
                case 'notify':
                    fromId(`id-${name}`).checked = value ;
                    break;
                case 'range':
                    fromId(`id-${name}`).checked =  value != false;
                    const display = value  ? '' : 'none';
                    fromId(`id-${name}-value`).style.display = display;
                    fromId(`id-${name}-tr`).style.display = display;

                    if ( value ) {
                        fromId(`id-${name}-value`).innerText = value ;
                        fromId(`id-${name}-slider`).value = value ;
                    }
                    break;
                case 'default_quality':
                case 'default_tasks':
                case 'default_retry':
                    defs[name.substr('default_'.length)] = value;
                    break;
                default:
                    break;
                }
            }
        });
        // keep bg active
        setInterval( () => {
            try { port.postMessage({}) }
            catch (e) {}
        }, 25e3);

        port.postMessage({ cmd: 'settings' });
    }

    let defs = {};
    let port = null;
    window.onload = () => { init(); }

})();
