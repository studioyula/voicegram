# After Effects ExtendScript 문서 모음

AE 스크립팅 공식 문서(ae-scripting.docsforadobe.dev) 기반으로 정리한 레퍼런스.
이 폴더의 목적: **웹 JS와 ExtendScript 차이로 인한 오류 방지** + 정확한 API 참조.

## 폴더 구조

```
docs/
├── 01-extendscript-basics/
│   ├── overview.md              ← ExtendScript 개요, ES3 제한사항
│   └── globals.md               ← 전역 함수 목록
├── 02-core-objects/
│   ├── application.md           ← app 오브젝트 (undoGroup 등)
│   └── project.md               ← app.project 오브젝트
├── 03-items/
│   └── avitem-compitem.md       ← AVItem, CompItem 레퍼런스
├── 04-layers/
│   ├── layer.md                 ← Layer 기본 오브젝트
│   ├── avlayer.md               ← AVLayer (matte, motionBlur 등)
│   ├── textlayer.md             ← TextLayer
│   ├── shapelayer.md            ← ShapeLayer
│   ├── cameralayer.md           ← CameraLayer
│   ├── lightlayer.md            ← LightLayer
│   └── layercollection.md       ← 레이어 생성 메서드 모음
├── 05-properties/
│   ├── propertybase.md          ← PropertyBase (matchName 등)
│   ├── propertygroup.md         ← PropertyGroup (addProperty 등)
│   ├── property.md              ← Property (키프레임, 이징 등)
│   └── keyframeease.md          ← KeyframeEase 오브젝트
├── 06-text/
│   └── textdocument.md          ← TextDocument (fontSize, fillColor 등)
├── 07-matchnames/
│   ├── avlayer-matchnames.md    ← Transform, Audio 매치네임
│   ├── 3d-matchnames.md         ← 3D/Material 매치네임
│   ├── camera-matchnames.md     ← Camera Options 매치네임
│   ├── light-matchnames.md      ← Light Options 매치네임
│   ├── shapelayer-matchnames.md ← Shape, Fill, Stroke, Modifier 매치네임
│   ├── textlayer-matchnames.md  ← Text Properties 매치네임
│   └── layerstyles-matchnames.md← Layer Styles 매치네임
└── 08-patterns-and-pitfalls/
    ├── common-mistakes.md              ← 확인된 실수 목록 + 안전 패턴
    └── layer-to-comp-extendscript.md   ← toComp 미지원 시 좌표 변환(toComp 표현식 vs 스크립트)
```

## 핵심 참조 우선순위

1. `08-patterns-and-pitfalls/common-mistakes.md` — **먼저 확인**
2. `08-patterns-and-pitfalls/layer-to-comp-extendscript.md` — 레이어→컴프 좌표(`toComp` 스크립트 금지)
3. `07-matchnames/` — 매치네임 정확성
4. `05-properties/property.md` — setTemporalEaseAtKey 배열 크기
5. `04-layers/layercollection.md` — 레이어 생성 메서드

## 공식 사이트

- https://ae-scripting.docsforadobe.dev/
- https://github.com/docsforadobe/after-effects-scripting-guide
