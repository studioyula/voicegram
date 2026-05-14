# ae-shape-grid — 벌집·벽돌 격자 (brick / honeycomb)

**행마다 가로 타일 개수가 1만큼 번갈아** 들어간다. **정사각·직사각 셀 공통:**

- **`stepX = cellW + gapX`**, **`stepY = cellH + gapY`** (가로·세로 **각각** 셀 크기 반영).
- **`px`는 `stepX`**, **`py`는 `stepY`**: `py = startY + r * stepY`, `startY = cy - (rows-1)*stepY/2`.

`cellW`만 쓰고 세로간격에도 같은 값을 넣으면 직사각 셀에서 격자가 어긋난다.

## 첫 열(맨 왼쪽 도형) X가 어긋나는 이유

`px = cx + rowShift + (i - (count-1)/2) * stepX` 일 때 **추가 `rowShift = 0`** 이면:

- **짧은 행** `count = nShort`(예: 4): `i=1` 일 때 `px = cx - 0.5*stepX`
- **긴 행** `count = nLong`(예: 5): `i=1` 일 때 `px = cx - stepX`

→ 인접 홀·짝 행의 **첫 도형 X 차이는 기본적으로 `stepX/2`** (한 피치의 절반). **별도 `rowShift` 없이도** 벌집 느낌이 난다.

## 옵션 A — 추가로 왼쪽으로만 밀기 (`staggerX`)

- **`staggerX`**: **추가** 가로 오프셋 **크기(양수)**. 생략 또는 `0`이면 **짝수 행 추가 시프트 없음** (검증된 기본).
- **옵션 B — 첫 열 X 맞춤 (`brickAlignFirstColumn`)** 와 **동시에 쓰지 않음** (실행 전 검사).

**짝수 번째 행(1-based 2,4,6…)** = 0-based `r % 2 === 1` 일 때, 기본(둘 다 끄기)은 **`rowShift = 0`**.  
`staggerX`만 쓸 때:

```text
rowShift = (r % 2 === 1) ? (-staggerX) : 0
```

짝수 행만 **왼쪽(−X)**으로 `staggerX`만큼 더 밀린다. `staggerX = stepX/2` 면 홀·짝 **첫 열 X 차가 약 `stepX`**까지 커질 수 있다. 중간은 **`stepX/4`** 등.

## 옵션 B — 첫 열 정렬 (`brickAlignFirstColumn`)

- **`brickAlignFirstColumn`**: **선택**, 기본 **`false`**. **`true`**이면 짝수 행만 **`rowShift = +stepX/2`** (오른쪽 보정). 수학적으로 **짧은 행·긴 행 모두 `i=1` 의 X가 같아짐.**
- 이 모드에서는 **`staggerX`는 0(또는 생략)**만 허용.

## 선택 레이어 AABB → `cellW`·`cellH` (크기 유지·벌집 배치)

요청: “선택한 레이어 **컴프 기준 바운딩** 크기 = 셀, 간격 12, 4·5·4·5…”

1. `sourceRectAtTime(t,false)` 네 모서리를 레이어 로컬로 잡고, **`layerPointToComp`**로 컴프 좌표로 변환 후 min/max → **`cellW`·`cellH`·AABB 중심**. **`layer.toComp` 금지** — `docs/08-patterns-and-pitfalls/layer-to-comp-extendscript.md`, `scripts/utility/layer-point-to-comp.jsx`.
2. `stepX`/`stepY`·`rowShift`·`px`/`py`는 위 절과 동일 (`staggerX` / `brickAlignFirstColumn` 포함).
3. 슬롯 중심 `(px,py)`에 맞추기: AABB 중심 `(bcx,bcy)` 계산 후 **`Position += (px-bcx, py-bcy)`** (현재 스케일·회전 유지).
4. 첫 칸 = 선택 레이어 이동 + 이름; 나머지 = **`duplicate()`** 후 동일 이동. 접두(예: `HoneyRectGrid_`) 중복 누적 방지용으로 기존 동명 레이어 먼저 제거.

## 파라미터

- `gridKind`: `rect` | `brickHoneycomb`
- `rows`, `shortCount`, `longCount`: 번갈아 가로 개수(예: 4 / 5). 0-based 짝수 인덱스 행 `r%2===0` → `shortCount`, 홀수 인덱스 → `longCount`.
- `cellW`·`cellH`: 직교·벌집 공통. 정사각이면 같게. **직사각 셀**이면 **`stepY = cellH + gapY`** 로 세로 간격 계산(가로 `stepX`만 쓰지 말 것).
- `staggerX`: 선택. 기본 **`0`**. (`brickAlignFirstColumn`이 아닐 때) 짝수 행 **`rowShift = -staggerX`**.
- `brickAlignFirstColumn`: 선택. 기본 **`false`**. `true`이면 짝수 행 **`rowShift = +stepX/2`** (`staggerX`와 배타).
- `stepX`, `stepY`, `startY`, `px`, `py`는 직교 격자와 동일 (`py`에는 반드시 **`stepY`**).

## ExtendScript 골격 (직사각형 셀; 정사각이면 `cellW === cellH`)

```javascript
var NROWS = 7;
var nShort = 4;
var nLong = 5;
var cellW = 135;
var cellH = 80; // 직사각 셀
var gapX = 12;
var gapY = 12;
var stepX = cellW + gapX;
var stepY = cellH + gapY;
var staggerX = 0;
var brickAlignFirstColumn = false;
var cx = comp.width / 2;
var cy = comp.height / 2;
var startY = cy - (NROWS - 1) * stepY / 2;

for (var r = 0; r < NROWS; r++) {
  var count = (r % 2 === 0) ? nShort : nLong;
  var rowShift = 0;
  if (r % 2 === 1) {
    rowShift = brickAlignFirstColumn ? stepX / 2 : -staggerX;
  }
  for (var i = 0; i < count; i++) {
    var px = cx + rowShift + (i - (count - 1) / 2) * stepX;
    var py = startY + r * stepY;
    // create / place 타일: 크기 cellW x cellH, 중심 (px, py)
  }
}
```

## `useExisting`

행마다 `count`와 `rowShift`만 다르고, 각 슬롯은 1×1로 **기존 `useExisting` 파이프라인**을 그대로 쓴다.

## 검증

- 같은 행 이웃 중심 간격 `stepX`, 대각 이웃 거리가 겹침 없는지 샘플 확인.
- **`staggerX=0` & `brickAlignFirstColumn=false`**: 홀·짝 첫 도형 X 차 ≈ **`stepX/2`**. `staggerX = stepX/2`면 차가 약 **`stepX`**까지 커진다.
- **`brickAlignFirstColumn=true`**: 홀·짝 **첫 열 X 동일** (짝수 행 `+stepX/2`).
