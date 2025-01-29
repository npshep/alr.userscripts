// ==UserScript==
// @name         Outlook App Rail to Footer
// @namespace    http://www.alittleresearch.com.au/
// @version      2025-01-29
// @description  Move Outlook's app rail to the footer, where it was in older versions of Outlook.
// @author       Nick Sheppard
// @match        https://outlook.office.com/*
// @match        https://outlook.live.com/*
// @icon         https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant        none
// ==/UserScript==

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
// and the main module (id MainModule).
//
// The left rail is only created once. As soon as we find it, we can set its
// display style to none, with nothing further to do.
//
// The main module is rebuilt several times during construction of the page,
// and again when switching from Mail to Calendar view, and vice versa. Each
// time, we attach a new observer to it, which updates the footer for the
// new main module.
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
            // hide the left rail
            leftRail.style.display = "none";
        }
        if (mainModule != null) {
            // observe the main module; the callback function will insert the rail items into the footer
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
// footer.
//
// On the mail screen, the folder tree is contained in a DIV with id
// folderPaneDroppableContainer. We insert the bottom rail at the end
// of this container.
//
// On the calendar screen, the left panel is a DIV with class SFJ5T. A
// child DIV with class AMOVa contains the calendars. We insert the
// bottom rail within SFJ5T after AMOVa.
//
// Input:
//   mutations - the mutations
//   observer - the observer
///////////////////////////////////////////////////////////////////////////////
function onMainModuleMutation(mutations, observer) {

    // disconnect the observer; a new one will attach when Outlook re-creates the main module
    if (observer != null) {
        observer.disconnect();
    }

    // Find the bottom rail, creating it if it doesn't exist.
    var bottomRail = document.getElementById("bottomRail");
    if (bottomRail == null) {
        // create an element for the bottom rail
        bottomRail = document.createElement("DIV");
        bottomRail.id = "bottomRail";
        bottomRail.style.display = "flex";

        // look for a place to put it
        const folderPaneDroppableContainer = document.getElementById("folderPaneDroppableContainer");
        const calendarDiv = document.querySelector(".SFJ5T > .AMOVa");
        if (folderPaneDroppableContainer != null) {
            // mail screen
            folderPaneDroppableContainer.appendChild(bottomRail);
        } else if (calendarDiv != null) {
            // calendar screen
            calendarDiv.parentElement.appendChild(bottomRail);
        } else {
            console.log("Couldn't find a location for the bottom rail.");
            return;
        }
    }

    // disconnect to document observer to prevent infinite recursion
    disconnectDocumentObserver();

    const apps = fetchAppRailCollection();
    for (var i = 0; i < apps.length ; i++) {
        bottomRail.appendChild(apps[i]);
    }

    // reconnect the document observer
    connectDocumentObserver();
}


///////////////////////////////////////////////////////////////////////////////
// Manage the collection of buttons on the app rail.
//
// App buttons appear on the app rail at various times during building of the
// page. The fetchRailButtons() function checks for new buttons that have
// appeared since the last invocation and moves them into the
// appRailCollection array, from where they'll later be inserted into the
// header region.
///////////////////////////////////////////////////////////////////////////////
var appRailCollection = [];
function fetchAppRailCollection() {

    // check for new items that have been added to the app rail
    const leftRailCollection = document.querySelectorAll("#LeftRail .___77lcry0");
    for (var i = 0; i < leftRailCollection.length; i++) {
    	// remove from the left rail
        leftRailCollection.item(i).parentNode.removeChild(leftRailCollection.item(i));

        // insert into the collection, leaving "More apps" last
        if (appRailCollection.length > 0 &&
        	appRailCollection[appRailCollection.length - 1].ariaLabel === "More apps") {
        	appRailCollection.splice(appRailCollection.length, 0, leftRailCollection.item(i));
        } else {
            appRailCollection.push(leftRailCollection.item(i));
        }
    }

    // return the collection for use by the callback
    return appRailCollection;

}
