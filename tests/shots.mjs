import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { startServer } from "./lib/server.mjs";
import { discoverRoutes } from "./lib/routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "tests", "__shots__");

const WIDTHS = [1440, 1024, 768, 390];

function fileNameFor(route, width) {
  const slug = route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "-");
  return `${slug}@${width}.png`;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const routes = discoverRoutes(path.join(root, "app"));

  const server = await startServer();
  const browser = await chromium.launch();
  try {
    for (const route of routes) {
      const page = await browser.newPage();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(server.url + route, { waitUntil: "networkidle" });
        const file = path.join(outDir, fileNameFor(route, width));
        await page.screenshot({ path: file, fullPage: true });
        console.log(`saved ${path.relative(root, file)}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
