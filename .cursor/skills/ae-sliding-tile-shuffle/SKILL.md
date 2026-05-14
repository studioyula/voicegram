---
name: ae-sliding-tile-shuffle
description: Builds a full-comp rectangle tile grid in After Effects, then bakes a 15-puzzle style orthogonal slide shuffle on Position (no expressions). Includes ScriptUI panel and core API for any resolution. Use when the user asks for sliding tile shuffle, 15-puzzle animation, 타일 슬라이드 셔플, AE panel, or orthogonal tile motion with coloso-ae-mcp.
disable-model-invocation: true
---

# AE Sliding Tile Shuffle

활성 컴프에 **Shape 사각형(Rect)** 타일만 깔고, 빈 칸을 두어 **상·하·좌·우 1칸 슬라이드**로만 셔플되는 **키프레임 베이크** 애니메이션을 한 번에 만든다. Expression 없음. **해상도는 컴프 `width`/`height`에 맞춰 자동** (정사각 셀).

## 파일 구성

| 파일 | 역할 |
|------|------|
| **[sliding-tile-Run.jsx](sliding-tile-Run.jsx)** | **단일 파일**: 알고리즘 + ScriptUI 패널. 작성 후 **바로 실행** (`File → Scripts → Run Script File…`). ScriptUI Panels 에 복사해도 동일. |
| [sliding-tile-open-ui.jsx](sliding-tile-open-ui.jsx) | (선택) 같은 폴더의 `sliding-tile-Run.jsx`만 `$.evalFile` — 런처. |
| [sliding-tile-puzzle-core.jsx](sliding-tile-puzzle-core.jsx) | `aeSlidingTileRun` 단독(에이전트·다른 스크립트에서 로드용). **Run.jsx 와 로직 중복** — 수정 시 둘 다 맞출 것. |
| [sliding-tile-puzzle-shuffle.jsx](sliding-tile-puzzle-shuffle.jsx) | Run Script용 얇은 래퍼 — core `$.evalFile` 후 실행 |

## After Effects에서 쓰기

**`sliding-tile-Run.jsx` 인터페이스 스크립트만 실행하면 된다.**

1. **File → Scripts → Run Script File…** → **`sliding-tile-Run.jsx`** (한 파일에 알고리즘 + 패널 포함).
2. 뜬 패널에서 설정 후 **「타일 생성 · 셔플 적용」**.

(선택) **Window에 고정**: 같은 파일을 `…/Scripts/ScriptUI Panels/` 에 넣고 AE 재시작.

기타 `sliding-tile-open-ui.jsx` / `sliding-tile-puzzle-shuffle.jsx` 는 **보조**용이다. 일반 작업은 **`Run.jsx` 단일 실행**이면 충분하다.

## When to Use

- "15퍼즐처럼 타일 슬라이드"
- "슬라이딩 타일 셔플"
- "직교만 / 대각선 금지 타일 애니메이션"
- "AE 패널 / 버튼으로 타일 셔플"
- 기본 도형(네모)만으로 그리드 + 셔플

**선택 레이어를 복제해 타일로 쓰는 모드**(원본 삭제·셀별 AABB 스케일): [ae-sliding-tile-clone-sources](../ae-sliding-tile-clone-sources/SKILL.md).

## Instructions (에이전트 · MCP)

1. `coloso-ae-mcp` → `scan`(요약)으로 활성 컴프·길이·fps 확인.
2. 파라미터는 `P` 객체로 맞춘다 (아래 **Parameters**). 또는 사용자가 패널만 쓰는 경우 스킬 실행 생략.
3. MCP `execute` 시 **`sliding-tile-puzzle-core.jsx`를 먼저 `$.evalFile`** 한 뒤 `aeSlidingTileRun(comp, P)` 호출 (부트스트랩 하단). `sliding-tile-puzzle-shuffle.jsx`만 `eval`하는 방식은 **$.fileName이 임시 경로면 core를 못 찾으므로** MCP에서는 피한다.
4. 반환 JSON으로 `nTiles`, `totalMoves`, `steps` 등을 짧게 보고한다.

## Parameters (`P`)

| 키 | 의미 | 예시 |
|----|------|------|
| `cols` | 열 수 | `8` |
| `rows` | 행 수 | `6` |
| `emptyRemove` | **꽉 찬 그리드 대비 비울 칸 비율** (0~1) | 기본 `0.33` |
| `fillColor` | Rect Fill RGBA 0~1 (기본 흰색) | `[1,1,1,1]` |
| `density` | (선택) 레거시. `emptyRemove` 없을 때 타일 비율 | 생략 권장 |

- 셀은 **정사각형**: `cellSize = max(comp.width/cols, comp.height/rows)`, 그리드 **컴프 중앙** 정렬 (한 축은 프레임 살짝 초과 가능).
- 기본 **Fill** 흰색. 그 외 `moveDur`, `stepDur`, `marginEnd`, `namePrefix` 등은 `P`에서 동일.

## 규칙 (코어 그대로)

- 타일 식별: **tileId** 1부터. `layer.index` 미사용.
- 이동: **맨해튼 1**, 4방향만.
- **충돌 방지(동시 이동, 한 스텝)**: 출발·도착 **각 셀 + 상하좌우 4이웃** 잠금 합집합. 같은 스텝에서 잠긴 셀은 다른 이동에 미사용.
- 키: 이동 시작 **1프레임 전** 동일 값 키.
- 이징: 홀수 키 out `influence 10`, 짝수 키 in `influence 95` (나머지 33).
- 경로: 한 축 스냅 + 공간 탄젠트 0.

## 실행 (MCP 부트스트랩)

`ABS_PATH` 를 워크스페이스 기준 스킬 폴더 절대 경로로 바꾼다.

```javascript
var base = "/ABS_PATH/coloso/.cursor/skills/ae-sliding-tile-shuffle/";
$.evalFile(base + "sliding-tile-puzzle-core.jsx");
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) throw new Error("활성 컴프 없음");
var P = {
  cols: 8,
  rows: 6,
  emptyRemove: 0.33,
  density: null,
  moveDur: 0.2,
  stepDur: 0.25,
  marginEnd: 0.5,
  namePrefix: "SlideTile_",
  fillColor: [1, 1, 1, 1],
  strokeColor: null,
  strokeWidth: 0,
  removeExisting: true
};
return aeSlidingTileRun(comp, P);
```

`searchDocs`: false 권장. `timeout`: 120000~180000.

## Verification Checklist

- [ ] 사용자 실행은 **`sliding-tile-Run.jsx` 하나**로 안내 가능한지
- [ ] 활성 컴프가 있고 `comp.duration > P.marginEnd + P.moveDur`
- [ ] 반환 JSON에 `totalMoves`, `maxConcurrent`, `steps` 포함
- [ ] 타일은 Shape **Rect** + 흰 Fill 기본

## 참고

- 구현 단일 소스(수동 편집 시): [sliding-tile-Run.jsx](sliding-tile-Run.jsx) 전체 + 필요 시 [sliding-tile-puzzle-core.jsx](sliding-tile-puzzle-core.jsx) 동기화
