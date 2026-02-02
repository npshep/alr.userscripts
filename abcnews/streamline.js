// ==UserScript==
// @name             A Little ABC News
// @namespace        https://www.alittleresearch.com.au
// @version          2026-02-02
// @description      Remove undesired components from the ABC News web site.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://www.abc.net.au
// @match            https://www.abc.net.au/news
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
//
// The ABC News site identifies some components by an ID, some by a class name,
// and some not at all. Each key of the siteConf structure identifies a
// component by (i) id if the key begins with #; (ii) class name if the key
// begins with .; or (iii) the contents of an <h2> element otherwise.
//
// The value for each key controls how that component will be rendered. Options
// are as follows:
//
// 'default': display as usual
// 'hidden': do not display
// 'compressed': show only the header, which can be expanded by clicking
// 'expanded': the same as 'expandable', but starting in the expanded state
// 'saved': state saved by GM_setValue
//
// Components configured with 'saved' begin as 'expanded' elements on the first
// load, but the 'expanded' or 'compressed' state is thereafter saved between
// sessions using GM_setValue. Unsaved components reset to the state set here
// upon every reload.
//
// This script ships with the settings that I prefer, but feel free to change
// them to your liking.
//
///////////////////////////////////////////////////////////////////////////////
const siteConf = {
    // Top Stories
    '#topStories': 'default',

    // State Top Storeis
    '#stateTopStories': 'default',

    // the fixed copy of Just In that appears at the top right)
    '#justIn': 'default',

    // Dive Deeper (formerly called Today's Topics)
    '#todaysTopics': 'expanded',

    // Story Feeds
    'Story Feeds': 'compressed',

    // For You
    'For You': 'compressed',

    // Local News
    '#localNews': 'default',

    // Video Shorts
    '#videoShorts': 'compressed',

    // More News
    '#moreNews': 'expanded',

    // Everyone's Talking About...
    '#theBigPicture': 'compressed',

    // Around Australia
    '#aroundAustralia': 'saved',

    // Politics
    '#politics': 'saved',

    // World
    '#world': 'saved',

    // Business
    '#business': 'saved',

    // Sport
    '#sport': 'saved',

    // Lifestyle
    '#lifestyle': 'saved',

    // Entertainment
    '#entertainment': 'saved',

    // the floating copy of Just In box that sticks to the right when scrolling done
    '.Home_justin__mrrHu Home_justinSticky__EkueF': 'hidden',

    // the category headings that appear above each story
    '.Tag_container__7_5W6': 'default'
};


(function() {
    'use strict';

    // apply site configuration
    applyConfiguration(siteConf);

})();


// Configure the ABC News web site. See the comment above siteConf for the
// format of component identifiers and display states
//
// Input:
//   conf (Object) - an array of component identifiers mapped to display states
function applyConfiguration(conf) {

    for (const key of Object.keys(conf)) {

        let componentConf = conf[key];
        let componentSaveKey = null;
        if (componentConf === 'saved') {
            // restore saved value, defaulting to 'expanded'
            componentConf = GM_getValue(key, 'expanded');
            componentSaveKey = key;
        }

        switch (componentConf) {
        	case 'hidden':
        		applyRenderer(key, (element) => { renderHidden(element); });
        		break;

        	case 'compressed':
                applyRenderer(key, (element) => { renderExpandable(element, true, componentSaveKey); });
                break;

        	case 'expanded':
                applyRenderer(key, (element) => { renderExpandable(element, false, componentSaveKey); });
                break;

            case 'default':
                // do nothing
                break;

            default:
                console.warn("Invalid value '" + componentConf + "' for configuration key " + key);
                break;
        }
    }

}

// Apply a renderer to all of the elements matching a given key from the
// siteConf structure.
//
// Input:
//   key - the key from the siteConf structure
//   render - a function taking a single DOMElement object as input
function applyRenderer(key, render) {

    if (key.charAt(0) === "#" && key.length > 1) {

        // component identified by id
        const element = document.getElementById(key.substring(1, key.length));
        if (element != null) {
            render(element);
        }

    } else if (key.charAt(0) === "." && key.length > 1) {

        // component identified by class name
        const elements = document.getElementsByClassName(key.substring(1, key.length));
        if (elements != null) {
            for (let i = 0; i < elements.length; i++) {
                render(elements[i]);
            }
        }

    } else {

        // component identified by <h2>
        const headings = document.getElementsByTagName("H2");
        if (headings != null) {
            for (let i = 0; i < headings.length; i++) {
                if (headings[i].innerHTML === key) {
                    render(findRailRoot(headings[i]));
                }
            }
        }
    }

}


// Respond to a click on an expandable rail component.
//
// Input:
//   headerElement (DOMElement) - the rail header element
//   contentElement (DOMElement) - the rail content element
//   saveKey (string) - key for saving the state with GM_setValue(); null to disable saving
function onClickExpandable(headerElement, contentElement, saveKey = null) {

    if (contentElement.style.display === "none") {
        // expand a compressed element
        contentElement.style.display = "block";
        headerElement.style.cursor = "zoom-out";
        if (saveKey != null) {
            GM_setValue(saveKey, 'expanded');
        }
    } else {
        contentElement.style.display = "none";
        headerElement.style.cursor = "zoom-in";
        if (saveKey != null) {
            GM_setValue(saveKey, 'compressed');
        }
    }

}


// Find the root element of a rail component associated with a given
// element. The rail component may either enclose the element, or be
// contained within the element.
//
// Input:
//   element (DOMElement) - an element with the rail component
//
// Returns: the root element of the rail component, or null if no element is found
function findRailRoot(element) {

    // first, search downwards for a rail component contained within the element
    let railRootElement = element;
    while (railRootElement != null && (!railRootElement.hasAttribute('class') || !railRootElement.className.startsWith("Rail_root__"))) {
        railRootElement = railRootElement.firstElementChild;
    }
    if (railRootElement != null) {
        return railRootElement;
    }

    // now search upwards for a rail component containing the element
    railRootElement = element;
    while (railRootElement != null && (!railRootElement.hasAttribute('class') || !railRootElement.className.startsWith("Rail_root__"))) {
        railRootElement = railRootElement.parentElement;
    }

    return railRootElement;

}


// Make a "rail" component expandable. In the expanded state, the component
// displays as usual, but its header region changes colour when the cursor
// hovers over it. When clicked, the contents are hidden. Similarly, clicking
// on the header region in the compressed state re-expands the component.
//
// The general structure of a rail component is as follows, where the xxxxx's
// are code that differs from component to component but has no obvious
// meaning.
//
//
// <div id="..." or class="...">
//   <!-- sometimes a div contains the Rail_root -->
//     <div class="Rail_root__xxxxx Rail_sideScrolling__xxxxx">
//       <div class="Rail_header__xxxxx">
//         <h2>...</h2>
//         <div>...</div>
//       </div>
//       <div class="Rail_scollNavigation__xxxxx">
//         <button title="Move left"><svg .../></button>
//         <button title="Move right"><svg .../></button>
//       </div>
//       <div class="Rail_content__xxxxx">
//         <ul .../>
//       </div>
//     </div>
//   <!-- end of optional containing div -->
// </div>
//
// Input:
//   element (DOMElement) - the root element of the rail component to be suppressed
//   startCompressed (boolean) - true to start in the compressed state; false to start in the expanded state
//   saveKey (string) - key for saving the state with GM_setValue(); null to disable saving
function renderExpandable(element, startCompressed = false, saveKey = null) {

    // find the rail root
    let railRootElement = findRailRoot(element);
    if (railRootElement == null) {
        // couldn't find the rail root; bail out
        console.warn("Couldn't find the rail root for " + element.toString());
        return;
    }

    // get the components of the rail root
    let railHeaderElement = null;
    let railNavigationElement = null;
    let railContentElement = null;
    let railChild = railRootElement.firstElementChild;
    while (railChild != null) {
        if(railChild.className != null) {
            if (railChild.className.startsWith("Rail_header__")) {
                railHeaderElement = railChild;
            } else if (railChild.className.startsWith("Rail_scollNavigation__")) {
                railNavigationElement = railChild;
            } else if (railChild.className.startsWith("Rail_content__")) {
                railContentElement = railChild;
            }
        }
        railChild = railChild.nextElementSibling;
    }

    // suppress display of the rail content
    if (railContentElement != null) {
        railContentElement.style.display = startCompressed ? "none" : "";
        if (railHeaderElement != null) {
            const originalHeaderBackground = railHeaderElement.style.backgroundColor;
            railHeaderElement.style.cursor = startCompressed ? "zoom-in" : "zoom-out";
            railHeaderElement.style.borderRadius = "8px";
            railHeaderElement.onclick = function () {
                onClickExpandable(railHeaderElement, railContentElement, saveKey);
            };
            railHeaderElement.onmouseover = function() {
                railHeaderElement.style.backgroundColor = 'var(--nw-colour-theme-surface-tint)';
            };
            railHeaderElement.onmouseout = function() {
                railHeaderElement.style.backgroundColor = originalHeaderBackground;
            };
        }
    }

}


// Hide a component by setting its display style to "none".
//
// Input:
//   element (DOMElement) - the DOM element at the root of the component to be suppressed
//
function renderHidden(element) {

    element.style.display = "none";

}
