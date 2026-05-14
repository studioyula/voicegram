# 확인된 실수 목록 & 안전 패턴

실제 AE 실행 중 발생한 오류 기록. **새 스크립트 작성 전에 반드시 확인.**

---

## ❌ 절대 쓰지 말 것

### 1. KeyframeInterpolationType 존재하지 않는 상수

```javascript
// ❌ 존재하지 않음
KeyframeInterpolationType.AUTO_BEZIER       // → "Value is undefined"
KeyframeInterpolationType.CONTINUOUS_BEZIER // → AE API에 없음
KeyframeInterpolationType.NONE              // → 미확인, 사용 금지

// ✅ 존재하는 것만
KeyframeInterpolationType.LINEAR
KeyframeInterpolationType.BEZIER   // Auto/Continuous 모두 BEZIER로 처리
KeyframeInterpolationType.HOLD
```

### 2. getSeparationFollower() — 존재하지 않음

```javascript
// ❌ 틀린 방법
pos.dimensionsSeparated = true;
var xProp = pos.getSeparationFollower(0);  // ERROR: getSeparationFollower is undefined

// ✅ 올바른 방법
pos.dimensionsSeparated = true;
var xProp = layer.transform.property("X Position");  // "ADBE Position_0"
var yProp = layer.transform.property("Y Position");  // "ADBE Position_1"
```

### 3. top-level return (DoScriptFile 직접 실행 시)

```javascript
// ❌ 금지
if (!comp) return "에러";  // "Illegal 'return' outside of a function body"

// ✅ 대신
if (!comp) throw new Error("comp 없음");
```

### 4. alert() 사용 금지

```javascript
// ❌ 금지 — AE가 블로킹 다이얼로그를 띄워 자동화 불가
alert("에러 발생");

// ✅ 대신
log("에러: " + msg);       // execute-script 환경에서 사용
throw new Error(msg);       // 실행 중단 + 에러 전파
writeLn("디버그: " + msg); // 정보 출력만
```

### 5. ES6+ 문법

```javascript
// ❌ 전부 금지
let x = 1;         const y = 2;
(a) => a + 1;
`${x}`
[].forEach()   [].map()   [].filter()
JSON.stringify()   JSON.parse()
new Date().toISOString()
class Foo {}
...spread
```

### 5a. ExtendScript에서 `layer.toComp()` / `toWorld()` 에 의존

Expression 레퍼런스의 Layer space 변환(`toComp`, `toWorld`, `fromComp` 등)은 **표현식 언어** 기준이다. **ExtendScript**(`ae_execute`로 돌리는 `.jsx`)에서는 같은 메서드가 **없거나 `undefined`** 인 경우가 있다(특히 TextLayer). MCP 스크립트는 이 호출에 기대지 말 것.

- **대체**: 앵커·스케일·회전·position·부모 체인으로 수동 변환 → [layer-to-comp-extendscript.md](./layer-to-comp-extendscript.md) · `scripts/utility/layer-point-to-comp.jsx`

---

## ⚠️ 주의가 필요한 것들

### 6. setTemporalEaseAtKey 배열 크기 오류

```javascript
// ❌ TwoD (scale) 에 배열 1개 → "Value array does not have 2 elements"
scale.setTemporalEaseAtKey(1, [new KeyframeEase(0, 80)], [new KeyframeEase(0, 80)]);

// ✅ TwoD → 2개
scale.setTemporalEaseAtKey(1,
    [new KeyframeEase(0, 80), new KeyframeEase(0, 80)],
    [new KeyframeEase(0, 80), new KeyframeEase(0, 80)]
);

// ✅ 또는 easeKeys 헬퍼 사용 (자동 감지)
easeKeys(scale);
```

> ⚠️ 이 에러 발생 시 AE는 endUndoGroup에서 **전체 롤백** → 모든 변경사항 사라짐!

### 7. Property 레퍼런스 stale 현상

```javascript
// ❌ 위험: 레퍼런스를 미리 받아두고 구조 변경 후 사용
var sizeProp = ellipse.property("Size");
layer.transform.position.dimensionsSeparated = true;  // 구조 변경!
sizeProp.setValue([100, 100]);  // ERROR: Object is invalid

// ✅ 사용 직전에 다시 fetch
var sizeProp = ellipse.property("Size");  // ← 직전 재취득
sizeProp.setValue([100, 100]);
```

### 8. 텍스트 레이어 앵커포인트 미보정

```javascript
// ❌ 위험: addText 직후 anchorPoint가 [0,0] (좌상단) → 피벗 어긋남
var tl = comp.layers.addText("Hello");
tl.transform.position.setValue([960, 540]);  // 앵커 보정 없이 position 설정!

// ✅ 반드시 스타일 setValue 후 sourceRectAtTime으로 앵커 보정
var doc = src.value;
doc.fontSize = 120;
src.setValue(doc);  // 스타일 먼저 확정

var rect = tl.sourceRectAtTime(0, false);
tl.transform.anchorPoint.setValue([
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
]);
tl.transform.position.setValue([960, 540]);  // 앵커 보정 후에 설정
```

### 9. Expression이 참조하는 레이어 생성 순서

```javascript
// ❌ 위험: Expression이 참조하는 레이어가 아직 없음
var shadow = comp.layers.addShape();
shadow.name = "Shadow";
setExpr(shadow.transform.position,
    "thisComp.layer('Ball').transform.position");  // 'Ball'이 아직 없음!

// ✅ 참조 대상(Ball)을 먼저 만들고 Shadow를 나중에
var ball = comp.layers.addShape();
ball.name = "Ball";
// ... Ball 설정 ...
var shadow = comp.layers.addShape();
shadow.name = "Shadow";
setExpr(shadow.transform.position,
    "thisComp.layer('Ball').transform.position");  // OK
```

### 10. Expression vs Script 컨텍스트 혼동

```javascript
// ❌ 스크립트 변수를 Expression에서 참조 불가
var mySize = 100;
layer.transform.scale.expression = "mySize";  // ERROR: mySize is undefined

// ✅ 값을 직접 리터럴로 넣거나 thisComp/thisLayer 기반 expression 사용
layer.transform.scale.expression = "value + wiggle(2, 10)";
// 또는 값 주입:
var exprStr = "[" + mySize + ", " + mySize + "]";
layer.transform.scale.expression = exprStr;
```

### 11. TextDocument 혼합 스타일에서 읽기

```javascript
// ❌ 혼합 스타일(문자마다 다른 크기)이면 undefined 반환
var sz = doc.fontSize;  // undefined

// ❌ applyFill = false 상태에서 fillColor 읽으면 에러
var c = doc.fillColor;  // ERROR

// ✅ 안전한 읽기
if (doc.applyFill) {
    var c = doc.fillColor;
}
// 쓰기는 항상 OK
doc.fontSize = 100;
```

### 12. AE 좌표계 Y축 방향 (일반 수학과 반대)

```javascript
// Y값이 증가하면 화면 아래로 내려감
// Y=0 = 화면 상단, Y=1080 = 화면 하단 (1080p 기준)

// ❌ 혼동하기 쉬운 코드 (위로 이동하려면 Y 감소)
// "위로 200px 이동" = Y를 200 줄임
pos.setValue([cx, cy - 200]);  // 위로

// "아래서 위로" 슬라이드 = 시작 Y가 더 큼
pos.setValueAtTime(0, [cx, cy + 300]);  // 아래에서 시작 (Y 큰 값)
pos.setValueAtTime(1, [cx, cy]);        // 위로 올라옴 (Y 작은 값)
```

---

## ✅ 안전한 코딩 패턴

### 기본 스크립트 구조

```javascript
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    throw new Error("활성 컴포지션이 없습니다");
}

// 이후 작업...
```

### 이펙트 안전 추가

```javascript
var fx = layer.property("Effects").addProperty("ADBE Gaussian Blur 2");
if (!fx) throw new Error("Gaussian Blur 이펙트를 추가할 수 없습니다");
fx.property("Blurriness").setValue(20);
```

### 레이어 이름으로 안전하게 찾기

```javascript
function getLayer(comp, name) {
    var layer = comp.layer(name);
    if (!layer) throw new Error("레이어를 찾을 수 없음: " + name);
    return layer;
}
```

### 모든 레이어 순회

```javascript
for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer instanceof TextLayer) {
        // 텍스트 레이어 처리
    }
}
```

### setExpr 사용 (execute-script 환경)

```javascript
// wrapScript가 자동으로 setExpr를 주입함
setExpr(prop, 'loopOut("cycle")');
// expression 에러를 즉시 MCP 에러로 리포팅

// 직접 AE에서 실행할 때는 폴백 정의 추가:
if (typeof setExpr === "undefined") {
    function setExpr(prop, expr) {
        prop.expression = expr;
        var err = prop.expressionError;
        if (err && err !== "") {
            throw new Error("Expression 에러 [" + prop.name + "]: " + err);
        }
        return prop;
    }
}
```

### null 체크 후 프로퍼티 접근

```javascript
var layer = comp.layer("Target");
if (!layer) throw new Error("Target 레이어 없음");

var fx = layer.property("Effects").property("Blur");
if (!fx) throw new Error("Blur 이펙트 없음");
```
