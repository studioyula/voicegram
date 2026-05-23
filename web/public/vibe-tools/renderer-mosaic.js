var VibeRenderer = VibeRenderer || {};

/**
 * Mosaic — poster generator: every frame aims for print-like composition
 * (center weight, modular planes, minimal scatter). Audio modulates ink on
 * top of a stable structural floor, not a raw visualizer wash.
 */
VibeRenderer.MosaicRenderer = (function () {
  var GRID_SIZE = 32;
  var RISE_SMOOTH = 0.6;
  var FALL_SMOOTH = 0.92;
  var SILENT_PULL = 0.2;
  var SILENT_RETAIN = 0.8;

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
    this._mosaicPattern = { main: "radial", sub: "diamond" };
    this.initCells();
  }

  MosaicRenderer.prototype.getAspect = function () {
    var asp =
      window.VibeApp && typeof window.VibeApp.getMosaicAspect === "function"
        ? window.VibeApp.getMosaicAspect()
        : { w: 1, h: 1 };
    var w = asp && asp.w > 0 ? asp.w : 1;
    var h = asp && asp.h > 0 ? asp.h : 1;
    return { w: w, h: h };
  };

  MosaicRenderer.prototype.invalidateLayout = function () {
    this.layout = null;
    this.lastW = 0;
    this.lastH = 0;
    this.lastAspectW = 0;
    this.lastAspectH = 0;
  };

  MosaicRenderer.prototype.initCells = function () {
    var total = GRID_SIZE * GRID_SIZE;
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
    var targetRatio = aw / ah;
    var boxW;
    var boxH;
    if (maxW / maxH > targetRatio) {
      boxH = maxH;
      boxW = boxH * targetRatio;
    } else {
      boxW = maxW;
      boxH = boxW / targetRatio;
    }
    var cellW = boxW / GRID_SIZE;
    var cellH = boxH / GRID_SIZE;
    var gapW = Math.max(1, cellW * 0.04);
    var gapH = Math.max(1, cellH * 0.04);
    return {
      boxW: boxW,
      boxH: boxH,
      cellW: cellW,
      cellH: cellH,
      gapW: gapW,
      gapH: gapH,
      cellDrawW: cellW - gapW,
      cellDrawH: cellH - gapH,
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
      this.lastW = this.p.width;
      this.lastH = this.p.height;
      this.lastAspectW = aspect.w;
      this.lastAspectH = aspect.h;
    }
  };

  MosaicRenderer.prototype.clear = function () {
    this.initCells();
    this.p.background(0, 0, 100);
  };

  MosaicRenderer.prototype.calcFocalPoint = function (analysis) {
    return {
      x: (GRID_SIZE - 1) / 2,
      y: (GRID_SIZE - 1) / 2,
    };
  };

  MosaicRenderer.prototype.selectPattern = function (analysis) {
    if (!analysis.isSound) {
      return { main: "concentricSquare", sub: "diamond" };
    }
    var bass = analysis.bass || 0;
    var mid = analysis.mid || 0;
    var treble = analysis.treble || 0;
    var total = bass + mid + treble || 1;
    var bassR = bass / total;
    var midR = mid / total;
    var trebleR = treble / total;
    var delta = analysis.delta || 0;
    var centroid = analysis.centroid || 0.5;
    var vol = analysis.isMic
      ? Math.min((analysis.volume || 0) * 12, 1)
      : analysis.volume || 0;

    if (delta > 0.4) {
      if (bassR > 0.4) return { main: "radial", sub: "diamond" };
      if (trebleR > 0.4) return { main: "checker", sub: "xPattern" };
      return { main: "cross", sub: "radial" };
    }

    if (vol < 0.2) {
      return { main: "concentricSquare", sub: "radial" };
    }

    if (vol > 0.8) {
      if (centroid > 0.6) return { main: "xPattern", sub: "checker" };
      return { main: "cross", sub: "hBand" };
    }

    if (centroid > 0.65) {
      if (trebleR > midR) return { main: "vBand", sub: "xPattern" };
      return { main: "diamond", sub: "vBand" };
    }

    if (centroid < 0.35) {
      if (bassR > midR) {
        return { main: "hBand", sub: "concentricSquare" };
      }
      return { main: "concentricSquare", sub: "hBand" };
    }

    if (bassR > midR && bassR > trebleR) {
      return { main: "concentricSquare", sub: "diamond" };
    }
    if (trebleR > midR) {
      return { main: "xPattern", sub: "vBand" };
    }
    return { main: "cross", sub: "diamond" };
  };

  MosaicRenderer.prototype.patternValue = function (patterns, name) {
    return patterns[name] != null ? patterns[name] : 0;
  };

  MosaicRenderer.prototype.calcCellEnergy = function (col, row, focal, analysis) {
    var dx = col - focal.x;
    var dy = row - focal.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxDist = GRID_SIZE * 0.5;
    var normDist = dist / maxDist;

    var bass = analysis.bass || 0;
    var mid = analysis.mid || 0;
    var treble = analysis.treble || 0;
    var bandTotal = bass + mid + treble || 1;
    var bassR = bass / bandTotal;
    var midR = mid / bandTotal;
    var trebleR = treble / bandTotal;
    var dominantBandEnergy = Math.max(bass, mid, treble) / 255;
    var spread = analysis.spread || 0;
    var delta = analysis.delta || 0;
    var centroid = analysis.centroid || 0.5;
    var vol = analysis.isMic
      ? Math.min((analysis.volume || 0) * 18, 1)
      : analysis.volume || 0;
    var intensity = VibeUtils.clamp(
      dominantBandEnergy * 0.65 + vol * 0.35,
      0,
      1
    );

    // Quantized patterns keep the mosaic graphic and readable instead of hazy.
    var radial = Math.max(0, 1 - normDist);
    radial = Math.pow(radial, 0.85);
    radial = Math.round(radial * 8) / 8;

    var hBand = Math.max(0, 1 - Math.abs(dy) / (GRID_SIZE * 0.34));
    hBand *= Math.max(0, 1 - Math.abs(dx) / (GRID_SIZE * 0.82));
    hBand = Math.round(hBand * 7) / 7;

    var vBand = Math.max(0, 1 - Math.abs(dx) / (GRID_SIZE * 0.26));
    vBand *= Math.max(0, 1 - Math.abs(dy) / (GRID_SIZE * 0.78));
    vBand = Math.round(vBand * 7) / 7;

    var cross = Math.max(hBand, vBand);

    var diag1 = Math.abs(dx - dy) / (GRID_SIZE * 0.42);
    var diag2 = Math.abs(dx + dy) / (GRID_SIZE * 0.42);
    var xPattern = Math.max(0, 1 - Math.min(diag1, diag2));
    xPattern *= Math.max(0, 1 - normDist * 0.55);
    xPattern = Math.round(xPattern * 7) / 7;

    var manhattan = (Math.abs(dx) + Math.abs(dy)) / (GRID_SIZE * 0.54);
    var diamond = Math.max(0, 1 - manhattan);
    diamond = Math.round(diamond * 8) / 8;

    var chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
    var squareRingFreq = 3 + Math.floor(centroid * 4 + delta * 2);
    var concentricSquare =
      Math.pow(
        Math.abs(Math.sin((chebyshev * Math.PI) / (GRID_SIZE / squareRingFreq))),
        1.4
      ) * Math.max(0, 1 - (chebyshev / (GRID_SIZE * 0.58)) * 0.75);
    concentricSquare = Math.round(concentricSquare * 8) / 8;

    var checkSize = Math.max(2, Math.floor(2 + spread * 5 + delta * 2));
    var checker =
      (Math.floor(col / checkSize) + Math.floor(row / checkSize)) % 2 === 0
        ? 1
        : 0.18;
    checker *= Math.max(0, 1 - normDist * 0.65);

    var patterns = {
      radial: radial,
      hBand: hBand,
      vBand: vBand,
      cross: cross,
      xPattern: xPattern,
      diamond: diamond,
      concentricSquare: concentricSquare,
      checker: checker,
    };
    var selected = this.selectPattern(analysis);
    var dominant = this.patternValue(patterns, selected.main);
    var secondary = this.patternValue(patterns, selected.sub);

    var shaped =
      dominant * 0.56 +
      secondary * 0.24 +
      radial * 0.1 +
      hBand * bassR * 0.16 +
      cross * midR * 0.16 +
      xPattern * trebleR * 0.16 +
      checker * delta * 0.14 +
      concentricSquare * spread * 0.14;
    shaped *= VibeUtils.mapValue(intensity, 0, 1, 0.38, 1.22);
    shaped = Math.pow(VibeUtils.clamp(shaped, 0, 1), 0.5);

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

    for (r = 0; r < GRID_SIZE; r++) {
      for (c = 0; c < GRID_SIZE; c++) {
        sum = 0;
        count = 0;
        for (dr = -1; dr <= 1; dr++) {
          for (dc = -1; dc <= 1; dc++) {
            nr = r + dr;
            nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              w = kernel[(dr + 1) * 3 + (dc + 1)];
              sum += cells[nr * GRID_SIZE + nc] * w;
              count += w;
            }
          }
        }
        blurred[r * GRID_SIZE + c] = count > 0 ? sum / count : 0;
      }
    }

    return blurred;
  };

  MosaicRenderer.prototype.update = function () {
    this.ensureGrid();
    var analysis = this.audio.lastAnalysis;
    var total = GRID_SIZE * GRID_SIZE;
    var i;
    var row;
    var col;
    var focal;
    var newEnergy;
    var active = this.audio.enabled && analysis.isSound;

    focal = this.calcFocalPoint(analysis);
    for (row = 0; row < GRID_SIZE; row++) {
      for (col = 0; col < GRID_SIZE; col++) {
        i = row * GRID_SIZE + col;
        newEnergy = this.calcCellEnergy(col, row, focal, analysis);
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
    this._mosaicPattern = this.selectPattern(analysis);
    this.displayCells = this.blurCells(this.cells);
  };

  MosaicRenderer.prototype.render = function () {
    this.ensureGrid();
    var p = this.p;
    var layout = this.layout;
    var analysis = this.audio.lastAnalysis || {};
    var focal = this.calcFocalPoint(analysis);
    var grid = { cols: GRID_SIZE, rows: GRID_SIZE };
    var pattern = this._mosaicPattern || { main: "radial", sub: "diamond" };
    var row;
    var col;
    var idx;
    var e;
    var x;
    var y;
    var grain;
    var grainOffset;
    var ink;

    p.background(0, 0, 100);
    p.noStroke();
    p.rectMode(p.CORNER);

    for (row = 0; row < GRID_SIZE; row++) {
      for (col = 0; col < GRID_SIZE; col++) {
        idx = row * GRID_SIZE + col;
        e = this.displayCells[idx];
        if (e < 0.015) continue;

        x = layout.offsetX + col * layout.cellW + layout.gapW / 2;
        y = layout.offsetY + row * layout.cellH + layout.gapH / 2;
        grain = ((col * 17 + row * 31 + col * row * 7) % 100) / 100;
        grainOffset = (grain - 0.5) * 0.06;
        e = VibeUtils.clamp(e + grainOffset, 0, 1);
        ink = VibePalettes.calcMosaicColor(col, row, e, focal, analysis, grid, pattern);
        p.fill(ink.h, ink.s, ink.b, ink.a);
        p.rect(x, y, layout.cellDrawW, layout.cellDrawH);
      }
    }
  };

  return MosaicRenderer;
})();
