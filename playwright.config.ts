import { defineConfig, devices } from "@playwright/test";
const database = process.env.TEST_DATABASE_URL;
if (!database) throw new Error("TEST_DATABASE_URL must point to a local disposable finance_tracker_test database");
const parsed = new URL(database);
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || parsed.pathname !== "/finance_tracker_test") throw new Error("Unsafe UI test database");
const baseURL = process.env.UI_TEST_BASE_URL ?? "http://127.0.0.1:3107";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL)) throw new Error("UI tests only target a local preview");
export default defineConfig({
  testDir: "tests/ui", fullyParallel: false, workers: 1, timeout: 45000,
  expect: { timeout: 10000 }, reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, timezoneId: "Asia/Ho_Chi_Minh", viewport: { width: 393, height: 852 }, trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["iPhone 15 Pro"], viewport: { width: 393, height: 852 }, defaultBrowserType: "chromium" } },
    { name: "webkit", use: { ...devices["iPhone 15 Pro"], viewport: { width: 393, height: 852 } } }
  ],
  webServer: { command: "npm run dev -- --hostname 127.0.0.1 --port 3107", url: baseURL + "/login", reuseExistingServer: !!process.env.UI_TEST_BASE_URL,
    env: { DATABASE_URL: database, GLASS_UI_ENABLED: "true", APP_ORIGINS: baseURL }, timeout: 120000 }
});
