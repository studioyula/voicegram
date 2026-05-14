var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) throw new Error("활성 컴프가 없습니다.");

function ensureSlider(layer, name, value) {
  var fx = layer.property("ADBE Effect Parade");
  if (!fx) return null;

  var eff = fx.property(name);
  if (!eff) {
    eff = fx.addProperty("ADBE Slider Control");
    eff.name = name;
  }

  var slider = eff.property("ADBE Slider Control-0001");
  if (slider) slider.setValue(value);
  return eff;
}

var expr =
  "var c1 = effect(\"Overshoot\")(\"Slider\");\n" +
  "var tension = effect(\"Tension\")(\"Slider\");\n" +
  "if (numKeys < 2) {\n" +
  "  value;\n" +
  "} else {\n" +
  "  var idx = 1;\n" +
  "  for (var i = 1; i <= numKeys; i++) {\n" +
  "    if (time >= key(i).time) idx = i;\n" +
  "  }\n" +
  "  if (idx >= numKeys) {\n" +
  "    key(numKeys).value;\n" +
  "  } else {\n" +
  "    var t1 = key(idx).time;\n" +
  "    var t2 = key(idx + 1).time;\n" +
  "    var v1 = key(idx).value;\n" +
  "    var v2 = key(idx + 1).value;\n" +
  "    var t = clamp((time - t1) / Math.max(0.0001, (t2 - t1)), 0, 1);\n" +
  "    var c3 = c1 + 1;\n" +
  "    var curved = 1 - Math.pow(1 - t, tension);\n" +
  "    var eased = 1 + c3 * Math.pow(curved - 1, 3) + c1 * Math.pow(curved - 1, 2);\n" +
  "    v1 + (v2 - v1) * eased;\n" +
  "  }\n" +
  "}";

var updated = 0;
for (var i = 1; i <= comp.numLayers; i++) {
  var lyr = comp.layer(i);
  if (!lyr || lyr.name !== "rect" || !lyr.enabled) continue;

  var pos = lyr.property("Transform").property("Position");
  if (!pos || pos.numKeys < 2) continue;

  // 1) LINEAR 선적용
  for (var k = 1; k <= pos.numKeys; k++) {
    pos.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
  }

  // 2) 슬라이더 세팅
  ensureSlider(lyr, "Overshoot", 2);
  ensureSlider(lyr, "Tension", 3);

  // 3) 표현식 적용
  pos.expression = expr;
  updated++;
}

return {
  updatedLayers: updated,
  preset: "Overshoot Back",
  params: { Overshoot: 2, Tension: 3 }
};
