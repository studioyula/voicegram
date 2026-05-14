# Adobe Agent (Student Edition) — AI Agent Instructions

> Adobe After Effects를 자연어로 제어하는 MCP 서버.
> Cursor AI / Claude Code에서 이 파일이 자동 로드됩니다.

## MCP 서버 사용 우선순위

- 이 워크스페이스에서는 AE 작업 시 **항상 `coloso-ae-mcp`를 우선 사용**한다.
- 별도 지시가 없는 한 다른 AE MCP 서버(`ae-mcp` 등)로 대체하지 않는다.
- `coloso-ae-mcp` 사용이 불가능한 경우에만 사유를 명확히 기록한 뒤 대체 서버를 사용한다.

## 초기 셋업

### 1. 설치
```bash
npm install
```

### 2. 환경 설정 (.env)
```
AE_APP=Adobe After Effects 2026    # macOS 앱 이름
AE_PATH=C:\...\AfterFX.exe        # Windows 실행파일 경로 (Windows만)
```

### 3. MCP 서버 연결 (Claude Code settings.json)
```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "node",
      "args": ["/path/to/index.js"],
      "env": {
        "AE_APP": "Adobe After Effects 2026"
      }
    }
  }
}
```

### 4. 연결 확인
MCP 툴로 `ae_scan { depth: "summary" }` 실행 → AE 프로젝트 상태 반환되면 성공.

### 5. AE 영문 전환 (선택)
AE 설치 폴더에 `ae_force_english.txt` 빈 파일을 생성하면 영문 UI로 전환됨.
- macOS: `sudo touch "/Applications/{AE_APP}/ae_force_english.txt"`
- Windows: AE 설치 폴더 루트에 `ae_force_english.txt` 생성
- AE 재시작 필요

## 크로스 플랫폼

| | macOS | Windows |
|---|---|---|
| 실행 방식 | `osascript` → AE DoScriptFile | `AfterFX.exe -r script.jsx` |
| 환경변수 | `AE_APP` (앱 이름) | `AE_PATH` (실행파일 전체 경로) |
| 자동 감지 | `process.platform` 기반 | |

---

## 3개 MCP 툴

### 1. `ae_scan` — 컴포지션 조회 (read-only)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `compName` | string? | 컴포지션 이름. 생략 시 활성 컴프 |
| `depth` | `"summary"` \| `"full"` | 조회 깊이 |
| `layerIndex` | number? | 특정 레이어만 조회 (full 모드) |

```
ae_scan { depth: "summary" }
ae_scan { compName: "Main Comp", depth: "full" }
ae_scan { depth: "full", layerIndex: 3 }
```

### 2. `ae_execute` — ExtendScript 실행

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `script` | string? | 단일 ExtendScript 코드 |
| `scripts` | `[{label, code}]`? | 배치 실행 배열 |
| `timeout` | number? | 타임아웃 ms (기본 30000) |
| `searchDocs` | boolean? | true면 벡터DB 검색 후 힌트 반환 |

```
ae_execute { script: "var comp = app.project.activeItem; return comp.name;" }
ae_execute { scripts: [
  { label: "컴프 이름", code: "return app.project.activeItem.name;" },
  { label: "레이어 수", code: "return app.project.activeItem.numLayers;" }
]}
```

### 3. `ae_template` — 모션 스킬 템플릿

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `list` | boolean? | true면 템플릿 목록 반환 |
| `name` | string? | 템플릿 이름 직접 지정 |
| `query` | string? | 자연어로 매칭 (예: "바운스 효과") |
| `params` | object? | 템플릿 파라미터 (JSON) |

```
ae_template { list: true }
ae_template { name: "bounce", params: { property: "scale", overshoot: 1.2 } }
ae_template { query: "마스크 리빌로 등장시켜" }
```

---

## ExtendScript 필수 규칙

1. **ES3/ES5만 사용** — `let`, `const`, `=>`, `class`, `forEach` 금지
2. `var` / `function` 만 사용
3. `return 값` → MCP 결과로 전달
4. `log("msg")` → 로그 출력 (wrapScript 자동 주입)
5. `app.beginUndoGroup` / `endUndoGroup` 직접 사용 금지 (자동 처리)
6. **`alert()` 절대 금지** → `throw new Error()` 사용

## Motion Helper API (자동 주입)

```javascript
easeKeys(prop, inInfl?, outInfl?)        // 키프레임 이징 (기본 80/80)
easeKey(prop, keyIdx, inInfl?, outInfl?) // 개별 키 이징
staggerRandom(n, maxDelay, seed?)        // 랜덤 딜레이 배열 생성
maskReveal(comp, layer, opts?)           // 마스크 리빌 애니메이션
revealAllTextLayers(comp, opts?)         // 전체 텍스트 레이어 리빌
setExpr(prop, expr)                      // Expression 설정 + 에러 자동 감지
```

## 핵심 주의사항

- **Y축 반전**: Y 증가 = 화면 아래. "아래서 위로" = 시작 Y 큰값 → 끝 Y 작은값
- **Shape Path 정점 좌표 기준**: Path 로컬 좌표에서 "위" 판단은 **Y가 더 작은 값(음수 방향 포함)** 이 우선. 첫 정점을 좌상단으로 맞출 때 기본 규칙은 `minX + minY` 사용.
- **KeyframeInterpolationType**: `LINEAR` / `BEZIER` / `HOLD` 만 존재
- **차원 분리**: `getSeparationFollower()` 없음 → `layer.transform.property("X Position")` 사용
- **Expression 컨텍스트**: 스크립트 변수 참조 불가. `return` 금지 — 마지막 값이 자동 반환
- **레이어 생성 순서**: Expression이 참조하는 레이어를 반드시 먼저 생성
- **Track Matte**: 매트 레이어가 content 레이어 바로 위(lower index)에 있어야 함
- **Stale ref**: `dimensionsSeparated = true` 또는 `moveBefore` 후 property 재fetch 필요
- **좌표 변환 (스크립트)**: `layer.toComp` / `toWorld` 는 **Expression 전용**에 가깝고, ExtendScript에서는 **미정의일 수 있음**(TextLayer 등). 컴프 좌표가 필요하면 `docs/08-patterns-and-pitfalls/layer-to-comp-extendscript.md` 의 `layerPointToComp` 패턴(또는 `scripts/utility/layer-point-to-comp.jsx`)을 사용한다. **`toComp`를 jsx에서 그대로 호출하지 않는다.**

## 컬러 팔레트 적용 규칙

- 사용자가 "컬러 조합(팔레트)으로 바꿔줘"라고 요청하면 **해당 팔레트 색상만** 사용
- 팔레트에 없는 색상은 금지 (검정/흰색/회색 포함)
- 예외: 팔레트에 무채색이 직접 포함된 경우에만 사용 가능

## 렌더 출력 기본 규칙

- 기본 출력 포맷은 항상 **MP4** (H.264 + AAC)
- 사용자가 포맷을 따로 지정하지 않으면 MOV 등 다른 포맷 사용 금지

## 템플릿 jsx 작성 규칙

```jsx
/**
 * @template my-template        ← 고유 이름 (하이픈 구분)
 * @description 한 줄 설명       ← 매칭에 사용
 * @params param1, param2=기본값  ← 사용 가능한 파라미터
 * @tags 태그1, 태그2, tag3      ← 한/영 매칭 키워드
 * @example "자연어 사용 예시"     ← 매칭 힌트
 */
var comp = app.project.activeItem;
var val = PARAMS.param1 || "default";
return "결과 메시지";
```

## 벡터DB (API 문서)

- `docs/` AE API 문서 → TF-IDF 인덱스
- 리빌드: `node vectordb/build.js`
- execute에서 `searchDocs: true`로 자동 문서 조회
- 외부 API/서비스 없음 (완전 로컬)
