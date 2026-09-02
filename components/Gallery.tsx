import { readdirSync } from "node:fs";
import path from "node:path";
import { GalleryGrid } from "@/components/GalleryGrid";
import { Intro } from "@/components/Intro";

const SKETCHES_DIR = path.join(process.cwd(), "public", "sketches", "transparent");

// first four reordered 1,2,3,4 -> 3,1,2,4; anything added later stays sorted after
const FIRST_FOUR_ORDER = [2, 0, 1, 3];

function getSketches() {
  const files = readdirSync(SKETCHES_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();
  const firstFour = FIRST_FOUR_ORDER.map((i) => files[i]).filter(Boolean);
  const rest = files.slice(4);
  return [...firstFour, ...rest].map((f) => `/sketches/transparent/${f}`);
}

export function Gallery() {
  const sketches = getSketches();

  return (
    <div>
      <Intro />
      <GalleryGrid sketches={sketches} />
    </div>
  );
}
