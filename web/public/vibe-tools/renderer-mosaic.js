var VibeRenderer = VibeRenderer || {};

VibeRenderer.MosaicRenderer = (function () {
  var SILENCE_MS = 500;
  var MAX_GROUPS = 80;

  function MosaicRenderer(p, audio) {
    this.p = p;
    this.audio = audio;
    this.groups = [];
    this.previews = [];
    this.lastSoundTime = 0;
    this.time = 0;
  }

  MosaicRenderer.prototype.clear = function () {
    this.groups = [];
    this.previews = [];
    this.lastSoundTime = 0;
    var bg = VibePalettes.getActive().bg;
    this.p.background(bg[0], bg[1], bg[2]);
  };

  MosaicRenderer.prototype.update = function () {
    var a = this.audio.lastAnalysis;
    var p = this.p;
    var s;
    this.time += 0.016;
    if (!this.audio.enabled) return;

    if (a.isSound) {
      this.lastSoundTime = p.millis();
      var count = Math.max(1, Math.floor(VibeUtils.calcSpawnCount(a) * 0.5));
      for (s = 0; s < count; s++) {
        this.previews.push(VibeUtils.createMosaicGroup(p, a, p.width, p.height));
      }
      if (this.previews.length > 12) {
        var overflow = this.previews.splice(0, this.previews.length - 12);
        var i;
        for (i = 0; i < overflow.length; i++) {
          overflow[i].confirmed = true;
          this.groups.push(overflow[i]);
        }
      }
    } else if (p.millis() - this.lastSoundTime > SILENCE_MS) {
      for (s = 0; s < this.previews.length; s++) {
        this.previews[s].confirmed = true;
        this.groups.push(this.previews[s]);
      }
      this.previews = [];
    }

    if (this.groups.length > MAX_GROUPS) {
      this.groups = this.groups.slice(-MAX_GROUPS);
    }
  };

  MosaicRenderer.prototype.render = function () {
    var p = this.p;
    var a = this.audio.lastAnalysis;
    var bg = VibePalettes.getActive().bg;
    var i;

    p.noStroke();
    p.fill(bg[0], bg[1], bg[2], VibeUtils.calcTrailAlpha(a));
    p.rect(0, 0, p.width, p.height);

    var vol = VibeUtils.effectiveVolume(a.volume, a.isMic);
    var vibrate = a.isSound ? VibeUtils.mapValue(vol, 0, 1, 0, 18) : 0;

    for (i = 0; i < this.groups.length; i++) {
      VibeUtils.renderMosaicGroup(p, this.groups[i], this.time, vibrate);
    }
    for (i = 0; i < this.previews.length; i++) {
      VibeUtils.renderMosaicGroup(p, this.previews[i], this.time, 0);
    }
  };

  return MosaicRenderer;
})();
