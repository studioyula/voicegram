# First-Party Effect Match Names

출처: https://ae-scripting.docsforadobe.dev/matchnames/effects/firstparty/

## 이펙트 추가 패턴

```javascript
// match name으로 추가 (권장 — 언어 독립적)
var fx = layer.property("Effects").addProperty("ADBE Gaussian Blur 2");
fx.property("Blurriness").setValue(20);

// 또는 표시 이름으로 (언어에 따라 다를 수 있음)
var fx = layer.property("Effects").addProperty("Gaussian Blur");

// 이펙트 프로퍼티 접근
layer.effect("Gaussian Blur").property("Blurriness").setValue(30);
```

---

## Blur & Sharpen

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Gaussian Blur 2` | Gaussian Blur |
| `ADBE Box Blur2` | Fast Box Blur |
| `ADBE Motion Blur` | Directional Blur |
| `ADBE Radial Blur` | Radial Blur |
| `ADBE Camera Lens Blur` | Camera Lens Blur |
| `ADBE Bilateral` | Bilateral Blur |
| `ADBE Channel Blur` | Channel Blur |
| `ADBE Compound Blur` | Compound Blur |
| `ADBE Smart Blur` | Smart Blur |
| `ADBE Sharpen` | Sharpen |
| `ADBE Unsharp Mask2` | Unsharp Mask |
| `ADBE CameraShakeDeblur` | Camera-Shake Deblur |
| `CS CrossBlur` | CC Cross Blur |
| `CC Radial Blur` | CC Radial Blur |
| `CC Vector Blur` | CC Vector Blur |

### Gaussian Blur 프로퍼티
```javascript
var blur = layer.property("Effects").addProperty("ADBE Gaussian Blur 2");
blur.property("Blurriness").setValue(20);
blur.property("Blur Dimensions").setValue(1);  // 1=All, 2=Horizontal, 3=Vertical
blur.property("Repeat Edge Pixels").setValue(true);
```

---

## Color Correction

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Lumetri` | Lumetri Color |
| `ADBE HUE SATURATION` | Hue/Saturation |
| `ADBE CurvesCustom` | Curves |
| `ADBE Easy Levels2` | Levels |
| `ADBE Brightness & Contrast 2` | Brightness & Contrast |
| `ADBE Tint` | Tint |
| `ADBE Tritone` | Tritone |
| `ADBE Exposure2` | Exposure |
| `ADBE Vibrance` | Vibrance |
| `ADBE Black&White` | Black & White |
| `ADBE Color Balance 2` | Color Balance |
| `ADBE Color Balance (HLS)` | Color Balance (HLS) |
| `ADBE ShadowHighlight` | Shadow/Highlight |
| `ADBE PhotoFilterPS` | Photo Filter |
| `ADBE Change Color` | Change Color |
| `ADBE Change To Color` | Change to Color |
| `ADBE AutoColor` | Auto Color |
| `ADBE AutoContrast` | Auto Contrast |
| `ADBE AutoLevels` | Auto Levels |
| `ADBE SelectiveColor` | Selective Color |
| `APC Colorama` | Colorama |
| `ADBE Leave Color` | Leave Color |
| `CC Toner` | CC Toner |

### Hue/Saturation 프로퍼티
```javascript
var hs = layer.property("Effects").addProperty("ADBE HUE SATURATION");
hs.property("Channel Control").setValue(1);  // 1=Master
hs.property("Master Hue").setValue(0);       // 도
hs.property("Master Saturation").setValue(-100);  // 흑백
hs.property("Master Brightness").setValue(0);
hs.property("Colorize").setValue(false);
```

### Tint 프로퍼티
```javascript
var tint = layer.property("Effects").addProperty("ADBE Tint");
tint.property("Map Black To").setValue([0, 0, 0]);
tint.property("Map White To").setValue([1, 1, 1]);
tint.property("Amount to Tint").setValue(100);
```

---

## Generate

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Ramp` | Gradient Ramp |
| `ADBE Fill` | Fill |
| `ADBE Stroke` | Stroke |
| `ADBE Glo2` ← (**Stylize**에 있음) | Glow |
| `ADBE Cell Pattern` | Cell Pattern |
| `ADBE Fractal` | Fractal |
| `ADBE Grid` | Grid |
| `ADBE Circle` | Circle |
| `ADBE Checkerboard` | Checkerboard |
| `ADBE 4ColorGradient` | 4-Color Gradient |
| `ADBE Lens Flare` | Lens Flare |
| `ADBE Lightning 2` | Advanced Lightning |
| `ADBE Write-on` | Write-on |
| `APC Radio Waves` | Radio Waves |
| `APC Vegas` | Vegas |
| `ADBE AudSpect` | Audio Spectrum |
| `ADBE AudWave` | Audio Waveform |

### Fill 프로퍼티
```javascript
var fill = layer.property("Effects").addProperty("ADBE Fill");
fill.property("Color").setValue([1, 0, 0]);
fill.property("Opacity").setValue(100);
```

### Gradient Ramp 프로퍼티
```javascript
var ramp = layer.property("Effects").addProperty("ADBE Ramp");
ramp.property("Start of Ramp").setValue([comp.width/2, 0]);
ramp.property("End of Ramp").setValue([comp.width/2, comp.height]);
ramp.property("Start Color").setValue([0, 0, 0]);
ramp.property("End Color").setValue([1, 1, 1]);
ramp.property("Ramp Shape").setValue(1);   // 1=Linear, 2=Radial
ramp.property("Blend With Original").setValue(0);
```

---

## Stylize

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Glo2` | Glow |
| `ADBE Mosaic` | Mosaic |
| `ADBE Find Edges` | Find Edges |
| `ADBE Roughen Edges` | Roughen Edges |
| `ADBE Scatter` | Scatter |
| `ADBE Emboss` | Emboss |
| `ADBE Color Emboss` | Color Emboss |
| `ADBE Tile` | Motion Tile |
| `ADBE Posterize` | Posterize |
| `ADBE Cartoonify` | Cartoon |
| `ADBE Threshold2` | Threshold |
| `ADBE Strobe` | Strobe Light |
| `ADBE Texturize` | Texturize |
| `CS Vignette` | CC Vignette |
| `CC Glass` | CC Glass |
| `CC Plastic` | CC Plastic |
| `CC Burn Film` | CC Burn Film |

### Glow 프로퍼티
```javascript
var glow = layer.property("Effects").addProperty("ADBE Glo2");
glow.property("Glow Threshold").setValue(60);   // %
glow.property("Glow Radius").setValue(10);      // px
glow.property("Glow Intensity").setValue(1);
glow.property("Glow Colors").setValue(1);       // 1=Original Colors, 2=Effect Colors, 3=Arbitrary Map
glow.property("Glow Operation").setValue(1);    // 1=Add, 2=Screen, ...
```

---

## Distort

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Corner Pin` | Corner Pin |
| `ADBE Displacement Map` | Displacement Map |
| `ADBE Turbulent Displace` | Turbulent Displace |
| `ADBE Wave Warp` | Wave Warp |
| `ADBE Optics Compensation` | Optics Compensation |
| `ADBE Spherize` | Spherize |
| `ADBE Ripple` | Ripple |
| `ADBE Twirl` | Twirl |
| `ADBE Mirror` | Mirror |
| `ADBE Offset` | Offset |
| `ADBE Magnify` | Magnify |
| `ADBE Polar Coordinates` | Polar Coordinates |
| `ADBE LIQUIFY` | Liquify |
| `ADBE MESH WARP` | Mesh Warp |
| `ADBE BEZMESH` | Bezier Warp |
| `ADBE Geometry2` | Transform |
| `ADBE SubspaceStabilizer` | Warp Stabilizer VFX |
| `ADBE Rolling Shutter` | Rolling Shutter Repair |
| `ADBE Upscale` | Detail-preserving Upscale |

---

## Perspective

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Drop Shadow` | Drop Shadow |
| `ADBE Radial Shadow` | Radial Shadow |
| `ADBE Bevel Alpha` | Bevel Alpha |
| `ADBE Bevel Edges` | Bevel Edges |
| `ADBE 3D Glasses` | 3D Glasses |
| `ADBE 3D Tracker` | 3D Camera Tracker |

### Drop Shadow 프로퍼티
```javascript
var shadow = layer.property("Effects").addProperty("ADBE Drop Shadow");
shadow.property("Shadow Color").setValue([0, 0, 0]);
shadow.property("Opacity").setValue(75);
shadow.property("Direction").setValue(135);   // 각도 (도)
shadow.property("Distance").setValue(10);     // px
shadow.property("Softness").setValue(10);     // px
shadow.property("Shadow Only").setValue(false);
```

---

## Noise & Grain

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Fractal Noise` | Fractal Noise |
| `ADBE Noise` | Noise |
| `APC Grain` | Add Grain |
| `VISINF Grain Removal` | Remove Grain |
| `ADBE Median` | Median |
| `ADBE Dust & Scratches` | Dust & Scratches |

### Fractal Noise 프로퍼티
```javascript
var fn = layer.property("Effects").addProperty("ADBE Fractal Noise");
fn.property("Fractal Type").setValue(1);    // 1=Basic, ...
fn.property("Noise Type").setValue(2);      // 1=Block, 2=Linear, 3=Soft, 4=Spline
fn.property("Contrast").setValue(100);
fn.property("Brightness").setValue(0);
fn.property("Transform").property("Scale").setValue(100);
fn.property("Evolution").setValueAtTime(0, 0);
fn.property("Evolution").setValueAtTime(comp.duration, 360);
```

---

## Time

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Timewarp` | Timewarp |
| `ADBE Echo` | Echo |
| `ADBE Posterize Time` | Posterize Time |
| `ADBE Pixel Motion Blur` | Pixel Motion Blur |
| `ADBE Force Motion Blur` | Force Motion Blur |

### Posterize Time 프로퍼티
```javascript
var pt = layer.property("Effects").addProperty("ADBE Posterize Time");
pt.property("Frame Rate").setValue(12);  // 12fps 느낌
```

---

## Simulation

| Match Name | 표시 이름 |
|-----------|---------|
| `CC Particle World` | CC Particle World |
| `CC Bubbles` | CC Bubbles |
| `CC Drizzle` | CC Drizzle |
| `CC Hair` | CC Hair |
| `CC Mr. Mercury` | CC Mr. Mercury |
| `CC Pixel Polly` | CC Pixel Polly |
| `CC Rainfall` | CC Rainfall |
| `CC Snowfall` | CC Snowfall |
| `CC Star Burst` | CC Star Burst |
| `APC Shatter` | Shatter |
| `ADBE PS Foam` | Foam |
| `ADBE Wave World` | Wave World |
| `ADBE Card Dance` | Card Dance |

---

## Transition

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Linear Wipe` | Linear Wipe |
| `ADBE Radial Wipe` | Radial Wipe |
| `ADBE Gradient Wipe` | Gradient Wipe |
| `ADBE Venetian Blinds` | Venetian Blinds |
| `ADBE Iris Wipe` | Iris Wipe |
| `ADBE Block Dissolve` | Block Dissolve |
| `ADBE Card Wipe` | Card Wipe |
| `CC Grid Wipe` | CC Grid Wipe |
| `CC Image Wipe` | CC Image Wipe |
| `CC Jaws` | CC Jaws |
| `CC Light Wipe` | CC Light Wipe |
| `CC Line Sweep` | CC Line Sweep |
| `CC Radial Scale Wipe` | CC Radial Scale Wipe |
| `CC Scale Wipe` | CC Scale Wipe |
| `CC Twister` | CC Twister |
| `CC WarpoMatic` | CC WarpoMatic |

### Linear Wipe 프로퍼티
```javascript
var wipe = layer.property("Effects").addProperty("ADBE Linear Wipe");
wipe.property("Transition Completion").setValueAtTime(0, 0);
wipe.property("Transition Completion").setValueAtTime(1, 100);
wipe.property("Wipe Angle").setValue(90);    // 방향 (도)
wipe.property("Feather").setValue(0);        // 페더 (px)
```

---

## Expression Controls (자주 사용)

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Slider Control` | Slider Control |
| `ADBE Angle Control` | Angle Control |
| `ADBE Color Control` | Color Control |
| `ADBE Point Control` | Point Control |
| `ADBE Checkbox Control` | Checkbox Control |
| `ADBE Dropdown Control` | Dropdown Control |
| `ADBE Layer Control` | Layer Control |

### Slider Control 패턴
```javascript
// 컨트롤 레이어에 Slider Control 추가
var ctrl = comp.layers.addNull();
ctrl.name = "CONTROLS";
var slider = ctrl.property("Effects").addProperty("ADBE Slider Control");
slider.name = "Speed";
slider.property("Slider").setValue(50);

// 다른 레이어의 expression에서 참조
setExpr(layer.transform.rotation,
    "thisComp.layer('CONTROLS').effect('Speed')('Slider') * time"
);
```
