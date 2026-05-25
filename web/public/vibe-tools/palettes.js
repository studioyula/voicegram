var VibePalettes = (function () {
  var palettes = {
    mono: {
      name: "Mono",
      /* HSB: white canvas (matches white pal-dot); [0,0,0] reads as black in HSB */
      bg: [0, 0, 100],
      colors: {
        bass: { h: 0, s: 0, b: 100 },
        mid: { h: 0, s: 0, b: 85 },
        treble: { h: 0, s: 0, b: 70 },
      },
      glow: "rgba(255,255,255,",
      connection: { h: 0, s: 0, b: 80 },
    },
    neonFire: {
      name: "Fire",
      bg: [0, 0, 2],
      colors: {
        bass: { h: 10, s: 90, b: 100 },
        mid: { h: 30, s: 85, b: 100 },
        treble: { h: 50, s: 80, b: 100 },
      },
      glow: "rgba(255,100,30,",
      connection: { h: 20, s: 60, b: 90 },
    },
    ocean: {
      name: "Ocean",
      bg: [220, 15, 3],
      colors: {
        bass: { h: 220, s: 80, b: 90 },
        mid: { h: 185, s: 70, b: 95 },
        treble: { h: 195, s: 50, b: 100 },
      },
      glow: "rgba(80,180,255,",
      connection: { h: 200, s: 40, b: 70 },
    },
    candy: {
      name: "Candy",
      bg: [345, 30, 20],
      colors: {
        bass: { h: 330, s: 60, b: 100 },
        mid: { h: 280, s: 50, b: 95 },
        treble: { h: 40, s: 40, b: 100 },
      },
      glow: "rgba(255,120,180,",
      connection: { h: 320, s: 30, b: 80 },
    },
    acid: {
      name: "Acid",
      bg: [120, 10, 2],
      colors: {
        bass: { h: 120, s: 90, b: 100 },
        mid: { h: 65, s: 95, b: 100 },
        treble: { h: 170, s: 80, b: 100 },
      },
      glow: "rgba(100,255,80,",
      connection: { h: 100, s: 50, b: 80 },
    },
    vivid: {
      name: "Vivid",
      bg: [0, 0, 0],
      colors: {
        bass: { h: 5, s: 95, b: 100 },
        mid: { h: 200, s: 70, b: 100 },
        treble: { h: 45, s: 90, b: 100 },
      },
      glow: "rgba(255,60,60,",
      connection: { h: 0, s: 50, b: 90 },
    },
  };

  var active = "mono";

  var activeShapeBackground = "white";

  /** Shape mode canvas only — do not use palette family `bg` for Shape fill. */
  var shapeBackgrounds = {
    white: { name: "White", bg: [0, 0, 100] },
    black: { name: "Black", bg: [0, 0, 4] },
  };

  function setShapeBackground(id) {
    if (shapeBackgrounds[id]) {
      activeShapeBackground = id;
    }
  }

  function getShapeBackground() {
    var def = shapeBackgrounds[activeShapeBackground] || shapeBackgrounds.white;
    return {
      id: activeShapeBackground,
      name: def.name,
      bg: def.bg,
    };
  }

  /** Poster-style HSB bases — fallback when calcShapeCompositionColor has no voiceProfile. */
  var shapeCompositionFamilies = {
    brightPoster: {
      bass: { h: 12, s: 90, b: 96 },
      mid: { h: 205, s: 76, b: 96 },
      treble: { h: 52, s: 92, b: 98 },
      accent: { h: 285, s: 62, b: 94 },
      line: { h: 215, s: 42, b: 36 },
    },
    structGrid: {
      bass: { h: 198, s: 84, b: 90 },
      mid: { h: 218, s: 48, b: 94 },
      treble: { h: 168, s: 72, b: 97 },
      accent: { h: 38, s: 88, b: 96 },
      line: { h: 0, s: 0, b: 40 },
    },
  };

  /**
   * Shape-only Poundstone swatches (HSB) derived from poundstone_palette_preview.html
   * Combined palette + VOICEGRAM groups; near-neutral page chrome excluded.
   */
  var shapePoundstoneColors = {
    warm: [
      { h: 356, s: 36, b: 98 },
      { h: 1, s: 46, b: 98 },
      { h: 26, s: 36, b: 97 },
      { h: 47, s: 45, b: 99 },
      { h: 38, s: 55, b: 96 },
      { h: 12, s: 52, b: 78 },
      { h: 2, s: 42, b: 98 },
      { h: 31, s: 24, b: 78 },
      { h: 5, s: 43, b: 99 },
      { h: 18, s: 33, b: 88 },
    ],
    cool: [
      { h: 198, s: 35, b: 98 },
      { h: 228, s: 40, b: 97 },
      { h: 183, s: 37, b: 84 },
      { h: 196, s: 59, b: 84 },
      { h: 220, s: 66, b: 88 },
      { h: 182, s: 40, b: 83 },
      { h: 184, s: 51, b: 80 },
      { h: 206, s: 28, b: 97 },
      { h: 186, s: 32, b: 88 },
      { h: 187, s: 38, b: 85 },
    ],
    bright: [
      { h: 272, s: 68, b: 98 },
      { h: 341, s: 75, b: 81 },
      { h: 302, s: 49, b: 84 },
      { h: 10, s: 46, b: 99 },
      { h: 50, s: 48, b: 99 },
      { h: 300, s: 77, b: 99 },
      { h: 338, s: 70, b: 88 },
      { h: 8, s: 59, b: 100 },
      { h: 13, s: 59, b: 98 },
      { h: 42, s: 73, b: 99 },
    ],
    soft: [
      { h: 261, s: 25, b: 94 },
      { h: 55, s: 27, b: 94 },
      { h: 329, s: 19, b: 85 },
      { h: 356, s: 19, b: 95 },
      { h: 67, s: 53, b: 78 },
      { h: 346, s: 14, b: 96 },
      { h: 181, s: 22, b: 91 },
      { h: 20, s: 18, b: 93 },
      { h: 187, s: 28, b: 88 },
      { h: 79, s: 24, b: 90 },
    ],
    dark: [
      { h: 340, s: 78, b: 78 },
      { h: 344, s: 81, b: 78 },
      { h: 338, s: 82, b: 76 },
      { h: 4, s: 45, b: 68 },
      { h: 356, s: 61, b: 71 },
      { h: 10, s: 64, b: 77 },
      { h: 214, s: 79, b: 82 },
      { h: 345, s: 74, b: 91 },
      { h: 18, s: 52, b: 79 },
      { h: 7, s: 50, b: 78 },
    ],
  };

  /** Shape-only: curated 3-color + line per voice profile (no full Poundstone pick). */
  var shapeCuratedPalettes = {
    white: {
      round: {
        main: { h: 14, s: 72, b: 92 },
        mid: { h: 32, s: 62, b: 95 },
        accent: { h: 340, s: 72, b: 92 },
        line: { h: 0, s: 0, b: 12 },
      },
      sharp: {
        main: { h: 333, s: 78, b: 94 },
        mid: { h: 265, s: 68, b: 92 },
        accent: { h: 48, s: 90, b: 96 },
        line: { h: 0, s: 0, b: 12 },
      },
      structural: {
        main: { h: 206, s: 72, b: 88 },
        mid: { h: 184, s: 58, b: 84 },
        accent: { h: 18, s: 78, b: 94 },
        line: { h: 0, s: 0, b: 12 },
      },
      textural: {
        main: { h: 186, s: 64, b: 86 },
        mid: { h: 310, s: 68, b: 88 },
        accent: { h: 42, s: 88, b: 96 },
        line: { h: 0, s: 0, b: 12 },
      },
    },
    black: {
      round: {
        main: { h: 16, s: 68, b: 98 },
        mid: { h: 34, s: 54, b: 96 },
        accent: { h: 340, s: 68, b: 96 },
        line: { h: 0, s: 0, b: 96 },
      },
      sharp: {
        main: { h: 326, s: 76, b: 98 },
        mid: { h: 268, s: 62, b: 96 },
        accent: { h: 52, s: 86, b: 100 },
        line: { h: 0, s: 0, b: 96 },
      },
      structural: {
        main: { h: 208, s: 68, b: 96 },
        mid: { h: 184, s: 56, b: 92 },
        accent: { h: 18, s: 76, b: 98 },
        line: { h: 0, s: 0, b: 96 },
      },
      textural: {
        main: { h: 188, s: 62, b: 96 },
        mid: { h: 310, s: 62, b: 96 },
        accent: { h: 44, s: 84, b: 100 },
        line: { h: 0, s: 0, b: 96 },
      },
    },
  };

  /** Shape final HEX families — one family per session; roles map to fixed slots. */
  var shapeFinalPalettes = {
    airyBlue: {
      name: "Airy Blue",
      colors: ["#94d9fc", "#8fd6fc", "#84d3fc", "#a5e0fc"],
      accent: "#44bbf5",
      lineLight: "#ffffff",
      lineDark: "#4c7de0",
    },
    freshCoral: {
      name: "Fresh Coral",
      colors: ["#fcab90", "#fd8cac", "#fc7e8a", "#fda95a"],
      accent: "#fb6663",
      lineLight: "#ffffff",
      lineDark: "#c87661",
    },
    lavenderPear: {
      name: "Lavender Pear",
      colors: ["#f8c59e", "#dcb7fc", "#f1ad9e", "#f7ccc0"],
      accent: "#c8b1fb",
      lineLight: "#ffffff",
      lineDark: "#d8aec4",
    },
    skyLemon: {
      name: "Sky Lemon",
      colors: ["#8ebef6", "#7fbdf6", "#ddce73", "#7bc1ad"],
      accent: "#44bbf5",
      lineLight: "#ffffff",
      lineDark: "#58b6d7",
    },
    chooseCheer: {
      name: "Choose Cheer",
      colors: ["#fe9e8b", "#fda0a6", "#fdcc7f", "#fcd3ab"],
      accent: "#fd7972",
      lineLight: "#ffffff",
      lineDark: "#fa8886",
    },
    pinkPurple: {
      name: "Pink Purple",
      colors: ["#fba1a7", "#d8aec4", "#ac51fb", "#d76ed3"],
      accent: "#ce3364",
      lineLight: "#ffffff",
      lineDark: "#cab5f0",
    },
    cleanTeal: {
      name: "Clean Teal",
      colors: ["#a3dff9", "#58b6d7", "#88d3d7", "#9ab4df"],
      accent: "#94a7f7",
      lineLight: "#ffffff",
      lineDark: "#4c7de0",
    },
  };

  function getShapePaletteIdForProfile(profile) {
    if (!profile) return "freshCoral";
    if (profile.dominant === "round") return "freshCoral";
    if (profile.dominant === "sharp") return "pinkPurple";
    if (profile.dominant === "structural") return "airyBlue";
    if (profile.dominant === "textural") return "skyLemon";
    return "chooseCheer";
  }

  function getShapeAccentPaletteId(profile) {
    if (!profile) return "chooseCheer";
    if (profile.dominant === "round") return "lavenderPear";
    if (profile.dominant === "sharp") return "pinkPurple";
    if (profile.dominant === "structural") return "cleanTeal";
    if (profile.dominant === "textural") return "skyLemon";
    return "chooseCheer";
  }

  function getShapeFamilyForProfile(profile) {
    if (!profile) return "brightPoster";
    if (profile.dominant === "structural") return "structGrid";
    return "brightPoster";
  }

  function calcShapeCompositionColor(famId, role, centroid, peakFreq, voiceProfile, opts) {
    var palette = shapeFinalPalettes[famId] || shapeFinalPalettes.freshCoral;
    var bg = getShapeBackground();
    var isLightBg = (bg.bg ? bg.bg[2] : 100) > 50;
    var hex;
    var hsb;
    var c;
    var s;
    var b;

    if (role === "line") {
      hex = isLightBg ? palette.lineDark : palette.lineLight;
    } else if (role === "accent" || role === "treble") {
      hex = palette.accent;
    } else if (role === "bass" || role === "main") {
      hex = palette.colors[0];
    } else if (role === "mid") {
      hex =
        opts && opts.secondaryMid && palette.colors[2]
          ? palette.colors[2]
          : palette.colors[1];
    } else {
      hex = palette.colors[2] || palette.colors[0];
    }

    hsb = hexToHsb(hex);
    c = centroid != null ? centroid : 0.5;

    s = VibeUtils.clamp(
      hsb.s * VibeUtils.mapValue(c, 0, 1, 0.97, 1.04),
      0,
      100
    );

    b = VibeUtils.clamp(
      hsb.b * VibeUtils.mapValue(c, 0, 1, 0.96, 1.03),
      0,
      100
    );

    if (isLightBg) {
      b = VibeUtils.clamp(b * 0.96, 0, 100);
    } else {
      b = VibeUtils.clamp(b * 1.04, 0, 100);
    }

    return {
      h: hsb.h,
      s: s,
      b: b,
    };
  }

  function calcShapeCompositionColorLegacy(famId, role, centroid, peakFreq, bgB) {
    var fam = shapeCompositionFamilies[famId] || shapeCompositionFamilies.brightPoster;
    var base = fam[role] || fam.mid;
    var isDarkCanvas = bgB < 50;

    if (role === "line") {
      if (isDarkCanvas) {
        base = { h: 0, s: 0, b: 94 };
      } else {
        base = fam.line || { h: 215, s: 45, b: 34 };
      }
    }

    var cMod = centroid != null ? centroid : 0.5;
    var s = VibeUtils.clamp(
      base.s * VibeUtils.mapValue(cMod, 0, 1, 0.72, 1.12),
      0,
      100
    );
    var br = VibeUtils.clamp(
      base.b * VibeUtils.mapValue(cMod, 0, 1, 0.86, 1.06),
      0,
      100
    );
    var hueShift = VibeUtils.mapValue(peakFreq || 500, 60, 8000, -24, 24);
    var h = (base.h + hueShift + 360) % 360;

    return { h: h, s: s, b: br };
  }

  function getShapeBackgroundIds() {
    return ["white", "black"];
  }

  function getActive() {
    return palettes[active] || palettes.mono;
  }

  function setActive(id) {
    if (palettes[id]) active = id;
  }

  function calcColor(analysis) {
    var pal = getActive();
    var band = analysis.band || "bass";
    var base = pal.colors[band] || pal.colors.bass;
    var centroidMod = analysis.centroid != null ? analysis.centroid : 0.5;

    var s = VibeUtils.clamp(
      base.s * VibeUtils.mapValue(centroidMod, 0, 1, 0.6, 1.15),
      0,
      100
    );
    var b = VibeUtils.clamp(
      base.b * VibeUtils.mapValue(centroidMod, 0, 1, 0.5, 1.1),
      0,
      100
    );
    var hueShift = VibeUtils.mapValue(analysis.peakFreq || 500, 60, 8000, -15, 15);
    var h = (base.h + hueShift + 360) % 360;

    return { h: h, s: s, b: b };
  }

  function glowColor(alpha) {
    return getActive().glow + alpha + ")";
  }

  function calcMosaicGray(energy) {
    var e = VibeUtils.clamp(energy || 0, 0, 1);
    return {
      h: 0,
      s: 0,
      b: VibeUtils.mapValue(e, 0, 1, 98, 3),
      a: VibeUtils.mapValue(e, 0, 1, 18, 100),
    };
  }

  function getPoundstoneColors() {
    if (typeof POUNDSTONE_COLORS !== "undefined") {
      return POUNDSTONE_COLORS;
    }
    return null;
  }

  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map(function (c) {
          return c + c;
        })
        .join("");
    }

    var num = parseInt(hex, 16);

    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function rgbToHsb(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    var s = max === 0 ? 0 : d / max;
    var v = max;

    if (d !== 0) {
      if (max === r) {
        h = ((g - b) / d) % 6;
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else {
        h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return {
      h: h,
      s: s * 100,
      b: v * 100,
    };
  }

  function hexToHsb(hex) {
    var rgb = hexToRgb(hex);
    var x = rgbToHsb(rgb.r, rgb.g, rgb.b);
    return {
      h: Math.round(x.h),
      s: Math.round(x.s),
      b: Math.round(x.b),
    };
  }

  function selectMosaicHueGroup(analysis) {
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

    if (vol < 0.2) {
      return "teal";
    }

    if (delta > 0.4) {
      if (bassR > 0.4) return "coral";
      if (trebleR > 0.4) return "purple";
      return "pink";
    }

    if (vol > 0.8) {
      if (centroid > 0.6) return "purple";
      return "pink";
    }

    if (centroid > 0.65) {
      if (trebleR > midR) return "pink";
      return "purple";
    }

    if (centroid < 0.35) {
      if (bassR > midR) return "coral";
      return "orange";
    }

    if (bassR > midR && bassR > trebleR) {
      return centroid > 0.5 ? "yellow" : "coral";
    }
    if (trebleR > midR) {
      return centroid > 0.5 ? "blue" : "teal";
    }
    return midR > bassR ? "pink" : "purple";
  }

  var IDLE_FALLBACK_ENERGY = 0.14;

  function selectMosaicAccentGroup(primary, analysis) {
    var warm = {
      pink: "coral",
      coral: "orange",
      orange: "yellow",
      yellow: "orange",
      teal: "blue",
      blue: "purple",
      purple: "pink",
    };
    var contrast = {
      pink: "purple",
      coral: "pink",
      orange: "coral",
      yellow: "orange",
      teal: "purple",
      blue: "teal",
      purple: "blue",
    };
    if ((analysis.delta || 0) > 0.4) {
      return contrast[primary] || warm[primary] || "coral";
    }
    return warm[primary] || "coral";
  }

  function calcNormDist(col, row, focal, grid) {
    var dx = col - focal.x;
    var dy = row - focal.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxDist =
      Math.sqrt(
        Math.pow((grid.cols - 1) / 2, 2) + Math.pow((grid.rows - 1) / 2, 2)
      ) || 1;
    return dist / maxDist;
  }

  function calcMosaicSpatialContext(col, row, focal, grid, analysis) {
    var cols = grid.cols;
    var rows = grid.rows;
    var gMax = Math.max(cols, rows);
    var gAvg = (cols + rows) / 2;
    var dx = col - focal.x;
    var dy = row - focal.y;
    var normDist = calcNormDist(col, row, focal, grid);
    var spread = analysis.spread || 0;
    var delta = analysis.delta || 0;
    var centroid = analysis.centroid || 0.5;

    var radial = Math.max(0, 1 - normDist);
    radial = Math.pow(radial, 0.85);

    var hBand = Math.max(0, 1 - Math.abs(dy) / (rows * 0.34));
    hBand *= Math.max(0, 1 - Math.abs(dx) / (cols * 0.82));

    var vBand = Math.max(0, 1 - Math.abs(dx) / (cols * 0.26));
    vBand *= Math.max(0, 1 - Math.abs(dy) / (rows * 0.78));

    var cross = Math.max(hBand, vBand);

    var diagScale = gMax * 0.42;
    var diag1 = Math.abs(dx - dy) / diagScale;
    var diag2 = Math.abs(dx + dy) / diagScale;
    var xPattern = Math.max(0, 1 - Math.min(diag1, diag2));
    xPattern *= Math.max(0, 1 - normDist * 0.55);

    var manhattan = (Math.abs(dx) + Math.abs(dy)) / (gAvg * 0.54);
    var diamond = Math.max(0, 1 - manhattan);

    var chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
    var squareRingFreq = 3 + Math.floor(centroid * 4 + delta * 2);
    var ringDiv = gMax / squareRingFreq;
    if (ringDiv < 0.001) {
      ringDiv = 0.001;
    }
    var concentricSquare =
      Math.abs(Math.sin((chebyshev * Math.PI) / ringDiv)) *
      Math.max(0, 1 - (chebyshev / (gMax * 0.58)) * 0.75);

    var checkSize = Math.max(2, Math.floor(2 + spread * 5 + delta * 2));
    var checker =
      (Math.floor(col / checkSize) + Math.floor(row / checkSize)) % 2 === 0
        ? 1
        : 0.18;
    checker *= Math.max(0, 1 - normDist * 0.65);

    return {
      radial: radial,
      hBand: hBand,
      vBand: vBand,
      cross: cross,
      xPattern: xPattern,
      diamond: diamond,
      concentricSquare: concentricSquare,
      checker: checker,
      normDist: normDist,
    };
  }

  function quantizeTier(strength) {
    var q = Math.round(VibeUtils.clamp(strength, 0, 1) * 3) / 3;
    if (q < 0.34) {
      return 0;
    }
    if (q < 0.67) {
      return 1;
    }
    return 2;
  }

  function calcColorStrength(spatial, pattern) {
    var main = pattern && pattern.main ? pattern.main : "radial";
    var sub = pattern && pattern.sub ? pattern.sub : "diamond";
    var mainVal = spatial[main] != null ? spatial[main] : spatial.radial;
    var subVal = spatial[sub] != null ? spatial[sub] : 0;
    var strength = mainVal * 0.72 + subVal * 0.28;
    return Math.pow(VibeUtils.clamp(strength, 0, 1), 0.72);
  }

  function useAccentPalette(spatial, pattern) {
    var main = pattern && pattern.main ? pattern.main : "radial";
    var sub = pattern && pattern.sub ? pattern.sub : "diamond";

    if (main === "xPattern" || main === "checker") {
      return true;
    }
    if (sub === "xPattern" && spatial.xPattern > 0.55) {
      return true;
    }
    if (sub === "checker" && spatial.checker > 0.45 && spatial.normDist < 0.72) {
      return true;
    }
    if (main === "cross" && spatial.cross > 0.62) {
      return true;
    }
    if (main === "hBand" && spatial.vBand > spatial.hBand * 0.92) {
      return true;
    }
    if (main === "vBand" && spatial.hBand > spatial.vBand * 0.92) {
      return true;
    }
    return false;
  }

  function calcMosaicColor(col, row, energy, focal, analysis, grid, pattern) {
    var colors = getPoundstoneColors();
    var e = VibeUtils.clamp(energy || 0, 0, 1);
    var a = analysis || {};

    if (!colors) {
      return calcMosaicGray(e);
    }

    var primary = selectMosaicHueGroup(a);
    var accent = selectMosaicAccentGroup(primary, a);
    var spatial = calcMosaicSpatialContext(col, row, focal, grid, a);
    var strength = calcColorStrength(spatial, pattern || { main: "radial", sub: "diamond" });
    var tier = quantizeTier(strength);
    var group = useAccentPalette(spatial, pattern) ? accent : primary;
    var palette = colors[group] || colors.teal;
    var hex = palette[tier] || palette[0];
    var hsb = hexToHsb(hex);

    if (tier === 2) {
      hsb.s = VibeUtils.clamp(hsb.s * 1.04, 0, 100);
      hsb.b = VibeUtils.clamp(hsb.b * 1.02, 0, 100);
    } else if (tier === 0) {
      hsb.s = Math.max(0, hsb.s - 4);
      hsb.b = Math.min(100, hsb.b + 3);
    }

    return {
      h: hsb.h,
      s: hsb.s,
      b: VibeUtils.clamp(
        hsb.b * VibeUtils.mapValue(e, 0, 1, 0.82, 1.04),
        0,
        100
      ),
      a: VibeUtils.mapValue(e, 0, 1, 24, 100),
    };
  }

  function calcMosaicIdleColor(col, row, focal, grid) {
    var colors = getPoundstoneColors();
    var normDist = calcNormDist(col, row, focal, grid);

    if (normDist > 0.42) {
      return { h: 0, s: 0, b: 100, a: 0 };
    }

    if (!colors || !colors.teal) {
      return calcMosaicGray(IDLE_FALLBACK_ENERGY);
    }

    var strength = Math.pow(1 - normDist / 0.42, 1.2);
    var tier = quantizeTier(strength * 0.45);
    var hsb = hexToHsb(colors.teal[tier] || colors.teal[0]);

    return {
      h: hsb.h,
      s: Math.max(0, hsb.s - 6),
      b: Math.min(100, hsb.b + 4),
      a: VibeUtils.mapValue(strength, 0, 1, 8, 28),
    };
  }
  return {
    active: active,
    palettes: palettes,
    getActive: getActive,
    getShapeBackground: getShapeBackground,
    getShapeBackgroundIds: getShapeBackgroundIds,
    setShapeBackground: setShapeBackground,
    getShapeFamilyForProfile: getShapeFamilyForProfile,
    getShapePaletteIdForProfile: getShapePaletteIdForProfile,
    getShapeAccentPaletteId: getShapeAccentPaletteId,
    shapeFinalPalettes: shapeFinalPalettes,
    hexToHsb: hexToHsb,
    calcShapeCompositionColor: calcShapeCompositionColor,
    setActive: setActive,
    calcColor: calcColor,
    calcMosaicGray: calcMosaicGray,
    calcMosaicColor: calcMosaicColor,
    calcMosaicIdleColor: calcMosaicIdleColor,
    glowColor: glowColor,
  };
})();
