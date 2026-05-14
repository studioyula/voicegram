---
name: ae-sliding-tile-clone-sources
description: Runs the sliding-tile shuffle with selected comp layers duplicated as tiles, per-layer AABB fit to the cell (sourceRectAtTime + layerPointToComp, preserves X/Y scale ratio), then deletes originals. Use when the user asks for 슬라이딩 타일 + 선택 레이어, 레이어 복제 타일, 모양 레이어 셀 맞춤, clone source layers for puzzle, or delete originals after tile bake.
---

# AE Sliding Tile — 선택 레이어 복제 모드

구현·스크립트 실체는 **[ae-sliding-tile-shuffle](../ae-sliding-tile-shuffle/)** 와 **동일 파일**을 쓴다. 이 스킬은 **“선택 레이어 → 복제 타일 → 셀별 스케일 → 끝나면 원본 삭제”** 워크플로만 분리해 둔다.

## When to Use

- 타일을 **흰 네모 대신** 타임라인에서 고른 레이어들로 채우고 싶다
- **셀 한 변(px)** 그리드는 그대로 두되, **소스마다 스케일이 달라도** 각각 셀에만 맞추면 된다
- **모양 레이어** 등 `width`/`height`만으로는 부정확한 타입을 포함한다
- 실행 후 **선택했던 원본 레이어는 제거**한다

## 의존 경로 (복사하지 말 것)

| 용도 | 파일 |
|------|------|
| 패널 + 알고리즘 | [ae-sliding-tile-shuffle/sliding-tile-Run.jsx](../ae-sliding-tile-shuffle/sliding-tile-Run.jsx) |
| MCP / evalFile 전용 | [ae-sliding-tile-shuffle/sliding-tile-puzzle-core.jsx](../ae-sliding-tile-shuffle/sliding-tile-puzzle-core.jsx) |

`Run.jsx` / `puzzle-core.jsx` 는 **로직 동기화** 유지 (한쪽만 고치지 말 것).

## 사용자 (AE) — **이것만 하면 됨**

1. **`sliding-tile-Run.jsx`** 를 **File → Scripts → Run Script File…** 로 **한 번 실행**한다 → **인터페이스(패널)** 가 뜬다.
2. 패널에서 설정 후 **「타일 생성 · 셔플 적용」**. (복제 모드: 미리 **타일로 쓸 레이어 선택** · 잠금 해제.)

별도 런처·멀티 스텝 불필요. **인터페이스 스크립트 실행만**으로 충분하다.

`open-ui.jsx`·`puzzle-shuffle.jsx` 등은 **에이전트/MCP** 또는 특수 경우용이며, 일반 사용은 **`Run.jsx` 단일 실행**이 기준이다.

## Instructions (에이전트 · MCP)

1. `coloso-ae-mcp` `ae_scan` 으로 활성 컴프 확인.
2. `$.evalFile` 로 **core** 로드 후 `aeSlidingTileRun(comp, P)` 호출.
3. 복제 모드일 때만 `P`에 아래 키 추가 (레이어 참조는 **같은 컴프**의 **아직 존재하는** 객체).
4. 부트스트랩·그 외 `P` 키·빈칸 비율·이징 규칙은 [ae-sliding-tile-shuffle SKILL.md](../ae-sliding-tile-shuffle/SKILL.md) 와 동일.

## Parameters (복제 모드 전용)

| 키 | 의미 |
|----|------|
| `sourceLayers` | `Layer` 참조 배열 (택 1개 이상). 타일마다 풀에서 무작위로 골라 `duplicate()`. |
| `removeSourceLayersAfter` | `true` 권장: 베이크 끝난 뒤 `sourceLayers` 원본 삭제 (인덱스 큰 순). `false` 로 원본 유지 가능. |

검증은 `instanceof Layer` 대신 **`containingComp` + `comp.layer(index) === ref`** 등으로 수행한다 (ExtendScript 호환).

## 스케일 (복제 타일 한 장당)

- `parent` 해제 후, **현재 X/Y 스케일 비율 유지**.
- `sourceRectAtTime` 네 꼭짓점을 **layerPointToComp** 로 올려 컴프 기준 **축정렬 AABB**의 `max(가로, 세로) = m`.
- `f = cellSize / m` 를 X·Y 스케일에 동일 적용. `sourceRect` 실패 시 `layer.width` / `layer.height` 폴백.

## Verification Checklist

- [ ] 스킬 폴더는 `.cursor/skills/ae-sliding-tile-clone-sources/` 단일 `SKILL.md` (스크립트는 shuffle 스킬 폴더에만 둠)
- [ ] 사용자에게 **인터페이스 = `sliding-tile-Run.jsx` 실행 한 번**만 안내 (런처·다단계 생략)
- [ ] MCP 시 `sourceLayers` + `removeSourceLayersAfter` 와 core 경로 `evalFile` 명시
