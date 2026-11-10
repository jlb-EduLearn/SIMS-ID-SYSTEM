# SIMS Scanner APK packages

## Native app (recommended)

`dist/sims-scanner.apk` / `dist/sims-scanner-native.apk` is a **Capacitor native Android app** (not a website link).

Landscape UI:
- **Left:** QR camera
- **Right:** school logo → student photo/details for 5 seconds after scan

Source: `packages/scanner-native`

### Install

1. Download [sims-scanner.apk](./dist/sims-scanner.apk)  
   or https://sims-id-system-drab.vercel.app/downloads/sims-scanner.apk
2. Allow **Install unknown apps**
3. Open the APK → **SIMS Scanner**
4. Sign in with a scanner username (e.g. `age-scanner1`)

### Rebuild native APK

```bash
cd packages/scanner-native
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
npm run apk:copy
```

## Older TWA zip

`sims-scanner-android.zip` may still contain a Play Store AAB from the earlier web-wrapper package. Prefer the native APK above for tablets.
