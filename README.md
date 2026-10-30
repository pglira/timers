# Timers

A Progressive Web App with multiple countdown timers. Each timer starts, stops and resets separately.

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
