/**
 * @utility ae-full-scan
 * @description AE 컴포지션 상세 스캔 — Transform 키프레임+이즈, Expression, 이펙트(파라미터값), TrackMatte, parent, 셰이프 구조
 * @app ae
 * @requires 활성 컴프 또는 compName 지정
 * @params compName?, layerIndex? — scan_params.json 경유
 * @tags scan, 스캔, full, 상세, 키프레임, 이펙트, 트랙매트
 */

var _params = {};
try {
    var _pf = new File(Folder.temp.fsName + "/scan_params.json");
    if (_pf.exists) { _pf.open("r"); _params = eval("(" + _pf.read() + ")"); _pf.close(); }
} catch(e) {}

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
    if (!comp && app.project.activeItem && app.project.activeItem instanceof CompItem) comp = app.project.activeItem;
    if (!comp) throw new Error("활성 컴포지션이 없습니다");
}

var _filterLayer = (_params.layerIndex !== undefined && _params.layerIndex !== null) ? _params.layerIndex : null;

// ── helpers ──
function _propInfo(prop) {
    try {
        var info = { value: prop.value, numKeys: prop.numKeys, expression: prop.expression || "" };
        if (prop.numKeys > 0) {
            info.keyframes = [];
            for (var k = 1; k <= prop.numKeys; k++) {
                var kf = {
                    time: Math.round(prop.keyTime(k) * 1000) / 1000,
                    value: prop.keyValue(k)
                };
                // interpolation type
                try {
                    var inT = prop.keyInInterpolationType(k);
                    var outT = prop.keyOutInterpolationType(k);
                    kf.interpIn = inT === KeyframeInterpolationType.LINEAR ? "LINEAR" : inT === KeyframeInterpolationType.HOLD ? "HOLD" : "BEZIER";
                    kf.interpOut = outT === KeyframeInterpolationType.LINEAR ? "LINEAR" : outT === KeyframeInterpolationType.HOLD ? "HOLD" : "BEZIER";
                } catch(_e) {}
                // temporal ease
                try {
                    var eIn = prop.keyInTemporalEase(k);
                    var eOut = prop.keyOutTemporalEase(k);
                    kf.easeIn = [];
                    kf.easeOut = [];
                    for (var ei = 0; ei < eIn.length; ei++) {
                        kf.easeIn.push({ speed: Math.round(eIn[ei].speed * 10) / 10, influence: Math.round(eIn[ei].influence * 10) / 10 });
                    }
                    for (var ei = 0; ei < eOut.length; ei++) {
                        kf.easeOut.push({ speed: Math.round(eOut[ei].speed * 10) / 10, influence: Math.round(eOut[ei].influence * 10) / 10 });
                    }
                } catch(_e) {}
                // spatial tangents (position etc)
                try {
                    var sIn = prop.keyInSpatialTangent(k);
                    var sOut = prop.keyOutSpatialTangent(k);
                    if (sIn && (sIn[0] !== 0 || sIn[1] !== 0)) kf.spatialIn = sIn;
                    if (sOut && (sOut[0] !== 0 || sOut[1] !== 0)) kf.spatialOut = sOut;
                } catch(_e) {}
                info.keyframes.push(kf);
            }
        }
        return info;
    } catch(_e) { return {}; }
}

function _getTransform(layer) {
    var tf = {};
    try {
        var t = layer.transform;
        tf.anchorPoint = _propInfo(t.anchorPoint);
        tf.position = _propInfo(t.position);
        tf.scale = _propInfo(t.scale);
        tf.rotation = _propInfo(t.rotation);
        tf.opacity = _propInfo(t.opacity);
    } catch(_e) {}
    return tf;
}

function _getEffects(layer) {
    var efList = [];
    try {
        var fx = layer.property("Effects");
        for (var ei = 1; ei <= fx.numProperties; ei++) {
            try {
                var ef = fx.property(ei);
                var efData = { name: ef.name, matchName: ef.matchName, enabled: ef.enabled, properties: [] };
                for (var pi = 1; pi <= ef.numProperties; pi++) {
                    try {
                        var prop = ef.property(pi);
                        if (prop.propertyType === PropertyType.PROPERTY) {
                            var pd = { name: prop.name, matchName: prop.matchName, value: prop.value, numKeys: prop.numKeys };
                            if (prop.expression && prop.expression !== "") pd.expression = prop.expression;
                            if (prop.numKeys > 0) {
                                pd.keyframes = [];
                                for (var k = 1; k <= prop.numKeys; k++) {
                                    pd.keyframes.push({ time: Math.round(prop.keyTime(k)*1000)/1000, value: prop.keyValue(k) });
                                }
                            }
                            efData.properties.push(pd);
                        }
                    } catch(_pe) {}
                }
                efList.push(efData);
            } catch(_e) {}
        }
    } catch(_e) {}
    return efList;
}

function _getMarkers(layer) {
    var marks = [];
    try {
        var lm = layer.property("Marker");
        for (var mi = 1; mi <= lm.numKeys; mi++) {
            try { var mv = lm.keyValue(mi); marks.push({ time: Math.round(lm.keyTime(mi)*1000)/1000, comment: mv.comment }); } catch(_e) {}
        }
    } catch(_e) {}
    return marks;
}

// ── scan ──
var analysis = {
    composition: {
        name: comp.name, width: comp.width, height: comp.height,
        pixelAspect: comp.pixelAspect, frameRate: comp.frameRate,
        duration: Math.round(comp.duration * 1000) / 1000,
        numLayers: comp.numLayers, bgColor: comp.bgColor,
        workAreaStart: Math.round(comp.workAreaStart * 1000) / 1000,
        workAreaDuration: Math.round(comp.workAreaDuration * 1000) / 1000
    },
    layers: [], markers: []
};

try {
    var _cm = comp.markerProperty;
    for (var _mi = 1; _mi <= _cm.numKeys; _mi++) {
        try {
            var _mv = _cm.keyValue(_mi);
            analysis.markers.push({ time: Math.round(_cm.keyTime(_mi)*1000)/1000, comment: _mv.comment, duration: _mv.duration });
        } catch(_e) {}
    }
} catch(_e) {}

for (var i = 1; i <= comp.numLayers; i++) {
    if (_filterLayer !== null && i !== _filterLayer) continue;
    try {
        var layer = comp.layer(i);
        var ld = {
            index: layer.index, name: layer.name, type: "Unknown",
            label: layer.label,
            enabled: layer.enabled, solo: layer.solo, locked: layer.locked, shy: layer.shy,
            inPoint: Math.round(layer.inPoint*1000)/1000, outPoint: Math.round(layer.outPoint*1000)/1000,
            startTime: Math.round(layer.startTime*1000)/1000, stretch: layer.stretch,
            parent: layer.parent ? { name: layer.parent.name, index: layer.parent.index } : null,
            transform: _getTransform(layer), effects: _getEffects(layer), markers: _getMarkers(layer)
        };
        try { ld.is3D = layer.threeDLayer; } catch(_e) {}

        // Track Matte
        try {
            ld.trackMatteType = layer.trackMatteType;
            if (ld.trackMatteType === TrackMatteType.NO_TRACK_MATTE) ld.trackMatteType = "NONE";
            else if (ld.trackMatteType === TrackMatteType.ALPHA) ld.trackMatteType = "ALPHA";
            else if (ld.trackMatteType === TrackMatteType.ALPHA_INVERTED) ld.trackMatteType = "ALPHA_INV";
            else if (ld.trackMatteType === TrackMatteType.LUMA) ld.trackMatteType = "LUMA";
            else if (ld.trackMatteType === TrackMatteType.LUMA_INVERTED) ld.trackMatteType = "LUMA_INV";
        } catch(_e) { ld.trackMatteType = "NONE"; }

        // Adjustment Layer
        try { if (layer instanceof AVLayer) ld.adjustmentLayer = layer.adjustmentLayer; } catch(_e) {}

        // Auto-Orient
        try { ld.autoOrient = layer.autoOrient; } catch(_e) {}

        if (layer instanceof TextLayer) {
            ld.type = "Text";
            try { var td = layer.property("Source Text").value; ld.text = { content: td.text, font: td.font, fontSize: td.fontSize }; } catch(_e) {}
        } else if (layer instanceof ShapeLayer) {
            ld.type = "Shape";
            try {
                var contents = layer.property("Contents"); ld.shapeGroups = [];
                for (var si = 1; si <= contents.numProperties; si++) {
                    try {
                        var sg = contents.property(si);
                        var sgInfo = { name: sg.name, matchName: sg.matchName };
                        // Trim Paths 상세
                        if (sg.matchName === "ADBE Vector Filter - Trim") {
                            sgInfo.trim = {};
                            try { sgInfo.trim.start = _propInfo(sg.property("Start")); } catch(_e) {}
                            try { sgInfo.trim.end = _propInfo(sg.property("End")); } catch(_e) {}
                            try { sgInfo.trim.offset = _propInfo(sg.property("Offset")); } catch(_e) {}
                        }
                        ld.shapeGroups.push(sgInfo);
                    } catch(_e) {}
                }
            } catch(_e) {}
        } else if (layer instanceof CameraLayer) { ld.type = "Camera";
        } else if (layer instanceof LightLayer) { ld.type = "Light";
        } else if (layer instanceof AVLayer) {
            if (layer.nullLayer) ld.type = "Null";
            else if (layer.adjustmentLayer) ld.type = "Adjustment";
            else {
                try {
                    ld.type = (layer.source instanceof CompItem) ? "Precomp" : "Footage";
                    ld.sourceName = layer.source ? layer.source.name : null;
                } catch(_e) { ld.type = "AV"; }
            }
        }
        analysis.layers.push(ld);
    } catch(_e) {}
}
return analysis;
