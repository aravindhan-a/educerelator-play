# Rural build

Drop your existing offline-first PWA into this folder (index.html, sw.js,
app.js, manifest, icons, etc.) as-is.

The one change to make once it's in: point its level-loading code at
`../content/levels/*.json` and `../content/i18n/*.json` instead of any
content baked into its own JS, so rural and urban share the same source of
truth. The service worker should add those `content/` files to its cache
list so they still work offline.
