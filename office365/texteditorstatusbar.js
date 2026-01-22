// ==UserScript==
// @name             OneDrive Text Editor Status Bar
// @namespace        https://www.alittleresearch.com.au
// @version          2026-01-22
// @description      Add a status bar to OneDrive's text editor.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://*.sharepoint.com/my*
// @match            https://*.sharepoint.com/personal/*
// @match            https://m365.cloud.microsoft/onedrive/*
// @match            https://onedrive.live.com/*
// @icon             https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant            GM_getValue
// @grant            GM_setValue
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2026 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

// Configuration.
//
// showSuggestWidget - true to display the text suggestions widget, false to suppress it
let showSuggestWidget = GM_getValue("showSuggestWidget", true);


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

                    // make sure the status bar exists
                    const statusBar = fetchStatusBar();

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
                        var cursorObserver = new MutationObserver((mutations) => { onCursorsLayerMutation(mutations, 1) });
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
    if (document.body) {
        editorObserver.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
    }

})();


// Get the title bar.
//
// In some versions, the title bar is a DIV with class od-OneUpTextFile-title;
// in others, it is like OneUpTextFileTitle_xxxxxxxx, where xxxxxxxx is a
// hexadecimal number that changes from time to time.
function getTitleBar() {

    let titleBar = document.querySelector(".od-OneUpTextFile-title");
    if (titleBar == null) {
        // search upwards from oneUpTextEditor to find the OneUpTextFileContent_xxxxxxxx container
        let textFileContent = document.querySelector(".oneUpTextEditor");
        while (textFileContent != null && (textFileContent.className == null ||
            !textFileContent.className.startsWith("OneUpTextFileContent"))) {
            textFileContent = textFileContent.parentElement;
        }

        // now search for the OneUpTextFileTitle_xxxxxxxx child
        titleBar = (textFileContent != null)? textFileContent.firstElementChild : null;
        while (titleBar != null && (titleBar.className == null ||
            !titleBar.className.startsWith("OneUpTextFileTitle"))) {
            titleBar = titleBar.nextElementSibling;
        }
    }

    return titleBar;

}


// Get a class name for the status bar. We choose class name for the status
// bar that follows the convention used in whatever version of the text editor
// that we're working with.
let statusBarClassName = null;
function getStatusBarClassName() {

    if (statusBarClassName == null) {
        // default to the naming style of a title bar with class od-OneUpTextFile-title
        statusBarClassName = "od-OneUpTextFile-status";

        // check for a title bar with class OneUpTextFileTitle_xxxxxxxx
        let titleBar = getTitleBar();
        if (titleBar != null) {
            for (let className of titleBar.classList) {
                if (className.startsWith("OneUpTextFileTitle")) {
                    statusBarClassName = "OneUpTextFileStatus" + className.slice(18, className.length);
                    break;
                }
            }
        }
    }

    return statusBarClassName;
}

// Get a handle to the status bar, building the status bar if necessary.
//
// The status bar divides the title bar in the original text editor into a series
// of span elements whose class name is returned by the function.
//
// Returns: an array containg the span elements in the status bar
function fetchStatusBar() {

    // check for an existing status bar
    const statusBarClassName = getStatusBarClassName();
    let statusBar = [];
    for (let elem of document.getElementsByClassName(statusBarClassName)) {
        statusBar.push(elem);
    }

    // if the status bar doesn't exist, create it
    if (statusBar.length == 0) {
        let titleBar = getTitleBar();
        if (titleBar != null) {

            // filename section
            const filenameSpan = document.createElement("span");
            filenameSpan.className = statusBarClassName;
            filenameSpan.innerHTML = titleBar.innerHTML;
            statusBar.push(filenameSpan);

            // cursor position section
            const cursorSpan = document.createElement("span");
            cursorSpan.className = statusBarClassName;
            statusBar.push(cursorSpan);

            // text suggestions section
            const suggestionsSpan = document.createElement("span");
            suggestionsSpan.className = statusBarClassName;
            const suggestionsButton = document.createElement("button");
            suggestionsSpan.appendChild(suggestionsButton);
            suggestionsButton.className = "ms-Button ms-Button--commandBar ms-CommandBarItem-link";
            suggestionsButton.onclick = function() { onStatusBarSuggestClick(2) };
            suggestionsButton.innerHTML = "<span class=\"ms-Button-label\">" +
                getSuggestionsButtonLabel(showSuggestWidget) + "</span>";
            statusBar.push(suggestionsSpan);

            // replace the original title bar with the status bar
            titleBar.innerHTML = "";
            for (let span of statusBar) {
                titleBar.appendChild(span);
            }

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

    return statusBar;
}


// Get the column number corresponding to a given number of pixels from the left
// edge, based very loosely on the measureText() method from
// https://www.geeksforgeeks.org/calculate-the-width-of-the-text-in-javascript/.
//
// Input:
//   offset - the number of pixels from the left edge
//   fontSize - the font size
//   fontFamily - the font family
//
// Returns: the number of characters in the given font corresponding to the given number of pixels
let cursorStops = [ 0 ];
let graphicsContext = null;
function getColumnNumberForHorizontalOffset(offset) {

    // look for an existing cursor stop matching the input offset
    let i = 0;
    while (i < cursorStops.length && cursorStops[i] < offset) {
        i++;
    }
    if (i < cursorStops.length) {
        // cursorStops is zero-based but column numbers are 1-based
        return i + 1;
    }

    // make sure we have a graphics context before building new cursor stops
    if (graphicsContext == null) {
        const canvas = document.createElement("canvas");
        graphicsContext = canvas.getContext("2d");
    }

    // The font family and size are set by the .view-lines element, which
    // contains all the displayed text.
    //
    // The font family is specified by a list of three fonts, with the first
    // being a specific font (Consolas or Droid Sans Mono) and the other two
    // being "monospace" with and without quotes. It seems to be impossible to
    // know for sure which one the browser chooses, but I've found that using
    // "monospace" calculates the correct width in all the browers I use.
    const viewLines = document.querySelector(".view-lines");
    graphicsContext.font = viewLines.style.fontSize + " monospace";

    // extend the cursor stops until we have one for the desired number of pixels
    let sampleText = "x".repeat(cursorStops.length);
    let sampleWidth = graphicsContext.measureText(sampleText).width;
    while (sampleWidth < offset) {
        cursorStops.push(sampleWidth);
        i++;
        sampleText = sampleText + "x";
        sampleWidth = graphicsContext.measureText(sampleText).width;
    }

    return i + 1;
}


// Get the label for the cursor position element.
//
// Input:
//   line - the line number of the cursor
//   column - the column number of the cursor
function getCursorPositionLabel(line, column) {

    return "Line: " + line + " Column: " + column;

}


// Get the line number corresponding to a given vertical position with the
// document.
//
// Input:
//   offset - the offset (number of pixels) from the top of the document
//
// Returns: the corresponding line number of the document, or NaN if the line has scrolled off the display
function getLineNumberForVerticalOffset(offset) {

    // The line numbers are contained within a div with class margin-view-overlays,
    // with each child of this div corresponding to one line of the display.
    //
    // The children aren't in any particular order, but they have a 'top'
    // property that describes their absolute location in the document. We use
    // this property to find the margin view line matching the given offset.
    //
    // Where a long line wraps at the right-hand margin, the line number
    // appears (only) on the first margin view line, so we need to find the
    // margin view line that contains a number that is nearest to, but above,
    // the offset.
    //
    // Finally, if the given offset isn't within the range implied by the tops
    // of the margin view lines, it refers to a position that has scrolled off
    // the display. In this case, we return NaN.
    let marginViewLines = document.querySelectorAll(".margin > .margin-view-overlays > div");
    let offsetViewLinePos = NaN;
    let offsetViewLineTop = NaN;
    let minMarginViewTop = NaN;
    let maxMarginViewTop = NaN;
    for (let i = 0; i < marginViewLines.length; i++) {

        // extract values of interest from the margin view line
        let marginViewLineNumber = parseInt(marginViewLines.item(i).textContent);
        let marginViewLineTop = parseInt(marginViewLines.item(i).style.top);

        // update minimum and maximum 'top' values found so far
        if (isNaN(minMarginViewTop) || marginViewLineTop < minMarginViewTop) {
            minMarginViewTop = marginViewLineTop;
        }
        if (isNaN(maxMarginViewTop) || marginViewLineTop > maxMarginViewTop) {
            maxMarginViewTop = marginViewLineTop;
        }

        // check for a line number in the margin
        if (!isNaN(marginViewLineNumber)) {
            // check if this line is closer than the nearest found so far
            if (isNaN(offsetViewLinePos) || marginViewLineTop > offsetViewLineTop) {
                if (marginViewLineTop <= offset) {
                    offsetViewLinePos = i;
                    offsetViewLineTop = marginViewLineTop;
                }
            }
        }
    }

    if (isNaN(offsetViewLineTop) || offset < minMarginViewTop || offset > maxMarginViewTop) {
        // the offset is outside the display area
        return NaN;
    }

    return parseInt(marginViewLines.item(offsetViewLinePos).textContent);
}


// Get the the label for the text suggestions button.
//
// Input:
//   showWidget - true when the widget is shown, false otherwise
//
// Returns: the label corresponding to the current state of the text suggestions widget
function getSuggestionsButtonLabel(showWidget) {

    return "Suggestions: " + (showWidget ? "On" : "Off");

}


// Respond to a change in the cursors layer.
//
// Because blinking of the cursor is implemented by changing its visibility
// from "inherit" to "hidden" and back, the observer is triggered at every
// blink as well as changes of cursor position. To reduce the amount of
// searching for the cursor, we store the last known position in
// lastCursorPosition, and only invoke getLineNumberForVerticalOffset and
// get ColumnNumberForHorizontalOffset when the position changes.
//
// Input:
//   mutations - the list of mutations
//   statusBarIndex - the index of the cursor position in the status bar
let lastCursorPosition = {
    'top': 0,
    'left': 0,
    'line': 1,
    'column': 1
};
function onCursorsLayerMutation(mutations, statusBarIndex) {

    // find the div containing the cursor
    let cursor = document.querySelector(".cursors-layer > .cursor");
    if (cursor != null) {
        const statusBar = fetchStatusBar();
        if (statusBarIndex < statusBar.length) {

            // get the new cursor position
            const newTop = parseInt(cursor.style.top);
            const newLeft = parseInt(cursor.style.left);

            if (!isNaN(newTop) && newTop != lastCursorPosition.top) {
                // update the cursor top position and line number
                lastCursorPosition.top = newTop;
                const newLine = getLineNumberForVerticalOffset(newTop);
                if (!isNaN(newLine)) {
                    // only update the line number if the cursor is within the display area
                    lastCursorPosition.line = newLine;
                }
            }
            if (!isNaN(newLeft) && newLeft != lastCursorPosition.left) {
                // update the cursor left position and line
                lastCursorPosition.left = newLeft;
                lastCursorPosition.column = getColumnNumberForHorizontalOffset(
                    newLeft
                );
            }

            // update the status bar
            statusBar[statusBarIndex].innerHTML = getCursorPositionLabel(
                lastCursorPosition.line,
                lastCursorPosition.column
            );
        }
    }

}


// Respond to a click on text suggestions control in the status bar.
//
// Input:
//   statusBarIndex - the index of the suggestions button in the status bar
function onStatusBarSuggestClick(statusBarIndex) {

    // update the suggest widget flag
    showSuggestWidget = !showSuggestWidget;
    GM_setValue("showSuggestWidget", showSuggestWidget);

    // update the status bar display
    const statusBar = fetchStatusBar();
    if (statusBarIndex < statusBar.length) {
        statusBar[statusBarIndex].firstChild.firstChild.innerText = getSuggestionsButtonLabel(showSuggestWidget);
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
