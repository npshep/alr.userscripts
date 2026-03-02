// ==UserScript==
// @name             A Little BoM
// @namespace        https://www.alittleresearch.com.au
// @version          2026-03-02
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
// an internal code, which is a key of siteConf structure below.
//
// The 'order' array defines the order (top to bottom) in which components will
// be displayed.
//
// The value for each component key controls how that component will be
// rendered. Options are as follows:
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

    // display order (top to bottom)
    order: {
        home: [ 'favouriteLocations', 'sevenDayForecast', 'weatherMap' ],
        location: [ 'hourlyForecast', 'weatherMap' ]
    },

    // Weather map / rain radar
    weatherMap: 'compressed',

    // 7-day forecast
    sevenDayForecast: 'default',

    // Favourite locations
    favouriteLocations: 'compressed',

    // Featured news
    featuredNews: 'hidden',

    // Exploring our web site
    exploring: 'hidden'
};


(function() {
    'use strict';

    if (window.location.href === 'https://www.bom.gov.au/') {
        // BoM home page
        reorderHomePage(siteConf.order.home);
        styleHomePage(siteConf);
    } else if (window.location.href.startsWith('https://www.bom.gov.au/location/')) {
        // location page
        reorderLocationPage(siteConf.order.location);
        styleLocationPage(siteConf);
    }

})();


///////////////////////////////////////////////////////////////////////////////
// Style the elements on the home page.
//
///////////////////////////////////////////////////////////////////////////////
function styleHomePage(conf) {

    // TODO

}


///////////////////////////////////////////////////////////////////////////////
// Re-order the home page.
//
// The main content is inside a div with id block-mainpagecontent. The first
// child or two contain a header depending on whether or not any favourite
// locations have been set.
//
// Following the header, each block of information is contained by a div with
// class module-spacing. The internal structure of these blocks don't follow
// any pattern, so we need to recognise each one with some custom code.
//
// Input:
//   order (Array) - the siteConf.home.order array
//
// Throws:
//   ReferenceError - the input array contains an unrecognised component code
function reorderHomePage(order) {

    // get a reference to the main content
    const mainPageContent = document.getElementById('block-mainpagecontent');
    if (mainPageContent != null) {

        // the initial insertion point is the last non-module-spacing child
        let insertionPoint = null;
        let child = mainPageContent.firstElementChild;
        while (child != null && (!child.hasAttribute('class') || !child.classList.contains('module-spacing'))) {
            insertionPoint = child;
            child = child.nextElementSibling;
        }

        // continue through the children, tagging each module-spacing child with its code
        let mapCodeToChild = { };
        while (child != null) {
            const code = findCodeForComponent(child);
            if (code != null) {
                mapCodeToChild[code] = child;
            }
            child = child.nextElementSibling;
        }

        // finally, put the components into the chosen order at the insertion point
        for (const code of order) {
            if (code in mapCodeToChild) {
                mainPageContent.removeChild(mapCodeToChild[code]);
                insertionPoint.insertAdjacentElement("afterend", mapCodeToChild[code]);
                insertionPoint = mapCodeToChild[code];
            }
        }

    }

}


///////////////////////////////////////////////////////////////////////////////
// Style the elements on the location page.
//
///////////////////////////////////////////////////////////////////////////////
function styleLocationPage(conf) {

    // TODO

}



///////////////////////////////////////////////////////////////////////////////
// Re-order the home page.
//
///////////////////////////////////////////////////////////////////////////////
function reorderLocationPage(conf) {

    // TODO

}


// Find the siteConf code for a given component.
//
// Input:
//   e (DOMElement) - an element (presumed to be a div with class module-spacing)
//
// Returns: the siteConf code matching e; null if the element isn't recognised
function findCodeForComponent(e) {

    // favourite locations: e > .l-padding > .bom-more-favourite-location
    if (e.querySelector('.l-padding > .bom-more-favourite-location') != null) {
        return 'favouriteLocations';
    }

    // elements idenitifed by the contained data-component attribute
    if (e.firstElementChild != null) {
        switch (e.firstElementChild.getAttribute('data-component')) {

            // weather map / rain radar
            case 'bom-spatial-map': return 'weatherMap';

            // seven-day forecast
            case 'C10_ForecastForHomePage': return 'sevenDayForecast';
            // featured news
            case 'bom-feature-news': return 'featuredNews';

        }
    }

    // if we got here, we didn't recognise the input element
    return null;
}
