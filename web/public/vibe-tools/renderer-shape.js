var VibeRenderer = VibeRenderer || {};

/**
 * Shape mode — only VibeShapeComposition (no VibeUtils.drawConnections,
 * no previews/elementaries particle accumulation).
 */
VibeRenderer.ShapeRenderer = (function () {
  function ShapeRenderer(p, audio) {
    this.p = p;
    this.audio = audio;
    this.state = VibeShapeComposition.createState();
    this.time = 0;
  }

  ShapeRenderer.prototype.clear = function () {
    VibeShapeComposition.resetState(this.state, this.p);
  };

  ShapeRenderer.prototype.update = function () {
    var p = this.p;
    var a = this.audio.lastAnalysis;
    this.time += 0.016;

    if (!a) return;

    if (
      this.audio.enabled &&
      VibeShapeComposition.detectVoiceEvent(this.state, a, p)
    ) {
      VibeShapeComposition.onVoiceEvent(this.state, a, p, p.width, p.height);
    }

    VibeShapeComposition.updatePieces(this.state, a, p, p.width, p.height);
  };

  ShapeRenderer.prototype.render = function () {
    var p = this.p;
    var bg = VibePalettes.getShapeBackground
      ? VibePalettes.getShapeBackground()
      : { bg: [0, 0, 100] };

    p.background(bg.bg[0], bg.bg[1], bg.bg[2]);

    VibeShapeComposition.drawSortedPieces(p, this.state, this.time);

    if (VibeShapeComposition.drawGrainOverlay) {
      VibeShapeComposition.drawGrainOverlay(p, bg);
    }
  };

  return ShapeRenderer;
})();
