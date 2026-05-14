/**
 * AE — 활성 컴프에서 컨트롤러 널 레이어 이름을 정리하고,
 * 모든 표현식의 thisComp.layer("…") 참조를 새 이름에 맞게 일괄 치환합니다.
 *
 * 대상:
 *   ShapeStyle_Ctrl          → CTRL · 도형 스타일
 *   ObjFlow_Ctrl_<n>        → CTRL · 패스 흐름 <n>
 *
 * 실행: coloso-ae-mcp execute(script: 본 파일 전체) 또는 File > Run Script
 */

var SHAPE_STYLE_OLD = "ShapeStyle_Ctrl";
var SHAPE_STYLE_NEW = "CTRL · 도형 스타일";

var OBJFLOW_CTRL_PREFIX_OLD = "ObjFlow_Ctrl_";
var OBJFLOW_CTRL_PREFIX_NEW = "CTRL · 패스 흐름 ";

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

function escLayerRef(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function replaceThisCompLayerInExpr(expr, oldName, newName) {
  if (!expr || expr === "") return expr;
  var o = escLayerRef(oldName);
  var n = escLayerRef(newName);
  var a = 'thisComp.layer("' + o + '")';
  var b = 'thisComp.layer("' + n + '")';
  var out = expr.split(a).join(b);
  if (out === expr) {
    var a2 = "thisComp.layer('" + o + "')";
    var b2 = "thisComp.layer('" + n + "')";
    out = expr.split(a2).join(b2);
  }
  return out;
}

function collectRenamePairs(comp) {
  var pairs = [];
  var seen = {};
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var n = comp.layer(i).name;
    if (n === SHAPE_STYLE_OLD && !seen[n]) {
      pairs.push({ old: SHAPE_STYLE_OLD, neu: SHAPE_STYLE_NEW });
      seen[n] = true;
    } else if (n.indexOf(OBJFLOW_CTRL_PREFIX_OLD) === 0 && !seen[n]) {
      var suf = n.substring(OBJFLOW_CTRL_PREFIX_OLD.length);
      pairs.push({ old: n, neu: OBJFLOW_CTRL_PREFIX_NEW + suf });
      seen[n] = true;
    }
  }
  return pairs;
}

function applyExprReplacementsToProp(prop, pairs) {
  if (!prop) return 0;
  var nchg = 0;
  try {
    if (
      prop.propertyType === PropertyType.PROPERTY &&
      prop.canSetExpression &&
      prop.expressionEnabled &&
      prop.expression &&
      prop.expression !== ""
    ) {
      var ex = prop.expression;
      var pi;
      for (pi = 0; pi < pairs.length; pi++) {
        ex = replaceThisCompLayerInExpr(ex, pairs[pi].old, pairs[pi].neu);
      }
      if (ex !== prop.expression) {
        prop.expression = ex;
        nchg++;
      }
    }
  } catch (_e) {}
  return nchg;
}

function walkPropertyTree(prop, pairs) {
  var total = 0;
  if (!prop) return total;
  total += applyExprReplacementsToProp(prop, pairs);
  try {
    var n = prop.numProperties;
    if (n && n > 0) {
      var i;
      for (i = 1; i <= n; i++) {
        total += walkPropertyTree(prop.property(i), pairs);
      }
    }
  } catch (_e2) {}
  return total;
}

function replaceAllExpressionsInComp(comp, pairs) {
  var total = 0;
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    try {
      total += walkPropertyTree(comp.layer(li), pairs);
    } catch (_e) {}
  }
  return total;
}

function main() {
  var comp = getActiveComp();
  var pairs = collectRenamePairs(comp);
  if (pairs.length === 0) {
    return "rename-controllers: 바꿀 레이어 없음 (" + SHAPE_STYLE_OLD + " / " + OBJFLOW_CTRL_PREFIX_OLD + "*)";
  }

  var qi;
  for (qi = 0; qi < pairs.length; qi++) {
    var li;
    for (li = 1; li <= comp.numLayers; li++) {
      if (comp.layer(li).name === pairs[qi].old) {
        comp.layer(li).name = pairs[qi].neu;
        break;
      }
    }
  }

  var exprPatches = replaceAllExpressionsInComp(comp, pairs);

  var msg = "rename-controllers: 레이어 ";
  msg += pairs.length + "개 이름 변경 | 표현식 치환 " + exprPatches + "곳 | ";
  var pj;
  var bits = [];
  for (pj = 0; pj < pairs.length; pj++) {
    bits.push(pairs[pj].old + " → " + pairs[pj].neu);
  }
  msg += bits.join(" · ");
  return msg;
}

main();
