import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./lib/server.mjs";
import { discoverRoutes } from "./lib/routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const BREAKPOINTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

// Reads the token list straight out of app/globals.css so this check
// can never drift from the tokens actually in use.
function extractTokens() {
  const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
  const colors = {};
  const sizes = {};

  for (const m of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    colors[m[1]] = m[2];
  }
  for (const m of css.matchAll(/--text-([\w-]+):\s*([\d.]+)rem\s*;/g)) {
    sizes[m[1]] = parseFloat(m[2]);
  }

  return { colors, sizes };
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

async function checkRoute(browser, baseUrl, route, allowedColors, remSizes, report) {
  for (const bp of BREAKPOINTS) {
    const page = await browser.newPage({
      viewport: { width: bp.width, height: bp.height },
    });
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto(baseUrl + route, { waitUntil: "networkidle" });

    const rootFontSize = await page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    const allowedSizesPx = remSizes.map((rem) => Math.round(rem * rootFontSize));

    const violations = await page.evaluate(
      ({ allowedColors, allowedSizesPx }) => {
        const allowedSizeSet = new Set(allowedSizesPx);
        const results = { colors: [], sizes: [], overflow: [] };
        const sides = ["Top", "Right", "Bottom", "Left"];

        function label(el) {
          const id = el.id ? `#${el.id}` : "";
          const cls =
            typeof el.className === "string" && el.className.trim()
              ? "." + el.className.trim().split(/\s+/).join(".")
              : "";
          return el.tagName.toLowerCase() + id + cls;
        }

        function isColorAllowed(val) {
          return (
            !val ||
            val === "rgba(0, 0, 0, 0)" ||
            val === "transparent" ||
            allowedColors.includes(val)
          );
        }

        const els = [document.body, ...document.body.querySelectorAll("*")];
        for (const el of els) {
          const cs = getComputedStyle(el);
          if (cs.display === "none") continue;
          const tag = label(el);

          if (!isColorAllowed(cs.color)) {
            results.colors.push(`${tag} — color: ${cs.color}`);
          }
          if (!isColorAllowed(cs.backgroundColor)) {
            results.colors.push(`${tag} — background-color: ${cs.backgroundColor}`);
          }
          for (const side of sides) {
            const width = parseFloat(cs[`border${side}Width`]);
            const color = cs[`border${side}Color`];
            if (width > 0 && !isColorAllowed(color)) {
              results.colors.push(`${tag} — border-${side.toLowerCase()}-color: ${color}`);
            }
          }

          const hasDirectText = Array.from(el.childNodes).some(
            (n) => n.nodeType === 3 && n.textContent.trim(),
          );
          if (hasDirectText) {
            const fs = Math.round(parseFloat(cs.fontSize));
            if (!allowedSizeSet.has(fs)) {
              results.sizes.push(`${tag} — font-size: ${cs.fontSize}`);
            }
          }

          const parent = el.parentElement;
          if (parent && getComputedStyle(parent).overflow === "visible") {
            const pos = cs.position;
            if (pos !== "fixed" && pos !== "sticky") {
              const r = el.getBoundingClientRect();
              const pr = parent.getBoundingClientRect();
              const EPS = 1;
              if (r.right > pr.right + EPS || r.bottom > pr.bottom + EPS) {
                results.overflow.push(`${tag} overflows parent <${parent.tagName.toLowerCase()}>`);
              }
            }
          }
        }
        return results;
      },
      { allowedColors, allowedSizesPx },
    );

    report.push({ route, breakpoint: bp.name, violations, consoleErrors });
    await page.close();
  }
}

function printReport(report) {
  let total = 0;
  for (const { route, breakpoint, violations, consoleErrors } of report) {
    const issues = [
      ...violations.colors.map((v) => `color:    ${v}`),
      ...violations.sizes.map((v) => `size:     ${v}`),
      ...violations.overflow.map((v) => `overflow: ${v}`),
      ...consoleErrors.map((v) => `console:  ${v}`),
    ];
    total += issues.length;
    const status = issues.length === 0 ? "PASS" : "FAIL";
    console.log(`\n${status}  ${route} @ ${breakpoint}px`);
    for (const issue of issues) console.log(`  - ${issue}`);
  }
  console.log(
    `\n${total === 0 ? "✓" : "✗"} ${total} violation(s) across ${report.length} route/breakpoint check(s)\n`,
  );
  return total === 0;
}

async function main() {
  const tokens = extractTokens();
  const allowedColors = Object.values(tokens.colors).map(hexToRgb);
  const remSizes = Object.values(tokens.sizes);
  const routes = discoverRoutes(path.join(root, "app"));

  console.log(`Routes: ${routes.join(", ")}`);
  console.log(`Token colors: ${Object.keys(tokens.colors).join(", ")}`);
  console.log(`Token sizes: ${Object.keys(tokens.sizes).join(", ")}`);

  const server = await startServer();
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const route of routes) {
      await checkRoute(browser, server.url, route, allowedColors, remSizes, report);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const ok = printReport(report);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
