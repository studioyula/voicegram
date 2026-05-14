# AVItem & CompItem 레퍼런스

출처: https://ae-scripting.docsforadobe.dev/item/avitem/
출처: https://ae-scripting.docsforadobe.dev/item/compitem/

---

## AVItem (모든 영상/음향 아이템의 기반)

CompItem, FootageItem 모두 AVItem을 상속.

### 프로퍼티

```javascript
item.duration           // 길이(초). Still = 0. CompItem은 read/write. Footage는 read-only.
item.frameRate          // FPS (1.0~99.0). CompItem read/write. Footage read-only.
item.frameDuration      // 1프레임 길이(초) = 1/frameRate
item.width              // 너비(px). CompItem read/write. Solid만 write 가능.
item.height             // 높이(px)
item.pixelAspect        // 픽셀 종횡비 (0.01~100.0)
item.hasAudio           // 오디오 포함 여부 (read-only boolean)
item.hasVideo           // 비디오 포함 여부 (read-only boolean)
item.usedIn             // 이 아이템이 사용된 CompItem 배열 (read-only)
item.proxySource        // 현재 활성 프록시 소스 (read-only)
item.useProxy           // 프록시 사용 여부 (read/write boolean)
```

### 프록시 메서드

```javascript
item.setProxy(file)                                  // 파일을 프록시로 설정
item.setProxyToNone()                                // 프록시 제거
item.setProxyWithPlaceholder(name, w, h, fps, dur)   // 플레이스홀더 프록시
item.setProxyWithSequence(file, forceAlpha)          // 시퀀스 프록시
item.setProxyWithSolid(color, name, w, h, pAspect)   // 솔리드 프록시
```

---

## CompItem (컴포지션)

### 컴포지션 생성

```javascript
var comp = app.project.items.addComp(
    "My Comp",   // 이름
    1920,        // 너비
    1080,        // 높이
    1.0,         // pixelAspect (1 = 정사각형 픽셀)
    10.0,        // 길이(초)
    30           // FPS
);
```

### 주요 프로퍼티

```javascript
comp.layers           // LayerCollection (모든 레이어)
comp.numLayers        // 레이어 수 (read-only)
comp.selectedLayers   // 선택된 레이어 배열 (0-based, read-only)
comp.selectedProperties // 선택된 프로퍼티 배열 (read-only)
comp.activeCamera     // 활성 카메라 CameraLayer (read-only)

comp.bgColor          // 배경색 [R, G, B] 0~1 범위
comp.frameRate        // FPS (read/write)
comp.frameDuration    // 1프레임 길이(초) (read/write)
comp.duration         // 길이(초) (read/write)
comp.width            // 너비 (read/write)
comp.height           // 높이 (read/write)
comp.pixelAspect      // 픽셀 종횡비 (read/write)

comp.workAreaStart    // 작업 영역 시작(초) (read/write)
comp.workAreaDuration // 작업 영역 길이(초) (read/write)

comp.draft3d          // Draft 3D 모드 (boolean)
comp.motionBlur       // 모션 블러 활성화 (boolean)
comp.frameBlending    // 프레임 블렌딩 (boolean)
comp.hideShyLayers    // Shy 레이어 숨기기 (boolean)

comp.shutterAngle     // 셔터 각도 (0~720)
comp.shutterPhase     // 셔터 페이즈 (-360~360)

comp.displayStartTime // 시작 타임코드 시간(초)
comp.displayStartFrame // 시작 프레임 번호 (AE 17.1+)
comp.dropFrame        // Drop Frame 타임코드 여부
```

### 레이어 접근 메서드

```javascript
comp.layer(1)               // 1-based index
comp.layer("LayerName")     // 이름으로
comp.layer(otherLayer, -1)  // 상대 위치 (otherLayer 기준 -1 아래)
```

### 컴포지션 메서드

```javascript
comp.duplicate()            // 컴포지션 복제 → CompItem 반환
comp.openInViewer()         // 컴포지션 패널에서 열기 → Viewer 반환

// Motion Graphics Template (AE 15.0+)
comp.exportAsMotionGraphicsTemplate(overwrite, filePath)  // .mogrt 내보내기
comp.openInEssentialGraphics()   // Essential Graphics 패널에서 열기
```

### 자주 쓰는 패턴

```javascript
// 활성 컴프 가져오기 (가장 기본 패턴)
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    throw new Error("활성 컴포지션이 없습니다");
}

// 컴프 크기 중심점 계산
var cx = comp.width / 2;
var cy = comp.height / 2;

// 레이어 이름으로 찾기 (없으면 null)
var layer = comp.layer("My Layer");
if (!layer) throw new Error("'My Layer'를 찾을 수 없음");
```
