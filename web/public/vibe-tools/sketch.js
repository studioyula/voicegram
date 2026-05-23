(function () {
  var audioManager;
  var shapeRenderer;
  var mosaicRenderer;
  var currentMode = "mosaic";
  var mosaicAspectW = 1;
  var mosaicAspectH = 1;

  window.VibeApp = {
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
      var nw = typeof w === "number" && w > 0 ? w : 1;
      var nh = typeof h === "number" && h > 0 ? h : 1;
      mosaicAspectW = Math.min(8, Math.max(0.25, nw));
      mosaicAspectH = Math.min(8, Math.max(0.25, nh));
      if (mosaicRenderer && typeof mosaicRenderer.invalidateLayout === "function") {
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
      VibeUI.updateDebug();
      VibeUI.updateFileProgress();
    };

    p.windowResized = function () {
      var size = getCanvasHostSize();
      p.resizeCanvas(size.width, size.height);
    };
  };

  window.addEventListener("DOMContentLoaded", function () {
    if (typeof p5 === "undefined") {
      var failLabel = document.getElementById("file-label");
      if (failLabel) failLabel.textContent = "P5 FAILED — RELOAD";
      return;
    }
    new p5(sketch);
  });
})();
