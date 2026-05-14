/**
 * Two selected text layers -> variable font morph + overshoot/hold + wireframe each.
 * Unique names per job: __{id}_THIN__ Outlines, CTRL_FontMorph_{id}
 * ES3 / ES5 only.
 */
function escExpr(nm) {
  if (!nm) return "";
  return String(nm).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function removeNamed(comp, nm) {
  var L = comp.layer(nm);
  if (L) L.remove();
}

var WEIGHT_ORDER = {
  Hairline: 50,
  Thin: 100,
  UltraLight: 200,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Normal: 400,
  Medium: 500,
  SemiBold: 600,
  DemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  UltraBold: 800,
  Black: 900,
  Heavy: 900,
  ExtraBlack: 950
};

function getWeightNum(styleName) {
  if (WEIGHT_ORDER[styleName] !== undefined) return WEIGHT_ORDER[styleName];
  var s = styleName.toLowerCase();
  for (var key in WEIGHT_ORDER) {
    if (s === key.toLowerCase()) return WEIGHT_ORDER[key];
  }
  if (s.indexOf("thin") !== -1) return 100;
  if (s.indexOf("light") !== -1) return 300;
  if (s.indexOf("regular") !== -1 || s.indexOf("normal") !== -1) return 400;
  if (s.indexOf("medium") !== -1) return 500;
  if (s.indexOf("semibold") !== -1 || s.indexOf("demibold") !== -1) return 600;
  if (s.indexOf("extrabold") !== -1 || s.indexOf("ultrabold") !== -1) return 800;
  if (s.indexOf("bold") !== -1) return 700;
  if (s.indexOf("black") !== -1 || s.indexOf("heavy") !== -1) return 900;
  return 400;
}

function fontScanForLayer(srcLayer) {
  var textDoc = srcLayer.property("ADBE Text Properties").property("ADBE Text Document").value;
  var fontFamily = textDoc.fontFamily;
  var allFonts = app.fonts.allFonts;
  var familyFonts = [];
  for (var i = 0; i < allFonts.length; i++) {
    var bucket = allFonts[i];
    for (var k in bucket) {
      var entry = bucket[k];
      if (entry.familyName === fontFamily) {
        familyFonts.push({
          postScript: entry.postScriptName,
          style: entry.styleName,
          weight: getWeightNum(entry.styleName)
        });
      }
    }
  }
  if (familyFonts.length < 2) {
    throw new Error(fontFamily + " weight < 2");
  }
  for (var a = 0; a < familyFonts.length - 1; a++) {
    for (var b = a + 1; b < familyFonts.length; b++) {
      if (familyFonts[b].weight < familyFonts[a].weight) {
        var tmp = familyFonts[a];
        familyFonts[a] = familyFonts[b];
        familyFonts[b] = tmp;
      }
    }
  }
  return {
    thin: familyFonts[0],
    bold: familyFonts[familyFonts.length - 1],
    fontFamily: fontFamily
  };
}

function setPathKeys(rContainer, tContainer, bContainer, pathLabel, keysAdded, skipped) {
  for (var i = 1; i <= rContainer.numProperties; i++) {
    var rProp = rContainer.property(i);
    if (rProp.matchName === "ADBE Vector Group") {
      var tGrp = tContainer.property(i);
      var bGrp = bContainer.property(i);
      if (tGrp && bGrp && tGrp.matchName === "ADBE Vector Group" && bGrp.matchName === "ADBE Vector Group") {
        setPathKeys(rProp.property("Contents"), tGrp.property("Contents"), bGrp.property("Contents"), pathLabel + rProp.name + "/", keysAdded, skipped);
      }
    } else if (rProp.matchName === "ADBE Vector Shape - Group") {
      var tPath = tContainer.property(i);
      var bPath = bContainer.property(i);
      if (!tPath || !bPath || tPath.matchName !== "ADBE Vector Shape - Group") continue;
      var tv = tPath.property("Path").value;
      var bv = bPath.property("Path").value;
      if (tv.vertices.length !== bv.vertices.length) {
        skipped.push(pathLabel + rProp.name + " (" + tv.vertices.length + "!=" + bv.vertices.length + ")");
        continue;
      }
      var rp = rProp.property("Path");
      rp.setValueAtTime(0, tv);
      rp.setValueAtTime(0.5, bv);
      keysAdded[0]++;
    }
  }
}

function scanPathRefs(contents) {
  var pathRefs = [];
  var charIdx = 0;
  for (var g = 1; g <= contents.numProperties; g++) {
    var grp = contents.property(g);
    if (grp.matchName !== "ADBE Vector Group") continue;
    var sub = grp.property("Contents");
    for (var s = 1; s <= sub.numProperties; s++) {
      var ch = sub.property(s);
      if (ch.matchName !== "ADBE Vector Shape - Group") continue;
      var pp = ch.property("Path");
      if (!pp) continue;
      var pv;
      try {
        pv = pp.valueAtTime(0, false);
      } catch (e1) {
        pv = pp.value;
      }
      pathRefs.push({
        groupIdx: g,
        pathIdx: s,
        vertCount: pv.vertices.length,
        groupName: grp.name,
        charIdx: charIdx
      });
    }
    charIdx++;
  }
  var k1 = 0;
  var k2 = 0.5;
  var firstPath = null;
  for (var g2 = 1; g2 <= contents.numProperties; g2++) {
    var grp2 = contents.property(g2);
    if (grp2.matchName !== "ADBE Vector Group") continue;
    var sub2 = grp2.property("Contents");
    for (var s2 = 1; s2 <= sub2.numProperties; s2++) {
      var ch2 = sub2.property(s2);
      if (ch2.matchName !== "ADBE Vector Shape - Group") continue;
      firstPath = ch2.property("Path");
      break;
    }
    if (firstPath) break;
  }
  if (firstPath && firstPath.numKeys >= 2) {
    k1 = firstPath.keyTime(1);
    k2 = firstPath.keyTime(2);
  }
  return { pathRefs: pathRefs, totalChars: charIdx, k1: k1, k2: k2, dur: k2 - k1 };
}

function clearWireframeContents(wfLayer) {
  var gC = wfLayer.property("Contents");
  while (gC.numProperties > 0) {
    gC.property(1).remove();
  }
}

// ---------- main ----------
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) throw new Error("no comp");

var sel = comp.selectedLayers;
if (sel.length !== 2) throw new Error("텍스트 레이어 정확히 2개 선택 필요 (현재 " + sel.length + "개)");

var src0 = sel[0];
var src1 = sel[1];
if (src0.matchName !== "ADBE Text Layer" || src1.matchName !== "ADBE Text Layer") {
  throw new Error("둘 다 텍스트 레이어여야 함");
}

var JOBS = [
  { src: src0, id: "L1" },
  { src: src1, id: "L2" }
];

var outLog = [];

for (var ji = 0; ji < JOBS.length; ji++) {
  var job = JOBS[ji];
  var srcLayer = job.src;
  var id = job.id;
  var THIN_NAME = "__" + id + "_THIN__";
  var BOLD_NAME = "__" + id + "_BOLD__";
  var THIN_OUT = THIN_NAME + " Outlines";
  var BOLD_OUT = BOLD_NAME + " Outlines";
  var CTRLNM = "CTRL_FontMorph_" + id;

  var fs = fontScanForLayer(srcLayer);
  var THIN_FONT = fs.thin.postScript;
  var BOLD_FONT = fs.bold.postScript;
  var THIN_STYLE = fs.thin.style;
  var BOLD_STYLE = fs.bold.style;

  var morphName = srcLayer.name + " [" + THIN_STYLE + " > " + BOLD_STYLE + "]";
  var wfName = morphName + " Wireframe";

  removeNamed(comp, CTRLNM);
  removeNamed(comp, THIN_OUT);
  removeNamed(comp, BOLD_OUT);
  removeNamed(comp, morphName);
  removeNamed(comp, wfName);
  removeNamed(comp, THIN_NAME);
  removeNamed(comp, BOLD_NAME);

  var thinText = srcLayer.duplicate();
  thinText.name = THIN_NAME;
  var td = thinText.property("ADBE Text Properties").property("ADBE Text Document").value;
  td.font = THIN_FONT;
  thinText.property("ADBE Text Properties").property("ADBE Text Document").setValue(td);

  var boldText = srcLayer.duplicate();
  boldText.name = BOLD_NAME;
  var bd = boldText.property("ADBE Text Properties").property("ADBE Text Document").value;
  bd.font = BOLD_FONT;
  boldText.property("ADBE Text Properties").property("ADBE Text Document").setValue(bd);

  for (var si = 1; si <= comp.numLayers; si++) comp.layer(si).selected = false;
  thinText.selected = true;
  app.executeCommand(app.findMenuCommandId("Create Shapes from Text"));

  var thinShape = comp.layer(THIN_OUT);
  if (!thinShape) throw new Error(id + ": thin outlines missing");

  for (var sj = 1; sj <= comp.numLayers; sj++) comp.layer(sj).selected = false;
  boldText.selected = true;
  app.executeCommand(app.findMenuCommandId("Create Shapes from Text"));

  var boldShape = comp.layer(BOLD_OUT);
  if (!boldShape) throw new Error(id + ": bold outlines missing");

  var resultLayer = thinShape.duplicate();
  resultLayer.name = morphName;

  var keysAddedArr = [0];
  var skipped = [];
  setPathKeys(resultLayer.property("Contents"), thinShape.property("Contents"), boldShape.property("Contents"), "", keysAddedArr, skipped);

  for (var ri = comp.numLayers; ri >= 1; ri--) {
    var n = comp.layer(ri).name;
    if (n === THIN_NAME || n === BOLD_NAME) comp.layer(ri).remove();
  }

  thinShape.enabled = false;
  boldShape.enabled = false;
  thinShape.shy = true;
  boldShape.shy = true;

  var rect = resultLayer.sourceRectAtTime(0, false);
  if (rect.width > 0 && rect.height > 0) {
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var oldA = resultLayer.transform.anchorPoint.value;
    var oldP = resultLayer.transform.position.value;
    resultLayer.transform.anchorPoint.setValue([cx, cy]);
    resultLayer.transform.position.setValue([oldP[0] + cx - oldA[0], oldP[1] + cy - oldA[1]]);
  }

  var ctrl = comp.layers.addNull();
  ctrl.name = CTRLNM;
  ctrl.transform.opacity.setValue(0);
  var ef = ctrl.property("Effects");
  var csSlider = ef.addProperty("ADBE Slider Control");
  csSlider.name = "Char Stagger";
  csSlider.property("Slider").setValue(50);
  var psSlider = ef.addProperty("ADBE Slider Control");
  psSlider.name = "Point Stagger";
  psSlider.property("Slider").setValue(20);
  var ovSlider = ef.addProperty("ADBE Slider Control");
  ovSlider.name = "Overshoot";
  ovSlider.property("Slider").setValue(1.70158);
  var hoSlider = ef.addProperty("ADBE Slider Control");
  hoSlider.name = "Hold";
  hoSlider.property("Slider").setValue(2);
  ctrl.moveBefore(resultLayer);

  var contents = resultLayer.property("Contents");
  var totalChars = 0;
  var charGroups = [];
  for (var g = 1; g <= contents.numProperties; g++) {
    var grp = contents.property(g);
    if (grp.matchName !== "ADBE Vector Group") continue;
    var sub = grp.property("Contents");
    var paths = [];
    for (var s = 1; s <= sub.numProperties; s++) {
      if (sub.property(s).matchName === "ADBE Vector Shape - Group") {
        paths.push({ idx: s });
      }
    }
    charGroups.push({ groupIdx: g, paths: paths });
    totalChars++;
  }

  var applied = 0;
  for (var ci = 0; ci < charGroups.length; ci++) {
    var cg = charGroups[ci];
    for (var pi = 0; pi < cg.paths.length; pi++) {
      var pathIdx = cg.paths[pi].idx;
      var pathProp = contents.property(cg.groupIdx).property("Contents").property(pathIdx).property("Path");
      var lines = [];
      lines.push('var tp=thisComp.layer("' + escExpr(THIN_OUT) + '").content(' + cg.groupIdx + ").content(" + pathIdx + ").path;");
      lines.push('var bp=thisComp.layer("' + escExpr(BOLD_OUT) + '").content(' + cg.groupIdx + ").content(" + pathIdx + ").path;");
      lines.push('var ctrl=thisComp.layer("' + escExpr(CTRLNM) + '");');
      lines.push("var cs=ctrl.effect(\"Char Stagger\")(1)/100;");
      lines.push("var ps=ctrl.effect(\"Point Stagger\")(1)/100;");
      lines.push("var ovr=ctrl.effect(\"Overshoot\")(1);");
      lines.push("var hold=ctrl.effect(\"Hold\")(1);");
      lines.push("var k1=thisProperty.key(1).time;");
      lines.push("var k2=thisProperty.key(2).time;");
      lines.push("var dur=k2-k1;");
      lines.push("var cN=" + ci + "/Math.max(" + (totalChars - 1) + ",1);");
      lines.push("var n=tp.points().length;");
      lines.push("var c1=ovr;var c3=c1+1;");
      lines.push("var pts=[],itn=[],otn=[];");
      lines.push("for(var k=0;k<n;k++){");
      lines.push("  var pN=k/Math.max(n-1,1);");
      lines.push("  var delay=cN*cs+pN*ps;");
      lines.push("  var localTime=time-k1-delay*dur;");
      lines.push("  var t;");
      lines.push("  if(localTime<=0){t=0;}");
      lines.push("  else if(localTime<=dur){");
      lines.push("    var p=localTime/dur;");
      lines.push("    if(p>=1.5)t=1;");
      lines.push("    else t=1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);");
      lines.push("  }");
      lines.push("  else if(localTime<=dur+hold){t=1;}");
      lines.push("  else if(localTime<=2*dur+hold){");
      lines.push("    var p=(localTime-dur-hold)/dur;");
      lines.push("    if(p>=1.5)t=0;");
      lines.push("    else{var rt=1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);t=1-rt;}");
      lines.push("  }");
      lines.push("  else{t=0;}");
      lines.push("  var a=tp.points()[k],b=bp.points()[k];");
      lines.push("  pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);");
      lines.push("  var ai=tp.inTangents()[k],bi=bp.inTangents()[k];");
      lines.push("  itn.push([ai[0]+(bi[0]-ai[0])*t,ai[1]+(bi[1]-ai[1])*t]);");
      lines.push("  var ao=tp.outTangents()[k],bo=bp.outTangents()[k];");
      lines.push("  otn.push([ao[0]+(bo[0]-ao[0])*t,ao[1]+(bo[1]-ao[1])*t]);");
      lines.push("}");
      lines.push("createPath(pts,itn,otn,tp.isClosed());");
      pathProp.expression = lines.join("\n");
      pathProp.expressionEnabled = true;
      applied++;
    }
  }

  var ctrlWfExists = comp.layer("CTRL_Wireframe");
  if (!ctrlWfExists) {
    var cw = comp.layers.addNull();
    cw.name = "CTRL_Wireframe";
    cw.transform.opacity.setValue(0);
    var efw = cw.property("Effects");
    var ancFill = efw.addProperty("ADBE Color Control");
    ancFill.name = "Anchor Fill";
    ancFill.property("Color").setValue([0.2, 0.8, 1, 1]);
    var hdlFill = efw.addProperty("ADBE Color Control");
    hdlFill.name = "Handle Fill";
    hdlFill.property("Color").setValue([1, 0.5, 0, 1]);
    var lineCol = efw.addProperty("ADBE Color Control");
    lineCol.name = "Line Color";
    lineCol.property("Color").setValue([1, 1, 1, 1]);
    var lineW = efw.addProperty("ADBE Slider Control");
    lineW.name = "Line Width";
    lineW.property("Slider").setValue(1.5);
    var ancSz = efw.addProperty("ADBE Slider Control");
    ancSz.name = "Anchor Size";
    ancSz.property("Slider").setValue(8);
    var hdlSz = efw.addProperty("ADBE Slider Control");
    hdlSz.name = "Handle Size";
    hdlSz.property("Slider").setValue(6);
  }

  var wf = comp.layers.addShape();
  wf.name = wfName;
  wf.transform.position.setValue(resultLayer.transform.position.value);
  wf.transform.anchorPoint.setValue(resultLayer.transform.anchorPoint.value);
  var mn = escExpr(morphName);
  wf.transform.position.expression = 'thisComp.layer("' + mn + '").transform.position;';
  wf.transform.anchorPoint.expression = 'thisComp.layer("' + mn + '").transform.anchorPoint;';
  wf.transform.scale.expression = 'thisComp.layer("' + mn + '").transform.scale;';
  wf.transform.rotation.expression = 'thisComp.layer("' + mn + '").transform.rotation;';
  wf.moveBefore(resultLayer);

  var scan = scanPathRefs(contents);
  var PATH_REFS = scan.pathRefs;
  var TOTAL_CHARS = scan.totalChars;
  var K1 = scan.k1;
  var DUR = scan.dur;
  var BK = 0.5523;

  function makeInterp(ref, vertK) {
    return (
      'var tp=thisComp.layer("' +
      escExpr(THIN_OUT) +
      '").content(' +
      ref.groupIdx +
      ").content(" +
      ref.pathIdx +
      ').path;\n' +
      'var bp=thisComp.layer("' +
      escExpr(BOLD_OUT) +
      '").content(' +
      ref.groupIdx +
      ").content(" +
      ref.pathIdx +
      ').path;\n' +
      'var ctrl=thisComp.layer("' +
      escExpr(CTRLNM) +
      '");\n' +
      'var cs=ctrl.effect("Char Stagger")(1)/100, ps=ctrl.effect("Point Stagger")(1)/100;\n' +
      'var ovr=ctrl.effect("Overshoot")(1), hold=ctrl.effect("Hold")(1);\n' +
      "var k1=" +
      K1 +
      ", dur=" +
      DUR +
      ";\n" +
      "var n=tp.points().length, cN=" +
      ref.charIdx +
      "/Math.max(" +
      (TOTAL_CHARS - 1) +
      ", 1);\n" +
      "var k=" +
      vertK +
      ", pN=k/Math.max(n-1,1);\n" +
      "var delay=cN*cs+pN*ps;\n" +
      "var lt=time-k1-delay*dur;\n" +
      "var c1=ovr, c3=c1+1, t;\n" +
      "if(lt<=0)t=0;\n" +
      "else if(lt<=dur){var p=lt/dur;if(p>=1.5)t=1;else t=1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);}\n" +
      "else if(lt<=dur+hold)t=1;\n" +
      "else if(lt<=2*dur+hold){var p=(lt-dur-hold)/dur;if(p>=1.5)t=0;else{var rt=1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);t=1-rt;}}\n" +
      "else t=0;\n" +
      "var av=tp.points()[k], bv=bp.points()[k];\n" +
      "var a=[av[0]+(bv[0]-av[0])*t, av[1]+(bv[1]-av[1])*t];\n" +
      "var ai=tp.inTangents()[k], bi=bp.inTangents()[k];\n" +
      "var tIn=[ai[0]+(bi[0]-ai[0])*t, ai[1]+(bi[1]-ai[1])*t];\n" +
      "var ao=tp.outTangents()[k], bo=bp.outTangents()[k];\n" +
      "var tOut=[ao[0]+(bo[0]-ao[0])*t, ao[1]+(bo[1]-ao[1])*t];"
    );
  }

  var gC = wf.property("Contents");
  clearWireframeContents(wf);

  var totalA = 0;
  var totalH = 0;
  var totalL = 0;

  var circleExpr = function (cv) {
    return (
      'var r=thisComp.layer("CTRL_Wireframe").effect("Handle Size")(1)/2, kk=' +
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
  };

  for (var r = 0; r < PATH_REFS.length; r++) {
    var ref = PATH_REFS[r];
    var label = ref.groupName + "_g" + ref.groupIdx + "_p" + ref.pathIdx;
    var aG = gC.addProperty("ADBE Vector Group");
    aG.name = "Anchors_" + label;
    var ac = aG.property("Contents");
    for (var v = 0; v < ref.vertCount; v++) {
      var ip = makeInterp(ref, v);
      var ap = ac.addProperty("ADBE Vector Shape - Group");
      ap.property("Path").expression =
        ip +
        '\nvar s=thisComp.layer("CTRL_Wireframe").effect("Anchor Size")(1)/2;\n' +
        "createPath([[a[0]-s,a[1]-s],[a[0]+s,a[1]-s],[a[0]+s,a[1]+s],[a[0]-s,a[1]+s]],[],[],true);";
      totalA++;
    }
    var aF = ac.addProperty("ADBE Vector Graphic - Fill");
    aF.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Anchor Fill")("Color");';
    var aS = ac.addProperty("ADBE Vector Graphic - Stroke");
    aS.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Color")("Color");';
    aS.property("Stroke Width").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Width")(1);';
  }

  for (var r2 = 0; r2 < PATH_REFS.length; r2++) {
    var ref2 = PATH_REFS[r2];
    var label2 = ref2.groupName + "_g" + ref2.groupIdx + "_p" + ref2.pathIdx;
    var hG = gC.addProperty("ADBE Vector Group");
    hG.name = "Handles_" + label2;
    var hc = hG.property("Contents");
    for (var v2 = 0; v2 < ref2.vertCount; v2++) {
      var ip2 = makeInterp(ref2, v2);
      var hI = hc.addProperty("ADBE Vector Shape - Group");
      hI.property("Path").expression = ip2 + "\n" + circleExpr("tIn");
      var hO = hc.addProperty("ADBE Vector Shape - Group");
      hO.property("Path").expression = ip2 + "\n" + circleExpr("tOut");
      totalH += 2;
    }
    var hF = hc.addProperty("ADBE Vector Graphic - Fill");
    hF.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Handle Fill")("Color");';
    var hS2 = hc.addProperty("ADBE Vector Graphic - Stroke");
    hS2.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Color")("Color");';
    hS2.property("Stroke Width").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Width")(1);';
  }

  for (var r3 = 0; r3 < PATH_REFS.length; r3++) {
    var ref3 = PATH_REFS[r3];
    var label3 = ref3.groupName + "_g" + ref3.groupIdx + "_p" + ref3.pathIdx;
    var lG = gC.addProperty("ADBE Vector Group");
    lG.name = "Lines_" + label3;
    var lc = lG.property("Contents");
    for (var v3 = 0; v3 < ref3.vertCount; v3++) {
      var ip3 = makeInterp(ref3, v3);
      var lin = lc.addProperty("ADBE Vector Shape - Group");
      lin.property("Path").expression =
        ip3 +
        "\n" +
        "if(Math.abs(tIn[0])<0.01 && Math.abs(tIn[1])<0.01) createPath([a,a],[],[],false);\n" +
        "else createPath([a,[a[0]+tIn[0],a[1]+tIn[1]]],[],[],false);";
      var lou = lc.addProperty("ADBE Vector Shape - Group");
      lou.property("Path").expression =
        ip3 +
        "\n" +
        "if(Math.abs(tOut[0])<0.01 && Math.abs(tOut[1])<0.01) createPath([a,a],[],[],false);\n" +
        "else createPath([a,[a[0]+tOut[0],a[1]+tOut[1]]],[],[],false);";
      totalL += 2;
    }
    var lS = lc.addProperty("ADBE Vector Graphic - Stroke");
    lS.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Color")("Color");';
    lS.property("Stroke Width").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Width")(1);';
  }

  var errMorph = 0;
  function countMorphErr(container) {
    for (var gi = 1; gi <= container.numProperties; gi++) {
      var grr = container.property(gi);
      if (grr.matchName === "ADBE Vector Group") countMorphErr(grr.property("Contents"));
      else if (grr.matchName === "ADBE Vector Shape - Group") {
        var ee = grr.property("Path").expressionError;
        if (ee && ee.length > 0) errMorph++;
      }
    }
  }
  countMorphErr(contents);

  var wfErr = 0;
  var wC = wf.property("Contents");
  for (var wi = 1; wi <= wC.numProperties; wi++) {
    var wgrp = wC.property(wi);
    if (wgrp.matchName !== "ADBE Vector Group") continue;
    var wsub = wgrp.property("Contents");
    for (var wj = 1; wj <= wsub.numProperties; wj++) {
      var wch = wsub.property(wj);
      if (wch.matchName !== "ADBE Vector Shape - Group") continue;
      var we = wch.property("Path").expressionError;
      if (we && we.length > 0) wfErr++;
    }
  }

  outLog.push(
    id +
      ": morph=" +
      morphName +
      " keys=" +
      keysAddedArr[0] +
      " pathExpr=" +
      applied +
      " morphErr=" +
      errMorph +
      " wf=" +
      totalA +
      "a/" +
      totalH +
      "h/" +
      totalL +
      "l wfErr=" +
      wfErr +
      (skipped.length ? " skip:" + skipped.join(",") : "")
  );
}

$.global.__vfTwoWf = outLog.join(" | ");
