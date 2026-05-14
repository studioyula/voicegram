---
name: stagger-timing
description: Runs stagger-layers-by-starttime.jsx via coloso-ae-mcp to stagger layers using startTime and unified inPoint (optional Position key shift). Use when the user says 순차적으로, 스태거, stagger, N초 안에 스태거, startTime만, or asks for top-to-bottom, bottom-to-top, index order, or random.
---

# Stagger Timing

AE 레이어 애니메이션의 시작 시점을 스태거로 재배치한다.

## Trigger Phrases

- "순차적으로"
- "스태거 적용"
- "stagger"
- "시작시간 다르게"
- "같은 타이밍 말고"
- "랜덤하게"
- "0~1초 사이에 시작"

## Core Behavior

1. 항상 `coloso-ae-mcp`의 `execute`를 사용한다.
2. 기본 모드(`STAGGER_SHIFT_POSITION_KEYS = false`): **키프레임 시각은 건드리지 않고** `startTime`과 `inPoint`/`outPoint`만 스태거에 맞게 조정한다.  
   레거시 모드(`true`): Position 키를 컴프 절대시각 기준으로 함께 이동해, 첫 키가 슬롯에 오도록 맞춘다(기존 구현).
3. 스태거 적용 시 `inPoint`는 **컴프에서 가장 먼저 등장하는 레이어(최소 `startTime` 슬롯)** 의 **원래 `inPoint`** 로 모든 대상 레이어를 통일한다. (`outPoint`는 각자 기존 길이 유지.)
4. 사용자가 시간 구간을 말하면 (예: `0~1초`, `0.2~1.4초`) 모든 시작 시점을 해당 구간에 분배한다.
5. 각 레이어의 끝 시간은 `시작시간 + 기존 지속시간`으로 계산한다.
6. 기본 이징 요청이 없으면 기존 이징 상태를 유지한다.  
   사용자가 "기본 이징"을 함께 요청하면 `Standard 80/80`을 적용한다.

## Order Rules

사용자 코멘트에 따라 시작 순서를 결정한다.

- **순차적으로 / 위에서부터 / top-to-bottom**
  - 화면상 위 레이어(Y 작은 값)부터 시작
- **아래에서부터 / bottom-to-top**
  - 화면상 아래 레이어(Y 큰 값)부터 시작
- **레이어 순서대로**
  - 레이어 번호(타임라인 순서) 기준
- **랜덤하게**
  - 시작 슬롯은 동일 간격으로 만들고, 레이어-슬롯 매핑만 랜덤 셔플

명시가 없으면 현재 문맥에서 최근 사용 순서를 따른다. 문맥이 없으면 `위에서부터`를 기본값으로 사용한다.

## Time Window Rules

- 시간 구간 명시가 있으면 그대로 사용한다.
  - 예: "0~1초" -> startMin=0, startMax=1
- 시간 구간 명시가 없으면 기존 첫/마지막 시작 분포를 보존하거나, 없으면 `0~1초`를 기본값으로 사용한다.
- 레이어 수가 1개면 시작 시점은 구간 시작값으로 둔다.
- 레이어 수가 N개면 시작 슬롯은 `START + i * (WINDOW / N)` (`i = 0 … N-1`). **간격은 항상 WINDOW/N 초**(1초 창이면 1/N초, 정수 초 그리드 아님).

## 번들 스크립트 (필수 실행 경로)

1. **스크립트 경로 (이 스킬 폴더)**  
   `stagger-layers-by-starttime.jsx`  
   실행 전 AE에서 **적용할 레이어를 반드시 선택**한다 (자동 대상 스캔 없음).
2. **사용자가 「N초 안에」등으로 창 길이만 바꿀 때**  
   - 해당 jsx 상단의 **`STAGGER_WINDOW_SEC`**만 요구에 맞게 숫자로 수정한다. (예: 2초 안에 → `2.0`)  
   - 구간 시작을 컴프 상에서 옮기려면 같은 블록의 **`STAGGER_START_COMP`**를 쓴다 (기본 `0`).  
   - 정렬은 **`STAGGER_ORDER`**: `"top"` | `"bottom"` | `"index"` | `"random"`  
   - 키 이동 여부: **`STAGGER_SHIFT_POSITION_KEYS`** — `false`(기본): `startTime`·`in`/`out`만; `true`: Position 키도 슬롯에 맞게 이동.  
3. **에이전트 실행 절차**  
   - jsx를 Read로 연 뒤, 필요 시 위 세 변수만 편집해 저장한다.  
   - `coloso-ae-mcp` → `execute`: 아래 부트스트랩으로 해당 파일을 실행한다 (경로는 워크스페이스 절대 경로).
   ```javascript
   var jsxPath = "/Users/vcodestudio/GITHUB/ae-students/coloso/.cursor/skills/stagger-timing/stagger-layers-by-starttime.jsx";
   var f = new File(jsxPath);
   if (!f.exists) throw new Error("missing: " + jsxPath);
   f.open("r");
   var code = f.read();
   f.close();
   return eval("(function(){\n" + code + "\n})()");
   ```
   - `searchDocs`: false 권장.
4. **수동 실행**: AE `File` → `Scripts` → `Run Script File…` → 같은 jsx.

## 스크립트 동작 (startTime + inPoint)

- **대상**: 타임라인에서 **선택한 레이어만**. `STAGGER_SHIFT_POSITION_KEYS === true`일 때만 Position 키 2개 미만은 건너뜀.
- 슬롯 시각: **`STAGGER_START_COMP + i * (STAGGER_WINDOW_SEC / N)`** (`i = 0 … N-1`). 간격은 **`WINDOW/N`** 초(2초 창·4레이어 → 0, 0.5, 1, 1.5).
- **`STAGGER_SHIFT_POSITION_KEYS = false`(기본)**: 키는 그대로 두고 **`layer.startTime = 슬롯`**, **`inPoint` = 컴프에서 가장 먼저 등장하는 레이어(최소 슬롯)의 적용 전 `inPoint`**, **`outPoint = refInPoint + (기존 out−in)`** 로 나머지와 통일.
- **`true`일 때만**: Position 키를 delta만큼 이동한 뒤 위와 동일하게 `startTime`/`inPoint`/`outPoint` 적용.

## Execution Workflow

1. 요청에서 **초 구간 N**·**정렬**(위/아래/인덱스/랜덤)을 파악한다.
2. `stagger-layers-by-starttime.jsx` 상단에서 `STAGGER_WINDOW_SEC` / `STAGGER_START_COMP` / `STAGGER_ORDER` 를 맞춘다.
3. `coloso-ae-mcp` → `execute`로 위 번들 스크립트를 실행한다 (부트스트랩은 «번들 스크립트» 절 참고).
4. 반환된 `applied` / `skipped` 로 요약 보고한다.

## Guardrails

- `STAGGER_SHIFT_POSITION_KEYS === true`일 때만 Position 키 2개 미만 레이어를 건너뛰고 제외 사유를 남긴다.
- 같은 이름 레이어가 중복이면 레이어 index로 식별해 중복 적용/누락을 방지한다.
- 기존 경로 표시선(Path Line 등)은 타이밍 조정 시 수정 대상에서 제외한다.
- 오류 시 "무엇이 없어서 적용 불가였는지"를 명확히 반환한다.

## Response Style

- 사용자 요청 문장을 그대로 반영해 실행한다.
- 추가 확인 질문은 정말 모호할 때만 한다.
- 완료 보고는 짧게:
  - "0~1초 랜덤 스태거 적용 완료"
  - "위에서부터 순차 스태거 적용 완료"
