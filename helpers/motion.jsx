function _motionEaseArray(prop, influence) {
    var count = 1;
    try {
        if (!prop.isSpatial && prop.value instanceof Array) {
            count = prop.value.length;
        }
    } catch (e) {
        count = 1;
    }

    var arr = [];
    for (var i = 0; i < count; i++) {
        arr.push(new KeyframeEase(0, influence));
    }
    return arr;
}

function easeKey(prop, keyIdx, inInfl, outInfl) {
    inInfl = (inInfl === undefined) ? 80 : inInfl;
    outInfl = (outInfl === undefined) ? 80 : outInfl;

    if (!prop || !prop.numKeys || keyIdx < 1 || keyIdx > prop.numKeys) {
        return prop;
    }

    try {
        prop.setInterpolationTypeAtKey(
            keyIdx,
            KeyframeInterpolationType.BEZIER,
            KeyframeInterpolationType.BEZIER
        );
    } catch (e1) {}

    try {
        prop.setTemporalEaseAtKey(
            keyIdx,
            _motionEaseArray(prop, inInfl),
            _motionEaseArray(prop, outInfl)
        );
    } catch (e2) {}

    return prop;
}

function easeKeys(prop, inInfl, outInfl) {
    if (!prop || !prop.numKeys) return prop;
    for (var i = 1; i <= prop.numKeys; i++) {
        easeKey(prop, i, inInfl, outInfl);
    }
    return prop;
}

function staggerRandom(n, maxDelay, seed) {
    seed = (seed === undefined) ? 1 : seed;
    maxDelay = (maxDelay === undefined) ? 1 : maxDelay;

    var result = [];
    var s = seed;
    for (var i = 0; i < n; i++) {
        s = (s * 9301 + 49297) % 233280;
        result.push((s / 233280) * maxDelay);
    }
    return result;
}

function maskReveal(comp, layer, opts) {
    opts = opts || {};
    var dir = opts.dir || "up";
    var dur = (opts.dur === undefined) ? 0.4 : opts.dur;
    var delay = opts.delay || 0;
    var infl = (opts.infl === undefined) ? 80 : opts.infl;
    var slide = (opts.slide === undefined) ? 120 : opts.slide;

    if (!comp || !layer) return null;

    var pos = layer.transform.position;
    var endPos = pos.value;
    var startPos = [endPos[0], endPos[1]];

    if (dir === "up") startPos[1] = endPos[1] + slide;
    else if (dir === "down") startPos[1] = endPos[1] - slide;
    else if (dir === "left") startPos[0] = endPos[0] + slide;
    else if (dir === "right") startPos[0] = endPos[0] - slide;

    if (endPos.length === 3) startPos.push(endPos[2]);

    pos.setValueAtTime(delay, startPos);
    pos.setValueAtTime(delay + dur, endPos);
    easeKeys(pos, infl, infl);

    try {
        var opacity = layer.transform.opacity;
        opacity.setValueAtTime(delay, 0);
        opacity.setValueAtTime(delay + Math.min(dur, 0.2), 100);
        easeKeys(opacity, infl, infl);
    } catch (e) {}

    return layer;
}

function revealAllTextLayers(comp, opts) {
    opts = opts || {};
    if (!comp) return [];

    var layers = [];
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer instanceof TextLayer) {
            layers.push(layer);
        }
    }

    var delays = staggerRandom(layers.length, opts.maxStagger || 0.8, opts.seed || 1);
    for (var j = 0; j < layers.length; j++) {
        opts.delay = delays[j];
        maskReveal(comp, layers[j], opts);
    }
    return layers;
}
