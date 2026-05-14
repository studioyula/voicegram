/**
 * Build infographic tree network in active comp (run via coloso-ae-mcp execute).
 * ES3/ES5 only.
 */
function jitter(seed, mag) {
  var x = Math.sin(seed * 127.1) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * mag;
}

function polar(px, py, r, angDeg) {
  var rad = angDeg * Math.PI / 180;
  return [px + r * Math.cos(rad), py + r * Math.sin(rad)];
}

function angDegFrom(pFrom, pTo) {
  var dx = pTo[0] - pFrom[0];
  var dy = pTo[1] - pFrom[1];
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

function addSlider(nullLayer, name, defVal) {
  var e = nullLayer.property("Effects").addProperty("ADBE Slider Control");
  e.name = name;
  e.property(1).setValue(defVal);
}

function set2DPos(layer, xy) {
  layer.property("ADBE Transform Group").property("ADBE Position").setValue(xy);
}

function addDarkBg(comp) {
  var lyr = comp.layers.addSolid([0.06, 0.07, 0.1], "BG_Dark", comp.width, comp.height, comp.pixelAspect, comp.duration);
  set2DPos(lyr, [comp.width / 2, comp.height / 2]);
  return lyr;
}

function addGrid(comp) {
  var lyr = comp.layers.addShape();
  lyr.name = "grid_bg";
  set2DPos(lyr, [0, 0]);
  lyr.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);

  var root = lyr.property("Contents");
  var copiesH = Math.ceil(comp.height / 30) + 1;
  var copiesV = Math.ceil(comp.width / 30) + 1;

  var gH = root.addProperty("ADBE Vector Group");
  gH.name = "GridH";
  var gHContents = gH.property("Contents");
  var pathGH = gHContents.addProperty("ADBE Vector Shape - Group");
  var shH = new Shape();
  shH.vertices = [[0, 0], [comp.width, 0]];
  shH.inTangents = [[0, 0], [0, 0]];
  shH.outTangents = [[0, 0], [0, 0]];
  shH.closed = false;
  pathGH.property("Path").setValue(shH);
  var stH = gHContents.addProperty("ADBE Vector Graphic - Stroke");
  stH.property("Color").setValue([1, 1, 1, 1]);
  stH.property("Stroke Width").setValue(1);
  stH.property("Opacity").setValue(20);
  var repH = gHContents.addProperty("ADBE Vector Filter - Repeater");
  repH.property("Copies").setValue(copiesH);
  repH.property("Transform").property("Position").setValue([0, 30]);

  var gV = root.addProperty("ADBE Vector Group");
  gV.name = "GridV";
  var gVContents = gV.property("Contents");
  var pathGV = gVContents.addProperty("ADBE Vector Shape - Group");
  var shV = new Shape();
  shV.vertices = [[0, 0], [0, comp.height]];
  shV.inTangents = [[0, 0], [0, 0]];
  shV.outTangents = [[0, 0], [0, 0]];
  shV.closed = false;
  pathGV.property("Path").setValue(shV);
  var stV = gVContents.addProperty("ADBE Vector Graphic - Stroke");
  stV.property("Color").setValue([1, 1, 1, 1]);
  stV.property("Stroke Width").setValue(1);
  stV.property("Opacity").setValue(20);
  var repV = gVContents.addProperty("ADBE Vector Filter - Repeater");
  repV.property("Copies").setValue(copiesV);
  repV.property("Transform").property("Position").setValue([30, 0]);

  return lyr;
}

function addCtrlNull(comp) {
  var lyr = comp.layers.addNull();
  lyr.name = "CTRL_Infographic";
  lyr.threeDLayer = false;
  set2DPos(lyr, [comp.width / 2, comp.height / 2]);
  addSlider(lyr, "Amplitude", 100);
  addSlider(lyr, "Frequency", 1);
  return lyr;
}

function addNodeShape(comp, name, pos, isHighlight) {
  var lyr = comp.layers.addShape();
  lyr.name = name;
  lyr.threeDLayer = false;
  var root = lyr.property("Contents");
  var g = root.addProperty("ADBE Vector Group");
  g.name = "node";
  var contents = g.property("Contents");
  if (isHighlight) {
    var el = contents.addProperty("ADBE Vector Shape - Ellipse");
    el.property("Size").setValue([14, 14]);
    el.property("Position").setValue([0, 0]);
    var fill = contents.addProperty("ADBE Vector Graphic - Fill");
    fill.property("Color").setValue([1, 0.45, 0.05, 1]);
    fill.property("Opacity").setValue(100);
  } else {
    var rect = contents.addProperty("ADBE Vector Shape - Rect");
    rect.property("Size").setValue([6, 6]);
    rect.property("Position").setValue([0, 0]);
    rect.property("Roundness").setValue(0);
    var fill2 = contents.addProperty("ADBE Vector Graphic - Fill");
    fill2.property("Color").setValue([1, 1, 1, 1]);
    fill2.property("Opacity").setValue(100);
  }
  set2DPos(lyr, pos);
  return lyr;
}

function nodePositionExpr() {
  return (
    'ctrl=thisComp.layer("CTRL_Infographic");\n' +
    "freq=ctrl.effect(\"Frequency\")(1)*0.25*2*Math.PI;\n" +
    "ampCtrl=ctrl.effect(\"Amplitude\")(1)/100;\n" +
    "seed=index*1000;\n" +
    "t=time*freq+seed*0.000001;\n" +
    "amps=[52,44,78,63,48,57,71,55,80,46];\n" +
    "n=parseInt(thisLayer.name.split(\"_\")[1],10);\n" +
    "base=amps[n];\n" +
    "a=base*ampCtrl;\n" +
    "value+[Math.sin(t+seed*0.0012)*a,Math.cos(t*0.83+seed*0.0021)*a];"
  );
}

function addEdgeLayer(comp, nm) {
  var lyr = comp.layers.addShape();
  lyr.name = nm;
  lyr.threeDLayer = false;
  set2DPos(lyr, [0, 0]);
  lyr.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
  var root = lyr.property("Contents");
  var g = root.addProperty("ADBE Vector Group");
  g.name = "edge";
  var contents = g.property("Contents");
  var pathG = contents.addProperty("ADBE Vector Shape - Group");
  var sh = new Shape();
  sh.vertices = [[0, 0], [100, 0]];
  sh.inTangents = [[0, 0], [0, 0]];
  sh.outTangents = [[0, 0], [0, 0]];
  sh.closed = false;
  pathG.property("Path").setValue(sh);
  var stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
  stroke.property("Color").setValue([1, 1, 1, 1]);
  stroke.property("Stroke Width").setValue(1);
  stroke.property("Opacity").setValue(100);
  return lyr;
}

function getPathProp(edgeLayer) {
  return edgeLayer
    .property("Contents")
    .property("edge")
    .property("Contents")
    .property(1)
    .property("Path");
}

function edgeExpr(a, b) {
  return (
    "L0=thisComp.layer(\"" +
    a +
    '");\n' +
    "L1=thisComp.layer(\"" +
    b +
    '");\n' +
    "p0=fromComp(L0.toComp(L0.anchorPoint));\n" +
    "p1=fromComp(L1.toComp(L1.anchorPoint));\n" +
    "createPath([p0,p1],[],[],false);"
  );
}

function setTextDoc(lyr, str, fillRgb, fontSize) {
  var doc = new TextDocument(str);
  doc.applyFill = true;
  doc.fillColor = fillRgb;
  if (fontSize && fontSize > 0) {
    doc.fontSize = fontSize;
  }
  lyr.property("Source Text").setValue(doc);
}

function main() {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("No active comp");
  }

  var i;
  for (i = comp.numLayers; i >= 1; i--) {
    comp.layer(i).remove();
  }

  addDarkBg(comp);
  addGrid(comp);
  addCtrlNull(comp);

  var cx = comp.width / 2;
  var cy = comp.height / 2;
  var a1 = 78 + jitter(1, 14);
  var a2 = 202 + jitter(2, 14);
  var a3 = 326 + jitter(3, 14);

  var p0 = [cx, cy];
  var p1 = polar(cx, cy, 250 + jitter(4, 18), a1);
  var p2 = polar(cx, cy, 250 + jitter(5, 18), a2);
  var p3 = polar(cx, cy, 250 + jitter(6, 18), a3);

  var out1 = angDegFrom(p0, p1);
  var out2 = angDegFrom(p0, p2);
  var out3 = angDegFrom(p0, p3);

  var p4 = polar(p1[0], p1[1], 200 + jitter(7, 14), out1 - 36 + jitter(8, 10));
  var p5 = polar(p1[0], p1[1], 200 + jitter(9, 14), out1 + 40 + jitter(10, 10));
  var p6 = polar(p2[0], p2[1], 200 + jitter(11, 14), out2 - 34 + jitter(12, 10));
  var p7 = polar(p2[0], p2[1], 200 + jitter(13, 14), out2 + 38 + jitter(14, 10));
  var p8 = polar(p3[0], p3[1], 200 + jitter(15, 14), out3 - 40 + jitter(16, 10));
  var p9 = polar(p3[0], p3[1], 200 + jitter(17, 14), out3 + 36 + jitter(18, 10));

  var posList = [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9];
  var highlight = { "node_0": true, "node_5": true, "node_8": true };

  for (i = 0; i < 10; i++) {
    var nm = "node_" + i;
    addNodeShape(comp, nm, posList[i], highlight[nm] === true);
  }

  var edgeNames = [
    ["edge_0_1", "node_0", "node_1"],
    ["edge_0_2", "node_0", "node_2"],
    ["edge_0_3", "node_0", "node_3"],
    ["edge_1_4", "node_1", "node_4"],
    ["edge_1_5", "node_1", "node_5"],
    ["edge_2_6", "node_2", "node_6"],
    ["edge_2_7", "node_2", "node_7"],
    ["edge_3_8", "node_3", "node_8"],
    ["edge_3_9", "node_3", "node_9"]
  ];

  var edgeLayers = [];
  for (i = 0; i < edgeNames.length; i++) {
    edgeLayers.push(addEdgeLayer(comp, edgeNames[i][0]));
  }

  for (i = 0; i < edgeNames.length; i++) {
    getPathProp(edgeLayers[i]).expression = edgeExpr(edgeNames[i][1], edgeNames[i][2]);
  }

  var node0 = comp.layer("node_0");
  for (i = 0; i < edgeNames.length; i++) {
    comp.layer(edgeNames[i][0]).moveBefore(node0);
  }

  var white = [0.92, 0.94, 0.96];
  for (i = 0; i < 10; i++) {
    var nmi = "node_" + i;
    var lbl = comp.layers.addText("");
    lbl.name = "label_coord_" + i;
    lbl.threeDLayer = false;
    setTextDoc(lbl, "[0, 0]", white, 13);
    set2DPos(lbl, [posList[i][0] + 12, posList[i][1] - 8]);
    lbl.property("Source Text").expression =
      "p=thisComp.layer(\"" + nmi + '").position;\n' + '"["+Math.round(p[0])+", "+Math.round(p[1])+"]\"';
  }

  function cityLbl(nm, city, offY) {
    var L = comp.layer(nm);
    var lyrC = comp.layers.addText("");
    lyrC.name = "label_city_" + nm;
    lyrC.threeDLayer = false;
    setTextDoc(lyrC, city, [1, 1, 1], 20);
    set2DPos(lyrC, [L.property("ADBE Transform Group").property("ADBE Position").value[0], L.property("ADBE Transform Group").property("ADBE Position").value[1] - 22]);
    lyrC.property("ADBE Transform Group").property("ADBE Position").expression =
      "p=thisComp.layer(\"" + nm + '").position;\n' + "p+[0," + String(offY) + "];";
  }

  cityLbl("node_0", "TOKYO", -28);
  cityLbl("node_5", "SEOUL", -28);
  cityLbl("node_8", "BERLIN", -28);

  function hud(nm, label, x, y, phase) {
    var h = comp.layers.addText("");
    h.name = nm;
    h.threeDLayer = false;
    setTextDoc(h, label + " 0000", [0.75, 0.82, 0.9], 17);
    set2DPos(h, [x, y]);
    h.property("Source Text").expression =
      '"' +
      label +
      ' " + Math.round(1000 + Math.sin(time * 0.7 + ' +
      String(phase) +
      ") * 200)";
  }

  hud("HUD_TOKENS", "TOKENS", 48, 42, 0.1);
  hud("HUD_LATENCY", "LATENCY", comp.width - 260, 42, 0.35);
  hud("HUD_NODES", "NODES", 48, comp.height - 36, 0.62);
  hud("HUD_SYNC", "SYNC", comp.width - 220, comp.height - 36, 0.88);

  for (i = 1; i <= comp.numLayers; i++) {
    var L = comp.layer(i);
    if (L.name.indexOf("node_") === 0) {
      L.property("ADBE Transform Group").property("ADBE Position").expression = nodePositionExpr();
    }
  }

  return "OK layers=" + comp.numLayers;
}

main();
