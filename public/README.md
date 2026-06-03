# Brand assets

ConnectBloom now uses the uploaded official horizontal logo PNG for primary brand placements.

## Header logo

- Official horizontal logo: `assets/brand/connectbloom-logo-horizontal.png`
- The app references this file from `src/config/brandAssets.ts` and renders it through `src/components/BrandLogo.tsx`.
- Replace this PNG at the same path to update the primary header/landing/login logo without changing application code.
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
