---
name: ae-flow-dots-on-selected-path
description: Runs ae-flow-dots-on-selected-path.jsx via coloso-ae-mcp on the active comp — white circles evenly spaced along a selected shape/mask Path, flowing continuously with Speed/Size on CTRL_FlowDots. Dot count follows the user (default 10). Use when the user asks for flow dots, 패스 따라 흐르는 원, path dots, FLOW_DOT, 등간격 원, 패스 위 점 애니메이션, or to recreate the selected-path dot flow effect.
---

# Flow Dots on Selected Path

선택한 **Path** 속성을 따라 흰 원을 등간격 배치하고, 표현식으로 패스를 따라 계속 흐르게 한다. **Speed**·**Size**는 `CTRL_FlowDots` 슬라이더로 조절한다.

## When to use

- 셰이프/마스크 **Path**를 따라 흐르는 원(도트) 배치
- 개수 지정 (예: 5개, 12개, 20개) — 미지정 시 **10개**
- 재실행 시 기존 `FLOW_DOT_*` / `CTRL_FlowDots` 제거 후 재생성
- **여러 Path 동시 선택** 지원 (패스마다 `FLOW_DOT_P01_01` 형식 세트; 공유 `CTRL_FlowDots`)

## Requirements

1. 활성 컴프가 있어야 한다.
2. **Path 속성 선택**을 권장한다. 없으면 선택 레이어 첫 Path → 컴프 내 첫 셰이프 Path 순으로 탐색.
3. **`coloso-ae-mcp`** (`project-0-ae-mcp-student-ae-mcp-student`) **`execute`** 만 사용 (`AGENTS.md`).
4. ExtendScript **ES3** (`var` / `function`).

## Bundled script

- `{workspace-root}/.cursor/skills/ae-flow-dots-on-selected-path/scripts/ae-flow-dots-on-selected-path.jsx`
- 동기화 사본: `{workspace-root}/scripts/utility/ae-flow-dots-on-selected-path.jsx`

## Dot count

- 사용자가 개수를 말하면 그 숫자를 쓴다 (예: 「7개」→ `7`).
- 말하지 않으면 **10**.
- 스크립트 상단 `DOT_COUNT`는 수동 실행 기본값; **에이전트는 파일을 수정하지 않고** 실행 직전 전역 `FLOW_DOTS_COUNT`만 설정한다.

## Execute (agent)

1. 요청에서 **개수 N** 파앱 (없으면 `10`).
2. `coloso-ae-mcp` → `execute`, `searchDocs: false`:

```javascript
var FLOW_DOTS_COUNT = 12; // ← 요청에 맞게 N
var jsxPath = "/Users/vcodestudio/GITHUB/ae-students/ae-mcp-student/.cursor/skills/ae-flow-dots-on-selected-path/scripts/ae-flow-dots-on-selected-path.jsx";
var f = new File(jsxPath);
if (!f.exists) throw new Error("missing: " + jsxPath);
f.open("r");
var code = f.read();
f.close();
return eval("(function(){\n" + code + "\n})()");
```

3. 반환 문자열로 요약 보고 (레이어명, `pathChain`, `ctrl=CTRL_FlowDots`).

## Manual run (AE)

**File → Scripts → Run Script File…** → 번들 jsx. 개수 바꾸려면 jsx 상단 `DOT_COUNT` 수정.

## Output layers

| 이름 | 역할 |
|------|------|
| `CTRL_FlowDots` | Speed (기본 0.18), Size (기본 16) |
| `FLOW_DOT_01` … | 흰 원; Position·Size 표현식이 컨트롤러·소스 Path 참조 |

## Guardrails

- Path를 찾지 못하면 「Path 속성을 선택한 뒤 다시 실행」 안내.
- 재실행은 항상 기존 flow-dot 레이어·컨트롤러를 지우고 새로 만든다.
- 스크립트 본문 로직은 건드리지 말고, 개수는 **`FLOW_DOTS_COUNT` 주입**만 한다.

## References

- `AGENTS.md` — MCP·ExtendScript 규칙
