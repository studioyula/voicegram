(function () {
  var audioManager;
  var shapeRenderer;
  var mosaicRenderer;
  var currentMode = "mosaic";

  window.VibeApp = {
    getMode: function () {
      return currentMode;
    },
    setMode: function (mode) {
      currentMode = mode;
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
    p.setup = function () {
      var c = p.createCanvas(p.windowWidth, p.windowHeight);
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
      p.resizeCanvas(p.windowWidth, p.windowHeight);
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
