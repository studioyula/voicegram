# 모션그래픽 패턴 모음

자주 쓰는 AE 모션그래픽 구현 패턴. 모두 ExtendScript ES3 기준.

---

## 1. 기본 애니메이션 — 위치 이동

```javascript
var comp = app.project.activeItem;
var layer = comp.layer("Box");
var cx = comp.width / 2;
var cy = comp.height / 2;

// 왼쪽에서 중앙으로 슬라이드 인
var pos = layer.transform.position;
pos.setValueAtTime(0, [cx - 500, cy]);   // 왼쪽 시작
pos.setValueAtTime(0.5, [cx, cy]);       // 중앙 도착
easeKeys(pos);                           // Ease In/Out
```

## 2. 스케일 팝업 (Scale Pop)

```javascript
var scale = layer.transform.scale;
scale.setValueAtTime(0, [0, 0]);
scale.setValueAtTime(0.3, [110, 110]);   // 살짝 오버슈트
scale.setValueAtTime(0.4, [100, 100]);   // 정착
easeKeys(scale);                         // TwoD → 배열 2개 자동 처리
```

## 3. Fade In/Out

```javascript
var opacity = layer.transform.opacity;
opacity.setValueAtTime(0, 0);
opacity.setValueAtTime(0.5, 100);
// Fade Out
opacity.setValueAtTime(comp.duration - 0.5, 100);
opacity.setValueAtTime(comp.duration, 0);
easeKeys(opacity);
```

## 4. 차원 분리 — 수평 이동 + 수직 바운스

```javascript
var pos = layer.transform.position;
pos.dimensionsSeparated = true;
var xProp = layer.transform.property("X Position");
var yProp = layer.transform.property("Y Position");

var FLOOR_Y = comp.height * 0.8;
var APEX_Y  = comp.height * 0.2;

// X: 선형 이동 (전체 시간)
xProp.setValueAtTime(0, 0);
xProp.setValueAtTime(comp.duration, comp.width);
xProp.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
xProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);

// Y: 반복 바운스 (1회 예시)
yProp.setValueAtTime(0, FLOOR_Y);
yProp.setValueAtTime(comp.duration * 0.5, APEX_Y);
yProp.setValueAtTime(comp.duration, FLOOR_Y);
// Y는 BEZIER로 이징
easeKeys(yProp);
```

## 5. 텍스트 마스크 리빌 (maskReveal)

```javascript
// motion.jsx 자동 주입 함수 사용
var comp = app.project.activeItem;
var textLayer = comp.layer("Title");

maskReveal(comp, textLayer, {
    dir: "up",       // "up" = 아래서 위로 등장
    dur: 0.4,        // 애니메이션 길이 (초)
    delay: 0,        // 시작 딜레이
    infl: 80,        // 이징 influence
    slide: 280,      // 슬라이드 거리 (px)
    matteW: 200,
    matteH: 300
});

// 전체 텍스트 레이어 자동 리빌
revealAllTextLayers(comp, {
    dir: "up",
    dur: 0.35,
    maxStagger: 0.8,
    seed: 42
});
```

## 6. Trim Paths 드로잉 애니메이션

```javascript
var comp = app.project.activeItem;
var layer = comp.layers.addShape();
layer.name = "Line Draw";

var contents = layer.property("Contents");
var group = contents.addProperty("ADBE Vector Group");

// 패스 추가
var pathGroup = group.property("Contents").addProperty("ADBE Vector Shape - Group");
var shape = new Shape();
shape.vertices = [[0, 0], [500, 0], [500, 300]];
shape.inTangents = [[0,0],[0,0],[0,0]];
shape.outTangents = [[0,0],[0,0],[0,0]];
shape.closed = false;
pathGroup.property("Path").setValue(shape);

// Stroke
var stroke = group.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
stroke.property("Color").setValue([1, 1, 1, 1]);
stroke.property("Stroke Width").setValue(3);
stroke.property("Line Cap").setValue(2);   // Round Cap

// Trim Paths (레이어 Contents에 추가 — 그룹 밖)
var trim = contents.addProperty("ADBE Vector Filter - Trim");
trim.property("End").setValueAtTime(0, 0);
trim.property("End").setValueAtTime(1.5, 100);
easeKeys(trim.property("End"));
```

## 7. 반복 도형 — Repeater

```javascript
var layer = comp.layers.addShape();
var contents = layer.property("Contents");
var group = contents.addProperty("ADBE Vector Group");

// 기본 원
var ellipse = group.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
ellipse.property("Size").setValue([30, 30]);

var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
fill.property("Color").setValue([1, 1, 1, 1]);

// Repeater
var repeater = group.property("Contents").addProperty("ADBE Vector Filter - Repeater");
repeater.property("Copies").setValue(8);
repeater.property("Offset").setValue(0);
var repTf = repeater.property("Transform");
repTf.property("Position").setValue([60, 0]);  // 60px 간격

// 스태거 (Offset 애니메이션으로 흘러가는 효과)
var offset = repeater.property("Offset");
setExpr(offset, "time * 2");  // 초당 2 offset 이동
```

## 8. 랜덤 스태거

```javascript
// staggerRandom 헬퍼 (motion.jsx)
var delays = staggerRandom(5, 1.2, 42);  // 5개 레이어, 최대 1.2초, seed=42
// → [0.34, 0.82, 0.06, 1.1, 0.55] 같은 재현 가능한 배열

for (var i = 1; i <= 5; i++) {
    var layer = comp.layer(i);
    var delay = delays[i - 1];
    var scale = layer.transform.scale;
    scale.setValueAtTime(delay, [0, 0]);
    scale.setValueAtTime(delay + 0.3, [100, 100]);
    easeKeys(scale);
}
```

## 9. 루프 Expression

```javascript
// 키프레임 루프
setExpr(layer.transform.rotation, 'loopOut("cycle")');
setExpr(layer.transform.position, 'loopOut("pingpong")');

// Wiggle
setExpr(layer.transform.position, "p = position; [p[0] + wiggle(2,10)[0], p[1]]");
// 또는
setExpr(layer.transform.position, "wiggle(3, 50)");

// 지속 회전 (RPM)
setExpr(layer.transform.rotation, "time * 120");  // 초당 120도

// 타이밍 오프셋 (index 기반 스태거)
setExpr(layer.transform.opacity,
    "delay = index * 0.1; t = time - delay; t > 0 ? 100 : 0"
);
```

## 10. 컨트롤 레이어 패턴 (Null + Slider)

```javascript
// 컨트롤 레이어 생성
var ctrl = comp.layers.addNull();
ctrl.name = "CTRL";

// Slider Controls 추가
var speedSlider = ctrl.property("Effects").addProperty("ADBE Slider Control");
speedSlider.name = "Speed";
speedSlider.property("Slider").setValue(1.0);

var scaleSlider = ctrl.property("Effects").addProperty("ADBE Slider Control");
scaleSlider.name = "Scale";
scaleSlider.property("Slider").setValue(100);

// 다른 레이어에서 참조
setExpr(animLayer.transform.scale,
    "s = thisComp.layer('CTRL').effect('Scale')('Slider'); [s, s]"
);
```

## 11. 프리컴 애니메이션

```javascript
// 여러 레이어를 프리컴으로 묶고 전체에 이펙트 적용
var layerIndices = [1, 2, 3];
comp.layers.precompose(layerIndices, "Precomp", true);

// 프리컴 레이어에 이펙트
var precompLayer = comp.layer("Precomp");
var blur = precompLayer.property("Effects").addProperty("ADBE Gaussian Blur 2");
blur.property("Blurriness").setValueAtTime(0, 30);
blur.property("Blurriness").setValueAtTime(0.5, 0);
easeKey(blur.property("Blurriness"), 1);
easeKey(blur.property("Blurriness"), 2);
```

## 12. 카메라 줌 인 (3D 컴프)

```javascript
// 레이어들 3D로
for (var i = 1; i <= comp.numLayers; i++) {
    var l = comp.layer(i);
    if (l instanceof AVLayer || l instanceof TextLayer || l instanceof ShapeLayer) {
        l.threeDLayer = true;
    }
}

// 카메라 추가
var camera = comp.layers.addCamera("Camera", [comp.width/2, comp.height/2]);
var camPos = camera.transform.position;

// 줌 인: Z축 이동 (음수 = 앞으로)
camPos.setValueAtTime(0, [comp.width/2, comp.height/2, -2000]);
camPos.setValueAtTime(2, [comp.width/2, comp.height/2, -800]);
easeKeys(camPos);
```

## 13. AE 좌표계 주요 값 (1920x1080 기준)

```javascript
var W = comp.width;   // 1920
var H = comp.height;  // 1080
var cx = W / 2;       // 960  (수평 중앙)
var cy = H / 2;       // 540  (수직 중앙)

// 화면 밖 위치 (Slide 용도)
var ABOVE_SCREEN = cy - H;       // 화면 위 바깥
var BELOW_SCREEN = cy + H;       // 화면 아래 바깥
var LEFT_SCREEN  = cx - W;       // 화면 왼쪽 바깥
var RIGHT_SCREEN = cx + W;       // 화면 오른쪽 바깥

// Y축: 값이 작을수록 화면 위, 클수록 화면 아래
// "아래서 위로 슬라이드":
// start = [cx, cy + 300], end = [cx, cy]

// "위에서 아래로 슬라이드":
// start = [cx, cy - 300], end = [cx, cy]
```
