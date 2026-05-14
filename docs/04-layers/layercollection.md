# LayerCollection — 레이어 생성 메서드

출처: https://ae-scripting.docsforadobe.dev/layer/layercollection/

`comp.layers` 로 접근. 레이어 생성, 검색, 프리컴 기능 제공.

## 레이어 생성 메서드

### 셰이프 레이어

```javascript
var shapeLayer = comp.layers.addShape();
// → 빈 ShapeLayer 생성. 파라미터 없음.
// → 콘텐츠는 addProperty()로 직접 추가해야 함.
shapeLayer.name = "My Shape";
```

### 텍스트 레이어

```javascript
var textLayer = comp.layers.addText();
// → 빈 포인트 텍스트 레이어 (가로)

var textLayer = comp.layers.addText("Hello World");
// → 초기 텍스트 포함 포인트 텍스트 레이어

var textLayer = comp.layers.addBoxText([400, 200]);
// → 박스(단락) 텍스트 레이어. [width, height] 배열 필수.

// AE 24.2+
var textLayer = comp.layers.addVerticalText("세로 텍스트");
var textLayer = comp.layers.addVerticalBoxText([200, 400]);
```

### 카메라 레이어

```javascript
var camera = comp.layers.addCamera("Camera 1", [960, 540]);
// → name: 카메라 이름
// → centerPoint: 컴프 내 [x, y] 포인트 (Point of Interest 초기값)
```

### 라이트 레이어

```javascript
var light = comp.layers.addLight("Light 1", [960, 540]);
// → name: 라이트 이름
// → centerPoint: 컴프 내 [x, y] 포인트
```

### 널 레이어

```javascript
var nullLayer = comp.layers.addNull();
var nullLayer = comp.layers.addNull(5.0);
// → duration(초) 선택적. 기본값은 컴프 길이.
// → AVLayer 오브젝트 반환. nullLayer.nullLayer === true
```

### 솔리드 레이어

```javascript
var solid = comp.layers.addSolid(
    [1, 0, 0],       // color: [R, G, B] 0~1 범위
    "Red Solid",     // name
    1920,            // width (px)
    1080,            // height (px)
    1.0,             // pixelAspect
    10.0             // duration(초) — 선택적
);
```

### 기존 아이템으로 레이어 추가

```javascript
var layer = comp.layers.add(avItem);
// → FootageItem, CompItem 등을 레이어로 추가

var layer = comp.layers.add(avItem, 5.0);
// → duration(초) 지정 (Still 푸티지에 유용)
```

## 레이어 검색

```javascript
comp.layers.byName("LayerName")
// → 이름 일치하는 첫 번째 레이어 반환. 없으면 null.
// comp.layer("name")과 동일
```

## 프리컴

```javascript
comp.layers.precompose(
    [1, 2, 3],        // layerIndices: 1-based 인덱스 배열
    "Precomp Name",   // 새 컴프 이름
    true              // moveAllAttributes: true = 변환 속성도 이동
);
// → 새로운 CompItem 반환
```

## 레이어 순서 (index)

```javascript
// 레이어는 1-based index. 1 = 최상단.
comp.layers.length  // 총 레이어 수

// 특정 위치로 이동
layer.moveToBeginning()   // 최상단 (index 1)
layer.moveToEnd()         // 최하단
layer.moveBefore(other)   // other 바로 위
layer.moveAfter(other)    // other 바로 아래
```

## 완전한 셰이프 레이어 생성 예시

```javascript
var comp = app.project.activeItem;
var layer = comp.layers.addShape();
layer.name = "Circle";

// Contents 그룹 접근
var contents = layer.property("Contents");  // "ADBE Root Vectors Group"

// 그룹 추가
var group = contents.addProperty("ADBE Vector Group");
group.name = "Circle Group";

// 타원 셰이프 추가
var ellipse = group.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
ellipse.property("Size").setValue([200, 200]);

// Fill 추가
var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
fill.property("Color").setValue([0.2, 0.6, 1.0, 1.0]);  // RGBA 0~1

// 위치 설정
layer.transform.position.setValue([960, 540]);
```
