/**
 * AE — "Symbols" 컴프의 모양 레이어에서 벡터 기하(패스·Merge·그룹·모디파이어)를
 * 그대로 깊은 복제하여 Dot 모양 레이어의 "Dot" 그룹 Contents에 넣습니다.
 * Symbols 쪽 Fill/Stroke/그라디언트는 복사하지 않고, Dot에 있던 Fill/Stroke(및 표현식)은 유지합니다.
 *
 * 스캔 레이어 선택 (앞에서 우선):
 *   1) Symbols에서 모양 레이어 선택됨 → 그 레이어만(인덱스 순)
 *   2) 이름이 Symbol_ 로 시작하는 모양 레이어
 *   3) 이름에 Streamline 없는 모양 레이어
 *   4) 모든 모양 레이어
 *
 * Dot 대상 컴프: 활성 컴프에 Dot이 있으면 그 컴프, 없으면 프로젝트에서 Dot 있는 컴프 검색(Symbols 제외).
 *
 * 실행: coloso-ae-mcp execute(script: 본 파일 전체) 또는 File > Run Script
 */

var SYMBOLS_COMP_NAME = "Symbols";
var DOT_NAME_SUBSTR = "Dot";
var SKIP_LAYER_SUBSTR = "Streamline";
var SYMBOL_LAYER_PREFIX = "Symbol_";

function getActiveComp() {
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

function findCompByName(name) {
  var i;
  for (i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it instanceof CompItem && it.name === name) {
      return it;
    }
  }
  return null;
}

function getSelectedShapeLayersOrdered(comp) {
  var out = [];
  var nSel = comp.numSelectedLayers;
  var i;
  for (i = 1; i <= nSel; i++) {
    try {
      var L = comp.selectedLayer(i);
      if (L instanceof ShapeLayer) {
        out.push(L);
      }
    } catch (_e) {}
  }
  if (out.length === 0) {
    return null;
  }
  out.sort(function (a, b) {
    return a.index - b.index;
  });
  return out;
}

function getLayersBySymbolPrefix(symComp) {
  var arr = [];
  var li;
  for (li = 1; li <= symComp.numLayers; li++) {
    var L = symComp.layer(li);
    if (!(L instanceof ShapeLayer)) {
      continue;
    }
    if (L.name.indexOf(SYMBOL_LAYER_PREFIX) === 0) {
      arr.push(L);
    }
  }
  return arr;
}

function getShapeLayersExcludingSkip(symComp) {
  var arr = [];
  var li;
  for (li = 1; li <= symComp.numLayers; li++) {
    var L = symComp.layer(li);
    if (!(L instanceof ShapeLayer)) {
      continue;
    }
    if (L.name.indexOf(SKIP_LAYER_SUBSTR) !== -1) {
      continue;
    }
    arr.push(L);
  }
  return arr;
}

function getAllShapeLayers(symComp) {
  var arr = [];
  var li;
  for (li = 1; li <= symComp.numLayers; li++) {
    var L = symComp.layer(li);
    if (L instanceof ShapeLayer) {
      arr.push(L);
    }
  }
  return arr;
}

function gatherLayersToScan(symComp) {
  var sel = getSelectedShapeLayersOrdered(symComp);
  if (sel && sel.length > 0) {
    return { layers: sel, mode: "selected" };
  }
  var pref = getLayersBySymbolPrefix(symComp);
  if (pref.length > 0) {
    return { layers: pref, mode: "symbol_prefix" };
  }
  var filt = getShapeLayersExcludingSkip(symComp);
  if (filt.length > 0) {
    return { layers: filt, mode: "filtered" };
  }
  return { layers: getAllShapeLayers(symComp), mode: "all" };
}

function isPaintMatchName(mn) {
  if (!mn) {
    return false;
  }
  if (mn === "ADBE Vector Graphic - Fill") {
    return true;
  }
  if (mn === "ADBE Vector Graphic - Stroke") {
    return true;
  }
  if (mn === "ADBE Vector Graphic - G-Fill") {
    return true;
  }
  if (mn === "ADBE Vector Graphic - G-Stroke") {
    return true;
  }
  return false;
}

function copyLeafProperty(src, dst, t) {
  if (!src || !dst) {
    return;
  }
  try {
    var useEx = false;
    try {
      useEx =
        src.canSetExpression &&
        src.expression !== undefined &&
        src.expression !== null &&
        src.expression !== "";
    } catch (_e0) {
      useEx = false;
    }
    if (useEx) {
      dst.expression = src.expression;
    } else if (dst.canSetValue) {
      dst.setValue(src.valueAtTime(t, false));
    }
  } catch (_e1) {}
}

/** PropertyGroup 안의 모든 leaf PROPERTY 복사 (재귀) */
function copyPropertyGroupDeep(srcGrp, dstGrp, t) {
  var n;
  try {
    n = srcGrp.numProperties;
  } catch (_ng) {
    return;
  }
  var i;
  for (i = 1; i <= n; i++) {
    var ch = srcGrp.property(i);
    if (!ch) {
      continue;
    }
    try {
      if (ch.propertyType === PropertyType.PROPERTY) {
        var dch = dstGrp.property(ch.name);
        copyLeafProperty(ch, dch, t);
      } else if (ch.numProperties && ch.numProperties > 0) {
        var dsub = dstGrp.property(ch.name);
        copyPropertyGroupDeep(ch, dsub, t);
      }
    } catch (_e) {}
  }
}

function cloneVectorGroupFull(srcGroup, dstContents, t) {
  var g = dstContents.addProperty("ADBE Vector Group");
  try {
    g.name = srcGroup.name;
  } catch (_n) {}

  var sc = srcGroup.property("Contents");
  var dc = g.property("Contents");
  var i;
  for (i = 1; i <= sc.numProperties; i++) {
    cloneVectorChild(sc.property(i), dc, t);
  }

  var st = null;
  var dt = null;
  try {
    st = srcGroup.property("ADBE Vector Transform Group");
  } catch (_s) {
    st = null;
  }
  try {
    dt = g.property("ADBE Vector Transform Group");
  } catch (_d) {
    dt = null;
  }
  if (st && dt) {
    copyPropertyGroupDeep(st, dt, t);
  }
}

/** 그룹·도형·모디파이어(Trim/Merge 등) 공통 복제 — Paint 제외 */
function cloneVectorChild(srcItem, dstContents, t) {
  if (!srcItem) {
    return;
  }
  var mn = srcItem.matchName;
  if (isPaintMatchName(mn)) {
    return;
  }

  if (mn === "ADBE Vector Group") {
    cloneVectorGroupFull(srcItem, dstContents, t);
    return;
  }

  var np = dstContents.addProperty(mn);
  try {
    np.name = srcItem.name;
  } catch (_nn) {}

  var j;
  var nch;
  try {
    nch = srcItem.numProperties;
  } catch (_nc) {
    return;
  }
  for (j = 1; j <= nch; j++) {
    var ch = srcItem.property(j);
    if (!ch) {
      continue;
    }
    try {
      if (ch.propertyType === PropertyType.PROPERTY) {
        var dch = np.property(ch.name);
        copyLeafProperty(ch, dch, t);
      } else if (ch.numProperties && ch.numProperties > 0) {
        var dnest = np.property(ch.name);
        copyPropertyGroupDeep(ch, dnest, t);
      }
    } catch (_ej) {}
  }
}

/** 모양 레이어 루트 Contents 에서 채색 제외 한 벌을 Dot Contents 로 복제 */
function cloneLayerGeometryIntoContents(symbolLayer, dstContents, t) {
  var srcRoot = symbolLayer.property("Contents");
  if (!srcRoot) {
    throw new Error("소스 레이어에 Contents 없음: " + symbolLayer.name);
  }
  var i;
  for (i = 1; i <= srcRoot.numProperties; i++) {
    cloneVectorChild(srcRoot.property(i), dstContents, t);
  }
}

/** 리포트용: DFS로 도형 경로 요약 카운트 */
function countShapesInContents(contents, outCount) {
  if (!contents) {
    return;
  }
  var n = contents.numProperties;
  var i;
  for (i = 1; i <= n; i++) {
    var p = contents.property(i);
    var mn = p.matchName;
    if (mn === "ADBE Vector Group") {
      countShapesInContents(p.property("Contents"), outCount);
    } else if (mn.indexOf("ADBE Vector Shape -") === 0) {
      outCount.val++;
    }
  }
}

function layerGeometryDigest(symLayer, t) {
  var c = { val: 0 };
  try {
    countShapesInContents(symLayer.property("Contents"), c);
  } catch (_e) {}
  return {
    primitiveShapeCount: c.val,
    time: t,
  };
}

function scanSymbolTemplateLayers(symComp, t, pick) {
  var templates = [];
  var perLayer = [];
  var li;
  for (li = 0; li < pick.layers.length; li++) {
    var L = pick.layers[li];
    var dig = layerGeometryDigest(L, t);
    templates.push({
      layer: L,
      layerName: L.name,
      layerIndex: L.index,
      digest: dig,
    });
    perLayer.push({
      index: L.index,
      name: L.name,
      type: "Shape",
      shapePrimitives: dig.primitiveShapeCount,
    });
  }
  if (templates.length === 0) {
    throw new Error(
      '컴프 "' +
        symComp.name +
        '" 스캔 모드 "' +
        pick.mode +
        '" 에서 사용할 모양 레이어가 없습니다.'
    );
  }
  return { templates: templates, perLayer: perLayer, scanMode: pick.mode };
}

function backupPropertySubtree(prop, t) {
  var out = { matchName: prop.matchName, name: prop.name, children: [] };
  var j;
  for (j = 1; j <= prop.numProperties; j++) {
    var ch = prop.property(j);
    if (ch.propertyType === PropertyType.PROPERTY) {
      var rec = {
        name: ch.name,
        canExpr: ch.canSetExpression,
        expr: "",
        exprEn: false,
        hasVal: false,
        val: null,
      };
      try {
        rec.expr = ch.expression || "";
      } catch (_e0) {
        rec.expr = "";
      }
      try {
        rec.exprEn = ch.expressionEnabled;
      } catch (_e1) {
        rec.exprEn = false;
      }
      try {
        rec.val = ch.valueAtTime(t, false);
        rec.hasVal = true;
      } catch (_e2) {
        rec.hasVal = false;
      }
      out.children.push(rec);
    }
  }
  return out;
}

function restorePropertySubtree(prop, backup) {
  var k;
  for (k = 0; k < backup.children.length; k++) {
    var b = backup.children[k];
    var dp = prop.property(b.name);
    if (!dp) {
      continue;
    }
    try {
      if (b.canExpr && b.expr && b.expr !== "") {
        dp.expression = b.expr;
      } else if (b.hasVal) {
        dp.setValue(b.val);
      }
    } catch (_e) {}
  }
}

function findDotVectorGroup(shapeLayer) {
  var root = shapeLayer.property("Contents");
  if (!root) {
    return null;
  }
  var i;
  for (i = 1; i <= root.numProperties; i++) {
    var p = root.property(i);
    if (p.matchName === "ADBE Vector Group" && p.name === "Dot") {
      return p;
    }
  }
  for (i = 1; i <= root.numProperties; i++) {
    var q = root.property(i);
    if (q.matchName === "ADBE Vector Group") {
      return q;
    }
  }
  return null;
}

function rebuildDotFromSymbolLayer(dotGroup, symbolLayer, tSym, tDot) {
  var c = dotGroup.property("Contents");
  if (!c) {
    throw new Error("Dot Contents 없음");
  }

  var fillBk = null;
  var strokeBk = null;
  var i;
  for (i = 1; i <= c.numProperties; i++) {
    var p = c.property(i);
    if (p.matchName === "ADBE Vector Graphic - Fill") {
      fillBk = backupPropertySubtree(p, tDot);
    } else if (p.matchName === "ADBE Vector Graphic - Stroke") {
      strokeBk = backupPropertySubtree(p, tDot);
    }
  }

  for (i = c.numProperties; i >= 1; i--) {
    c.property(i).remove();
  }

  cloneLayerGeometryIntoContents(symbolLayer, c, tSym);

  if (fillBk) {
    var nf = c.addProperty("ADBE Vector Graphic - Fill");
    restorePropertySubtree(nf, fillBk);
  }
  if (strokeBk) {
    var ns = c.addProperty("ADBE Vector Graphic - Stroke");
    restorePropertySubtree(ns, strokeBk);
  }
}

function collectDotShapeLayers(comp) {
  var arr = [];
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (L instanceof ShapeLayer && L.name.indexOf(DOT_NAME_SUBSTR) !== -1) {
      arr.push(L);
    }
  }
  return arr;
}

function findTargetCompForDots(symComp, preferredComp) {
  if (collectDotShapeLayers(preferredComp).length > 0) {
    return preferredComp;
  }
  var ii;
  for (ii = 1; ii <= app.project.numItems; ii++) {
    var it = app.project.item(ii);
    if (!(it instanceof CompItem)) {
      continue;
    }
    if (symComp && it === symComp) {
      continue;
    }
    if (collectDotShapeLayers(it).length > 0) {
      return it;
    }
  }
  return null;
}

function main() {
  var preferred = getActiveComp();
  var symComp = findCompByName(SYMBOLS_COMP_NAME);
  if (!symComp) {
    throw new Error('프로젝트에 컴포지션 "' + SYMBOLS_COMP_NAME + '" 가 없습니다.');
  }

  try {
    symComp.openInViewer();
  } catch (_ov) {}

  var tSym = symComp.time;
  var pick = gatherLayersToScan(symComp);
  var scan = scanSymbolTemplateLayers(symComp, tSym, pick);
  var templates = scan.templates;
  var nTpl = templates.length;

  var comp = findTargetCompForDots(symComp, preferred);
  if (!comp) {
    throw new Error(
      '프로젝트에 이름에 "' +
        DOT_NAME_SUBSTR +
        '" 이 들어간 모양 레이어가 있는 컴포지션이 없습니다. 메인 컴프를 연 뒤 다시 실행하세요.'
    );
  }

  var dots = collectDotShapeLayers(comp);
  if (dots.length === 0) {
    throw new Error("Dot 레이어 수집 실패.");
  }

  var tDot = comp.time;

  var scanBits = [];
  var si;
  for (si = 0; si < scan.perLayer.length; si++) {
    var row = scan.perLayer[si];
    scanBits.push("#" + row.index + " " + row.name + "(shapes~" + row.shapePrimitives + ")");
  }

  var ti;
  var report = [];
  for (ti = 0; ti < dots.length; ti++) {
    var layer = dots[ti];
    var tpl = templates[ti % nTpl];
    var symL = tpl.layer;
    var dotG = findDotVectorGroup(layer);
    if (!dotG) {
      report.push(layer.name + ": Dot 그룹 없음");
      continue;
    }
    try {
      rebuildDotFromSymbolLayer(dotG, symL, tSym, tDot);
      report.push(layer.name + " ← 전체 기하복제 " + symL.name);
    } catch (err) {
      report.push(layer.name + " 에러: " + String(err && err.message ? err.message : err));
    }
  }

  var payload = {
    symbolsComp: symComp.name,
    scanMode: scan.scanMode,
    templateLayers: nTpl,
    layersScanned: scanBits,
    targetComp: comp.name,
    dotCount: dots.length,
    note: "Full vector geometry cloned (excluding paint). Dot Fill/Stroke restored.",
    applied: report,
  };

  var jsonLine = "";
  try {
    if (typeof JSON !== "undefined" && JSON.stringify) {
      jsonLine = "\nJSON " + JSON.stringify(payload);
    }
  } catch (_j) {
    jsonLine = "";
  }

  return (
    "symbols→dot deep clone: 모드=" +
    scan.scanMode +
    " | 템플릿 레이어 " +
    nTpl +
    " (" +
    scanBits.join(", ") +
    ') | 대상 "' +
    comp.name +
    "\" Dot " +
    dots.length +
    "개 | " +
    report.join(" | ") +
    jsonLine
  );
}

main();
