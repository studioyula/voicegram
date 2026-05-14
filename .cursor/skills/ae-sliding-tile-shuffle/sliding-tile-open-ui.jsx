/**
 * 슬라이딩 타일 UI 실행 — 동일 폴더의 sliding-tile-Run.jsx 를 한 번 감싼 런처(선택).
 * AE: File → Scripts → Run Script File… → 이 파일 또는 sliding-tile-Run.jsx 직접 실행.
 */
var run = new File(new File($.fileName).parent.fsName + "/sliding-tile-Run.jsx");
if (!run.exists) {
  throw new Error("없음: " + run.fsName);
}
$.evalFile(run);
