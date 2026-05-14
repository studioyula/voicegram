/**
 * ae-extend-selected-paths-trim.jsx
 *
 * 선택한 열린 Shape Path마다 원본 양 끝을 원본 길이의 1/3씩 접선 방향으로 연장한
 * 별도 선 그룹을 만들고 Trim Paths 애니메이션을 적용한다.
 *
 * - 원본 Path는 수정하지 않음
 * - 선택 Path와 같은 벡터 그룹 안에 EXT_TrimPath_* 그룹 추가
 * - 0s: 안 보임
 * - 1s: 원본 Path 구간만 보임
 * - 2s: 유지
 * - 3s: 끝 연장선 방향으로 사라짐
 *
 * ES3 / ExtendScript
 */

var EXT_PREFIX = "EXT_TrimPath_";
var EXT_STROKE_COLOR = [1, 1, 1];
var EXT_STROKE_WIDTH = 4;
var LEN_SAMPLES = 48;
var TAN_EPS = 0.001;

function getComp() {
  var comp = null;
  try {
    var av = app.activeViewer;
    if (av && av.type === ViewerType.VIEWER_COMPOSITION) {
      av.setActive();
      if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
        comp = app.project.activeItem;
      }
    }
  } catch (_e) {}
  if (!comp && app.project.activeItem && app.project.activeItem instanceof CompItem) {
    comp = app.project.activeItem;
  }
  if (!comp) throw new Error("활성 컴포지션이 없습니다.");
  return comp;
}

function clone2(p) {
  return [p[0], p[1]];
}

function addv(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function subv(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function mulv(v, s) {
  return [v[0] * s, v[1] * s];
}

function lenv(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function norm(v) {
  var L = lenv(v);
  if (L < 1e-9) return [0, 0];
  return [v[0] / L, v[1] / L];
}

function bezPt(p0, p1, p2, p3, t) {
  var u = 1 - t;
  var uu = u * u;
  var tt = t * t;
  return [
    uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + t * tt * p3[0],
    uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + t * tt * p3[1],
  ];
}

function cubicLen(p0, p1, p2, p3, samples) {
  var L = 0;
  var prev = clone2(p0);
  var i;
  for (i = 1; i <= samples; i++) {
    var q = bezPt(p0, p1, p2, p3, i / samples);
    L += lenv(subv(q, prev));
    prev = q;
  }
  return L;
}

function pathLength(shape) {
  var verts = shape.vertices;
  var inT = shape.inTangents;
  var outT = shape.outTangents;
  var n = verts.length;
  if (n < 2) return 0;
  var total = 0;
  var segs = shape.closed ? n : n - 1;
  var i;
  for (i = 0; i < segs; i++) {
    var i0 = i;
    var i1 = (i + 1) % n;
    total += cubicLen(
      verts[i0],
      addv(verts[i0], outT[i0]),
      addv(verts[i1], inT[i1]),
      verts[i1],
      LEN_SAMPLES
    );
  }
  return total;
}

function tangentAtStart(verts, inT, outT) {
  var p0 = verts[0];
  var p1 = addv(verts[0], outT[0]);
  var p2 = addv(verts[1], inT[1]);
  var p3 = verts[1];
  var tan = subv(p1, p0);
  if (lenv(tan) > 1e-9) return norm(tan);
  tan = subv(bezPt(p0, p1, p2, p3, TAN_EPS), p0);
  if (lenv(tan) > 1e-9) return norm(tan);
  return norm(subv(p3, p0));
}

function tangentLeavingEnd(verts, inT, outT) {
  var n = verts.length;
  var p0 = verts[n - 2];
  var p1 = addv(verts[n - 2], outT[n - 2]);
  var p2 = addv(verts[n - 1], inT[n - 1]);
  var p3 = verts[n - 1];
  var tan = subv(p3, p2);
  if (lenv(tan) > 1e-9) return norm(tan);
  tan = subv(p3, bezPt(p0, p1, p2, p3, 1 - TAN_EPS));
  if (lenv(tan) > 1e-9) return norm(tan);
  return norm(subv(p3, p0));
}

function isShapeValue(v) {
  try {
    return v && v.vertices && v.vertices.length >= 2;
  } catch (_e) {
    return false;
  }
}

function isPathProperty(p) {
  if (!p || p.propertyType !== PropertyType.PROPERTY) return false;
  try {
    return p.matchName === "ADBE Vector Shape" && isShapeValue(p.value);
  } catch (_e) {
    return false;
  }
}

function pathKey(pathProp) {
  var parts = [];
  var p = pathProp.parentProperty;
  while (p && p.parentProperty) {
    if (p.matchName === "ADBE Root Vectors Group") break;
    if (p.matchName === "ADBE Vector Group" || p.matchName === "ADBE Vector Shape - Group") {
      parts.unshift(p.propertyIndex);
    }
    p = p.parentProperty;
  }
  return parts.join(".");
}

function pushUnique(targets, layer, pathProp) {
  var key = layer.index + "|" + pathKey(pathProp);
  var i;
  for (i = 0; i < targets.length; i++) {
    if (targets[i].key === key) return;
  }
  targets.push({ key: key, layer: layer, path: pathProp });
}

function walkSelectedPaths(group, layer, targets) {
  var i;
  for (i = 1; i <= group.numProperties; i++) {
    var p = group.property(i);
    if (isPathProperty(p)) {
      try {
        if (p.selected) pushUnique(targets, layer, p);
      } catch (_e) {}
    }
    if (p.numProperties) walkSelectedPaths(p, layer, targets);
  }
}

function collectTargets(comp) {
  var targets = [];
  var sel = comp.selectedLayers;
  var i;
  if (sel && sel.length > 0) {
    for (i = 0; i < sel.length; i++) {
      if (sel[i] instanceof ShapeLayer) {
        walkSelectedPaths(sel[i].property("Contents"), sel[i], targets);
        var props = sel[i].selectedProperties;
        var j;
        for (j = 0; j < props.length; j++) {
          if (isPathProperty(props[j])) pushUnique(targets, sel[i], props[j]);
        }
      }
    }
  }
  return targets;
}

function makeExtendedShape(shape) {
  if (shape.closed) throw new Error("닫힌 패스는 첫점/끝점 연장이 불명확합니다. 열린 패스를 선택하세요.");
  var verts = shape.vertices;
  var inT = shape.inTangents;
  var outT = shape.outTangents;
  var n = verts.length;
  if (n < 2) throw new Error("꼭짓점이 2개 이상인 열린 패스가 필요합니다.");

  var origLen = pathLength(shape);
  if (!(origLen > 0)) throw new Error("패스 길이를 계산할 수 없습니다.");
  var extLen = origLen / 3;
  var handle = extLen / 3;

  var t0 = tangentAtStart(verts, inT, outT);
  var t1 = tangentLeavingEnd(verts, inT, outT);
  if (lenv(t0) < 1e-9 || lenv(t1) < 1e-9) {
    throw new Error("첫점/끝점 기울기를 계산할 수 없습니다.");
  }

  var startExt = subv(verts[0], mulv(t0, extLen));
  var endExt = addv(verts[n - 1], mulv(t1, extLen));

  var nv = [];
  var ni = [];
  var no = [];
  var i;

  nv.push(startExt);
  ni.push([0, 0]);
  no.push(mulv(t0, handle));

  nv.push(clone2(verts[0]));
  ni.push(mulv(t0, -handle));
  no.push(clone2(outT[0]));

  for (i = 1; i < n - 1; i++) {
    nv.push(clone2(verts[i]));
    ni.push(clone2(inT[i]));
    no.push(clone2(outT[i]));
  }

  nv.push(clone2(verts[n - 1]));
  ni.push(clone2(inT[n - 1]));
  no.push(mulv(t1, handle));

  nv.push(endExt);
  ni.push(mulv(t1, -handle));
  no.push([0, 0]);

  var out = new Shape();
  out.vertices = nv;
  out.inTangents = ni;
  out.outTangents = no;
  out.closed = false;
  return { shape: out, originalLength: origLen, extensionLength: extLen };
}

function removeExistingExtensions(layer) {
  if (!(layer instanceof ShapeLayer)) return 0;
  var removed = 0;
  function walk(group) {
    var i;
    for (i = group.numProperties; i >= 1; i--) {
      var p = group.property(i);
      if (p.name.indexOf(EXT_PREFIX) === 0) {
        p.remove();
        removed++;
      } else if (p.numProperties) {
        walk(p);
      }
    }
  }
  walk(layer.property("Contents"));
  return removed;
}

function addTrimKeys(trim) {
  var start = trim.property("Start");
  var end = trim.property("End");
  start.setValueAtTime(0, 0);
  end.setValueAtTime(0, 0);
  start.setValueAtTime(1, 20);
  end.setValueAtTime(1, 80);
  start.setValueAtTime(2, 20);
  end.setValueAtTime(2, 80);
  start.setValueAtTime(3, 100);
  end.setValueAtTime(3, 100);
}

function applyExtension(target, index) {
  var pathProp = target.path;
  var layer = target.layer;
  var shape = pathProp.value;
  var made = makeExtendedShape(shape);
  var parentContents = pathProp.parentProperty.parentProperty;
  if (!parentContents || parentContents.matchName !== "ADBE Vectors Group") {
    throw new Error("Path의 Contents 그룹을 찾을 수 없습니다.");
  }

  var group = parentContents.addProperty("ADBE Vector Group");
  group.name = EXT_PREFIX + index;
  var contents = group.property("Contents");
  var pathGroup = contents.addProperty("ADBE Vector Shape - Group");
  pathGroup.name = "Extended Path";
  pathGroup.property("Path").setValue(made.shape);

  var stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
  stroke.property("Color").setValue(EXT_STROKE_COLOR);
  stroke.property("Stroke Width").setValue(EXT_STROKE_WIDTH);
  stroke.property("Opacity").setValue(100);

  var trim = contents.addProperty("ADBE Vector Filter - Trim");
  trim.name = "Trim Original Then Extend";
  addTrimKeys(trim);

  return (
    layer.name +
    " " +
    pathKey(pathProp) +
    " orig=" +
    Math.round(made.originalLength * 100) / 100 +
    " ext=" +
    Math.round(made.extensionLength * 100) / 100
  );
}

function main() {
  var comp = getComp();
  var targets = collectTargets(comp);
  if (targets.length === 0) {
    throw new Error("선택한 Shape Path가 없습니다. 열린 Path 속성을 선택한 뒤 다시 실행하세요.");
  }

  var i;
  var layers = [];
  for (i = 0; i < targets.length; i++) {
    var exists = false;
    var j;
    for (j = 0; j < layers.length; j++) {
      if (layers[j] === targets[i].layer) exists = true;
    }
    if (!exists) layers.push(targets[i].layer);
  }
  for (i = 0; i < layers.length; i++) {
    removeExistingExtensions(layers[i]);
  }

  var logs = [];
  for (i = 0; i < targets.length; i++) {
    try {
      logs.push(applyExtension(targets[i], i + 1));
    } catch (err) {
      logs.push(targets[i].layer.name + ": " + err.message);
    }
  }
  return "OK EXT trim paths: " + logs.join(" | ");
}

main();
