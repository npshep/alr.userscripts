// ==UserScript==
// @name             A Little BoM
// @namespace        https://www.alittleresearch.com.au
// @version          2026-03-05
// @description      Re-arrange and compactify the Bureau of Meteorology's web site.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://www.bom.gov.au
// @match            https://www.bom/gov/location/*
// @icon             https://www.alittleresearch.com.au/sites/default/files/alriconbl-transbg-32x32.png
// @grant            none
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2026 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// Configure the site. The Bureau of Meterology site doesn't identify
// components in any consistent way, so this script refers to each one using
// an internal code, which is a key of siteConf.style structure below.
//
// The 'order' arrays define the order (top to bottom) in which components will
// be displayed. Omitting a component removes it from the display (but adding
// a component not present on that page has no effect).
//
// The 'style' value for each component key controls how that component will be
// rendered. Options are as follows:
//
// 'default': display as usual
// 'compressed': show only the header, which can be expanded by clicking
// 'expanded': the same as 'expandable', but starting in the expanded state
// 'saved': state saved by GM_setValue
//
// Components configured with 'saved' begin as 'expanded' elements on the first
// load, but the 'expanded' or 'compressed' state is thereafter saved between
// sessions using GM_setValue. Unsaved components reset to the state set here
// upon every reload.
//
// The 'theme' properties set a few colours, fonts, etc. used by added
// compoments.
//
// This script ships with the settings that I prefer, but feel free to change
// them to your liking.
//
///////////////////////////////////////////////////////////////////////////////
const siteConf = {

    // display order (top to bottom)
    order: {

        // home page when no favourite is set
        homepage: [ 'homepageHeader', 'capitalForecast', 'weatherMetadata', 'featuredNews', 'bomLinks' ],

        // home page when favourites are set
        favourites: [ 'weatherMood', 'favouriteLocations', 'sevenDayForecast', 'weatherMap', 'weatherMetadata' ],

        // location page
        location: [ 'weatherMood', 'hourlyForecast', 'weatherMap' ]
    },

    // display styles (the key is the script's internal code for the item)
    style: {

        // weather summary for a location
        weatherMood: 'default',

        // Weather map / rain radar
        weatherMap: 'compressed',

        // 7-day forecast
        sevenDayForecast: 'expanded',

        // Favourite locations
        favouriteLocations: 'compressed',

        // Last Updated
        weatherMetadata: 'default',

        // Featured news
        featuredNews: 'default',

        // Exploring your web site
        bomLinks: 'hidden'

    },

    // colours, fonts, etc.
    theme: {

        // background colour for expandable title areas
        expandableBackground: 'skyblue'

    }
};


(function() {
    'use strict';

    if (window.location.href === 'https://www.bom.gov.au/') {

        // BoM home page
        try {

            const map = buildComponentMapHome();
            if ('homepageHeader' in map) {
                // home page with no favourites set
                reorderComponents(map, siteConf.order.homepage);
            } else {
                // home page with favourites set
                reorderComponents(map, siteConf.order.favourites);
            }
            styleComponents(map, siteConf.style);

        } catch (error) {
            console.warn(error.message);
        }

    } else if (window.location.href.startsWith('https://www.bom.gov.au/location/')) {

        // location page
        try {

            const map = buildComponentMapLocation();
            reorderComponents(map, siteConf.order.location);
            styleComponents(map, siteConf.style);

        } catch (error) {
           console.warn(error.message);
        }
    }

})();


// Build a map of component keys to DOM elements on the home page.
//
// The main content is inside a div with id block-mainpagecontent. The first
// child or two contain a header depending on whether or not any favourite
// locations have been set.
//
// Following the header, each block of information is contained by a div with
// class module-spacing. The internal structure of these blocks don't follow
// any pattern, so we need to recognise each one with some custom key.
//
// Returns: an object mapping siteConf component keys to DOM elements
//
// Throws:
//    ReferenceError - could not find the block-mainpagecontent element
function buildComponentMapHome() {

    // start with an empty map
    let map = { };

    // get a reference to the main content
    map.root = document.getElementById('block-mainpagecontent');
    if (map.root != null) {

        // add each child that we recognise to the map
        let child = map.root.firstElementChild;
        while (child != null) {
            const key = getComponentKey(child);
            if (key != null) {
                map[key] = child;
            }
            child = child.nextElementSibling;
        }

    } else {

        throw new ReferenceError("Could not identify the main page content.");

    }

    return map;
}

// Build a map of component keys to DOM elements on the location page.
//
// .. documentation to do...
//
// Returns: an object mapping siteConf component keys to DOM elements
function buildComponentMapLocation() {

    // TODO
    return { };

}


// Get the siteConf key for a given component. See the in-function comments for
// the structure of each recognised component.
//
// Input:
//   e (DOMElement) - a child element of the id-blockmainpage element
//
// Returns: the siteConf key matching e; null if the element isn't recognised
function getComponentKey(e) {

    // when no favourite location is set, the page body starts with two div's,
    // one with class bom-homepage-header ("Discover Your Weather") and with
    // class bom-homepage-content-top-wrapper (the capital cite forecasts)
    if (e.classList.contains('bom-homepage-header')) {
        return 'homepageHeader';
    }
    if (e.classList.contains('bom-homepage-content-top-wrapper')) {
        return 'capitalForecast';
    }

    // when a favourite location is set, the page body begins with a data
    // component C04-WeatherGlanceHomePage, which contains the summary data
    // for the favourite location (called the "weather mood")
    if (e.getAttribute('data-component') === 'C04_WeatherGlanceHomepage') {
        return 'weatherMood';
    }

    // for some reason, both the favourite locations and weather metadata have
    // class bom-more-favourite-location
    const moreFavouriteLocation = e.querySelector('.l-padding > .bom-more-favourite-location');
    if (moreFavouriteLocation != null && moreFavouriteLocation.firstElementChild != null) {
        switch (moreFavouriteLocation.firstElementChild.getAttribute('data-component')) {

            // weather metadata ("last updated")
            case 'C07_WeatherMetadata': return 'weatherMetadata';

            // favourite locations
            case 'C42_MyWeather': return 'favouriteLocations';

        }
    }

    // these elements are identified by the data-component attribute of the first child
    if (e.firstElementChild != null && e.firstElementChild.hasAttribute('data-component')) {
        switch (e.firstElementChild.getAttribute('data-component')) {

            // weather map / rain radar
            case 'bom-spatial-map': return 'weatherMap';

            // seven-day forecast
            case 'C10_ForecastForHomepage': return 'sevenDayForecast';

            // featured news
            case 'bom-feature-news': return 'featuredNews';

        }
    }

    // the links are contained in a div whose child has class bom-cta-links
    if (e.firstElementChild != null && e.firstElementChild.classList.contains('bom-cta-links')) {
        return 'bomLinks';
    }

    // if we got here, we didn't recognise the input element
    return null;
}


// Get the title area for a component.
//
// Since every component has a unique internal structure, we need custom logic
// to identify the title area, which is encoded in this function. See the
// in-function comments for the structure of each component.
//
// Input:
//   root (DOMElement) - the root element of the component
//   key (string) - the component key from siteConf.style
//
// Returns: the root element of the title area, or null if the component does not have a title
//
// Throws:
//   ReferenceError - key is not recognised
function getComponentTitleArea(root, key) {

    switch (key) {
        case 'favouriteLocations':
            // favourite locations; the title bar has class my-weather__title
            return root.querySelector(".my-weather__title");

        case 'sevenDayForecast':
            // 7-day forecast; the title bar has class forecast-summary-table__title
            return root.querySelector(".forecast-summary-table__title");

        case 'weatherMap':
            // weather map; the title has id weatherMap
            return root.querySelector("#weatherMap");

        default:
            throw new ReferenceError("Unrecognised component key '" + key + "' in getComponentTitleArea.");
    }
    return null;

}


// Handler for clicking on an expandable title area.
//
// Input:
//   root (DOMElement) - the root element of the component
//   titleArea (DOMElement) - the root element of the title area
function onClickExpandable(root, titleArea) {

    let display;
    if (titleArea.style.cursor === "zoom-out") {
        // compress an expanded element
        titleArea.style.cursor = "zoom-in";
        styleComponentCompressed(root, titleArea, true);
    } else {
        // expand a compressed element
        titleArea.style.cursor = "zoom-out";
        styleComponentCompressed(root, titleArea, false);
    }

}


// Handler for a mutation to an expandable component.
//
// Input:
//    mutations (Array) - the mutations
//    observer (MutationObserver) - the observer
//    root (DOMElement) - the root element of the component
//    startCompressed (boolean) - start in the compressed state
function onExpandableComponentMutation(mutations, observer, root, startCompressed = false) {

    // try again to the get the title area
    const key = getComponentKey(root);
    if (key !== null) {
        const titleArea = getComponentTitleArea(root, key);
        if (titleArea !== null) {
            // got it! disconnect the observer and make the component expandable
            observer.disconnect();
            styleComponentExpandableReal(root, titleArea, startCompressed);
        }
    }
}


// Re-order the components on a page.
//
// Input:
//   map (Object) - the map output by buildComponentMap*()
//   order (Array) - one of the 'order' arrays from siteConf
//
// Throws:
//   ReferenceError - the order array contains an unrecognised component key
function reorderComponents(map, order) {

    // remove the mapped elements from the page (ignoring the root)
    for (const key of Object.keys(map)) {
        if (key !== 'root') {
            map[key].remove();
        }
    }

    // insert the ordered elements at the top of the root component
    for (let i = order.length - 1; i >= 0; i--) {
        if (order[i] in map) {
            map.root.insertAdjacentElement("afterbegin", map[order[i]]);
        } else {
            throw new ReferenceError("A page order contains an unrecognised component key '" + order[i] + "'.");
        }
    }

}


// Style the components on a page.
//
// Input:
//   map (Object) - the map of keys to components from buildComponentMap*()
//   styleConf (Object) - the siteConf.style object
function styleComponents(map, styleConf) {

    for (const key of Object.keys(map)) {
        if (key in styleConf) {
            switch (styleConf[key]) {
                case 'default':
                    // nothing to do
                    break;

                case 'hidden':
                    styleComponentHidden(map[key]);
                    break;

                case 'compressed':
                    styleComponentExpandable(map[key], key, true);
                    break;

                case 'expanded':
                    styleComponentExpandable(map[key], key, false);
                    break;

                default:
                    console.warn("Component '" + key + "' has an unrecognised style '" + styleConf[key] + "'.");
                    break;
            }
        }
    }

}


// Render a compressed component.
//
// We hide the contents of compressed components by suppressing display of the
// siblings of the title area. When re-expanding the component, we return them
// to the default display style.
//
// Input:
//   root (DOMElement) - the root element of the component
//   titleArea (DOMElement) - the title area
//   compressed (boolean) - true to compress, false to expand
function styleComponentCompressed(root, titleArea, compressed = true) {

    // apply the desired display style to the siblings of the title area
    let e = titleArea.nextElementSibling;
    while (e != null) {
        e.style.display = compressed ? "none" : "";
        e = e.nextElementSibling;
    }

}


// Make a component expandable (entry point).
//
// In most cases, the title area doesn't appear during the initial page load,
// so we set a MutationObserver to watch for it.
//
// Input:
//   root (DOMElement) - the root element of the component
//   key (String) - the component key from siteConf.style
//   startCompressed (boolean) - true to start in the compressed state
//
// Returns: a MutationObserver connected to the component; null if the component was changeg immediately
function styleComponentExpandable(root, key, startCompressed = false) {

    const titleArea = getComponentTitleArea(root, key);
    if (titleArea == null) {

        // the title area doesn't exist yet; set an observer to watch it
        const observer = new MutationObserver(
            function (mutations, observer) {
                onExpandableComponentMutation(mutations, observer, root, startCompressed);
            }
        );
        observer.observe(root, { childList: true, subtree: true, attributes: false, characterData: false });
        return observer;

    } else {

        // the title area already exists; make the component expandable right away
        styleComponentExpandableReal(root, titleArea, startCompressed);
        return null;
    }

}


// Make a component expandable (really).
//
// This function should only be called once the title area has appeared on the
// page. If the page has just loaded, use styleComponentExpandable() above to
// set up a MutationObserver that will invoke this function.
//
// Input:
//   root (DOMElement) - the root element of the component
//   titleArea (DOMElement) - the title area
//   startCompressed (boolean) - true to start in the compressed state
function styleComponentExpandableReal(root, titleArea, startCompressed = false) {

    // clicking the title area toggles the compressed/expanded state
    const originalTitleBackground = titleArea.style.backgroundColor;
    titleArea.style.cursor = startCompressed ? "zoom-in" : "zoom-out";
    titleArea.style.borderRadius = "8px";
    titleArea.onclick = function () {
        onClickExpandable(root, titleArea);
    };
    titleArea.onmouseover = function() {
        titleArea.style.backgroundColor = siteConf.theme.expandableBackground;
    };
    titleArea.onmouseout = function() {
        titleArea.style.backgroundColor = originalTitleBackground;
    };

    // render initial compressed/expanded state
    styleComponentCompressed(root, titleArea, startCompressed);

}

// Make a component hidden.
//
// Input:
//   root (DOMElement) - the root element of the component
function styleComponentHidden(root) {

    root.style.display = "none";

}
