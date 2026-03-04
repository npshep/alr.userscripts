// ==UserScript==
// @name             A Little BoM
// @namespace        https://www.alittleresearch.com.au
// @version          2026-03-04
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
        sevenDayForecast: 'default',

        // Favourite locations
        favouriteLocations: 'compressed',

        // Last Updated
        weatherMetadata: 'default',

        // Featured news
        featuredNews: 'default',

        // Exploring your web site
        bomLinks: 'hidden'

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


// Build a map of component codes to DOM elements on the home page.
//
// The main content is inside a div with id block-mainpagecontent. The first
// child or two contain a header depending on whether or not any favourite
// locations have been set.
//
// Following the header, each block of information is contained by a div with
// class module-spacing. The internal structure of these blocks don't follow
// any pattern, so we need to recognise each one with some custom code.
//
// Returns: an object mapping siteConf component codes to DOM elements
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
            const code = getCodeForComponent(child);
            if (code != null) {
                map[code] = child;
            }
            child = child.nextElementSibling;
        }

    } else {

        throw new ReferenceError("Could not identify the main page content.");

    }

    return map;
}

// Build a map of component codes to DOM elements on the location page.
//
// .. documentation to do...
//
// Returns: an object mapping siteConf component codes to DOM elements
function buildComponentMapLocation() {

    // TODO
    return { };

}


// Get the siteConf code for a given component. See the in-function comments for
// the structure of each recognised component.
//
// Input:
//   e (DOMElement) - a child element of the id-blockmainpage element
//
// Returns: the siteConf code matching e; null if the element isn't recognised
function getCodeForComponent(e) {

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


// Re-order the components on a page.
//
// Input:
//   map (Object) - the map output by buildComponentMap*()
//   order (Array) - one of the 'order' arrays from siteConf
//
// Throws:
//   ReferenceError - the order array contains an unrecognised component code
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
            throw new ReferenceError("A page order contains an unrecognised component code '" + order[i] + "'.");
        }
    }

}


///////////////////////////////////////////////////////////////////////////////
// Style the components on a page.
//
// Input:
//   map (Object) - the map of codes to components from buildComponentMap*()
//   styleConf (Object) - the siteConf.style object
///////////////////////////////////////////////////////////////////////////////
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
                    styleComponentExpandable(map[key], true);
                    break;

                case 'expanded':
                    styleComponentExpandable(map[key], false);
                    break;

                default:
                    console.warn("Component '" + key + "' has an unrecognised style '" + styleConf[key] + "'.");
                    break;
            }
        }
    }

}


// Make a component expandable.
//
// Input:
//   e (DOMElement) - the root element of the component
//   startCompressed (boolean) - true to start in the compressed state
function styleComponentExpandable(e, startCompressed = false) {

    // TODO

}


// Make a component hidden.
//
// Input:
//   e (DOMElement) - the root element of the component
function styleComponentHidden(e) {

    e.style.display = "none";

}
