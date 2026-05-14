# Layer 오브젝트 (기본 레이어)

출처: https://ae-scripting.docsforadobe.dev/layer/layer/

모든 레이어 타입(AVLayer, TextLayer, ShapeLayer, CameraLayer, LightLayer)의 기반 클래스.

## 핵심 프로퍼티

```javascript
layer.name          // 레이어 이름 (read/write string)
layer.index         // 레이어 순서 (1-based, read-only)
layer.id            // 고유 ID (AE 22.0+, read-only)
layer.inPoint       // In Point (초, read/write)
layer.outPoint      // Out Point (초, read/write)
layer.startTime     // 레이어 시작 시간 (초, read/write)
layer.stretch       // 타임 스트레치 % (read/write)

layer.locked        // 잠금 여부 (boolean)
layer.solo          // 솔로 여부 (boolean)
layer.shy           // Shy 여부 (boolean)
layer.label         // 레이블 색상 (0~16 정수)

layer.nullLayer     // 널 레이어 여부 (read-only boolean)
layer.hasVideo      // 비디오 스위치 존재 여부 (read-only)
layer.parent        // 부모 레이어 또는 null (read/write)

layer.containingComp    // 이 레이어가 속한 CompItem (read-only)
layer.selectedProperties // 선택된 프로퍼티 배열 (read-only)

layer.marker        // Marker PropertyGroup
layer.time          // 현재 시간 (초, read-only)

layer.autoOrient    // AutoOrientType enum
layer.comment       // 주석 텍스트 (read/write string)
layer.isNameSet     // 이름이 명시적으로 설정됐는지 (read-only boolean)
```

## 메서드

```javascript
// 복제
layer.duplicate()           // → 동일한 Layer 반환

// 이동
layer.copyToComp(intoComp)  // 다른 컴프로 복사
layer.moveToBeginning()     // 스택 최상단으로
layer.moveToEnd()           // 스택 최하단으로
layer.moveBefore(other)     // other 바로 위로
layer.moveAfter(other)      // other 바로 아래로

// 조건 검사
layer.activeAtTime(time)    // 해당 시간에 활성 여부 → boolean

// 삭제
layer.remove()              // 레이어 삭제

// 부모 설정
layer.setParentWithJump(newParent)  // 트랜스폼 값 유지하며 부모 설정

// 프리셋
layer.applyPreset(presetName)  // 애니메이션 프리셋 적용 (string)

// Scene Edit Detection (AE 22.3+)
layer.doSceneEditDetection(applyOptions)  // → 편집 감지 시간 배열 반환
```

## Transform 접근 패턴

```javascript
var tf = layer.transform;

// 값 설정
tf.position.setValue([960, 540]);
tf.scale.setValue([100, 100]);          // 2D: [x, y]
tf.rotation.setValue(45);
tf.opacity.setValue(80);
tf.anchorPoint.setValue([0, 0]);

// 키프레임
tf.position.setValueAtTime(0, [0, 540]);
tf.position.setValueAtTime(2, [1920, 540]);

// 3D 레이어
layer.threeDLayer = true;
tf.position.setValue([960, 540, 0]);    // 3D: [x, y, z]
tf.scale.setValue([100, 100, 100]);     // 3D: [x, y, z]
tf.orientation.setValue([0, 0, 0]);
tf.xRotation.setValue(30);
tf.yRotation.setValue(45);
tf.zRotation.setValue(0);
```

## 레이어 타입 판별

```javascript
if (layer instanceof TextLayer)   { /* 텍스트 레이어 */ }
if (layer instanceof ShapeLayer)  { /* 셰이프 레이어 */ }
if (layer instanceof CameraLayer) { /* 카메라 레이어 */ }
if (layer instanceof LightLayer)  { /* 라이트 레이어 */ }
if (layer instanceof AVLayer) {
    if (layer.nullLayer)                          { /* 널 레이어 */ }
    else if (layer.source instanceof CompItem)    { /* 프리컴 레이어 */ }
    else                                          { /* 일반 푸티지 레이어 */ }
}
```

## 마커

```javascript
// 마커 추가
var marker = new MarkerValue("메모 텍스트");
marker.duration = 1.0;  // 마커 길이(초)
layer.marker.setValueAtTime(2.0, marker);

// 마커 읽기
var numMarkers = layer.marker.numKeys;
for (var i = 1; i <= numMarkers; i++) {
    var t = layer.marker.keyTime(i);
    var v = layer.marker.keyValue(i);
    writeLn(t + ": " + v.comment);
}
```

## In/Out Point 설정

```javascript
layer.inPoint = 0;
layer.outPoint = comp.duration;  // 컴프 전체 길이만큼

// 특정 구간만 표시
layer.inPoint = 1.0;    // 1초에서 시작
layer.outPoint = 4.0;   // 4초에서 끝
```
