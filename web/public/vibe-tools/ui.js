var VibeUI = (function () {
  var audio;
  var p5ref;
  var els = {};

  function init(audioManager, p) {
    audio = audioManager;
    p5ref = p;

    els.sourceMic = document.getElementById("btn-source-mic");
    els.sourceFile = document.getElementById("btn-source-file");
    els.toggle = document.getElementById("btn-toggle");
    els.clear = document.getElementById("btn-clear");
    els.capture = document.getElementById("btn-capture");
    els.fileInput = document.getElementById("file-input");
    els.fileControls = document.getElementById("file-controls");
    els.micControls = document.getElementById("mic-controls");
    els.micDevice = document.getElementById("mic-device");
    els.playPause = document.getElementById("btn-play-pause");
    els.progress = document.getElementById("progress-bar");
    els.debug = document.getElementById("debug-bands");
    els.status = document.getElementById("status-text");

    els.sourceMic.onclick = function () { setSource("mic"); };
    els.sourceFile.onclick = function () { setSource("file"); };
    els.toggle.onclick = onToggle;
    els.clear.onclick = function () {
      window.VibeApp.getRenderer().clear();
    };
    els.capture.onclick = onCapture;
    els.fileInput.onchange = onFileSelected;
    els.playPause.onclick = function () {
      audio.playFile();
      updateToggleLabel();
      updatePlayLabel();
      els.status.textContent = audio.isPlaying
        ? "PLAYING"
        : "PAUSED";
    };
    els.progress.onmousedown = function () {
      els.progress.dataset.seeking = "1";
    };
    els.progress.onmouseup = function () {
      delete els.progress.dataset.seeking;
    };
    els.progress.oninput = function () {
      audio.seekFile(parseFloat(els.progress.value, 10));
    };
    els.micDevice.onchange = function () {
      var idx = parseInt(els.micDevice.value, 10);
      if (!isNaN(idx)) audio.setMicDevice(idx);
    };

    setupModeButtons();
    setupPaletteDots();
    setupDebugToggle();

    setSource("file");
    updateToggleLabel();
  }

  function setupModeButtons() {
    var modeBtns = document.querySelectorAll(".mode-btn");
    var i;
    for (i = 0; i < modeBtns.length; i++) {
      modeBtns[i].onclick = function () {
        var mode = this.getAttribute("data-mode");
        window.VibeApp.setMode(mode);
        window.VibeApp.getRenderer().clear();
        var j;
        for (j = 0; j < modeBtns.length; j++) {
          modeBtns[j].classList.remove("active");
        }
        this.classList.add("active");
        els.status.textContent =
          mode === "mosaic" ? "MODE — MOSAIC" : "MODE — SHAPE";
      };
    }
  }

  function setupPaletteDots() {
    var palDots = document.querySelectorAll(".pal-dot");
    var i;
    for (i = 0; i < palDots.length; i++) {
      palDots[i].onclick = function () {
        var palId = this.getAttribute("data-pal");
        VibePalettes.setActive(palId);
        var bg = VibePalettes.getActive().bg;
        if (p5ref) p5ref.background(bg[0], bg[1], bg[2]);
        var j;
        for (j = 0; j < palDots.length; j++) {
          palDots[j].classList.remove("active");
        }
        this.classList.add("active");
      };
    }
  }

  function setupDebugToggle() {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "d" && e.key !== "D") return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) {
        return;
      }
      els.debug.classList.toggle("hidden");
    });
  }

  function onCapture() {
    if (!p5ref) return;
    p5ref.saveCanvas("vibe-tools-capture", "png");
    els.status.textContent = "CAPTURE SAVED";
  }

  function setSource(mode) {
    audio.setSourceMode(mode);
    els.sourceMic.classList.toggle("active", mode === "mic");
    els.sourceFile.classList.toggle("active", mode === "file");
    els.fileControls.classList.toggle("hidden", mode !== "file");
    els.micControls.classList.toggle("hidden", mode !== "mic");
    if (mode === "mic") {
      els.status.textContent = audio.enabled
        ? "MIC — CONNECTING"
        : "MIC — ENABLE ANALYSIS";
      refreshMicDevices(false);
      if (audio.enabled) audio.startMic();
    } else {
      els.status.textContent = "FILE — LOAD THEN PLAY";
    }
  }

  function refreshMicDevices(restart) {
    audio.requestMicPermission(
      function () {
        audio.listMicDevices(function (sources) {
          els.micDevice.innerHTML = "";
          var i;
          for (i = 0; i < sources.length; i++) {
            var opt = document.createElement("option");
            opt.value = i;
            opt.textContent = sources[i] || "MIC " + (i + 1);
            els.micDevice.appendChild(opt);
          }
          if (sources.length === 0) {
            var empty = document.createElement("option");
            empty.textContent = "NO MIC";
            els.micDevice.appendChild(empty);
          } else if (audio.selectedMicIndex == null) {
            audio.selectedMicIndex = 0;
            els.micDevice.value = "0";
          }
          if (restart && audio.enabled && audio.sourceMode === "mic") {
            audio.startMic();
          }
        });
      },
      function (msg) {
        els.status.textContent = "MIC PERMISSION — " + msg;
      }
    );
  }

  function onToggle() {
    var on = audio.toggleEnabled();
    updateToggleLabel();
    if (on && audio.sourceMode === "mic") refreshMicDevices(true);
    els.status.textContent = on ? "ANALYSIS ON" : "ANALYSIS OFF";
  }

  function updateToggleLabel() {
    els.toggle.textContent = audio.enabled ? "ON" : "OFF";
    els.toggle.classList.toggle("on", audio.enabled);
  }

  function updatePlayLabel() {
    els.playPause.textContent = audio.isPlaying ? "PAUSE" : "PLAY";
  }

  function onFileSelected(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    els.status.textContent = "LOADING";
    audio.loadFile(
      file,
      function () {
        els.status.textContent = "LOADED — PRESS PLAY";
        updatePlayLabel();
      },
      function () {
        els.status.textContent = "LOAD FAILED";
      }
    );
  }

  function updateDebug() {
    var a = audio.lastAnalysis;
    var mode = window.VibeApp.getMode().toUpperCase();
    var pal = VibePalettes.getActive().name;
    var shapeHint = "";
    if (a.isSound) {
      shapeHint = VibeUtils.shapeLabel(VibeUtils.selectShapeType(a));
    }
    els.debug.textContent =
      "BASS " +
      Math.round(a.bass) +
      " | MID " +
      Math.round(a.mid) +
      " | TREBLE " +
      Math.round(a.treble) +
      " | VOL " +
      (VibeUtils.effectiveVolume(a.volume, a.isMic) * 100).toFixed(0) +
      "% | PEAK " +
      Math.round(a.peakFreq || 0) +
      "Hz | BRIGHT " +
      (a.centroid || 0).toFixed(2) +
      " | Δ " +
      (a.delta || 0).toFixed(2) +
      " | SPREAD " +
      (a.spread || 0).toFixed(2) +
      " | " +
      mode +
      " | " +
      pal +
      " | " +
      (a.isSound ? "● SOUND" : "○ SILENT") +
      (shapeHint ? " | " + shapeHint : "");
  }

  function updateFileProgress() {
    if (audio.sourceMode !== "file" || !audio.soundFile) return;
    var prog = audio.getFileProgress();
    if (!els.progress.dataset.seeking) {
      els.progress.value = prog.ratio;
    }
  }

  return {
    init: init,
    updateDebug: updateDebug,
    updateFileProgress: updateFileProgress,
    updatePlayLabel: updatePlayLabel,
  };
})();
