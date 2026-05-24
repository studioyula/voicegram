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
    /* Prefer MP4 (H.264 + AAC/Opus) when the browser exposes it — order matters. */
    var mp4WithAudio = [
      "video/mp4; codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4; codecs=avc1.4D401E,mp4a.40.2",
      "video/mp4; codecs=avc1.640028,mp4a.40.2",
      "video/mp4; codecs=avc1.64003E,mp4a.40.2",
      "video/mp4; codecs=avc3.42001E,mp4a.40.2",
      "video/mp4; codecs=avc1.64003E,opus",
      "video/mp4; codecs=avc1.42E01E,opus",
      "video/mp4",
    ];
    var mp4VideoOnly = [
      "video/mp4; codecs=avc1.42E01E",
      "video/mp4; codecs=avc1.4D401E",
      "video/mp4; codecs=avc1.640028",
      "video/mp4; codecs=avc1.64003E",
      "video/mp4; codecs=avc3.42001E",
      "video/mp4",
    ];
    var webmWithAudio = [
      "video/webm; codecs=vp9,opus",
      "video/webm; codecs=vp8,opus",
      "video/webm; codecs=vp9",
      "video/webm",
    ];
    var webmVideoOnly = [
      "video/webm; codecs=vp9",
      "video/webm; codecs=vp8",
      "video/webm",
    ];
    var list = hasAudio
      ? mp4WithAudio.concat(webmWithAudio)
      : mp4VideoOnly.concat(webmVideoOnly);
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

    chunks = [];
    var recOpts = { videoBitsPerSecond: 6000000 };
    if (chosenMime) {
      recOpts.mimeType = chosenMime;
    }
    try {
      recorder = new MediaRecorder(stream, recOpts);
    } catch (err) {
      if (chosenMime) {
        try {
          recorder = new MediaRecorder(stream, {
            videoBitsPerSecond: 6000000,
          });
        } catch (err2) {
          fail(
            "RECORDER_CREATE",
            err2 && err2.message ? err2.message : String(err2)
          );
          return false;
        }
      } else {
        fail(
          "RECORDER_CREATE",
          err && err.message ? err.message : String(err)
        );
        return false;
      }
    }

    if (recorder.mimeType) {
      chosenMime = recorder.mimeType;
    }
    if (!chosenMime) {
      fail("NO_CODEC", "MediaRecorder has no usable mime type");
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
