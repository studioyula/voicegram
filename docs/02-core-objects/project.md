# Project 오브젝트 (app.project)

출처: https://ae-scripting.docsforadobe.dev/general/project/

## 핵심 프로퍼티

```javascript
app.project.activeItem
// → 현재 선택된 Item 오브젝트. 없으면 null.
// → 활성 컴프 가져올 때 자주 사용:
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) throw new Error("활성 컴포지션 없음");

app.project.items         // 모든 아이템의 ItemCollection (read-only)
app.project.numItems      // 총 아이템 수 (read-only)
app.project.renderQueue   // RenderQueue 오브젝트 (read-only)
app.project.file          // 저장된 프로젝트 File 오브젝트 (read-only)
app.project.dirty         // 저장 후 수정 여부 (read-only boolean)

app.project.bitsPerChannel        // 색 깊이: 8, 16, 32
app.project.expressionEngine      // "extendscript" 또는 "javascript-1.0"
app.project.gpuAccelType          // "CUDA", "Metal", "OpenCL", "Software"
app.project.workingSpace          // 컬러 프로필 이름 문자열
app.project.linearBlending        // 선형 블렌딩 활성화 여부 (boolean)
```

## 핵심 메서드

### 아이템 접근

```javascript
app.project.item(index)     // 1-based index로 아이템 가져오기
app.project.itemByID(id)    // ID로 가져오기 (AE 22.0+)
app.project.selection       // 현재 선택된 아이템 배열 (read-only)
```

### 컴포지션 생성

```javascript
// 새 컴포지션 생성
var comp = app.project.items.addComp(
    "Comp Name",    // 이름
    1920,           // 너비 (px)
    1080,           // 높이 (px)
    1,              // pixelAspect (1 = square)
    10,             // 길이 (초)
    30              // 프레임레이트
);
```

### 푸티지/파일 가져오기

```javascript
// 파일 가져오기
var io = new ImportOptions(new File("/path/to/file.mp4"));
io.importAs = ImportAsType.FOOTAGE;
var footage = app.project.importFile(io);

// 이미지 시퀀스로 가져오기
io.sequence = true;
io.forceAlphabetical = true;

// 다이얼로그로 가져오기
var items = app.project.importFileWithDialog();

// 플레이스홀더 생성
var ph = app.project.importPlaceholder("Placeholder", 1920, 1080, 30, 5);
```

### 프로젝트 정리

```javascript
app.project.consolidateFootage()    // 중복 푸티지 통합. 제거된 수 반환.
app.project.removeUnusedFootage()   // 미사용 푸티지 삭제. 제거된 수 반환.
app.project.reduceProject([items])  // 지정 아이템 외 모두 삭제. 제거된 수 반환.
```

### 저장

```javascript
app.project.save()                  // 현재 경로에 저장 (또는 다이얼로그)
app.project.save(new File("/path")) // 지정 경로에 저장
app.project.saveWithDialog()        // 저장 다이얼로그 표시. boolean 반환.
app.project.close(CloseOptions.SAVE_CHANGES)
app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES)
app.project.close(CloseOptions.PROMPT_TO_SAVE_CHANGES)
```

### 폰트/Expression

```javascript
app.project.autoFixExpressions("oldText", "newText")  // expression 텍스트 일괄 교체
app.project.listColorProfiles()     // 사용 가능한 컬러 프로필 이름 배열 반환
app.project.replaceFont(fromFont, toFont)  // 폰트 교체. boolean 반환.
```

## ItemCollection 메서드

```javascript
app.project.items.addComp(name, w, h, pixelAspect, duration, fps)
// → CompItem 생성

app.project.items.addFolder("폴더명")
// → FolderItem 생성 (프로젝트 패널 정리용)
```

## 레이어 직접 접근 (AE 22.0+)

```javascript
app.project.layerByID(id)   // 레이어 ID로 레이어 직접 가져오기
```
