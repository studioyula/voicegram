/**
 * AE: File > Scripts > Run Script File 로 이 파일 실행.
 * 같은 폴더의 text-reveal-trackmatte-slide.jsx 를 로드하고 한 번 돌린다.
 */
var dir = new File($.fileName).parent.fsName;
$.evalFile(dir + "/text-reveal-trackmatte-slide.jsx");
runTextRevealTrackmatteSlide();
