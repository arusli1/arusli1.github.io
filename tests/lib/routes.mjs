import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];

export function discoverRoutes(appDir) {
  const routes = [];

  function walk(dir, segments) {
    const entries = readdirSync(dir);
    if (PAGE_FILES.some((f) => entries.includes(f))) {
      const route = "/" + segments.filter(Boolean).join("/");
      routes.push(route);
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry === "api") continue;
      if (entry.startsWith("_")) continue;
      if (entry.startsWith("[")) continue; // dynamic segment — no params to fill in
      const isGroup = entry.startsWith("(") && entry.endsWith(")");
      walk(full, [...segments, isGroup ? "" : entry]);
    }
  }

  walk(appDir, []);
  return [...new Set(routes)].sort();
}
