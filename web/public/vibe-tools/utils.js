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

  function spectrumIsUsable(spectrum) {
    if (!spectrum || !spectrum.length) return false;
    var sum = 0;
    var i;
    for (i = 0; i < spectrum.length; i++) {
      sum += spectrum[i] || 0;
    }
    return sum > 1;
  }

  function calcPositionMosaic(p, w, h, analysis) {
    var spectrum = analysis.spectrum;
    var useSpectrum = spectrumIsUsable(spectrum);
    var xBase;
    var yBase;

    if (useSpectrum) {
      var binCount = spectrum.length;
      var sectionSize = Math.max(1, Math.floor(binCount / 8));
      var sections = [];
      var s;
      var i;

      for (s = 0; s < 8; s++) {
        var secSum = 0;
        for (
          i = s * sectionSize;
          i < (s + 1) * sectionSize && i < binCount;
          i++
        ) {
          secSum += spectrum[i] || 0;
        }
        sections.push(secSum);
      }

      var maxSection = 0;
      var maxVal = 0;
      for (s = 0; s < sections.length; s++) {
        if (sections[s] > maxVal) {
          maxVal = sections[s];
          maxSection = s;
        }
      }
      xBase = mapValue(maxSection, 0, 7, 0, w);
    } else {
      xBase = mapValue(analysis.peakFreq || 500, 60, 8000, 0, w);
    }

    yBase = mapValue(
      analysis.centroid != null ? analysis.centroid : 0.5,
      0,
      1,
      h,
      0
    );

    var spread = analysis.spread || 0;
    var xScatter = mapValue(spread, 0, 1, w * 0.12, w * 0.42);
    var yScatter = mapValue(spread, 0, 1, h * 0.1, h * 0.38);
    xScatter += (analysis.delta || 0) * w * 0.25;
    yScatter += effectiveVolume(analysis.volume, analysis.isMic) * h * 0.15;

    return {
      x: clamp(xBase + p.random(-xScatter, xScatter), 0, w),
      y: clamp(yBase + p.random(-yScatter, yScatter), 0, h),
      useSpectrum: useSpectrum,
      spectrumLen: spectrum ? spectrum.length : 0,
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

  function createMosaicGroup(p, analysis, w, h) {
    var type = selectShapeType(analysis);
    var pos = calcPositionMosaic(p, w, h, analysis);
    var baseColor = VibePalettes.calcColor(analysis);
    var energy = dominantEnergy(analysis);
    if (analysis.isMic) energy = clamp(energy * 2.5, 8, 255);
    var maxDim = Math.min(w, h);
    var layerCount = Math.floor(mapValue(energy, 0, 255, 5, 12));
    var maxSize = mapValue(energy, 0, 255, maxDim * 0.06, maxDim * 0.58);
    var minLayerSize = maxSize * 0.1;
    var isMono = VibePalettes.getActive().name === "Mono";
    var bOuter = 100;
    var bInner = isMono ? 12 : 22;
    var bStep = layerCount > 1 ? (bOuter - bInner) / (layerCount - 1) : 0;
    if (isMono && bStep < 15) {
      layerCount = Math.min(
        12,
        Math.max(5, Math.floor((bOuter - bInner) / 15) + 1)
      );
      bStep = layerCount > 1 ? (bOuter - bInner) / (layerCount - 1) : 0;
    }
    var layers = [];
    var i;
    var t;
    var hueShift;
    var hCol;
    var sCol;
    var bCol;
    var layerSize;
    var layerLog = [];

    for (i = 0; i < layerCount; i++) {
      t = layerCount > 1 ? i / (layerCount - 1) : 0;
      hueShift = (t - 0.5) * 40;
      hCol = (baseColor.h + hueShift + 360) % 360;
      sCol = clamp(baseColor.s * mapValue(t, 0, 1, 1.05, 0.55), 0, 100);
      bCol = clamp(bOuter - i * bStep, bInner, 100);
      layerSize = mapValue(t, 0, 1, maxSize, minLayerSize);

      layers.push({
        type: type,
        x: pos.x,
        y: pos.y,
        size: layerSize,
        color: { h: hCol, s: sCol, b: bCol },
        alpha: mapValue(t, 0, 1, 18, 96),
        rotation: (analysis.centroid || 0) * Math.PI * 2 * t,
        layer: i,
      });

      layerLog.push({
        i: i,
        h: Math.round(hCol),
        s: Math.round(sCol),
        b: Math.round(bCol),
        alpha: Math.round(layers[i].alpha),
        size: Math.round(layerSize),
      });
    }

    console.log("[MOSAIC spawn]", {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      canvas: { w: w, h: h },
      spectrumOk: pos.useSpectrum,
      spectrumLen: pos.spectrumLen,
      spectrumUndefined: analysis.spectrum === undefined,
      peakFreq: Math.round(analysis.peakFreq || 0),
      centroid: (analysis.centroid || 0).toFixed(3),
      energy: Math.round(energy),
      maxSize: Math.round(maxSize),
      layerCount: layerCount,
      bStep: Math.round(bStep * 10) / 10,
      isMono: isMono,
      layers: layerLog,
    });

    return {
      layers: layers,
      phase: p.random(0, Math.PI * 2),
      birthTime: p.millis(),
      confirmed: false,
    };
  }

  function renderMosaicGroup(p, group, time, vibrate) {
    var i;
    var layer;
    var t;
    var motionAmp;
    var ox;
    var oy;

    for (i = 0; i < group.layers.length; i++) {
      layer = group.layers[i];
      t = group.layers.length > 1 ? layer.layer / (group.layers.length - 1) : 0;
      motionAmp = (1 - t) * 5;
      ox = p.sin(time * 0.5 + group.phase + i * 0.3) * motionAmp;
      oy = p.cos(time * 0.4 + group.phase + i * 0.5) * motionAmp;

      if (vibrate > 0) {
        ox += p.sin(time * 10 + i) * vibrate * (1 - t);
        oy += p.cos(time * 9 + i) * vibrate * (1 - t);
      }

      p.push();
      p.translate(layer.x + ox, layer.y + oy);
      p.rotate(layer.rotation);

      var strokeTypes = { ring: true, arc: true };
      if (strokeTypes[layer.type]) {
        p.stroke(layer.color.h, layer.color.s, layer.color.b, layer.alpha);
        p.noFill();
      } else {
        p.noStroke();
        p.fill(layer.color.h, layer.color.s, layer.color.b, layer.alpha);
      }

      drawShapeAtOrigin(p, layer.type, layer.size);
      p.pop();
    }
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
    createMosaicGroup: createMosaicGroup,
    renderMosaicGroup: renderMosaicGroup,
    shapeLabel: shapeLabel,
  };
})();
