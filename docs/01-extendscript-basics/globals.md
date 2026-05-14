# ExtendScript 전역 함수 (Globals)

출처: https://ae-scripting.docsforadobe.dev/general/globals/

## AE 전역 함수

```javascript
// Info 패널 출력
clearOutput()
// Info 패널의 내용을 모두 지운다

write(text)
// 줄바꿈 없이 출력. write("A"); write("B") → "AB"

writeLn(text)
// 줄바꿈 포함 출력. alert() 대신 디버깅에 사용.
```

```javascript
// 시간 변환
currentFormatToTime(formattedTime, fps [, isDuration])
// → 포맷된 시간 문자열을 초(seconds) 숫자로 변환
// 예: currentFormatToTime("00:00:01:00", 30) → 1.0

timeToCurrentFormat(time, fps [, isDuration])
// → 초(seconds)를 포맷된 시간 문자열로 변환
// 예: timeToCurrentFormat(1.0, 30) → "00:00:01:00"
```

```javascript
// 유효성 검사
isValid(obj)
// → true if obj가 여전히 유효한 AE 오브젝트
// 레이어 삭제 후 그 레퍼런스에 쓰면 에러 → 먼저 isValid 확인

// 랜덤 숫자
generateRandomNumber()
// → Math.random() 대신 권장. 0.0 이상 1.0 미만 부동소수점.

// Enum 문자열 변환 (AE 24.0+)
getEnumAsString(enumValue)
// 예: getEnumAsString(BlendingMode.NORMAL) → "BlendingMode.NORMAL"
```

## 전역 열거형 (Enumerations)

### KeyframeInterpolationType
```javascript
KeyframeInterpolationType.LINEAR    // ✅ 존재
KeyframeInterpolationType.BEZIER    // ✅ 존재 (Auto/Continuous도 이걸로 처리)
KeyframeInterpolationType.HOLD      // ✅ 존재

// ❌ 존재하지 않음 — 절대 사용 금지
// KeyframeInterpolationType.AUTO_BEZIER
// KeyframeInterpolationType.CONTINUOUS_BEZIER
// KeyframeInterpolationType.NONE
```

### BlendingMode
```javascript
BlendingMode.NORMAL
BlendingMode.MULTIPLY
BlendingMode.SCREEN
BlendingMode.OVERLAY
BlendingMode.DARKEN
BlendingMode.LIGHTEN
BlendingMode.COLOR_DODGE
BlendingMode.COLOR_BURN
BlendingMode.HARD_LIGHT
BlendingMode.SOFT_LIGHT
BlendingMode.DIFFERENCE
BlendingMode.EXCLUSION
BlendingMode.HUE
BlendingMode.SATURATION
BlendingMode.COLOR
BlendingMode.LUMINOSITY
BlendingMode.ADD
// ... 외 다수 (34+개)
```

### TrackMatteType
```javascript
TrackMatteType.NO_TRACK_MATTE
TrackMatteType.ALPHA
TrackMatteType.ALPHA_INVERTED
TrackMatteType.LUMA
TrackMatteType.LUMA_INVERTED
```

### PropertyValueType
```javascript
PropertyValueType.NO_VALUE
PropertyValueType.ThreeD_SPATIAL    // 3D position (배열 1개)
PropertyValueType.ThreeD            // 3D scale (배열 3개)
PropertyValueType.TwoD_SPATIAL      // 2D position (배열 1개)
PropertyValueType.TwoD              // 2D scale (배열 2개)
PropertyValueType.OneD              // rotation, opacity (배열 1개)
PropertyValueType.COLOR             // 색상
PropertyValueType.CUSTOM_VALUE
PropertyValueType.MARKER
PropertyValueType.LAYER_INDEX
PropertyValueType.MASK_INDEX
PropertyValueType.SHAPE
PropertyValueType.TEXT_DOCUMENT
```

### AutoOrientType
```javascript
AutoOrientType.NO_AUTO_ORIENT
AutoOrientType.ALONG_PATH
AutoOrientType.CAMERA_OR_POINT_OF_INTEREST
AutoOrientType.CHARACTERS_TOWARD_CAMERA
```

### PurgeTarget
```javascript
PurgeTarget.ALL_CACHES
PurgeTarget.ALL_MEMORY_CACHES        // AE 24.3+
PurgeTarget.UNDO_CACHES
PurgeTarget.SNAPSHOT_CACHES
PurgeTarget.IMAGE_CACHES
```

### LightType
```javascript
LightType.PARALLEL
LightType.SPOT
LightType.POINT
LightType.AMBIENT
LightType.ENVIRONMENT               // AE 24.3+
```

### ImportAsType
```javascript
ImportAsType.FOOTAGE
ImportAsType.COMP
ImportAsType.COMP_CROPPED_LAYERS
ImportAsType.PROJECT
```

### ParagraphJustification (TextDocument에서 사용)
```javascript
ParagraphJustification.LEFT_JUSTIFY
ParagraphJustification.RIGHT_JUSTIFY
ParagraphJustification.CENTER_JUSTIFY
ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT
ParagraphJustification.FULL_JUSTIFY_LASTLINE_RIGHT
ParagraphJustification.FULL_JUSTIFY_LASTLINE_CENTER
ParagraphJustification.FULL_JUSTIFY_LASTLINE_FULL
```
