# KeyframeEase 오브젝트

출처: https://ae-scripting.docsforadobe.dev/other/keyframeease/

## 생성자

```javascript
new KeyframeEase(speed, influence)
// speed:     Float — 키프레임 속도 (Keyframe Velocity 대화상자에 표시)
// influence: Float [0.1 ~ 100.0] — 곡선 영향도
```

## 프로퍼티

```javascript
ease.speed      // 속도 (read/write, float)
ease.influence  // 영향도 0.1~100.0 (read/write, float)
```

## 표준 이징 값

```javascript
// Ease In/Out (부드러운 가감속) — 기본값
new KeyframeEase(0, 33)    // AE 기본 Easy Ease
new KeyframeEase(0, 80)    // motion.jsx 기본값 (더 부드러운 가감속)
new KeyframeEase(0, 100)   // 최대 influence

// Linear (선형)
new KeyframeEase(0, 0)     // 실질적으로 선형에 가까움
// 실제 선형은 setInterpolationTypeAtKey(idx, LINEAR, LINEAR)
```

## 사용 패턴

```javascript
// Ease 오브젝트 한 번만 생성, 여러 번 재사용
var eIn  = new KeyframeEase(0, 80);
var eOut = new KeyframeEase(0, 80);

// OneD / TwoD_SPATIAL / ThreeD_SPATIAL → 배열 1개
prop.setTemporalEaseAtKey(1, [eIn], [eOut]);

// TwoD (Scale 2D) → 배열 2개
scale.setTemporalEaseAtKey(1, [eIn, eIn], [eOut, eOut]);

// ThreeD (Scale 3D) → 배열 3개
scale3d.setTemporalEaseAtKey(1, [eIn, eIn, eIn], [eOut, eOut, eOut]);
```

## 실제 예시 (공식 문서)

```javascript
// Spatial (Position)
var easeIn = new KeyframeEase(0.5, 50);
var easeOut = new KeyframeEase(0.75, 85);
var pos = app.project.item(1).layer(1).property("Position");
pos.setTemporalEaseAtKey(2, [easeIn], [easeOut]);

// Scale 3D
var easeIn = new KeyframeEase(0.5, 50);
var easeOut = new KeyframeEase(0.75, 85);
var scale = app.project.item(1).layer(1).property("Scale");
scale.setTemporalEaseAtKey(2,
    [easeIn, easeIn, easeIn],
    [easeOut, easeOut, easeOut]
);
```

## easeKeys / easeKey 헬퍼 (motion.jsx — 자동 주입)

```javascript
// PropertyValueType 자동 감지 → 올바른 배열 크기로 setTemporalEaseAtKey 처리
easeKeys(prop)                  // 모든 키프레임, 기본 80/80
easeKeys(prop, 60, 90)          // 모든 키프레임, in=60, out=90
easeKey(prop, 2)                // 2번째 키프레임만, 기본 80/80
easeKey(prop, 1, 33, 33)        // 1번째 키프레임, in=33, out=33
```

## PropertyValueType별 배열 크기 요약 (다시 강조)

| Type | 예시 | 배열 크기 |
|------|------|---------|
| OneD | rotation, opacity | **1** |
| TwoD_SPATIAL | position 2D, anchorPoint | **1** |
| ThreeD_SPATIAL | position 3D | **1** |
| TwoD | scale 2D | **2** |
| ThreeD | scale 3D | **3** |

> ⚠️ 크기 틀리면 `"Value array does not have N elements"` 에러.
> 에러 발생 시 AE는 endUndoGroup에서 **전체 롤백** → 모든 변경사항 사라짐.
