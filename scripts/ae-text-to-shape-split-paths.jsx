/**
 * AE — 선택 텍스트 레이어 → 모양 변환(Create Shapes from Text) 후
 *     각 모양 레이어 안의 벡터 패스를 별도 모양 레이어로 분리
 *
 * 위치: 텍스트→모양은 AE 메뉴 명령(윤곽 일치). 패스 분리는 레이어 duplicate +
 *       동일 Contents 구조 유지로 레이어 트랜스폼·타이밍이 그대로 복사됨.
 *
 * 실행: coloso-ae-mcp execute(script: 본 파일 전체) 또는 File > Run Script
 */

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
    return v && v.vertices && v.vertices.length >= 2;
  } catch (_e) {
    return false;
  }
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

function pathPropIsUsable(pathProp, t) {
  return pathProp && pathProp.matchName === "ADBE Vector Shape" && isShapeValue(pathShapeValueAtTime(pathProp, t));
}

function buildContentPathFromPathProp(pathProp) {
  var chain = [];
  var g = pathProp.propertyGroup(1);
  while (g) {
    if (g.matchName === "ADBE Root Vectors Group") break;
    if (g.matchName === "ADBE Vector Group" || g.matchName === "ADBE Vector Shape - Group") {
      chain.unshift(g.name);
    }
    g = g.propertyGroup(1);
  }
  var s = "";
  var j;
  for (j = 0; j < chain.length; j++) {
    s += '.content("' + String(chain[j]).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '")';
  }
  return s + ".path";
}

function pathDedupKey(pathProp, t) {
  var suff = buildContentPathFromPathProp(pathProp);
  try {
    var v = pathShapeValueAtTime(pathProp, t);
    if (v && v.vertices && v.vertices.length > 0) {
      var p0 = v.vertices[0];
      var pn = v.vertices[v.vertices.length - 1];
      return suff + "#" + v.vertices.length + "#" + p0[0] + "," + p0[1] + "#" + pn[0] + "," + pn[1];
    }
  } catch (_e) {}
  return suff + "#novert";
}

function collectAllVectorPathEntriesFromLayer(layer, t) {
  var results = [];
  var seen = {};
  function tryAdd(pathProp) {
    if (!pathPropIsUsable(pathProp, t)) return;
    var dk = pathDedupKey(pathProp, t);
    if (seen[dk]) return;
    seen[dk] = true;
    results.push({
      layer: layer,
      pathProp: pathProp,
      pathGroup: pathProp.propertyGroup(1),
      dedupKey: dk,
    });
  }
  function visit(prop, depth) {
    if (!prop || depth > 220) return;
    try {
      if (prop.matchName === "ADBE Vector Shape") {
        tryAdd(prop);
      } else if (prop.matchName === "ADBE Vector Shape - Group") {
        var pathP = null;
        try {
          pathP = prop.property("Path");
        } catch (_pe) {
          pathP = null;
        }
        if (pathP && pathP.matchName === "ADBE Vector Shape") {
          tryAdd(pathP);
        }
        var nch;
        var k;
        try {
          nch = prop.numProperties;
        } catch (_n0) {
          nch = 0;
        }
        for (k = 1; k <= nch; k++) {
          try {
            var ch = prop.property(k);
            if (ch && ch.matchName === "ADBE Vector Shape") {
              tryAdd(ch);
            }
          } catch (_c) {}
        }
      }
    } catch (_e0) {}
    var n;
    var i;
    try {
      n = prop.numProperties;
      if (n && n > 0) {
        for (i = 1; i <= n; i++) {
          try {
            visit(prop.property(i), depth + 1);
          } catch (_e1) {}
        }
      }
    } catch (_e2) {}
  }
  try {
    visit(layer.property("Contents"), 0);
  } catch (_e3) {}
  return results;
}

function findVectorShapeGroupNotMatching(layer, keepKey, t) {
  var found = null;
  function visit(prop) {
    if (found || !prop) return;
    try {
      if (prop.matchName === "ADBE Vector Shape - Group") {
        var pathP = prop.property("Path");
        if (pathP && pathPropIsUsable(pathP, t)) {
          if (pathDedupKey(pathP, t) !== keepKey) {
            found = prop;
            return;
          }
        }
      }
    } catch (_e0) {}
    var n;
    var i;
    try {
      n = prop.numProperties;
      if (n && n > 0) {
        for (i = 1; i <= n; i++) {
          try {
            visit(prop.property(i));
          } catch (_e1) {}
        }
      }
    } catch (_e2) {}
  }
  try {
    visit(layer.property("Contents"));
  } catch (_e3) {}
  return found;
}

function pruneLayerKeepOnlyPathKey(layer, keepKey, t) {
  var changed = true;
  while (changed) {
    changed = false;
    var victim = findVectorShapeGroupNotMatching(layer, keepKey, t);
    if (victim) {
      try {
        victim.remove();
        changed = true;
      } catch (_r) {}
    }
  }
}

function findVectorShapeGroupWithKeyInObj(layer, keyObj, t) {
  var found = null;
  function visit(prop) {
    if (found || !prop) return;
    try {
      if (prop.matchName === "ADBE Vector Shape - Group") {
        var pathP = prop.property("Path");
        if (pathP && pathPropIsUsable(pathP, t)) {
          var dk = pathDedupKey(pathP, t);
          if (keyObj[dk]) {
            found = prop;
            return;
          }
        }
      }
    } catch (_e0) {}
    var n;
    var i;
    try {
      n = prop.numProperties;
      if (n && n > 0) {
        for (i = 1; i <= n; i++) {
          try {
            visit(prop.property(i));
          } catch (_e1) {}
        }
      }
    } catch (_e2) {}
  }
  try {
    visit(layer.property("Contents"));
  } catch (_e3) {}
  return found;
}

function removeAllPathsMatchingKeys(layer, keyObj, t) {
  var changed = true;
  while (changed) {
    changed = false;
    var victim = findVectorShapeGroupWithKeyInObj(layer, keyObj, t);
    if (victim) {
      try {
        victim.remove();
        changed = true;
      } catch (_r) {}
    }
  }
}

function splitShapeLayerAllPaths(src, t) {
  var entries = collectAllVectorPathEntriesFromLayer(src, t);
  if (entries.length < 2) {
    return { ok: true, skipped: true, msg: "패스 1개 — 분리 생략", count: entries.length };
  }
  var keysToRemove = {};
  var names = [];
  var si;
  for (si = 0; si < entries.length; si++) {
    var dup = src.duplicate();
    dup.name = src.name + " · 분리 " + (si + 1);
    pruneLayerKeepOnlyPathKey(dup, entries[si].dedupKey, t);
    keysToRemove[entries[si].dedupKey] = true;
    names.push(dup.name);
  }
  removeAllPathsMatchingKeys(src, keysToRemove, t);
  return { ok: true, skipped: false, msg: entries.length + "개 패스 → 레이어 분리", names: names, count: entries.length };
}

function createShapesFromTextCommandId() {
  var cmdId = 3781;
  try {
    var fid = app.findMenuCommandId("Create Shapes from Text");
    if (fid && fid > 0) cmdId = fid;
  } catch (_e) {}
  return cmdId;
}

function deselectAllInComp(comp) {
  var j;
  for (j = 1; j <= comp.numLayers; j++) {
    try {
      comp.layer(j).selected = false;
    } catch (_e) {}
  }
}

function firstSelectedShapeLayer(comp) {
  var sel = comp.selectedLayers;
  var j;
  for (j = 0; j < sel.length; j++) {
    if (sel[j] instanceof ShapeLayer) return sel[j];
  }
  return null;
}

function main() {
  var comp = getComp();
  var t = comp.time;
  var texts = [];
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (L.selected && L instanceof TextLayer) texts.push(L);
  }
  if (texts.length === 0) throw new Error("텍스트 레이어를 선택하세요.");

  texts.sort(function (a, b) {
    return b.index - a.index;
  });

  var cmdId = createShapesFromTextCommandId();
  var logLines = [];

  for (i = 0; i < texts.length; i++) {
    var textL = texts[i];
    deselectAllInComp(comp);
    textL.selected = true;
    app.executeCommand(cmdId);
    var shapeL = firstSelectedShapeLayer(comp);
    if (!shapeL) {
      logLines.push(textL.name + ": 모양 레이어를 찾지 못함 (메뉴 명령 실패 또는 버전 차이)");
      continue;
    }
    try {
      textL.enabled = false;
    } catch (_en) {}

    var res = splitShapeLayerAllPaths(shapeL, t);
    if (res.skipped) {
      logLines.push(shapeL.name + " — " + res.msg);
    } else {
      logLines.push(shapeL.name + " — " + res.msg + " (" + res.names.join(", ") + ")");
    }
  }

  deselectAllInComp(comp);
  return "text→shape + split 완료: " + logLines.join(" || ");
}

var AE_TEXT_SHAPE_SPLIT_LAST = main();
