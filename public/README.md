# Brand assets

Replace these files to update ConnectBloom branding without changing application code.

## Header logo

- `logo.png` is the default raster logo path.
- `logo.svg` is preferred when present, then the app falls back to `logo.png`.
- Future variants can be added with matching names: `logo-light`, `logo-dark`, and `logo-icon` using `.svg` and/or `.png` extensions.

If none of the configured logo files are present, the header keeps using the built-in temporary flower mark and app-name text.

## App icons

- `favicon.ico`
- `icon.svg`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-512.png`

The web manifest is `site.webmanifest`; update its icon list if additional app icon sizes are introduced.
