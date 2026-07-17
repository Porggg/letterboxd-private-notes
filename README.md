# Letterboxd Private Notes

[![Latest release](https://img.shields.io/github/v/release/Porggg/letterboxd-private-notes)](https://github.com/Porggg/letterboxd-private-notes/releases/latest)
[![License: MIT](https://img.shields.io/github/license/Porggg/letterboxd-private-notes)](./LICENSE)
[![Firefox](https://img.shields.io/badge/firefox-142%2B-FF7139?logo=firefoxbrowser&logoColor=white)](https://www.mozilla.org/firefox/)
[![Mozilla signed](https://img.shields.io/badge/Mozilla-signed-1b9e77?logo=firefox&logoColor=white)](https://addons.mozilla.org/developers/)
 
A Firefox add-on that lets you add private notes to any Letterboxd movie.
If you ever wanted to write a personal review of a film without anyone
else seeing it, use this add-on.
 
Notes are stored **locally in your browser** — nothing is ever sent to a
server. No tracking, no telemetry, no data collection.

## Installation
### Recommended - Signed release
 
1. Go to the [**Releases**](https://github.com/Porggg/letterboxd-private-notes/releases/latest) page
2. Download `letterboxd-private-notes.xpi` from the latest release.
3. Open the downloaded file with Firefox and confirm the install.
 
### From source (development only)
 
Use this only if you want to inspect or modify the code. Notes will
**not** persist between Firefox restarts in this mode.
 
1. Clone this repo:
```bash
   git clone https://github.com/Porggg/letterboxd-private-notes.git
```
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Select the `manifest.json` file

You will have to do this each time you restart Firefox.

## Features
- Floating Notes button on `/film/<slug>/` and `/<username>/film/<slug>/` pages
- Widget only appears when a Letterboxd account is signed in
  (detection via the `letterboxd.signed.in.as` cookie set by Letterboxd)
- Notes are scoped to the signed-in account (`note:<username>:<slug>`)
  so multiple users sharing the same Firefox profile only see their own notes
- Text area with auto-save (500ms debounce)
- Popup showing all notes for the signed-in account, with search
- No data leaves the browser
