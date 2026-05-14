/**
 * text-reveal-trackmatte-slide.jsx
 *
 * 선택 레이어마다: 바운딩박스와 동일한 알파 트랙매트(사각 셰이프)를 만들고,
 * 매트는 고정, 레이어 Position만 0s→1s→2s→3s 키로 슬라이드 인/아웃.
 * 등장 방향과 같은 축으로 퇴장(예: 아래→위 등장이면 위로 퇴장).
 *
 * 방향: fromLeft | fromRight | fromTop | fromBottom
 * 모드: single(전부 동일) | cycle(레이어마다 순환) | random(레이어마다 랜덤)
 *
 * ES3 / ExtendScript (AE)
 */

// ============ CONFIG (여기만 바꿔 베리에이션) ============
/** "random" | "single" | "cycle" */
var DIRECTION_MODE = "random";
/** DIRECTION_MODE === "single" 일 때만 사용 */
var SINGLE_DIRECTION = "fromBottom";
/** random 모드 시드 (같은 선택+시드면 방향 패턴 재현) */
var RANDOM_SEED = 20260511;

var T_ENTER_START = 0;
var T_ENTER_END = 1;
var T_HOLD_END = 2;
var T_EXIT_END = 3;

/** "bounds" = max(w,h)*SLIDE_MULT | "fixed" = FIXED_ENTER_OFF / FIXED_EXIT_OFF */
var SLIDE_MODE = "fixed";
var SLIDE_MULT = 1.35;
var MIN_SLIDE_PX = 80;
var FIXED_ENTER_OFF = 140;
var FIXED_EXIT_OFF = 120;
/** 등장·퇴장 시 마스크 박스 밖으로 추가로 빼는 여유(px). 가장자리 선 노출 방지 */
var REVEAL_EDGE_PAD = 2;

var HIDE_MATTE_LAYER_VIDEO = true;
var MATTE_NAME_PREFIX = "TM_Reveal_";
var SKIP_IF_ALREADY_REVEALED = true;
/** true면 TM_Reveal_* 가 이미 붙은 레이어는 매트 유지·Position 키만 방향 재계산 */
var UPDATE_EXISTING_REVEAL = false;

/** 선택이 비었을 때만 사용. 빈 문자열이면 폴백 없음(타임라인에서 반드시 선택). */
var FALLBACK_COMP_NAME = "";
var FALLBACK_TEXT_EQUALS = "";
// ======================================================

var ALL_DIRECTIONS = ["fromLeft", "fromRight", "fromTop", "fromBottom"];

function trimStr(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function safeNumTime(t, fallback) {
  var tt = Number(t);
  var fb = typeof fallback === "number" ? fallback : T_ENTER_END;
  if (typeof tt !== "number" || isNaN(tt)) {
    return fb;
  }
  return tt;
}

/**
 * AE 일부 Shape/분리 차원 레이어에서 복합 Position·Scale 의 valueAtTime 이 실패할 수 있음
 * ("Unable to call valueAtTime … Shape is not a number"). 분리 접근 + value 폴백.
 */
function vec2FromPropAtTime(prop, t) {
  var tt = safeNumTime(t);
  try {
    var v = prop.valueAtTime(tt, false);
    return [v[0], v[1]];
  } catch (e0) {
    var v2 = prop.value;
    return [v2[0], v2[1]];
  }
}

function getPositionVec2AtTime(layer, t) {
  var tt = safeNumTime(t);
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    try {
      return [
        layer.transform.property("X Position").valueAtTime(tt, false),
        layer.transform.property("Y Position").valueAtTime(tt, false)
      ];
    } catch (e1) {
      return [
        layer.transform.property("X Position").value,
        layer.transform.property("Y Position").value
      ];
    }
  }
  return vec2FromPropAtTime(pos, tt);
}

function getScaleXYAtTime(layer, t) {
  var tt = safeNumTime(t);
  var sc = layer.transform.scale;
  if (sc.dimensionsSeparated && sc.numProperties >= 2) {
    var sx = null;
    var sy = null;
    try {
      sx = sc.property(1);
      sy = sc.property(2);
    } catch (eIdx) {
      return vec2FromPropAtTime(sc, tt);
    }
    try {
      return [sx.valueAtTime(tt, false), sy.valueAtTime(tt, false)];
    } catch (eVt) {
      try {
        return [sx.value, sy.value];
      } catch (eVal) {
        return vec2FromPropAtTime(sc, tt);
      }
    }
  }
  return vec2FromPropAtTime(sc, tt);
}

function getAnchorVec2AtTime(layer, t) {
  return vec2FromPropAtTime(layer.transform.anchorPoint, safeNumTime(t));
}

function getRotationDegAtTime(layer, t) {
  var tt = safeNumTime(t);
  var rot = layer.transform.rotation;
  try {
    return rot.valueAtTime(tt, false);
  } catch (eR) {
    return rot.value;
  }
}

function mergeOpts(opts) {
  var o = opts || {};
  return {
    directionMode: o.directionMode || DIRECTION_MODE,
    singleDirection: o.singleDirection || SINGLE_DIRECTION,
    randomSeed: typeof o.randomSeed === "number" ? o.randomSeed : RANDOM_SEED,
    slideMode: o.slideMode || SLIDE_MODE,
    slideMult: typeof o.slideMult === "number" ? o.slideMult : SLIDE_MULT,
    minSlidePx: typeof o.minSlidePx === "number" ? o.minSlidePx : MIN_SLIDE_PX,
    fixedEnterOff: typeof o.fixedEnterOff === "number" ? o.fixedEnterOff : FIXED_ENTER_OFF,
    fixedExitOff: typeof o.fixedExitOff === "number" ? o.fixedExitOff : FIXED_EXIT_OFF,
    revealEdgePad: typeof o.revealEdgePad === "number" ? o.revealEdgePad : REVEAL_EDGE_PAD,
    updateExisting: o.updateExisting === true || UPDATE_EXISTING_REVEAL === true,
    skipIfAlready: o.skipIfAlready !== false && SKIP_IF_ALREADY_REVEALED !== false,
    preserveDirection: o.preserveDirection === true
  };
}

function layerPointToComp(layer, pt, t) {
  var tt = safeNumTime(t);
  var ap = getAnchorVec2AtTime(layer, tt);
  var pos = getPositionVec2AtTime(layer, tt);
  var sc = getScaleXYAtTime(layer, tt);
  var rot = getRotationDegAtTime(layer, tt);
  var dx = (pt[0] - ap[0]) * (sc[0] / 100);
  var dy = (pt[1] - ap[1]) * (sc[1] / 100);
  var rad = rot * Math.PI / 180;
  var rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  var ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  if (!layer.parent) {
    return [pos[0] + rx, pos[1] + ry];
  }
  var pap = getAnchorVec2AtTime(layer.parent, tt);
  var nextPt = [pap[0] + pos[0] + rx, pap[1] + pos[1] + ry];
  return layerPointToComp(layer.parent, nextPt, tt);
}

function layerBoundsInComp(layer, t) {
  var tt = safeNumTime(t);
  var r = layer.sourceRectAtTime(tt, false);
  var pts = [
    [r.left, r.top],
    [r.left + r.width, r.top],
    [r.left + r.width, r.top + r.height],
    [r.left, r.top + r.height]
  ];
  var minX = 1e9;
  var minY = 1e9;
  var maxX = -1e9;
  var maxY = -1e9;
  var i;
  for (i = 0; i < 4; i++) {
    var c = layerPointToComp(layer, pts[i], tt);
    if (c[0] < minX) minX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] > maxY) maxY = c[1];
  }
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

function getXYAtTime(layer, t) {
  return getPositionVec2AtTime(layer, t);
}

function setXYAtTime(layer, t, px, py) {
  var tt = safeNumTime(t);
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    layer.transform.property("X Position").setValueAtTime(tt, px);
    layer.transform.property("Y Position").setValueAtTime(tt, py);
  } else {
    var z = 0;
    try {
      var v = pos.valueAtTime(tt, false);
      z = v.length > 2 ? v[2] : 0;
    } catch (ez) {
      try {
        var v2 = pos.value;
        z = v2.length > 2 ? v2[2] : 0;
      } catch (ez2) {
        z = 0;
      }
    }
    pos.setValueAtTime(tt, [px, py, z]);
  }
}

function clearPositionKeys(layer) {
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    var xp = layer.transform.property("X Position");
    var yp = layer.transform.property("Y Position");
    while (xp.numKeys > 0) xp.removeKey(1);
    while (yp.numKeys > 0) yp.removeKey(1);
    return;
  }
  while (pos.numKeys > 0) pos.removeKey(1);
}

function solvePositionForCompAnchor(layer, t, tcx, tcy) {
  var tt = safeNumTime(t);
  var ap = getAnchorVec2AtTime(layer, tt);
  var xy = getXYAtTime(layer, tt);
  var px = xy[0];
  var py = xy[1];
  var it;
  for (it = 0; it < 28; it++) {
    setXYAtTime(layer, tt, px, py);
    var c = layerPointToComp(layer, ap, tt);
    var ex = tcx - c[0];
    var ey = tcy - c[1];
    if (ex * ex + ey * ey < 0.02) {
      break;
    }
    px += ex;
    py += ey;
  }
  setXYAtTime(layer, tt, px, py);
}

function applyEase8080(prop) {
  var k;
  var ease = [new KeyframeEase(0, 80)];
  for (k = 1; k <= prop.numKeys; k++) {
    prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(k, ease, ease);
  }
}

function applyEase80802D(layer) {
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    applyEase8080(layer.transform.property("X Position"));
    applyEase8080(layer.transform.property("Y Position"));
  } else {
    applyEase8080(pos);
  }
}

function pickDirection(mode, singleDir, seedBase, seqIdx) {
  if (mode === "single") {
    return singleDir;
  }
  if (mode === "cycle") {
    return ALL_DIRECTIONS[seqIdx % 4];
  }
  if (mode === "random") {
    var s = (seedBase + seqIdx * 19349663 + 73856093) & 0x7fffffff;
    return ALL_DIRECTIONS[s % 4];
  }
  throw new Error("DIRECTION_MODE는 random|single|cycle 만 지원: " + mode);
}

function dirToOffsets(dir, slideEnter, slideExit) {
  var ox0 = 0;
  var oy0 = 0;
  var ox3 = 0;
  var oy3 = 0;
  if (dir === "fromLeft") {
    ox0 = -slideEnter;
    ox3 = slideExit;
  } else if (dir === "fromRight") {
    ox0 = slideEnter;
    ox3 = -slideExit;
  } else if (dir === "fromTop") {
    oy0 = -slideEnter;
    oy3 = slideExit;
  } else if (dir === "fromBottom") {
    oy0 = slideEnter;
    oy3 = -slideExit;
  } else {
    throw new Error("알 수 없는 방향: " + dir);
  }
  return { ox0: ox0, oy0: oy0, ox3: ox3, oy3: oy3 };
}

/**
 * 기존 Position 키(0s·1s)의 컴프 이동으로 등장 방향 추정. 키가 없으면 null.
 */
function inferDirectionFromLayer(L) {
  var pos = L.transform.position;
  if (pos.numKeys < 2) {
    return null;
  }
  var ap = getAnchorVec2AtTime(L, T_ENTER_END);
  var t0 = pos.keyTime(1);
  var t1 = pos.keyTime(2);
  var rest = layerPointToComp(L, ap, t1);
  var start = layerPointToComp(L, ap, t0);
  var dx = rest[0] - start[0];
  var dy = rest[1] - start[1];
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "fromLeft" : "fromRight";
  }
  return dy > 0 ? "fromBottom" : "fromTop";
}

function slideDistancesForDirection(bounds, dir, opts) {
  var pad = typeof opts.revealEdgePad === "number" ? opts.revealEdgePad : REVEAL_EDGE_PAD;
  if (dir === "fromLeft" || dir === "fromRight") {
    return { enter: bounds.width + pad, exit: bounds.width + pad };
  }
  return { enter: bounds.height + pad, exit: bounds.height + pad };
}

function applyDirectionKeysToLayer(L, dir, bounds, opts) {
  var ap = getAnchorVec2AtTime(L, T_ENTER_END);
  var restXY = getXYAtTime(L, T_ENTER_END);
  var restComp = layerPointToComp(L, ap, T_ENTER_END);
  clearPositionKeys(L);
  setXYAtTime(L, T_ENTER_END, restXY[0], restXY[1]);

  var slides = slideDistancesForDirection(bounds, dir, opts);
  var off = dirToOffsets(dir, slides.enter, slides.exit);

  solvePositionForCompAnchor(L, T_ENTER_START, restComp[0] + off.ox0, restComp[1] + off.oy0);
  solvePositionForCompAnchor(L, T_ENTER_END, restComp[0], restComp[1]);
  solvePositionForCompAnchor(L, T_HOLD_END, restComp[0], restComp[1]);
  solvePositionForCompAnchor(L, T_EXIT_END, restComp[0] + off.ox3, restComp[1] + off.oy3);
  applyEase80802D(L);
}

function safeMatteSuffix(name) {
  var s = String(name || "layer");
  var out = "";
  var i;
  for (i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (/[a-zA-Z0-9_-]/.test(ch)) {
      out += ch;
    } else {
      out += "_";
    }
  }
  if (!out) out = "layer";
  return out;
}

function createMatteRectLayer(comp, bounds, matteName) {
  var shapeLayer = comp.layers.addShape();
  shapeLayer.name = matteName;
  var contents = shapeLayer.property("Contents");
  var group = contents.addProperty("ADBE Vector Group");
  var rect = group.property("Contents").addProperty("ADBE Vector Shape - Rect");
  rect.property("Size").setValue([bounds.width, bounds.height]);
  rect.property("Position").setValue([0, 0]);
  var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  fill.property("Color").setValue([1, 1, 1, 1]);
  fill.property("Opacity").setValue(100);
  shapeLayer.transform.position.setValue([bounds.centerX, bounds.centerY]);
  shapeLayer.transform.scale.setValue([100, 100]);
  shapeLayer.transform.rotation.setValue(0);
  return shapeLayer;
}

function setTrackMatteSafe(content, matteLayer) {
  if (content.setTrackMatte) {
    content.setTrackMatte(matteLayer, TrackMatteType.ALPHA);
  } else {
    matteLayer.moveBefore(content);
    content.trackMatteType = TrackMatteType.ALPHA;
  }
}

function collectSelectedLayers(comp) {
  var out = [];
  var j;
  for (j = 1; j <= comp.numLayers; j++) {
    var lyr = comp.layer(j);
    if (lyr.selected) {
      out.push(lyr);
    }
  }
  return out;
}

function findCompByName(name) {
  var j;
  for (j = 1; j <= app.project.numItems; j++) {
    var it = app.project.item(j);
    if (it instanceof CompItem && it.name === name) {
      return it;
    }
  }
  return null;
}

function collectTextLayersByLiteral(comp, literal) {
  var out = [];
  var j;
  for (j = 1; j <= comp.numLayers; j++) {
    var lyr = comp.layer(j);
    if (lyr instanceof TextLayer) {
      try {
        var td = lyr.property("ADBE Text Properties").property("ADBE Text Document").value;
        if (trimStr(td.text) === literal) {
          out.push(lyr);
        }
      } catch (e0) {}
    }
  }
  return out;
}

function resolveTrackMatteTargetOrSelf(comp, L) {
  if (!L || !comp) {
    return L;
  }
  if (L.name.indexOf(MATTE_NAME_PREFIX) !== 0) {
    return L;
  }
  if (L.index >= comp.numLayers) {
    return L;
  }
  return comp.layer(L.index + 1);
}

function dedupeLayersByIndex(layerList) {
  var out = [];
  var seen = {};
  var i;
  for (i = 0; i < layerList.length; i++) {
    var L = layerList[i];
    var k = String(L.index);
    if (!seen[k]) {
      seen[k] = true;
      out.push(L);
    }
  }
  return out;
}

function isAlreadyRevealedByOurMatte(comp, L, skipIfAlready) {
  if (!skipIfAlready) {
    return false;
  }
  if (!L || L.index < 2) {
    return false;
  }
  var above = comp.layer(L.index - 1);
  if (!above || above.name.indexOf(MATTE_NAME_PREFIX) !== 0) {
    return false;
  }
  if (L.trackMatteType === TrackMatteType.NO_TRACK_MATTE) {
    return false;
  }
  return true;
}

function runForLayers(comp, layerList, opts) {
  app.beginUndoGroup("TM Reveal Track Matte");
  try {
    var cfg = mergeOpts(opts);
    var layers = [];
    var i;
    for (i = 0; i < layerList.length; i++) {
      layers.push(layerList[i]);
    }
    layers.sort(function (a, b) {
      return b.index - a.index;
    });

    var report = [];
    var tMatte = T_ENTER_END;
    var seq = 0;
    var applied = 0;

    for (i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (L instanceof CameraLayer || L instanceof LightLayer) {
        report.push("건너뜀 (카메라/라이트): " + L.name);
        continue;
      }
      if (L.name.indexOf(MATTE_NAME_PREFIX) === 0) {
        report.push("건너뜀 (TM_Reveal_ 매트 레이어는 대상 아님): " + L.name);
        continue;
      }

      var already = isAlreadyRevealedByOurMatte(comp, L, cfg.skipIfAlready);
      if (already && !cfg.updateExisting) {
        report.push("건너뜀 (이미 TM_Reveal 트랙매트 적용됨): " + L.name);
        continue;
      }

      var bounds = layerBoundsInComp(L, tMatte);
      var dir;
      if (already && cfg.updateExisting && cfg.preserveDirection) {
        dir = inferDirectionFromLayer(L);
        if (!dir) {
          dir = pickDirection(cfg.directionMode, cfg.singleDirection, cfg.randomSeed, seq);
          seq++;
        }
      } else {
        dir = pickDirection(cfg.directionMode, cfg.singleDirection, cfg.randomSeed, seq);
        seq++;
      }

      if (!already) {
        var matte = createMatteRectLayer(comp, bounds, MATTE_NAME_PREFIX + safeMatteSuffix(L.name));
        matte.moveBefore(L);
        setTrackMatteSafe(L, matte);
        if (HIDE_MATTE_LAYER_VIDEO) {
          matte.enabled = false;
        }
      }

      applyDirectionKeysToLayer(L, dir, bounds, cfg);
      applied++;
      var slideInfo = slideDistancesForDirection(bounds, dir, cfg);
      var slidePx = dir === "fromLeft" || dir === "fromRight" ? bounds.width : slideInfo.enter;
      report.push(L.name + " ← " + dir + " (slide: " + Math.round(slidePx * 100) / 100 + "px)" + (already ? " 갱신" : ""));
    }

    if (applied === 0) {
      var msg = "(신규 적용 0건) 전부 건너뜀 또는 대상 없음.\n" + report.join("\n");
      if (cfg.skipIfAlready && !cfg.updateExisting) {
        msg += "\n— 기존 레이어 방향 갱신: updateExisting: true";
      }
      return msg;
    }

    return report.join("\n");
  } finally {
    app.endUndoGroup();
  }
}

function main(opts) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("활성 컴포지션을 선택하세요.");
  }

  var raw = collectSelectedLayers(comp);
  var usedComp = comp;

  if ((!raw || raw.length === 0) && FALLBACK_COMP_NAME && FALLBACK_TEXT_EQUALS) {
    var fb = findCompByName(FALLBACK_COMP_NAME);
    if (fb) {
      raw = collectTextLayersByLiteral(fb, FALLBACK_TEXT_EQUALS);
      usedComp = fb;
    }
  }

  if (!raw || raw.length === 0) {
    throw new Error(
      "활성 컴프 타임라인에서 리빌할 레이어를 하나 이상 선택하세요. (여러 개 선택 가능; TM_Reveal_*만 선택하면 바로 아래 콘텐츠로 적용됩니다.)"
    );
  }

  var resolved = [];
  var ri;
  for (ri = 0; ri < raw.length; ri++) {
    resolved.push(resolveTrackMatteTargetOrSelf(usedComp, raw[ri]));
  }
  resolved = dedupeLayersByIndex(resolved);

  return runForLayers(usedComp, resolved, opts);
}

function runTextRevealTrackmatteSlide(opts) {
  return main(opts);
}
