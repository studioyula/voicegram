(function () {
  var audioManager;
  var shapeRenderer;
  var mosaicRenderer;
  var currentMode = "mosaic";
  var mosaicAspectW = 1;
  var mosaicAspectH = 1;

  window.VibeApp = {
    _canvasEl: null,
    getMode: function () {
      return currentMode;
    },
    setMode: function (mode) {
      currentMode = mode;
    },
    getMosaicAspect: function () {
      return { w: mosaicAspectW, h: mosaicAspectH };
    },
    setMosaicAspect: function (w, h) {
      var nw = Number(w);
      var nh = Number(h);
      if (!isFinite(nw) || nw <= 0) nw = 1;
      if (!isFinite(nh) || nh <= 0) nh = 1;
      mosaicAspectW = nw;
      mosaicAspectH = nh;
      if (
        mosaicRenderer &&
        typeof mosaicRenderer.invalidateLayout === "function"
      ) {
        mosaicRenderer.invalidateLayout();
      }
    },
    getRenderer: function () {
      return currentMode === "mosaic" ? mosaicRenderer : shapeRenderer;
    },
    getShapeRenderer: function () {
      return shapeRenderer;
    },
    getMosaicRenderer: function () {
      return mosaicRenderer;
    },
    /** Non-null only in mosaic mode — used to crop video to the mosaic poster area (bitmap px). */
    getRecordingCropRect: function () {
      if (this.getMode() !== "mosaic") return null;
      var mr = this.getMosaicRenderer();
      if (!mr || typeof mr.getViewportRect !== "function") return null;
      var r = mr.getViewportRect();
      if (!r) return null;
      var el = this.getCanvas();
      if (!el) return r;
      var lw = this._canvasLogicalW;
      var lh = this._canvasLogicalH;
      if (!lw || !lh || lw <= 0 || lh <= 0) return r;
      if (el.width === lw && el.height === lh) return r;
      var sx = el.width / lw;
      var sy = el.height / lh;
      return {
        x: r.x * sx,
        y: r.y * sy,
        w: r.w * sx,
        h: r.h * sy,
      };
    },
    getCanvas: function () {
      if (this._canvasEl) return this._canvasEl;
      var host = document.getElementById("canvas-host");
      return host && host.querySelector ? host.querySelector("canvas") : null;
    },
  };

  var sketch = function (p) {
    function getCanvasHostSize() {
      var host = document.getElementById("canvas-host");
      return {
        width: host ? host.clientWidth : p.windowWidth,
        height: host ? host.clientHeight : p.windowHeight,
      };
    }

    p.setup = function () {
      var size = getCanvasHostSize();
      var c = p.createCanvas(size.width, size.height);
      c.parent("canvas-host");
      window.VibeApp._canvasEl = c.elt ? c.elt : c.canvas;
      window.VibeApp._canvasLogicalW = p.width;
      window.VibeApp._canvasLogicalH = p.height;
      p.colorMode(p.HSB, 360, 100, 100, 100);
      var bg = VibePalettes.getActive().bg;
      p.background(bg[0], bg[1], bg[2]);

      audioManager = new VibeAudio.AudioManager(p);
      audioManager.init();
      shapeRenderer = new VibeRenderer.ShapeRenderer(p, audioManager);
      mosaicRenderer = new VibeRenderer.MosaicRenderer(p, audioManager);
      VibeUI.init(audioManager, p);
    };

    p.draw = function () {
      if (audioManager.enabled) {
        audioManager.analyze();
      }
      var renderer = window.VibeApp.getRenderer();
      renderer.update();
      renderer.render();
      if (typeof VibeRecorder !== "undefined" && VibeRecorder.syncCropFrame) {
        VibeRecorder.syncCropFrame();
      }
      VibeUI.updateDebug();
      VibeUI.updateFileProgress();
    };

    p.windowResized = function () {
      var size = getCanvasHostSize();
      p.resizeCanvas(size.width, size.height);
      window.VibeApp._canvasLogicalW = p.width;
      window.VibeApp._canvasLogicalH = p.height;
    };
  };

  window.addEventListener("DOMContentLoaded", function () {
    if (typeof p5 === "undefined") {
      document.getElementById("status-text").textContent =
        "P5 FAILED — RELOAD";
      return;
    }
    new p5(sketch);
  });
})();
