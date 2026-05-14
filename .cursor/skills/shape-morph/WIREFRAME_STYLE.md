# STEP 5 (옵션) — 와이어프레임 스타일 (Wireframe Style)

> **shape-morph 전용 매핑**: 본문의 `__SRC_THIN__ Outlines` / `__SRC_BOLD__ Outlines` 는 실제 **소스 A/B 셰이프 레이어 이름**으로 바꾼다 (모드 A면 Thin/Bold 아웃라인, 모드 B면 예: `shape A` / `shape B`). `CTRL_FontMorph` 는 **`CTRL_ShapeMorph`** 로 치환한다. 보간 로직·마커 구조는 동일하다.

베리어블 폰트 모프 결과 레이어의 모든 패스 포인트를 와이어프레임으로 시각화. 각 vertex에 사각형(앵커), 각 베지어 핸들에 원, 앵커-핸들 연결선까지 그려서 글리프 구조를 보여준다. **모든 마커는 모프 진행에 따라 실시간 추적**.

## 언제 추가하나

사용자가 다음 키워드를 말할 때만:
- "와이어프레임", "wireframe"
- "패스 시각화", "베지어 시각화"
- "앵커 포인트 보여줘", "핸들 표시"
- "글리프 구조"

평소엔 STEP 1~4(베이스 모프 + 오버슈트/Hold)에서 종료. 와이어프레임은 추가 옵션.

## 사전 조건

- STEP 2가 완료되어 모프 결과 레이어 + `__SRC_THIN__ Outlines` + `__SRC_BOLD__ Outlines` 가 존재
- STEP 3 또는 STEP 4가 완료되어 모프 레이어의 path expression이 적용됨
- CTRL_FontMorph가 존재

## 만들어지는 결과물

1. **`CTRL_Wireframe`** 널 — 색상 3 + 크기 2 + 굵기 1 슬라이더 6개
2. **`<원본명> Wireframe`** 셰이프 레이어 — 원본 transform 자동 추적
3. **마커 그룹 N×3개** (path 수 × 3종: Anchors / Handles / Lines)
4. **수백 개 path Expression** — 모프 진행에 따라 모든 vertex/핸들 실시간 추적

---

## 핵심 기술 제약 (반드시 읽고 시작)

### 제약 1 — Expression에서 path 포인트 접근법

```
✅ 가능: <정적 또는 키프레임 path>.points() / .inTangents() / .outTangents()
❌ 불가: <createPath() 결과>.points()
❌ 불가: <thisProperty.key(n).value>.points()
❌ 불가: <thisProperty.valueAtTime(t)>.points()
```

베리어블 모프 결과 레이어의 path는 createPath()로 만들어진 것이라 `.points()` 호출 불가. **반드시 `__SRC_THIN__/BOLD__ Outlines`의 정적 path를 읽고** 모프 expression과 같은 보간 로직을 와이어프레임 expression에도 복제.

### 제약 2 — 같은 이름 path가 그룹 안에 여러 개 (O, P, a, !)

```javascript
// ❌ 첫 번째 path만 잡힘
thisComp.layer("src").content("O").content("O").path

// ✅ 인덱스로 정확히
thisComp.layer("src").content(2).content(2).path
```

**반드시 인덱스 기반 access**.

### 제약 3 — z-order는 그룹 추가 순서로 결정

```
AE Shape 그룹: 인덱스 1 = 가장 위에 렌더링
              인덱스 N = 가장 아래
```

원하는 순서: **앵커(위) > 핸들 > 선(아래)** → 그룹을 **Anchors → Handles → Lines** 순으로 추가.

`moveTo()` 메서드로 사후 재배치는 **금지**. 중간에 null 에러. 처음부터 올바른 순서로.

### 제약 4 — tangent [0,0] 가드

직선 vertex는 tangent가 [0,0]. 핸들/연결선을 그리면 0크기 path가 되어 NaN 가능:
```javascript
if(Math.abs(t[0]) < 0.01 && Math.abs(t[1]) < 0.01) {
    createPath([a,a,a,a],[],[],true);  // 0크기 = 안 보임
} else {
    // 정상 마커
}
```

---

## STEP 5-1 — CTRL_Wireframe 컨트롤러 생성

### 슬라이더 구성

| 컨트롤 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `Anchor Fill` | Color | 시안 `[0.2, 0.8, 1]` | 앵커 사각형 칠 색 |
| `Handle Fill` | Color | 오렌지 `[1, 0.5, 0]` | 핸들 원 칠 색 |
| `Line Color` | Color | 화이트 `[1, 1, 1]` | 연결선 + 모든 마커 stroke 공통 |
| `Line Width` | Slider | `1.5` | 모든 stroke 굵기 |
| `Anchor Size` | Slider | `8` | 앵커 사각형 한 변 (px) |
| `Handle Size` | Slider | `6` | 핸들 원 지름 (px) |

### 실행 스크립트

```javascript
var comp = app.project.activeItem;

for (var i = comp.numLayers; i >= 1; i--) {
    if (comp.layer(i).name === "CTRL_Wireframe") comp.layer(i).remove();
}

var ctrl = comp.layers.addNull();
ctrl.name = "CTRL_Wireframe";
ctrl.transform.opacity.setValue(0);

var ef = ctrl.property("Effects");

var ancFill = ef.addProperty("ADBE Color Control");
ancFill.name = "Anchor Fill";
ancFill.property("Color").setValue([0.2, 0.8, 1, 1]);

var hdlFill = ef.addProperty("ADBE Color Control");
hdlFill.name = "Handle Fill";
hdlFill.property("Color").setValue([1, 0.5, 0, 1]);

var lineCol = ef.addProperty("ADBE Color Control");
lineCol.name = "Line Color";
lineCol.property("Color").setValue([1, 1, 1, 1]);

var lineW = ef.addProperty("ADBE Slider Control");
lineW.name = "Line Width";
lineW.property("Slider").setValue(1.5);

var ancSz = ef.addProperty("ADBE Slider Control");
ancSz.name = "Anchor Size";
ancSz.property("Slider").setValue(8);

var hdlSz = ef.addProperty("ADBE Slider Control");
hdlSz.name = "Handle Size";
hdlSz.property("Slider").setValue(6);

return "CTRL_Wireframe 생성 완료";
```

---

## STEP 5-2 — Wireframe 셰이프 레이어 + transform 추적

### 실행 스크립트

```javascript
// ★ 모프 결과 레이어 이름 ★
var MORPH_LAYER_NAME = "MOVE Path! [Thin > Black]";

var comp = app.project.activeItem;
var srcLayer = comp.layer(MORPH_LAYER_NAME);
if (!srcLayer) throw new Error("모프 레이어 없음: " + MORPH_LAYER_NAME);

for (var i = comp.numLayers; i >= 1; i--) {
    if (comp.layer(i).name === MORPH_LAYER_NAME + " Wireframe") comp.layer(i).remove();
}

var wf = comp.layers.addShape();
wf.name = MORPH_LAYER_NAME + " Wireframe";

// 좌표계 일치 + Expression 추적
wf.transform.position.setValue(srcLayer.transform.position.value);
wf.transform.anchorPoint.setValue(srcLayer.transform.anchorPoint.value);

wf.transform.position.expression =
    'thisComp.layer("' + MORPH_LAYER_NAME + '").transform.position;';
wf.transform.anchorPoint.expression =
    'thisComp.layer("' + MORPH_LAYER_NAME + '").transform.anchorPoint;';

wf.moveBefore(srcLayer);

return wf.name + " 생성";
```

---

## STEP 5-3 — 모프 path 구조 + 키프레임 시간 스캔

모프 레이어의 path 구조를 인덱스 기반으로 수집하고, 키프레임 0/1 시간을 확인.

### 실행 스크립트

```javascript
var MORPH_LAYER_NAME = "MOVE Path! [Thin > Black]";

var comp = app.project.activeItem;
var src = comp.layer(MORPH_LAYER_NAME);
var contents = src.property("Contents");
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
        try { pv = pp.valueAtTime(0, false); } catch(e) { pv = pp.value; }
        pathRefs.push({
            groupIdx: g, pathIdx: s,
            vertCount: pv.vertices.length,
            groupName: grp.name,
            charIdx: charIdx
        });
    }
    charIdx++;
}

// 키프레임 시간 (첫 path 기준)
var firstPath = contents.property(1).property("Contents").property(1).property("Path");
var k1 = firstPath.keyTime(1);
var k2 = firstPath.keyTime(2);

return JSON.stringify({
    pathRefs: pathRefs,
    totalChars: charIdx,
    totalPaths: pathRefs.length,
    k1: k1, k2: k2, dur: k2 - k1
});
```

---

## STEP 5-4 — 모든 마커 그룹 + Expression 적용

### 구조

```
1차 패스: Anchors_<라벨>  ×  (path 수)   → 인덱스 1~N     (가장 위)
2차 패스: Handles_<라벨>  ×  (path 수)   → 인덱스 N+1~2N (중간)
3차 패스: Lines_<라벨>    ×  (path 수)   → 인덱스 2N+1~3N (가장 아래)
```

### 좌표 보간 expression (베리어블 모프와 동일 로직)

각 path는 아래 expression을 prepend한 뒤 마커 모양 추가:

```javascript
var tp = thisComp.layer("__SRC_THIN__ Outlines").content(<gIdx>).content(<pIdx>).path;
var bp = thisComp.layer("__SRC_BOLD__ Outlines").content(<gIdx>).content(<pIdx>).path;
var ctrl = thisComp.layer("CTRL_FontMorph");
var cs = ctrl.effect("Char Stagger")(1) / 100;
var ps = ctrl.effect("Point Stagger")(1) / 100;
var ovr = ctrl.effect("Overshoot")(1);
var hold = ctrl.effect("Hold")(1);
var k1 = <STEP 5-3에서 받은 k1>;
var dur = <STEP 5-3에서 받은 dur>;
var n = tp.points().length;
var cN = <charIdx> / Math.max(<totalChars-1>, 1);
var k = <vertK>;
var pN = k / Math.max(n-1, 1);
var delay = cN * cs + pN * ps;
var lt = time - k1 - delay * dur;
var c1 = ovr, c3 = c1 + 1, t;
if(lt <= 0) t = 0;
else if(lt <= dur) {
    var p = lt / dur;
    if(p >= 1.5) t = 1;
    else t = 1 + c3*Math.pow(p-1,3) + c1*Math.pow(p-1,2);
}
else if(lt <= dur + hold) t = 1;
else if(lt <= 2*dur + hold) {
    var p = (lt - dur - hold) / dur;
    if(p >= 1.5) t = 0;
    else { var rt = 1 + c3*Math.pow(p-1,3) + c1*Math.pow(p-1,2); t = 1 - rt; }
}
else t = 0;
var av = tp.points()[k], bv = bp.points()[k];
var a = [av[0]+(bv[0]-av[0])*t, av[1]+(bv[1]-av[1])*t];
var ai = tp.inTangents()[k], bi = bp.inTangents()[k];
var tIn = [ai[0]+(bi[0]-ai[0])*t, ai[1]+(bi[1]-ai[1])*t];
var ao = tp.outTangents()[k], bo = bp.outTangents()[k];
var tOut = [ao[0]+(bo[0]-ao[0])*t, ao[1]+(bo[1]-ao[1])*t];
```

### 마커 모양 expression (위 보간 뒤에 붙임)

**앵커 (사각형)**:
```javascript
var s = thisComp.layer("CTRL_Wireframe").effect("Anchor Size")(1) / 2;
createPath(
    [[a[0]-s,a[1]-s],[a[0]+s,a[1]-s],[a[0]+s,a[1]+s],[a[0]-s,a[1]+s]],
    [], [], true
);
```

**핸들 (원, in/out 각각)** — `<TANGENT>` 자리에 `tIn` 또는 `tOut`:
```javascript
var r = thisComp.layer("CTRL_Wireframe").effect("Handle Size")(1) / 2;
var kk = 0.5523 * r;
if(Math.abs(<TANGENT>[0])<0.01 && Math.abs(<TANGENT>[1])<0.01) {
    createPath([a,a,a,a],[],[],true);
} else {
    var cx = a[0]+<TANGENT>[0], cy = a[1]+<TANGENT>[1];
    createPath(
        [[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]],
        [[-kk,0],[0,-kk],[kk,0],[0,kk]],
        [[kk,0],[0,kk],[-kk,0],[0,-kk]],
        true
    );
}
```

**연결선 (직선, in/out 각각)**:
```javascript
if(Math.abs(<TANGENT>[0])<0.01 && Math.abs(<TANGENT>[1])<0.01) {
    createPath([a,a],[],[],false);
} else {
    createPath([a,[a[0]+<TANGENT>[0], a[1]+<TANGENT>[1]]],[],[],false);
}
```

### 실행 스크립트 (전체)

```javascript
// ★ STEP 5-2, 5-3 결과로 치환 ★
var MORPH_LAYER_NAME = "MOVE Path! [Thin > Black]";
var PATH_REFS = [/* STEP 5-3 결과 inline */];
var TOTAL_CHARS = 9;
var K1 = 0;
var DUR = 0.5;
var BK = 0.5523;

function makeInterp(ref, vertK) {
    return 'var tp = thisComp.layer("__SRC_THIN__ Outlines").content(' + ref.groupIdx + ').content(' + ref.pathIdx + ').path;\n' +
        'var bp = thisComp.layer("__SRC_BOLD__ Outlines").content(' + ref.groupIdx + ').content(' + ref.pathIdx + ').path;\n' +
        'var ctrl = thisComp.layer("CTRL_FontMorph");\n' +
        'var cs = ctrl.effect("Char Stagger")(1) / 100, ps = ctrl.effect("Point Stagger")(1) / 100;\n' +
        'var ovr = ctrl.effect("Overshoot")(1), hold = ctrl.effect("Hold")(1);\n' +
        'var k1 = ' + K1 + ', dur = ' + DUR + ';\n' +
        'var n = tp.points().length, cN = ' + ref.charIdx + ' / Math.max(' + (TOTAL_CHARS-1) + ', 1);\n' +
        'var k = ' + vertK + ', pN = k / Math.max(n-1, 1);\n' +
        'var delay = cN * cs + pN * ps;\n' +
        'var lt = time - k1 - delay * dur;\n' +
        'var c1 = ovr, c3 = c1 + 1, t;\n' +
        'if(lt <= 0) t = 0;\n' +
        'else if(lt <= dur) { var p = lt/dur; if(p>=1.5) t=1; else t = 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2); }\n' +
        'else if(lt <= dur + hold) t = 1;\n' +
        'else if(lt <= 2*dur + hold) { var p = (lt-dur-hold)/dur; if(p>=1.5) t=0; else { var rt = 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2); t = 1-rt; } }\n' +
        'else t = 0;\n' +
        'var av = tp.points()[k], bv = bp.points()[k];\n' +
        'var a = [av[0]+(bv[0]-av[0])*t, av[1]+(bv[1]-av[1])*t];\n' +
        'var ai = tp.inTangents()[k], bi = bp.inTangents()[k];\n' +
        'var tIn = [ai[0]+(bi[0]-ai[0])*t, ai[1]+(bi[1]-ai[1])*t];\n' +
        'var ao = tp.outTangents()[k], bo = bp.outTangents()[k];\n' +
        'var tOut = [ao[0]+(bo[0]-ao[0])*t, ao[1]+(bo[1]-ao[1])*t];';
}

var comp = app.project.activeItem;
var wf = comp.layer(MORPH_LAYER_NAME + " Wireframe");
if (!wf) throw new Error("Wireframe 레이어 없음 (STEP 5-2 먼저)");

var gC = wf.property("Contents");
while (gC.numProperties > 0) gC.property(1).remove();

var totalA = 0, totalH = 0, totalL = 0;

// 1차 패스 — Anchors
for (var r = 0; r < PATH_REFS.length; r++) {
    var ref = PATH_REFS[r];
    var label = ref.groupName + "_g" + ref.groupIdx + "_p" + ref.pathIdx;
    var aG = gC.addProperty("ADBE Vector Group");
    aG.name = "Anchors_" + label;
    var ac = aG.property("Contents");
    for (var v = 0; v < ref.vertCount; v++) {
        var ip = makeInterp(ref, v);
        var ap = ac.addProperty("ADBE Vector Shape - Group");
        ap.property("Path").expression = ip + '\n' +
            'var s = thisComp.layer("CTRL_Wireframe").effect("Anchor Size")(1) / 2;\n' +
            'createPath([[a[0]-s,a[1]-s],[a[0]+s,a[1]-s],[a[0]+s,a[1]+s],[a[0]-s,a[1]+s]],[],[],true);';
        totalA++;
    }
    var aF = ac.addProperty("ADBE Vector Graphic - Fill");
    aF.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Anchor Fill")("Color");';
    var aS = ac.addProperty("ADBE Vector Graphic - Stroke");
    aS.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Color")("Color");';
    aS.property("Stroke Width").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Width")(1);';
}

// 2차 패스 — Handles
for (var r = 0; r < PATH_REFS.length; r++) {
    var ref = PATH_REFS[r];
    var label = ref.groupName + "_g" + ref.groupIdx + "_p" + ref.pathIdx;
    var hG = gC.addProperty("ADBE Vector Group");
    hG.name = "Handles_" + label;
    var hc = hG.property("Contents");

    var circleExpr = function(cv) {
        return 'var r = thisComp.layer("CTRL_Wireframe").effect("Handle Size")(1) / 2, kk = ' + BK + ' * r;\n' +
            'if(Math.abs(' + cv + '[0])<0.01 && Math.abs(' + cv + '[1])<0.01) createPath([a,a,a,a],[],[],true);\n' +
            'else { var cx = a[0]+' + cv + '[0], cy = a[1]+' + cv + '[1];\n' +
            'createPath([[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]],[[-kk,0],[0,-kk],[kk,0],[0,kk]],[[kk,0],[0,kk],[-kk,0],[0,-kk]],true); }';
    };

    for (var v = 0; v < ref.vertCount; v++) {
        var ip = makeInterp(ref, v);
        var hI = hc.addProperty("ADBE Vector Shape - Group");
        hI.property("Path").expression = ip + '\n' + circleExpr('tIn');
        var hO = hc.addProperty("ADBE Vector Shape - Group");
        hO.property("Path").expression = ip + '\n' + circleExpr('tOut');
        totalH += 2;
    }
    var hF = hc.addProperty("ADBE Vector Graphic - Fill");
    hF.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Handle Fill")("Color");';
    var hS = hc.addProperty("ADBE Vector Graphic - Stroke");
    hS.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Color")("Color");';
    hS.property("Stroke Width").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Width")(1);';
}

// 3차 패스 — Lines
for (var r = 0; r < PATH_REFS.length; r++) {
    var ref = PATH_REFS[r];
    var label = ref.groupName + "_g" + ref.groupIdx + "_p" + ref.pathIdx;
    var lG = gC.addProperty("ADBE Vector Group");
    lG.name = "Lines_" + label;
    var lc = lG.property("Contents");
    for (var v = 0; v < ref.vertCount; v++) {
        var ip = makeInterp(ref, v);
        var lin = lc.addProperty("ADBE Vector Shape - Group");
        lin.property("Path").expression = ip + '\n' +
            'if(Math.abs(tIn[0])<0.01 && Math.abs(tIn[1])<0.01) createPath([a,a],[],[],false);\n' +
            'else createPath([a,[a[0]+tIn[0],a[1]+tIn[1]]],[],[],false);';
        var lou = lc.addProperty("ADBE Vector Shape - Group");
        lou.property("Path").expression = ip + '\n' +
            'if(Math.abs(tOut[0])<0.01 && Math.abs(tOut[1])<0.01) createPath([a,a],[],[],false);\n' +
            'else createPath([a,[a[0]+tOut[0],a[1]+tOut[1]]],[],[],false);';
        totalL += 2;
    }
    var lS = lc.addProperty("ADBE Vector Graphic - Stroke");
    lS.property("Color").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Color")("Color");';
    lS.property("Stroke Width").expression = 'thisComp.layer("CTRL_Wireframe").effect("Line Width")(1);';
}

return totalA + " anchors / " + totalH + " handles / " + totalL + " lines";
```

---

## 검증 STEP (필수 — 누락 검출 포함)

**Expression 에러 + 그룹 누락 둘 다 체크**. 단순 path 수 카운트는 누락을 못 잡음 — 반드시 각 PATH_REF에 대해 Anchors/Handles/Lines 3개 그룹이 모두 존재하는지 확인.

```javascript
var MORPH_LAYER_NAME = "<원본>";
var PATH_REFS = [/* STEP 5-3 결과 inline */];

var comp = app.project.activeItem;
var wf = comp.layer(MORPH_LAYER_NAME + " Wireframe");
var gC = wf.property("Contents");

// 1) 그룹 누락 체크
var existing = {};
for (var i = 1; i <= gC.numProperties; i++) existing[gC.property(i).name] = true;

var missing = [];
for (var r = 0; r < PATH_REFS.length; r++) {
    var label = PATH_REFS[r].groupName + "_g" + PATH_REFS[r].groupIdx + "_p" + PATH_REFS[r].pathIdx;
    if (!existing["Anchors_" + label]) missing.push("Anchors_" + label);
    if (!existing["Handles_" + label]) missing.push("Handles_" + label);
    if (!existing["Lines_" + label]) missing.push("Lines_" + label);
}

// 2) Expression 에러 체크
var totalErr = 0, totalPaths = 0;
var samples = [];
for (var i = 1; i <= gC.numProperties; i++) {
    var grp = gC.property(i);
    if (grp.matchName !== "ADBE Vector Group") continue;
    var sub = grp.property("Contents");
    for (var s = 1; s <= sub.numProperties; s++) {
        var ch = sub.property(s);
        if (ch.matchName !== "ADBE Vector Shape - Group") continue;
        var pp = ch.property("Path");
        if (!pp) continue;
        totalPaths++;
        var e = pp.expressionError;
        if (e && e.length > 0) {
            totalErr++;
            if (samples.length < 3) samples.push(grp.name + ": " + e.replace(/[\r\n\t]/g, " ").substring(0, 80));
        }
    }
}

// 3) 결과
var expectedGroups = PATH_REFS.length * 3;
var actualGroups = gC.numProperties;
var msg = totalPaths + " paths, " + totalErr + " errors / " + actualGroups + "/" + expectedGroups + " groups";
if (missing.length > 0) msg += " | 누락 " + missing.length + "개: " + missing.join(", ");
if (samples.length > 0) msg += " | err sample: " + samples.join(" || ");
return msg;
```

**기대 결과**: `<N> paths, 0 errors / <3×N>/<3×N> groups` (누락 0)

**누락이 있으면**:
1. 누락된 그룹의 path 정보를 PATH_REFS에서 찾아 (groupName, charIdx 등)
2. **보강 STEP 5-4b** 실행 — 정리 코드 없이 누락된 path만 추가
3. 검증 재실행

**누락 보강 스크립트 예시**:
```javascript
var MORPH_LAYER_NAME = "<원본>";
var BK = 0.5523, K1 = <키프레임1 시간>, DUR = <duration>, TOTAL_CHARS = <글자 수>;

// 누락 path만 포함
var MISSING_REFS = [
    // 예: t와 h 글자 path들
    {groupIdx:7, pathIdx:1, vertCount:16, groupName:"t", charIdx:6, missingTypes:["Anchors","Handles"]},
    {groupIdx:8, pathIdx:1, vertCount:13, groupName:"h", charIdx:7, missingTypes:["Anchors","Handles","Lines"]}
];

function makeInterp(ref, vertK) { /* 동일 */ }

var comp = app.project.activeItem;
var wf = comp.layer(MORPH_LAYER_NAME + " Wireframe");
var gC = wf.property("Contents");
// 정리 코드 없음 — 기존 그룹 보존하고 누락만 추가

for (var r = 0; r < MISSING_REFS.length; r++) {
    var ref = MISSING_REFS[r];
    var label = ref.groupName + "_g" + ref.groupIdx + "_p" + ref.pathIdx;
    var types = ref.missingTypes;
    
    for (var t = 0; t < types.length; t++) {
        // type별로 (Anchors/Handles/Lines) 한 그룹씩 추가
        // 정확한 z-order는 망가질 수 있지만 보강 후 moveTo 시도 가능 (위험)
        // 또는 처음부터 전체 재생성이 더 안전 (path 수가 적으면)
    }
}
```

**가장 안전한 보강법**: 누락이 발견되면 **전체 STEP 5-4를 분할 호출로 처음부터 재실행** (그룹 비우고 글자별 분할). moveTo 기반 사후 재정렬은 null 에러 위험 있어 비추천.

---

## 실행 흐름 정리

```
[베이스 모프 STEP 1~4 완료된 상태에서 시작]

1. STEP 5-1 ae_execute → CTRL_Wireframe 생성
2. STEP 5-2 ae_execute (MORPH_LAYER_NAME 치환) → Wireframe 셰이프 레이어
3. STEP 5-3 ae_execute (MORPH_LAYER_NAME) → PATH_REFS, K1, DUR JSON
4. STEP 5-4 ae_execute (MORPH_LAYER_NAME, PATH_REFS, TOTAL_CHARS, K1, DUR 치환) → 모든 마커 + Expression 한 번에
   ⚠️ **반드시 `timeout: 600000` (10분) 명시** — vertex 100개 이상이면 30~60초 걸림. 분할 절대 금지 (왕복 오버헤드만 커짐)
5. **검증 STEP (필수)** → "0 errors" + **누락 그룹 0개** 확인
```

### ⚠️ 한 번의 ae_execute로 통째로 처리하기

분할 호출(글자별 9회 등)은 **느립니다**. 한 번에 모든 path를 추가하는 게 빠릅니다. 분할은 잘못된 최적화:
- 호출 1회당 cursor → MCP → AE 응답 왕복 2~3초 오버헤드
- 9회 분할하면 왕복 오버헤드만 20~30초
- 한 번에 처리하면 AE 내부 처리 30~60초 (왕복 단 1회)

**올바른 방법**: `ae_execute` 1회, `timeout: 600000`. AE가 한 번에 모든 그룹 추가 — 빠르고 누락 없음.

**타임아웃 났는데도 AE는 작업 중**일 수 있음 — 그래서 STEP 5-4 호출 후 **반드시 검증 STEP** 실행. 누락 발견되면 같은 ae_execute를 다시 한번 호출 (기존 그룹은 정리 코드로 비워지고 다시 통째 생성).

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| Expression 에러 `points is not a function` | 모프 path 자체에서 .points() 호출 | __SRC_THIN/BOLD__ 정적 path에서 읽도록 expression 수정 |
| Expression 에러 `null is not an object` | CTRL_Wireframe 없음 | STEP 5-1 먼저 |
| 마커가 안 보임 | CTRL_Wireframe 색 누락 또는 Size 0 | setValue 확인 |
| 선이 마커 위에 있음 | 그룹 추가 순서가 Lines 먼저 | STEP 5-4를 처음부터 Anchors→Handles→Lines 순으로 재실행 |
| 좌표 어긋남 | Wireframe transform 추적 expression 안 걸림 | STEP 5-2의 position/anchor expression 확인 |
| 카운터 path가 outer 좌표로 덮어짐 | content(name) 사용 | content(idx) 인덱스 기반 |
| 타임아웃 30초 | vertex 100개 이상 한번에 처리 | timeout 600000 (10분)으로, 또는 글자별 분할 |
| **그룹 누락 (일부 글자만 와이어프레임 적용)** | **응답 시간 한계로 중간 끊김. 에러 없이 종료되어 못 잡음** | **검증 STEP에서 expected groups 수와 actual 비교 필수**. 누락 발견 시 분할 호출로 전체 재실행 |
| 한 글자만 와이어프레임 안 보임 | 해당 글자의 Lines/Handles/Anchors 그룹 누락 | 검증 STEP의 "누락 N개" 출력 확인 후 전체 재실행 (글자별 분할) |

---

## 변형 요청 대응

| 요청 | 처리 |
|---|---|
| "와이어프레임 / 패스 시각화" | STEP 5-1 ~ 5-4 + 검증 |
| "앵커만 보여줘" | STEP 5-4에서 Handles/Lines 패스 스킵 |
| "선 굵게/얇게" | CTRL_Wireframe의 Line Width 조정 |
| "마커 크게/작게" | Anchor Size / Handle Size |
| "색 바꿔" | Anchor Fill / Handle Fill / Line Color |
| "와이어프레임 제거" | `<원본> Wireframe` + CTRL_Wireframe 삭제 |
| "선이 마커 위에 떠있어" | STEP 5-4 재실행 (그룹 비우고 정확한 순서로) |
