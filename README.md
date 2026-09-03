Personal site, served at [arusli1.github.io](https://arusli1.github.io/).

Next.js App Router, static export, deployed to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.

## Development

```bash
npm run dev     # dev server at localhost:3000
npm run check   # design-token + layout checks (tests/visual.mjs)
npm run shots   # save full-page screenshots per route/breakpoint
npm run lint
npm run build   # static export to out/
```

Design tokens (colors, type scale, spacing) live in `app/globals.css` — `npm run check` fails if a component uses a value outside that scale.
