// ==UserScript==
// @name             OneDrive Text Editor Status Bar
// @namespace        https://www.alittleresearch.com.au
// @version          2025-06-04
// @description      Add a status bar to OneDrive's text editor.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://*.sharepoint.com/my*
// @match            https://*.sharepoint.com/personal/*
// @match            https://m365.cloud.microsoft/onedrive/*
// @match            https://onedrive.live.com/*
// @icon             https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant            none
// ==/UserScript==


// true to display the text suggestions widget, false to suppress it
let showSuggestWidget = false;


// Main function.
//
// In some versions the text editor is contained in .oneUpTextEditor > .monaco-editor;
// in others it's contained in .od-OneUpTextFile-editor > .TextViewer-frame > .monaco-editor.
//
// Either way, the editorObserver object waits for the monaco-editor element to appear, then
// builds the status bar and attaches observers for each event that would update the status.
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

                // The suggestions box is a DIV with class "suggest-widget" created
                // the first time the text editor makes a suggestion. Thereafter,
                // its visibility is toggled by adding and removing the "visible"
                // class.
                if (node.tagName === "DIV" && node.classList !== undefined && node.classList.contains("suggest-widget")) {
                    let suggestWidgetObserver = new MutationObserver(onSuggestWidgetMutation);
                    suggestWidgetObserver.observe(node, { childList: false, subtree: false, attributes: true, characterData: false });
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
    // in others, it is like OneUpTextFileTitle_xxxxxxxx, where xxxxxxxx is a
    // hexadecimal number that changes from time to time.
    //
    // We choose a class name for the status bar that follows the convention used
    // in whatever version of the text editor that we're working with
    let titleBar = null;
    let titleBarList = document.getElementsByClassName("od-OneUpTextFile-title");
    let statusBarClassName = "od-OneUpTextFile-status";
    if (titleBarList.length == 0) {
        // search upwards from oneUpTextEditor to find the OneUpTextFileContent_xxxxxxxx container
        let textEditor = document.getElementsByClassName("oneUpTextEditor");
        let textFileContent = (textEditor.length > 0) ? textEditor[0] : null;
        while (textFileContent != null && (textFileContent.className == null ||
            !textFileContent.className.startsWith("OneUpTextFileContent"))) {
            textFileContent = textFileContent.parentElement;
        }

        // now search for the OneUpTextFileTitle_xxxxxxxx child
        let textFileTitle = (textFileContent != null)? textFileContent.firstElementChild : null;
        while (textFileTitle != null && (textFileTitle.className == null ||
            !textFileTitle.className.startsWith("OneUpTextFileTitle"))) {
            textFileTitle = textFileTitle.nextElementSibling;
        }

        // finally, set the status bar class name
        statusBarClassName = "OneUpTextFileStatus";
        if (textFileTitle != null) {
            titleBar = textFileTitle;
            statusBarClassName = statusBarClassName +
                textFileTitle.classList.item(0).slice(18, textFileTitle.classList.item(0).length);
        }
    } else {
        titleBar = titleBarList.item(0);
    }

    if (titleBar != null) {
        if (titleBar.childElementCount == 0) {
            // filename section
            const filenameSpan = document.createElement("span");
            filenameSpan.className = statusBarClassName;
            filenameSpan.innerHTML = titleBar.innerHTML;

            // cursor position section
            const cursorSpan = document.createElement("span");
            cursorSpan.className = statusBarClassName;

            // text suggestions section
            const suggestionsSpan = document.createElement("span");
            suggestionsSpan.className = statusBarClassName;
            const suggestionsButton = document.createElement("button");
            suggestionsSpan.appendChild(suggestionsButton);
            suggestionsButton.className = "ms-Button ms-Button--commandBar ms-CommandBarItem-link";
            suggestionsButton.onclick = function() { onStatusBarSuggestClick(statusBarClassName, 2) };
            suggestionsButton.innerHTML = "<span class=\"ms-Button-label\">" +
                "Text Suggestions: " + (showSuggestWidget ? "On" : "Off") + "</span>";

            // replace the original title bar with the status bar
            titleBar.innerHTML = "";
            titleBar.appendChild(filenameSpan);
            titleBar.appendChild(cursorSpan);
            titleBar.appendChild(suggestionsSpan);

            // add some styling
            const statusStyle = document.createElement("style");
            statusStyle.type = "text/css";
            statusStyle.innerText ="." + statusBarClassName + ":not(:first-child) { " +
                "float: right;" +
                "padding: 0px 8px 0px 8px;" +
            "}";
            document.head.appendChild(statusStyle);
        }
    }

    return statusBarClassName;
}


// Respond to a click on text suggestions control in the status bar.
//
// Input:
//   statusBarClassName - the class name of the status bar elements
//   statusBarIndex - the index of the cursor position in the status bar
function onStatusBarSuggestClick(statusBarClassName, statusBarIndex) {

    showSuggestWidget = !showSuggestWidget;
    const statusBar = document.getElementsByClassName(statusBarClassName);
    if (statusBarIndex < statusBar.length) {
        statusBar[statusBarIndex].firstChild.firstChild.innerText = "Text Suggestions: " + (showSuggestWidget ? "On" : "Off");
    }

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
    let cursor = document.querySelector(".cursors-layer > .cursor");
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


// Respond to the appearance of the text suggestions widget.
//
// Input:
//   mutations - the list of mutations
//   observer - the observer that triggered this event
function onSuggestWidgetMutation(mutations, observer) {

    for (const m of mutations) {
        if (m.attributeName === "class") {
            // disconnect before changing the style, otherwise we get an infinite loop
            observer.disconnect();
            m.target.style.display = showSuggestWidget ? "" : "none";
            observer.observe(m.target, { childList: false, subtree: false, attributes: true, characterData: false });
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
    let i = 0;
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

    // extend the cursor stops until we have one for the desired number of pixels
    let sampleText = "x".repeat(cursorStops.length);
    let sampleWidth = graphicsContext.measureText(sampleText).width;
    while (sampleWidth < pixels) {
        cursorStops.push[sampleWidth];
        i++;
        sampleText = sampleText + "x";
        sampleWidth = graphicsContext.measureText(sampleText).width;
    }

    return i;
}
