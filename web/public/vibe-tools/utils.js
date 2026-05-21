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
    switch (type) {
      case "circle":
        p.circle(0, 0, size);
        break;
      case "ring":
        p.noFill();
        p.strokeWeight(size * 0.08);
        p.circle(0, 0, size);
        break;
      case "rect":
        p.rectMode(p.CENTER);
        p.rect(0, 0, size, size * 0.6, size * 0.05);
        break;
      case "triangle":
        var th = size * 0.866;
        p.triangle(0, -th * 0.6, -size * 0.5, th * 0.4, size * 0.5, th * 0.4);
        break;
      case "star":
        drawStar(p, 0, 0, size * 0.25, size * 0.5, 5);
        break;
      case "diamond":
        p.quad(0, -size * 0.5, size * 0.35, 0, 0, size * 0.5, -size * 0.35, 0);
        break;
      case "cross":
        var arm = size * 0.15;
        var len = size * 0.5;
        p.rectMode(p.CENTER);
        p.rect(0, 0, arm, len);
        p.rect(0, 0, len, arm);
        break;
      case "arc":
        p.noFill();
        p.strokeWeight(size * 0.06);
        p.arc(0, 0, size, size, -p.PI * 0.6, p.PI * 0.6);
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
    getDrawPosition: getDrawPosition,
    drawConnections: drawConnections,
    shapeLabel: shapeLabel,
  };
})();
