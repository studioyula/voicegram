---
name: shape-morph
description: (모드 A) 텍스트는 ae-variable-font-morph와 동일하게 Thin/Bold 아웃라인으로 만든 뒤, (모드 B) 또는 컴프에 있는 두 Shape 레이어를 곧바로 사용해 A→B 패스 모프·스태거·오버슈트/Hold·와이어프레임까지 적용. "shape morph", "shape A에서 B", "패스 모프", "shape-morph" 요청 시 발동.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit
---

# AE Shape Morph (A -> B)

## 이 스킬이 하는 일

**«패스 매칭·키프레임·Expression·컨트롤러·와이어프레임»** 까지 한 덩어리로 다룬다. 다만 **소스 두 셰이프를 만드는 방법**만 두 갈래다.

### 모드 A — 원본 스킬과 같은 전반부 (텍스트 → 가장 얇은/굵은 쪽으로 아웃라인)

1. `ae-variable-font-morph`의 **STEP 1 (폰트 웨이트 스캔)** + **STEP 2 (Create Shapes from Text로 Thin/Bold 아웃라인 생성)** 를 그대로 따른다.
2. 얻어지는 **`__SRC_THIN__ Outlines` / `__SRC_BOLD__ Outlines`** 가 곧 «모드 B의 shape A / shape B»와 같은 역할이다.
3. 그 다음부터는 아래 **«공통 파이프라인»**만 적용한다 (레이어 이름/Expression 안의 `thisComp.layer("…")` 는 실제 아웃라인 이름에 맞춘다).

### 모드 B — 이미 두 개의 Shape 레이어만 있을 때 (지금 선택한 두 모양)

1. **폰트 스캔·텍스트→셰이프 변환은 하지 않는다.**
2. 사용자가 지정한 두 Shape 레이어(선택 순서 또는 `shape A` / `shape B` 이름)를 **DFS로 패스 수집 → 순서대로 쌍 매칭 → `vertices.length` 일치 검증**한다.
3. 검증을 통과한 쌍만 **«공통 파이프라인»**으로 모프한다.

### 공통 파이프라인 (패스 매칭 단계부터·모드 A/B 동일)

1. 쌍별 인덱스 체인으로 `path` 접근 문자열 확보 (이름 접근 금지, `.content(i)` 체인만)
2. A 셰이프를 복제한 **결과 레이어**에 각 패스마다 `0s = A`, `0.5s = B` 키프레임
3. `CTRL_ShapeMorph` (`Char Stagger`, `Point Stagger`, `Overshoot`, `Hold`) + path Expression (원본 스킬 STEP 3~4와 같은 왕복·오버슈트 로직, 소스 레이어만 A/B)
4. (옵션) `WIREFRAME_STYLE.md` 절차로 와이어프레임 — 소스 path는 항상 **정적 A/B 레이어**에서 읽음

결과물: 키프레임 2개(0s, 0.5s) 셰이프 1개 + 소스 셰이프 2개 + CTRL 1개 (+ 옵션 와이어프레임)

---

## 절대 어기면 안 되는 규칙 (FAQ 형식)

### Q1. Expression에서 결과 레이어 자체의 키프레임 값을 어떻게 읽나요?

**A**: 읽을 수 없습니다. `thisProperty.key(n).value` 나 `thisProperty.valueAtTime(t)` 로 받은 Path 객체에서 `.points()`, `.inTangents()`, `.outTangents()` 메서드는 작동하지 않습니다.

**해결**: A/B의 좌표 데이터를 **별도 셰이프 레이어 2개**(선택한 `shape A`, `shape B`)로 두고, Expression에서는 그 레이어의 정적 `path`만 읽습니다. 결과 레이어는 키프레임 시간(`k1`, `k2`)만 참조용으로 사용합니다.

### Q2. 셰이프 그룹 안의 패스에 접근할 때 이름으로 접근해도 되나요?

**A**: 안 됩니다. 글자 O, P, a, ! 같이 outer + counter(안쪽 구멍) 두 path를 가진 글자들은 둘 다 글자명과 동일한 이름을 가집니다. `content("O").content("O")` 로 접근하면 같은 이름 두 개 중 **첫 번째만 잡혀서** counter도 outer 좌표로 덮어쓰여 모양이 깨집니다.

**해결**: 반드시 인덱스로 접근. 루트 `Contents`만 보면 부족하다 — 그룹이 중첩되면 `content(i).content(j).content(k)…` 처럼 **재귀적으로 내려간 인덱스 배열** 하나가 한 패스를 가리킨다. (수집은 아래 STEP 1 스크립트.)

### Q3. 텍스트에서 아웃라인은 어떻게 만들지? (모드 A만)

**A**: 원본 스킬 `ae-variable-font-morph`와 동일하다. **STEP 1 폰트 스캔** 후 **STEP 2** 에서 `Create Shapes from Text` 만 사용 (`app.findMenuCommandId("Create Shapes from Text")`). 숫자 `executeCommand` ID 는 쓰지 않는다. 변환 전에는 **해당 텍스트 레이어만** 선택.

**모드 B** (두 Shape만 있을 때)에는 이 단계를 **건너뛴다**.

### Q4. 결과 레이어에 키프레임은 어떻게 두나요?

**A**: 소스 A 셰이프 레이어를 `duplicate()` 한 뒤, 매칭된 각 패스에 `setValueAtTime(0, pathFromA)` + `setValueAtTime(0.5, pathFromB)` (기본 간격 0.5초). A/B **같은 쌍**의 `vertices.length` 가 같아야 한다. 다르면 그 쌍은 보간 불가(skip 또는 사용자에게 정점 수 맞추기).

### Q5. 모드 A에서 폰트가 잘 들어갔는지 어떻게 확인하나요?

**A**: 원본 스킬 STEP 2 검증과 동일 — Thin/Bold 아웃라인의 대응 패스 첫 vertex 좌표가 **완전 동일하면** 한쪽 weight가 안 먹은 것일 수 있다. **모드 B** 에서는 폰트 검증 대신 **Q4의 정점 개수·순서 매칭**만 보면 된다.

---

## 단계 개요

| 구간 | 모드 A (텍스트) | 모드 B (두 Shape) |
|---|---|---|
| 이전 | `ae-variable-font-morph` STEP 1~2 → Thin/Bold 아웃라인 | (생략) |
| 1 | 아웃라인 두 개를 A/B 로 보고 **DFS 패스 수집·쌍 검증** | 선택한 두 레이어 **DFS 패스 수집·쌍 검증** |
| 2 | 모프 결과 레이어 + 키프레임 | 동일 |
| 3~4 | `CTRL_ShapeMorph` + 스태거 + 오버슈트/Hold Expression | 동일 |
| 5 (옵션) | 와이어프레임 (`WIREFRAME_STYLE.md`, 소스는 A/B) | 동일 |

아래 **STEP 1** 스크립트는 모드 B 기준으로 두 Shape 를 고른 경우이다. 모드 A에서는 STEP 1~2 끝난 뒤 **`layerA` / `layerB` 를 각각 `__SRC_THIN__ Outlines` / `__SRC_BOLD__ Outlines` (또는 실제 레이어 이름)** 로 두고 동일 스크립트를 쓴다.

---

## STEP 1 — 패스 수집·매칭·검증 (모드 A/B 공통, 진입만 다름)

### 목적

**여기부터가 «두 베이스 셰이프가 이미 있다»는 전제 하의 공통 작업**이다. 모드 A에서는 `ae-variable-font-morph` STEP 2까지 끝난 직후, 모드 B에서는 사용자가 고른 두 Shape 직후에 실행한다.

`shape A`, `shape B` 두 레이어의 **Contents 트리를 깊이 우선(DFS)** 으로 순회해 모든 `ADBE Vector Shape - Group` 패스를 수집하고, **동일한 순서(i번째 ↔ i번째)** 로 쌍을 맞춘다. 각 패스는 Expression용 **전체 인덱스 배열** `[i,j,k,…]` 로 기록한다.

**모드 A**: 아래 스크립트에서 `layerA` = `comp.layer("__SRC_THIN__ Outlines")`, `layerB` = `comp.layer("__SRC_BOLD__ Outlines")` (또는 STEP 2 직후 실제 이름) 로 바꿔 호출한다.

**모드 B**: `comp.selectedLayers` 의 Shape 두 개 (첫 번째 = A, 두 번째 = B) 또는 이름으로 `shape A` / `shape B` 를 지정한다.

### 사전 조건

- 활성 컴프 존재
- **모양(Shape) 레이어 2개 선택** — 선택 순서 첫 번째 = 소스 A, 두 번째 = 타깃 B (또는 레이어 이름이 `shape A` / `shape B` 인 경우 그 이름으로 고정해도 됨)
- 각 쌍의 `vertices.length`가 같아야 보간 가능. 다르면 해당 쌍은 skip 하거나, 사용자에게 편집기에서 정점 수를 맞추도록 안내

### 패스 수집·검증 스크립트 (ae_execute)

```javascript
var comp = app.project.activeItem;
var sel = comp.selectedLayers;
if (sel.length !== 2) throw new Error("Shape 레이어 2개 선택");
var layerA = sel[0];
var layerB = sel[1];
if (layerA.matchName !== "ADBE Vector Layer" || layerB.matchName !== "ADBE Vector Layer") {
  throw new Error("Shape 레이어만");
}

function collectPaths(container, prefix, out, depth) {
  if (depth > 64) return;
  for (var i = 1; i <= container.numProperties; i++) {
    var prop = container.property(i);
    if (prop.matchName === "ADBE Vector Shape - Group") {
      var pv = prop.property("Path").value;
      out.push({ idx: prefix.concat([i]), verts: pv.vertices.length });
    } else if (prop.matchName === "ADBE Vector Group") {
      collectPaths(prop.property("Contents"), prefix.concat([i]), out, depth + 1);
    }
  }
}
function pathExpr(layerName, idxArr) {
  var s = "thisComp.layer(\"" + layerName + "\")";
  for (var j = 0; j < idxArr.length; j++) {
    s += ".content(" + idxArr[j] + ")";
  }
  return s + ".path";
}

var pa = [];
var pb = [];
collectPaths(layerA.property("Contents"), [], pa, 0);
collectPaths(layerB.property("Contents"), [], pb, 0);

var report = {
  nameA: layerA.name,
  nameB: layerB.name,
  pathCountA: pa.length,
  pathCountB: pb.length,
  pairsOk: []
};
var n = Math.min(pa.length, pb.length);
for (var k = 0; k < n; k++) {
  var ok = pa[k].verts === pb[k].verts;
  report.pairsOk.push({
    pairIndex: k,
    idxA: pa[k].idx,
    idxB: pb[k].idx,
    verts: pa[k].verts,
    exprA: pathExpr(layerA.name, pa[k].idx),
    exprB: pathExpr(layerB.name, pb[k].idx),
    canMorph: ok
  });
}
return JSON.stringify(report, null, 2);
```

**실패 원인 예**: A는 정점 18개, B는 5개처럼 **같은 순서의 패스라도 정점 수가 다르면** (`canMorph: false`) 기존 lerp 모프는 적용할 수 없음. AE에서 한쪽 패스의 정점 수를 맞춘 뒤 다시 실행한다.

### 실행 스크립트

`ae_execute` 로 아래 코드 실행:

```javascript
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) throw new Error("활성 컴프 없음");

var sel = comp.selectedLayers;
if (sel.length === 0) throw new Error("텍스트 레이어를 선택하세요");

var srcLayer = sel[0];
if (srcLayer.matchName !== "ADBE Text Layer") throw new Error("텍스트 레이어가 아닙니다");

var textDoc = srcLayer.property("ADBE Text Properties").property("ADBE Text Document").value;
var fontFamily = textDoc.fontFamily;

// 스타일 이름 → 숫자 weight 매핑
var WEIGHT_ORDER = {
    "Hairline": 50, "Thin": 100, "UltraLight": 200, "ExtraLight": 200,
    "Light": 300, "Regular": 400, "Normal": 400,
    "Medium": 500, "SemiBold": 600, "DemiBold": 600,
    "Bold": 700, "ExtraBold": 800, "UltraBold": 800,
    "Black": 900, "Heavy": 900, "ExtraBlack": 950
};

function getWeightNum(styleName) {
    // 1) 정확 매치
    if (WEIGHT_ORDER[styleName] !== undefined) return WEIGHT_ORDER[styleName];
    // 2) lowercase 매치
    var s = styleName.toLowerCase();
    for (var key in WEIGHT_ORDER) {
        if (s === key.toLowerCase()) return WEIGHT_ORDER[key];
    }
    // 3) 부분 문자열 매치 (퍼지)
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

// app.fonts.allFonts는 중첩 객체 (버킷 배열, 각 버킷 안에 폰트 엔트리)
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
    throw new Error(fontFamily + " 패밀리에 weight " + familyFonts.length + "개. 최소 2개 필요");
}

// 버블 정렬 (weight 오름차순) — ES3 호환
for (var i = 0; i < familyFonts.length - 1; i++) {
    for (var j = i + 1; j < familyFonts.length; j++) {
        if (familyFonts[j].weight < familyFonts[i].weight) {
            var tmp = familyFonts[i];
            familyFonts[i] = familyFonts[j];
            familyFonts[j] = tmp;
        }
    }
}

var result = {
    fontFamily: fontFamily,
    layerName: srcLayer.name,
    weights: familyFonts,
    thin: familyFonts[0],
    bold: familyFonts[familyFonts.length - 1]
};
return JSON.stringify(result, null, 2);
```

### 코드 단계 설명

1. **활성 컴프 + 선택 텍스트 검증**: 잘못된 입력 즉시 throw
2. **fontFamily 추출**: `textDoc.fontFamily` (예: "Pretendard")
3. **WEIGHT_ORDER**: 스타일 이름을 숫자 weight로 변환할 사전. UltraLight=ExtraLight=200처럼 동의어 처리
4. **getWeightNum()**: 정확 매치 → lowercase 매치 → 부분 매치 3단계. 어떤 명명 규칙의 폰트든 weight 추정
5. **`app.fonts.allFonts` 순회**: 중첩 구조라 이중 루프. `entry.familyName === fontFamily` 인 것만 수집
6. **2개 미만이면 에러**: 보간하려면 최소 2개 weight 필요
7. **버블 정렬**: weight 오름차순. 가장 얇은 게 [0], 가장 굵은 게 [last]
8. **JSON 반환**: Claude가 이 JSON을 파싱해서 다음 단계 변수로 사용

### 결과 예시

```json
{
  "fontFamily": "Pretendard",
  "layerName": "MOVE Path!",
  "thin": {"postScript": "Pretendard-Thin", "style": "Thin", "weight": 100},
  "bold": {"postScript": "Pretendard-Black", "style": "Black", "weight": 900},
  "weights": [...]
}
```

### Claude가 다음 단계에 넘길 변수

- `THIN_FONT` = `result.thin.postScript`
- `BOLD_FONT` = `result.bold.postScript`
- `THIN_STYLE` = `result.thin.style`
- `BOLD_STYLE` = `result.bold.style`

---

## STEP 2 — 모프 셰이프 레이어 + 숨겨진 소스 레이어 생성

### 목적

- Thin/Bold 두 가지 글리프를 셰이프로 변환
- 두 셰이프 레이어를 **숨김 처리** (렌더링 제외, 데이터 보존)
- **결과 레이어**(Thin 셰이프 복제본)에 0초=Thin, 1초=Bold 키프레임 설정
- 결과 레이어 앵커 중심 정렬

### 사전 조건

- STEP 1 결과 JSON 파싱 완료
- 같은 텍스트 레이어가 여전히 선택되어 있어야 함

### 실행 스크립트

상단 4개 변수를 STEP 1 결과로 치환 후 `ae_execute`:

```javascript
// ★ STEP 1 결과로 치환 ★
var THIN_FONT = "Pretendard-Thin";
var BOLD_FONT = "Pretendard-Black";
var THIN_STYLE = "Thin";
var BOLD_STYLE = "Black";

var comp = app.project.activeItem;
var sel = comp.selectedLayers;
if (sel.length === 0) throw new Error("텍스트 레이어 선택 필요");
var srcLayer = sel[0];

// ========== 1) 더미 텍스트 2개 만들고 폰트만 Thin/Bold로 ==========
var thinText = srcLayer.duplicate();
thinText.name = "__SRC_THIN__";
var td = thinText.property("ADBE Text Properties").property("ADBE Text Document").value;
td.font = THIN_FONT;
thinText.property("ADBE Text Properties").property("ADBE Text Document").setValue(td);

var boldText = srcLayer.duplicate();
boldText.name = "__SRC_BOLD__";
var bd = boldText.property("ADBE Text Properties").property("ADBE Text Document").value;
bd.font = BOLD_FONT;
boldText.property("ADBE Text Properties").property("ADBE Text Document").setValue(bd);

// ========== 2) Create Shapes from Text 실행 (Thin) ==========
// 반드시 thinText 만 selected
for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
thinText.selected = true;
app.executeCommand(app.findMenuCommandId("Create Shapes from Text"));

var thinShape = null;
for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === "__SRC_THIN__ Outlines") {
        thinShape = comp.layer(i);
        break;
    }
}

// ========== 3) Create Shapes from Text 실행 (Bold) ==========
for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
boldText.selected = true;
app.executeCommand(app.findMenuCommandId("Create Shapes from Text"));

var boldShape = null;
for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === "__SRC_BOLD__ Outlines") {
        boldShape = comp.layer(i);
        break;
    }
}

if (!thinShape || !boldShape) throw new Error("셰이프 변환 실패");

// ========== 4) 결과 레이어 = Thin 셰이프 복제 (위계 + Merge Paths 그대로) ==========
var resultLayer = thinShape.duplicate();
resultLayer.name = srcLayer.name + " [" + THIN_STYLE + " > " + BOLD_STYLE + "]";

// ========== 5) 결과 레이어 각 path에 0s=Thin, 1s=Bold 키프레임 설정 ==========
var thinC = thinShape.property("Contents");
var boldC = boldShape.property("Contents");
var resC = resultLayer.property("Contents");
var keysAdded = 0;
var skipped = [];

function setPathKeys(rContainer, tContainer, bContainer, path) {
    for (var i = 1; i <= rContainer.numProperties; i++) {
        var rProp = rContainer.property(i);
        if (rProp.matchName === "ADBE Vector Group") {
            // 그룹 안으로 재귀
            var tGrp = tContainer.property(i);
            var bGrp = bContainer.property(i);
            if (tGrp && bGrp && tGrp.matchName === "ADBE Vector Group" && bGrp.matchName === "ADBE Vector Group") {
                setPathKeys(
                    rProp.property("Contents"),
                    tGrp.property("Contents"),
                    bGrp.property("Contents"),
                    path + rProp.name + "/"
                );
            }
        } else if (rProp.matchName === "ADBE Vector Shape - Group") {
            // 패스 발견 → 키프레임 설정
            var tPath = tContainer.property(i);
            var bPath = bContainer.property(i);
            if (!tPath || !bPath || tPath.matchName !== "ADBE Vector Shape - Group") continue;
            var tv = tPath.property("Path").value;
            var bv = bPath.property("Path").value;
            // vertex 수 다르면 보간 불가
            if (tv.vertices.length !== bv.vertices.length) {
                skipped.push(path + rProp.name + " (" + tv.vertices.length + "!=" + bv.vertices.length + ")");
                continue;
            }
            var rp = rProp.property("Path");
            // 기본 duration 0.5초 (1초는 너무 느림 — Char/Point Stagger와 곱해지면 답답함)
            rp.setValueAtTime(0, tv);
            rp.setValueAtTime(0.5, bv);
            keysAdded++;
        }
        // Stroke, Fill, Merge Paths 등은 건드리지 않고 그대로 둠
    }
}
setPathKeys(resC, thinC, boldC, "");

// ========== 6) 더미 텍스트 레이어 제거 (셰이프 소스는 보존) ==========
for (var i = comp.numLayers; i >= 1; i--) {
    var n = comp.layer(i).name;
    if (n === "__SRC_THIN__" || n === "__SRC_BOLD__") comp.layer(i).remove();
}

// ========== 7) 소스 셰이프 숨김 (렌더링 안됨, shy 처리) ==========
thinShape.enabled = false;
boldShape.enabled = false;
thinShape.shy = true;
boldShape.shy = true;

// ========== 8) 결과 레이어 앵커 중심 정렬 ==========
var rect = resultLayer.sourceRectAtTime(0, false);
if (rect.width > 0 && rect.height > 0) {
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var oldA = resultLayer.transform.anchorPoint.value;
    var oldP = resultLayer.transform.position.value;
    resultLayer.transform.anchorPoint.setValue([cx, cy]);
    resultLayer.transform.position.setValue([oldP[0] + cx - oldA[0], oldP[1] + cy - oldA[1]]);
}

var msg = keysAdded + " paths keyframed (0s=" + THIN_STYLE + ", 1s=" + BOLD_STYLE + "), result: " + resultLayer.name;
if (skipped.length > 0) msg += " | skipped: " + skipped.join(", ");
return msg;
```

### 코드 단계 설명

1. **STEP 1 결과를 변수로**: 스크립트 상단 4개 변수 치환
2. **더미 텍스트 복제**: 원본 텍스트를 `duplicate()` 한 후 폰트만 Thin/Bold로 바꿈
3. **Create Shapes from Text 실행 (2번)**: 각각 thinText, boldText 선택 후 메뉴 명령. 결과 셰이프는 `"__SRC_THIN__ Outlines"`, `"__SRC_BOLD__ Outlines"` 이름으로 자동 생성
4. **결과 레이어 = Thin 셰이프 duplicate**: 위계와 Merge Paths/Stroke/Fill 등 모든 구조 보존
5. **setPathKeys() 재귀**: 그룹 트리를 따라 들어가며 path마다 `setValueAtTime(0, thinVal)`, `setValueAtTime(0.5, boldVal)` 호출 (기본 duration 0.5초). vertex 수 다르면 skip
6. **더미 텍스트 제거**: 셰이프는 남기고 원본 텍스트만 삭제
7. **소스 셰이프 숨김**: `enabled=false`로 렌더링 제외, `shy=true`로 타임라인에서도 숨김 가능
8. **앵커 중심**: `sourceRectAtTime`으로 bbox 계산해 중심 좌표 산출, position 보정

### 결과 검증 (반드시 확인)

스크립트 실행 후 Thin과 Bold의 같은 글자 첫 vertex 좌표가 다른지 확인:

```javascript
// 검증 스크립트 (별도 ae_execute)
var comp = app.project.activeItem;
var tL = comp.layer("__SRC_THIN__ Outlines");
var bL = comp.layer("__SRC_BOLD__ Outlines");
// 첫 글자 그룹의 첫 path 비교
var tFirst = tL.property("Contents").property(1).property("Contents").property(1).property("Path").value;
var bFirst = bL.property("Contents").property(1).property("Contents").property(1).property("Path").value;
return "Thin v0=" + tFirst.vertices[0][0].toFixed(1) + " | Bold v0=" + bFirst.vertices[0][0].toFixed(1);
```

좌표가 같으면 폰트 설정이 실패한 것 → 다른 weight 조합으로 재시도.

---

## STEP 3 — CTRL 컨트롤러 + 스태거 Expression

### 목적

- 글자별 / 글자 내 포인트별 시간차(스태거)를 슬라이더로 조절
- 결과 레이어의 키프레임(`k1`, `k2`) 시간에 맞춰 모든 path를 보간

### STEP 3-1: CTRL 널 생성

#### 사전 조건

- STEP 2에서 결과 레이어 이름 확보 (예: `"MOVE Path! [Thin > Black]"`)

#### 실행 스크립트

```javascript
var MORPH_LAYER_NAME = "MOVE Path! [Thin > Black]"; // STEP 2 결과 레이어명

var comp = app.project.activeItem;
var morphLayer = comp.layer(MORPH_LAYER_NAME);
if (!morphLayer) throw new Error("모프 레이어 없음: " + MORPH_LAYER_NAME);

// 이미 있으면 제거
for (var i = comp.numLayers; i >= 1; i--) {
    if (comp.layer(i).name === "CTRL_FontMorph") comp.layer(i).remove();
}

var ctrl = comp.layers.addNull();
ctrl.name = "CTRL_FontMorph";
ctrl.transform.opacity.setValue(0); // 보이지 않게

var ef = ctrl.property("Effects");

var csSlider = ef.addProperty("ADBE Slider Control");
csSlider.name = "Char Stagger";
csSlider.property("Slider").setValue(50); // 50% × dur 글자 간 딜레이 (확실한 시각 효과)

var psSlider = ef.addProperty("ADBE Slider Control");
psSlider.name = "Point Stagger";
psSlider.property("Slider").setValue(20); // 20% × dur 포인트 간 딜레이

ctrl.moveBefore(morphLayer); // 모프 레이어 바로 위에 배치

return "CTRL_FontMorph 생성 완료";
```

#### 슬라이더 의미

| 슬라이더 | 단위 | 의미 |
|---|---|---|
| **Char Stagger** | 0~100 (%로 해석) | 글자 간 딜레이. 값/100 × duration. 0이면 모든 글자 동시 시작 |
| **Point Stagger** | 0~100 (%로 해석) | 같은 글자 안 포인트 간 딜레이. 같은 단위 |

기본값: **Char Stagger=50, Point Stagger=20**. 시각적으로 확실히 보이는 표준 값. 너무 낮으면 모션이 거의 동시처럼 보임.

### STEP 3-2: 모든 패스에 Expression 적용

#### 실행 스크립트

```javascript
var MORPH_LAYER_NAME = "MOVE Path! [Thin > Black]";

var comp = app.project.activeItem;
var morphLayer = comp.layer(MORPH_LAYER_NAME);
var contents = morphLayer.property("Contents");

// 모든 글자 그룹과 그 안의 path 인덱스 수집
var totalChars = 0;
var charGroups = [];
for (var g = 1; g <= contents.numProperties; g++) {
    var grp = contents.property(g);
    if (grp.matchName !== "ADBE Vector Group") continue;
    var sub = grp.property("Contents");
    var paths = [];
    for (var s = 1; s <= sub.numProperties; s++) {
        if (sub.property(s).matchName === "ADBE Vector Shape - Group") {
            paths.push({idx: s});
        }
    }
    charGroups.push({groupIdx: g, paths: paths});
    totalChars++;
}

// 각 path에 Expression 적용
var applied = 0;
for (var ci = 0; ci < charGroups.length; ci++) {
    var cg = charGroups[ci];
    for (var pi = 0; pi < cg.paths.length; pi++) {
        var pathIdx = cg.paths[pi].idx;
        var pathProp = contents.property(cg.groupIdx).property("Contents").property(pathIdx).property("Path");

        var lines = [];
        // 소스 path 인덱스로 접근 (이름 접근 금지!)
        lines.push('var tp = thisComp.layer("__SRC_THIN__ Outlines").content(' + cg.groupIdx + ').content(' + pathIdx + ').path;');
        lines.push('var bp = thisComp.layer("__SRC_BOLD__ Outlines").content(' + cg.groupIdx + ').content(' + pathIdx + ').path;');
        // CTRL 슬라이더 읽기
        lines.push('var ctrl = thisComp.layer("CTRL_FontMorph");');
        lines.push('var cs = ctrl.effect("Char Stagger")(1) / 100;');
        lines.push('var ps = ctrl.effect("Point Stagger")(1) / 100;');
        // 결과 레이어의 키프레임 시간 자동 감지
        lines.push('var k1 = thisProperty.key(1).time;');
        lines.push('var k2 = thisProperty.key(2).time;');
        lines.push('var dur = k2 - k1;');
        // 글자 정규화 인덱스 (0~1)
        lines.push('var cN = ' + ci + ' / Math.max(' + (totalChars - 1) + ', 1);');
        lines.push('var n = tp.points().length;');
        lines.push('var pts=[],itn=[],otn=[];');
        // 포인트별 lerp
        lines.push('for(var k=0;k<n;k++){');
        lines.push('  var pN = k / Math.max(n-1, 1);');
        lines.push('  var delay = cN * cs + pN * ps;');
        lines.push('  var prog = (time - k1 - delay * dur) / dur;');
        lines.push('  if(prog < 0) prog = 0;');
        lines.push('  if(prog > 1) prog = 1;');
        lines.push('  var t = ease(prog, 0, 1);'); // AE 내장 안전 ease (선형 → S-curve)
        // 좌표 lerp
        lines.push('  var a=tp.points()[k],b=bp.points()[k];');
        lines.push('  pts.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]);');
        lines.push('  var ai=tp.inTangents()[k],bi=bp.inTangents()[k];');
        lines.push('  itn.push([ai[0]+(bi[0]-ai[0])*t, ai[1]+(bi[1]-ai[1])*t]);');
        lines.push('  var ao=tp.outTangents()[k],bo=bp.outTangents()[k];');
        lines.push('  otn.push([ao[0]+(bo[0]-ao[0])*t, ao[1]+(bo[1]-ao[1])*t]);');
        lines.push('}');
        lines.push('createPath(pts,itn,otn,tp.isClosed());');

        pathProp.expression = lines.join('\n');
        pathProp.expressionEnabled = true;
        applied++;
    }
}
return applied + " paths with stagger expression";
```

### Expression 동작 원리 (한 줄씩 설명)

```javascript
// 1. 소스 path 가져오기 — 인덱스 기반 (이름 접근 금지)
var tp = thisComp.layer("__SRC_THIN__ Outlines").content(2).content(1).path;
var bp = thisComp.layer("__SRC_BOLD__ Outlines").content(2).content(1).path;

// 2. CTRL 슬라이더 값 읽기
var ctrl = thisComp.layer("CTRL_FontMorph");
var cs = ctrl.effect("Char Stagger")(1) / 100;  // 0~1로 정규화
var ps = ctrl.effect("Point Stagger")(1) / 100;

// 3. 결과 레이어 자체 키프레임 시간 (사용자가 옮기면 자동 반영)
var k1 = thisProperty.key(1).time; // 0초
var k2 = thisProperty.key(2).time; // 1초
var dur = k2 - k1;                 // 1초

// 4. 글자/포인트 정규화 인덱스
var cN = 1 / 8;                    // 글자 9개 중 두 번째 (ci=1)
var n = tp.points().length;        // 이 path의 vertex 수
for (var k = 0; k < n; k++) {
    var pN = k / (n - 1);          // 0~1
    
    // 5. 누적 딜레이 = 글자 딜레이 + 포인트 딜레이
    var delay = cN * cs + pN * ps;
    
    // 6. 진행도 = (현재 시간 - 시작 - delay) / dur
    var prog = (time - k1 - delay * dur) / dur;
    if (prog < 0) prog = 0;
    if (prog > 1) prog = 1;
    
    // 7. AE 내장 ease (안전, 0~1 보장)
    var t = ease(prog, 0, 1);
    
    // 8. Thin과 Bold 좌표를 t로 보간
    var a = tp.points()[k];
    var b = bp.points()[k];
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    // (in/out tangent도 동일하게 lerp)
}

// 9. 새 path 생성
createPath(pts, itn, otn, tp.isClosed());
```

### 결과 확인 (디버깅용)

Expression 적용 후 에러 체크:

```javascript
// 검증 스크립트
var comp = app.project.activeItem;
var morphLayer = comp.layer("MOVE Path! [Thin > Black]");
var contents = morphLayer.property("Contents");
var errs = [];
for (var g = 1; g <= contents.numProperties; g++) {
    var grp = contents.property(g);
    if (grp.matchName !== "ADBE Vector Group") continue;
    var sub = grp.property("Contents");
    for (var s = 1; s <= sub.numProperties; s++) {
        var ch = sub.property(s);
        if (ch.matchName !== "ADBE Vector Shape - Group") continue;
        var pp = ch.property("Path");
        var e = pp.expressionError;
        if (e && e.length > 0) errs.push(grp.name + ": " + e.substring(0, 60));
    }
}
return errs.length === 0 ? "ALL OK" : errs.join(" | ");
```

`"ALL OK"` 면 성공. 에러 있으면 인덱스가 안 맞거나 소스 레이어 이름이 다른 것.

### 여기까지 기본 워크플로우 — 사용자가 더 요청 안 하면 종료

---

## STEP 4 (옵션) — 오버슈트 + Hold

### 언제 추가하나

사용자가 명시적으로 다음 키워드를 말할 때만:
- "오버슈트", "탄성", "스프링"
- "왕복", "되돌아오게", "돌아와"
- "머무는 시간", "Hold", "유지"

평소엔 STEP 3에서 종료. 기본은 한 방향(Thin→Bold)만.

### STEP 4-1: 슬라이더 2개 추가

```javascript
var comp = app.project.activeItem;
var ctrl = comp.layer("CTRL_FontMorph");
var ef = ctrl.property("Effects");

var ovrSlider = ef.addProperty("ADBE Slider Control");
ovrSlider.name = "Overshoot";
ovrSlider.property("Slider").setValue(1.70158); // easing-reference.md easeOutBack 표준

var holdSlider = ef.addProperty("ADBE Slider Control");
holdSlider.name = "Hold";
holdSlider.property("Slider").setValue(2); // 초. Bold 머무는 시간 — 왕복 모션이 자연스럽게 보이는 표준값

return "Overshoot/Hold 슬라이더 추가";
```

| 슬라이더 | 기본값 | 의미 |
|---|---|---|
| **Overshoot** | 1.70158 | easeOutBack 강도. 0=선형, 1.7=표준, 3+=과장 |
| **Hold** | 2 (초) | Bold 상태 머무는 시간. 0=즉시 복귀, 양수=그만큼 유지 |

### STEP 4-2: Expression 교체 (왕복 + 오버슈트)

STEP 3-2의 Expression 부분만 아래로 교체:

```javascript
var lines = [];
lines.push('var tp = thisComp.layer("__SRC_THIN__ Outlines").content(' + cg.groupIdx + ').content(' + pathIdx + ').path;');
lines.push('var bp = thisComp.layer("__SRC_BOLD__ Outlines").content(' + cg.groupIdx + ').content(' + pathIdx + ').path;');
lines.push('var ctrl = thisComp.layer("CTRL_FontMorph");');
lines.push('var cs = ctrl.effect("Char Stagger")(1) / 100;');
lines.push('var ps = ctrl.effect("Point Stagger")(1) / 100;');
lines.push('var ovr = ctrl.effect("Overshoot")(1);');
lines.push('var hold = ctrl.effect("Hold")(1);');
lines.push('var k1 = thisProperty.key(1).time;');
lines.push('var k2 = thisProperty.key(2).time;');
lines.push('var dur = k2 - k1;');
lines.push('var cN = ' + ci + ' / Math.max(' + (totalChars - 1) + ', 1);');
lines.push('var n = tp.points().length;');
lines.push('var c1 = ovr; var c3 = c1 + 1;');
lines.push('var pts=[],itn=[],otn=[];');
lines.push('for(var k=0;k<n;k++){');
lines.push('  var pN = k / Math.max(n-1, 1);');
lines.push('  var delay = cN * cs + pN * ps;');
lines.push('  var localTime = time - k1 - delay * dur;');
lines.push('  var t;');
// Phase 1: 0~dur (Thin → Bold 오버슈트)
lines.push('  if(localTime <= 0) { t = 0; }');
lines.push('  else if(localTime <= dur) {');
lines.push('    var p = localTime / dur;');
lines.push('    if(p >= 1.5) t = 1;');
lines.push('    else t = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);');
lines.push('  }');
// Phase 2: dur ~ dur+hold (Bold 유지)
lines.push('  else if(localTime <= dur + hold) { t = 1; }');
// Phase 3: dur+hold ~ 2*dur+hold (Bold → Thin 오버슈트, 들어옴과 동일 dur)
lines.push('  else if(localTime <= 2*dur + hold) {');
lines.push('    var p = (localTime - dur - hold) / dur;');
lines.push('    if(p >= 1.5) t = 0;');
lines.push('    else { var rt = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); t = 1 - rt; }');
lines.push('  }');
lines.push('  else { t = 0; }');
lines.push('  var a=tp.points()[k],b=bp.points()[k];');
lines.push('  pts.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]);');
lines.push('  var ai=tp.inTangents()[k],bi=bp.inTangents()[k];');
lines.push('  itn.push([ai[0]+(bi[0]-ai[0])*t, ai[1]+(bi[1]-ai[1])*t]);');
lines.push('  var ao=tp.outTangents()[k],bo=bp.outTangents()[k];');
lines.push('  otn.push([ao[0]+(bo[0]-ao[0])*t, ao[1]+(bo[1]-ao[1])*t]);');
lines.push('}');
lines.push('createPath(pts,itn,otn,tp.isClosed());');
```

### 시간 흐름 (각 포인트 기준, +delay 적용)

```
0 ─────── dur ───── dur+hold ─── 2*dur+hold ──→ time
[Thin → Bold ] [Bold 유지   ] [Bold → Thin ]
  들어오기      머무는 시간     돌아가기
   (overshoot)                  (overshoot)
```

들어오기와 돌아가기 duration은 **항상 키프레임의 `dur`과 동일**. Hold만 늘리면 가운데가 길어짐.

### easeOutBack 공식

```
c1 = Overshoot 값 (기본 1.70158)
c3 = c1 + 1

t = 1 + c3 * (p - 1)^3 + c1 * (p - 1)^2
```

- `p ∈ [0, 1]` 에서 t는 1을 살짝 초과한 뒤 1로 정착 → Bold를 살짝 넘어가서 정착하는 효과
- `p >= 1.5`에서 t=1로 강제 안정화

---

## 실행 흐름 (Claude가 따를 순서)

```
1. ae_scan (depth=summary)
   ↓ 선택 텍스트 레이어 확인
2. STEP 1 ae_execute
   ↓ JSON 결과 파싱 (thin.postScript, bold.postScript)
3. STEP 2 ae_execute (4개 변수 치환)
   ↓ 결과 레이어 이름 받기 (예: "MOVE Path! [Thin > Black]")
4. STEP 2 검증 ae_execute
   ↓ Thin/Bold v0 좌표 다른지 확인. 같으면 폰트 잘못 → 재시도
5. STEP 3-1 ae_execute (MORPH_LAYER_NAME 치환)
   ↓ CTRL_FontMorph 생성
6. STEP 3-2 ae_execute (MORPH_LAYER_NAME 치환)
   ↓ 모든 path에 Expression
7. STEP 3 검증 ae_execute
   ↓ Expression 에러 ALL OK 확인
8. 종료. 사용자가 오버슈트/Hold 추가 요청 시:
   9a. STEP 4-1 ae_execute (슬라이더 추가)
   9b. STEP 4-2 ae_execute (Expression 교체)
10. (옵션) 사용자가 "와이어프레임", "패스 시각화", "앵커/핸들 표시" 같은 요청 시:
    → **이 스킬 폴더의 `WIREFRAME_STYLE.md` 파일을 읽고** 그 절차(STEP 5-1 ~ 5-4)대로 진행
    → 모프 레이어 위에 앵커 사각형 + 핸들 원 + 연결선 마커가 실시간 추적되는 와이어프레임 레이어가 추가됨
    → CTRL_Wireframe 컨트롤러로 색상/크기/굵기 일괄 조정 가능
```

---

## 주의사항 및 트러블슈팅

### Expression 에러 발생 패턴

| 에러 | 원인 | 해결 |
|---|---|---|
| `is not a function` | `key().value.points()` 호출 | 정적 source layer path만 `.points()` 가능 |
| `effect named X is missing` | CTRL 슬라이더 이름 오타 | 이름 확인: Char Stagger, Point Stagger 등 |
| `Expression Disabled` (에러 메시지 없이) | 변수명 충돌 (`var i` 두 번 등) | 변수명 유일하게 (k, pN 사용) |
| 좌표 NaN | 음수 prog에 `Math.pow` | `prog < 0` 가드 추가 |

### M, V, E 등 단일 path 글자가 안 변할 때

폰트가 같은 셰이프를 출력한 것. STEP 2 검증으로 첫 vertex 좌표 비교 → 같으면 폰트 재설정 후 재시도.

### O, P, a 등 counter 있는 글자가 깨질 때

`content("O").content("O")` 같은 이름 기반 접근 사용했을 가능성. 인덱스 기반 `content(groupIdx).content(pathIdx)` 로 수정.

### vertex 수 다름 (skipped)

폰트 디자인 한계. Pretendard처럼 정상 설계 폰트는 거의 모든 weight가 vertex 수 동일. 디스플레이체에서 자주 발생.

---

## 변형 요청 대응표

| 사용자 요청 | 처리 |
|---|---|
| "베리어블 폰트 모프" / "thin bold 보간" | STEP 1~3 |
| "오버슈트 추가" / "탄성" | STEP 4 추가 |
| "왕복 / 돌아오게 / Hold" | STEP 4 (Hold 양수 설정) |
| "Light → Regular" 같은 약한 보간 | STEP 1 결과에서 원하는 두 weight 선택, STEP 2 변수에 그 postScript 주입 |
| "역방향 (Bold→Thin)" | STEP 2 변수에서 thin/bold 자리 바꿔서 실행 |
| "글자 스태거만" | Point Stagger=0 |
| "포인트 스태거만" | Char Stagger=0 |
| "키프레임 위치 변경" | 결과 레이어 Path 키프레임 드래그 → Expression 자동 반영 |
| "텍스트 변경" | 텍스트 수정 후 STEP 2부터 재실행 |
| "와이어프레임 / 패스 시각화 / 앵커 핸들 표시" | **`WIREFRAME_STYLE.md` 읽고** STEP 5-1 ~ 5-4 진행 |
| "와이어프레임 색/크기 변경" | CTRL_Wireframe의 슬라이더 조정 (WIREFRAME_STYLE.md 참조) |
| "와이어프레임 제거" | `<원본> Wireframe` + CTRL_Wireframe 레이어 삭제 |

---

## 관련 스킬 / 문서

- `ae-char-split` — 글자별 분리 후 개별 모프 가능
- `ae-font-anatomy` — 폰트 글리프 시각화
- `docs/easing-reference.md` — Overshoot 표준값 (easeOutBack c1=1.70158)
- **`WIREFRAME_STYLE.md`** (이 스킬 폴더 안) — 와이어프레임 스타일 시각화 옵션 (STEP 5). 사용자가 "와이어프레임", "패스 시각화", "앵커/핸들 표시" 요청 시 반드시 읽고 진행
