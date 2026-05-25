var VibeAudio = (function () {
  var SILENCE_MIC = 0.0008;
  var SILENCE_FILE = 8;
  var SAMPLE_RATE = 44100;
  var FFT_BINS = 128;

  function AudioManager(p) {
    this.p = p;
    this.sourceMode = "mic";
    this.enabled = false;
    this.micReady = false;
    this.debugLog = false;
    this.prevTotalEnergy = 0;
    this.fft = null;
    this.mic = null;
    this.micStream = null;
    this.micNode = null;
    this.micAnalyser = null;
    this.micFreqData = null;
    this.micTimeData = null;
    this.nativeAudioContext = null;
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
    this.fft = new p5.FFT(0.92, 128);
    this.prevTotalEnergy = 0;
  };

  /** Live mic MediaStream for canvas+mic video recording (do not stop from UI). */
  AudioManager.prototype.getMicMediaStream = function () {
    return this.micStream || null;
  };

  AudioManager.prototype.startContext = function () {
    if (typeof this.p.userStartAudio === "function") {
      this.p.userStartAudio();
    }
    if (this.nativeAudioContext && this.nativeAudioContext.state === "suspended") {
      this.nativeAudioContext.resume();
    }
  };

  AudioManager.prototype.getNativeAudioContext = function () {
    var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!this.nativeAudioContext) {
      this.nativeAudioContext = new AudioContextCtor();
    }
    if (this.nativeAudioContext.state === "suspended") {
      this.nativeAudioContext.resume();
    }
    return this.nativeAudioContext;
  };

  AudioManager.prototype.connectFileToAnalyzer = function () {
    if (!this.soundFile || !this.fft) return;
    this.soundFile.disconnect();
    if (typeof this.fft.setInput === "function") {
      this.fft.setInput(this.soundFile);
    }
    if (typeof p5 !== "undefined" && p5.soundOut) {
      this.soundFile.connect(p5.soundOut);
    } else {
      this.soundFile.connect();
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

  AudioManager.prototype.stopMic = function () {
    if (this.mic) {
      try {
        this.mic.stop();
      } catch (e) {
        console.warn("[VOICEGRAM] p5 mic stop skipped", e);
      }
    }
    if (this.micNode) {
      try {
        this.micNode.disconnect();
      } catch (err) {
        console.warn("[VOICEGRAM] mic node disconnect skipped", err);
      }
      this.micNode = null;
    }
    if (this.micStream) {
      var tracks = this.micStream.getTracks();
      var i;
      for (i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }
      this.micStream = null;
    }
    this.micAnalyser = null;
    this.micFreqData = null;
    this.micTimeData = null;
    this.micReady = false;
  };

  AudioManager.prototype.setSourceMode = function (mode) {
    if (mode === this.sourceMode) return;
    if (mode === "mic") {
      this.disconnectFile();
    } else if (this.mic) {
      this.stopMic();
    }
    this.sourceMode = mode;
    if (this.enabled && mode === "mic") {
      this.startMic();
    }
  };

  AudioManager.prototype.stopSources = function () {
    this.stopMic();
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
    if (!navigator.mediaDevices) {
      if (onErr) onErr("이 브라우저는 마이크 접근을 지원하지 않습니다.");
      return;
    }
    if (onOk) onOk();
  };

  AudioManager.prototype.listMicDevices = function (callback) {
    var self = this;
    if (
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.enumerateDevices === "function"
    ) {
      navigator.mediaDevices.enumerateDevices().then(function (devices) {
        var sources = [];
        var i;
        for (i = 0; i < devices.length; i++) {
          if (devices[i].kind === "audioinput") {
            sources.push(devices[i]);
          }
        }
        self.micSources = sources;
        if (callback) callback(self.micSources);
      }).catch(function () {
        if (callback) callback([]);
      });
      return;
    }

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
    var constraints;
    var sourceInfo;
    var deviceId;
    var ctx;
    this.startContext();
    this.disconnectFile();
    this.sourceMode = "mic";
    this.stopMic();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[VOICEGRAM] getUserMedia unavailable");
      return;
    }
    ctx = this.getNativeAudioContext();
    if (!ctx) {
      console.error("[VOICEGRAM] AudioContext unavailable");
      return;
    }

    sourceInfo = this.micSources[this.selectedMicIndex];
    deviceId = sourceInfo && sourceInfo.deviceId ? sourceInfo.deviceId : null;
    constraints = {
      audio: deviceId
        ? {
            deviceId: { exact: deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          }
        : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        if (ctx.state === "suspended") ctx.resume();
        self.micStream = stream;
        self.micNode = ctx.createMediaStreamSource(stream);
        self.micAnalyser = ctx.createAnalyser();
        self.micAnalyser.fftSize = 256;
        self.micAnalyser.smoothingTimeConstant = 0.92;
        self.micNode.connect(self.micAnalyser);
        self.micFreqData = new Uint8Array(self.micAnalyser.frequencyBinCount);
        self.micTimeData = new Uint8Array(self.micAnalyser.fftSize);
        self.micReady = true;
        console.log("[VOICEGRAM] native mic ready");
        if (typeof self.onMicReady === "function") {
          self.onMicReady();
        }
      })
      .catch(function (err) {
        self.micReady = false;
        console.error("[VOICEGRAM] mic start failed", err);
        if (typeof self.onMicError === "function") {
          self.onMicError(err);
        }
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
    this.stopMic();
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

  AudioManager.prototype.getNativeBandEnergy = function (spectrum, lowHz, highHz) {
    var ctx = this.nativeAudioContext;
    var fftSize = this.micAnalyser ? this.micAnalyser.fftSize : FFT_BINS * 2;
    var sampleRate = ctx ? ctx.sampleRate : SAMPLE_RATE;
    var start = Math.max(0, Math.floor(lowHz / (sampleRate / fftSize)));
    var end = Math.min(
      spectrum.length - 1,
      Math.ceil(highHz / (sampleRate / fftSize))
    );
    var sum = 0;
    var count = 0;
    var i;
    for (i = start; i <= end; i++) {
      sum += spectrum[i] || 0;
      count++;
    }
    return count > 0 ? VibeUtils.clamp((sum / count) * 1.35, 0, 255) : 0;
  };

  AudioManager.prototype.getNativeMicVolume = function () {
    if (!this.micAnalyser || !this.micTimeData) return 0;
    this.micAnalyser.getByteTimeDomainData(this.micTimeData);
    var sum = 0;
    var i;
    var v;
    for (i = 0; i < this.micTimeData.length; i++) {
      v = (this.micTimeData[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / this.micTimeData.length);
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

    var isMic = this.sourceMode === "mic";
    var spectrum;
    var bass;
    var mid;
    var treble;
    var features;
    var volume;

    if (isMic) {
      if (this.micAnalyser && this.micFreqData) {
        this.micAnalyser.getByteFrequencyData(this.micFreqData);
        spectrum = Array.prototype.slice.call(this.micFreqData);
        bass = this.getNativeBandEnergy(spectrum, 20, 250);
        mid = this.getNativeBandEnergy(spectrum, 250, 2000);
        treble = this.getNativeBandEnergy(spectrum, 2000, 8000);
        volume = this.getNativeMicVolume();
      } else {
        spectrum = [];
        bass = 0;
        mid = 0;
        treble = 0;
        volume = 0;
      }
    } else {
      spectrum = this.fft.analyze();
      bass = this.fft.getEnergy("bass");
      mid = this.fft.getEnergy("mid");
      treble = this.fft.getEnergy("treble");
      volume = (bass + mid + treble) / (3 * 255);
    }
    features = this.computeSpectrumFeatures(spectrum);

    var totalEnergy = bass + mid + treble;
    var delta = Math.abs(totalEnergy - (this.prevTotalEnergy || 0));
    this.prevTotalEnergy = totalEnergy;
    var deltaNorm = Math.min(delta / 300, 1);

    var peak = Math.max(bass, mid, treble);
    var isSound = isMic
      ? volume > SILENCE_MIC || peak > 1
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
