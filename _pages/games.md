---
layout: page
permalink: /games/
title: games
description: "athenian paths"
nav: true
nav_order: 1
---

<style>
  /* nav keeps the short "games" label, but the page itself only needs one heading —
     hide the auto title and let the description read as it */
  .post-header .post-title {
    display: none;
  }
  .post-header .post-description {
    font-size: 1.75rem;
    font-weight: 400;
    color: var(--global-text-color);
  }
  #zippath {
    --dot: var(--global-theme-color);
  }
  #zippath .zp-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }
  #zippath .zp-btn {
    font-family: inherit;
    font-size: 0.85rem;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--global-divider-color);
    background: transparent;
    color: var(--global-text-color);
    cursor: pointer;
  }
  #zippath .zp-btn:hover {
    border-color: var(--dot);
    color: var(--dot);
  }
  #zippath .zp-scroll {
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }
  #zippath .zp-grid {
    position: relative;
    margin: 0 auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  #zippath .zp-cell.zp-lit {
    animation: zp-cell-glow 0.5s ease-in-out;
  }
  @keyframes zp-cell-glow {
    0% {
      box-shadow: 0 0 0 0 transparent;
    }
    50% {
      box-shadow: 0 0 8px 1px var(--dot);
      box-shadow: 0 0 8px 1px color-mix(in srgb, var(--dot) 55%, transparent);
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
  #zippath .zp-cell {
    position: absolute;
    box-sizing: border-box;
    border-radius: 4px;
    background: var(--global-divider-color);
    border: 1px solid var(--global-divider-color);
    transition: background-color 0.35s ease;
  }
  #zippath .zp-cell.zp-filled {
    background-color: var(--dot);
    border-color: var(--dot);
  }
  @media (hover: hover) and (pointer: fine) {
    #zippath .zp-cell:hover {
      box-shadow: inset 0 0 0 2px var(--dot);
    }
  }
  #zippath .zp-path-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  #zippath .zp-path-svg.zp-fading {
    opacity: 0;
  }
  #zippath .zp-path-svg path {
    stroke: var(--dot);
    transition: stroke-dashoffset 0.18s ease-out;
  }
  #zippath .zp-path-svg rect {
    fill: var(--dot);
  }
  #zippath .zp-path-svg .zp-eye,
  #zippath .zp-path-svg .zp-pupil {
    transition: cx 0.18s ease-out, cy 0.18s ease-out;
  }
  #zippath .zp-path-svg .zp-eye {
    fill: var(--global-bg-color);
  }
  #zippath .zp-path-svg .zp-pupil {
    fill: var(--global-text-color);
  }
  #zippath .zp-share-wrap {
    position: relative;
    display: inline-flex;
  }
  #zippath .zp-copied {
    position: absolute;
    bottom: 100%;
    left: 50%;
    margin-bottom: 6px;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    border: 1px solid var(--global-divider-color);
    background: var(--global-bg-color);
    font-size: 0.75rem;
    color: var(--dot);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  #zippath .zp-copied.zp-show {
    opacity: 1;
    transform: translate(-50%, 0);
  }
</style>

{% include custom-style.html %}

<div id="zippath">
  <div class="zp-controls">
    <button class="zp-btn" id="zp-new" type="button">new puzzle</button>
    <div class="zp-share-wrap">
      <button class="zp-btn" id="zp-share" type="button">share</button>
      <span class="zp-copied" id="zp-copied"></span>
    </div>
  </div>
  <div class="zp-scroll">
    <div class="zp-grid" id="zp-grid"></div>
  </div>
</div>

<script>
(function () {
  "use strict";

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
      return window.crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Math.floor(Math.random() * 4294967296);
  }

  function key(x, y) {
    return x + "," + y;
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function neighborIds(id, W, H) {
    var x = id % W,
      y = (id - x) / W;
    var r = [];
    if (x + 1 < W) r.push(id + 1);
    if (x - 1 >= 0) r.push(id - 1);
    if (y + 1 < H) r.push(id + W);
    if (y - 1 >= 0) r.push(id - W);
    return r;
  }

  function idToXY(id, W) {
    var x = id % W;
    return [x, (id - x) / W];
  }

  // --- Generation: a single self-avoiding walk IS both the shape and its solution path,
  // so a Hamiltonian path always exists by construction — no separate existence search,
  // no backtracking blow-up, no fallback shape ever needed. ---

  // MAX_BOARD_W bounds the walk's own width AND the final width after a forced
  // tail is grown on (the tail can extend the shape in any direction, including
  // sideways) — both need to respect it, or a board can end up wider than fits
  // a phone screen without shrinking cells past comfortable.
  var MAX_BOARD_W = 9;

  // Earlier versions actively avoided the walk touching its own trail, aiming for thin
  // 1-wide corridors on the theory that fewer alternate routes = harder. In practice a
  // thin corridor is mechanically EASY regardless of solution count — there's rarely a
  // real fork, so you just follow it. Real difficulty in this genre comes from open,
  // contiguous space: a careless early move can quietly seal off part of the board,
  // so covering it correctly takes actual planning. So: plain unbiased random walk,
  // no corridor-avoidance, no shortcut logic — just let it wander through open space.
  function attemptWalk(rng) {
    // both W and H are capped fairly tight — W so the board always fits phone
    // width without horizontal scroll, H so the whole page (nav, heading,
    // controls, board, socials) fits one mobile screen without vertical scroll
    var W = MAX_BOARD_W - 2 + Math.floor(rng() * 3);
    var H = 6 + Math.floor(rng() * 3);
    var visited = new Uint8Array(W * H);
    var startId = Math.floor(rng() * W) + Math.floor(rng() * H) * W;
    visited[startId] = 1;
    var path = [startId];
    var current = startId;
    while (true) {
      if (path.length >= 55) break;
      var raw = neighborIds(current, W, H);
      var cands = [];
      for (var i = 0; i < raw.length; i++) if (!visited[raw[i]]) cands.push(raw[i]);
      if (cands.length === 0) break;
      shuffle(cands, rng);
      current = cands[0];
      visited[current] = 1;
      path.push(current);
    }
    return { path: path, W: W, H: H };
  }

  // convert the walk's ids to x,y — no cropping yet, since a forced-ending
  // tail (grown below) can extend past the walk's own bounding box
  function walkToPuzzle(walk) {
    var W = walk.W;
    var xyPath = walk.path.map(function (id) {
      return idToXY(id, W);
    });
    var region = new Set();
    xyPath.forEach(function (xy) {
      region.add(key(xy[0], xy[1]));
    });
    return { region: region, path: xyPath, W: W, H: walk.H };
  }

  // crop to the shape's actual occupied extent — the bounding box can include
  // empty rows/columns nothing ever reached, which otherwise renders as dead space
  function cropPuzzle(puzzle) {
    var minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    puzzle.path.forEach(function (xy) {
      if (xy[0] < minX) minX = xy[0];
      if (xy[0] > maxX) maxX = xy[0];
      if (xy[1] < minY) minY = xy[1];
      if (xy[1] > maxY) maxY = xy[1];
    });
    var path = puzzle.path.map(function (xy) {
      return [xy[0] - minX, xy[1] - minY];
    });
    var region = new Set();
    path.forEach(function (xy) {
      region.add(key(xy[0], xy[1]));
    });
    return { region: region, path: path, W: maxX - minX + 1, H: maxY - minY + 1 };
  }

  // light sanity floor — reject only the rare unlucky roll that happens to come out
  // thin/corridor-like by chance, not a difficulty lever in itself
  function avgDegree(puzzle) {
    var total = 0;
    puzzle.region.forEach(function (k) {
      var parts = k.split(",");
      var x = parseInt(parts[0], 10),
        y = parseInt(parts[1], 10);
      var nbrs = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      nbrs.forEach(function (n) {
        if (puzzle.region.has(key(n[0], n[1]))) total++;
      });
    });
    return total / puzzle.region.size;
  }

  // global coverage can look fine on average while one side of the shape is
  // dense/tricky and the other is sparse/thin — split the bounding box into
  // quadrants and require every quadrant to carry a reasonable share, so
  // difficulty doesn't collapse to "one clear path" the moment you cross to
  // the sparser half
  function minBlockCoverage(puzzle) {
    var W = puzzle.W,
      H = puzzle.H;
    var midX = Math.ceil(W / 2),
      midY = Math.ceil(H / 2);
    var blocks = [
      { x0: 0, x1: midX, y0: 0, y1: midY },
      { x0: midX, x1: W, y0: 0, y1: midY },
      { x0: 0, x1: midX, y0: midY, y1: H },
      { x0: midX, x1: W, y0: midY, y1: H },
    ];
    var minCov = Infinity;
    blocks.forEach(function (b) {
      var area = (b.x1 - b.x0) * (b.y1 - b.y0);
      if (area <= 0) return;
      var count = 0;
      for (var x = b.x0; x < b.x1; x++) {
        for (var y = b.y0; y < b.y1; y++) {
          if (puzzle.region.has(key(x, y))) count++;
        }
      }
      var cov = count / area;
      if (cov < minCov) minCov = cov;
    });
    return minCov;
  }

  // A cell with exactly one open neighbor can ONLY ever be a path endpoint —
  // that's a hard constraint on every possible solution, not just the one we
  // generated (unlike checking degree on wherever the walk happened to stop,
  // which only describes our own reference path, not what the player can do).
  // The walk itself can never naturally land on such a cell — its landing
  // spot always has every one of its in-grid neighbors already visited, so
  // its degree is however many neighbor positions the grid gives it (always
  // >=2). To get a real degree-1 cell we grow one on purpose: starting from
  // the walk's own last cell, extend 1-wide into space outside the walk's
  // box, where the new cells genuinely don't touch anything but their own
  // chain. This can only work if that last cell has a free direction to
  // extend into (an interior endpoint has none) — when it doesn't, this
  // candidate is skipped and generation just tries another walk.
  function growForcedTail(region, endCell, rng, tailLen) {
    function neighborsXY(x, y) {
      return [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
    }
    var tail = [];
    var prev = endCell;
    var freeDirs = neighborsXY(endCell[0], endCell[1]).filter(function (n) {
      return !region.has(key(n[0], n[1]));
    });
    if (freeDirs.length === 0) return null;
    shuffle(freeDirs, rng);
    var cur = freeDirs[0];

    for (var i = 0; i < tailLen; i++) {
      var ok = true;
      neighborsXY(cur[0], cur[1]).forEach(function (n) {
        if (!(n[0] === prev[0] && n[1] === prev[1]) && region.has(key(n[0], n[1]))) ok = false;
      });
      if (!ok) break;
      tail.push(cur);
      region.add(key(cur[0], cur[1]));
      var nbrs = neighborsXY(cur[0], cur[1]).filter(function (n) {
        return !(n[0] === prev[0] && n[1] === prev[1]) && !region.has(key(n[0], n[1]));
      });
      if (nbrs.length === 0) break;
      shuffle(nbrs, rng);
      prev = cur;
      cur = nbrs[0];
    }
    return tail.length >= 2 ? tail : null;
  }

  function generatePuzzle(seed) {
    var rng = mulberry32(seed);
    var best = null;
    for (var attempts = 0; attempts < 600; attempts++) {
      var walk = attemptWalk(rng);
      if (walk.path.length < 28) continue;
      var candidate = walkToPuzzle(walk);
      // coverage too close to 1 means the shape is basically a solid rectangle,
      // which a plain up-and-down sweep solves regardless of size — genuine holes
      // throughout are what actually defeats a mechanical row-by-row scan
      var coverage = candidate.region.size / (candidate.W * candidate.H);
      if (avgDegree(candidate) >= 2.6 && coverage <= 0.65 && minBlockCoverage(candidate) >= 0.25) {
        var endCell = candidate.path[candidate.path.length - 1];
        var tail = growForcedTail(candidate.region, endCell, rng, 2 + Math.floor(rng() * 2));
        if (tail) {
          candidate.path = candidate.path.concat(tail);
          var withTail = cropPuzzle(candidate);
          // the tail can grow sideways, pushing width past the phone-fit cap —
          // only accept if it's still within bounds, otherwise keep searching
          if (withTail.W <= MAX_BOARD_W) return withTail;
        }
      }
      if (!best || candidate.region.size > best.region.size) best = cropPuzzle(candidate);
    }
    if (best && rng() < 0.5) best.path = best.path.slice().reverse();
    return best;
  }

  // --- Per-tab cache: a shared seed regenerates instantly instead of re-running the walk ---

  function cacheKeyFor(seed) {
    return "zp-puzzle-" + seed;
  }

  function loadFromCache(seed) {
    try {
      var raw = sessionStorage.getItem(cacheKeyFor(seed));
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return { region: new Set(obj.region), path: obj.path, W: obj.W, H: obj.H };
    } catch (e) {
      return null;
    }
  }

  function saveToCache(seed, result) {
    try {
      sessionStorage.setItem(
        cacheKeyFor(seed),
        JSON.stringify({
          region: Array.from(result.region),
          path: result.path,
          W: result.W,
          H: result.H,
        })
      );
    } catch (e) {
      /* sessionStorage unavailable or full: caching is a pure optimization, safe to skip */
    }
  }

  // --- Rendering ---

  var CELL_MAX = 38,
    GAP = 7;

  var state = {
    region: null,
    W: 0,
    H: 0,
    playerPath: [],
    cellSize: CELL_MAX,
    animating: false,
  };

  var cellEls = {};

  var els = {
    grid: document.getElementById("zp-grid"),
    newBtn: document.getElementById("zp-new"),
    shareBtn: document.getElementById("zp-share"),
    copied: document.getElementById("zp-copied"),
  };

  function seedFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var s = params.get("zp");
    if (!s) return null;
    var n = parseInt(s, 36);
    return isNaN(n) ? null : n >>> 0;
  }

  function setUrlSeed(seed) {
    var params = new URLSearchParams(window.location.search);
    params.set("zp", seed.toString(36));
    var newUrl = window.location.pathname + "?" + params.toString();
    window.history.replaceState(null, "", newUrl);
  }

  function computeCellSize() {
    var wrapperWidth = els.grid.parentElement.clientWidth || 600;
    var maxByWidth = Math.floor((wrapperWidth - (state.W - 1) * GAP) / state.W);
    // always fit the container exactly — no forced minimum, so the board can
    // never need horizontal scrolling on any screen width
    state.cellSize = Math.max(1, Math.min(CELL_MAX, maxByWidth));
  }

  function pos(x, y) {
    var step = state.cellSize + GAP;
    return { left: x * step, top: y * step };
  }

  // builds a smooth path with small rounded ("squircle") corners instead of sharp
  // miter joins or a fully circular pill — corners are real quarter-circle-ish
  // fillets, not just a stroke-linejoin setting
  function roundedPathD(pts, radius) {
    if (pts.length < 2) return "";
    if (pts.length === 2) {
      return "M" + pts[0][0] + "," + pts[0][1] + " L" + pts[1][0] + "," + pts[1][1];
    }
    function dist(a, b) {
      return Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    function lerp(a, b, t) {
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    var d = "M" + pts[0][0] + "," + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var prev = pts[i - 1],
        cur = pts[i],
        next = pts[i + 1];
      var dPrev = dist(prev, cur),
        dNext = dist(cur, next);
      var r = Math.min(radius, dPrev / 2, dNext / 2);
      var before = lerp(prev, cur, dPrev === 0 ? 0 : 1 - r / dPrev);
      var after = lerp(cur, next, dNext === 0 ? 0 : r / dNext);
      d += " L" + before[0] + "," + before[1];
      d += " Q" + cur[0] + "," + cur[1] + " " + after[0] + "," + after[1];
    }
    d += " L" + pts[pts.length - 1][0] + "," + pts[pts.length - 1][1];
    return d;
  }

  // The path SVG is created once and its elements' attributes are updated in place
  // on every drag step, instead of destroying/rebuilding the whole board each time —
  // that full-DOM-rebuild-per-pointermove was the real cause of choppy dragging.
  var SVGNS = "http://www.w3.org/2000/svg";
  var svgRoot = null,
    svgPathEl = null,
    svgStartRectEl = null,
    svgEyeEls = null,
    svgPupilEls = null;

  function ensurePathSvg(gridW, gridH) {
    if (!svgRoot) {
      svgRoot = document.createElementNS(SVGNS, "svg");
      svgRoot.setAttribute("class", "zp-path-svg");
      svgPathEl = document.createElementNS(SVGNS, "path");
      svgPathEl.setAttribute("fill", "none");
      svgPathEl.setAttribute("stroke-linecap", "round");
      svgPathEl.setAttribute("stroke-linejoin", "round");
      svgStartRectEl = document.createElementNS(SVGNS, "rect");
      svgEyeEls = [document.createElementNS(SVGNS, "circle"), document.createElementNS(SVGNS, "circle")];
      svgEyeEls[0].setAttribute("class", "zp-eye");
      svgEyeEls[1].setAttribute("class", "zp-eye");
      svgPupilEls = [document.createElementNS(SVGNS, "circle"), document.createElementNS(SVGNS, "circle")];
      svgPupilEls[0].setAttribute("class", "zp-pupil");
      svgPupilEls[1].setAttribute("class", "zp-pupil");
      svgRoot.appendChild(svgPathEl);
      svgRoot.appendChild(svgStartRectEl);
      svgRoot.appendChild(svgEyeEls[0]);
      svgRoot.appendChild(svgEyeEls[1]);
      svgRoot.appendChild(svgPupilEls[0]);
      svgRoot.appendChild(svgPupilEls[1]);
    }
    svgRoot.setAttribute("width", gridW);
    svgRoot.setAttribute("height", gridH);
    svgRoot.classList.remove("zp-fading");
  }

  // rebuilds the cell grid — only needed when the puzzle or cell size changes,
  // never on every drag step
  function buildBoard() {
    computeCellSize();
    var step = state.cellSize + GAP;
    var gridW = state.W * step - GAP;
    var gridH = state.H * step - GAP;
    els.grid.style.width = gridW + "px";
    els.grid.style.height = gridH + "px";

    var oldCells = els.grid.querySelectorAll(".zp-cell");
    for (var i = 0; i < oldCells.length; i++) oldCells[i].remove();
    cellEls = {};

    state.region.forEach(function (k) {
      var parts = k.split(",");
      var x = parseInt(parts[0], 10),
        y = parseInt(parts[1], 10);
      var p = pos(x, y);
      var cell = document.createElement("div");
      cell.className = "zp-cell";
      cell.style.left = p.left + "px";
      cell.style.top = p.top + "px";
      cell.style.width = state.cellSize + "px";
      cell.style.height = state.cellSize + "px";
      cell.style.transitionDelay = "0ms";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cellEls[k] = cell;
      els.grid.appendChild(cell);
    });

    ensurePathSvg(gridW, gridH);
    els.grid.appendChild(svgRoot); // re-assert it as the topmost element, above the fresh cells

    renderPath(true);
  }

  // updates just the path/start-marker/eyes — called on every drag step.
  // Pass instant=true only when loading a puzzle (buildBoard): otherwise the eyes
  // would glide in from the PREVIOUS puzzle's last head position across the new board.
  function renderPath(instant) {
    var pts = state.playerPath.map(function (c) {
      var p = pos(c[0], c[1]);
      return [p.left + state.cellSize / 2, p.top + state.cellSize / 2];
    });
    var strokeWidth = state.cellSize * 0.66;
    var cornerRadius = strokeWidth * 0.5;

    var oldD = svgPathEl.getAttribute("d") || "";
    var oldLength = 0;
    if (oldD) {
      try {
        oldLength = svgPathEl.getTotalLength();
      } catch (e) {
        oldLength = 0;
      }
    }

    var newD = roundedPathD(pts, cornerRadius);
    svgPathEl.setAttribute("d", newD);
    svgPathEl.setAttribute("stroke-width", strokeWidth);

    var newLength = 0;
    if (newD) {
      try {
        newLength = svgPathEl.getTotalLength();
      } catch (e) {
        newLength = 0;
      }
    }

    if (!instant && newLength > oldLength) {
      // reveal only the newly added bit — the already-drawn part stays put,
      // rather than the whole line snapping to its new full shape instantly
      svgPathEl.style.transitionProperty = "none";
      svgPathEl.style.strokeDasharray = newLength;
      svgPathEl.style.strokeDashoffset = newLength - oldLength;
      svgPathEl.getBoundingClientRect(); // force layout so the jump above isn't itself transitioned
      svgPathEl.style.transitionProperty = "";
      requestAnimationFrame(function () {
        svgPathEl.style.strokeDashoffset = 0;
      });
    } else {
      svgPathEl.style.strokeDasharray = "";
      svgPathEl.style.strokeDashoffset = "";
    }

    var startCx = pts[0][0],
      startCy = pts[0][1];
    var startSize = strokeWidth;
    svgStartRectEl.setAttribute("x", startCx - startSize / 2);
    svgStartRectEl.setAttribute("y", startCy - startSize / 2);
    svgStartRectEl.setAttribute("width", startSize);
    svgStartRectEl.setAttribute("height", startSize);
    svgStartRectEl.setAttribute("rx", startSize * 0.5);

    // wide cartoon eyes on the head end (the last point) — also makes it obvious
    // at a glance which end is the start (plain dot) vs. the moving head (face)
    var headPt = pts[pts.length - 1];
    var prevPt = pts.length >= 2 ? pts[pts.length - 2] : null;
    var dir = [1, 0];
    if (prevPt) {
      var ddx = headPt[0] - prevPt[0],
        ddy = headPt[1] - prevPt[1];
      var dlen = Math.hypot(ddx, ddy) || 1;
      dir = [ddx / dlen, ddy / dlen];
    }
    var perp = [-dir[1], dir[0]];
    var eyeSpread = strokeWidth * 0.28;
    var eyeForward = strokeWidth * 0.12;
    var eyeR = strokeWidth * 0.16;
    var pupilR = strokeWidth * 0.075;
    var pupilForward = strokeWidth * 0.05;
    var eye1 = [headPt[0] + perp[0] * eyeSpread + dir[0] * eyeForward, headPt[1] + perp[1] * eyeSpread + dir[1] * eyeForward];
    var eye2 = [headPt[0] - perp[0] * eyeSpread + dir[0] * eyeForward, headPt[1] - perp[1] * eyeSpread + dir[1] * eyeForward];
    var pupil1 = [eye1[0] + dir[0] * pupilForward, eye1[1] + dir[1] * pupilForward];
    var pupil2 = [eye2[0] + dir[0] * pupilForward, eye2[1] + dir[1] * pupilForward];

    var eyeNodes = [svgEyeEls[0], svgEyeEls[1], svgPupilEls[0], svgPupilEls[1]];
    if (instant) {
      eyeNodes.forEach(function (n) {
        n.style.transitionProperty = "none";
      });
    }
    svgEyeEls[0].setAttribute("cx", eye1[0]);
    svgEyeEls[0].setAttribute("cy", eye1[1]);
    svgEyeEls[0].setAttribute("r", eyeR);
    svgEyeEls[1].setAttribute("cx", eye2[0]);
    svgEyeEls[1].setAttribute("cy", eye2[1]);
    svgEyeEls[1].setAttribute("r", eyeR);
    svgPupilEls[0].setAttribute("cx", pupil1[0]);
    svgPupilEls[0].setAttribute("cy", pupil1[1]);
    svgPupilEls[0].setAttribute("r", pupilR);
    svgPupilEls[1].setAttribute("cx", pupil2[0]);
    svgPupilEls[1].setAttribute("cy", pupil2[1]);
    svgPupilEls[1].setAttribute("r", pupilR);
    if (instant) {
      svgEyeEls[0].getBoundingClientRect(); // force layout before re-enabling transitions
      eyeNodes.forEach(function (n) {
        n.style.transitionProperty = "";
      });
    }

    if (state.playerPath.length === state.region.size && !state.animating) {
      playWinAnimation();
    }
  }

  function playWinAnimation() {
    state.animating = true;
    var svg = els.grid.querySelector(".zp-path-svg");
    if (svg) svg.classList.add("zp-fading");

    // fill in the exact order the player drew it, not the generator's internal order
    var order = state.playerPath;
    var stagger = Math.max(10, Math.min(24, Math.floor(300 / order.length)));
    order.forEach(function (c, idx) {
      var cell = cellEls[key(c[0], c[1])];
      if (!cell) return;
      cell.style.transitionDelay = idx * stagger + "ms";
    });
    requestAnimationFrame(function () {
      order.forEach(function (c) {
        var cell = cellEls[key(c[0], c[1])];
        if (cell) cell.classList.add("zp-filled");
      });
    });

    var totalFillTime = order.length * stagger + 400;
    setTimeout(function () {
      // light up only the puzzle's own cells, never the bounding rectangle/holes
      order.forEach(function (c) {
        var cell = cellEls[key(c[0], c[1])];
        if (cell) cell.classList.add("zp-lit");
      });
      // stay on the solved board rather than auto-advancing — otherwise the URL
      // changes to a new puzzle before there's a chance to share the one just solved
      state.animating = false;
    }, totalFillTime);
  }

  function applyPuzzle(result) {
    state.region = result.region;
    state.W = result.W;
    state.H = result.H;
    state.playerPath = [result.path[0]];
    state.animating = false;
    buildBoard();
  }

  function loadPuzzle(seed) {
    setUrlSeed(seed);

    var cached = loadFromCache(seed);
    if (cached) {
      applyPuzzle(cached);
      return;
    }

    // generation is sub-millisecond, so this runs synchronously — no loading state needed
    var result = generatePuzzle(seed);
    saveToCache(seed, result);
    applyPuzzle(result);
  }

  function isAdjacent(a, b) {
    var dx = Math.abs(a[0] - b[0]),
      dy = Math.abs(a[1] - b[1]);
    return dx + dy === 1;
  }

  function findInPlayerPath(x, y) {
    for (var i = 0; i < state.playerPath.length; i++) {
      if (state.playerPath[i][0] === x && state.playerPath[i][1] === y) return i;
    }
    return -1;
  }

  function collectStraightRun(head, target) {
    if (head[0] === target[0] && head[1] === target[1]) return null;
    var cells = [];
    if (head[0] === target[0]) {
      var stepY = target[1] > head[1] ? 1 : -1;
      for (var y = head[1] + stepY; ; y += stepY) {
        if (!state.region.has(key(head[0], y))) return null;
        if (findInPlayerPath(head[0], y) !== -1) return null;
        cells.push([head[0], y]);
        if (y === target[1]) break;
      }
      return cells;
    }
    if (head[1] === target[1]) {
      var stepX = target[0] > head[0] ? 1 : -1;
      for (var x = head[0] + stepX; ; x += stepX) {
        if (!state.region.has(key(x, head[1]))) return null;
        if (findInPlayerPath(x, head[1]) !== -1) return null;
        cells.push([x, head[1]]);
        if (x === target[0]) break;
      }
      return cells;
    }
    return null;
  }

  var dragging = false;

  function cellFromPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    var cellEl = el.closest ? el.closest(".zp-cell") : null;
    if (!cellEl) return null;
    return [parseInt(cellEl.dataset.x, 10), parseInt(cellEl.dataset.y, 10)];
  }

  function handlePointerDown(e) {
    if (state.animating) return;
    var cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;

    var existingIdx = findInPlayerPath(cell[0], cell[1]);
    if (existingIdx !== -1) {
      state.playerPath = state.playerPath.slice(0, existingIdx + 1);
      dragging = true;
      renderPath();
      e.preventDefault();
      return;
    }

    var head = state.playerPath[state.playerPath.length - 1];
    var run = collectStraightRun(head, cell);
    if (run) {
      state.playerPath = state.playerPath.concat(run);
      dragging = true;
      renderPath();
      e.preventDefault();
    }
  }

  function handlePointerMove(e) {
    if (!dragging || state.animating) return;
    var cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    var head = state.playerPath[state.playerPath.length - 1];
    if (cell[0] === head[0] && cell[1] === head[1]) return;

    if (state.playerPath.length >= 2) {
      var second = state.playerPath[state.playerPath.length - 2];
      if (cell[0] === second[0] && cell[1] === second[1]) {
        state.playerPath.pop();
        renderPath();
        return;
      }
    }

    if (!isAdjacent(head, cell)) return;
    if (!state.region.has(key(cell[0], cell[1]))) return;
    if (findInPlayerPath(cell[0], cell[1]) !== -1) return;

    state.playerPath.push(cell);
    renderPath();
  }

  function handlePointerUp() {
    dragging = false;
  }

  els.grid.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);

  els.newBtn.addEventListener("click", function () {
    loadPuzzle(randomSeed());
  });

  var copiedTimer = null;
  function showCopied(msg) {
    els.copied.textContent = msg;
    els.copied.classList.add("zp-show");
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(function () {
      els.copied.classList.remove("zp-show");
    }, 1200);
  }

  els.shareBtn.addEventListener("click", function () {
    var url = window.location.href;
    function onCopied() {
      showCopied("link copied");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(onCopied, function () {
        fallbackCopy(url, onCopied);
      });
    } else {
      fallbackCopy(url, onCopied);
    }
  });

  function fallbackCopy(text, cb) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      cb();
    } catch (err) {
      showCopied("copy failed");
    }
    document.body.removeChild(ta);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildBoard, 100);
  });

  var initialSeed = seedFromUrl();
  if (initialSeed === null) initialSeed = randomSeed();
  loadPuzzle(initialSeed);
})();
</script>
