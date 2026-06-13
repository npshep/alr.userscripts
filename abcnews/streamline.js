// ==UserScript==
// @name             A Little ABC News
// @namespace        https://www.alittleresearch.com.au
// @version          2026-06-13
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
        '.ArticleSummary_summary__Zf0LG': 'compressed',

        // "Top Stories" - the first is the sidebar; the second is panel at the bottom
        'Top Stories': 'compressed',
        '.TopStories_container__G_Fb1': 'hidden',

        // "Related stories" sidebar
        '#Related stories': 'compressed',

        // "Popular now" sidebar
        'Popular now': 'compressed',

        // "Sport" sidebar
        '#Sport': 'compressed',

        // "Share your view" form at the bottom of the article
        '.ZendeskForm_zendeskForm__5eLgR': 'compressed',

        // the marketing banner at the end of the article (usually for ABC iView)
        '.ArticleWeb_marketingBanner__WEtHh': 'hidden',

        // the "Related topics" that appear near the bottom
        '.RelatedTopics_title__W9qTi': 'hidden',

        // the "Just In" stories that appear at the bottom
        '.LatestStories_heading__0dNMm': 'hidden'

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
                    const parts = mapExpandableComponent(headings[i]);
                    if (parts != null) {
                        render(parts.root);
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


// Find the components of an article summary used for renderExpandable().
//
// The article summary has the following structure, where the xxxxx's are
// sequences of letters and numbers with no obvious meaning.
//
// <div class="ArticleSummary_summary__xxxxx Article_head__xxxxx">
//   <div class="Article_main__xxxxx">
//     <h2>In Short</h2>
//     ...a series of <p> elements containing the body...
//   </div>
// </div>
//
// Input:
//   container (DOMElement) - the root element of the article summary
//
// Returns: an associate array with properties root, header, content; or null
//   if the input element is not recognised as an article summary
function mapExpandableArticleSummary(container) {

    if (container.className.startsWith("ArticleSummary_summary__")) {
        return {
            root: container,
            header: container.querySelector("h2"),
            content: container.querySelectorAll("p, h2:not(h2:first-of-type)")
        };
    } else {
        // not an article summary
        return null;
    }

}


// Find the components of an <aside> element (used in the sidebar).
//
// "Aside" elements have several slightly different structures, but the basic
// idea is:
//
//  <aside class="Article_aside_xxxxx"> or <div class="Home_aside1__xxxxx">
//     <div class="Rail_header__xxxxxx">...</div> or <h2>...<h2>
//     ...more elements...
//  </aside> or </div>
//
// Input:
//   container (DOMElement) - the <aside> element
//
// Returns: an associate array with properties root, header, content; or null
//   if the input element is not recognised as <aside>
function mapExpandableAside(container) {

    // identify known header elements
    function isAsideHeader(e) {
        if (e.tagName === "H2" || e.tagName === "H3") {
            return true;
        } else if (e.hasAttribute("class") && e.className.startsWith("Rail_header__")) {
            return true;
        } else {
            return false;
        }
    }

    // the root element is the <aside> element itself
    let parts = { root: container };

    // descend until we find the header
    parts.header = container.firstElementChild;
    while (parts.header != null && !isAsideHeader(parts.header)) {
        parts.header = parts.header.firstElementChild;
    }

    if (parts.header != null) {

        // the content is made up of the siblings of the header
        parts.content = [];
        let e = parts.header.nextElementSibling;
        while (e != null) {
            parts.content.push(e);
            e = e.nextElementSibling;
        }

        return parts;

    } else {

        // we can't expand elements without a header, so give up
        return null;

    }

}



// Find the parts of an expandable element.
//
// Input:
//   element (DOMElement) - an element within the componnet
//
// Returns: an associative array with properties root, header, content; or null
//   if the input element is not recognised as a rail element
function mapExpandableComponent(element) {

    // identify known expandable components
    function isExpandableComponentRoot(e) {
        if (e.hasAttribute('class')) {
            if (e.className.startsWith("Rail_root__")) {
                return "RailRoot";
            } else if (e.className.startsWith("ArticleSummary_summary__")) {
                return "ArticleSummary";
            } else if (e.className.startsWith("Home_aside1__") || e.className.startsWith("Article_aside__")) {
                return "Aside";
            } else if (e.className.startsWith("TopStories_container__")) {
                return "TopStories";
            } else if (e.className.startsWith("ZendeskForm_zendeskForm__")) {
                return "ZendeskForm";
            }
        }
        return null;
    }

    // first, search downwards for a recognised root element contained within the element
    let e = element;
    while (e != null && !isExpandableComponentRoot(e)) {
        e = e.firstElementChild;
    }

    if (e == null) {
        // now search upwards for a recognised root element containing the element
        e = element;
        while (e != null && !isExpandableComponentRoot(e)) {
            e = e.parentElement;
        }
    }

    // invoke the mapper for the kind of root we found
    if (e != null) {
        switch (isExpandableComponentRoot(e)) {
            case "RailRoot": return mapExpandableRailComponent(e);
            case "ArticleSummary": return mapExpandableArticleSummary(e);
            case "Aside": return mapExpandableAside(e);
            case "TopStories": return mapExpandableTopStories(e);
            case "ZendeskForm": return mapExpandableContactForm(e);
            default: return null;
        }
    } else {
        return null;
    }

}


// Find the components of a contact form used for renderExpandable().
//
// The contact form has the following structure, where the xxxxx's are
// sequences of letters and numbers with no obvious meaning.
//
// <div class="ZendeskForm_zendeskForm__xxxxx" data-component="ZendeskForm">
//   <div data-component="ZendeskFormUI">
//     <h3>Contact...</h3>
//     <form>...</form>
//   </div>
// </div>
//
// Input:
//   container (DOMElement) - the root element of the article summary
//
// Returns: an associate array with properties root, header, content; or null
//   if the input element is not recognised as a contact form
function mapExpandableContactForm(container) {

    if (container.className.startsWith("ZendeskForm_zendeskForm__")) {
        return {
            root: container,
            header: container.querySelector("h3"),
            content: container.querySelector("form")
        };
    } else {
        // not a contact form
        return null;
    }

}


// Find the components of a "rail" element used for renderExpandable().
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
//       <div class="Rail_content__xxxxx"> or <div class="Grid_row__xxxx">
//         <ul .../>
//       </div>
//     </div>
//   <!-- end of optional containing div -->
// </div>
//
// Input:
//   container (DOMElement) - the root element of the rail component
//
// Returns: as mapExpandableComponent
function mapExpandableRailComponent(container) {

    if (container.className.startsWith("Rail_root__")) {
        // search the children of the container for the components of interest
        let parts = { root: container };
        let e = parts.root.firstElementChild;
        while (e != null) {
            if (e.className != null) {
                if (e.className.startsWith("Rail_header__")) {
                    parts.header = e;
                } else if (e.className.startsWith("Rail_scollNavigation__")) {
                    parts.nav = e;
                } else if (e.className.startsWith("Rail_content__")) {
                    // in-text components use Rail_content__xxxxx
                    parts.content = e;
                } else if (e.className.startsWith("Grid_row__")) {
                    // sidebars use Grid_row__xxxxx
                    parts.content = e;
                }
            }
            e = e.nextElementSibling;
        }
        return parts;
    } else {
        // not a rail component
        return null;
    }

}


// Find the components of the Top Stories box used for renderExpandable().
//
// The Top Stories has the following structure, where the xxxxx's are
// sequences of letters and numbers with no obvious meaning.
//
// <div class="TopStories_container__G_Fb1__xxxxx" data-component="TopStories">
//   <header class="SectionHeader_header__xxxxx TopStories_collectionHeading__xxxxx>
//     ...
//   </header>
//   <ol class="TopStories_list__URxOJ">...</ol>
// </div>
//
// Input:
//   container (DOMElement) - the root element of the article summary
//
// Returns: an associate array with properties root, header, content; or null
//   if the input element is not recognised as a contact form
function mapExpandableTopStories(container) {

    if (container.className.startsWith("TopStories_container__")) {
        return {
            root: container,
            header: container.querySelector("header"),
            content: container.querySelector("ol")
        };
    } else {
        // not the Top Stories box
        return null;
    }

}


// Respond to a click on an expandable component.
//
// Input:
//   header (DOMElement) - the header element
//   content (DOMElement or NodeList) - the content
//   saveKey (string) - key for saving the state with GM_setValue(); null to disable saving
function onClickExpandable(header, content, saveKey = null) {

    // work out the styles after clicking
    let targetDisplayStyle;
    let headerCursorStyle;
    const currentDisplayStyle = (content instanceof NodeList) ?
        content[0].style.display : content.style.display;
    if (currentDisplayStyle === "none") {
        // expanding a compressed component
        targetDisplayStyle = "block";
        headerCursorStyle = "zoom-out";
    } else {
        // compressing an expanded component
        targetDisplayStyle = "none";
        headerCursorStyle = "zoom-in";
    }

    // apply styles
    header.style.cursor = headerCursorStyle;
    if (content instanceof NodeList || Array.isArray(content)) {
        content.forEach((e) => { e.style.display = targetDisplayStyle; });
    } else {
        content.style.display = targetDisplayStyle;
    }

    if (saveKey != null) {
        // save state
        GM_setValue(saveKey, targetDisplayStyle === "block" ? 'expanded' : 'compressed');
    }

}


// Make a component expandable. In the expanded state, the component displays
// as usual, but its header region changes colour when the cursor hovers over
// it. When clicked, the contents are hidden. Similarly, clicking on the
// header region in the compressed state re-expands the component.
//
// See the comments above each mapExpandable*() function for the structure of
// each kind of expandable element.
//
// Input:
//   element (DOMElement) - the root element of the component to be suppressed
//   startCompressed (boolean) - true to start in the compressed state; false to start in the expanded state
//   saveKey (string) - key for saving the state with GM_setValue(); null to disable saving
function renderExpandable(element, startCompressed = false, saveKey = null) {

    // get the parts of the expandable element
    let parts = mapExpandableComponent(element);
    if (parts == null) {
        // the element is not expandable; bail out
        logUnexpectedEvent("dom", "Expandability not supported for " + element.toString());
        return;
    }

    // suppress display of the component content
    if ('content' in parts && parts.content != null) {
        const targetDisplayStyle = startCompressed ? "none" : "";
        if (parts.content instanceof NodeList || Array.isArray(parts.content)) {
            parts.content.forEach((e) => { e.style.display = targetDisplayStyle; });
        } else {
            parts.content.style.display = targetDisplayStyle;
        }
        if ('header' in parts && parts.header != null) {
            const originalHeaderBackground = parts.header.style.backgroundColor;
            parts.header.style.cursor = startCompressed ? "zoom-in" : "zoom-out";
            parts.header.style.borderRadius = "8px";
            parts.header.onclick = function () {
                onClickExpandable(parts.header, parts.content, saveKey);
            };
            parts.header.onmouseover = function() {
                parts.header.style.backgroundColor = 'var(--nw-colour-theme-surface-tint)';
            };
            parts.header.onmouseout = function() {
                parts.header.style.backgroundColor = originalHeaderBackground;
            };
        } else {
            logUnexpectedEvent("dom", "No expandable header found for " + element.toString());
        }
    } else {
        logUnexpectedEvent("dom", "No expandable content found for " + element.toString());
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
