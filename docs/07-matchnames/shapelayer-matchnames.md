# Shape Layer Match Names

출처: https://ae-scripting.docsforadobe.dev/matchnames/layer/shapelayer/

## 최상위 구조

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Layer` | Shape Layer |
| `ADBE Root Vectors Group` | Contents |
| `ADBE Vector Group` | Group |
| `ADBE Blend Mode` | Blend Mode |
| `ADBE Vectors Group` | Contents (그룹 내부) |

## 그룹 Transform

| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Transform Group` | Transform |
| `ADBE Vector Anchor` | Anchor Point |
| `ADBE Vector Position` | Position |
| `ADBE Vector Scale` | Scale |
| `ADBE Vector Skew` | Skew |
| `ADBE Vector Skew Axis` | Skew Axis |
| `ADBE Vector Rotation` | Rotation |
| `ADBE Vector Group Opacity` | Opacity |

## 셰이프 종류

### 사각형 (Rectangle)
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Shape - Rect` | Rectangle |
| `ADBE Vector Rect Size` | Size |
| `ADBE Vector Rect Position` | Position |
| `ADBE Vector Rect Roundness` | Roundness |

### 타원 (Ellipse)
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Shape - Ellipse` | Ellipse |
| `ADBE Vector Ellipse Size` | Size |
| `ADBE Vector Ellipse Position` | Position |

### 폴리곤/별 (Polystar)
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Shape - Star` | Polystar |
| `ADBE Vector Star Type` | Type (1=Star, 2=Polygon) |
| `ADBE Vector Star Points` | Points |
| `ADBE Vector Star Position` | Position |
| `ADBE Vector Star Rotation` | Rotation |
| `ADBE Vector Star Inner Radius` | Inner Radius |
| `ADBE Vector Star Outer Radius` | Outer Radius |
| `ADBE Vector Star Inner Roundness` | Inner Roundness |
| `ADBE Vector Star Outer Roundness` | Outer Roundness |

### 패스 (Path)
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Shape - Group` | Path |
| `ADBE Vector Shape` | Path (Shape 오브젝트) |

## Fill & Stroke

### Fill (단색)
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Graphic - Fill` | Fill |
| `ADBE Vector Fill Color` | Color |
| `ADBE Vector Fill Opacity` | Opacity |
| `ADBE Vector Fill Rule` | Fill Rule (1=Non-Zero, 2=Even-Odd) |

### Stroke (외곽선)
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Graphic - Stroke` | Stroke |
| `ADBE Vector Stroke Color` | Color |
| `ADBE Vector Stroke Opacity` | Opacity |
| `ADBE Vector Stroke Width` | Stroke Width |
| `ADBE Vector Stroke Line Cap` | Line Cap |
| `ADBE Vector Stroke Line Join` | Line Join |
| `ADBE Vector Stroke Miter Limit` | Miter Limit |
| `ADBE Vector Stroke Dashes` | Dashes |

### Gradient Fill
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Graphic - G-Fill` | Gradient Fill |
| `ADBE Vector Grad Type` | Type (1=Linear, 2=Radial) |
| `ADBE Vector Grad Start Pt` | Start Point |
| `ADBE Vector Grad End Pt` | End Point |
| `ADBE Vector Grad HiLite Length` | Highlight Length |
| `ADBE Vector Grad HiLite Angle` | Highlight Angle |
| `ADBE Vector Grad Colors` | Colors |

### Gradient Stroke
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Graphic - G-Stroke` | Gradient Stroke |

## Modifier (모디파이어)

### Trim Paths
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Filter - Trim` | Trim Paths |
| `ADBE Vector Trim Start` | Start |
| `ADBE Vector Trim End` | End |
| `ADBE Vector Trim Offset` | Offset |
| `ADBE Vector Trim Type` | Trim Multiple Shapes (1=Simultaneously, 2=Individually) |

### Repeater
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Filter - Repeater` | Repeater |
| `ADBE Vector Repeater Copies` | Copies |
| `ADBE Vector Repeater Offset` | Offset |
| `ADBE Vector Repeater Order` | Composite (1=Above, 2=Below) |
| `ADBE Vector Repeater Transform` | Transform |

### 기타 모디파이어
| Match Name | 표시 이름 |
|-----------|---------|
| `ADBE Vector Filter - Merge` | Merge Paths |
| `ADBE Vector Filter - Offset` | Offset Paths |
| `ADBE Vector Filter - PB` | Pucker & Bloat |
| `ADBE Vector Filter - RC` | Round Corners |
| `ADBE Vector Filter - Trim` | Trim Paths |
| `ADBE Vector Filter - Twist` | Twist |
| `ADBE Vector Filter - Roughen` | Wiggle Paths |
| `ADBE Vector Filter - Wiggler` | Wiggle Transform |
| `ADBE Vector Filter - Zigzag` | Zig Zag |
