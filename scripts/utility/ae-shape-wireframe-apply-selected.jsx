/**
 * 선택 Shape(복수 가능)에 WIREFRAME_STYLE 마커 적용 (모프 없음).
 * 소스 duplicate + 동일 그룹 Contents 안에 마커, 패스는 thisComp.layer(원본)에서 읽음.
 * 와이어프레임 레이어 transform: position / anchorPoint / scale / rotation (회전·스케일 동기).
 * ES3/ES5 only.
 */
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
  $.global.__wfSelTest = "no comp";
  throw new Error("no comp");
}

var sel = comp.selectedLayers;
if (!sel || sel.length < 1) {
  $.global.__wfSelTest = "no selection";
  throw new Error("셰이프 레이어를 하나 이상 선택하세요");
}

var CTRL_NAME = "CTRL_Wireframe";
var BK = 0.5523;
var WF_BLACK = [0, 0, 0, 1];

function escExpr(nm) {
  return String(nm).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function dotContent(arr) {
  var s = "";
  for (var z = 0; z < arr.length; z++) {
    s += ".content(" + arr[z] + ")";
  }
  return s;
}

function pathParentContents(rootContents, chain) {
  var cur = rootContents;
  for (var level = 0; level < chain.length - 1; level++) {
    var grp = cur.property(chain[level]);
    if (level === chain.length - 2) {
      return grp.property("Contents");
    }
    cur = grp.property("Contents");
  }
  return null;
}

function collectPaths(container, chain, out, inheritedGroupName) {
  for (var idx = 1; idx <= container.numProperties; idx++) {
    var p = container.property(idx);
    if (p.matchName === "ADBE Vector Group") {
      collectPaths(p.property("Contents"), chain.concat([idx]), out, p.name);
    } else if (p.matchName === "ADBE Vector Shape - Group") {
      var pv = p.property("Path").value;
      var gname = inheritedGroupName;
      if (!gname || gname.length === 0) gname = "root";
      out.push({
        chain: chain.concat([idx]),
        vertCount: pv.vertices.length,
        groupName: gname
      });
    }
  }
}

function applyWireframeCtrlDefaults(ctrl) {
  if (!ctrl) return;
  var ef = ctrl.property("Effects");
  try {
    ef.property("Anchor Fill").property("Color").setValue(WF_BLACK);
  } catch (e0) {}
  try {
    ef.property("Handle Fill").property("Color").setValue(WF_BLACK);
  } catch (e1) {}
  try {
    ef.property("Line Color").property("Color").setValue(WF_BLACK);
  } catch (e2) {}
  try {
    ef.property("Anchor Size").property("Slider").setValue(4);
  } catch (e3) {}
  try {
    ef.property("Handle Size").property("Slider").setValue(4);
  } catch (e4) {}
}

function ensureCtrl() {
  var c = comp.layer(CTRL_NAME);
  if (!c) {
    c = comp.layers.addNull();
    c.name = CTRL_NAME;
    c.transform.opacity.setValue(0);
    var ef = c.property("Effects");
    var ancFill = ef.addProperty("ADBE Color Control");
    ancFill.name = "Anchor Fill";
    ancFill.property("Color").setValue(WF_BLACK);
    var hdlFill = ef.addProperty("ADBE Color Control");
    hdlFill.name = "Handle Fill";
    hdlFill.property("Color").setValue(WF_BLACK);
    var lineCol = ef.addProperty("ADBE Color Control");
    lineCol.name = "Line Color";
    lineCol.property("Color").setValue(WF_BLACK);
    var lineW = ef.addProperty("ADBE Slider Control");
    lineW.name = "Line Width";
    lineW.property("Slider").setValue(1.5);
    var ancSz = ef.addProperty("ADBE Slider Control");
    ancSz.name = "Anchor Size";
    ancSz.property("Slider").setValue(4);
    var hdlSz = ef.addProperty("ADBE Slider Control");
    hdlSz.name = "Handle Size";
    hdlSz.property("Slider").setValue(4);
  }
  applyWireframeCtrlDefaults(c);
  return c;
}

function dimVectorArt(contents) {
  for (var ii = 1; ii <= contents.numProperties; ii++) {
    var p = contents.property(ii);
    if (p.matchName === "ADBE Vector Graphic - Fill") {
      try {
        p.property("Opacity").setValue(0);
      } catch (e0) {}
    }
    if (p.matchName === "ADBE Vector Graphic - Stroke") {
      try {
        p.property("Stroke Width").setValue(0);
      } catch (e1) {}
    }
    if (p.matchName === "ADBE Vector Group") {
      dimVectorArt(p.property("Contents"));
    }
  }
}

function makeBase(srcName, dChain, vk) {
  return (
    'var pth=thisComp.layer("' +
    escExpr(srcName) +
    '")' +
    dChain +
    ".path;\n" +
    "var k=" +
    vk +
    ";\n" +
    "var a=pth.points()[k];\n" +
    "var tIn=pth.inTangents()[k];\n" +
    "var tOut=pth.outTangents()[k];"
  );
}

function circleExpr(mCtrl, cv) {
  return (
    'var r=thisComp.layer("' +
    mCtrl +
    '").effect("Handle Size")(1)/2, kk=' +
    BK +
    "*r;\n" +
    "if(Math.abs(" +
    cv +
    "[0])<0.01 && Math.abs(" +
    cv +
    "[1])<0.01) createPath([a,a,a,a],[],[],true);\n" +
    "else { var cx=a[0]+" +
    cv +
    "[0], cy=a[1]+" +
    cv +
    "[1];\n" +
    "createPath([[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]],[[-kk,0],[0,-kk],[kk,0],[0,kk]],[[kk,0],[0,kk],[-kk,0],[0,-kk]],true); }"
  );
}

function countErrInContents(container) {
  var err = 0;
  for (var ci = 1; ci <= container.numProperties; ci++) {
    var p = container.property(ci);
    if (p.matchName === "ADBE Vector Group") {
      err += countErrInContents(p.property("Contents"));
    } else if (p.matchName === "ADBE Vector Shape - Group") {
      var ee = p.property("Path").expressionError;
      if (ee && ee.length > 0) err++;
    }
  }
  return err;
}

/**
 * 한 셰이프 소스에 와이어프레임 적용. ctrl / mCtrl 사전 ensure.
 */
function applyWireframeToSource(src, ctrl) {
  var srcName = src.name;
  var wfName = srcName + " Wireframe";
  var mCtrl = escExpr(CTRL_NAME);

  var pathRefs = [];
  collectPaths(src.property("Contents"), [], pathRefs, "");
  if (pathRefs.length === 0) {
    return "skip " + srcName + " (no paths)";
  }

  var ri;
  for (ri = comp.numLayers; ri >= 1; ri--) {
    if (comp.layer(ri).name === wfName) {
      comp.layer(ri).remove();
    }
  }

  var wf = src.duplicate();
  wf.name = wfName;
  dimVectorArt(wf.property("Contents"));

  var msrc = escExpr(srcName);
  wf.transform.position.expression = 'thisComp.layer("' + msrc + '").transform.position;';
  wf.transform.anchorPoint.expression = 'thisComp.layer("' + msrc + '").transform.anchorPoint;';
  wf.transform.scale.expression = 'thisComp.layer("' + msrc + '").transform.scale;';
  wf.transform.rotation.expression = 'thisComp.layer("' + msrc + '").transform.rotation;';

  wf.moveBefore(src);
  ctrl.moveBefore(wf);

  var pi;
  var totalA = 0;
  var totalH = 0;
  var totalL = 0;

  for (pi = 0; pi < pathRefs.length; pi++) {
    var ref = pathRefs[pi];
    var dCh = dotContent(ref.chain);
    var label = ref.groupName + "_c" + ref.chain.join("_");

    var parentC = pathParentContents(wf.property("Contents"), ref.chain);
    if (!parentC) {
      throw new Error("path parent Contents not found for " + srcName + " chain " + ref.chain.join(","));
    }

    var aG = parentC.addProperty("ADBE Vector Group");
    aG.name = "Anchors_" + label;
    var ac = aG.property("Contents");
    var v;
    for (v = 0; v < ref.vertCount; v++) {
      var base = makeBase(srcName, dCh, v);
      var ap = ac.addProperty("ADBE Vector Shape - Group");
      ap.property("Path").expression =
        base +
        '\nvar s=thisComp.layer("' +
        mCtrl +
        '").effect("Anchor Size")(1)/2;\n' +
        "createPath([[a[0]-s,a[1]-s],[a[0]+s,a[1]-s],[a[0]+s,a[1]+s],[a[0]-s,a[1]+s]],[],[],true);";
      totalA++;
    }
    var aF = ac.addProperty("ADBE Vector Graphic - Fill");
    aF.property("Color").expression = 'thisComp.layer("' + mCtrl + '").effect("Anchor Fill")("Color");';
    var aS = ac.addProperty("ADBE Vector Graphic - Stroke");
    aS.property("Color").expression = 'thisComp.layer("' + mCtrl + '").effect("Line Color")("Color");';
    aS.property("Stroke Width").expression = 'thisComp.layer("' + mCtrl + '").effect("Line Width")(1);';
  }

  for (pi = 0; pi < pathRefs.length; pi++) {
    var ref2 = pathRefs[pi];
    var dCh2 = dotContent(ref2.chain);
    var label2 = ref2.groupName + "_c" + ref2.chain.join("_");

    var parentC2 = pathParentContents(wf.property("Contents"), ref2.chain);
    var hG = parentC2.addProperty("ADBE Vector Group");
    hG.name = "Handles_" + label2;
    var hc = hG.property("Contents");
    for (var v2 = 0; v2 < ref2.vertCount; v2++) {
      var base2 = makeBase(srcName, dCh2, v2);
      var hI = hc.addProperty("ADBE Vector Shape - Group");
      hI.property("Path").expression = base2 + "\n" + circleExpr(mCtrl, "tIn");
      var hO = hc.addProperty("ADBE Vector Shape - Group");
      hO.property("Path").expression = base2 + "\n" + circleExpr(mCtrl, "tOut");
      totalH += 2;
    }
    var hF = hc.addProperty("ADBE Vector Graphic - Fill");
    hF.property("Color").expression = 'thisComp.layer("' + mCtrl + '").effect("Handle Fill")("Color");';
    var hS2 = hc.addProperty("ADBE Vector Graphic - Stroke");
    hS2.property("Color").expression = 'thisComp.layer("' + mCtrl + '").effect("Line Color")("Color");';
    hS2.property("Stroke Width").expression = 'thisComp.layer("' + mCtrl + '").effect("Line Width")(1);';
  }

  for (pi = 0; pi < pathRefs.length; pi++) {
    var ref3 = pathRefs[pi];
    var dCh3 = dotContent(ref3.chain);
    var label3 = ref3.groupName + "_c" + ref3.chain.join("_");

    var parentC3 = pathParentContents(wf.property("Contents"), ref3.chain);
    var lG = parentC3.addProperty("ADBE Vector Group");
    lG.name = "Lines_" + label3;
    var lc = lG.property("Contents");
    for (var v3 = 0; v3 < ref3.vertCount; v3++) {
      var base3 = makeBase(srcName, dCh3, v3);
      var lin = lc.addProperty("ADBE Vector Shape - Group");
      lin.property("Path").expression =
        base3 +
        "\n" +
        "if(Math.abs(tIn[0])<0.01 && Math.abs(tIn[1])<0.01) createPath([a,a],[],[],false);\n" +
        "else createPath([a,[a[0]+tIn[0],a[1]+tIn[1]]],[],[],false);";
      var lou = lc.addProperty("ADBE Vector Shape - Group");
      lou.property("Path").expression =
        base3 +
        "\n" +
        "if(Math.abs(tOut[0])<0.01 && Math.abs(tOut[1])<0.01) createPath([a,a],[],[],false);\n" +
        "else createPath([a,[a[0]+tOut[0],a[1]+tOut[1]]],[],[],false);";
      totalL += 2;
    }
    var lS = lc.addProperty("ADBE Vector Graphic - Stroke");
    lS.property("Color").expression = 'thisComp.layer("' + mCtrl + '").effect("Line Color")("Color");';
    lS.property("Stroke Width").expression = 'thisComp.layer("' + mCtrl + '").effect("Line Width")(1);';
  }

  var wfErr = countErrInContents(wf.property("Contents"));

  return (
    "ok " +
    srcName +
    " paths=" +
    pathRefs.length +
    " a=" +
    totalA +
    " h=" +
    totalH +
    " l=" +
    totalL +
    " err=" +
    wfErr +
    " wf=" +
    wfName
  );
}

var targets = [];
for (var si = 0; si < sel.length; si++) {
  if (sel[si].matchName === "ADBE Vector Layer") {
    targets.push(sel[si]);
  }
}

if (targets.length === 0) {
  $.global.__wfSelTest = "no shape in selection";
  throw new Error("선택에 ADBE Vector Layer(셰이프)가 없음");
}

var ctrl = ensureCtrl();
var results = [];
for (var ti = 0; ti < targets.length; ti++) {
  results.push(applyWireframeToSource(targets[ti], ctrl));
}

$.global.__wfSelTest = "n=" + targets.length + " | " + results.join(" | ");
