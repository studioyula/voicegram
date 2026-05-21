var VibeAudio = (function () {
  var SILENCE_MIC = 0.003;
  var SILENCE_FILE = 8;
  var SAMPLE_RATE = 44100;
  var FFT_BINS = 128;

  function AudioManager(p) {
    this.p = p;
    this.sourceMode = "file";
    this.enabled = false;
    this.micReady = false;
    this.debugLog = false;
    this.prevTotalEnergy = 0;
    this.fft = null;
    this.mic = null;
    this.micSources = [];
    this.selectedMicIndex = null;
    this.soundFile = null;
    this.fileObjectUrl = null;
    this.isPlaying = false;
    this.lastAnalysis = {
      bass: 0,
      mid: 0,
      treble: 0,
      volume: 0,
      band: "bass",
      activeBands: [],
      isSound: false,
      peakFreq: 0,
      centroid: 0,
      delta: 0,
      spread: 0,
      spectrum: [],
    };
  }

  AudioManager.prototype.init = function () {
    this.fft = new p5.FFT(0.8, 128);
    this.prevTotalEnergy = 0;
  };

  AudioManager.prototype.startContext = function () {
    if (typeof this.p.userStartAudio === "function") {
      this.p.userStartAudio();
    }
  };

  AudioManager.prototype.connectFileToAnalyzer = function () {
    if (!this.soundFile || !this.fft) return;
    this.soundFile.disconnect();
    this.soundFile.connect(this.fft);
    if (typeof p5 !== "undefined" && p5.soundOut) {
      this.soundFile.connect(p5.soundOut);
    }
  };

  AudioManager.prototype.ensureAnalysisOn = function () {
    this.startContext();
    if (!this.enabled) {
      this.enabled = true;
      this.debugLog = true;
    }
  };

  AudioManager.prototype.disconnectFile = function () {
    if (this.soundFile) {
      try {
        this.soundFile.stop();
        this.soundFile.disconnect();
      } catch (e) {
        console.warn("[VOICEGRAM] file disconnect skipped", e);
      }
      this.isPlaying = false;
    }
    if (this.fileObjectUrl) {
      URL.revokeObjectURL(this.fileObjectUrl);
      this.fileObjectUrl = null;
    }
  };

  AudioManager.prototype.setSourceMode = function (mode) {
    if (mode === this.sourceMode) return;
    if (mode === "mic") {
      this.disconnectFile();
    } else if (this.mic) {
      this.mic.stop();
      this.micReady = false;
    }
    this.sourceMode = mode;
    if (this.enabled && mode === "mic") {
      this.startMic();
    }
  };

  AudioManager.prototype.stopSources = function () {
    if (this.mic) {
      this.mic.stop();
      this.micReady = false;
    }
    if (this.soundFile) {
      this.soundFile.stop();
      this.isPlaying = false;
    }
  };

  AudioManager.prototype.toggleEnabled = function () {
    this.startContext();
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.debugLog = true;
      if (this.sourceMode === "mic") {
        this.startMic();
      } else if (this.soundFile) {
        this.playFile();
      }
    } else {
      this.stopSources();
    }
    return this.enabled;
  };

  AudioManager.prototype.requestMicPermission = function (onOk, onErr) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (onErr) onErr("이 브라우저는 마이크 접근을 지원하지 않습니다.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        stream.getTracks().forEach(function (t) {
          t.stop();
        });
        if (onOk) onOk();
      })
      .catch(function (e) {
        if (onErr) onErr(e.message || "마이크 권한이 거부되었습니다.");
      });
  };

  AudioManager.prototype.listMicDevices = function (callback) {
    var self = this;
    if (!this.mic) this.mic = new p5.AudioIn();
    this.mic.getSources(function (sources) {
      self.micSources = sources || [];
      if (callback) callback(self.micSources);
    });
  };

  AudioManager.prototype.setMicDevice = function (index) {
    this.selectedMicIndex = index;
    if (this.enabled && this.sourceMode === "mic") {
      this.startMic();
    }
  };

  AudioManager.prototype.startMic = function () {
    var self = this;
    this.startContext();
    this.disconnectFile();
    this.sourceMode = "mic";
    this.micReady = false;

    if (!this.mic) {
      this.mic = new p5.AudioIn();
    }

    function beginCapture() {
      if (
        self.selectedMicIndex != null &&
        typeof self.mic.setSource === "function"
      ) {
        self.mic.setSource(self.selectedMicIndex);
      }
      self.mic.start(function () {
        self.mic.connect(self.fft);
        if (typeof self.mic.amp === "function") {
          self.mic.amp(3);
        }
        self.micReady = true;
      });
    }

    this.listMicDevices(function () {
      beginCapture();
    });
  };

  AudioManager.prototype.loadFile = function (file, onReady, onError) {
    var self = this;
    var objectUrl;
    this.startContext();
    if (!file || !file.type || file.type.indexOf("audio/") !== 0) {
      if (onError) onError(new Error("AUDIO FILE REQUIRED"));
      return;
    }
    if (this.mic) {
      this.mic.stop();
      this.micReady = false;
    }
    this.disconnectFile();
    this.sourceMode = "file";
    objectUrl = URL.createObjectURL(file);
    this.fileObjectUrl = objectUrl;

    this.p.loadSound(
      objectUrl,
      function (snd) {
        self.soundFile = snd;
        self.connectFileToAnalyzer();
        self.isPlaying = false;
        if (onReady) onReady();
      },
      function (err) {
        if (self.fileObjectUrl === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          self.fileObjectUrl = null;
        }
        if (onError) onError(err);
      }
    );
  };

  AudioManager.prototype.playFile = function () {
    if (!this.soundFile) return;
    this.ensureAnalysisOn();
    this.connectFileToAnalyzer();
    if (this.soundFile.isPlaying()) {
      this.soundFile.pause();
      this.isPlaying = false;
    } else {
      this.soundFile.loop();
      this.isPlaying = true;
    }
    return this.enabled;
  };

  AudioManager.prototype.seekFile = function (ratio) {
    if (!this.soundFile || !this.soundFile.duration()) return;
    this.soundFile.jump(VibeUtils.clamp(ratio, 0, 1) * this.soundFile.duration());
  };

  AudioManager.prototype.getFileProgress = function () {
    if (!this.soundFile || !this.soundFile.duration()) return { ratio: 0 };
    return { ratio: this.soundFile.currentTime() / this.soundFile.duration() };
  };

  AudioManager.prototype.computeSpectrumFeatures = function (spectrum) {
    var peakIndex = 0;
    var peakVal = 0;
    var sumWeighted = 0;
    var sumEnergy = 0;
    var sumSpread = 0;
    var i;

    for (i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > peakVal) {
        peakVal = spectrum[i];
        peakIndex = i;
      }
      sumWeighted += i * spectrum[i];
      sumEnergy += spectrum[i];
    }

    var peakFreq = peakIndex * (SAMPLE_RATE / (FFT_BINS * 2));
    var centroid = sumEnergy > 0 ? sumWeighted / sumEnergy : 0;
    var centroidNorm = centroid / FFT_BINS;

    for (i = 0; i < spectrum.length; i++) {
      sumSpread += spectrum[i] * Math.pow(i - centroid, 2);
    }
    var spread = sumEnergy > 0 ? Math.sqrt(sumSpread / sumEnergy) : 0;
    var spreadNorm = Math.min(spread / 40, 1);

    return {
      peakFreq: peakFreq,
      centroid: centroidNorm,
      spread: spreadNorm,
    };
  };

  AudioManager.prototype.analyze = function () {
    if (!this.enabled || !this.fft) {
      this.lastAnalysis.isSound = false;
      this.lastAnalysis.activeBands = [];
      return this.lastAnalysis;
    }

    if (this.sourceMode === "mic" && !this.micReady) {
      this.lastAnalysis.isSound = false;
      this.lastAnalysis.activeBands = [];
      return this.lastAnalysis;
    }

    var spectrum = this.fft.analyze();
    var bass = this.fft.getEnergy("bass");
    var mid = this.fft.getEnergy("mid");
    var treble = this.fft.getEnergy("treble");
    var features = this.computeSpectrumFeatures(spectrum);
    var isMic = this.sourceMode === "mic";
    var volume;

    if (isMic && this.mic) {
      volume = this.mic.getLevel();
    } else {
      volume = (bass + mid + treble) / (3 * 255);
    }

    var totalEnergy = bass + mid + treble;
    var delta = Math.abs(totalEnergy - (this.prevTotalEnergy || 0));
    this.prevTotalEnergy = totalEnergy;
    var deltaNorm = Math.min(delta / 300, 1);

    var peak = Math.max(bass, mid, treble);
    var isSound = isMic
      ? volume > SILENCE_MIC || peak > 3
      : peak > SILENCE_FILE;

    var activeBands = [];
    if (isSound) {
      if (bass >= peak * 0.4) activeBands.push("bass");
      if (mid >= peak * 0.4) activeBands.push("mid");
      if (treble >= peak * 0.4) activeBands.push("treble");
      if (activeBands.length === 0) {
        activeBands.push(
          bass >= mid && bass >= treble
            ? "bass"
            : mid >= treble
              ? "mid"
              : "treble"
        );
      }
    }

    this.lastAnalysis = {
      bass: bass,
      mid: mid,
      treble: treble,
      volume: volume,
      band:
        bass >= mid && bass >= treble
          ? "bass"
          : mid >= treble
            ? "mid"
            : "treble",
      activeBands: activeBands,
      isSound: isSound,
      isMic: isMic,
      peakFreq: features.peakFreq,
      centroid: features.centroid,
      delta: deltaNorm,
      spread: features.spread,
      spectrum: spectrum,
    };

    if (this.debugLog && this.p.frameCount % 25 === 0) {
      console.log(
        "[VIBE]",
        Math.round(features.peakFreq) + "Hz",
        "centroid=" + features.centroid.toFixed(2),
        "delta=" + deltaNorm.toFixed(2),
        "spread=" + features.spread.toFixed(2),
        isSound ? "SOUND" : "silent"
      );
    }

    return this.lastAnalysis;
  };

  return { AudioManager: AudioManager };
})();
