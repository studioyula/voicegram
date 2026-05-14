# CameraLayer / LightLayer 오브젝트

출처: https://ae-scripting.docsforadobe.dev/layer/cameralayer/
출처: https://ae-scripting.docsforadobe.dev/layer/lightlayer/

---

## CameraLayer

Layer → CameraLayer (AVLayer를 거치지 않음)
`comp.layers.addCamera(name, centerPoint)` 로 생성.

### 생성

```javascript
var camera = comp.layers.addCamera("Camera 1", [960, 540]);
// centerPoint: Point of Interest 초기값 [x, y]

// 3D 컴프에서만 의미 있음
// 카메라가 없으면 AE는 기본 카메라를 사용함
```

### 카메라 옵션 (Camera Options)

```javascript
var opts = camera.property("Camera Options");  // "ADBE Camera Options Group"

opts.property("Zoom").setValue(1000);                    // 줌 (px)
opts.property("Depth of Field").setValue(1);             // 0=Off, 1=On
opts.property("Focus Distance").setValue(1000);          // 포커스 거리 (px)
opts.property("Aperture").setValue(80);                  // 조리개 크기
opts.property("Blur Level").setValue(100);               // 블러 강도 %
opts.property("Iris Shape").setValue(1);                 // 조리개 모양
opts.property("Iris Rotation").setValue(0);
opts.property("Iris Roundness").setValue(0);
```

### Transform

```javascript
var tf = camera.transform;
tf.position.setValue([960, 540, -1800]);        // 3D 위치
// ⚠️ 카메라 position은 [x, y, z] 3D 값
// z 축 음수 = 화면 앞으로 이동, 양수 = 뒤로

// Point of Interest (카메라가 바라보는 지점)
tf.pointOfInterest.setValue([960, 540, 0]);     // 컴프 중앙 기본
```

---

## LightLayer

Layer → LightLayer (AVLayer를 거치지 않음)
`comp.layers.addLight(name, centerPoint)` 로 생성.

### 생성

```javascript
var light = comp.layers.addLight("Light 1", [960, 540]);
// 기본 타입: Spot Light
```

### 라이트 타입

```javascript
light.lightType = LightType.SPOT;       // 스팟 라이트
light.lightType = LightType.PARALLEL;   // 평행광
light.lightType = LightType.POINT;      // 포인트 라이트
light.lightType = LightType.AMBIENT;    // 앰비언트 라이트
light.lightType = LightType.ENVIRONMENT; // 환경광 (AE 24.3+)
```

### 라이트 옵션 (Light Options)

```javascript
var opts = light.property("Light Options");  // "ADBE Light Options Group"

opts.property("Intensity").setValue(100);           // 강도 %
opts.property("Color").setValue([1, 1, 0.8]);       // 색상 RGB 0~1
opts.property("Cone Angle").setValue(90);           // 원뿔 각도 (Spot만)
opts.property("Cone Feather").setValue(50);         // 원뿔 페더 % (Spot만)

// Falloff
opts.property("Falloff").setValue(1);               // 0=None, 1=Smooth, 2=Inverse Square
opts.property("Radius").setValue(500);              // 반경
opts.property("Falloff Distance").setValue(500);

// 그림자
opts.property("Shadow Darkness").setValue(50);      // 그림자 어두움 %
opts.property("Shadow Diffusion").setValue(10);     // 그림자 확산
```

### 환경광 소스 (AE 24.3+)

```javascript
// ENVIRONMENT 타입 라이트에서 소스 레이어 지정
light.lightType = LightType.ENVIRONMENT;
light.lightSource = comp.layer("BG");  // 2D 레이어만 가능 (3D 불가)
```
