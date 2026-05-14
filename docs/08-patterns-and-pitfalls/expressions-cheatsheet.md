# Expression 치트시트

AE Expression은 **JavaScript 기반** (ExtendScript와 다름, ES5 일부 가능).
스크립트와 **별개의 실행 컨텍스트** — 스크립트 변수 참조 불가.

---

## 핵심 전역 변수

```javascript
time        // 현재 프레임의 시간(초)
value       // 해당 프로퍼티의 현재 값 (키프레임 포함)
thisComp    // 현재 컴포지션
thisLayer   // 이 expression이 붙은 레이어
thisProperty // 이 expression이 붙은 프로퍼티
index       // 레이어 인덱스 (1-based)
numKeys     // 키프레임 수
```

---

## thisComp & thisLayer

```javascript
// 컴프 정보
thisComp.width
thisComp.height
thisComp.duration
thisComp.frameRate
thisComp.name

// 레이어 참조
thisComp.layer("Name")                  // 이름으로
thisComp.layer(1)                       // index로

// 레이어 프로퍼티 참조
thisComp.layer("Ctrl").transform.opacity
thisComp.layer("Ctrl").effect("Slider Control")("Slider")
```

---

## 루프

```javascript
loopOut("cycle")        // 마지막 키프레임 이후 반복
loopOut("pingpong")     // 핑퐁 반복
loopOut("offset")       // 마지막 값을 더하며 반복
loopOut("continue")     // 마지막 속도로 계속 진행

loopIn("cycle")         // 첫 키프레임 이전 반복
loopIn("pingpong")
loopInDuration("cycle", 2)   // 마지막 2초만 루프
loopOutDuration("cycle", 2)  // 마지막 2초만 루프

// keyframe이 2개 이상 있어야 작동
```

---

## Wiggle (흔들림)

```javascript
wiggle(freq, amp)               // 초당 freq번, amp 크기로 흔들
wiggle(3, 50)                   // 기본 사용
wiggle(2, 50, 1, 0.5, time)     // freq, amp, octaves, amp_mult, time

// 특정 축만 흔들기
var w = wiggle(3, 50);
[w[0], value[1]]                // X만 흔들기
[value[0], w[1]]                // Y만 흔들기

// 시드 고정 (같은 패턴)
seedRandom(42, true);  wiggle(3, 50);
```

---

## 시간 기반 애니메이션

```javascript
// 지속 회전
time * 360          // 초당 360도 (1 RPM)
time * 120          // 초당 120도

// 사인파 움직임
var freq = 2;       // 초당 2 사이클
var amp = 100;      // 진폭
Math.sin(time * freq * Math.PI * 2) * amp

// 위치에 사인파 적용
[value[0], value[1] + Math.sin(time * 2 * Math.PI) * 50]

// 가속 회전
time * time * 50    // 제곱으로 가속
```

---

## 레이어 간 연결

```javascript
// 다른 레이어의 transform
thisComp.layer("Master").transform.position
thisComp.layer("Master").transform.scale
thisComp.layer("Master").transform.rotation

// 오프셋 적용
var masterPos = thisComp.layer("Master").transform.position;
[masterPos[0] + 100, masterPos[1]]  // X 100 오프셋

// Parent-child 없이 팔로우
thisComp.layer(index - 1).transform.position  // 바로 위 레이어 따라가기
```

---

## 컨트롤 레이어에서 값 읽기

```javascript
// Slider Control
thisComp.layer("CTRL").effect("Speed")("Slider")

// Angle Control
thisComp.layer("CTRL").effect("Direction")("Angle")

// Checkbox Control
thisComp.layer("CTRL").effect("Toggle")("Checkbox")

// Color Control
thisComp.layer("CTRL").effect("BG Color")("Color")

// 간단하게
var ctrl = thisComp.layer("CTRL");
var speed = ctrl.effect("Speed")("Slider");
time * speed * 360
```

---

## 조건부 Expression

```javascript
// If/Else
time < 1 ? 0 : 100

// 범위 클램프
Math.min(Math.max(value, 0), 100)
clamp(value, 0, 100)    // 일부 AE 버전에서만

// 시간에 따른 전환
var t = linear(time, 0, 1, 0, 100);  // 0초~1초 사이에 0→100
linear(time, inTime, outTime, fromValue, toValue)

// ease 적용한 전환
ease(time, 0, 1, 0, 100)  // Ease In/Out 포함
easeIn(time, 0, 1, 0, 100)   // Ease In만
easeOut(time, 0, 1, 0, 100)  // Ease Out만
```

---

## index 기반 스태거

```javascript
// 레이어 인덱스 기반 딜레이
var delay = (index - 1) * 0.1;
var t = time - delay;
t > 0 ? loopOut("cycle") : value;

// Scale 팝업 스태거
var delay = (index - 1) * 0.15;
var t = time - delay;
var dur = 0.3;
if (t < 0) {
    [0, 0];
} else if (t < dur) {
    var p = t / dur;
    var s = p * p * (3 - 2 * p);  // Smoothstep
    [s * 100, s * 100];
} else {
    [100, 100];
}
```

---

## 유틸리티 함수

```javascript
// 단위 변환
degreesToRadians(45)
radiansToDegrees(Math.PI / 4)

// 거리 계산
var d = length(point1, point2);

// 정규화
normalize([x, y])

// 선형 보간
lerp = function(a, b, t) { return a + (b - a) * t; }

// Math 헬퍼
Math.PI         // 3.14159...
Math.abs(x)
Math.floor(x)   // 소수 버림
Math.ceil(x)    // 소수 올림
Math.round(x)   // 반올림
Math.min(a, b)
Math.max(a, b)
Math.pow(x, n)  // x의 n승
Math.sqrt(x)
Math.sin(radians)
Math.cos(radians)
```

---

## sourceRectAtTime (Expression 내부에서)

```javascript
// 레이어 크기 가져오기 (Expression 내)
var r = thisLayer.sourceRectAtTime(time, false);
// r.width, r.height, r.top, r.left

// 텍스트 레이어 폭에 맞는 배경 박스 크기
var textLayer = thisComp.layer("Title");
var r = textLayer.sourceRectAtTime(time, false);
[r.width + 40, r.height + 20]  // 패딩 40/20
```

---

## Expression 작성 시 주의사항

```javascript
// ❌ 스크립트 변수 참조 불가 (별개 컨텍스트)
// var myVar = 100; ← 이건 스크립트에서
layer.expression = "myVar";  // ERROR: myVar is undefined

// ✅ thisComp, thisLayer, time만 사용
layer.expression = "value + wiggle(2, 10)";

// ❌ return 문 사용 불가
layer.expression = "return time * 360;";  // ERROR

// ✅ 마지막 값이 자동으로 반환됨
layer.expression = "time * 360";

// ⚠️ AE expression은 ES5 일부 지원 (forEach, map 등 사용 가능)
// 하지만 let/const, 화살표함수는 AE 버전에 따라 다름
// 안전하게 var + function 사용 권장
```
