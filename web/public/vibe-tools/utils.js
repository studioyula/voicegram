var VibeUtils = (function () {
  var SHAPE_TYPES = [
    "circle",
    "ring",
    "rect",
    "triangle",
    "star",
    "diamond",
    "cross",
    "arc",
  ];

  function mapValue(val, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    var t = (val - inMin) / (inMax - inMin);
    t = Math.max(0, Math.min(1, t));
    return outMin + t * (outMax - outMin);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function dominantEnergy(analysis) {
    return Math.max(analysis.bass, analysis.mid, analysis.treble);
  }

  function effectiveVolume(volume, isMic) {
    if (!isMic) return volume;
    return clamp(volume * 12, 0, 1);
  }

  function selectShapeType(analysis) {
    var freq = analysis.peakFreq || 200;
    var spread = analysis.spread || 0;

    if (freq < 150) return spread > 0.5 ? "ring" : "circle";
    if (freq < 400) return spread > 0.5 ? "arc" : "rect";
    if (freq < 1000) {
      if (spread > 0.6) return "cross";
      if (spread > 0.3) return "diamond";
      return "triangle";
    }
    if (freq < 3000) return spread > 0.5 ? "star" : "triangle";
    return spread > 0.5 ? "star" : "diamond";
  }

  function calcSize(type, energy, canvasW, canvasH) {
    var e = energy / 255;
    var maxDim = Math.min(canvasW, canvasH);

    switch (type) {
      case "circle":
      case "ring":
        return mapValue(e, 0, 1, 20, maxDim * 0.35);
      case "rect":
        return mapValue(e, 0, 1, 15, maxDim * 0.25);
      case "triangle":
      case "diamond":
        return mapValue(e, 0, 1, 12, maxDim * 0.2);
      case "star":
        return mapValue(e, 0, 1, 10, maxDim * 0.18);
      case "cross":
        return mapValue(e, 0, 1, 15, maxDim * 0.22);
      case "arc":
        return mapValue(e, 0, 1, 30, maxDim * 0.4);
      default:
        return mapValue(e, 0, 1, 10, 100);
    }
  }

  function calcPositionShape(p, w, h, analysis) {
    var spectrum = analysis.spectrum;
    var xBase = w * 0.5;
    var yBase = h * 0.5;

    if (spectrum && spectrum.length) {
      var peakBin = 0;
      var peakE = 0;
      var i;
      for (i = 0; i < spectrum.length; i++) {
        if (spectrum[i] > peakE) {
          peakE = spectrum[i];
          peakBin = i;
        }
      }
      xBase = mapValue(peakBin, 0, spectrum.length, w * 0.08, w * 0.92);
    } else {
      xBase = mapValue(analysis.peakFreq || 500, 60, 8000, w * 0.08, w * 0.92);
    }

    var xScatter = (analysis.spread || 0) * w * 0.35;
    yBase = mapValue(analysis.centroid != null ? analysis.centroid : 0.5, 0, 1, h * 0.8, h * 0.15);
    var yScatter = h * 0.15;

    return {
      x: clamp(xBase + p.random(-xScatter, xScatter), w * 0.05, w * 0.95),
      y: clamp(yBase + p.random(-yScatter, yScatter), h * 0.05, h * 0.95),
    };
  }

  function calcAlpha(volume, isMic) {
    var v = isMic ? clamp(volume * 12, 0, 1) : volume;
    return mapValue(v, 0, 1, 8, 95);
  }

  function calcSpawnCount(analysis) {
    var base = 1;
    var extra = Math.floor((analysis.delta || 0) * 7);
    var vol = effectiveVolume(analysis.volume, analysis.isMic);
    if (vol > 0.7) extra += 2;
    return clamp(base + extra, 1, 10);
  }

  function rotationFromSpectrum(p, analysis) {
    var total = analysis.bass + analysis.mid + analysis.treble || 1;
    var ratio = analysis.mid / total * 0.5 + analysis.treble / total;
    return p.map(ratio, 0, 1, 0, p.TWO_PI);
  }

  function drawStar(p, cx, cy, innerR, outerR, points) {
    var angle = p.TWO_PI / points;
    var half = angle / 2;
    p.beginShape();
    var a;
    for (a = -p.HALF_PI; a < p.TWO_PI - p.HALF_PI; a += angle) {
      p.vertex(cx + p.cos(a) * outerR, cy + p.sin(a) * outerR);
      p.vertex(cx + p.cos(a + half) * innerR, cy + p.sin(a + half) * innerR);
    }
    p.endShape(p.CLOSE);
  }

  function drawShapeAtOrigin(p, type, size) {
    var th;
    var s;
    var arm;
    var len;
    var i;
    var n;
    var r;
    var ang;
    var steps;
    var amp;
    var len2;
    var t;
    var u;
    var d;

    switch (type) {
      case "circle":
      case "blob":
        p.push();
        if (type === "blob") {
          p.scale(1.08, 0.94);
        }
        p.circle(0, 0, size);
        p.pop();
        break;
      case "ring":
        p.noFill();
        p.strokeWeight(size * 0.08);
        p.circle(0, 0, size);
        break;
      case "rect":
      case "stripeBlock":
        p.rectMode(p.CENTER);
        if (type === "stripeBlock") {
          p.rect(0, 0, size * 0.55, size * 0.38, size * 0.04);
        } else {
          p.rect(0, 0, size, size * 0.6, size * 0.05);
        }
        break;
      case "longBar":
        p.rectMode(p.CENTER);
        p.rect(0, 0, size * 1.15, size * 0.11, size * 0.02);
        break;
      case "capsule":
        p.rectMode(p.CENTER);
        p.rect(0, 0, size * 0.38, size * 0.95, size * 0.2);
        break;
      case "pill":
        p.rectMode(p.CENTER);
        p.rect(0, 0, size * 0.95, size * 0.35, size * 0.18);
        break;
      case "pixelStair":
        u = size * 0.12;
        p.rectMode(p.CENTER);
        p.rect(-u, u, u * 1.2, u);
        p.rect(0, 0, u * 1.2, u);
        p.rect(u, -u, u * 1.2, u);
        break;
      case "triangle":
        th = size * 0.866;
        p.triangle(0, -th * 0.6, -size * 0.5, th * 0.4, size * 0.5, th * 0.4);
        break;
      case "smallTriangle":
        s = size * 0.65;
        th = s * 0.866;
        p.triangle(0, -th * 0.6, -s * 0.5, th * 0.4, s * 0.5, th * 0.4);
        break;
      case "outlineTriangle":
        p.noFill();
        p.strokeWeight(size * 0.055);
        th = size * 0.866;
        p.triangle(0, -th * 0.6, -size * 0.5, th * 0.4, size * 0.5, th * 0.4);
        break;
      case "star":
        drawStar(p, 0, 0, size * 0.25, size * 0.5, 5);
        break;
      case "sunburst":
        p.noFill();
        p.strokeWeight(size * 0.04);
        n = 10;
        r = size * 0.48;
        for (i = 0; i < n; i++) {
          ang = (i / n) * p.TWO_PI;
          p.line(0, 0, p.cos(ang) * r, p.sin(ang) * r);
        }
        break;
      case "diamond":
      case "smallDiamond":
        s = type === "smallDiamond" ? size * 0.65 : size;
        p.quad(0, -s * 0.5, s * 0.35, 0, 0, s * 0.5, -s * 0.35, 0);
        break;
      case "cross":
        arm = size * 0.15;
        len = size * 0.5;
        p.rectMode(p.CENTER);
        p.rect(0, 0, arm, len);
        p.rect(0, 0, len, arm);
        break;
      case "arc":
        p.noFill();
        p.strokeWeight(size * 0.06);
        p.arc(0, 0, size, size, -p.PI * 0.6, p.PI * 0.6);
        break;
      case "dotArc":
        p.noFill();
        p.strokeWeight(size * 0.05);
        p.arc(0, 0, size, size, -0.4 * p.PI, 0.9 * p.PI);
        break;
      case "arch":
        p.noFill();
        p.strokeWeight(size * 0.055);
        p.arc(0, 0, size * 0.95, size * 0.55, p.PI * 1.05, p.PI * 1.95, p.OPEN);
        break;
      case "halfCircle":
        p.arc(0, 0, size, size, 0, p.PI, p.PIE);
        break;
      case "orbitLine":
        p.noFill();
        p.strokeWeight(size * 0.05);
        p.ellipse(0, 0, size, size * 0.72);
        break;
      case "squiggle":
        p.noFill();
        p.strokeWeight(size * 0.045);
        p.beginShape();
        steps = 24;
        amp = size * 0.12;
        len2 = size * 0.45;
        for (i = 0; i <= steps; i++) {
          t = (i / steps) * 2 - 1;
          p.vertex(t * len2, p.sin(t * p.PI * 3) * amp);
        }
        p.endShape();
        break;
      case "smallDotGroup":
        d = size * 0.1;
        p.circle(-size * 0.15, 0, d);
        p.circle(size * 0.15, 0, d);
        p.circle(0, -size * 0.12, d * 0.85);
        break;
      case "dot":
        p.circle(0, 0, size * 0.15);
        break;
      default:
        p.circle(0, 0, size);
        break;
    }
  }

  function drawShape(p, type, size, rotation) {
    p.push();
    p.rotate(rotation);
    drawShapeAtOrigin(p, type, size);
    p.pop();
  }

  function createElementary(p, analysis, w, h) {
    var energy = dominantEnergy(analysis);
    if (analysis.isMic) energy = clamp(energy * 2.5, 8, 255);
    var type = selectShapeType(analysis);
    var pos = calcPositionShape(p, w, h, analysis);
    var color = VibePalettes.calcColor(analysis);
    var spread = analysis.spread || 0;

    return {
      type: type,
      x: pos.x,
      y: pos.y,
      size: calcSize(type, energy, w, h),
      color: color,
      alpha: calcAlpha(analysis.volume, analysis.isMic),
      rotation: rotationFromSpectrum(p, analysis),
      phase: p.random(0, p.TWO_PI * 2),
      driftPhase: p.random(0, 1000),
      confirmed: false,
      centroid: analysis.centroid || 0,
      velocityX: p.random(-spread, spread) * 4,
      velocityY: p.random(-spread, spread) * 4,
      birthTime: p.millis(),
    };
  }

  function updateElementary(p, el, analysis, w, h) {
    var energy = dominantEnergy(analysis);
    if (analysis.isMic) energy = clamp(energy * 2.5, 8, 255);
    el.type = selectShapeType(analysis);
    el.size = calcSize(el.type, energy, w, h);
    el.color = VibePalettes.calcColor(analysis);
    el.alpha = calcAlpha(analysis.volume, analysis.isMic);
    el.rotation = rotationFromSpectrum(p, analysis);
    el.centroid = analysis.centroid || 0;
    el.x += el.velocityX * 0.15;
    el.y += el.velocityY * 0.15;
  }

  function calcMotionOffset(p, el, time, vibrate) {
    var ox = 0;
    var oy = 0;

    switch (el.type) {
      case "circle":
      case "ring":
        ox = p.sin(time * 0.4 + el.phase) * 6;
        oy = p.cos(time * 0.35 + el.phase) * 6;
        break;
      case "rect":
      case "cross":
        ox = p.sin(time * 0.6 + el.phase) * 8;
        oy = p.sin(time * 0.15 + el.phase) * 2;
        break;
      case "triangle":
      case "diamond":
        ox = p.sin(time * 0.3 + el.phase) * 3;
        oy = -Math.abs(p.sin(time * 0.8 + el.phase)) * 8;
        break;
      case "star":
        ox = p.random(-2, 2);
        oy = p.random(-2, 2);
        break;
      case "arc":
        ox = p.sin(time * 0.2 + el.phase) * 10;
        oy = p.cos(time * 0.15 + el.phase) * 4;
        el.rotation += 0.003;
        break;
    }

    if (vibrate > 0) {
      ox += p.sin(time * 12 + el.phase) * vibrate;
      oy += p.cos(time * 11 + el.phase) * vibrate;
    }

    return { x: ox, y: oy };
  }

  function calcTrailAlpha(analysis) {
    var vol = effectiveVolume(analysis.volume, analysis.isMic);
    if (!analysis.isSound) return 6;
    return mapValue(vol, 0, 1, 8, 25);
  }

  function calcGlow(centroid, confirmed) {
    var base = confirmed ? 20 : 10;
    return base + (centroid || 0) * 40;
  }

  function calcVoiceProfile(analysis) {
    var bass = analysis.bass || 0;
    var mid = analysis.mid || 0;
    var treble = analysis.treble || 0;
    var total = bass + mid + treble || 1;

    var bassR = bass / total;
    var midR = mid / total;
    var trebleR = treble / total;

    var centroid = analysis.centroid != null ? analysis.centroid : 0.5;
    var spread = analysis.spread || 0;
    var delta = analysis.delta || 0;
    var vol = effectiveVolume(analysis.volume, analysis.isMic);

    var pitchNorm = mapValue(
      analysis.peakFreq || 220,
      80,
      3000,
      0,
      1
    );

    var roundness = clamp(
      bassR * 0.45 + (1 - centroid) * 0.32 + (1 - pitchNorm) * 0.23,
      0,
      1
    );

    var sharpness = clamp(
      trebleR * 0.35 + centroid * 0.35 + pitchNorm * 0.2 + delta * 0.1,
      0,
      1
    );

    var structure = clamp(
      midR * 0.55 + (1 - spread) * 0.25 + vol * 0.2,
      0,
      1
    );

    var texture = clamp(
      spread * 0.55 + delta * 0.3 + centroid * 0.15,
      0,
      1
    );

    var dominant = "round";
    var maxVal = roundness;

    if (sharpness > maxVal) {
      dominant = "sharp";
      maxVal = sharpness;
    }

    if (structure > maxVal) {
      dominant = "structural";
      maxVal = structure;
    }

    if (texture > maxVal) {
      dominant = "textural";
      maxVal = texture;
    }

    return {
      roundness: roundness,
      sharpness: sharpness,
      structure: structure,
      texture: texture,
      dominant: dominant,
      weight: bassR,
      brightness: centroid,
      activity: delta,
      volume: vol,
      pitch: pitchNorm,
    };
  }

  function getDrawPosition(p, el, time, vibrate) {
    var m = calcMotionOffset(p, el, time, vibrate);
    return { x: el.x + m.x, y: el.y + m.y };
  }

  function drawConnections(p, items, maxDist) {
    var pal = VibePalettes.getActive();
    var recent = items.slice(-50);
    var i;
    var j;
    for (i = 0; i < recent.length; i++) {
      for (j = i + 1; j < recent.length; j++) {
        var d = p.dist(recent[i].dx, recent[i].dy, recent[j].dx, recent[j].dy);
        if (d < maxDist) {
          var alpha = mapValue(d, 0, maxDist, 30, 2);
          p.stroke(pal.connection.h, pal.connection.s, pal.connection.b, alpha);
          p.strokeWeight(0.5);
          p.line(recent[i].dx, recent[i].dy, recent[j].dx, recent[j].dy);
        }
      }
    }
    p.noStroke();
  }

  function shapeLabel(type) {
    return (type || "").toUpperCase();
  }

  return {
    SHAPE_TYPES: SHAPE_TYPES,
    mapValue: mapValue,
    clamp: clamp,
    effectiveVolume: effectiveVolume,
    selectShapeType: selectShapeType,
    calcSpawnCount: calcSpawnCount,
    createElementary: createElementary,
    updateElementary: updateElementary,
    drawShape: drawShape,
    drawShapeAtOrigin: drawShapeAtOrigin,
    calcMotionOffset: calcMotionOffset,
    calcTrailAlpha: calcTrailAlpha,
    calcGlow: calcGlow,
    calcVoiceProfile: calcVoiceProfile,
    getDrawPosition: getDrawPosition,
    drawConnections: drawConnections,
    shapeLabel: shapeLabel,
  };
})();
