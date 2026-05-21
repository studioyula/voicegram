var VibeRenderer = VibeRenderer || {};

/**
 * Square grid: energy always radiates from the geometric center outward.
 * Volume / spread / delta widen the glow; a soft ring wave expands from center.
 * Spectrum still tints columns; no wandering focal point.
 */
VibeRenderer.MosaicRenderer = (function () {
  function MosaicRenderer(p, audio) {
    this.p = p;
    this.audio = audio;
    this.cells = null;
    this.gridN = 0;
    this.cellPx = 0;
    this.offX = 0;
    this.offY = 0;
    this.size = 0;
    this.lastW = 0;
    this.lastH = 0;
    this.spreadEnv = 0;
  }

  MosaicRenderer.prototype.rebuildGrid = function () {
    var p = this.p;
    var w = p.width;
    var h = p.height;
    if (w < 32 || h < 32) return;

    this.size = Math.min(w, h);
    this.gridN = Math.floor(
      VibeUtils.clamp(this.size / 22, 14, 22)
    );
    this.cellPx = this.size / this.gridN;
    this.offX = (w - this.size) * 0.5;
    this.offY = (h - this.size) * 0.5;

    var n = this.gridN * this.gridN;
    this.cells = [];
    var i;
    for (i = 0; i < n; i++) {
      this.cells[i] = 0;
    }

    this.spreadEnv = 0;
    this.lastW = w;
    this.lastH = h;
  };

  MosaicRenderer.prototype.ensureGrid = function () {
    var p = this.p;
    if (
      !this.cells ||
      this.lastW !== p.width ||
      this.lastH !== p.height
    ) {
      this.rebuildGrid();
    }
  };

  MosaicRenderer.prototype.clear = function () {
    var bg = VibePalettes.getActive().bg;
    this.p.background(bg[0], bg[1], bg[2]);
    if (this.cells) {
      var i;
      for (i = 0; i < this.cells.length; i++) {
        this.cells[i] = 0;
      }
    }
    this.spreadEnv = 0;
  };

  MosaicRenderer.prototype.update = function () {
    this.ensureGrid();
    if (!this.cells || this.gridN < 2) return;

    var a = this.audio.lastAnalysis;
    var p = this.p;
    var i;
    var decay = a.isSound ? 0.86 : 0.94;
    for (i = 0; i < this.cells.length; i++) {
      this.cells[i] *= decay;
      if (this.cells[i] < 0.003) {
        this.cells[i] = 0;
      }
    }

    if (!this.audio.enabled || !a.isSound) {
      this.spreadEnv *= 0.9;
      return;
    }

    var gn = this.gridN;
    var mid = (gn - 1) * 0.5;
    var cx = mid;
    var cy = mid;

    var vol = VibeUtils.effectiveVolume(a.volume, a.isMic);
    var pulse =
      VibeUtils.mapValue(vol, 0, 1, 0.2, 1) + (a.delta || 0) * 0.6;
    var spread = a.spread != null ? a.spread : 0.35;

    this.spreadEnv = VibeUtils.clamp(
      this.spreadEnv * 0.88 + vol * 0.14 + (a.delta || 0) * 0.35,
      0,
      1
    );

    var sigCore =
      VibeUtils.mapValue(vol, 0, 1, 0.55, gn * 0.48) *
      (0.35 + this.spreadEnv * 0.75) *
      (1 + spread * 0.4);
    if ((a.delta || 0) > 0.15) {
      sigCore *= 1 + (a.delta || 0) * 0.85;
    }
    var sig2 = 2 * sigCore * sigCore;
    var sx = 1.1;
    var sx2 = 2 * sx * sx;

    var maxDist = Math.sqrt(mid * mid + mid * mid) + 1.5;
    var waveR = (p.millis() * 0.0024) % (maxDist + 2.5);
    var waveSigma = 1.35;

    var spec = a.spectrum;
    var specLen = spec && spec.length ? spec.length : 0;
    var c;
    var r;
    var idx;
    var bin;
    var colE;
    var dc;
    var dr;
    var dist;
    var dist2;
    var blob;
    var wave;
    var cross;
    var add;

    for (r = 0; r < gn; r++) {
      for (c = 0; c < gn; c++) {
        if (specLen > 4) {
          bin = Math.floor((c / Math.max(1, gn - 1)) * (specLen - 1));
          colE = (spec[bin] || 0) / 255;
        } else {
          colE =
            VibeUtils.mapValue(
              c,
              0,
              Math.max(1, gn - 1),
              (a.bass || 0) / 255,
              (a.treble || 0) / 255
            ) *
              0.55 +
            ((a.bass || 0) + (a.mid || 0) + (a.treble || 0)) / (3 * 255) *
              0.45;
        }

        if (colE < 0.03) continue;

        dc = c - cx;
        dr = r - cy;
        dist2 = dc * dc + dr * dr;
        dist = Math.sqrt(dist2);
        blob = Math.exp(-dist2 / sig2);
        wave = Math.exp(
          -((dist - waveR) * (dist - waveR)) /
            (2 * waveSigma * waveSigma)
        );
        cross =
          0.26 *
          colE *
          (Math.exp(-(dc * dc) / sx2) + Math.exp(-(dr * dr) / sx2));

        add =
          colE *
          pulse *
          (0.48 * blob +
            0.36 *
              wave *
              VibeUtils.mapValue(vol, 0, 1, 0.25, 1) *
              (0.55 + this.spreadEnv * 0.45) +
            0.2 * cross);

        idx = r * gn + c;
        this.cells[idx] = VibeUtils.clamp(this.cells[idx] + add, 0, 1);
      }
    }
  };

  MosaicRenderer.prototype.render = function () {
    var p = this.p;
    var bg = VibePalettes.getActive().bg;
    p.noStroke();
    p.background(bg[0], bg[1], bg[2]);

    if (!this.cells || this.gridN < 2) return;

    var a = this.audio.lastAnalysis;
    var gn = this.gridN;
    var px = this.cellPx;
    var ox = this.offX;
    var oy = this.offY;
    var r;
    var c;
    var idx;
    var e;
    var colNorm;
    var rowNorm;
    var band;
    var pseudo;
    var colRgb;
    var grain;
    var mid = (gn - 1) * 0.5;
    var distFromCenter;
    var dc;
    var dr;

    p.rectMode(p.CORNER);

    for (r = 0; r < gn; r++) {
      for (c = 0; c < gn; c++) {
        idx = r * gn + c;
        e = this.cells[idx];
        if (e < 0.025) continue;

        colNorm = gn > 1 ? c / (gn - 1) : 0.5;
        rowNorm = gn > 1 ? r / (gn - 1) : 0.5;
        dc = c - mid;
        dr = r - mid;
        distFromCenter = Math.sqrt(dc * dc + dr * dr) / (mid + 0.01);

        if (colNorm < 0.34) {
          band = "bass";
        } else if (colNorm < 0.67) {
          band = "mid";
        } else {
          band = "treble";
        }

        pseudo = {
          band: band,
          centroid: VibeUtils.clamp(
            (a.centroid || 0.5) * 0.35 +
              rowNorm * 0.35 +
              (1 - distFromCenter) * 0.3,
            0,
            1
          ),
          peakFreq:
            (a.peakFreq || 500) * (0.7 + colNorm * 0.35) +
            (rowNorm * 800 + colNorm * 400),
        };
        colRgb = VibePalettes.calcColor(pseudo);
        grain = 1 + (((r * 17 + c * 31) % 7) - 3) * 0.015;
        p.fill(
          colRgb.h,
          colRgb.s,
          colRgb.b,
          VibeUtils.clamp((e * 92 + 6) * grain, 0, 100)
        );
        p.rect(
          ox + c * px,
          oy + r * px,
          Math.max(1, px - 1),
          Math.max(1, px - 1)
        );
      }
    }
  };

  return MosaicRenderer;
})();
