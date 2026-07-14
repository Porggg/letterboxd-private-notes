# Letterboxd Private Notes
A Firefox add-on that lets you add private notes to any Letterboxd movie.

## Installation
For now, the add-on is not verified (coming soon), so you will need to:
- Download or clone the repo
- Go to `about:debugging#/runtime/this-firefox` on Firefox
- Click "Load Temporary Add-on"
- Select the `manifest.json` file

You need to repeat these steps every time you launch Firefox. The notes will not be saved.
These issues will be fixed once Firefox signs this add-on.

## Features
- Floating Notes button on `/film/<slug>/` and `/<username>/film/<slug>/` pages
- Widget only appears when a Letterboxd account is signed in
  (detection via the `letterboxd.signed.in.as` cookie set by Letterboxd)
- Notes are scoped to the signed-in account (`note:<username>:<slug>`)
  so multiple users sharing the same Firefox profile only see their own notes
- Text area with auto-save (500ms debounce)
- Popup showing all notes for the signed-in account, with search
- No data leaves the browser, no telemetry
