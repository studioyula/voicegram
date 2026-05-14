---
name: ae-easing-reference
description: Applies After Effects easing presets from the project easing reference, including default 80/80, overshoot, bounce, spring, and anticipation patterns. Use when the user asks for easing, easing presets, 오버슛, 바운스, 스프링, 안티시페이션, or requests easing alignment to project standards.
metadata:
  preferred_location: .cursor/skills
---

# AE Easing Reference

`user-coloso-ae-mcp`로 AE 이징을 적용할 때, 이 스킬은 `docs/easing-reference.md`를 단일 기준으로 사용한다.

## 사용 시점

- 사용자가 "기본 이징", "오버슛", "바운스", "스프링", "안티시페이션"을 요청할 때
- 이징값을 임의 추정하지 말고 문서 기준 프리셋으로 맞춰야 할 때
- 기존 키프레임 보간/속도그래프를 문서 기준으로 정리해야 할 때

## 필수 규칙

1. 먼저 `docs/easing-reference.md`를 읽고 해당 프리셋이 있는지 확인한다.
2. 프리셋이 있으면 문서 수치를 그대로 사용한다. 임의 변경 금지.
3. 사용자가 별도 수치를 명시한 경우만 예외로 적용한다.
4. Position 계열 `KeyframeEase` 적용 시 배열 크기 규칙을 지킨다.
   - OneD / Spatial Position: `[ease]`
   - TwoD: `[ease, ease]`
   - ThreeD: `[ease, ease, ease]`
5. `setTemporalEaseAtKey` 에러가 나면 속성 value type/차원을 재검사하고 배열 크기를 교정한다.

## 기본 프리셋 요약

- 기본값: **Standard 80/80** (`BEZIER`, speed 0)
- 기본 이징 요청 시: `80/80`을 우선 적용
- 사용자가 "더 하드/스냅"을 요구하면 문서의 `Ease Out Hard`, `Ease Out Snap` 등 대응 프리셋 사용

## 오버슛/바운스/스프링 적용 원칙

### Overshoot (Back)

- 문서 기준: `LINEAR` 2키 + Expression Controls
- 적용 전 키 보간을 먼저 `LINEAR`로 맞춘다.
- **고정 순서(필수):**
  1. 대상 Position의 기존 키프레임을 전부 `LINEAR`로 변경
  2. `Overshoot` / `Tension` 슬라이더 생성 및 값 설정 (`2`, `3`)
  3. Back 오버슛 Expression 적용
  4. 필요 시 재스캔으로 보간/표현식 적용 여부 확인
- 기본 파라미터:
  - `Overshoot = 2`
  - `Tension = 3`

### Bounce / Spring / Anticipation / Antic+Spring

- 문서에 정의된 **키 개수, 타이밍, offset, speed 감쇠 패턴**을 그대로 사용한다.
- 해당 패턴은 `LINEAR + speed 기반`이므로, 단순 BEZIER influence 조절로 대체하지 않는다.

## 작업 절차

1. `scan`으로 대상 컴프/레이어 확인
2. 대상 속성(Position/Scale 등)의 현재 키 구조 파악
3. 요청 프리셋이 `BEZIER influence 기반`인지 `LINEAR speed/표현식 기반`인지 분기
4. 필요 시 보간을 먼저 정규화 (`BEZIER` 또는 `LINEAR`)
5. 문서 수치 적용
6. 재스캔 또는 실행 결과로 적용 확인
7. 에러 발생 시 차원/배열 크기부터 점검 후 재적용

## 빠른 매핑

- "기본 이징" → Standard 80/80
- "오버슛" → Overshoot (Back), LINEAR + Overshoot=2/Tension=3
- "바운스" → Bounce 7KF 패턴
- "스프링" → Spring Out 5KF 패턴
- "안티" / "anticipation" → Anticipation 3KF
- "안티+스프링" → Antic + Spring 6KF

## 참조

- 상세 수치/수식: `docs/easing-reference.md`
- 실행 예시: `examples.md`
- 실행 스크립트: `scripts/overshoot-back.jsx`, `scripts/apply-standard-80-80.jsx`

## 실행 방식

1. 스킬에서 먼저 스크립트 파일을 읽는다.
2. 필요한 값(레이어 필터, 파라미터)을 최소 수정한다.
3. `ae_execute`의 `script`로 해당 코드 문자열을 실행한다.
4. 실행 후 `scan` 또는 반환값으로 적용 레이어 수를 확인한다.
