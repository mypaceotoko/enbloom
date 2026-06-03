# Brand assets

ConnectBloom now uses the uploaded official horizontal logo PNG for primary brand placements.

## Header logo

- Official horizontal logo: `84D299F4-A688-480C-85F2-853E80F09F71.png`
- The app references this file from `src/config/brandAssets.ts` and renders it through `src/components/BrandLogo.tsx`.
- Use the manually uploaded PNG at this public-root path for the primary header/landing/login logo without renaming, moving, or processing the image in application changes.
- Keep the original image dimensions and avoid recompressing the PNG so the logo remains sharp on high-density displays.

## Legacy SVG assets

The older SVG files (`logo.svg`, `logo-light.svg`, `logo-dark.svg`, `logo-icon.svg`, and `icon.svg`) remain in `public/` for favicon/app-icon fallback and legacy references. Primary brand placements should use the official PNG above.

## App icons

- `favicon.ico`
- `icon.svg`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-512.png`

The web manifest is `site.webmanifest`; update its icon list if additional app icon sizes are introduced.
