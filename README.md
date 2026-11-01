# Timers

A Progressive Web App with multiple countdown timers. Each timer starts, stops and resets separately.

To change the order of the timers, tap the order button in the header and drag the handle of a timer up or down.

To move all timers to a new phone, tap the backup button in the header and export the data to a JSON file. Import the file on the new phone to replace all timers there. The theme is not part of the backup.

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/timers/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
