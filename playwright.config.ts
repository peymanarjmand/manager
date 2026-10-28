import { defineConfig, devices } from "@playwright/test";
import { localConfig as cfg } from "./supabase/tests/local-config";
export default defineConfig({
  testDir: "./supabase/tests/e2e",
  timeout: 90000,
  workers: 1,
  use: {
    ...devices["Pixel 7"],
    channel: process.env.LM_TEST_BROWSER === "edge" ? "msedge" : "chrome",
    baseURL: "http://localhost:5177",
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host localhost --port 5177 --strictPort",
    url: "http://localhost:5177",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: cfg.ANON_KEY,
    },
  },
});
