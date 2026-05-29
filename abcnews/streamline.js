// ==UserScript==
// @name             A Little ABC News
// @namespace        https://www.alittleresearch.com.au
// @version          2026-05-29
// @description      Remove undesired components from the ABC News web site.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://www.abc.net.au
// @match            https://www.abc.net.au/news/*
// @icon             https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant            GM_deleteValue
// @grant            GM_getValue
// @grant            GM_listValues
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

    //
    // Components appearing on the home page, https://www.abc.net.au
    //
    home: {

        // Top Stories
        '#topStories': 'default',

        // State Top Stories
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

        // the floating copy of Just In that sticks to the right when scrolling done
        '.Home_justin__mnv4y Home_justinSticky__A9Hqa': 'hidden',

        // marketing banners (usually promoting ABC iView)
        '.Home_marketingBannerMain__zEIHT': 'hidden',
        '.Home_marketingBannerMobile__u2kCT': 'hidden',
        '.Home_marketingBannerSidebar__L7di0': 'hidden',

        // the category headings that appear above each story
        '.Tag_container__7_5W6': 'default'
    },

    //
    // Components appearing on article pages, https://www.abc.net.au/news/YYYY-DD-MM/*
    //
    article: {

        // "In short" summary at the top of the article
        '.ArticleSummary_summary__Zf0LG': 'hidden',

        // "Top Stories" - the first is the sidebar; the second is panel at the bottom
        'Top Stories': 'hidden',
        '.TopStories_container__G_Fb1': 'hidden',

        // "Related stories" sidebar
        '#Related stories': 'compressed',

        // "Popular now" sidebar
        'Popular now': 'hidden',

        // "Share your view" form at the bottom of the article
        '.ZendeskForm_zendeskForm__5eLgR': 'hidden',

        // the marketing banner at the end of the article (usually for ABC iView)
        '.ArticleWeb_marketingBanner__WEtHh': 'hidden'

    }
};

// separator used for building compound GM_setValue() keys
const storageKeySeparator = '**';


(function() {
    'use strict';

    // check the page type and apply corresponding configuration
    const pageType = getPageType(window.location.href);
    if (pageType != null && pageType != 'test') {
        cleanStoredValues(pageType, siteConf[pageType]);
        applyConfiguration(pageType, siteConf[pageType]);
    }

})();


// Configure the current page. See the comment above siteConf for the
// format of component identifiers and display states
//
// Input:
//   category (String) - the configuration category, "home" or "article"
//   conf (Object) - an array of component identifiers mapped to display states
function applyConfiguration(category, conf) {

    for (const key of Object.keys(conf)) {

        let componentConf = conf[key];
        let componentSaveKey = null;
        if (componentConf === 'saved') {
            // restore saved value, defaulting to 'expanded'
            componentSaveKey = storageKey(category, key);
            componentConf = GM_getValue(componentSaveKey, 'expanded');
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
                // not a recognised rendering style (probably a typo in siteConf)
                logUnexpectedEvent("conf", "Invalid value '" + componentConf + "' for configuration key '" + key + "'.");
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

    let gotMatch = false;
    if (key.charAt(0) === "#" && key.length > 1) {

        // component identified by id
        const element = document.getElementById(key.substring(1, key.length));
        if (element != null) {
            gotMatch = true;
            render(element);
        }

    } else if (key.charAt(0) === "." && key.length > 1) {

        // component identified by class name
        const elements = document.getElementsByClassName(key.substring(1, key.length));
        if (elements != null) {
            for (let i = 0; i < elements.length; i++) {
                gotMatch = true;
                render(elements[i]);
            }
        }

    } else {

        // component identified by <h2>
        const headings = document.getElementsByTagName("H2");
        if (headings != null) {
            for (let i = 0; i < headings.length; i++) {
                if (headings[i].innerHTML === key) {
                    gotMatch = true;
                    const railRoot = findRailRoot(headings[i]);
                    if (railRoot != null) {
                        render(railRoot);
                    } else {
                        logUnexpectedEvent("dom", "No rail root found for configuration key '" + key + "'.");
                    }
                }
            }
        }
    }

    if (!gotMatch) {
        // the key didn't match anything; this may indicate a change in the ABC site
        logUnexpectedEvent("conf", "No matches for configuration key '" + key + "'.");
    }

}


// Clean up unused values stored by GM_setValue(). This removes data associated
// with components that no longer exist on the ABC News site, or whose
// configuration was previously 'saved' but is now fixed in siteConf.
//
// Input:
//   category (String) - the configuration category, "home" or "article"
//   conf (Object) - an array of component identifiers mapped to display states
function cleanStoredValues(category, conf) {

    for (const storageKey of GM_listValues()) {
        const storageCategory = storageKeyCategory(storageKey);
        if (storageCategory != "home" && storageCategory != "article") {
            // deprecated key from pre-2026 version
            GM_deleteValue(storageKey);
        } else if (storageCategory === category) {
            const confKey = storageKeyBare(storageKey);
            if (!(confKey in conf) || conf[confKey] !== 'saved') {
                GM_deleteValue(storageKey);
            }
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


// Get the type of page corresponding to a URL.
//
// Input:
//  url (String) - the page URL
//
// Returns: "home" for the home page; "article" for an article; "test" for unit tests
//    null if the URL is not one recognises by this script
function getPageType(url) {

    if (url === "https://www.abc.net.au/") {
        return "home";
    } else if (url.search(/^https:\/\/www\.abc\.net\.au\/news\/\d\d\d\d-\d\d-\d\d/) != -1) {
        return "article";
    } else if (url.startsWith("file://")) {
        return "test";
    }

    return null;

}


// Log an unexpected configuration value or DOM structure. For now, we just
// add a warning to the console.
//
// Input:
//   source (String) - 'conf' for local configuration errors; 'dom' for unexpected DOM structure
//   message (String) - a message describing the unexpected event
function logUnexpectedEvent(source, message) {

    let prefix = "logUnexpectedEvent called with invalid source";
    switch (source) {
        case 'conf':
            prefix = "Configuration error";
            break;

        case 'dom':
            prefix = "Possible DOM change";
            break;
    }
    console.warn(prefix + ": " + message);

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
        logUnexpectedEvent("dom", "No rail root found for " + element.toString());
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
        } else {
            logUnexpectedEvent("dom", "No rail header found for " + element.toString());
        }
    } else {
        logUnexpectedEvent("dom", "No rail content found for " + element.toString());
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


////////////////////////////////////////////////////////////////////////////////
// Storage key functions.
//
// Configuration keys have the format 'category*key' where 'category' is the
// page type and 'key' is the element identifier used in the siteConf structure.
//
////////////////////////////////////////////////////////////////////////////////
function storageKey(category, key) {

    return category + storageKeySeparator + key;

}

function storageKeyCategory(sk) {

    const pos = sk.indexOf(storageKeySeparator);
    if (pos != -1) {
        return sk.substring(0, pos);
    } else {
        return null;
    }

}

function storageKeyBare(sk) {

    const pos = sk.indexOf(storageKeySeparator);
    if (pos != -1) {
        return sk.substring(pos + storageKeySeparator.length);
    } else {
        return sk;
    }

}
