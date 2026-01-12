// ==UserScript==
// @name             Move Outlook App Rail
// @namespace        http://www.alittleresearch.com.au/
// @version          2026-01-12
// @description      Move Outlook's app rail to the header or footer.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://outlook.office.com/*
// @match            https://outlook.office365.com/*
// @match            https://outlook.live.com/*
// @icon             https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant            none
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2025-6 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

// set the position of the app rail - 'default', 'header', 'footer' or 'none'
var appRailPosition = 'header';


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
// and the main application panel (id MainModule).
//
// The left rail is only created once. Once we've found it, we make it
// invisible, unless it's in its default position.
//
// The main module is rebuilt several times during construction of the page,
// and again when switching from Mail to Calendar view, and vice versa. Each
// time, we attach a new observer to it, which updates the buttons in the
// rail.
///////////////////////////////////////////////////////////////////////////////

// Create the document observer
function createDocumentObserver() {

    documentObserver = new MutationObserver((mutations) => {
        var leftRail = null;
        var mainModule = null;
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                var ancestor = node;
                while (ancestor != null) {
                    if (ancestor.id === "LeftRail") {
                        // found the left rail
                        leftRail = ancestor;
                        break;
                    } else if (ancestor.id === "MainModule") {
                        // found the main module
                        mainModule = ancestor;
                        break;
                    }
                    ancestor = ancestor.parentNode;
                }
            }
        }
		if (leftRail != null) {
            leftRail.draggable = true;
			if (appRailPosition !== 'default') {
                leftRail.style.display = "none";
            }
        }
        if (mainModule != null) {
            // observe the main module; the callback function will insert the rail items into the target region
            var mainModuleObserver = new MutationObserver(onMainModuleMutation);
            mainModuleObserver.observe(mainModule, { childList: true, subtree: true, attributes: false, characterData: false });
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
// Respond to mutation of the main module, inserting the app rail into the
// header.
//
// Input:
//   mutations - the mutations
//   observer - the observer
///////////////////////////////////////////////////////////////////////////////
function onMainModuleMutation(mutations, observer) {

    // disconnect the observer; a new one will attach when Outlook updates the main module
    if (observer != null) {
        observer.disconnect();
    }

    // disconnect the document observer to prevent infinite recursion
    disconnectDocumentObserver();

    // hide the rails we don't want
    if (appRailPosition === 'header') {
        removeHeaderButtons();
    } else {
        restoreHeaderButtons();
    }
	const leftRail = document.getElementById("leftRail");
    if (leftRail != null && appRailPosition !== 'default') {
        leftRail.style.display = "none";
    }
	const bottomRail = document.getElementById("bottomRail");
	if (bottomRail != null && appRailPosition !== 'footer') {
        bottomRail.style.display = "none";
    }

    // insert the app rail buttons into the target region and make it visible
    const targetRegion = getAppRailRegion();
    if (targetRegion != null) {
        const apps = fetchAppRailCollection();
        for (var i = apps.length - 1; i >= 0 ; i--) {
            targetRegion.insertAdjacentElement("afterbegin", apps[i]);
        }
        targetRegion.style.display = "";
    }

    // set up drag-and-drop targets
    const headerButtonsRegion = findHeaderButtonsRegion();
    if (headerButtonsRegion != null) {
		makeDragDropRail(headerButtonsRegion, appRailPosition === 'header');
    }
	if (bottomRail != null) {
        makeDragDropRail(bottomRail, appRailPosition === 'footer');
    }
	const leftPanel = findLeftPanel();
	if (leftPanel != null) {
        makeDragDropRail(leftPanel, false);
    }
    const appLauncher = findAppLauncher();
    if (appLauncher != null) {
        // when the app rail is invisible, dragging the app launcher brings it back
        makeDragDropRail(appLauncher, appRailPosition === 'none');
    }

    // reconnect the document observer
    connectDocumentObserver();

}


// Find the bottom rail, creating it if it doesn't exist.
//
// The rail is placed at the bottom of the left panel, as determined by
// findLeftPanel().
function fetchBottomRail() {

    var bottomRail = document.getElementById("bottomRail");
    if (bottomRail == null) {
        // create an element for the bottom rail
        bottomRail = document.createElement("DIV");
        bottomRail.id = "bottomRail";
        bottomRail.style.display = "flex";

        // look for a place to put it
        const leftPanel = findLeftPanel();
        if (leftPanel != null) {
            leftPanel.appendChild(bottomRail);
        } else {
            console.log("Couldn't find a location for the bottom rail.");
        }
    }

    return bottomRail;

}


// Find the app launcher.
//
// The app laucher is a div with id O365_MainLink_NavMenu.
function findAppLauncher() {

    return document.getElementById("O365_MainLink_NavMenu");

}


// Find the header buttons region.
//
// The header buttons are contained within a div with id headerButtonsRegionId.
function findHeaderButtonsRegion() {

    return document.getElementById("headerButtonsRegionId")

}


// Find the left panel (where the bottom rail will be placed).
//
// On the mail screen, the folder tree is contained in a DIV with id
// folderPaneDroppableContainer. The bottom rail is inserted at the end
// of this container.
//
// On the calendar screen, the left panel is a DIV with class SFJ5T. A
// child DIV with class AMOVa contains the calendars. The bottom rail is
// is inserted within SFJ5T after AMOVa.
function findLeftPanel() {

    const folderPaneDroppableContainer = document.getElementById("folderPaneDroppableContainer");
    const calendarDiv = document.querySelector(".SFJ5T > .AMOVa");
    if (folderPaneDroppableContainer != null) {
        // mail screen
        return folderPaneDroppableContainer;
    } else if (calendarDiv != null) {
        // calendar screen
        return calendarDiv.parentElement;
    }

    return null;
}

// Get the region (DIV element) into which the app rail will be inserted.
function getAppRailRegion() {

    switch (appRailPosition) {
       case 'header':
           return findHeaderButtonsRegion();

       case 'footer':
           return fetchBottomRail();

       case 'none':
           return null;

        default:
            return document.getElementById("LeftRail");
    }

}


///////////////////////////////////////////////////////////////////////////////
// Handlers for dragging-and-dropping of the app rail.
//
// draggingAppRail tracks whether the app rail is currently being dragged.
///////////////////////////////////////////////////////////////////////////////
var draggingAppRail = false;


// Add drag-and-drop event handlers to an element.
function makeDragDropRail(e, draggable) {

    // TODO: check that this doesn't result in multiple event handlers being added
    e.draggable = draggable;
    e.addEventListener('dragover', onDragOverAllowDropRail);
	e.addEventListener('drop', onDropRail);
    if (draggable) {
        e.addEventListener('dragstart', onDragRailStart);
    }
}


// Allow dropping into an element.
function onDragOverAllowDropRail(e) {

    if (draggingAppRail) {
        e.preventDefault();
    }

}


// Handle the beginning of a rail drag event.
function onDragRailStart(e) {

    draggingAppRail = true;

}


// Handle dropping into one of the target regions.
function onDropRail(e) {

    if (draggingAppRail) {
        e.preventDefault();

        // find which region the rail has been dropped into (TODO: accept dropping into the mail list)
        const appLauncher = findAppLauncher();
        const leftPanel = findLeftPanel();
        const headerButtonsRegion = findHeaderButtonsRegion();
        if (appLauncher != null && appLauncher.contains(e.target)) {
            if (appRailPosition === 'default') {
                // dropping the default app rail into the app launcher means "remove the app rail"
                appRailPosition = 'none';
            } else {
                appRailPosition = 'default';
            }
        } else if (leftPanel != null && leftPanel.contains(e.target)) {
            appRailPosition = 'footer';
        } else if (headerButtonsRegion != null && headerButtonsRegion.contains(e.target)) {
            appRailPosition = 'header';
        }

        // invoke onMainModuleMutation to re-draw the app rail and reset the observer
        onMainModuleMutation(null, null);
    }
	draggingAppRail = false;

}


///////////////////////////////////////////////////////////////////////////////
// Manage the collection of buttons on the app rail.
//
// App buttons appear on the app rail at various times during building of the
// page. The fetchRailButtons() function checks for new buttons that have
// appeared since the last invocation and moves them into the
// appRailCollection array, from where they'll later be inserted into the
// target region.
//
// The original app rail is a div with id LeftRail. This div is further divided
// into two div more elements, one with class ___1w2h5wn that contains the
// applications and another with class ___1fkhojs that contains the "More apps"
// button. Each button is contained in a div with class ___77lcry0. We preserve
// the order of the two div's using the appRailSeparator variable.
//
///////////////////////////////////////////////////////////////////////////////
var appRailCollection = [];
var appRailSeparator = 0;
function fetchAppRailCollection() {

    // check for new items added to the top div of the left rail
    const leftRailCollection1 = document.querySelectorAll("#LeftRail .___1w2h5wn .___77lcry0");
    for (let i = 0; i < leftRailCollection1.length; i++) {
        // remove from the left rail
        leftRailCollection1.item(i).parentNode.removeChild(leftRailCollection1.item(i));

        // insert into the collection before the separator
        if (appRailCollection.length > 0) {
            appRailCollection.splice(appRailSeparator, 0, leftRailCollection1.item(i));
        } else {
            appRailCollection.push(leftRailCollection1.item(i));
        }
        appRailSeparator++;
    }

    // check for new items added to the bottom div of the left rail
    const leftRailCollection2 = document.querySelectorAll("#LeftRail .___1fkhojs .___77lcry0");
    for (let i = 0; i < leftRailCollection2.length; i++) {
        // remove from the left rail
        leftRailCollection2.item(i).parentNode.removeChild(leftRailCollection2.item(i));

        // insert into the collection at the end
        appRailCollection.push(leftRailCollection2.item(i));
    }

    // return the collection for use by the callback
    return appRailCollection;

}

///////////////////////////////////////////////////////////////////////////////
// Manage the collection of header buttons.
//
// The header buttons are contained within a div with id headerButtonsRegionId.
// Each button is identified by a class name, which is used as a key in the
// headerButtonsConf structure.
//
// When the app rail is placed into the header, removeHeaderButtons() moves the
// unwanted header buttons into headerButtonCollection. When the app rail is
// moved to another position, restoreHeaderButtons() moves them back into the
// header.
///////////////////////////////////////////////////////////////////////////////
var headerButtonsCollection = []

function removeHeaderButtons() {

    const headerButtonsRegion = document.getElementById("headerButtonsRegionId");
    if (headerButtonsRegion != null) {
        var child = headerButtonsRegion.firstElementChild;
        while (child != null) {
            const next = child.nextElementSibling;
            if (child.id in headerButtonsConf && !headerButtonsConf[child.id]) {
                // move unwanted button into headerButtonsCollection
                headerButtonsCollection.push(child);
                headerButtonsRegion.removeChild(child);
            }
            if (child.classList.contains("___77lcry0")) {
				// remove app rail button (it will be regenerated by onMainModuleMutation)
                headerButtonsRegion.removeChild(child);
            }
            child = next;
        }
    }

}


function restoreHeaderButtons() {

    const headerButtonsRegion = document.getElementById("headerButtonsRegionId");
    if (headerButtonsRegion != null) {
        while (headerButtonsCollection.length > 0) {
            headerButtonsRegion.appendChild(headerButtonsCollection.shift());
        }
    }
}
