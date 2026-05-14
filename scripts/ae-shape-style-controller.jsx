/**
 * AE — 선택한 모양(Shape) 레이어에 노란 채우기 + 2px 검은 선을 적용하고,
 * 널 레이어 CTRL · 도형 스타일 의 이펙트로 채우기색·선색·선 두께를 한 번에 조절합니다.
 *
 * 컨트롤러 이펙트: Fill Color, Stroke Color, Stroke Width (Slider)
 *
 * 실행: coloso-ae-mcp execute(script: 본 파일 전체) 또는 File > Run Script
 */

var SHAPE_STYLE_CTRL_NAME = "CTRL · 도형 스타일";
var SHAPE_STYLE_CTRL_LEGACY = "ShapeStyle_Ctrl";

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

function escapeForLayerRef(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getOrCreateController(comp) {
  var i;
  var lyr = null;
  for (i = 1; i <= comp.numLayers; i++) {
    try {
      var nm = comp.layer(i).name;
      if (nm === SHAPE_STYLE_CTRL_NAME || nm === SHAPE_STYLE_CTRL_LEGACY) {
        lyr = comp.layer(i);
        break;
      }
    } catch (_e) {}
  }
  if (!lyr) {
    lyr = comp.layers.addNull();
    lyr.name = SHAPE_STYLE_CTRL_NAME;
  }
  lyr.transform.position.setValue([comp.width / 2, comp.height / 2]);

  var eff = lyr.property("Effects");
  var fillFx = null;
  var strokeCFx = null;
  var widthFx = null;
  for (i = 1; i <= eff.numProperties; i++) {
    var e = eff.property(i);
    if (e.name === "Fill Color") fillFx = e;
    if (e.name === "Stroke Color") strokeCFx = e;
    if (e.name === "Stroke Width") widthFx = e;
  }
  if (!fillFx) {
    fillFx = eff.addProperty("ADBE Color Control");
    fillFx.name = "Fill Color";
  }
  if (!strokeCFx) {
    strokeCFx = eff.addProperty("ADBE Color Control");
    strokeCFx.name = "Stroke Color";
  }
  if (!widthFx) {
    widthFx = eff.addProperty("ADBE Slider Control");
    widthFx.name = "Stroke Width";
  }
  fillFx.property("Color").setValue([1, 1, 0]);
  strokeCFx.property("Color").setValue([0, 0, 0]);
  widthFx.property("Slider").setValue(2);
  return lyr;
}

/** selectedLayers 컬렉션이 깨지는 환경 대비 */
function collectSelectedShapeLayers(comp) {
  var out = [];
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    try {
      if (L.selected && L instanceof ShapeLayer) {
        out.push(L);
      }
    } catch (_e) {}
  }
  return out;
}

function setExprSafe(prop, ex) {
  if (typeof setExpr === "function") {
    setExpr(prop, ex);
  } else {
    prop.expression = ex;
  }
}

function applyFillExpr(fillProp, ctrlNameEsc) {
  var colorP = fillProp.property("Color");
  setExprSafe(
    colorP,
    'c=thisComp.layer("' +
      ctrlNameEsc +
      '").effect("Fill Color")("Color");\n[c[0],c[1],c[2],1]'
  );
}

function applyStrokeExpr(strokeProp, ctrlNameEsc) {
  var colorP = strokeProp.property("Color");
  setExprSafe(
    colorP,
    'c=thisComp.layer("' +
      ctrlNameEsc +
      '").effect("Stroke Color")("Color");\n[c[0],c[1],c[2],1]'
  );
  var w = strokeProp.property("Stroke Width");
  setExprSafe(w, 'thisComp.layer("' + ctrlNameEsc + '").effect("Stroke Width")("Slider")');
}

function walkShapeLayerGroup(vectorGroup, ctrlNameEsc) {
  var contents = null;
  try {
    contents = vectorGroup.property("Contents");
  } catch (_e0) {
    return;
  }
  if (!contents) return;

  var n = contents.numProperties;
  var i;
  for (i = 1; i <= n; i++) {
    var p = contents.property(i);
    var mn = p.matchName;
    if (mn === "ADBE Vector Graphic - Fill") {
      applyFillExpr(p, ctrlNameEsc);
    } else if (mn === "ADBE Vector Graphic - Stroke") {
      applyStrokeExpr(p, ctrlNameEsc);
    } else if (mn === "ADBE Vector Group") {
      walkShapeLayerGroup(p, ctrlNameEsc);
    }
  }

  var hasShape = false;
  var hasStroke = false;
  n = contents.numProperties;
  for (i = 1; i <= n; i++) {
    var p2 = contents.property(i);
    var mn2 = p2.matchName;
    if (mn2.indexOf("ADBE Vector Shape -") === 0) {
      hasShape = true;
    }
    if (mn2 === "ADBE Vector Graphic - Stroke") {
      hasStroke = true;
    }
  }
  if (hasShape && !hasStroke) {
    var stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
    try {
      stroke.property("Color").setValue([0, 0, 0, 1]);
      stroke.property("Stroke Width").setValue(2);
      stroke.property("Opacity").setValue(100);
    } catch (_e1) {}
    applyStrokeExpr(stroke, ctrlNameEsc);
  }
}

function applyStyleToShapeLayer(layer, ctrlNameEsc) {
  var root = layer.property("Contents");
  if (!root) return;
  var n = root.numProperties;
  var j;
  for (j = 1; j <= n; j++) {
    var p = root.property(j);
    if (p.matchName === "ADBE Vector Group") {
      walkShapeLayerGroup(p, ctrlNameEsc);
    }
  }
}

function main() {
  var comp = getComp();
  var shapeLayers = collectSelectedShapeLayers(comp);
  if (shapeLayers.length === 0) {
    throw new Error("모양(Shape) 레이어를 타임라인에서 선택하세요.");
  }

  var ctrl = getOrCreateController(comp);
  var ctrlNameEsc = escapeForLayerRef(ctrl.name);

  var shapeCount = 0;
  var si;
  for (si = 0; si < shapeLayers.length; si++) {
    applyStyleToShapeLayer(shapeLayers[si], ctrlNameEsc);
    shapeCount++;
  }
  if (shapeCount === 0) {
    throw new Error("선택에 모양(Shape) 레이어가 없습니다.");
  }

  return (
    "shape-style: 모양 레이어 " +
    shapeCount +
    "개 | 노란 채움 + 2px 검은 선 | 컨트롤: \"" +
    SHAPE_STYLE_CTRL_NAME +
    "\" → Fill Color / Stroke Color / Stroke Width"
  );
}

main();
