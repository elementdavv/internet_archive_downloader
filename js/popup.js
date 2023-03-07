/*
 * popup.js
 * Copyright (C) 2023 Element Davv<vinctai@gmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */
(function(){
    'use strict';

    const url = "https://archive.org/details";
    chrome.tabs.query(
        {active: true}
        , tabs => {
            var tab = tabs[0];
            var getit = document.getElementById("getit");
            if (tab.url.indexOf(url) == 0) {
                getit.addEventListener("click", function() {
                    chrome.scripting.executeScript({
                        files: ['js/content.js']
                        , target: {tabId: tab.id}
                    });
                    window.close();
                }); 
            }
            else {
                getit.innerHTML = "No book";
                getit.style.cursor = "auto";
            }
        }
    );

})();
