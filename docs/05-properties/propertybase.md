# PropertyBase & PropertyGroup

출처: https://ae-scripting.docsforadobe.dev/property/propertybase/
출처: https://ae-scripting.docsforadobe.dev/property/propertygroup/

---

## PropertyBase (모든 Property/PropertyGroup의 기반)

### 프로퍼티

```javascript
prop.name           // 표시 이름 (indexed group 자식이면 write 가능)
prop.matchName      // 고유 식별자 문자열 (non-localized, read-only)
                    // 예: "ADBE Transform Group", "ADBE Position"

prop.enabled        // eyeball 아이콘 (boolean, canSetEnabled가 true면 write)
prop.canSetEnabled  // enabled 변경 가능 여부 (read-only)
prop.active         // 현재 시간에 활성 여부 (read-only)

prop.isEffect       // 이펙트 PropertyGroup인지 (read-only)
prop.isMask         // 마스크 PropertyGroup인지 (read-only)
prop.isModified     // 생성 후 변경됐는지 (read-only)
prop.elided         // 자식이 들여쓰기 안 되는 조직 그룹 여부 (read-only)
prop.selected       // 선택 여부 (boolean, read/write)

prop.parentProperty     // 부모 PropertyGroup 또는 null (read-only)
prop.propertyDepth      // 레이어에서의 깊이 (read-only integer)
prop.propertyIndex      // 부모 내 위치 (read-only integer)
prop.propertyType       // PropertyType enum (read-only)
// PropertyType.PROPERTY, PropertyType.INDEXED_GROUP, PropertyType.NAMED_GROUP
```

### 메서드

```javascript
prop.duplicate()            // indexed group 자식이면 복제 → PropertyBase 반환
prop.remove()               // indexed group에서 삭제 (text animator도 가능)
prop.moveTo(newIndex)       // 새 위치로 이동 (indexed group 내)

prop.propertyGroup()        // 부모 PropertyGroup 반환 (1단계 위)
prop.propertyGroup(2)       // 2단계 위 반환
prop.propertyGroup(3)       // 3단계 위 반환
```

---

## PropertyGroup (Property들의 컨테이너)

### 프로퍼티

```javascript
group.numProperties    // 하위 프로퍼티 수 (read-only integer)
```

### 메서드

```javascript
// 하위 프로퍼티 접근
group.property(1)                    // 1-based index로 접근
group.property("Layer Name")         // 이름으로 접근
group.property("ADBE Position")      // match name으로 접근

// 프로퍼티 추가
group.addProperty("ADBE Vector Group")         // match name으로
group.addProperty("Gaussian Blur")             // 표시 이름으로
// → PropertyBase 반환
// ⚠️ indexed group에 추가하면 기존 레퍼런스 무효화됨!

// 추가 가능 여부 확인
group.canAddProperty("ADBE Vector Group")  // → boolean

// Variable Font Axis (AE 26.0+)
group.addVariableFontAxis("wght")   // "ADBE Text Animator Properties" 그룹에만 가능
// axisTag: 4자 태그 (wght=Weight, wdth=Width, slnt=Slant, ital=Italic)
```

### 자주 쓰는 PropertyGroup 경로

```javascript
// 레이어 기본 그룹들
layer.property("Transform")               // "ADBE Transform Group"
layer.property("Effects")                 // "ADBE Effect Parade"
layer.property("Masks")                   // "ADBE Mask Parade"
layer.property("Layer Styles")            // "ADBE Layer Styles"
layer.property("Motion Trackers")         // "ADBE MTrackers"

// Transform 하위
layer.transform.position                  // "ADBE Position"
layer.transform.scale                     // "ADBE Scale"
layer.transform.rotation                  // "ADBE Rotate Z"
layer.transform.opacity                   // "ADBE Opacity"
layer.transform.anchorPoint               // "ADBE Anchor Point"

// ShapeLayer 콘텐츠
layer.property("Contents")               // "ADBE Root Vectors Group"

// TextLayer 텍스트
layer.property("Text").property("Source Text")   // "ADBE Text Document"
```

### 프로퍼티 순회

```javascript
var group = layer.property("Effects");
for (var i = 1; i <= group.numProperties; i++) {
    var child = group.property(i);
    writeLn(child.name + " [" + child.matchName + "]");
}
```

---

## MaskPropertyGroup

```javascript
// Mask 관련 프로퍼티
mask.maskMode       // MaskMode enum
mask.inverted       // boolean
mask.rotoBezier     // boolean

// MaskMode enum
// MaskMode.NONE, ADD, SUBTRACT, INTERSECT, LIGHTEN, DARKEN, DIFFERENCE
```
