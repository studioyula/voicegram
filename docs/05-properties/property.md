# Property 오브젝트 (키프레임 & 이징)

출처: https://ae-scripting.docsforadobe.dev/property/property/

PropertyBase → Property

## 핵심 프로퍼티

```javascript
prop.value              // 현재 값 (read-only, 시간에 따라 변함)
prop.expression         // Expression 문자열 (read/write)
prop.expressionEnabled  // Expression 활성화 여부 (boolean)
prop.expressionError    // Expression 에러 메시지 (read-only string)

prop.propertyValueType  // PropertyValueType enum (read-only)
prop.numKeys            // 키프레임 수 (read-only)
prop.canVaryOverTime    // 키프레임/expression 가능 여부
prop.isTimeVarying      // 키프레임 있거나 expression 활성화됨
prop.isSpatial          // Spatial 프로퍼티 여부 (position 등)

prop.minValue           // 최솟값 (read-only)
prop.maxValue           // 최댓값 (read-only)
prop.unitsText          // 단위 텍스트 (read-only)

// 차원 분리
prop.isSeparationLeader   // 분리 가능한 다차원 프로퍼티
prop.dimensionsSeparated  // 차원 분리 여부 (boolean, read/write)
prop.isSeparationFollower // 분리된 차원 프로퍼티 (X/Y Position 등)
prop.separationDimension  // 어느 차원인지 (0=X, 1=Y, 2=Z, read-only)
```

## 값 설정

```javascript
prop.setValue(newValue)                     // 정적 값 설정 (키프레임 제거)
prop.setValueAtTime(time, newValue)         // 특정 시간에 키프레임 추가
prop.setValueAtKey(keyIndex, newValue)      // 기존 키프레임 값 변경
prop.setValuesAtTimes([t1,t2], [v1,v2])    // 여러 키프레임 일괄 추가

prop.valueAtTime(time, preExpression)       // 특정 시간의 값 읽기
```

## 키프레임 관리

```javascript
prop.addKey(time)           // 키프레임 추가 → keyIndex 반환
prop.removeKey(keyIndex)    // 키프레임 삭제 (1-based)
prop.nearestKeyIndex(time)  // 가장 가까운 키프레임 index 반환

prop.keyTime(keyIndex)      // 키프레임 시간(초)
prop.keyValue(keyIndex)     // 키프레임 값
prop.keySelected(keyIndex)  // 선택 여부
prop.setSelectedAtKey(keyIndex, onOff)  // 선택/해제

prop.selectedKeys           // 선택된 키프레임 index 배열
```

## 보간 타입

```javascript
prop.keyInInterpolationType(keyIndex)
prop.keyOutInterpolationType(keyIndex)
// → KeyframeInterpolationType enum 반환

prop.setInterpolationTypeAtKey(keyIndex, inType, outType)
// inType, outType: KeyframeInterpolationType.LINEAR / BEZIER / HOLD

// ✅ 존재하는 값만 사용
// LINEAR, BEZIER, HOLD
// ❌ AUTO_BEZIER, CONTINUOUS_BEZIER — 존재하지 않음!

// 예시
prop.setInterpolationTypeAtKey(1,
    KeyframeInterpolationType.LINEAR,
    KeyframeInterpolationType.LINEAR
);
```

## 이징 (Temporal Ease) — ⚠️ 배열 크기 매우 중요

### setTemporalEaseAtKey 배열 크기 규칙

| PropertyValueType | 대표 프로퍼티 | 배열 크기 |
|-------------------|-------------|---------|
| `TwoD_SPATIAL`    | Position 2D, AnchorPoint 2D | **1개** |
| `ThreeD_SPATIAL`  | Position 3D | **1개** |
| `OneD`            | Rotation, Opacity | **1개** |
| `TwoD`            | Scale 2D | **2개** |
| `ThreeD`          | Scale 3D | **3개** |

```javascript
// OneD, TwoD_SPATIAL, ThreeD_SPATIAL → 배열 1개
prop.setTemporalEaseAtKey(1,
    [new KeyframeEase(0, 80)],
    [new KeyframeEase(0, 80)]
);

// TwoD (Scale 2D) → 배열 2개
scale2D.setTemporalEaseAtKey(1,
    [new KeyframeEase(0, 80), new KeyframeEase(0, 80)],
    [new KeyframeEase(0, 80), new KeyframeEase(0, 80)]
);

// ThreeD (Scale 3D) → 배열 3개
scale3D.setTemporalEaseAtKey(1,
    [new KeyframeEase(0, 80), new KeyframeEase(0, 80), new KeyframeEase(0, 80)],
    [new KeyframeEase(0, 80), new KeyframeEase(0, 80), new KeyframeEase(0, 80)]
);
```

> **왜 SPATIAL은 1개인가?**
> Spatial 프로퍼티(position 등)는 공간 이동 경로 전체의 속도를 단일값으로 제어.
> Scale 같은 비공간 다차원 프로퍼티는 각 축(X/Y/Z)을 독립 제어 → 차원 수만큼.

### 안전한 방법: motion.jsx의 easeKeys 사용

```javascript
// propertyValueType 자동 감지 → 올바른 배열 크기로 처리
easeKeys(prop);              // 기본 80/80
easeKeys(prop, 60, 90);      // 커스텀 in/out influence
easeKey(prop, 2, 80, 80);    // 특정 키프레임만
```

## Temporal Continuous / Auto Bezier

```javascript
prop.keyTemporalAutoBezier(keyIndex)   // Auto Bezier 여부
prop.setTemporalAutoBezierAtKey(keyIndex, newVal)

prop.keyTemporalContinuous(keyIndex)   // Continuous Bezier 여부
prop.setTemporalContinuousAtKey(keyIndex, newVal)
```

## Spatial Tangent (공간 핸들)

```javascript
// isSpatial이 true인 프로퍼티만 사용 가능
prop.keyInSpatialTangent(keyIndex)     // → [x, y] 또는 [x, y, z]
prop.keyOutSpatialTangent(keyIndex)

prop.setSpatialTangentsAtKey(keyIndex, inTangent, outTangent)
// 예: 직선 이동 (tangent를 0으로)
prop.setSpatialTangentsAtKey(1, [0,0], [0,0]);

prop.keySpatialAutoBezier(keyIndex)
prop.setSpatialAutoBezierAtKey(keyIndex, newVal)
prop.keySpatialContinuous(keyIndex)
prop.setSpatialContinuousAtKey(keyIndex, newVal)

// Roving (속도 자동 계산)
prop.keyRoving(keyIndex)
prop.setRovingAtKey(keyIndex, newVal)
```

## 차원 분리 (dimensionsSeparated)

```javascript
var pos = layer.transform.position;
pos.dimensionsSeparated = true;

// ← 반드시 설정 후에 fetch (getSeparationFollower는 없음!)
var xProp = layer.transform.property("X Position");
var yProp = layer.transform.property("Y Position");
var zProp = layer.transform.property("Z Position");  // 3D만

xProp.setValueAtTime(0, 0);
xProp.setValueAtTime(2, 1920);
xProp.setInterpolationTypeAtKey(1,
    KeyframeInterpolationType.LINEAR,
    KeyframeInterpolationType.LINEAR
);
```

## Expression

```javascript
prop.expression = 'loopOut("cycle")';
prop.expressionEnabled = true;

// ✅ setExpr 헬퍼 사용 (wrapScript 자동 주입 — execute-script 환경)
setExpr(prop, 'loopOut("cycle")');  // 에러 자동 감지

// 주요 Expression 패턴
'loopOut("cycle")'
'loopOut("pingpong")'
'wiggle(2, 50)'
'value + wiggle(2, 10)'
'[thisComp.width/2, thisComp.height/2]'
'thisComp.layer("Ctrl").transform.position'
'time * 360'   // 초당 360도 회전
```

## Keyframe Label (AE 22.6+)

```javascript
prop.keyLabel(keyIndex)                  // 레이블 색상 (read-only)
prop.setLabelAtKey(keyIndex, labelIdx)   // 레이블 색상 설정 (0~16)
```
