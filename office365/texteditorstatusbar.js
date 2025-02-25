// ==UserScript==
// @name         OneDrive Text Editor Status Bar
// @namespace    https://www.alittleresearch.com.au
// @version      2025-02-25
// @description  Add a status bar to OneDrive's text editor.
// @author       Nick Sheppard
// @match        https://*.sharepoint.com/my*
// @match        https://*.sharepoint.com/personal/*
// @match        https://m365.cloud.microsoft/onedrive/*
// @match        https://onedrive.live.com/*
// @icon         https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant        none
// ==/UserScript==

// Main function.
//
// In some versions the text editor is contained in .oneUpTextEditor > .monaco-editor;
// in others it's contained in .od-OneUpTextFile-editor > .TextViewer-frame > .monaco-editor.
//
// Either way, the editorObserver object waits for the monaco-editor element to appear, then
// build the status bar and attaches observers for each event that would update the status.
(function() {
    'use strict';

    let editorObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.classList !== undefined && node.classList.contains("monaco-editor")) {

                    // Get a handle to the status bar, creating the bar if it doesn't exist
                    const statusBarClassName = fetchStatusBar();

                    // Watch for changes in the cursor position.
                    //
                    // The cursor is contained in a DIV with class cursors-layer, which sets
                    // the style of the cursor. The cursors-layer DIV contains a further DIV
                    // with class cursor, whose position is set relative to the containing
                    // editor pane.
                    //
                    // Once we've found the cursors layer, the cursorObserver object watches
                    // for changes to the cursor DIV, then updates the status bar accordingly.
                    const cursorsLayer = document.getElementsByClassName("cursors-layer");
                    if (cursorsLayer.length > 0) {
                        var cursorObserver = new MutationObserver((mutations) => { onCursorsLayerMutation(mutations, statusBarClassName, 1) });
                        cursorObserver.observe(cursorsLayer[0], { childList: false, subtree: true, attributes: true, characterData: false });
                    }
                }
            }
        }
    });
    editorObserver.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });

})();


// Get a handle to the status bar, building the status bar if necessary.
//
// The status bar divides the title bar in the original text editor into a series
// of span elements whose class name is returned by the function.
//
// Returns: the class name of the span elements in the bar
function fetchStatusBar() {

    // Get the title bar.
    //
    // In some versions, the title bar is a DIV with class od-OneUpTextFile-title;
    // in others, it is OneUpTextFileTitle_04a30d0d. I don't know what the
    // 04a30d0d means.
    //
    // We choose a class name for the status bar that follows the convention used
    // in whatever version of the text editor that we're working with
    var titleBar = document.getElementsByClassName("od-OneUpTextFile-title");
    var statusBarClassName = "od-OneUpTextFile-status";
    if (titleBar.length == 0) {
        titleBar = document.getElementsByClassName("OneUpTextFileTitle_04a30d0d");
        statusBarClassName = "OneUpTextFileStatus_04a30d0d";
    }

    if (titleBar.length > 0) {
        if (titleBar[0].childElementCount == 0) {
            // filename section
            const filenameSpan = document.createElement("span");
            filenameSpan.className = statusBarClassName;
            filenameSpan.innerHTML = titleBar[0].innerHTML;

            // cursor position section
            const cursorSpan = document.createElement("span");
            cursorSpan.className = statusBarClassName;

            // replace the original title bar with the status bar
            titleBar[0].innerHTML = "";
            titleBar[0].appendChild(filenameSpan);
            titleBar[0].appendChild(cursorSpan);

            // add some styling
            const statusStyle = document.createElement("style");
            statusStyle.type = "text/css";
            statusStyle.innerText = "." + statusBarClassName + " { " +
                "padding: 0px 8px 0px 0px;" +
            "}";
            document.head.appendChild(statusStyle);
        }
    }

    return statusBarClassName;
}


// Respond to a change in the cursors layer.
//
// Because blinking of the cursor is implemented by changing its visibility
// from "inherit" to "hidden" and back, the observer is triggered at every
// blink as well as changes of cursor position, but I haven't found any way
// to suppress the redundant updates.
//
// Input:
//   mutations - the list of mutations
//   statusBarClassName - the class name of the status bar elements
//   statusBarIndex - the index of the cursor position in the status bar
function onCursorsLayerMutation(mutations, statusBarClassName, statusBarIndex) {

    // find the div containing the cursor
    var cursor = document.querySelector(".cursors-layer > .cursor");
    if (cursor != null) {
        // update the status bar
        const statusBar = document.getElementsByClassName(statusBarClassName);
        if (statusBarIndex < statusBar.length) {
            const lineNumber = parseInt(cursor.style.top) / parseInt(cursor.style.lineHeight);
            const columnNumber = getCharactersForHorizontalOffset(
                parseInt(cursor.style.left),
                cursor.style.fontSize,
                cursor.style.fontFamily
            );
            statusBar[statusBarIndex].innerHTML = "Line: " + lineNumber + " Column: " + columnNumber;
        }
    }

}

// Get the cursor position corresponding to a given number of pixels from the left
// edge, based very loosely on the measureText() method from
// https://www.geeksforgeeks.org/calculate-the-width-of-the-text-in-javascript/.
//
// Input:
//   pixels - the number of pixels from the left edge
//   fontSize - the font size
//   fontFamily - the font family
//
// Returns: the number of characters in the given font corresponding the number of pixels
var cursorStops = [ 0 ];
var graphicsContext = null;
function getCharactersForHorizontalOffset(pixels, fontSize, fontFamily) {

    // look for an existing cursor stop matching the input number of pixels
    var i = 0;
    while (i < cursorStops.length && cursorStops[i] < pixels) {
        i++;
    }
    if (i < cursorStops.length) {
        return i;
    }

    // make sure we have a graphics context before building new cursor stops
    if (graphicsContext == null) {
        const canvas = document.createElement("canvas");
        graphicsContext = canvas.getContext("2d");
    }
    graphicsContext.font = fontSize + fontFamily;

    // extend the cursors stops until we have one for the desired number of pixels
    var sampleText = "x".repeat(cursorStops.length);
    var sampleWidth = graphicsContext.measureText(sampleText).width;
    while (sampleWidth < pixels) {
        cursorStops.push[sampleWidth];
        i++;
        sampleText = sampleText + "x";
        sampleWidth = graphicsContext.measureText(sampleText).width;
    }

    return i;
}
