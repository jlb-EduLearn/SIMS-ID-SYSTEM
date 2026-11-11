import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sims.idscanner",
  appName: "SIMS Scanner Offline",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    // Android 15+ forces edge-to-edge for targetSdk 35; inset the WebView there too.
    adjustMarginsForEdgeToEdge: "auto",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b1220",
      // The plugin defaults to drawing the WebView behind the status bar, and
      // older Android WebViews report env(safe-area-inset-top) as 0 for it.
      overlaysWebView: false,
    },
  },
};

export default config;
