# ae-shape-grid — `layout` 변칙 블록 (ExtendScript)

`SKILL.md`의 **옵션: 변칙 블록** 절차를 그대로 구현할 때 복사용. ES3. 사용자가 **벤또 그리드·bento·`n×m` 안에 다양한 조합**이라고만 해도 이 파일과 동일한 `layout`+`fillRemaining` 로직이다.

## 점유 맵 + 블록 중심 + fillRemaining

`P.layout`가 배열이면 이중 전체 루프 대신 아래 패턴을 쓴다. `layout` 항목의 `row`/`col`/`rowSpan`/`colSpan`은 **1-based**.

```javascript
var occ = [];
for (var ri = 0; ri < ROWS; ri++) {
  occ[ri] = [];
  for (var ci = 0; ci < COLS; ci++) occ[ri][ci] = 0;
}

function claimBlock(R, C, rs, cs, tag) {
  for (var dr = 0; dr < rs; dr++) {
    for (var dc = 0; dc < cs; dc++) {
      var r = R + dr - 1;
      var c = C + dc - 1;
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) {
        throw new Error('layout 범위 밖: ' + tag + ' @' + R + ',' + C + ' ' + rs + 'x' + cs);
      }
      if (occ[r][c]) throw new Error('layout 겹침: ' + tag + ' @' + (r + 1) + ',' + (c + 1));
      occ[r][c] = 1;
    }
  }
}

function blockCenter(R, C, rs, cs) {
  var cx0 = startX + (C - 1) * stepX;
  var cx1 = startX + (C + cs - 2) * stepX;
  var cy0 = startY + (R - 1) * stepY;
  var cy1 = startY + (R + rs - 2) * stepY;
  var bw = (cs - 1) * stepX + cellW;
  var bh = (rs - 1) * stepY + cellH;
  return { px: (cx0 + cx1) / 2, py: (cy0 + cy1) / 2, bw: bw, bh: bh };
}

for (var li = 0; li < P.layout.length; li++) {
  var B = P.layout[li];
  claimBlock(B.row, B.col, B.rowSpan, B.colSpan, 'block' + li);
  var BK = blockCenter(B.row, B.col, B.rowSpan, B.colSpan);
  // create: makeShape(layer, BK.bw, BK.bh); Position = [BK.px, BK.py]
  // useExisting: AABB fit 목표 폭·높이 = BK.bw, BK.bh
}

if (P.fillRemaining) {
  for (var rj = 0; rj < ROWS; rj++) {
    for (var cj = 0; cj < COLS; cj++) {
      if (occ[rj][cj]) continue;
      var px = startX + cj * stepX;
      var py = startY + rj * stepY;
      // 1×1 타일 1개
    }
  }
}
```

## 스모크 테스트 (create 전용)

활성 컴프에 `LayoutTest_*` 사각형만 추가한다. 겹침 있으면 `claimBlock`이 throw.

- 그리드: 5×4, 셀 90, gap 10
- 블록: (1,1) 2×2 빨강, (1,4) 1×2 초록, (3,1) 2×1 세로 파랑
- 나머지: 회색 1×1

MCP `execute`로 돌릴 때는 SKILL 본문의 최종 보고 형식에 맞춰 결과 문자열만 반환하면 된다.
