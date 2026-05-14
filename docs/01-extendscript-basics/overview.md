# ExtendScript 개요 & JS 제한사항

출처: https://ae-scripting.docsforadobe.dev/introduction/overview/

## ExtendScript란

Adobe After Effects는 **Adobe ExtendScript**를 스크립팅 언어로 사용.
ExtendScript는 **ECMA-262 3rd Edition (ES3)** 기반의 JavaScript 확장.

- 파일 확장자: `.jsx`
- 표준 JS 도구(File, Folder, Socket, ScriptUI)가 추가됨
- 스크립트 실행: File > Scripts 메뉴, `afterfx -r [path]`, AppleScript

## ⚠️ ExtendScript vs 현대 JS — 절대 쓰면 안 되는 것들

| 틀린 코드 | 문제 | 올바른 대안 |
|-----------|------|------------|
| `let x = 1` | ES6 문법 없음 | `var x = 1` |
| `const x = 1` | ES6 문법 없음 | `var x = 1` |
| `() => {}` | 화살표함수 없음 | `function() {}` |
| `` `${x}` `` | 템플릿 리터럴 없음 | `"" + x` |
| `[].forEach()` | ES5 없음 | `for (var i=0; i<arr.length; i++)` |
| `[].map()` | ES5 없음 | `for` 루프로 수동 처리 |
| `[].filter()` | ES5 없음 | `for` 루프로 수동 처리 |
| `JSON.stringify()` | 없음 | 수동 문자열 조합 |
| `JSON.parse()` | 없음 | 직접 파싱 |
| `new Date().toISOString()` | ES5 없음 | `new Date().getTime()` |
| `class Foo {}` | ES6 없음 | 생성자 함수 패턴 |
| `import / export` | ES6 모듈 없음 | `#include` 또는 inline |

## ✅ 사용 가능한 것들

```javascript
var x = 1;
function foo(a, b) { return a + b; }
try { ... } catch(e) { ... } finally { ... }
for (var i = 0; i < 10; i++) { ... }
for (var key in obj) { ... }
new Date().getTime();
Math.random(), Math.floor(), Math.abs();
```

## ExtendScript 전용 추가 기능

```javascript
// 파일/폴더 접근
var f = new File("/path/to/file.txt");
f.open("r");
var content = f.read();
f.close();

// UI (ScriptUI)
var win = new Window("dialog", "제목");
win.add("statictext", undefined, "Hello");
win.show();

// 정보 출력 (Info 패널)
writeLn("메시지");           // 줄바꿈 있음
write("메시지");             // 줄바꿈 없음

// AE 전용 전역
clearOutput();               // Info 패널 초기화
isValid(obj);                // 오브젝트 유효성 확인
generateRandomNumber();      // Math.random() 대신 권장
```

## 중요 설정

```
After Effects > Preferences > Scripting & Expressions
☑ Allow Scripts To Write Files And Access Network
```

활성화하지 않으면 파일 쓰기, 네트워크 접근 불가.

## .jsx 파일 실행 방법

1. `File > Scripts > Run Script File...`
2. `Scripts/` 폴더에 넣으면 메뉴에서 바로 접근 가능
3. `Scripts/ScriptUI Panels/` → 도킹 가능한 패널로 동작
4. `Scripts/Startup/` → AE 시작 시 자동 실행
5. osascript (Mac): `DoScript` / `DoScriptFile`
6. `app.open(file)` 내부에서 실행
