/**
 * AE — 활성 컴프에서 이름에 "Dot"이 포함된 Shape 레이어를 찾고,
 * 같은 컴프의 Symbol_A · Symbol_B · Symbol_C 모양 레이어 중 하나를
 * 각 Dot마다 무작위로 골라 Dot 그룹 기하만 교체합니다.
 * (심벌 쪽 Fill/Stroke/그라디언트는 복사하지 않음. Dot에 있던 Fill/Stroke·표현식은 유지)
 *
 * 실행: 브릿지 POST /execute 또는 coloso-ae-mcp execute
 *
 * 참고: Symbol_C에서 "선택한 패스 한 줄"만 쓰려면 대신
 * ae-replace-dots-from-symbol-c-selected-path.jsx 를 실행하세요.
 */

var DOT_NAME_SUBSTR = "Dot";
var SYMBOL_LAYER_NAMES = ["Symbol_A", "Symbol_B", "Symbol_C"];

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
  if (!comp) {
    throw new Error("활성 컴포지션이 없습니다.");
  }
  return comp;
}

function layerNameHasDot(nm) {
  return String(nm).indexOf(DOT_NAME_SUBSTR) !== -1;
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

function gatherSymbolLayersABC(comp) {
  var byName = {};
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    var L = comp.layer(li);
    byName[L.name] = L;
  }
  var out = [];
  var si;
  for (si = 0; si < SYMBOL_LAYER_NAMES.length; si++) {
    var nm = SYMBOL_LAYER_NAMES[si];
    var lyr = byName[nm];
    if (lyr && lyr instanceof ShapeLayer) {
      out.push(lyr);
    }
  }
  return out;
}

function collectDotShapeLayers(comp) {
  var arr = [];
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (L instanceof ShapeLayer && layerNameHasDot(L.name)) {
      arr.push(L);
    }
  }
  return arr;
}

function pickRandomSymbol(symbols) {
  var idx = Math.floor(Math.random() * symbols.length);
  return symbols[idx];
}

function main() {
  var comp = getActiveComp();
  var symbols = gatherSymbolLayersABC(comp);
  if (symbols.length === 0) {
    throw new Error(
      "활성 컴프에서 모양 레이어 Symbol_A, Symbol_B, Symbol_C 중 하나도 찾지 못했습니다."
    );
  }

  var dots = collectDotShapeLayers(comp);
  if (dots.length === 0) {
    throw new Error('이름에 "' + DOT_NAME_SUBSTR + '" 이 포함된 모양 레이어가 없습니다.');
  }

  var tSym = comp.time;
  var tDot = comp.time;
  var report = [];
  var ti;
  for (ti = 0; ti < dots.length; ti++) {
    var layer = dots[ti];
    var symL = pickRandomSymbol(symbols);
    var dotG = findDotVectorGroup(layer);
    if (!dotG) {
      report.push(layer.name + ": Dot 벡터 그룹 없음");
      continue;
    }
    try {
      rebuildDotFromSymbolLayer(dotG, symL, tSym, tDot);
      report.push(layer.name + " ← " + symL.name);
    } catch (err) {
      report.push(layer.name + " 에러: " + String(err && err.message ? err.message : err));
    }
  }

  var symList = [];
  var sj;
  for (sj = 0; sj < symbols.length; sj++) {
    symList.push(symbols[sj].name);
  }

  return (
    "dots←Symbol_A~C 랜덤: 컴프=" +
    comp.name +
    " | 심벌 " +
    symList.join(",") +
    " | Dot " +
    dots.length +
    "개 | " +
    report.join(" | ")
  );
}

main();
