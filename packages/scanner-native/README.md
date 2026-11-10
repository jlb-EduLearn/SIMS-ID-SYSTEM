# SIMS Scanner (native Android)

Capacitor Android app — **not** a website wrapper.

Layout (landscape):
- **Left:** QR camera
- **Right:** school logo (switches to student photo/details for 5s after a scan)

## Build APK

```bash
cd packages/scanner-native
npm install
npm run apk:debug
npm run apk:copy
```

Output:
- `packages/scanner-apk/dist/sims-scanner-native.apk`
- `public/downloads/sims-scanner-native.apk`

API host defaults to `https://sims-id-system-drab.vercel.app` (`VITE_API_BASE` to override).
