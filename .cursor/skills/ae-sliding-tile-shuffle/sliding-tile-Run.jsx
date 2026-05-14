/**
 * 슬라이딩 타일 셔플 — 단일 파일 (작성 후 바로 실행)
 *
 * After Effects → File → Scripts → Run Script File… → 이 파일
 * 또는 Scripts/ScriptUI Panels 에 복사 후 Window 메뉴에서 실행(같은 파일).
 *
 * aeSlidingTileRun(comp, P) + ScriptUI 패널이 한 파일에 포함됨.
 */
function aeSlidingTileRun(comp, P) {
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("활성 컴포지션이 없습니다.");
  }

  function isTimelineLayerInComp(L, c) {
    if (L == null) return false;
    try {
      if (L.containingComp !== c) return false;
      var idx = L.index;
      if (typeof idx !== "number" || idx < 1 || idx > c.numLayers) return false;
      if (c.layer(idx) !== L) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function sourceLayerName(L) {
    try {
      return String(L.name);
    } catch (eN) {
      return "(이름 없음)";
    }
  }

  var useSource = P.sourceLayers && P.sourceLayers.length > 0;
  var si0;
  if (useSource) {
    for (si0 = 0; si0 < P.sourceLayers.length; si0++) {
      var SLchk = P.sourceLayers[si0];
      if (!isTimelineLayerInComp(SLchk, comp)) {
        throw new Error(
          "sourceLayers: 이 컴프에 없거나 사라진 레이어가 있습니다. 인덱스 확인: " + si0
        );
      }
      if (SLchk.locked) {
        throw new Error("잠긴 레이어는 소스로 쓸 수 없습니다: " + sourceLayerName(SLchk));
      }
    }
  }

  var fd = comp.frameDuration > 0 ? comp.frameDuration : 1 / 30;
  var maxTime = Math.max(0.1, comp.duration - P.marginEnd);
  var cellSize = Math.max(comp.width / P.cols, comp.height / P.rows);
  var gridW = P.cols * cellSize;
  var gridH = P.rows * cellSize;
  var gridOriginX = (comp.width - gridW) / 2;
  var gridOriginY = (comp.height - gridH) / 2;
  var totalCells = P.cols * P.rows;
  var nTiles;
  if (P.emptyRemove != null) {
    var er = Number(P.emptyRemove);
    if (er < 0) er = 0;
    if (er > 0.99) er = 0.99;
    nTiles = Math.floor(totalCells * (1 - er));
  } else if (P.density != null) {
    nTiles = Math.floor(totalCells * P.density);
  } else {
    nTiles = Math.floor(totalCells * (1 - 0.33));
  }
  if (nTiles >= totalCells) nTiles = totalCells - 1;
  if (nTiles < 1) nTiles = 1;

  function shuffle(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function cellKey(c, r) {
    return c + "," + r;
  }

  function addNeighborLocks(lock, c, r) {
    lock[cellKey(c, r)] = 1;
    lock[cellKey(c - 1, r)] = 1;
    lock[cellKey(c + 1, r)] = 1;
    lock[cellKey(c, r - 1)] = 1;
    lock[cellKey(c, r + 1)] = 1;
  }

  function lockForMove(sc, sr, ec, er, lock) {
    addNeighborLocks(lock, sc, sr);
    addNeighborLocks(lock, ec, er);
  }

  function manhattan(ac, ar, bc, br) {
    return Math.abs(ac - bc) + Math.abs(ar - br);
  }

  function centerPos(ic, ir) {
    var x = gridOriginX + (ic + 0.5) * cellSize;
    var y = gridOriginY + (ir + 0.5) * cellSize;
    return [x, y];
  }

  function applyRectStyle(contents) {
    if (P.fillColor && P.fillColor !== "none") {
      var fill = contents.addProperty("ADBE Vector Graphic - Fill");
      fill.property("ADBE Vector Fill Color").setValue(P.fillColor);
      fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    if (P.strokeColor && P.strokeWidth > 0) {
      var stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
      stroke.property("ADBE Vector Stroke Color").setValue(P.strokeColor);
      stroke.property("ADBE Vector Stroke Width").setValue(P.strokeWidth);
      stroke.property("ADBE Vector Stroke Opacity").setValue(100);
    }
  }

  function makeRectTileLayer(nameStr, w, h) {
    var layer = comp.layers.addShape();
    layer.name = nameStr;
    var root = layer.property("ADBE Root Vectors Group");
    var grp = root.addProperty("ADBE Vector Group");
    grp.name = "rect";
    var contents = grp.property("ADBE Vectors Group");
    var rect = contents.addProperty("ADBE Vector Shape - Rect");
    rect.property("ADBE Vector Rect Size").setValue([w, h]);
    applyRectStyle(contents);
    layer.transform.position.setValue(centerPos(0, 0));
    return layer;
  }

  function layerPointToComp(layer, pt, t) {
    var ap = layer.transform.anchorPoint.valueAtTime(t, false);
    var pos = layer.transform.position.valueAtTime(t, false);
    var sc = layer.transform.scale.valueAtTime(t, false);
    var rot = layer.transform.rotation.valueAtTime(t, false);
    var dx = (pt[0] - ap[0]) * (sc[0] / 100);
    var dy = (pt[1] - ap[1]) * (sc[1] / 100);
    var rad = (rot * Math.PI) / 180;
    var rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    var ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    if (!layer.parent) {
      return [pos[0] + rx, pos[1] + ry];
    }
    var pap = layer.parent.transform.anchorPoint.valueAtTime(t, false);
    var nextPt = [pap[0] + pos[0] + rx, pap[1] + pos[1] + ry];
    return layerPointToComp(layer.parent, nextPt, t);
  }

  function layerAabbMaxSideInComp(layer, t) {
    var r;
    try {
      r = layer.sourceRectAtTime(t, false);
    } catch (eR) {
      r = null;
    }
    if (!r || !(r.width > 0) || !(r.height > 0)) {
      var fw = Math.abs(layer.width);
      var fh = Math.abs(layer.height);
      var m0 = Math.max(fw, fh);
      return Math.max(m0, 1e-6);
    }
    var pts = [
      [r.left, r.top],
      [r.left + r.width, r.top],
      [r.left + r.width, r.top + r.height],
      [r.left, r.top + r.height]
    ];
    var minX = 1e9;
    var minY = 1e9;
    var maxX = -1e9;
    var maxY = -1e9;
    var ii;
    for (ii = 0; ii < 4; ii++) {
      var c = layerPointToComp(layer, pts[ii], t);
      if (c[0] < minX) minX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] > maxY) maxY = c[1];
    }
    return Math.max(maxX - minX, maxY - minY, 1e-6);
  }

  function isInSourceList(LL, arr) {
    if (!arr || !arr.length) return false;
    var qs;
    for (qs = 0; qs < arr.length; qs++) {
      if (arr[qs] === LL) return true;
    }
    return false;
  }

  function makeCloneTileLayer(nameStr, src, ic, ir) {
    var dup = src.duplicate();
    dup.name = nameStr;
    try {
      dup.selected = false;
    } catch (eSel) {}
    try {
      dup.parent = null;
    } catch (ePar) {}

    var t0 = 0;
    var m = layerAabbMaxSideInComp(dup, t0);
    var sc = dup.scale.value;
    var scZ = sc.length > 2 ? sc[2] : 100;
    var f = cellSize / m;
    if (f > 10000) f = 10000;
    if (f < 0.00001) f = 0.00001;
    var ns0 = sc[0] * f;
    var ns1 = sc.length > 1 ? sc[1] * f : ns0;
    if (sc.length >= 3) {
      dup.scale.setValue([ns0, ns1, scZ]);
    } else {
      dup.scale.setValue([ns0, ns1]);
    }

    var xy = centerPos(ic, ir);
    var pos = dup.transform.position;
    var pv = pos.value;
    if (pv.length > 2) {
      pos.setValue([xy[0], xy[1], pv[2]]);
    } else {
      pos.setValue(xy);
    }
    return dup;
  }

  if (P.removeExisting) {
    for (var ri = comp.numLayers; ri >= 1; ri--) {
      var LL = comp.layer(ri);
      if (LL.name.indexOf(P.namePrefix) === 0 && !isInSourceList(LL, P.sourceLayers)) {
        LL.remove();
      }
    }
  }

  var slots = [];
  var ci, ri;
  for (ci = 0; ci < P.cols; ci++) {
    for (ri = 0; ri < P.rows; ri++) {
      slots.push({ c: ci, r: ri });
    }
  }
  shuffle(slots);
  var chosen = slots.slice(0, nTiles);

  var grid = [];
  for (ci = 0; ci < P.cols; ci++) {
    grid[ci] = [];
    for (ri = 0; ri < P.rows; ri++) grid[ci][ri] = 0;
  }

  var tileInfos = {};
  var nextId = 1;
  var i;
  for (i = 0; i < chosen.length; i++) {
    var ic = chosen[i].c;
    var ir = chosen[i].r;
    var tid = nextId++;
    var L;
    if (useSource) {
      var pick = Math.floor(Math.random() * P.sourceLayers.length);
      L = makeCloneTileLayer(P.namePrefix + tid, P.sourceLayers[pick], ic, ir);
    } else {
      L = makeRectTileLayer(P.namePrefix + tid, cellSize, cellSize);
      L.transform.position.setValue(centerPos(ic, ir));
    }
    grid[ic][ir] = tid;
    tileInfos[tid] = { layer: L, col: ic, row: ir, lastMove: -1 };
  }

  function listEmpties() {
    var out = [];
    for (ci = 0; ci < P.cols; ci++) {
      for (ri = 0; ri < P.rows; ri++) {
        if (grid[ci][ri] === 0) out.push({ c: ci, r: ri });
      }
    }
    return out;
  }

  function dirs4() {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]];
  }

  var movesLog = [];
  var maxConcurrent = 0;
  var stepIdx = 0;

  while (stepIdx * P.stepDur + P.moveDur <= maxTime + 1e-9) {
    var tStart = stepIdx * P.stepDur;
    var lock = {};
    var planned = [];
    var empties = shuffle(listEmpties());
    var ei, di, kk, cand, best, bestScore, sc, sr, tid, info, nc, nr, nk, blocked, mv;
    for (ei = 0; ei < empties.length; ei++) {
      var ec = empties[ei].c;
      var er = empties[ei].r;
      cand = [];
      var D = dirs4();
      for (di = 0; di < D.length; di++) {
        nc = ec + D[di][0];
        nr = er + D[di][1];
        if (nc < 0 || nr < 0 || nc >= P.cols || nr >= P.rows) continue;
        tid = grid[nc][nr];
        if (tid === 0) continue;
        nk = cellKey(nc, nr);
        if (lock[nk]) continue;
        cand.push({ tid: tid, sc: nc, sr: nr, ec: ec, er: er });
      }
      if (cand.length === 0) continue;
      best = null;
      bestScore = 1e20;
      for (kk = 0; kk < cand.length; kk++) {
        info = tileInfos[cand[kk].tid];
        var sc0 = cand[kk].sc;
        var sr0 = cand[kk].sr;
        if (manhattan(sc0, sr0, ec, er) !== 1) continue;
        var score = info.lastMove + Math.random() * 0.05;
        if (score < bestScore) {
          bestScore = score;
          best = cand[kk];
        }
      }
      if (!best) continue;
      sc = best.sc;
      sr = best.sr;
      if (manhattan(sc, sr, ec, er) !== 1) continue;
      var testLock = {};
      lockForMove(sc, sr, ec, er, testLock);
      blocked = false;
      for (nk in testLock) {
        if (!testLock.hasOwnProperty(nk)) continue;
        if (lock[nk]) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      for (nk in testLock) {
        if (testLock.hasOwnProperty(nk)) lock[nk] = 1;
      }
      planned.push({ tid: best.tid, sc: sc, sr: sr, ec: ec, er: er, tStart: tStart });
    }
    if (planned.length === 0) break;
    if (planned.length > maxConcurrent) maxConcurrent = planned.length;
    for (i = 0; i < planned.length; i++) {
      mv = planned[i];
      movesLog.push(mv);
      grid[mv.sc][mv.sr] = 0;
      grid[mv.ec][mv.er] = mv.tid;
      tileInfos[mv.tid].col = mv.ec;
      tileInfos[mv.tid].row = mv.er;
      tileInfos[mv.tid].lastMove = tStart;
    }
    stepIdx++;
  }

  var perLayer = {};
  for (tid = 1; tid < nextId; tid++) {
    if (tileInfos[tid]) perLayer[tid] = [];
  }
  for (i = 0; i < movesLog.length; i++) {
    mv = movesLog[i];
    perLayer[mv.tid].push(mv);
  }

  var easeOutFast = [new KeyframeEase(0, 10)];
  var easeInSoft = [new KeyframeEase(0, 95)];
  var easeNeu = [new KeyframeEase(0, 33)];
  var threeD = PropertyValueType.ThreeD_SPATIAL;
  var zero2 = [0, 0];
  var zero3 = [0, 0, 0];

  for (tid = 1; tid < nextId; tid++) {
    if (!tileInfos[tid]) continue;
    var layer = tileInfos[tid].layer;
    var pos = layer.transform.position;
    if (pos.expression && String(pos.expression).length) pos.expression = "";
    while (pos.numKeys > 0) pos.removeKey(1);
    var seq = perLayer[tid];
    var cur = layer.transform.position.valueAtTime(0, false);
    var curX = cur[0];
    var curY = cur[1];
    var curZ = cur.length > 2 ? cur[2] : null;
    if (seq.length === 0) continue;
    for (var j = 0; j < seq.length; j++) {
      mv = seq[j];
      var tPre = mv.tStart - fd;
      if (tPre < 0) tPre = 0;
      var tS = mv.tStart;
      var tE = mv.tStart + P.moveDur;
      var fromX, fromY, toX, toY;
      if (mv.sr === mv.er) {
        var rowY = gridOriginY + (mv.sr + 0.5) * cellSize;
        fromY = rowY;
        toY = rowY;
        fromX = curX;
        toX = gridOriginX + (mv.ec + 0.5) * cellSize;
      } else if (mv.sc === mv.ec) {
        var colX = gridOriginX + (mv.sc + 0.5) * cellSize;
        fromX = colX;
        toX = colX;
        fromY = curY;
        toY = gridOriginY + (mv.er + 0.5) * cellSize;
      } else {
        throw new Error("non orthogonal grid move");
      }
      if (manhattan(mv.sc, mv.sr, mv.ec, mv.er) !== 1) throw new Error("bake manhattan");
      if (curZ !== null) {
        pos.setValueAtTime(tPre, [fromX, fromY, curZ]);
        pos.setValueAtTime(tS, [fromX, fromY, curZ]);
        pos.setValueAtTime(tE, [toX, toY, curZ]);
      } else {
        pos.setValueAtTime(tPre, [fromX, fromY]);
        pos.setValueAtTime(tS, [fromX, fromY]);
        pos.setValueAtTime(tE, [toX, toY]);
      }
      curX = toX;
      curY = toY;
    }
    var keyIdx;
    for (keyIdx = 1; keyIdx <= pos.numKeys; keyIdx++) {
      pos.setInterpolationTypeAtKey(
        keyIdx,
        KeyframeInterpolationType.BEZIER,
        KeyframeInterpolationType.BEZIER
      );
      var isOdd = keyIdx % 2 === 1;
      if (isOdd) pos.setTemporalEaseAtKey(keyIdx, easeNeu, easeOutFast);
      else pos.setTemporalEaseAtKey(keyIdx, easeInSoft, easeNeu);
      if (pos.isSpatial) {
        if (pos.propertyValueType === threeD) pos.setSpatialTangentsAtKey(keyIdx, zero3, zero3);
        else pos.setSpatialTangentsAtKey(keyIdx, zero2, zero2);
        try {
          pos.setSpatialAutoBezierAtKey(keyIdx, false);
        } catch (e1) {}
        try {
          pos.setSpatialContinuousAtKey(keyIdx, false);
        } catch (e2) {}
      }
    }
  }

  var nSourcesRemoved = 0;
  if (useSource && P.removeSourceLayersAfter !== false) {
    var doomed = [];
    for (si0 = 0; si0 < P.sourceLayers.length; si0++) {
      doomed.push(P.sourceLayers[si0]);
    }
    doomed.sort(function (a, b) {
      try {
        return b.index - a.index;
      } catch (eOrd) {
        return 0;
      }
    });
    for (si0 = 0; si0 < doomed.length; si0++) {
      try {
        if (doomed[si0].containingComp === comp) {
          doomed[si0].remove();
          nSourcesRemoved++;
        }
      } catch (eRm) {}
    }
  }

  return JSON.stringify({
    ok: true,
    tileMode: useSource ? "clone" : "rect",
    sourceCount: useSource ? P.sourceLayers.length : 0,
    sourcesRemoved: nSourcesRemoved,
    cols: P.cols,
    rows: P.rows,
    emptyRemove: P.emptyRemove,
    densityLegacy: P.density,
    nTiles: nTiles,
    empties: totalCells - nTiles,
    cellSize: Math.round(cellSize * 100) / 100,
    gridW: Math.round(gridW * 100) / 100,
    gridH: Math.round(gridH * 100) / 100,
    gridOriginX: Math.round(gridOriginX * 100) / 100,
    gridOriginY: Math.round(gridOriginY * 100) / 100,
    totalMoves: movesLog.length,
    maxConcurrent: maxConcurrent,
    steps: stepIdx,
    prefix: P.namePrefix
  });
}

(function slidingTileShuffleUI(thisObj) {
  function collectSelectedLayers(comp) {
    var out = [];
    var zi;
    for (zi = 1; zi <= comp.numLayers; zi++) {
      var Lz = comp.layer(zi);
      if (Lz.selected) out.push(Lz);
    }
    return out;
  }

  function parseNum(s, defVal) {
    var n = parseFloat(String(s).replace(/,/g, "."));
    if (isNaN(n)) return defVal;
    return n;
  }

  function gridDimsFromCellPx(comp, cellPx) {
    var s = Number(cellPx);
    if (isNaN(s) || s < 2) s = 100;
    var cols = Math.max(2, Math.ceil(comp.width / s));
    var rows = Math.max(2, Math.ceil(comp.height / s));
    var cellActual = Math.max(comp.width / cols, comp.height / rows);
    return { cols: cols, rows: rows, cellTarget: s, cellActual: cellActual };
  }

  function suggestCellPx(c) {
    var shortSide = Math.min(c.width, c.height);
    var t = Math.max(16, Math.round(shortSide / 10));
    return t;
  }

  function buildP(comp, ui) {
    var g = gridDimsFromCellPx(comp, parseNum(ui.etCell.text, 100));
    return {
      cols: g.cols,
      rows: g.rows,
      emptyRemove: Math.min(0.99, Math.max(0, parseNum(ui.etEmpty.text, 0.33))),
      density: null,
      moveDur: Math.max(0.01, parseNum(ui.etMove.text, 0.2)),
      stepDur: Math.max(0.01, parseNum(ui.etStep.text, 0.25)),
      marginEnd: Math.max(0, parseNum(ui.etMargin.text, 0.5)),
      namePrefix: ui.etPrefix.text.length ? ui.etPrefix.text : "SlideTile_",
      fillColor: [1, 1, 1, 1],
      strokeColor: null,
      strokeWidth: 0,
      removeExisting: ui.chkRemove.value
    };
  }

  function refreshCompInfo(ui) {
    var c = app.project.activeItem;
    if (c && c instanceof CompItem) {
      var selN = collectSelectedLayers(c).length;
      ui.stComp.text =
        c.name +
        "  ·  " +
        Math.round(c.width) +
        "×" +
        Math.round(c.height) +
        "  ·  " +
        c.duration.toFixed(2) +
        "s" +
        (selN ? "  ·  선택 " + selN + "개 (복제 타일)" : "");
      var g = gridDimsFromCellPx(c, parseNum(ui.etCell.text, 100));
      ui.stGrid.text =
        "→ " +
        g.cols +
        "×" +
        g.rows +
        " 칸 · 베이크 셀 " +
        Math.round(g.cellActual * 100) / 100 +
        "px";
    } else {
      ui.stComp.text = "(활성 컴포지션 없음)";
      ui.stGrid.text = "셀(px) 입력 시 열·행이 자동 계산됩니다. 레이어 선택 시 복제 모드.";
    }
  }

  function onSuggest(ui) {
    var c = app.project.activeItem;
    if (!c || !(c instanceof CompItem)) return;
    ui.etCell.text = String(suggestCellPx(c));
    refreshCompInfo(ui);
  }

  function onRun(ui) {
    try {
      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        ui.stResult.text = "활성 컴포지션을 연 뒤 다시 실행하세요.";
        return;
      }
      var P = buildP(comp, ui);
      var picked = collectSelectedLayers(comp);
      if (picked.length > 0) {
        P.sourceLayers = picked;
        P.removeSourceLayersAfter = true;
      }
      app.beginUndoGroup("Sliding Tile Shuffle");
      var out = aeSlidingTileRun(comp, P);
      app.endUndoGroup();
      ui.stResult.text = out;
      refreshCompInfo(ui);
    } catch (e) {
      try {
        app.endUndoGroup();
      } catch (e2) {}
      ui.stResult.text = "오류: " + String(e);
    }
  }

  function buildUI(thisObj) {
    var pal =
      thisObj instanceof Panel
        ? thisObj
        : new Window("palette", "슬라이딩 타일 셔플", undefined, { resizeable: true });

    pal.orientation = "column";
    pal.alignChildren = "fill";
    pal.spacing = 6;
    pal.margins = 12;

    var stComp = pal.add("statictext", undefined, "", { multiline: true });
    stComp.preferredSize = [260, 36];

    var grpTop = pal.add("group");
    grpTop.orientation = "row";
    grpTop.alignChildren = ["left", "center"];
    var btnSuggest = grpTop.add("button", undefined, "셀 크기 추천");
    var btnRefresh = grpTop.add("button", undefined, "컴프 새로고침");

    function addLabeledEdit(parent, label, init, w) {
      var g = parent.add("group");
      g.orientation = "row";
      g.alignChildren = ["left", "center"];
      g.add("statictext", undefined, label);
      var et = g.add("edittext", undefined, init);
      et.preferredSize = [w || 56, 22];
      return et;
    }

    var etCell = addLabeledEdit(pal, "셀 한 변 (px)", "100", 56);
    etCell.helpTip =
      "정사각 셀의 목표 픽셀. 컴프에 맞춰 열·행은 ceil(컴프/셀)로 자동 계산됩니다.";

    var stGrid = pal.add("statictext", undefined, " ", { multiline: true });
    stGrid.preferredSize = [260, 28];

    var etEmpty = addLabeledEdit(pal, "빈칸 비율 (0~1)", "0.33", 48);
    var etMove = addLabeledEdit(pal, "이동 길이(s)", "0.2", 48);
    var etStep = addLabeledEdit(pal, "스텝 간격(s)", "0.25", 48);
    var etMargin = addLabeledEdit(pal, "끝 여유(s)", "0.5", 48);

    var gPx = pal.add("group");
    gPx.orientation = "row";
    gPx.add("statictext", undefined, "이름 접두");
    var etPrefix = gPx.add("edittext", undefined, "SlideTile_");
    etPrefix.preferredSize = [160, 22];

    var chkRemove = pal.add("checkbox", undefined, "같은 접두 레이어 먼저 제거");
    chkRemove.value = true;

    var btnRun = pal.add("button", undefined, "타일 생성 · 셔플 적용");
    btnRun.preferredSize = [0, 32];

    pal.add("statictext", undefined, "File → Scripts 로 이 파일만 실행해도 됩니다.", {
      multiline: true
    }).preferredSize = [260, 24];

    var stHint = pal.add(
      "statictext",
      undefined,
      "레이어를 선택하면 흰 네모 대신 복제해 셀에 맞게 스케일 후, 끝나면 원본을 삭제합니다.",
      { multiline: true }
    );
    stHint.preferredSize = [260, 44];

    var stResult = pal.add("statictext", undefined, " ", { multiline: true });
    stResult.preferredSize = [260, 72];

    var ui = {
      stComp: stComp,
      etCell: etCell,
      stGrid: stGrid,
      etEmpty: etEmpty,
      etMove: etMove,
      etStep: etStep,
      etMargin: etMargin,
      etPrefix: etPrefix,
      chkRemove: chkRemove,
      stResult: stResult
    };

    btnSuggest.onClick = function () {
      onSuggest(ui);
    };
    btnRefresh.onClick = function () {
      refreshCompInfo(ui);
    };
    etCell.onChange = function () {
      refreshCompInfo(ui);
    };
    btnRun.onClick = function () {
      onRun(ui);
    };

    refreshCompInfo(ui);
    pal.layout.layout(true);
    return pal;
  }

  var win = buildUI(thisObj);
  if (win instanceof Window) {
    win.center();
    win.show();
  }
})(this);
