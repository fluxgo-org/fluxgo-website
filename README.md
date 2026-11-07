# Fluxgo public website

This repository contains the Fluxgo public website, built with Next.js.

## Structure

- `app/(site)/` holds the public pages: home, `/support`, and `/privacy-terms`. They share `app/(site)/site.css` and the parts in `app/(site)/_components/`. All public styles sit under the `.fx` root class.
- The public pages use SVG and CSS for all visuals. Colors mirror `fluxgo-frontend/src/constants/tokens.json`.

## Local development

Install the dependencies, then start the development server.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Vercel

Import `fluxgo-org/fluxgo-website` into Vercel.

- Framework preset: Next.js
- Root directory: `./`
- Build command: automatic
- Output directory: automatic
- Install command: automatic

Vercel detects Next.js from `package.json`. Add `fluxgo.in` as the custom domain after the first deployment.

## Admin portal

The portal is a separate private app on Railway. Its address stays `https://www.fluxgo.in/admin-portal`. `next.config.mjs` forwards `/admin-portal`, `/admin-portal-assets/*`, `/admin/*`, and `/admin-sw.js` to `ADMIN_PORTAL_ORIGIN`. Set that variable in Vercel. A change needs a new deploy.

## Shared ride links

`/ride/:publicId` shows a public ride that a member shared from the app. It reads `GET /v1/public/trips/:publicId` and refreshes the data every 60 s. It has a per-ride preview image and `noindex`.

- `FLUXGO_API_URL`: API base for server fetches. Default `https://api.fluxgo.in`.
- `NEXT_PUBLIC_FLUXGO_OPEN_HOST_URL`: host for the "Open in app" button. Default `https://go.fluxgo.in`. It must be a different domain from the page, or iOS does not open the app.

`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` let the app open `/ride/*` and `/open/ride/*`. Serve them on `www.fluxgo.in` and `go.fluxgo.in` with no redirect. `/open/ride/:publicId` sends a visitor without the app to the App Store or Google Play. A computer goes to the web app. Ride pages show one button: open the app on a phone, or continue on the web on a computer.
