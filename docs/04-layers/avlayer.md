# AVLayer 오브젝트

출처: https://ae-scripting.docsforadobe.dev/layer/avlayer/

Layer를 상속. TextLayer, ShapeLayer, CameraLayer, LightLayer는 모두 AVLayer를 상속.

## 주요 프로퍼티

```javascript
// 오디오/비디오
layer.hasAudio          // 오디오 컴포넌트 존재 여부 (read-only)
layer.audioEnabled      // 오디오 활성화 (audio toggle switch) (boolean)
layer.hasTrackMatte     // 트랙 매트 사용 여부 (AE 23.0+ 순서 독립, read-only)

// 모션
layer.motionBlur        // 모션 블러 활성화 (boolean)
layer.timeRemapEnabled  // 타임 리맵 활성화 (boolean, read/write)

// 레이어 타입
layer.adjustmentLayer   // 조정 레이어 여부 (boolean)
layer.threeDLayer        // 3D 레이어 여부 (boolean)
layer.collapseTransformation  // 컬랩스 트랜스폼 여부 (boolean)
layer.guideLayer         // 가이드 레이어 여부 (boolean)

// 블렌딩
layer.blendingMode      // BlendingMode enum (read/write)
layer.effectsActive     // 이펙트 활성화 여부 (boolean)

// 트랙 매트
layer.trackMatteType    // TrackMatteType enum
// NO_TRACK_MATTE, ALPHA, ALPHA_INVERTED, LUMA, LUMA_INVERTED

// 소스
layer.source            // AVItem 소스 오브젝트 (read-only)
// layer.source instanceof CompItem → 프리컴
// layer.source instanceof FootageItem → 푸티지
```

## 주요 메서드

```javascript
// 소스 교체
layer.replaceSource(newAVItem, fixExpressions)
// fixExpressions: expression 레퍼런스 자동 수정 여부 (boolean)

// 레이어 경계 박스
layer.sourceRectAtTime(timeT, includeExtents)
// → { top, left, width, height } — 레이어 내부 좌표
// includeExtents: stroke/effect 포함 여부 (보통 false)
// ⚠️ 텍스트 레이어는 addText 후 setValue 완료 후 호출해야 정확

// 트랙 매트 설정 (AE 23.0+)
layer.setTrackMatte(matteLayer, matteType)
// matteLayer: 매트로 쓸 Layer 오브젝트 (null이면 제거)
// matteType: TrackMatteType enum
layer.removeTrackMatte()  // 매트 제거

// 타임 리맵
layer.timeRemapEnabled = true;
// 이후 layer.timeRemap Property에 키프레임 추가 가능
```

## Effects 접근

```javascript
// 이펙트 추가
var fx = layer.property("Effects").addProperty("ADBE Gaussian Blur 2");
// 또는 match name 직접 사용

// 이펙트 프로퍼티 접근
fx.property("Blurriness").setValue(20);
fx.property("Blurriness").setValueAtTime(0, 0);
fx.property("Blurriness").setValueAtTime(1, 30);

// 이펙트 찾기
var fx = layer.effect("Gaussian Blur");
var fx = layer.property("Effects").property("Gaussian Blur");
var fx = layer.property("Effects").property(1);  // 1-based

// 이펙트 활성화/비활성화
fx.enabled = false;

// 이펙트 삭제
fx.remove();
```

## Masks 접근

```javascript
var masks = layer.property("Masks");  // "ADBE Mask Parade"
var mask = masks.addProperty("Mask");

// 마스크 경로 설정
var shape = new Shape();
shape.vertices = [[0,0], [100,0], [100,100], [0,100]];
shape.inTangents = [[0,0], [0,0], [0,0], [0,0]];
shape.outTangents = [[0,0], [0,0], [0,0], [0,0]];
shape.closed = true;
mask.property("Mask Path").setValue(shape);

// 마스크 설정
mask.property("Mask Feather").setValue([10, 10]);
mask.property("Mask Opacity").setValue(80);
mask.property("Mask Expansion").setValue(5);
mask.inverted = true;
mask.maskMode = MaskMode.ADD;  // ADD, SUBTRACT, INTERSECT, NONE, DARKEN, LIGHTEN, DIFFERENCE
```

## 블렌딩 모드 빠른 참조

```javascript
layer.blendingMode = BlendingMode.NORMAL;
layer.blendingMode = BlendingMode.MULTIPLY;
layer.blendingMode = BlendingMode.SCREEN;
layer.blendingMode = BlendingMode.OVERLAY;
layer.blendingMode = BlendingMode.ADD;
layer.blendingMode = BlendingMode.DARKEN;
layer.blendingMode = BlendingMode.LIGHTEN;
layer.blendingMode = BlendingMode.COLOR_DODGE;
layer.blendingMode = BlendingMode.COLOR_BURN;
layer.blendingMode = BlendingMode.HARD_LIGHT;
layer.blendingMode = BlendingMode.SOFT_LIGHT;
layer.blendingMode = BlendingMode.DIFFERENCE;
layer.blendingMode = BlendingMode.EXCLUSION;
layer.blendingMode = BlendingMode.HUE;
layer.blendingMode = BlendingMode.SATURATION;
layer.blendingMode = BlendingMode.COLOR;
layer.blendingMode = BlendingMode.LUMINOSITY;
```
