// ==UserScript==
// @name             Move Outlook App Rail
// @namespace        http://www.alittleresearch.com.au/
// @version          2026-01-29
// @description      Move Outlook's app rail to the header or footer.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://outlook.office.com/*
// @match            https://outlook.office365.com/*
// @match            https://outlook.live.com/*
// @icon             https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant            GM_getValue
// @grant            GM_setValue
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2025-6 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// Configuration.
//
// appRailConf sets the default position of the app rail, which can be one of:
//
// 'default' - in the left rail, where it is in "new" Outlook
// 'footer'  - at the bottom of the left-hand panel, where it is in "old" Outlook
// 'header'  - in the header, replacing the header buttons according to the
//             headerButtonsConf configuration below
// 'none'    - no app rail at all; drag the App Launcher into the header or
//             footer to bring it back
//
// Dragging the app rail moves it to one of the other positions above. The
// current position persists through the 'appRailPosition' value stored by
// GM_setValue().
//
// headerButtonsConf sets which buttons remain in the header buttons region
// when the app rail is in the header. The setting button is the only one that
// I use, but feel free to re-enable any other buttons you find useful here.
///////////////////////////////////////////////////////////////////////////////
const appRailConf = 'default';
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


///////////////////////////////////////////////////////////////////////////////
// Main function. This just creates the document observer and connects to the
// parts that we want to monitor.
///////////////////////////////////////////////////////////////////////////////
var documentObserver = null;
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

    documentObserver = new MutationObserver(onDocumentMutation);

}


// Start the document observer
function connectDocumentObserver() {

    if (document.body != null) {
        documentObserver.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
    }

}


// Stop the document observer
function disconnectDocumentObserver() {

    documentObserver.disconnect();

}

// Respond to a page rebuild.
function onDocumentMutation(mutations) {

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
        if (getAppRailPosition() !== 'default') {
            leftRail.style.display = "none";
        }
    }
    if (mainModule != null) {
        // observe the main module; onMainModuleMutation will insert the rail items into the target region
        var mainModuleObserver = new MutationObserver(onMainModuleMutation);
        mainModuleObserver.observe(mainModule, { childList: true, subtree: true, attributes: false, characterData: false });
    }

}


///////////////////////////////////////////////////////////////////////////////
// Respond to mutation of the main module, inserting the app rail into the
// the desired region.
//
// Input:
//   mutations - the mutations
//   observer - the observer
///////////////////////////////////////////////////////////////////////////////
function onMainModuleMutation(mutations, observer) {

    // disconnect the main module observer; a new one will attach when Outlook updates the main module
    if (observer != null) {
        observer.disconnect();
    }

    // disconnect the document observer to prevent infinite recursion
    disconnectDocumentObserver();

    // hide the header buttons and rails we don't want
    if (getAppRailPosition() === 'header') {
        removeHeaderButtons();
    } else {
        restoreHeaderButtons();
    }
	const leftRail = document.getElementById("LeftRail");
    if (leftRail != null && getAppRailPosition() !== 'default') {
        leftRail.style.display = "none";
    }
	const bottomRail = document.getElementById("bottomRail");
	if (bottomRail != null && getAppRailPosition() !== 'footer') {
        bottomRail.style.display = "none";
    }

    // insert the app rail buttons into the target region and make it visible
    const targetRegion = getAppRailRegion();
    if (targetRegion != null) {
        insertAppRail(targetRegion);
        targetRegion.style.display = "flex";
    }

    // set up drag-and-drop targets
    if (leftRail != null) {
        makeDragDropRail(leftRail, getAppRailPosition() === 'default');
    }
    const headerButtonsRegion = findHeaderButtonsRegion();
    if (headerButtonsRegion != null) {
		makeDragDropRail(headerButtonsRegion, getAppRailPosition() === 'header');
    }
    const bottomRailExisting = fetchBottomRail(false);
	if (bottomRailExisting != null) {
        makeDragDropRail(bottomRailExisting, getAppRailPosition() === 'footer');
    }
	const leftPanel = findLeftPanel();
	if (leftPanel != null) {
        makeDragDropRail(leftPanel, false);
    }
    const appLauncher = findAppLauncher();
    if (appLauncher != null) {
        // when the app rail is invisible, dragging the app launcher brings it back
        makeDragDropRail(appLauncher, getAppRailPosition() === 'none');
    }

    // reconnect the document observer
    connectDocumentObserver();

}


// Find the bottom rail, optionally creating it if it doesn't exist.
//
// The rail is placed at the bottom of the left panel, as determined by
// findLeftPanel().
//
// Input:
//   create (boolean) - if true, create the rail if it doesn't exist
//
// Returns: the root element of the bottom rail, or null if it doesn't exist and wasn't created
function fetchBottomRail(create) {

    var bottomRail = document.getElementById("bottomRail");
    if (create && bottomRail == null) {
        // create an element for the bottom rail
        bottomRail = document.createElement("DIV");
        bottomRail.id = "bottomRail";
        bottomRail.style.display = "flex";

        // look for a place to put it
        const leftPanel = findLeftPanel();
        if (leftPanel != null) {
            leftPanel.appendChild(bottomRail);
        } else {
            console.warn("Couldn't find a location for the bottom rail.");
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


// Get the app rail position ('default', 'header', 'footer', or 'none')
function getAppRailPosition() {

    return GM_getValue('appRailPosition', appRailConf);

}

// Get the region (DIV element) into which the app rail will be inserted.
function getAppRailRegion() {

    switch (getAppRailPosition()) {
       case 'header':
           return findHeaderButtonsRegion();

       case 'footer':
           return fetchBottomRail(true);

       case 'none':
           return null;

        default:
            return document.getElementById("LeftRail");
    }

}


// Set the app rail position
function setAppRailPosition(position) {

    switch (position) {
        case 'default':
        case 'header':
        case 'footer':
        case 'none':
            GM_setValue('appRailPosition', position);
            break;

        default:
            console.warn("Ignoring invalid setting for appRailPosition: " + position);
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
            if (getAppRailPosition() === 'default') {
                // dropping the default app rail into the app launcher means "remove the app rail"
                setAppRailPosition('none');
            } else {
                setAppRailPosition('default');
            }
        } else if (leftPanel != null && leftPanel.contains(e.target)) {
            setAppRailPosition('footer');
        } else if (headerButtonsRegion != null && headerButtonsRegion.contains(e.target)) {
            setAppRailPosition('header');
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
// appRailCollection array. The insertAppRail() function then inserts them into
// a target region.
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


// Insert the app rail into an existing region.
function insertAppRail(target) {

    // get the apps from the default left rail
    const apps = fetchAppRailCollection();

    // ensure the two sections with the mysterious class names exist
    let appRail1 = target.querySelector(".___1w2h5wn");
    let appRail2 = target.querySelector(".___1fkhojs");
    if (appRail1 == null) {
        appRail1 = document.createElement("div");
        appRail1.className = "___1w2h5wn";
        appRail1.style.display = "flex";
        if (appRail2 == null) {
            // append at the end of the target area
            target.appendChild(appRail1);
        } else {
            // append before the part of the rail that already exists (this probably shouldn't happen)
            appRail2.insertAdjacentElement("beforebegin", appRail1);
        }
    }
    if (appRail2 == null) {
        appRail2 = document.createElement("div");
        appRail2.className = "___1fkhojs";
        appRail2.style.display = "flex";
        appRail1.insertAdjacentElement("afterend", appRail2);
    }

    // insert apps
    for (var i = apps.length - 1; i >= 0 ; i--) {
        if (i < appRailSeparator) {
            appRail1.insertAdjacentElement("afterbegin", apps[i]);
        } else {
            appRail2.insertAdjacentElement("afterbegin", apps[i]);
        }
    }

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
