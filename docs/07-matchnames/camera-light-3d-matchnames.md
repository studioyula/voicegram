# Camera / Light / 3D Layer Match Names

출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/cameralayer/
출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/lightlayer/
출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/3dlayer/

---

## Camera Layer Match Names

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Camera Layer` | Camera Layer |
| `ADBE Camera Options Group` | Camera Options |
| `ADBE Camera Zoom` | Zoom |
| `ADBE Camera Depth of Field` | Depth of Field |
| `ADBE Camera Focus Distance` | Focus Distance |
| `ADBE Camera Aperture` | Aperture |
| `ADBE Camera Blur Level` | Blur Level |
| `ADBE Iris Shape` | Iris Shape |
| `ADBE Iris Rotation` | Iris Rotation |
| `ADBE Iris Roundness` | Iris Roundness |
| `ADBE Iris Aspect Ratio` | Iris Aspect Ratio |
| `ADBE Iris Diffraction Fringe` | Iris Diffraction Fringe |
| `ADBE Iris Highlight Gain` | Highlight Gain |
| `ADBE Iris Highlight Threshold` | Highlight Threshold |
| `ADBE Iris Hightlight Saturation` | Highlight Saturation |

## Camera 접근 패턴

```javascript
var camera = comp.layers.addCamera("Camera 1", [comp.width/2, comp.height/2]);
var camOpts = camera.property("Camera Options");

camOpts.property("Zoom").setValue(1000);
camOpts.property("Depth of Field").setValue(1);  // 0=Off, 1=On
camOpts.property("Focus Distance").setValue(1000);
camOpts.property("Aperture").setValue(80);
camOpts.property("Blur Level").setValue(100);

// Transform
camera.transform.position.setValue([960, 540, -1800]);
camera.transform.pointOfInterest.setValue([960, 540, 0]);
```

---

## Light Layer Match Names

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Light Layer` | Light Layer |
| `ADBE Light Options Group` | Light Options |
| `ADBE Light Intensity` | Intensity |
| `ADBE Light Color` | Color |
| `ADBE Light Cone Angle` | Cone Angle |
| `ADBE Light Cone Feather 2` | Cone Feather |
| `ADBE Light Falloff Type` | Falloff |
| `ADBE Light Falloff Start` | Radius |
| `ADBE Light Falloff Distance` | Falloff Distance |
| `ADBE Light Shadow Darkness` | Shadow Darkness |
| `ADBE Light Shadow Diffusion` | Shadow Diffusion |

## Light 접근 패턴

```javascript
var light = comp.layers.addLight("Key Light", [960, 540]);
light.lightType = LightType.SPOT;

var lightOpts = light.property("Light Options");
lightOpts.property("Intensity").setValue(100);
lightOpts.property("Color").setValue([1, 0.95, 0.85]);  // 따뜻한 흰색
lightOpts.property("Cone Angle").setValue(60);
lightOpts.property("Cone Feather").setValue(50);
lightOpts.property("Shadow Darkness").setValue(60);
lightOpts.property("Shadow Diffusion").setValue(15);
```

---

## 3D Layer Match Names (Material Options)

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Material Options Group` | Material Options |
| `ADBE Light Transmission` | Light Transmission |
| `ADBE Ambient Coefficient` | Ambient |
| `ADBE Diffuse Coefficient` | Diffuse |
| `ADBE Specular Coefficient` | Specular Intensity |
| `ADBE Shininess Coefficient` | Specular Shininess |
| `ADBE Metal Coefficient` | Metal |
| `ADBE Reflection Coefficient` | Reflection Intensity |
| `ADBE Glossiness Coefficient` | Reflection Sharpness |
| `ADBE Fresnel Coefficient` | Reflection Rolloff |
| `ADBE Transparency Coefficient` | Transparency |
| `ADBE Transp Rolloff` | Transparency Rolloff |
| `ADBE Index of Refraction` | Index of Refraction |

## Geometry Options (3D)

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Plane Options Group` | Geometry Options |
| `ADBE Plane Curvature` | Curvature |
| `ADBE Plane Subdivision` | Segments |
| `ADBE Extrsn Options Group` | Geometry Options (Extrusion) |
| `ADBE Bevel Depth` | Bevel Depth |
| `ADBE Hole Bevel Depth` | Hole Bevel Depth |
| `ADBE Extrsn Depth` | Extrusion Depth |

## Material Options 접근 패턴

```javascript
// 3D 레이어 활성화 후
layer.threeDLayer = true;

var mat = layer.property("Material Options");
mat.property("Ambient").setValue(100);
mat.property("Diffuse").setValue(70);
mat.property("Specular Intensity").setValue(30);
mat.property("Specular Shininess").setValue(20);
mat.property("Metal").setValue(0);
mat.property("Light Transmission").setValue(0);
```
