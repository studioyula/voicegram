---
name: 에펙-셋업
description: ae-mcp 프로젝트 초기 설정 가이드. macOS/Windows 환경 구성, MCP 서버 연결, 벡터DB 빌드. "셋업", "설치", "setup", "install", "초기 설정" 시 발동.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit
---

# ae-mcp 셋업 가이드

## 요구사항
- Node.js 18+
- Adobe After Effects 2024+ (Advanced 3D 렌더러 지원)
- Claude Code 또는 Cursor AI

## 1단계: 설치

```bash
cd ae-mcp
npm install
```

## 2단계: 환경변수 (.env)

### macOS
```env
AE_APP=Adobe After Effects 2026
```
앱 이름만 설정. osascript가 자동으로 찾음.

### Windows
```env
AE_APP=Adobe After Effects 2026
AE_PATH=C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\AfterFX.exe
```
**AE_PATH 필수** — AfterFX.exe 전체 경로. `-r` 플래그로 스크립트 실행.

### 공통 (선택)
```env
BRIDGE_PORT=3002
```

## 3단계: 벡터DB 빌드

```bash
node vectordb/build.js
```
- `docs/` 25개 md → 259청크, 402KB 인덱스
- `vectordb/data/index.json` 생성
- execute 시 `searchDocs: true`로 자동 문서 조회

## 4단계: MCP 서버 실행

### Claude Code (settings.json)
```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "node",
      "args": ["/path/to/ae-mcp/index.js"],
      "env": {
        "AE_APP": "Adobe After Effects 2026"
      }
    }
  }
}
```

### Cursor (.cursor/mcp.json)
```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "node",
      "args": ["/path/to/ae-mcp/index.js"]
    }
  }
}
```

## 5단계: 연결 확인

MCP 툴로 `scan { depth: "summary" }` 실행 → AE 프로젝트 상태 반환되면 성공.

## 크로스 플랫폼 동작 원리

| | macOS | Windows |
|---|---|---|
| 실행 방식 | `osascript` → AE DoScriptFile | `AfterFX.exe -r script.jsx` |
| 환경변수 | `AE_APP` (앱 이름) | `AE_PATH` (실행파일 전체 경로) |
| 자동 감지 | `process.platform` 기반 | |
| 결과 수신 | chokidar 파일 감시 (동일) | |
| HTTP 브릿지 | localhost:3002 (동일) | |

## 3개 MCP 툴

### scan — 컴포지션 조회 (read-only)
```
scan { depth: "summary" }           → 경량 레이어 목록
scan { depth: "full" }              → Transform/키프레임/Expression 상세
scan { depth: "full", layerIndex: 3 } → 특정 레이어만
scan { compName: "Main" }           → 지정 컴프
```

### execute — ExtendScript 실행
```
execute { script: "return app.project.activeItem.name;" }
execute { scripts: [{label: "이름", code: "..."}] }  → 배치
execute { script: "...", searchDocs: true }            → 벡터DB 힌트
```

### template — 모션 스킬 템플릿
```
template { list: true }              → 사용 가능 목록
template { name: "bounce" }          → 이름으로 실행
template { query: "바운스 효과" }     → 자연어 매칭
```

## 폴더 구조

```
ae-mcp/
├── index.js              ← MCP 서버 (3개 툴)
├── .env                  ← AE_APP / AE_PATH
├── helpers/motion.jsx    ← Motion Helper (자동 주입)
├── templates/            ← 모션 스킬 템플릿 (.jsx)
├── vectordb/             ← TF-IDF 벡터DB
│   ├── build.js          ← 인덱싱 스크립트
│   └── data/index.json   ← 프리빌드 인덱스
├── docs/                 ← AE API 문서 (소스)
├── scripts/              ← 예제 스크립트 (카테고리별)
├── .claude/skills/       ← Claude Code 스킬 14개
├── .cursor/skills/       ← Cursor AI 스킬 (동일)
├── CLAUDE.md             ← Claude Code 인스트럭션
└── AGENTS.md             ← Cursor AI 인스트럭션
```

## 트러블슈팅

### AE 응답 없음 (타임아웃)
- AE가 실행 중인지 확인
- macOS: `AE_APP` 이름이 정확한지 (한영 주의)
- Windows: `AE_PATH`가 AfterFX.exe 전체 경로인지
- AE에서 다른 스크립트가 실행 중이 아닌지

### 벡터DB 검색 안 됨
- `node vectordb/build.js` 실행했는지
- `vectordb/data/index.json` 존재하는지

### Windows 경로 문제
- `.env`에서 백슬래시 그대로 사용 (이스케이프 불필요)
- 경로에 공백이 있으면 따옴표 자동 처리됨

### ExtendScript 에러
- ES3/ES5만 사용 (let/const/arrow 금지)
- `alert()` 금지 → `throw new Error()`
- `app.beginUndoGroup` 직접 사용 금지 (wrapScript가 자동 처리)
