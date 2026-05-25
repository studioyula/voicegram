var VibeRenderer = VibeRenderer || {};

/**
 * Mosaic — dense grid; pattern is driven by audio analysis (pools + hold),
 * not user-selected. Idle = neutral gray grid only.
 */
VibeRenderer.MosaicRenderer = (function () {
  var BASE_LONG = 44;
  /** ~BASE_LONG^2 cells; cols/rows ratio matches content aspect so each cell stays square in pixels. */
  function mosaicGridColsRows(aw, ah) {
    aw = aw > 0 ? aw : 1;
    ah = ah > 0 ? ah : 1;
    var ar = aw / ah;
    var cols = Math.max(12, Math.round(BASE_LONG * Math.sqrt(ar)));
    var rows = Math.max(12, Math.round(cols / ar));
    return { cols: cols, rows: rows };
  }
  var GAP_RATIO = 0.055;
  var BLUR_MIX = 0.14;
  var DISPLAY_LEVELS = 8;
  var PATTERN_HOLD_MS = 2400;
  var RISE_SMOOTH = 0.74;
  var FALL_SMOOTH = 0.94;
  var SILENT_PULL = 0.2;
  var SILENT_RETAIN = 0.8;

  var MOSAIC_PATTERN_POOLS = {
    quiet: [
      { main: "radial", sub: "concentricSquare" },
      { main: "radial", sub: "softCross" },
      { main: "offsetField", sub: "radial" },
      { main: "innerSquare", sub: "radial" },
      { main: "wideHBand", sub: "radial" },
      { main: "wideVBand", sub: "radial" },
      { main: "cornerField", sub: "radial" },
      { main: "outerSquare", sub: "radial" },
    ],

    low: [
      { main: "vBand", sub: "radial" },
      { main: "wideVBand", sub: "concentricSquare" },
      { main: "wideVBand", sub: "leftField" },
      { main: "vBand", sub: "innerSquare" },
      { main: "leftField", sub: "wideVBand" },
      { main: "rightField", sub: "wideVBand" },
      { main: "innerSquare", sub: "vBand" },
      { main: "outerSquare", sub: "vBand" },
    ],

    mid: [
      { main: "hBand", sub: "radial" },
      { main: "wideHBand", sub: "radial" },
      { main: "wideHBand", sub: "softCross" },
      { main: "hBand", sub: "innerSquare" },
      { main: "doubleBand", sub: "radial" },
      { main: "upperField", sub: "hBand" },
      { main: "lowerField", sub: "hBand" },
      { main: "softCross", sub: "wideHBand" },
      { main: "offsetField", sub: "hBand" },
    ],

    bright: [
      { main: "radial", sub: "diamond" },
      { main: "diamond", sub: "offsetField" },
      { main: "cornerField", sub: "diamond" },
      { main: "upperField", sub: "diamond" },
      { main: "rightField", sub: "diamond" },
      { main: "softCross", sub: "diamond" },
      { main: "innerSquare", sub: "diamond" },
      { main: "radial", sub: "cornerField" },
    ],

    dynamic: [
      { main: "cross", sub: "radial" },
      { main: "softCross", sub: "offsetField" },
      { main: "cross", sub: "innerSquare" },
      { main: "offsetField", sub: "cross" },
      { main: "cornerField", sub: "cross" },
      { main: "doubleBand", sub: "cross" },
      { main: "frameField", sub: "cross" },
      { main: "outerSquare", sub: "offsetField" },
    ],

    spread: [
      { main: "concentricSquare", sub: "radial" },
      { main: "outerSquare", sub: "radial" },
      { main: "frameField", sub: "radial" },
      { main: "cornerField", sub: "concentricSquare" },
      { main: "offsetField", sub: "concentricSquare" },
      { main: "wideHBand", sub: "outerSquare" },
      { main: "wideVBand", sub: "outerSquare" },
      { main: "radial", sub: "frameField" },
      { main: "doubleBand", sub: "outerSquare" },
    ],
  };

  function MosaicRenderer(p, audio) {
    this.p = p;
    this.audio = audio;
    this.cells = [];
    this.prevCells = [];
    this.displayCells = [];
    this.lastW = 0;
    this.lastH = 0;
    this.lastAspectW = 0;
    this.lastAspectH = 0;
    this.layout = null;
    this._patternLockUntil = 0;
    this._lockedPattern = { main: "radial", sub: "concentricSquare" };
    this._mosaicPattern = { main: "radial", sub: "concentricSquare" };
    this.initCells();
  }

  MosaicRenderer.prototype.getAspect = function () {
    if (
      window.VibeApp &&
      typeof window.VibeApp.getMosaicAspect === "function"
    ) {
      var a = window.VibeApp.getMosaicAspect();
      if (a && isFinite(a.w) && isFinite(a.h) && a.w > 0 && a.h > 0) {
        return { w: a.w, h: a.h };
      }
    }
    return { w: 1, h: 1 };
  };

  MosaicRenderer.prototype.invalidateLayout = function () {
    this.layout = null;
    this.lastW = 0;
    this.lastH = 0;
    this.lastAspectW = 0;
    this.lastAspectH = 0;
  };

  MosaicRenderer.prototype.initCells = function (cols, rows) {
    cols = cols || BASE_LONG;
    rows = rows || BASE_LONG;
    this._gridCols = cols;
    this._gridRows = rows;
    var total = cols * rows;
    var i;
    this.cells = [];
    this.prevCells = [];
    this.displayCells = [];
    for (i = 0; i < total; i++) {
      this.cells[i] = 0;
      this.prevCells[i] = 0;
      this.displayCells[i] = 0;
    }
  };

  MosaicRenderer.prototype.calcLayout = function () {
    var p = this.p;
    var canvasW = p.width;
    var canvasH = p.height;
    var aspect = this.getAspect();
    var aw = aspect.w;
    var ah = aspect.h;
    var maxW = canvasW * 0.85;
    var maxH = canvasH * 0.85;
    var dims = mosaicGridColsRows(aw, ah);
    var cols = dims.cols;
    var rows = dims.rows;
    var cellByW = maxW / cols;
    var cellByH = maxH / rows;
    var cell = Math.min(cellByW, cellByH);
    var boxW = cell * cols;
    var boxH = cell * rows;
    var gap = Math.max(1, cell * GAP_RATIO);
    return {
      cols: cols,
      rows: rows,
      cellCount: cols * rows,
      boxW: boxW,
      boxH: boxH,
      cellW: cell,
      cellH: cell,
      gapW: gap,
      gapH: gap,
      cellDrawW: cell - gap,
      cellDrawH: cell - gap,
      offsetX: (canvasW - boxW) / 2,
      offsetY: (canvasH - boxH) / 2,
    };
  };

  MosaicRenderer.prototype.ensureGrid = function () {
    var aspect = this.getAspect();
    if (
      this.lastW !== this.p.width ||
      this.lastH !== this.p.height ||
      this.lastAspectW !== aspect.w ||
      this.lastAspectH !== aspect.h ||
      !this.layout
    ) {
      this.layout = this.calcLayout();
      if (
        !this.cells.length ||
        this.cells.length !== this.layout.cellCount
      ) {
        this.initCells(this.layout.cols, this.layout.rows);
      }
      this.lastW = this.p.width;
      this.lastH = this.p.height;
      this.lastAspectW = aspect.w;
      this.lastAspectH = aspect.h;
    }
  };

  MosaicRenderer.prototype.clear = function () {
    this.initCells(this._gridCols || BASE_LONG, this._gridRows || BASE_LONG);
    this.p.background(0, 0, 98);
  };

  MosaicRenderer.prototype.calcFocalPoint = function (analysis) {
    var cols = (this.layout && this.layout.cols) || BASE_LONG;
    var rows = (this.layout && this.layout.rows) || BASE_LONG;
    return {
      x: (cols - 1) / 2,
      y: (rows - 1) / 2,
    };
  };

  MosaicRenderer.prototype.chooseFromPool = function (pool, analysis) {
    if (!pool || !pool.length) {
      return { main: "radial", sub: "concentricSquare" };
    }

    analysis = analysis || {};
    var vol = VibeUtils.effectiveVolume(
      analysis.volume || 0,
      analysis.isMic
    );

    var seed =
      Math.floor((analysis.centroid || 0.5) * 100) +
      Math.floor((analysis.spread || 0) * 100) * 3 +
      Math.floor((analysis.delta || 0) * 100) * 7 +
      Math.floor(vol * 100) * 11 +
      Math.floor(this.p.millis() / 7000) * 13;

    var idx = Math.abs(seed) % pool.length;
    return pool[idx];
  };

  MosaicRenderer.prototype.selectPattern = function (analysis) {
    analysis = analysis || {};

    var bass = analysis.bass || 0;
    var mid = analysis.mid || 0;
    var treble = analysis.treble || 0;
    var total = bass + mid + treble || 1;

    var bassR = bass / total;
    var midR = mid / total;
    var trebleR = treble / total;

    var centroid = analysis.centroid != null ? analysis.centroid : 0.5;
    var delta = analysis.delta || 0;
    var spread = analysis.spread || 0;
    var vol = VibeUtils.effectiveVolume(
      analysis.volume || 0,
      analysis.isMic
    );

    if (vol < 0.16) {
      return this.chooseFromPool(MOSAIC_PATTERN_POOLS.quiet, analysis);
    }

    if (delta > 0.55 && vol > 0.25) {
      return this.chooseFromPool(MOSAIC_PATTERN_POOLS.dynamic, analysis);
    }

    if (spread > 0.62) {
      return this.chooseFromPool(MOSAIC_PATTERN_POOLS.spread, analysis);
    }

    if (bassR > 0.45 || centroid < 0.36) {
      return this.chooseFromPool(MOSAIC_PATTERN_POOLS.low, analysis);
    }

    if (trebleR > 0.42 || centroid > 0.66) {
      return this.chooseFromPool(MOSAIC_PATTERN_POOLS.bright, analysis);
    }

    if (midR > 0.38) {
      return this.chooseFromPool(MOSAIC_PATTERN_POOLS.mid, analysis);
    }

    return this.chooseFromPool(MOSAIC_PATTERN_POOLS.quiet, analysis);
  };

  MosaicRenderer.prototype.pickStablePattern = function (analysis) {
    var now = this.p.millis();
    if (now < this._patternLockUntil && this._lockedPattern) {
      return this._lockedPattern;
    }
    this._lockedPattern = this.selectPattern(analysis);
    var hold = PATTERN_HOLD_MS + this.p.random(-400, 800);
    this._patternLockUntil = now + Math.max(1800, hold);
    return this._lockedPattern;
  };

  MosaicRenderer.prototype.patternValue = function (patterns, name) {
    return patterns[name] != null ? patterns[name] : 0;
  };

  MosaicRenderer.prototype.calcCellEnergy = function (
    col,
    row,
    focal,
    analysis,
    cols,
    rows
  ) {
    var ref = Math.max(cols, rows);
    var dx = col - focal.x;
    var dy = row - focal.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxDist = ref * 0.5;
    var normDist = dist / maxDist;

    var bass = analysis.bass || 0;
    var mid = analysis.mid || 0;
    var treble = analysis.treble || 0;
    var dominantBandEnergy = Math.max(bass, mid, treble) / 255;
    var spread = analysis.spread || 0;
    var delta = analysis.delta || 0;
    var centroid = analysis.centroid || 0.5;
    var vol = VibeUtils.effectiveVolume(
      analysis.volume || 0,
      analysis.isMic
    );
    var intensity = VibeUtils.clamp(
      dominantBandEnergy * 0.65 + vol * 0.35,
      0,
      1
    );

    var radial = Math.max(0, 1 - normDist);
    radial = Math.pow(radial, 0.85);
    radial = Math.round(radial * DISPLAY_LEVELS) / DISPLAY_LEVELS;

    var manhattan = (Math.abs(dx) + Math.abs(dy)) / (ref * 0.54);
    var diamond = Math.max(0, 1 - manhattan);
    diamond = Math.round(diamond * DISPLAY_LEVELS) / DISPLAY_LEVELS;

    var chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
    var squareRingFreq = 3 + Math.floor(centroid * 4 + delta * 2);
    var concentricSquare =
      Math.pow(
        Math.abs(
          Math.sin((chebyshev * Math.PI) / (ref / squareRingFreq))
        ),
        1.4
      ) * Math.max(0, 1 - (chebyshev / (ref * 0.58)) * 0.75);
    concentricSquare =
      Math.round(concentricSquare * DISPLAY_LEVELS) / DISPLAY_LEVELS;

    var gridRows = rows;
    var gridCols = cols;
    var maxDistCorner =
      Math.sqrt(
        Math.pow((gridCols - 1) / 2, 2) + Math.pow((gridRows - 1) / 2, 2)
      ) || 1;

    var hBand =
      Math.max(0, 1 - Math.abs(dy) / (gridRows * 0.18)) *
      Math.max(0, 1 - Math.abs(dx) / (gridCols * 0.78));
    hBand = Math.round(hBand * 8) / 8;

    var vBand =
      Math.max(0, 1 - Math.abs(dx) / (gridCols * 0.14)) *
      Math.max(0, 1 - Math.abs(dy) / (gridRows * 0.78));
    vBand = Math.round(vBand * 8) / 8;

    var cross = Math.max(hBand, vBand);
    cross = Math.round(cross * 8) / 8;

    var wideHBand =
      Math.max(0, 1 - Math.abs(dy) / (gridRows * 0.32)) *
      Math.max(0, 1 - Math.abs(dx) / (gridCols * 0.86));
    wideHBand = Math.round(wideHBand * 8) / 8;

    var wideVBand =
      Math.max(0, 1 - Math.abs(dx) / (gridCols * 0.24)) *
      Math.max(0, 1 - Math.abs(dy) / (gridRows * 0.82));
    wideVBand = Math.round(wideVBand * 8) / 8;

    var softCross = cross * 0.65 + radial * 0.22;
    softCross = Math.round(softCross * 8) / 8;

    var offsetXF =
      focal.x +
      VibeUtils.mapValue(centroid, 0, 1, -gridCols * 0.12, gridCols * 0.12);
    var offsetYF =
      focal.y +
      VibeUtils.mapValue(spread, 0, 1, gridRows * 0.08, -gridRows * 0.08);
    var odx = col - offsetXF;
    var ody = row - offsetYF;
    var odist = Math.sqrt(odx * odx + ody * ody);
    var offsetField = Math.max(0, 1 - odist / maxDistCorner);
    offsetField = Math.pow(offsetField, 0.9);
    offsetField = Math.round(offsetField * 8) / 8;

    var cornerX = centroid > 0.55 ? gridCols * 0.68 : gridCols * 0.32;
    var cornerY = spread > 0.55 ? gridRows * 0.34 : gridRows * 0.66;
    var cdx = col - cornerX;
    var cdy = row - cornerY;
    var cdist = Math.sqrt(cdx * cdx + cdy * cdy);
    var cornerField = Math.max(0, 1 - cdist / (maxDistCorner * 0.92));
    cornerField = Math.pow(cornerField, 1.05);
    cornerField = Math.round(cornerField * 8) / 8;

    var leftField =
      Math.max(0, 1 - Math.abs(col - gridCols * 0.32) / (gridCols * 0.28)) *
      radial;
    leftField = Math.round(leftField * 8) / 8;

    var rightField =
      Math.max(0, 1 - Math.abs(col - gridCols * 0.68) / (gridCols * 0.28)) *
      radial;
    rightField = Math.round(rightField * 8) / 8;

    var upperField =
      Math.max(0, 1 - Math.abs(row - gridRows * 0.34) / (gridRows * 0.26)) *
      radial;
    upperField = Math.round(upperField * 8) / 8;

    var lowerField =
      Math.max(0, 1 - Math.abs(row - gridRows * 0.66) / (gridRows * 0.26)) *
      radial;
    lowerField = Math.round(lowerField * 8) / 8;

    var doubleBand =
      Math.max(
        Math.max(0, 1 - Math.abs(row - gridRows * 0.36) / (gridRows * 0.08)),
        Math.max(0, 1 - Math.abs(row - gridRows * 0.64) / (gridRows * 0.08))
      ) * Math.max(0, 1 - Math.abs(dx) / (gridCols * 0.78));
    doubleBand = Math.round(doubleBand * 8) / 8;

    var frameDist = Math.min(
      col,
      row,
      gridCols - 1 - col,
      gridRows - 1 - row
    );
    var frameField = Math.max(
      0,
      1 - frameDist / (Math.min(gridCols, gridRows) * 0.22)
    );
    frameField = Math.round(frameField * 8) / 8;

    var gMax = Math.max(
      focal.x,
      focal.y,
      gridCols - 1 - focal.x,
      gridRows - 1 - focal.y
    );
    var innerSquare = Math.max(0, 1 - chebyshev / (gMax * 0.24 + 0.001));
    innerSquare = Math.round(innerSquare * 8) / 8;

    var outerSquare = Math.max(
      0,
      1 - Math.abs(chebyshev - gMax * 0.28) / (gMax * 0.12 + 0.001)
    );
    outerSquare = Math.round(outerSquare * 8) / 8;

    var patterns = {
      radial: radial,
      diamond: diamond,
      concentricSquare: concentricSquare,
      hBand: hBand,
      vBand: vBand,
      cross: cross,
      wideHBand: wideHBand,
      wideVBand: wideVBand,
      softCross: softCross,
      offsetField: offsetField,
      cornerField: cornerField,
      leftField: leftField,
      rightField: rightField,
      upperField: upperField,
      lowerField: lowerField,
      doubleBand: doubleBand,
      frameField: frameField,
      innerSquare: innerSquare,
      outerSquare: outerSquare,
    };
    var selected = this._mosaicPattern || {
      main: "radial",
      sub: "concentricSquare",
    };
    var dominant = this.patternValue(patterns, selected.main);
    var secondary = this.patternValue(patterns, selected.sub);

    var support =
      radial * 0.035 + cross * 0.02 + concentricSquare * spread * 0.025;

    var shaped =
      dominant * 0.82 + secondary * 0.12 + support;
    shaped *= VibeUtils.mapValue(intensity, 0, 1, 0.52, 1.06);
    shaped = Math.pow(VibeUtils.clamp(shaped, 0, 1), 0.62);

    var posterShell = VibeUtils.clamp(
      radial * 0.5 +
        diamond * 0.32 +
        Math.max(0, 1 - normDist * 1.08) * 0.18,
      0,
      1
    );
    var basePresence = analysis.isSound ? 0.18 : 0.06;
    var domLift = Math.max(
      dominantBandEnergy,
      analysis.isSound ? 0.14 : 0.48
    );
    var floorPoster = domLift * basePresence * posterShell;
    floorPoster = VibeUtils.clamp(floorPoster, 0, 0.52);

    var energy = Math.max(shaped, floorPoster);
    return VibeUtils.clamp(energy, 0, 1);
  };

  MosaicRenderer.prototype.blurCells = function (cells) {
    var layout = this.layout;
    var gcols = layout.cols;
    var grows = layout.rows;
    var blurred = new Array(cells.length);
    var kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    var r;
    var c;
    var dr;
    var dc;
    var nr;
    var nc;
    var sum;
    var count;
    var w;

    for (r = 0; r < grows; r++) {
      for (c = 0; c < gcols; c++) {
        sum = 0;
        count = 0;
        for (dr = -1; dr <= 1; dr++) {
          for (dc = -1; dc <= 1; dc++) {
            nr = r + dr;
            nc = c + dc;
            if (nr >= 0 && nr < grows && nc >= 0 && nc < gcols) {
              w = kernel[(dr + 1) * 3 + (dc + 1)];
              sum += cells[nr * gcols + nc] * w;
              count += w;
            }
          }
        }
        blurred[r * gcols + c] = count > 0 ? sum / count : 0;
      }
    }

    return blurred;
  };

  MosaicRenderer.prototype.update = function () {
    this.ensureGrid();
    var layout = this.layout;
    var gcols = layout.cols;
    var grows = layout.rows;
    var analysis = this.audio.lastAnalysis || {};
    var total = gcols * grows;
    var i;
    var row;
    var col;
    var focal;
    var newEnergy;
    var active = this.audio.enabled && analysis && analysis.isSound;

    this._mosaicPattern = this.pickStablePattern(analysis);

    focal = this.calcFocalPoint(analysis);
    for (row = 0; row < grows; row++) {
      for (col = 0; col < gcols; col++) {
        i = row * gcols + col;
        newEnergy = this.calcCellEnergy(
          col,
          row,
          focal,
          analysis,
          gcols,
          grows
        );
        if (!active) {
          this.cells[i] =
            this.cells[i] * SILENT_RETAIN + newEnergy * SILENT_PULL;
        } else if (newEnergy > this.cells[i]) {
          this.cells[i] = this.cells[i] * RISE_SMOOTH + newEnergy * 0.4;
        } else {
          this.cells[i] = this.cells[i] * FALL_SMOOTH + newEnergy * 0.08;
        }
        this.prevCells[i] = this.cells[i];
      }
    }

    var blurred = this.blurCells(this.cells);
    var mix = BLUR_MIX;
    for (i = 0; i < total; i++) {
      this.displayCells[i] = blurred[i] * (1 - mix) + this.cells[i] * mix;
    }
  };

  MosaicRenderer.prototype.render = function () {
    this.ensureGrid();
    var p = this.p;
    var layout = this.layout;
    var gcols = layout.cols;
    var grows = layout.rows;
    var analysis = this.audio.lastAnalysis || {};
    var silentView = !this.audio.enabled || !analysis.isSound;
    var focal = this.calcFocalPoint(analysis);
    var grid = { cols: gcols, rows: grows };
    var pattern = this._mosaicPattern || { main: "radial", sub: "concentricSquare" };
    var row;
    var col;
    var idx;
    var e;
    var x;
    var y;
    var grain;
    var grainOffset;
    var ink;
    var dx0;
    var dy0;
    var dist0;
    var maxDist0;
    var norm0;
    var soft0;
    var grayB;

    p.noStroke();
    p.rectMode(p.CORNER);

    if (silentView) {
      /* Solid light-gray tiles; white shows in GAP_RATIO gutters so squares read clearly */
      p.background(0, 0, 100);
      for (row = 0; row < grows; row++) {
        for (col = 0; col < gcols; col++) {
          x = layout.offsetX + col * layout.cellW + layout.gapW / 2;
          y = layout.offsetY + row * layout.cellH + layout.gapH / 2;

          dx0 = col - focal.x;
          dy0 = row - focal.y;
          dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
          maxDist0 =
            Math.sqrt(
              Math.pow((gcols - 1) / 2, 2) + Math.pow((grows - 1) / 2, 2)
            ) || 1;
          norm0 = dist0 / maxDist0;
          soft0 = Math.max(0, 1 - norm0);

          grayB = 86 + soft0 * 5;

          p.fill(0, 0, grayB, 100);
          p.rect(x, y, layout.cellDrawW, layout.cellDrawH);
        }
      }
      return;
    }

    p.background(0, 0, 100);

    for (row = 0; row < grows; row++) {
      for (col = 0; col < gcols; col++) {
        idx = row * gcols + col;
        e = this.displayCells[idx];
        if (e < 0.015) continue;

        x = layout.offsetX + col * layout.cellW + layout.gapW / 2;
        y = layout.offsetY + row * layout.cellH + layout.gapH / 2;
        grain = ((col * 17 + row * 31 + col * row * 7) % 100) / 100;
        grainOffset = (grain - 0.5) * 0.06;
        e = VibeUtils.clamp(e + grainOffset, 0, 1);
        ink = VibePalettes.calcMosaicColor(
          col,
          row,
          e,
          focal,
          analysis,
          grid,
          pattern
        );
        p.fill(ink.h, ink.s, ink.b, ink.a);
        p.rect(x, y, layout.cellDrawW, layout.cellDrawH);
      }
    }
  };

  return MosaicRenderer;
})();
