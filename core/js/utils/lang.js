/*
 * lang.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

'use strict';

const LANGUAGE_CODES = {
    'English': 'en',
    'German': 'de',
    'French': 'fr',
    'Italian': 'it',
    'Dutch': 'nl',
    'Portuguese': 'pt',
    'Spanish': 'es',
    'Swedish': 'sv',
    'Finnish': 'fi',
    'Norwegian': 'no',
    'Hungarian': 'hu',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Hindi': 'hi',
    'Latin': 'la',
    'Greek': 'el',
    'Polish': 'pl',
    'Ukrainian': 'uk',
    'Russian': 'ru',
    'Turkish': 'tr',
    'Romanian': 'ro',
    'Indonesian': 'id',
    'Arabic': 'ar',
    'Hebrew': 'he',
    'Persian': 'fa',
};

const getLangs = async info => {
    let langs = [];
    if (info.Language) {
        const ls = info.Language.split(';');
        ls.forEach(l => {
            const lc = getCode(l);
            if (lc) langs.push(lc);
        });
    }
    if (langs.length == 0) {
        const { languages } = await chrome.i18n.detectLanguage(info.Title);
        languages.forEach( l => {
            const code = l.language.substr(0, 2);
            if (validCode(code)) langs.push(code);
        })
    }
    if (langs.length == 0) {
        langs.push('(unknown)');
    }
    return langs;
}

const getCode = l => {
    const entries = Object.entries(LANGUAGE_CODES);
    for (const [key, value] of entries) {
        if (l.indexOf(key) >= 0) return value;
    }
    return null;
}

const validCode = code => {
    const entries = Object.entries(LANGUAGE_CODES);
    for (const [key, value] of entries) {
        if (value == code) return true;
    }
    return false;
}

const detectLanguage = async text => {
    const { languages } = await chrome.i18n.detectLanguage( text );
    if (languages.length > 0) {
        const code = languages[0].language.substr(0, 2);
        if (validCode(code)) return code;
    }
    return null;
}

const FONTURLS = {
    ',zh,': 'https://elementdavv.github.io/fonts/NotoSerifSC-Regular.ttf',
    ',ja,': 'https://elementdavv.github.io/fonts/NotoSerifJP-Regular.ttf',
    ',ko,': 'https://elementdavv.github.io/fonts/NotoSerifKR-Regular.ttf',
    ',hi,': 'https://elementdavv.github.io/fonts/NotoSerifDevanagari-Regular.ttf',
    ',ar,fa,':
            'https://elementdavv.github.io/fonts/VazirmatnArabic-Regular.ttf',
    ',he,': 'https://elementdavv.github.io/fonts/NotoSerifHebrew-Regular.ttf',
    ',la,el,pl,uk,ru,tr,ro,id,(unknown),':
            'https://elementdavv.github.io/fonts/DejaVuLGCSerif.ttf',
};

const getFontUrl = langs => {
    const entries = Object.entries(FONTURLS);
    for (let i = 0; i < langs.length; i++) {
        let lang = langs[i];
        for (const [key, value] of entries) {
            if (key.indexOf(',' + lang + ',') >= 0) return value;
        }
    }
    return null;
}

let Lang = {
    LANGUAGE_CODES,
    getLangs,
    detectLanguage,
    getFontUrl,
};
export default Lang;
