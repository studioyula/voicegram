var VibePalettes = (function () {
  var palettes = {
    mono: {
      name: "Mono",
      bg: [0, 0, 0],
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

  return {
    active: active,
    palettes: palettes,
    getActive: getActive,
    setActive: setActive,
    calcColor: calcColor,
    glowColor: glowColor,
  };
})();
