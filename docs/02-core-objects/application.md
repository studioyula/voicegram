# Application 오브젝트 (app)

출처: https://ae-scripting.docsforadobe.dev/general/application/

## 접근

```javascript
app  // 전역 오브젝트. After Effects 인스턴스 자체.
app.project   // 현재 열린 프로젝트
app.version   // AE 버전 문자열
```

## 핵심 메서드

### Undo Group (매우 중요)

```javascript
app.beginUndoGroup("작업 이름");
// → Undo 그룹 시작. 이후 모든 작업이 하나의 Undo 단위로 묶임.
// → 중첩 가능 (inner group 이름은 무시됨)
// ⚠️ wrapScript가 자동 처리하므로 execute-script에서는 직접 호출 금지

app.endUndoGroup();
// → Undo 그룹 종료.
// → 스크립트 끝에서 미호출 시 자동으로 닫힘.
// → endUndoGroup 없이 beginUndoGroup만 호출하면 에러.
// ⚠️ AE는 endUndoGroup 시 에러 발생하면 전체 롤백됨 → 모든 변경사항 사라짐!
```

### 메모리 관리

```javascript
app.purge(PurgeTarget.ALL_CACHES);         // RAM + 디스크 캐시 전체
app.purge(PurgeTarget.ALL_MEMORY_CACHES);  // RAM만 (AE 24.3+)
app.purge(PurgeTarget.UNDO_CACHES);        // Undo 히스토리
app.purge(PurgeTarget.IMAGE_CACHES);       // 저장된 이미지

app.setMemoryUsageLimits(imagePct, maxPct);
// 메모리 할당 한계 설정 (설치된 RAM 기준 퍼센트)
```

### 프로젝트 관리

```javascript
app.newProject();
// → 새 프로젝트 생성. 사용자가 저장 다이얼로그 취소하면 null 반환.

app.open(file);
// → File 오브젝트로 프로젝트 열기. 없으면 다이얼로그 표시.

app.project.save();
app.project.save(file);  // 특정 경로에 저장
```

### 실행 제어

```javascript
app.beginSuppressDialogs();
// → 에러 다이얼로그 표시 억제 시작. 자동화 시 필수.

app.endSuppressDialogs(alert);
// → 억제 해제. alert: 억제 중 발생한 에러 메시지 표시 여부(boolean).

app.disableRendering = true;  // Caps Lock처럼 렌더링 일시중지
app.disableRendering = false; // 다시 렌더링 활성화

// 메뉴 커맨드 실행
app.executeCommand(id);
app.findMenuCommandId("Command Name");
// 예: app.executeCommand(app.findMenuCommandId("Render"));

// 지연 실행
var taskId = app.scheduleTask("app.purge(PurgeTarget.ALL_CACHES)", 1000, false);
app.cancelTask(taskId);
```

### 렌더링

```javascript
app.project.renderQueue.renderAll();
// → 렌더 큐 전체 렌더링 실행
```

## 주요 프로퍼티

```javascript
app.project          // 현재 Project 오브젝트
app.version          // "23.0.0" 형태의 버전 문자열
app.buildNumber      // 빌드 번호
app.isoLanguage      // 언어 코드 (예: "en_US")
app.isWatchFolder    // Watch Folder 모드로 실행 중인지
app.isRenderEngine   // Render Engine으로 실행 중인지
app.activeViewer     // 현재 활성 Viewer 오브젝트 또는 null
```

## 안전한 스크립팅 패턴

```javascript
// 다이얼로그 억제 + 안전한 실행
app.beginSuppressDialogs();
try {
    // 작업 수행
} catch(e) {
    throw e;  // 에러를 위로 전파
} finally {
    app.endSuppressDialogs(false);
}
```
