# Layer → 컴프 좌표 (`toComp`) — ExtendScript vs Expression

## 에이전트·스크립트 작업 시 반드시 구분

| 컨텍스트 | `toComp` / `toWorld` / `fromComp` |
|----------|-------------------------------------|
| **Expression** (레이어 표현식) | Layer 기준으로 제공됨. `thisLayer.toComp([x,y])` 등 사용 가능. |
| **ExtendScript** (`ae_execute`로 실행하는 `.jsx`) | **동일 API를 가정하면 안 됨.** 환경에 따라 `typeof layer.toComp === "undefined"` 이거나 TextLayer에서 미노출됨. **스크립트에서는 호출하지 말 것.** |

공식 Expression 레퍼런스(ae-expressions.docsforadobe.dev)의 “Layer space transforms”는 **표현식 언어** 기준이다. ExtendScript 가이드(ae-scripting.docsforadobe.dev)의 Layer 객체 설명과 **혼동하지 말 것**.

## 스크립트에서 해야 할 일

1. **`layer.toComp(pt)` / `layer.toWorld(pt)`에 의존하지 않는다.**
2. 레이어 **anchor · scale · rotation · position**과 **부모 체인**을 사용해, `sourceRectAtTime` 등 **레이어 내부 좌표**의 점을 컴프 픽셀 좌표로 직접 변환한다.
3. 텍스트 박스를 컴프에 맞출 때는 네 모서리를 각각 변환한 뒤 `min/max`로 **축정렬 바운드(AABB)** 를 잡는 방식이 안정적이다(회전 시 매트는 AABB가 됨).

## 권장 헬퍼 (2D · 부모 체인)

- 아래는 **2D 레이어** 전용. **3D 레이어**·오토오리엔트·복잡한 카메라 환경은 별도 검증 필요.
- `pt`는 `sourceRectAtTime`이 반환하는 좌표와 **같은 기준**(문서 기준: 텍스트는 앵커 대비 박스)의 `[x, y]`다.

```javascript
/**
 * 레이어 로컬 좌표의 점을 컴포지션 좌표로 변환 (ExtendScript 전용, toComp 미사용).
 * 2D + 부모 체인. ES3.
 */
function layerPointToComp(layer, pt, t) {
  var ap = layer.transform.anchorPoint.valueAtTime(t, false);
  var pos = layer.transform.position.valueAtTime(t, false);
  var sc = layer.transform.scale.valueAtTime(t, false);
  var rot = layer.transform.rotation.valueAtTime(t, false);
  var dx = (pt[0] - ap[0]) * (sc[0] / 100);
  var dy = (pt[1] - ap[1]) * (sc[1] / 100);
  var rad = rot * Math.PI / 180;
  var rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  var ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  if (!layer.parent) {
    return [pos[0] + rx, pos[1] + ry];
  }
  var pap = layer.parent.transform.anchorPoint.valueAtTime(t, false);
  var nextPt = [pap[0] + pos[0] + rx, pap[1] + pos[1] + ry];
  return layerPointToComp(layer.parent, nextPt, t);
}
```

## 프로젝트 내 복사 원본

동일 구현을 파일로 두었다: `scripts/utility/layer-point-to-comp.jsx`  
(MCP 단발 스크립트에서는 함수 본문을 붙여 넣거나, `$.evalFile`로 불러 쓴다.)

## 관련 문서

- `docs/04-layers/textlayer.md` — `sourceRectAtTime` · 앵커 보정
- `docs/08-patterns-and-pitfalls/expressions-cheatsheet.md` — 표현식의 `sourceRectAtTime` 예시와 **스크립트는 별도**임을 참고
