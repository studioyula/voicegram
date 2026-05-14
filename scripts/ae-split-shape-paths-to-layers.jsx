/**
 * AE — 한 모양 레이어 안의 복수 패스를 각각 별도 모양 레이어로 분리 (splitShapes)
 *
 * 모드 A — 타임라인에서 Path / Path 그룹을 여러 개 선택: 선택한 패스만 분리 (같은 레이어)
 * 모드 B — 패스 미선택 + 모양 레이어 1개만 선택: 그 레이어 Contents 안의 모든 벡터 패스 분리
 *
 * 동작: 원본을 N번 복제 → 각 복제본에서 해당 키 하나만 남기고 나머지 패스 그룹 삭제 → 원본에서 분리한 패스들 제거
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

function getTimelineSelectedPathEntries(layer, t) {
  var out = [];
  var props = layer.selectedProperties;
  var pi;
  for (pi = 0; pi < props.length; pi++) {
    var p = props[pi];
    if (!p) continue;
    try {
      var pathProp = null;
      if (p.matchName === "ADBE Vector Shape" && pathPropIsUsable(p, t)) {
        pathProp = p;
      } else if (p.matchName === "ADBE Vector Shape - Group") {
        var nch;
        try {
          nch = p.numProperties;
        } catch (_n0) {
          nch = 0;
        }
        var k;
        for (k = 1; k <= nch; k++) {
          try {
            var ch = p.property(k);
            if (ch && ch.matchName === "ADBE Vector Shape" && pathPropIsUsable(ch, t)) {
              pathProp = ch;
              break;
            }
          } catch (_c) {}
        }
      }
      if (pathProp) {
        var pathGroup = pathProp.propertyGroup(1);
        out.push({
          layer: layer,
          pathProp: pathProp,
          pathGroup: pathGroup,
          dedupKey: pathDedupKey(pathProp, t),
        });
      }
    } catch (_e2) {}
  }
  return out;
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

function main() {
  var comp = getComp();
  var t = comp.time;
  var sel = comp.selectedLayers;
  if (!sel || sel.length === 0) throw new Error("모양 레이어를 선택하세요.");

  var shapeSel = [];
  var si;
  for (si = 0; si < sel.length; si++) {
    if (sel[si] instanceof ShapeLayer) {
      shapeSel.push(sel[si]);
    }
  }
  if (shapeSel.length === 0) throw new Error("모양(Shape) 레이어를 선택하세요.");

  var all = [];
  for (si = 0; si < shapeSel.length; si++) {
    var got = getTimelineSelectedPathEntries(shapeSel[si], t);
    var j;
    for (j = 0; j < got.length; j++) {
      all.push(got[j]);
    }
  }

  var entries = [];
  var seenK = {};
  if (all.length > 0) {
    for (si = 0; si < all.length; si++) {
      var dk = all[si].dedupKey;
      if (seenK[dk]) continue;
      seenK[dk] = true;
      entries.push(all[si]);
    }
  } else {
    if (shapeSel.length !== 1) {
      throw new Error("패스를 타임라인에서 고르지 않았을 때는 모양 레이어를 하나만 선택하세요. (레이어 안 패스 전부 분리)");
    }
    entries = collectAllVectorPathEntriesFromLayer(shapeSel[0], t);
  }

  if (entries.length < 2) {
    throw new Error("분리하려면 패스가 2개 이상 필요합니다. (현재 " + entries.length + "개)");
  }

  var src = entries[0].layer;
  for (si = 1; si < entries.length; si++) {
    if (entries[si].layer.index !== src.index) {
      throw new Error("한 번에 분리하려면 모든 패스가 같은 모양 레이어에 있어야 합니다.");
    }
  }

  var keysToRemove = {};
  var names = [];
  for (si = 0; si < entries.length; si++) {
    var dup = src.duplicate();
    dup.name = src.name + " · 분리 " + (si + 1);
    pruneLayerKeepOnlyPathKey(dup, entries[si].dedupKey, t);
    keysToRemove[entries[si].dedupKey] = true;
    names.push(dup.name);
  }
  removeAllPathsMatchingKeys(src, keysToRemove, t);

  return "split-shapes 완료: " + entries.length + "개 레이어 (" + names.join(", ") + "). 원본 " + src.name + " 에서 해당 패스 제거.";
}

main();
