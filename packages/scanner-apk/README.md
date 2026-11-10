# SIMS Scanner Android package

Android APK/AAB for the tablet scanner station (Trusted Web Activity wrapping the live PWA).

## Install on a tablet

1. Download [`dist/sims-scanner.apk`](./dist/sims-scanner.apk)  
   or open: `https://sims-id-system-drab.vercel.app/downloads/sims-scanner.apk`
2. On the tablet, allow **Install unknown apps** for your file manager/browser.
3. Open the APK and install **SIMS Scan**.
4. Launch the app → sign in with a scanner account.

Package id: `com.edulearn.simsscanner`

## Files

| File | Purpose |
|------|---------|
| `dist/sims-scanner.apk` | Install on tablets (sideload) |
| `dist/sims-scanner.aab` | Google Play upload (optional) |
| `dist/assetlinks.json` | Digital Asset Links (also published at `/.well-known/assetlinks.json`) |
| `sims-scanner-android.zip` | APK + AAB + assetlinks |
| `secrets/` | Signing keystore (gitignored — keep private) |

## Regenerate

```bash
node packages/scanner-apk/generate.mjs
```

Requires network access to PWABuilder CloudAPK and the live Vercel scanner URL.
