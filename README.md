# Fluxgo public website

This repository contains the Fluxgo public website and the admin portal, built with Next.js.

## Structure

- `app/(site)/` holds the public pages: home, `/support`, and `/privacy-terms`. They share `app/(site)/site.css` and the parts in `app/(site)/_components/`. All public styles sit under the `.fx` root class.
- `app/admin-portal/` holds the operations console. Its styles are in `app/admin-portal/admin.css` and load only on that route.
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

Open `/admin-portal` to use the operations console.

The portal calls the backend admin routes with `credentials: include`. The
backend owns the session in an HttpOnly cookie. The browser does not store an
admin bearer token or password. Set `NEXT_PUBLIC_FLUXGO_API_URL` to the
approved API origin, such as `http://127.0.0.1:3000` for local development or
the deployed API origin for the hosted website.

The console has a Today page (work that needs an admin, 7-day trends), a support
inbox with owners, internal notes, and templates, and tables for members, rides,
bookings, safety reports, manual vehicles, and the audit log. Tables support
column resize, column visibility, server sorting, advanced filters, quick views,
and CSV export. Record panels link members, rides, bookings, and tickets. Admins
can suspend or reactivate members, cancel published rides, and send
notifications. Admins sign in with email only.

The portal does not poll each view. It checks `GET /v1/admin/dashboard/pulse`
every 60 s (15 s in an open support chat), pauses while the tab is hidden or
after 10 min without input, and reloads only views whose data changed.

The portal is an installable web app (`public/admin/manifest.webmanifest`, scope `/admin-portal`). `public/admin-sw.js` only shows admin push notifications and opens the linked page on tap; it does not cache pages or data. Turn notifications on per device in the sidebar under Notifications. On iPhone, push works only after Safari **Add to Home Screen** (iOS 16.4+).

For a local preview with made-up data, run `npm run dev:admin-mock` and start
`next dev` with `NEXT_PUBLIC_FLUXGO_API_URL=http://localhost:4010`. Sign in with
`preview@fluxgo.in` and `preview-password`. The mock uses no real data.

The reset form accepts the one-time code from the admin email. It also accepts
`resetToken` in the URL query for a future email-link template.

## Shared ride links

`/ride/:publicId` shows a public ride that a member shared from the app. It reads `GET /v1/public/trips/:publicId` and refreshes the data every 60 s. It has a per-ride preview image and `noindex`.

- `FLUXGO_API_URL`: API base for server fetches. Default `https://api.fluxgo.in`.
- `NEXT_PUBLIC_FLUXGO_OPEN_HOST_URL`: host for the "Open in app" button. Default `https://go.fluxgo.in`. It must be a different domain from the page, or iOS does not open the app.

`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` let the app open `/ride/*` and `/open/ride/*`. Serve them on `www.fluxgo.in` and `go.fluxgo.in` with no redirect. `/open/ride/:publicId` sends a visitor without the app to the App Store or Google Play. A computer goes to the web app. Ride pages show one button: open the app on a phone, or continue on the web on a computer.
