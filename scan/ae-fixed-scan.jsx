function _scanValueToJsonSafe(value) {
    if (value === null || value === undefined) return null;
    if (value instanceof Array) {
        var arr = [];
        for (var i = 0; i < value.length; i++) arr.push(_scanValueToJsonSafe(value[i]));
        return arr;
    }
    var t = typeof value;
    if (t === "number" || t === "string" || t === "boolean") return value;
    try {
        return String(value);
    } catch (e) {
        return "[unserializable]";
    }
}

function _scanProp(prop) {
    var item = {
        name: prop.name || "",
        matchName: prop.matchName || "",
        propertyType: prop.propertyType,
        selected: !!prop.selected
    };

    if (prop.propertyType === PropertyType.PROPERTY) {
        try { item.value = _scanValueToJsonSafe(prop.value); } catch (e1) {}
        try { item.numKeys = prop.numKeys || 0; } catch (e2) { item.numKeys = 0; }
        if (item.numKeys > 0) {
            item.keys = [];
            for (var k = 1; k <= item.numKeys; k++) {
                var key = { index: k };
                try { key.time = prop.keyTime(k); } catch (e3) {}
                try { key.value = _scanValueToJsonSafe(prop.keyValue(k)); } catch (e4) {}
                item.keys.push(key);
            }
        }
        try {
            if (prop.canSetExpression) {
                item.expressionEnabled = !!prop.expressionEnabled;
                item.expressionError = prop.expressionError || "";
            }
        } catch (e5) {}
    }

    return item;
}

function _scanSelectedProperties(layer) {
    var result = [];
    try {
        var props = layer.selectedProperties || [];
        for (var i = 0; i < props.length; i++) {
            result.push(_scanProp(props[i]));
        }
    } catch (e) {}
    return result;
}

function _scanLayer(layer) {
    var info = {
        index: layer.index,
        name: layer.name,
        matchName: layer.matchName || "",
        enabled: !!layer.enabled,
        selected: !!layer.selected,
        locked: !!layer.locked,
        shy: !!layer.shy,
        startTime: layer.startTime,
        inPoint: layer.inPoint,
        outPoint: layer.outPoint,
        selectedProperties: _scanSelectedProperties(layer)
    };

    try { info.label = layer.label; } catch (e1) {}
    try { info.blendingMode = String(layer.blendingMode); } catch (e2) {}
    try { info.position = _scanValueToJsonSafe(layer.transform.position.value); } catch (e3) {}
    try { info.scale = _scanValueToJsonSafe(layer.transform.scale.value); } catch (e4) {}
    try { info.opacity = _scanValueToJsonSafe(layer.transform.opacity.value); } catch (e5) {}
    try { info.rotation = layer.transform.rotation.value; } catch (e6) {}

    return info;
}

var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    return JSON.stringify({
        ok: false,
        error: "활성 컴포지션이 없습니다."
    });
}

var layers = [];
for (var i = 1; i <= comp.numLayers; i++) {
    layers.push(_scanLayer(comp.layer(i)));
}

var selectedLayers = [];
for (var s = 0; s < comp.selectedLayers.length; s++) {
    selectedLayers.push(comp.selectedLayers[s].index);
}

return JSON.stringify({
    ok: true,
    comp: {
        name: comp.name,
        width: comp.width,
        height: comp.height,
        duration: comp.duration,
        frameRate: comp.frameRate,
        time: comp.time,
        numLayers: comp.numLayers,
        selectedLayers: selectedLayers
    },
    layers: layers
});
