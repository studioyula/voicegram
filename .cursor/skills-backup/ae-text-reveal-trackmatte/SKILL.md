---
name: ae-text-reveal-trackmatte
description: Applies fixed alpha track-matte rectangle reveals on selected layers (text slide in/out) via coloso-ae-mcp execute or AE Run Script. Use when the user asks for 텍스트 리빌, 트랙매트 리빌, 슬라이드 등장/퇴장, random/cycle/single 방향 리빌, TM_Reveal_, or text-reveal-trackmatte-slide.
---

# AE 텍스트(레이어) 트랙매트 슬라이드 리빌

## When to Use

- 고정 **알파 트랙매트 창** + **콘텐츠만 Position 이동**으로 리빌
- 레이어별 **랜덤/단일/순환** 등장 방향
- MCP(`coloso-ae-mcp` `execute`) 또는 AE **스크립트 파일** 실행

## Script location (canonical)

| File | Role |
|------|------|
| [scripts/text-reveal-trackmatte-slide.jsx](scripts/text-reveal-trackmatte-slide.jsx) | 본체: CONFIG + `runTextRevealTrackmatteSlide()` |
| [scripts/text-reveal-trackmatte-slide-exec.jsx](scripts/text-reveal-trackmatte-slide-exec.jsx) | AE 메뉴용: 형제 `slide.jsx`를 `evalFile` 후 실행 |

동일 내용 미러: `scripts/utility/text-reveal-trackmatte-slide*.jsx` (에이전트가 스킬 스크립트 수정 후 `cp`로 맞출 것).

## Instructions

### 1) AE에서 직접

1. 대상 컴프 타임라인에서 리빌할 레이어 다중 선택.
2. **File → Scripts → Run Script File** → `text-reveal-trackmatte-slide-exec.jsx` 선택.

### 2) Cursor / MCP (`coloso-ae-mcp` `execute`)

`$.evalFile`은 반환값을 넘기지 않으므로 **한 번 로드 후 함수 호출**한다.

- 스크립트 절대 경로는 사용자 머신 기준으로 치환한다. 저장소 루트를 `REPO`라 하면:

```javascript
$.evalFile("REPO/.cursor/skills/ae-text-reveal-trackmatte/scripts/text-reveal-trackmatte-slide.jsx");
return runTextRevealTrackmatteSlide();
```

### 3) 베리에이션 (CONFIG만 수정)

`text-reveal-trackmatte-slide.jsx` 상단 블록만 편집한다.

| 변수 | 의미 |
|------|------|
| `DIRECTION_MODE` | `"random"` \| `"single"` \| `"cycle"` |
| `SINGLE_DIRECTION` | `"fromLeft"` \| `"fromRight"` \| `"fromTop"` \| `"fromBottom"` |
| `RANDOM_SEED` | `random` 패턴 재현용 |
| `T_ENTER_START` … `T_EXIT_END` | 기본 `0, 1, 2, 3` (초) |
| `SLIDE_MULT`, `MIN_SLIDE_PX` | 슬라이드 거리 |
| `FALLBACK_COMP_NAME`, `FALLBACK_TEXT_EQUALS` | **활성 컴프에서 선택이 없을 때만**: 이름이 일치하는 컴프에서 소스 텍스트가 일치하는 `TextLayer` 자동 수집. 미사용 시 둘 중 하나를 `""` 로 비운다. |
| `MATTE_NAME_PREFIX` | 생성 매트 레이어 접두사 (기본 `TM_Reveal_`) |
| `SKIP_IF_ALREADY_REVEALED` | `true`(기본): 바로 위가 `TM_Reveal_*`이고 TrkMat이 켜진 레이어는 **바운딩/키 재계산 안 함**. `false`면 매트 중복 생성 가능. |

## Behavior (요약)

- 각 대상 레이어: `sourceRectAtTime` 네 꼭짓점을 `layerPointToComp`로 옮겨 **컴프 AABB** → 그 크기의 **사각 셰이프 + 흰 Fill** → `moveBefore` 후 **Alpha 트랙매트**. (`TM_Reveal_*` 이름의 레이어는 루프에서 제외; 선택만 된 경우는 아래 인덱스로 치환.)
- **이미 리빌됨** (`SKIP_IF_ALREADY_REVEALED`): 콘텐츠 **바로 위**(`index - 1`)가 `MATTE_NAME_PREFIX`로 시작하고 `trackMatteType`이 꺼져 있지 않으면 스킵.
- 매트는 **고정**; **Position**만 `T_ENTER_START` 밖 → `T_ENTER_END` 안 → `T_HOLD_END` 유지 → `T_EXIT_END` (등장 축 그대로 이탈).
- 처리 순서: 레이어 **인덱스 내림차순** (삽입으로 인덱스 꼬임 방지).
- 이징: **Standard 80/80** (`KeyframeEase(0,80)` + BEZIER).

## Know-how / pitfalls

1. **ExtendScript에서 `layer.toComp` 금지** — 컴프 좌표는 `layerPointToComp` 패턴(또는 `scripts/utility/layer-point-to-comp.jsx`) 사용. 프로젝트: `docs/08-patterns-and-pitfalls/layer-to-comp-extendscript.md`.
2. **`instanceof AVLayer`로 텍스트 필터 금지** — 일부 환경에서 `TextLayer`가 기대와 다르게 동작할 수 있음. **카메라/라이트만 제외**하고 처리.
3. **선택 수집** — `comp.selectedLayers`에 의존하지 말고 `layer.selected` 루프 사용.
4. **`$.evalFile` 단독 호출** — MCP 결과 문자열이 필요하면 반드시 `runTextRevealTrackmatteSlide()`를 **이어서** 호출.
5. **트랙매트 순서** — 매트 레이어를 콘텐츠 **바로 위**로 둔 뒤 `setTrackMatte`(또는 구버전은 `trackMatteType` + 순서).
6. **Y축** — AE는 Y↓ 증가; `fromBottom`은 `oy0 = +slide`, 퇴장은 `oy3 = -slide`.
7. **재실행** — 기본(`SKIP_IF_ALREADY_REVEALED = true`)이면 이미 붙은 쌍은 **건너뜀**. `false`로 두면 매트가 **중복** 생길 수 있음.
8. **회전 레이어** — 매트는 AABB **축정렬 사각형** (회전 텍스트는 타이트 박스가 아님).
9. **`TM_Reveal_*`만 선택** — 스크립트가 **바로 아래 인덱스** 레이어를 콘텐츠로 치환해 적용한다 (표준 트랙매트 스택 전제). 스택이 다르면 글자 레이어를 직접 고른다.

## Verification checklist

- [ ] 스킬 경로: `.cursor/skills/ae-text-reveal-trackmatte/`
- [ ] `name` 과 폴더명 일치: `ae-text-reveal-trackmatte`
- [ ] MCP는 `evalFile` + `return runTextRevealTrackmatteSlide();`
- [ ] 수정 후 필요 시 `scripts/utility` 미러 동기화

## Related

- 트림패스/마스크 분기별 워크플로: [mask-reveal-sync](../mask-reveal-sync/SKILL.md)
- 이징 레퍼런스: [ae-easing-reference](../ae-easing-reference/SKILL.md)
