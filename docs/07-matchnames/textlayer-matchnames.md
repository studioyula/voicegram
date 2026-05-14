# Text Layer Match Names

출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/textlayer/

## 텍스트 프로퍼티

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Text Layer` | Text Layer |
| `ADBE Text Properties` | Text |
| `ADBE Text Document` | Source Text |
| `ADBE Text Path Options` | Path Options |
| `ADBE Text Reverse Path` | Reverse Path |
| `ADBE Text Perpendicular To Path` | Perpendicular To Path |
| `ADBE Text Force Align Path` | Force Alignment |
| `ADBE Text First Margin` | First Margin |
| `ADBE Text Last Margin` | Last Margin |
| `ADBE Text More Options` | More Options |
| `ADBE Text Variable Font Spacing` | Variable Font Spacing |
| `ADBE Text Anchor Point Align` | Grouping Alignment |
| `ADBE Text Animators` | Animators |

## 텍스트 접근 패턴

```javascript
// Source Text 프로퍼티 접근
var src = layer.property("ADBE Text Properties")
               .property("ADBE Text Document");
// 또는 단축:
var src = layer.property("Source Text");

// Path Options
var pathOpts = layer.property("ADBE Text Properties")
                    .property("ADBE Text Path Options");
pathOpts.property("ADBE Text Reverse Path").setValue(false);
pathOpts.property("ADBE Text Perpendicular To Path").setValue(true);
pathOpts.property("ADBE Text Force Align Path").setValue(false);
pathOpts.property("ADBE Text First Margin").setValue(0);
pathOpts.property("ADBE Text Last Margin").setValue(0);
```

## 텍스트 애니메이터 (Animators)

```javascript
var animators = layer.property("ADBE Text Properties")
                     .property("ADBE Text Animators");

// 애니메이터 추가
var anim = animators.addProperty("ADBE Text Animator");
anim.name = "Scale Animator";

// Range Selector 추가 (기본으로 하나 있음)
var selector = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
// 또는
var selector = anim.property("ADBE Text Selectors").property(1);

// Selector 설정
selector.property("ADBE Text Percent Start").setValue(0);
selector.property("ADBE Text Percent End").setValue(100);
selector.property("ADBE Text Selector Offset").setValue(0);

// Animator Properties 추가
var animProps = anim.property("ADBE Text Animator Properties");
var scaleProp = animProps.addProperty("ADBE Text Scale 3D");
scaleProp.setValue([50, 50, 100]);  // 기본 크기의 50%에서 시작
```

## 3D 텍스트 재질 프로퍼티

3D 텍스트 레이어 (Enable Per-character 3D 사용 시):

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Text Front Color` | Front Color |
| `ADBE Text Bevel Color` | Bevel Color |
| `ADBE Text Side Color` | Side Color |
| `ADBE Text Back Color` | Back Color |
| `ADBE Text Ambient` | Ambient |
| `ADBE Text Diffuse` | Diffuse |
| `ADBE Text Specular` | Specular Intensity |
| `ADBE Text Shininess` | Specular Shininess |
| `ADBE Text Metal` | Metal |
| `ADBE Text Bevel Depth` | Bevel Depth |
| `ADBE Text Hole Bevel Depth` | Hole Bevel Depth |
| `ADBE Text Extrusion Depth` | Extrusion Depth |
