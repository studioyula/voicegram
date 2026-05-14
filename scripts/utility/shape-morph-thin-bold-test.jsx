/**
 * Test: Mode A join — __SRC_THIN__ Outlines + __SRC_BOLD__ Outlines → morph result + CTRL_ShapeMorph + overshoot/hold expr.
 * ES3/ES5 only for AE.
 */
var RESULT_NAME = "Morph [Thin > Bold]";
var CTRL_NAME = "CTRL_ShapeMorph";

var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
  $.global.__shapeMorphTest = "no comp";
  throw new Error("no comp");
}

var thin = comp.layer("__SRC_THIN__ Outlines");
var bold = comp.layer("__SRC_BOLD__ Outlines");
if (!thin || !bold) {
  $.global.__shapeMorphTest = "missing thin/bold outlines";
  throw new Error("missing thin/bold outlines");
}

var i, li;
for (i = comp.numLayers; i >= 1; i--) {
  var nm = comp.layer(i).name;
  if (nm === RESULT_NAME || nm === RESULT_NAME + " Wireframe" || nm === CTRL_NAME) {
    comp.layer(i).remove();
  }
}

function dotContent(arr) {
  var s = "";
  for (var z = 0; z < arr.length; z++) {
    s += ".content(" + arr[z] + ")";
  }
  return s;
}

function countShapePaths(container) {
  var n = 0;
  for (var ii = 1; ii <= container.numProperties; ii++) {
    var p = container.property(ii);
    if (p.matchName === "ADBE Vector Shape - Group") {
      n++;
    } else if (p.matchName === "ADBE Vector Group") {
      n += countShapePaths(p.property("Contents"));
    }
  }
  return n;
}

var resL = thin.duplicate();
resL.name = RESULT_NAME;

var ctrl = comp.layers.addNull();
ctrl.name = CTRL_NAME;
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
ctrl.moveBefore(resL);

var totalPaths = countShapePaths(resL.property("Contents"));
var pathCounter = 0;
var keysAdded = 0;

function buildExpr(fullChain, cNstr) {
  var d = dotContent(fullChain);
  var tpExpr = 'thisComp.layer("__SRC_THIN__ Outlines")' + d + ".path";
  var bpExpr = 'thisComp.layer("__SRC_BOLD__ Outlines")' + d + ".path";
  var e = "";
  e += "var tp=" + tpExpr + ";";
  e += "var bp=" + bpExpr + ";";
  e += "var ctrl=thisComp.layer(\"" + CTRL_NAME + "\");";
  e += "var cs=ctrl.effect(\"Char Stagger\")(1)/100;";
  e += "var ps=ctrl.effect(\"Point Stagger\")(1)/100;";
  e += "var ovr=ctrl.effect(\"Overshoot\")(1);";
  e += "var hold=ctrl.effect(\"Hold\")(1);";
  e += "var k1=thisProperty.key(1).time;var k2=thisProperty.key(2).time;var dur=k2-k1;";
  e += "var cN=" + cNstr + ";";
  e += "var n=tp.points().length;var c1=ovr;var c3=c1+1;var pts=[],itn=[],otn=[];";
  e += "for(var k=0;k<n;k++){";
  e += "var pN=k/Math.max(n-1,1);var delay=cN*cs+pN*ps;var lt=time-k1-delay*dur;var t;";
  e += "if(lt<=0)t=0;else if(lt<=dur){var q=lt/dur;if(q>=1.5)t=1;else t=1+c3*Math.pow(q-1,3)+c1*Math.pow(q-1,2);}";
  e += "else if(lt<=dur+hold)t=1;else if(lt<=2*dur+hold){var q2=(lt-dur-hold)/dur;if(q2>=1.5)t=0;else{var rt=1+c3*Math.pow(q2-1,3)+c1*Math.pow(q2-1,2);t=1-rt;}}";
  e += "else t=0;";
  e += "var a=tp.points()[k],b=bp.points()[k];pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);";
  e += "var ai=tp.inTangents()[k],bi=bp.inTangents()[k];itn.push([ai[0]+(bi[0]-ai[0])*t,ai[1]+(bi[1]-ai[1])*t]);";
  e += "var ao=tp.outTangents()[k],bo=bp.outTangents()[k];otn.push([ao[0]+(bo[0]-ao[0])*t,ao[1]+(bo[1]-ao[1])*t]);}";
  e += "createPath(pts,itn,otn,tp.isClosed());";
  return e;
}

function applyMorph(rC, tC, bC, chain) {
  for (var idx = 1; idx <= rC.numProperties; idx++) {
    var rP = rC.property(idx);
    var tP = tC.property(idx);
    var bP = bC.property(idx);
    if (!tP || !bP) {
      continue;
    }
    if (rP.matchName === "ADBE Vector Group" && tP.matchName === "ADBE Vector Group") {
      applyMorph(rP.property("Contents"), tP.property("Contents"), bP.property("Contents"), chain.concat([idx]));
    } else if (rP.matchName === "ADBE Vector Shape - Group") {
      var tv = tP.property("Path").value;
      var bv = bP.property("Path").value;
      if (tv.vertices.length !== bv.vertices.length) {
        continue;
      }
      rP.property("Path").setValueAtTime(0, tv);
      rP.property("Path").setValueAtTime(0.5, bv);
      keysAdded++;
      var fullChain = chain.concat([idx]);
      var pi = pathCounter;
      pathCounter++;
      var denom = totalPaths > 1 ? (totalPaths - 1) : 1;
      var cNstr = pi + "/" + denom;
      rP.property("Path").expression = buildExpr(fullChain, cNstr);
      rP.property("Path").expressionEnabled = true;
    }
  }
}

applyMorph(resL.property("Contents"), thin.property("Contents"), bold.property("Contents"), []);

var rect = resL.sourceRectAtTime(0, false);
if (rect.width > 0 && rect.height > 0) {
  var cx = rect.left + rect.width / 2;
  var cy = rect.top + rect.height / 2;
  var oldA = resL.transform.anchorPoint.value;
  var oldP = resL.transform.position.value;
  resL.transform.anchorPoint.setValue([cx, cy]);
  resL.transform.position.setValue([oldP[0] + cx - oldA[0], oldP[1] + cy - oldA[1]]);
}

var errN = 0;
var ct = resL.property("Contents");
function countExprErr(container) {
  for (var gi = 1; gi <= container.numProperties; gi++) {
    var grp = container.property(gi);
    if (grp.matchName === "ADBE Vector Group") {
      countExprErr(grp.property("Contents"));
    } else if (grp.matchName === "ADBE Vector Shape - Group") {
      var ee = grp.property("Path").expressionError;
      if (ee && ee.length > 0) {
        errN++;
      }
    }
  }
}
countExprErr(ct);

$.global.__shapeMorphTest =
  "ok keys=" + keysAdded + " paths=" + totalPaths + " exprPathErr=" + errN + " layer=" + RESULT_NAME;
