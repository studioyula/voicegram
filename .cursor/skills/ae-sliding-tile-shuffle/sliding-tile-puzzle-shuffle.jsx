/**
 * Sliding tile puzzle shuffle — Run Script / coloso-ae-mcp 용 엔트리.
 * 동일 폴더의 sliding-tile-puzzle-core.jsx 를 로드한 뒤 aeSlidingTileRun 실행.
 *
 * 자주 바꾸는 값은 아래 P 블록만 수정한다.
 */
var P = {
  cols: 8,
  rows: 6,
  emptyRemove: 0.33,
  density: null,
  moveDur: 0.2,
  stepDur: 0.25,
  marginEnd: 0.5,
  namePrefix: "SlideTile_",
  fillColor: [1, 1, 1, 1],
  strokeColor: null,
  strokeWidth: 0,
  removeExisting: true
};

var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
  throw new Error("활성 컴포지션이 없습니다.");
}
var corePath = new File($.fileName).parent.fsName + "/sliding-tile-puzzle-core.jsx";
var coreFile = new File(corePath);
if (!coreFile.exists) {
  throw new Error("core missing: " + corePath);
}
$.evalFile(coreFile);
return aeSlidingTileRun(comp, P);
