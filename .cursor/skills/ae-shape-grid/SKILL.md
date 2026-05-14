---
name: ae-shape-grid
description: After Effects에서 셰이프를 `rows x cols` 직교 그리드 또는 **벌집·벽돌**(정사각·**직사각 셀**, `stepX`/`stepY`)로 배치. 선택 레이어 **AABB → 셀** 벌집 절차 포함. 기본 `staggerX=0`, `brickAlignFirstColumn=false`. `layout`은 벤또.
metadata:
  preferred_location: .cursor/skills
---

# AE Shape Grid

`coloso-ae-mcp`의 `execute`로 임의의 셰이프를 격자(rows × cols)로 컴프 중앙에 정확히 정렬해 까는 작업 스킬. 모양·셀·간격·색·스타일을 제어한다. **벤또(bento)** 는 `layout` 변칙 블록, **벌집·벽돌(honeycomb / brick)** 은 `brickHoneycomb`(행마다 열 수 ±1, **가로:** 기본 **둘 다 끔** → 첫 열 자연 어긋남; 옵션 **`staggerX`**, **`brickAlignFirstColumn`**)으로 처리한다. 수식: [reference-brick-honeycomb.md](reference-brick-honeycomb.md). **기존 도형 레이어**는 풀·블록·셀 AABB 맞춤으로 지원한다.

## 사용 시점

- "동그라미 6 x 7, 지름 135, 간격 12로 깔아줘"
- "사각형 5 x 5, 100 x 60, 가로 8 세로 12 간격, 빨강 fill에 검은 stroke 4px"
- "별 모양, 6 x 6, 한 변 120 안에 꽉 차게"
- "이 컴프에 있는 `MyShape` 레이어 6 x 7 그리드로 깔고 셀에 맞게 스케일"
- "6×7 **벤또 그리드**", "**bento grid**", "도시락 칸 같이 크기 다른 블록" → `cols`×`rows` 확정 + `layout`(2×2/1×2/2×1 등) + 보통 `fillRemaining:true`
- "`n×n`(또는 `n x m`) **안에 다양한 조합으로**", "같은 그리드 안에서 패치워크/모자이크" → 동일: 전체 셀 격자는 `rows`/`cols`로 두고, 조합은 **`layout` 배열**로 선언(겹침 없음). 구체 블록을 안 주면 스킬 예시와 같은 **상·중·하 대역 2×2·세로·가로 블록** 등 비중복 **벤또 템플릿**을 쓰고 나머지는 `fillRemaining`으로 채운다.
- "여기는 2×2, 옆은 1×2, 아래는 2×1"처럼 칸마다 span이 다를 때(`layout` 옵션, 겹침 검사 필수)
- "**벌집 그리드**", "**honeycomb**", "**벽돌**", "**brick**", "`4,5,4,5` … **총 n행**" → `gridKind: brickHoneycomb`, `rows:n`, `shortCount:4`, `longCount:5`(또는 사용자가 준 두 개). **가로 옵션(택1):** 생략 = **`staggerX=0`, `brickAlignFirstColumn=false`** | **`staggerX`** 양수 | **`brickAlignFirstColumn:true`** (`staggerX`와 **동시 사용 금지**). **`cellW≠cellH`(직사각 셀)**면 **`py`에 `stepY=cellH+gapY`** 사용. 수식·선택 AABB: [reference-brick-honeycomb.md](reference-brick-honeycomb.md)
- "**선택한 레이어**(바운딩) 크기 = 셀, 간격 12, 4·5…" / **`HoneyRectGrid_`** → 동 레퍼런스 **선택 레이어 AABB** 절: `layerPointToComp` → `cellW`·`cellH`, `duplicate`로 배치.
- 컴프 중앙 기준이 아닌 임의의 중심 좌표/영역에 그리드를 만들고 싶을 때

## 작업 절차

1. `coloso-ae-mcp`의 `scan { depth: "summary" }`로 활성 컴프(`width`, `height`)와 기존 레이어 목록을 확인한다. 활성 컴프가 없으면 중단.
2. 요청을 파라미터로 정규화한다. **벌집·벽돌·`4,5,4,5` n행**이면 `brickHoneycomb` 경로로 간주한다. **벤또·`n×m` 조합**만 오면 `layout`+`fillRemaining` 적용으로 간주한다(블록 목록이 없으면 검증된 **비중복 벤또 템플릿**을 `rows`×`cols`에 맞게 채운 뒤 빈 칸은 `fillRemaining`). 누락 항목은 **파라미터** 기본값을 사용한다. `rows`/`cols`를 알 수 없으면 한 번만 묻는다.
3. "N x M" 표기는 첫 숫자를 **cols(열)**, 두번째를 **rows(행)**로 해석한다. 다만 그리드 전체가 컴프 영역을 벗어나면 행/열을 스왑해 재시도하고 그 사실을 보고한다.
4. 사용자가 셀 크기를 지정하지 않으면 컴프 영역과 행/열 수, 간격에서 역산해 정사각 셀을 자동 계산한다.
   - `cellW = (areaW - (cols-1)*gapX) / cols`
   - `cellH = (areaH - (rows-1)*gapY) / rows`
   - `area`는 `center`/`bounds` 파라미터로 좁힐 수 있고, 생략 시 컴프 영역의 90%를 사용.
5. **직교 그리드**면 셀 좌표를 계산한다.
   - `stepX = cellW + gapX`, `stepY = cellH + gapY`
   - `cx, cy`는 `center` 또는 컴프 중앙
   - `startX = cx - (cols-1)*stepX/2`, `startY = cy - (rows-1)*stepY/2`
5b. **`brickHoneycomb`** 이면 **행별** `count`·`rowShift`를 쓴다. **`staggerX`·`brickAlignFirstColumn` 동시 지정 금지.**  
   - 기본: 둘 다 꺼짐(`staggerX=0` 또는 생략, `brickAlignFirstColumn` 거짓/생략) → **짝수 행 `rowShift=0`**.  
   - `staggerX>0`(짝수 행만): **`rowShift = -staggerX`**.  
   - `brickAlignFirstColumn: true`(짝수 행만): **`rowShift = +stepX/2`**, `staggerX`는 0.  
   수식: [reference-brick-honeycomb.md](reference-brick-honeycomb.md).
6. 타일을 둔다. **`brickHoneycomb`** 이면 행 루프만 돌며 각 행 `count`개 슬롯에 — **`px`는 `stepX`**, **`py`는 `stepY`**(직사각 셀 시 `stepY=cellH+gapY` 필수). **`layout`이 없고 직교**면 이중 루프로 1×1 전체. **`layout`이 있으면** 벤또 점유 맵·`blockW`/`blockH`·`fillRemaining`을 따른다.
   - **create**: 1×1은 `cellW`×`cellH`, 블록은 `blockW`×`blockH`로 모양을 생성한다.
7. **useExisting**은 1×1이면 기존과 같이 `cellW`×`cellH` AABB에 맞추고, **블록**이면 같은 파이프라인에서 **`blockW`×`blockH`**를 대상 크기로 쓴다(앵커·`layerPointToComp`·`fitMode` 동일).
8. 같은 `namePrefix`의 기존 레이어가 있으면 먼저 제거(중복 누적 방지). 기본 prefix는 모드/모양별로 자동 결정.
9. 마지막에 생성 개수, `cols`×`rows`, 셀·gap, (있으면) `layout` 항목 수·`fillRemaining`으로 채운 1×1 개수, 그리드 총 크기·중심을 보고한다.

## 파라미터

### 공통

- `mode`: `create`(기본) | `useExisting`
- `rows`, `cols`: 직교·벤또에서는 필수. **`brickHoneycomb`**는 `rows`(총 행 n) 필수, `cols`는 생략 가능(최대 열은 `max(shortCount,longCount)`).
- `cellSize`: `[w, h]` 또는 숫자 1개(정사각). 미지정 시 자동 계산. **`brickHoneycomb`**에서도 직사각 허용 — 세로 스텝은 **`cellH + gapY`**.
- `gap`: 숫자 1개(가로/세로 동일) 또는 `[gx, gy]`. 기본값 `12`.
- `center`: 그리드 중심 `[x, y]`. 미지정 시 컴프 중앙.
- `bounds`: `[x, y, w, h]`로 그리드가 들어갈 영역을 지정(좌상단 기준). `center`/`cellSize` 자동 계산에 사용.
- `removeExisting`: 같은 prefix 레이어 자동 제거. 기본 `true`.
- `namePrefix`: 레이어 이름 접두. 미지정 시 `Cell_`. 최종 이름은 `<prefix><row>_<col>` (1-based).
- `gridKind`: `rect`(기본, 직교 전체 그리드) | `brickHoneycomb`(벌집·벽돌: `staggerX` / `brickAlignFirstColumn` 참고).
- `shortCount`, `longCount`: `brickHoneycomb`일 때 짝수/홀수(0-based 행 인덱스) 행의 **가로 타일 개수**. 예: `4`·`5`. 생략 시 사용자 언급 또는 `4`/`5` 기본.
- `staggerX`: **선택**, 기본 **`0`**. `brickAlignFirstColumn`이 **거짓**일 때만: **1-based 짝수 행**에 **`rowShift = -staggerX`**. **`brickAlignFirstColumn:true`와 동시 지정 금지.**
- `brickAlignFirstColumn`: **선택**, 기본 **`false`**. `true`이면 **1-based 짝수 행**에 **`rowShift = +stepX/2`** — 홀·짝 **첫 열 X 동일**. 이때 **`staggerX`는 0(생략)**. `stepX = cellW + gapX`
- **필수 아님.** 사용자가 "2×2 차지", "1×2", "2×1", "**벤또**", "**bento**", "`n×m` 안에 다양한 조합" 등을 말하면 전부 **`layout`**(+ 필요 시 **`fillRemaining:true`**)으로 처리한다. 명칭만 다를 뿐 동작은 동일하다.
- `layout`: 항목 각각은 **1-based** `{ row, col, rowSpan, colSpan }` (최소 1). 예: `{ row:1, col:1, rowSpan:2, colSpan:2 }` = 좌상단 (1,1)에서 2행 2열 점유.
- **점유 규칙**: `layout` 배열 순서대로 처리한다. 블록이 점유하는 **1-based** 셀 좌표는 `row+dr`, `col+dc` (`dr` `0..rowSpan-1`, `dc` `0..colSpan-1`). 모두 `1<=row+dr<=rows`, `1<=col+dc<=cols`이고, `occ[row+dr-1][col+dc-1]`가 비어 있어야 한다. 아니면 **즉시 에러**(어느 블록에서 겹쳤는지 포함).
- **블록 fit 크기** (갭을 셀 사이에만 두는 현재 규칙과 일치):
  - `blockW = (colSpan - 1) * stepX + cellW`
  - `blockH = (rowSpan - 1) * stepY + cellH`
- **블록 중심** (셀 중심 격자 좌표):
  - `cx0 = startX + (col - 1) * stepX`, `cx1 = startX + (col + colSpan - 2) * stepX` → `blockCenterX = (cx0 + cx1) / 2`
  - `cy0 = startY + (row - 1) * stepY`, `cy1 = startY + (row + rowSpan - 2) * stepY` → `blockCenterY = (cy0 + cy1) / 2`
- `fillRemaining`: 기본 `false`. `true`이면 `layout`으로 덮이지 않은 셀마다 1×1 타일을 **추가**한다(전역 `mode`·스타일·`poolPick`과 동일 규칙). `useExisting`이면 남은 칸도 풀에서 고른 소스로 복제한다.
- 블록별 덮어쓰기(선택): 항목에 `fillColor`, `shape`, `nameSuffix`, `sourceIndex`(풀 내 인덱스) 등을 붙일 수 있다. 없으면 전역 `P` 값을 쓴다.
- 구현 시 복사용 ExtendScript: [reference-layout.md](reference-layout.md).

### 모양 (`mode: "create"`)

- `shape`: 기본 `circle`. 가능 값:
  - `circle` (원, Ellipse)
  - `rect` (직사각형)
  - `roundedRect` (라운드 사각형, `cornerRadius` 사용)
  - `polygon` (정다각형, `points`로 변 수)
  - `star` (별, `points`, `innerRatio`)
  - `triangle` (`polygon` + `points=3`의 별칭)
  - `path` (사용자 정의 vertex 목록 `pathVertices` + `pathClosed`)
- `points`: polygon/star에서 꼭짓점 수. polygon 기본 6, star 기본 5.
- `innerRatio`: star의 내부/외부 반경 비율. 기본 `0.5` (0~1).
- `cornerRadius`: roundedRect의 모서리 반경(px). 기본 셀 짧은 변의 12%.
- `rotation`: 셀별 회전(deg). 기본 `0`.
- `fitMode`: 셀 바운딩 맞춤 방식. `contain`(기본, 비율 유지하며 안쪽) | `cover`(비율 유지하며 셀 채움) | `stretch`(W/H 따로 늘림, polygon/star/path는 비권장).

### 스타일 (`mode: "create"`)

- `fillColor`: `[r,g,b,a]` (0~1). 기본 `[0,0,0,1]`. `null` 또는 `"none"`이면 Fill 없음.
- `fillOpacity`: 0~100. 기본 `100`.
- `strokeColor`: `[r,g,b,a]`. 기본 `null` (테두리 없음).
- `strokeWidth`: px. 기본 `0`.
- `strokeOpacity`: 0~100. 기본 `100`.
- `strokeDashes`: 점선 패턴 `[on, off]`(옵션). 기본 없음.
- `strokeLineCap`: `butt`(1) | `round`(2) | `square`(3). 기본 `butt`.
- `strokeLineJoin`: `miter`(1) | `round`(2) | `bevel`(3). 기본 `miter`.
- `blendMode`: AE 블렌드 모드 enum. 기본 `NORMAL`.
- `opacity`: 레이어 Opacity (0~100). 기본 `100`.

### 기존 레이어 활용 (`mode: "useExisting"`)

- `sourceLayer`: 원본 **한 개**일 때 이름 또는 1-based index. `null`이면 **현재 선택된 모든 레이어**를 소스 풀(`sourcePool`)로 쓴다. 여러 개면 `poolPick`으로 셀마다 고른다.
- `sourcePool` (선택): 이름/index 배열. 단일 소스 대신 명시적 목록이 필요할 때.
- `poolPick`: `random`(기본) | `cycle`. 다중 소스일 때 셀마다 무작위 vs 순서 순환.
- `fitMode`: `contain` | `cover` | `stretch`. 기본 `contain`. **반드시 컴프 AABB**(네 꼭짓점 + 변환)로 `cellW`×`cellH`에 맞출 것. `sourceRect.width/height`만으로 scale 하는 방식은 금지(앵커·회전·비균일 스케일 때문에 셀을 어긋나게 채움).
- `hideSource`: 원본 레이어 비표시. 기본 `true`.
- `keepRotation`: 복제본에 원본 회전 유지. 기본 `true`. `false`면 `ADBE Rotate Z`를 0으로 리셋한 뒤 AABB 재측정 권장.
- `restyle`: 복제 후 색·테두리를 **create**용 스타일 파라미터로 덮어쓸지. 기본 `false`.
- `verifyFit`: `true`면 각 셀 복제 후 AABB를 다시 구해 `cellW/H` 초과 여부를 로그(ε). 기본 `false`.

## ExtendScript 함정 (반드시 준수)

- **`ADBE Vector Ellipse Position` / `ADBE Vector Rect Position` / `ADBE Vector Star Position`을 `setValue([0,0])`로 호출하지 않는다.** 신규 생성 직후 즉시 호출 시 `invalid numeric result (divide by zero?)` 에러 발생. 기본값이 `[0,0]`이므로 호출 생략 = 동일 결과.
- 모양은 항상 `Shape Layer → ADBE Root Vectors Group → ADBE Vector Group → ADBE Vectors Group` 안에 추가한다.
- `setValue`는 **숫자 배열**을 넘긴다(객체 금지).
- Stroke가 필요 없으면 `ADBE Vector Graphic - Stroke`를 추가하지 않는다(투명도 0으로 두지 말 것).
- 별/다각형의 정확한 바운딩 박스는 vertex 좌표를 직접 계산해서 구한다. 외경(`Outer Radius`)만 가지고는 셀에 정확히 맞출 수 없다. 외경 1로 가정해 vertex 바운딩을 구한 뒤 `fit` 스케일을 곱한 값을 외경으로 다시 set 한다.
- `useExisting`에서 원본 바운드는 `layer.sourceRectAtTime(comp.time, false)`로 측정한다. 결과의 `width/height`가 0이면 한 프레임 뒤(`comp.time + 1/fps`)로 재시도하고, 그래도 0이면 사용자에게 보고하고 중단.
- **`sourceRect.width × scale` 만으로 fit 하지 않는다.** ExtendScript에서 `layer.toComp`에 의존하지 않고, 프로젝트의 `layerPointToComp` 패턴(부모 체인·Anchor·Scale·Rotate·Position)으로 네 모서리를 컴프 좌표로 변환한 뒤 `min/max`로 AABB를 구한다. 상세: 워크스페이스 `docs/08-patterns-and-pitfalls/layer-to-comp-extendscript.md`, 구현 복사: `scripts/utility/layer-point-to-comp.jsx`.
- 앵커를 `sourceRect` 중심 `(left+width/2, top+height/2)`로 옮길 때: `newPos = oldPos + R(scale * (newAnchor - oldAnchor))`(2D 회전 `R`)로 보정해 화면상 위치를 유지한 뒤 스케일한다.
- 복제는 `sourceLayer.duplicate()`를 사용. 복제 직후 Transform 속성(Position/Scale/Rotation/Anchor)을 재fetch해서 set 한다(stale ref 방지).
- `addProperty('ADBE Vector Filter - Trim')` 등 추가 옵션은 이 스킬에서 다루지 않는다.

## 모양별 바운딩 박스 정합 규칙

- **circle**: `ADBE Vector Ellipse Size = [cellW, cellH]` (stretch면 두 값을, contain/cover면 정사각). 비율 유지가 기본.
- **rect / roundedRect**: `ADBE Vector Rect Size = [cellW, cellH]`. `roundedRect`는 `ADBE Vector Rect Roundness = cornerRadius`. `cornerRadius`가 셀 짧은 변의 절반을 넘으면 자동 클램프.
- **polygon (points=N)**:
  1. 단위 외경 1로 vertex 좌표 N개 생성 (`angle_i = -90deg + 360deg * i/N`, vertex = `[cos, sin]`).
  2. vertex 바운딩 박스(`bboxW, bboxH`) 계산.
  3. `fit = (contain) ? min(cellW/bboxW, cellH/bboxH) : (cover) ? max(...) : ...`.
  4. `ADBE Vector Star Type = 2` (polygon), `Points = N`, `Outer Radius = fit`, `Outer Roundess = 0`.
- **star (points=N)**:
  1. 외경 1, 내경 `innerRatio`로 2N개 vertex 생성.
  2. 위와 동일하게 bbox → fit.
  3. `Star Type = 1`, `Points = N`, `Outer Radius = fit`, `Inner Radius = fit * innerRatio`.
- **triangle**: polygon, `points = 3`.
- **path**: `pathVertices`(`[[x,y],...]`)의 자체 bbox로 fit 계산 후 모든 vertex에 fit 곱하기. `pathClosed`로 닫힘 여부.
- **useExisting** (정확 버션):
  1. `rect = duplicate.sourceRectAtTime(t,false)` (가로/세로 0이면 +1프레임 재시도).
  2. 앵커를 `(rect.left + rect.width/2, rect.top + rect.height/2)`로 옮기고 Position을 위 보정식으로 맞춘다.
  3. 네 꼭짓점을 `layerPointToComp`로 컴프에 투영 → `aabbW`, `aabbH`.
  4. **contain**: `u = min(cellW/aabbW, cellH/aabbH)` 후 `Scale *= u` (균일). **cover**: `u = max(...)`. **stretch**: `Scale`에 각각 `(cellW/aabbW)`, `(cellH/aabbH)` 곱(비율 깨짐).
  5. `Position = 셀(또는 블록) 중심 (px, py)` (앵커가 2번에서 박스 중심이므로 시각 중심 = 타깃 중심).
  6. **블록 배치 시** 4~5번의 목표 폭·높이는 `cellW`/`cellH`가 아니라 **`blockW`/`blockH`**다.
  7. `stepX = cellW + gapX` 등으로 셀 중심 간격이 **간격 파라미터**와 일치하고, 블록 중심 공식이 같은 `step`을 쓰는지 확인한다.

## `layout` 옵션 — ExtendScript

`P.layout`가 있으면 점유 배열 `occ` + `claimBlock` + `blockCenter` 패턴으로 겹침을 검사하고, 블록마다 `blockW`/`blockH`·중심 `(px,py)`를 구한 뒤 `create` / `useExisting` 파이프라인에 넘긴다. **전체 복사용 코드**는 [reference-layout.md](reference-layout.md)에 둔다.

## 단일 실행 골격 (참고용 — 파라미터만 갈아끼우고 1회 `execute`)

```javascript
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
  throw new Error('활성 컴포지션이 없습니다.');
}

var P = {
  mode: 'create',
  rows: 7, cols: 6,
  shape: 'circle',
  cellSize: [135, 135],
  gap: [12, 12],
  center: null,
  bounds: null,
  fillColor: [0, 0, 0, 1],
  strokeColor: null, strokeWidth: 0,
  cornerRadius: 0, points: 6, innerRatio: 0.5,
  rotation: 0,
  fitMode: 'contain',
  namePrefix: 'Cell_',
  removeExisting: true,
  sourceLayer: null, hideSource: true, keepRotation: true, restyle: false,
  poolPick: 'random',
  opacity: 100, blendMode: null
};

function asPair(v, def) {
  if (v == null) return [def, def];
  if (v instanceof Array) return [v[0], v[1] != null ? v[1] : v[0]];
  return [v, v];
}

var cellPair = asPair(P.cellSize, null);
var cellW = cellPair[0], cellH = cellPair[1];
var gapPair = asPair(P.gap, 12);
var gapX = gapPair[0], gapY = gapPair[1];

var areaX, areaY, areaW, areaH;
if (P.bounds) {
  areaX = P.bounds[0]; areaY = P.bounds[1];
  areaW = P.bounds[2]; areaH = P.bounds[3];
} else {
  areaW = comp.width * 0.9; areaH = comp.height * 0.9;
  areaX = (comp.width - areaW) / 2;
  areaY = (comp.height - areaH) / 2;
}

if (cellW == null) cellW = (areaW - (P.cols - 1) * gapX) / P.cols;
if (cellH == null) cellH = (areaH - (P.rows - 1) * gapY) / P.rows;

var stepX = cellW + gapX, stepY = cellH + gapY;
var totalW = P.cols * cellW + (P.cols - 1) * gapX;
var totalH = P.rows * cellH + (P.rows - 1) * gapY;
var cx = (P.center && P.center[0] != null) ? P.center[0] : comp.width / 2;
var cy = (P.center && P.center[1] != null) ? P.center[1] : comp.height / 2;
var startX = cx - (P.cols - 1) * stepX / 2;
var startY = cy - (P.rows - 1) * stepY / 2;

if (P.removeExisting) {
  for (var i = comp.numLayers; i >= 1; i--) {
    var L = comp.layer(i);
    if (L.name.indexOf(P.namePrefix) === 0) L.remove();
  }
}

function polyVerts(n, innerR, isStar) {
  var verts = [], count = isStar ? n * 2 : n;
  for (var i = 0; i < count; i++) {
    var t = -Math.PI / 2 + i * Math.PI * 2 / count;
    var r = isStar ? (i % 2 === 0 ? 1 : innerR) : 1;
    verts.push([Math.cos(t) * r, Math.sin(t) * r]);
  }
  return verts;
}
function bbox(verts) {
  var minX = verts[0][0], maxX = minX, minY = verts[0][1], maxY = minY;
  for (var i = 1; i < verts.length; i++) {
    if (verts[i][0] < minX) minX = verts[i][0];
    if (verts[i][0] > maxX) maxX = verts[i][0];
    if (verts[i][1] < minY) minY = verts[i][1];
    if (verts[i][1] > maxY) maxY = verts[i][1];
  }
  return { w: maxX - minX, h: maxY - minY };
}
function fitScale(srcW, srcH, dstW, dstH, mode) {
  if (mode === 'stretch') return [dstW / srcW, dstH / srcH];
  var s = (mode === 'cover')
    ? Math.max(dstW / srcW, dstH / srcH)
    : Math.min(dstW / srcW, dstH / srcH);
  return [s, s];
}

var tExec = comp.time;

function layerPointToComp(layer, pt, tt) {
  var ap = layer.property('ADBE Transform Group').property('ADBE Anchor Point').valueAtTime(tt, false);
  var pos = layer.property('ADBE Transform Group').property('ADBE Position').valueAtTime(tt, false);
  var sc = layer.property('ADBE Transform Group').property('ADBE Scale').valueAtTime(tt, false);
  var rot = layer.property('ADBE Transform Group').property('ADBE Rotate Z').valueAtTime(tt, false);
  var dx = (pt[0] - ap[0]) * (sc[0] / 100);
  var dy = (pt[1] - ap[1]) * (sc[1] / 100);
  var rad = rot * Math.PI / 180;
  var rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  var ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  if (!layer.parent) return [pos[0] + rx, pos[1] + ry];
  var pap = layer.parent.property('ADBE Transform Group').property('ADBE Anchor Point').valueAtTime(tt, false);
  return layerPointToComp(layer.parent, [pap[0] + pos[0] + rx, pap[1] + pos[1] + ry], tt);
}

function setAnchorKeepVisual(layer, newAP, tt) {
  var apP = layer.property('ADBE Transform Group').property('ADBE Anchor Point');
  var posP = layer.property('ADBE Transform Group').property('ADBE Position');
  var scP = layer.property('ADBE Transform Group').property('ADBE Scale');
  var rotP = layer.property('ADBE Transform Group').property('ADBE Rotate Z');
  var ap = apP.valueAtTime(tt, false);
  var pos = posP.valueAtTime(tt, false);
  var sc = scP.valueAtTime(tt, false);
  var rot = rotP.valueAtTime(tt, false);
  var d0 = newAP[0] - ap[0];
  var d1 = newAP[1] - ap[1];
  var rad = rot * Math.PI / 180;
  var dx0 = d0 * (sc[0] / 100);
  var dy0 = d1 * (sc[1] / 100);
  var rx = dx0 * Math.cos(rad) - dy0 * Math.sin(rad);
  var ry = dx0 * Math.sin(rad) + dy0 * Math.cos(rad);
  apP.setValue(newAP.length === 3 ? newAP : [newAP[0], newAP[1]]);
  if (pos.length === 3) posP.setValue([pos[0] + rx, pos[1] + ry, pos[2]]);
  else posP.setValue([pos[0] + rx, pos[1] + ry]);
}

function compAabbFromRect(layer, rect, tt) {
  var pts = [
    [rect.left, rect.top],
    [rect.left + rect.width, rect.top],
    [rect.left + rect.width, rect.top + rect.height],
    [rect.left, rect.top + rect.height]
  ];
  var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (var pi = 0; pi < 4; pi++) {
    var c = layerPointToComp(layer, pts[pi], tt);
    if (c[0] < minX) minX = c[0];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[1] > maxY) maxY = c[1];
  }
  return { w: maxX - minX, h: maxY - minY };
}

function readSourceRect(layer, tt) {
  var r = layer.sourceRectAtTime(tt, false);
  var w = r.width, h = r.height;
  var left = r.left, top = r.top;
  if (w === 0 || h === 0) {
    var r2 = layer.sourceRectAtTime(tt + 1 / comp.frameRate, false);
    w = r2.width; h = r2.height;
    left = r2.left; top = r2.top;
  }
  return { left: left, top: top, width: w, height: h };
}

function applyStyle(contents) {
  if (P.fillColor && P.fillColor !== 'none') {
    var fill = contents.addProperty('ADBE Vector Graphic - Fill');
    fill.property('ADBE Vector Fill Color').setValue(P.fillColor);
    fill.property('ADBE Vector Fill Opacity').setValue(100);
  }
  if (P.strokeColor && P.strokeWidth > 0) {
    var stroke = contents.addProperty('ADBE Vector Graphic - Stroke');
    stroke.property('ADBE Vector Stroke Color').setValue(P.strokeColor);
    stroke.property('ADBE Vector Stroke Width').setValue(P.strokeWidth);
    stroke.property('ADBE Vector Stroke Opacity').setValue(100);
  }
}

function makeShape(layer, w, h) {
  var root = layer.property('ADBE Root Vectors Group');
  var grp = root.addProperty('ADBE Vector Group');
  grp.name = P.shape;
  var contents = grp.property('ADBE Vectors Group');

  if (P.shape === 'circle') {
    var ell = contents.addProperty('ADBE Vector Shape - Ellipse');
    ell.property('ADBE Vector Ellipse Size').setValue([w, h]);
  } else if (P.shape === 'rect' || P.shape === 'roundedRect') {
    var rect = contents.addProperty('ADBE Vector Shape - Rect');
    rect.property('ADBE Vector Rect Size').setValue([w, h]);
    if (P.shape === 'roundedRect') {
      var rad = P.cornerRadius || Math.min(w, h) * 0.12;
      rad = Math.min(rad, Math.min(w, h) / 2);
      rect.property('ADBE Vector Rect Roundness').setValue(rad);
    }
  } else if (P.shape === 'polygon' || P.shape === 'triangle' || P.shape === 'star') {
    var isStar = (P.shape === 'star');
    var n = (P.shape === 'triangle') ? 3 : P.points;
    var verts = polyVerts(n, P.innerRatio, isStar);
    var bb = bbox(verts);
    var s = fitScale(bb.w, bb.h, w, h, P.fitMode);
    var fit = Math.min(s[0], s[1]);
    var poly = contents.addProperty('ADBE Vector Shape - Star');
    poly.property('ADBE Vector Star Type').setValue(isStar ? 1 : 2);
    poly.property('ADBE Vector Star Points').setValue(n);
    poly.property('ADBE Vector Star Outer Radius').setValue(fit);
    if (isStar) poly.property('ADBE Vector Star Inner Radius').setValue(fit * P.innerRatio);
    poly.property('ADBE Vector Star Rotation').setValue(P.rotation || 0);
  } else if (P.shape === 'path') {
    throw new Error("'path' 모양은 pathVertices 파라미터가 필요합니다.");
  }

  applyStyle(contents);
  if (P.rotation && P.shape !== 'star' && P.shape !== 'polygon' && P.shape !== 'triangle') {
    grp.property('ADBE Vector Transform Group').property('ADBE Vector Rotation').setValue(P.rotation);
  }
}

var sourcePool = [];
if (P.mode === 'useExisting') {
  if (P.sourceLayer == null) {
    var sel = comp.selectedLayers;
    for (var si = 0; si < sel.length; si++) sourcePool.push(sel[si]);
  } else {
    sourcePool.push(typeof P.sourceLayer === 'number' ? comp.layer(P.sourceLayer) : comp.layer(P.sourceLayer));
  }
  if (sourcePool.length === 0) throw new Error('useExisting: 소스 레이어 없음');
  for (var hi = 0; hi < sourcePool.length; hi++) {
    if (P.hideSource) sourcePool[hi].enabled = false;
  }
}

var poolPick = P.poolPick || 'random';
var cycleIdx = 0;

var created = 0;
for (var rr = 0; rr < P.rows; rr++) {
  for (var cc = 0; cc < P.cols; cc++) {
    var px = startX + cc * stepX;
    var py = startY + rr * stepY;

    var layer;
    if (P.mode === 'useExisting') {
      var pickIdx = poolPick === 'random'
        ? Math.floor(Math.random() * sourcePool.length)
        : (cycleIdx++ % sourcePool.length);
      var srcPick = sourcePool[pickIdx];
      layer = srcPick.duplicate();
      layer.enabled = true;
      layer.name = P.namePrefix + (rr + 1) + '_' + (cc + 1) + '_' + srcPick.name;

      if (!P.keepRotation) {
        layer.property('ADBE Transform Group').property('ADBE Rotate Z').setValue(0);
      }

      var rect = readSourceRect(layer, tExec);
      if (rect.width === 0 || rect.height === 0) throw new Error('sourceRect=0 ' + layer.name);
      var ctr = [rect.left + rect.width / 2, rect.top + rect.height / 2];
      setAnchorKeepVisual(layer, ctr, tExec);

      var aabb = compAabbFromRect(layer, rect, tExec);
      if (aabb.w <= 0 || aabb.h <= 0) throw new Error('AABB=0 ' + layer.name);

      var scProp = layer.property('ADBE Transform Group').property('ADBE Scale');
      var sc = scProp.valueAtTime(tExec, false);
      if (P.fitMode === 'stretch') {
        var fx = cellW / aabb.w;
        var fy = cellH / aabb.h;
        if (sc.length === 3) scProp.setValue([sc[0] * fx, sc[1] * fy, sc[2]]);
        else scProp.setValue([sc[0] * fx, sc[1] * fy]);
      } else {
        var u = (P.fitMode === 'cover')
          ? Math.max(cellW / aabb.w, cellH / aabb.h)
          : Math.min(cellW / aabb.w, cellH / aabb.h);
        if (sc.length === 3) scProp.setValue([sc[0] * u, sc[1] * u, sc[2]]);
        else scProp.setValue([sc[0] * u, sc[1] * u]);
      }

      var tr = layer.property('ADBE Transform Group');
      var posP = tr.property('ADBE Position');
      var pv = posP.valueAtTime(tExec, false);
      if (pv.length === 3) posP.setValue([px, py, pv[2]]);
      else posP.setValue([px, py]);
    } else {
      layer = comp.layers.addShape();
      layer.name = P.namePrefix + (rr + 1) + '_' + (cc + 1);
      makeShape(layer, cellW, cellH);
      layer.property('ADBE Transform Group').property('ADBE Position').setValue([px, py]);
    }

    if (P.opacity !== 100) {
      layer.property('ADBE Transform Group').property('ADBE Opacity').setValue(P.opacity);
    }
    if (P.blendMode) layer.blendingMode = P.blendMode;
    created++;
  }
}

return 'Created ' + created + ' ' + (P.mode === 'useExisting' ? 'clones' : P.shape + 's')
  + ' (' + P.cols + 'x' + P.rows + ') cell=' + cellW + 'x' + cellH
  + ' total=' + totalW + 'x' + totalH + ' center=' + cx + ',' + cy;
```

## 검증 체크리스트

- 활성 컴프가 존재한다.
- **`layout` 없음**: 정확히 `rows * cols`개 타일(또는 동일 개수의 클론).
- **`layout` 있음**(벤또·bento·`n×m` 조합 포함): `layout`마다 1레이어 + `fillRemaining`이면 빈 칸만큼 추가. 점유 배열에 겹침 0건.
- **`brickHoneycomb`**: 짝수 행은 **`brickAlignFirstColumn` ? `+stepX/2` : `-staggerX`**, 기본 **둘 다 꺼짐**(`rowShift=0`). `stepX`/`stepY`는 직교와 동일.
- **직교 1×1**: 각 타일 Transform Position이 `(startX + c * stepX, startY + r * stepY)`와 일치한다(0-based `r,c`).
- 블록의 중심이 `blockCenter` 공식과 일치하고, `useExisting` 시 재측정 AABB가 `blockW`×`blockH` 규칙을 만족한다.
- 그리드 전체 바운드(`totalW x totalH`)가 컴프(또는 `bounds`) 영역에 들어간다.
- `mode: "create"`: 모양별 바운딩이 셀 안에 맞고(`contain`) 또는 셀을 채운다(`cover`). polygon/star는 외경이 단위 1 기준 bbox로 계산된 fit 값과 일치한다.
- `mode: "useExisting"`: 앵커가 `sourceRect` 중심이고, 컴프 AABB가 `fitMode`에 맞게 `cellW`×`cellH`를 만족한다(contain이면 한 변이 셀에 맞닿음). 네 꼭짓점 `layerPointToComp` 검증 권장.
- Fill/Stroke 파라미터가 요청과 동일하다(없는 항목은 추가되지 않음).
- 같은 prefix의 잔존 레이어가 없다(`removeExisting: true`인 경우).

## 보고 형식

```
Created <N> <shape|clones> (<cols>x<rows>) cell=<cellW>x<cellH> total=<totalW>x<totalH> center=<cx>,<cy>
```

## 자주 쓰는 호출 예시

- 검은 원 6 x 7, 지름 135, 간격 12 → `shape:circle, cols:6, rows:7, cellSize:135, gap:12, fillColor:[0,0,0,1]`
- 라운드 사각형 8 x 5, 셀 120x80, 간격 16, 라운드 16, 빨강 + 검은 stroke 4 → `shape:roundedRect, cellSize:[120,80], gap:16, cornerRadius:16, fillColor:[1,0,0,1], strokeColor:[0,0,0,1], strokeWidth:4`
- 별 5각, 6 x 6, 셀 130 → `shape:star, points:5, innerRatio:0.45, cellSize:130`
- 컴프 안의 `Logo` 레이어를 5 x 4로 깔기, contain → `mode:useExisting, sourceLayer:"Logo", cols:5, rows:4, fitMode:"contain"`
- `layout` 있음: 2×2 + 1×2 + 2×1 블록 + `fillRemaining:true` → `layout:[{row:1,col:1,rowSpan:2,colSpan:2},…], fillRemaining:true`
- **벤또**(명칭만 다름): 6×7 + 변칙 블록 + 선택 풀 → `layout`+`fillRemaining:true`+`useExisting` 등. 블록 미지정 시 비중복 템플릿.
- 벌집 7행 `4,5,4,…`, 동그라미 135, gap 12 → `gridKind:brickHoneycomb, rows:7, shortCount:4, longCount:5, shape:circle, cellSize:135, gap:12` — 옵션 생략(기본) = 첫 열 X 차 ≈ 73.5. 첫 열 맞춤 시 `brickAlignFirstColumn:true`. 더 왼쪽만: `staggerX:36.75` 등(**`brickAlignFirstColumn`과 병행 금지**)
