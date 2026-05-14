/**
 * *_LS 레이어를 LongShadows_PASS 프리컴프로 묶고,
 * 프리컴프 내부 ADJ_ShadowColor 조정 레이어(Tint)로 그림자 색 일괄 적용.
 * 메인: ADJ_ColorControl(조정)에 BG Color / Shadow Color, BG_LongShadow 셰이프는 BG Color 표현식.
 * Raster(프리컴프·풋리지): Directional Blur(ADBE Motion Blur) 길이·방향 → ADJ_ColorControl 표현식.
 *   + Matte Choker. (셰이프는 Repeater 복제 스텝이 동일 컨트롤을 따름.)
 * Expression Control matchName: docs/07-matchnames/effects-matchnames.md
 */
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
  throw new Error("활성 컴프가 없습니다.");
}

var CN = comp.name;
var ORANGE = [0.98, 0.52, 0.12, 1];
var BLUE = [0.12, 0.38, 0.95, 1];
var DEFAULT_SHADOW_LEN = 84;
var DEFAULT_SHADOW_ANGLE = 45;
var LS_TMP_TINT = [0.14, 0.11, 0.18, 1];
var CDJ_MATTE_CHOKE1 = 12;
var CDJ_MATTE_CHOKE2 = 12;
var CDJ_MATTE_ITER = 4;

function endsWithLS(name) {
  return name.length >= 3 && name.substring(name.length - 3) === "_LS";
}

function isLSShadowLayer(L) {
  if (!L) {
    return false;
  }
  return endsWithLS(L.name);
}

function isSlideTileBaseName(name) {
  if (name.indexOf("SlideTile_") !== 0) {
    return false;
  }
  if (endsWithLS(name)) {
    return false;
  }
  return true;
}

function collectBaseTilesForShadow(comp0) {
  var out = [];
  var i;
  for (i = 1; i <= comp0.numLayers; i++) {
    var L = comp0.layer(i);
    if (L.name === "ADJ_ColorControl" || L.name === "BG_LongShadow" || L.name === "LongShadows_PASS") {
      continue;
    }
    if (isLSShadowLayer(L)) {
      continue;
    }
    if (isSlideTileBaseName(L.name)) {
      out.push(L);
    }
  }
  return out;
}

function setRepeaterShadowExpressions(rep) {
  if (!rep) {
    return;
  }
  rep.property("ADBE Vector Repeater Order").setValue(2);
  rep.property("ADBE Vector Repeater Copies").expression =
    'var c=comp("' +
    CN +
    '").layer("ADJ_ColorControl");var len=c.effect("Shadow Length")("Slider");Math.min(120,Math.max(3,Math.round(len/2)))';
  rep.property("Transform").property("Position").expression =
    'var c=comp("' +
    CN +
    '").layer("ADJ_ColorControl");var len=c.effect("Shadow Length")("Slider");var ang=degreesToRadians(c.effect("Shadow Direction")("Angle"));var copies=Math.min(120,Math.max(3,Math.round(len/2)));var step=copies>0.001?len/copies:2;[Math.cos(ang)*step,Math.sin(ang)*step]';
}

function addRepeaterToShapeRootGroupsShape(shapeLayer) {
  var contents = shapeLayer.property("Contents");
  var i;
  for (i = 1; i <= contents.numProperties; i++) {
    var p = contents.property(i);
    if (p.matchName === "ADBE Vector Group") {
      var gc = p.property("Contents");
      var rep = gc.addProperty("ADBE Vector Filter - Repeater");
      setRepeaterShadowExpressions(rep);
    }
  }
}

function walkShapeRepeatersSetExpr(container) {
  var i;
  for (i = 1; i <= container.numProperties; i++) {
    var p = container.property(i);
    if (p.matchName === "ADBE Vector Filter - Repeater") {
      setRepeaterShadowExpressions(p);
    } else if (p.matchName === "ADBE Vector Group") {
      try {
        walkShapeRepeatersSetExpr(p.property("Contents"));
      } catch (eW) {}
    }
  }
}

function applyShapeRepeaterExpressions(shapeLayer) {
  if (!(shapeLayer instanceof ShapeLayer)) {
    return;
  }
  walkShapeRepeatersSetExpr(shapeLayer.property("Contents"));
}

function effParade(layer) {
  var ep = layer.property("ADBE Effect Parade");
  if (ep) {
    return ep;
  }
  return layer.property("Effects");
}

function addTmpTint(layer) {
  var eff = effParade(layer);
  if (!eff) {
    return;
  }
  var tint = eff.addProperty("ADBE Tint");
  tint.property("Map Black To").setValue(LS_TMP_TINT);
  tint.property("Map White To").setValue(LS_TMP_TINT);
}

function removeEffectsByMatchName(layer, mn) {
  var eff = effParade(layer);
  if (!eff) {
    return;
  }
  var i;
  for (i = eff.numProperties; i >= 1; i--) {
    if (eff.property(i).matchName === mn) {
      eff.property(i).remove();
    }
  }
}

/**
 * 프리컴프·이미지 등 래스터 레이어: Repeater 대체.
 * 기존 Radial Shadow / 동일 스택 잔여는 제거 후 재적용(재실행·수리 호환).
 */
function applyRasterLongShadowStack(layer) {
  if (!(layer instanceof AVLayer) || layer instanceof ShapeLayer) {
    return;
  }
  var rasterOk = layer.source && (layer.source instanceof CompItem || layer.source instanceof FootageItem);
  if (!rasterOk) {
    return;
  }
  removeEffectsByMatchName(layer, "ADBE Radial Shadow");
  removeEffectsByMatchName(layer, "ADBE Motion Blur");
  removeEffectsByMatchName(layer, "ADBE Simple Choker");
  removeEffectsByMatchName(layer, "CC Radial Fast Blur");
  removeEffectsByMatchName(layer, "ADBE Matte Choker");
  removeEffectsByMatchName(layer, "CC Composite");
  var eff = effParade(layer);
  if (!eff) {
    return;
  }
  var mb = eff.addProperty("ADBE Motion Blur");
  mb.property("ADBE Motion Blur-0001").expression =
    'comp("' + CN + '").layer("ADJ_ColorControl").effect("Shadow Direction")("Angle")';
  mb.property("ADBE Motion Blur-0002").expression =
    'Math.min(500,Math.max(0,comp("' + CN + '").layer("ADJ_ColorControl").effect("Shadow Length")("Slider")))';
  var mt = eff.addProperty("ADBE Matte Choker");
  mt.property("ADBE Matte Choker-0001").setValue(0);
  mt.property("ADBE Matte Choker-0002").setValue(CDJ_MATTE_CHOKE1);
  mt.property("ADBE Matte Choker-0003").setValue(0);
  mt.property("ADBE Matte Choker-0004").setValue(0);
  mt.property("ADBE Matte Choker-0005").setValue(CDJ_MATTE_CHOKE2);
  mt.property("ADBE Matte Choker-0006").setValue(0);
  mt.property("ADBE Matte Choker-0007").setValue(CDJ_MATTE_ITER);
}

/**
 * @deprecated 내부 호환 — applyRasterLongShadowStack 사용
 */
function ensureRadialShadowOnPrecompDup(layer) {
  applyRasterLongShadowStack(layer);
}

function repairPrecompLayersInPass(preCompItem) {
  if (!preCompItem) {
    return;
  }
  var j;
  for (j = 1; j <= preCompItem.numLayers; j++) {
    var L = preCompItem.layer(j);
    if (L.adjustmentLayer) {
      continue;
    }
    if (L instanceof ShapeLayer) {
      applyShapeRepeaterExpressions(L);
    } else {
      applyRasterLongShadowStack(L);
    }
  }
}

function ensureLSDuplicates(comp0) {
  var bases = collectBaseTilesForShadow(comp0);
  var t;
  for (t = 0; t < bases.length; t++) {
    var lyr = bases[t];
    if (!lyr.enabled) {
      continue;
    }
    var dup = lyr.duplicate();
    dup.name = lyr.name + "_LS";
    dup.moveAfter(lyr);
    if (lyr instanceof ShapeLayer) {
      addRepeaterToShapeRootGroupsShape(dup);
      addTmpTint(dup);
    } else if (lyr instanceof AVLayer && !(lyr instanceof ShapeLayer)) {
      if (lyr.source instanceof CompItem || lyr.source instanceof FootageItem) {
        applyRasterLongShadowStack(dup);
      }
    }
  }
}

function stripTintNeutralizeRadial(layer) {
  var fx = effParade(layer);
  if (!fx || fx.numProperties < 1) {
    return;
  }
  var i;
  for (i = fx.numProperties; i >= 1; i--) {
    var e = fx.property(i);
    if (e.matchName === "ADBE Tint") {
      e.remove();
    }
  }
}

function findEffectByMatch(layer, mn) {
  var fx = effParade(layer);
  if (!fx) {
    return null;
  }
  var j;
  for (j = 1; j <= fx.numProperties; j++) {
    var e = fx.property(j);
    if (e.matchName === mn) {
      return e;
    }
  }
  return null;
}

function ensureMainADJ(comp0) {
  var L = comp0.layer("ADJ_ColorControl");
  if (L && L.adjustmentLayer) {
    var fx = effParade(L);
    if (!fx) {
      return L;
    }
    var hasBg = false;
    var hasSh = false;
    var hasLen = false;
    var hasAng = false;
    var i;
    for (i = 1; i <= fx.numProperties; i++) {
      var e = fx.property(i);
      if (e.name === "BG Color") {
        hasBg = true;
      }
      if (e.name === "Shadow Color") {
        hasSh = true;
      }
      if (e.name === "Shadow Length") {
        hasLen = true;
      }
      if (e.name === "Shadow Direction") {
        hasAng = true;
      }
    }
    if (!hasBg) {
      var c1 = fx.addProperty("ADBE Color Control");
      c1.name = "BG Color";
      c1.property("Color").setValue(ORANGE);
    }
    if (!hasSh) {
      var c2 = fx.addProperty("ADBE Color Control");
      c2.name = "Shadow Color";
      c2.property("Color").setValue(BLUE);
    }
    if (!hasLen) {
      var sL = fx.addProperty("ADBE Slider Control");
      sL.name = "Shadow Length";
      sL.property("Slider").setValue(DEFAULT_SHADOW_LEN);
    }
    if (!hasAng) {
      var sA = fx.addProperty("ADBE Angle Control");
      sA.name = "Shadow Direction";
      sA.property("Angle").setValue(DEFAULT_SHADOW_ANGLE);
    }
    return L;
  }
  var adj = comp0.layers.addSolid([1, 1, 1], "ADJ_ColorControl", comp0.width, comp0.height, comp0.pixelAspect, comp0.duration);
  adj.adjustmentLayer = true;
  adj.name = "ADJ_ColorControl";
  var efx = effParade(adj);
  var bgc = efx.addProperty("ADBE Color Control");
  bgc.name = "BG Color";
  bgc.property("Color").setValue(ORANGE);
  var shc = efx.addProperty("ADBE Color Control");
  shc.name = "Shadow Color";
  shc.property("Color").setValue(BLUE);
  var sL2 = efx.addProperty("ADBE Slider Control");
  sL2.name = "Shadow Length";
  sL2.property("Slider").setValue(DEFAULT_SHADOW_LEN);
  var sA2 = efx.addProperty("ADBE Angle Control");
  sA2.name = "Shadow Direction";
  sA2.property("Angle").setValue(DEFAULT_SHADOW_ANGLE);
  return adj;
}

function ensureBGShape(comp0) {
  var L = comp0.layer("BG_LongShadow");
  if (L && L instanceof ShapeLayer) {
    var fl = findFillColorProp(L);
    if (fl) {
      fl.expression =
        'c=comp("' + CN + '").layer("ADJ_ColorControl").effect("BG Color")("Color");[c[0],c[1],c[2],1]';
    }
    return L;
  }
  var bg = comp0.layers.addShape();
  bg.name = "BG_LongShadow";
  var root = bg.property("Contents");
  var g = root.addProperty("ADBE Vector Group");
  var gc = g.property("Contents");
  var rect = gc.addProperty("ADBE Vector Shape - Rect");
  rect.property("Size").setValue([comp0.width, comp0.height]);
  rect.property("Position").setValue([comp0.width / 2, comp0.height / 2]);
  var fill = gc.addProperty("ADBE Vector Graphic - Fill");
  fill.property("Color").setValue(ORANGE);
  fill.property("Color").expression =
    'c=comp("' + CN + '").layer("ADJ_ColorControl").effect("BG Color")("Color");[c[0],c[1],c[2],1]';
  return bg;
}

function findFillColorProp(shapeLayer) {
  var root = shapeLayer.property("Contents");
  return walkFill(root);
}

function walkFill(container) {
  if (!container || !container.numProperties) {
    return null;
  }
  var i;
  for (i = 1; i <= container.numProperties; i++) {
    var p = container.property(i);
    if (p.matchName === "ADBE Vector Graphic - Fill") {
      return p.property("Color");
    }
    if (p.matchName === "ADBE Vector Group") {
      try {
        var gc = p.property("Contents");
        var inner = walkFill(gc);
        if (inner) {
          return inner;
        }
      } catch (e0) {}
    }
  }
  return null;
}

function slideTileOrderKey(name) {
  var m = name.match(/SlideTile_(\d+)/);
  return m ? parseInt(m[1], 10) : 99999;
}

function collectTiles(comp0, preCompRef) {
  var out = [];
  var i;
  for (i = 1; i <= comp0.numLayers; i++) {
    var L = comp0.layer(i);
    if (L.name === "ADJ_ColorControl" || L.name === "BG_LongShadow" || L.name === "LongShadows_PASS") {
      continue;
    }
    if (isLSShadowLayer(L)) {
      continue;
    }
    if (preCompRef && L.source === preCompRef) {
      continue;
    }
    if (L.name.indexOf("SlideTile_") === 0) {
      out.push(L);
    }
  }
  out.sort(function (a, b) {
    return slideTileOrderKey(a.name) - slideTileOrderKey(b.name);
  });
  return out;
}

function ensureInnerShadowADJ(preCompItem) {
  var adjIn = null;
  var k;
  for (k = 1; k <= preCompItem.numLayers; k++) {
    var Lk = preCompItem.layer(k);
    if (Lk.adjustmentLayer && Lk.name === "ADJ_ShadowColor") {
      adjIn = Lk;
      break;
    }
  }
  var expr =
    'c=comp("' +
    CN +
    '").layer("ADJ_ColorControl").effect("Shadow Color")("Color");[c[0],c[1],c[2],1]';
  if (!adjIn) {
    adjIn = preCompItem.layers.addSolid([1, 1, 1], "ADJ_ShadowColor", preCompItem.width, preCompItem.height, preCompItem.pixelAspect, preCompItem.duration);
    adjIn.adjustmentLayer = true;
    adjIn.name = "ADJ_ShadowColor";
    adjIn.moveToBeginning();
    var fxi = adjIn.property("Effects");
    var ti = fxi.addProperty("ADBE Tint");
    ti.property("Map Black To").expression = expr;
    ti.property("Map White To").expression = expr;
  } else {
    var wasLocked = adjIn.locked;
    if (wasLocked) {
      adjIn.locked = false;
    }
    adjIn.moveToBeginning();
    if (wasLocked) {
      adjIn.locked = true;
    }
    var ti2 = findEffectByMatch(adjIn, "ADBE Tint");
    if (!ti2) {
      ti2 = effParade(adjIn).addProperty("ADBE Tint");
    }
    ti2.property("Map Black To").expression = expr;
    ti2.property("Map White To").expression = expr;
  }
}

// --- Existing batch? ---
var existingPreLayer = null;
var preCompItem = null;
var i0;
for (i0 = 1; i0 <= comp.numLayers; i0++) {
  var Li = comp.layer(i0);
  if (Li.name === "LongShadows_PASS" && Li.source instanceof CompItem) {
    existingPreLayer = Li;
    preCompItem = Li.source;
    break;
  }
}

if (existingPreLayer && preCompItem) {
  var adjM = ensureMainADJ(comp);
  ensureInnerShadowADJ(preCompItem);
  repairPrecompLayersInPass(preCompItem);
  var tiles0 = collectTiles(comp, preCompItem);
  var u0;
  for (u0 = tiles0.length - 1; u0 >= 0; u0--) {
    tiles0[u0].moveToBeginning();
  }
  existingPreLayer.moveAfter(comp.layer(tiles0.length));
  var bg0 = ensureBGShape(comp);
  bg0.moveToEnd();
  existingPreLayer.moveBefore(bg0);
  adjM.moveToBeginning();
} else {
  var idxList = [];
  var r;
  for (r = 1; r <= comp.numLayers; r++) {
    var Lr = comp.layer(r);
    if (isLSShadowLayer(Lr)) {
      idxList.push(r);
    }
  }
  if (idxList.length === 0) {
    var anyBase = false;
    var bi;
    for (bi = 1; bi <= comp.numLayers; bi++) {
      if (isSlideTileBaseName(comp.layer(bi).name)) {
        anyBase = true;
        break;
      }
    }
    if (!anyBase) {
      throw new Error("SlideTile_ 베이스 레이어가 없습니다.");
    }
    ensureLSDuplicates(comp);
    idxList = [];
    for (r = 1; r <= comp.numLayers; r++) {
      Lr = comp.layer(r);
      if (isLSShadowLayer(Lr)) {
        idxList.push(r);
      }
    }
    if (idxList.length === 0) {
      throw new Error("그림자 복제 후에도 _LS를 찾지 못했습니다.");
    }
  }
  idxList.sort(function (a, b) {
    return a - b;
  });

  var refs = [];
  var q;
  for (q = 0; q < idxList.length; q++) {
    refs.push(comp.layer(idxList[q]));
  }
  for (q = 0; q < refs.length; q++) {
    stripTintNeutralizeRadial(refs[q]);
  }

  var preComp = comp.layers.precompose(idxList, "LongShadows_PASS", true);
  var preLayer = null;
  var p;
  for (p = 1; p <= comp.numLayers; p++) {
    var Lp = comp.layer(p);
    if (Lp.source === preComp) {
      preLayer = Lp;
      break;
    }
  }
  if (!preLayer) {
    throw new Error("프리컴프 레이어를 찾지 못했습니다.");
  }
  preLayer.name = "LongShadows_PASS";

  var adjMain = ensureMainADJ(comp);
  var bgLay = ensureBGShape(comp);
  ensureInnerShadowADJ(preComp);
  repairPrecompLayersInPass(preComp);

  var tiles = collectTiles(comp, preComp);
  var u;
  for (u = tiles.length - 1; u >= 0; u--) {
    tiles[u].moveToBeginning();
  }
  preLayer.moveAfter(comp.layer(tiles.length));

  bgLay.moveToEnd();
  preLayer.moveBefore(bgLay);

  adjMain.moveToBeginning();
}

LONGSHADOW_BATCH_RESULT = "OK " + CN + " : LongShadows_PASS + ADJ_ShadowColor + ADJ_ColorControl";
