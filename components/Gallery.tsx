import { readdirSync } from "node:fs";
import path from "node:path";
import { Footer } from "@/components/Footer";
import { GalleryGrid, type Sketch } from "@/components/GalleryGrid";
import { Intro } from "@/components/Intro";

const SKETCHES_DIR = path.join(process.cwd(), "public", "sketches", "transparent");

// each sketch's own crop nudge + brightness correction, keyed by its position
// in the sorted file list (01,02,03,04) — independent of how rows group them
const SKETCH_STYLE = [
  { nudgeUp: "0%", brightness: "1.61" }, // 01
  { nudgeUp: "0%", brightness: "1.1" }, // 02
  { nudgeUp: "-3%", brightness: "1.35" }, // 03
  { nudgeUp: "-3.4%", brightness: "1.32" }, // 04
];

// the original single-row order (files 03,01,02,04 displayed as "1,2,3,4")
const DISPLAY_ORDER = [2, 0, 1, 3];

// two rows of two, referencing the display positions above: "3,2" then "4,1"
const ROWS = [
  [DISPLAY_ORDER[2], DISPLAY_ORDER[1]],
  [DISPLAY_ORDER[3], DISPLAY_ORDER[0]],
];

function getSketches(): Sketch[] {
  const files = readdirSync(SKETCHES_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();
  return files.map((f, i) => ({
    src: `/sketches/transparent/${f}`,
    nudgeUp: SKETCH_STYLE[i]?.nudgeUp ?? "0%",
    brightness: SKETCH_STYLE[i]?.brightness ?? "1",
  }));
}

function getRows(sketches: Sketch[]): Sketch[][] {
  const first = ROWS.map((row) => row.map((i) => sketches[i]).filter(Boolean));
  const rest = sketches.slice(4);
  const restRows: Sketch[][] = [];
  for (let i = 0; i < rest.length; i += 2) restRows.push(rest.slice(i, i + 2));
  return [...first, ...restRows];
}

export function Gallery() {
  const sketches = getSketches();
  const rows = getRows(sketches);

  return (
    <div>
      <GalleryGrid
        rows={rows}
        intros={[<Intro key="0" className="pb-4 pt-8" />, <Intro key="1" className="pb-2 pt-0" />]}
      />
      <Footer />
    </div>
  );
}
