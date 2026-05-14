# TextDocument 오브젝트

출처: https://ae-scripting.docsforadobe.dev/text/textdocument/

TextLayer의 Source Text 프로퍼티 값.
`new TextDocument(docText)` 로 생성.

## 기본 접근 패턴

```javascript
var srcProp = layer.property("Source Text");  // "ADBE Text Document"
var doc = srcProp.value;   // 현재 TextDocument 읽기
// ... doc 속성 수정 ...
srcProp.setValue(doc);     // 반드시 setValue로 적용
```

## 문자 스타일 프로퍼티

```javascript
// 폰트
doc.font = "ArialMT";             // PostScript 폰트 이름
doc.fontSize = 72;                // 크기 (px, 0.1~1296)
doc.fontFamily;                   // ← read-only (참조만)
doc.fontStyle;                    // ← read-only (참조만)

// 색상
doc.fillColor = [1, 1, 1];        // RGB 0~1 (흰색)
doc.strokeColor = [0, 0, 0];      // RGB 0~1 (검정)
doc.strokeWidth = 2;              // 두께 (px)
doc.applyFill = true;             // Fill 표시 여부
doc.applyStroke = false;          // Stroke 표시 여부
doc.strokeOverFill = true;        // true = Stroke가 Fill 위에

// ⚠️ 주의: applyFill = false 상태에서 fillColor 읽으면 에러!
if (doc.applyFill) {
    var c = doc.fillColor;
}

// 스타일
doc.fauxBold = false;
doc.fauxItalic = false;
doc.allCaps = false;
doc.smallCaps = false;
doc.underline = false;
doc.strikethrough = false;        // (AE 버전 따라 없을 수 있음)

// 변형
doc.horizontalScale = 100;        // 수평 스케일 %
doc.verticalScale = 100;          // 수직 스케일 %
doc.baselineShift = 0;            // 베이스라인 이동 (px)

// 자간
doc.tracking = 0;                 // 자간 (1/1000 em 단위)
doc.kerning = 0;                  // 개별 자간
```

## 단락 스타일 프로퍼티

```javascript
// 정렬
doc.justification = ParagraphJustification.LEFT_JUSTIFY;
doc.justification = ParagraphJustification.CENTER_JUSTIFY;
doc.justification = ParagraphJustification.RIGHT_JUSTIFY;
doc.justification = ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT;

// 행간
doc.leading = 80;                 // 행간 (px, autoLeading이 false일 때)
doc.autoLeading = true;           // 자동 행간

// 들여쓰기/여백
doc.startIndent = 0;
doc.endIndent = 0;
doc.firstLineIndent = 0;
doc.spaceBefore = 0;
doc.spaceAfter = 0;
```

## 박스 텍스트 프로퍼티

```javascript
doc.boxText = true;               // 단락 텍스트 여부 (read-only, addBoxText로만 생성)
doc.pointText = true;             // 포인트 텍스트 여부 (read-only)
doc.boxTextSize = [400, 200];     // 박스 크기 [width, height]
doc.boxTextPos = [0, 0];          // 앵커 기준 위치
```

## 텍스트 내용

```javascript
doc.text = "새 텍스트";           // 텍스트 문자열
```

## 메서드

```javascript
doc.resetCharStyle()    // 기본 문자 스타일로 초기화
doc.resetParagraphStyle()  // 기본 단락 스타일로 초기화

// 범위 접근 (AE 22.0+)
doc.characterRange(start, end)    // CharacterRange 오브젝트 반환
doc.paragraphRange(start, end)    // ParagraphRange 오브젝트 반환
doc.composedLineRange(start, end) // ComposedLineRange 오브젝트 반환
```

## ⚠️ 혼합 스타일 주의사항

```javascript
// 문자별 크기가 다르면 fontSize 읽으면 undefined 반환
var doc = srcProp.value;
var sz = doc.fontSize;   // 혼합 스타일이면 undefined → 직접 쓰기는 OK

// 안전한 쓰기 패턴 (먼저 쓰고 읽기)
doc.fontSize = 100;      // 전체 동일 크기로 설정
srcProp.setValue(doc);
// 이제 다시 읽으면 100
```

## 완전한 텍스트 레이어 생성 예시

```javascript
var comp = app.project.activeItem;
var tl = comp.layers.addText("HELLO");
var src = tl.property("Source Text");
var doc = src.value;

// 스타일 설정
doc.fontSize = 120;
doc.font = "Arial-BoldMT";
doc.fillColor = [1, 1, 1];
doc.applyFill = true;
doc.applyStroke = false;
doc.justification = ParagraphJustification.CENTER_JUSTIFY;
doc.tracking = 50;
src.setValue(doc);  // ← 반드시 setValue 먼저

// 앵커포인트 보정 (setValue 후 호출)
var rect = tl.sourceRectAtTime(0, false);
tl.transform.anchorPoint.setValue([
    rect.left + rect.width  / 2,
    rect.top  + rect.height / 2
]);

// 위치 설정 (앵커 보정 후)
tl.transform.position.setValue([comp.width / 2, comp.height / 2]);

// Scale 애니메이션
var scale = tl.transform.scale;
scale.setValueAtTime(0, [0, 0]);
scale.setValueAtTime(0.5, [100, 100]);
easeKeys(scale);  // TwoD → 배열 2개 자동 처리
```
