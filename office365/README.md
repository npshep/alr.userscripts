A Little Office 365
===================

This folder contains a collection of userscripts that modify the behaviour and
layout of various sections of Microsoft Office 365. See the top of each script
for how to configure its behaviour.

- `moveapprail.js` moves Outlook's app rail from the left to either the header
   or footer region (where it was in previous versions of Outlook).
- `texteditorstatusbar.js` adds a status bar the OneDrive text editor.

I am not affiliated with Microsoft and all Microsoft trademarks remain the
property of Microsoft. Microsoft is free to change its site at any time in such
a way that these scripts no longer work.

Copyright (c) 2025-6 Nicholas Paul Sheppard (npsheppard@alittleresearch.com.au)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Buy me a Ko-Fi at https://ko-fi.com/npsheppard.

Known Bugs
==========

`moveapprail.js`
- the unpin action requires re-loading to take effect

`texteditorstatusbar.js`
- when the cursor is at the end of the line, the first press of the enter
  key is consumed by the (invisible) suggestions box, even when suggestions
  are turned off
