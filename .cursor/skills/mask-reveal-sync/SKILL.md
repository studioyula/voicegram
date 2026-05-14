---
name: mask-reveal-sync
description: Applies branch-based mask reveal workflows in After Effects using user-coloso-ae-mcp. Executes only the explicitly requested branch, such as marker mask reveal, text-to-marker track matte, directional outro, trim-path start/end control, and 등장/퇴장 animation requests.
---

# Mask Reveal Sync

마스크 리빌 관련 요청을 분기별로 처리한다.
한 번에 전부 적용하지 않고, 사용자가 언급한 항목만 정확히 실행한다.

## Trigger Phrases

- "마스크 리빌"
- "트랙매트 걸어줘"
- "등장"
- "등장 애니메이션"
- "퇴장"
- "퇴장 애니메이션"
- "등장한 방향 그대로 사라지게"
- "trim paths start/end"
- "키프레임 건드리지 말고 타이밍만"

## Core Rules

1. 항상 `user-coloso-ae-mcp`를 사용한다.
2. 기본 이징은 `Standard 80/80`을 사용한다(별도 지시 없을 때).
3. 사용자가 "키프레임 건드리지마"라고 하면 값/경로는 유지하고 `startTime`, `inPoint`, `outPoint`만 조정한다.
4. marker는 복제/이동하지 않는다. 여러 text가 하나의 marker를 공유할 수 있다.
5. **요청 분기 외 작업 금지**: 트리거된 분기에서 정의한 작업만 실행한다.

## Branch Router (필수)

사용자 문장에서 아래 키워드에 해당하는 분기만 실행한다.

- **A. Marker Mask Reveal**
  - 트리거: "마스크리빌", "marker 리빌", "슬라이드로 등장", "등장"
  - 실행: marker `LR_Reveal_Mask` 생성/수정 + 리빌 키
- **B. Text Track Matte**
  - 트리거: "트랙매트", "text를 marker에 매트"
  - 실행: text↔marker 매칭 후 `setTrackMatte`
- **C. Trim Paths**
  - 트리거: "트림패스", "trim paths", "start/end"
  - 실행: stroke Trim Paths 규칙만 적용
- **D. Outro / 사라짐**
  - 트리거: "사라지게", "아웃", "3초부터", "퇴장"
  - 실행: 선택 키프레임 기반 아웃 생성

여러 분기가 동시에 명시된 경우에만 해당 분기들을 순서대로 실행한다.

## Common Preflight

1. `scan` 또는 `execute` 스모크로 활성 컴프 확인.
2. 분기에 필요한 레이어만 수집한다(전체 수집 금지).
3. 선택 기반 요청이면 선택 레이어 우선, 없으면 이름 패턴 fallback.

## Branch A) Marker Mask Reveal (슬라이드 방식)

1. marker 레이어에 `LR_Reveal_Mask` 마스크가 없으면 생성.
2. `Mask Path`를 좌->우 슬라이드 리빌 2키로 설정:
   - K1: 폭 거의 0
   - K2: 전체 폭
3. 기본 이징(`80/80`) 적용.

## Branch B) Text Track Matte

1. text와 marker의 화면상 겹침을 계산해 최적 marker를 매칭한다.
2. 최신 방식 사용:
   - `textLayer.setTrackMatte(markerLayer, TrackMatteType.ALPHA)`
3. marker 레이어는 이동/복제하지 않는다.
4. 가시성 요청 시 text/marker 모두 `enabled = true`로 맞춘다.

## Branch C) Stroke Trim Paths

1. stroke 레이어에 `Trim Paths` 추가(없을 때만).
2. 등장:
   - `End: 0 -> 100`
   - **`End`는 앞 구간 2키만 사용한다** (등장 시작/등장 끝).
   - **`End` 뒤쪽(퇴장 구간)에는 키를 추가하지 않는다.**
3. 사라짐(등장 방향 유지):
   - `Start: 0 -> 100`
   - **`Start`는 뒤 구간 2키만 사용한다** (퇴장 시작/퇴장 끝).
   - **`Start` 앞쪽(등장 구간)에는 키를 추가하지 않는다.**
4. `End`를 줄여 사라지게 하지 않는다(방향 반전/불일치 방지).
5. 사용자가 "start로 사라지게"를 명시하면 반드시 `Start` 기반 아웃만 적용한다.
6. 즉, 최종 키 구조는 항상 아래를 따른다.
   - `End`: 키프레임 2개(앞쪽만)
   - `Start`: 키프레임 2개(뒤쪽만)
   - 그 외 보정용 중간 키/유지 키 생성 금지

## Branch D) Outro(사라짐)

1. 선택 키프레임 스캔 후, 현재 기준 시점(예: 3초)부터 아웃 시작.
2. 등장 순서/기존 타이밍 오프셋을 유지해 아웃 시간 분산.
3. 속성별 처리:
   - Opacity/Trim End 계열: 시작값으로 회귀(페이드/소거)
   - Position 계열: 등장 벡터 방향 연장으로 이탈
   - Mask Path 계열: 등장 시 패스 변화 방향을 추정해 같은 방향으로 collapse
4. 아웃 duration은 기존 등장 duration을 우선 재사용.
5. 마스크 아웃은 패스 변화 방향을 읽어 같은 방향 소거를 우선 적용한다.

## Guardrails

- `selectedKeys.length < 2`면 해당 속성은 건너뛰고 사유를 반환한다.
- 같은 이름 레이어가 여러 개면 `layer.index`를 함께 보고 처리한다.
- `toComp()`가 불가한 타입일 수 있으므로 bounds는 `sourceRectAtTime + Transform` 대안 경로를 준비한다.
- ES3/ES5 문법만 사용한다(`var`, `function`).
- `alert()` 금지, 오류는 `throw new Error()`로 반환한다.
- 분기에 없는 작업은 절대 적용하지 않는다.
- 분기 충돌 시 실행 전 사용자 의도 우선순위를 재확인한다.

## Result Report Format

완료 시 짧게 아래를 보고한다.

- 실행한 분기(`A/B/C/D`)
- 적용 대상 수(`appliedCount`)
- 제외 대상과 사유(`skipped`)

예시:

- `Branch B 실행: text를 marker 트랙매트로 매칭 완료 (text 13개)`
- `Branch C 실행: stroke trim outro를 Start 0->100으로 수정 완료`
