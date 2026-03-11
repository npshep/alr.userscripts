// ==UserScript==
// @name             A Little BoM
// @namespace        https://www.alittleresearch.com.au
// @version          2026-03-11
// @description      Re-arrange and compactify the Bureau of Meteorology's web site.
// @author           Nick Sheppard
// @license          MIT
// @contributionURL  https://ko-fi.com/npsheppard
// @match            https://www.bom.gov.au
// @match            https://www.bom.gov.au/location/*
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
// an internal code, which is a key of siteConf.display structure below.
//
// The 'order' arrays define the order (top to bottom) in which components will
// be displayed. Note that components can currently only be re-ordered within
// their original page; adding their code to another page has no effect.
//
// The 'display' value for each component key controls how that component will be
// rendered. Options are as follows:
//
// 'default': display as usual
// 'hidden': hide from display
// 'compressed': show only the header, which can be expanded by clicking
// 'expanded': the same as 'expandable', but starting in the expanded state
//
// The 'theme' properties set a few colours, fonts, etc. used by added
// components.
//
// This script ships with the settings that I prefer, but feel free to change
// them to your liking.
//
///////////////////////////////////////////////////////////////////////////////
const siteConf = {

    // display order (top to bottom)
    order: {

        // home page when no favourite is set
        homepage: [
            'homepageHeader',
            'capitalForecast',
            'weatherMetadata',
            'featuredNews',
            'bomLinks'
        ],

        // home page when favourites are set
        favourites: [
            'weatherMood',
            'favouriteLocations',
            'sevenDayForecast',
            'weatherMap',
            'featuredNews',
            'weatherMetadata',
            'bomLinks'
        ],

        // location page (components can only be re-ordered within a tab; moving across tabs is not yet supported)
        location: [
            // "today" tab
            'hourlyForecast',
            'weatherMap',

            // "7 days" tab
            'sevenDayForecast',
            'weatherSituation',
            'stateDistrict',

            // "past" tab
            'changeStation',
            'stateRegionRecord',
            'observationChart',
            'aboutStation',
            'relatedStations'
        ]
    },

    // display styles (the key is the script's internal code for the component)
    display: {

        // the Discover Your Weather header at the top of the home page
        homepageHeader: 'default',

        // the capital city forecasts that appear when no favourite is set
        capitalForecast: 'default',

        // top-of-page summary when a favourite location is set
        weatherMood: 'default',

        // Weather map / rain radar
        weatherMap: 'compressed',

        // 7-day forecast
        sevenDayForecast: 'expanded',

        // Favourite locations
        favouriteLocations: 'compressed',

        // hourly forecast
        hourlyForecast: 'expanded',

        // Last Updated
        weatherMetadata: 'expanded',

        // Featured news
        featuredNews: 'compressed',

        // Exploring our website
        bomLinks: 'compressed',

        // weather situation (usually "Waters forecast" for coastal regions; empty otherwise)
        weatherSituation: 'default',

        // state distrct  (usually "Coastal forecast" for coastal ergions; empty otherwise)
        stateDistrict: 'default',

        // change weather station
        changeStation: 'default',

        // latest highs and lows
        stateRegionRecord: 'default',

        // past 72 hours
        observationChart: 'default',

        // about this station and more past weather
        aboutStation: 'default',

        // related stations
        relatedStations: 'default'

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
        buildComponentMapHome().then(function (map) {
            if ('homepageHeader' in map) {
                // home page with no favourites set
                applyComponentOrder(map, siteConf.order.homepage);
            } else {
                // home page with favourites set
                applyComponentOrder(map, siteConf.order.favourites);
            }
            applyDisplayStyles(map, siteConf.display);
        }).catch(function (error) {
            console.warn(error.message);
        });

    } else if (window.location.href.startsWith('https://www.bom.gov.au/location/')) {

        // location page
        buildComponentMapLocation().then(function (map) {;
            applyComponentOrder(map, siteConf.order.location);
            applyDisplayStyles(map, siteConf.display);
        }).catch(function (error) {
                console.warn(error.message);
        });

    }

})();


// Re-order the components on a page.
//
// Because all of the re-orderable components on any given page are children of
// the same element (block-mainpagecontent for the home page; the section's
// tab for location page), we can re-order the components by re-adding them to
// their parent's child list in the order specified. Elements not mentioned in
// the order array will be pushed to the bottom.
//
//
// Input:
//   map (Object) - the map output by buildComponentMap*()
//   order (Array) - one of the 'order' arrays from siteConf
function applyComponentOrder(map, order) {

    // insert the ordered elements at the top of their parent component
    for (let i = order.length - 1; i >= 0; i--) {
        if (order[i] in map) {
            map[order[i]].parentElement.insertAdjacentElement("afterbegin", map[order[i]]);
        } else {
            console.warn("A page order contains an unrecognised component key '" + order[i] + "'.");
        }
    }

}


// Set the display style of the components on a page.
//
// Input:
//   map (Object) - the map of keys to components from buildComponentMap*()
//   displayConf (Object) - the siteConf.display object
function applyDisplayStyles(map, displayConf) {

    for (const key of Object.keys(map)) {
        if (key in displayConf) {
            switch (displayConf[key]) {
                case 'default':
                    // nothing to do
                    break;

                case 'hidden':
                    applyDisplayStyleObserver(map[key], function (root) {
                        applyDisplayStyleHidden(root);
                    });
                    break;

                case 'compressed':
                    applyDisplayStyleObserver(map[key], function (root) {
                        applyDisplayStyleExpandable(root, key, true);
                    });
                    break;

                case 'expanded':
                    applyDisplayStyleObserver(map[key], function (root) {
                        applyDisplayStyleExpandable(root, key, false);
                    });
                    break;

                default:
                    console.warn("Component '" + key + "' has an unrecognised display style '" + displayConf[key] + "'.");
                    break;
            }
        }
    }

}


// Apply the 'compressed' display style.
//
// For most components, compression hides all elements not on the path between
// the component root and the title area, which are found by
// applyDisplayStyleCompressedDefaultSet(). In a few special cases, we need to
// hide other elements, as per the in-function comments. When re-expanding the
// component, we return all elements to the default display style.
//
// Input:
//   root (DOMElement) - the root element of the component
//   titleArea (DOMElement) - the title area
//   compressed (boolean) - true to compress, false to expand
function applyDisplayStyleCompressed(root, titleArea, compressed = true) {

    // get the default set of elements to hide when compressed
    let elementsToCompress = applyDisplayStyleCompressedDefaultSet(root, titleArea);

    // special case for aboutStation
    if (getComponentKey(root) === 'aboutStation') {
        applyDisplayStyleCompressedAboutStation(elementsToCompress);
    }

    // apply compression
    for (const e of elementsToCompress) {
        e.style.display = compressed ? 'none' : '';
    }

}


// Special case for compressing the "About this station" component. For this
// component, we preserve the title of the "More past weather" box beside it,
// while removing the body of that box.
//
// Input:
//   elementsToCompress (Array) - the set returned by applyDisplayStyleCompressDefaultSet
function applyDisplayStyleCompressedAboutStation(elementsToCompress) {

    // find the "more past weather" container
    let morePastWeather = null;
    for (let i = 0; i < elementsToCompress.length; i++) {
        if (elementsToCompress[i].classList.contains("past-bom-component-container-3-1-C25_CTA")) {
            // remove the past weather container from the set
            morePastWeather = elementsToCompress[i];
            elementsToCompress.splice(i, 1);
            break;
        }
    }

    if (morePastWeather != null) {
        // hide the body and the buttons instead
        const morePastWeatherParagraph = morePastWeather.querySelector(".bom-body");
        const morePastWeatherButtons = morePastWeather.querySelector(".cta-module__button-container");
        if (morePastWeatherParagraph != null) {
            elementsToCompress.push(morePastWeatherParagraph);
        }
        if (morePastWeatherButtons != null) {
            elementsToCompress.push(morePastWeatherButtons);
        }
    }
}


// Get the default set of elements to gide when compressing an element.
//
// This function finds elements *not* on the path between the root and the
// title area by an in-order traversal of the tree. If the current element is
// on the path, we descend one level and traverse the elements at that level.
// If the curernt element is *not* on the path, we add it to output set and
// move to the next element in the traversal.
//
// Input:
//   root (DOMElement) - the root element of the component
//   titleArea (DOMElement) - the title area
//
// Returns: an array of elements not on the path between the root and the title area
function applyDisplayStyleCompressedDefaultSet(root, titleArea) {

    let elementsToCompress = [ ];
    let e = root.firstElementChild;
    while (e != null && e != root) {

        // save the parent so that we an ascend the tree
        let parent = e.parentElement;

        // process the current element
        if (e != titleArea) {
            if (e.contains(titleArea)) {
                // e is on the path between the root and the title; descend the tree
                e = e.firstElementChild;
            } else {
                // e isn't on the path; add to the set and move to the next element
                elementsToCompress.push(e);
                e = e.nextElementSibling;
            }
        } else {
            // e is the title area; move over it
            e = e.nextElementSibling;
        }

        // if e.nextElementSibling is null, move back up the tree
        while (e == null && e != root) {
            e = parent;
            parent = e.parentNode;
            if (e != root) {
                e = e.nextElementSibling;
            }
        }
    }

    return elementsToCompress;
}



// Make a component expandable (entry point).
//
// In most cases, the title area doesn't appear during the initial page load,
// so we set a MutationObserver to watch for it, which invokes
// applyDisplayStyleExpandableReal() to do the real work.
//
// Input:
//   root (DOMElement) - the root element of the component
//   key (String) - the component key from siteConf.display
//   startCompressed (boolean) - true to start in the compressed state
function applyDisplayStyleExpandable(root, key, startCompressed = false) {

    // the title area doesn't appear right away, so we need to use an asynchronous function
    getComponentTitleArea(root, key).then(function (titleArea) {

        // clicking the title area toggles the compressed/expanded state
        const originalTitleBackground = titleArea.style.backgroundColor;
        titleArea.style.cursor = startCompressed ? "zoom-in" : "zoom-out";
        titleArea.style.borderRadius = "8px";
        titleArea.onclick = function () {
            onClickExpandableComponent(root, titleArea);
        };
        titleArea.onmouseover = function() {
            titleArea.style.backgroundColor = siteConf.theme.expandableBackground;
        };
        titleArea.onmouseout = function() {
            titleArea.style.backgroundColor = originalTitleBackground;
        };

        // render initial compressed/expanded state
        applyDisplayStyleCompressed(root, titleArea, startCompressed);
    });

}


// Apply the 'hidden' display style..
//
// Input:
//   root (DOMElement) - the root element of the component
function applyDisplayStyleHidden(root) {

    root.style.display = "none";

}


// Apply a display style, re-applying it as necessary following a change to
// the component.
//
// Input:
//  root (DOMElement) - the root element of the component
//  render (function) - the function for rendering the display style
function applyDisplayStyleObserver(root, render) {

    // apply the display style right away
    render(root);

    // set an observer to re-apply the style following changes
    const opts = { childList: true, subtree: true, attributes: false, characterData: false };
    const observer = new MutationObserver(function () {
        // disconnect the observer so we don't get an infinite loop
        observer.disconnect();

        // re-apply the style
        render(root);

        // resume observing
        observer.observe(root, opts);
    });
    observer.observe(root, opts);

}


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
// Returns: a Promise that resolve to a map of siteConf component keys to DOM elements;
//   rejects if the page isn't recognised
async function buildComponentMapHome() {

    return new Promise(function (resolve, reject) {

        // start with an empty map
        let map = { };

        // get a reference to the main content
        const mainPageContent = document.getElementById('block-mainpagecontent');
        if (mainPageContent != null) {

            // add each child that we recognise to the map
            let component = mainPageContent.firstElementChild;
            while (component != null) {
                const key = getComponentKey(component);
                if (key != null) {
                    map[key] = component;
                }
                component = component.nextElementSibling;
            }

            resolve(map);

        } else {

            // doesn't look the BoM home page
            reject(new ReferenceError("Could not identify the home page content."));

        }
    });
}


// Build a map of component keys to DOM elements on the location page.
//
// Like the home page, the body of the location page is contained in a div with
// class block-mainpagecontent, but most of the visible content is in a child
// div with class location-template. This div doesn't appear immediately on
// load, so we have to set up a MutationObserver to wait for it.
//
// The location-template div has two children, one with class weather-mood and
// one with class location-page-module. The first contains the weather summary
// at the top of the page ("weatherMood") and the second contains three tabs,
// "bom-tab-panel-today", "bom-tab-panel-7-days" and "bom-tab-panel-past", with
// the visibility of each tab controlled by its CSS display property.
//
// Each tab contains a series of <section> elements that contain one component
// of the display. This function tags each of these components with one of the
// keys in siteConf.display.
//
// Returns: a Promise that resolve to a map of siteConf component keys to DOM elements;
//   rejects if the page isn't recognised
async function buildComponentMapLocation() {

    return new Promise(function (resolve, reject) {

        // start with an empty map
        let map = { };

        // get a reference to the main content
        const mainPageContent = document.getElementById('block-mainpagecontent');
        if (mainPageContent != null) {

            // set an observer to wait for the location-template element
            const observer = new MutationObserver(function () {

                const locationPageModule = mainPageContent.querySelector(".location-page-module");
                if (locationPageModule != null) {
                    // loop through each tab in the location-page-module div
                    let tab = locationPageModule.firstElementChild;
                    while (tab != null) {
                        let section = tab.firstElementChild;
                        while (section != null) {
                            const key = getComponentKey(section);
                            if (key != null) {
                                map[key] = section;
                            }
                            section = section.nextElementSibling;
                        }
                        tab = tab.nextElementSibling;
                    }

                    // stop observing and resolve the Promise
                    observer.disconnect();
                    resolve(map);
                }
            });
            observer.observe(mainPageContent, { childList: true, subtree: true, attributes: false, characterData: false });

        } else {

            // doesn't look like the BoM location page
            reject(new ReferenceError("Could not identify the location page content."));

        }

    });

}


// Get the siteConf key for a given component. See the in-function comments
// for the structure of each recognised component.
//
// Input:
//   e (DOMElement) - a descendent of the id-blockmainpage element
//
// Returns: the siteConf key matching e; null if the element isn't recognised
function getComponentKey(e) {

    // when no favourite location is set, the home page starts with two div's,
    // one with class bom-homepage-header ("Discover Your Weather") and with
    // class bom-homepage-content-top-wrapper (the capital cite forecasts)
    if (e.classList.contains('bom-homepage-header')) {
        return 'homepageHeader';
    }
    if (e.classList.contains('bom-homepage-content-top-wrapper')) {
        return 'capitalForecast';
    }

    // when a favourite location is set, the home page begins with a data
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

    // other components on the home page are identified by the data-component attribute of the first child
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

    // components on the location page are <section> elements with verbose class names
    if (e.tagName === 'SECTION') {
        if (e.classList.contains('tc-today-C04_WeatherGlanceMoreAboutToday-1')) {
            // more about today
            return 'moreAboutToday';
        } else if (e.classList.contains('tc-today-C05_HourlyForecastChart-2')) {
            // hourly forecast
            return 'hourlyForecast';
        } else if (e.classList.contains('tc-today-bom-spatial-map-3')) {
            // weather map
            return 'weatherMap';
        } else if (e.classList.contains('tc-today-C07_WeatherMetadata-4')) {
            // last updated
            return 'weatherMetadata';
        } else if (e.classList.contains('tc-today-bom-component-container-5')) {
            // be aware
            return 'beAware';
        } else if (e.classList.contains('tc-7-days-C10_ForecastWithAccordion-0')) {
            // seven day forecast
            return 'sevenDayForecast';
        } else if (e.classList.contains('tc-7-days-C14_WeatherSituation-1')) {
            // weather situation (usually "Waters forecast" if non-empty)
            return 'weatherSituation';
        } else if (e.classList.contains('tc-7-days-C56_ForecastStateRegionCoastalWater-2')) {
            // coastal forecast
            return 'stateDistrict';
        } else if (e.classList.contains('tc-7-days-C07_WeatherMetadata-3')) {
            // last updated (TODO: weather metadata appears separately on each tab)
            return 'weatherMetadata';
        } else if (e.classList.contains('tc-7-days-bom-component-container-5')) {
            // be aware (TODO: "be aware" appears separately on each tab
            return 'beAware';
        } else if (e.classList.contains('tc-past-C66a_ChangeWeatherStationModal-0')) {
            // change weather station
            return 'changeStation';
        } else if (e.classList.contains('tc-past-C15_StateRegionRecord-1')) {
            // latest highs and lows
            return 'stateRegionRecord';
        } else if (e.classList.contains('tc-past-C66_ObservationChart-2')) {
            // past 72 hours
            return 'observationChart';
        } else if (e.classList.contains('tc-past-bom-component-container-3')) {
            // about this weather station
            return 'aboutStation';
        } else if (e.classList.contains('tc-past-bom-component-container-4')) {
            // data quality
            return 'dataQuality';
        } else if (e.classList.contains('tc-past-bom-component-container-5')) {
            // related weather stations
            return 'relatedStations';
        }
    }

    // the links are contained in a div whose child has class bom-cta-links
    if (e.firstElementChild != null && e.firstElementChild.classList.contains('bom-cta-links')) {
        return 'bomLinks';
    }

    // if we got here, we didn't recognise the input element
    return null;
}


// Get the title area for a component (asynchronous).
//
// The title area for a component doesn't always appear immediately upon
// loading, so this function sets a MutationObserver to watch for it and
// returns a Promise to carry out the work. The getTitleComponentAreaSync()
// function below does the real work of finding the title area.
//
// Input:
//   root (DOMElement) - the root element of the component
//   key (string) - the component key from siteConf.display
//
// Returns: a Promise to return the root element of the title area
async function getComponentTitleArea(root, key) {

    return new Promise(function (resolve, reject) {
        const titleArea = getComponentTitleAreaSync(root, key);
        if (titleArea == null) {

            // the title area doesn't exist yet; set an observer to wait for it
            const observer = new MutationObserver(function () {
                const titleArea = getComponentTitleAreaSync(root, key);
                if (titleArea !== null) {
                    // got it! disconnect the observer and resolve the promise
                    observer.disconnect();
                    resolve(titleArea);
                }
            });
            observer.observe(root, { childList: true, subtree: true, attributes: false, characterData: false });

        } else {

            // the title area already exists; resolve the promise right away
            resolve(titleArea);

        }
    });
}


// Get the title area for a component (synchronous). Note that the title area
// doesn't always appear immediately upon load; use the asynchrononous version
// of this function above to wait until the title appears.
//
// Since every component has a unique internal structure, we need custom logic
// to identify the title area, which is encoded in this function. See the
// in-function comments for the structure of each component.
//
// A few items don't really have title areas (e.g. the capital cities forecast
// on the home page), in which case this function returns a reference to the
// the whole object. The 'compressed' and 'expanded' display styles won't work
// well (or at all) for such components.
//
// Input:
//   root (DOMElement) - the root element of the component
//   key (string) - the component key from siteConf.display
//
// Returns: the root element of the title area, or null if the component does not have a title
function getComponentTitleAreaSync(root, key) {

    switch (key) {
        case 'aboutStation':
            // about this weather station; the title is an h3 with class bom-typo
            return root.querySelector("h3.bom-typo");

        case 'bomLinks':
            // Exploring our website; the title bar has class cta-module__title
            return root.querySelector(".cta-module__title");

        case 'capitalForecast':
            // capital cities forecast; doesn't really have a title, so return null
            return null;

        case 'changeStation':
            // change weather station; the title bar has class weather-station-title
            return root.querySelector(".weather-station-title");

        case 'favouriteLocations':
            // favourite locations; the title bar has class my-weather__title
            return root.querySelector(".my-weather__title");

        case 'featuredNews':
            // featured news; the title bar has class bom-grid
            return root.querySelector(".bom-grid");

        case 'homepageHeader':
            // Discover your weather; the title bar has class homepage-banner__title
            return root.querySelector(".homepage-banner__title");

        case 'hourlyForecast':
            // hourly forecast; the title bar has class forecast-chart-header
            return root.querySelector(".forecast-chart-header");

        case 'observationChart':
            // past 72 hours; the title has class observations-header
            return root.querySelector(".observations-header");

        case 'relatedStations':
            // related weather stations; the title has class bom-related-weather-station_title
            return root.querySelector(".bom-related-weather-station_title");

        case 'sevenDayForecast':
            // 7-day forecast; the title bar has class forecast-summary-table__title
            return root.querySelector(".forecast-summary-table__title");

        case 'stateDistrict':
            // state district; the title has class component__heading (only exists for coastal regions)
            return root.querySelector(".component__heading");

        case 'stateRegionRecord':
            // latest highs and lows; the title bar has class state-region-record-title__container
            return root.querySelector(".state-region-record-title__container");

        case 'weatherMap':
            // weather map; the title has id weatherMap
            return root.querySelector("#weatherMap");

        case 'weatherMetadata':
            // last updated; the title has class metadata-title
            return root.querySelector(".metadata-title");

        case 'weatherMood':
            // top-of-page summary; the title has class location-title__title
            return root.querySelector(".location-title__title");

        case 'weatherSituation':
            // waters forecast; the title has class title--coastal (doesn't exist for non-coastal regions)
            return root.querySelector(".title--coastal");

        default:
            console.warn("Unrecognised component key '" + key + "' in getComponentTitleArea.");
    }

    return null;

}


// Handler for clicking on an expandable title area.
//
// Input:
//   root (DOMElement) - the root element of the component
//   titleArea (DOMElement) - the root element of the title area
function onClickExpandableComponent(root, titleArea) {

    let display;
    if (titleArea.style.cursor === "zoom-out") {
        // compress an expanded element
        titleArea.style.cursor = "zoom-in";
        applyDisplayStyleCompressed(root, titleArea, true);
    } else {
        // expand a compressed element
        titleArea.style.cursor = "zoom-out";
        applyDisplayStyleCompressed(root, titleArea, false);
    }

}
