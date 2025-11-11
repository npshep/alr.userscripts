// ==UserScript==
// @name         Outlook App Rail to Footer
// @namespace    http://www.alittleresearch.com.au/
// @version      2025-11-12
// @description  Move Outlook's app rail to the footer, where it was in older versions of Outlook.
// @author       Nick Sheppard
// @match        https://outlook.office.com/*
// @match        https://outlook.office365.com/*
// @match        https://outlook.live.com/*
// @icon         https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant        none
// ==/UserScript==


///////////////////////////////////////////////////////////////////////////////
// Main function.
//
// The document observer looks for changes to the left rail (id LeftRail)
// and the main module (id MainModule).
//
// The left rail is only created once. As soon as we find it, we can set its
// display style to none, with nothing further to do.
//
// The main module is rebuilt several times during construction of the page,
// and again when switching from Mail to Calendar view, and vice versa. Each
// time, we rebuild the app rail.
///////////////////////////////////////////////////////////////////////////////

var leftRail = null;
var mainModule = null;

(function() {
    'use strict';

    var documentObserver = new MutationObserver((mutations) => {
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
            // update the app rail items in the footer
            onMainModuleMutation(mutations, documentObserver);
        }
    });
    documentObserver.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });

})();


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

    // disconnect the observerwhile we make our own modifications
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
        }
    }

    // insert the app rail buttons into the bottom rail
    if (bottomRail != null) {
        const apps = fetchAppRailCollection();
        for (var i = 0; i < apps.length ; i++) {
            bottomRail.appendChild(apps[i]);
        }
    }

    // restart the observer
    if (observer != null) {
        observer.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
    }

}


///////////////////////////////////////////////////////////////////////////////
// Manage the collection of buttons on the app rail.
//
// App buttons appear on the app rail at various times during building of the
// page. The fetchRailButtons() function checks for new buttons that have
// appeared since the last invocation and moves them into the
// appRailCollection array, from where they'll later be inserted into the
// header region.
//
// The app rail is a div with id LeftRail. This div is further divided into two
// div more elements, one with class ___1w2h5wn that contains the applications
// and another with class ___1fkhojs that contains the "More apps" button. Each
// button is contained in a div with class ___77lcry0. We preserve the order of
// the two div's using the appRailSeparator variable.
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
