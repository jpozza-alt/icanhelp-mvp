import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const port = Number(process.env.PW_PORT || "3107");
const baseURL = `http://127.0.0.1:${port}`;

const outputDir =
  process.env.PW_OUTPUT_DIR ||
  path.join(os.tmpdir(), "icanhelp-playwright-results");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir,

  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  webServer: {
    command: `pnpm exec next dev --webpack --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,

    env: {
      ...process.env,

      // Ambiente deliberadamente ficticio para o smoke publico.
      // Impede o teste PW-01 de depender de Supabase real.
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test.invalid",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});