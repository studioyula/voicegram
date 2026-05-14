/**
 * ExtendScript: Layer.toComp / toWorld 가 없거나 undefined일 때 사용하는 좌표 변환.
 * Expression 전용 API에 의존하지 않는다.
 *
 * 사용: 본 파일을 $.evalFile 로드 후 layerPointToComp 호출, 또는 함수만 복사.
 * 상세: docs/08-patterns-and-pitfalls/layer-to-comp-extendscript.md
 *
 * @param {Layer} layer 대상 레이어 (2D 가정)
 * @param {Array} pt 레이어 로컬 [x, y] — sourceRectAtTime 과 동일 좌표계
 * @param {number} t 시간(초)
 * @return {Array} 컴포지션 좌표 [x, y]
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
