# TextLayer 오브젝트

출처: https://ae-scripting.docsforadobe.dev/layer/textlayer/

Layer → AVLayer → TextLayer 상속 구조.
`comp.layers.addText()` 로 생성.

## ExtendScript에서 `toComp` 사용 금지

레이어 내부 좌표(예: `sourceRectAtTime`)를 컴프 픽셀로 옮길 때 **스크립트에서 `textLayer.toComp()`를 호출하지 않는다.** Expression에서만 안정적으로 제공되는 경우가 많고, ExtendScript에서는 `undefined`일 수 있다. 대체: [layer-to-comp-extendscript.md](../08-patterns-and-pitfalls/layer-to-comp-extendscript.md) · `scripts/utility/layer-point-to-comp.jsx`

## ⚠️ 텍스트 레이어 앵커포인트 필수 보정

```javascript
// addText() 직후 앵커포인트는 레이어 내부 [0,0] (좌상단 근처)
// 이 상태로 키프레임 작업하면 피벗이 어긋남 → 반드시 보정!

var tl = comp.layers.addText("Hello");
var src = tl.property("Source Text");
var doc = src.value;

// 1. 스타일 먼저 확정
doc.fontSize = 120;
doc.fillColor = [1, 1, 1];
doc.justification = ParagraphJustification.CENTER_JUSTIFY;
src.setValue(doc);  // ← 반드시 setValue 후에 sourceRectAtTime 호출

// 2. bbox 중심으로 앵커 보정
var rect = tl.sourceRectAtTime(0, false);
// rect: { top, left, width, height } — 레이어 내부 좌표
tl.transform.anchorPoint.setValue([
    rect.left + rect.width  / 2,   // 수평 중심
    rect.top  + rect.height / 2    // 수직 중심
]);

// 3. 앵커 보정 후에 position 설정
tl.transform.position.setValue([960, 540]);
// 이후 키프레임 작업
```

## 텍스트 스타일 설정

```javascript
var src = tl.property("Source Text");  // "ADBE Text Document"
var doc = src.value;

// 기본 스타일
doc.text = "새 텍스트";
doc.fontSize = 72;
doc.font = "Arial-BoldMT";       // PostScript 폰트 이름
doc.fontFamily = "Arial";        // ← read-only (참조용)
doc.fontStyle = "Bold";          // ← read-only (참조용)

// 색상
doc.fillColor = [1, 1, 1];       // RGB 0~1 (흰색)
doc.strokeColor = [0, 0, 0];     // RGB 0~1 (검정)
doc.strokeWidth = 2;
doc.applyFill = true;
doc.applyStroke = false;
doc.strokeOverFill = true;       // stroke를 fill 위에

// 페이크 스타일
doc.fauxBold = false;
doc.fauxItalic = false;

// 자간
doc.kerning = 0;
doc.tracking = 0;

// 정렬
doc.justification = ParagraphJustification.LEFT_JUSTIFY;
doc.justification = ParagraphJustification.CENTER_JUSTIFY;
doc.justification = ParagraphJustification.RIGHT_JUSTIFY;

// 행간
doc.leading = 80;

// 베이스라인
doc.baselineShift = 0;
doc.horizontalScale = 100;
doc.verticalScale = 100;

src.setValue(doc);  // ← 스타일 적용은 반드시 setValue로
```

## 박스 텍스트 (단락)

```javascript
var tl = comp.layers.addBoxText([400, 200]);  // [width, height]
// 또는
var tl = comp.layers.addText("");
// doc.boxText = true; 로 전환은 불가 — addBoxText로 생성해야 함

var doc = tl.property("Source Text").value;
writeLn(doc.boxText);   // true
writeLn(doc.pointText); // false
writeLn(doc.boxTextSize);  // [width, height]
```

## ⚠️ TextDocument 주의사항

```javascript
// ❌ 혼합 스타일(문자마다 다른 크기/색상)이면 undefined 반환
var doc = src.value;
var size = doc.fontSize;  // 문자별 크기가 다르면 undefined

// ❌ applyFill = false 상태에서 fillColor 읽으면 예외 발생
var c = doc.fillColor;  // applyFill이 false면 ERROR

// ✅ 안전한 읽기
if (doc.applyFill) { var c = doc.fillColor; }
```

## 텍스트 키프레임 애니메이션

```javascript
// 텍스트 내용 키프레임
src.setValueAtTime(0, new TextDocument("시작 텍스트"));
src.setValueAtTime(1, new TextDocument("종료 텍스트"));
// ⚠️ 텍스트는 Hold 보간만 가능 (BEZIER 적용 불가)
```

## 패스 텍스트

```javascript
var pathOpts = tl.property("Text").property("Path Options");
// "ADBE Text Path Options"
pathOpts.property("Path").setValue(maskIndex);  // 마스크 인덱스(1-based)
pathOpts.property("Reverse Path").setValue(false);
pathOpts.property("Perpendicular To Path").setValue(true);
pathOpts.property("Force Alignment").setValue(false);
pathOpts.property("First Margin").setValue(0);
```

## AVLayer에서 사용 불가한 프로퍼티 (TextLayer)

```
canSetTimeRemapEnabled → false
timeRemapEnabled       → 적용 불가
trackMatteType         → 적용 불가
isTrackMatte           → 적용 불가
hasTrackMatte          → 적용 불가
```
