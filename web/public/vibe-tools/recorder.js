/**
 * Canvas → MediaRecorder export (MP4 when supported, else WebM).
 * Mic mode: mixes live mic audio into the recording when possible.
 * ES5 only.
 */
var VibeRecorder = (function () {
  var recorder = null;
  var chunks = [];
  var canvasCaptureStream = null;
  var combinedStream = null;
  var chosenMime = "";
  var recording = false;
  var callbacks = null;

  function extensionForMime(mt) {
    if (!mt) return "webm";
    if (mt.indexOf("mp4") !== -1) return "mp4";
    return "webm";
  }

  function pickMimeType(hasAudio) {
    var videoOnly = [
      "video/mp4; codecs=avc1.42E01E",
      "video/mp4; codecs=avc1.4D401E",
      "video/mp4",
      "video/webm; codecs=vp9",
      "video/webm; codecs=vp8",
      "video/webm",
    ];
    var withAudio = [
      "video/webm; codecs=vp9,opus",
      "video/webm; codecs=vp8,opus",
      "video/webm; codecs=vp9",
      "video/webm",
    ];
    var list = hasAudio ? withAudio : videoOnly;
    var i;
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
      return "";
    }
    for (i = 0; i < list.length; i++) {
      if (MediaRecorder.isTypeSupported(list[i])) {
        return list[i];
      }
    }
    return "";
  }

  function buildStream(getCanvas, getAudioStream) {
    var canvas = typeof getCanvas === "function" ? getCanvas() : getCanvas;
    if (!canvas || typeof canvas.captureStream !== "function") {
      return null;
    }

    canvasCaptureStream = canvas.captureStream(30);
    if (!canvasCaptureStream) {
      return null;
    }

    var micStream =
      getAudioStream && typeof getAudioStream === "function"
        ? getAudioStream()
        : null;
    var hasAudio =
      micStream &&
      micStream.getAudioTracks &&
      micStream.getAudioTracks().length > 0;

    if (hasAudio) {
      combinedStream = new MediaStream();
      canvasCaptureStream.getVideoTracks().forEach(function (t) {
        combinedStream.addTrack(t);
      });
      micStream.getAudioTracks().forEach(function (t) {
        combinedStream.addTrack(t);
      });
      return combinedStream;
    }

    combinedStream = null;
    return canvasCaptureStream;
  }

  function stopCanvasVideoOnly() {
    if (canvasCaptureStream) {
      canvasCaptureStream.getVideoTracks().forEach(function (t) {
        try {
          t.stop();
        } catch (e) {
          /* ignore */
        }
      });
    }
    canvasCaptureStream = null;
    combinedStream = null;
  }

  function fail(code, detail) {
    recording = false;
    stopCanvasVideoOnly();
    if (callbacks && typeof callbacks.onError === "function") {
      callbacks.onError(code, detail);
    }
    callbacks = null;
  }

  function start(opts) {
    var getCanvas = opts && opts.getCanvas;
    var getAudioStream = opts && opts.getAudioStream;
    var onBegin = opts && opts.onBegin;
    var onEnd = opts && opts.onEnd;
    var onError = opts && opts.onError;

    if (recording) return false;

    callbacks = { onEnd: onEnd, onError: onError };

    var stream = buildStream(getCanvas, getAudioStream);
    if (!stream) {
      fail("NO_CANVAS", "captureStream unavailable");
      return false;
    }

    var micStream =
      getAudioStream && typeof getAudioStream === "function"
        ? getAudioStream()
        : null;
    var hasAudio =
      micStream &&
      micStream.getAudioTracks &&
      micStream.getAudioTracks().length > 0;

    chosenMime = pickMimeType(hasAudio);
    if (!chosenMime) {
      fail("NO_CODEC", "MediaRecorder has no supported mime type");
      return false;
    }

    chunks = [];
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 6000000,
      });
    } catch (err) {
      fail("RECORDER_CREATE", err && err.message ? err.message : String(err));
      return false;
    }

    recorder.ondataavailable = function (ev) {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    recorder.onerror = function (ev) {
      fail("RECORDER_RUNTIME", ev && ev.error ? ev.error.message : "error");
    };

    recorder.onstop = function () {
      var baseType = chosenMime.split(";")[0];
      var blob = new Blob(chunks, { type: baseType || "video/webm" });
      var ext = extensionForMime(chosenMime);
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "voicegram-" + Date.now() + "." + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      chunks = [];
      recorder = null;
      recording = false;
      stopCanvasVideoOnly();

      var endCb = callbacks && callbacks.onEnd;
      callbacks = null;
      if (typeof endCb === "function") {
        endCb({ mime: chosenMime, ext: ext, size: blob.size });
      }
    };

    try {
      recorder.start(500);
    } catch (err2) {
      fail("RECORDER_START", err2 && err2.message ? err2.message : String(err2));
      return false;
    }

    recording = true;
    if (typeof onBegin === "function") {
      onBegin({ mime: chosenMime, hasAudio: hasAudio });
    }
    return true;
  }

  function stop() {
    if (!recorder || recorder.state === "inactive") {
      stopCanvasVideoOnly();
      recording = false;
      return;
    }
    try {
      recorder.stop();
    } catch (e) {
      stopCanvasVideoOnly();
      recording = false;
    }
  }

  function isRecording() {
    return recording;
  }

  return {
    start: start,
    stop: stop,
    isRecording: isRecording,
    pickMimeType: pickMimeType,
  };
})();
