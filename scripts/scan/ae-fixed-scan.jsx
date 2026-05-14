// ae-fixed-scan.jsx
// 고정 스캔: 활성 컴프 + 선택 레이어 + 선택 속성 + 키프레임 요약

function _safe(v, d) { return (v === undefined || v === null) ? d : v; }
function _round(n) { return Math.round(n * 1000) / 1000; }

function _getComp() {
    var comp = null;
    try {
        var av = app.activeViewer;
        if (av && av.type === ViewerType.VIEWER_COMPOSITION) {
            av.setActive();
            if (app.project.activeItem && app.project.activeItem instanceof CompItem) comp = app.project.activeItem;
        }
    } catch(_e) {}
    if (!comp && app.project.activeItem && app.project.activeItem instanceof CompItem) comp = app.project.activeItem;
    if (!comp) throw new Error("활성 컴포지션이 없습니다");
    return comp;
}

function _shapeMeta(shapeVal) {
    var m = {};
    try { m.closed = !!shapeVal.closed; } catch(_e) {}
    try { m.vertexCount = shapeVal.vertices ? shapeVal.vertices.length : 0; } catch(_e) {}
    return m;
}

function _propSummary(prop) {
    var info = {
        name: _safe(prop.name, ""),
        matchName: _safe(prop.matchName, ""),
        numKeys: _safe(prop.numKeys, 0)
    };
    try { info.expressionEnabled = !!prop.expressionEnabled; } catch(_e) {}
    try {
        if (prop.expression && prop.expression !== "") info.expression = prop.expression;
    } catch(_e) {}
    try {
        var sk = prop.selectedKeys;
        info.selectedKeys = [];
        if (sk && sk.length) {
            for (var i = 0; i < sk.length; i++) {
                var k = sk[i];
                var kf = { index: k, time: _round(prop.keyTime(k)) };
                try {
                    var v = prop.keyValue(k);
                    if (v && v.vertices) kf.shape = _shapeMeta(v);
                    else kf.value = v;
                } catch(_e2) {}
                info.selectedKeys.push(kf);
            }
        }
    } catch(_e) {}
    return info;
}

var comp = _getComp();
var out = {
    comp: {
        name: comp.name,
        width: comp.width,
        height: comp.height,
        frameRate: comp.frameRate,
        duration: _round(comp.duration),
        time: _round(comp.time),
        numLayers: comp.numLayers
    },
    selectedLayers: [],
    allLayers: []
};

for (var i = 1; i <= comp.numLayers; i++) {
    var l = comp.layer(i);
    var lt = "Unknown";
    if (l instanceof TextLayer) lt = "Text";
    else if (l instanceof ShapeLayer) lt = "Shape";
    else if (l instanceof CameraLayer) lt = "Camera";
    else if (l instanceof LightLayer) lt = "Light";
    else if (l instanceof AVLayer) lt = l.nullLayer ? "Null" : (l.source instanceof CompItem ? "Precomp" : "Footage");
    out.allLayers.push({ index: l.index, name: l.name, type: lt, enabled: l.enabled });
}

var sels = comp.selectedLayers;
for (var si = 0; si < sels.length; si++) {
    var sl = sels[si];
    var item = {
        index: sl.index,
        name: sl.name,
        selectedProperties: []
    };
    var props = sl.selectedProperties;
    for (var pi = 0; pi < props.length; pi++) {
        var p = props[pi];
        if (!p || p.propertyType !== PropertyType.PROPERTY) continue;
        item.selectedProperties.push(_propSummary(p));
    }
    out.selectedLayers.push(item);
}

return out;
