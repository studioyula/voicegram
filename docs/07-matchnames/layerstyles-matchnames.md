# Layer Styles Match Names

출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/layerstyles/

## 블렌딩 옵션

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Blend Options Group` | Blending Options |
| `ADBE Global Angle2` | Global Light Angle |
| `ADBE Global Altitude2` | Global Light Altitude |
| `ADBE Layer Fill Opacity2` | Fill Opacity |
| `ADBE R Channel Blend` | Red |
| `ADBE G Channel Blend` | Green |
| `ADBE B Channel Blend` | Blue |
| `ADBE Blend Interior` | Blend Interior Styles as Group |
| `ADBE Blend Ranges` | Use Blend Ranges from Source |

## Layer Styles 접근 패턴

```javascript
var styles = layer.property("Layer Styles");  // "ADBE Layer Styles"
```

## Drop Shadow

```javascript
var shadow = styles.property("Drop Shadow");
// 또는 match name: "dropShadow/enabled"

shadow.enabled = true;
shadow.property("Blend Mode").setValue(BlendingMode.MULTIPLY);
shadow.property("Color").setValue([0, 0, 0]);
shadow.property("Opacity").setValue(75);
shadow.property("Use Global Light").setValue(false);
shadow.property("Angle").setValue(135);           // 각도 (도)
shadow.property("Distance").setValue(10);         // 거리 (px)
shadow.property("Spread").setValue(0);            // 확산 %
shadow.property("Size").setValue(10);             // 크기 (px)
shadow.property("Noise").setValue(0);
shadow.property("Layer Knocks Out Drop Shadow").setValue(true);
```

## Inner Shadow

```javascript
var innerShadow = styles.property("Inner Shadow");
innerShadow.enabled = true;
innerShadow.property("Color").setValue([0, 0, 0]);
innerShadow.property("Opacity").setValue(75);
innerShadow.property("Angle").setValue(135);
innerShadow.property("Distance").setValue(5);
innerShadow.property("Size").setValue(5);
```

## Outer Glow

```javascript
var outerGlow = styles.property("Outer Glow");
outerGlow.enabled = true;
outerGlow.property("Blend Mode").setValue(BlendingMode.SCREEN);
outerGlow.property("Opacity").setValue(75);
outerGlow.property("Color").setValue([1, 1, 0.7]);
outerGlow.property("Spread").setValue(0);
outerGlow.property("Size").setValue(20);
```

## Inner Glow

```javascript
var innerGlow = styles.property("Inner Glow");
innerGlow.enabled = true;
innerGlow.property("Blend Mode").setValue(BlendingMode.SCREEN);
innerGlow.property("Opacity").setValue(75);
innerGlow.property("Color").setValue([1, 1, 1]);
innerGlow.property("Size").setValue(10);
```

## Bevel and Emboss

```javascript
var bevel = styles.property("Bevel and Emboss");
bevel.enabled = true;
bevel.property("Style").setValue(1);     // 1=Outer Bevel, 2=Inner Bevel, 3=Emboss, 4=Pillow Emboss, 5=Stroke Emboss
bevel.property("Technique").setValue(1); // 1=Smooth, 2=Chisel Hard, 3=Chisel Soft
bevel.property("Depth").setValue(100);   // %
bevel.property("Direction").setValue(1); // 1=Up, 2=Down
bevel.property("Size").setValue(5);
bevel.property("Soften").setValue(0);
```

## Color Overlay (Solid Fill)

```javascript
var colorOverlay = styles.property("Color Overlay");
colorOverlay.enabled = true;
colorOverlay.property("Blend Mode").setValue(BlendingMode.NORMAL);
colorOverlay.property("Color").setValue([1, 0, 0]);
colorOverlay.property("Opacity").setValue(100);
```

## Gradient Overlay

```javascript
var gradOverlay = styles.property("Gradient Overlay");
gradOverlay.enabled = true;
gradOverlay.property("Blend Mode").setValue(BlendingMode.NORMAL);
gradOverlay.property("Opacity").setValue(100);
gradOverlay.property("Angle").setValue(90);
gradOverlay.property("Style").setValue(1);   // 1=Linear, 2=Radial, 3=Angle, 4=Reflected, 5=Diamond
gradOverlay.property("Reverse").setValue(false);
gradOverlay.property("Align").setValue(true);
gradOverlay.property("Scale").setValue(100);
```

## Stroke (Layer Style)

```javascript
var stroke = styles.property("Stroke");
stroke.enabled = true;
stroke.property("Size").setValue(3);
stroke.property("Position").setValue(1);  // 1=Outside, 2=Inside, 3=Center
stroke.property("Blend Mode").setValue(BlendingMode.NORMAL);
stroke.property("Opacity").setValue(100);
stroke.property("Color").setValue([1, 1, 1]);
```
