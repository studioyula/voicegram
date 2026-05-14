---
name: ae-text-reveal-trackmatte
description: Applies alpha track-matte rectangle reveals with Position slide in/hold/out on timeline-selected layers in After Effects via coloso-ae-mcp execute or AE scripts. Supports single direction for all layers, cycle per layer, or random per layer; horizontal slide distance matches matte bounds width. Use when the user asks for 텍스트 리빌, 트랙매트 리빌, 슬라이드 등장·퇴장, TM_Reveal_, 선택 레이어 리빌, 레이어마다 다른 방향, 랜덤 방향 리빌, 또는 directions like 왼쪽/오른쪽/위/아래에서 등장.
---

# 텍스트(레이어) 트랙매트 슬라이드 리빌

## When to Use

- **타임라인에서 선택한 레이어**(복수 가능)에 알파 트랙매트 창 + Position 슬라이드 리빌을 걸 때
- 방향을 **한 가지로 통일**, **레이어마다 순환**, 또는 **레이어마다 랜덤**으로 요청할 때
- 사용자가 **방향을 문장으로 지정**(예: “전부 아래에서”, “각각 랜덤으로”)할 때 — 아래 [Natural language → options](#natural-language--options)로 매핑한다.

## Canonical scripts

프로젝트 내 원본 경로 (여기 기준으로 MCP·복사 유지):

| File | Role |
|------|------|
| `.cursor/skills/ae-text-reveal-trackmatte/scripts/text-reveal-trackmatte-slide.jsx` | 로직: bounds · 매트 생성 · 키 |
| `.cursor/skills/ae-text-reveal-trackmatte/scripts/text-reveal-trackmatte-Run.jsx` | ScriptUI 패널 |
| `.cursor/skills/ae-text-reveal-trackmatte/scripts/text-reveal-trackmatte-slide-exec.jsx` | 한 번 실행 (패널 없음) |

미러: `scripts/utility/text-reveal-trackmatte-*.jsx` (동기화 유지)

## Instructions

### Agent / MCP (`coloso-ae-mcp` `execute`)

1. 활성 컴프 확인 (`scan` 또는 사용자 언급).
2. 사용자가 **방향·모드**를 말했으면 [Natural language → options](#natural-language--options)로 `opts` 확정.
3. **`$.evalFile` 후 반드시 함수 호출** (eval만 하면 반환값 없음).

`REPO` = 워크스페이스 루트 (`students/coloso`).

```javascript
$.evalFile(
  REPO + "/.cursor/skills/ae-text-reveal-trackmatte/scripts/text-reveal-trackmatte-slide.jsx"
);
return runTextRevealTrackmatteSlide({
  directionMode: "single", // "single" | "cycle" | "random"
  singleDirection: "fromBottom",
  randomSeed: 20260511,
  slideMode: "fixed",
  fixedEnterOff: 140,
  fixedExitOff: 120,
  updateExisting: false
});
```

**선택 없이 특정 레이어만** 적용할 때 (예: 이름 목록):

```javascript
$.evalFile(REPO + "/.cursor/skills/ae-text-reveal-trackmatte/scripts/text-reveal-trackmatte-slide.jsx");
var comp = app.project.activeItem;
var list = [comp.layer("TEXT 2"), comp.layer("TEXT 3")];
return runForLayers(comp, list, { directionMode: "random", randomSeed: 11 });
```

### AE에서 직접

1. **타임라인에서 리빌할 레이어를 하나 이상 선택** (텍스트만이 아니라 `sourceRectAtTime` 가능한 AV 레이어 일반).
2. **File → Scripts → Run Script File** → `text-reveal-trackmatte-Run.jsx` (패널) 또는 `text-reveal-trackmatte-slide-exec.jsx` (무패널 한 번 실행).

패널에서 **방향 모드**: 단일 / 순환 / 랜덤, **단일 방향**, 슬라이드 px, **기존 TM_Reveal_*만 방향 갱신** 체크 가능.

### 선택 규칙

- 기본은 **활성 컴프 타임라인 선택만** 사용한다. 선택이 비면 스크립트는 오류를 낸다.
- `TM_Reveal_*` 매트만 선택된 경우: 바로 **아래 인덱스** 레이어가 콘텐츠로 치환된다.
- 다른 컴프 텍스트 자동 수집 폴백이 필요하면 `text-reveal-trackmatte-slide.jsx` 상단 `FALLBACK_COMP_NAME` / `FALLBACK_TEXT_EQUALS`를 채운다 (비어 있으면 비활성).

## Natural language → options

사용자 표현을 아래처럼 매핑한다 (영문 키워드도 동일 취급).

| 사용자 의도 | `directionMode` | `singleDirection` (single일 때만) |
|-------------|-----------------|-------------------------------------|
| 전부 같은 방향 / 모두 아래·위·좌·우에서 | `single` | 아래→`fromBottom`, 위→`fromTop`, 왼쪽→`fromLeft`, 오른쪽→`fromRight` |
| 레이어마다 번갈아 / 순서대로 네 방향 | `cycle` | — |
| 레이어마다 다르게 / 랜덤 방향 / 제각각 | `random` | — (`randomSeed`로 재현) |

방향을 말하지 않고 “랜덤만”이면 `directionMode: "random"`.  
“전부 아래에서”만 말하면 `single` + `fromBottom`.

## Parameters (`runTextRevealTrackmatteSlide(opts)`)

| 옵션 | 값 | 메모 |
|------|-----|------|
| `directionMode` | `single` \| `cycle` \| `random` | |
| `singleDirection` | `fromLeft` \| `fromRight` \| `fromTop` \| `fromBottom` | `single`일 때만 |
| `randomSeed` | number | `random` 패턴 고정 |
| `slideMode` | `fixed` \| `bounds` | 세로축: `fixed`면 등장·퇴장 px; `bounds`면 높이 기반 |
| `fixedEnterOff` / `fixedExitOff` | px | 위·아래 등장/퇴장 기본 |
| `updateExisting` | boolean | `true`면 기존 `TM_Reveal_*` 매트 유지, Position만 재계산 |
| `skipIfAlready` | boolean | 기본 `updateExisting`과 반대로 유지 |

## Behavior (요약)

- 매트 사각형은 **`layerBoundsInComp`** (마스크와 동일한 AABB).
- **좌우** 이동 거리: **`bounds.width`** (등장·퇴장 동일).
- **위아래** 이동 거리: **`bounds.height`** (마스크와 동일; 글자 분해 Shape처럼 높이가 작을 때 고정 140px 쓰면 과하게 튀어남).
- 타임라인: **0s→1s 등장 / 1s→2s 유지 / 2s→3s 퇴장**, 이징 Standard **80/80**.
- 처리 순서: 레이어 인덱스 **내림차순** (삽입 시 인덱스 꼬임 방지).

## Pitfalls (대량 셰이프·글자 분해 레이어)

- 글자마다 Shape 레이어가 많을 때, AE가 **복합 `Transform.Position` / `Scale` 의 `valueAtTime`** 에 대해 `Shape is not a number` 오류를 내는 경우가 있다 (차원 분리·컴프 상태 영향).
- 스크립트는 **`layerPointToComp`** 에서 Position은 **`getPositionVec2AtTime`**(분리 차원 지원), Scale은 분리 시 서브프로퍼티·**`.value` 폴백**으로 읽도록 통일했다.
- **`runForLayers`** 는 **`TM Reveal Track Matte`** 단일 undo 그룹으로 묶어 대량 적용 시 상태를 안정화한다.

## Verification checklist

- 스킬 경로: `.cursor/skills/ae-text-reveal-trackmatte/`
- `name`과 폴더명 일치: `ae-text-reveal-trackmatte`
- MCP는 `evalFile` + `return runTextRevealTrackmatteSlide(...)` 또는 `runForLayers`
- 수정 후 `scripts/utility/` 미러 동기화

## Related

- [mask-reveal-sync](../mask-reveal-sync/SKILL.md)
- [ae-easing-reference](../ae-easing-reference/SKILL.md)
