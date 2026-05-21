var VibeRenderer = (function () {
  var SILENCE_MS = 500;
  var MAX_PREVIEWS = 45;
  var MAX_ELEMENTARIES = 400;

  function ShapeRenderer(p, audio) {
    this.p = p;
    this.audio = audio;
    this.elementaries = [];
    this.previews = [];
    this.lastSoundTime = 0;
    this.time = 0;
  }

  ShapeRenderer.prototype.clear = function () {
    this.elementaries = [];
    this.previews = [];
    this.lastSoundTime = 0;
    var bg = VibePalettes.getActive().bg;
    this.p.background(bg[0], bg[1], bg[2]);
  };

  ShapeRenderer.prototype.update = function () {
    var a = this.audio.lastAnalysis;
    var p = this.p;
    var s;
    var i;
    this.time += 0.016;
    if (!this.audio.enabled) return;

    if (a.isSound) {
      this.lastSoundTime = p.millis();
      var count = VibeUtils.calcSpawnCount(a);
      for (s = 0; s < count; s++) {
        this.previews.push(VibeUtils.createElementary(p, a, p.width, p.height));
      }
      if (this.previews.length > MAX_PREVIEWS) {
        var overflow = this.previews.splice(0, this.previews.length - MAX_PREVIEWS);
        for (i = 0; i < overflow.length; i++) {
          overflow[i].confirmed = true;
          overflow[i].alpha = VibeUtils.mapValue(overflow[i].alpha, 0, 100, 70, 95);
          this.elementaries.push(overflow[i]);
        }
      }
      for (s = 0; s < this.previews.length; s++) {
        VibeUtils.updateElementary(p, this.previews[s], a, p.width, p.height);
        var drift = VibeUtils.calcMotionOffset(p, this.previews[s], this.time, 0);
        this.previews[s].x += drift.x * 0.12;
        this.previews[s].y += drift.y * 0.12;
      }
    } else if (p.millis() - this.lastSoundTime > SILENCE_MS) {
      for (s = 0; s < this.previews.length; s++) {
        this.previews[s].confirmed = true;
        this.previews[s].alpha = VibeUtils.mapValue(
          this.previews[s].alpha,
          0,
          100,
          70,
          95
        );
        this.elementaries.push(this.previews[s]);
      }
      this.previews = [];
    }

    if (this.elementaries.length > MAX_ELEMENTARIES) {
      this.elementaries = this.elementaries.slice(-MAX_ELEMENTARIES);
    }
  };

  ShapeRenderer.prototype.render = function () {
    var p = this.p;
    var a = this.audio.lastAnalysis;
    var bg = VibePalettes.getActive().bg;

    p.noStroke();
    p.fill(bg[0], bg[1], bg[2], VibeUtils.calcTrailAlpha(a));
    p.rect(0, 0, p.width, p.height);

    var vol = VibeUtils.effectiveVolume(a.volume, a.isMic);
    var vibrate = a.isSound ? VibeUtils.mapValue(vol, 0, 1, 0, 22) : 0;
    var drawList = [];
    var i;

    for (i = 0; i < this.elementaries.length; i++) {
      var posC = this.drawElementary(this.elementaries[i], true, vibrate);
      drawList.push({ dx: posC.x, dy: posC.y });
    }
    for (i = 0; i < this.previews.length; i++) {
      var posP = this.drawElementary(this.previews[i], false, 0);
      drawList.push({ dx: posP.x, dy: posP.y });
    }

    VibeUtils.drawConnections(p, drawList, 150);
  };

  ShapeRenderer.prototype.drawElementary = function (el, confirmed, vibrate) {
    var p = this.p;
    var pos = VibeUtils.getDrawPosition(p, el, this.time, vibrate);
    var alpha = confirmed ? el.alpha : el.alpha * 0.5;
    var glow = VibeUtils.calcGlow(el.centroid, confirmed);
    var strokeTypes = { ring: true, arc: true };
    var c = el.color;

    p.push();
    p.translate(pos.x, pos.y);

    p.drawingContext.shadowBlur = glow;
    p.drawingContext.shadowColor = VibePalettes.glowColor(alpha / 100);

    if (strokeTypes[el.type]) {
      p.stroke(c.h, c.s, c.b, alpha);
      p.noFill();
    } else {
      p.noStroke();
      p.fill(c.h, c.s, c.b, alpha);
    }

    VibeUtils.drawShape(p, el.type, el.size, el.rotation);

    p.drawingContext.shadowBlur = 0;
    p.noStroke();
    p.pop();

    return pos;
  };

  return { ShapeRenderer: ShapeRenderer };
})();
