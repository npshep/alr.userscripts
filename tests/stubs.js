///////////////////////////////////////////////////////////////////////////////
// API stubs for executing unit tests.
//
// Copyright (c) 2026 Nicholas Paul Sheppard. See README.md for details
//
// Buy me a Ko-Fi at https://ko-fi.com/npsheppard.
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// GM_getValue / GM_setValue emulation
//
///////////////////////////////////////////////////////////////////////////////
let GM_values = { };
function GM_getValue(key, defaultValue) {
    return (key in GM_values) ? GM_values[key] : defaultValue;
}
function GM_clearValues() {
    for (let key of Object.keys(GM_values)) {
        delete GM_values[key];
    }
}
function GM_setValue(key, value) {
    GM_values[key] = value;
}


///////////////////////////////////////////////////////////////////////////////
// MutationObserver emulation, adapted from Github Copilot.
//
///////////////////////////////////////////////////////////////////////////////
class MockMutationObserver {
    constructor(callback) {
        this.callback = callback;
        this.observed = false;
        this.lastArgs = null;
        this.disconnected = false;
      }
    observe(target, opts) {
        this.observed = true;
        this.lastArgs = { target, opts };
    }
    disconnect() {
        this.disconnected = true;
    }
    trigger(mutations) {
        if (this.callback) this.callback(mutations);
     }
}
