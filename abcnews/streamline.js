// ==UserScript==
// @name         A Little ABC News
// @namespace    http://www.alittleresearch.com.au
// @version      2025-04-27
// @description  Remove undesired components from the ABC News web site.
// @author       Nick Sheppard
// @match        https://www.abc.net.au/news
// @icon         https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant        none
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2025 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
//
// The ABC News site identifies some components by an ID and others by a class
// name. The structure below maps each ID and class name of interest to how it
// will be rendered. Options are as follows:
//
// 'default': display as usual
// 'hidden': do not display
// 'compressed': show only the header, which can be expanded by clicking 
// 'expanded': the same as 'expandable', but starting in the expanded state
//
// Note that the compressed/expanded state isn't saved between visits;
// re-loading the site resets the component to the state given here.
//
// This script ships with the settings that I prefer, but feel free to change
// them to your liking.
//
///////////////////////////////////////////////////////////////////////////////
const siteConf = {
  'topStories': 'default',
  'stateTopStories': 'default',
  'justIn': 'default',
  'todaysTopics': 'expanded',
  'Home_mainSecondary__HRz6J': 'compressed',
  'localNews': 'default',
  'videoShorts': 'compressed',
  'moreNews': 'expanded',
  'theBigPicture': 'compressed',
  'aroundAustralia': 'expanded',
  'politics': 'expanded',
  'world': 'expanded',
  'business': 'expanded',
  'sport': 'expanded',
  'lifestyle': 'expanded',
  'entertainment': 'expanded',
  // the extra Just In box that sticks to the right when scrolling down
  'Home_justin__mrrHu Home_justinSticky__EkueF': 'hidden',
  // the category headings that appear above each story
  'Tag_container__7_5W6': 'default'
};

(function() {
    'use strict';

    // apply the configured renderer for every component in siteConf
    for (const key of Object.keys(siteConf)) {
        switch (siteConf[key]) {
        	case 'hidden':
        		applyRenderer(key, (element) => { renderHidden(element); });
        		break;

        	case 'compressed':
        		applyRenderer(key, (element) => { renderExpandable(element, true); });
        		break;

        	case 'expanded':
        		applyRenderer(key, (element) => { renderExpandable(element, false); });
        		break;

        }

    }

})();


// Apply a renderer to all of the elements with a given id or class name.
//
// Input:
//   key - the id or class name of the element
//   render - a function taking a single DOMElement object as input
function applyRenderer(key, render) {

    // search for an element with the given id
    const element = document.getElementById(key);
    if (element != null) {
    	render(element);
    	return;
    }

    // search for elements with the given class name
    const elements = document.getElementsByClassName(key);
    if (elements != null) {
        for (var i = 0; i < elements.length; i++) {
            render(elements[i]);
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
function renderExpandable(element, startCompressed = false) {

    // find the rail root
    var railRootElement = element;
    while (railRootElement != null && (!railRootElement.className == null || !railRootElement.className.startsWith("Rail_root__"))) {
        railRootElement = railRootElement.firstElementChild;
    }
    if (railRootElement == null) {
        // couldn't find the rail root; bail out
        console.log("Couldn't find the rail root for " + element);
        return;
    }

    // get the components of the rail root
    var railHeaderElement = null;
    var railNavigationElement = null;
    var railContentElement = null;
    var railChild = railRootElement.firstElementChild;
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
            railHeaderElement.style.cursor = "zoom-in";
            railHeaderElement.style.borderRadius = "8px";
            railHeaderElement.onclick = function () {
                if (railContentElement.style.display === "none") {
                    railContentElement.style.display = "block";
                    railHeaderElement.style.cursor = "zoom-out";
                } else {
                    railContentElement.style.display = "none";
                    railHeaderElement.style.cursor = "zoom-in";
                }
            };
            railHeaderElement.onmouseover = function() {
              railHeaderElement.style.backgroundColor = 'var(--nw-colour-theme-surface-tint)';
            };
            railHeaderElement.onmouseout = function() {
              railHeaderElement.style.backgroundColor = 'white';
            };
        }
    }

}
