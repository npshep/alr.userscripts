// ==UserScript==
// @name         Disable OneDrive Text Editor Suggestions
// @namespace    https://www.alittleresearch.com.au
// @version      2024-12-12
// @description  Disable the text suggestions that pop-up in OneDrive's text editor.
// @author       Nick Sheppard
// @match        https://*.sharepoint.com/my*
// @match        https://*.sharepoint.com/personal/*
// @icon         https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant        none
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2025 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

(function() {
    'use strict';

    // The suggestions box is a DIV with class "suggest-widget" created
    // the first time the text editor makes a suggestion. Thereafter,
    // its visibility is toggled by adding and removing the "visible"
    // class.
    //
    // The observer1 object watches the whole document until the
    // suggestions box appears, then attaches a second observer its
    // DIV that suppresses display every time OneDrive tries to open
    // it.
    let observer1 = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes) {
                for (const node of m.addedNodes) {
                    if (node.tagName === "DIV") {
                        for (const className of node.classList) {
                            if (className === "suggest-widget") {
                                // found the suggestions widget; replace observer1 with observer2 that watches the widget
                                observer1.disconnect();
                                const options2 = { childList: false, subtree: false, attributes: true, characterData: false };
                                let observer2 = new MutationObserver((mutations) => {
                                    for (const m of mutations) {
                                        if (m.attributeName === "class") {
                                            // disconnect before changing the style, otherwise we get an infinite loop
                                            observer2.disconnect();
                                            m.target.style.display = "none";
                                            observer2.observe(node, options2);
                                        }
                                    }
                                });
                                observer2.observe(node, options2);
                            }
                        }
                    }
                }
            }
        }
    });
    observer1.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
})();
