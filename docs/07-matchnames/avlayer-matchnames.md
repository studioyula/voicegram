# AV Layer Match Names

출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/avlayer/

## 레이어 기본

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE AV Layer` | AV Layer |
| `ADBE Marker` | Marker |
| `ADBE Time Remapping` | Time Remap |
| `ADBE MTrackers` | Motion Trackers |
| `ADBE Mask Parade` | Masks |
| `ADBE Effect Parade` | Effects |
| `ADBE Layer Overrides` | Essential Properties |

## Transform

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Transform Group` | Transform |
| `ADBE Anchor Point` | Anchor Point |
| `ADBE Position` | Position |
| `ADBE Position_0` | X Position (차원 분리 시) |
| `ADBE Position_1` | Y Position (차원 분리 시) |
| `ADBE Position_2` | Z Position (3D + 차원 분리 시) |
| `ADBE Scale` | Scale |
| `ADBE Orientation` | Orientation (3D 전용) |
| `ADBE Rotate X` | X Rotation (3D 전용) |
| `ADBE Rotate Y` | Y Rotation (3D 전용) |
| `ADBE Rotate Z` | Z Rotation = Rotation |
| `ADBE Opacity` | Opacity |

## Audio

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Audio Group` | Audio |
| `ADBE Audio Levels` | Audio Levels |

## 차원 분리된 Position 접근 패턴

```javascript
// dimensionsSeparated = true 설정 후 아래로 접근
var pos = layer.transform.position;
pos.dimensionsSeparated = true;
var xProp = layer.transform.property("X Position");   // "ADBE Position_0"
var yProp = layer.transform.property("Y Position");   // "ADBE Position_1"
var zProp = layer.transform.property("Z Position");   // "ADBE Position_2" (3D만)

// ❌ getSeparationFollower() 는 존재하지 않음!
// ✅ layer.transform.property("X Position") 으로 접근
```

## Layer Styles

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Layer Styles` | Layer Styles |
| `dropShadow/enabled` | Drop Shadow |
| `innerShadow/enabled` | Inner Shadow |
| `outerGlow/enabled` | Outer Glow |
| `innerGlow/enabled` | Inner Glow |
| `bevelEmboss/enabled` | Bevel and Emboss |
| `chromeFX/enabled` | Satin |
| `solidFill/enabled` | Color Overlay |
| `gradientFill/enabled` | Gradient Overlay |
| `patternFill/enabled` | Pattern Overlay |
| `frameFX/enabled` | Stroke |

## Layer Styles 접근 예시

```javascript
var styles = layer.property("Layer Styles");

// Drop Shadow
var shadow = styles.property("Drop Shadow");
shadow.property("Color").setValue([0, 0, 0]);
shadow.property("Opacity").setValue(75);
shadow.property("Distance").setValue(10);
shadow.property("Size").setValue(10);

// 또는 match name으로
var shadow = styles.property("dropShadow/enabled");
```
