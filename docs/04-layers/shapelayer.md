# ShapeLayer 오브젝트

출처: https://ae-scripting.docsforadobe.dev/layer/shapelayer/
출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/shapelayer/

Layer → AVLayer → ShapeLayer 상속.
`comp.layers.addShape()` 로 생성.

## 기본 구조

```
ShapeLayer
└── Contents (ADBE Root Vectors Group)
    └── Group (ADBE Vector Group)
        ├── Contents (ADBE Vectors Group)
        │   ├── [Shape] (Ellipse, Rect, Star, ...)
        │   ├── [Style] (Fill, Stroke, Gradient Fill, ...)
        │   └── [Modifier] (Trim Paths, Repeater, ...)
        └── Transform (ADBE Vector Transform Group)
```

## 완전한 생성 패턴 — 타원

```javascript
var comp = app.project.activeItem;
var layer = comp.layers.addShape();
layer.name = "Circle Layer";

var contents = layer.property("Contents");  // ADBE Root Vectors Group

// 그룹 추가
var group = contents.addProperty("ADBE Vector Group");
group.name = "Circle";

// 타원 추가
var ellipse = group.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
ellipse.property("Size").setValue([200, 200]);
ellipse.property("Position").setValue([0, 0]);  // 그룹 중심 기준

// Fill 추가
var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
fill.property("Color").setValue([0.2, 0.6, 1.0, 1.0]);  // RGBA 0~1
fill.property("Opacity").setValue(100);

layer.transform.position.setValue([960, 540]);
```

## 셰이프 종류별 Match Name & 프로퍼티

### 사각형 (Rectangle)
```javascript
var rect = group.property("Contents").addProperty("ADBE Vector Shape - Rect");
rect.property("Size").setValue([300, 200]);
rect.property("Position").setValue([0, 0]);
rect.property("Roundness").setValue(10);  // 모서리 둥글기 (px)
```

### 타원 (Ellipse)
```javascript
var ellipse = group.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
ellipse.property("Size").setValue([200, 200]);  // [w, h]
ellipse.property("Position").setValue([0, 0]);
```

### 폴리곤/별 (Polystar)
```javascript
var star = group.property("Contents").addProperty("ADBE Vector Shape - Star");
star.property("Type").setValue(1);      // 1 = Star, 2 = Polygon
star.property("Points").setValue(5);
star.property("Position").setValue([0, 0]);
star.property("Rotation").setValue(0);
star.property("Outer Radius").setValue(100);
star.property("Inner Radius").setValue(50);   // Star 타입만
star.property("Outer Roundness").setValue(0);
star.property("Inner Roundness").setValue(0); // Star 타입만
```

### 패스 (Path)
```javascript
var pathGroup = group.property("Contents").addProperty("ADBE Vector Shape - Group");
var shape = new Shape();
shape.vertices  = [[0,0], [100,0], [100,100], [0,100]];
shape.inTangents  = [[0,0],[0,0],[0,0],[0,0]];
shape.outTangents = [[0,0],[0,0],[0,0],[0,0]];
shape.closed = true;
pathGroup.property("Path").setValue(shape);
```

## Fill & Stroke

### Fill (단색)
```javascript
var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
fill.property("Color").setValue([1, 0, 0, 1]);     // RGBA
fill.property("Opacity").setValue(100);
fill.property("Fill Rule").setValue(1);  // 1=Non-Zero, 2=Even-Odd
```

### Stroke (외곽선)
```javascript
var stroke = group.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
stroke.property("Color").setValue([0, 0, 0, 1]);
stroke.property("Opacity").setValue(100);
stroke.property("Stroke Width").setValue(4);
stroke.property("Line Cap").setValue(1);  // 1=Butt, 2=Round, 3=Projecting
stroke.property("Line Join").setValue(1); // 1=Miter, 2=Round, 3=Bevel
```

### Gradient Fill
```javascript
var gFill = group.property("Contents").addProperty("ADBE Vector Graphic - G-Fill");
gFill.property("Type").setValue(1);   // 1=Linear, 2=Radial
// 그라디언트 색상 편집은 복잡 — expression이나 UI로 직접 설정 권장
```

## Modifier

### Trim Paths (선 그리기 애니메이션)
```javascript
var trim = layer.property("Contents").addProperty("ADBE Vector Filter - Trim");
// 또는 그룹 Contents에 추가:
// var trim = group.property("Contents").addProperty("ADBE Vector Filter - Trim");
trim.property("Start").setValue(0);
trim.property("End").setValue(100);
trim.property("Offset").setValue(0);
trim.property("Trim Multiple Shapes").setValue(1);  // 1=Simultaneously, 2=Individually

// 애니메이션: End를 0→100
trim.property("End").setValueAtTime(0, 0);
trim.property("End").setValueAtTime(1, 100);
easeKeys(trim.property("End"));
```

### Repeater
```javascript
var repeater = group.property("Contents").addProperty("ADBE Vector Filter - Repeater");
repeater.property("Copies").setValue(5);
repeater.property("Offset").setValue(0);
// Transform 하위: Anchor Point, Position, Scale, Rotation, Start Opacity, End Opacity
var repTf = repeater.property("Transform");
repTf.property("Position").setValue([50, 0]);
repTf.property("Scale").setValue([100, 100]);
repTf.property("Rotation").setValue(72);   // 360 / 5 = 72도씩
```

### Zig Zag
```javascript
var zigzag = group.property("Contents").addProperty("ADBE Vector Filter - Zigzag");
zigzag.property("Size").setValue(10);
zigzag.property("Ridges per segment").setValue(5);
zigzag.property("Points").setValue(1);  // 1=Corner, 2=Smooth
```

## 그룹 Transform

```javascript
// 그룹 자체의 트랜스폼 (레이어 트랜스폼과 별개)
var gTf = group.property("Transform");  // "ADBE Vector Transform Group"
gTf.property("Anchor Point").setValue([0, 0]);    // "ADBE Vector Anchor"
gTf.property("Position").setValue([0, 0]);        // "ADBE Vector Position"
gTf.property("Scale").setValue([100, 100]);       // "ADBE Vector Scale"
gTf.property("Rotation").setValue(0);             // "ADBE Vector Rotation"
gTf.property("Opacity").setValue(100);            // "ADBE Vector Group Opacity"
```
