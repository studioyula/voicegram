// ae-summary.jsx — AE 컴포지션 경량 스캔 (summary)
// 파라미터: tmp/scan_params.json { compName?: string }
// 결과: return JSON

var _params = {};
try {
    var _pf = new File(Folder.temp.fsName + "/scan_params.json");
    if (_pf.exists) {
        _pf.open("r");
        _params = eval("(" + _pf.read() + ")");
        _pf.close();
    }
} catch(e) {}

// ── comp selector ──
var comp = null;
if (_params.compName) {
    for (var _ci = 1; _ci <= app.project.numItems; _ci++) {
        var _item = app.project.item(_ci);
        if (_item instanceof CompItem && _item.name === _params.compName) { comp = _item; break; }
    }
    if (!comp) throw new Error("컴포지션을 찾을 수 없음: " + _params.compName);
} else {
    try {
        var _av = app.activeViewer;
        if (_av && _av.type === ViewerType.VIEWER_COMPOSITION) {
            _av.setActive();
            var _ai = app.project.activeItem;
            if (_ai && _ai instanceof CompItem) comp = _ai;
        }
    } catch (_e0) {}
    if (!comp && app.project.activeItem && app.project.activeItem instanceof CompItem) {
        comp = app.project.activeItem;
    }
    if (!comp) throw new Error("활성 컴포지션이 없습니다");
}

// ── scan ──
var r = {
    project: app.project.file ? app.project.file.name : "Untitled",
    comp: { name: comp.name, w: comp.width, h: comp.height, fps: comp.frameRate, dur: Math.round(comp.duration*100)/100, numLayers: comp.numLayers },
    selected: [],
    layers: []
};
var sel = comp.selectedLayers;
for (var s = 0; s < sel.length; s++) r.selected.push({ i: sel[s].index, name: sel[s].name });
for (var i = 1; i <= comp.numLayers; i++) {
    var l = comp.layer(i);
    var t = "Unknown";
    if (l instanceof TextLayer) t = "Text";
    else if (l instanceof ShapeLayer) t = "Shape";
    else if (l instanceof CameraLayer) t = "Camera";
    else if (l instanceof LightLayer) t = "Light";
    else if (l instanceof AVLayer) { t = l.nullLayer ? "Null" : (l.source instanceof CompItem ? "Precomp" : "Footage"); }
    var info = { i: l.index, name: l.name, type: t, on: l.enabled };
    if (t === "Text") { try { info.text = l.property("Source Text").value.text; } catch(e) {} }
    if (t === "Shape") { try { info.groups = l.property("Contents").numProperties; } catch(e) {} }
    try { var tf = l.transform; info.keys = tf.position.numKeys + tf.scale.numKeys + tf.rotation.numKeys + tf.opacity.numKeys; } catch(e) {}
    try { var fx = l.property("Effects"); if (fx && fx.numProperties > 0) info.fx = fx.numProperties; } catch(e) {}
    r.layers.push(info);
}
return r;
