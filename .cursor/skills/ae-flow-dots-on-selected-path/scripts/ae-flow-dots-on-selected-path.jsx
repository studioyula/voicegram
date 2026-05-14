/**
 * ae-flow-dots-on-selected-path.jsx
 *
 * 선택한 Path를 따라 흰 원(검은 테두리)을 등간격 배치하고 흐르게 합니다.
 * 패스당 셰이프 레이어 1개에 모든 도트를 담아 빠르게 생성합니다.
 *
 * 대상: 타임라인에서 Path 속성이 선택된 레이어 우선.
 *        없으면 선택 레이어의 첫 Path, 그다음 컴프 내 첫 셰이프 Path.
 *
 * 재실행: 기존 FLOW_DOT_* / CTRL_FlowDots 를 제거 후 동일 규칙으로 재생성.
 *
 * 실행: File > Scripts > Run Script File… 또는 MCP execute
 */

// ============ CONFIG ============
var DOT_COUNT = 10; // 기본값; 스킬/MCP는 실행 전 FLOW_DOTS_COUNT 로 덮어씀
var DEFAULT_DOT_SIZE = 16;
var DEFAULT_SPEED = 0.18;
var DOT_PREFIX = "FLOW_DOT_";
var DOT_LAYER_PREFIX = "FLOW_DOTS_P";
var CTRL_NAME = "CTRL_FlowDots";
var DOT_COLOR = [1, 1, 1];
var DOT_FILL_OPACITY = 100;
var DOT_STROKE_COLOR = [0, 0, 0];
var DOT_STROKE_WIDTH = 2;
var DOT_SHAPE = "ellipse"; // "ellipse" | "rect" — MCP는 FLOW_DOTS_SHAPE 로 덮어씀

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

function escName(name) {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

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

function isShapeValue(v) {
  try {
    return v && v.vertices && v.vertices.length;
  } catch (_e) {
    return false;
  }
}

function isPathProperty(pr) {
  if (!pr || pr.propertyType !== PropertyType.PROPERTY) return false;
  try {
    if (pr.matchName === "ADBE Vector Shape" || pr.matchName === "ADBE Mask Shape") {
      return isShapeValue(pr.value);
    }
  } catch (_e2) {}
  return false;
}

function buildPathIndexChain(pathProp) {
  var parts = [];
  var p = pathProp.parentProperty;
  while (p && p.parentProperty) {
    if (p.matchName === "ADBE Root Vectors Group") break;
    if (p.matchName === "ADBE Vector Group" || p.matchName === "ADBE Vector Shape - Group") {
      parts.unshift(".content(" + p.propertyIndex + ")");
    }
    p = p.parentProperty;
  }
  return parts.join("") + ".path";
}

function buildPathExprChain(pathProp) {
  if (pathProp.matchName === "ADBE Mask Shape") {
    var mask = pathProp.parentProperty;
    return '.mask("' + escName(mask.name) + '").maskPath';
  }
  return buildPathIndexChain(pathProp);
}

function pathTargetKey(layer, pathProp) {
  return layer.name + "|" + buildPathExprChain(pathProp);
}

function pushUniqueTarget(targets, layer, pathProp) {
  var key = pathTargetKey(layer, pathProp);
  var i;
  for (i = 0; i < targets.length; i++) {
    if (targets[i].key === key) return;
  }
  targets.push({ key: key, layer: layer, path: pathProp });
}

function padN(n, width) {
  var s = String(Math.round(n));
  while (s.length < width) s = "0" + s;
  return s;
}

function isFlowDotLayer(layer) {
  var nm = layer.name;
  return (
    nm.indexOf(DOT_PREFIX) === 0 ||
    nm.indexOf(DOT_LAYER_PREFIX) === 0 ||
    nm === CTRL_NAME
  );
}

function walkSelectedShapePaths(group, layer, targets) {
  var ci;
  for (ci = 1; ci <= group.numProperties; ci++) {
    var child = group.property(ci);
    if (isPathProperty(child)) {
      try {
        if (child.selected) pushUniqueTarget(targets, layer, child);
      } catch (_e) {}
    }
    if (child.numProperties) walkSelectedShapePaths(child, layer, targets);
  }
}

function walkSelectedMaskPaths(layer, targets) {
  if (layer instanceof ShapeLayer) return;
  try {
    if (!layer.mask || layer.mask.numProperties < 1) return;
    var mi;
    for (mi = 1; mi <= layer.mask.numProperties; mi++) {
      var mp = layer.mask(mi).property("ADBE Mask Shape");
      if (isPathProperty(mp)) {
        try {
          if (mp.selected) pushUniqueTarget(targets, layer, mp);
        } catch (_e2) {}
      }
    }
  } catch (_e3) {}
}

function collectSelectedPathsOnLayer(layer, targets) {
  if (layer instanceof ShapeLayer) {
    walkSelectedShapePaths(layer.property("Contents"), layer, targets);
  }
  walkSelectedMaskPaths(layer, targets);
  var props = layer.selectedProperties;
  var pi;
  for (pi = 0; pi < props.length; pi++) {
    if (isPathProperty(props[pi])) pushUniqueTarget(targets, layer, props[pi]);
  }
}

function findPathFromSelectedProps(layer) {
  var targets = [];
  collectSelectedPathsOnLayer(layer, targets);
  return targets.length > 0 ? targets[0].path : null;
}

function findFirstVectorPath(layer) {
  if (!(layer instanceof ShapeLayer)) return null;
  var contents = layer.property("Contents");
  var g;
  for (g = 1; g <= contents.numProperties; g++) {
    var grp = contents.property(g);
    if (grp.matchName !== "ADBE Vector Group") continue;
    var gc = grp.property("Contents");
    var pp;
    for (pp = 1; pp <= gc.numProperties; pp++) {
      var item = gc.property(pp);
      if (item.matchName !== "ADBE Vector Shape - Group") continue;
      var pathPr = item.property("Path");
      if (pathPr && isShapeValue(pathPr.value)) return pathPr;
    }
  }
  return null;
}

function findFirstMaskPath(layer) {
  if (layer instanceof ShapeLayer) return null;
  if (!(layer instanceof AVLayer)) return null;
  try {
    if (!layer.mask || layer.mask.numProperties < 1) return null;
  } catch (_e) {
    return null;
  }
  var mi;
  for (mi = 1; mi <= layer.mask.numProperties; mi++) {
    var mk = layer.mask(mi);
    var mp = null;
    try {
      mp = mk.property("ADBE Mask Shape");
    } catch (_e2) {
      mp = null;
    }
    if (mp && isShapeValue(mp.value)) return mp;
  }
  return null;
}

function resolvePathOnLayer(layer) {
  var p = findPathFromSelectedProps(layer);
  if (p) return p;
  p = findFirstVectorPath(layer);
  if (p) return p;
  return findFirstMaskPath(layer);
}

function findAllPathTargets(comp) {
  var targets = [];
  var sel = comp.selectedLayers;
  var si;
  if (sel && sel.length > 0) {
    for (si = 0; si < sel.length; si++) {
      if (isFlowDotLayer(sel[si])) continue;
      collectSelectedPathsOnLayer(sel[si], targets);
    }
  }
  if (targets.length > 0) return targets;

  if (sel && sel.length > 0) {
    for (si = 0; si < sel.length; si++) {
      if (isFlowDotLayer(sel[si])) continue;
      var pp = resolvePathOnLayer(sel[si]);
      if (pp) pushUniqueTarget(targets, sel[si], pp);
    }
    if (targets.length > 0) return targets;
  }
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (isFlowDotLayer(L)) continue;
    var p = findFirstVectorPath(L);
    if (p) {
      pushUniqueTarget(targets, L, p);
      return targets;
    }
  }
  return targets;
}

function resolveDotShape() {
  if (typeof FLOW_DOTS_SHAPE !== "undefined" && FLOW_DOTS_SHAPE) {
    var s = String(FLOW_DOTS_SHAPE).toLowerCase();
    if (s === "rect" || s === "square" || s === "네모" || s === "사각") return "rect";
  }
  return DOT_SHAPE === "rect" ? "rect" : "ellipse";
}

function findShapeSizeInGroup(group) {
  var inner = group.property("Contents");
  var pp;
  for (pp = 1; pp <= inner.numProperties; pp++) {
    var item = inner.property(pp);
    if (
      item.matchName === "ADBE Vector Shape - Ellipse" ||
      item.matchName === "ADBE Vector Shape - Rect"
    ) {
      return item.property("Size");
    }
  }
  return null;
}

function removeExistingFlowDots(comp) {
  var removed = 0;
  var again = true;
  while (again) {
    again = false;
    var li;
    for (li = comp.numLayers; li >= 1; li--) {
      var nm = comp.layer(li).name;
      if (
        nm.indexOf(DOT_PREFIX) === 0 ||
        nm.indexOf(DOT_LAYER_PREFIX) === 0 ||
        nm === CTRL_NAME
      ) {
        comp.layer(li).remove();
        removed++;
        again = true;
        break;
      }
    }
  }
  return removed;
}

function ensureSlider(ctrl, name, value) {
  var eff = ctrl.property("Effects");
  var ei;
  for (ei = 1; ei <= eff.numProperties; ei++) {
    if (eff.property(ei).name === name) {
      eff.property(ei).property("Slider").setValue(value);
      return eff.property(ei);
    }
  }
  var fx = eff.addProperty("ADBE Slider Control");
  fx.name = name;
  fx.property("Slider").setValue(value);
  return fx;
}

function buildGroupPositionExpr(srcName, pathChain, phase) {
  var expr = "";
  expr += 'var src = thisComp.layer("' + srcName + '");\n';
  expr += 'var ctrl = thisComp.layer("' + CTRL_NAME + '");\n';
  expr += 'var spd = ctrl.effect("Speed")(1);\n';
  expr += "var phase = " + phase + ";\n";
  expr += "var t = (time * spd + phase) % 1;\n";
  expr += "var p = src" + pathChain + ".pointOnPath(t);\n";
  expr += "var pt = src.toComp(p);\n";
  expr += "pt - thisLayer.toComp(thisLayer.transform.anchorPoint);";
  return expr;
}

function buildGroupRotationExpr(srcName, pathChain, phase) {
  var expr = "";
  expr += 'var src = thisComp.layer("' + srcName + '");\n';
  expr += 'var ctrl = thisComp.layer("' + CTRL_NAME + '");\n';
  expr += 'var spd = ctrl.effect("Speed")(1);\n';
  expr += "var phase = " + phase + ";\n";
  expr += "var t = (time * spd + phase) % 1;\n";
  expr += "var path = src" + pathChain + ";\n";
  expr += "var tan = path.tangentOnPath(t);\n";
  expr += "var a = radiansToDegrees(Math.atan2(tan[1], tan[0]));\n";
  expr += "a + src.transform.rotation - thisLayer.transform.rotation;";
  return expr;
}

function buildSizeExpr() {
  return (
    'var s = thisComp.layer("' +
    CTRL_NAME +
    '").effect("Size")(1);\n' +
    "[s, s];"
  );
}

function ensureFlowController(comp) {
  var ctrl = null;
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    if (comp.layer(li).name === CTRL_NAME) {
      ctrl = comp.layer(li);
      break;
    }
  }
  if (!ctrl) {
    ctrl = comp.layers.addNull();
    ctrl.name = CTRL_NAME;
    ctrl.label = 9;
    ctrl.moveToBeginning();
  }
  ensureSlider(ctrl, "Speed", DEFAULT_SPEED);
  ensureSlider(ctrl, "Size", DEFAULT_DOT_SIZE);
  return ctrl;
}

function createFlowDotsForPath(comp, pathLayer, pathProp, pathIndex, pathPad, dotPad, dotShape) {
  var pathChain = buildPathExprChain(pathProp);
  var srcName = escName(pathLayer.name);
  var dotsLayer = comp.layers.addShape();
  dotsLayer.name = DOT_LAYER_PREFIX + padN(pathIndex, pathPad);
  dotsLayer.label = 1;

  var root = dotsLayer.property("Contents");
  var i;
  for (i = 0; i < DOT_COUNT; i++) {
    var group = root.addProperty("ADBE Vector Group");
    group.name = "Dot_" + padN(i + 1, dotPad);
    var inner = group.property("Contents");
    var shapeItem;
    if (dotShape === "rect") {
      shapeItem = inner.addProperty("ADBE Vector Shape - Rect");
    } else {
      shapeItem = inner.addProperty("ADBE Vector Shape - Ellipse");
    }
    shapeItem.property("Size").setValue([DEFAULT_DOT_SIZE, DEFAULT_DOT_SIZE]);
    var fill = inner.addProperty("ADBE Vector Graphic - Fill");
    fill.property("Color").setValue(DOT_COLOR);
    fill.property("Opacity").setValue(DOT_FILL_OPACITY);
    var stroke = inner.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("Color").setValue(DOT_STROKE_COLOR);
    stroke.property("Stroke Width").setValue(DOT_STROKE_WIDTH);
    stroke.property("Opacity").setValue(100);

    var phase = i / DOT_COUNT;
    group.property("Transform").property("Position").expression = buildGroupPositionExpr(
      srcName,
      pathChain,
      phase
    );
    group.property("Transform").property("Rotation").expression = buildGroupRotationExpr(
      srcName,
      pathChain,
      phase
    );

    var sizeProp = findShapeSizeInGroup(group);
    if (!sizeProp) throw new Error("Shape Size를 찾을 수 없습니다: " + dotsLayer.name);
    sizeProp.expression = buildSizeExpr();
  }

  dotsLayer.moveAfter(pathLayer);

  return {
    created: DOT_COUNT,
    dotsLayerName: dotsLayer.name,
    pathChain: pathChain,
    layerName: pathLayer.name,
  };
}

function main() {
  if (typeof FLOW_DOTS_COUNT !== "undefined" && FLOW_DOTS_COUNT >= 1) {
    DOT_COUNT = Math.round(FLOW_DOTS_COUNT);
  }
  var dotShape = resolveDotShape();
  var comp = getComp();
  var targets = findAllPathTargets(comp);
  if (!targets || targets.length === 0) {
    throw new Error(
      "Path를 찾을 수 없습니다. 셰이프 Path(또는 마스크 Path) 속성을 선택한 뒤 다시 실행하세요."
    );
  }

  var removed = removeExistingFlowDots(comp);
  ensureFlowController(comp);

  var pathPad = String(targets.length).length;
  var dotPad = String(DOT_COUNT).length;
  var totalCreated = 0;
  var summaries = [];
  var ti;
  for (ti = 0; ti < targets.length; ti++) {
    var result = createFlowDotsForPath(
      comp,
      targets[ti].layer,
      targets[ti].path,
      ti + 1,
      pathPad,
      dotPad,
      dotShape
    );
    totalCreated += result.created;
    summaries.push(
      result.dotsLayerName + " <- \"" + result.layerName + "\" " + result.pathChain + " x" + result.created
    );
  }

  return (
    "OK: " +
    totalCreated +
    " dots on " +
    targets.length +
    " path(s), shape=" +
    dotShape +
    ". removed=" +
    removed +
    ", ctrl=" +
    CTRL_NAME +
    " | " +
    summaries.join(" || ")
  );
}

main();
