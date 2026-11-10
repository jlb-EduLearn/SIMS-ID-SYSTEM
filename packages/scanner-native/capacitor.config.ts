import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.edulearn.simsscanner.offline",
  appName: "SIMS Scanner Offline",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b1220",
    },
  },
};

export default config;
