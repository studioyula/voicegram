var VibeUI = (function () {
  var audio;
  var p5ref;
  var els = {};

  function setMicLabel(text) {
    if (els.micLabel) els.micLabel.textContent = text;
  }

  function setFileLabel(text) {
    if (els.fileLabel) els.fileLabel.textContent = text;
  }

  function init(audioManager, p) {
    audio = audioManager;
    p5ref = p;

    els.sourceMic = document.getElementById("btn-source-mic");
    els.sourceFile = document.getElementById("btn-source-file");
    els.toggle = document.getElementById("btn-toggle");
    els.clear = document.getElementById("btn-clear");
    els.capture = document.getElementById("btn-capture");
    els.fileInput = document.getElementById("file-input");
    els.fileLabel = document.getElementById("file-label");
    els.fileControls = document.getElementById("file-controls");
    els.micControls = document.getElementById("mic-controls");
    els.micDevice = document.getElementById("mic-device");
    els.micLabel = document.getElementById("mic-label");
    els.micActivity = document.getElementById("mic-activity-fill");
    els.playPause = document.getElementById("btn-play-pause");
    els.progress = document.getElementById("progress-bar");
    els.debug = document.getElementById("debug-bands");

    audio.onMicReady = function () {
      setMicLabel("마이크 준비됨");
    };
    audio.onMicError = function (err) {
      setMicLabel(
        "마이크 오류 — " + (err && err.message ? err.message : "권한을 확인하세요")
      );
    };

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
      if (audio.sourceMode === "file") {
        setFileLabel(audio.isPlaying ? "재생 중" : "일시정지됨");
      }
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
    setupMosaicAspect();
    setupDebugToggle();

    setSource("file");
    updateToggleLabel();
  }

  function parseAspectValue(val) {
    var parts = (val || "1-1").split("-");
    var w = parseInt(parts[0], 10);
    var h = parseInt(parts[1], 10);
    if (isNaN(w) || w <= 0) w = 1;
    if (isNaN(h) || h <= 0) h = 1;
    return { w: w, h: h };
  }

  function setupMosaicAspect() {
    els.mosaicAspect = document.getElementById("mosaic-aspect");
    if (!els.mosaicAspect) return;
    els.mosaicAspect.onchange = function () {
      var parsed = parseAspectValue(els.mosaicAspect.value);
      window.VibeApp.setMosaicAspect(parsed.w, parsed.h);
    };
    var first = parseAspectValue(els.mosaicAspect.value);
    window.VibeApp.setMosaicAspect(first.w, first.h);
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
        if (audio.sourceMode === "mic") {
          setMicLabel(mode === "mosaic" ? "비주얼 — 모자이크" : "비주얼 — 쉐이프");
        }
        updatePaletteAvailability();
      };
    }
    updatePaletteAvailability();
  }

  function setupPaletteDots() {
    var palDots = document.querySelectorAll(".pal-dot");
    var i;
    for (i = 0; i < palDots.length; i++) {
      palDots[i].onclick = function () {
        if (window.VibeApp.getMode() === "mosaic") return;
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

  function updatePaletteAvailability() {
    var isMosaic = window.VibeApp.getMode() === "mosaic";
    var paletteWrap = document.querySelector(".palette-dots");
    if (paletteWrap) {
      paletteWrap.style.display = isMosaic ? "none" : "flex";
    }
    var aspectWrap = document.getElementById("mosaic-aspect-wrap");
    if (aspectWrap) {
      aspectWrap.classList.toggle("hidden", !isMosaic);
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
    if (audio.sourceMode === "mic") {
      setMicLabel("캡처 저장됨");
    } else {
      setFileLabel("캡처 저장됨");
    }
  }

  function setSource(mode) {
    audio.setSourceMode(mode);
    els.sourceMic.classList.toggle("active", mode === "mic");
    els.sourceFile.classList.toggle("active", mode === "file");
    els.fileControls.classList.toggle("hidden", mode !== "file");
    els.micControls.classList.toggle("hidden", mode !== "mic");
    if (mode === "mic") {
      setMicLabel(
        audio.enabled ? "마이크 연결 중" : "장치를 선택하고 ON을 누르세요"
      );
      refreshMicDevices(false);
      if (audio.enabled) audio.startMic();
    } else {
      setFileLabel("파일을 선택한 뒤 PLAY를 누르세요");
      if (els.micActivity) els.micActivity.style.width = "0%";
    }
  }

  function refreshMicDevices(restart) {
    audio.requestMicPermission(
      function () {
        audio.listMicDevices(function (sources) {
          els.micDevice.innerHTML = "";
          var i;
          var label;
          for (i = 0; i < sources.length; i++) {
            var opt = document.createElement("option");
            opt.value = i;
            if (typeof sources[i] === "string") {
              label = sources[i];
            } else {
              label = sources[i].label || sources[i].deviceId || "";
            }
            opt.textContent = label || "MIC " + (i + 1);
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
        setMicLabel("마이크 권한 — " + msg);
      }
    );
  }

  function onToggle() {
    var on = audio.toggleEnabled();
    updateToggleLabel();
    setMicLabel(on ? "분석 켜짐" : "분석 꺼짐");
    if (!on && els.micActivity) els.micActivity.style.width = "0%";
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
    setFileLabel("불러오는 중");
    audio.loadFile(
      file,
      function () {
        setFileLabel("불러왔습니다. PLAY를 누르세요");
        updatePlayLabel();
      },
      function () {
        setFileLabel("불러오기 실패");
      }
    );
  }

  function updateMicActivity() {
    if (!els.micActivity || audio.sourceMode !== "mic") return;
    var vol = 0;
    if (audio.enabled && audio.lastAnalysis) {
      vol = VibeUtils.effectiveVolume(
        audio.lastAnalysis.volume,
        audio.lastAnalysis.isMic
      );
    }
    els.micActivity.style.width = Math.round(vol * 100) + "%";
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
    updateMicActivity();
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
