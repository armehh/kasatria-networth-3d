# People Net Worth 3D

Live demo: https://armehh.github.io/kasatria-networth-3d/

A small page built for the Kasatria junior developer assignment. It signs you in with Google, reads a list of people from a Google Sheet and shows them as 3D tiles using Three.js (CSS3D), based on the periodic table demo.

## What it does

- Google sign-in, then the data is read from the sheet with the signed-in account
- Four layouts: Table (20x10), Sphere, Double Helix and Grid (5x4x10)
- Tile colour depends on net worth: red under $100K, orange from $100K to $200K, green above $200K
- Hover a tile to see the full net worth

## Run it locally

Opening index.html directly will not work, because the script uses ES modules and Google sign-in needs a real origin. Serve the folder instead:

    npx serve -l 8123

Then open http://localhost:8123. Make sure that address is listed under Authorized JavaScript origins for the OAuth client.

## Configuration

Everything is set in config.js:

- GOOGLE_CLIENT_ID: OAuth client ID (Web application) from Google Cloud
- SHEET_ID: the part of the sheet URL between /d/ and /edit
- SHEET_RANGE: tab name, Sheet1 here

The sheet is shared with lisa@kasatria.com as a viewer, and the OAuth app only asks for the spreadsheets.readonly scope.

## Files

- index.html, style.css, app.js, config.js: the page
- vendor/: Three.js, CSS3DRenderer, TrackballControls and tween.js, included so no CDN is needed
- data_clean.csv: the CSV that was imported into the sheet (two names with broken characters and a header with extra spaces were fixed)
- data.csv: same data, used only for the local preview when no client ID is set
- privacy.html: privacy policy page required by Google to publish the OAuth app

Profile photos load from static.kasatria.com. If one fails to load, the tile shows the person's initials.
