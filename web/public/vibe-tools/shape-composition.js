/**
 * Shape composition — posterGrid slots, voice spawn, caps, no particle accumulation.
 * ES5 only. Do not use VibeUtils.drawConnections.
 */
var VibeShapeComposition = (function () {
  var MOTIF_GROUPS = {
    round: ["circle", "capsule", "pill", "ring"],
    sharp: [
      "triangle",
      "diamond",
      "star",
      "smallTriangle",
      "smallDiamond",
    ],
    structural: ["rect", "longBar", "capsule", "diamond"],
    textural: ["arc", "squiggle", "dotArc", "smallDotGroup", "dot"],
  };

  var TIER_CAP = {
    main: 3,
    mid: 7,
    accent: 12,
    line: 3,
  };

  var STROKE_TYPES = {
    ring: true,
    arc: true,
    orbitLine: true,
    squiggle: true,
  };

  function calcVoiceProfile(analysis) {
    return VibeUtils.calcVoiceProfile(analysis);
  }

  function getTemplateId(state, p) {
    return "posterGrid";
  }

  function slot(nx, ny, tier, key) {
    return { nx: nx, ny: ny, tier: tier, key: key };
  }

  function slotsForTemplate(id) {
    return [
      slot(0.22, 0.24, "main", "m0"),
      slot(0.52, 0.3, "main", "m1"),
      slot(0.76, 0.68, "main", "m2"),

      slot(0.28, 0.72, "mid", "a0"),
      slot(0.48, 0.55, "mid", "a1"),
      slot(0.74, 0.28, "mid", "a2"),
      slot(0.18, 0.52, "mid", "a3"),
      slot(0.58, 0.76, "mid", "a4"),
      slot(0.84, 0.48, "mid", "a5"),

      slot(0.12, 0.18, "accent", "c0"),
      slot(0.35, 0.18, "accent", "c1"),
      slot(0.64, 0.18, "accent", "c2"),
      slot(0.88, 0.22, "accent", "c3"),
      slot(0.14, 0.82, "accent", "c4"),
      slot(0.42, 0.84, "accent", "c5"),
      slot(0.68, 0.84, "accent", "c6"),
      slot(0.9, 0.78, "accent", "c7"),

      slot(0.5, 0.18, "line", "l0"),
      slot(0.5, 0.82, "line", "l1"),
    ];
  }

  function slotOccupied(pieces, key) {
    var i;
    for (i = 0; i < pieces.length; i++) {
      if (pieces[i].slotKey === key) return true;
    }
    return false;
  }

  function findFreeSlot(slots, pieces, tier, p) {
    var candidates = [];
    var i;
    var j;
    var tmp;
    for (i = 0; i < slots.length; i++) {
      if (slots[i].tier === tier) candidates.push(slots[i]);
    }
    for (i = candidates.length - 1; i > 0; i--) {
      j = Math.floor(p.random(i + 1));
      tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }
    for (i = 0; i < candidates.length; i++) {
      if (!slotOccupied(pieces, candidates[i].key)) return candidates[i];
    }
    return null;
  }

  function countTier(pieces, tier) {
    var n = 0;
    var i;
    for (i = 0; i < pieces.length; i++) {
      if (pieces[i].tier === tier) n++;
    }
    return n;
  }

  function removeOldestInTier(pieces, tier) {
    var bestI = -1;
    var bestT = 1e15;
    var i;
    var bt;
    for (i = 0; i < pieces.length; i++) {
      if (pieces[i].tier !== tier) continue;
      bt = pieces[i].birthMs != null ? pieces[i].birthMs : 0;
      if (bt < bestT) {
        bestT = bt;
        bestI = i;
      }
    }
    if (bestI >= 0) pieces.splice(bestI, 1);
  }

  function enforceCapsBeforeAdd(pieces, tier) {
    var cap = TIER_CAP[tier];
    if (cap == null) return;
    while (countTier(pieces, tier) >= cap) {
      removeOldestInTier(pieces, tier);
    }
  }

  function pruneGlobalCrowd(state) {
    var maxTotal = 46;
    var pieces = state.pieces;
    var i;
    while (pieces.length > maxTotal) {
      for (i = 0; i < pieces.length; i++) {
        if (pieces[i].tier === "accent") {
          pieces.splice(i, 1);
          break;
        }
      }
      if (i >= pieces.length) {
        for (i = 0; i < pieces.length; i++) {
          if (pieces[i].tier === "line") {
            pieces.splice(i, 1);
            break;
          }
        }
      }
      if (i >= pieces.length) {
        for (i = 0; i < pieces.length; i++) {
          if (pieces[i].tier === "mid") {
            pieces.splice(i, 1);
            break;
          }
        }
      }
      if (i >= pieces.length) {
        pieces.splice(0, 1);
      }
    }
  }

  function jitterSlot(slotDef, spread, p) {
    var jx = spread * 0.08 * p.random(-1, 1);
    var jy = spread * 0.08 * p.random(-1, 1);
    return {
      nx: VibeUtils.clamp(slotDef.nx + jx, 0.02, 0.98),
      ny: VibeUtils.clamp(slotDef.ny + jy, 0.02, 0.98),
    };
  }

  function colorRoleForTier(tier, profileDominant) {
    if (tier === "line") return "line";
    if (tier === "accent") return "accent";
    if (tier === "main") return "bass";
    if (tier === "mid") return "mid";
    return "mid";
  }

  function pickMotifTypeFromVoice(profile, tier, p) {
    profile = profile || {};
    var group = profile.dominant || "round";

    if (tier === "accent" && profile.activity > 0.25) {
      group = "sharp";
    }

    if (tier === "line") {
      group = profile.texture > 0.42 ? "textural" : "structural";
    }

    if (tier === "mid") {
      if (profile.structure >= profile.sharpness - 0.05) {
        group = "structural";
      } else {
        group = "sharp";
      }
    }

    if (tier === "main") {
      if (profile.roundness > 0.48 && profile.roundness >= profile.sharpness) {
        group = "round";
      } else if (profile.sharpness > 0.48) {
        group = "sharp";
      } else if (profile.structure > 0.44) {
        group = "structural";
      }
    }

    var list = MOTIF_GROUPS[group] || MOTIF_GROUPS.structural;
    return list[Math.floor(p.random(list.length))];
  }

  function baseSizeForTier(tier, volQ, w, h) {
    var m = Math.min(w, h);

    if (tier === "main") {
      return m * (0.085 + volQ * 0.03);
    }

    if (tier === "mid") {
      return m * (0.052 + volQ * 0.022);
    }

    if (tier === "line") {
      return m * (0.07 + volQ * 0.025);
    }

    if (tier === "accent") {
      return m * (0.024 + volQ * 0.014);
    }

    return m * 0.04;
  }

  function drawCleanStar(p, size) {
    var outer = size * 0.45;
    var inner = size * 0.22;
    var points = 5;
    var angle = p.TWO_PI / points;
    var half = angle / 2;
    var a;

    p.beginShape();
    for (a = -p.HALF_PI; a < p.TWO_PI - p.HALF_PI; a += angle) {
      p.vertex(p.cos(a) * outer, p.sin(a) * outer);
      p.vertex(p.cos(a + half) * inner, p.sin(a + half) * inner);
    }
    p.endShape(p.CLOSE);
  }

  function drawCleanSquiggle(p, size) {
    var steps = 28;
    var i;
    var t;
    var x;
    var y;
    var amp = size * 0.11;
    var len = size * 0.55;

    p.noFill();
    p.strokeWeight(Math.max(1.2, size * 0.04));
    p.beginShape();

    for (i = 0; i <= steps; i++) {
      t = i / steps;
      x = (t - 0.5) * len * 2;
      y = Math.sin(t * Math.PI * 2.5) * amp;
      p.vertex(x, y);
    }

    p.endShape();
  }

  function drawDotArcFilled(p, size) {
    var count = 8;
    var i;
    var a;
    var r = size * 0.42;
    var d = size * 0.07;

    for (i = 0; i < count; i++) {
      a = p.map(i, 0, count - 1, -p.PI * 0.85, p.PI * 0.25);
      p.circle(Math.cos(a) * r, Math.sin(a) * r, d);
    }
  }

  function seededUnit(seed, i) {
    var x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawSmallDotGroup(p, size, seed) {
    var count = 7;
    var i;
    var rx;
    var ry;

    for (i = 0; i < count; i++) {
      rx = seededUnit(seed, i) - 0.5;
      ry = seededUnit(seed, i + 99) - 0.5;
      p.circle(rx * size * 0.72, ry * size * 0.52, size * 0.08);
    }
  }

  function drawShapeBody(p, typ, size, seed) {
    if (typ === "circle") {
      p.circle(0, 0, size);
    } else if (typ === "ring") {
      p.noFill();
      p.strokeWeight(Math.max(1.4, size * 0.055));
      p.circle(0, 0, size);
    } else if (typ === "capsule") {
      p.rectMode(p.CENTER);
      p.rect(0, 0, size * 1.05, size * 0.42, size * 0.21);
    } else if (typ === "pill") {
      p.rectMode(p.CENTER);
      p.rect(0, 0, size * 0.42, size * 1.05, size * 0.21);
    } else if (typ === "rect") {
      p.rectMode(p.CENTER);
      p.rect(0, 0, size * 0.95, size * 0.58, size * 0.045);
    } else if (typ === "longBar") {
      p.rectMode(p.CENTER);
      p.rect(0, 0, size * 1.45, size * 0.18, size * 0.04);
    } else if (typ === "triangle") {
      var th = size * 0.866;
      p.triangle(
        0,
        -th * 0.55,
        -size * 0.48,
        th * 0.38,
        size * 0.48,
        th * 0.38
      );
    } else if (typ === "smallTriangle") {
      var ts = size * 0.68;
      var sth = ts * 0.866;
      p.triangle(
        0,
        -sth * 0.55,
        -ts * 0.48,
        sth * 0.38,
        ts * 0.48,
        sth * 0.38
      );
    } else if (typ === "diamond") {
      p.quad(
        0,
        -size * 0.48,
        size * 0.36,
        0,
        0,
        size * 0.48,
        -size * 0.36,
        0
      );
    } else if (typ === "smallDiamond") {
      var ds = size * 0.68;
      p.quad(
        0,
        -ds * 0.48,
        ds * 0.36,
        0,
        0,
        ds * 0.48,
        -ds * 0.36,
        0
      );
    } else if (typ === "star") {
      drawCleanStar(p, size);
    } else if (typ === "arc") {
      p.noFill();
      p.strokeWeight(Math.max(1.3, size * 0.045));
      p.arc(0, 0, size, size, -p.PI * 0.68, p.PI * 0.68);
    } else if (typ === "squiggle") {
      drawCleanSquiggle(p, size);
    } else if (typ === "dotArc") {
      drawDotArcFilled(p, size);
    } else if (typ === "smallDotGroup") {
      drawSmallDotGroup(p, size, seed);
    } else if (typ === "dot") {
      p.circle(0, 0, size * 0.22);
    } else {
      p.circle(0, 0, size * 0.6);
    }
  }

  function drawPiece(p, pc, time) {
    var c = pc.color;
    var sz = pc.displaySize != null ? pc.displaySize : pc.baseSize;
    var ctx = p.drawingContext;
    var strokeMotif = !!STROKE_TYPES[pc.type];
    var al = VibeUtils.clamp(pc.alpha, 0, 100);

    p.push();
    p.translate(pc.x, pc.y);
    p.rotate(pc.rotation);

    if (ctx) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = "rgba(0,0,0,0)";
    }

    if (p.strokeCap) p.strokeCap(p.ROUND);
    if (p.strokeJoin) p.strokeJoin(p.ROUND);

    if (strokeMotif) {
      p.stroke(c.h, c.s, c.b, al);
      p.noFill();
    } else {
      p.noStroke();
      p.fill(c.h, c.s, c.b, al);
    }

    drawShapeBody(p, pc.type, sz, pc.seed);

    p.noStroke();
    p.pop();
  }

  function spawnPiece(state, analysis, p, w, h, slotDef, famId, profile) {
    var tier = slotDef.tier;
    enforceCapsBeforeAdd(state.pieces, tier);

    profile = profile || calcVoiceProfile(analysis);

    var spread = analysis.spread || 0;
    var js = jitterSlot(slotDef, spread, p);
    var volEff = VibeUtils.effectiveVolume(analysis.volume, analysis.isMic);
    var volQ01 = VibeUtils.clamp(volEff, 0, 1);
    var typ = pickMotifTypeFromVoice(profile, tier, p);

    var role = colorRoleForTier(tier, profile.dominant);
    var col = VibePalettes.calcShapeCompositionColor(
      famId,
      role,
      analysis.centroid,
      analysis.peakFreq,
      profile.dominant
    );

    var sz = baseSizeForTier(tier, volQ01, w, h);

    if (typ === "dot") sz *= 0.42;
    if (typ === "smallTriangle" || typ === "smallDiamond") sz *= 0.58;
    if (typ === "smallDotGroup") sz *= 0.72;
    if (typ === "star" && tier === "accent") sz *= 0.72;
    if (typ === "ring") sz *= 0.9;

    var rot = p.random(0, p.TWO_PI);
    if (
      typ === "rect" ||
      typ === "longBar" ||
      typ === "capsule" ||
      typ === "pill"
    ) {
      var angles = [0, p.HALF_PI, -p.HALF_PI, p.PI * 0.08, -p.PI * 0.08];
      rot = angles[Math.floor(p.random(angles.length))];
    }

    state.pieceId++;

    var targetAlpha =
      tier === "line"
        ? 82
        : tier === "accent"
          ? 100
          : 94;

    var piece = {
      id: state.pieceId,
      tier: tier,
      type: typ,
      slotKey: slotDef.key,
      nx: js.nx,
      ny: js.ny,
      x: js.nx * w,
      y: js.ny * h,
      baseSize: sz,
      displaySize: sz,
      rotation: rot,
      rotVel: p.random(-0.01, 0.01) * (1 + (analysis.delta || 0) * 2),
      color: col,
      alpha: 0,
      targetAlpha: targetAlpha,
      birthMs: p.millis(),
      life: 1,
      seed: p.random(0, 10000),
      lineVariant: Math.floor(p.random(0, 3)),
      voiceProfile: profile.dominant,
    };

    window.VibeShapeProfileDebug = {
      dominant: profile.dominant,
      roundness: profile.roundness,
      sharpness: profile.sharpness,
      structure: profile.structure,
      texture: profile.texture,
    };

    state.pieces.push(piece);
  }

  function createState() {
    return {
      pieces: [],
      lastEventMs: 0,
      prevVolRaw: 0,
      sessionStartMs: 0,
      pieceId: 0,
    };
  }

  function resetState(state, p) {
    state.pieces = [];
    state.lastEventMs = 0;
    state.prevVolRaw = 0;
    state.sessionStartMs = p ? p.millis() : 0;
    state.pieceId = 0;
  }

  function detectVoiceEvent(state, analysis, p) {
    if (!analysis.isSound) return false;

    var now = p.millis();

    if (state.lastEventMs === 0) {
      state.lastEventMs = now;
      state.prevVolRaw = VibeUtils.effectiveVolume(
        analysis.volume,
        analysis.isMic
      );
      return true;
    }

    var volEff = VibeUtils.effectiveVolume(analysis.volume, analysis.isMic);
    var cd = 260 + (1 - VibeUtils.clamp(volEff, 0, 1)) * 440;

    if (now - state.lastEventMs < cd) return false;

    var volTh = analysis.isMic ? 0.035 : 0.065;
    var volEvt = volEff > volTh;
    var deltaEvt = (analysis.delta || 0) > 0.1;
    var onset =
      Math.abs(volEff - state.prevVolRaw) >
      (analysis.isMic ? 0.07 : 0.12);

    state.prevVolRaw = volEff;

    return volEvt || deltaEvt || onset;
  }

  function onVoiceEvent(state, analysis, p, w, h) {
    var profile = calcVoiceProfile(analysis);
    var famId = VibePalettes.getShapeFamilyForProfile
      ? VibePalettes.getShapeFamilyForProfile(profile)
      : "brightPoster";

    var slots = slotsForTemplate(getTemplateId(state, p));

    if (p.random() < 0.45) {
      var mainSlot = findFreeSlot(slots, state.pieces, "main", p);
      if (mainSlot) {
        spawnPiece(state, analysis, p, w, h, mainSlot, famId, profile);
      }
    }

    if (p.random() < 0.85) {
      var md = findFreeSlot(slots, state.pieces, "mid", p);
      if (md) spawnPiece(state, analysis, p, w, h, md, famId, profile);
    }

    var acCount = 1 + Math.floor(p.random(0, 3));
    var ai;
    for (ai = 0; ai < acCount; ai++) {
      var ac = findFreeSlot(slots, state.pieces, "accent", p);
      if (ac) spawnPiece(state, analysis, p, w, h, ac, famId, profile);
    }

    if (p.random() < 0.35) {
      var ln = findFreeSlot(slots, state.pieces, "line", p);
      if (ln) spawnPiece(state, analysis, p, w, h, ln, famId, profile);
    }

    state.lastEventMs = p.millis();
  }

  function updatePieces(state, analysis, p, w, h) {
    if (!analysis) return;
    w = Math.max(1, w);
    h = Math.max(1, h);
    var volEff = VibeUtils.effectiveVolume(analysis.volume, analysis.isMic);
    var t = p.millis() * 0.001;
    var i;
    var pc;
    var breath;
    var alphaTarget;

    for (i = 0; i < state.pieces.length; i++) {
      pc = state.pieces[i];

      pc.rotation += pc.rotVel * (1 + (analysis.delta || 0) * 1.6);
      pc.x = pc.nx * w;
      pc.y = pc.ny * h;

      breath = 1 + Math.sin(t * 1.2 + pc.seed * 0.01) * 0.018 * volEff;
      pc.displaySize = pc.baseSize * breath;

      if (analysis.isSound) {
        pc.life = VibeUtils.clamp(pc.life + 0.003 * volEff, 0, 1);
      } else {
        pc.life -= 0.0012;
      }

      alphaTarget = pc.targetAlpha * VibeUtils.clamp(pc.life + 0.18, 0, 1);
      pc.alpha += (alphaTarget - pc.alpha) * 0.08;

      if (pc.life < 0.08 || pc.alpha < 4) {
        state.pieces.splice(i, 1);
        i--;
      }
    }

    pruneGlobalCrowd(state);
  }

  function drawSortedPieces(p, state, time) {
    var order = ["main", "mid", "line", "accent"];
    var oi;
    var i;
    var pc;

    for (oi = 0; oi < order.length; oi++) {
      for (i = 0; i < state.pieces.length; i++) {
        pc = state.pieces[i];
        if (pc.tier === order[oi]) {
          drawPiece(p, pc, time);
        }
      }
    }
  }

  function drawGrainOverlay(p, bgDef) {
    return;
  }

  return {
    createState: createState,
    resetState: resetState,
    detectVoiceEvent: detectVoiceEvent,
    onVoiceEvent: onVoiceEvent,
    updatePieces: updatePieces,
    drawSortedPieces: drawSortedPieces,
    drawGrainOverlay: drawGrainOverlay,
    calcVoiceProfile: calcVoiceProfile,
    MOTIF_GROUPS: MOTIF_GROUPS,
    pickMotifTypeFromVoice: pickMotifTypeFromVoice,
    baseSizeForTier: baseSizeForTier,
  };
})();
