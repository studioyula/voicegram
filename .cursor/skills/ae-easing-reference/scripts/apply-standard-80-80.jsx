var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) throw new Error("활성 컴프가 없습니다.");

var ease = [new KeyframeEase(0, 80)];
var updated = 0;

for (var i = 1; i <= comp.numLayers; i++) {
  var lyr = comp.layer(i);
  if (!lyr || lyr.name !== "rect" || !lyr.enabled) continue;

  var pos = lyr.property("Transform").property("Position");
  if (!pos || pos.numKeys < 1) continue;

  for (var k = 1; k <= pos.numKeys; k++) {
    pos.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    // Spatial Position은 [ease] 1개 배열 사용
    pos.setTemporalEaseAtKey(k, ease, ease);
  }
  updated++;
}

return {
  updatedLayers: updated,
  preset: "Standard 80/80"
};
