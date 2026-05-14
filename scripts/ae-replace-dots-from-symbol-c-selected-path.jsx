/**
 * AE — 타임라인에서 선택한 모양 레이어의 Path(또는 Vector Group)를
 * Dot 레이어(이름에 "Dot" 포함)의 "Dot" 그룹 기하로 복제합니다.
 *
 * · 여러 모양 레이어를 선택하고 각각 Path를 고르면, **레이어 index 오름차순**으로
 *   템플릿 1·2·… 가 정해지고 ObjFlow_Dot_<그룹번호>_* 와 매칭됩니다.
 *   (스캔 예: A Outlines(115)·B(116) 선택 → 그룹1=A, 그룹2=B)
 * · 선택한 템플릿 레이어가 없고 **Symbol_C** 만 컴프에 있으면, 그때는 Symbol_C의 선택 속성 사용.
 * · 심벌 쪽 Fill/Stroke는 복사하지 않음. Dot Fill/Stroke·표현식 유지.
 * · Path에 키가 있으면 **키프레임까지** 복사.
 *
 * 실행: 브릿지 POST /execute 또는 coloso-ae-mcp execute
 */

var DOT_NAME_SUBSTR = "Dot";
var SYMBOL_C_LAYER_NAME = "Symbol_C";
var SYMBOL_ABC_NAMES = ["Symbol_A", "Symbol_B", "Symbol_C"];

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

function pathShapeValueAtTime(pathProp, t) {
  try {
    return pathProp.valueAtTime(t, false);
  } catch (_e) {
    try {
      return pathProp.value;
    } catch (_e2) {
      return null;
    }
  }
}

function isShapeValue(v) {
  try {
    return v && v.vertices && v.vertices.length >= 2;
  } catch (_e) {
    return false;
  }
}

function pathPropIsUsable(pathProp, t) {
  return pathProp && pathProp.matchName === "ADBE Vector Shape" && isShapeValue(pathShapeValueAtTime(pathProp, t));
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

function countNonPaintInContents(contents) {
  var count = 0;
  var i;
  for (i = 1; i <= contents.numProperties; i++) {
    var p = contents.property(i);
    if (!isPaintMatchName(p.matchName)) {
      count++;
    }
  }
  return count;
}

function collectVectorShapePropsInOrder(contents, out) {
  var n;
  try {
    n = contents.numProperties;
  } catch (_e0) {
    return;
  }
  var i;
  for (i = 1; i <= n; i++) {
    var p = contents.property(i);
    var mn = p.matchName;
    if (mn === "ADBE Vector Shape") {
      out.push(p);
    } else if (mn === "ADBE Vector Group") {
      try {
        collectVectorShapePropsInOrder(p.property("Contents"), out);
      } catch (_e1) {}
    }
  }
}

function syncPathShapeToDestination(srcPathProp, dstPathProp, t) {
  if (!srcPathProp || !dstPathProp) {
    return;
  }
  try {
    if (dstPathProp.canSetExpression) {
      dstPathProp.expression = "";
    }
  } catch (_x0) {}
  var nk = 0;
  try {
    nk = srcPathProp.numKeys;
  } catch (_nk) {
    nk = 0;
  }
  if (nk > 0) {
    var k;
    for (k = 1; k <= nk; k++) {
      var kt = srcPathProp.keyTime(k);
      var val = srcPathProp.valueAtTime(kt, false);
      try {
        dstPathProp.setValueAtTime(kt, val);
      } catch (_e1) {}
    }
  } else {
    try {
      dstPathProp.setValue(srcPathProp.valueAtTime(t, false));
    } catch (_e2) {}
  }
}

function syncPathKeyframesFromSourceToCloned(source, clonedContents, t) {
  var dstPaths = [];
  collectVectorShapePropsInOrder(clonedContents, dstPaths);
  if (dstPaths.length === 0) {
    return;
  }
  if (source.mode === "path") {
    var si;
    for (si = 0; si < dstPaths.length; si++) {
      syncPathShapeToDestination(source.pathProp, dstPaths[si], t);
    }
    return;
  }
  if (source.mode === "clone") {
    if (source.vectorChild && source.vectorChild.matchName === "ADBE Vector Shape") {
      var sj;
      for (sj = 0; sj < dstPaths.length; sj++) {
        syncPathShapeToDestination(source.vectorChild, dstPaths[sj], t);
      }
    }
    return;
  }
  if (source.mode === "layer") {
    var srcPathsL = [];
    try {
      collectVectorShapePropsInOrder(source.layer.property("Contents"), srcPathsL);
    } catch (_eL) {
      return;
    }
    var ml = srcPathsL.length;
    if (dstPaths.length < ml) {
      ml = dstPaths.length;
    }
    var mk;
    for (mk = 0; mk < ml; mk++) {
      syncPathShapeToDestination(srcPathsL[mk], dstPaths[mk], t);
    }
    return;
  }
  if (source.mode === "group") {
    var srcPaths = [];
    try {
      collectVectorShapePropsInOrder(source.group.property("Contents"), srcPaths);
    } catch (_e0) {
      return;
    }
    var mi;
    var maxLen = srcPaths.length;
    if (dstPaths.length < maxLen) {
      maxLen = dstPaths.length;
    }
    for (mi = 0; mi < maxLen; mi++) {
      syncPathShapeToDestination(srcPaths[mi], dstPaths[mi], t);
    }
  }
}

/**
 * selection 우선순위: Vector Group(통째) > Path 직접·Shape 그룹 안 Path
 * 반환: { mode: "group"|"path", group: VectorGroup|null, pathProp: Path|null }
 */
function resolveSourceFromLayerSelection(shapeLayer, t) {
  var props = shapeLayer.selectedProperties;
  if (!props || props.length === 0) {
    return { mode: "", group: null, pathProp: null };
  }

  var gi;
  for (gi = 0; gi < props.length; gi++) {
    var p = props[gi];
    if (!p) {
      continue;
    }
    try {
      if (p.matchName === "ADBE Vector Group") {
        return { mode: "group", group: p, pathProp: null };
      }
    } catch (_e0) {}
  }

  var pathProp = null;
  var pi;
  for (pi = 0; pi < props.length; pi++) {
    var pr = props[pi];
    if (!pr) {
      continue;
    }
    try {
      if (pr.matchName === "ADBE Vector Shape" && pathPropIsUsable(pr, t)) {
        pathProp = pr;
        break;
      }
      if (pr.matchName === "ADBE Vector Shape - Group") {
        var nch;
        try {
          nch = pr.numProperties;
        } catch (_n0) {
          nch = 0;
        }
        var k;
        for (k = 1; k <= nch; k++) {
          try {
            var ch = pr.property(k);
            if (ch && ch.matchName === "ADBE Vector Shape" && pathPropIsUsable(ch, t)) {
              pathProp = ch;
              break;
            }
          } catch (_c) {}
        }
        if (pathProp) {
          break;
        }
      }
    } catch (_e1) {}
  }

  if (pathProp) {
    return { mode: "path", group: null, pathProp: pathProp };
  }
  return { mode: "", group: null, pathProp: null };
}

function rebuildDotFromTemplate(dotGroup, source, t) {
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
      fillBk = backupPropertySubtree(p, t);
    } else if (p.matchName === "ADBE Vector Graphic - Stroke") {
      strokeBk = backupPropertySubtree(p, t);
    }
  }

  for (i = c.numProperties; i >= 1; i--) {
    c.property(i).remove();
  }

  if (source.mode === "group") {
    cloneVectorGroupFull(source.group, c, t);
  } else if (source.mode === "path") {
    cloneVectorChild(source.pathProp, c, t);
  } else if (source.mode === "clone") {
    cloneVectorChild(source.vectorChild, c, t);
  } else if (source.mode === "layer") {
    cloneLayerGeometryIntoContents(source.layer, c, t);
  } else {
    throw new Error("소스 모드 없음");
  }

  var geomCount = countNonPaintInContents(c);
  if (geomCount < 1) {
    throw new Error("복제 후 기하가 비었습니다. Path가 유효한지 확인하세요.");
  }

  syncPathKeyframesFromSourceToCloned(source, c, t);

  if (fillBk) {
    var nf = c.addProperty("ADBE Vector Graphic - Fill");
    restorePropertySubtree(nf, fillBk);
  }
  if (strokeBk) {
    var ns = c.addProperty("ADBE Vector Graphic - Stroke");
    restorePropertySubtree(ns, strokeBk);
  }
}

function parseObjFlowGroupIndex(layerName) {
  var s = String(layerName);
  if (s.indexOf("ObjFlow_Dot_") !== 0) {
    return 1;
  }
  var rest = s.substring("ObjFlow_Dot_".length);
  var numStr = "";
  var ci;
  for (ci = 0; ci < rest.length; ci++) {
    var ch = rest.charAt(ci);
    if (ch >= "0" && ch <= "9") {
      numStr += ch;
    } else {
      break;
    }
  }
  var n = parseInt(numStr, 10);
  if (isNaN(n) || n < 1) {
    return 1;
  }
  return n;
}

function findShapeLayerByExactName(comp, layerName) {
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    var L = comp.layer(li);
    if (L instanceof ShapeLayer && L.name === layerName) {
      return L;
    }
  }
  return null;
}

function isPrimitiveVectorShapeMatchName(mn) {
  if (!mn || mn.indexOf("ADBE Vector Shape -") !== 0) {
    return false;
  }
  if (mn === "ADBE Vector Shape - Group") {
    return false;
  }
  return true;
}

/** Symbol 등: 베지어 Path 또는 타원·별 등 벡터 도형 중 첫 개체 (cloneVectorChild 가능) */
function findFirstCloneableVectorInLayer(shapeLayer, t) {
  var root = shapeLayer.property("Contents");
  if (!root) {
    return null;
  }
  var found = null;
  function walk(contents) {
    if (found) {
      return;
    }
    var n;
    try {
      n = contents.numProperties;
    } catch (_e0) {
      return;
    }
    var i;
    for (i = 1; i <= n; i++) {
      var p = contents.property(i);
      if (!p) {
        continue;
      }
      var mn = p.matchName;
      if (mn === "ADBE Vector Group") {
        try {
          walk(p.property("Contents"));
        } catch (_e1) {}
        continue;
      }
      if (isPaintMatchName(mn)) {
        continue;
      }
      if (mn === "ADBE Vector Shape" && pathPropIsUsable(p, t)) {
        found = p;
        return;
      }
      if (isPrimitiveVectorShapeMatchName(mn)) {
        found = p;
        return;
      }
    }
  }
  walk(root);
  return found;
}

function gatherTemplatesFromSymbolABCAuto(comp, t) {
  var out = [];
  var ni;
  for (ni = 0; ni < SYMBOL_ABC_NAMES.length; ni++) {
    var nm = SYMBOL_ABC_NAMES[ni];
    var lyr = findShapeLayerByExactName(comp, nm);
    if (!lyr) {
      continue;
    }
    var item = findFirstCloneableVectorInLayer(lyr, t);
    var src;
    if (item) {
      if (item.matchName === "ADBE Vector Shape") {
        src = { mode: "path", group: null, pathProp: item, vectorChild: null, layer: null };
      } else {
        src = { mode: "clone", group: null, pathProp: null, vectorChild: item, layer: null };
      }
    } else {
      try {
        var cont = lyr.property("Contents");
        if (cont && cont.numProperties > 0) {
          src = { mode: "layer", group: null, pathProp: null, vectorChild: null, layer: lyr };
        } else {
          continue;
        }
      } catch (_eL) {
        continue;
      }
    }
    out.push({
      layer: lyr,
      layerName: lyr.name,
      source: src,
    });
  }
  return out;
}

function pickTemplateForGroup(templates, groupIndex) {
  var idx = groupIndex - 1;
  if (idx < 0) {
    idx = 0;
  }
  if (idx >= templates.length) {
    idx = templates.length - 1;
  }
  return templates[idx];
}

function gatherTemplatesFromSelection(comp, t) {
  var raw = [];
  var i;
  var nSel = comp.numSelectedLayers;
  for (i = 1; i <= nSel; i++) {
    try {
      var L = comp.selectedLayer(i);
      if (L instanceof ShapeLayer && !layerNameHasDot(L.name)) {
        raw.push(L);
      }
    } catch (_e) {}
  }
  raw.sort(function (a, b) {
    return a.index - b.index;
  });

  var templates = [];
  var j;
  for (j = 0; j < raw.length; j++) {
    var src = resolveSourceFromLayerSelection(raw[j], t);
    if (src.mode) {
      templates.push({ layer: raw[j], layerName: raw[j].name, source: src });
    }
  }

  if (templates.length > 0) {
    return templates;
  }

  var sym = findSymbolCLayer(comp);
  if (sym) {
    var fb = resolveSourceFromLayerSelection(sym, t);
    if (fb.mode) {
      return [{ layer: sym, layerName: sym.name, source: fb }];
    }
  }

  var autoAbc = gatherTemplatesFromSymbolABCAuto(comp, t);
  if (autoAbc.length > 0) {
    return autoAbc;
  }
  return [];
}

function findSymbolCLayer(comp) {
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    var L = comp.layer(li);
    if (L instanceof ShapeLayer && L.name === SYMBOL_C_LAYER_NAME) {
      return L;
    }
  }
  return null;
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

function main() {
  var comp = getActiveComp();
  var t = comp.time;

  var templates = gatherTemplatesFromSelection(comp, t);
  if (templates.length === 0) {
    throw new Error(
      "모양 템플릿을 찾지 못했습니다. Symbol_A/B/C 모양이 컴프에 있는지 확인하거나, 모양 레이어에서 Path를 선택한 뒤 다시 실행하세요."
    );
  }

  var tplNames = [];
  var ti0;
  for (ti0 = 0; ti0 < templates.length; ti0++) {
    tplNames.push(templates[ti0].layerName);
  }

  var dots = collectDotShapeLayers(comp);
  if (dots.length === 0) {
    throw new Error('이름에 "' + DOT_NAME_SUBSTR + '" 이 포함된 모양 레이어가 없습니다.');
  }

  var report = [];
  var ti;
  for (ti = 0; ti < dots.length; ti++) {
    var layer = dots[ti];
    var dotG = findDotVectorGroup(layer);
    if (!dotG) {
      report.push(layer.name + ": Dot 벡터 그룹 없음");
      continue;
    }
    var gIdx = parseObjFlowGroupIndex(layer.name);
    var tpl = pickTemplateForGroup(templates, gIdx);
    try {
      rebuildDotFromTemplate(dotG, tpl.source, t);
      report.push(layer.name + " ← " + tpl.layerName + " (흐름그룹" + String(gIdx) + ")");
    } catch (err) {
      report.push(layer.name + " 에러: " + String(err && err.message ? err.message : err));
    }
  }

  return (
    "Dot 전체스캔 " +
    dots.length +
    "개 | 템플릿(선택·index순) " +
    tplNames.join(", ") +
    " | " +
    report.join(" | ")
  );
}

main();
