/**
 * text-reveal-trackmatte-slide.jsx
 * (.cursor/skills/ae-text-reveal-trackmatte/scripts/ — 스킬 번들 원본)
 *
 * 선택 레이어마다: 바운딩박스와 동일한 알파 트랙매트(사각 셰이프)를 만들고,
 * 매트는 고정, 레이어 Position만 0s→1s→2s→3s 키로 슬라이드 인/아웃.
 * 등장 방향과 같은 축으로 퇴장(예: 아래→위 등장이면 위로 퇴장).
 *
 * 사용: AE에서 대상 레이어 다중 선택 후 스크립트 실행.
 *
 * ES3 / ExtendScript (AE)
 */

// ============ CONFIG (여기만 바꿔 베리에이션) ============
/** "random" | "single" | "cycle" */
var DIRECTION_MODE = "random";
/** DIRECTION_MODE === "single" 일 때만 사용: "fromLeft" | "fromRight" | "fromTop" | "fromBottom" */
var SINGLE_DIRECTION = "fromBottom";
/** random 모드 시드 (같은 선택+시드면 방향 패턴 재현) */
var RANDOM_SEED = 20260511;

var T_ENTER_START = 0;
var T_ENTER_END = 1;
var T_HOLD_END = 2;
var T_EXIT_END = 3;

/** 슬라이드 거리 = max(바운드 w,h) * 이 값 (최소 MIN_SLIDE_PX) */
var SLIDE_MULT = 1.35;
var MIN_SLIDE_PX = 80;

/** 트랙매트 셰이프 레이어 비디오 끄기(렌더에 매트만 쓰고 화면에는 안 보이게) */
var HIDE_MATTE_LAYER_VIDEO = true;

/** 매트 레이어 이름 접두사 */
var MATTE_NAME_PREFIX = "TM_Reveal_";

/**
 * true: 바로 위 레이어가 TM_Reveal_* 이고 본 레이어에 트랙매트가 이미 걸려 있으면 재적용 안 함(바운딩/키 재계산 생략).
 * false: 매트가 있어도 새 매트를 또 만들고 덮어씀(중복 매트 주의).
 */
var SKIP_IF_ALREADY_REVEALED = true;

/**
 * 타임라인에서 아무 것도 선택하지 않았을 때만 사용.
 * 빈 문자열이면 자동 대상 지정을 하지 않는다.
 */
var FALLBACK_COMP_NAME = "bg";
/** FALLBACK_COMP_NAME 이 유효할 때, 소스 텍스트가 이 값과 같은 TextLayer만 자동 선택 */
var FALLBACK_TEXT_EQUALS = "TEXT";
// ======================================================

function trimStr(s) {
  return String(s || "").replace(/^\s+|\s+$/g, "");
}

function layerPointToComp(layer, pt, t) {
  var ap = layer.transform.anchorPoint.valueAtTime(t, false);
  var pos = layer.transform.position.valueAtTime(t, false);
  var sc = layer.transform.scale.valueAtTime(t, false);
  var rot = layer.transform.rotation.valueAtTime(t, false);
  var dx = (pt[0] - ap[0]) * (sc[0] / 100);
  var dy = (pt[1] - ap[1]) * (sc[1] / 100);
  var rad = rot * Math.PI / 180;
  var rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  var ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  if (!layer.parent) {
    return [pos[0] + rx, pos[1] + ry];
  }
  var pap = layer.parent.transform.anchorPoint.valueAtTime(t, false);
  var nextPt = [pap[0] + pos[0] + rx, pap[1] + pos[1] + ry];
  return layerPointToComp(layer.parent, nextPt, t);
}

function layerBoundsInComp(layer, t) {
  var r = layer.sourceRectAtTime(t, false);
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
    var c = layerPointToComp(layer, pts[i], t);
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
  var tt = Number(t);
  if (typeof tt !== "number" || isNaN(tt)) {
    throw new Error("getXYAtTime: time must be a number");
  }
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    return [
      layer.transform.property("X Position").valueAtTime(tt, false),
      layer.transform.property("Y Position").valueAtTime(tt, false)
    ];
  }
  var v = pos.valueAtTime(tt, false);
  return [v[0], v[1]];
}

function setXYAtTime(layer, t, px, py) {
  var tt = Number(t);
  if (typeof tt !== "number" || isNaN(tt)) {
    throw new Error("setXYAtTime: time must be a number");
  }
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    layer.transform.property("X Position").setValueAtTime(tt, px);
    layer.transform.property("Y Position").setValueAtTime(tt, py);
  } else {
    var v = pos.valueAtTime(tt, false);
    var z = v.length > 2 ? v[2] : 0;
    pos.setValueAtTime(tt, [px, py, z]);
  }
}

/**
 * 앵커의 컴프 좌표를 (tcx, tcy)가 되도록 Position 키를 찍는다 (부모/회전 대응 근사 반복).
 */
function solvePositionForCompAnchor(layer, t, tcx, tcy) {
  var tt = Number(t);
  if (typeof tt !== "number" || isNaN(tt)) {
    throw new Error("solvePositionForCompAnchor: time must be a number");
  }
  var ap = layer.transform.anchorPoint.valueAtTime(tt, false);
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
  var dirs = ["fromLeft", "fromRight", "fromTop", "fromBottom"];
  if (mode === "single") {
    return singleDir;
  }
  if (mode === "cycle") {
    return dirs[seqIdx % 4];
  }
  if (mode === "random") {
    var s = (seedBase + seqIdx * 19349663 + 73856093) & 0x7fffffff;
    return dirs[s % 4];
  }
  throw new Error("DIRECTION_MODE는 random|single|cycle 만 지원: " + mode);
}

function dirToOffsets(dir, slide) {
  var ox0 = 0;
  var oy0 = 0;
  var ox3 = 0;
  var oy3 = 0;
  if (dir === "fromLeft") {
    ox0 = -slide;
    ox3 = slide;
  } else if (dir === "fromRight") {
    ox0 = slide;
    ox3 = -slide;
  } else if (dir === "fromTop") {
    oy0 = -slide;
    oy3 = slide;
  } else if (dir === "fromBottom") {
    oy0 = slide;
    oy3 = -slide;
  } else {
    throw new Error("알 수 없는 방향: " + dir);
  }
  return { ox0: ox0, oy0: oy0, ox3: ox3, oy3: oy3 };
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

/**
 * 타임라인에서 TM_Reveal_* 매트만 잡힌 경우: 바로 아래 인덱스 레이어가 콘텐츠(트랙매트 대상)인 전제.
 */
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

/**
 * 스크립트가 만든 알파 매트가 이미 붙어 있는지: 타임라인에서 콘텐츠 바로 위(인덱스-1)가 TM_Reveal_* 이고 TrkMat이 꺼져 있지 않음.
 * TM_Reveal_* 레이어 자체는 여기서 다루지 않음(runForLayers 초반에 제외).
 */
function isAlreadyRevealedByOurMatte(comp, L) {
  if (!SKIP_IF_ALREADY_REVEALED) {
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

function runForLayers(comp, layerList) {
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

    if (isAlreadyRevealedByOurMatte(comp, L)) {
      report.push("건너뜀 (이미 TM_Reveal 트랙매트 적용됨): " + L.name);
      continue;
    }

    var bounds = layerBoundsInComp(L, tMatte);
    var slide = Math.max(Math.max(bounds.width, bounds.height) * SLIDE_MULT, MIN_SLIDE_PX);

    var dir = pickDirection(DIRECTION_MODE, SINGLE_DIRECTION, RANDOM_SEED, seq);
    var off = dirToOffsets(dir, slide);
    seq++;

    var matte = createMatteRectLayer(comp, bounds, MATTE_NAME_PREFIX + safeMatteSuffix(L.name));
    matte.moveBefore(L);
    setTrackMatteSafe(L, matte);
    if (HIDE_MATTE_LAYER_VIDEO) {
      matte.enabled = false;
    }

    var ap = L.transform.anchorPoint.valueAtTime(T_ENTER_END, false);
    var restXY = getXYAtTime(L, T_ENTER_END);
    setXYAtTime(L, T_ENTER_END, restXY[0], restXY[1]);
    var restComp = layerPointToComp(L, ap, T_ENTER_END);

    solvePositionForCompAnchor(L, T_ENTER_START, restComp[0] + off.ox0, restComp[1] + off.oy0);
    solvePositionForCompAnchor(L, T_ENTER_END, restComp[0], restComp[1]);
    solvePositionForCompAnchor(L, T_HOLD_END, restComp[0], restComp[1]);
    solvePositionForCompAnchor(L, T_EXIT_END, restComp[0] + off.ox3, restComp[1] + off.oy3);

    applyEase80802D(L);

    applied++;
    report.push(L.name + " ← " + dir + " (matte: " + matte.name + ")");
  }

  if (applied === 0) {
    var msg = "(신규 적용 0건) 전부 건너뜀 또는 대상 없음.\n" + report.join("\n");
    if (SKIP_IF_ALREADY_REVEALED) {
      msg += "\n— 강제 재적용: SKIP_IF_ALREADY_REVEALED = false";
    }
    return msg;
  }

  return report.join("\n");
}

function main() {
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
    throw new Error("한 개 이상의 레이어를 선택하세요. (또는 FALLBACK_COMP_NAME / FALLBACK_TEXT_EQUALS 설정 확인)");
  }

  var resolved = [];
  var ri;
  for (ri = 0; ri < raw.length; ri++) {
    resolved.push(resolveTrackMatteTargetOrSelf(usedComp, raw[ri]));
  }
  resolved = dedupeLayersByIndex(resolved);

  return runForLayers(usedComp, resolved);
}

/**
 * MCP/다른 스크립트: $.evalFile(본 파일) 후 runTextRevealTrackmatteSlide() 호출.
 * AE 메뉴: text-reveal-trackmatte-slide-exec.jsx 실행.
 */
function runTextRevealTrackmatteSlide() {
  return main();
}
