/**
 * Stagger — startTime + inPoint 통일
 *
 * 슬롯(컴프 시각): START + i * (WINDOW / N), i = 0 … N-1 (N = 선택 레이어 수).
 * 즉 창 길이 WINDOW 안에서 간격은 항상 WINDOW/N 초 (정수 초 단위가 아님).
 *
 * 대상: 타임라인에서 선택된 레이어만 (폴백 없음).
 *
 * startTime 을 슬롯으로 맞추고, min(슬롯)으로 inPoint 통일 후 outPoint는 기존 소스 길이 유지.
 *
 * STAGGER_SHIFT_POSITION_KEYS:
 * - false(기본): 키프레임 시각은 그대로 두고 startTime / inPoint / outPoint 만 조정.
 * - true: Position 키를 컴프 절대시각 기준으로 delta 만큼 이동(레거시: 첫 키가 슬롯에 오도록 맞춤).
 *
 * === 수정 구간 (에이전트/사용자: N초만 요청에 맞게 변경) ===
 */
var STAGGER_START_COMP = 0.0;
var STAGGER_WINDOW_SEC = 2.0;
/** "top" | "bottom" | "index" | "random" — 기본 위에서부터 */
var STAGGER_ORDER = "top";
/** true면 Position 키를 슬롯에 맞게 이동, false면 startTime·in/out 만 */
var STAGGER_SHIFT_POSITION_KEYS = false;
// ==============================================================

var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
  throw new Error("활성 컴프가 없습니다.");
}

function isAnimLayer(L) {
  if (!L || L.nullLayer) return false;
  if (L instanceof TextLayer) return true;
  if (L instanceof ShapeLayer) return true;
  if (L instanceof AVLayer) return true;
  return false;
}

function hasEnoughPositionKeys(L) {
  var pos = L.transform.position;
  if (pos.dimensionsSeparated) {
    var xP = L.transform.property("X Position");
    var yP = L.transform.property("Y Position");
    return xP && yP && xP.numKeys >= 2 && yP.numKeys >= 2;
  }
  return pos.numKeys >= 2;
}

function copyKeyframeBundle(prop) {
  var n = prop.numKeys;
  var list = [];
  var k;
  for (k = 1; k <= n; k++) {
    var o = {
      t: prop.keyTime(k),
      v: prop.keyValue(k),
      kin: prop.keyInInterpolationType(k),
      kout: prop.keyOutInterpolationType(k)
    };
    try {
      o.easeIn = prop.keyInTemporalEase(k);
      o.easeOut = prop.keyOutTemporalEase(k);
      o.hasEase = true;
    } catch (e0) {
      o.hasEase = false;
    }
    if (prop.isSpatial) {
      try {
        o.spIn = prop.keyInSpatialTangent(k);
        o.spOut = prop.keyOutSpatialTangent(k);
        o.hasSp = true;
      } catch (e1) {
        o.hasSp = false;
      }
    } else {
      o.hasSp = false;
    }
    list.push(o);
  }
  return list;
}

function sanitizeInterp(t) {
  if (t === KeyframeInterpolationType.LINEAR) return t;
  if (t === KeyframeInterpolationType.BEZIER) return t;
  if (t === KeyframeInterpolationType.HOLD) return t;
  return KeyframeInterpolationType.BEZIER;
}

function pasteShiftedKeys(prop, bundle, delta) {
  var k;
  for (k = prop.numKeys; k >= 1; k--) {
    prop.removeKey(k);
  }
  for (k = 0; k < bundle.length; k++) {
    prop.setValueAtTime(bundle[k].t + delta, bundle[k].v);
  }
  var nk = prop.numKeys;
  var use = nk < bundle.length ? nk : bundle.length;
  for (var ki = 1; ki <= use; ki++) {
    var b = bundle[ki - 1];
    try {
      prop.setInterpolationTypeAtKey(ki, sanitizeInterp(b.kin), sanitizeInterp(b.kout));
    } catch (eI) {}
    if (b.hasEase) {
      try {
        prop.setTemporalEaseAtKey(ki, b.easeIn, b.easeOut);
      } catch (e2) {}
    }
    if (b.hasSp && prop.isSpatial) {
      try {
        prop.setSpatialTangentsAtKey(ki, b.spIn, b.spOut);
      } catch (e3) {}
    }
  }
}

function shiftLayerPositionKeys(layer, delta) {
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    pasteShiftedKeys(layer.transform.property("X Position"), copyKeyframeBundle(layer.transform.property("X Position")), delta);
    pasteShiftedKeys(layer.transform.property("Y Position"), copyKeyframeBundle(layer.transform.property("Y Position")), delta);
    if (layer.threeDLayer) {
      var zP = layer.transform.property("Z Position");
      if (zP && zP.numKeys >= 2) {
        pasteShiftedKeys(zP, copyKeyframeBundle(zP), delta);
      }
    }
    return;
  }
  pasteShiftedKeys(pos, copyKeyframeBundle(pos), delta);
}

function firstPosKeyTime(layer) {
  var pos = layer.transform.position;
  if (pos.dimensionsSeparated) {
    return layer.transform.property("X Position").keyTime(1);
  }
  return pos.keyTime(1);
}

function collectSelectedAnimLayers() {
  var out = [];
  var skip = [];
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (!L.selected) continue;
    if (!isAnimLayer(L)) {
      skip.push({ name: L.name, index: L.index, reason: "애니 레이어 아님" });
      continue;
    }
    if (STAGGER_SHIFT_POSITION_KEYS) {
      if (!hasEnoughPositionKeys(L)) {
        skip.push({ name: L.name, index: L.index, reason: "Position 키 2개 미만" });
        continue;
      }
    }
    out.push(L);
  }
  return { targets: out, skipped: skip };
}

function fisherYatesShuffle(arr) {
  var i;
  for (i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

var pack = collectSelectedAnimLayers();
var targets = pack.targets;
var skipped = pack.skipped;
var source = "selection";

if (targets.length === 0) {
  throw new Error(
    STAGGER_SHIFT_POSITION_KEYS
      ? "적용 대상 없음: Position 키 2개 이상인 레이어를 타임라인에서 선택하세요."
      : "적용 대상 없음: 타임라인에서 레이어를 선택하세요."
  );
}

var tref = comp.time;
if (STAGGER_ORDER === "random") {
  fisherYatesShuffle(targets);
} else if (STAGGER_ORDER === "bottom") {
  targets.sort(function (a, b) {
    var pa = a.transform.position.valueAtTime(tref, false);
    var pb = b.transform.position.valueAtTime(tref, false);
    var ya = pa.length >= 2 ? pa[1] : 0;
    var yb = pb.length >= 2 ? pb[1] : 0;
    return yb - ya;
  });
} else if (STAGGER_ORDER === "index") {
  targets.sort(function (a, b) {
    return a.index - b.index;
  });
} else {
  targets.sort(function (a, b) {
    var pa = a.transform.position.valueAtTime(tref, false);
    var pb = b.transform.position.valueAtTime(tref, false);
    var ya = pa.length >= 2 ? pa[1] : 0;
    var yb = pb.length >= 2 ? pb[1] : 0;
    return ya - yb;
  });
}

var n = targets.length;
var slots = [];
var idx;
for (idx = 0; idx < n; idx++) {
  if (n === 1) {
    slots.push(STAGGER_START_COMP);
  } else {
    slots.push(STAGGER_START_COMP + (STAGGER_WINDOW_SEC * idx) / n);
  }
}

var saved = [];
for (idx = 0; idx < n; idx++) {
  var Ly = targets[idx];
  saved.push({
    inPt: Ly.inPoint,
    outPt: Ly.outPoint,
    startT: Ly.startTime
  });
}

/** 컴프에서 가장 먼저 등장 = 할당된 slot 이 가장 작은 레이어 → 그때의 inPoint 로 전체 통일 */
var firstAppearIdx = 0;
var minSlot = slots[0];
for (idx = 1; idx < n; idx++) {
  if (slots[idx] < minSlot) {
    minSlot = slots[idx];
    firstAppearIdx = idx;
  }
}
var refInPoint = saved[firstAppearIdx].inPt;

var applied = [];
for (idx = 0; idx < n; idx++) {
  var L2 = targets[idx];
  var slot = slots[idx];
  var delta = 0;
  if (STAGGER_SHIFT_POSITION_KEYS && hasEnoughPositionKeys(L2)) {
    var tFirst = firstPosKeyTime(L2);
    delta = slot - tFirst;
    shiftLayerPositionKeys(L2, delta);
  }
  L2.startTime = slot;
  var srcSpan = saved[idx].outPt - saved[idx].inPt;
  L2.inPoint = refInPoint;
  L2.outPoint = refInPoint + srcSpan;
  applied.push({
    name: L2.name,
    index: L2.index,
    slot: slot,
    startTime: L2.startTime,
    inPoint: L2.inPoint,
    keyDelta: delta,
    shiftedKeys: STAGGER_SHIFT_POSITION_KEYS
  });
}

return {
  params: {
    STAGGER_START_COMP: STAGGER_START_COMP,
    STAGGER_WINDOW_SEC: STAGGER_WINDOW_SEC,
    STAGGER_ORDER: STAGGER_ORDER,
    STAGGER_SHIFT_POSITION_KEYS: STAGGER_SHIFT_POSITION_KEYS
  },
  source: source,
  order: STAGGER_ORDER,
  refInPoint: refInPoint,
  firstAppearIndex: firstAppearIdx,
  firstAppearSlot: minSlot,
  applied: applied,
  skipped: skipped
};
