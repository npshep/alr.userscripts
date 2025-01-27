// ==UserScript==
// @name         Outlook App Rail to Header
// @namespace    http://www.alittleresearch.com.au/
// @version      2025-01-23
// @description  Move Outlook's app rail to the header.
// @author       Nick Sheppard
// @match        https://outlook.office.com/mail/*
// @match        https://outlook.office.com/calendar/*
// @match        https://outlook.live.com/mail/*
// @match        https://outlook.live.com/calendar/*
// @icon         https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant        none
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2025 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////


// set which buttons should remain in the header buttons region
const headerButtonsConf = {
    'owaMeetNowButton_container': false,
    'teams_container': false,
    'owaPremiumBtn_container': false,
    'owaNoteFeedButton_container': false,
    'owaTimePanelBtn_container': false,
    'owaActivityFeedButton_container': false,
    'owaSettingsBtn_container': true,
    'owaTipsBtn_container': false,
    'owaChatButton_container': false,
    'owaChatCopilotButton_container': false,
    'OwaMergedNotificationPane_container': false
};

var documentObserver = null;

// main function
(function() {
    'use strict';

    // create the document observer and start observing
    createDocumentObserver();
    connectDocumentObserver();

})();


///////////////////////////////////////////////////////////////////////////////
// Document observer functions.
//
// The document observer looks for changes to the left rail (id LeftRail)
// and the header region (id o365header).
//
// The left rail is only created once. As soon as we find it, we can set its
// display style to none, with nothing further to do.
//
// The header region is rebuilt many times during construction of the page, so
// we attach a new observer to it, which updates the contents of the header
// buttons region (id headerButtonsRegionId) after each rebuild.
///////////////////////////////////////////////////////////////////////////////

// Create the document observer
function createDocumentObserver() {

    documentObserver = new MutationObserver((mutations) => {
        var leftRail = null;
        var o365header = null;
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                var ancestor = node;
                while (ancestor != null) {
                    if (ancestor.id === "LeftRail") {
                        // found the left rail
                        leftRail = ancestor;
                        break;
                    } else if (ancestor.id === "o365header") {
                        // found the header region
                        o365header = ancestor;
                        break;
                    }
                    ancestor = ancestor.parentNode;
                }
            }
        }
        if (leftRail != null) {
            // hide the left rail
            leftRail.style.display = "none";
        }
        if (o365header != null) {
            // observe the header region; the callback function will insert the rail items into the buttons region
            var o365HeaderObserver = new MutationObserver(onO365HeaderMutation);
            o365HeaderObserver.observe(o365header, { childList: true, subtree: true, attributes: false, characterData: false });
        }
    });

}


// Start the document observer
function connectDocumentObserver() {

    documentObserver.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });

}


// Stop the document observer
function disconnectDocumentObserver() {

    documentObserver.disconnect();

}


///////////////////////////////////////////////////////////////////////////////
// Respond to mutation of the header region.
//
// The header region is re-created many times over during building of the page,
// and I haven't found any way of detecting the "final" creation. Therefore, this
// function simply overwrites Outlook's header buttons region with the contents
// of app rail every time Outlook comes up with a new header.
//
// Individual items from the app rail are identified by the class name
// ___77lcry0, which is one out of many classes that they have.
//
// Input:
//   mutations - the mutations
//   observer - the observer
///////////////////////////////////////////////////////////////////////////////
var railButtons = [];
function onO365HeaderMutation(mutations, observer) {

    // disconnect the observer; a new one will attach when Outlook re-creates the header region
    if (observer != null) {
        observer.disconnect();
    }

    // remove unwanted children
    const headerButtonsRegion = document.getElementById("headerButtonsRegionId");
    var child = headerButtonsRegion.firstElementChild;
    while (child != null) {
        const next = child.nextElementSibling;
        if (child.id in headerButtonsConf && !headerButtonsConf[child.id]) {
            headerButtonsRegion.removeChild(child);
        }
        if (child.classList.contains("___77lcry0")) {
           headerButtonsRegion.removeChild(child);
        }
        child = next;
    }

    // disconnect to document observer to prevent infinite recursion
    disconnectDocumentObserver();

    // insert items from the app rail
    const leftRailCollection = document.querySelectorAll("#LeftRail .___77lcry0");
    for (var k = 0; k < leftRailCollection.length; k++) {
        leftRailCollection.item(k).parentNode.removeChild(leftRailCollection.item(k));
        railButtons.push(leftRailCollection.item(k));
    }
    for (var i = railButtons.length - 1; i >= 0 ; i--) {
        // this inserts the buttons, but some other process removes them later
        headerButtonsRegion.insertAdjacentElement("afterbegin", railButtons[i]);

        // this makes the buttons appear but they don't work
        // headerButtonsRegion.insertAdjacentHTML("afterbegin", railButtons[i].outerHTML);

        // this also makes the buttons appear but they don't work
        // headerButtonsRegion.insertAdjacentElement("afterbegin", railButtons[i].cloneNode(true));
    }

    // reconnect the document observer
    connectDocumentObserver();

}
