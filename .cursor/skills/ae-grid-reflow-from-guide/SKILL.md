---
name: ae-grid-reflow-from-guide
description: Reflows rect layers into a guide-bounded grid at 0s and restores original positions at 1s using a fast stable O(n log n) mapping. Use when asked to pack layers into a drawn rectangle area and return to original layout.
---

# AE Grid Reflow From Guide

가이드 네모 영역 안으로 `rect` 레이어들을 그리드 재배치한 뒤, `1초`에 원래 위치로 되돌리는 AE 작업 스킬.

## When to Use

- 사용자가 "이 범위 안에 그리드로 꽉 채워 배치"를 요청할 때
- 사용자가 "0초 그리드, 1초 원위치" 애니메이션을 요청할 때
- 많은 레이어(예: 100+개)를 빠르고 안정적으로 처리해야 할 때

## Instructions

1. 항상 `user-coloso-ae-mcp`를 사용한다.
2. 활성 컴프를 확인한다. 없으면 중단한다.
3. 가이드 레이어를 결정한다.
   - 우선순위: 현재 선택 레이어 첫 번째
   - 없으면 이름이 `Shape Layer 1`인 레이어
   - 둘 다 없으면 사용자에게 가이드 선택 요청
4. 가이드 레이어의 `sourceRectAtTime(0, false)`와 Transform(Position/Anchor/Scale)으로 실제 2D 바운드(`left/top/width/height`)를 계산한다.
5. 대상 레이어를 수집한다.
   - 가이드 제외
   - 레이어 이름이 정확히 `rect` (case-insensitive)
   - Position 속성이 있는 레이어만 포함
6. 각 대상의 원본 좌표를 `1초 기준`으로 읽는다.
   - Position 키가 있으면 `valueAtTime(1, false)`
   - 키가 없으면 현재 `value`
7. 그리드 크기를 계산한다.
   - `cols = ceil(sqrt(n * (width/height)))`
   - `rows = ceil(n / cols)`
8. 매핑은 빠른 정렬 기반(`O(n log n)`)으로 수행한다.
   - 전체 대상을 `(y 오름차순, x 오름차순, layer.index)`로 정렬
   - 행(row) 단위로 분할 후 각 행 내부를 `x 오름차순` 재정렬
   - 셀 중심점으로 배치 (`left + (col+0.5)*stepX`, `top + (row+0.5)*stepY`)
9. Position 키프레임을 설정한다.
   - `0초`: 그리드 위치
   - `1초`: 원래 위치
   - 3D Position이면 z값 유지
10. 결과를 짧게 보고한다.
   - 적용 레이어 수
   - 가이드 레이어
   - rows x cols

## Parameters

- `guideLayer`: 기본값 `selected[0]` (fallback: `Shape Layer 1`)
- `targetName`: 기본값 `rect`
- `startTime`: 기본값 `0`
- `restoreTime`: 기본값 `1`

## Verification Checklist

- 활성 컴프가 존재한다.
- 가이드 바운드 `width > 0`, `height > 0`.
- 대상 레이어 수가 1개 이상이다.
- 모든 대상에 `0초`/`1초` Position 키가 존재한다.
- `1초` 위치가 실행 전 원본 위치와 동일하다.
