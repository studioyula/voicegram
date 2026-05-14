/**
 * 텍스트 트랙매트 리빌 — ScriptUI 패널
 * File → Scripts → Run Script File… 로 이 파일만 실행하면 패널이 뜬다.
 */
(function textRevealTrackmatteRun(thisObj) {
  var SCRIPT_DIR = new File($.fileName).parent.fsName;
  var SLIDE_PATH = SCRIPT_DIR + "/text-reveal-trackmatte-slide.jsx";

  var DIR_LABELS = ["왼쪽", "오른쪽", "위", "아래"];
  var DIR_VALUES = ["fromLeft", "fromRight", "fromTop", "fromBottom"];
  var MODE_LABELS = ["단일 (전부 동일)", "순환 (레이어마다)", "랜덤 (레이어마다)"];
  var MODE_VALUES = ["single", "cycle", "random"];

  function uiIndex(list, value) {
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] === value) return i;
    }
    return 0;
  }

  function buildOpts(win) {
    var modeIdx = win.modeDD.selection.index;
    var dirIdx = win.dirDD.selection.index;
    return {
      directionMode: MODE_VALUES[modeIdx],
      singleDirection: DIR_VALUES[dirIdx],
      randomSeed: parseInt(win.seedEt.text, 10) || 20260511,
      slideMode: win.fixedRb.value ? "fixed" : "bounds",
      fixedEnterOff: parseFloat(win.enterEt.text) || 140,
      fixedExitOff: parseFloat(win.exitEt.text) || 120,
      updateExisting: win.updateCb.value === true,
      skipIfAlready: !win.updateCb.value
    };
  }

  function syncDirEnabled(win) {
    var single = win.modeDD.selection.index === 0;
    win.dirDD.enabled = single;
    win.dirLabel.enabled = single;
  }

  function runApply(win) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
      throw new Error("활성 컴포지션을 선택하세요.");
    }
    $.evalFile(SLIDE_PATH);
    var result = runTextRevealTrackmatteSlide(buildOpts(win));
    return result;
  }

  function buildUI(thisObj) {
    var win = thisObj instanceof Panel
      ? thisObj
      : new Window("palette", "Text Reveal Track Matte", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    var modeRow = win.add("group");
    modeRow.orientation = "row";
    modeRow.alignChildren = ["left", "center"];
    modeRow.add("statictext", undefined, "방향 모드");
    win.modeDD = modeRow.add("dropdownlist", undefined, MODE_LABELS);
    win.modeDD.selection = uiIndex(MODE_VALUES, "cycle");

    var dirRow = win.add("group");
    dirRow.orientation = "row";
    dirRow.alignChildren = ["left", "center"];
    win.dirLabel = dirRow.add("statictext", undefined, "단일 방향");
    win.dirDD = dirRow.add("dropdownlist", undefined, DIR_LABELS);
    win.dirDD.selection = uiIndex(DIR_VALUES, "fromBottom");

    var seedRow = win.add("group");
    seedRow.orientation = "row";
    seedRow.alignChildren = ["left", "center"];
    seedRow.add("statictext", undefined, "랜덤 시드");
    win.seedEt = seedRow.add("edittext", undefined, "20260511");
    win.seedEt.characters = 10;

    win.add("panel", undefined, "슬라이드 거리");
    var slidePanel = win.children[win.children.length - 1];
    slidePanel.orientation = "column";
    slidePanel.alignChildren = ["fill", "top"];
    slidePanel.margins = 10;

    var slideModeRow = slidePanel.add("group");
    slideModeRow.orientation = "row";
    win.fixedRb = slideModeRow.add("radiobutton", undefined, "고정 px");
    var boundsRb = slideModeRow.add("radiobutton", undefined, "바운드 비율");
    win.fixedRb.value = true;

    var enterRow = slidePanel.add("group");
    enterRow.orientation = "row";
    enterRow.add("statictext", undefined, "등장");
    win.enterEt = enterRow.add("edittext", undefined, "140");
    win.enterEt.characters = 6;
    enterRow.add("statictext", undefined, "px");

    var exitRow = slidePanel.add("group");
    exitRow.orientation = "row";
    exitRow.add("statictext", undefined, "퇴장");
    win.exitEt = exitRow.add("edittext", undefined, "120");
    win.exitEt.characters = 6;
    exitRow.add("statictext", undefined, "px");

    win.updateCb = win.add("checkbox", undefined, "기존 TM_Reveal_* 레이어 방향만 갱신");
    win.updateCb.value = false;

    win.help = win.add(
      "statictext",
      undefined,
      "타임라인에서 리빌할 레이어를 하나 이상 선택한 뒤 적용 (Shift/Ctrl·Cmd 다중 선택). 순환·랜덤은 레이어마다 방향이 달라집니다.",
      { multiline: true }
    );

    var btnRow = win.add("group");
    btnRow.orientation = "row";
    btnRow.alignment = ["fill", "top"];
    var applyBtn = btnRow.add("button", undefined, "적용");
    var closeBtn = btnRow.add("button", undefined, "닫기");

    win.modeDD.onChange = function () { syncDirEnabled(win); };
    syncDirEnabled(win);

    applyBtn.onClick = function () {
      try {
        app.beginUndoGroup("Text Reveal Track Matte");
        var msg = runApply(win);
        app.endUndoGroup();
        if (msg) {
          if (!win.resultBox) {
            win.resultBox = win.add("edittext", undefined, msg, { multiline: true, readonly: true });
            win.resultBox.preferredSize = [280, 80];
          } else {
            win.resultBox.text = msg;
          }
          win.layout.layout(true);
        }
      } catch (e) {
        try { app.endUndoGroup(); } catch (e2) {}
        throw e;
      }
    };

    closeBtn.onClick = function () {
      if (win instanceof Window) win.close();
    };

    win.onResizing = win.onResize = function () { this.layout.resize(); };
    win.layout.layout(true);
    return win;
  }

  var ui = buildUI(thisObj);
  if (ui instanceof Window) {
    ui.center();
    ui.show();
  } else {
    ui.layout.layout(true);
  }
})(this);
