// ==UserScript==
// @name         Remove Outlook App Rail
// @namespace    http://www.alittleresearch.com.au/
// @version      2025-11-12
// @description  Remove the app rail from Outlook.
// @author       Nick Sheppard
// @match        https://outlook.office.com/*
// @match        https://outlook.office365.com/*
// @match        https://outlook.live.com/*
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

    // wait for the app rail element to appear
    let leftRailObserver = new MutationObserver((mutations) => {
        mutations_loop:
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                var ancestor = node;
                while (ancestor != null) {
                    if (ancestor.id === "LeftRail") {
                        // set the rail's display style to "none" and stop watching
                        ancestor.style.display = "none";
                        leftRailObserver.disconnect();
                        break mutations_loop;
                    }
                    ancestor = ancestor.parentNode;
                }
            }
        }
    });
    leftRailObserver.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });

})();
